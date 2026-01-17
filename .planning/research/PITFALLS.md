# Pitfalls Research

**Domain:** High-Concurrency Event Booking (Serverless/Postgres/Redis)
**Researched:** 2026-01-18
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: The "Phantom Inventory" Race (Check-then-Act)

**What goes wrong:**
Multiple users successfully book the same last remaining ticket, leading to overselling. The system says "Success" to 5 users for 1 available slot.

**Why it happens:**
Developers use a "Check then Act" pattern: `if (inventory > 0) { createBooking(); decrementInventory(); }`. In a high-surge environment, multiple serverless instances read `inventory = 1` simultaneously before any of them can write the decrement.

**How to avoid:**
1. **Database Level:** Use `UPDATE tickets SET count = count - 1 WHERE id = ? AND count > 0` which is atomic in PostgreSQL.
2. **Pessimistic Locking:** Use `SELECT ... FOR UPDATE` inside a transaction to lock the inventory row.
3. **Redis Atomic:** Use `DECR` in Redis as the primary source of truth for "active" inventory during the surge, sync to DB later.

**Warning signs:**
- Discrepancy between `bookings` table count and `inventory` count during load tests.
- High volume of concurrent requests to the same event ID.

**Phase to address:** Phase 2: Core Booking Engine

---

### Pitfall 2: Postgres Connection Exhaustion (Serverless Burst)

**What goes wrong:**
During a surge (1500+ users), Vercel spins up hundreds of serverless instances. Each instance tries to open a new connection to PostgreSQL, hitting `max_connections` (often 100-500). Subsequent requests fail with "Too many clients" errors.

**Why it happens:**
Serverless functions are ephemeral and horizontal. Unlike a long-running server with a managed pool, serverless environments create a "connection storm" during traffic spikes.

**How to avoid:**
1. **Connection Pooling:** Use a tool like **PgBouncer** or **Prisma Accelerate**. If using Vercel Postgres, ensure the `@vercel/postgres` driver is used with proper pooling configuration.
2. **Lean Connections:** Only open the DB connection when absolutely necessary in the function body, and ensure it's closed (or pooled correctly by the runtime).

**Warning signs:**
- `FATAL: remaining connection slots are reserved for non-replication superuser connections` in logs.
- Spiking error rates that correlate exactly with traffic spikes, even if DB CPU is low.

**Phase to address:** Phase 1: Infrastructure & Data Schema

---

### Pitfall 3: Razorpay Webhook vs. Redirect Race

**What goes wrong:**
A booking is marked "Paid" twice, or worse, fails to mark as "Paid" because the webhook and the client-side redirect (return URL) collide. The user sees an error even though they paid.

**Why it happens:**
Razorpay sends a webhook asynchronously while the user is redirected back to your site. Both triggers might attempt to update the booking status to `COMPLETED` at the same time. If not idempotent, the second one might fail or cause side effects (like sending two confirmation emails).

**How to avoid:**
1. **Idempotency Keys:** Use a unique `payment_id` or `order_id` as a database constraint.
2. **Status Guarding:** Use a state machine approach: `UPDATE bookings SET status = 'PAID' WHERE id = ? AND status = 'PENDING'`.
3. **Deterministic Logic:** Treat the webhook as the ultimate source of truth, but allow the redirect to "optimistically" update the UI if the webhook hasn't arrived.

**Warning signs:**
- "Duplicate key value violates unique constraint" errors in logs after successful payments.
- Users reporting "Payment failed" on screen but receiving a confirmation email.

**Phase to address:** Phase 3: Payment Integration

---

### Pitfall 4: Waiting Room "Stampede" (Thundering Herd)

**What goes wrong:**
The Redis-based waiting room releases a batch of 100 users. These 100 users all hit the Booking API at the exact same millisecond, overwhelming the Postgres connection pool or the inventory lock.

**Why it happens:**
Custom waiting rooms often release users in fixed intervals (e.g., every 30s). This creates artificial "micro-surges" that are harder to handle than a steady stream.

