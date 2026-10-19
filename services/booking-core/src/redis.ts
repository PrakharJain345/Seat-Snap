import { Redis } from "ioredis";
import { logger } from "@seatsnap/shared";
import { config } from "./config.js";

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy(times) {
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
