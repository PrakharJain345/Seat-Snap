import { Pool } from "pg";
import {
  logger,
  releaseSeatHold,
  withTransaction,
  JOB_TYPES,
  DEFAULT_JOB_OPTIONS,
  BookingExpiredPayload,
  RedisLike,
} from "@seatsnap/shared";
import { pool } from "../db.js";
import { redis } from "../redis.js";
import { bookingEventsQueue } from "../queue.js";
import { config } from "../config.js";

export interface BookingEventsQueueLike {
  add(type: string, data: BookingExpiredPayload, opts?: unknown): Promise<unknown>;
}

export async function sweepExpiredBookings(
  customPool: Pool = pool,
  customRedis: RedisLike = redis,
  publishQueue?: BookingEventsQueueLike
): Promise<number> {
  const expiredRes = await customPool.query(
    `SELECT id, show_id
     FROM booking.bookings
     WHERE status = 'PENDING_PAYMENT' AND expires_at < now()
     LIMIT 100`
  );

  if (expiredRes.rows.length === 0) {
    return 0;
  }

  let sweptCount = 0;

  for (const row of expiredRes.rows) {
    const bookingId = row.id;
    const showId = row.show_id;

    let seatIds: string[] = [];
    let updated = false;

    try {
      await withTransaction(customPool, async (client) => {
        // Lock and verify status is still PENDING_PAYMENT
        const check = await client.query(
          `SELECT status FROM booking.bookings WHERE id = $1 FOR UPDATE`,
          [bookingId]
        );

        if (check.rows.length === 0 || check.rows[0].status !== "PENDING_PAYMENT") {
          return;
        }

        // Fetch held seats for this booking
        const seatsRes = await client.query(
          `SELECT seat_id FROM booking.booking_seats WHERE booking_id = $1 AND status = 'HELD'`,
          [bookingId]
        );
        seatIds = seatsRes.rows.map((r) => r.seat_id);

        // Update booking status to EXPIRED
        await client.query(
          `UPDATE booking.bookings SET status = 'EXPIRED' WHERE id = $1`,
          [bookingId]
        );

        // Release seats in DB
        await client.query(
          `UPDATE booking.booking_seats SET status = 'RELEASED' WHERE booking_id = $1 AND status = 'HELD'`,
          [bookingId]
        );

        updated = true;
      });
    } catch (err) {
      logger.error({ err, bookingId }, "Error during DB transaction in sweepExpiredBookings");
      continue;
    }

    if (updated) {
      sweptCount++;
      // Release Redis keys
      if (seatIds.length > 0) {
        try {
          await releaseSeatHold(customRedis, showId, seatIds, bookingId);
        } catch (err) {
          logger.error({ err, bookingId }, "Failed to release Redis hold keys during sweep");
        }
      }

      // Publish booking.expired event
      try {
        const queueToUse = publishQueue || bookingEventsQueue;
        await queueToUse.add(
          JOB_TYPES.BOOKING_EXPIRED,
          {
            bookingId,
            showId,
            seatIds,
          },
          DEFAULT_JOB_OPTIONS
        );
      } catch (err) {
        logger.error({ err, bookingId }, "Failed to publish booking.expired event");
      }
    }
  }

  return sweptCount;
}

let sweeperIntervalTimer: NodeJS.Timeout | null = null;

export function startSweeper(intervalSeconds: number = config.SWEEPER_INTERVAL_SECONDS) {
  if (sweeperIntervalTimer) {
    return;
  }

  logger.info({ intervalSeconds }, "Starting booking expiry sweeper");

  sweeperIntervalTimer = setInterval(async () => {
    try {
      const count = await sweepExpiredBookings();
      if (count > 0) {
        logger.info({ count }, "Sweeper released expired bookings");
      }
    } catch (err) {
      logger.error({ err }, "Unhandled error in sweeper cycle");
    }
  }, intervalSeconds * 1000);
}

export function stopSweeper() {
  if (sweeperIntervalTimer) {
    clearInterval(sweeperIntervalTimer);
    sweeperIntervalTimer = null;
    logger.info("Booking expiry sweeper stopped");
  }
}
