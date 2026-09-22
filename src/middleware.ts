import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { checkRateLimit, createRateLimitResponse, getClientIp } from "./lib/rate-limiter";
import { verifyCsrfOrigin, applySecurityHeaders } from "./lib/security";

const JWT_SECRET_BYTES = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-jwt-key-figures-world-dev-secret-12345"
);

const AUTH_COOKIE_NAME = "auth_token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  const isLoopback = ip === "127.0.0.1" || ip === "::1" || ip === "localhost";

  // 1. Rate Limiting on Sensitive Endpoints
  if (pathname.startsWith("/api/auth/login") && request.method === "POST") {
    const limit = isLoopback ? 200 : 15;
    const rateCheck = checkRateLimit(`login_${ip}`, limit, 60); // 15 req/min
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }
  }

  if (pathname.startsWith("/api/checkout") && request.method === "POST") {
    const limit = isLoopback ? 200 : 25;
    const rateCheck = checkRateLimit(`checkout_${ip}`, limit, 60); // 25 req/min
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }
  }

  if (pathname.startsWith("/api/upload") && request.method === "POST") {
    const limit = isLoopback ? 200 : 20;
    const rateCheck = checkRateLimit(`upload_${ip}`, limit, 60); // 20 req/min
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }
  }

  // 2. CSRF Defense for Cookie-Authenticated Mutations
  if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    if (!verifyCsrfOrigin(request)) {
      const csrfError = NextResponse.json(
        {
          success: false,
          error: {
            code: "ERR_CSRF_REJECTED",
            message: "Cross-Site Request Forgery (CSRF) protection rejected this request origin.",
          },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
      applySecurityHeaders(csrfError.headers);
      return csrfError;
    }
  }

  // 3. Role-Based Access Control on Protected Routes
  const isProfileRoute = pathname.startsWith("/profile") || pathname.startsWith("/account");
  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/dashboard");
  const isStaffRoute = pathname.startsWith("/staff");

  if (!isProfileRoute && !isAdminRoute && !isStaffRoute) {
    const response = NextResponse.next();
    applySecurityHeaders(response.headers);
    return response;
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    applySecurityHeaders(redirectResponse.headers);
    return redirectResponse;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
    const role = (payload.role as string) || "CUSTOMER";

    // Admin-only protection
    if (isAdminRoute && role !== "ADMIN") {
      const redirectResponse = NextResponse.redirect(new URL("/?error=unauthorized_admin", request.url));
      applySecurityHeaders(redirectResponse.headers);
      return redirectResponse;
    }

    // Staff/Admin protection
    if (isStaffRoute && role !== "STAFF" && role !== "ADMIN") {
      const redirectResponse = NextResponse.redirect(new URL("/?error=unauthorized_staff", request.url));
      applySecurityHeaders(redirectResponse.headers);
      return redirectResponse;
    }

    const response = NextResponse.next();
    applySecurityHeaders(response.headers);
    return response;
  } catch {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    applySecurityHeaders(redirectResponse.headers);
    return redirectResponse;
  }
}

export const config = {
  matcher: [
    "/profile/:path*",
    "/account/:path*",
    "/admin/:path*",
    "/dashboard/:path*",
    "/staff/:path*",
    "/api/:path*",
  ],
};
