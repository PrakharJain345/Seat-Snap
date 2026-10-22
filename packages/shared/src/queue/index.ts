import { DefaultJobOptions } from "bullmq";

export const QUEUES = {
  PAYMENT_EVENTS: "payment-events",
  BOOKING_EVENTS: "booking-events",
} as const;

export const JOB_TYPES = {
  PAYMENT_SUCCEEDED: "payment.succeeded",
  PAYMENT_FAILED: "payment.failed",
  BOOKING_CONFIRMED: "booking.confirmed",
  BOOKING_EXPIRED: "booking.expired",
  BOOKING_REFUND_REQUESTED: "booking.refund_requested",
} as const;

export const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 1000,
  },
  removeOnComplete: false,
  removeOnFail: false,
};

export function sanitizeRedisUrl(url?: string): string {
  if (!url) return "redis://redis:6379";
  let clean = url.trim();
  const match = clean.match(/rediss?:\/\/[^\s"']+/);
  if (match) {
    clean = match[0];
  }
  if (clean.includes("upstash.io") && clean.startsWith("redis://")) {
    clean = clean.replace(/^redis:\/\//, "rediss://");
  }
  return clean;
}

export interface PaymentSucceededPayload {
  bookingId: string;
  paymentId: string;
}

export interface PaymentFailedPayload {
  bookingId: string;
  reason: string;
}

export interface BookingConfirmedPayload {
  bookingId: string;
  userId: string;
  showId: string;
  seatIds: string[];
}

export interface BookingExpiredPayload {
  bookingId: string;
  showId: string;
  seatIds: string[];
}

export interface BookingRefundRequestedPayload {
  bookingId: string;
  paymentId?: string;
  reason: string;
}