**How to avoid:**
1. **Staggered Release:** Use a "leaky bucket" algorithm or release users with a small random jitter (delay).
2. **Token-Based Entry:** Instead of just letting them in, give the waiting room user a short-lived "Entry Token" that they must exchange for a booking session.

**Warning signs:**
- Sawtooth patterns in response times (spikes every time a batch is released).
- High database contention at the start of every release cycle.

**Phase to address:** Phase 4: Surge & Load Validation

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| No connection pooler | Faster setup, less infra to manage | System crashes at ~50 concurrent users | Never (given "Zero booking failures" requirement) |
| Client-side inventory check | Easy UI feedback | Critical overselling and data corruption | Only for UI "graying out" buttons; never for logic |
| Syncing DB on every Redis increment | Simple logic | DB becomes the bottleneck; Redis speed is wasted | Never during surge |
| Ignoring Webhooks (Redirect only) | Easier payment flow | High rate of "lost" bookings if user closes tab | Never |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **Redis** | Not using Lua scripts for multi-step logic | Use Lua scripts for atomic "Check-and-Reserve" in the Waiting Room |
| **Razorpay** | Not verifying webhook signatures | Always verify the `X-Razorpay-Signature` to prevent spoofed payments |
| **Next.js** | Long-running logic in Edge Functions | Use Edge for routing/waiting room; use Node.js Serverless for heavy DB writes (due to timeout limits) |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Large JSON payloads | High bandwidth cost, slow parsing | Send only IDs and essential tokens during surge | > 500 concurrent users |
| Sequential DB queries | High latency, connection held longer | Use `Promise.all` or combine into single complex queries | > 1000 requests/min |
| Deeply nested transactions | Transaction timeouts, deadlocks | Keep transactions short and flat; do external API calls *outside* the DB lock | > 50 active locks |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Insecure Waiting Room Token | Users bypass the queue by guessing the URL/token | Use HMAC signed tokens or Redis-backed session IDs |
| ID Enumeration | Competitors/Scrapers can see total booking volume | Use UUIDs instead of sequential integers for public-facing Order IDs |
| Missing Rate Limiting on Redis | A single bot can fill up the waiting room slots | Implement IP-based rate limiting *before* the waiting room logic |

## "Looks Done But Isn't" Checklist

- [ ] **Inventory Locking:** Verify with a script that 10 concurrent requests for 1 ticket results in 1 success and 9 failures.
- [ ] **Connection Resilience:** Verify that the app recovers automatically after a "Too many connections" error without a restart.
- [ ] **Payment Idempotency:** Manually trigger the Razorpay webhook twice for one order; verify only one ticket is issued.
- [ ] **Waiting Room Expiry:** Ensure users who leave the tab have their "reserved" slot returned to the pool after X minutes.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|----------|---------------|----------------|
| Overselling | HIGH | Manual cancellation, refunds, and apology emails. |
| DB Connection Crash | MEDIUM | Temporary 503 page, scale up DB or restart pooler. |
| Stuck Waiting Room | LOW | Flush specific Redis keys for the active session. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Connection Exhaustion | Phase 1 | Load test with 100+ concurrent connections |
| Inventory Race | Phase 2 | Concurrency test (K6 or similar) on the booking endpoint |
| Webhook Race | Phase 3 | Scripted double-POST to the webhook endpoint |
| Stampede Effect | Phase 4 | Observe DB metrics during a simulated waiting room release |

## Sources

- [Postgres Concurrency: SELECT FOR UPDATE](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)
- [Vercel Postgres Connection Pooling Docs](https://vercel.com/docs/storage/vercel-postgres/usage#connection-pooling)
- [Razorpay Best Practices: Handling Webhooks](https://razorpay.com/docs/payments/webhooks/best-practices/)
- [High Concurrency Booking Systems (Engineering Blogs)](https://tailscale.com/blog/how-we-built-a-waiting-room/) - *General pattern reference*

---
*Pitfalls research for: Surge-Safe Event Booking System*
*Researched: 2026-01-18*
