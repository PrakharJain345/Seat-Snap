import { Redis } from "ioredis";
import { logger } from "@seatsnap/shared";
import { config } from "./config.js";

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  connectTimeout: 5000,
  retryStrategy(times) {
    if (times > 10) return null;
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
});

redis.on("error", (err) => {
  logger.error({ err }, "Redis connection error in booking-core");
});

redis.on("connect", () => {
  logger.info("Connected to Redis in booking-core");
});
