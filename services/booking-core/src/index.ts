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
import { showsRouter } from "./routes/shows.routes.js";
import { bookingsRouter, meRouter } from "./routes/bookings.routes.js";
import { ticketsRouter } from "./routes/tickets.routes.js";
import { startSweeper } from "./services/sweeper.service.js";
import { startPaymentConsumer } from "./consumers/payment.consumer.js";

const app = express();

app.use(express.json());
app.use(requestIdMiddleware);

// Health check (no internal auth required)
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "booking-core" });
});

// Require internal key for all service-to-service communication
app.use(internalAuthMiddleware);

// Mount routes (both with and without /api prefix for gateway flexibility)
app.use("/api/events", eventsRouter);
app.use("/events", eventsRouter);

app.use("/api/shows", showsRouter);
app.use("/shows", showsRouter);

app.use("/api/bookings", bookingsRouter);
app.use("/bookings", bookingsRouter);

app.use("/api/me", meRouter);
app.use("/me", meRouter);

app.use("/api/tickets", ticketsRouter);
app.use("/tickets", ticketsRouter);

// Catch-all 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Route not found" });
});

app.use(errorHandlerMiddleware);

async function start() {
  try {
    await initDb();
    if (config.NODE_ENV !== "test") {
      startSweeper();
      startPaymentConsumer();
    }
    app.listen(config.PORT, () => {
      logger.info({ port: config.PORT }, "Booking-core service listening");
    });
  } catch (err) {
    logger.error({ err }, "Failed to start booking-core service");
    process.exit(1);
  }
}

start();
