import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Ticket, User as UserIcon, LogOut, Sparkles } from "lucide-react";
import { getStoredUser, clearAuth } from "../api";

export const Navbar: React.FC = () => {
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-2xl bg-surface-950/80 border-b border-white/[0.08] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-black flex items-center justify-center font-extrabold shadow-md shadow-amber-500/20 group-hover:scale-105 transition-all">
            <Ticket className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold font-display text-white tracking-tight leading-none group-hover:text-amber-300 transition-colors">
              SeatSnap
            </span>
            <span className="text-[10px] font-mono tracking-wider text-amber-400/80 font-semibold leading-tight">
              3D LIVE ARENA
            </span>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="flex items-center gap-3 sm:gap-6">
          <Link
            to="/"
            className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            All Events
          </Link>

          {user && (
            <Link
              to="/my-bookings"
              className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-amber-300 transition-colors flex items-center gap-1.5"
            >
              <Ticket className="w-4 h-4 text-amber-400" />
              <span>My Tickets</span>
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-surface-900/90 border border-white/10 rounded-full text-xs text-slate-200">
                <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-slate-300 max-w-[140px] truncate">{user.email}</span>
                {user.role === "admin" && (
                  <span className="bg-amber-400 text-black text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase">
                    ADMIN
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-surface-900/80 hover:bg-surface-850 border border-white/10 rounded-xl transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-1.5 text-xs sm:text-sm font-bold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/20"
              >
                Sign Up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
