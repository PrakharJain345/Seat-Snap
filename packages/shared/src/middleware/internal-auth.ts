import { Request, Response, NextFunction } from "express";
import { AppError } from "../error.js";

export function internalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Allow healthcheck without internal key
  if (req.path === "/health") {
    return next();
  }

  const expectedKey = process.env.INTERNAL_API_KEY;
  const providedKey = req.headers["x-internal-key"];

  if (!expectedKey || !providedKey || providedKey !== expectedKey) {
    return next(new AppError(403, "FORBIDDEN", "Forbidden: Invalid or missing internal API key"));
  }

  next();
}
