import fs from "fs/promises";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { connectToDatabase } from "./db";
import { Invoice, IInvoice } from "@/models/Invoice";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { Address } from "@/models/Address";
import { logger } from "./logger";
import { sendInvoiceEmail } from "./email";
import { NotFoundError, ConflictError } from "./errors";

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
 * Renders a crisp vector PDF invoice document using pdf-lib.
 */
export async function renderInvoicePdf(invoice: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  // Standard A4 dimensions: 595.28 x 841.89 pt
  const page = pdfDoc.addPage([595.28, 841.89]);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const navy = rgb(0.12, 0.16, 0.38);
  const darkSlate = rgb(0.1, 0.12, 0.18);
  const mutedGray = rgb(0.4, 0.45, 0.52);
  const lineGray = rgb(0.85, 0.88, 0.92);
  const lightBg = rgb(0.96, 0.97, 0.99);

  let y = 790;

  // Header: Brand & Title
  page.drawText(STORE_DETAILS.name, {
    x: 40,
    y,
    size: 18,
    font: fontBold,
    color: navy,
  });

  page.drawText("TAX INVOICE", {
    x: 440,
    y,
    size: 18,
    font: fontBold,
    color: navy,
  });

  y -= 16;
  page.drawText(STORE_DETAILS.address, {
    x: 40,
    y,
    size: 8.5,
    font: fontRegular,
    color: mutedGray,
  });

  page.drawText(`Invoice #: ${invoice.invoiceNumber}`, {
    x: 440,
    y,
    size: 9.5,
    font: fontMono,
    color: darkSlate,
  });

  y -= 14;
  page.drawText(`GSTIN: ${STORE_DETAILS.gstin}  |  PAN: ${STORE_DETAILS.pan}`, {
    x: 40,
    y,
    size: 8.5,
    font: fontRegular,
    color: mutedGray,
  });

  const dateStr = new Date(invoice.issuedAt || Date.now()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  page.drawText(`Date: ${dateStr}`, {
    x: 440,
    y,
    size: 8.5,
    font: fontRegular,
    color: darkSlate,
  });

  y -= 14;
  page.drawText(`Email: ${STORE_DETAILS.email}  |  Web: ${STORE_DETAILS.website}`, {
    x: 40,
    y,
    size: 8.5,
    font: fontRegular,
    color: mutedGray,
  });

  page.drawText(`Order #: ${invoice.orderNumber}`, {
    x: 440,
    y,
    size: 8.5,
    font: fontBold,
    color: darkSlate,
  });

  y -= 18;
  page.drawLine({
    start: { x: 40, y },
    end: { x: 555, y },
    thickness: 1,
    color: lineGray,
  });

  // Customer & Billing Information Box
  y -= 20;
  page.drawRectangle({
    x: 40,
    y: y - 65,
    width: 515,
    height: 75,
    color: lightBg,
    borderColor: lineGray,
    borderWidth: 1,
  });

  page.drawText("BILLED & SHIPPED TO:", {
    x: 52,
    y: y - 4,
    size: 8.5,
    font: fontBold,
    color: navy,
  });

  const cust = invoice.customerDetails;
  page.drawText(cust.name, {
    x: 52,
    y: y - 18,
    size: 10,
    font: fontBold,
    color: darkSlate,
  });

  const addr = cust.shippingAddress;
  const fullAddress = `${addr.street}${addr.landmark ? `, ${addr.landmark}` : ""}, ${addr.city}, ${addr.state} - ${addr.pinCode}`;
  page.drawText(fullAddress, {
    x: 52,
    y: y - 31,
    size: 8.5,
    font: fontRegular,
    color: darkSlate,
  });

  page.drawText(`Phone: ${cust.phone}  |  Email: ${cust.email}`, {
    x: 52,
    y: y - 44,
    size: 8.5,
    font: fontRegular,
    color: darkSlate,
  });

  page.drawText(`Payment Method: ${invoice.paymentMethod}  |  Status: ${invoice.paymentStatus}`, {
    x: 52,
    y: y - 57,
    size: 8.5,
    font: fontBold,
    color: navy,
  });

  y -= 85;

  // Itemized Products Table Header
  page.drawRectangle({
    x: 40,
    y: y - 18,
    width: 515,
    height: 22,
    color: navy,
  });

  page.drawText("#", { x: 48, y: y - 12, size: 8.5, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("PRODUCT / DESCRIPTION", { x: 68, y: y - 12, size: 8.5, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("SKU", { x: 250, y: y - 12, size: 8.5, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("HSN", { x: 335, y: y - 12, size: 8.5, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("QTY", { x: 385, y: y - 12, size: 8.5, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("PRICE", { x: 420, y: y - 12, size: 8.5, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("TOTAL (INR)", { x: 480, y: y - 12, size: 8.5, font: fontBold, color: rgb(1, 1, 1) });

  y -= 20;

  // Items Rows
  let rowIndex = 1;
  for (const item of invoice.items) {
    y -= 18;

    page.drawText(String(rowIndex++), { x: 48, y, size: 8.5, font: fontRegular, color: darkSlate });

    const titleTruncated = item.productTitle.length > 32
      ? item.productTitle.substring(0, 30) + "..."
      : item.productTitle;
    page.drawText(titleTruncated, { x: 68, y, size: 8.5, font: fontBold, color: darkSlate });

    page.drawText(item.productSku || "-", { x: 250, y, size: 8, font: fontRegular, color: mutedGray });
    page.drawText(item.hsn || "95030090", { x: 335, y, size: 8, font: fontRegular, color: mutedGray });
    page.drawText(String(item.quantity), { x: 392, y, size: 8.5, font: fontBold, color: darkSlate });
    page.drawText(`Rs. ${item.unitPrice.toLocaleString("en-IN")}`, { x: 410, y, size: 8.5, font: fontRegular, color: darkSlate });
    page.drawText(`Rs. ${item.total.toLocaleString("en-IN")}`, { x: 475, y, size: 8.5, font: fontBold, color: darkSlate });

    // Subtle row line
    page.drawLine({
      start: { x: 40, y: y - 4 },
      end: { x: 555, y: y - 4 },
      thickness: 0.5,
      color: lineGray,
    });
  }

  y -= 25;

  // GST Breakdown & Financial Totals Box
  const gst = invoice.gstDetails;
  const pricing = invoice.pricing;

  // Left side: Tax summary table
  page.drawRectangle({
    x: 40,
    y: y - 75,
    width: 250,
    height: 80,
    color: lightBg,
    borderColor: lineGray,
    borderWidth: 0.5,
  });

  page.drawText("TAX SPECIFICATION (18% GST)", {
    x: 48,
    y: y - 10,
    size: 8,
    font: fontBold,
    color: navy,
  });

  if (gst.cgstRate > 0) {
    page.drawText(`CGST (9%): Rs. ${gst.cgstAmount.toLocaleString("en-IN")}`, {
      x: 48,
      y: y - 24,
      size: 8,
      font: fontRegular,
      color: darkSlate,
    });
    page.drawText(`SGST (9%): Rs. ${gst.sgstAmount.toLocaleString("en-IN")}`, {
      x: 48,
      y: y - 36,
      size: 8,
      font: fontRegular,
      color: darkSlate,
    });
  } else {
    page.drawText(`Integrated GST (18%): Rs. ${gst.igstAmount.toLocaleString("en-IN")}`, {
      x: 48,
      y: y - 26,
      size: 8,
      font: fontRegular,
      color: darkSlate,
    });
  }

  page.drawText(`Total Tax Included: Rs. ${gst.totalTax.toLocaleString("en-IN")}`, {
    x: 48,
    y: y - 50,
    size: 8,
    font: fontBold,
    color: darkSlate,
  });

  page.drawText(`HSN Code: ${gst.hsnCode} (Anime scale models)`, {
    x: 48,
    y: y - 62,
    size: 7.5,
    font: fontRegular,
    color: mutedGray,
  });

  // Right side: Financial Totals
  const rightBoxX = 330;
  page.drawText("Subtotal:", { x: rightBoxX, y: y - 10, size: 9, font: fontRegular, color: mutedGray });
  page.drawText(`Rs. ${pricing.subtotal.toLocaleString("en-IN")}`, { x: 475, y: y - 10, size: 9, font: fontBold, color: darkSlate });

  page.drawText("Shipping / Delivery:", { x: rightBoxX, y: y - 24, size: 9, font: fontRegular, color: mutedGray });
  page.drawText(`Rs. ${pricing.shippingFee.toLocaleString("en-IN")}`, { x: 475, y: y - 24, size: 9, font: fontBold, color: darkSlate });

  page.drawLine({
    start: { x: rightBoxX, y: y - 34 },
    end: { x: 555, y: y - 34 },
    thickness: 1,
    color: lineGray,
  });

  page.drawText("GRAND TOTAL:", { x: rightBoxX, y: y - 48, size: 11, font: fontBold, color: navy });
  page.drawText(`Rs. ${pricing.grandTotal.toLocaleString("en-IN")}`, { x: 460, y: y - 48, size: 12, font: fontBold, color: navy });

  // Footer & Declarations
  y -= 130;
  page.drawLine({
    start: { x: 40, y },
    end: { x: 555, y },
    thickness: 1,
    color: lineGray,
  });

  y -= 14;
  page.drawText("Declaration: This is a computer-generated tax invoice and requires no physical signature.", {
    x: 40,
    y,
    size: 7.5,
    font: fontRegular,
    color: mutedGray,
  });

  y -= 11;
  page.drawText("FiguresWorld Anime Store • All authentic scale figures & licensed collectibles.", {
    x: 40,
    y,
    size: 7.5,
    font: fontRegular,
    color: mutedGray,
  });

  return pdfDoc.save();
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
    pdfUrl: `/uploads/invoices/${invoiceNumber}.pdf`,
    pdfPath: path.join(process.cwd(), "public", "uploads", "invoices", `${invoiceNumber}.pdf`),
    sentToCustomer: false,
    issuedAt: new Date(),
  };

  // Render vector PDF
  const pdfBytes = await renderInvoicePdf(invoiceData);

  // Ensure storage directory exists
  const invoiceDir = path.join(process.cwd(), "public", "uploads", "invoices");
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
