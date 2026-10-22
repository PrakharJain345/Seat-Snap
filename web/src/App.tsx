import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navbar } from "./components/Navbar";
import { HomePage } from "./pages/HomePage";
import { EventDetailsPage } from "./pages/EventDetailsPage";
import { ShowPage } from "./pages/ShowPage";
import { MyBookingsPage } from "./pages/MyBookingsPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { ShieldCheck, Timer, Smartphone } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-surface-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-black">
          <Navbar />
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/events/:id" element={<EventDetailsPage />} />
              <Route path="/shows/:id" element={<ShowPage />} />
              <Route path="/my-bookings" element={<MyBookingsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Routes>
          </div>
          <footer className="border-t border-slate-900 bg-surface-950 py-8 px-4 text-xs text-slate-400">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">
                  SeatSnap
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">Real-Time Reserved Seating Platform</span>
              </div>
              <div className="flex items-center gap-6 text-[11px] text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Verified Tickets</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-amber-400" />
                  <span>5-Minute Cart Lock</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span>Digital Mobile Entry</span>
                </span>
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
