"use client";

import { useActionState } from 'react';
import { motion } from "motion/react";
import { login } from "@/lib/auth-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden bg-black">
      {/* Ambient Background - no image, pure black with gold glow */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950">
        <div className="login-grid absolute inset-0 opacity-[0.05]" />
        <div className="login-glow absolute -top-1/4 left-1/4 w-[36rem] h-[36rem] rounded-full bg-amber-500/10 blur-[100px]" />
        <div className="login-glow login-glow-delayed absolute bottom-0 right-0 w-[30rem] h-[30rem] rounded-full bg-yellow-600/10 blur-[100px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-8">
        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col items-center gap-4"
        >
          <img src="/logo.png" alt="FlowCart Sync" className="h-20 w-auto" />
          <p className="text-[11px] uppercase tracking-[0.35em] text-amber-100/40 -mt-1">
            Order Management System
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
          className="w-full bg-zinc-900/60 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/50 overflow-hidden border border-amber-500/10"
        >
          {/* Animated Accent Bar */}
          <div className="login-shimmer h-[2px] w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent bg-[length:200%_100%]" />

          {/* Card Header */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-white/5">
            <h2 className="text-2xl font-semibold text-white">Sign In</h2>
            <p className="text-sm text-zinc-400 mt-1.5">
              Enter your credentials to access your account
            </p>
          </div>

          {/* Card Content */}
          <div className="px-8 py-6">
            <form action={formAction} className="grid gap-5">
              {state?.error && (
                <Alert variant="destructive" className="animate-in fade-in duration-300 bg-red-950/40 border-red-500/30 text-red-300 [&>svg]:text-red-300">
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="grid gap-2">
                <label htmlFor="email" className="text-sm font-medium text-zinc-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@company.com"
                    required
                    disabled={isPending}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-white/10 bg-black/30 text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 transition-colors duration-200 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-zinc-300">
                    Password
                  </label>
                  <a href="#" className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    disabled={isPending}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-white/10 bg-black/30 text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 transition-colors duration-200 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 px-4 mt-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 text-black font-semibold rounded-lg shadow-md shadow-amber-500/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>

          {/* Card Footer */}
          <div className="px-8 py-4 bg-black/30 border-t border-white/5 flex items-center justify-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-500/60" />
            <p className="text-xs font-medium text-zinc-500">
              For Authorized Personnel Only
            </p>
          </div>
        </motion.div>
      </div>

      <style jsx global>{`
        @keyframes login-shimmer {
          0% { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes login-glow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        .login-shimmer {
          animation: login-shimmer 5s linear infinite;
        }
        .login-glow {
          animation: login-glow-pulse 10s ease-in-out infinite;
        }
        .login-glow-delayed {
          animation-delay: 3s;
        }
        .login-grid {
          background-image:
            linear-gradient(rgba(245, 197, 24, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245, 197, 24, 0.5) 1px, transparent 1px);
          background-size: 48px 48px;
        }
      `}</style>
    </div>
  );
}
