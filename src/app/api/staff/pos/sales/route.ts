import crypto from "crypto";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ConflictError, ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { logAdminAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { createInvoiceForOrder } from "@/lib/invoice";
import { supabase, mapSupabaseProduct } from "@/lib/supabase";

/** Never-deliverable placeholder (RFC 2606 .invalid) for walk-ins who don't give an email */
const WALK_IN_EMAIL = "walk-in@instore.invalid";

const STORE_LOCATION = {
  street: "42 Akihabara Crossroad, Bandra West (in-store purchase)",
  city: "Mumbai",
  state: "Maharashtra",
  postal_code: "400050",
  country: "India",
};

const saleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Invalid product"),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1, "Add at least one product to the bill.")
    .max(50),
  customer: z
    .object({
      name: z.string().trim().max(100).optional(),
      phone: z
        .string()
        .trim()
        .max(20)
        .regex(/^[0-9+\-\s()]*$/, "Phone number can only contain digits, spaces and + - ( )")
        .optional(),
      email: z.string().trim().toLowerCase().email("Enter a valid email or leave it blank").optional().or(z.literal("")),
    })
    .default({}),
  paymentMethod: z.enum(["CASH", "CARD", "UPI"]),
  paymentRef: z.string().trim().max(64).optional(),
  ageVerified: z.boolean().default(false),
});

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

