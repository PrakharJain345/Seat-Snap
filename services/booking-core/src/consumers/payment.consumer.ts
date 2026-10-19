import { Worker } from "bullmq";
import { z } from "zod";
import {
  QUEUES,
  JOB_TYPES,
  logger,
} from "@seatsnap/shared";
import { config } from "../config.js";
import { confirmBookingOnPayment } from "../services/ticket.service.js";

const PaymentSucceededSchema = z.object({
  bookingId: z.string().uuid(),
  paymentId: z.string().uuid(),
});

export function startPaymentConsumer() {
  const worker = new Worker(
    QUEUES.PAYMENT_EVENTS,
    async (job) => {
      logger.info({ jobId: job.id, type: job.name }, "Processing payment event");

      if (job.name === JOB_TYPES.PAYMENT_SUCCEEDED) {
        const { bookingId, paymentId } = PaymentSucceededSchema.parse(job.data);
        const outcome = await confirmBookingOnPayment(bookingId, paymentId);
        logger.info({ bookingId, paymentId, outcome }, "payment.succeeded processed");
        return { bookingId, outcome };
      }

      logger.warn({ jobName: job.name }, "Unknown payment event type, skipping");
    },
    {
      connection: {
        url: config.REDIS_URL,
      },
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, type: job.name }, "Payment event job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Payment event job failed");
  });

  logger.info("Payment events consumer started");
  return worker;
}
