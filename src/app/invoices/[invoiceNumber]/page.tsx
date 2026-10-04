"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Printer, Download, ArrowLeft, FileText, Copy, Check, Lock } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { Logo } from "@/components/ui/Logo";

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

/**
 * When printing, pin every design token to its light value so the invoice
 * always comes out dark-on-white, even if the shopper is browsing in dark mode.
 */
const PRINT_LIGHT_TOKENS =
  "print:[--bg:#ffffff] print:[--surface:#ffffff] print:[--surface-2:#f7f7f8] print:[--surface-3:#ececee] " +
  "print:[--line:#d4d4d8] print:[--line-strong:#a1a1aa] print:[--fg:#000000] print:[--fg-2:#27272a] " +
  "print:[--muted:#52525b] print:[--brand:#d7141a] print:[--brand-ink:#b3121a] print:[--brand-soft:#fdeced] " +
  "print:[--success:#067d62] print:[--success-soft:#e7f6f1] print:[--warn:#b45309] print:[--warn-soft:#fff6e5]";

function isPaidStatus(status: string) {
  return /paid|success|captured|completed|verified/i.test(status);
}

export default function InvoiceViewPage() {
  const params = useParams();
  const rawInvoiceNumber = params.invoiceNumber as string;

  const [invoice, setInvoice] = useState<IInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
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
        } else {
          setErrorStatus(res.status);
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
    if (invoice?.invoiceNumber && navigator.clipboard) {
      navigator.clipboard
        .writeText(invoice.invoiceNumber)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          /* clipboard unavailable (e.g. insecure context) — ignore */
        });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-bg p-4">
        <div className="space-y-3 text-center" role="status">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="text-sm text-muted">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    const needsSignIn = errorStatus === 401;
    const forbidden = errorStatus === 403;
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-bg p-4">
        <div className="card w-full max-w-md animate-fade-up space-y-4 p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-3 text-muted">
            {needsSignIn || forbidden ? <Lock className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
          </span>
          <h1 className="text-lg font-bold text-fg">
            {needsSignIn ? "Sign in to view this invoice" : forbidden ? "Invoice unavailable" : "Invoice not found"}
          </h1>
          <p className="text-sm text-fg-2">
            {needsSignIn
              ? "Invoices are only available to the account that placed the order."
              : forbidden
                ? "This invoice belongs to a different account."
                : `We couldn't find invoice #${rawInvoiceNumber}. It may not have been generated yet.`}
          </p>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            {needsSignIn && (
              <Link
                href={`/auth/login?redirect=${encodeURIComponent(`/invoices/${rawInvoiceNumber}`)}`}
                className="btn btn-primary min-h-10"
              >
                Sign in
              </Link>
            )}
            <Link href="/" className={`btn min-h-10 ${needsSignIn ? "btn-secondary" : "btn-primary"}`}>
              <ArrowLeft className="h-4 w-4" />
              Return to store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { customerDetails, storeDetails, gstDetails, items, pricing } = invoice;
  const isInterState = gstDetails.igstRate > 0;
  const totalGstRate = gstDetails.cgstRate + gstDetails.sgstRate + gstDetails.igstRate;
  const paid = isPaidStatus(invoice.paymentStatus);
  const issuedDate = new Date(invoice.issuedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className={`bg-bg px-4 py-6 sm:px-6 sm:py-10 lg:px-8 print:bg-white print:p-0 print:text-black ${PRINT_LIGHT_TOKENS}`}
    >
      {/* Action bar (hidden when printed) */}
      <div className="mx-auto mb-5 flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center gap-1.5 self-start text-sm font-medium text-fg-2 transition hover:text-brand-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Figure World
        </Link>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <button type="button" onClick={() => window.print()} className="btn btn-secondary min-h-10">
            <Printer className="h-4 w-4" />
            Print
          </button>
          <a
            href={`/api/invoices/${encodeURIComponent(invoice.invoiceNumber)}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary min-h-10"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </a>
        </div>
      </div>

      {/* Invoice paper */}
      <article className="mx-auto max-w-4xl animate-fade-up overflow-hidden rounded-xl border border-line bg-surface shadow-card print:max-w-none print:animate-none print:rounded-none print:border-0 print:shadow-none">
        {/* Brand accent rule */}
        <div className="h-1.5 bg-brand [print-color-adjust:exact]" aria-hidden="true" />

        <div className="space-y-8 p-5 sm:p-10 print:px-0 print:py-6">
          {/* Header */}
          <header className="flex flex-col gap-6 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex items-center gap-3">
                <Logo className="[print-color-adjust:exact]" />
                <p className="text-lg font-extrabold leading-tight tracking-tight text-fg">{storeDetails.name}</p>
              </div>
              <p className="max-w-sm text-xs leading-5 text-fg-2">{storeDetails.address}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-fg-2">
                <dt className="text-muted">GSTIN</dt>
                <dd className="font-mono font-semibold text-fg">{storeDetails.gstin}</dd>
                <dt className="text-muted">PAN</dt>
                <dd className="font-mono font-semibold text-fg">{storeDetails.pan}</dd>
                <dt className="text-muted">State</dt>
                <dd>
                  {storeDetails.state} ({storeDetails.stateCode || "27"})
                </dd>
                <dt className="text-muted">Contact</dt>
                <dd className="break-all">
                  {storeDetails.email} &middot; {storeDetails.website}
                </dd>
              </dl>
            </div>

            <div className="shrink-0 space-y-3 sm:text-right">
              <h1 className="text-2xl font-extrabold uppercase tracking-wide text-brand-ink">Tax Invoice</h1>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs sm:grid-cols-[1fr_auto]">
                <dt className="text-muted">Invoice #</dt>
                <dd className="flex items-center gap-1 font-mono font-bold text-fg sm:justify-end">
                  {invoice.invoiceNumber}
                  <button
                    type="button"
                    onClick={copyInvoiceNumber}
                    aria-label="Copy invoice number"
                    title="Copy invoice number"
                    className="-my-2 flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-surface-3 hover:text-fg print:hidden"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </dd>
                <dt className="text-muted">Invoice date</dt>
                <dd className="font-semibold text-fg">{issuedDate}</dd>
                <dt className="text-muted">Order #</dt>
                <dd className="font-mono font-bold text-fg">{invoice.orderNumber}</dd>
              </dl>
            </div>
          </header>

          {/* Billing & payment */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-surface-2 p-4 text-xs print:bg-white">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">Billed &amp; shipped to</h2>
              <p className="mt-2 text-sm font-bold text-fg">{customerDetails.name}</p>
              <p className="mt-1 leading-5 text-fg-2">
                {customerDetails.shippingAddress.street}
                {customerDetails.shippingAddress.landmark && `, ${customerDetails.shippingAddress.landmark}`}
                <br />
                {customerDetails.shippingAddress.city}, {customerDetails.shippingAddress.state} -{" "}
                {customerDetails.shippingAddress.pinCode}
                <br />
                {customerDetails.shippingAddress.country}
              </p>
              <p className="mt-2 leading-5 text-fg-2">
                Phone: <span className="font-semibold text-fg">{customerDetails.phone}</span>
                <br />
                Email: <span className="break-all font-semibold text-fg">{customerDetails.email}</span>
              </p>
            </div>

            <div className="rounded-lg border border-line bg-surface-2 p-4 text-xs print:bg-white">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">Payment</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-line-strong bg-surface px-2 py-0.5 text-xs font-bold text-fg">
                  {invoice.paymentMethod}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    paid ? "bg-success-soft text-success" : "bg-warn-soft text-warn"
                  } print:border print:border-line-strong print:bg-white`}
                >
                  {invoice.paymentStatus}
                </span>
              </div>
              {invoice.paymentRef && (
                <p className="mt-2 text-fg-2">
                  Payment reference: <span className="break-all font-mono font-semibold text-fg">{invoice.paymentRef}</span>
                </p>
              )}
              <p className="mt-2 text-fg-2">
                Place of supply: <span className="font-semibold text-fg">{customerDetails.shippingAddress.state}</span>
              </p>
              <p className="mt-0.5 text-muted">
                {isInterState ? "Inter-state supply (IGST)" : "Intra-state supply (CGST + SGST)"}
              </p>
            </div>
          </section>

          {/* Line items */}
          <section>
            <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0 print:mx-0 print:overflow-visible print:px-0">
              <table className="w-full min-w-[620px] border-collapse text-left text-xs print:min-w-0">
                <thead>
                  <tr className="border-y border-line-strong bg-surface-2 text-[11px] font-bold uppercase tracking-wider text-fg-2 print:bg-white">
                    <th scope="col" className="px-3 py-2.5">#</th>
                    <th scope="col" className="px-3 py-2.5">Item</th>
                    <th scope="col" className="px-3 py-2.5">SKU</th>
                    <th scope="col" className="px-3 py-2.5">HSN</th>
                    <th scope="col" className="px-3 py-2.5 text-center">Qty</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Unit price</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((it, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="px-3 py-3 text-muted">{idx + 1}</td>
                      <td className="px-3 py-3 font-semibold text-fg">{it.productTitle}</td>
                      <td className="px-3 py-3 font-mono text-fg-2">{it.productSku}</td>
                      <td className="px-3 py-3 font-mono text-fg-2">{it.hsn}</td>
                      <td className="px-3 py-3 text-center font-semibold text-fg">{it.quantity}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-fg-2">{formatPrice(it.unitPrice)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-fg">{formatPrice(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Tax summary & totals */}
          <section className="grid grid-cols-1 gap-6 border-t border-line pt-6 sm:grid-cols-2 sm:gap-10 print:grid-cols-2">
            <div className="rounded-lg border border-line p-4 text-xs">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">
                GST summary ({totalGstRate}%)
              </h2>
              <dl className="mt-2 space-y-1.5 text-fg-2">
                {isInterState ? (
                  <div className="flex justify-between gap-4">
                    <dt>Integrated GST (IGST {gstDetails.igstRate}%)</dt>
                    <dd className="font-semibold text-fg">{formatPrice(gstDetails.igstAmount)}</dd>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between gap-4">
                      <dt>Central GST (CGST {gstDetails.cgstRate}%)</dt>
                      <dd className="font-semibold text-fg">{formatPrice(gstDetails.cgstAmount)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>State GST (SGST {gstDetails.sgstRate}%)</dt>
                      <dd className="font-semibold text-fg">{formatPrice(gstDetails.sgstAmount)}</dd>
                    </div>
                  </>
                )}
                <div className="flex justify-between gap-4 border-t border-line pt-1.5 font-bold text-fg">
                  <dt>Total tax</dt>
                  <dd>{formatPrice(gstDetails.totalTax)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-[11px] leading-4 text-muted">
                GST of {totalGstRate}% applied under HSN {gstDetails.hsnCode} (toys, scale figures &amp; models).
                Prices are inclusive of tax.
              </p>
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4 text-fg-2">
                <dt>Subtotal</dt>
                <dd className="font-semibold text-fg">{formatPrice(pricing.subtotal)}</dd>
              </div>
              {pricing.discountTotal > 0 && (
                <div className="flex justify-between gap-4 text-fg-2">
                  <dt>Discount</dt>
                  <dd className="font-semibold text-success">-{formatPrice(pricing.discountTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 text-fg-2">
                <dt>Shipping &amp; handling</dt>
                <dd className="font-semibold text-fg">{formatPrice(pricing.shippingFee)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t-2 border-fg pt-3">
                <dt className="font-bold text-fg">Grand total</dt>
                <dd className="text-2xl font-extrabold text-brand-ink">{formatPrice(pricing.grandTotal)}</dd>
              </div>
              <p className="text-right text-[11px] text-muted">Amount in Indian Rupees (INR), inclusive of all taxes</p>
            </dl>
          </section>

          {/* Footer */}
          <footer className="space-y-1 border-t border-line pt-6 text-[11px] leading-4 text-muted">
            <p>
              <strong className="text-fg-2">Declaration:</strong> This is a computer-generated tax invoice issued by{" "}
              {storeDetails.name} and does not require a physical signature.
            </p>
            <p>
              Figure World &middot; Authentic anime figures, scale statues &amp; collectibles &middot; {storeDetails.website}
            </p>
          </footer>
        </div>
      </article>
    </div>
  );
}
