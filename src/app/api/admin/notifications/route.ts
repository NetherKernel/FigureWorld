import { connectToDatabase } from "@/lib/db";
import { NotificationLog } from "@/models/NotificationLog";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required.");
    }
    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Forbidden: Admin or Staff privileges required.");
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("orderNumber");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const channel = searchParams.get("channel");
    const phone = searchParams.get("phone");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (orderNumber) {
      filter.orderNumber = { $regex: new RegExp(orderNumber.trim(), "i") };
    }
    if (status) {
      filter.status = status.toUpperCase();
    }
    if (type) {
      filter.notificationType = type.toUpperCase();
    }
    if (channel) {
      filter.channel = channel.toUpperCase();
    }
    if (phone) {
      filter.recipientPhone = { $regex: new RegExp(phone.trim().replace(/[\+\s]/g, ""), "i") };
    }

    const [logs, totalCount, statsData] = await Promise.all([
      NotificationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      NotificationLog.countDocuments(filter),
      NotificationLog.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const stats = {
      total: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };

    for (const item of statsData) {
      const s = (item._id || "").toUpperCase();
      stats.total += item.count;
      if (s === "SENT") stats.sent = item.count;
      if (s === "DELIVERED") stats.delivered = item.count;
      if (s === "READ") stats.read = item.count;
      if (s === "FAILED") stats.failed = item.count;
    }

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
