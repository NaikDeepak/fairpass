# Roadmap: Surge-Safe Event Booking System

## Overview

This roadmap defines the path to building a high-reliability, surge-safe booking system. The critical path prioritizes **infrastructure safety** (database locking and queue protection) before **user experience** (checkout UI) to ensure the system can survive the target load of 1500 concurrent users. The architecture separates the "Gatekeeper" (Redis Waiting Room) from the "Transaction Engine" (Postgres Atomic Locking) to prevent serverless connection exhaustion.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Atomic Core** - Database schema and atomic inventory locking logic.
- [ ] **Phase 2: Waiting Room Core** - Redis-backed admission control and bot mitigation.
- [ ] **Phase 3: Queue Experience** - Real-time queue position updates via SSE.
- [ ] **Phase 4: Session Management** - Booking intent lifecycle and inventory heartbeat.
- [ ] **Phase 5: Checkout UI** - Frictionless guest checkout frontend.
- [ ] **Phase 6: Payment Integration** - Razorpay integration with idempotent webhooks.
- [ ] **Phase 7: Communications** - Async email and SMS confirmation pipelines.
- [ ] **Phase 8: Admin Dashboard** - Organizer visibility and data export.

## Phase Details

### Phase 1: Atomic Core
**Goal**: Establish the database source of truth with guaranteed atomic inventory consistency.
**Depends on**: Nothing (foundation)
**Requirements**: BOOK-01
**Success Criteria** (what must be TRUE):
  1. Postgres database is reachable from Vercel environment.
  2. Database schema (Events, Bookings) is deployed.
  3. `FOR UPDATE SKIP LOCKED` logic successfully prevents double-booking in concurrency tests.
  4. Inventory counts remain accurate after 100 simultaneous simulated requests.
**Research**: Likely (Drizzle Locking)
**Research topics**: Drizzle ORM locking syntax, Vercel Postgres connection pooling config.
**Plans**: 2 plans

### Phase 2: Waiting Room Core
**Goal**: Protect the database from surge traffic using a Redis-backed gatekeeper.
**Depends on**: Phase 1
**Requirements**: SURGE-01, SURGE-04
**Success Criteria** (what must be TRUE):
  1. Requests exceeding defined capacity are intercepted at the Middleware level.
  2. Redis correctly stores and retrieves queue positions using FIFO ordering.
  3. Validated tokens allow access to protected routes.
**Research**: Likely (Redis Lua)
**Research topics**: Upstash Redis Lua scripts for atomic queue operations, Next.js Middleware patterns.
**Plans**: 3 plans

### Phase 3: Queue Experience
**Goal**: Keep queued users informed via robust polling (avoiding connection limits).
**Depends on**: Phase 2
**Requirements**: SURGE-02
**Success Criteria** (what must be TRUE):
  1. Users in queue see their dynamic position number.
  2. Queue position updates via polling mechanism (no WebSocket fragility).
  3. "You are next" state transitions user to booking flow.
**Research**: Unlikely (Standard Polling)
**Plans**: 2 plans

### Phase 4: Session Management
**Goal**: Manage the temporary reservation state while users prepare to pay.
**Depends on**: Phase 1 (DB), Phase 2 (Gate)
**Requirements**: BOOK-02, BOOK-03, BOOK-04, BOOK-05
**Success Criteria** (what must be TRUE):
  1. "Booking Intent" record is created with a 5-minute expiration.
  2. Booking intent creation is idempotent per session (prevent duplicate holds).
  3. Inventory is tentatively held during the active session.
  4. Expired sessions automatically release inventory back to the pool.
  5. Heartbeat check prevents payment initialization if session expired.
**Research**: Unlikely (Standard Redis/DB patterns)
**Plans**: 2 plans

### Phase 5: Checkout UI
**Goal**: Provide a fast, friction-free data entry interface for guest users.
**Depends on**: Phase 4
**Requirements**: PAY-01
**Success Criteria** (what must be TRUE):
  1. Users can enter guest details (Name, Email, Phone) without login.
  2. Form validation ensures required contact info is present.
  3. UI handles "Session Expired" states gracefully.
**Research**: Unlikely (Standard React forms)
**Plans**: 1 plan

### Phase 6: Payment Integration
**Goal**: Process payments reliably with strict protection against duplicate charges.
**Depends on**: Phase 5
**Requirements**: PAY-02, PAY-03, PAY-04
**Success Criteria** (what must be TRUE):
  1. Razorpay checkout modal launches successfully.
  2. Webhooks verify cryptographic signatures before processing.
  3. Idempotency logic prevents processing the same payment twice.
  4. Hidden ₹25 fee is correctly calculated and logged.
  5. Success page renders based on server verification, not client redirect.
**Research**: Likely (Razorpay Webhooks)
**Research topics**: Razorpay Node.js SDK, Webhook signature verification, Idempotency keys.
**Plans**: 3 plans

### Phase 7: Communications
**Goal**: deliver confirmation artifacts without blocking the booking flow.
**Depends on**: Phase 6
**Requirements**: COMM-01
**Success Criteria** (what must be TRUE):
  1. Email confirmation arrives within 1 minute of payment success.
  2. SMS confirmation arrives within 1 minute of payment success.
  3. Communication failures are retried without failing the booking.
**Research**: Unlikely (Standard APIs)
**Plans**: 2 plans

### Phase 8: Admin Dashboard
**Goal**: Provide operational visibility to event organizers.
**Depends on**: Phase 1
**Requirements**: ADM-01
**Success Criteria** (what must be TRUE):
  1. Organizer can see real-time "Tickets Sold" vs "Total Capacity".
  2. Organizer can export full participant list to CSV.
  3. Admin route is protected by basic authentication.
**Research**: Unlikely (Standard UI)
**Plans**: 1 plan

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Atomic Core | 2/2 | Complete | 2026-01-18 |
| 2. Waiting Room Core | 0/3 | Not started | - |
| 3. Queue Experience | 0/2 | Not started | - |
| 4. Session Management | 0/2 | Not started | - |
| 5. Checkout UI | 0/1 | Not started | - |
| 6. Payment Integration | 0/3 | Not started | - |
| 7. Communications | 0/2 | Not started | - |
| 8. Admin Dashboard | 0/1 | Not started | - |
