import { randomUUID } from "crypto";
import {
  AppError,
  SeatWithStatus,
  withTransaction,
  acquireSeatHold,
  releaseSeatHold,
  getSeatHoldKey,
} from "@seatsnap/shared";
import { pool } from "../db.js";
import { redis } from "../redis.js";
import { config } from "../config.js";

export interface HoldResult {
  isExisting: boolean;
  booking: {
    bookingId: string;
    expiresAt: string;
    totalMinor: number;
    status: string;
    seatIds: string[];
  };
}

export async function getShowById(showId: string) {
  const sql = `
    SELECT
      s.id,
      s.event_id,
      s.venue_name,
      s.starts_at,
      json_build_object(
        'id', e.id,
        'title', e.title,
        'category', e.category,
        'city', e.city,
        'description', e.description
      ) AS event
    FROM booking.shows s
    JOIN booking.events e ON s.event_id = e.id
    WHERE s.id = $1
  `;
  const result = await pool.query(sql, [showId]);
  if (result.rows.length === 0) {
    throw new AppError(404, "NOT_FOUND", "Show not found");
  }
  return result.rows[0];
}

export async function getShowSeats(showId: string): Promise<SeatWithStatus[]> {
  // 1. Verify show exists
  const showCheck = await pool.query("SELECT id FROM booking.shows WHERE id = $1", [showId]);
  if (showCheck.rows.length === 0) {
    throw new AppError(404, "NOT_FOUND", "Show not found");
  }

  // 2. Query all seats for this show
  const seatsRes = await pool.query(
    `SELECT id, row_label, seat_number, price_minor
     FROM booking.seats
     WHERE show_id = $1
     ORDER BY row_label ASC, seat_number ASC`,
    [showId]
  );
  const seats = seatsRes.rows;

  if (seats.length === 0) {
    return [];
  }

  // 3. Query DB active booking_seats
  const dbActiveRes = await pool.query(
    `SELECT seat_id, status
     FROM booking.booking_seats
     WHERE show_id = $1 AND status IN ('HELD', 'CONFIRMED')`,
    [showId]
  );

  const dbStatusMap = new Map<string, "HELD" | "CONFIRMED">();
  for (const row of dbActiveRes.rows) {
    dbStatusMap.set(row.seat_id, row.status);
  }

  // 4. Check Redis hold keys
  const redisKeys = seats.map((s) => getSeatHoldKey(showId, s.id));
  let redisValues: (string | null)[] = [];
  try {
    redisValues = await redis.mget(...redisKeys);
  } catch {
    // If Redis check fails, fallback to DB status
    redisValues = new Array(seats.length).fill(null);
  }

  // 5. Build consolidated seat statuses
  return seats.map((seat, index) => {
    const dbStatus = dbStatusMap.get(seat.id);
    const redisHeld = redisValues[index] !== null && redisValues[index] !== undefined;

    let status: "AVAILABLE" | "HELD" | "BOOKED" = "AVAILABLE";

    if (dbStatus === "CONFIRMED") {
      status = "BOOKED";
    } else if (redisHeld || dbStatus === "HELD") {
      status = "HELD";
    }

    return {
      id: seat.id,
      row: seat.row_label,
      number: seat.seat_number,
      priceMinor: seat.price_minor,
      status,
    };
  });
}

