import fs from "fs/promises";
import path from "path";
import { connectToDatabase } from "./db";
import { Invoice, IInvoice } from "@/models/Invoice";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { Address } from "@/models/Address";
import { logger } from "./logger";
import { sendInvoiceEmail } from "./email";
import { NotFoundError, ConflictError } from "./errors";
import { renderInvoicePdf } from "./invoice-pdf";

export { renderInvoicePdf };

export const STORE_DETAILS = {
  name: "FiguresWorld Anime Store",
  address: "42 Akihabara Crossroad, Bandra West, Mumbai, MH - 400050, India",
  gstin: "27AADCF1234F1Z5",
  pan: "AADCF1234F",
  state: "Maharashtra",
  stateCode: "27",
  email: "support@figuresworld.com",
  phone: "+91 (22) 2640-0000",
  website: "www.figuresworld.com",
};

/**
 * Generates an authoritative server-side sequential invoice number.
 * Format: FW-INV-YYYY-XXXX (e.g. FW-INV-2026-0001)
 * NEVER accepts or trusts client-supplied invoice numbers!
 */
export async function generateServerInvoiceNumber(): Promise<string> {
  await connectToDatabase();
  const currentYear = new Date().getFullYear();
  const count = await Invoice.countDocuments();
  const sequence = String(count + 1).padStart(4, "0");
  return `FW-INV-${currentYear}-${sequence}`;
}

/**
 * Calculates GST breakdown based on destination state.
 * Standard Anime Collectibles HSN: 95030090 (18% GST).
 * Intra-state (MH -> MH): CGST 9% + SGST 9%
 * Inter-state (MH -> outside): IGST 18%
 */
export function calculateGstBreakdown(subtotal: number, customerState: string) {
  const isMaharashtra =
    customerState.toLowerCase().trim() === "maharashtra" ||
    customerState.toLowerCase().trim() === "mh";

  const gstRate = 18;
  // Compute taxable amount assuming retail subtotal is inclusive of GST
  const taxableSubtotal = Math.round((subtotal / (1 + gstRate / 100)) * 100) / 100;
  const totalTax = Math.round((subtotal - taxableSubtotal) * 100) / 100;

  if (isMaharashtra) {
    const cgstAmount = Math.round((totalTax / 2) * 100) / 100;
    const sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100;
    return {
      isApplicable: true,
      gstin: STORE_DETAILS.gstin,
      state: customerState || "Maharashtra",
      stateCode: "27",
      hsnCode: "95030090",
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 0,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
      totalTax,
      taxableSubtotal,
    };
  } else {
    return {
      isApplicable: true,
      gstin: STORE_DETAILS.gstin,
      state: customerState || "Other",
      stateCode: "99",
      hsnCode: "95030090",
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 18,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: totalTax,
      totalTax,
      taxableSubtotal,
    };
  }
}


/**
 * Creates and stores an authoritative invoice for a confirmed order.
 * Generates server-side numbering, renders PDF, saves to disk & DB,
 * and triggers customer dispatch.
 */
