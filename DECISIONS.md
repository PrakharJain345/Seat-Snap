# Architecture & Design Decisions (SeatSnap)

This log records non-obvious architectural and design decisions made during development, serving as documentation and interview preparation.

---

### Phase 1: Foundation & Monorepo

#### 1. Plain SQL Migrations with Migration Runner
- **Decision:** Use raw SQL migration files (`001_init.sql`) executed on startup by a lightweight migration runner with a `schema_migrations` tracking table per schema, instead of an ORM like Prisma or TypeORM.
- **Why:** Explicit SQL gives full transparency over schema definition, indexes (especially the partial unique index `uq_active_seat`), and transaction isolation. It avoids ORM overhead and ensures the data model is strictly aligned with the PRD specification.

#### 2. Service Schema Isolation
- **Decision:** A single PostgreSQL database instance partitioned into logical schemas: `auth`, `booking`, and `payment`.
- **Why:** Adheres to microservice database-per-service principles while keeping local development and testing lightweight with a single Postgres container. Services are programmatically and architecturally forbidden from querying other services' schemas directly.

#### 3. Gateway Architecture and Internal Authentication
- **Decision:** All client requests pass through the gateway on port 4000. For internal inter-service calls, the gateway injects `x-internal-key: $INTERNAL_API_KEY`, along with decoded identity headers `x-user-id` and `x-user-role`.
- **Why:** Internal services do not need to repeat JWT signature verification or rate-limiting logic. The internal key prevents external spoofing of identity headers if internal service ports are ever exposed.

#### 4. Shared Package without Heavy Cross-Dependencies
- **Decision:** `packages/shared` contains reusable contracts (Zod schemas), standardized error handling (`AppError`), logging (`pino`), and transactional helpers (`withTransaction`), compiled via TypeScript project references.
- **Why:** Avoids duplication across the four Node services while keeping each service independently deployable and runnable.

---

### Phase 2: Booking Core, Atomic Holds & Seat Statuses

#### 5. Atomic All-or-None Multi-Seat Hold (Redis Lua)
- **Decision:** Multi-seat hold reservation is handled by an atomic Redis Lua script (`HOLD_LUA_SCRIPT`) that checks all seat keys in a single execution. If even one seat is already held (`EXISTS`), the script aborts immediately and returns 0 without acquiring partial holds.
- **Why:** Prevents race conditions and partial hold deadlocks between concurrent users competing for overlapping seats. Eliminates messy rollback logic in distributed memory.

#### 6. Dual-Layer Status Resolution (PostgreSQL + Redis)
- **Decision:** Seat availability is computed in `getShowSeats` by combining PostgreSQL confirmed seat records (`status = 'CONFIRMED'`) with transient Redis hold keys (`hold:{showId}:{seatId}`).
- **Why:** Allows fast ephemeral seat reservations (5-minute TTL) with immediate visibility across polling clients, while keeping durable state in Postgres. If Redis experiences transient degradation, the query gracefully falls back to Postgres.

#### 7. Idempotency Key Handling for Holds
- **Decision:** The hold endpoint requires an `Idempotency-Key` header and checks for an existing `(user_id, idempotency_key)` booking in Postgres before invoking Redis or creating new rows.
- **Why:** Safely allows client retries in network failure scenarios without creating duplicate bookings or double-locking seats.

---

### Phase 3: Expiry Sweeper & Concurrency Guarantees

#### 8. Database-Level Unique Index Safety Net
- **Decision:** A PostgreSQL partial unique index `uq_active_seat ON booking.booking_seats (show_id, seat_id) WHERE status IN ('HELD', 'CONFIRMED')` is enforced in addition to Redis Lua scripting.
- **Why:** Defense-in-depth: Even if a Redis eviction, cache flush, or distributed split-brain occurs, Postgres categorically forbids two active booking rows for the same seat at the database constraint level.

#### 9. Transactional Expiry Sweeper with Asynchronous Notification
- **Decision:** The sweeper runs periodically (`SWEEPER_INTERVAL_SECONDS`), queries expired `PENDING_PAYMENT` bookings, locks rows with `FOR UPDATE`, transitions DB states to `EXPIRED` / `RELEASED`, cleans up Redis keys, and pushes `booking.expired` to the BullMQ `booking-events` queue.
- **Why:** Guarantees holds do not become perpetual zombies if user abandonments occur, freeing up seats for other waiting attendees while cleanly notifying downstream services.

