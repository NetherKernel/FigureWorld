import { connectToDatabase } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { sendInvoiceEmail } from "@/lib/email";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ invoiceNumber: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedError("Authentication required.");
    }
    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      throw new ForbiddenError("Only Admin and Staff can trigger invoice emails.");
    }

    const { invoiceNumber } = await params;
    if (!invoiceNumber) {
      throw new ValidationError("Invoice number is required.");
    }

    await connectToDatabase();

    const invoice = await Invoice.findOne({ invoiceNumber: invoiceNumber.toUpperCase() });
    if (!invoice) {
      throw new NotFoundError(`Invoice "${invoiceNumber}" not found.`);
    }

    const emailResult = await sendInvoiceEmail({
      customerEmail: invoice.customerDetails.email,
      customerName: invoice.customerDetails.name,
      invoiceNumber: invoice.invoiceNumber,
      orderNumber: invoice.orderNumber,
      grandTotal: invoice.pricing.grandTotal,
      pdfUrl: `/api/invoices/${invoice.invoiceNumber}/pdf`,
      pdfPath: invoice.pdfPath,
    });

    invoice.sentToCustomer = true;
    invoice.sentAt = new Date();
    await invoice.save();

    return apiSuccess(
      {
        invoiceNumber: invoice.invoiceNumber,
        sentTo: invoice.customerDetails.email,
        sentAt: invoice.sentAt,
        messageId: emailResult.messageId,
      },
      `Invoice sent to customer at ${invoice.customerDetails.email}.`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
