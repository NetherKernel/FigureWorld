import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { getSupabaseOrdersAdmin } from "@/lib/orders-supabase";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required to access admin orders.");
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Forbidden: Admin or Staff privileges required.");
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") || "ALL";
    const paymentMethodParam = searchParams.get("paymentMethod") || "ALL";
    const paymentStatusParam = searchParams.get("paymentStatus") || "ALL";
    const searchParam = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "50", 10)));

    const result = await getSupabaseOrdersAdmin({
      status: statusParam,
      paymentMethod: paymentMethodParam,
      paymentStatus: paymentStatusParam,
      search: searchParam,
      page,
      limit,
    });

    return apiSuccess(
      {
        orders: result.orders,
        metrics: result.metrics,
      },
      "Admin orders fetched successfully",
      200,
      result.pagination
    );
  } catch (error) {
    return handleApiError(error);
  }
}
