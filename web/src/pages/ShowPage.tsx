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
import { Auditorium3D } from "../components/Auditorium3D";

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
  const {
    data: show,
    isLoading: isShowLoading,
    error: showError,
    refetch: refetchShow,
  } = useQuery({
    queryKey: ["show", showId],
    queryFn: () => api.getShow(showId!),
    enabled: !!showId,
    retry: 1,
  });

  // 2. Fetch Seats with 3-second live polling (PRD requirement)
  const {
    data: seats,
    isLoading: isSeatsLoading,
    isRefetching: isSeatsRefetching,
    error: seatsError,
    refetch: refetchSeats,
  } = useQuery<SeatItem[]>({
    queryKey: ["seats", showId],
    queryFn: () => api.getSeats(showId!),
    enabled: !!showId,
    refetchInterval: 3000,
    retry: 1,
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
    for (const [, list] of map.entries()) {
      list.sort((a, b) => a.number - b.number);
    }
    return map;
  }, [seats]);

  const sortedRows = useMemo(() => {
    return Array.from(rowsMap.keys()).sort();
  }, [rowsMap]);

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

  const handleToggleSeat = (seat: SeatItem) => {
    if (activeHold) return;
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

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!activeHold) throw new Error("No active hold found");
      setPaymentStatus("paying");

      const orderData = await api.payBooking(activeHold.bookingId);
      await api.completeMockPayment(orderData.orderId);
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

  if (showError || seatsError) {
    const err = (showError || seatsError) as Error;
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="p-8 bg-red-950/20 border border-red-900/40 rounded-2xl">
          <p className="text-red-400 font-semibold text-lg">Unable to load show or seats</p>
          <p className="text-slate-400 text-sm mt-2">{err.message}</p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => {
                refetchShow();
                refetchSeats();
              }}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
            >
              Retry
            </button>
            <Link
              to="/"
              className="px-5 py-2.5 bg-surface-800 hover:bg-surface-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isShowLoading || isSeatsLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center animate-pulse">
        <div className="h-8 bg-surface-900 rounded-2xl w-1/3 mx-auto mb-4 border border-slate-800" />
        <div className="h-4 bg-surface-900 rounded-xl w-1/4 mx-auto mb-12 border border-slate-800" />
        <div className="h-96 bg-surface-900/60 rounded-3xl border border-slate-800" />
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-2 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Event</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3 font-display">
            <span>{show?.event_title || "Select Your Seats"}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono font-bold">
              LIVE SEAT MAP
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
            <span className="font-semibold text-slate-200">{show?.venue_name}</span>
            <span>•</span>
            <span className="font-mono text-slate-300">
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

        {/* Polling Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-300 bg-surface-900 border border-slate-800 px-3.5 py-1.5 rounded-xl shadow-sm">
          <RefreshCw
            className={`w-3.5 h-3.5 text-amber-400 ${
              isSeatsRefetching ? "animate-spin text-amber-300" : ""
            }`}
          />
          <span className="font-mono text-[11px] text-slate-400">Live 3s Polling</span>
        </div>
      </div>

      {/* Error / Warning Alert */}
      {errorMessage && (
        <div className="mb-6 bg-red-950/40 border border-red-500/40 rounded-2xl p-4 flex items-start gap-3 text-red-200 text-sm animate-fade-in shadow-xl">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-200 text-xs font-mono font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Hold Banner with Countdown */}
      {activeHold && secondsRemaining !== null && paymentStatus !== "success" && (
        <div className="mb-8 bg-surface-900 border border-amber-500/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Seats Held Exclusively for You</span>
              </div>
              <h2 className="text-lg font-bold text-white font-display">
                Complete payment before your 5-minute hold expires
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Booking ID: <span className="font-mono text-slate-300">{activeHold.bookingId.slice(0, 8)}...</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Countdown box */}
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-extrabold text-base ${
                  secondsRemaining < 60
                    ? "bg-red-950/70 border-red-500 text-red-400 animate-pulse"
                    : "bg-surface-950 border-amber-500/40 text-amber-300"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{formatTime(secondsRemaining)}</span>
              </div>

              {/* Pay Now Button */}
              <button
                id="mock-pay-btn"
                onClick={() => paymentMutation.mutate()}
                disabled={paymentMutation.isPending || secondsRemaining <= 0}
                className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {paymentMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Pay ₹{(activeHold.totalMinor / 100).toFixed(2)} (Instant Mock)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Success Card */}
      {paymentStatus === "success" && (
        <div className="mb-8 bg-surface-900 border border-emerald-500/40 rounded-2xl p-8 text-center shadow-xl animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/40">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white font-display">Booking Confirmed!</h2>
          <p className="text-slate-300 text-sm mt-1 max-w-md mx-auto">
            Your seats have been permanently confirmed and verified QR entry passes have been generated.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/my-bookings"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold rounded-xl shadow-md transition-colors"
            >
              <Ticket className="w-4 h-4" />
              <span>View My Tickets</span>
            </Link>
            <Link
              to="/"
              className="px-5 py-2.5 bg-surface-850 hover:bg-surface-800 text-slate-300 text-sm font-semibold rounded-xl transition-colors border border-slate-800"
            >
              Browse More Events
            </Link>
          </div>
        </div>
      )}

      {/* 3D Stadium Map Component with dedicated inspector */}
      <Auditorium3D
        seats={seats || []}
        rowsMap={rowsMap}
        sortedRows={sortedRows}
        selectedSeatIds={selectedSeatIds}
        onToggleSeat={handleToggleSeat}
        activeHold={activeHold}
        venueName={show?.venue_name}
      />

      {/* Checkout Drawer when seats are selected */}
      {!activeHold && (
        <div className="mt-8 p-6 rounded-2xl bg-surface-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase font-mono tracking-wider text-slate-400">
              <span>Selected Seats:</span>
              <span className="font-mono font-bold text-amber-300 text-sm">
                {selectedSeatIds.length} / 6 max
              </span>
            </div>

            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-2xl font-extrabold text-white font-display">
                ₹{(totalPriceMinor / 100).toFixed(2)}
              </span>
              {selectedSeatIds.length > 0 && (
                <span className="text-xs font-mono text-slate-400">
                  ({selectedSeatsData.map((s) => `${s.row}${s.number}`).join(", ")})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {selectedSeatIds.length > 0 && (
              <button
                onClick={() => setSelectedSeatIds([])}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Clear
              </button>
            )}

            <button
              id="hold-seats-btn"
              disabled={selectedSeatIds.length === 0 || holdMutation.isPending}
              onClick={() => holdMutation.mutate()}
              className="flex-1 sm:flex-none px-6 py-3 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {holdMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Holding your seats...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-black stroke-[2.5]" />
                  <span>Lock & Proceed to Checkout (5 min hold)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
