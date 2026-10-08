import { supabase } from "@/lib/supabase";
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

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*")
      .ilike("invoice_number", invoiceNumber.trim())
      .maybeSingle();

    if (error || !invoice) {
      throw new NotFoundError(`Invoice "${invoiceNumber}" not found.`);
    }

    // RBAC Ownership check: CUSTOMER can only view their own invoice
    if (user.role === "CUSTOMER") {
      const customerEmail = (invoice.customer_details?.email || "").toLowerCase().trim();
      const userEmail = (user.email || "").toLowerCase().trim();
      const customerId = invoice.customer_id?.toString();
      const userId = user.userId?.toString();

      const isOwner = (userEmail && customerEmail === userEmail) || (userId && customerId === userId);
      if (!isOwner) {
        throw new ForbiddenError("Access denied: You are not authorized to view this invoice.");
      }
    }

    return apiSuccess({
      invoiceNumber: invoice.invoice_number,
      orderNumber: invoice.order_number,
      issuedAt: invoice.issued_at,
      customerDetails: invoice.customer_details,
      storeDetails: invoice.store_details,
      gstDetails: invoice.gst_details,
      items: invoice.items,
      pricing: invoice.pricing,
      paymentMethod: invoice.payment_method,
      paymentStatus: invoice.payment_status,
      paymentRef: invoice.payment_ref,
      pdfUrl: `/api/invoices/${invoice.invoice_number}/pdf`,
      sentToCustomer: invoice.sent_to_customer,
      sentAt: invoice.sent_at,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
