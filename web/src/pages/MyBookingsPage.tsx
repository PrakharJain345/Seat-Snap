import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Ticket,
  MapPin,
  Clock,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { api, BookingItem, getStoredUser } from "../api";
import { TicketPass3D } from "../components/TicketPass3D";

export const MyBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getStoredUser();

  const { data: bookings, isLoading, error } = useQuery<BookingItem[]>({
    queryKey: ["my-bookings"],
    queryFn: () => api.getMyBookings(),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-surface-900 border border-slate-800 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <Ticket className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white font-display">Sign In to View Tickets</h2>
        <p className="text-slate-400 text-xs mt-1.5 mb-6">
          Access your confirmed ticket reservations and digital entry passes.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs rounded-xl shadow-md transition-colors"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-4 animate-pulse">
        <div className="h-8 bg-surface-900 rounded-xl w-1/4" />
        <div className="h-44 bg-surface-900/60 rounded-2xl border border-slate-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">Failed to Load Tickets</h2>
        <p className="text-xs text-slate-400 mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5 font-display">
            <Ticket className="w-7 h-7 text-amber-400" />
            <span>My Bookings</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Confirmed tickets and digital entry passes
          </p>
        </div>
        <Link
          to="/"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
        >
          <span>Browse More Shows</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Bookings List */}
      {!bookings || bookings.length === 0 ? (
        <div className="rounded-2xl p-12 text-center bg-surface-900 border border-slate-800">
          <Ticket className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Tickets Found</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto mb-5">
            You don't have any reserved tickets yet. Explore upcoming concerts and shows!
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs rounded-xl shadow-md transition-colors"
          >
            <span>Browse Shows</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {bookings.map((booking) => {
            const isConfirmed = booking.status === "CONFIRMED";
            const isPending = booking.status === "PENDING_PAYMENT";
            const isExpired = booking.status === "EXPIRED";

            return (
              <div
                key={booking.id}
                className="rounded-2xl bg-surface-900 border border-slate-800 overflow-hidden shadow-lg"
              >
                {/* Summary bar */}
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase border ${
                          isConfirmed
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : isPending
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : isExpired
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : "bg-surface-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {booking.status}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        #{booking.id.slice(0, 8)}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-white font-display">
                      {booking.event_title || "Live Event"}
                    </h2>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-1.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        {booking.venue_name}
                      </span>
                      {booking.starts_at && (
                        <span className="flex items-center gap-1.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
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

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                    <span className="text-xs text-slate-400">Total</span>
                    <span className="text-xl font-extrabold text-white font-mono">
                      ₹{(booking.total_minor / 100).toFixed(2)}
                    </span>
                    {booking.seats?.length > 0 && (
                      <span className="text-xs text-amber-400 font-semibold mt-0.5">
                        {booking.seats.length} Seat{booking.seats.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3D Tickets Display Grid */}
                <div className="p-6 bg-surface-950/60">
                  {isConfirmed && booking.tickets && booking.tickets.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {booking.tickets.map((ticket) => (
                        <TicketPass3D
                          key={ticket.id}
                          booking={booking}
                          ticket={ticket}
                        />
                      ))}
                    </div>
                  ) : (
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400 mr-1">Seats:</span>
                        {booking.seats?.map((seat, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-surface-900 border border-slate-800 text-xs font-mono font-bold text-slate-200"
                          >
                            Row {seat.row} - #{seat.number}
                          </span>
                        ))}
                      </div>
                      {isPending && (
                        <div className="mt-4">
                          <Link
                            to={`/shows/${booking.show_id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 text-black font-bold text-xs rounded-xl shadow-sm"
                          >
                            Complete Payment Now &rarr;
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
