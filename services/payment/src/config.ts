import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4002),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().default("redis://redis:6379"),
  INTERNAL_API_KEY: z.string().min(16, "INTERNAL_API_KEY must be at least 16 characters"),
  PAYMENT_PROVIDER: z.enum(["mock", "razorpay"]).default("mock"),
  PAYMENT_WEBHOOK_SECRET: z.string().default("seatsnap-webhook-secret-dev"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configuration validation failed in payment service:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
