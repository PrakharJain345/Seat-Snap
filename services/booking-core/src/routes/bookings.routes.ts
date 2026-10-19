import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "@seatsnap/shared";
import {
  getBookingById,
  getUserBookings,
} from "../services/booking.service.js";

export const bookingsRouter = Router();

// GET /api/bookings/:id
bookingsRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.headers["x-user-id"] as string | undefined;
      const userRole = req.headers["x-user-role"] as string | undefined;

      if (!userId) {
        throw new AppError(401, "UNAUTHORIZED", "User authentication required");
      }

      const booking = await getBookingById(req.params.id, userId, userRole);
      res.status(200).json(booking);
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

      if (!userId) {
        throw new AppError(401, "UNAUTHORIZED", "User authentication required");
      }

      const bookings = await getUserBookings(userId);
      res.status(200).json(bookings);
    } catch (err) {
      next(err);
    }
  }
);
