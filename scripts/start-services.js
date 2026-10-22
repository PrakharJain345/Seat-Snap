/**
 * Unified Microservices Process Manager for Free-Tier Cloud Deployments (Render / Railway / Fly)
 * 
 * Runs all 4 SeatSnap microservices within a single container / web service:
 * - booking-core (port 4001)
 * - payment      (port 4002)
 * - notification (port 4003)
 * - gateway      (public entry point on PORT)
 */

import { spawn } from "child_process";

const PUBLIC_PORT = process.env.PORT || "4000";

// Ensure Upstash Redis uses TLS (rediss://)
if (process.env.REDIS_URL && process.env.REDIS_URL.includes("upstash.io") && process.env.REDIS_URL.startsWith("redis://")) {
  console.log("🔒 Converting Upstash connection to TLS (rediss://)...");
  process.env.REDIS_URL = process.env.REDIS_URL.replace(/^redis:\/\//, "rediss://");
}

const services = [
  {
    name: "booking-core",
    script: "services/booking-core/dist/index.js",
    env: {
      PORT: "4001",
      PAYMENT_URL: "http://localhost:4002",
    },
  },
  {
    name: "payment",
    script: "services/payment/dist/index.js",
    env: {
      PORT: "4002",
    },
  },
  {
    name: "notification",
    script: "services/notification/dist/index.js",
    env: {
      PORT: "4003",
    },
  },
  {
    name: "gateway",
    script: "services/gateway/dist/index.js",
    env: {
      PORT: PUBLIC_PORT,
      BOOKING_URL: "http://localhost:4001",
      PAYMENT_URL: "http://localhost:4002",
    },
  },
];

const processes = [];

console.log("=================================================");
console.log("🚀 Starting SeatSnap Unified Microservices Cluster");
console.log(`🌐 Public Gateway Port: ${PUBLIC_PORT}`);
console.log("=================================================\n");

function startService(svc) {
  const env = { ...process.env, ...svc.env };
  const child = spawn("node", [svc.script], {
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  child.stdout.on("data", (data) => {
    process.stdout.write(`[${svc.name}] ${data.toString()}`);
  });

  child.stderr.on("data", (data) => {
    process.stderr.write(`[${svc.name} ERR] ${data.toString()}`);
  });

  child.on("exit", (code, signal) => {
    console.error(`⚠️ [${svc.name}] exited with code ${code} (${signal})`);
  });

  processes.push(child);
}

// Start internal microservices first, then the gateway
services.forEach((svc, index) => {
  setTimeout(() => {
    console.log(`▶️ Launching service: ${svc.name}...`);
    startService(svc);
  }, index * 800);
});

// Graceful shutdown handling
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("\n🛑 Stopping all services...");
  processes.forEach((p) => p.kill("SIGTERM"));
  setTimeout(() => process.exit(0), 1000);
}
