let rawApiUrl = (import.meta.env.VITE_API_URL || "http://localhost:4000").trim();
if (rawApiUrl && !rawApiUrl.startsWith("http://") && !rawApiUrl.startsWith("https://")) {
  rawApiUrl = `https://${rawApiUrl}`;
}
rawApiUrl = rawApiUrl.replace(/\/+$/, "");
export const API_URL = rawApiUrl;

export interface EventShow {
  id: string;
  event_id: string;
  venue_name: string;
  starts_at: string;
  event_title?: string;
  city?: string;
  category?: string;
  total_seats?: number;
}

export interface EventItem {
  id: string;
  title: string;
  category: string;
  city: string;
  description: string | null;
  shows: EventShow[];
}

export interface SeatItem {
  id: string;
  row: string;
  number: number;
  priceMinor: number;
  status: "AVAILABLE" | "HELD" | "BOOKED";
}

export interface BookingSeat {
  seat_id: string;
  row: string;
  number: number;
  price_minor: number;
  status: "HELD" | "CONFIRMED" | "RELEASED";
}

export interface TicketItem {
  id: string;
  seat_id: string;
  status: "VALID" | "USED";
  row: string;
  number: number;
}

export interface BookingItem {
  id: string;
  user_id: string;
  show_id: string;
  status: "PENDING_PAYMENT" | "CONFIRMED" | "EXPIRED" | "FAILED" | "CANCELLED";
  total_minor: number;
  expires_at: string;
  created_at: string;
  venue_name: string;
  starts_at: string;
  event_title: string;
  seats: BookingSeat[];
  tickets: TicketItem[];
}

export interface HoldResponse {
  bookingId: string;
  expiresAt: string;
  totalMinor: number;
  status: string;
  seatIds: string[];
}

export interface PaymentOrderResponse {
  orderId: string;
  provider: string;
  checkout: Record<string, unknown>;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export function getStoredToken(): string | null {
  return localStorage.getItem("seatsnap_token");
}

export function setStoredToken(token: string): void {
  localStorage.setItem("seatsnap_token", token);
}

export function getStoredUser(): { id: string; email: string; role: string } | null {
  const data = localStorage.getItem("seatsnap_user");
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setStoredUser(user: { id: string; email: string; role: string }): void {
  localStorage.setItem("seatsnap_user", JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem("seatsnap_token");
  localStorage.removeItem("seatsnap_user");
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.message || data?.error || `Request failed with status ${res.status}`;
      const err = new Error(errorMsg) as Error & { code?: string; status?: number };
      err.code = data?.error;
      err.status = res.status;
      throw err;
    }

    return data as T;
  } catch (err: any) {
    if (err.name === "TypeError" && (err.message === "Failed to fetch" || err.message?.includes("fetch"))) {
      console.error(
        `[SeatSnap Network Error] Unable to connect to backend at "${API_URL}${endpoint}". ` +
        `Ensure backend is running and VITE_API_URL is configured.`
      );
    }
    throw err;
  }
}

export const api = {
  getEvents: (filters: { city?: string; category?: string; q?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.city) params.set("city", filters.city);
    if (filters.category) params.set("category", filters.category);
    if (filters.q) params.set("q", filters.q);
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchApi<EventItem[]>(`/api/events${query}`);
  },

  getEvent: (id: string) => {
    return fetchApi<EventItem>(`/api/events/${id}`);
  },

  getShow: (showId: string) => {
    return fetchApi<EventShow>(`/api/shows/${showId}`);
  },

  getSeats: (showId: string) => {
    return fetchApi<SeatItem[]>(`/api/shows/${showId}/seats`);
  },

  holdSeats: (showId: string, seatIds: string[], idempotencyKey: string) => {
    return fetchApi<HoldResponse>(`/api/shows/${showId}/hold`, {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ seatIds }),
    });
  },

  payBooking: (bookingId: string) => {
    return fetchApi<PaymentOrderResponse>(`/api/bookings/${bookingId}/pay`, {
      method: "POST",
    });
  },

  completeMockPayment: (orderId: string) => {
    return fetchApi<{ received: boolean; status?: string; message?: string }>(
      `/api/payments/mock/${orderId}/complete`,
      {
        method: "POST",
      }
    );
  },

  getBooking: (bookingId: string) => {
    return fetchApi<BookingItem>(`/api/bookings/${bookingId}`);
  },

  getMyBookings: () => {
    return fetchApi<BookingItem[]>("/api/me/bookings");
  },

  getTicketQrUrl: (ticketId: string) => {
    return `${API_URL}/api/tickets/${ticketId}/qr`;
  },

  validateTicket: (token: string) => {
    return fetchApi<{ valid: boolean; ticketId?: string; checkedInAt?: string; reason?: string }>(
      "/api/tickets/validate",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      }
    );
  },

  signup: (body: { email: string; password: string }) => {
    return fetchApi<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  login: (body: { email: string; password: string }) => {
    return fetchApi<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
