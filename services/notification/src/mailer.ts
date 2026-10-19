import nodemailer from "nodemailer";
import { logger } from "@seatsnap/shared";
import { config } from "./config.js";

let transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  if (config.SMTP_HOST && config.SMTP_PORT && config.SMTP_USER && config.SMTP_PASS) {
    // Real SMTP config provided
    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
    });
    logger.info({ host: config.SMTP_HOST }, "Nodemailer configured with real SMTP");
  } else {
    // Fallback: Ethereal test account
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      logger.info(
        { user: testAccount.user, preview: "https://ethereal.email" },
        "Nodemailer configured with Ethereal test account"
      );
    } catch {
      // Fallback to console if Ethereal is unreachable
      logger.warn("Could not create Ethereal account, using console mail fallback");
      transporter = {
        sendMail: async (opts: nodemailer.SendMailOptions) => {
          logger.info({ to: opts.to, subject: opts.subject, text: opts.text }, "[CONSOLE MAIL]");
          return { messageId: `console-${Date.now()}` };
        },
      } as unknown as nodemailer.Transporter;
    }
  }

  return transporter;
}

export async function sendBookingConfirmedEmail(data: {
  userId: string;
  bookingId: string;
  showId: string;
  seatIds: string[];
}): Promise<void> {
  const t = await getTransporter();
  const mailOptions = {
    from: '"SeatSnap" <noreply@seatsnap.dev>',
    to: `user-${data.userId}@example.com`,
    subject: `Your SeatSnap Booking is Confirmed! 🎟️`,
    text: [
      `Your booking has been confirmed.`,
      `Booking ID: ${data.bookingId}`,
      `Show ID: ${data.showId}`,
      `Seats: ${data.seatIds.join(", ")}`,
      ``,
      `View your tickets at: http://localhost:5173/my-bookings`,
    ].join("\n"),
    html: `
      <h2>Booking Confirmed! 🎟️</h2>
      <p><strong>Booking ID:</strong> ${data.bookingId}</p>
      <p><strong>Show ID:</strong> ${data.showId}</p>
      <p><strong>Seats:</strong> ${data.seatIds.join(", ")}</p>
      <p><a href="http://localhost:5173/my-bookings">View your tickets</a></p>
    `,
  };

  const info = await t.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info as Parameters<typeof nodemailer.getTestMessageUrl>[0]);
  logger.info(
    { messageId: info.messageId, preview: previewUrl || "n/a", bookingId: data.bookingId },
    "Booking confirmed email sent"
  );
}

export async function sendBookingExpiredEmail(data: {
  bookingId: string;
}): Promise<void> {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: '"SeatSnap" <noreply@seatsnap.dev>',
    to: `booking-${data.bookingId}@example.com`,
    subject: `Your SeatSnap hold has expired`,
    text: `Your seat hold (Booking ID: ${data.bookingId}) has expired. Seats have been released.`,
  });
  logger.info({ messageId: info.messageId, bookingId: data.bookingId }, "Booking expired email sent");
}
