import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Timer,
  Sparkles,
  Music,
  Laugh,
  Film,
  Drama,
  Layers,
  Flame,
} from "lucide-react";
import { api, EventItem } from "../api";
import { getEventVisual } from "../utils/eventImages";
import { formatShowDate } from "../utils/dateUtils";

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
  const categoryFilters = [
    { label: "All Events", value: "", icon: Layers },
    { label: "Concerts & Music", value: "Music", icon: Music },
    { label: "Standup Comedy", value: "Comedy", icon: Laugh },
    { label: "IMAX Movies", value: "Movies", icon: Film },
    { label: "Theatre & Musicals", value: "Theatre", icon: Drama },
  ];

  // Pick first event as the live featured showcase
  const featuredEvent = events && events.length > 0 ? events[0] : null;
  const featuredVisual = featuredEvent
    ? getEventVisual(featuredEvent.title, featuredEvent.category)
    : null;
  const featuredNextShow = featuredEvent?.shows?.[0];
  const featuredDateInfo = featuredNextShow
    ? formatShowDate(featuredNextShow.starts_at)
    : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-28">
      {/* Enhanced Blended Hero Section with Ambient Glow & Architectural Grid */}
      <section className="relative pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-white/[0.08] overflow-hidden">
        {/* Architectural stage lattice overlay */}
        <div className="absolute inset-0 stage-grid-bg pointer-events-none" />

        {/* Ambient Warm Golden & Twilight Stage Flares */}
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-amber-500/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-10 right-1/4 w-96 h-96 bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Headlines, Trust Chips & Embedded Luxury Search */}
            <div className="lg:col-span-7 space-y-6">
              {/* Live Tour Season Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400/15 via-amber-400/10 to-transparent border border-amber-400/30 text-amber-300 text-xs font-semibold backdrop-blur-md shadow-sm">
                <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Live Arena Season • Guaranteed 5-Min Locks</span>
              </div>

              {/* Punchy, Blended Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] font-display">
                Book <span className="text-gradient-gold">Live Concerts</span>, Shows & Standup
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
                Choose your exact seats with real-time 3D arena views, live seat status, and verified digital QR passes.
              </p>

              {/* Embedded Glassmorphic Search & Location Discovery Bar */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-surface-900/90 border border-white/10 shadow-2xl backdrop-blur-xl">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  {/* Search Input */}
                  <div className="sm:col-span-7 relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                    <input
                      type="text"
                      placeholder="Search artist, show, or venue..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-surface-950/80 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-400/80 transition-all"
                    />
                  </div>

                  {/* City Selector */}
                  <div className="sm:col-span-5 relative">
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value === "All Cities" ? "" : e.target.value)}
                      className="w-full pl-3.5 pr-8 py-2.5 bg-surface-950/80 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-400/80 transition-all cursor-pointer"
                    >
                      {cities.map((city) => (
                        <option key={city} value={city === "All Cities" ? "" : city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Genuine Value Guarantees */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 pt-1 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-1.5 bg-surface-900/60 px-3 py-1.5 rounded-xl border border-white/5 backdrop-blur-sm">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Official Verified Tickets</span>
                </div>
                <div className="flex items-center gap-1.5 bg-surface-900/60 px-3 py-1.5 rounded-xl border border-white/5 backdrop-blur-sm">
                  <Timer className="w-4 h-4 text-amber-400" />
                  <span>5-Minute Cart Lock</span>
                </div>
                <div className="flex items-center gap-1.5 bg-surface-900/60 px-3 py-1.5 rounded-xl border border-white/5 backdrop-blur-sm">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>Digital QR Mobile Pass</span>
                </div>
              </div>
            </div>

            {/* Right Column: Featured Live Arena Showcase Card (Breaks the Empty Black Look!) */}
            <div className="lg:col-span-5">
              {featuredEvent && featuredVisual ? (
                <div className="relative rounded-3xl bg-surface-900/90 border border-amber-400/30 p-4 sm:p-5 shadow-2xl backdrop-blur-xl group hover:border-amber-400/60 transition-all duration-300">
                  {/* Soft Warm Radial Backdrop Glow */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-indigo-500/15 rounded-3xl blur-xl -z-10 opacity-70 group-hover:opacity-100 transition-opacity" />

                  {/* Showcase Image Header */}
                  <div className="relative h-56 sm:h-64 w-full rounded-2xl overflow-hidden bg-surface-950">
                    <img
                      src={featuredVisual.imageUrl}
                      alt={featuredEvent.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/40 to-transparent" />

                    {/* Top Status Indicators */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-amber-400/40 text-amber-300 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>LIVE 3D ARENA</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-amber-400 text-black text-xs font-extrabold shadow-md">
                        {featuredVisual.startingPrice}
                      </span>
                    </div>

                    {/* Bottom Metadata Overlay */}
                    <div className="absolute bottom-3 inset-x-3 z-10 flex items-center justify-between text-xs">
                      <span className="px-2.5 py-1 rounded-md bg-surface-900/90 backdrop-blur-md border border-white/10 text-slate-200 font-semibold">
                        {featuredEvent.category}
                      </span>
                      {featuredDateInfo && (
                        <span className="px-2.5 py-1 rounded-md bg-amber-400/20 border border-amber-400/40 backdrop-blur-md text-amber-300 font-mono font-bold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{featuredDateInfo.fullDateStr}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Showcase Content */}
                  <div className="mt-4 px-1">
                    <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors font-display line-clamp-1">
                      {featuredEvent.title}
                    </h3>
                    <p className="mt-1.5 text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {featuredEvent.description || featuredVisual.tagline}
                    </p>

                    {/* Seating Tier Pills */}
                    <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-300">
                      <span className="text-amber-400 font-semibold">VIP Stage Front</span>
                      <span>•</span>
                      <span>Premium Center</span>
                      <span>•</span>
                      <span>Standard</span>
                    </div>

                    {/* CTA Button */}
                    <Link
                      to={`/events/${featuredEvent.id}`}
                      className="mt-4 w-full py-2.5 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all group-hover:scale-[1.01]"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Select Seats in 3D Arena</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="h-80 rounded-3xl bg-surface-900/50 border border-white/10 animate-pulse p-6 flex flex-col justify-between">
                  <div className="h-44 bg-surface-800/40 rounded-2xl" />
                  <div className="h-10 bg-surface-800/60 rounded-xl" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {/* Category Filter Chips with Icons */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-3 mb-8 no-scrollbar">
          {categoryFilters.map((cat) => {
            const IconComponent = cat.icon;
            const isSelected = selectedCategory === cat.value;
            return (
              <button
                key={cat.label}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-black border-amber-300 shadow-md shadow-amber-500/20 font-extrabold scale-[1.02]"
                    : "bg-surface-900/80 hover:bg-surface-850 text-slate-300 border-white/10 hover:text-white backdrop-blur-md"
                }`}
              >
                <IconComponent className={`w-3.5 h-3.5 ${isSelected ? "text-black" : "text-amber-400"}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 font-display">
            <span>Explore All Shows</span>
            {events && (
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-surface-850 border border-white/10 text-amber-400">
                {events.length} Live Shows
              </span>
            )}
          </h2>
          <button
            onClick={() => refetch()}
            className="text-xs font-semibold text-slate-400 hover:text-amber-300 transition-colors"
          >
            Refresh List
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-80 rounded-2xl bg-surface-900/60 border border-white/5 animate-pulse flex flex-col justify-between overflow-hidden"
              >
                <div className="h-44 bg-surface-800/50" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-surface-800 rounded w-1/3" />
                  <div className="h-6 bg-surface-800 rounded w-3/4" />
                  <div className="h-10 bg-surface-800 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-8 text-center bg-red-950/20 border border-red-900/40 rounded-2xl">
            <p className="text-red-400 font-semibold">Failed to load events</p>
            <p className="text-slate-400 text-sm mt-1">{(error as Error).message}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && events?.length === 0 && (
          <div className="text-center py-16 bg-surface-900/50 rounded-2xl border border-white/10">
            <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-200">No events found</h3>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search query or selecting "All Events".
            </p>
          </div>
        )}

        {/* Events Grid (With Curated Photography & Dynamic Upcoming Date Badges) */}
        {!isLoading && !error && events && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const visual = getEventVisual(event.title, event.category);
              const nextShow = event.shows?.[0];
              const dateInfo = nextShow ? formatShowDate(nextShow.starts_at) : null;

              return (
                <div
                  key={event.id}
                  className="group rounded-2xl bg-surface-900/80 border border-white/10 hover:border-amber-400/40 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between overflow-hidden backdrop-blur-md"
                >
                  <div>
                    {/* Event Poster Header with Image */}
                    <div className="relative h-48 w-full overflow-hidden bg-surface-950">
                      <img
                        src={visual.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      {/* Gradient Overlay for Text Readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-900 via-surface-900/40 to-black/30" />

                      {/* Top Badges */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 z-10">
                        <span className={`text-[11px] px-2.5 py-1 rounded-md shadow-md ${visual.badgeColor}`}>
                          {visual.badge}
                        </span>
                        <span className="text-[11px] font-bold font-mono px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md text-amber-400 border border-amber-400/30">
                          {visual.startingPrice}
                        </span>
                      </div>

                      {/* Bottom Image Info: Next Show Date Tag & City */}
                      <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between text-xs z-10">
                        {dateInfo ? (
                          <span
                            className={`font-semibold px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 ${
                              dateInfo.isToday
                                ? "bg-emerald-500/25 border-emerald-400/40 text-emerald-300"
                                : dateInfo.isTomorrow
                                ? "bg-amber-400/25 border-amber-400/40 text-amber-300"
                                : "bg-surface-950/80 backdrop-blur-md border-white/10 text-slate-200"
                            }`}
                          >
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{dateInfo.fullDateStr}</span>
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-200 bg-surface-950/80 backdrop-blur-md px-2.5 py-0.5 rounded-md border border-white/10">
                            {event.category}
                          </span>
                        )}

                        <span className="text-slate-200 bg-surface-950/80 backdrop-blur-md px-2.5 py-0.5 rounded-md border border-white/10 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-400" />
                          <span>{event.city}</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5">
                      {/* Title */}
                      <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1 font-display">
                        {event.title}
                      </h3>

                      {/* Description */}
                      <p className="mt-2 text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {event.description || visual.tagline}
                      </p>

                      {/* Upcoming Shows / Dates */}
                      <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                        {event.shows && event.shows.length > 0 ? (
                          <>
                            {event.shows.slice(0, 2).map((show) => {
                              const sDate = formatShowDate(show.starts_at);
                              return (
                                <div
                                  key={show.id}
                                  className="flex items-center justify-between text-xs bg-surface-950/70 p-2.5 rounded-xl border border-white/5"
                                >
                                  <span className="text-slate-200 font-medium truncate max-w-[150px]">
                                    {show.venue_name}
                                  </span>
                                  <span className="text-slate-300 font-mono text-[11px] flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-amber-400" />
                                    <span>{sDate.fullDateStr}</span>
                                  </span>
                                </div>
                              );
                            })}
                            {event.shows.length > 2 && (
                              <p className="text-[11px] text-amber-400/90 font-medium text-right pr-1">
                                + {event.shows.length - 2} more upcoming dates
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-slate-400">Show dates to be announced</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Action CTA */}
                  <div className="p-5 pt-0">
                    <Link
                      to={`/events/${event.id}`}
                      className="w-full py-2.5 px-4 flex items-center justify-center gap-2 text-center text-xs font-bold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/20 group-hover:shadow-amber-500/30"
                    >
                      <span>Select Seats in 3D Arena</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
