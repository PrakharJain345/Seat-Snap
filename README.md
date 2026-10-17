# 🎟️ SeatSnap: High-Concurrency Ticket Booking Platform

> **Core Promise:** The same seat can never be sold twice, even under heavy concurrent load.

SeatSnap is a production-grade ticket booking platform engineered to handle flash-sale ticket demand. It features atomic multi-seat holds with a 5-minute TTL, PostgreSQL partial unique constraints as a hard safety net, an idempotent payment webhook pipeline with BullMQ event queues, and signed HMAC-SHA256 QR ticketing.

---

## 🏗️ Architecture Overview

SeatSnap is structured as an Express + TypeScript monorepo with service isolation over a partitioned PostgreSQL instance and Redis:

```mermaid
graph TD
  User([Client Browser / Mobile]) -->|HTTP / JSON| Gateway[Gateway :4000]
  
  subgraph Public Entry & Auth
    Gateway -->|Auth / Tokens| AuthDB[(PostgreSQL: auth schema)]
  end

  subgraph Internal Core Services
    Gateway -->|Proxy + x-internal-key| BookingCore[booking-core :4001]
    Gateway -->|Proxy + x-internal-key| PaymentSvc[payment :4002]
    
    BookingCore -->|Holds / Locks| Redis[(Redis 7)]
    BookingCore -->|Events, Shows, Bookings, Tickets| BookingDB[(PostgreSQL: booking schema)]
    
    PaymentSvc -->|Orders & Webhooks| PaymentDB[(PostgreSQL: payment schema)]
    
    PaymentSvc -.->|Publishes payment.succeeded| RedisQueue[(BullMQ on Redis)]
    RedisQueue -.->|Consumes payment events| BookingCore
    BookingCore -.->|Publishes booking.confirmed| RedisQueue
    RedisQueue -.->|Consumes booking events| NotifSvc[notification :4003]
  end

  subgraph Frontend
    Web[React 18 + Vite Web App :5173] --> Gateway
  end
```

### Microservices Summary

| Service | Port | Responsibility | Database Schema |
|---|---|---|---|
| **`gateway`** | 4000 | Public entry point, JWT auth (signup/login), rate-limiting, internal header injection (`x-user-id`, `x-internal-key`) | `auth` |
| **`booking-core`** | 4001 | Events, shows, seats, atomic Lua hold keys, bookings, ticket minting, hold expiry sweeper | `booking` |
| **`payment`** | 4002 | Payment orders, provider abstraction (`MockProvider`, `RazorpayProvider`), idempotent webhooks | `payment` |
| **`notification`** | 4003 | Asynchronous queue consumer for ticket confirmation emails (console/Nodemailer) | *None* |
| **`web`** | 5173 | High-converting React 18 frontend with 3s live polling seat maps and checkout countdown | *None* |

---

## ⚡ Concurrency & Double-Booking Protection Model

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer
    participant Gateway as API Gateway (:4000)
    participant Booking as booking-core (:4001)
    participant Redis as Redis (Lua Script)
    participant Postgres as PostgreSQL (booking schema)

    Customer->>Gateway: POST /api/shows/:id/hold { seatIds }
    Gateway->>Gateway: Verify JWT & Rate Limit (100 req/min)
    Gateway->>Booking: Proxy with x-user-id & x-internal-key
    Booking->>Redis: Atomic Lua: Check EXISTS on all keys -> SET PX 300000
    alt Any seat is already held
        Redis-->>Booking: Return 0 (Failure)
        Booking-->>Customer: 409 Conflict: SEATS_UNAVAILABLE
    else All seats successfully held
        Redis-->>Booking: Return 1 (Success)
        Booking->>Postgres: BEGIN Transaction
        Booking->>Postgres: INSERT booking (PENDING_PAYMENT) & booking_seats (HELD)
        Note over Postgres: Partial Unique Index uq_active_seat enforces single active hold
        Postgres-->>Booking: COMMIT
        Booking-->>Customer: 200 OK { bookingId, expiresAt, totalMinor }
    end
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- Node.js 20+ LTS
- Docker and Docker Compose

### 1. Clone & Install
```bash
git clone <repo-url>
cd ticket-booking
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Start Infrastructure & Services
```bash
docker compose up --build
```

### 4. Seed Database
In a new terminal window:
```bash
npm run seed
```
This populates:
- 1 Admin (`admin@seatsnap.com` / `AdminPassword123!`)
- 1 Customer (`customer@seatsnap.com` / `CustomerPassword123!`)
- 5 Live Events across Mumbai, Bengaluru, and Delhi with 10x10 seat grids
- 1 "Hot Show" with a 20x20 seat grid (400 seats) for concurrency testing

### 5. Access Services
- **Web App:** [http://localhost:5173](http://localhost:5173)
- **API Gateway:** [http://localhost:4000](http://localhost:4000)
  - Health check: `GET http://localhost:4000/health`
  - Events endpoint: `GET http://localhost:4000/api/events`
  - Signup: `POST http://localhost:4000/api/auth/signup`
  - Login: `POST http://localhost:4000/api/auth/login`

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run linter
npm run lint

# Run type check across all workspaces
npm run typecheck
```

---

## 📑 Decisions Log
See [DECISIONS.md](file:///c:/Users/jainp/OneDrive/Desktop/ticket-booking/DECISIONS.md) for rationale behind plain SQL, schema isolation, Lua hold mechanics, and gateway header forwarding.
