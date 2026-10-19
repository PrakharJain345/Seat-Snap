import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Ticket,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  QrCode,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api, BookingItem, getStoredUser } from "../api";

export const MyBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  const { data: bookings, isLoading, error } = useQuery<BookingItem[]>({
    queryKey: ["my-bookings"],
    queryFn: () => api.getMyBookings(),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4">
          <Ticket className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Login to View Bookings</h2>
        <p className="text-slate-400 text-sm mt-2 mb-6">
          You must be signed in to see your ticket reservations and QR codes.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-colors"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-4 animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/4" />
        <div className="h-32 bg-slate-900 rounded-3xl border border-slate-800" />
        <div className="h-32 bg-slate-900 rounded-3xl border border-slate-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">Failed to Load Bookings</h2>
        <p className="text-sm text-slate-400 mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <Ticket className="w-7 h-7 text-purple-400" />
            <span>My Bookings</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Access your confirmed tickets, digital passes, and HMAC-signed QR codes
          </p>
        </div>
        <Link
          to="/"
          className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
        >
          <span>Find more shows</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Bookings List */}
      {!bookings || bookings.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center backdrop-blur-xl">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white">No Bookings Yet</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto mb-6">
            You haven't reserved any tickets yet. Explore upcoming concerts, plays, and comedy shows!
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-colors"
          >
            <span>Browse Events</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => {
            const isConfirmed = booking.status === "CONFIRMED";
            const isPending = booking.status === "PENDING_PAYMENT";
            const isExpired = booking.status === "EXPIRED";
            const isExpanded = expandedBookingId === booking.id || isConfirmed;

            return (
              <div
                key={booking.id}
                className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl shadow-xl transition-all"
              >
                {/* Booking summary header */}
                <div className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span
                        className={`text-[11px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase border ${
                          isConfirmed
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : isPending
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : isExpired
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {booking.status}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        #{booking.id.slice(0, 8)}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-white hover:text-purple-300 transition-colors">
                      {booking.event_title || "Reserved Event"}
                    </h2>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {booking.venue_name}
                      </span>
                      {booking.starts_at && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-purple-400" />
                          {new Date(booking.starts_at).toLocaleString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800/80">
                    <span className="text-xs text-slate-400">Total Amount</span>
                    <span className="text-xl font-extrabold text-white">
                      ₹{(booking.total_minor / 100).toFixed(2)}
                    </span>
                    {booking.seats?.length > 0 && (
                      <span className="text-xs text-purple-400 mt-0.5">
                        {booking.seats.length} Seat{booking.seats.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Collapsible / Detailed Tickets Section */}
                <div className="p-6 bg-slate-950/40">
                  {/* Seats overview pills */}
                  {booking.seats && booking.seats.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                      <span className="text-xs font-semibold text-slate-400 mr-2">Seats:</span>
                      {booking.seats.map((seat, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-xs font-mono font-bold text-slate-200"
                        >
                          Row {seat.row} - #{seat.number}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Confirmed Tickets with QR Codes */}
                  {isConfirmed && booking.tickets && booking.tickets.length > 0 ? (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-4 flex items-center gap-1.5">
                        <QrCode className="w-4 h-4" />
                        <span>Digital Tickets & QR Verification Passes</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {booking.tickets.map((ticket) => {
                          const qrUrl = api.getTicketQrUrl(ticket.id);

                          return (
                            <div
                              key={ticket.id}
                              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 group hover:border-purple-500/40 transition-all shadow-inner"
                            >
                              {/* QR Image */}
                              <div className="relative w-24 h-24 bg-white rounded-xl p-1.5 shrink-0 shadow-md">
                                <img
                                  src={qrUrl}
                                  alt={`Ticket QR for ${ticket.row}${ticket.number}`}
                                  className="w-full h-full object-contain"
                                  loading="lazy"
                                />
                              </div>

                              {/* Ticket info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    {ticket.status}
                                  </span>
                                </div>
                                <h4 className="text-base font-extrabold text-white">
                                  Seat {ticket.row}
                                  {ticket.number}
                                </h4>
                                <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                                  ID: {ticket.id}
                                </p>

                                <a
                                  href={qrUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 mt-2 font-medium"
                                >
                                  <span>Open Full QR</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : isPending ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-amber-400 mb-2">
                        This booking is pending payment. If your hold is still active, you can complete payment now.
                      </p>
                      <Link
                        to={`/shows/${booking.show_id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Return to Seat Map
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