export async function createInvoiceForOrder(
  orderIdentifier: string,
  options?: { sendCustomerEmail?: boolean }
): Promise<IInvoice> {
  await connectToDatabase();

  // Find order
  let order: any = null;
  const cleanId = orderIdentifier.trim();

  if (cleanId.match(/^[0-9a-fA-F]{24}$/)) {
    order = await Order.findById(cleanId);
  }
  if (!order) {
    order = await Order.findOne({ orderNumber: cleanId.toUpperCase() });
  }

  if (!order) {
    throw new NotFoundError(`Order "${cleanId}" not found for invoice generation.`);
  }

  // Check if invoice already exists
  const existingInvoice = await Invoice.findOne({ order: order._id });
  if (existingInvoice) {
    return existingInvoice;
  }

  // Fetch items & address
  const items = await OrderItem.find({ order: order._id });
  const address = await Address.findById(order.shippingAddress);

  if (!address) {
    throw new NotFoundError("Order shipping address record not found.");
  }

  // Generate authoritative server-side invoice number
  const invoiceNumber = await generateServerInvoiceNumber();

  // Calculate GST tax breakdown
  const gst = calculateGstBreakdown(order.pricing.subtotal, address.state);

  // Build items data
  const invoiceItems = items.map((it: any) => {
    const itemTaxable = Math.round((it.total / 1.18) * 100) / 100;
    const itemTax = Math.round((it.total - itemTaxable) * 100) / 100;
    return {
      product: it.product,
      productTitle: it.productTitle,
      productSku: it.productSku,
      hsn: "95030090",
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discount: it.discountAmount || 0,
      taxableAmount: itemTaxable,
      taxRate: 18,
      taxAmount: itemTax,
      total: it.total,
    };
  });

  const invoiceData: any = {
    invoiceNumber,
    order: order._id,
    orderNumber: order.orderNumber,
    customer: order.customer,
    customerDetails: {
      name: address.fullName,
      email: order.customerEmail,
      phone: address.phone,
      shippingAddress: {
        street: address.streetLine1,
        landmark: address.landmark,
        city: address.city,
        state: address.state,
        pinCode: address.postalCode,
        country: address.country || "India",
      },
    },
    storeDetails: STORE_DETAILS,
    gstDetails: {
      isApplicable: true,
      gstin: STORE_DETAILS.gstin,
      state: address.state,
      stateCode: gst.stateCode,
      hsnCode: "95030090",
      cgstRate: gst.cgstRate,
      sgstRate: gst.sgstRate,
      igstRate: gst.igstRate,
      cgstAmount: gst.cgstAmount,
      sgstAmount: gst.sgstAmount,
      igstAmount: gst.igstAmount,
      totalTax: gst.totalTax,
    },
    items: invoiceItems,
    pricing: {
      subtotal: order.pricing.subtotal,
      discountTotal: order.pricing.discountTotal || 0,
      taxTotal: gst.totalTax,
      shippingFee: order.pricing.shippingFee,
      grandTotal: order.pricing.grandTotal,
      currency: "INR",
    },
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentRef: order.paymentDetails?.transactionRef || undefined,
    // Served only through the signed-in /api/invoices/:n/pdf route, never from /public
    pdfUrl: `/api/invoices/${invoiceNumber}/pdf`,
    pdfPath: path.join(process.cwd(), "storage", "invoices", `${invoiceNumber}.pdf`),
    sentToCustomer: false,
    issuedAt: new Date(),
  };

  // Render vector PDF
  const pdfBytes = await renderInvoicePdf(invoiceData);

  // Ensure storage directory exists
  const invoiceDir = path.join(process.cwd(), "storage", "invoices");
  await fs.mkdir(invoiceDir, { recursive: true });

  // Write PDF file to disk
  await fs.writeFile(invoiceData.pdfPath, Buffer.from(pdfBytes));
  logger.info(`Generated PDF invoice: ${invoiceData.pdfPath}`);

  // Create Invoice record in MongoDB
  const createdInvoice = await Invoice.create(invoiceData);

  // Link invoice back to Order
  order.invoiceNumber = invoiceNumber;
  order.invoiceId = createdInvoice._id;
  await order.save();

  // Send to customer
  const shouldSend = options?.sendCustomerEmail !== false;
  if (shouldSend) {
    try {
      await sendInvoiceEmail({
        customerEmail: order.customerEmail,
        customerName: address.fullName,
        invoiceNumber,
        orderNumber: order.orderNumber,
        grandTotal: order.pricing.grandTotal,
        pdfUrl: invoiceData.pdfUrl,
        pdfPath: invoiceData.pdfPath,
      });
      createdInvoice.sentToCustomer = true;
      createdInvoice.sentAt = new Date();
      await createdInvoice.save();
    } catch (emailErr) {
      logger.error("Failed to send invoice email to customer:", { error: String(emailErr) });
    }
  }

  return createdInvoice;
}
