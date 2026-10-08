import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required to access admin payments.");
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Forbidden: Admin or Staff privileges required.");
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const searchParam = searchParams.get("search")?.toLowerCase().trim();

    // Fetch all orders with payment details from Supabase
    const { data: allOrders, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to load payments from database: ${error.message}`);
    }

    const ordersList = allOrders || [];

    // Calculate metrics
    let countUnderReview = 0;
    let countPending = 0;
    let countPaid = 0;
    let countFailed = 0;
    let countExpired = 0;
    let countRefunded = 0;

    for (const o of ordersList) {
      const st = (o.payment_status || "").toUpperCase();
      if (st === "UNDER_REVIEW") countUnderReview++;
      else if (st === "PENDING") countPending++;
      else if (st === "PAID") countPaid++;
      else if (st === "FAILED") countFailed++;
      else if (st === "EXPIRED") countExpired++;
      else if (st === "REFUNDED") countRefunded++;
    }

    // Filter
    let filteredOrders = ordersList;

    if (statusParam && statusParam.toUpperCase() !== "ALL") {
      const target = statusParam.toUpperCase();
      filteredOrders = filteredOrders.filter(
        (o: any) => (o.payment_status || "").toUpperCase() === target
      );
    }

    if (searchParam) {
      filteredOrders = filteredOrders.filter((o: any) => {
        const num = (o.order_number || "").toLowerCase();
        const email = (o.customer_details?.email || "").toLowerCase();
        const ref = (o.payment_details?.transactionRef || o.payment_ref || "").toLowerCase();
        return num.includes(searchParam) || email.includes(searchParam) || ref.includes(searchParam);
      });
    }

    const formattedOrders = filteredOrders.map((o: any) => ({
      _id: o.id,
      id: o.id,
      orderNumber: o.order_number,
      customerEmail: o.customer_details?.email,
      pricing: o.pricing,
      paymentMethod: o.payment_method,
      paymentStatus: (o.payment_status || "PENDING").toUpperCase(),
      orderStatus: o.order_status,
      paymentDetails: o.payment_details || (o.payment_ref ? { transactionRef: o.payment_ref } : {}),
      notes: o.notes,
      placedAt: o.placed_at || o.created_at,
      createdAt: o.created_at,
    }));

    return apiSuccess(
      {
        orders: formattedOrders,
        metrics: {
          total: ordersList.length,
          underReview: countUnderReview,
          pending: countPending,
          paid: countPaid,
          failed: countFailed,
          expired: countExpired,
          refunded: countRefunded,
        },
      },
      "Payments fetched successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
