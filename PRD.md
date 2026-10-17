# PRD — SeatSnap: Ticket Booking Platform (1-Week MVP)

> **Audience:** an AI coding agent (Antigravity) that will build this project end to end.
> Read this file together with `TECHSTACK.md`. Follow both literally. Where something is unspecified, choose the simplest option and note it in `DECISIONS.md`.

## 0. Rules for the agent (read first)

1. **Build in the phases of section 9, in order.** Do not start a phase until the previous phase's acceptance checks pass. Commit after each phase with message `phase N: <summary>`.
2. **Do not add features outside section 2 "In scope".** No waiting room, no organizer dashboard, no refunds UI, no WebSocket seat map. Polling only.
3. **Correctness over polish.** The core promise is: *the same seat can never be sold twice, even under heavy concurrency.* Never weaken this to save time.
4. **Every claim must be tested.** Write the concurrency test (section 8) and run it. Report real numbers in `README.md`; never invent numbers.
5. **Keep a `DECISIONS.md`** with one short entry per non-obvious decision (what, why). The developer will use it to prepare for interviews.
6. **Money is always an integer in the smallest unit (paise).** Never use floats for money.
7. Run linters and tests before each commit. Provide a working `docker compose up` at the end of every phase from phase 1 onward.

## 1. Product summary

SeatSnap lets users browse events, pick seats on a seat map, temporarily hold them, pay (test mode), and receive a signed QR ticket. Holds expire automatically. Payments are processed idempotently. The system must stay correct under concurrent load.

**Roles:** `customer` (default), `admin` (seeded, can create events via seed script only in this MVP).

## 2. Scope

**In scope**
- Signup, login (JWT)
- Browse events and shows; view seat map per show with live-ish status (frontend polls every 3 s)
- Atomic multi-seat hold with 5-minute TTL
- Booking state machine
- Payment via a `PaymentProvider` interface: `MockProvider` (default) and `RazorpayProvider` (test mode)
- Idempotent payment webhook with signature verification
- Hold/booking expiry sweeper
- Late-payment handling (payment succeeds after expiry → cancel and mark refund)
- Signed QR ticket (HMAC) and a ticket validation endpoint
- Email notification worker (console/Ethereal output is acceptable)
- Concurrency test + load test, README with architecture diagram

**Out of scope (do not build):** waiting room, organizer dashboard, real refunds, seat-category pricing rules, promo codes, admin UI, WebSockets, mobile app, i18n.

## 3. Architecture

Monorepo, four Node services plus a React web app, one Postgres instance (separate schema per service) and one Redis.

| Service | Port | Responsibility | Owns |
|---|---|---|---|
| `gateway` | 4000 | Public entry point. Hosts auth (signup/login), verifies JWT, rate limits, proxies to internal services, injects `x-user-id` and `x-user-role` | schema `auth` |
| `booking-core` | 4001 | Events, shows, seats, holds, bookings, tickets, expiry sweeper | schema `booking`, Redis hold keys |
| `payment` | 4002 | Payment orders, provider abstraction, webhooks, refund marking | schema `payment` |
| `notification` | 4003 | Consumes events, sends email (Nodemailer, Ethereal or console) | none |
| `web` | 5173 | React app | none |

**Rules:** services never read another service's schema. Internal calls require header `x-internal-key: $INTERNAL_API_KEY`. The gateway is the only service exposed to the browser.

**Messaging:** BullMQ queues on Redis.
- Queue `payment-events` (producer: payment, consumer: booking-core). Job types: `payment.succeeded`, `payment.failed`.
- Queue `booking-events` (producer: booking-core, consumer: notification and payment). Job types: `booking.confirmed`, `booking.expired`, `booking.refund_requested`.
- All consumers must be idempotent (see 6.3). Configure 5 attempts with exponential backoff; failed jobs stay in BullMQ's failed set (acts as dead-letter queue).

## 4. Core flow

```
1. POST /api/shows/:showId/hold {seatIds}   (customer)
   booking-core: Redis Lua script holds ALL seats or NONE (TTL 300 s)
   -> Postgres tx: create booking PENDING_PAYMENT + booking_seats HELD
   -> returns {bookingId, expiresAt}

2. POST /api/bookings/:id/pay
   booking-core -> payment (internal): create order  -> returns {orderId, checkoutInfo}
   Frontend completes payment (mock button or Razorpay checkout)

3. Provider webhook -> POST /api/payments/webhook  (public, signature verified)
   payment: dedupe by provider_event_id, mark payment PAID,
   publish payment.succeeded {bookingId, paymentId}

4. booking-core consumer on payment.succeeded:
   tx: lock booking row FOR UPDATE
     if status == PENDING_PAYMENT and not expired -> CONFIRMED, seats CONFIRMED, create tickets
     else -> late payment: status stays EXPIRED/CANCELLED, publish booking.refund_requested
   publish booking.confirmed -> notification sends email with ticket link

5. Sweeper (every 30 s): bookings PENDING_PAYMENT with expires_at < now()
   -> EXPIRED, booking_seats RELEASED, Redis hold keys deleted, publish booking.expired
```

