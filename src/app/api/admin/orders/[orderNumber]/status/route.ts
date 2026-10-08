import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { createInvoiceForOrder } from "@/lib/invoice";
import { NotificationService } from "@/lib/notifications";
import { logAdminAudit } from "@/lib/audit";
import { findSupabaseOrder, restockSupabaseOrderItems } from "@/lib/orders-supabase";

const updateStatusSchema = z.object({
  status: z.enum([
    "PENDING_PAYMENT",
    "PAYMENT_REVIEW",
    "CONFIRMED",
    "PROCESSING",
    "PACKED",
    "DISPATCHED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "RETURN_REQUESTED",
    "RETURNED",
    "REFUNDED",
    // lowercase aliases
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ]),
  notes: z.string().optional(),
  restockInventory: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required to update order status.");
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Forbidden: Admin or Staff privileges required.");
    }

    const { orderNumber } = await params;
    if (!orderNumber) {
      throw new ValidationError("Order number or ID is required.");
    }

    const data = await validateRequestBody(req, updateStatusSchema);
    const order = await findSupabaseOrder(orderNumber);

    if (!order) {
      throw new NotFoundError(`Order "${orderNumber}" not found.`);
    }

    // Normalize incoming status to canonical uppercase
    let targetStatus: string = data.status.toUpperCase();
    if (targetStatus === "SHIPPED") targetStatus = "DISPATCHED";
    if (targetStatus === "PENDING") targetStatus = "PENDING_PAYMENT";

    const prevStatus = order.order_status;
    const isAlreadyCancelled = ["CANCELLED", "cancelled"].includes(prevStatus);

    // 1. Stock restoration if moving to CANCELLED (and wasn't already cancelled)
    if (targetStatus === "CANCELLED" && !isAlreadyCancelled) {
      await restockSupabaseOrderItems(order);
    }

    // 2. Stock restoration if moving to RETURNED (restock inventory)
    if (targetStatus === "RETURNED" && (data.restockInventory !== false)) {
      await restockSupabaseOrderItems(order);
    }

    let paymentStatus = order.payment_status;
    const shippingDetails = order.shipping_details || {};
    const codDetails = order.cod_details || {};

    // 3. Status-specific updates
    if (targetStatus === "DISPATCHED") {
      if (!shippingDetails.dispatchedAt) {
        shippingDetails.dispatchedAt = new Date().toISOString();
      }
      if (codDetails) {
        codDetails.codStatus = "DISPATCHED";
        if (!codDetails.dispatchedAt) {
          codDetails.dispatchedAt = new Date().toISOString();
        }
      }
      try {
        await NotificationService.sendDispatchDetails({ ...order, shipmentDetails: shippingDetails });
      } catch (notifErr) {
        console.error("WhatsApp dispatch notification error:", notifErr);
      }
    } else if (targetStatus === "DELIVERED") {
      shippingDetails.deliveredAt = new Date().toISOString();
      if (order.payment_method === "COD" && paymentStatus === "PENDING") {
        paymentStatus = "PAID";
      }
      try {
        await NotificationService.sendDeliveryUpdate(order);
      } catch (notifErr) {
        console.error("WhatsApp delivery notification error:", notifErr);
      }
    } else if (targetStatus === "CONFIRMED") {
      if (codDetails && codDetails.codStatus === "PENDING_VERIFICATION") {
        codDetails.codStatus = "VERIFIED";
        codDetails.verifiedAt = new Date().toISOString();
        codDetails.verifiedBy = user.userId;
      }
      try {
        await createInvoiceForOrder(order.order_number);
      } catch (invErr) {
        console.error("Invoice auto-generation error:", invErr);
      }
      try {
        await NotificationService.sendOrderConfirmation(order);
        await NotificationService.sendInvoice(order);
      } catch (notifErr) {
        console.error("WhatsApp confirmation notification error:", notifErr);
      }
    }

    // 4. Update status and append to status history
    const statusHistory = Array.isArray(order.status_history) ? [...order.status_history] : [];
    statusHistory.push({
      status: targetStatus,
      changedAt: new Date().toISOString(),
      changedBy: user.userId,
      notes: data.notes || `Order status updated to ${targetStatus} by ${user.role.toLowerCase()}`,
    });

    const { error: updErr } = await supabase
      .from("orders")
      .update({
        order_status: targetStatus,
        payment_status: paymentStatus,
        shipping_details: shippingDetails,
        cod_details: codDetails,
        status_history: statusHistory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updErr) throw updErr;

    await logAdminAudit({
      action: "ORDER_STATUS_UPDATE",
      actor: user,
      resource: {
        type: "ORDER",
        id: order.id,
        identifier: order.order_number,
      },
      details: {
        previousStatus: prevStatus,
        newStatus: targetStatus,
        notes: data.notes,
      },
      req,
    });

    return apiSuccess(
      {
        orderNumber: order.order_number,
        previousStatus: prevStatus,
        orderStatus: targetStatus,
        paymentStatus: paymentStatus,
        statusHistory: statusHistory,
      },
      `Order status successfully updated to ${targetStatus}.`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
