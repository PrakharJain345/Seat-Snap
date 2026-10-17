import { describe, it, expect } from "vitest";
import {
  SignupSchema,
  LoginSchema,
  HoldSeatsSchema,
  AppError,
  isAppError,
  QUEUES,
  JOB_TYPES,
} from "@seatsnap/shared";

describe("Phase 1: Shared Core & Auth Validation", () => {
  describe("SignupSchema", () => {
    it("accepts valid email and password with at least 8 characters", () => {
      const valid = SignupSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const invalid = SignupSchema.safeParse({
        email: "not-an-email",
        password: "password123",
      });
      expect(invalid.success).toBe(false);
    });

    it("rejects password shorter than 8 characters", () => {
      const invalid = SignupSchema.safeParse({
        email: "test@example.com",
        password: "short",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("LoginSchema", () => {
    it("accepts valid email and password", () => {
      const valid = LoginSchema.safeParse({
        email: "test@example.com",
        password: "anypassword",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects empty password", () => {
      const invalid = LoginSchema.safeParse({
        email: "test@example.com",
        password: "",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("HoldSeatsSchema", () => {
    it("accepts 1 to 6 valid UUID seat IDs", () => {
      const valid = HoldSeatsSchema.safeParse({
        seatIds: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
      });
      expect(valid.success).toBe(true);
    });

    it("rejects more than 6 seats", () => {
      const invalid = HoldSeatsSchema.safeParse({
        seatIds: [
          "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
          "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13",
          "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14",
          "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15",
          "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16",
          "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17",
        ],
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("AppError", () => {
    it("creates custom error with status code and error code", () => {
      const err = new AppError(409, "CONFLICT", "Resource exists");
      expect(isAppError(err)).toBe(true);
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe("CONFLICT");
      expect(err.message).toBe("Resource exists");
    });
  });

  describe("Queue & Job Constants", () => {
    it("defines expected queue names and job types", () => {
      expect(QUEUES.PAYMENT_EVENTS).toBe("payment-events");
      expect(QUEUES.BOOKING_EVENTS).toBe("booking-events");
      expect(JOB_TYPES.PAYMENT_SUCCEEDED).toBe("payment.succeeded");
      expect(JOB_TYPES.BOOKING_CONFIRMED).toBe("booking.confirmed");
    });
  });
});
