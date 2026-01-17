# Architecture Research: High-Concurrency Event Booking

**Domain:** Serverless High-Concurrency Systems
**Researched:** 2026-01-18
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Edge Layer (Vercel)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │Middleware│  │ Waiting │  │ Rate    │  │ Session │        │
│  │ (Gate)   │  │ Room    │  │ Limiter │  │ Manager │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
├───────┴────────────┴────────────┴────────────┴──────────────┤
│                     Application Layer (Next.js API)         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 Booking Service (Serverless)        │    │
│  │   (Validation -> Lock -> Intent -> Payment Order)   │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                        Persistence Layer                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Redis   │  │  Postgres│  │  Prisma  │  │ Razorpay │    │
│  │ (Queue)  │  │ (Storage)│  │ (Pooler) │  │  (API)   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Middleware Gate** | Intercepts requests, checks waiting room status. | Vercel Edge Middleware |
| **Waiting Room** | Manages queue positions and "Active" session tokens. | Upstash Redis (HTTP/REST) |
| **Booking Engine** | Handles seat selection, validation, and intent creation. | Next.js Server Actions / API Routes |
| **Connection Pooler** | Manages DB connections to prevent serverless "exhaustion". | Prisma Accelerate / Prisma Postgres |
| **State Store** | Persists bookings, inventory, and payment status. | PostgreSQL |
| **Payment Hub** | External payment processing and webhooks. | Razorpay |

## Recommended Project Structure

```
src/
├── app/                    # Next.js App Router
├── components/             # UI Components (Booking UI, Queue Status)
├── lib/
│   ├── redis/             # Upstash client & Queue logic
│   ├── prisma/            # Prisma client & Middleware
│   └── payment/           # Razorpay integration
├── services/               # Core Business Logic
│   ├── queue.service.ts    # Waiting room & Token management
│   ├── booking.service.ts  # Intent flow & Inventory locking
│   └── payment.service.ts  # Webhook handling & Finalization
├── middleware.ts           # Surge protection entry point
└── types/                  # Shared TypeScript interfaces
```

### Structure Rationale

- **lib/**: Encapsulates third-party client configurations and low-level wrappers (Redis, DB).
- **services/**: Orchestrates the "Surge-Safe" flow. Decouples business logic from API route handlers for better testability.
- **middleware.ts**: Placed at the root to ensure every request is gated before hitting expensive serverless functions or DB.

## Architectural Patterns

### Pattern 1: Redis Semafore (Waiting Room)

**What:** Uses Redis as a gatekeeper to limit the number of users concurrently hitting the database.
**When to use:** During high-surge events (e.g., ticket drops) where DB connections are limited.
**Trade-offs:** Adds latency for "queued" users, but prevents system-wide crashes.

**Example:**
```typescript
// Edge Middleware Check
const activeSessions = await redis.get("active_sessions_count");
if (activeSessions >= MAX_CAPACITY) {
  return Response.redirect("/waiting-room");
}
```

### Pattern 2: Optimistic Concurrency Control (OCC)

**What:** Uses a `version` field in the database to ensure atomic updates without long-held locks.
**When to use:** Preferred in serverless to keep transactions short and avoid connection pool exhaustion.
**Trade-offs:** Retries may be needed if conflicts occur, but much higher throughput for the DB.

**Example:**
```typescript
await prisma.seat.updateMany({
  where: { id, version: lastSeenVersion, status: 'AVAILABLE' },
  data: { status: 'RESERVED', version: { increment: 1 } }
});
```

### Pattern 3: Booking Intent Pattern

**What:** Creates a temporary "Intent" record in the DB before payment.
**When to use:** To hold a seat for 5-10 minutes while the user is on the payment gateway.
**Trade-offs:** Requires a cleanup job (cron) to release expired intents.

## Data Flow

### Request Flow

```
[User Selects Seat]
    ↓
[Middleware] → [Check Queue Token] → [Proceed if Valid]
    ↓
[API Route] → [Booking Service] → [Check Inventory (OCC)]
    ↓
[DB Intent Created] → [Razorpay Order Created] → [Return Order ID]
    ↓
[Frontend] → [Razorpay Modal] → [Payment Success]
    ↓
[Razorpay Webhook] → [Finalize Booking] → [Email Confirmation]
```

### Key Data Flows

1.  **Queue Entry:** User -> Middleware -> Redis ZSET (timestamp order) -> Queue UI.
2.  **Booking Finalization:** Razorpay Webhook -> `booking_intents` lookup -> Atomic Inventory decrement -> `bookings` creation -> `Commit`.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 users | Direct DB access; simple Next.js API routes. |
| 100-1k users | Implement Redis caching for inventory reads; use Prisma Accelerate. |
| 1k-10k+ users | **Waiting Room mandatory**; Offload webhooks to SQS/Background jobs; Global Edge Caching. |

### Scaling Priorities

1.  **First bottleneck:** Database connection exhaustion during burst (Fixed by Prisma Accelerate + Waiting Room).
2.  **Second bottleneck:** Redis "Hot Key" for queue count (Fixed by Redis sharding or probabilistic rate limiting).

## Anti-Patterns

### Anti-Pattern 1: Heavy Middleware
**What people do:** Doing complex DB lookups in Vercel Middleware.
**Why it's wrong:** Middleware must be fast (<50ms). Heavy logic here blocks every request and increases Edge costs.
**Do this instead:** Use Redis (KV) for fast lookups in Middleware and move DB logic to Server Actions.

### Anti-Pattern 2: Long DB Transactions
**What people do:** Wrapping seat selection and payment creation in one big `prisma.$transaction`.
**Why it's wrong:** Holds a DB connection open while waiting for external APIs (Razorpay), leading to pool exhaustion.
**Do this instead:** Use the **Intent Pattern**. Save intent to DB, close transaction, then call Payment API.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Upstash Redis** | HTTP REST Client | Avoids TCP handshake overhead in Serverless. |
| **Razorpay** | Server-side SDK + Webhooks | Must use idempotent webhook handlers. |
| **Prisma Accelerate** | Connection String Wrapper | Vital for pooling in Vercel Functions. |

## Sources

- [Vercel: Connection Pooling Best Practices](https://vercel.com/docs/functions/networking/connection-pooling) (HIGH confidence)
- [Upstash: Building a Waiting Room](https://upstash.com/blog/waiting-room) (HIGH confidence)
- [Prisma: Optimistic Concurrency Control](https://github.com/prisma/docs/blob/main/content/200-orm/200-prisma-client/100-queries/058-transactions.mdx) (HIGH confidence)

---
*Architecture research for: Surge-Safe Event Booking System*
*Researched: 2026-01-18*
