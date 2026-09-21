import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { Address } from "@/models/Address";
import { OrderItem } from "@/models/OrderItem";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required to access admin orders.");
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Forbidden: Admin or Staff privileges required.");
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") || "ALL";
    const paymentMethodParam = searchParams.get("paymentMethod") || "ALL";
    const paymentStatusParam = searchParams.get("paymentStatus") || "ALL";
    const searchParam = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "50", 10)));

    const query: any = {};

    // 1. Status Filter
    if (statusParam && statusParam !== "ALL") {
      const upperStatus = statusParam.toUpperCase();
      // Handle status mapping & aliases
      if (upperStatus === "PENDING_PAYMENT") {
        query.orderStatus = { $in: ["PENDING_PAYMENT", "pending"] };
      } else if (upperStatus === "CONFIRMED") {
        query.orderStatus = { $in: ["CONFIRMED", "confirmed"] };
      } else if (upperStatus === "PROCESSING") {
        query.orderStatus = { $in: ["PROCESSING", "processing"] };
      } else if (upperStatus === "DISPATCHED") {
        query.orderStatus = { $in: ["DISPATCHED", "shipped"] };
      } else if (upperStatus === "DELIVERED") {
        query.orderStatus = { $in: ["DELIVERED", "delivered"] };
      } else if (upperStatus === "CANCELLED") {
        query.orderStatus = { $in: ["CANCELLED", "cancelled"] };
      } else if (upperStatus === "REFUNDED") {
        query.orderStatus = { $in: ["REFUNDED", "refunded"] };
      } else {
        query.orderStatus = upperStatus;
      }
    }

    // 2. Payment Method Filter
    if (paymentMethodParam && paymentMethodParam !== "ALL") {
      query.paymentMethod = paymentMethodParam.toUpperCase();
    }

    // 3. Payment Status Filter
    if (paymentStatusParam && paymentStatusParam !== "ALL") {
      const upperPStatus = paymentStatusParam.toUpperCase();
      query.paymentStatus = { $in: [upperPStatus, upperPStatus.toLowerCase()] };
    }

    // 4. Search Filter
    if (searchParam) {
      const searchRegex = new RegExp(searchParam, "i");

      // Search matching shipping addresses first
      const matchingAddresses = await Address.find({
        $or: [
          { fullName: searchRegex },
          { phone: searchRegex },
          { streetLine1: searchRegex },
          { city: searchRegex },
          { postalCode: searchRegex },
        ],
      }).select("_id");

      const matchingAddressIds = matchingAddresses.map((a) => a._id);

      query.$or = [
        { orderNumber: searchRegex },
        { customerEmail: searchRegex },
        { "shipmentDetails.trackingNumber": searchRegex },
        { "shipmentDetails.courier": searchRegex },
        { "codDetails.trackingNumber": searchRegex },
        { "paymentDetails.transactionRef": searchRegex },
        { shippingAddress: { $in: matchingAddressIds } },
      ];
    }

    // 5. Total count for pagination
    const totalCount = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit) || 1;

    // 6. Fetch Orders
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("shippingAddress")
      .populate({
        path: "customer",
        select: "name email phone role",
      })
      .lean();

    // Fetch items summary for each order
    const formattedOrders = await Promise.all(
      orders.map(async (order: any) => {
        const items = await OrderItem.find({ order: order._id })
          .select("productTitle productSku productImage unitPrice quantity total")
          .lean();

        // Harmonize shipment details (fallback to codDetails if COD and shipmentDetails not populated)
        const courier =
          order.shipmentDetails?.courier ||
          order.codDetails?.courierPartner ||
          "";
        const trackingNumber =
          order.shipmentDetails?.trackingNumber ||
          order.codDetails?.trackingNumber ||
          "";

        return {
          _id: order._id.toString(),
          orderNumber: order.orderNumber,
          customerEmail: order.customerEmail,
          customer: order.customer
            ? {
                name: order.customer.name,
                email: order.customer.email,
                phone: order.customer.phone,
              }
            : null,
          shippingAddress: order.shippingAddress
            ? {
                fullName: order.shippingAddress.fullName,
                phone: order.shippingAddress.phone,
                address: order.shippingAddress.streetLine1,
                landmark: order.shippingAddress.landmark,
                city: order.shippingAddress.city,
                state: order.shippingAddress.state,
                pinCode: order.shippingAddress.postalCode,
                country: order.shippingAddress.country,
              }
            : null,
          itemsCount: items.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0),
          items: items.map((it: any) => ({
            name: it.productTitle,
            sku: it.productSku,
            image: it.productImage,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            total: it.total,
          })),
          pricing: order.pricing,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          shipment: {
            courier,
            trackingNumber,
            trackingUrl: order.shipmentDetails?.trackingUrl || "",
            dispatchedAt: order.shipmentDetails?.dispatchedAt || order.codDetails?.dispatchedAt || null,
          },
          placedAt: order.placedAt || order.createdAt,
          createdAt: order.createdAt,
        };
      })
    );

    // 7. Calculate Comprehensive Metrics across the 12 Canonical Statuses
    const allOrders = await Order.find({}).select("orderStatus paymentStatus paymentMethod").lean();

    const metrics = {
      total: allOrders.length,
      pendingPayment: allOrders.filter((o: any) =>
        ["PENDING_PAYMENT", "pending"].includes(o.orderStatus) && o.paymentStatus !== "UNDER_REVIEW"
      ).length,
      paymentReview: allOrders.filter((o: any) =>
        o.orderStatus === "PAYMENT_REVIEW" || o.paymentStatus === "UNDER_REVIEW"
      ).length,
      confirmed: allOrders.filter((o: any) => ["CONFIRMED", "confirmed"].includes(o.orderStatus)).length,
      processing: allOrders.filter((o: any) => ["PROCESSING", "processing"].includes(o.orderStatus)).length,
      packed: allOrders.filter((o: any) => o.orderStatus === "PACKED").length,
      dispatched: allOrders.filter((o: any) => ["DISPATCHED", "shipped"].includes(o.orderStatus)).length,
      outForDelivery: allOrders.filter((o: any) => o.orderStatus === "OUT_FOR_DELIVERY").length,
      delivered: allOrders.filter((o: any) => ["DELIVERED", "delivered"].includes(o.orderStatus)).length,
      cancelled: allOrders.filter((o: any) => ["CANCELLED", "cancelled"].includes(o.orderStatus)).length,
      returnRequested: allOrders.filter((o: any) => o.orderStatus === "RETURN_REQUESTED").length,
      returned: allOrders.filter((o: any) => o.orderStatus === "RETURNED").length,
      refunded: allOrders.filter((o: any) => ["REFUNDED", "refunded"].includes(o.orderStatus)).length,
    };

    return apiSuccess({
      orders: formattedOrders,
      metrics,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