## 5. Data model (SQL)

Create these as plain SQL migrations (`migrations/001_init.sql` per service), run automatically on service start.

### Schema `auth`
```sql
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Schema `booking`
```sql
CREATE SCHEMA IF NOT EXISTS booking;
CREATE TABLE booking.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, category text NOT NULL, city text NOT NULL, description text
);
CREATE TABLE booking.shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES booking.events(id),
  venue_name text NOT NULL, starts_at timestamptz NOT NULL
);
CREATE TABLE booking.seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid NOT NULL REFERENCES booking.shows(id),
  row_label text NOT NULL, seat_number int NOT NULL,
  price_minor int NOT NULL CHECK (price_minor > 0),
  UNIQUE (show_id, row_label, seat_number)
);
CREATE TABLE booking.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, show_id uuid NOT NULL REFERENCES booking.shows(id),
  status text NOT NULL CHECK (status IN
    ('PENDING_PAYMENT','CONFIRMED','EXPIRED','FAILED','CANCELLED')),
  total_minor int NOT NULL, idempotency_key text NOT NULL,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);
CREATE TABLE booking.booking_seats (
  booking_id uuid NOT NULL REFERENCES booking.bookings(id),
  show_id uuid NOT NULL, seat_id uuid NOT NULL REFERENCES booking.seats(id),
  status text NOT NULL CHECK (status IN ('HELD','CONFIRMED','RELEASED')),
  PRIMARY KEY (booking_id, seat_id)
);
-- The database-level safety net against double booking / double holding:
CREATE UNIQUE INDEX uq_active_seat ON booking.booking_seats (show_id, seat_id)
  WHERE status IN ('HELD','CONFIRMED');
