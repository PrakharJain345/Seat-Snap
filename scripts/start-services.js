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

// Ensure Redis URL is clean and uses TLS (rediss://) for Upstash
function sanitizeRedisUrl(url) {
  if (!url) return url;
  let clean = url.trim();
  // If the user pasted the entire CLI command: e.g. "redis-cli --tls -u redis://default:..."
  const match = clean.match(/rediss?:\/\/[^\s"']+/);
  if (match) {
    clean = match[0];
  }
  // Upstash strictly requires TLS protocol (rediss://)
  if (clean.includes("upstash.io") && clean.startsWith("redis://")) {
    clean = clean.replace(/^redis:\/\//, "rediss://");
  }
  return clean;
}

if (process.env.REDIS_URL) {
  process.env.REDIS_URL = sanitizeRedisUrl(process.env.REDIS_URL);
  console.log("🔒 Sanitized Redis connection URL:", process.env.REDIS_URL.replace(/:[^:@]+@/, ":****@"));
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

async function ensureDatabaseSeeded() {
  if (!process.env.DATABASE_URL) {
    console.log("ℹ️ No DATABASE_URL found, skipping auto-seed.");
    return;
  }

  try {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    let client;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        client = await pool.connect();
        break;
      } catch (err) {
        console.log(`⏳ Waiting for database connection (attempt ${attempt}/5)...`);
        if (attempt === 5) {
          console.error("⚠️ Could not connect to database after 5 attempts:", err.message);
          await pool.end().catch(() => {});
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    try {
      const res = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'booking' AND table_name = 'events'
        );
      `);
      const tableExists = res.rows[0]?.exists;
      if (tableExists) {
        const countRes = await client.query("SELECT COUNT(*) FROM booking.events");
        if (parseInt(countRes.rows[0].count, 10) > 0) {
          console.log(`📦 Database already seeded with ${countRes.rows[0].count} events.`);
          return;
        }
      }

      console.log("🌱 Database unseeded. Running automatic dynamic database seeding...");
      const { execSync } = await import("child_process");
      execSync("npx tsx scripts/seed.ts", {
        stdio: "inherit",
        env: process.env,
      });
      console.log("✅ Automatic database seed finished successfully!");
    } catch (err) {
      console.error("⚠️ Failed to auto-seed database:", err.message);
    } finally {
      if (client) client.release();
      await pool.end().catch(() => {});
    }
  } catch (err) {
    console.error("⚠️ Database check failed:", err.message);
  }
}

async function main() {
  await ensureDatabaseSeeded();

  // Start internal microservices first, then the gateway
  services.forEach((svc, index) => {
    setTimeout(() => {
      console.log(`▶️ Launching service: ${svc.name}...`);
      startService(svc);
    }, index * 800);
  });
}

main().catch((err) => {
  console.error("Failed to start SeatSnap cluster:", err);
  process.exit(1);
});

// Graceful shutdown handling
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("\n🛑 Stopping all services...");
  processes.forEach((p) => p.kill("SIGTERM"));
  setTimeout(() => process.exit(0), 1000);
}
