import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../error.js";
import { logger } from "../logger.js";

export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.headers["x-request-id"] as string | undefined;

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ requestId, err }, "Server error in request");
    }
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  logger.error({ requestId, err }, "Unhandled server error");
  res.status(500).json({
    error: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
  });
}
