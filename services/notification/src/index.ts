import express, { Request, Response } from "express";
import { Worker } from "bullmq";
import { z } from "zod";
import { logger, requestIdMiddleware, errorHandlerMiddleware, QUEUES, JOB_TYPES } from "@seatsnap/shared";
import { config } from "./config.js";
import { sendBookingConfirmedEmail, sendBookingExpiredEmail } from "./mailer.js";

const app = express();

app.use(express.json());
app.use(requestIdMiddleware);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "notification" });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Route not found" });
});

app.use(errorHandlerMiddleware);

// ─── BullMQ Consumer ──────────────────────────────────────────────────────────

const BookingConfirmedSchema = z.object({
  bookingId: z.string().uuid(),
  userId: z.string().uuid(),
  showId: z.string().uuid(),
  seatIds: z.array(z.string()),
});

const BookingExpiredSchema = z.object({
  bookingId: z.string().uuid(),
  showId: z.string().uuid(),
  seatIds: z.array(z.string()),
});

function startBookingEventsConsumer() {
  const worker = new Worker(
    QUEUES.BOOKING_EVENTS,
    async (job) => {
      logger.info({ jobId: job.id, type: job.name }, "Notification processing booking event");

      if (job.name === JOB_TYPES.BOOKING_CONFIRMED) {
        const data = BookingConfirmedSchema.parse(job.data);
        await sendBookingConfirmedEmail(data);
        return;
      }

      if (job.name === JOB_TYPES.BOOKING_EXPIRED) {
        const data = BookingExpiredSchema.parse(job.data);
        await sendBookingExpiredEmail({ bookingId: data.bookingId });
        return;
      }

      // booking.refund_requested — log only
      if (job.name === JOB_TYPES.BOOKING_REFUND_REQUESTED) {
        logger.info({ data: job.data }, "Refund requested — notification logged");
        return;
      }

      logger.warn({ jobName: job.name }, "Unknown booking event type in notification consumer");
    },
    {
      connection: { url: config.REDIS_URL },
      concurrency: 3,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, type: job.name }, "Notification job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Notification job failed");
  });

  logger.info("Booking events consumer started in notification service");
  return worker;
}

// ─── Startup ──────────────────────────────────────────────────────────────────

function start() {
  if (config.NODE_ENV !== "test") {
    startBookingEventsConsumer();
  }
  app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, "Notification service listening");
  });
}

start();
