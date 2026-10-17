import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navbar } from "./components/Navbar";
import { HomePage } from "./pages/HomePage";
import { EventDetailsPage } from "./pages/EventDetailsPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";

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
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
          <Navbar />
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/events/:id" element={<EventDetailsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route
                path="/shows/:id"
                element={
                  <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Interactive Seat Map</h2>
                    <p className="text-slate-400 mb-6">Seat map selection & atomic holds arrive in Phase 2.</p>
                    <Link to="/" className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">
                      Back to Events
                    </Link>
                  </div>
                }
              />
              <Route
                path="/my-bookings"
                element={
                  <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">My Bookings</h2>
                    <p className="text-slate-400 mb-6">Booking history and QR ticket viewing available in Phase 6.</p>
                    <Link to="/" className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">
                      Back to Events
                    </Link>
                  </div>
                }
              />
            </Routes>
          </div>
          <footer className="border-t border-slate-900 bg-slate-950/80 py-8 text-center text-xs text-slate-400">
            <p>SeatSnap MVP — High Concurrency Seat Hold & Ticketing Engine</p>
          </footer>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
