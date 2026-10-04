"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/ui/Logo";
import { Eye, EyeOff, AlertCircle, ChevronRight, Loader2 } from "lucide-react";

/** Only allow same-origin relative paths as post-login destinations (prevents open redirects). */
function safeRedirect(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

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

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect = safeRedirect(searchParams.get("redirect"));
  const redirect = requestedRedirect || "/profile";
  const registerHref = requestedRedirect
    ? `/auth/register?redirect=${encodeURIComponent(requestedRedirect)}`
    : "/auth/register";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      router.push(redirect);
    } else {
      setError(result.error || "Failed to sign in. Please verify your credentials.");
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="flex flex-col items-center bg-bg px-4 pb-12 pt-6 sm:pt-10">
      <Logo size="lg" />

      <div className="mt-6 w-full max-w-[360px] animate-fade-up">
        {error && <ProblemAlert message={error} />}

        <div className="card p-6">
          <h1 className="text-[28px] font-normal leading-tight text-fg">Sign in</h1>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="login-email" className="label">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input h-10"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="login-password" className="label">
                  Password
                </label>
                <Link href="/auth/forgot-password" className="link text-[13px]">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>

            <button type="submit" disabled={isSubmitting} className="btn btn-primary min-h-10 w-full">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-xs leading-5 text-fg-2">
            By continuing, you agree to Figure World&apos;s Conditions of Use and Privacy Notice.
          </p>

          <details className="group mt-4 border-t border-line pt-3">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1 text-[13px] text-fg-2 hover:text-fg [&::-webkit-details-marker]:hidden">
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
              Demo accounts
            </summary>
            <div className="animate-fade-in pb-1 pt-1">
              <p className="text-xs text-muted">Fill in a sample account to explore the store.</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo("customer@figuresworld.com", "Customer@123456")}
                  className="btn btn-secondary btn-sm min-h-10 px-2"
                >
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo("staff@figuresworld.com", "Staff@123456")}
                  className="btn btn-secondary btn-sm min-h-10 px-2"
                >
                  Staff
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo("admin@figuresworld.com", "Admin@123456")}
                  className="btn btn-secondary btn-sm min-h-10 px-2"
                >
                  Admin
                </button>
              </div>
            </div>
          </details>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs text-muted">New to Figure World?</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <Link href={registerHref} className="btn btn-secondary mt-3 min-h-10 w-full">
          Create your Figure World account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center bg-bg text-sm text-muted">
          Loading sign in...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
