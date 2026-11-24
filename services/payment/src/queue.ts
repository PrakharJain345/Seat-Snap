import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { QUEUES, DEFAULT_JOB_OPTIONS, logger } from "@seatsnap/shared";
import { config } from "./config.js";

const isTest = config.NODE_ENV === "test" || Boolean(process.env.VITEST);
const isTls = config.REDIS_URL.startsWith("rediss://");

export const redis = new Redis(config.REDIS_URL, {
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
});

redis.on("error", (err) => {
  logger.error({ err }, "Redis connection error in payment service");
});

redis.on("connect", () => {
  logger.info("Connected to Redis in payment service");
});

export const paymentEventsQueue = new Queue(QUEUES.PAYMENT_EVENTS, {
  connection: redis,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});
