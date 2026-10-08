import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required to access admin COD console.");
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Forbidden: Admin or Staff privileges required.");
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status")?.toUpperCase();
    const searchParam = searchParams.get("search")?.toLowerCase().trim();

    // Fetch all COD orders from Supabase
    const { data: allCodOrders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("payment_method", "COD")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to load COD orders: ${error.message}`);
    }

    const ordersList = allCodOrders || [];

    // Compute metrics
    let countPendingVerification = 0;
    let countVerified = 0;
    let countDispatched = 0;
    let countRejected = 0;
    let countCancelled = 0;

    for (const o of ordersList) {
      const codSt = o.cod_details?.codStatus || "PENDING_VERIFICATION";
      if (codSt === "PENDING_VERIFICATION") countPendingVerification++;
      else if (codSt === "VERIFIED") countVerified++;
      else if (codSt === "DISPATCHED") countDispatched++;
      else if (codSt === "REJECTED") countRejected++;
      else if (codSt === "CANCELLED") countCancelled++;
    }

    // Filter
    let filteredOrders = ordersList;

    if (statusParam && statusParam !== "ALL") {
      filteredOrders = filteredOrders.filter(
        (o: any) => (o.cod_details?.codStatus || "PENDING_VERIFICATION") === statusParam
      );
    }

    let populated = filteredOrders.map((o: any) => {
      const shippingAddress = o.shipping_address || {};
      const customerDetails = o.customer_details || {};
      return {
        _id: o.id,
        id: o.id,
        orderNumber: o.order_number,
        customerEmail: customerDetails.email || "",
        pricing: o.pricing,
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        orderStatus: o.order_status,
        codDetails: o.cod_details || { codStatus: "PENDING_VERIFICATION", callLogs: [] },
        shippingAddress: {
          fullName: shippingAddress.fullName || customerDetails.name || "",
          phone: shippingAddress.phone || customerDetails.phone || "",
          address: shippingAddress.address || shippingAddress.street || "",
          city: shippingAddress.city || "",
          state: shippingAddress.state || "",
          pinCode: shippingAddress.postalCode || shippingAddress.postal_code || "",
          landmark: shippingAddress.landmark || "",
        },
        notes: o.notes,
        placedAt: o.placed_at || o.created_at,
        createdAt: o.created_at,
      };
    });

    if (searchParam) {
      populated = populated.filter((o) => {
        const num = (o.orderNumber || "").toLowerCase();
        const email = (o.customerEmail || "").toLowerCase();
        const name = (o.shippingAddress?.fullName || "").toLowerCase();
        const phone = (o.shippingAddress?.phone || "").toLowerCase();
        return (
          num.includes(searchParam) ||
          email.includes(searchParam) ||
          name.includes(searchParam) ||
          phone.includes(searchParam)
        );
      });
    }

    return apiSuccess(
      {
        orders: populated,
        metrics: {
          total: ordersList.length,
          pendingVerification: countPendingVerification,
          verified: countVerified,
          dispatched: countDispatched,
          rejected: countRejected,
          cancelled: countCancelled,
        },
      },
      "COD orders fetched successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
