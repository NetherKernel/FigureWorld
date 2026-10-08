import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

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
    const queue = (searchParams.get("queue") || "all").toLowerCase();
    const courier = searchParams.get("courier");
    const search = searchParams.get("search")?.toLowerCase().trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const skip = (page - 1) * limit;

    const { data: allOrders, error } = await supabase
      .from("orders")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to load orders: ${error.message}`);
    }

    const ordersList = allOrders || [];

    const metrics = {
      total: 0,
      readyToPack: 0,
      readyToDispatch: 0,
      inTransit: 0,
      delivered: 0,
    };

    for (const order of ordersList) {
      const st = (order.order_status || "").toUpperCase();
      metrics.total++;
      if (st === "CONFIRMED" || st === "PROCESSING") {
        metrics.readyToPack++;
      } else if (st === "PACKED") {
        metrics.readyToDispatch++;
      } else if (st === "DISPATCHED" || st === "OUT_FOR_DELIVERY" || st === "SHIPPED") {
        metrics.inTransit++;
      } else if (st === "DELIVERED") {
        metrics.delivered++;
      }
    }

    let filtered = ordersList;

    switch (queue) {
      case "ready_to_pack":
        filtered = filtered.filter((o) => ["CONFIRMED", "PROCESSING"].includes((o.order_status || "").toUpperCase()));
        break;
      case "ready_to_dispatch":
        filtered = filtered.filter((o) => (o.order_status || "").toUpperCase() === "PACKED");
        break;
      case "in_transit":
        filtered = filtered.filter((o) =>
          ["DISPATCHED", "OUT_FOR_DELIVERY", "SHIPPED"].includes((o.order_status || "").toUpperCase())
        );
        break;
      case "delivered":
        filtered = filtered.filter((o) => (o.order_status || "").toUpperCase() === "DELIVERED");
        break;
      default:
        filtered = filtered.filter(
          (o) => !["CANCELLED", "REFUNDED", "RETURNED"].includes((o.order_status || "").toUpperCase())
        );
        break;
    }

    if (courier) {
      const cLower = courier.toLowerCase().trim();
      filtered = filtered.filter((o) => {
        const c = (o.shipping_details?.courier || "").toLowerCase();
        return c.includes(cLower);
      });
    }

    if (search) {
      filtered = filtered.filter((o) => {
        const num = (o.order_number || "").toLowerCase();
        const email = (o.customer_details?.email || "").toLowerCase();
        const trk = (o.shipping_details?.trackingNumber || "").toLowerCase();
        const c = (o.shipping_details?.courier || "").toLowerCase();
        return num.includes(search) || email.includes(search) || trk.includes(search) || c.includes(search);
      });
    }

    const totalInQueue = filtered.length;
    const paginatedOrders = filtered.slice(skip, skip + limit);

    // Attach shipment record if available
    const orderNumbers = paginatedOrders.map((o) => o.order_number);
    let shipmentMap = new Map<string, any>();
    if (orderNumbers.length > 0) {
      const { data: shipments } = await supabase
        .from("shipments")
        .select("*")
        .in("order_number", orderNumbers);

      (shipments || []).forEach((s) => {
        shipmentMap.set(s.order_number, s);
      });
    }

    const mappedOrders = paginatedOrders.map((order) => {
      const shipmentDoc = shipmentMap.get(order.order_number);
      return {
        _id: order.id,
        id: order.id,
        orderNumber: order.order_number,
        customerEmail: order.customer_details?.email || "",
        shippingAddress: order.shipping_address,
        itemsCount: Array.isArray(order.items) ? order.items.length : 0,
        grandTotal: order.pricing?.grandTotal || 0,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        orderStatus: order.order_status,
        shipmentDetails: order.shipping_details,
        shipmentRecord: shipmentDoc || null,
        placedAt: order.placed_at || order.created_at,
        updatedAt: order.updated_at,
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
