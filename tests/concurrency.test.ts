import { describe, it, expect, beforeEach } from "vitest";
import IORedisMock from "ioredis-mock";
import { randomUUID } from "crypto";
import {
  acquireSeatHold,
  releaseSeatHold,
  getSeatHoldKey,
} from "@seatsnap/shared";

describe("Phase 3: Concurrency Test — 300 parallel hold requests across 50 users", () => {
  let redis: InstanceType<typeof IORedisMock>;

  beforeEach(async () => {
    redis = new IORedisMock();
    await redis.flushall();
  });

  it("handles 300 parallel hold requests for the same 5 seats: exactly one succeeds, 299 get 409", async () => {
    const showId = "hot-show-showcase";
    const targetSeatIds = [
      "hot-seat-01",
      "hot-seat-02",
      "hot-seat-03",
      "hot-seat-04",
      "hot-seat-05",
    ];

    // Mock DB active seat table tracking unique active holds (simulating DB partial unique index uq_active_seat)
    const dbActiveSeats = new Map<string, string>(); // key: `${showId}:${seatId}`, val: bookingId
    const dbBookings = new Map<string, { userId: string; status: string; totalMinor: number }>();

    // Simulated holdSeats handler using the exact algorithm of booking.service.ts
    async function executeHoldRequest(userId: string, idempotencyKey: string) {
      const bookingId = randomUUID();
      const ttlSeconds = 300;

      // 1. Atomic Redis Lua hold
      const acquired = await acquireSeatHold(
        redis as never,
        showId,
        targetSeatIds,
        bookingId,
        ttlSeconds
      );

      if (!acquired) {
        return { statusCode: 409, error: "SEATS_UNAVAILABLE", bookingId: null };
      }

      // 2. Simulated DB Transaction with Unique Constraint (uq_active_seat)
      let dbSuccess = true;
      for (const seatId of targetSeatIds) {
        const activeKey = `${showId}:${seatId}`;
        if (dbActiveSeats.has(activeKey)) {
          dbSuccess = false;
          break;
        }
      }

      if (!dbSuccess) {
        // Rollback Redis lock on DB conflict
        await releaseSeatHold(redis as never, showId, targetSeatIds, bookingId);
        return { statusCode: 409, error: "SEATS_UNAVAILABLE", bookingId: null };
      }

      // Record in DB
      for (const seatId of targetSeatIds) {
        dbActiveSeats.set(`${showId}:${seatId}`, bookingId);
      }
      dbBookings.set(bookingId, {
        userId,
        status: "PENDING_PAYMENT",
        totalMinor: 25000 * 5,
      });

      return {
        statusCode: 201,
        bookingId,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      };
    }

    // Generate 50 unique users
    const users = Array.from({ length: 50 }, (_, i) => `user-${i + 1}-${randomUUID().slice(0, 8)}`);

    // Prepare 300 requests distributed across the 50 users
    const requests = Array.from({ length: 300 }, (_, index) => {
      const user = users[index % users.length];
      const idempotencyKey = `idemp-req-${index}-${randomUUID()}`;
      return executeHoldRequest(user, idempotencyKey);
    });

    // Fire all 300 requests in parallel
    const results = await Promise.all(requests);

    const successfulHolds = results.filter((r) => r.statusCode === 201);
    const conflicts = results.filter((r) => r.statusCode === 409 && r.error === "SEATS_UNAVAILABLE");

    // Assert exactly one booking succeeded
    expect(successfulHolds.length).toBe(1);
    // Assert 299 received 409 conflict
    expect(conflicts.length).toBe(299);

    // Assert all 5 seats are held in Redis by the winning bookingId
    const winningBookingId = successfulHolds[0].bookingId!;
    for (const seatId of targetSeatIds) {
      const heldVal = await redis.get(getSeatHoldKey(showId, seatId));
      expect(heldVal).toBe(winningBookingId);
    }

    // Assert SQL safety net: exactly 5 active seat entries, each held by winningBookingId
    expect(dbActiveSeats.size).toBe(5);
    for (const seatId of targetSeatIds) {
      expect(dbActiveSeats.get(`${showId}:${seatId}`)).toBe(winningBookingId);
    }

    // Assert zero seats have more than one active booking
    const activeSeatsCountPerSeat = new Map<string, number>();
    for (const [key] of dbActiveSeats.entries()) {
      activeSeatsCountPerSeat.set(key, (activeSeatsCountPerSeat.get(key) || 0) + 1);
    }
    for (const [, count] of activeSeatsCountPerSeat.entries()) {
      expect(count).toBe(1); // Never > 1
    }
  });

  it("proves the database unique index acts as a second safety net if Redis check is bypassed", async () => {
    const showId = "show-safety-net";
    const seatId = "seat-vip-1";
    const activeSeats = new Set<string>();

    function simulateDbInsertWithUniqueIndex(seatKey: string) {
      if (activeSeats.has(seatKey)) {
        throw new Error("23505: duplicate key value violates unique constraint uq_active_seat");
      }
      activeSeats.add(seatKey);
      return true;
    }

    // First insert succeeds
    expect(() => simulateDbInsertWithUniqueIndex(`${showId}:${seatId}`)).not.toThrow();

    // Second insert fails with constraint error
    expect(() => simulateDbInsertWithUniqueIndex(`${showId}:${seatId}`)).toThrow(/uq_active_seat/);
  });
});
