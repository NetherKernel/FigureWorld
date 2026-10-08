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

const verifyPaymentSchema = z.object({
  orderNumber: z.string().optional(),
  orderId: z.string().optional(),
  action: z.enum(["CONFIRM", "REJECT", "EXPIRE", "REFUND"]),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required for payment verification.");
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Forbidden: Admin or Staff privileges required to verify payments.");
    }

    const data = await validateRequestBody(req, verifyPaymentSchema);

    if (!data.orderNumber && !data.orderId) {
      throw new ValidationError("Either orderNumber or orderId must be provided.");
    }

    const order = await findSupabaseOrder(data.orderId || data.orderNumber!);

    if (!order) {
      throw new NotFoundError("Order not found.");
    }

    const paymentDetails = { ...(order.payment_details || {}) };
    let newPaymentStatus = "PENDING";
    let newOrderStatus = order.order_status || "pending";

    if (data.action === "CONFIRM") {
      newPaymentStatus = "PAID";
      newOrderStatus = "confirmed";
      paymentDetails.verifiedAt = new Date().toISOString();
      paymentDetails.verifiedBy = user.userId;
      if (data.notes) {
        paymentDetails.verificationNotes = data.notes;
      }
    } else if (data.action === "REJECT") {
      newPaymentStatus = "FAILED";
      newOrderStatus = "cancelled";
      paymentDetails.rejectionReason =
        data.rejectionReason || data.notes || "Transaction reference could not be verified with bank.";

      // Restore inventory in Supabase
      if (Array.isArray(order.items)) {
        await restockSupabaseInventory(order.items);
      }
    } else if (data.action === "EXPIRE") {
      newPaymentStatus = "FAILED";
      newOrderStatus = "cancelled";
      paymentDetails.rejectionReason = "Payment session expired without valid transaction reference.";

      // Restore inventory in Supabase
      if (Array.isArray(order.items)) {
        await restockSupabaseInventory(order.items);
      }
    } else if (data.action === "REFUND") {
      newPaymentStatus = "REFUNDED";
      newOrderStatus = "refunded";
      if (data.notes) {
        paymentDetails.verificationNotes = `Refunded: ${data.notes}`;
      }
    }

    const statusHistory = Array.isArray(order.status_history) ? [...order.status_history] : [];
    statusHistory.push({
      status: newOrderStatus,
      timestamp: new Date().toISOString(),
      updatedBy: user.email,
      note: `Payment action: ${data.action}. ${data.notes || ""}`.trim(),
    });

    const { data: updatedOrder, error: updateErr } = await supabase
      .from("orders")
      .update({
        payment_status: newPaymentStatus,
        order_status: newOrderStatus,
        payment_details: paymentDetails,
        status_history: statusHistory,
      })
      .eq("id", order.id)
      .select("*")
      .single();

    if (updateErr || !updatedOrder) {
      throw new Error(`Failed to update order payment: ${updateErr?.message || "Unknown error"}`);
    }

    if (data.action === "CONFIRM") {
      try {
        await createInvoiceForOrder(updatedOrder.order_number);
      } catch (invErr) {
        console.error("Invoice auto-generation error:", invErr);
      }
      try {
        await NotificationService.sendPaymentConfirmation(updatedOrder);
        await NotificationService.sendOrderConfirmation(updatedOrder);
        await NotificationService.sendInvoice(updatedOrder);
      } catch (notifErr) {
        console.error("WhatsApp notification error:", notifErr);
      }
    }

    await logAdminAudit({
      action: `PAYMENT_${data.action}`,
      actor: user,
      resource: {
        type: "PAYMENT",
        id: updatedOrder.id,
        identifier: updatedOrder.order_number,
      },
      details: {
        action: data.action,
        paymentStatus: updatedOrder.payment_status,
        orderStatus: updatedOrder.order_status,
        notes: data.notes || data.rejectionReason,
      },
      req,
    });

    return apiSuccess(
      {
        orderNumber: updatedOrder.order_number,
        paymentStatus: updatedOrder.payment_status,
        orderStatus: updatedOrder.order_status,
        paymentDetails: updatedOrder.payment_details,
      },
      `Payment ${data.action} processed successfully.`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
