import { connectToDatabase } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError, ValidationError } from "@/lib/errors";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ invoiceNumber: string }> }
) {
  try {
    const { invoiceNumber } = await params;
    if (!invoiceNumber) {
      throw new ValidationError("Invoice number is required.");
    }

    await connectToDatabase();

    const invoice = await Invoice.findOne({ invoiceNumber: invoiceNumber.toUpperCase() });
    if (!invoice) {
      throw new NotFoundError(`Invoice "${invoiceNumber}" not found.`);
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
      paymentRef: invoice.paymentRef,
      pdfUrl: invoice.pdfUrl,
      sentToCustomer: invoice.sentToCustomer,
      sentAt: invoice.sentAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