---

### Phase 4: Payment Abstraction & Confirmation Saga

#### 10. Pluggable PaymentProvider Interface with Mock Provider
- **Decision:** All payment orders and signature verifications pass through an abstract `PaymentProvider` interface, implemented by `MockProvider` and `RazorpayProvider`.
- **Why:** Enables full end-to-end local testing, automated load tests, and developer onboarding without third-party merchant accounts, while allowing test-mode Razorpay checkout via simple env configuration (`PAYMENT_PROVIDER=razorpay`).

#### 11. Idempotent Webhook Deduplication via Primary Key Constraint
- **Decision:** Incoming webhook events are recorded in `payment.webhook_events` with `provider_event_id` as the primary key. If a duplicate event arrives (e.g. gateway/provider retry), PostgreSQL throws unique violation `23505`, which is trapped to return `200 { received: true, duplicate: true }` without triggering duplicate downstream actions.
- **Why:** Payment webhooks are at-least-once delivery; deduping at the earliest persistence boundary guarantees that payments are marked paid and events emitted exactly once.

#### 12. Asynchronous Confirmation via BullMQ
- **Decision:** Payment completion does not synchronously block on booking confirmation. The payment service emits `payment.succeeded` to BullMQ, where `booking-core` executes the confirmation transaction.
- **Why:** Decouples the payment webhook ingestion from booking core transactions. If booking core experiences a brief hiccup, BullMQ's exponential retry mechanism ensures zero lost confirmations.

---

### Phase 5: Late Payment Handling, QR Tickets & Notifications

#### 13. Late-Payment Safe Cancellation & Refund Path
- **Decision:** When `payment.succeeded` is processed by booking-core, the booking row is locked `FOR UPDATE`. If `expires_at < now()` or status is not `PENDING_PAYMENT`, the booking remains unconfirmed/expired, and a `booking.refund_requested` job is dispatched.
- **Why:** In high-concurrency environments, a user might pay right after their 5-minute hold expires and seats have already been claimed by another attendee. Confirming the late booking would violate the core invariant of zero double-bookings. Automatically triggering refund requests guarantees safety.

#### 14. HMAC-SHA256 Signed QR Tickets
- **Decision:** Ticket QR codes encode `ticketId.hex(HMAC_SHA256(ticketId, TICKET_SIGNING_SECRET))`. Validation checks the HMAC before checking database status `VALID -> USED`.
- **Why:** Prevents ticket forgery or sequential ID guessing without exposing secrets. Ticket scanners can instantly verify authenticity cryptographically before marking admission.

#### 15. Ethereal Email Worker with Fallback
- **Decision:** The notification worker uses Nodemailer with automated Ethereal test account generation when SMTP credentials are not supplied, logging preview URLs to the console.
- **Why:** Zero-friction local development and automated CI testing without requiring external email service credentials.

---

### Phase 6: Frontend Architecture & Polling Resiliency

#### 16. Short-Polling (3s) Over WebSockets
- **Decision:** As specified in PRD rule 2, the frontend polls `/api/shows/:id/seats` every 3 seconds using React Query rather than maintaining stateful WebSockets or SSE connections.
- **Why:** Massive simplicity in distributed scaling. Stateless HTTP polling works seamlessly across horizontal load balancers and serverless gateways without connection leaks, sticky sessions, or WebSocket proxy overhead.

#### 17. Client-Side Synchronized Hold Countdown
- **Decision:** The frontend displays an active hold countdown timer anchored to the server's ISO `expiresAt` timestamp.
- **Why:** Ensures the user has clear, transparent visibility into their reservation window, gracefully resetting seat selections if the 5-minute threshold is exceeded.

---

### Phase 7: Load Testing & Performance Verification

#### 18. Autocannon for 200-Connection Concurrency Benchmarks
- **Decision:** Use `autocannon` within Node.js to simulate 200 concurrent HTTP clients hammering the seat hold endpoint.
- **Why:** Scriptable, integrates into `npm run loadtest`, and provides accurate p50/p95/p99 latency distributions and status code breakdowns to prove zero oversells under extreme contention.



