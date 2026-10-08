import { supabase } from "@/lib/supabase";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { logAdminAudit } from "@/lib/audit";
import { generateTrackingUrl, calculateExpectedDelivery } from "@/lib/shipping";
import { NotificationService } from "@/lib/notifications";

export function mapSupabaseOrder(order: any) {
  if (!order) return null;

  const customerDetails = order.customer_details || {};
  const shippingAddress = order.shipping_address || {};
  const pricing = order.pricing || {};
  const shipmentDetails = order.shipping_details || {};
  const paymentDetails = order.payment_details || {};
  const codDetails = order.cod_details || {};

  const courier =
    shipmentDetails.courier ||
    codDetails.courierPartner ||
    "";
  const trackingNumber =
    shipmentDetails.trackingNumber ||
    codDetails.trackingNumber ||
    "";
  const dispatchedAt =
    shipmentDetails.dispatchedAt ||
    codDetails.dispatchedAt ||
    null;

  const items = Array.isArray(order.items) ? order.items : [];

  return {
    _id: order.id,
    id: order.id,
    orderId: order.id,
    orderNumber: order.order_number,
    customerEmail: customerDetails.email || "",
    customer: {
      id: order.user_id,
      name: customerDetails.name || shippingAddress.fullName || "Customer",
      email: customerDetails.email || "",
      phone: customerDetails.phone || shippingAddress.phone || "",
    },
    shippingAddress: {
      fullName: shippingAddress.fullName || customerDetails.name || "",
      phone: shippingAddress.phone || customerDetails.phone || "",
      address: shippingAddress.address || shippingAddress.streetLine1 || "",
      streetLine1: shippingAddress.address || shippingAddress.streetLine1 || "",
      landmark: shippingAddress.landmark || "",
      city: shippingAddress.city || "",
      state: shippingAddress.state || "",
      pinCode: shippingAddress.postalCode || shippingAddress.pinCode || "",
      postalCode: shippingAddress.postalCode || shippingAddress.pinCode || "",
      country: shippingAddress.country || "India",
    },
    itemsCount: items.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0),
    items: items.map((it: any, index: number) => ({
      _id: it.id || `item_${index}`,
      productId: it.productId || it.product_id || it.product || it.id,
      product: it.productId || it.product_id || it.product || it.id,
      productTitle: it.title || it.productTitle || it.name || "Anime Product",
      name: it.title || it.productTitle || it.name || "Anime Product",
      productSku: it.sku || it.productSku || "",
      sku: it.sku || it.productSku || "",
      productImage: it.image || it.productImage || "",
      image: it.image || it.productImage || "",
      unitPrice: Number(it.unitPrice ?? it.price ?? 0),
      price: Number(it.unitPrice ?? it.price ?? 0),
      quantity: Number(it.quantity || 1),
      subtotal: Number(it.subtotal || (Number(it.unitPrice ?? it.price ?? 0) * (it.quantity || 1))),
      discountAmount: Number(it.discountAmount || 0),
      total: Number(it.total || (Number(it.unitPrice ?? it.price ?? 0) * (it.quantity || 1))),
    })),
    pricing: {
      subtotal: Number(pricing.subtotal || 0),
      discountTotal: Number(pricing.discountTotal || 0),
      taxTotal: Number(pricing.taxTotal || 0),
      shippingFee: Number(pricing.shippingFee || 0),
      grandTotal: Number(pricing.grandTotal || 0),
      currency: pricing.currency || "INR",
      isCustomShippingFee: Boolean(pricing.isCustomShippingFee),
      deliveryPartnerType: pricing.deliveryPartnerType || "STANDARD_COURIER",
    },
    paymentMethod: order.payment_method || "COD",
    paymentStatus: order.payment_status || "PENDING",
    orderStatus: order.order_status || "pending",
    paymentDetails: order.payment_details || (order.payment_ref ? { transactionRef: order.payment_ref } : null),
    codDetails: order.cod_details || null,
    shipment: {
      courier,
      trackingNumber,
      trackingUrl: shipmentDetails.trackingUrl || "",
      dispatchedAt,
      estimatedDelivery: shipmentDetails.estimatedDelivery || null,
      deliveredAt: shipmentDetails.deliveredAt || null,
      shippingNotes: shipmentDetails.shippingNotes || "",
    },
    statusHistory: Array.isArray(order.status_history) ? order.status_history : [],
    requiresAdminReview: Boolean(order.requires_admin_review),
    complianceVerified: Boolean(order.compliance_verified),
    complianceDetails: order.compliance_details || null,
    notes: order.notes || "",
    placedAt: order.placed_at || order.created_at,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

export async function findSupabaseOrder(identifier: string) {
  const clean = identifier.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);

  let query = supabase.from("orders").select("*");
  if (isUuid) {
    query = query.or(`id.eq.${clean},order_number.ilike.${clean}`);
  } else {
    query = query.ilike("order_number", clean);
  }

  const { data: order, error } = await query.maybeSingle();
  if (error || !order) {
    return null;
  }
  return order;
}

