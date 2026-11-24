import { Queue } from "bullmq";
import { QUEUES, DEFAULT_JOB_OPTIONS } from "@seatsnap/shared";
import { redis } from "./redis.js";

export const bookingEventsQueue = new Queue(QUEUES.BOOKING_EVENTS, {
  connection: redis,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

