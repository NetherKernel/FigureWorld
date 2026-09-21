import { NextResponse } from "next/server";
import { AppError } from "./errors";
import { logger } from "./logger";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
  error?: {
    code?: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export function apiSuccess<T>(data: T, message = "Success", statusCode = 200, meta?: ApiResponse["meta"]): NextResponse {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: statusCode });
}

export function apiError(message: string, statusCode = 500, details?: unknown, code?: string): NextResponse {
  const body: ApiResponse = {
    success: false,
    error: {
      code: code || `ERR_${statusCode}`,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: statusCode });
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof AppError) {
    logger.warn(`Operational error: ${err.message}`, { statusCode: err.statusCode, details: err.details });
    return apiError(err.message, err.statusCode, err.details);
  }

  const message = err instanceof Error ? err.message : "Internal Server Error";
  logger.error(`Unhandled server error: ${message}`, undefined, err);

  return apiError(
    process.env.NODE_ENV === "production" ? "An unexpected error occurred" : message,
    500,
    process.env.NODE_ENV === "production" ? undefined : err
  );
}
