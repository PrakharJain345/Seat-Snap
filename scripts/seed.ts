import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const databaseUrl =
  process.env.DATABASE_URL || "postgres://seatsnap:seatsnap@localhost:5432/seatsnap";

const pool = new Pool({
  connectionString: databaseUrl,
});

async function seed() {
  console.log("🌱 Starting database seeding...");
  const client = await pool.connect();

  try {
    // 1. Ensure schemas and tables exist
    console.log("Checking database schemas and tables...");
    await client.query("CREATE SCHEMA IF NOT EXISTS auth;");
    await client.query("CREATE SCHEMA IF NOT EXISTS booking;");
    await client.query("CREATE SCHEMA IF NOT EXISTS payment;");

    await client.query(`
      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text UNIQUE NOT NULL,
        password_hash text NOT NULL,
        role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS booking.events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL,
        category text NOT NULL,
        city text NOT NULL,
        description text
      );

      CREATE TABLE IF NOT EXISTS booking.shows (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL REFERENCES booking.events(id),
        venue_name text NOT NULL,
        starts_at timestamptz NOT NULL
      );

      CREATE TABLE IF NOT EXISTS booking.seats (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        show_id uuid NOT NULL REFERENCES booking.shows(id),
        row_label text NOT NULL,
        seat_number int NOT NULL,
        price_minor int NOT NULL CHECK (price_minor > 0),
        UNIQUE (show_id, row_label, seat_number)
      );

      CREATE TABLE IF NOT EXISTS booking.bookings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        show_id uuid NOT NULL REFERENCES booking.shows(id),
        status text NOT NULL CHECK (status IN ('PENDING_PAYMENT','CONFIRMED','EXPIRED','FAILED','CANCELLED')),
        total_minor int NOT NULL,
        idempotency_key text NOT NULL,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (user_id, idempotency_key)
      );

      CREATE TABLE IF NOT EXISTS booking.booking_seats (
        booking_id uuid NOT NULL REFERENCES booking.bookings(id),
        show_id uuid NOT NULL,
        seat_id uuid NOT NULL REFERENCES booking.seats(id),
        status text NOT NULL CHECK (status IN ('HELD','CONFIRMED','RELEASED')),
        PRIMARY KEY (booking_id, seat_id)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS uq_active_seat ON booking.booking_seats (show_id, seat_id)
        WHERE status IN ('HELD','CONFIRMED');

      CREATE TABLE IF NOT EXISTS booking.tickets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id uuid NOT NULL REFERENCES booking.bookings(id),
        seat_id uuid NOT NULL,
        status text NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID','USED')),
        checked_in_at timestamptz
      );

      CREATE TABLE IF NOT EXISTS payment.payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id uuid NOT NULL UNIQUE,
        provider text NOT NULL,
        provider_order_id text NOT NULL,
        amount_minor int NOT NULL,
        status text NOT NULL CHECK (status IN ('CREATED','PAID','FAILED','REFUND_REQUESTED')),
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS payment.webhook_events (
        provider_event_id text PRIMARY KEY,
        type text NOT NULL,
        processed_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // 2. Clean existing seed data
    console.log("Cleaning previous seed data...");
    await client.query("BEGIN;");
    await client.query("DELETE FROM booking.tickets;");
    await client.query("DELETE FROM booking.booking_seats;");
    await client.query("DELETE FROM booking.bookings;");
    await client.query("DELETE FROM booking.seats;");
    await client.query("DELETE FROM booking.shows;");
    await client.query("DELETE FROM booking.events;");
    await client.query("DELETE FROM auth.users WHERE email IN ('admin@seatsnap.com', 'customer@seatsnap.com');");

    // 3. Seed Users
    console.log("Seeding users...");
    const adminPasswordHash = await bcrypt.hash("AdminPassword123!", 10);
    const customerPasswordHash = await bcrypt.hash("CustomerPassword123!", 10);

    await client.query(
      `INSERT INTO auth.users (email, password_hash, role)
       VALUES
        ('admin@seatsnap.com', $1, 'admin'),
        ('customer@seatsnap.com', $2, 'customer');`,
      [adminPasswordHash, customerPasswordHash]
    );

    // 4. Seed 5 Regular Events
    console.log("Seeding 5 regular events and 1 load test event...");
    const eventsData = [
      {
        title: "Coldplay: Music of the Spheres",
        category: "Music",
        city: "Mumbai",
        description: "World Tour 2026 - Stadium Live concert with synchronized lightbands and immersive acoustics.",
        venues: ["DY Patil Stadium - Show 1", "DY Patil Stadium - Show 2"],
      },
      {
        title: "Arijit Singh Symphony Live",
        category: "Music",
        city: "Bengaluru",
        description: "An unforgettable evening of soulful melodies and orchestral arrangements.",
        venues: ["Manpho Convention Center", "Kanteerava Indoor Stadium"],
      },
      {
        title: "Zakir Khan - Tathastu Standup Special",
        category: "Comedy",
        city: "Delhi",
        description: "The iconic storyteller returns with rib-tickling humor and heartfelt musings.",
        venues: ["Sirifort Auditorium - Evening", "Sirifort Auditorium - Late Night"],
      },
      {
        title: "Interstellar 10th Anniversary IMAX Screening",
        category: "Movies",
        city: "Mumbai",
        description: "Experience Christopher Nolan's sci-fi masterpiece remastered for IMAX 70mm screens.",
        venues: ["PVR INOX Lower Parel IMAX", "PVR ICON Versova IMAX"],
      },
      {
        title: "Hamilton: An American Musical",
        category: "Theatre",
        city: "Bengaluru",
        description: "The Pulitzer-winning Broadway revolution blending hip-hop, jazz, R&B and history.",
        venues: ["Ranga Shankara Theatre", "Chowdiah Memorial Hall"],
      },
    ];

    const rowsLabels10 = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

    for (const ev of eventsData) {
      const eventRes = await client.query(
        `INSERT INTO booking.events (title, category, city, description)
         VALUES ($1, $2, $3, $4)
         RETURNING id;`,
        [ev.title, ev.category, ev.city, ev.description]
      );
      const eventId = eventRes.rows[0].id;

      // 2 shows per event
      for (let sIdx = 0; sIdx < ev.venues.length; sIdx++) {
        const startsAt = new Date(Date.now() + (sIdx + 1) * 86400000); // 1 or 2 days in the future
        const showRes = await client.query(
          `INSERT INTO booking.shows (event_id, venue_name, starts_at)
           VALUES ($1, $2, $3)
           RETURNING id;`,
          [eventId, ev.venues[sIdx], startsAt.toISOString()]
        );
        const showId = showRes.rows[0].id;

        // 10x10 seat grid (100 seats per show)
        const seatValues: string[] = [];
        for (const row of rowsLabels10) {
          for (let num = 1; num <= 10; num++) {
            // Price: Row A-C 60000 paise, D-G 40000 paise, H-J 25000 paise
            let price = 25000;
            if (["A", "B", "C"].includes(row)) price = 60000;
            else if (["D", "E", "F", "G"].includes(row)) price = 40000;

            seatValues.push(`('${showId}', '${row}', ${num}, ${price})`);
          }
        }

        await client.query(`
          INSERT INTO booking.seats (show_id, row_label, seat_number, price_minor)
          VALUES ${seatValues.join(", ")};
        `);
      }
    }

    // 5. Seed "Hot Show" (20 x 20 grid = 400 seats) for concurrency & load testing
    console.log("Seeding 'Hot Show' 20x20 seat grid for load testing...");
    const hotEventRes = await client.query(
      `INSERT INTO booking.events (title, category, city, description)
       VALUES ('Hot Show', 'Music', 'Mumbai', 'High-concurrency load testing event for 400 reserved seats.')
       RETURNING id;`
    );
    const hotEventId = hotEventRes.rows[0].id;

    const hotStartsAt = new Date(Date.now() + 3 * 86400000);
    const hotShowRes = await client.query(
      `INSERT INTO booking.shows (event_id, venue_name, starts_at)
       VALUES ($1, 'Hot Show Arena', $2)
       RETURNING id;`,
      [hotEventId, hotStartsAt.toISOString()]
    );
    const hotShowId = hotShowRes.rows[0].id;

    const rowsLabels20 = [
      "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
      "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
    ];

    const hotSeatValues: string[] = [];
    for (const row of rowsLabels20) {
      for (let num = 1; num <= 20; num++) {
        hotSeatValues.push(`('${hotShowId}', '${row}', ${num}, 40000)`);
      }
    }

    await client.query(`
      INSERT INTO booking.seats (show_id, row_label, seat_number, price_minor)
      VALUES ${hotSeatValues.join(", ")};
    `);

    await client.query("COMMIT;");
    console.log("✅ Seeding completed successfully!");
    console.log("Created:");
    console.log(" - 1 Admin (admin@seatsnap.com / AdminPassword123!)");
    console.log(" - 1 Customer (customer@seatsnap.com / CustomerPassword123!)");
    console.log(" - 5 regular events (2 shows each, 100 seats per show)");
    console.log(" - 1 'Hot Show' event (1 show, 400 seats in 20x20 grid)");
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
