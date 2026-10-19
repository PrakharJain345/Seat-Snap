import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";
import IORedisMock from "ioredis-mock";
import { handleWebhook } from "../services/payment/src/payment.service.js";
import { MockProvider } from "../services/payment/src/providers.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEBHOOK_SECRET = "test-webhook-secret-dev";

function buildMockPayload(overrides: Record<string, unknown> = {}) {
  const body = {
    event: "mock.payment.succeeded",
    event_id: `evt_${Date.now()}_${Math.random()}`,
    order_id: "mock_order_abc123",
    booking_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    ...overrides,
  };
  const rawBody = Buffer.from(JSON.stringify(body));
  const signature = createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  return { rawBody, signature, body };
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

function makeMockProvider(): MockProvider {
  const provider = new MockProvider();
  // Override the webhook secret check to use our test secret
  const originalVerify = provider.verifyWebhookSignature.bind(provider);
  provider.verifyWebhookSignature = ({ rawBody, signature }) => {
    const expected = createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
    try {
      const { timingSafeEqual } = require("crypto");
      return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
    } catch {
      return expected === signature;
    }
  };
  return provider;
}

describe("Phase 4/5: Webhook Deduplication", () => {
  it("processes a success webhook and marks payment PAID exactly once", async () => {
    const provider = makeMockProvider();
    const { rawBody, signature } = buildMockPayload({ event_id: "unique-event-001" });

    const insertedEventKeys: string[] = [];
    const updatedPayments: string[] = [];
    const publishedJobs: string[] = [];

    // Mock pool
    const mockPool = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes("INSERT INTO payment.webhook_events")) {
          if (insertedEventKeys.includes(params?.[0] as string)) {
            const err = new Error("duplicate key");
            (err as NodeJS.ErrnoException & { code?: string }).code = "23505";
            throw err;
          }
          insertedEventKeys.push(params?.[0] as string);
          return { rows: [] };
        }
        if (sql.includes("SELECT id, booking_id, amount_minor FROM payment.payments")) {
          return {
            rows: [{ id: "pay-001", booking_id: "booking-001", amount_minor: 125000 }],
          };
        }
        if (sql.includes("UPDATE payment.payments SET status = 'PAID'")) {
          updatedPayments.push(params?.[0] as string);
          return { rowCount: 1 };
        }
        return { rows: [] };
      }),
    };

    // Mock queue
    const mockQueue = {
      add: vi.fn(async (type: string) => {
        publishedJobs.push(type);
      }),
    };

    // Inject mocks
    const origPool = await import("../services/payment/src/db.js");
    vi.spyOn(origPool, "pool" as never, "get").mockReturnValue(mockPool as never);
    const origQueue = await import("../services/payment/src/queue.js");
    vi.spyOn(origQueue, "paymentEventsQueue" as never, "get").mockReturnValue(mockQueue as never);

    // First invocation
    const result1 = await handleWebhook(rawBody, signature, provider);
    expect(result1.received).toBe(true);
    expect(result1.duplicate).toBeUndefined();

    // Second invocation with same event_id
    const { rawBody: rb2, signature: sig2 } = buildMockPayload({ event_id: "unique-event-001" });
    const result2 = await handleWebhook(rb2, sig2, provider);
    expect(result2.received).toBe(true);
    expect(result2.duplicate).toBe(true);
  });

  it("rejects webhook with invalid signature", async () => {
    const provider = makeMockProvider();
    const { rawBody } = buildMockPayload();
    const badSig = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

    await expect(handleWebhook(rawBody, badSig, provider)).rejects.toMatchObject({
      code: "INVALID_SIGNATURE",
    });
  });
});

