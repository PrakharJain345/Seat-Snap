import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "@seatsnap/shared";
import {
  getBookingById,
  getUserBookings,
} from "../services/booking.service.js";
import { config } from "../config.js";

export const bookingsRouter = Router();

// GET /api/bookings/:id
bookingsRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.headers["x-user-id"] as string | undefined;
      const userRole = req.headers["x-user-role"] as string | undefined;
      if (!userId) throw new AppError(401, "UNAUTHORIZED", "User authentication required");

      const booking = await getBookingById(req.params.id, userId, userRole);
      res.status(200).json(booking);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/bookings/:id/pay — creates a payment order (proxied internally to payment service)
bookingsRouter.post(
  "/:id/pay",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.headers["x-user-id"] as string | undefined;
      if (!userId) throw new AppError(401, "UNAUTHORIZED", "User authentication required");

      const bookingId = req.params.id;
      const booking = await getBookingById(bookingId, userId);

      if (booking.status !== "PENDING_PAYMENT") {
        throw new AppError(
          400,
          "INVALID_STATUS",
          `Cannot pay for booking with status: ${booking.status}`
        );
      }

      if (new Date(booking.expires_at) < new Date()) {
        throw new AppError(400, "BOOKING_EXPIRED", "This booking has expired");
      }

      // Call payment service internally
      const paymentUrl = config.PAYMENT_URL;
      const response = await fetch(`${paymentUrl}/payments/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-key": config.INTERNAL_API_KEY,
        },
        body: JSON.stringify({
          bookingId: booking.id,
          amountMinor: booking.total_minor,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new AppError(502, "PAYMENT_SERVICE_ERROR", "Payment service error", errBody);
      }

      const paymentData = await response.json();
      res.status(201).json(paymentData);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/me/bookings
export const meRouter = Router();

meRouter.get(
  "/bookings",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.headers["x-user-id"] as string | undefined;
      if (!userId) throw new AppError(401, "UNAUTHORIZED", "User authentication required");

      const bookings = await getUserBookings(userId);
      res.status(200).json(bookings);
    } catch (err) {
      next(err);
    }
  }
);
