import { Queue } from "bullmq";
import { QUEUES, DEFAULT_JOB_OPTIONS } from "@seatsnap/shared";
import { config } from "./config.js";

export const bookingEventsQueue = new Queue(QUEUES.BOOKING_EVENTS, {
  connection: {
    url: config.REDIS_URL,
  },
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});
