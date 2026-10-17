export type UserRole = "customer" | "admin";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export interface Event {
  id: string;
  title: string;
  category: string;
  city: string;
  description: string | null;
  shows?: Show[];
}

export interface Show {
  id: string;
  event_id: string;
  venue_name: string;
  starts_at: string;
}

export interface Seat {
  id: string;
  show_id: string;
  row_label: string;
  seat_number: number;
  price_minor: number;
}

export type SeatStatus = "AVAILABLE" | "HELD" | "BOOKED";

export interface SeatWithStatus {
  id: string;
  row: string;
  number: number;
  priceMinor: number;
  status: SeatStatus;
}

export type BookingStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "EXPIRED"
  | "FAILED"
  | "CANCELLED";

export type BookingSeatStatus = "HELD" | "CONFIRMED" | "RELEASED";

export interface Booking {
  id: string;
  user_id: string;
  show_id: string;
  status: BookingStatus;
  total_minor: number;
  idempotency_key: string;
  expires_at: string;
  created_at: string;
}

export type PaymentStatus =
  | "CREATED"
  | "PAID"
  | "FAILED"
  | "REFUND_REQUESTED";

export interface Payment {
  id: string;
  booking_id: string;
  provider: string;
  provider_order_id: string;
  amount_minor: number;
  status: PaymentStatus;
  created_at: string;
}

export type TicketStatus = "VALID" | "USED";

export interface Ticket {
  id: string;
  booking_id: string;
  seat_id: string;
  status: TicketStatus;
  checked_in_at: string | null;
}
