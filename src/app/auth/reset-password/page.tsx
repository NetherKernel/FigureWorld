"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Info, Loader2 } from "lucide-react";

const MIN_PASSWORD_LENGTH = 6;

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

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      return;
    }

    if (!token.trim()) {
      setError("Reset token is missing or invalid.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const json = await res.json();
      setIsSubmitting(false);

      if (!res.ok || !json.success) {
        setError(json.error?.message || "Failed to reset password.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
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
          <h1 className="text-[28px] font-normal leading-tight text-fg">Create new password</h1>

          {success ? (
            <div className="mt-4 space-y-4">
              <div role="status" className="flex animate-pop-in gap-3 rounded-xl bg-success-soft p-4 text-success">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-bold">Password changed</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-fg-2">
                    Your password has been updated. Taking you to sign in...
                  </p>
                </div>
              </div>
              <Link href="/auth/login" className="btn btn-primary min-h-10 w-full">
                Sign in now
              </Link>
            </div>
          ) : (
            <>
              <p className="mt-2 text-[13px] leading-5 text-fg-2">
                We&apos;ll ask for this password whenever you sign in.
              </p>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {!tokenFromUrl && (
                  <div>
                    <label htmlFor="reset-token" className="label">
                      Reset code
                    </label>
                    <input
                      id="reset-token"
                      type="text"
                      required
                      autoComplete="one-time-code"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Paste the code from your reset link"
                      className="input h-10 font-mono text-xs"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="reset-password" className="label">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="reset-password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      autoFocus={!!tokenFromUrl}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                      aria-describedby="reset-password-hint"
                      className="input h-10 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-r-lg text-muted transition hover:text-fg"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p id="reset-password-hint" className="mt-1.5 flex items-center gap-1.5 text-xs text-fg-2">
                    <Info className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                    Passwords must be at least {MIN_PASSWORD_LENGTH} characters.
                  </p>
                </div>

                <div>
                  <label htmlFor="reset-confirm" className="label">
                    Re-enter password
                  </label>
                  <input
                    id="reset-confirm"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input h-10"
                  />
                </div>

                <button type="submit" disabled={isSubmitting} className="btn btn-primary min-h-10 w-full">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {isSubmitting ? "Saving..." : "Save changes"}
                </button>
              </form>

              <p className="mt-4 text-xs leading-5 text-fg-2">
                By continuing, you agree to Figure World&apos;s Conditions of Use and Privacy Notice.
              </p>
            </>
          )}
        </div>

        <div className="mt-6 text-center text-[13px] text-fg-2">
          Need a new link?{" "}
          <Link href="/auth/forgot-password" className="link inline-flex min-h-10 items-center">
            Request another &rsaquo;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center bg-bg text-sm text-muted">
          Loading...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
