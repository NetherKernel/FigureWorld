import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase";

const MAX_ORDERS = 200;

/**
 * GET /api/orders — the signed-in customer's order history ("Your Orders").
 * Matches orders linked to the account, plus guest orders placed with the same email.
 * Filtering happens in the database: fetching the store's latest orders and filtering
 * afterwards hid a customer's history as soon as other people placed orders.
 */
export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const emailLower = user.email.toLowerCase().trim();

    // Sessions issued before the Supabase move may still carry a legacy (non-uuid) id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.userId || "");

    const [byAccount, byEmail] = await Promise.all([
      isUuid
        ? supabase.from("orders").select("*").eq("user_id", user.userId).order("created_at", { ascending: false }).limit(MAX_ORDERS)
        : Promise.resolve({ data: [] as any[], error: null }),
      // ilike = case-insensitive equality here; "_" / "%" in an email are re-checked exactly below
      supabase.from("orders").select("*").ilike("customer_details->>email", emailLower).order("created_at", { ascending: false }).limit(MAX_ORDERS),
    ]);

    const error = byAccount.error || byEmail.error;
    if (error) {
      throw new Error(`Failed to load orders: ${error.message}`);
    }

    const supaOrders = [...(byAccount.data || []), ...(byEmail.data || [])].sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const seen = new Set<string>();
    const result: any[] = [];

    for (const so of supaOrders) {
      const cEmail = so.customer_details?.email?.toLowerCase()?.trim();
      const isUserMatch =
        (so.user_id && so.user_id === user.userId) ||
        (cEmail && cEmail === emailLower);

      if (isUserMatch && so.order_number && !seen.has(so.order_number)) {
        seen.add(so.order_number);
        result.push({
          orderNumber: so.order_number,
          orderId: so.id,
          customerEmail: so.customer_details?.email || user.email,
          pricing: so.pricing,
          paymentMethod: so.payment_method,
          paymentStatus: so.payment_status,
          orderStatus: so.order_status,
          shippingAddress: {
            fullName: so.shipping_address?.fullName || so.customer_details?.name || "",
            phone: so.shipping_address?.phone || so.customer_details?.phone || "",
            address: so.shipping_address?.address || so.shipping_address?.street || "",
            landmark: so.shipping_address?.landmark || "",
            city: so.shipping_address?.city || "",
            state: so.shipping_address?.state || "",
            pinCode: so.shipping_address?.postalCode || so.shipping_address?.postal_code || "",
          },
          items: (so.items || []).map((it: any) => ({
            productId: it.productId || it.product_id,
            name: it.title || it.productTitle || it.name || "Product",
            sku: it.sku || "",
            image: it.image || "",
            unitPrice: it.unitPrice || it.price || 0,
            quantity: it.quantity || 1,
            total: it.total || ((it.unitPrice || it.price || 0) * (it.quantity || 1)),
          })),
          placedAt: so.placed_at || so.created_at,
          updatedAt: so.updated_at,
        });
      }
    }

    return apiSuccess({ orders: result }, "Orders retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
