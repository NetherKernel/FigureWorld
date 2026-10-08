import { z } from "zod";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ValidationError, NotFoundError, ConflictError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { supabase } from "@/lib/supabase";
import { findSupabaseOrder } from "@/lib/orders-supabase";

const paymentRefSchema = z.object({
  transactionRef: z
    .string()
    .min(6, "Transaction reference / UTR ID must be at least 6 characters")
    .max(64, "Transaction reference cannot exceed 64 characters"),
  upiApp: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;

    if (!orderNumber) {
      throw new ValidationError("Order number is required");
    }

    const data = await validateRequestBody(req, paymentRefSchema);

    const order = await findSupabaseOrder(orderNumber);

    if (!order) {
      throw new NotFoundError(`Order "${orderNumber}" not found`);
    }

    if (order.payment_method !== "UPI") {
      throw new ValidationError(`Order "${orderNumber}" is not configured for UPI payment.`);
    }

    const normalizedStatus = (order.payment_status || "").toUpperCase();

    if (normalizedStatus === "PAID") {
      throw new ConflictError("Payment for this order has already been verified and confirmed.");
    }

    if (normalizedStatus === "EXPIRED") {
      throw new ConflictError("This order payment window has expired. Please create a new order.");
    }

    const paymentDetails = {
      ...(order.payment_details || {}),
      transactionRef: data.transactionRef.trim(),
      upiApp: data.upiApp?.trim() || "UPI App",
      submittedAt: new Date().toISOString(),
    };

    const updatePayload: any = {
      payment_status: "UNDER_REVIEW",
      payment_ref: data.transactionRef.trim(),
      payment_details: paymentDetails,
    };

    if (data.notes) {
      updatePayload.notes = data.notes.trim();
    }

    const { data: updated, error } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", order.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to update payment reference: ${error.message}`);
    }

    return apiSuccess(
      {
        orderNumber: updated.order_number,
        paymentStatus: updated.payment_status,
        orderStatus: updated.order_status,
        transactionRef: data.transactionRef.trim(),
        submittedAt: paymentDetails.submittedAt,
        message:
          "Payment reference submitted successfully. Your transaction is currently UNDER_REVIEW by our team.",
      },
      "Payment reference submitted for verification"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
