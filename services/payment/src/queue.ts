import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { QUEUES, DEFAULT_JOB_OPTIONS, logger } from "@seatsnap/shared";
import { config } from "./config.js";

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy(times) {
    return Math.min(times * 200, 2000);
  },
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
