# Stack Recommendation: Surge-Safe Event Booking System

**Domain:** High-Concurrency Event Booking (1500+ bookings in <30 mins)
**Researched:** 2026-01-18
**Overall Confidence:** HIGH

## Core Stack

The following libraries are recommended for the 2026 High-Concurrency Booking stack, optimized for Vercel Serverless and atomic consistency.

### Primary Technologies
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Next.js** | ^15.1.0 | Framework | App Router and Server Actions provide the optimal bridge between client requests and serverless execution. |
| **Drizzle ORM** | ^0.38.0 | Database Access | Lightweight, headless, and provides first-class support for `FOR UPDATE SKIP LOCKED` which is critical for surge handling. |
| **PostgreSQL** | 16/17 | Data Persistence | Row-level locking and ACID compliance are non-negotiable for zero-failure booking. |
| **Upstash Redis** | ^1.34.0 | Waiting Room | HTTP-based (connectionless), perfect for serverless. Essential for the "Waiting Room" pattern to protect the DB from raw surges. |

### Supporting Libraries
| Library | Version | Purpose | Why This Choice |
|---------|---------|---------|-----------------|
| **@upstash/ratelimit** | ^2.0.0 | Surge Protection | Built on Redis; prevents API exhaustion before users even hit the queue. |
| **Razorpay Node** | ^2.9.0 | Payments | Standard for India-based high-volume events; stable webhook support. |
| **Zod** | ^3.24.0 | Validation | End-to-end type safety from Server Action inputs to DB schema. |

---

## Rationale: High Concurrency in Serverless

Building a "Surge-Safe" system in a serverless environment requires a different approach than traditional long-running servers.

### 1. The Locking Strategy (Postgres)
We use **Row-Level Locking** with `FOR UPDATE SKIP LOCKED`.
- **Why:** In a surge, 1000+ lambdas may trigger simultaneously. If they all wait for the same row lock (`FOR UPDATE`), they will time out. `SKIP LOCKED` allows lambdas to instantly find the next available ticket or fail gracefully without clogging the DB connection pool.
- **Drizzle Implementation:**
  ```typescript
  await db.transaction(async (tx) => {
    const ticket = await tx.select()
      .from(tickets)
      .where(and(eq(tickets.eventId, id), eq(tickets.status, 'available')))
      .limit(1)
      .for('update', { skipLocked: true }); // Crucial for surge performance

    if (!ticket.length) throw new Error("Sold out");
    // Proceed with booking...
  });
  ```

### 2. The Waiting Room (Redis Lua)
To prevent the 1500-user surge from hitting Postgres all at once, we use **Upstash Redis** as a buffer.
- **Pattern:** Users are added to a "Waiting Room" (Sorted Set) via a Lua script. Only $N$ users per second are "released" to the booking Server Action.
- **Why Upstash:** Traditional Redis clients (ioredis) require persistent TCP connections which exhaust quickly in serverless. Upstash uses HTTP, handling thousands of concurrent "stateless" requests easily.

### 3. Connection Management
We recommend **Neon** (via Vercel Postgres) for the database.
- **Why:** Neon's serverless driver and connection pooling (via Pgbouncer/WebSockets) handle the "cold start" burst of connections much better than standard RDS.

---

## What NOT to Use (and Why)

| Tool | Avoid Because... |
|------|------------------|
| **Prisma** | While improved, its "Query Engine" binary adds overhead to cold starts, and fine-grained row-locking syntax is more verbose/clunky than Drizzle's SQL-near approach. |
| **Standard Redis (TCP)** | In serverless, you will hit `ECONNRESET` or connection limits during a surge. HTTP-based Redis (Upstash) is the 2026 standard for Vercel. |
| **Client-Side Polling** | Polling the DB for status kills performance. Use **Redis Pub/Sub** or **Server-Sent Events (SSE)** via a lightweight Edge function to notify users when they are "released" from the waiting room. |

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| **Next.js + Drizzle** | HIGH | Industry standard for Vercel-based projects requiring high performance. |
| **SELECT FOR UPDATE** | HIGH | Proven PostgreSQL pattern for inventory management; Drizzle's implementation is stable. |
| **Upstash Waiting Room**| MEDIUM | Requires careful Lua script implementation to avoid Redis bottlenecks, though the infrastructure is solid. |

## Sources
- [Drizzle ORM PostgreSQL Locking Documentation](https://orm.drizzle.team/docs/select#locking)
- [Upstash Redis Serverless Patterns](https://upstash.com/docs/redis/sdks/javascript/overview)
- [Neon Serverless Postgres Connection Pooling](https://neon.tech/docs/manage/connection-pooling)
- [Vercel High Concurrency Best Practices 2025/2026](https://vercel.com/docs/functions/configuring-functions/duration)
