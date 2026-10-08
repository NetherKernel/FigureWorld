import { supabase } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { logAdminAudit } from "@/lib/audit";
import { buildUpiUri } from "@/lib/upi";
import { findSupabaseOrder, mapSupabaseOrder } from "@/lib/orders-supabase";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required to view order details.");
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Forbidden: Admin or Staff privileges required.");
    }

    const { orderNumber } = await params;
    if (!orderNumber) {
      throw new ValidationError("Order number or ID is required.");
    }

    const rawOrder = await findSupabaseOrder(orderNumber);
    if (!rawOrder) {
      throw new NotFoundError(`Order "${orderNumber}" not found.`);
    }

    const mapped = mapSupabaseOrder(rawOrder);
    return apiSuccess(mapped);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required.");
    }
    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Admin or Staff privileges required.");
    }

    const { orderNumber } = await params;
    if (!orderNumber) {
      throw new ValidationError("Order identifier is required.");
    }

    const body = await req.json();
    const rawOrder = await findSupabaseOrder(orderNumber);

    if (!rawOrder) {
      throw new NotFoundError(`Order "${orderNumber}" not found.`);
    }

    // Handle Custom Delivery Fee adjustment
    if (body.customShippingFee !== undefined) {
      const newShippingFee = Number(body.customShippingFee);
      if (isNaN(newShippingFee) || newShippingFee < 0) {
        throw new ValidationError("customShippingFee must be a non-negative number.");
      }

      const pricing = rawOrder.pricing || {};
      const oldShippingFee = Number(pricing.shippingFee || 0);
      const subtotal = Number(pricing.subtotal || 0);
      const discountTotal = Number(pricing.discountTotal || 0);
      const taxTotal = Number(pricing.taxTotal || 0);
      const newGrandTotal = Math.max(0, subtotal - discountTotal + taxTotal + newShippingFee);

      const newPricing = {
        ...pricing,
        originalShippingFee: pricing.originalShippingFee !== undefined ? pricing.originalShippingFee : oldShippingFee,
        shippingFee: newShippingFee,
        grandTotal: newGrandTotal,
        isCustomShippingFee: true,
        shippingFeeAdjustmentReason: body.reason || pricing.shippingFeeAdjustmentReason,
        deliveryPartnerType: body.partnerType || pricing.deliveryPartnerType,
      };

      const history = Array.isArray(rawOrder.status_history) ? [...rawOrder.status_history] : [];
      history.push({
        status: rawOrder.order_status,
        changedAt: new Date().toISOString(),
        changedBy: user.userId,
        notes: `Delivery cost adjusted to ₹${newShippingFee} (${body.reason || "Admin update"})`,
      });

      await supabase
        .from("orders")
        .update({
          pricing: newPricing,
          status_history: history,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rawOrder.id);

      await logAdminAudit({
        action: "CUSTOMIZE_ORDER_DELIVERY_FEE",
        actor: user,
        resource: {
          type: "ORDER",
          id: rawOrder.id,
          identifier: rawOrder.order_number,
        },
        details: {
          orderNumber: rawOrder.order_number,
          oldShippingFee,
          newShippingFee,
          newGrandTotal,
          reason: body.reason,
        },
        req,
      });

      return apiSuccess({
        orderNumber: rawOrder.order_number,
        pricing: newPricing,
      }, "Order delivery fee customized successfully");
    }

    if (body.notes !== undefined) {
      await supabase
        .from("orders")
        .update({ notes: body.notes, updated_at: new Date().toISOString() })
        .eq("id", rawOrder.id);

      return apiSuccess({ orderNumber: rawOrder.order_number, notes: body.notes });
    }

    return apiSuccess({ orderNumber: rawOrder.order_number });
  } catch (error) {
    return handleApiError(error);
  }
}
