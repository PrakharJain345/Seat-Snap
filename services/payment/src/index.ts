import express, { Request, Response } from "express";
import {
  logger,
  requestIdMiddleware,
  internalAuthMiddleware,
  errorHandlerMiddleware,
} from "@seatsnap/shared";
import { config } from "./config.js";
import { initDb } from "./db.js";

const app = express();

app.use(express.json());
app.use(requestIdMiddleware);

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "payment" });
});

// Webhook endpoint (public with signature verification in Phase 4)
app.post(["/api/payments/webhook", "/payments/webhook"], (_req: Request, res: Response) => {
  res.status(200).json({ received: true });
});

// Require internal key for internal service calls
app.use(internalAuthMiddleware);

// Phase 4 endpoint stubs
app.post(["/api/payments/order", "/payments/order"], (_req: Request, res: Response) => {
  res.status(501).json({ error: "NOT_IMPLEMENTED", message: "Order creation available in Phase 4" });
});

app.post(["/api/payments/mock/:orderId/complete", "/payments/mock/:orderId/complete"], (_req: Request, res: Response) => {
  res.status(501).json({ error: "NOT_IMPLEMENTED", message: "Mock payment completion available in Phase 4" });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Route not found" });
});

app.use(errorHandlerMiddleware);

async function start() {
  try {
    await initDb();
    app.listen(config.PORT, () => {
      logger.info({ port: config.PORT }, "Payment service listening");
    });
  } catch (err) {
    logger.error({ err }, "Failed to start payment service");
    process.exit(1);
  }
}

start();
