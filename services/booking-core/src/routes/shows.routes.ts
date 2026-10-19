import { Router, Request, Response, NextFunction } from "express";
import { AppError, HoldSeatsSchema } from "@seatsnap/shared";
import {
  getShowById,
  getShowSeats,
  holdSeats,
} from "../services/booking.service.js";

export const showsRouter = Router();

// GET /api/shows/:id
showsRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const show = await getShowById(req.params.id);
      res.status(200).json(show);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/shows/:id/seats
showsRouter.get(
  "/:id/seats",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const seats = await getShowSeats(req.params.id);
      res.status(200).json(seats);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/shows/:id/hold
showsRouter.post(
  "/:id/hold",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.headers["x-user-id"] as string | undefined;
      if (!userId) {
        throw new AppError(401, "UNAUTHORIZED", "User authentication required to hold seats");
      }

      const idempotencyKey =
        (req.headers["idempotency-key"] as string | undefined) ||
        (req.headers["x-idempotency-key"] as string | undefined);

      if (!idempotencyKey) {
        throw new AppError(400, "MISSING_IDEMPOTENCY_KEY", "Idempotency-Key header is required");
      }

      const { seatIds } = HoldSeatsSchema.parse(req.body);

      const result = await holdSeats({
        showId: req.params.id,
        seatIds,
        userId,
        idempotencyKey,
      });

      const statusCode = result.isExisting ? 200 : 201;
      res.status(statusCode).json(result.booking);
    } catch (err) {
      next(err);
    }
  }
);
