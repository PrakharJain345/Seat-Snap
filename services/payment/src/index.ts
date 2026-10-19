import express, { Request, Response, NextFunction } from "express";
import {
  logger,
  requestIdMiddleware,
  internalAuthMiddleware,
  errorHandlerMiddleware,
} from "@seatsnap/shared";
import { config } from "./config.js";
import { initDb } from "./db.js";
import { createPaymentProvider } from "./providers.js";
import {
  createPaymentOrder,
  handleWebhook,
  handleMockComplete,
} from "./payment.service.js";

const app = express();

const provider = createPaymentProvider(
  config.PAYMENT_PROVIDER,
  config.RAZORPAY_KEY_ID,
  config.RAZORPAY_KEY_SECRET
);

logger.info({ provider: provider.name }, "Payment provider initialized");

app.use(requestIdMiddleware);

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "payment", provider: provider.name });
});

// ─── Webhook (public — raw body required for HMAC) ────────────────────────────
app.post(
  ["/api/payments/webhook", "/payments/webhook", "/webhook"],
  express.raw({ type: "*/*" }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sig = (req.headers["x-razorpay-signature"] ||
        req.headers["x-webhook-signature"] || "") as string;
      const rawBody = req.body as Buffer;
      const result = await handleWebhook(rawBody, sig, provider);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// From here down — require internal key
app.use(express.json());
app.use(internalAuthMiddleware);

// ─── Create payment order (called by booking-core via /api/bookings/:id/pay) ──
app.post(
  ["/api/payments/order", "/payments/order", "/order"],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await createPaymentOrder(req.body, provider);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── Mock payment completion (dev only) ───────────────────────────────────────
app.post(
  ["/api/payments/mock/:orderId/complete", "/payments/mock/:orderId/complete", "/mock/:orderId/complete"],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await handleMockComplete(req.params.orderId, provider);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

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
