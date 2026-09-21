import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required to access admin payments.");
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Forbidden: Admin or Staff privileges required.");
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const searchParam = searchParams.get("search")?.toLowerCase().trim();

    // Fetch all orders with payment details
    const allOrders = await Order.find({}).sort({ createdAt: -1 });

    // Calculate metrics
    let countUnderReview = 0;
    let countPending = 0;
    let countPaid = 0;
    let countFailed = 0;
    let countExpired = 0;
    let countRefunded = 0;

    for (const o of allOrders) {
      const st = (o.paymentStatus || "").toUpperCase();
      if (st === "UNDER_REVIEW") countUnderReview++;
      else if (st === "PENDING") countPending++;
      else if (st === "PAID") countPaid++;
      else if (st === "FAILED") countFailed++;
      else if (st === "EXPIRED") countExpired++;
      else if (st === "REFUNDED") countRefunded++;
    }

    // Filter
    let filteredOrders = allOrders;

    if (statusParam && statusParam.toUpperCase() !== "ALL") {
      const target = statusParam.toUpperCase();
      filteredOrders = filteredOrders.filter(
        (o: any) => (o.paymentStatus || "").toUpperCase() === target
      );
    }

    if (searchParam) {
      filteredOrders = filteredOrders.filter((o: any) => {
        const num = (o.orderNumber || "").toLowerCase();
        const email = (o.customerEmail || "").toLowerCase();
        const ref = (o.paymentDetails?.transactionRef || "").toLowerCase();
        return num.includes(searchParam) || email.includes(searchParam) || ref.includes(searchParam);
      });
    }

    const formattedOrders = filteredOrders.map((o: any) => ({
      _id: o._id,
      orderNumber: o.orderNumber,
      customerEmail: o.customerEmail,
      pricing: o.pricing,
      paymentMethod: o.paymentMethod,
      paymentStatus: (o.paymentStatus || "PENDING").toUpperCase(),
      orderStatus: o.orderStatus,
      paymentDetails: o.paymentDetails || {},
      notes: o.notes,
      placedAt: o.placedAt || o.createdAt,
      createdAt: o.createdAt,
    }));

    return apiSuccess(
      {
        orders: formattedOrders,
        metrics: {
          total: allOrders.length,
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
