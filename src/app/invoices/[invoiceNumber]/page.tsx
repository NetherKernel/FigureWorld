"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Printer,
  Download,
  ArrowLeft,
  ShoppingBag,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building2,
  FileText,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { formatPrice } from "@/lib/format";

interface IInvoiceData {
  invoiceNumber: string;
  orderNumber: string;
  issuedAt: string;
  customerDetails: {
    name: string;
    email: string;
    phone: string;
    shippingAddress: {
      street: string;
      landmark?: string;
      city: string;
      state: string;
      pinCode: string;
      country: string;
    };
  };
  storeDetails: {
    name: string;
    address: string;
    gstin: string;
    pan: string;
    state: string;
    stateCode: string;
    email: string;
    phone: string;
    website: string;
  };
  gstDetails: {
    isApplicable: boolean;
    gstin: string;
    state: string;
    hsnCode: string;
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalTax: number;
  };
  items: Array<{
    productTitle: string;
    productSku: string;
    hsn: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxableAmount: number;
    taxRate: number;
    taxAmount: number;
    total: number;
  }>;
  pricing: {
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    shippingFee: number;
    grandTotal: number;
    currency: string;
  };
  paymentMethod: string;
  paymentStatus: string;
  paymentRef?: string;
  pdfUrl: string;
}

