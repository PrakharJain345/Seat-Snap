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
              <Route path="/shows/:id" element={<ShowPage />} />
              <Route path="/my-bookings" element={<MyBookingsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
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
