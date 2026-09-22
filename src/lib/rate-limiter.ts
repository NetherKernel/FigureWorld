import { NextResponse } from "next/server";

interface RateLimitRecord {
  timestamps: number[];
}

// Global persistence across Next.js dev / hot-reload
declare global {
  // eslint-disable-next-line no-var
  var __figuresWorldRateLimits: Map<string, RateLimitRecord> | undefined;
}

if (!global.__figuresWorldRateLimits) {
  global.__figuresWorldRateLimits = new Map<string, RateLimitRecord>();
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  limit: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const store = global.__figuresWorldRateLimits!;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const cutoff = now - windowMs;

  let record = store.get(key);
  if (!record) {
    record = { timestamps: [] };
    store.set(key, record);
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((ts) => ts > cutoff);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetSeconds,
      limit,
    };
  }

  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);
  return {
    allowed: true,
    remaining,
    resetSeconds: windowSeconds,
    limit,
  };
}

export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const response = NextResponse.json(
    {
      success: false,
      error: {
        code: "ERR_RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please slow down and try again later.",
        details: { retryAfterSeconds: result.resetSeconds },
      },
      timestamp: new Date().toISOString(),
    },
    { status: 429 }
  );

  response.headers.set("Retry-After", result.resetSeconds.toString());
  response.headers.set("X-RateLimit-Limit", result.limit.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", result.resetSeconds.toString());

  return response;
}
