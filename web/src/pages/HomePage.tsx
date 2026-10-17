import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Calendar, MapPin, Tag, ShieldCheck, Zap, Layers } from "lucide-react";
import { api, EventItem } from "../api";

export const HomePage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const { data: events, isLoading, error, refetch } = useQuery<EventItem[]>({
    queryKey: ["events", selectedCity, selectedCategory, search],
    queryFn: () =>
      api.getEvents({
        city: selectedCity || undefined,
        category: selectedCategory || undefined,
        q: search || undefined,
      }),
  });

  const cities = ["All Cities", "Mumbai", "Bengaluru", "Delhi"];
  const categories = ["All Categories", "Music", "Comedy", "Movies", "Theatre"];

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800/60 bg-gradient-to-b from-purple-950/20 via-slate-950 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(124,58,237,0.15),transparent_40%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-6">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>High Concurrency Seat Reservation Engine</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Instant Seat Booking with{" "}
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">
              Zero Double-Booking
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Browse premium concerts, stand-ups, and shows. Powered by Redis Lua atomic holds and database-level unique constraints.
          </p>

          {/* Quick Metrics / Features */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Atomic 5-Min TTL Holds</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>PostgreSQL Safety Index</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Live Seat Polling (3s)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Search and Filters Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-8 backdrop-blur-sm shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search events, artists, venues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-750 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
            </div>

            {/* City Selector */}
            <div>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value === "All Cities" ? "" : e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-750 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              >
                {cities.map((city) => (
                  <option key={city} value={city === "All Cities" ? "" : city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Selector */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value === "All Categories" ? "" : e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-750 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat === "All Categories" ? "" : cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Upcoming Events</span>
            {events && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {events.length}
              </span>
            )}
          </h2>
          <button
            onClick={() => refetch()}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse p-6 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-4 bg-slate-800 rounded w-1/3" />
                  <div className="h-6 bg-slate-800 rounded w-3/4" />
                  <div className="h-4 bg-slate-800 rounded w-1/2" />
                </div>
                <div className="h-10 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-8 text-center bg-red-950/20 border border-red-900/40 rounded-2xl">
            <p className="text-red-400 font-medium">Failed to load events</p>
            <p className="text-slate-400 text-sm mt-1">{(error as Error).message}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && events?.length === 0 && (
          <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-200">No events found</h3>
            <p className="text-sm text-slate-400 mt-1">
              Try adjusting your search criteria or clearing filters.
            </p>
          </div>
        )}

        {/* Events Grid */}
        {!isLoading && !error && events && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="group relative bg-slate-900/70 border border-slate-800/80 hover:border-purple-500/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-purple-950/20 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                      <Tag className="w-3 h-3" />
                      {event.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {event.city}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                    {event.title}
                  </h3>

                  <p className="mt-2 text-sm text-slate-400 line-clamp-2">
                    {event.description || "Exciting live event with high-demand reserved seating."}
                  </p>

                  {/* Shows List */}
                  <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Available Shows ({event.shows?.length || 0})
                    </p>
                    {event.shows?.slice(0, 2).map((show) => (
                      <div
                        key={show.id}
                        className="flex items-center justify-between text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-800/50"
                      >
                        <span className="text-slate-300 font-medium truncate max-w-[150px]">
                          {show.venue_name}
                        </span>
                        <span className="text-purple-400 font-mono">
                          {new Date(show.starts_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-2">
                  <Link
                    to={`/events/${event.id}`}
                    className="block w-full py-2.5 px-4 text-center text-sm font-semibold text-white bg-slate-800 hover:bg-purple-600 rounded-xl transition-all duration-200 group-hover:bg-purple-600"
                  >
                    Select Show & Seats &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
