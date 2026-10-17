const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export interface EventShow {
  id: string;
  event_id: string;
  venue_name: string;
  starts_at: string;
}

export interface EventItem {
  id: string;
  title: string;
  category: string;
  city: string;
  description: string | null;
  shows: EventShow[];
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

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = data?.message || data?.error || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
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
