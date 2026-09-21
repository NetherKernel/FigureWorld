"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, Layers, AlertCircle, CheckCircle2, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();
      setIsSubmitting(false);

      if (!res.ok || !json.success) {
        setError(json.error?.message || "Failed to process request.");
        return;
      }

      if (json.data?.resetToken) {
        setResetToken(json.data.resetToken);
        setResetUrl(json.data.resetUrl);
      }
    } catch {
      setIsSubmitting(false);
      setError("Network error occurred.");
    }
  };

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Forgot Password
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Enter your registered email address to receive a secure password reset link
          </p>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resetToken ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs dark:border-emerald-800/40 dark:bg-emerald-950/40">
              <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                <span>Password Reset Link Generated!</span>
              </div>
              <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                A 1-hour secure cryptographic token has been generated. Use the link below to set your new password.
              </p>
              <div className="mt-3 p-2 rounded-lg bg-white/80 dark:bg-slate-900 font-mono text-[10px] break-all border border-emerald-200/60 dark:border-slate-800">
                {resetUrl}
              </div>
            </div>

            <Link
              href={`/auth/reset-password?token=${resetToken}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700"
            >
              <span>Click to Reset Password Now</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Account Email
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {isSubmitting ? "Generating token..." : "Send Reset Instructions"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          Remember your password?{" "}
          <Link href="/auth/login" className="font-bold text-indigo-600 hover:underline dark:text-indigo-400">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
