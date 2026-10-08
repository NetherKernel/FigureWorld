import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { validateRequestBody } from "@/lib/validation";
import { logAdminAudit } from "@/lib/audit";
import { buildUpiUri, generateUpiQrDataUrl } from "@/lib/upi";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { findSupabaseOrder, mapSupabaseOrder } from "@/lib/orders-supabase";

const customizeDeliveryFeeSchema = z.object({
  customShippingFee: z.number().min(0, "Delivery fee cannot be negative"),
  reason: z.string().min(2, "Reason for delivery fee customization is required"),
  partnerType: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    await requireRole(req, "ADMIN", "STAFF");
    const { orderNumber } = await params;
    if (!orderNumber) {
      throw new ValidationError("Order identifier is required.");
    }

    const order = await findSupabaseOrder(orderNumber);
    if (!order) {
      throw new NotFoundError(`Order "${orderNumber}" not found.`);
    }

    const mapped = mapSupabaseOrder(order);
    if (!mapped) {
      throw new NotFoundError(`Order "${orderNumber}" not found.`);
    }

    return apiSuccess({
      orderId: mapped.orderId,
      orderNumber: mapped.orderNumber,
      customerEmail: mapped.customerEmail,
      customer: mapped.customer,
      shippingAddress: mapped.shippingAddress,
      pricing: mapped.pricing,
      paymentMethod: mapped.paymentMethod,
      paymentStatus: mapped.paymentStatus,
      orderStatus: mapped.orderStatus,
      deliveryPartnerType: mapped.pricing.deliveryPartnerType || "LOCAL_COURIER",
      itemsCount: mapped.itemsCount,
      items: mapped.items,
      upiQrDataUrl: order.payment_details?.qrPayload
        ? await generateUpiQrDataUrl(order.payment_details.qrPayload)
        : null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const authUser = await requireRole(req, "ADMIN");
    const { orderNumber } = await params;
    if (!orderNumber) {
      throw new ValidationError("Order identifier is required.");
    }

    const data = await validateRequestBody(req, customizeDeliveryFeeSchema);
    const order = await findSupabaseOrder(orderNumber);

    if (!order) {
      throw new NotFoundError(`Order "${orderNumber}" not found.`);
    }

    const pricing = order.pricing || {};
    const oldShippingFee = Number(pricing.shippingFee || 0);
    const newShippingFee = data.customShippingFee;
    const subtotal = Number(pricing.subtotal || 0);
    const discountTotal = Number(pricing.discountTotal || 0);
    const taxTotal = Number(pricing.taxTotal || 0);
    const newGrandTotal = Math.max(0, subtotal - discountTotal + taxTotal + newShippingFee);

    const updatedPricing = {
      ...pricing,
      originalShippingFee: pricing.originalShippingFee !== undefined ? pricing.originalShippingFee : oldShippingFee,
      shippingFee: newShippingFee,
      grandTotal: newGrandTotal,
      isCustomShippingFee: true,
      shippingFeeAdjustmentReason: data.reason,
      deliveryPartnerType: data.partnerType || pricing.deliveryPartnerType,
    };

    const history = Array.isArray(order.status_history) ? [...order.status_history] : [];
    history.push({
      status: order.order_status,
      changedAt: new Date().toISOString(),
      changedBy: authUser.userId,
      notes: `Custom shipping fee of ₹${newShippingFee} applied: ${data.reason}`,
    });

    await supabase
      .from("orders")
      .update({
        pricing: updatedPricing,
        status_history: history,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    await logAdminAudit({
      action: "CUSTOMIZE_ORDER_DELIVERY_FEE",
      actor: authUser,
      resource: {
        type: "ORDER",
        id: order.id,
        identifier: order.order_number,
      },
      details: {
        orderNumber: order.order_number,
        oldShippingFee,
        newShippingFee,
        newGrandTotal,
        reason: data.reason,
      },
      req,
    });

    return apiSuccess({
      orderNumber: order.order_number,
      pricing: updatedPricing,
    }, "Order delivery fee customized successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
