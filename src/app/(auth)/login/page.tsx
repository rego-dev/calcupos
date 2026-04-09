"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useActionState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import WelcomeBear from "@/components/WelcomeBear";
import { login } from "@/lib/auth-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";


export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      {/* Animated Bear */}
      <WelcomeBear />
      {/* Background Image & Overlay - Fixed to Viewport */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gray-900" style={{ backgroundImage: 'url(/images/login-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-36 h-36 rounded-full bg-white shadow-2xl overflow-hidden">
            <img
              src="/images/logo.png"
              alt="CalcuPOS Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-5xl font-vintage bg-gradient-to-r from-cyan-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg tracking-wide">
            CalcuPOS
          </h2>
        </div>

        {/* Login Card with Glass Effect */}
        <div className="w-full backdrop-blur-2xl bg-white/20 border border-white/30 rounded-3xl shadow-2xl overflow-hidden">
          {/* Card Header with Gradient Border */}
          <div className="relative px-8 pt-8 pb-6 text-center">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-pink-400 to-cyan-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg mb-2">
              WELCOME CALCUPOS
            </h1>
            <p className="text-white/90 text-sm drop-shadow">
              Welcome! Manage Your Inventory with Ease
            </p>
          </div>

          {/* Card Content */}
          <div className="px-8 pb-6">
            <form action={formAction} className="grid gap-5">
              {state?.error && (
                <Alert variant="destructive" className="bg-red-500/20 border-red-500/50 text-white backdrop-blur-sm">
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}
              {/* Email Field */}
              <div className="grid gap-2">
                <label htmlFor="email" className="text-sm font-semibold text-white drop-shadow">
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    disabled={isPending}
                    className="w-full px-4 py-3 rounded-xl bg-white/20 border-2 border-white/30 text-white placeholder:text-white/60 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20 transition-all backdrop-blur-sm disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-semibold text-white drop-shadow">
                    Password
                  </label>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isPending}
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border-2 border-white/30 text-white placeholder:text-white/60 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20 transition-all backdrop-blur-sm disabled:opacity-50"
                />
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end -mt-2">
                <a href="#" className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors font-medium underline decoration-2 underline-offset-2 drop-shadow">
                  Forgot your password?
                </a>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 px-4 mt-2 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? "Logging in..." : "Login"}
              </button>
            </form>
          </div>

          {/* Card Footer */}
          <div className="px-8 py-5 bg-white/10 border-t border-white/20 text-center backdrop-blur-sm">
            <p className="text-sm text-white/90 drop-shadow font-medium">
              🔒 For Authorized Personnel Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}