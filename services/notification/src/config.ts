import dotenv from "dotenv";
import { z } from "zod";

import { sanitizeRedisUrl } from "@seatsnap/shared";

dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4003),
  REDIS_URL: z.string().default("redis://redis:6379").transform(sanitizeRedisUrl),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configuration validation failed in notification service:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
