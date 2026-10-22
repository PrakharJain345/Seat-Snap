import React, { useState, useMemo } from "react";
import { Check, Lock, Sparkles, Eye, Compass, RotateCcw, ZoomIn, ZoomOut, Info } from "lucide-react";
import { SeatItem, HoldResponse } from "../api";

interface Auditorium3DProps {
  seats: SeatItem[];
  rowsMap: Map<string, SeatItem[]>;
  sortedRows: string[];
  selectedSeatIds: string[];
  onToggleSeat: (seat: SeatItem) => void;
  activeHold: HoldResponse | null;
  venueName?: string;
}

export const Auditorium3D: React.FC<Auditorium3DProps> = ({
  rowsMap,
  sortedRows,
  selectedSeatIds,
  onToggleSeat,
  activeHold,
  venueName = "Main Auditorium",
}) => {
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [pitch, setPitch] = useState<number>(24);
  const [zoom, setZoom] = useState<number>(1);
  const [hoveredSeat, setHoveredSeat] = useState<SeatItem | null>(null);

  // Determine tier and color palette by row index
  const getRowTier = (rowLabel: string, index: number) => {
    if (index < 3) {
      return {
        name: "VIP Front Row",
        tagClass: "bg-amber-400/20 text-amber-300 border-amber-400/40",
        seatAvailableClass:
          "bg-amber-500/15 text-amber-300 border border-amber-400/40 hover:bg-amber-400 hover:text-black hover:border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]",
        label: "VIP",
      };
    }
    if (index < 7) {
      return {
        name: "Premium Center",
        tagClass: "bg-slate-700/60 text-slate-200 border-slate-600",
        seatAvailableClass:
          "bg-slate-800/90 text-slate-100 border border-slate-600/80 hover:bg-slate-700 hover:text-white hover:border-slate-400",
        label: "Premium",
      };
    }
    return {
      name: "Standard Hall",
      tagClass: "bg-surface-850 text-slate-300 border-surface-800",
      seatAvailableClass:
        "bg-surface-850 text-slate-300 border border-surface-800 hover:bg-surface-750 hover:text-white",
      label: "Standard",
    };
  };

  const hoveredTier = useMemo(() => {
    if (!hoveredSeat) return null;
    const rowIndex = sortedRows.indexOf(hoveredSeat.row);
    return getRowTier(hoveredSeat.row, rowIndex >= 0 ? rowIndex : 0);
  }, [hoveredSeat, sortedRows]);

  const handleResetCamera = () => {
    setPitch(24);
    setZoom(1);
  };

  return (
    <div className="relative w-full">
      {/* Top Toolbar: Perspective View Mode & Camera Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 p-3.5 sm:p-4 rounded-2xl bg-surface-900 border border-surface-800 backdrop-blur-md shadow-md">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Perspective:</span>
          </span>

          <div className="flex items-center p-1 bg-surface-950 rounded-xl border border-surface-800">
            <button
              onClick={() => setViewMode("3d")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "3d"
                  ? "bg-amber-400 text-black shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>3D Arena</span>
            </button>
            <button
              onClick={() => setViewMode("2d")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "2d"
                  ? "bg-amber-400 text-black shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>2D Plan</span>
            </button>
          </div>
        </div>

        {/* 3D Camera Controls */}
        {viewMode === "3d" && (
          <div className="flex items-center gap-3 text-xs">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-slate-400 font-medium">Tilt:</span>
              <input
                type="range"
                min="10"
                max="40"
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
                className="w-20 accent-amber-400 cursor-pointer"
                title={`Pitch Angle: ${pitch}°`}
              />
              <span className="font-mono text-slate-300 w-7">{pitch}°</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom((z) => Math.min(1.25, z + 0.1))}
                className="p-1.5 bg-surface-850 hover:bg-surface-800 border border-surface-750 rounded-lg text-slate-300 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.75, z - 0.1))}
                className="p-1.5 bg-surface-850 hover:bg-surface-800 border border-surface-750 rounded-lg text-slate-300 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetCamera}
                className="p-1.5 bg-surface-850 hover:bg-surface-800 border border-surface-750 rounded-lg text-slate-300 hover:text-white transition-colors"
                title="Reset View"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Auditorium Container with Stage & Seats */}
      <div className="relative rounded-3xl bg-surface-900 border border-surface-800 p-5 sm:p-10 shadow-2xl backdrop-blur-xl flex flex-col items-center">
        {/* Warm Ambient Footlight Glow at Top */}
        <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent pointer-events-none rounded-t-3xl" />

        {/* Curved Cinematic Stage / Screen */}
        <div className="relative z-10 w-full max-w-xl mb-6 text-center">
          {/* Soft Warm Stage Projection Glow */}
          <div className="h-7 w-full bg-gradient-to-b from-amber-400/25 via-amber-400/10 to-transparent rounded-t-[140px] blur-sm pointer-events-none" />

          {/* Curved Stage Bar */}
          <div className="relative h-2.5 w-full bg-gradient-to-r from-transparent via-amber-300 to-transparent rounded-full shadow-[0_0_24px_rgba(245,158,11,0.5)]" />

          {/* Stage Label */}
          <div className="mt-2.5 text-[11px] font-mono tracking-widest uppercase font-bold text-amber-300/80">
            {venueName} • MAIN STAGE
          </div>
        </div>

        {/* Dedicated Live Seat Inspector Bar (NEVER occludes seats!) */}
        <div className="relative z-20 w-full max-w-2xl mb-6 p-3 sm:p-3.5 rounded-2xl bg-surface-950 border border-surface-800 shadow-lg">
          {hoveredSeat ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono font-extrabold text-white text-sm bg-surface-850 px-2.5 py-1 rounded-lg border border-surface-750">
                  Row {hoveredSeat.row} • Seat #{hoveredSeat.number}
                </span>
                {hoveredTier && (
                  <span
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${hoveredTier.tagClass}`}
                  >
                    {hoveredTier.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono font-extrabold text-amber-400 text-sm">
                  ₹{(hoveredSeat.priceMinor / 100).toFixed(2)}
                </span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1.5 ${
                    hoveredSeat.status === "AVAILABLE"
                      ? selectedSeatIds.includes(hoveredSeat.id)
                        ? "bg-amber-400/20 text-amber-300"
                        : "bg-emerald-500/20 text-emerald-400"
                      : hoveredSeat.status === "HELD"
                      ? "bg-amber-950/40 text-amber-400"
                      : "bg-surface-850 text-slate-400"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      hoveredSeat.status === "AVAILABLE" ? "bg-emerald-400" : "bg-slate-500"
                    }`}
                  />
                  <span>
                    {selectedSeatIds.includes(hoveredSeat.id)
                      ? "Selected (Click to Remove)"
                      : hoveredSeat.status === "AVAILABLE"
                      ? "Available (Click to Select)"
                      : hoveredSeat.status === "HELD"
                      ? "Held by Another User"
                      : "Sold Out"}
                  </span>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-amber-400" />
                <span>Hover over any seat to inspect row, tier, and price</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Max 6 seats per booking
              </span>
            </div>
          )}
        </div>

        {/* Stadium Seating Grid */}
        <div
          className={`w-full overflow-x-auto pb-4 transition-all duration-300 ${
            viewMode === "3d" ? "preserve-3d" : ""
          }`}
          style={
            viewMode === "3d"
              ? {
                  perspective: "1200px",
                }
              : {}
          }
        >
          <div
            className="flex flex-col items-center gap-2 sm:gap-2.5 min-w-max mx-auto transition-transform duration-300 preserve-3d"
            style={
              viewMode === "3d"
                ? {
                    transform: `rotateX(${pitch}deg) scale(${zoom})`,
                    transformOrigin: "top center",
                  }
                : {
                    transform: `scale(${zoom})`,
                    transformOrigin: "top center",
                  }
            }
          >
            {sortedRows.map((rowLabel, rowIndex) => {
              const rowSeats = rowsMap.get(rowLabel) || [];
              const zElevation = (sortedRows.length - rowIndex) * 2;
              const tier = getRowTier(rowLabel, rowIndex);

              return (
                <div
                  key={rowLabel}
                  className="flex items-center gap-2 sm:gap-3 preserve-3d"
                  style={
                    viewMode === "3d"
                      ? {
                          transform: `translateZ(${zElevation}px)`,
                        }
                      : {}
                  }
                >
                  {/* Left Row Identifier */}
                  <div className="w-7 text-center text-xs font-mono font-bold select-none">
                    <span className="px-1.5 py-0.5 rounded bg-surface-950 border border-surface-800 text-amber-400/90">
                      {rowLabel}
                    </span>
                  </div>

                  {/* Seat Items in Row */}
                  <div className="flex items-center gap-1.5 sm:gap-2 preserve-3d">
                    {rowSeats.map((seat, seatIdx) => {
                      const isSelected = selectedSeatIds.includes(seat.id);
                      const isAvailable = seat.status === "AVAILABLE";
                      const isHeld = seat.status === "HELD";

                      // Subtle curved amphitheater offset
                      const midPoint = rowSeats.length / 2;
                      const distFromCenter = Math.abs(seatIdx - midPoint);
                      const curveOffset = Math.pow(distFromCenter, 1.25) * (viewMode === "3d" ? 0.7 : 0);

                      return (
                        <div
                          key={seat.id}
                          className="relative"
                          style={
                            viewMode === "3d"
                              ? {
                                  transform: `translateZ(${curveOffset}px)`,
                                }
                              : {}
                          }
                          onMouseEnter={() => setHoveredSeat(seat)}
                          onMouseLeave={() => setHoveredSeat(null)}
                        >
                          <button
                            id={`seat-${seat.row}-${seat.number}`}
                            disabled={!isAvailable || !!activeHold}
                            onClick={() => onToggleSeat(seat)}
                            aria-label={`Seat ${seat.row}${seat.number}, ${seat.status}, ₹${(seat.priceMinor / 100).toFixed(2)}`}
                            className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-mono text-[11px] font-bold transition-all duration-150 select-none flex items-center justify-center ${
                              isSelected
                                ? "bg-amber-400 text-black border-2 border-amber-200 ring-4 ring-amber-400/50 shadow-xl shadow-amber-500/40 scale-110 z-20 font-extrabold"
                                : isAvailable
                                ? `${tier.seatAvailableClass} cursor-pointer hover:scale-105`
                                : isHeld
                                ? "bg-amber-950/40 text-amber-400/80 border border-amber-700/50 cursor-not-allowed opacity-70"
                                : "bg-surface-950/80 text-slate-600 border border-surface-800/50 cursor-not-allowed opacity-35"
                            } ${viewMode === "3d" ? "seat-item" : ""}`}
                          >
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : isHeld ? (
                              <Lock className="w-3 h-3" />
                            ) : (
                              seat.number
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Row Identifier */}
                  <div className="w-7 text-center text-xs font-mono font-bold select-none">
                    <span className="px-1.5 py-0.5 rounded bg-surface-950 border border-surface-800 text-amber-400/90">
                      {rowLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend & Tier Summary */}
        <div className="relative z-10 w-full mt-8 pt-5 border-t border-surface-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Status Legend */}
          <div className="flex flex-wrap items-center gap-4 text-slate-300 font-medium">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-md bg-amber-500/20 border border-amber-400/40" />
              <span>VIP Tier</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-md bg-slate-800 border border-slate-600" />
              <span>Premium Tier</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-md bg-surface-850 border border-surface-800" />
              <span>Standard Tier</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-md bg-amber-400 border border-amber-200 text-black flex items-center justify-center text-[9px] font-bold">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span className="text-amber-400 font-semibold">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-md bg-amber-950/40 border border-amber-700/50 flex items-center justify-center text-amber-400">
                <Lock className="w-2 h-2" />
              </div>
              <span>Held</span>
            </div>
          </div>

          {/* Pricing Tiers Badges */}
          <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-300 font-semibold">
              Rows A-C: VIP (₹600)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-semibold">
              Rows D-G: Premium (₹400)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-850 border border-surface-800 text-slate-300">
              Rows H-J: Standard (₹250)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
