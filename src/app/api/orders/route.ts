import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { Address } from "@/models/Address";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";

const MAX_ORDERS = 50;

/**
 * GET /api/orders — the signed-in customer's order history ("Your Orders").
 * Matches orders linked to the account, plus guest orders placed with the same email.
 */
export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    await connectToDatabase();

    const emails = Array.from(new Set([user.email, user.email.toLowerCase()]));
    const batches = await Promise.all([
      Order.find({ customer: user.userId }),
      ...emails.map((email) => Order.find({ customerEmail: email })),
    ]);

    const seen = new Set<string>();
    const orders = batches
      .flat()
      .filter((o: any) => {
        const id = String(o._id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .sort((a: any, b: any) => new Date(b.placedAt || b.createdAt).getTime() - new Date(a.placedAt || a.createdAt).getTime())
      .slice(0, MAX_ORDERS);

    const result = await Promise.all(
      orders.map(async (order: any) => {
        const [items, shippingAddress] = await Promise.all([
          OrderItem.find({ order: order._id }),
          order.shippingAddress ? Address.findById(order.shippingAddress) : null,
        ]);
        return {
          orderNumber: order.orderNumber,
          orderId: order._id,
          customerEmail: order.customerEmail,
          pricing: order.pricing,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
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
            productId: it.product ? String(it.product) : undefined,
            name: it.productTitle,
            sku: it.productSku,
            image: it.productImage,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            total: it.total,
          })),
          placedAt: order.placedAt,
          updatedAt: order.updatedAt,
        };
      })
    );

    return apiSuccess({ orders: result }, "Orders retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
