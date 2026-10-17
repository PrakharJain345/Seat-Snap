import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Tag, ArrowLeft, Clock } from "lucide-react";
import { api, EventItem } from "../api";

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
        <div className="h-8 bg-slate-800 rounded w-1/4" />
        <div className="h-12 bg-slate-800 rounded w-3/4" />
        <div className="h-40 bg-slate-800 rounded" />
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
          className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Events</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Events</span>
      </Link>

      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            <Tag className="w-3.5 h-3.5" />
            {event.category}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-300">
            <MapPin className="w-4 h-4 text-slate-500" />
            {event.city}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {event.title}
        </h1>

        <p className="mt-4 text-slate-300 leading-relaxed text-base max-w-3xl">
          {event.description || "Exciting live event with high-demand reserved seating."}
        </p>

        {/* Shows Selection Section */}
        <div className="mt-10 pt-8 border-t border-slate-800">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            <span>Select a Show Timing</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {event.shows?.map((show) => (
              <div
                key={show.id}
                className="bg-slate-950/70 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-5 transition-all flex flex-col justify-between group"
              >
                <div>
                  <h3 className="font-bold text-white group-hover:text-purple-300 transition-colors">
                    {show.venue_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span className="font-mono">
                      {new Date(show.starts_at).toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/50 flex items-center justify-between">
                  <span className="text-xs text-slate-400">100 Seats Reserved</span>
                  <Link
                    to={`/shows/${show.id}`}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
                  >
                    View Seat Map &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
