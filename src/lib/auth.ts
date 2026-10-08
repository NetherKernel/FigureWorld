import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";
import { UnauthorizedError, ForbiddenError } from "./errors";
import { NextResponse } from "next/server";

export type UserRole = "CUSTOMER" | "STAFF" | "ADMIN" | "DEVELOPER";

export interface AuthTokenPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  [key: string]: unknown;
}

const JWT_SECRET_BYTES = new TextEncoder().encode(env.JWT_SECRET);
export const AUTH_COOKIE_NAME = "auth_token";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signToken(payload: AuthTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET_BYTES);
}

export async function verifyToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
    return payload as unknown as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function extractTokenFromRequest(req: Request): string | null {
  // 1. Check Authorization: Bearer <token>
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  // 2. Check Cookie
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map((c) => {
        const [k, ...v] = c.split("=");
        return [k.trim(), decodeURIComponent(v.join("="))];
      })
    );
    if (cookies[AUTH_COOKIE_NAME]) {
      return cookies[AUTH_COOKIE_NAME];
    }
  }

  return null;
}

export async function getAuthenticatedUser(req: Request): Promise<AuthTokenPayload | null> {
  const token = extractTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(req: Request): Promise<AuthTokenPayload> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    throw new UnauthorizedError("Authentication required. Please sign in.");
  }
  return user;
}

export async function requireRole(req: Request, ...allowedRoles: UserRole[]): Promise<AuthTokenPayload> {
  const user = await requireAuth(req);
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(`Access denied: Requires ${allowedRoles.join(" or ")} role.`);
  }
  return user;
}

export function setAuthCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}

export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
