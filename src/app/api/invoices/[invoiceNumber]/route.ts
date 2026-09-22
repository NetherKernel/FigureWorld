import { connectToDatabase } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ invoiceNumber: string }> }
) {
  try {
    const { invoiceNumber } = await params;
    if (!invoiceNumber) {
      throw new ValidationError("Invoice number is required.");
    }

    // Require authentication
    const user = await requireAuth(req);

    await connectToDatabase();

    const invoice = await Invoice.findOne({ invoiceNumber: invoiceNumber.toUpperCase() });
    if (!invoice) {
      throw new NotFoundError(`Invoice "${invoiceNumber}" not found.`);
    }

    // RBAC Ownership check: CUSTOMER can only view their own invoice
    if (user.role === "CUSTOMER") {
      const customerEmail = (invoice.customerDetails?.email || "").toLowerCase().trim();
      const userEmail = (user.email || "").toLowerCase().trim();
      const customerId = invoice.customer?.toString();
      const userId = user.userId?.toString();

      const isOwner = (userEmail && customerEmail === userEmail) || (userId && customerId === userId);
      if (!isOwner) {
        throw new ForbiddenError("Access denied: You are not authorized to view this invoice.");
      }
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
