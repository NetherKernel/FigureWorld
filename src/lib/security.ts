import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "./auth";

/**
 * Validates Origin and Referer headers for state-changing requests using cookie authentication
 * to defend against Cross-Site Request Forgery (CSRF).
 */
export function verifyCsrfOrigin(req: Request): boolean {
  const method = req.method.toUpperCase();

  // Safe HTTP methods do not require CSRF protection
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  // If request does not carry session cookie, CSRF does not apply (e.g. Bearer auth)
  const cookieHeader = req.headers.get("cookie") || "";
  if (!cookieHeader.includes(AUTH_COOKIE_NAME)) {
    return true;
  }

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");

  if (!origin && !referer) {
    // Non-browser or direct curl/script request with cookie
    return true;
  }

  const expectedHost = host || "localhost:3000";

  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host === expectedHost || originUrl.hostname === "localhost") {
        return true;
      }
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host === expectedHost || refererUrl.hostname === "localhost") {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Sanitizes input values against NoSQL / MongoDB operator injection.
 * Strips any object keys starting with '$' (e.g. $where, $gt, $ne, $regex)
 * or containing dots (prototype pollution).
 */
export function sanitizeMongoQuery<T>(input: T): T {
  if (input === null || typeof input !== "object") {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeMongoQuery(item)) as unknown as T;
  }

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (key.startsWith("$") || key.includes(".")) {
      continue; // Block operator injection key
    }
    cleaned[key] = sanitizeMongoQuery(value);
  }

  return cleaned as T;
}

/**
 * Injects hardened enterprise security headers into HTTP response.
 */
export function applySecurityHeaders(headers: Headers): void {
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("X-DNS-Prefetch-Control", "on");

  // In production, enforce Strict-Transport-Security (HSTS)
  if (process.env.NODE_ENV === "production") {
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
}
