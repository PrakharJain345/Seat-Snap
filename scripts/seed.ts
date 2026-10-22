import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const databaseUrl =
  process.env.DATABASE_URL || "postgres://seatsnap:seatsnap@localhost:5433/seatsnap";

const pool = new Pool({
  connectionString: databaseUrl,
});

// Helper to generate dynamic future dates relative to execution time
function getFutureDate(daysFromNow: number, hour: number = 19, minute: number = 30): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function seed() {
  console.log("🌱 Starting database seeding with dynamic upcoming shows...");
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
    console.log("Seeding verified users...");
    const adminPasswordHash = await bcrypt.hash("AdminPassword123!", 10);
    const customerPasswordHash = await bcrypt.hash("CustomerPassword123!", 10);

    await client.query(
      `INSERT INTO auth.users (email, password_hash, role)
       VALUES
        ('admin@seatsnap.com', $1, 'admin'),
        ('customer@seatsnap.com', $2, 'customer');`,
      [adminPasswordHash, customerPasswordHash]
    );

    // 4. Seed Comprehensive Events with Dynamic Upcoming Show Dates
    console.log("Seeding events across Music, Comedy, Movies & Theatre with dynamic upcoming dates...");
    const eventsData = [
      // --- MUSIC ---
      {
        title: "Coldplay: Music of the Spheres",
        category: "Music",
        city: "Mumbai",
        description: "World Tour 2026 - Stadium Live concert with synchronized lightbands, pyrotechnics, and immersive soundscapes.",
        shows: [
          { venue: "DY Patil Stadium - Opening Night", date: getFutureDate(0, 19, 30) }, // Tonight
          { venue: "DY Patil Stadium - Weekend Gala", date: getFutureDate(3, 20, 0) },   // This Saturday
          { venue: "DY Patil Stadium - Tour Finale", date: getFutureDate(4, 19, 0) },   // This Sunday
        ],
      },
      {
        title: "Arijit Singh Symphony Live",
        category: "Music",
        city: "Bengaluru",
        description: "An unforgettable evening of soulful melodies backed by a 45-piece live acoustic grand orchestra.",
        shows: [
          { venue: "Manpho Convention Center", date: getFutureDate(1, 19, 0) },         // Tomorrow
          { venue: "Kanteerava Indoor Stadium", date: getFutureDate(2, 20, 0) },        // Friday
        ],
      },
      {
        title: "Diljit Dosanjh: Dil-Luminati Tour",
        category: "Music",
        city: "Delhi",
        description: "The blockbuster global Punjabi music tour packed with high-octane energy, bhangra beats, and stadium lasers.",
        shows: [
          { venue: "Jawaharlal Nehru Stadium - Day 1", date: getFutureDate(2, 19, 30) },
          { venue: "Jawaharlal Nehru Stadium - Day 2", date: getFutureDate(3, 20, 0) },
        ],
      },
      {
        title: "Sunburn Electronic Arena: Martin Garrix",
        category: "Music",
        city: "Mumbai",
        description: "Massive EDM festival stage featuring world #1 DJ with synchronized laser arrays and immersive LED screens.",
        shows: [
          { venue: "Jio World Garden - Sunset Stage", date: getFutureDate(3, 18, 0) },
          { venue: "Jio World Garden - Laser Arena", date: getFutureDate(4, 19, 0) },
        ],
      },
      {
        title: "Anuv Jain: Guldasta Tour Live",
        category: "Music",
        city: "Bengaluru",
        description: "Intimate indie acoustic melodies featuring viral acoustic hits Husn, Baarishein, and Alag Aasmaan.",
        shows: [
          { venue: "Jayamahal Palace Ground", date: getFutureDate(8, 19, 30) },
          { venue: "Chowdiah Memorial Hall", date: getFutureDate(9, 20, 0) },
        ],
      },

      // --- COMEDY ---
      {
        title: "Zakir Khan - Tathastu Standup Special",
        category: "Comedy",
        city: "Delhi",
        description: "The iconic storyteller returns with rib-tickling humor, poetic musings, and heartfelt family stories.",
        shows: [
          { venue: "Sirifort Auditorium - Evening", date: getFutureDate(0, 20, 0) },   // Tonight
          { venue: "Sirifort Auditorium - Late Night", date: getFutureDate(1, 21, 30) },// Tomorrow
          { venue: "Sirifort Auditorium - Weekend Special", date: getFutureDate(4, 18, 30) },
        ],
      },
      {
        title: "Anubhav Singh Bassi: Kisi Ko Batana Mat",
        category: "Comedy",
        city: "Mumbai",
        description: "All-new hilarious standup special filled with nostalgic anecdotes, college memories, and effortless delivery.",
        shows: [
          { venue: "NCPA Tata Theatre", date: getFutureDate(1, 20, 0) },
          { venue: "St. Andrew's Auditorium", date: getFutureDate(2, 19, 30) },
        ],
      },
      {
        title: "Samay Raina: Unfiltered & Live",
        category: "Comedy",
        city: "Bengaluru",
        description: "Raw, spontaneous, and unapologetic dark comedy and crowd interactions from the king of chess comedy.",
        shows: [
          { venue: "Good Shepherd Auditorium", date: getFutureDate(3, 20, 0) },
          { venue: "MLR Convention Centre", date: getFutureDate(4, 19, 0) },
        ],
      },

      // --- MOVIES ---
      {
        title: "Interstellar 10th Anniversary IMAX 70mm",
        category: "Movies",
        city: "Mumbai",
        description: "Experience Christopher Nolan's sci-fi epic remastered for IMAX 70mm screens with visceral Hans Zimmer organ acoustics.",
        shows: [
          { venue: "PVR INOX Lower Parel IMAX", date: getFutureDate(0, 21, 45) }, // Tonight
          { venue: "PVR ICON Versova IMAX - Matinee", date: getFutureDate(1, 18, 0) },
          { venue: "PVR ICON Versova IMAX - Late Night", date: getFutureDate(1, 22, 15) },
        ],
      },
      {
        title: "Dune: Part Two Ultimate IMAX Experience",
        category: "Movies",
        city: "Delhi",
        description: "Denis Villeneuve's cinematic triumph on giant 1.43:1 dual-laser IMAX screen with earth-shaking rumble seats.",
        shows: [
          { venue: "PVR Select Citywalk IMAX", date: getFutureDate(1, 19, 0) },
          { venue: "PVR Priya Vasant Vihar IMAX", date: getFutureDate(2, 21, 15) },
        ],
      },
      {
        title: "The Dark Knight Trilogy: IMAX All-Nighter",
        category: "Movies",
        city: "Bengaluru",
        description: "Back-to-back 70mm screenings of Batman Begins, The Dark Knight, and The Dark Knight Rises.",
        shows: [
          { venue: "PVR Vega City IMAX", date: getFutureDate(3, 22, 30) },
          { venue: "PVR Koramangala IMAX", date: getFutureDate(10, 22, 30) },
        ],
      },

      // --- THEATRE ---
      {
        title: "Hamilton: An American Musical",
        category: "Theatre",
        city: "Bengaluru",
        description: "The 11-time Tony and Pulitzer-winning Broadway revolution blending hip-hop, jazz, R&B, and American history.",
        shows: [
          { venue: "Ranga Shankara Theatre", date: getFutureDate(1, 19, 30) },
          { venue: "Chowdiah Memorial Hall - Matinee", date: getFutureDate(3, 15, 30) },
          { venue: "Chowdiah Memorial Hall - Evening", date: getFutureDate(3, 20, 0) },
        ],
      },
      {
        title: "Mughal-e-Azam: The Grand Musical",
        category: "Theatre",
        city: "Mumbai",
        description: "India's biggest Broadway-scale theatrical musical with 350-member cast, Manish Malhotra costumes, and live Kathak.",
        shows: [
          { venue: "NMACC The Grand Theatre", date: getFutureDate(2, 19, 30) },
          { venue: "NMACC The Grand Theatre", date: getFutureDate(3, 20, 0) },
          { venue: "NMACC The Grand Theatre - Matinee", date: getFutureDate(4, 16, 0) },
        ],
      },
      {
        title: "The Phantom of the Opera: West End Tour",
        category: "Theatre",
        city: "Delhi",
        description: "Andrew Lloyd Webber's timeless musical featuring the chandelier drop, soaring gothic ballads, and lavish sets.",
        shows: [
          { venue: "Siri Fort Auditorium - Opening", date: getFutureDate(7, 20, 0) },
          { venue: "Siri Fort Auditorium - Gala", date: getFutureDate(8, 19, 30) },
        ],
      },
    ];

    const rowsLabels10 = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    let totalSeatsSeeded = 0;
    let totalShowsSeeded = 0;

    for (const ev of eventsData) {
      const eventRes = await client.query(
        `INSERT INTO booking.events (title, category, city, description)
         VALUES ($1, $2, $3, $4)
         RETURNING id;`,
        [ev.title, ev.category, ev.city, ev.description]
      );
      const eventId = eventRes.rows[0].id;

      // Seed each show for the event
      for (const showItem of ev.shows) {
        const showRes = await client.query(
          `INSERT INTO booking.shows (event_id, venue_name, starts_at)
           VALUES ($1, $2, $3)
           RETURNING id;`,
          [eventId, showItem.venue, showItem.date.toISOString()]
        );
        const showId = showRes.rows[0].id;
        totalShowsSeeded++;

        // 10x10 seat grid (100 seats per show)
        const seatValues: string[] = [];
        for (const row of rowsLabels10) {
          for (let num = 1; num <= 10; num++) {
            // Price: Row A-C 60000 paise (VIP), D-G 40000 paise (Premium), H-J 25000 paise (Standard)
            let price = 25000;
            if (["A", "B", "C"].includes(row)) price = 60000;
            else if (["D", "E", "F", "G"].includes(row)) price = 40000;

            seatValues.push(`('${showId}', '${row}', ${num}, ${price})`);
            totalSeatsSeeded++;
          }
        }

        await client.query(`
          INSERT INTO booking.seats (show_id, row_label, seat_number, price_minor)
          VALUES ${seatValues.join(", ")};
        `);
      }
    }

    // 5. Seed "Hot Show" (20 x 20 grid = 400 seats) for concurrency & load testing
    console.log("Seeding 'Hot Show' 400-seat arena for load testing...");
    const hotEventRes = await client.query(
      `INSERT INTO booking.events (title, category, city, description)
       VALUES ('Hot Show Arena Experience', 'Music', 'Mumbai', 'High-concurrency load testing event with 400 interactive reserved seats.')
       RETURNING id;`
    );
    const hotEventId = hotEventRes.rows[0].id;

    const hotStartsAt = getFutureDate(1, 20, 0); // Tomorrow 8:00 PM
    const hotShowRes = await client.query(
      `INSERT INTO booking.shows (event_id, venue_name, starts_at)
       VALUES ($1, 'Hot Show Mega Arena', $2)
       RETURNING id;`,
      [hotEventId, hotStartsAt.toISOString()]
    );
    const hotShowId = hotShowRes.rows[0].id;
    totalShowsSeeded++;

    const rowsLabels20 = [
      "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
      "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
    ];

    const hotSeatValues: string[] = [];
    for (const row of rowsLabels20) {
      for (let num = 1; num <= 20; num++) {
        let price = 30000;
        if (["A", "B", "C", "D", "E"].includes(row)) price = 75000;
        else if (["F", "G", "H", "I", "J", "K", "L"].includes(row)) price = 50000;

        hotSeatValues.push(`('${hotShowId}', '${row}', ${num}, ${price})`);
        totalSeatsSeeded++;
      }
    }

    await client.query(`
      INSERT INTO booking.seats (show_id, row_label, seat_number, price_minor)
      VALUES ${hotSeatValues.join(", ")};
    `);

    await client.query("COMMIT;");
    console.log("✅ Seeding completed successfully!");
    console.log(` - ${eventsData.length + 1} Events seeded`);
    console.log(` - ${totalShowsSeeded} Upcoming Shows seeded (dynamically scheduled from Tonight onwards)`);
    console.log(` - ${totalSeatsSeeded} Interactive Seats seeded`);
    console.log(" - Verified Admin & Customer credentials created");
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
