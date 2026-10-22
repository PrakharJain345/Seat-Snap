import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, Mail, Lock, AlertCircle } from "lucide-react";
import { api, setStoredToken, setStoredUser } from "../api";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.login({ email, password });
      setStoredToken(response.token);
      setStoredUser(response.user);
      navigate("/");
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoCustomer = () => {
    setEmail("customer@seatsnap.com");
    setPassword("CustomerPassword123!");
  };

  const handleQuickDemoAdmin = () => {
    setEmail("admin@seatsnap.com");
    setPassword("AdminPassword123!");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-surface-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-amber-400/10 border border-amber-400/30 rounded-2xl flex items-center justify-center mx-auto mb-3 text-amber-400">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white font-display">Welcome Back</h1>
          <p className="text-xs text-slate-400 mt-1">Sign in to your SeatSnap account</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-950/30 border border-red-900/50 rounded-xl flex items-center gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm rounded-xl shadow-md transition-all duration-200 disabled:opacity-50 mt-6"
          >
            {loading ? "Authenticating..." : "Sign In & Continue"}
          </button>
        </form>

        {/* Quick Demo Credentials Autofill */}
        <div className="mt-6 pt-6 border-t border-slate-800">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-2 text-center">
            Quick Demo Accounts:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleQuickDemoCustomer}
              className="py-1.5 px-2 bg-surface-950 hover:bg-surface-850 border border-slate-800 rounded-lg text-xs text-amber-300 transition-colors"
            >
              Customer Demo
            </button>
            <button
              type="button"
              onClick={handleQuickDemoAdmin}
              className="py-1.5 px-2 bg-surface-950 hover:bg-surface-850 border border-slate-800 rounded-lg text-xs text-slate-300 transition-colors"
            >
              Admin Demo
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Don't have an account?{" "}
          <Link to="/signup" className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
};
