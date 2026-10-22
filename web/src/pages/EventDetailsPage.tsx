import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Tag, ArrowLeft, Clock, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { api, EventItem } from "../api";
import { getEventVisual } from "../utils/eventImages";
import { formatShowDate } from "../utils/dateUtils";

export const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: event, isLoading, error } = useQuery<EventItem>({
    queryKey: ["event", id],
    queryFn: () => api.getEvent(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-8 bg-surface-900 rounded-2xl w-1/4" />
        <div className="h-64 bg-surface-900/60 rounded-3xl border border-surface-800" />
        <div className="h-40 bg-surface-900/40 rounded-3xl border border-surface-800" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-red-400">Event Not Found</h2>
        <p className="text-slate-400 text-sm mt-2">
          {error ? (error as Error).message : "The requested event could not be found."}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-surface-850 text-white rounded-xl text-sm font-semibold hover:bg-surface-800 transition-colors border border-surface-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Events</span>
        </Link>
      </div>
    );
  }

  const visual = getEventVisual(event.title, event.category);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to All Events</span>
      </Link>

      {/* Hero Banner with Curated Image */}
      <div className="rounded-3xl overflow-hidden bg-surface-900 border border-surface-800 shadow-2xl relative mb-8">
        <div className="relative h-64 sm:h-80 w-full overflow-hidden">
          <img
            src={visual.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-900 via-surface-900/60 to-black/30" />

          {/* Top Badges */}
          <div className="absolute top-4 inset-x-4 sm:inset-x-6 flex items-center justify-between z-10">
            <span className={`text-xs px-3 py-1 rounded-lg shadow-lg ${visual.badgeColor}`}>
              {visual.badge}
            </span>
            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-xs text-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Official Live Event</span>
            </div>
          </div>

          {/* Bottom Title Overlay */}
          <div className="absolute bottom-6 inset-x-4 sm:inset-x-8 z-10">
            <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-surface-950/80 backdrop-blur-md text-slate-200 border border-white/10">
                {event.category}
              </span>
              <span className="text-xs text-slate-200 bg-surface-950/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400" />
                {event.city}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
              {event.title}
            </h1>
          </div>
        </div>

        {/* Description Section */}
        <div className="p-6 sm:p-8">
          <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
            {event.description || visual.tagline}
          </p>

          <div className="mt-4 flex items-center gap-2 text-xs text-amber-400/90 font-medium">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Interactive 3D seat selection and 5-minute hold guarantees available for all shows below.</span>
          </div>
        </div>
      </div>

      {/* Shows Selection Section */}
      <div className="rounded-3xl p-6 sm:p-8 bg-surface-900 border border-surface-800 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5 font-display">
            <Calendar className="w-5 h-5 text-amber-400" />
            <span>Select Show Timing</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            {event.shows?.length || 0} Shows Available
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {event.shows?.map((show) => {
            const dateInfo = formatShowDate(show.starts_at);

            return (
              <div
                key={show.id}
                className="bg-surface-950/90 border border-surface-800 hover:border-amber-400/50 rounded-2xl p-5 transition-all flex flex-col justify-between group shadow-md hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-md border ${
                        dateInfo.isToday
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : dateInfo.isTomorrow
                          ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                          : "bg-surface-850 text-slate-300 border-surface-750"
                      }`}
                    >
                      {dateInfo.badge}
                    </span>
                    <span className="text-xs font-mono text-amber-400 font-bold">
                      Starts ₹250
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-white group-hover:text-amber-300 transition-colors">
                    {show.venue_name}
                  </h3>

                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-300 font-mono">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>{dateInfo.fullDateStr}</span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-surface-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">100-400 Capacity</span>
                  <Link
                    to={`/shows/${show.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-xs rounded-xl transition-all shadow-sm group-hover:scale-105"
                  >
                    <span>Select Seats in 3D</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
