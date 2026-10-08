import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    await requireRole(req, "ADMIN");

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").toLowerCase().trim();
    const action = searchParams.get("action") || "";
    const limit = Math.min(200, parseInt(searchParams.get("limit") || "100", 10));

    let supaQuery = supabase.from("audit_logs").select("*").order("created_at", { ascending: false });
    if (action) {
      supaQuery = supaQuery.eq("action", action);
    }

    const { data: rawLogs, error } = await supaQuery;
    if (error) {
      throw error;
    }

    const mapped = (rawLogs || []).map((l: any) => ({
      _id: l.id,
      id: l.id,
      action: l.action,
      actor: l.actor || {},
      resource: l.resource || {},
      details: l.details || {},
      ipAddress: l.ip_address,
      userAgent: l.user_agent,
      timestamp: l.created_at,
      createdAt: l.created_at,
    }));

    let filtered = mapped;
    if (query) {
      filtered = mapped.filter((log: any) => {
        const email = (log.actor?.email || "").toLowerCase();
        const ident = (log.resource?.identifier || "").toLowerCase();
        const act = (log.action || "").toLowerCase();
        return email.includes(query) || ident.includes(query) || act.includes(query);
      });
    }

    return apiSuccess({
      auditLogs: filtered.slice(0, limit),
      total: filtered.length,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
