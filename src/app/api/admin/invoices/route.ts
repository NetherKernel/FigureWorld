import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    await requireRole(req, "ADMIN", "STAFF");

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").toLowerCase().trim();

    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to load invoices: ${error.message}`);
    }

    let filtered = invoices || [];
    if (query) {
      filtered = filtered.filter((inv: any) => {
        const invNum = (inv.invoice_number || "").toLowerCase();
        const ordNum = (inv.order_number || "").toLowerCase();
        const custName = (inv.customer_details?.name || "").toLowerCase();
        const custEmail = (inv.customer_details?.email || "").toLowerCase();
        return (
          invNum.includes(query) ||
          ordNum.includes(query) ||
          custName.includes(query) ||
          custEmail.includes(query)
        );
      });
    }

    const totalAmount = filtered.reduce(
      (sum: number, inv: any) => sum + Number(inv.pricing?.grandTotal || 0),
      0
    );
    const totalTax = filtered.reduce(
      (sum: number, inv: any) => sum + Number(inv.gst_details?.totalTax || inv.pricing?.taxTotal || 0),
      0
    );

    const mapped = filtered.map((inv: any) => ({
      _id: inv.id,
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      orderNumber: inv.order_number,
      invoiceDate: inv.issued_at || inv.created_at,
      customerName: inv.customer_details?.name || "Customer",
      customerEmail: inv.customer_details?.email || "",
      customerPhone: inv.customer_details?.phone || "",
      grandTotal: Number(inv.pricing?.grandTotal || 0),
      subtotal: Number(inv.pricing?.subtotal || 0),
      totalTax: Number(inv.gst_details?.totalTax || inv.pricing?.taxTotal || 0),
      paymentMethod: inv.payment_method || "UPI",
      paymentStatus: inv.payment_status || "PAID",
      pdfUrl: `/api/invoices/${inv.invoice_number}/pdf`,
      sentAt: inv.sent_at || null,
      status: inv.sent_to_customer ? "SENT" : "ISSUED",
    }));

    return apiSuccess({
      invoices: mapped,
      totalInvoices: mapped.length,
      totalAmount,
      totalTax,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
