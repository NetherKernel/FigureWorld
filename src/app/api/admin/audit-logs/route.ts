import { connectToDatabase } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    await requireRole(req, "ADMIN");
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").toLowerCase().trim();
    const action = searchParams.get("action") || "";
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "50", 10));

    const filter: Record<string, unknown> = {};
    if (action) {
      filter.action = action;
    }

    const logs = await AuditLog.find(filter).sort({ timestamp: -1 });

    let filtered = logs;
    if (query) {
      filtered = logs.filter((log: any) => {
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
