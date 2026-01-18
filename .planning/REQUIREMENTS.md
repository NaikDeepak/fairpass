# Requirements: Surge-Safe Event Booking System

**Defined:** 2026-01-18
**Core Value:** Zero booking failures during high-surge traffic.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Surge Protection

- [ ] **SURGE-01**: System queues users in a Redis-backed Waiting Room when traffic exceeds capacity.
- [ ] **SURGE-02**: Users receive queue position updates via polling (safer under surge than SSE).
- [ ] **SURGE-04**: Queue ordering enforces fair-share based on server-side arrival time.

### Booking Engine

- [ ] **BOOK-01**: Inventory is strictly enforced using Postgres `FOR UPDATE SKIP LOCKED` (Atomic Inventory).
- [ ] **BOOK-02**: Selected tickets are locked for a specific duration (e.g., 5 minutes) while user pays (Session Locking).
- [ ] **BOOK-03**: System performs a final inventory heartbeat check immediately before payment initialization.
- [ ] **BOOK-04**: Expired ticket holds are automatically released back to the pool (Auto-Release Logic).
- [ ] **BOOK-05**: Booking intent creation is idempotent per client session.

### Checkout & Payments

- [ ] **PAY-01**: Users can complete booking as guests (Name, Email, Phone) without password authentication.
- [ ] **PAY-02**: Razorpay payment integration handles success/failure with strict idempotency (Webhook verification).
- [ ] **PAY-03**: System calculates and logs a flat ₹25 fee per successful booking (hidden from attendee).
- [ ] **PAY-04**: Payment success state is derived from server-side verification, not client redirect.

### Admin & Communications

- [ ] **ADM-01**: Organizer can view total bookings/capacity and export CSV (no charts/filters).
- [ ] **COMM-01**: System sends async confirmation via AWS SES (Email) and Twilio (SMS).

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Surge Advanced
- **SURGE-03**: Bot mitigation (Cloudflare Turnstile) challenges users before queue entry.
- **SURGE-05**: Instant Failover (Graceful 'Sold Out' state at Edge without hitting DB).

### Infrastructure
- **INFRA-01**: Pre-Warmed Infrastructure (Cold start mitigation).

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Marketplace Features | This is a direct-link booking tool, not a discovery platform. |
| User Accounts | Friction-free guest checkout is the priority. |
| Mobile Apps | Web-only implementation for the pilot. |
| Complex Analytics | Real-time dashboards are too heavy; simple counts suffice. |
| Social Features | No sharing/liking to keep the flow minimal. |
| Global Locking | Causes deadlocks; use Row-Level locking instead. |
| Client-Side Timers | Insecure; expiration must be server-controlled. |
| PDF Ticket Generation | Defer to async job; do not block booking response. |

## Traceability

Which phases cover which requirements. Updated by create-roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SURGE-01 | Phase 2 | Pending |
| SURGE-02 | Phase 3 | Pending |
| SURGE-04 | Phase 2 | Pending |
| BOOK-01 | Phase 1 | Pending |
| BOOK-02 | Phase 4 | Pending |
| BOOK-03 | Phase 4 | Pending |
| BOOK-04 | Phase 4 | Pending |
| BOOK-05 | Phase 4 | Pending |
| PAY-01 | Phase 5 | Pending |
| PAY-02 | Phase 6 | Pending |
| PAY-03 | Phase 6 | Pending |
| PAY-04 | Phase 6 | Pending |
| ADM-01 | Phase 8 | Pending |
| COMM-01 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-18*
