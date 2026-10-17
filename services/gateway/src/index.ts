import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import {
  logger,
  requestIdMiddleware,
  errorHandlerMiddleware,
  AppError,
  JwtPayload,
} from "@seatsnap/shared";
import { config } from "./config.js";
import { initDb } from "./db.js";
import { authRouter } from "./routes/auth.routes.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.CORS_ORIGIN === "*" ? true : config.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(requestIdMiddleware);

// Global rate limiter: 100 requests / min
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "RATE_LIMIT_EXCEEDED", message: "Too many requests, please try again later." },
});
app.use(globalLimiter);

// Auth rate limiter: 10 requests / min on signup and login
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "RATE_LIMIT_EXCEEDED", message: "Too many authentication attempts, please try again later." },
});

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "gateway" });
});

// Auth routes (need JSON body parsing)
app.use("/api/auth", express.json(), authLimiter, authRouter);

// Token parsing middleware for proxy routes
function parseAuthToken(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
      (req as unknown as { user: JwtPayload }).user = decoded;
      req.headers["x-user-id"] = decoded.userId;
      req.headers["x-user-role"] = decoded.role;
    } catch {
      // If token is invalid, we do not attach user
    }
  }
  next();
}

function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const user = (req as unknown as { user?: JwtPayload }).user;
  if (!user) {
    return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
  }
  next();
}

function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const user = (req as unknown as { user?: JwtPayload }).user;
  if (!user || user.role !== "admin") {
    return next(new AppError(403, "FORBIDDEN", "Admin access required"));
  }
  next();
}

app.use(parseAuthToken);

// Booking core proxy
const bookingProxy = createProxyMiddleware({
  target: config.BOOKING_URL,
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq, req) => {
      proxyReq.setHeader("x-internal-key", config.INTERNAL_API_KEY);
      const user = (req as unknown as { user?: JwtPayload }).user;
      if (user) {
        proxyReq.setHeader("x-user-id", user.userId);
        proxyReq.setHeader("x-user-role", user.role);
      }
      fixRequestBody(proxyReq, req);
    },
    error: (err, _req, res) => {
      logger.error({ err }, "Booking proxy error");
      if ("status" in res && typeof res.status === "function") {
        res.status(502).json({ error: "BAD_GATEWAY", message: "Booking service unavailable" });
      }
    },
  },
});

// Payment proxy
const paymentProxy = createProxyMiddleware({
  target: config.PAYMENT_URL,
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq, req) => {
      proxyReq.setHeader("x-internal-key", config.INTERNAL_API_KEY);
      const user = (req as unknown as { user?: JwtPayload }).user;
      if (user) {
        proxyReq.setHeader("x-user-id", user.userId);
        proxyReq.setHeader("x-user-role", user.role);
      }
      fixRequestBody(proxyReq, req);
    },
    error: (err, _req, res) => {
      logger.error({ err }, "Payment proxy error");
      if ("status" in res && typeof res.status === "function") {
        res.status(502).json({ error: "BAD_GATEWAY", message: "Payment service unavailable" });
      }
    },
  },
});

// Protected routes requiring authentication before proxying
app.post("/api/shows/:id/hold", requireAuth, bookingProxy);
app.post("/api/bookings/:id/pay", requireAuth, bookingProxy);
app.get("/api/bookings/:id", requireAuth, bookingProxy);
app.get("/api/me/bookings", requireAuth, bookingProxy);
app.get("/api/tickets/:id/qr", requireAuth, bookingProxy);
app.post("/api/tickets/validate", requireAdmin, bookingProxy);
app.post("/api/payments/mock/:orderId/complete", requireAuth, paymentProxy);

// Public proxy routes
app.use("/api/events", bookingProxy);
app.use("/api/shows", bookingProxy);
app.use("/api/bookings", bookingProxy);
app.use("/api/me", bookingProxy);
app.use("/api/tickets", bookingProxy);
app.use("/api/payments", paymentProxy);

// Catch-all 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Route not found" });
});

// Error handling middleware
app.use(errorHandlerMiddleware);

async function start() {
  try {
    await initDb();
    app.listen(config.PORT, () => {
      logger.info({ port: config.PORT }, "Gateway service listening");
    });
  } catch (err) {
    logger.error({ err }, "Failed to start gateway service");
    process.exit(1);
  }
}

start();