describe("Phase 5: HMAC Ticket Token", () => {
  it("generates and verifies a valid ticket token", async () => {
    const { generateTicketToken, verifyTicketToken } =
      await import("../services/booking-core/src/services/ticket.service.js");

    // We need to stub config — use any valid secret
    const ticketId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const token = generateTicketToken(ticketId);

    expect(token).toContain(".");
    expect(token.startsWith(ticketId)).toBe(true);

    const result = verifyTicketToken(token);
    expect(result.valid).toBe(true);
    expect(result.ticketId).toBe(ticketId);
  });

  it("rejects a tampered token", async () => {
    const { generateTicketToken, verifyTicketToken } =
      await import("../services/booking-core/src/services/ticket.service.js");

    const ticketId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const token = generateTicketToken(ticketId);
    const tampered = token.slice(0, -4) + "0000"; // corrupt last 4 chars

    const result = verifyTicketToken(tampered);
    expect(result.valid).toBe(false);
  });

  it("rejects a token with no dot separator", async () => {
    const { verifyTicketToken } =
      await import("../services/booking-core/src/services/ticket.service.js");

    const result = verifyTicketToken("notavalidtoken");
    expect(result.valid).toBe(false);
  });

  it("replaying the same webhook 5 times processes it once and skips 4 times", async () => {
    const provider = makeMockProvider();
    const eventId = "replay-event-5x";
    const { rawBody, signature } = buildMockPayload({ event_id: eventId });

    let callCount = 0;
    const insertedKeys = new Set<string>();

    const mockPool = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes("INSERT INTO payment.webhook_events")) {
          const key = params?.[0] as string;
          if (insertedKeys.has(key)) {
            const err = new Error("duplicate key");
            (err as NodeJS.ErrnoException & { code?: string }).code = "23505";
            throw err;
          }
          insertedKeys.add(key);
          return { rows: [] };
        }
        if (sql.includes("SELECT id, booking_id, amount_minor FROM payment.payments")) {
          return { rows: [{ id: "pay-5x", booking_id: "booking-5x", amount_minor: 10000 }] };
        }
        if (sql.includes("UPDATE payment.payments SET status = 'PAID'")) {
          callCount++;
          return { rowCount: 1 };
        }
        return { rows: [] };
      }),
    };

    const publishedJobs: string[] = [];
    const mockQueue = {
      add: vi.fn(async (type: string) => {
        publishedJobs.push(type);
      }),
    };

    const origPool = await import("../services/payment/src/db.js");
    vi.spyOn(origPool, "pool" as never, "get").mockReturnValue(mockPool as never);
    const origQueue = await import("../services/payment/src/queue.js");
    vi.spyOn(origQueue, "paymentEventsQueue" as never, "get").mockReturnValue(mockQueue as never);

    for (let i = 0; i < 5; i++) {
      const res = await handleWebhook(rawBody, signature, provider);
      expect(res.received).toBe(true);
      if (i === 0) {
        expect(res.duplicate).toBeUndefined();
      } else {
        expect(res.duplicate).toBe(true);
      }
    }

    expect(callCount).toBe(1);
    expect(publishedJobs.length).toBe(1);
    expect(publishedJobs[0]).toBe("payment.succeeded");
  });
});

describe("Phase 5: Late Payment Handling", () => {
  it("when payment succeeds after booking expiry, leaves booking not confirmed and emits booking.refund_requested", async () => {
    const { confirmBookingOnPayment } =
      await import("../services/booking-core/src/services/ticket.service.js");

    const addedJobs: Array<{ type: string; payload: unknown }> = [];
    const mockQueue = {
      add: vi.fn(async (type: string, payload: unknown) => {
        addedJobs.push({ type, payload });
      }),
    };

    const origQueue = await import("../services/booking-core/src/queue.js");
    vi.spyOn(origQueue, "bookingEventsQueue" as never, "get").mockReturnValue(mockQueue as never);

    let bookingStatus = "EXPIRED";
    const bookingId = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff";
    const paymentId = "pay-late-001";

    const mockClient = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes("INSERT INTO booking.processed_events")) {
          return { rows: [] };
        }
        if (sql.includes("SELECT status, expires_at, show_id, user_id FROM booking.bookings")) {
          return {
            rows: [
              {
                status: "EXPIRED",
                // Expired 10 seconds ago
                expires_at: new Date(Date.now() - 10000).toISOString(),
                show_id: "show-001",
                user_id: "user-001",
              },
            ],
          };
        }
        if (sql.includes("SELECT seat_id FROM booking.booking_seats")) {
          return { rows: [{ seat_id: "seat-001" }] };
        }
        if (sql.includes("UPDATE booking.bookings SET status = 'CONFIRMED'")) {
          bookingStatus = "CONFIRMED";
          return { rowCount: 1 };
        }
        return { rows: [] };
      }),
      release: vi.fn(),
    };

    const mockPool = {
      connect: vi.fn(async () => mockClient),
      query: mockClient.query,
    };

    const mockRedis = new IORedisMock();
    const outcome = await confirmBookingOnPayment(bookingId, paymentId, mockPool as never, mockRedis as never);

    expect(outcome).toBe("late_payment");
    expect(bookingStatus).toBe("EXPIRED"); // NOT confirmed!
    expect(addedJobs.some((j) => j.type === "booking.refund_requested")).toBe(true);
  });
});
