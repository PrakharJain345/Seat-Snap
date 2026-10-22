import React from "react";
import { Ticket, Calendar, MapPin, QrCode, ShieldCheck } from "lucide-react";
import { Card3D } from "./Card3D";
import { api, TicketItem, BookingItem } from "../api";

interface TicketPass3DProps {
  booking: BookingItem;
  ticket: TicketItem;
}

export const TicketPass3D: React.FC<TicketPass3DProps> = ({ booking, ticket }) => {
  const qrUrl = api.getTicketQrUrl(ticket.id);

  return (
    <Card3D maxTilt={10} glowColor="gold" className="w-full max-w-sm mx-auto">
      <div className="relative rounded-3xl overflow-hidden bg-surface-900 border border-slate-800 p-6 shadow-2xl">
        {/* Top Header Badge */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-400 text-black flex items-center justify-center font-bold">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-amber-400 font-bold uppercase block">
                DIGITAL PASS
              </span>
              <span className="text-xs font-bold text-white">Verified Ticket</span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-surface-800 border border-slate-700 text-slate-300">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            <span>Verified QR</span>
          </span>
        </div>

        {/* Event Title & Details */}
        <div className="py-4 relative z-10">
          <h3 className="text-base font-bold text-white leading-tight">
            {booking.event_title || "Live Event"}
          </h3>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{booking.venue_name}</span>
          </p>
          {booking.starts_at && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>
                {new Date(booking.starts_at).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </p>
          )}
        </div>

        {/* Seat Specification Pill */}
        <div className="grid grid-cols-3 gap-2 py-3 px-4 rounded-xl bg-surface-950 border border-slate-800 text-center relative z-10">
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Row</span>
            <span className="text-base font-extrabold font-mono text-amber-400">{ticket.row}</span>
          </div>
          <div className="border-x border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Seat</span>
            <span className="text-base font-extrabold font-mono text-white">#{ticket.number}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Status</span>
            <span className="text-xs font-bold font-mono text-emerald-400 mt-1 block">VALID</span>
          </div>
        </div>

        {/* Perforated Line */}
        <div className="relative my-4 flex items-center justify-between">
          <div className="w-3 h-6 rounded-r-full bg-surface-950 -ml-6 border-r border-slate-800" />
          <div className="flex-1 border-t border-dashed border-slate-800 mx-2" />
          <div className="w-3 h-6 rounded-l-full bg-surface-950 -mr-6 border-l border-slate-800" />
        </div>

        {/* QR Code Section */}
        <div className="relative z-10 flex flex-col items-center justify-center p-3 rounded-2xl bg-surface-950 border border-slate-800">
          <div className="relative w-32 h-32 bg-white p-2 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
            <img
              src={qrUrl}
              alt={`Ticket ${ticket.id} QR Code`}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <QrCode className="w-20 h-20 text-slate-900 absolute opacity-20 -z-10" />
          </div>

          <p className="text-[10px] font-mono text-slate-400 mt-2 text-center">
            Scan at venue entrance
          </p>
          <p className="text-[9px] font-mono text-slate-500 mt-0.5">
            UID: {ticket.id.slice(0, 16)}...
          </p>
        </div>
      </div>
    </Card3D>
  );
};
