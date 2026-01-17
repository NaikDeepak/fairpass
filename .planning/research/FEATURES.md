# Feature Landscape: Surge-Safe Event Booking

**Domain:** High-Concurrency Event Booking
**Confidence:** HIGH

## Table Stakes (Must-Have)
Features required to compete and function reliably.

| Feature | Description | Implementation Note |
|---------|-------------|---------------------|
| **Atomic Inventory** | Guaranteed zero over-booking. | Use Postgres `FOR UPDATE SKIP LOCKED`. |
| **Virtual Waiting Room** | Queues users when traffic exceeds DB capacity. | Use Redis Sorted Sets (ZSET). |
| **Session Locking** | Reserve a ticket for $X$ minutes while user pays. | Redis key with TTL (e.g., `ticket:hold:{id}`). |
| **Idempotent Payments** | Prevent double charging/booking. | Map Razorpay `order_id` to local `transaction_id`. |
| **Responsive Progress** | Real-time "Position in Queue" updates. | Server-Sent Events (SSE) or Ably/Pusher. |

## Differentiators (Value-Add)
Features that make the system "Surge-Safe" and user-friendly.

| Feature | Description | Why It Matters |
|---------|-------------|----------------|
| **Bot Mitigation** | Challenge-Response (Turnstile) before queue entry. | Prevents scripts from eating all inventory. |
| **Dynamic Throttling** | Auto-adjust admission rate based on DB CPU/Load. | Protects infrastructure from melting. |
| **Fair-Share Queueing** | Ensure users with faster internet don't skip the line. | Uses server-side arrival time, not client-side. |
| **Instant Failover** | Graceful "Sold Out" state with no DB hits. | Once Redis counter hits 0, all entry stops at the Edge. |

## Anti-Features (Avoid)
Features that look good but destroy performance.

- **Global Locking:** Locking the entire `events` table during a booking. (Result: Deadlocks)
- **Client-Side Timers:** Relying on the browser to expire a reservation. (Result: Cheat-able)
- **Heavy PDF Generation on Request:** Generating a ticket PDF during the booking transaction. (Result: Timeouts. Move to background job.)
- **Relational Polling:** Constant `SELECT COUNT(*)` to show available tickets. (Result: DB IOPS exhaustion. Use a cached Redis counter.)

---
## Sources
- [Building a Waiting Room with Redis](https://upstash.com/blog/waiting-room)
- [Razorpay Webhook Best Practices](https://razorpay.com/docs/payments/webhooks/)
- [Next.js Server Actions Concurrency Limits](https://vercel.com/docs/functions/configuring-functions/concurrency)
