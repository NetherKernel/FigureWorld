import fs from "fs/promises";
import path from "path";
import { supabase } from "./supabase";
import { logger } from "./logger";
import { sendInvoiceEmail } from "./email";
import { NotFoundError } from "./errors";
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
 */
export async function generateServerInvoiceNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const { count } = await supabase.from("invoices").select("*", { count: "exact", head: true });
  const sequence = String((count || 0) + 1).padStart(4, "0");
  return `FW-INV-${currentYear}-${sequence}`;
}

/**
 * Calculates GST breakdown based on destination state.
 * Standard Anime Collectibles HSN: 95030090 (18% GST).
 */
export function calculateGstBreakdown(subtotal: number, customerState: string) {
  const stateStr = (customerState || "").toLowerCase().trim();
  const isMaharashtra = stateStr === "maharashtra" || stateStr === "mh";

  const gstRate = 18;
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
 * Creates and stores an authoritative invoice for a confirmed order in Supabase PostgreSQL.
 */
export async function createInvoiceForOrder(
  orderIdentifier: string,
  options?: { sendCustomerEmail?: boolean }
): Promise<any> {
  const cleanId = orderIdentifier.trim();

  // Find order in Supabase
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
  let supaQuery = supabase.from("orders").select("*");
  if (isUuid) {
    supaQuery = supaQuery.eq("id", cleanId);
  } else {
    supaQuery = supaQuery.eq("order_number", cleanId.toUpperCase());
  }

  const { data: order } = await supaQuery.maybeSingle();

  if (!order) {
    throw new NotFoundError(`Order "${cleanId}" not found for invoice generation.`);
  }

  // Check if invoice already exists in Supabase
  const { data: existingInvoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("order_number", order.order_number)
    .maybeSingle();

  if (existingInvoice) {
    return existingInvoice;
  }

  const shippingAddr = order.shipping_address || {};
  const customerDetails = order.customer_details || {};
  const pricing = order.pricing || { subtotal: 0, grandTotal: 0, shippingFee: 0 };
  const items = Array.isArray(order.items) ? order.items : [];

  // Generate authoritative server-side invoice number
  const invoiceNumber = await generateServerInvoiceNumber();

  // Calculate GST tax breakdown
  const gst = calculateGstBreakdown(pricing.subtotal || 0, shippingAddr.state || "Maharashtra");

  // Build items data
  const invoiceItems = items.map((it: any) => {
    const itemTotal = it.total || it.price * (it.quantity || 1);
    const itemTaxable = Math.round((itemTotal / 1.18) * 100) / 100;
    const itemTax = Math.round((itemTotal - itemTaxable) * 100) / 100;
    return {
      productTitle: it.title || it.name || "Anime Collectible",
      productSku: it.sku || "",
      hsn: "95030090",
      quantity: it.quantity || 1,
      unitPrice: it.price || it.unitPrice || 0,
      discount: 0,
      taxableAmount: itemTaxable,
      taxRate: 18,
      taxAmount: itemTax,
      total: itemTotal,
    };
  });

  const invoiceData: any = {
    invoiceNumber,
    orderId: order.id,
    orderNumber: order.order_number,
    customerId: order.user_id,
    customerDetails: {
      name: customerDetails.name || shippingAddr.fullName || "Customer",
      email: customerDetails.email || "",
      phone: customerDetails.phone || shippingAddr.phone || "",
      shippingAddress: {
        street: shippingAddr.address || shippingAddr.streetLine1 || "",
        landmark: shippingAddr.landmark || "",
        city: shippingAddr.city || "",
        state: shippingAddr.state || "",
        pinCode: shippingAddr.postalCode || shippingAddr.pinCode || "",
        country: shippingAddr.country || "India",
      },
    },
    storeDetails: STORE_DETAILS,
    gstDetails: {
      isApplicable: true,
      gstin: STORE_DETAILS.gstin,
      state: shippingAddr.state || "Maharashtra",
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
      subtotal: pricing.subtotal || 0,
      discountTotal: pricing.discountTotal || 0,
      taxTotal: gst.totalTax,
      shippingFee: pricing.shippingFee || 0,
      grandTotal: pricing.grandTotal || 0,
      currency: "INR",
    },
    paymentMethod: order.payment_method || "COD",
    paymentStatus: order.payment_status || "PENDING",
    paymentRef: order.payment_ref || order.payment_details?.transactionRef || "",
    pdfUrl: `/api/invoices/${invoiceNumber}/pdf`,
    pdfPath: path.join(process.cwd(), "storage", "invoices", `${invoiceNumber}.pdf`),
    sentToCustomer: false,
    issuedAt: new Date().toISOString(),
  };

  // Render vector PDF
  try {
    const pdfBytes = await renderInvoicePdf(invoiceData);
    const invoiceDir = path.join(process.cwd(), "storage", "invoices");
    await fs.mkdir(invoiceDir, { recursive: true });
    await fs.writeFile(invoiceData.pdfPath, Buffer.from(pdfBytes));
    logger.info(`Generated PDF invoice: ${invoiceData.pdfPath}`);
  } catch (pdfErr) {
    logger.error("Failed to generate PDF invoice:", undefined, pdfErr);
  }

  // Insert into Supabase invoices table
  const { data: createdInvoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      order_id: order.id,
      order_number: order.order_number,
      customer_id: order.user_id,
      customer_details: invoiceData.customerDetails,
      store_details: invoiceData.storeDetails,
      gst_details: invoiceData.gstDetails,
      items: invoiceData.items,
      pricing: invoiceData.pricing,
      payment_method: invoiceData.paymentMethod,
      payment_status: invoiceData.paymentStatus,
      payment_ref: invoiceData.paymentRef,
      pdf_url: invoiceData.pdfUrl,
      sent_to_customer: false,
      issued_at: invoiceData.issuedAt,
    })
    .select("*")
    .single();

  if (invErr) {
    logger.error("Error saving invoice to Supabase:", undefined, invErr);
  }

  // Send to customer if requested
  const shouldSend = options?.sendCustomerEmail !== false;
  if (shouldSend && invoiceData.customerDetails.email) {
    try {
      await sendInvoiceEmail({
        customerEmail: invoiceData.customerDetails.email,
        customerName: invoiceData.customerDetails.name,
        invoiceNumber,
        orderNumber: order.order_number,
        grandTotal: pricing.grandTotal,
        pdfUrl: invoiceData.pdfUrl,
        pdfPath: invoiceData.pdfPath,
      });
      await supabase
        .from("invoices")
        .update({ sent_to_customer: true, sent_at: new Date().toISOString() })
        .eq("invoice_number", invoiceNumber);
    } catch (emailErr) {
      logger.error("Failed to send invoice email to customer:", { error: String(emailErr) });
    }
  }

  return createdInvoice || invoiceData;
}
