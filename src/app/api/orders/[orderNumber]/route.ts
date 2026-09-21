import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { Address } from "@/models/Address";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { generateUpiQrDataUrl } from "@/lib/upi";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;

    if (!orderNumber) {
      throw new ValidationError("Order number is required");
    }

    await connectToDatabase();

    const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() });

    if (!order) {
      throw new NotFoundError(`Order "${orderNumber}" not found`);
    }

    // Fetch address
    const shippingAddress = order.shippingAddress
      ? await Address.findById(order.shippingAddress)
      : null;

    // Fetch items
    const items = await OrderItem.find({ order: order._id });

    // Generate dynamic QR code if UPI and still PENDING
    let qrDataUrl = "";
    if (
      order.paymentMethod === "UPI" &&
      order.paymentDetails?.qrPayload &&
      (order.paymentStatus === "PENDING" || order.paymentStatus === "UNDER_REVIEW")
    ) {
      qrDataUrl = await generateUpiQrDataUrl(order.paymentDetails.qrPayload);
    }

    return apiSuccess(
      {
        orderNumber: order.orderNumber,
        orderId: order._id,
        customerEmail: order.customerEmail,
        pricing: order.pricing,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        paymentDetails: {
          ...order.paymentDetails,
          qrDataUrl,
        },
        codDetails: order.codDetails || null,
        shippingAddress: shippingAddress
          ? {
              fullName: shippingAddress.fullName,
              phone: shippingAddress.phone,
              address: shippingAddress.streetLine1,
              landmark: shippingAddress.landmark,
              city: shippingAddress.city,
              state: shippingAddress.state,
              pinCode: shippingAddress.postalCode,
            }
          : null,
        items: items.map((it: any) => ({
          name: it.productTitle,
          sku: it.productSku,
          image: it.productImage,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
          total: it.total,
        })),
        placedAt: order.placedAt,
        updatedAt: order.updatedAt,
      },
      "Order details retrieved successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
