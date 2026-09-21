import fs from "fs/promises";
import path from "path";
import { connectToDatabase } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { renderInvoicePdf } from "@/lib/invoice";
import { NotFoundError } from "@/lib/errors";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ invoiceNumber: string }> }
) {
  try {
    const { invoiceNumber } = await params;
    if (!invoiceNumber) {
      return new Response("Invoice number is required", { status: 400 });
    }

    await connectToDatabase();

    const invoice = await Invoice.findOne({ invoiceNumber: invoiceNumber.toUpperCase() });
    if (!invoice) {
      return new Response(`Invoice ${invoiceNumber} not found`, { status: 404 });
    }

    let pdfBuffer: Buffer | Uint8Array;

    // Check if file exists on disk
    try {
      pdfBuffer = await fs.readFile(invoice.pdfPath);
    } catch {
      // If file doesn't exist on disk, re-render it dynamically
      pdfBuffer = await renderInvoicePdf(invoice);
      const invoiceDir = path.join(process.cwd(), "public", "uploads", "invoices");
      await fs.mkdir(invoiceDir, { recursive: true });
      await fs.writeFile(invoice.pdfPath, Buffer.from(pdfBuffer));
    }

    return new Response(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    return new Response(`Error loading PDF: ${err.message}`, { status: 500 });
  }
}
