import crypto from "crypto";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { ConflictError, ValidationError } from "@/lib/errors";
import { validateRequestBody } from "@/lib/validation";
import { logAdminAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { createInvoiceForOrder } from "@/lib/invoice";
import { Product, type IProduct } from "@/models/Product";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { Address } from "@/models/Address";
import { User } from "@/models/User";

/**
 * In-store counter sales (physical shop billing) — STAFF and ADMIN.
 * A sale is paid and handed over at the counter: stock is deducted immediately and a GST invoice
 * is issued with the store as the place of supply.
 */

/** Never-deliverable placeholder (RFC 2606 .invalid) for walk-ins who don't give an email */
const WALK_IN_EMAIL = "walk-in@instore.invalid";

const STORE_LOCATION = {
  streetLine1: "42 Akihabara Crossroad, Bandra West (in-store purchase)",
  city: "Mumbai",
  state: "Maharashtra",
  postalCode: "400050",
  country: "India",
};

const saleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid product"),
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
  return d;
};

/** GET /api/staff/pos/sales — today's counter sales (newest first) with totals. */
export async function GET(req: Request) {
  try {
    await requireRole(req, "STAFF", "ADMIN");
    await connectToDatabase();

    const orders = await Order.find({ channel: "IN_STORE", placedAt: { $gte: startOfToday() } })
      .sort({ placedAt: -1 })
      .limit(100);
    const addresses = await Address.find({ _id: { $in: orders.map((o) => o.shippingAddress) } });
    const nameById = new Map(addresses.map((a) => [String(a._id), a.fullName]));

    const sales = orders.map((o) => ({
      orderNumber: o.orderNumber,
      invoiceNumber: o.invoiceNumber || null,
      customerName: nameById.get(String(o.shippingAddress)) || "Walk-in customer",
      grandTotal: o.pricing?.grandTotal || 0,
      paymentMethod: o.paymentMethod,
      itemCount: o.items?.length || 0,
      servedBy: o.servedBy?.name || null,
      placedAt: o.placedAt,
    }));

    const byMethod: Record<string, number> = { CASH: 0, CARD: 0, UPI: 0 };
    for (const s of sales) byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] || 0) + s.grandTotal;

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
  const created: { address?: unknown; order?: unknown } = {};
  try {
    const staff = await requireRole(req, "STAFF", "ADMIN");
    const data = await validateRequestBody(req, saleSchema);
    await connectToDatabase();

    // Merge duplicate lines for the same product
    const wanted = new Map<string, number>();
    for (const it of data.items) wanted.set(it.productId, (wanted.get(it.productId) || 0) + it.quantity);

    const products: IProduct[] = await Product.find({ _id: { $in: [...wanted.keys()] } });
    const byId = new Map(products.map((p) => [String(p._id), p]));

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

    // Deduct stock atomically, item by item; put everything back if any item ran out meanwhile
    for (const l of lines) {
      const updated = await Product.findOneAndUpdate(
        { _id: l.product._id, stock: { $gte: l.qty } },
        { $inc: { stock: -l.qty } },
        { new: true }
      );
      if (!updated) throw new ConflictError(`"${l.product.name}" just sold out — only ${l.product.stock} were left. Update the bill.`);
      reserved.push({ id: String(l.product._id), qty: l.qty });
    }

    const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
    const email = data.customer.email || "";
    const name = data.customer.name?.trim() || "Walk-in customer";
    const phone = data.customer.phone?.trim() || "Not provided";
    const now = new Date();
    const servedBy = { userId: String(staff.userId), name: staff.name, email: staff.email, role: staff.role };

    // Link the sale to the customer's online account when they give the same email
    const account = email ? await User.findOne({ email, role: "CUSTOMER" }) : null;

    const address = await Address.create({
      user: account?._id,
      type: "billing",
      fullName: name,
      phone,
      ...STORE_LOCATION,
      isDefault: false,
    });
    created.address = address._id;

    const orderNumber = `FW-POS-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const order = await Order.create({
      orderNumber,
      channel: "IN_STORE",
      servedBy,
      customer: account?._id,
      customerEmail: email || WALK_IN_EMAIL,
      items: [],
      pricing: { subtotal, discountTotal: 0, taxTotal: 0, shippingFee: 0, grandTotal: subtotal, currency: "INR" },
      shippingAddress: address._id,
      billingAddress: address._id,
      paymentMethod: data.paymentMethod,
      paymentStatus: "PAID",
      orderStatus: "DELIVERED",
      paymentDetails: data.paymentRef ? { transactionRef: data.paymentRef, verifiedAt: now, verifiedBy: servedBy.userId } : {},
      statusHistory: [{ status: "DELIVERED", changedAt: now, changedBy: servedBy.userId, notes: `In-store sale, handed over at the counter by ${staff.name}` }],
      complianceVerified: restricted.length > 0,
      complianceDetails: restricted.length
        ? { isRestrictedOrder: true, ageConfirmed: true, verifiedInPersonBy: servedBy, verifiedAt: now }
        : undefined,
      notes: `In-store counter sale (${data.paymentMethod}) by ${staff.name}`,
      placedAt: now,
    });
    created.order = order._id;

    const itemIds = [];
    for (const l of lines) {
      const p = l.product;
      const item = await OrderItem.create({
        order: order._id,
        product: p._id,
        productTitle: p.name,
        productSku: p.sku,
        productImage: p.images?.find((img) => img.isPrimary)?.url || p.images?.[0]?.url,
        unitPrice: l.unitPrice,
        quantity: l.qty,
        subtotal: l.total,
        discountAmount: 0,
        total: l.total,
      });
      itemIds.push(item._id);
    }
    order.items = itemIds;
    await order.save();
    reserved.length = 0; // the sale is recorded; stock stays deducted from here on

    // Invoice (GST, store as place of supply). The sale stands even if PDF generation fails.
    let invoice: { invoiceNumber: string; pdfUrl: string } | null = null;
    let invoiceError: string | null = null;
    try {
      invoice = await createInvoiceForOrder(order.orderNumber, { sendCustomerEmail: !!email });
    } catch (err) {
      invoiceError = "The sale is saved, but the invoice couldn't be generated. Generate it from the order in the admin dashboard.";
      logger.error("POS invoice generation failed", { orderNumber }, err);
    }

    await logAdminAudit({
      action: "POS_SALE",
      actor: staff,
      resource: { type: "ORDER", id: String(order._id), identifier: orderNumber },
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
        items: lines.map((l) => ({ name: l.product.name, sku: l.product.sku, quantity: l.qty, unitPrice: l.unitPrice, total: l.total })),
      },
      "Sale completed",
      201
    );
  } catch (err) {
    // Failed before the sale was fully recorded: remove the partial records and return the stock
    if (reserved.length) {
      try {
        if (created.order) {
          await OrderItem.deleteMany({ order: created.order });
          await Order.deleteOne({ _id: created.order });
        }
        if (created.address) await Address.deleteOne({ _id: created.address });
      } catch (cleanupErr) {
        logger.error("POS: failed to clean up a partially recorded sale", { order: String(created.order) }, cleanupErr);
      }
    }
    for (const r of reserved) {
      try {
        await Product.updateOne({ _id: r.id }, { $inc: { stock: r.qty } });
      } catch (restoreErr) {
        logger.error("POS: failed to restore stock after a failed sale", { productId: r.id, qty: r.qty }, restoreErr);
      }
    }
    return handleApiError(err);
  }
}
