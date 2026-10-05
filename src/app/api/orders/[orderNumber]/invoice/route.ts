import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { Invoice } from "@/models/Invoice";
import { createInvoiceForOrder } from "@/lib/invoice";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    if (!orderNumber) {
      throw new ValidationError("Order number is required");
    }

    await connectToDatabase();

    const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() });
    if (!order) {
      throw new NotFoundError(`Order "${orderNumber}" not found`);
    }

    let invoice: any = await Invoice.findOne({ order: order._id });

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
    ].includes(order.orderStatus);

    if (!invoice && isConfirmed) {
      invoice = await createInvoiceForOrder(order.orderNumber);
    }

    if (!invoice) {
      throw new NotFoundError(`Invoice has not been generated for order "${orderNumber}" yet. Order must be confirmed.`);
    }

    return apiSuccess({
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

    await connectToDatabase();

    const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() });
    if (!order) {
      throw new NotFoundError(`Order "${orderNumber}" not found`);
    }

    // Generate invoice (server-side numbering, PDF rendering, file write, customer email)
    const invoice = await createInvoiceForOrder(order.orderNumber, { sendCustomerEmail: true });

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
