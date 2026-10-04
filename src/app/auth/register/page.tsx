"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/ui/Logo";
import { AlertCircle, Eye, EyeOff, Info, Loader2 } from "lucide-react";

const MIN_PASSWORD_LENGTH = 6;

/** Only allow same-origin relative paths as post-signup destinations (prevents open redirects). */
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

function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect = safeRedirect(searchParams.get("redirect"));
  const loginHref = requestedRedirect
    ? `/auth/login?redirect=${encodeURIComponent(requestedRedirect)}`
    : "/auth/login";

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

    setIsSubmitting(true);
    const result = await register(name, email, password, phone);
    setIsSubmitting(false);

    if (result.success) {
      router.push(requestedRedirect || "/profile");
    } else {
      setError(result.error || "Failed to create account. Please check your details.");
    }
  };

  return (
    <div className="flex flex-col items-center bg-bg px-4 pb-12 pt-6 sm:pt-10">
      <Logo size="lg" />

      <div className="mt-6 w-full max-w-[360px] animate-fade-up">
        {error && <ProblemAlert message={error} />}

        <div className="card p-6">
          <h1 className="text-[28px] font-normal leading-tight text-fg">Create account</h1>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="register-name" className="label">
                Your name
              </label>
              <input
                id="register-name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First and last name"
                className="input h-10"
              />
            </div>

            <div>
              <label htmlFor="register-phone" className="label">
                Mobile number <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="register-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input h-10"
              />
            </div>

            <div>
              <label htmlFor="register-email" className="label">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input h-10"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  aria-describedby="register-password-hint"
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
              <p id="register-password-hint" className="mt-1.5 flex items-center gap-1.5 text-xs text-fg-2">
                <Info className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                Passwords must be at least {MIN_PASSWORD_LENGTH} characters.
              </p>
            </div>

            <div>
              <label htmlFor="register-confirm" className="label">
                Re-enter password
              </label>
              <input
                id="register-confirm"
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
              {isSubmitting ? "Creating account..." : "Create your Figure World account"}
            </button>
          </form>

          <p className="mt-4 text-xs leading-5 text-fg-2">
            By continuing, you agree to Figure World&apos;s Conditions of Use and Privacy Notice.
          </p>

          <div className="mt-5 border-t border-line pt-4 text-[13px] text-fg-2">
            Already have an account?{" "}
            <Link href={loginHref} className="link inline-flex min-h-10 items-center">
              Sign in &rsaquo;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center bg-bg text-sm text-muted">
          Loading...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