CREATE TABLE booking.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES booking.bookings(id),
  seat_id uuid NOT NULL, status text NOT NULL DEFAULT 'VALID'
    CHECK (status IN ('VALID','USED')), checked_in_at timestamptz
);
CREATE TABLE booking.processed_events (
  event_key text PRIMARY KEY, processed_at timestamptz NOT NULL DEFAULT now()
);
```

### Schema `payment`
```sql
CREATE SCHEMA IF NOT EXISTS payment;
CREATE TABLE payment.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE, provider text NOT NULL,
  provider_order_id text NOT NULL, amount_minor int NOT NULL,
  status text NOT NULL CHECK (status IN ('CREATED','PAID','FAILED','REFUND_REQUESTED')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payment.webhook_events (
  provider_event_id text PRIMARY KEY, type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
```

### Seed data
A script `npm run seed` creates 1 admin, 5 events, 2 shows each, and a 10 x 10 seat grid per show (rows A–J, price 25000–60000 paise). Also create one show named **"Hot Show"** with a 20 x 20 grid for load testing.

## 6. Critical logic

### 6.1 Atomic hold (Redis Lua)
Key format: `hold:{showId}:{seatId}`, value: `bookingId`, TTL `HOLD_TTL_SECONDS` (default 300).

```lua
-- KEYS = seat keys; ARGV[1] = bookingId; ARGV[2] = ttl in ms
for i = 1, #KEYS do
  if redis.call('EXISTS', KEYS[i]) == 1 then return 0 end
end
for i = 1, #KEYS do
  redis.call('SET', KEYS[i], ARGV[1], 'PX', ARGV[2])
end
return 1
```
Release script: for each key, delete only if its value equals `bookingId`.

**Order of operations in `POST /shows/:id/hold`:**
1. Validate seat IDs belong to the show (max 6 seats per request).
2. Idempotency: if `(user_id, Idempotency-Key header)` already has a booking, return it.
3. Generate `bookingId`; run Lua hold. If it returns 0 → respond `409 {error:"SEATS_UNAVAILABLE"}`.
4. Postgres transaction: insert booking and booking_seats (`HELD`). If the unique index `uq_active_seat` fails → release Redis keys, respond `409`.
5. If the transaction fails for any reason, release Redis keys.

### 6.2 Confirmation transaction
On `payment.succeeded`: `BEGIN; SELECT ... FROM booking.bookings WHERE id=$1 FOR UPDATE;` If `status='PENDING_PAYMENT'` and `expires_at > now()`: set booking `CONFIRMED`, booking_seats `CONFIRMED`, insert one ticket per seat, `COMMIT`, delete Redis hold keys, publish `booking.confirmed`. Otherwise do not change seats, publish `booking.refund_requested` (payment service marks `REFUND_REQUESTED`).

### 6.3 Idempotency
- Webhook: insert into `payment.webhook_events`; on conflict, return `200` and do nothing.
- Queue consumers: insert `event_key` (`<type>:<bookingId>`) into `processed_events` inside the same transaction as the work; on conflict, skip.

### 6.4 Tickets
`qrToken = ticketId + "." + hex(HMAC_SHA256(ticketId, TICKET_SIGNING_SECRET))`. `GET /api/tickets/:id/qr` returns a PNG of the token. `POST /api/tickets/validate {token}` verifies the signature, checks status `VALID`, marks it `USED` atomically (`UPDATE ... WHERE status='VALID' RETURNING`), and returns `{valid:true}` once, `{valid:false, reason:"ALREADY_USED"}` afterwards.

## 7. API (public, via gateway on port 4000)

All JSON. Auth = `Authorization: Bearer <jwt>`. Errors: `{error: "CODE", message: "..."}`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | none | `{email, password}` → `{token}` (password min 8, bcrypt) |
| POST | `/api/auth/login` | none | `{email, password}` → `{token}` |
| GET | `/api/events` | none | Query `city`, `q`, `category` |
| GET | `/api/events/:id` | none | Event with its shows |
| GET | `/api/shows/:id/seats` | none | `[{id,row,number,priceMinor,status: AVAILABLE|HELD|BOOKED}]` (status from Redis holds + confirmed seats) |
| POST | `/api/shows/:id/hold` | customer | Header `Idempotency-Key`; body `{seatIds: []}` → `{bookingId, expiresAt, totalMinor}` |
| POST | `/api/bookings/:id/pay` | customer (owner) | Creates payment order → `{orderId, provider, checkout}` |
| GET | `/api/bookings/:id` | customer (owner) | Booking with status, seats, tickets |
| GET | `/api/me/bookings` | customer | List own bookings |
| POST | `/api/payments/webhook` | signature | Provider webhook (public route, no JWT) |
| POST | `/api/payments/mock/:orderId/complete` | customer | **Dev/mock only.** Simulates provider success webhook with a valid signature |
| GET | `/api/tickets/:id/qr` | customer (owner) | PNG QR |
| POST | `/api/tickets/validate` | admin | Validate and consume a ticket |
| GET | `/health` | none | On every service |

Rate limit: 100 requests/minute per IP on the gateway; 10/minute on login and signup.

## 8. Testing requirements

1. **Unit tests** (Vitest): Lua hold wrapper (all-or-none), confirmation transaction, webhook dedupe, HMAC ticket verification.
2. **Concurrency test (mandatory)** `tests/concurrency.test.ts`: 300 parallel hold requests (from 50 different users) for the same 5 seats on "Hot Show". Assert exactly one booking succeeds per seat, all others get `409`, and a SQL query shows zero seats with more than one active booking.
3. **Webhook replay test:** send the same success webhook 5 times; assert one confirmation, one set of tickets.
4. **Late payment test:** create a hold, let it expire (set TTL to 2 s via env), then deliver a success webhook; assert booking stays not-confirmed and a refund request is recorded.
5. **Load test** with `k6` or `autocannon` (`loadtest/`): hold endpoint under 200 concurrent users for 60 s. Record requests/sec, p95 latency and the number of oversells (must be 0) in `README.md`.

## 9. Build phases and acceptance checks

| Phase | Build | Accept when |
|---|---|---|
| 1 | Monorepo, Docker Compose (Postgres, Redis, all services as stubs with `/health`), gateway with signup/login, migrations, seed script | `docker compose up` works; signup, login and `GET /api/events` return data |
| 2 | booking-core: events/shows/seats endpoints, seat statuses, hold endpoint with Lua script, bookings, idempotency key | Two parallel holds on one seat: exactly one succeeds |
| 3 | Unique index safety net, expiry sweeper, release logic, concurrency test | Concurrency test passes with zero double bookings |
| 4 | payment service: provider interface, MockProvider, order creation, webhook with signature and dedupe, BullMQ events, confirmation transaction, tickets | Mock payment confirms booking; replaying the webhook changes nothing |
| 5 | Late-payment path, RazorpayProvider (test mode, optional if keys exist), notification worker, ticket QR and validate endpoints | Late payment test and webhook replay test pass |
| 6 | Web app: event list, event page, seat map (3 s polling), hold with countdown, pay (mock button), my bookings with QR | Whole flow works in the browser |
| 7 | Load test, `README.md` (architecture diagram in Mermaid, how to run, measured results, "problems solved"), `DECISIONS.md`, deploy config | README has real measured numbers; app runs from a clean clone with `docker compose up` |

## 10. Definition of done

- All tests in section 8 pass and are runnable with `npm test`.
- `docker compose up --build` starts everything; `npm run seed` loads data.
- README contains: overview, Mermaid architecture and saga diagrams, setup steps, API summary, measured load-test results, known limitations (state honestly that Docker/Mock payments are not production-grade).
- No secrets committed; `.env.example` is provided.
