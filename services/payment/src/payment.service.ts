import { createHmac } from "crypto";
import { z } from "zod";
import {
  AppError,
  withTransaction,
  logger,
  JOB_TYPES,
  DEFAULT_JOB_OPTIONS,
  PaymentSucceededPayload,
} from "@seatsnap/shared";
import { pool } from "./db.js";
import { paymentEventsQueue } from "./queue.js";
import { PaymentProvider } from "./providers.js";
import { config } from "./config.js";

const CreateOrderSchema = z.object({
  bookingId: z.string().uuid(),
  amountMinor: z.number().int().positive(),
});

// ─── createPaymentOrder ───────────────────────────────────────────────────────

export async function createPaymentOrder(
  body: unknown,
  provider: PaymentProvider
): Promise<Record<string, unknown>> {
  const { bookingId, amountMinor } = CreateOrderSchema.parse(body);

  // Idempotency: check if order already exists for this booking
  const existing = await pool.query(
    `SELECT id, provider_order_id, status FROM payment.payments WHERE booking_id = $1`,
    [bookingId]
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    return {
      paymentId: row.id,
      orderId: row.provider_order_id,
      provider: row.provider,
      status: row.status,
    };
  }

  // Create order with the provider
  const { providerOrderId, checkoutInfo } = await provider.createOrder({
    bookingId,
    amountMinor,
  });

  // Persist payment record
  const result = await pool.query(
    `INSERT INTO payment.payments (booking_id, provider, provider_order_id, amount_minor, status)
     VALUES ($1, $2, $3, $4, 'CREATED')
     RETURNING id`,
    [bookingId, provider.name, providerOrderId, amountMinor]
  );

  return {
    paymentId: result.rows[0].id,
    orderId: providerOrderId,
    provider: provider.name,
    checkout: checkoutInfo,
  };
}

// ─── handleWebhook ─────────────────────────────────────────────────────────────

const WebhookEventSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string(),
        order_id: z.string(),
        status: z.string(),
      }),
    }).optional(),
    order: z.object({
      entity: z.object({
        id: z.string(),
        receipt: z.string().optional(), // bookingId
      }),
    }).optional(),
  }).optional(),
});

export async function handleWebhook(
  rawBody: Buffer,
  signature: string,
  provider: PaymentProvider
): Promise<{ received: boolean; duplicate?: boolean }> {
  // Step 1: Verify HMAC signature (timing-safe)
  const isValid = provider.verifyWebhookSignature({
    rawBody,
    signature,
    secret: config.PAYMENT_WEBHOOK_SECRET,
  });

  if (!isValid) {
    throw new AppError(401, "INVALID_SIGNATURE", "Webhook signature verification failed");
  }

  const body = JSON.parse(rawBody.toString());
  const parsed = WebhookEventSchema.safeParse(body);
  if (!parsed.success) {
    logger.warn({ body }, "Received unrecognized webhook payload shape, ignoring");
    return { received: true };
  }

  const { event, payload } = parsed.data;
  const providerEventId = body.event_id || body.id || `${event}-${Date.now()}`;

  // Step 2: Deduplicate by providerEventId
  try {
    await pool.query(
      `INSERT INTO payment.webhook_events (provider_event_id, type) VALUES ($1, $2)`,
      [providerEventId, event]
    );
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      logger.info({ providerEventId }, "Duplicate webhook event, ignoring");
      return { received: true, duplicate: true };
    }
    throw err;
  }

  // Step 3: Handle payment.captured / payment.authorized / payment succeeded
  const successEvents = [
    "payment.captured",
    "payment.authorized",
    "order.paid",
    "mock.payment.succeeded",
  ];

  if (successEvents.includes(event)) {
    const orderId =
      payload?.payment?.entity?.order_id ||
      payload?.order?.entity?.id ||
      body.order_id;

    const bookingId =
      payload?.order?.entity?.receipt ||
      body.booking_id;

    if (!orderId && !bookingId) {
      logger.warn({ body, event }, "Cannot extract orderId or bookingId from webhook");
      return { received: true };
    }

    // Find payment by order ID
    const paymentQuery = bookingId
      ? await pool.query(
          `SELECT id, booking_id, amount_minor FROM payment.payments WHERE booking_id = $1`,
          [bookingId]
        )
      : await pool.query(
          `SELECT id, booking_id, amount_minor FROM payment.payments WHERE provider_order_id = $1`,
          [orderId]
        );

    if (paymentQuery.rows.length === 0) {
      logger.warn({ orderId, bookingId }, "No payment record found for webhook event");
      return { received: true };
    }

    const payment = paymentQuery.rows[0];

    // Mark payment as PAID
    await pool.query(
      `UPDATE payment.payments SET status = 'PAID' WHERE id = $1 AND status = 'CREATED'`,
      [payment.id]
    );

    // Publish payment.succeeded for booking-core to consume
    const jobPayload: PaymentSucceededPayload = {
      bookingId: payment.booking_id,
      paymentId: payment.id,
    };

    await paymentEventsQueue.add(JOB_TYPES.PAYMENT_SUCCEEDED, jobPayload, DEFAULT_JOB_OPTIONS);
    logger.info({ bookingId: payment.booking_id, paymentId: payment.id }, "payment.succeeded published");
  }

  return { received: true };
}

// ─── handleMockComplete ────────────────────────────────────────────────────────

export async function handleMockComplete(orderId: string, provider: PaymentProvider): Promise<Record<string, unknown>> {
  if (provider.name !== "mock") {
    throw new AppError(400, "INVALID_OPERATION", "Mock payment completion only available with mock provider");
  }

  // Build a valid mock webhook payload
  const mockEventId = `mock_evt_${Date.now()}`;
  const body = {
    event: "mock.payment.succeeded",
    event_id: mockEventId,
    order_id: orderId,
    booking_id: null as string | null,
  };

  // Resolve bookingId from order
  const paymentRes = await pool.query(
    `SELECT booking_id FROM payment.payments WHERE provider_order_id = $1`,
    [orderId]
  );

  if (paymentRes.rows.length === 0) {
    throw new AppError(404, "NOT_FOUND", "Payment order not found");
  }

  body.booking_id = paymentRes.rows[0].booking_id;

  const rawBody = Buffer.from(JSON.stringify(body));
  const signature = createHmac("sha256", config.PAYMENT_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  await handleWebhook(rawBody, signature, provider);

  return { simulated: true, orderId, eventId: mockEventId };
}

// ─── markRefundRequested ──────────────────────────────────────────────────────

export async function markRefundRequested(bookingId: string): Promise<void> {
  await pool.query(
    `UPDATE payment.payments SET status = 'REFUND_REQUESTED' WHERE booking_id = $1`,
    [bookingId]
  );
  logger.info({ bookingId }, "Payment marked REFUND_REQUESTED");
}
