import { z } from "zod";

export const SignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const HoldSeatsSchema = z.object({
  seatIds: z
    .array(z.string().uuid("Invalid seat ID format"))
    .min(1, "At least one seat must be selected")
    .max(6, "Cannot hold more than 6 seats at once"),
});

export const EventsQuerySchema = z.object({
  city: z.string().optional(),
  category: z.string().optional(),
  q: z.string().optional(),
});

export const ValidateTicketSchema = z.object({
  token: z.string().min(1, "Ticket token is required"),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type HoldSeatsInput = z.infer<typeof HoldSeatsSchema>;
export type EventsQueryInput = z.infer<typeof EventsQuerySchema>;
export type ValidateTicketInput = z.infer<typeof ValidateTicketSchema>;
