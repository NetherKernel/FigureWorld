import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { Shipment } from "@/models/Shipment";
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
    const queue = searchParams.get("queue") || "all";
    const courier = searchParams.get("courier");
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Queue filter
    switch (queue.toLowerCase()) {
      case "ready_to_pack":
        filter.orderStatus = { $in: ["CONFIRMED", "PROCESSING", "confirmed", "processing"] };
        break;
      case "ready_to_dispatch":
        filter.orderStatus = "PACKED";
        break;
      case "in_transit":
        filter.orderStatus = { $in: ["DISPATCHED", "OUT_FOR_DELIVERY", "shipped"] };
        break;
      case "delivered":
        filter.orderStatus = { $in: ["DELIVERED", "delivered"] };
        break;
      default:
        // Exclude cancelled & refunded orders by default from active logistics pipeline
        filter.orderStatus = {
          $nin: ["CANCELLED", "REFUNDED", "RETURNED", "cancelled", "refunded", "returned"],
        };
        break;
    }

    if (courier) {
      filter["shipmentDetails.courier"] = { $regex: new RegExp(courier.trim(), "i") };
    }

    if (search) {
      const q = search.trim();
      filter.$or = [
        { orderNumber: { $regex: new RegExp(q, "i") } },
        { customerEmail: { $regex: new RegExp(q, "i") } },
        { "shipmentDetails.trackingNumber": { $regex: new RegExp(q, "i") } },
        { "shipmentDetails.courier": { $regex: new RegExp(q, "i") } },
      ];
    }

    const [orders, totalInQueue, countsAggregate] = await Promise.all([
      Order.find(filter)
        .populate("shippingAddress")
        .populate({ path: "items", populate: "product" })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
      Order.aggregate([
        {
          $group: {
            _id: { $toUpper: "$orderStatus" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const metrics = {
      total: 0,
      readyToPack: 0,
      readyToDispatch: 0,
      inTransit: 0,
      delivered: 0,
    };

    for (const item of countsAggregate) {
      const st = item._id;
      metrics.total += item.count;
      if (st === "CONFIRMED" || st === "PROCESSING") {
        metrics.readyToPack += item.count;
      } else if (st === "PACKED") {
        metrics.readyToDispatch += item.count;
      } else if (st === "DISPATCHED" || st === "OUT_FOR_DELIVERY" || st === "SHIPPED") {
        metrics.inTransit += item.count;
      } else if (st === "DELIVERED") {
        metrics.delivered += item.count;
      }
    }

    // Attach shipment record if available
    const orderNumbers = orders.map((o) => o.orderNumber);
    const shipments = await Shipment.find({ orderNumber: { $in: orderNumbers } });
    const shipmentMap = new Map((shipments as any[]).map((s: any) => [s.orderNumber, s]));

    const mappedOrders = orders.map((order) => {
      const shipmentDoc = shipmentMap.get(order.orderNumber);
      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        shippingAddress: order.shippingAddress,
        itemsCount: order.items?.length || 0,
        grandTotal: order.pricing?.grandTotal || 0,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        shipmentDetails: order.shipmentDetails,
        shipmentRecord: shipmentDoc || null,
        placedAt: order.placedAt || order.createdAt,
        updatedAt: order.updatedAt,
      };
    });

    return apiSuccess({
      orders: mappedOrders,
      metrics,
      pagination: {
        total: totalInQueue,
        page,
        limit,
        totalPages: Math.ceil(totalInQueue / limit) || 1,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
