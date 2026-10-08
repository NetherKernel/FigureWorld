import { supabase } from "@/lib/supabase";
import { AuthTokenPayload } from "./auth";
import { getClientIp } from "./rate-limiter";
import { logger } from "./logger";

export interface LogAuditOptions {
  action: string;
  actor: {
    userId: string;
    email: string;
    name: string;
    role: string;
  } | AuthTokenPayload;
  resource: {
    type: string;
    id?: string;
    identifier?: string;
  };
  details?: Record<string, unknown>;
  req?: Request;
}

export async function logAdminAudit(options: LogAuditOptions): Promise<void> {
  try {
    const ipAddress = options.req ? getClientIp(options.req) : "127.0.0.1";
    const userAgent = options.req ? options.req.headers.get("user-agent") || "" : "";

    await supabase.from("audit_logs").insert({
      action: options.action,
      actor: {
        userId: options.actor.userId,
        email: options.actor.email,
        name: options.actor.name,
        role: options.actor.role,
      },
      resource: options.resource,
      details: options.details || {},
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    logger.info(`[AUDIT] ${options.actor.email} performed ${options.action}`, {
      resource: options.resource,
      ipAddress,
    });
  } catch (err) {
    logger.error("Failed to write admin audit log:", undefined, err);
  }
}
