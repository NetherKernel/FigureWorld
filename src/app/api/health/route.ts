import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { apiSuccess } from "@/lib/api-response";
import mongoose from "mongoose";

const startTime = Date.now();

export async function GET() {
  logger.info("Health check endpoint requested");

  let dbConnected = false;
  let dbState = "disconnected";

  try {
    const conn = await connectToDatabase();
    const readyState = conn.connection.readyState;
    const stateMap: Record<number, string> = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };
    dbState = stateMap[readyState] || "unknown";
    dbConnected = readyState === 1;
  } catch (err) {
    logger.warn("Health check: Database connection could not be established", {
      error: err instanceof Error ? err.message : String(err),
    });
    dbConnected = false;
    dbState = "error";
  }

  const payload = {
    status: dbConnected ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    environment: env.NODE_ENV,
    database: {
      connected: dbConnected,
      state: dbState,
      client: "Mongoose " + mongoose.version,
    },
    services: {
      nextServer: "App Router",
      apiVersion: "1.0.0",
      architecture: "Website -> Next.js -> API -> MongoDB",
    },
    registeredModels: Object.keys(mongoose.models),
  };

  return apiSuccess(payload, dbConnected ? "System is operational" : "System operational with degraded database");
}
