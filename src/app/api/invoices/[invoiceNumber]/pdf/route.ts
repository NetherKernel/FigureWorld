import { supabase } from "@/lib/supabase";
import { renderInvoicePdf } from "@/lib/invoice";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ invoiceNumber: string }> }
) {
  try {
    const { invoiceNumber } = await params;
    if (!invoiceNumber) {
      return new Response("Invoice number is required", { status: 400 });
    }

    // Require authentication
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return new Response("Authentication required to access invoice document", { status: 401 });
    }

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*")
      .ilike("invoice_number", invoiceNumber.trim())
      .maybeSingle();

    if (error || !invoice) {
      return new Response(`Invoice ${invoiceNumber} not found`, { status: 404 });
    }

    // RBAC Ownership Check
    if (user.role === "CUSTOMER") {
      const customerEmail = (invoice.customer_details?.email || "").toLowerCase().trim();
      const userEmail = (user.email || "").toLowerCase().trim();
      const customerId = invoice.customer_id?.toString();
      const userId = user.userId?.toString();

      const isOwner = (userEmail && customerEmail === userEmail) || (userId && customerId === userId);
      if (!isOwner) {
        return new Response("Forbidden: You are not authorized to download this invoice", { status: 403 });
      }
    }

    const invoiceDoc = {
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
    };

    const pdfBuffer = await renderInvoicePdf(invoiceDoc);

    return new Response(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoice_number}.pdf"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    return new Response(`Error loading PDF: ${err.message}`, { status: 500 });
  }
}
