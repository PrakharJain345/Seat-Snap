import { describe, it, expect, beforeEach, vi } from "vitest";
import IORedisMock from "ioredis-mock";
import { sweepExpiredBookings } from "../services/booking-core/src/services/sweeper.service.js";
import { getSeatHoldKey, JOB_TYPES } from "@seatsnap/shared";

describe("Phase 3: Expiry Sweeper Service", () => {
  let redis: InstanceType<typeof IORedisMock>;

  beforeEach(async () => {
    redis = new IORedisMock();
    await redis.flushall();
  });

  it("sweeps expired bookings, releases seats and publishes booking.expired event", async () => {
    const expiredBookingId = "exp-booking-001";
    const showId = "show-sweep-test";
    const seatIds = ["seat-s1", "seat-s2"];

    // Pre-populate Redis holds
    for (const seatId of seatIds) {
      await redis.set(getSeatHoldKey(showId, seatId), expiredBookingId);
    }

    // Mock Pool client
    const mockDbQueries: string[] = [];
    let bookingStatus = "PENDING_PAYMENT";
    let seatStatus = "HELD";

    const mockClient = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        mockDbQueries.push(sql);
        if (sql.includes("SELECT status FROM booking.bookings")) {
          return { rows: [{ status: bookingStatus }] };
        }
        if (sql.includes("SELECT seat_id FROM booking.booking_seats")) {
          return { rows: seatIds.map((id) => ({ seat_id: id })) };
        }
        if (sql.includes("UPDATE booking.bookings SET status = 'EXPIRED'")) {
          bookingStatus = "EXPIRED";
          return { rowCount: 1 };
        }
        if (sql.includes("UPDATE booking.booking_seats SET status = 'RELEASED'")) {
          seatStatus = "RELEASED";
          return { rowCount: seatIds.length };
        }
        return { rows: [] };
      }),
      release: vi.fn(),
    };

    const mockPool = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("WHERE status = 'PENDING_PAYMENT' AND expires_at < now()")) {
          return { rows: [{ id: expiredBookingId, show_id: showId }] };
        }
        return { rows: [] };
      }),
      connect: vi.fn(async () => mockClient),
    };

    const publishedJobs: { type: string; data: unknown }[] = [];
    const mockQueue = {
      add: vi.fn(async (type: string, data: unknown) => {
        publishedJobs.push({ type, data });
      }),
    };

    const count = await sweepExpiredBookings(mockPool as never, redis as never, mockQueue as never);

    expect(count).toBe(1);
    expect(bookingStatus).toBe("EXPIRED");
    expect(seatStatus).toBe("RELEASED");

    // Verify Redis holds were cleared
    for (const seatId of seatIds) {
      const val = await redis.get(getSeatHoldKey(showId, seatId));
      expect(val).toBeNull();
    }

    // Verify event was queued
    expect(publishedJobs.length).toBe(1);
    expect(publishedJobs[0].type).toBe(JOB_TYPES.BOOKING_EXPIRED);
    expect(publishedJobs[0].data).toEqual({
      bookingId: expiredBookingId,
      showId,
      seatIds,
    });
  });
});
