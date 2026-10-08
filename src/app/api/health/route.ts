import { logger } from "@/lib/logger";
import { apiSuccess } from "@/lib/api-response";
import { supabase } from "@/lib/supabase";
import { env } from "@/lib/env";

const startTime = Date.now();

export async function GET() {
  logger.info("Health check endpoint requested");

  let supabaseConnected = false;
  let latencyMs = 0;
  try {
    const t0 = Date.now();
    const { error } = await supabase.from("products").select("id", { count: "exact", head: true });
    latencyMs = Date.now() - t0;
    supabaseConnected = !error;
  } catch {
    supabaseConnected = false;
  }

  const payload = {
    status: supabaseConnected ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    environment: env.NODE_ENV,
    database: {
      supabase: {
        connected: supabaseConnected,
        provider: "Supabase PostgreSQL",
        url: "https://jcafygcduqekgoaixddo.supabase.co",
        latencyMs,
      },
    },
    services: {
      nextServer: "App Router",
      apiVersion: "1.0.0",
      architecture: "Website -> Next.js -> Supabase PostgreSQL",
    },
  };

  return apiSuccess(payload, supabaseConnected ? "System is operational" : "Database connection degraded");
}
