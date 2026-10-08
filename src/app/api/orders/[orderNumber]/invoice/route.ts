import { createInvoiceForOrder } from "@/lib/invoice";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { findSupabaseOrder } from "@/lib/orders-supabase";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    if (!orderNumber) {
      throw new ValidationError("Order number is required");
    }

    const order = await findSupabaseOrder(orderNumber);
    if (!order) {
      throw new NotFoundError(`Order "${orderNumber}" not found`);
    }

    const { data: supaInv } = await supabase
      .from("invoices")
      .select("*")
      .ilike("order_number", orderNumber.trim())
      .maybeSingle();

    let invoice: any = supaInv;

    // If order is confirmed and invoice doesn't exist yet, automatically generate it
    const isConfirmed = [
      "CONFIRMED",
      "confirmed",
      "PROCESSING",
      "processing",
      "PACKED",
      "DISPATCHED",
      "shipped",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "delivered",
    ].includes(order.order_status);

    if (!invoice && isConfirmed) {
      invoice = await createInvoiceForOrder(order.order_number);
    }

    if (!invoice) {
      throw new NotFoundError(
        `Invoice has not been generated for order "${orderNumber}" yet. Order must be confirmed.`
      );
    }

    const invNum = invoice.invoice_number || invoice.invoiceNumber;
    return apiSuccess({
      invoiceNumber: invNum,
      orderNumber: invoice.order_number || invoice.orderNumber,
      issuedAt: invoice.issued_at || invoice.issuedAt,
      customerDetails: invoice.customer_details || invoice.customerDetails,
      storeDetails: invoice.store_details || invoice.storeDetails,
      gstDetails: invoice.gst_details || invoice.gstDetails,
      items: invoice.items,
      pricing: invoice.pricing,
      paymentMethod: invoice.payment_method || invoice.paymentMethod,
      paymentStatus: invoice.payment_status || invoice.paymentStatus,
      pdfUrl: `/api/invoices/${invNum}/pdf`,
      sentToCustomer: invoice.sent_to_customer ?? invoice.sentToCustomer,
      sentAt: invoice.sent_at || invoice.sentAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    if (!orderNumber) {
      throw new ValidationError("Order number is required");
    }

    const order = await findSupabaseOrder(orderNumber);
    if (!order) {
      throw new NotFoundError(`Order "${orderNumber}" not found`);
    }

    // Generate invoice (server-side numbering, PDF rendering, file write, customer email)
    const invoice = await createInvoiceForOrder(order.order_number, { sendCustomerEmail: true });

    return apiSuccess(
      {
        invoiceNumber: invoice.invoiceNumber,
        orderNumber: invoice.orderNumber,
        issuedAt: invoice.issuedAt,
        customerDetails: invoice.customerDetails,
        storeDetails: invoice.storeDetails,
        gstDetails: invoice.gstDetails,
        items: invoice.items,
        pricing: invoice.pricing,
        paymentMethod: invoice.paymentMethod,
        paymentStatus: invoice.paymentStatus,
        pdfUrl: `/api/invoices/${invoice.invoiceNumber}/pdf`,
        sentToCustomer: invoice.sentToCustomer,
        sentAt: invoice.sentAt,
      },
      `Invoice ${invoice.invoiceNumber} successfully generated.`,
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
