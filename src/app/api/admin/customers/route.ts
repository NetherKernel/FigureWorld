import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    await requireRole(req, "ADMIN", "STAFF");

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").toLowerCase().trim();

    // Fetch all customer users, their orders and saved addresses from Supabase
    const [usersRes, ordersRes, addressesRes] = await Promise.all([
      supabase.from("users").select("id, name, email, phone, role, created_at").ilike("role", "CUSTOMER").order("created_at", { ascending: false }),
      supabase.from("orders").select("customer_details, shipping_address, order_status, pricing, placed_at, created_at"),
      supabase.from("addresses").select("user_id"),
    ]);

    const customers = usersRes.data || [];
    const orders = ordersRes.data || [];

    const addressCounts = new Map<string, number>();
    (addressesRes.data || []).forEach((a: any) => {
      if (a.user_id) addressCounts.set(a.user_id, (addressCounts.get(a.user_id) || 0) + 1);
    });

    // Aggregate stats by customer email
    const orderAggMap = new Map<
      string,
      { ordersCount: number; totalSpent: number; lastOrderDate: Date | null; phone: string }
    >();

    orders.forEach((o: any) => {
      const email = (o.customer_details?.email || "").toLowerCase().trim();
      if (!email) return;

      const existing = orderAggMap.get(email) || {
        ordersCount: 0,
        totalSpent: 0,
        lastOrderDate: null,
        phone: o.shipping_address?.phone || o.customer_details?.phone || "",
      };

      existing.ordersCount++;
      const st = (o.order_status || "").toUpperCase();
      if (st !== "CANCELLED" && st !== "REFUNDED") {
        existing.totalSpent += Number(o.pricing?.grandTotal || 0);
      }

      const orderDate = new Date(o.placed_at || o.created_at);
      if (!existing.lastOrderDate || orderDate > existing.lastOrderDate) {
        existing.lastOrderDate = orderDate;
      }
      if (!existing.phone && (o.shipping_address?.phone || o.customer_details?.phone)) {
        existing.phone = o.shipping_address?.phone || o.customer_details?.phone;
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
        id: c.id,
        name: c.name || "Customer",
        email: c.email,
        phone: c.phone || stats.phone || "—",
        role: c.role,
        isActive: true,
        isEmailVerified: true,
        addressesCount: addressCounts.get(c.id) || 0,
        ordersCount: stats.ordersCount,
        totalSpent: stats.totalSpent,
        lastOrderDate: stats.lastOrderDate,
        createdAt: c.created_at,
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
