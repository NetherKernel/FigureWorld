import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { generateUpiQrDataUrl } from "@/lib/upi";
import { findSupabaseOrder, mapSupabaseOrder } from "@/lib/orders-supabase";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;

    if (!orderNumber) {
      throw new ValidationError("Order number is required");
    }

    const orderDoc = await findSupabaseOrder(orderNumber);

    if (!orderDoc) {
      throw new NotFoundError(`Order "${orderNumber}" not found`);
    }

    const mapped = mapSupabaseOrder(orderDoc);
    if (!mapped) {
      throw new NotFoundError(`Order "${orderNumber}" not found`);
    }

    // Generate dynamic QR code if UPI and still PENDING
    let qrDataUrl = "";
    if (
      mapped.paymentMethod === "UPI" &&
      mapped.paymentDetails?.qrPayload &&
      (mapped.paymentStatus === "PENDING" || mapped.paymentStatus === "UNDER_REVIEW")
    ) {
      try {
        qrDataUrl = await generateUpiQrDataUrl(mapped.paymentDetails.qrPayload);
      } catch {}
    }

    return apiSuccess(
      {
        orderNumber: mapped.orderNumber,
        orderId: mapped.id,
        customerEmail: mapped.customerEmail,
        pricing: mapped.pricing,
        paymentMethod: mapped.paymentMethod,
        paymentStatus: mapped.paymentStatus,
        orderStatus: mapped.orderStatus,
        paymentDetails: {
          ...mapped.paymentDetails,
          qrDataUrl,
        },
        codDetails: mapped.codDetails,
        shippingAddress: mapped.shippingAddress,
        items: mapped.items,
        shipment: mapped.shipment,
        requiresAdminReview: mapped.requiresAdminReview,
        complianceVerified: mapped.complianceVerified,
        placedAt: mapped.placedAt,
        updatedAt: mapped.updatedAt,
      },
      "Order details retrieved successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
