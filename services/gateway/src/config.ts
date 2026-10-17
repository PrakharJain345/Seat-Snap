import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  INTERNAL_API_KEY: z.string().min(16, "INTERNAL_API_KEY must be at least 16 characters"),
  BOOKING_URL: z.string().default("http://booking-core:4001"),
  PAYMENT_URL: z.string().default("http://payment:4002"),
  CORS_ORIGIN: z.string().default("*"),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configuration validation failed in gateway service:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
