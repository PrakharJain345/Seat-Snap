import { createPool, runMigration } from "@seatsnap/shared";
import { config } from "./config.js";

export const pool = createPool(config.DATABASE_URL);

const migrationSql = `
CREATE SCHEMA IF NOT EXISTS payment;

CREATE TABLE IF NOT EXISTS payment.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE,
  provider text NOT NULL,
  provider_order_id text NOT NULL,
  amount_minor int NOT NULL,
  status text NOT NULL CHECK (status IN ('CREATED','PAID','FAILED','REFUND_REQUESTED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment.webhook_events (
  provider_event_id text PRIMARY KEY,
  type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
`;

export async function initDb(): Promise<void> {
  await runMigration(pool, "payment", migrationSql, "001_init");
}
