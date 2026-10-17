CREATE SCHEMA IF NOT EXISTS booking;

CREATE TABLE IF NOT EXISTS booking.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  city text NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS booking.shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES booking.events(id),
  venue_name text NOT NULL,
  starts_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS booking.seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid NOT NULL REFERENCES booking.shows(id),
  row_label text NOT NULL,
  seat_number int NOT NULL,
  price_minor int NOT NULL CHECK (price_minor > 0),
  UNIQUE (show_id, row_label, seat_number)
);

CREATE TABLE IF NOT EXISTS booking.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  show_id uuid NOT NULL REFERENCES booking.shows(id),
  status text NOT NULL CHECK (status IN ('PENDING_PAYMENT','CONFIRMED','EXPIRED','FAILED','CANCELLED')),
  total_minor int NOT NULL,
  idempotency_key text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS booking.booking_seats (
  booking_id uuid NOT NULL REFERENCES booking.bookings(id),
  show_id uuid NOT NULL,
  seat_id uuid NOT NULL REFERENCES booking.seats(id),
  status text NOT NULL CHECK (status IN ('HELD','CONFIRMED','RELEASED')),
  PRIMARY KEY (booking_id, seat_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_seat ON booking.booking_seats (show_id, seat_id)
  WHERE status IN ('HELD','CONFIRMED');

CREATE TABLE IF NOT EXISTS booking.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES booking.bookings(id),
  seat_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID','USED')),
  checked_in_at timestamptz
);

CREATE TABLE IF NOT EXISTS booking.processed_events (
  event_key text PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);
