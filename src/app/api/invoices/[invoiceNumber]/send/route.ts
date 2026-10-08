import { sendInvoiceEmail } from "@/lib/email";
import { getAuthenticatedUser } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

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

    const { data: invoice } = await supabase
      .from("invoices")
      .select("*")
      .ilike("invoice_number", invoiceNumber.trim())
      .maybeSingle();

    if (!invoice) {
      throw new NotFoundError(`Invoice "${invoiceNumber}" not found.`);
    }

    const customerDetails = invoice.customer_details || {};
    const pricing = invoice.pricing || {};

    const emailResult = await sendInvoiceEmail({
      customerEmail: customerDetails.email,
      customerName: customerDetails.name,
      invoiceNumber: invoice.invoice_number,
      orderNumber: invoice.order_number,
      grandTotal: pricing.grandTotal,
      pdfUrl: `/api/invoices/${invoice.invoice_number}/pdf`,
      pdfPath: invoice.pdf_path,
    });

    const sentAt = new Date().toISOString();
    await supabase
      .from("invoices")
      .update({
        sent_to_customer: true,
        sent_at: sentAt,
      })
      .eq("id", invoice.id);

    return apiSuccess(
      {
        invoiceNumber: invoice.invoice_number,
        sentTo: customerDetails.email,
        sentAt,
        messageId: emailResult.messageId,
      },
      `Invoice sent to customer at ${customerDetails.email}.`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
