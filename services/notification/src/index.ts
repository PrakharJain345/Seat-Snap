import express, { Request, Response } from "express";
import { logger, requestIdMiddleware, errorHandlerMiddleware } from "@seatsnap/shared";
import { config } from "./config.js";

const app = express();

app.use(express.json());
app.use(requestIdMiddleware);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "notification" });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Route not found" });
});

app.use(errorHandlerMiddleware);

function start() {
  app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, "Notification service listening");
  });
}

start();
