"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

function ProblemAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-4 flex animate-pop-in gap-3 rounded-xl border border-brand/30 bg-brand-soft p-4 text-brand-ink"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-bold">There was a problem</p>
        <p className="mt-0.5 text-[13px] leading-5 text-fg-2">{message}</p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
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

      // The API returns success without a token when no account matches (to avoid
      // account enumeration) — still confirm to the user so the form doesn't look stuck.
      setSent(true);
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
    <div className="flex flex-col items-center bg-bg px-4 pb-12 pt-6 sm:pt-10">
      <Logo size="lg" />

      <div className="mt-6 w-full max-w-[360px] animate-fade-up">
        {error && <ProblemAlert message={error} />}

        <div className="card p-6">
          <h1 className="text-[28px] font-normal leading-tight text-fg">Password assistance</h1>

          {sent ? (
            <div className="mt-4 space-y-4">
              <div role="status" className="flex animate-pop-in gap-3 rounded-xl bg-success-soft p-4 text-success">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-bold">Check your next step</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-fg-2">
                    {resetToken
                      ? "A password reset link has been created for your account. It is valid for 1 hour."
                      : `If an account exists for ${email}, password reset instructions have been sent.`}
                  </p>
                </div>
              </div>

              {resetToken && (
                <>
                  {resetUrl && (
                    <div className="rounded-lg border border-line bg-surface-2 p-2.5 font-mono text-[11px] leading-4 text-fg-2 break-all">
                      {resetUrl}
                    </div>
                  )}
                  <Link
                    href={`/auth/reset-password?token=${resetToken}`}
                    className="btn btn-primary min-h-10 w-full"
                  >
                    Continue to reset password
                  </Link>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="mt-2 text-[13px] leading-5 text-fg-2">
                Enter the email address associated with your Figure World account.
              </p>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="label">
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input h-10"
                  />
                </div>

                <button type="submit" disabled={isSubmitting} className="btn btn-primary min-h-10 w-full">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {isSubmitting ? "Please wait..." : "Continue"}
                </button>
              </form>

              <p className="mt-4 text-xs leading-5 text-fg-2">
                By continuing, you agree to Figure World&apos;s Conditions of Use and Privacy Notice.
              </p>
            </>
          )}
        </div>

        <div className="mt-6 text-center text-[13px] text-fg-2">
          Remember your password?{" "}
          <Link href="/auth/login" className="link inline-flex min-h-10 items-center">
            Sign in &rsaquo;
          </Link>
        </div>
      </div>
    </div>
  );
}