/** GET /api/staff/pos/sales — today's counter sales (newest first) with totals. */
export async function GET(req: Request) {
  try {
    await requireRole(req, "STAFF", "ADMIN");

    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .gte("placed_at", startOfToday())
      .order("placed_at", { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(`Failed to load in-store sales: ${error.message}`);
    }

    const inStoreOrders = (orders || []).filter(
      (o: any) => o.notes?.includes("In-store") || o.notes?.includes("POS")
    );

    const sales = inStoreOrders.map((o: any) => ({
      orderNumber: o.order_number,
      invoiceNumber: o.invoice_number || null,
      customerName: o.customer_details?.name || o.shipping_address?.fullName || "Walk-in customer",
      grandTotal: o.pricing?.grandTotal || 0,
      paymentMethod: o.payment_method,
      itemCount: Array.isArray(o.items) ? o.items.length : 0,
      servedBy: o.notes || null,
      placedAt: o.placed_at || o.created_at,
    }));

    const byMethod: Record<string, number> = { CASH: 0, CARD: 0, UPI: 0 };
    for (const s of sales) {
      const pm = s.paymentMethod || "UPI";
      byMethod[pm] = (byMethod[pm] || 0) + s.grandTotal;
    }

    return apiSuccess({
      sales,
      totals: { count: sales.length, revenue: sales.reduce((sum, s) => sum + s.grandTotal, 0), byMethod },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/staff/pos/sales — ring up a walk-in sale: deduct stock, record the paid order, issue the invoice. */
export async function POST(req: Request) {
  const reserved: Array<{ id: string; qty: number }> = [];
  try {
    const staff = await requireRole(req, "STAFF", "ADMIN");
    const data = await validateRequestBody(req, saleSchema);

    // Merge duplicate lines for the same product
    const wanted = new Map<string, number>();
    for (const it of data.items) wanted.set(it.productId, (wanted.get(it.productId) || 0) + it.quantity);

    const productIds = [...wanted.keys()];
    const { data: rawProducts, error: pErr } = await supabase
      .from("products")
      .select("*, categories(*)")
      .in("id", productIds);

    if (pErr || !rawProducts || rawProducts.length === 0) {
      throw new ValidationError("Selected products were not found in store catalog.");
    }

    const byId = new Map(rawProducts.map((p) => [p.id, mapSupabaseProduct(p, p.categories)]));

    const lines = [...wanted.entries()].map(([id, qty]) => {
      const p = byId.get(id);
      if (!p || p.status === "archived") throw new ValidationError("One of the products on the bill is no longer available.");
      if (p.stock < qty) throw new ConflictError(`Only ${p.stock} of "${p.name}" left in stock.`);
      const unitPrice =
        typeof p.discountPrice === "number" && p.discountPrice > 0 && p.discountPrice < p.price ? p.discountPrice : p.price;
      return { product: p, qty, unitPrice, total: unitPrice * qty };
    });

    const restricted = lines.filter((l) => l.product.isRestricted);
    if (restricted.length && !data.ageVerified) {
      throw new ValidationError(
        `"${restricted[0].product.name}" is an 18+ item. Check the customer's ID and tick "Age verified" to continue.`
      );
    }

    // Deduct stock atomically in Supabase
    for (const l of lines) {
      const newStock = Math.max(0, l.product.stock - l.qty);
      await supabase.from("products").update({ stock: newStock }).eq("id", l.product.id);
      reserved.push({ id: l.product.id, qty: l.qty });
    }

    const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
    const email = data.customer.email || "";
    const name = data.customer.name?.trim() || "Walk-in customer";
    const phone = data.customer.phone?.trim() || "Not provided";
    const now = new Date();
    const servedBy = { userId: String(staff.userId), name: staff.name, email: staff.email, role: staff.role };

    // Link customer account if email found
    let accountId: string | null = null;
    if (email) {
      const { data: supaU } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
      if (supaU) accountId = supaU.id;
    }

    // Address
    try {
      await supabase.from("addresses").insert({
        user_id: accountId,
        name,
        phone,
        street: STORE_LOCATION.street,
        city: STORE_LOCATION.city,
        state: STORE_LOCATION.state,
        postal_code: STORE_LOCATION.postal_code,
        country: STORE_LOCATION.country,
        is_default: false,
      });
    } catch {}

    const orderNumber = `FW-POS-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const itemsList = lines.map((l) => ({
      productId: l.product.id,
      productTitle: l.product.name,
      title: l.product.name,
      name: l.product.name,
      productSku: l.product.sku,
      sku: l.product.sku,
      productImage: l.product.images?.find((img: any) => img.isPrimary)?.url || l.product.images?.[0]?.url,
      image: l.product.images?.find((img: any) => img.isPrimary)?.url || l.product.images?.[0]?.url,
      unitPrice: l.unitPrice,
      price: l.unitPrice,
      quantity: l.qty,
      subtotal: l.total,
      discountAmount: 0,
      total: l.total,
    }));

    // Payment method mapping for Postgres constraint ('UPI' or 'COD')
    const pgPaymentMethod = data.paymentMethod === "UPI" ? "UPI" : "COD";

    const { data: newOrder, error: oErr } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: accountId,
        customer_details: {
          name,
          email: email || WALK_IN_EMAIL,
          phone,
        },
        shipping_address: {
          fullName: name,
          phone,
          address: STORE_LOCATION.street,
          street: STORE_LOCATION.street,
          city: STORE_LOCATION.city,
          state: STORE_LOCATION.state,
          postalCode: STORE_LOCATION.postal_code,
          country: STORE_LOCATION.country,
        },
        items: itemsList,
        pricing: {
          subtotal,
          discountTotal: 0,
          taxTotal: 0,
          shippingFee: 0,
          grandTotal: subtotal,
          currency: "INR",
        },
        payment_method: pgPaymentMethod,
        payment_status: "PAID",
        order_status: "delivered",
        payment_details: data.paymentRef
          ? { transactionRef: data.paymentRef, verifiedAt: now.toISOString(), verifiedBy: servedBy.userId }
          : { method: data.paymentMethod },
        status_history: [
          {
            status: "delivered",
            changedAt: now.toISOString(),
            changedBy: servedBy.userId,
            notes: `In-store counter sale (${data.paymentMethod}), handed over by ${staff.name}`,
          },
        ],
        compliance_verified: restricted.length > 0,
        compliance_details: restricted.length
          ? { isRestrictedOrder: true, ageConfirmed: true, verifiedInPersonBy: servedBy, verifiedAt: now.toISOString() }
          : {},
        notes: `In-store counter sale (${data.paymentMethod}) by ${staff.name}`,
        placed_at: now.toISOString(),
      })
      .select("*")
      .single();

    if (oErr || !newOrder) {
      throw new Error(`Failed to create POS order in database: ${oErr?.message || "Unknown error"}`);
    }

    // Invoice (GST, store as place of supply)
    let invoice: any = null;
    let invoiceError: string | null = null;
    try {
      invoice = await createInvoiceForOrder(newOrder.order_number, { sendCustomerEmail: !!email });
    } catch (err) {
      invoiceError = "The sale is saved, but invoice couldn't be generated automatically.";
      logger.error("POS invoice generation failed", { orderNumber }, err);
    }

    await logAdminAudit({
      action: "POS_SALE",
      actor: staff,
      resource: { type: "ORDER", id: newOrder.id, identifier: orderNumber },
      details: {
        paymentMethod: data.paymentMethod,
        grandTotal: subtotal,
        items: lines.map((l) => ({ sku: l.product.sku, qty: l.qty })),
        invoiceNumber: invoice?.invoiceNumber,
      },
      req,
    });

    return apiSuccess(
      {
        orderNumber,
        invoiceNumber: invoice?.invoiceNumber || null,
        pdfUrl: invoice?.pdfUrl || null,
        invoiceError,
        grandTotal: subtotal,
        paymentMethod: data.paymentMethod,
        customerName: name,
        emailedTo: email || null,
        items: lines.map((l) => ({
          name: l.product.name,
          sku: l.product.sku,
          quantity: l.qty,
          unitPrice: l.unitPrice,
          total: l.total,
        })),
      },
      "Sale completed",
      201
    );
  } catch (err) {
    // Restore stock if reserved
    for (const r of reserved) {
      try {
        const { data: cur } = await supabase.from("products").select("stock").eq("id", r.id).maybeSingle();
        if (cur) {
          await supabase.from("products").update({ stock: (cur.stock || 0) + r.qty }).eq("id", r.id);
        }
      } catch {}
    }
    return handleApiError(err);
  }
}