export async function holdSeats(params: {
  showId: string;
  seatIds: string[];
  userId: string;
  idempotencyKey: string;
  ttlSeconds?: number;
}): Promise<HoldResult> {
  const { showId, seatIds, userId, idempotencyKey } = params;
  const ttlSeconds = params.ttlSeconds || config.HOLD_TTL_SECONDS;

  // Step 1: Idempotency check
  const existingBooking = await pool.query(
    `SELECT id, status, total_minor, expires_at, created_at
     FROM booking.bookings
     WHERE user_id = $1 AND idempotency_key = $2`,
    [userId, idempotencyKey]
  );

  if (existingBooking.rows.length > 0) {
    const b = existingBooking.rows[0];
    const seatsRes = await pool.query(
      `SELECT seat_id FROM booking.booking_seats WHERE booking_id = $1`,
      [b.id]
    );
    return {
      isExisting: true,
      booking: {
        bookingId: b.id,
        expiresAt: new Date(b.expires_at).toISOString(),
        totalMinor: b.total_minor,
        status: b.status,
        seatIds: seatsRes.rows.map((r) => r.seat_id),
      },
    };
  }

  // Step 2: Validate seat IDs belong to the show
  const seatsRes = await pool.query(
    `SELECT id, price_minor
     FROM booking.seats
     WHERE show_id = $1 AND id = ANY($2)`,
    [showId, seatIds]
  );

  if (seatsRes.rows.length !== seatIds.length) {
    throw new AppError(400, "INVALID_SEATS", "One or more requested seats do not belong to this show");
  }

  const totalMinor = seatsRes.rows.reduce((sum, r) => sum + r.price_minor, 0);

  // Step 3: Check if any seat is already CONFIRMED in DB
  const confirmedRes = await pool.query(
    `SELECT seat_id
     FROM booking.booking_seats
     WHERE show_id = $1 AND seat_id = ANY($2) AND status = 'CONFIRMED'`,
    [showId, seatIds]
  );

  if (confirmedRes.rows.length > 0) {
    throw new AppError(409, "SEATS_UNAVAILABLE", "One or more requested seats are already booked");
  }

  // Step 4: Atomic hold in Redis (Lua script)
  const bookingId = randomUUID();
  let acquired = false;

  try {
    acquired = await acquireSeatHold(redis, showId, seatIds, bookingId, ttlSeconds);
  } catch (err) {
    throw new AppError(500, "REDIS_ERROR", "Failed to acquire seat hold lock in Redis", err);
  }

  if (!acquired) {
    throw new AppError(409, "SEATS_UNAVAILABLE", "One or more requested seats are currently held or unavailable");
  }

  // Step 5: PostgreSQL transaction
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  try {
    await withTransaction(pool, async (client) => {
      await client.query(
        `INSERT INTO booking.bookings (id, user_id, show_id, status, total_minor, idempotency_key, expires_at)
         VALUES ($1, $2, $3, 'PENDING_PAYMENT', $4, $5, $6)`,
        [bookingId, userId, showId, totalMinor, idempotencyKey, expiresAt.toISOString()]
      );

      for (const seatId of seatIds) {
        await client.query(
          `INSERT INTO booking.booking_seats (booking_id, show_id, seat_id, status)
           VALUES ($1, $2, $3, 'HELD')`,
          [bookingId, showId, seatId]
        );
      }
    });
  } catch (dbErr: unknown) {
    // Release Redis keys on DB transaction failure
    try {
      await releaseSeatHold(redis, showId, seatIds, bookingId);
    } catch {
      // ignore secondary release error
    }

    const pgErr = dbErr as { code?: string; constraint?: string };
    if (pgErr.code === "23505") {
      throw new AppError(
        409,
        "SEATS_UNAVAILABLE",
        "One or more seats could not be held due to concurrent reservation conflict"
      );
    }

    throw dbErr;
  }

  return {
    isExisting: false,
    booking: {
      bookingId,
      expiresAt: expiresAt.toISOString(),
      totalMinor,
      status: "PENDING_PAYMENT",
      seatIds,
    },
  };
}

export async function getBookingById(bookingId: string, userId: string, role?: string) {
  const sql = `
    SELECT
      b.id,
      b.user_id,
      b.show_id,
      b.status,
      b.total_minor,
      b.idempotency_key,
      b.expires_at,
      b.created_at,
      s.venue_name,
      s.starts_at,
      e.title AS event_title,
      COALESCE(
        json_agg(
          json_build_object(
            'seat_id', bs.seat_id,
            'row', st.row_label,
            'number', st.seat_number,
            'price_minor', st.price_minor,
            'status', bs.status
          )
        ) FILTER (WHERE bs.seat_id IS NOT NULL),
        '[]'
      ) AS seats
    FROM booking.bookings b
    JOIN booking.shows s ON b.show_id = s.id
    JOIN booking.events e ON s.event_id = e.id
    LEFT JOIN booking.booking_seats bs ON b.id = bs.booking_id
    LEFT JOIN booking.seats st ON bs.seat_id = st.id
    WHERE b.id = $1 AND (b.user_id = $2 OR $3 = 'admin')
    GROUP BY b.id, s.venue_name, s.starts_at, e.title
  `;

  const result = await pool.query(sql, [bookingId, userId, role || "customer"]);

  if (result.rows.length === 0) {
    throw new AppError(404, "NOT_FOUND", "Booking not found");
  }

  return result.rows[0];
}

export async function getUserBookings(userId: string) {
  const sql = `
    SELECT
      b.id,
      b.user_id,
      b.show_id,
      b.status,
      b.total_minor,
      b.expires_at,
      b.created_at,
      s.venue_name,
      s.starts_at,
      e.title AS event_title
    FROM booking.bookings b
    JOIN booking.shows s ON b.show_id = s.id
    JOIN booking.events e ON s.event_id = e.id
    WHERE b.user_id = $1
    ORDER BY b.created_at DESC
  `;

  const result = await pool.query(sql, [userId]);
  return result.rows;
}
