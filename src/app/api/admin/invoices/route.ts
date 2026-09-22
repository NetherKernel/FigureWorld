import { connectToDatabase } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    await requireRole(req, "ADMIN", "STAFF");
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").toLowerCase().trim();

    const invoices = await Invoice.find({}).sort({ createdAt: -1 });

    let filtered = invoices;
    if (query) {
      filtered = invoices.filter((inv: any) => {
        const invNum = (inv.invoiceNumber || "").toLowerCase();
        const ordNum = (inv.orderNumber || "").toLowerCase();
        const custName = (inv.customerDetails?.name || inv.customer?.name || "").toLowerCase();
        const custEmail = (inv.customerDetails?.email || inv.customer?.email || "").toLowerCase();
        return (
          invNum.includes(query) ||
          ordNum.includes(query) ||
          custName.includes(query) ||
          custEmail.includes(query)
        );
      });
    }

    const totalAmount = filtered.reduce(
      (sum: number, inv: any) => sum + Number(inv.pricing?.grandTotal || inv.grandTotal || 0),
      0
    );
    const totalTax = filtered.reduce(
      (sum: number, inv: any) => sum + Number(inv.gstDetails?.totalTax || inv.pricing?.taxTotal || 0),
      0
    );

    const mapped = filtered.map((inv: any) => ({
      _id: inv._id.toString(),
      invoiceNumber: inv.invoiceNumber,
      orderNumber: inv.orderNumber,
      invoiceDate: inv.issuedAt || inv.invoiceDate || inv.createdAt,
      customerName: inv.customerDetails?.name || inv.customer?.name || "Customer",
      customerEmail: inv.customerDetails?.email || inv.customer?.email || "",
      customerPhone: inv.customerDetails?.phone || inv.customer?.phone || "",
      grandTotal: Number(inv.pricing?.grandTotal || inv.grandTotal || 0),
      subtotal: Number(inv.pricing?.subtotal || inv.subtotal || 0),
      totalTax: Number(inv.gstDetails?.totalTax || inv.pricing?.taxTotal || 0),
      paymentMethod: inv.paymentMethod || inv.paymentDetails?.method || "UPI",
      paymentStatus: inv.paymentStatus || inv.paymentDetails?.status || "PAID",
      pdfUrl: `/api/invoices/${inv.invoiceNumber}/pdf`,
      sentAt: inv.sentAt || null,
      status: inv.sentToCustomer ? "SENT" : "ISSUED",
    }));

    return apiSuccess({
      invoices: mapped,
      metrics: {
        totalInvoices: mapped.length,
        totalAmount,
        totalTax,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
