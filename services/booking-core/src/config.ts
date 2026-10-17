import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().default("redis://redis:6379"),
  INTERNAL_API_KEY: z.string().min(16, "INTERNAL_API_KEY must be at least 16 characters"),
  HOLD_TTL_SECONDS: z.coerce.number().default(300),
  SWEEPER_INTERVAL_SECONDS: z.coerce.number().default(30),
  MAX_SEATS_PER_BOOKING: z.coerce.number().default(6),
  PAYMENT_URL: z.string().default("http://payment:4002"),
  TICKET_SIGNING_SECRET: z.string().default("seatsnap-ticket-secret-32chars-dev"),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configuration validation failed in booking-core service:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
