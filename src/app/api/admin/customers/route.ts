import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    await requireRole(req, "ADMIN", "STAFF");
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").toLowerCase().trim();

    // Fetch all customer users and all orders
    const [customers, orders] = await Promise.all([
      User.find({ role: "CUSTOMER" }).sort({ createdAt: -1 }),
      Order.find({}),
    ]);

    // Aggregate stats by customer email
    const orderAggMap = new Map<string, { ordersCount: number; totalSpent: number; lastOrderDate: Date | null; phone: string }>();

    orders.forEach((o: any) => {
      const email = (o.customerEmail || "").toLowerCase().trim();
      if (!email) return;

      const existing = orderAggMap.get(email) || {
        ordersCount: 0,
        totalSpent: 0,
        lastOrderDate: null,
        phone: o.shippingAddress?.phone || "",
      };

      existing.ordersCount++;
      const st = (o.orderStatus || "").toUpperCase();
      if (st !== "CANCELLED" && st !== "REFUNDED") {
        existing.totalSpent += Number(o.pricing?.grandTotal || 0);
      }

      const orderDate = new Date(o.placedAt || o.createdAt);
      if (!existing.lastOrderDate || orderDate > existing.lastOrderDate) {
        existing.lastOrderDate = orderDate;
      }
      if (!existing.phone && o.shippingAddress?.phone) {
        existing.phone = o.shippingAddress.phone;
      }

      orderAggMap.set(email, existing);
    });

    let mappedCustomers = customers.map((c: any) => {
      const email = (c.email || "").toLowerCase().trim();
      const stats = orderAggMap.get(email) || {
        ordersCount: 0,
        totalSpent: 0,
        lastOrderDate: null,
        phone: c.phone || "",
      };

      return {
        id: c._id.toString(),
        name: c.name,
        email: c.email,
        phone: c.phone || stats.phone || "—",
        role: c.role,
        isActive: c.isActive ?? true,
        isEmailVerified: c.isEmailVerified ?? false,
        addressesCount: Array.isArray(c.addresses) ? c.addresses.length : 0,
        ordersCount: stats.ordersCount,
        totalSpent: stats.totalSpent,
        lastOrderDate: stats.lastOrderDate,
        createdAt: c.createdAt,
      };
    });

    if (query) {
      mappedCustomers = mappedCustomers.filter(
        (c: any) =>
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.phone.toLowerCase().includes(query)
      );
    }

    return apiSuccess({
      customers: mappedCustomers,
      totalCustomers: mappedCustomers.length,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
