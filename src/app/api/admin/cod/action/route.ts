import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { createInvoiceForOrder } from "@/lib/invoice";
import { NotificationService } from "@/lib/notifications";
import { logAdminAudit } from "@/lib/audit";
import { supabase } from "@/lib/supabase";
import { findSupabaseOrder, restockSupabaseInventory } from "@/lib/orders-supabase";

const codActionSchema = z.object({
  orderNumber: z.string().optional(),
  orderId: z.string().optional(),
  action: z.enum(["ACCEPT", "MARK_VERIFIED", "REJECT", "LOG_CALL", "DISPATCH", "CANCEL"]),
  callStatus: z.enum(["ANSWERED", "NO_ANSWER", "BUSY", "CALLBACK_REQUESTED"]).optional(),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
  cancellationReason: z.string().optional(),
  courierPartner: z.string().optional(),
  trackingNumber: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required for COD verification actions.");
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Forbidden: Admin or Staff privileges required to manage COD orders.");
    }

    const data = await validateRequestBody(req, codActionSchema);

    if (!data.orderNumber && !data.orderId) {
      throw new ValidationError("Either orderNumber or orderId must be provided.");
    }

    const order = await findSupabaseOrder(data.orderId || data.orderNumber!);

    if (!order) {
      throw new NotFoundError("Order not found.");
    }

    if (order.payment_method !== "COD") {
      throw new ValidationError(`Order "${order.order_number}" is not a Cash on Delivery order.`);
    }

    const codDetails = { ...(order.cod_details || { codStatus: "PENDING_VERIFICATION", callLogs: [] }) };
    if (!Array.isArray(codDetails.callLogs)) {
      codDetails.callLogs = [];
    }

    let newOrderStatus = order.order_status || "pending";
    let newPaymentStatus = order.payment_status || "PENDING";
    let shippingDetails = { ...(order.shipping_details || {}) };

    if (data.action === "ACCEPT" || data.action === "MARK_VERIFIED") {
      codDetails.codStatus = "VERIFIED";
      codDetails.verifiedAt = new Date().toISOString();
      codDetails.verifiedBy = user.userId;
      if (data.notes) {
        codDetails.verificationNotes = data.notes;
      }
      newOrderStatus = "confirmed";
    } else if (data.action === "LOG_CALL") {
      codDetails.callLogs.push({
        calledAt: new Date().toISOString(),
        calledBy: user.email,
        status: data.callStatus || "ANSWERED",
        notes: data.notes || "Verification phone call conducted",
      });
      if (data.callStatus === "ANSWERED") {
        codDetails.phoneVerified = true;
      }
    } else if (data.action === "DISPATCH") {
      codDetails.codStatus = "DISPATCHED";
      codDetails.dispatchedAt = new Date().toISOString();
      if (data.courierPartner) codDetails.courierPartner = data.courierPartner;
      if (data.trackingNumber) codDetails.trackingNumber = data.trackingNumber;
      newOrderStatus = "shipped";
      shippingDetails = {
        ...shippingDetails,
        courier: data.courierPartner || shippingDetails.courier || "Standard Courier",
        trackingNumber: data.trackingNumber || shippingDetails.trackingNumber || "",
        dispatchedAt: new Date().toISOString(),
      };
    } else if (data.action === "REJECT") {
      codDetails.codStatus = "REJECTED";
      codDetails.rejectionReason = data.rejectionReason || data.notes || "Customer declined or unverified phone.";
      newOrderStatus = "cancelled";
      newPaymentStatus = "FAILED";

      // Restore inventory
      if (Array.isArray(order.items)) {
        await restockSupabaseInventory(order.items);
      }
    } else if (data.action === "CANCEL") {
      codDetails.codStatus = "CANCELLED";
      codDetails.cancellationReason = data.cancellationReason || data.notes || "Order cancelled by staff/customer.";
      newOrderStatus = "cancelled";
      newPaymentStatus = "FAILED";

      // Restore inventory
      if (Array.isArray(order.items)) {
        await restockSupabaseInventory(order.items);
      }
    }

    const statusHistory = Array.isArray(order.status_history) ? [...order.status_history] : [];
    statusHistory.push({
      status: newOrderStatus,
      timestamp: new Date().toISOString(),
      updatedBy: user.email,
      note: `COD action: ${data.action}. ${data.notes || ""}`.trim(),
    });

    const { data: updatedOrder, error: updateErr } = await supabase
      .from("orders")
      .update({
        cod_details: codDetails,
        order_status: newOrderStatus,
        payment_status: newPaymentStatus,
        shipping_details: shippingDetails,
        status_history: statusHistory,
      })
      .eq("id", order.id)
      .select("*")
      .single();

    if (updateErr || !updatedOrder) {
      throw new Error(`Failed to update COD order: ${updateErr?.message || "Unknown error"}`);
    }

    if (data.action === "ACCEPT" || data.action === "MARK_VERIFIED") {
      try {
        await createInvoiceForOrder(updatedOrder.order_number);
      } catch (invErr) {
        console.error("Invoice generation error on COD verification:", invErr);
      }
      try {
        await NotificationService.sendOrderConfirmation(updatedOrder);
      } catch (notifErr) {
        console.error("WhatsApp notification error:", notifErr);
      }
    }

    await logAdminAudit({
      action: `COD_${data.action}`,
      actor: user,
      resource: {
        type: "COD_ORDER",
        id: updatedOrder.id,
        identifier: updatedOrder.order_number,
      },
      details: {
        action: data.action,
        codStatus: codDetails.codStatus,
        orderStatus: updatedOrder.order_status,
        notes: data.notes || data.rejectionReason || data.cancellationReason,
      },
      req,
    });

    return apiSuccess(
      {
        orderNumber: updatedOrder.order_number,
        codDetails: updatedOrder.cod_details,
        orderStatus: updatedOrder.order_status,
        paymentStatus: updatedOrder.payment_status,
      },
      `COD action ${data.action} processed successfully.`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
