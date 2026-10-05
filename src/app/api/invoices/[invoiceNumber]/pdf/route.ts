import { connectToDatabase } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
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

    await connectToDatabase();

    const invoice = await Invoice.findOne({ invoiceNumber: invoiceNumber.toUpperCase() });
    if (!invoice) {
      return new Response(`Invoice ${invoiceNumber} not found`, { status: 404 });
    }

    // RBAC Ownership Check
    if (user.role === "CUSTOMER") {
      const customerEmail = (invoice.customerDetails?.email || "").toLowerCase().trim();
      const userEmail = (user.email || "").toLowerCase().trim();
      const customerId = invoice.customer?.toString();
      const userId = user.userId?.toString();

      const isOwner = (userEmail && customerEmail === userEmail) || (userId && customerId === userId);
      if (!isOwner) {
        return new Response("Forbidden: You are not authorized to download this invoice", { status: 403 });
      }
    }

    // Always render from the stored invoice data, so every copy uses the current template
    const pdfBuffer = await renderInvoicePdf(invoice);

    return new Response(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    return new Response(`Error loading PDF: ${err.message}`, { status: 500 });
  }
}
