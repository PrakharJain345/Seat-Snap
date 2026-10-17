# TECHSTACK — SeatSnap (1-Week MVP)

> Companion to `PRD.md`. Use exactly these technologies. Do not swap libraries or add new frameworks without recording the reason in `DECISIONS.md`.

## 1. Stack at a glance

| Area | Choice |
|---|---|
| Language | TypeScript (strict mode) on Node.js 20 LTS everywhere |
| Backend framework | Express 4 |
| Frontend | React 18, Vite, Tailwind CSS, React Router, TanStack Query |
| Database | PostgreSQL 16 (one instance, schemas `auth`, `booking`, `payment`) |
| DB access | `pg` driver with plain SQL and SQL migration files (no ORM) |
| Cache, locks, queues | Redis 7 with `ioredis` |
| Job queue / events | BullMQ |
| Auth | JWT (`jsonwebtoken`), passwords with `bcryptjs` |
| Validation | `zod` on every request body and every queue payload |
| Payments | `PaymentProvider` interface; `MockProvider` (default) and `RazorpayProvider` (test mode, `razorpay` SDK) |
| QR codes | `qrcode` |
| Email | `nodemailer` (Ethereal test account, or console fallback) |
| Logging | `pino` with a correlation ID (`x-request-id`) on every request and job |
| Testing | Vitest, Supertest, `autocannon` (or `k6`) for load tests |
| Containers | Docker, Docker Compose |
| CI | GitHub Actions: install, lint, typecheck, test |
| Deployment (final phase) | One small VM running Docker Compose behind Caddy (automatic HTTPS), or Render/Railway if simpler |

## 2. Why this stack (short)

- **Plain SQL, no ORM:** the correctness story depends on a partial unique index, `SELECT ... FOR UPDATE` and explicit transactions. Writing them directly keeps them visible and explainable.
- **Redis Lua script:** atomic all-or-none seat holds across concurrent requests.
- **PostgreSQL unique index:** second safety net so a Redis bug cannot oversell.
- **BullMQ:** retries, backoff and a failed set (acts as a dead-letter queue) with minimal setup.
- **Mock payment provider first:** the whole flow is testable and demoable without external keys; Razorpay is a drop-in implementation of the same interface.
- **Polling instead of WebSockets:** removes a whole class of complexity for the one-week scope.

## 3. Repository layout

```
seatsnap/
  docker-compose.yml
  .env.example
  README.md  PRD.md  TECHSTACK.md  DECISIONS.md
  package.json              # npm workspaces
  packages/
    shared/                 # zod schemas, event types, logger, internal-auth middleware, db helper
  services/
    gateway/                # auth module + proxy + rate limiting
    booking-core/           # events, seats, holds, bookings, tickets, sweeper, consumers
    payment/                # providers, orders, webhook
    notification/           # queue consumer, mailer
  web/                      # React app
  scripts/
    seed.ts
  tests/
    concurrency.test.ts  webhook-replay.test.ts  late-payment.test.ts
  loadtest/
    hold.js
```

Each service has: `src/index.ts`, `src/routes/`, `src/db.ts`, `src/migrations/001_init.sql`, `src/config.ts` (reads and validates env with zod), `Dockerfile`, `package.json`.

## 4. Ports and service URLs

| Component | Port | Env var used by callers |
|---|---|---|
| gateway | 4000 | `VITE_API_URL` (web) |
| booking-core | 4001 | `BOOKING_URL` |
| payment | 4002 | `PAYMENT_URL` |
| notification | 4003 | none |
| web (dev) | 5173 | none |
| Postgres | 5432 | `DATABASE_URL` |
| Redis | 6379 | `REDIS_URL` |

## 5. Environment variables (`.env.example`)

```
NODE_ENV=development
DATABASE_URL=postgres://seatsnap:seatsnap@postgres:5432/seatsnap
REDIS_URL=redis://redis:6379
JWT_SECRET=change-me
INTERNAL_API_KEY=change-me-internal
TICKET_SIGNING_SECRET=change-me-ticket
HOLD_TTL_SECONDS=300
SWEEPER_INTERVAL_SECONDS=30
MAX_SEATS_PER_BOOKING=6
BOOKING_URL=http://booking-core:4001
PAYMENT_URL=http://payment:4002
PAYMENT_PROVIDER=mock            # mock | razorpay
PAYMENT_WEBHOOK_SECRET=change-me-webhook
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
VITE_API_URL=http://localhost:4000
```

