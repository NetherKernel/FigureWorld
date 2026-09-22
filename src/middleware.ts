import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET_BYTES = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-jwt-key-figures-world-dev-secret-12345"
);

const AUTH_COOKIE_NAME = "auth_token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProfileRoute = pathname.startsWith("/profile") || pathname.startsWith("/account");
  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/dashboard");
  const isStaffRoute = pathname.startsWith("/staff");

  if (!isProfileRoute && !isAdminRoute && !isStaffRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
    const role = (payload.role as string) || "CUSTOMER";

    // Admin-only protection
    if (isAdminRoute && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/?error=unauthorized_admin", request.url));
    }

    // Staff/Admin protection
    if (isStaffRoute && role !== "STAFF" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/?error=unauthorized_staff", request.url));
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/profile/:path*",
    "/account/:path*",
    "/admin/:path*",
    "/dashboard/:path*",
    "/staff/:path*",
  ],
};
