import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { checkRateLimit, createRateLimitResponse, getClientIp } from "./lib/rate-limiter";
import { verifyCsrfOrigin, applySecurityHeaders } from "./lib/security";
import { backofficeHome, isAllowedForRole } from "./lib/backoffice";

const JWT_SECRET_BYTES = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-jwt-key-figures-world-dev-secret-12345"
);

const AUTH_COOKIE_NAME = "auth_token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  const isLoopback = ip === "127.0.0.1" || ip === "::1" || ip === "localhost" || ip === "::ffff:127.0.0.1" || ip.endsWith("127.0.0.1");

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

  // 3. Role-based routing for pages (API routes check auth themselves)
  const next = () => {
    const response = NextResponse.next();
    applySecurityHeaders(response.headers);
    return response;
  };
  const redirectTo = (url: URL) => {
    const response = NextResponse.redirect(url);
    applySecurityHeaders(response.headers);
    return response;
  };

  if (pathname.startsWith("/api/")) return next();

  const isProfileRoute = pathname.startsWith("/profile") || pathname.startsWith("/account");
  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/dashboard");
  const isStaffRoute = pathname.startsWith("/staff");
  const isDeveloperRoute = pathname.startsWith("/developer");
  const isProtected = isProfileRoute || isAdminRoute || isStaffRoute || isDeveloperRoute;

  let role: string | null = null;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
      role = (payload.role as string) || "CUSTOMER";
    } catch {
      role = null; // expired / tampered: treat as signed out
    }
  }

  if (!role) {
    if (!isProtected) return next();
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return redirectTo(loginUrl);
  }

  // Admin, staff and developer accounts only use their own dashboard — any storefront page
  // (homepage, products, cart, checkout, account) or another role's dashboard sends them home.
  const home = backofficeHome(role);
  if (home) {
    return isAllowedForRole(role, pathname) ? next() : redirectTo(new URL(home, request.url));
  }

  // Customers can't open any dashboard
  if (isAdminRoute) return redirectTo(new URL("/?error=unauthorized_admin", request.url));
  if (isStaffRoute) return redirectTo(new URL("/?error=unauthorized_staff", request.url));
  if (isDeveloperRoute) return redirectTo(new URL("/?error=unauthorized_developer", request.url));
  return next();
}

export const config = {
  matcher: [
    // Every page (role routing) — skips Next internals and static files like images, CSS and JS
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)",
    "/api/:path*",
  ],
};
