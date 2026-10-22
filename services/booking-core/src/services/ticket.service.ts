import { createHmac, timingSafeEqual } from "crypto";
import {
  AppError,
  withTransaction,
  logger,
  JOB_TYPES,
  DEFAULT_JOB_OPTIONS,
  BookingConfirmedPayload,
  BookingRefundRequestedPayload,
} from "@seatsnap/shared";
import { Pool, PoolClient } from "pg";
import { pool } from "../db.js";
import { redis } from "../redis.js";
import { bookingEventsQueue } from "../queue.js";
import { releaseSeatHold } from "@seatsnap/shared";
import { config } from "../config.js";
import QRCode from "qrcode";

// ─── Ticket Token ─────────────────────────────────────────────────────────────

export function generateTicketToken(ticketId: string): string {
  const sig = createHmac("sha256", config.TICKET_SIGNING_SECRET)
    .update(ticketId)
    .digest("hex");
  return `${ticketId}.${sig}`;
}

export function verifyTicketToken(token: string): { valid: boolean; ticketId?: string } {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return { valid: false };
  const ticketId = token.substring(0, dotIndex);
  const providedSig = token.substring(dotIndex + 1);
  const expectedSig = createHmac("sha256", config.TICKET_SIGNING_SECRET)
    .update(ticketId)
    .digest("hex");
  if (providedSig.length !== expectedSig.length) return { valid: false };
  try {
    if (!timingSafeEqual(Buffer.from(providedSig, "hex"), Buffer.from(expectedSig, "hex"))) {
      return { valid: false };
    }
  } catch {
    return { valid: false };
  }
  return { valid: true, ticketId };
}

// ─── Confirmation Transaction (called on payment.succeeded) ───────────────────

export async function confirmBookingOnPayment(
  bookingId: string,
  paymentId: string,
  customPool: Pool = pool,
  customRedis: any = redis
): Promise<"confirmed" | "late_payment"> {
  let showId: string | null = null;
  let seatIds: string[] = [];
  let userId: string | null = null;

  const outcome: "confirmed" | "late_payment" = await withTransaction(customPool, async (client: PoolClient): Promise<"confirmed" | "late_payment"> => {
    // Idempotency: insert processed_event; on conflict, skip
    try {
      await client.query(
        `INSERT INTO booking.processed_events (event_key) VALUES ($1)`,
        [`payment.succeeded:${bookingId}`]
      );
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505") {
        logger.info({ bookingId }, "Duplicate payment.succeeded event — skipping");
        return "late_payment";
      }
      throw err;
    }

    // Lock booking row
    const bookingRes = await client.query(
      `SELECT status, expires_at, show_id, user_id FROM booking.bookings WHERE id = $1 FOR UPDATE`,
      [bookingId]
    );

    if (bookingRes.rows.length === 0) {
      logger.warn({ bookingId }, "Booking not found during confirmation");
      return "late_payment";
    }

    const booking = bookingRes.rows[0];
    showId = booking.show_id;
    userId = booking.user_id;

    // Fetch held seats for this booking
    const seatsRes = await client.query(
      `SELECT seat_id FROM booking.booking_seats WHERE booking_id = $1 AND status = 'HELD'`,
      [bookingId]
    );
    seatIds = seatsRes.rows.map((r) => r.seat_id);

    const isActive = booking.status === "PENDING_PAYMENT";
    const isNotExpired = new Date(booking.expires_at) > new Date();

    if (isActive && isNotExpired) {
      // CONFIRM path
      await client.query(
        `UPDATE booking.bookings SET status = 'CONFIRMED' WHERE id = $1`,
        [bookingId]
      );
      await client.query(
        `UPDATE booking.booking_seats SET status = 'CONFIRMED' WHERE booking_id = $1 AND status = 'HELD'`,
        [bookingId]
      );

      // Create one ticket per seat
      for (const seatId of seatIds) {
        await client.query(
          `INSERT INTO booking.tickets (booking_id, seat_id, status) VALUES ($1, $2, 'VALID')`,
          [bookingId, seatId]
        );
      }

      return "confirmed";
    } else {
      // LATE PAYMENT path — publish refund request
      logger.info(
        { bookingId, status: booking.status, expiresAt: booking.expires_at },
        "Late payment received — publishing refund_requested"
      );
      return "late_payment";
    }
  });

  // Post-transaction: release Redis holds and publish events
  if (showId && seatIds.length > 0) {
    try {
      await releaseSeatHold(customRedis, showId, seatIds, bookingId);
    } catch (err) {
      logger.error({ err, bookingId }, "Failed to release Redis hold after confirmation");
    }
  }

  if (outcome === "confirmed" && userId && showId) {
    await bookingEventsQueue.add(
      JOB_TYPES.BOOKING_CONFIRMED,
      {
        bookingId,
        userId,
        showId,
        seatIds,
      } as BookingConfirmedPayload,
      DEFAULT_JOB_OPTIONS
    );
    logger.info({ bookingId }, "booking.confirmed published");
  } else if (outcome === "late_payment") {
    await bookingEventsQueue.add(
      JOB_TYPES.BOOKING_REFUND_REQUESTED,
      {
        bookingId,
        paymentId,
        reason: "Payment received after booking expiry",
      } as BookingRefundRequestedPayload,
      DEFAULT_JOB_OPTIONS
    );
  }

  return outcome;
}

