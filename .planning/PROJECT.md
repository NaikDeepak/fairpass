# Surge-Safe Event Booking System

## What This Is

A high-reliability, single-purpose transaction rail for NGO sports events optimized for short, intense registration windows. It is designed to handle high surge traffic (~1500 bookings in 10-30 mins) with zero overbooking and a minimal, friction-free user experience (no login).

## Core Value

**Zero booking failures during high-surge traffic.** The system guarantees that if a user secures a booking intent, their spot is locked, eliminating race conditions and overselling.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **Public Event Page**: Static, cacheable page loading in <1s, displaying event details and real-time status.
- [ ] **Booking Intent System**: Atomic reservation mechanism (DB locking) that holds inventory for 5 minutes before payment.
- [ ] **Surge Protection Queue**: Custom Redis-backed active waiting room to throttle traffic during peak loads.
- [ ] **Frictionless Checkout**: Guest checkout flow requiring only essential details (Name, Phone, Email, Waiver) with no login.
- [ ] **Payment Integration**: Razorpay integration with webhook handling for reliable status updates and capacity release on failure.
- [ ] **Async Notifications**: Background workers for sending confirmation Emails (AWS SES) and SMS (Twilio) without blocking the booking path.
- [ ] **Admin Interface**: Single-tenant dashboard for organizers to create events, monitor counts, and export participant lists.
- [ ] **Fee Logic**: Implementation of flat ₹25 hidden fee per successful booking.

### Out of Scope

- **Marketplace Features**: No event discovery, feeds, or featured listings. This is a direct-link booking tool.
- **User Accounts**: No booking history or user profiles.
- **Mobile Apps**: Web-only implementation.
- **Complex Analytics**: No real-time heavy dashboards or marketing analytics.
- **Social Features**: No sharing, liking, or community tools.

## Context

- **Pilot Event**: Pune–Pandharpur Cycling Ride (~1500 participants).
- **Criticality**: High surge expected in first 10-30 minutes. Failure to load or overbooking is unacceptable.
- **Environment**: Next.js App Router on Vercel (Serverless), PostgreSQL for data, Redis for queue state.

## Constraints

- **Consistency**: **PostgreSQL Database Locking** (SELECT FOR UPDATE) must be used for capacity enforcement to ensure zero overselling.
- **Architecture**: **Serverless** (Vercel) backend; must handle connection pooling efficiently.
- **Queuing**: **Custom Redis** implementation for the waiting room state.
- **Payments**: **Razorpay** as the sole gateway for the pilot.
- **Notifications**: **AWS SES** (Email) and **Twilio** (SMS).
- **Reliability**: Webhooks must be idempotent.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| **Database Locking** | Prioritizing strict consistency/correctness over raw throughput to prevent overselling. | — Pending |
| **Serverless Backend** | Simplifies deployment and scaling on Vercel, trading off some control over persistent connections. | — Pending |
| **Redis Waiting Room** | Essential for protecting the database/backend from traffic spikes in a serverless environment. | — Pending |
| **Single Tenant Admin** | Simplifies permission model for the pilot; multi-tenancy deferred. | — Pending |

---
*Last updated: 2026-01-18 after initialization*
