import { Redis, RedisOptions } from "ioredis";
import { logger } from "@seatsnap/shared";
import { config } from "./config.js";

const isTest = config.NODE_ENV === "test" || Boolean(process.env.VITEST);
const isTls = config.REDIS_URL.startsWith("rediss://");

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: isTest ? 1 : null,
  enableOfflineQueue: !isTest,
  lazyConnect: isTest,
  connectTimeout: 10000,
  family: 4,
  retryStrategy(times) {
    if (isTest) return null;
    return Math.min(times * 500, 10000);
  },
  ...(isTls
    ? {
        tls: {
          rejectUnauthorized: false,
        },
      }
    : {}),
};

export const redis = new Redis(config.REDIS_URL, redisOptions);

redis.on("error", (err) => {
  logger.error({ err: err?.message || err }, "Redis connection error in booking-core");
});

redis.on("connect", () => {
  logger.info("Connected to Redis in booking-core");
});

