import { describe, it, expect, beforeEach } from "vitest";
import IORedisMock from "ioredis-mock";
import {
  acquireSeatHold,
  releaseSeatHold,
  getSeatHoldKey,
} from "@seatsnap/shared";

// IORedisMock supports eval via Lua-compatible API
function makeMockRedis() {
  return new IORedisMock();
}

describe("Phase 2: Redis Lua Hold Script", () => {
  beforeEach(async () => {
    const redis = makeMockRedis();
    await redis.flushall();
  });
  describe("acquireSeatHold — all-or-none semantics", () => {
    it("succeeds when seats are all free", async () => {
      const redis = makeMockRedis();
      const result = await acquireSeatHold(
        redis as never,
        "show-1",
        ["seat-A1", "seat-A2"],
        "booking-X",
        10
      );
      expect(result).toBe(true);
    });

    it("fails when ANY seat is already held", async () => {
      const redis = makeMockRedis();
      // Manually hold seat-A1
      await redis.set(getSeatHoldKey("show-1", "seat-A1"), "other-booking", "PX", 10000);

      const result = await acquireSeatHold(
        redis as never,
        "show-1",
        ["seat-A1", "seat-A2"],
        "booking-Y",
        10
      );
      expect(result).toBe(false);

      // seat-A2 must NOT have been set (atomic: all or none)
      const seat2Val = await redis.get(getSeatHoldKey("show-1", "seat-A2"));
      expect(seat2Val).toBeNull();
    });

    it("sets all keys with correct value on success", async () => {
      const redis = makeMockRedis();
      await acquireSeatHold(redis as never, "show-2", ["seat-B1", "seat-B2"], "booking-Z", 60);

      const v1 = await redis.get(getSeatHoldKey("show-2", "seat-B1"));
      const v2 = await redis.get(getSeatHoldKey("show-2", "seat-B2"));
      expect(v1).toBe("booking-Z");
      expect(v2).toBe("booking-Z");
    });

    it("two concurrent holds on same seat: exactly one wins", async () => {
      const redis = makeMockRedis();
      const showId = "show-hot";
      const seatIds = ["seat-C1"];

      const [r1, r2] = await Promise.all([
        acquireSeatHold(redis as never, showId, seatIds, "booking-A", 60),
        acquireSeatHold(redis as never, showId, seatIds, "booking-B", 60),
      ]);

      // Exactly one must succeed
      const successes = [r1, r2].filter(Boolean).length;
      expect(successes).toBe(1);
    });
  });

  describe("releaseSeatHold — only release own holds", () => {
    it("releases keys only when value matches bookingId", async () => {
      const redis = makeMockRedis();
      await acquireSeatHold(redis as never, "show-3", ["seat-D1"], "booking-P", 60);

      // Release with wrong bookingId — must not delete
      await releaseSeatHold(redis as never, "show-3", ["seat-D1"], "booking-OTHER");
      const still = await redis.get(getSeatHoldKey("show-3", "seat-D1"));
      expect(still).toBe("booking-P");

      // Release with correct bookingId — must delete
      await releaseSeatHold(redis as never, "show-3", ["seat-D1"], "booking-P");
      const gone = await redis.get(getSeatHoldKey("show-3", "seat-D1"));
      expect(gone).toBeNull();
    });

    it("after release, another booking can acquire", async () => {
      const redis = makeMockRedis();
      await acquireSeatHold(redis as never, "show-4", ["seat-E1"], "booking-Q", 60);
      await releaseSeatHold(redis as never, "show-4", ["seat-E1"], "booking-Q");

      const result = await acquireSeatHold(redis as never, "show-4", ["seat-E1"], "booking-R", 60);
      expect(result).toBe(true);
    });
  });

  describe("getSeatHoldKey", () => {
    it("generates correct key format", () => {
      expect(getSeatHoldKey("show-abc", "seat-xyz")).toBe("hold:show-abc:seat-xyz");
    });
  });
});
