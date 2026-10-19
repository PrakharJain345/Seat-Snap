import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "@seatsnap/shared";
import { generateTicketQR, validateTicket } from "../services/ticket.service.js";

export const ticketsRouter = Router();

// GET /api/tickets/:id/qr  — returns PNG QR code (customer, owner)
ticketsRouter.get(
  "/:id/qr",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.headers["x-user-id"] as string | undefined;
      if (!userId) throw new AppError(401, "UNAUTHORIZED", "Authentication required");

      const png = await generateTicketQR(req.params.id, userId);
      res.setHeader("Content-Type", "image/png");
      res.status(200).send(png);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/tickets/validate  — validate and consume a ticket (admin only)
ticketsRouter.post(
  "/validate",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userRole = req.headers["x-user-role"] as string | undefined;
      if (userRole !== "admin") {
        throw new AppError(403, "FORBIDDEN", "Admin access required for ticket validation");
      }

      const { token } = req.body as { token?: string };
      if (!token) throw new AppError(400, "MISSING_TOKEN", "token is required in request body");

      const result = await validateTicket(token);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);