export default function InvoiceViewPage() {
  const params = useParams();
  const rawInvoiceNumber = params.invoiceNumber as string;

  const [invoice, setInvoice] = useState<IInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchInvoice() {
      if (!rawInvoiceNumber) return;
      try {
        const res = await fetch(`/api/invoices/${encodeURIComponent(rawInvoiceNumber)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setInvoice(json.data);
          }
        }
      } catch (err) {
        console.error("Failed to load invoice:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [rawInvoiceNumber]);

  const copyInvoiceNumber = () => {
    if (invoice?.invoiceNumber) {
      navigator.clipboard.writeText(invoice.invoiceNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto" />
          <p className="text-xs text-slate-500">Loading tax invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg space-y-4">
          <FileText className="h-12 w-12 text-slate-400 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900">Invoice Not Found</h1>
          <p className="text-xs text-slate-500">
            Could not find an invoice matching #{rawInvoiceNumber}. It may not have been generated yet.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Store</span>
          </Link>
        </div>
      </div>
    );
  }

  const { customerDetails, storeDetails, gstDetails, items, pricing } = invoice;
  const isInterState = gstDetails.igstRate > 0;

  return (
    <div className="min-h-screen bg-slate-100/70 py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Action Bar (hidden when printed) */}
      <div className="mx-auto max-w-4xl mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to FiguresWorld Store</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <Printer className="h-4 w-4" />
            <span>Print Invoice</span>
          </button>

          <a
            href={`/api/invoices/${invoice.invoiceNumber}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
          >
            <Download className="h-4 w-4" />
            <span>Download Official PDF</span>
          </a>
        </div>
      </div>

      {/* Invoice Document (A4 format style) */}
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-xl print:m-0 print:max-w-none print:rounded-none print:border-none print:p-0 print:shadow-none space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-7 w-7 text-indigo-600" />
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{storeDetails.name}</h1>
            </div>
            <p className="text-xs text-slate-500 max-w-sm">{storeDetails.address}</p>
            <div className="text-xs text-slate-600 space-y-0.5 pt-1 font-mono">
              <p>
                GSTIN: <span className="font-bold text-slate-900">{storeDetails.gstin}</span>
              </p>
              <p>
                PAN: <span className="font-bold text-slate-900">{storeDetails.pan}</span> • State: {storeDetails.state} (27)
              </p>
              <p className="text-slate-500 font-sans">
                Email: {storeDetails.email} • Web: {storeDetails.website}
              </p>
            </div>
          </div>

          <div className="sm:text-right space-y-2">
            <span className="inline-block rounded-lg bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-indigo-700 border border-indigo-200">
              Tax Invoice
            </span>
            <div className="space-y-1 text-xs text-slate-600 pt-1">
              <div className="flex items-center gap-1 sm:justify-end">
                <span className="text-slate-400">Invoice #:</span>
                <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span>
                <button
                  onClick={copyInvoiceNumber}
                  className="text-slate-400 hover:text-slate-600 print:hidden ml-1"
                  title="Copy Invoice #"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <p>
                <span className="text-slate-400">Date:</span>{" "}
                <span className="font-semibold text-slate-800">
                  {new Date(invoice.issuedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </p>
              <p>
                <span className="text-slate-400">Order Ref:</span>{" "}
                <span className="font-mono font-bold text-slate-900">#{invoice.orderNumber}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Customer & Billing Address Box */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-1.5">
              <span className="font-bold uppercase tracking-wider text-indigo-600 text-[10px]">
                Billed & Shipped To:
              </span>
              <p className="text-sm font-black text-slate-900">{customerDetails.name}</p>
              <p className="text-slate-600 leading-relaxed">
                {customerDetails.shippingAddress.street}
                {customerDetails.shippingAddress.landmark && `, ${customerDetails.shippingAddress.landmark}`}
                <br />
                {customerDetails.shippingAddress.city}, {customerDetails.shippingAddress.state} -{" "}
                {customerDetails.shippingAddress.pinCode}
                <br />
                {customerDetails.shippingAddress.country}
              </p>
              <p className="text-slate-500 pt-1">
                Phone: <span className="text-slate-800 font-semibold">{customerDetails.phone}</span>
                <br />
                Email: <span className="text-slate-800 font-semibold">{customerDetails.email}</span>
              </p>
            </div>

            <div className="space-y-1.5 sm:border-l sm:border-slate-200 sm:pl-6">
              <span className="font-bold uppercase tracking-wider text-indigo-600 text-[10px]">
                Payment Terms & Method:
              </span>
              <div className="flex items-center gap-2 pt-1">
                <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 font-bold text-slate-800 text-xs">
                  {invoice.paymentMethod}
                </span>
                <span className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 font-bold text-xs">
                  {invoice.paymentStatus}
                </span>
              </div>
              {invoice.paymentRef && (
                <p className="text-slate-500 text-[11px] pt-1">
                  UTR Reference ID: <span className="font-mono font-bold text-slate-800">{invoice.paymentRef}</span>
                </p>
              )}
              <p className="text-[11px] text-slate-400 pt-2">
                Supply Place: {customerDetails.shippingAddress.state} ({isInterState ? "Inter-State / IGST" : "Intra-State / CGST+SGST"})
              </p>
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">Product Description</th>
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">HSN Code</th>
                <th className="py-3 px-3 text-center">Qty</th>
                <th className="py-3 px-3 text-right">Unit Price</th>
                <th className="py-3 px-3 text-right">Total (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-3 text-slate-400">{idx + 1}</td>
                  <td className="py-3.5 px-3 font-bold text-slate-900">{it.productTitle}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-500">{it.productSku}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-500">{it.hsn}</td>
                  <td className="py-3.5 px-3 text-center font-bold text-slate-800">{it.quantity}</td>
                  <td className="py-3.5 px-3 text-right text-slate-700">{formatPrice(it.unitPrice)}</td>
                  <td className="py-3.5 px-3 text-right font-black text-slate-900">{formatPrice(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Tax Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-t border-slate-200 pt-6">
          {/* Left: GST Details */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-2 text-xs">
            <span className="font-bold text-indigo-700 block text-[11px]">GST Specification (18%)</span>
            <div className="space-y-1 text-slate-600">
              {isInterState ? (
                <div className="flex justify-between">
                  <span>Integrated GST (18%):</span>
                  <span className="font-semibold">{formatPrice(gstDetails.igstAmount)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>Central GST (CGST 9%):</span>
                    <span className="font-semibold">{formatPrice(gstDetails.cgstAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>State GST (SGST 9%):</span>
                    <span className="font-semibold">{formatPrice(gstDetails.sgstAmount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-800">
                <span>Total Tax Amount:</span>
                <span>{formatPrice(gstDetails.totalTax)}</span>
              </div>
              <p className="text-[10px] text-slate-400 pt-1">
                * GST rate 18% applied under HSN Code 95030090 (Toys, anime scale figures & models).
              </p>
            </div>
          </div>

          {/* Right: Financial Totals */}
          <div className="space-y-2 text-xs sm:pl-6">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">{formatPrice(pricing.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Shipping & Handling:</span>
              <span className="font-semibold text-slate-900">{formatPrice(pricing.shippingFee)}</span>
            </div>
            <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-baseline font-black text-sm text-slate-900">
              <span>Grand Total:</span>
              <span className="text-xl text-indigo-600">{formatPrice(pricing.grandTotal)}</span>
            </div>
            <p className="text-[10px] text-slate-400 text-right">
              Amount in Indian Rupees (INR) • Inclusive of all taxes
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-6 text-[11px] text-slate-400 space-y-1">
          <p>
            <strong>Declaration:</strong> This is a computer-generated tax invoice issued by FiguresWorld Anime Store and does not require a physical signature.
          </p>
          <p>
            FiguresWorld Anime Store • Authentic anime figures, scales, statues & collectibles • www.figuresworld.com
          </p>
        </div>
      </div>
    </div>
  );
}