## 6. Docker Compose requirements

- Services: `postgres` (with healthcheck), `redis`, `gateway`, `booking-core`, `payment`, `notification`, `web` (dev server or static build served by Caddy/Nginx).
- Application services must `depends_on` Postgres and Redis with `condition: service_healthy`.
- Each service runs its migrations at startup (idempotent: `CREATE ... IF NOT EXISTS` and a `schema_migrations` table).
- Only `gateway` and `web` publish ports to the host in production mode; internal services stay on the Compose network.

## 7. Conventions

- **Code style:** ESLint + Prettier, no `any` without a comment, small functions, no business logic in route handlers (use `services/` functions).
- **Errors:** one error class with `code` and HTTP status; a single error-handling middleware returns `{error, message}`.
- **Transactions:** a `withTransaction(fn)` helper in `packages/shared`; every multi-statement write uses it.
- **Request IDs:** gateway generates `x-request-id` if absent and every service/queue job logs it.
- **Time:** store UTC (`timestamptz`); the server decides expiry, never the client. The API returns `expiresAt` and the UI counts down against server time offset.
- **Money:** integer paise in code, DB and API. Format only in the UI.
- **Security basics:** helmet, CORS limited to the web origin, rate limits (100/min per IP; 10/min on auth routes), parameterized SQL only, verify webhook signatures with constant-time comparison, never log secrets or tokens.
- **Queues:** 5 attempts, exponential backoff starting at 1 s; consumers idempotent via `processed_events`; validate payloads with zod before processing.
- **Tests:** integration tests run against Compose's Postgres and Redis (use a separate database name for tests).

## 8. Key commands (provide these npm scripts at the repo root)

```
npm run dev          # docker compose up --build (watch mode where possible)
npm run seed         # create admin, events, shows, seats, "Hot Show"
npm test             # unit + integration tests (includes concurrency test)
npm run lint
npm run typecheck
npm run loadtest     # runs loadtest/hold.js and prints requests/sec, p95, oversell count
```

## 9. Libraries to install (per service)

- **shared:** `zod`, `pino`, `pg`, `ioredis`, `bullmq`
- **gateway:** `express`, `helmet`, `cors`, `express-rate-limit`, `http-proxy-middleware`, `jsonwebtoken`, `bcryptjs`
- **booking-core:** `express`, `pg`, `ioredis`, `bullmq`, `zod`, `qrcode`
- **payment:** `express`, `pg`, `bullmq`, `zod`, `razorpay` (only used by `RazorpayProvider`)
- **notification:** `bullmq`, `nodemailer`, `pino`
- **web:** `react`, `react-router-dom`, `@tanstack/react-query`, `tailwindcss`
- **dev:** `typescript`, `tsx`, `vitest`, `supertest`, `eslint`, `prettier`, `autocannon`

## 10. Frontend pages

1. `/` — events list with search and city filter
2. `/events/:id` — event details and shows
3. `/shows/:id` — seat map grid (rows x seats; colors for available, held, booked, selected), polls `/api/shows/:id/seats` every 3 s, "Hold seats" button
4. `/checkout/:bookingId` — countdown from `expiresAt`, "Pay (test)" button calling the mock completion endpoint, success and expired states
5. `/my-bookings` — list with status and QR image for confirmed tickets
6. `/login`, `/signup`

Keep the UI clean and responsive using Tailwind; do not spend time on animations.

## 11. Deployment notes

- Provide `docker-compose.prod.yml` with Caddy as the reverse proxy, serving the built `web` and proxying `/api` to the gateway.
- Provide a short `DEPLOY.md` with the exact steps for a fresh Ubuntu VM (install Docker, clone, set `.env`, `docker compose -f docker-compose.prod.yml up -d --build`).
- Use `PAYMENT_PROVIDER=mock` for the public demo unless Razorpay test keys are set.

## 12. Out of scope technologies (do not add)

Kubernetes, Kafka, RabbitMQ, GraphQL, MongoDB, Socket.io, Next.js, any ORM, microfrontends.
