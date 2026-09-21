import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { Address } from "@/models/Address";
import { OrderItem } from "@/models/OrderItem";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

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

    await connectToDatabase();

    const cleanIdentifier = orderNumber.trim();
    let order: any = null;

    // Lookup by ObjectId if valid, or by orderNumber (case-insensitive)
    if (mongoose.Types.ObjectId.isValid(cleanIdentifier)) {
      order = await Order.findById(cleanIdentifier)
        .populate("shippingAddress")
        .populate("billingAddress")
        .populate({
          path: "customer",
          select: "name email phone role",
        });
    }

    if (!order) {
      order = await Order.findOne({
        orderNumber: { $regex: new RegExp(`^${cleanIdentifier}$`, "i") },
      })
        .populate("shippingAddress")
        .populate("billingAddress")
        .populate({
          path: "customer",
          select: "name email phone role",
        });
    }

    if (!order) {
      throw new NotFoundError(`Order "${cleanIdentifier}" not found.`);
    }

    // Fetch order items
    const items = await OrderItem.find({ order: order._id }).lean();

    // Harmonize shipment details (fallback to codDetails if COD)
    const courier =
      order.shipmentDetails?.courier ||
      order.codDetails?.courierPartner ||
      "";
    const trackingNumber =
      order.shipmentDetails?.trackingNumber ||
      order.codDetails?.trackingNumber ||
      "";
    const dispatchedAt =
      order.shipmentDetails?.dispatchedAt ||
      order.codDetails?.dispatchedAt ||
      null;

    const shippingAddress = order.shippingAddress
      ? {
          _id: order.shippingAddress._id?.toString(),
          fullName: order.shippingAddress.fullName,
          phone: order.shippingAddress.phone,
          streetLine1: order.shippingAddress.streetLine1,
          streetLine2: order.shippingAddress.streetLine2,
          landmark: order.shippingAddress.landmark,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          postalCode: order.shippingAddress.postalCode,
          country: order.shippingAddress.country || "India",
        }
      : null;

    return apiSuccess({
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
      customer: order.customer
        ? {
            id: order.customer._id?.toString(),
            name: order.customer.name,
            email: order.customer.email,
            phone: order.customer.phone,
          }
        : {
            name: shippingAddress?.fullName || "Guest Customer",
            email: order.customerEmail,
            phone: shippingAddress?.phone || "N/A",
          },
      shippingAddress,
      items: items.map((it: any) => ({
        _id: it._id?.toString(),
        product: it.product?.toString(),
        productTitle: it.productTitle,
        productSku: it.productSku,
        productImage: it.productImage,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        subtotal: it.subtotal,
        discountAmount: it.discountAmount || 0,
        total: it.total,
      })),
      pricing: order.pricing,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      paymentDetails: order.paymentDetails || null,
      codDetails: order.codDetails || null,
      shipment: {
        courier,
        trackingNumber,
        trackingUrl: order.shipmentDetails?.trackingUrl || "",
        dispatchedAt,
        estimatedDelivery: order.shipmentDetails?.estimatedDelivery || null,
        deliveredAt: order.shipmentDetails?.deliveredAt || null,
        shippingNotes: order.shipmentDetails?.shippingNotes || "",
      },
      statusHistory: order.statusHistory || [],
      invoiceNumber: order.invoiceNumber || null,
      invoiceId: order.invoiceId ? order.invoiceId.toString() : null,
      complianceVerified: order.complianceVerified || false,
      notes: order.notes || "",
      placedAt: order.placedAt || order.createdAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
