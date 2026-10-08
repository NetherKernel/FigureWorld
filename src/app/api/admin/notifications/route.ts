import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { mapNotificationLog } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required.");
    }
    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Forbidden: Admin or Staff privileges required.");
    }

    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("orderNumber");
    const status = searchParams.get("status");
    const channel = searchParams.get("channel");
    const phone = searchParams.get("phone");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const skip = (page - 1) * limit;

    let query = supabase.from("notification_logs").select("*", { count: "exact" });

    if (orderNumber) {
      query = query.ilike("order_number", `%${orderNumber.trim()}%`);
    }
    if (status) {
      query = query.eq("status", status.toUpperCase());
    }
    if (channel) {
      query = query.eq("channel", channel.toUpperCase());
    }
    if (phone) {
      query = query.ilike("recipient", `%${phone.trim()}%`);
    }

    const { data: rawLogs, count, error } = await query
      .order("created_at", { ascending: false })
      .range(skip, skip + limit - 1);

    if (error) {
      throw new Error(`Failed to load notification logs: ${error.message}`);
    }

    const totalCount = count || 0;
    const logs = (rawLogs || []).map(mapNotificationLog);

    // Compute status stats
    const { data: allLogs } = await supabase.from("notification_logs").select("status");
    const stats = {
      total: allLogs?.length || 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };

    (allLogs || []).forEach((row: any) => {
      const s = (row.status || "").toUpperCase();
      if (s === "SENT") stats.sent++;
      else if (s === "DELIVERED") stats.delivered++;
      else if (s === "READ") stats.read++;
      else if (s === "FAILED") stats.failed++;
    });

    return apiSuccess({
      notifications: logs,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      stats,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