// ─── Get ticket by id ─────────────────────────────────────────────────────────

export async function getTicketById(ticketId: string, userId: string) {
  const res = await pool.query(
    `SELECT t.id, t.booking_id, t.seat_id, t.status, t.checked_in_at,
            b.user_id, s.row_label, s.seat_number, sh.venue_name, e.title AS event_title
     FROM booking.tickets t
     JOIN booking.bookings b ON t.booking_id = b.id
     JOIN booking.seats s ON t.seat_id = s.id
     JOIN booking.shows sh ON b.show_id = sh.id
     JOIN booking.events e ON sh.event_id = e.id
     WHERE t.id = $1 AND b.user_id = $2`,
    [ticketId, userId]
  );
  if (res.rows.length === 0) {
    throw new AppError(404, "NOT_FOUND", "Ticket not found");
  }
  return res.rows[0];
}

// ─── QR endpoint ─────────────────────────────────────────────────────────────

export async function generateTicketQR(ticketId: string, userId: string): Promise<Buffer> {
  const ticket = await getTicketById(ticketId, userId);
  if (ticket.status !== "VALID") {
    throw new AppError(400, "TICKET_INVALID", "Ticket is not valid");
  }
  const token = generateTicketToken(ticketId);
  const png = await QRCode.toBuffer(token, { type: "png", width: 300 });
  return png;
}

// ─── Validate (admin) ─────────────────────────────────────────────────────────

export async function validateTicket(token: string): Promise<{
  valid: boolean;
  reason?: string;
  ticket?: Record<string, unknown>;
}> {
  const { valid, ticketId } = verifyTicketToken(token);

  if (!valid || !ticketId) {
    return { valid: false, reason: "INVALID_TOKEN" };
  }

  // Atomically mark USED only if currently VALID
  const result = await pool.query(
    `UPDATE booking.tickets
     SET status = 'USED', checked_in_at = now()
     WHERE id = $1 AND status = 'VALID'
     RETURNING id, booking_id, seat_id, status, checked_in_at`,
    [ticketId]
  );

  if (result.rows.length === 0) {
    // Ticket exists but already used
    const check = await pool.query(`SELECT status FROM booking.tickets WHERE id = $1`, [ticketId]);
    if (check.rows.length > 0 && check.rows[0].status === "USED") {
      return { valid: false, reason: "ALREADY_USED" };
    }
    return { valid: false, reason: "NOT_FOUND" };
  }

  return { valid: true, ticket: result.rows[0] };
}
