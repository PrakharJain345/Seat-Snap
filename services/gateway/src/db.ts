import { createPool, runMigration } from "@seatsnap/shared";
import { config } from "./config.js";

export const pool = createPool(config.DATABASE_URL);

const migrationSql = `
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

export async function initDb(): Promise<void> {
  await runMigration(pool, "auth", migrationSql, "001_init");
}
