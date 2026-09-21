import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { Address } from "@/models/Address";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required to access admin COD console.");
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Forbidden: Admin or Staff privileges required.");
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status")?.toUpperCase();
    const searchParam = searchParams.get("search")?.toLowerCase().trim();

    // Fetch all COD orders
    const allCodOrders = await Order.find({ paymentMethod: "COD" }).sort({ createdAt: -1 });

    // Compute metrics
    let countPendingVerification = 0;
    let countVerified = 0;
    let countDispatched = 0;
    let countRejected = 0;
    let countCancelled = 0;

    for (const o of allCodOrders) {
      const codSt = o.codDetails?.codStatus || "PENDING_VERIFICATION";
      if (codSt === "PENDING_VERIFICATION") countPendingVerification++;
      else if (codSt === "VERIFIED") countVerified++;
      else if (codSt === "DISPATCHED") countDispatched++;
      else if (codSt === "REJECTED") countRejected++;
      else if (codSt === "CANCELLED") countCancelled++;
    }

    // Filter
    let filteredOrders = allCodOrders;

    if (statusParam && statusParam !== "ALL") {
      filteredOrders = filteredOrders.filter(
        (o: any) => (o.codDetails?.codStatus || "PENDING_VERIFICATION") === statusParam
      );
    }

    // Populate address details
    const populated = await Promise.all(
      filteredOrders.map(async (o: any) => {
        let shippingAddress = null;
        if (o.shippingAddress) {
          shippingAddress = await Address.findById(o.shippingAddress);
        }
        return {
          _id: o._id,
          orderNumber: o.orderNumber,
          customerEmail: o.customerEmail,
          pricing: o.pricing,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus,
          orderStatus: o.orderStatus,
          codDetails: o.codDetails || { codStatus: "PENDING_VERIFICATION", callLogs: [] },
          shippingAddress: shippingAddress
            ? {
                fullName: shippingAddress.fullName,
                phone: shippingAddress.phone,
                address: shippingAddress.streetLine1,
                city: shippingAddress.city,
                state: shippingAddress.state,
                pinCode: shippingAddress.postalCode,
                landmark: shippingAddress.landmark,
              }
            : null,
          notes: o.notes,
          placedAt: o.placedAt || o.createdAt,
          createdAt: o.createdAt,
        };
      })
    );

    let finalOrders = populated;
    if (searchParam) {
      finalOrders = populated.filter((o) => {
        const num = (o.orderNumber || "").toLowerCase();
        const email = (o.customerEmail || "").toLowerCase();
        const name = (o.shippingAddress?.fullName || "").toLowerCase();
        const phone = (o.shippingAddress?.phone || "").toLowerCase();
        return num.includes(searchParam) || email.includes(searchParam) || name.includes(searchParam) || phone.includes(searchParam);
      });
    }

    return apiSuccess(
      {
        orders: finalOrders,
        metrics: {
          total: allCodOrders.length,
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
