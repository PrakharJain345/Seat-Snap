import express, { Request, Response } from "express";
import {
  logger,
  requestIdMiddleware,
  internalAuthMiddleware,
  errorHandlerMiddleware,
} from "@seatsnap/shared";
import { config } from "./config.js";
import { initDb } from "./db.js";
import { eventsRouter } from "./routes/events.routes.js";

const app = express();

app.use(express.json());
app.use(requestIdMiddleware);

// Health check (no internal auth required)
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "booking-core" });
});

// Require internal key for all service-to-service communication
app.use(internalAuthMiddleware);

// Mount event routes (both with and without /api prefix for flexibility)
app.use("/api/events", eventsRouter);
app.use("/events", eventsRouter);

// Phase 2+ endpoint stubs
app.get(["/api/shows/:id/seats", "/shows/:id/seats"], (_req: Request, res: Response) => {
  res.status(200).json([]);
});

app.post(["/api/shows/:id/hold", "/shows/:id/hold"], (_req: Request, res: Response) => {
  res.status(501).json({ error: "NOT_IMPLEMENTED", message: "Seat hold endpoint available in Phase 2" });
});

app.get(["/api/bookings/:id", "/bookings/:id"], (_req: Request, res: Response) => {
  res.status(501).json({ error: "NOT_IMPLEMENTED", message: "Booking retrieval available in Phase 2" });
});

app.get(["/api/me/bookings", "/me/bookings"], (_req: Request, res: Response) => {
  res.status(200).json([]);
});

// Catch-all 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Route not found" });
});

app.use(errorHandlerMiddleware);

async function start() {
  try {
    await initDb();
    app.listen(config.PORT, () => {
      logger.info({ port: config.PORT }, "Booking-core service listening");
    });
  } catch (err) {
    logger.error({ err }, "Failed to start booking-core service");
    process.exit(1);
  }
}

start();
