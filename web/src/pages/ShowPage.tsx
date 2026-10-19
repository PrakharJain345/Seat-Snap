import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Check,
  Sparkles,
  RefreshCw,
  Ticket,
} from "lucide-react";
import {
  api,
  SeatItem,
  HoldResponse,
  getStoredUser,
} from "../api";

export const ShowPage: React.FC = () => {
  const { id: showId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = getStoredUser();

  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [activeHold, setActiveHold] = useState<HoldResponse | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "paying" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch Show Details
  const { data: show, isLoading: isShowLoading } = useQuery({
    queryKey: ["show", showId],
    queryFn: () => api.getShow(showId!),
    enabled: !!showId,
  });

  // 2. Fetch Seats with 3-second live polling (PRD requirement)
  const {
    data: seats,
    isLoading: isSeatsLoading,
    isRefetching: isSeatsRefetching,
  } = useQuery<SeatItem[]>({
    queryKey: ["seats", showId],
    queryFn: () => api.getSeats(showId!),
    enabled: !!showId,
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // Organize seats by row
  const rowsMap = useMemo(() => {
    if (!seats) return new Map<string, SeatItem[]>();
    const map = new Map<string, SeatItem[]>();
    for (const seat of seats) {
      if (!map.has(seat.row)) {
        map.set(seat.row, []);
      }
      map.get(seat.row)!.push(seat);
    }
    // Sort seats in each row by seat number
    for (const [, list] of map.entries()) {
      list.sort((a, b) => a.number - b.number);
    }
    return map;
  }, [seats]);

  // Sorted list of row keys
  const sortedRows = useMemo(() => {
    return Array.from(rowsMap.keys()).sort();
  }, [rowsMap]);

  // Calculate selected seats total price
  const selectedSeatsData = useMemo(() => {
    if (!seats) return [];
    return seats.filter((s) => selectedSeatIds.includes(s.id));
  }, [seats, selectedSeatIds]);

  const totalPriceMinor = useMemo(() => {
    return selectedSeatsData.reduce((sum, s) => sum + s.priceMinor, 0);
  }, [selectedSeatsData]);

  // Hold Countdown Timer Effect
  useEffect(() => {
    if (!activeHold?.expiresAt) {
      setSecondsRemaining(null);
      return;
    }

    const targetTime = new Date(activeHold.expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((targetTime - now) / 1000));
      setSecondsRemaining(diff);

      if (diff === 0) {
        setErrorMessage("Your 5-minute hold has expired. The seats have been released.");
        setActiveHold(null);
        setSelectedSeatIds([]);
        queryClient.invalidateQueries({ queryKey: ["seats", showId] });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeHold, showId, queryClient]);

  // Toggle seat selection
  const handleToggleSeat = (seat: SeatItem) => {
    if (activeHold) return; // Cannot modify selection while an active hold exists
    if (seat.status !== "AVAILABLE") return;

    setErrorMessage(null);

    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      }
      if (prev.length >= 6) {
        setErrorMessage("You can hold up to 6 seats per transaction.");
        return prev;
      }
      return [...prev, seat.id];
    });
  };

  // Hold Mutation
  const holdMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate("/login");
        throw new Error("Please log in to hold seats");
      }
      const idempotencyKey = crypto.randomUUID();
      return api.holdSeats(showId!, selectedSeatIds, idempotencyKey);
    },
    onSuccess: (data) => {
      setActiveHold(data);
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ["seats", showId] });
    },
    onError: (err: any) => {
      const msg = err.message || "Failed to hold seats. Someone may have just held them.";
      setErrorMessage(msg);
      queryClient.invalidateQueries({ queryKey: ["seats", showId] });
    },
  });

  // Mock Payment Mutation
  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!activeHold) throw new Error("No active hold found");
      setPaymentStatus("paying");

      // 1. Create order
      const orderData = await api.payBooking(activeHold.bookingId);

      // 2. Complete mock payment (simulates Razorpay / provider webhook)
      await api.completeMockPayment(orderData.orderId);

      // 3. Wait a moment for the BullMQ worker to process payment.succeeded
      await new Promise((res) => setTimeout(res, 1200));

      return activeHold.bookingId;
    },
    onSuccess: () => {
      setPaymentStatus("success");
      queryClient.invalidateQueries({ queryKey: ["seats", showId] });
    },
    onError: (err: any) => {
      setPaymentStatus("error");
      setErrorMessage(err.message || "Payment processing failed");
    },
  });

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (isShowLoading || isSeatsLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/3 mx-auto mb-4" />
        <div className="h-4 bg-slate-800 rounded w-1/4 mx-auto mb-12" />
        <div className="h-96 bg-slate-900/50 rounded-3xl border border-slate-800/80" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header & Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link
            to={show?.event_id ? `/events/${show.event_id}` : "/"}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Event</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <span>{show?.event_title || "Reserved Seating"}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono font-medium">
              Live Map
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span className="font-semibold text-slate-300">{show?.venue_name}</span>
            <span>•</span>
            <span>
              {show?.starts_at
                ? new Date(show.starts_at).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </span>
          </p>
        </div>

        {/* Polling indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-400 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-full backdrop-blur-md">
          <RefreshCw
            className={`w-3.5 h-3.5 text-emerald-400 ${
              isSeatsRefetching ? "animate-spin text-purple-400" : ""
            }`}
          />
          <span>Live 3s Polling</span>
        </div>
      </div>

      {/* Error / Warning Alert */}
      {errorMessage && (
        <div className="mb-6 bg-red-950/40 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3 text-red-200 text-sm animate-fade-in shadow-lg">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-200 text-xs font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Hold Banner with Animated Countdown */}
      {activeHold && secondsRemaining !== null && paymentStatus !== "success" && (
        <div className="mb-8 bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900/60 border border-purple-500/40 rounded-3xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Seats Held Exclusively for You</span>
              </div>
              <h2 className="text-lg font-bold text-white">Complete payment before your hold expires</h2>
              <p className="text-xs text-slate-400 mt-1">
                Booking ID: <span className="font-mono text-slate-300">{activeHold.bookingId.slice(0, 8)}...</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Countdown circle/box */}
              <div
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border font-mono font-bold text-lg shadow-inner ${
                  secondsRemaining < 60
                    ? "bg-red-950/70 border-red-500/50 text-red-400 animate-pulse"
                    : "bg-slate-950/80 border-purple-500/30 text-purple-300"
                }`}
              >
                <Clock className="w-5 h-5" />
                <span>{formatTime(secondsRemaining)}</span>
              </div>

              {/* Pay Now Button */}
              <button
                id="mock-pay-btn"
                onClick={() => paymentMutation.mutate()}
                disabled={paymentMutation.isPending || secondsRemaining <= 0}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {paymentMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Pay ₹{(activeHold.totalMinor / 100).toFixed(2)} (Mock)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Success Card */}
      {paymentStatus === "success" && (
        <div className="mb-8 bg-emerald-950/30 border border-emerald-500/40 rounded-3xl p-8 backdrop-blur-xl text-center shadow-2xl animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/40 shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Payment Confirmed!</h2>
          <p className="text-slate-300 text-sm mt-2 max-w-md mx-auto">
            Your seats have been permanently locked and signed QR tickets have been generated.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/my-bookings"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl shadow-lg transition-colors"
            >
              <Ticket className="w-4 h-4" />
              <span>View My QR Tickets</span>
            </Link>
            <Link
              to="/"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl transition-colors"
            >
              Browse More Events
            </Link>
          </div>
        </div>
      )}

      {/* Main Seat Map Area */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Stage / Screen Representation */}
        <div className="mb-12 text-center max-w-xl mx-auto">
          <div className="h-2 w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded-full shadow-[0_0_25px_rgba(168,85,247,0.8)] mb-2" />
          <p className="text-[10px] tracking-widest uppercase font-mono text-purple-400/80">
            STAGE / SCREEN
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 mb-10 pb-6 border-b border-slate-800/80 font-medium">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-slate-800 border border-slate-700" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-purple-600 border border-purple-400 text-white flex items-center justify-center text-[10px]">
              <Check className="w-3 h-3" />
            </div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-amber-500/30 border border-amber-500/50" />
            <span>Held (Other User)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-slate-900 border border-slate-800 opacity-40" />
            <span>Booked</span>
          </div>
        </div>

        {/* Grid of Seats */}
        <div className="space-y-3 overflow-x-auto pb-4">
          {sortedRows.map((rowLabel) => {
            const rowSeats = rowsMap.get(rowLabel) || [];
            return (
              <div key={rowLabel} className="flex items-center justify-center gap-2 min-w-max">
                {/* Row Label */}
                <div className="w-6 text-center text-xs font-mono font-bold text-slate-400 select-none">
                  {rowLabel}
                </div>

                {/* Seat Buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {rowSeats.map((seat) => {
                    const isSelected = selectedSeatIds.includes(seat.id);
                    const isAvailable = seat.status === "AVAILABLE";
                    const isHeld = seat.status === "HELD";
                    const isBooked = seat.status === "BOOKED";

                    let buttonClass =
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[11px] font-mono font-medium transition-all flex items-center justify-center select-none ";

                    if (isSelected) {
                      buttonClass +=
                        "bg-purple-600 text-white border-2 border-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.7)] scale-105";
                    } else if (isAvailable) {
                      buttonClass +=
                        "bg-slate-800/90 hover:bg-purple-700 hover:border-purple-400 hover:text-white text-slate-300 border border-slate-700 cursor-pointer hover:scale-105";
                    } else if (isHeld) {
                      buttonClass +=
                        "bg-amber-950/40 text-amber-500/80 border border-amber-700/40 cursor-not-allowed opacity-80";
                    } else {
                      buttonClass +=
                        "bg-slate-950 text-slate-700 border border-slate-900 cursor-not-allowed opacity-30";
                    }

                    return (
                      <button
                        key={seat.id}
                        id={`seat-${seat.row}-${seat.number}`}
                        disabled={!isAvailable || !!activeHold}
                        onClick={() => handleToggleSeat(seat)}
                        title={`Seat ${seat.row}${seat.number} • ₹${(seat.priceMinor / 100).toFixed(
                          2
                        )} • ${seat.status}`}
                        className={buttonClass}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : seat.number}
                      </button>
                    );
                  })}
                </div>

                {/* Row Label End */}
                <div className="w-6 text-center text-xs font-mono font-bold text-slate-400 select-none">
                  {rowLabel}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Bar: Selected summary & Hold Action */}
        {!activeHold && (
          <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400">
                Selected:{" "}
                <span className="font-semibold text-white">
                  {selectedSeatIds.length} seat{selectedSeatIds.length === 1 ? "" : "s"}
                </span>{" "}
                {selectedSeatIds.length > 0 && (
                  <span className="text-slate-400">
                    ({selectedSeatsData.map((s) => `${s.row}${s.number}`).join(", ")})
                  </span>
                )}
              </p>
              <p className="text-xl font-extrabold text-white mt-0.5">
                ₹{(totalPriceMinor / 100).toFixed(2)}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {selectedSeatIds.length > 0 && (
                <button
                  onClick={() => setSelectedSeatIds([])}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Clear Selection
                </button>
              )}

              <button
                id="hold-seats-btn"
                disabled={selectedSeatIds.length === 0 || holdMutation.isPending}
                onClick={() => holdMutation.mutate()}
                className="flex-1 sm:flex-none px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-900/40 transition-all flex items-center justify-center gap-2"
              >
                {holdMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Holding Seats (Lua Atomic)...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-purple-200" />
                    <span>Hold & Proceed (5 min)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