export async function getSupabaseOrdersAdmin(filters: {
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const {
    status = "ALL",
    paymentMethod = "ALL",
    paymentStatus = "ALL",
    search = "",
    page = 1,
    limit = 50,
  } = filters;

  // 1. Fetch all orders for comprehensive metrics
  const { data: allOrders, error: allErr } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (allErr) throw allErr;
  const rawList = allOrders || [];

  // Metrics computation across 12 canonical statuses
  const metrics = {
    total: rawList.length,
    pendingPayment: rawList.filter((o: any) =>
      ["PENDING_PAYMENT", "pending"].includes(o.order_status) && o.payment_status !== "UNDER_REVIEW"
    ).length,
    paymentReview: rawList.filter((o: any) =>
      o.order_status === "PAYMENT_REVIEW" || o.payment_status === "UNDER_REVIEW"
    ).length,
    confirmed: rawList.filter((o: any) => ["CONFIRMED", "confirmed"].includes(o.order_status)).length,
    processing: rawList.filter((o: any) => ["PROCESSING", "processing"].includes(o.order_status)).length,
    packed: rawList.filter((o: any) => o.order_status === "PACKED").length,
    dispatched: rawList.filter((o: any) => ["DISPATCHED", "shipped"].includes(o.order_status)).length,
    outForDelivery: rawList.filter((o: any) => o.order_status === "OUT_FOR_DELIVERY").length,
    delivered: rawList.filter((o: any) => ["DELIVERED", "delivered"].includes(o.order_status)).length,
    cancelled: rawList.filter((o: any) => ["CANCELLED", "cancelled"].includes(o.order_status)).length,
    returnRequested: rawList.filter((o: any) => o.order_status === "RETURN_REQUESTED").length,
    returned: rawList.filter((o: any) => o.order_status === "RETURNED").length,
    refunded: rawList.filter((o: any) => ["REFUNDED", "refunded"].includes(o.order_status)).length,
  };

  // 2. Filter in memory
  let filtered = rawList;

  if (status && status !== "ALL") {
    const s = status.toUpperCase();
    if (s === "PENDING_PAYMENT") {
      filtered = filtered.filter((o: any) => ["PENDING_PAYMENT", "pending"].includes(o.order_status));
    } else if (s === "CONFIRMED") {
      filtered = filtered.filter((o: any) => ["CONFIRMED", "confirmed"].includes(o.order_status));
    } else if (s === "PROCESSING") {
      filtered = filtered.filter((o: any) => ["PROCESSING", "processing"].includes(o.order_status));
    } else if (s === "DISPATCHED") {
      filtered = filtered.filter((o: any) => ["DISPATCHED", "shipped"].includes(o.order_status));
    } else if (s === "DELIVERED") {
      filtered = filtered.filter((o: any) => ["DELIVERED", "delivered"].includes(o.order_status));
    } else if (s === "CANCELLED") {
      filtered = filtered.filter((o: any) => ["CANCELLED", "cancelled"].includes(o.order_status));
    } else if (s === "REFUNDED") {
      filtered = filtered.filter((o: any) => ["REFUNDED", "refunded"].includes(o.order_status));
    } else {
      filtered = filtered.filter((o: any) => o.order_status === s);
    }
  }

  if (paymentMethod && paymentMethod !== "ALL") {
    filtered = filtered.filter((o: any) => (o.payment_method || "").toUpperCase() === paymentMethod.toUpperCase());
  }

  if (paymentStatus && paymentStatus !== "ALL") {
    filtered = filtered.filter(
      (o: any) => (o.payment_status || "").toUpperCase() === paymentStatus.toUpperCase()
    );
  }

  if (search) {
    const term = search.toLowerCase().trim();
    filtered = filtered.filter((o: any) => {
      const oNum = (o.order_number || "").toLowerCase();
      const email = (o.customer_details?.email || "").toLowerCase();
      const name = (o.customer_details?.name || "").toLowerCase();
      const phone = (o.customer_details?.phone || o.shipping_address?.phone || "").toLowerCase();
      const tracking = (o.shipping_details?.trackingNumber || o.cod_details?.trackingNumber || "").toLowerCase();
      const courier = (o.shipping_details?.courier || o.cod_details?.courierPartner || "").toLowerCase();
      const utr = (o.payment_details?.transactionRef || o.payment_ref || "").toLowerCase();

      return (
        oNum.includes(term) ||
        email.includes(term) ||
        name.includes(term) ||
        phone.includes(term) ||
        tracking.includes(term) ||
        courier.includes(term) ||
        utr.includes(term)
      );
    });
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit).map(mapSupabaseOrder);

  return {
    orders: paginated,
    metrics,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function restockSupabaseOrderItems(orderOrItems: any) {
  const items = Array.isArray(orderOrItems)
    ? orderOrItems
    : Array.isArray(orderOrItems?.items)
    ? orderOrItems.items
    : [];
  for (const item of items) {
    try {
      const sku = item.sku || item.productSku;
      const pid = item.productId || item.product_id || item.product || item.id;
      const qty = item.quantity || 1;

      let pQuery = supabase.from("products").select("id, stock");
      if (sku) {
        pQuery = pQuery.eq("sku", sku);
      } else if (pid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pid)) {
        pQuery = pQuery.eq("id", pid);
      } else {
        continue;
      }

      const { data: prod } = await pQuery.maybeSingle();
      if (prod) {
        const newStock = Number(prod.stock || 0) + Number(qty);
        await supabase.from("products").update({ stock: newStock }).eq("id", prod.id);
      }
    } catch (e) {
      console.error("Restock error for item:", item, e);
    }
  }
}

export const restockSupabaseInventory = restockSupabaseOrderItems;
