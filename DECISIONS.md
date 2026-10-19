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


