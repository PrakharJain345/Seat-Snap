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
