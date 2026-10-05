"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, Check, Copy, Download, FileText, Lock, Printer } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { amountInWords } from "@/lib/amount-in-words";
import { backofficeHome } from "@/lib/backoffice";

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
 * always comes out dark-on-white, even if the viewer is browsing in dark mode.
 */
const PRINT_LIGHT_TOKENS =
  "print:[--bg:#ffffff] print:[--surface:#ffffff] print:[--surface-2:#f6f6f8] print:[--surface-3:#ececef] " +
  "print:[--line:#d9d9de] print:[--line-strong:#a1a1aa] print:[--fg:#000000] print:[--fg-2:#27272a] " +
  "print:[--muted:#52525b] print:[--brand:#d7141a] print:[--brand-ink:#b3121a] print:[--brand-soft:#fdeced] " +
  "print:[--success:#067d62] print:[--success-soft:#e7f6f1] print:[--warn:#b45309] print:[--warn-soft:#fff6e5]";

const PAYMENT_LABEL: Record<string, string> = { UPI: "UPI", COD: "Cash on Delivery", CASH: "Cash", CARD: "Card" };
const WALK_IN_EMAIL = "walk-in@instore.invalid";

/** Invoices always show paise: ₹2,499.00 */
const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (n: number) => INR.format(Number.isFinite(n) ? n : 0);

function isPaidStatus(status: string) {
  return /^(paid|success|captured|completed|verified)$/i.test(status);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-brand-ink">
      <span className="slash !h-3 !w-1.5" aria-hidden="true" />
      {children}
    </h2>
  );
}

export default function InvoiceViewPage() {
  const params = useParams();
  const rawInvoiceNumber = params.invoiceNumber as string;
  const { user } = useAuth();

  const [invoice, setInvoice] = useState<IInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!rawInvoiceNumber) return;
      try {
        const res = await fetch(`/api/invoices/${encodeURIComponent(rawInvoiceNumber)}`, { cache: "no-store" });
        if (!alive) return;
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) setInvoice(json.data);
        } else {
          setErrorStatus(res.status);
        }
      } catch (err) {
        console.error("Failed to load invoice:", err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [rawInvoiceNumber]);

  // QR code linking to this online copy (printed on the invoice)
  useEffect(() => {
    if (!invoice) return;
    let alive = true;
    QRCode.toDataURL(window.location.href, { margin: 1, width: 220, color: { dark: "#0b0b0dff", light: "#ffffffff" } })
      .then((url) => alive && setQr(url))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [invoice]);

  const backHref = backofficeHome(user?.role) || (user ? "/profile#orders" : "/");
  const backLabel = backofficeHome(user?.role) ? "Back to dashboard" : user ? "Back to your orders" : "Back to Figure World";

  const copyInvoiceNumber = () => {
    if (invoice?.invoiceNumber && navigator.clipboard) {
      navigator.clipboard
        .writeText(invoice.invoiceNumber)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          /* clipboard unavailable (e.g. insecure context) */
        });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-bg p-4">
        <div className="space-y-3 text-center" role="status">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="text-sm text-muted">Loading invoice…</p>
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
              <Link href={`/auth/login?redirect=${encodeURIComponent(`/invoices/${rawInvoiceNumber}`)}`} className="btn btn-primary min-h-10">
                Sign in
              </Link>
            )}
            <Link href={backHref} className={`btn min-h-10 ${needsSignIn ? "btn-secondary" : "btn-primary"}`}>
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { customerDetails, storeDetails, gstDetails, items, pricing } = invoice;
  const addr = customerDetails.shippingAddress;
  const isInterState = gstDetails.igstRate > 0;
  const inStore = invoice.orderNumber.startsWith("FW-POS-");
  const paid = isPaidStatus(invoice.paymentStatus);
  const refunded = /refund/i.test(invoice.paymentStatus);
  const taxable = pricing.subtotal - gstDetails.totalTax;
  const showEmail = customerDetails.email && customerDetails.email !== WALK_IN_EMAIL;
  const showPhone = customerDetails.phone && customerDetails.phone !== "Not provided";
  const issuedDate = new Date(invoice.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const stamp = paid
    ? { text: "Paid", cls: "border-success text-success bg-success-soft" }
    : refunded
      ? { text: "Refunded", cls: "border-line-strong text-fg-2 bg-surface-2" }
      : { text: "Payment pending", cls: "border-warn text-warn bg-warn-soft" };

  return (
    <div className={`min-h-screen bg-bg px-4 py-6 sm:px-6 sm:py-10 lg:px-8 print:min-h-0 print:bg-white print:p-0 print:text-black ${PRINT_LIGHT_TOKENS}`}>
      {/* Action bar (hidden when printed) */}
      <div className="mx-auto mb-5 flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link href={backHref} className="inline-flex min-h-10 items-center gap-1.5 self-start text-sm font-semibold text-fg-2 transition hover:text-brand-ink">
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <button type="button" onClick={() => window.print()} className="btn btn-secondary min-h-10">
            <Printer className="h-4 w-4" />
            Print
          </button>
          <a href={`/api/invoices/${encodeURIComponent(invoice.invoiceNumber)}/pdf`} target="_blank" rel="noopener noreferrer" className="btn btn-primary min-h-10">
            <Download className="h-4 w-4" />
            Download PDF
          </a>
        </div>
      </div>

      {/* Invoice paper */}
      <article className="mx-auto max-w-4xl animate-fade-up overflow-hidden rounded-2xl border border-line bg-surface shadow-pop print:max-w-none print:animate-none print:rounded-none print:border-0 print:shadow-none">
        {/* Black logo band */}
        <header className="relative overflow-hidden bg-black text-white [print-color-adjust:exact]">
          <span className="pointer-events-none absolute bottom-0 left-[44%] top-0 hidden w-10 skew-x-[-20deg] bg-brand sm:block" aria-hidden="true" />
          <span className="pointer-events-none absolute bottom-0 left-[49%] top-0 hidden w-3 skew-x-[-20deg] bg-brand/55 sm:block" aria-hidden="true" />
          <div className="relative flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Figure World — Collect × Display × Beyond" className="h-20 w-auto self-start object-contain sm:h-24" />
            <div className="sm:text-right">
              <h1 className="text-3xl font-bold uppercase tracking-wide sm:text-4xl">Tax Invoice</h1>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-xs sm:grid-cols-[1fr_auto]">
                <dt className="text-white/55">Invoice No.</dt>
                <dd className="flex items-center gap-1 font-mono font-bold sm:justify-end">
                  {invoice.invoiceNumber}
                  <button
                    type="button"
                    onClick={copyInvoiceNumber}
                    aria-label="Copy invoice number"
                    title="Copy invoice number"
                    className="-my-2 flex h-7 w-7 items-center justify-center rounded-md text-white/60 transition hover:bg-white/10 hover:text-white print:hidden"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </dd>
                <dt className="text-white/55">Invoice date</dt>
                <dd className="font-semibold">{issuedDate}</dd>
                <dt className="text-white/55">Order No.</dt>
                <dd className="font-mono font-bold">{invoice.orderNumber}</dd>
              </dl>
            </div>
          </div>
          <div className="h-1 bg-brand" aria-hidden="true" />
        </header>

        <div className="space-y-8 p-5 sm:p-10 print:px-0 print:py-6">
          {/* Thank-you + status stamp */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-fg">
              {inStore ? "Purchased in store at Figure World, Bandra West" : `Thank you for shopping with Figure World, ${customerDetails.name.split(" ")[0]}!`}
            </p>
            <span className={`rounded-md border-2 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] ${stamp.cls} [print-color-adjust:exact]`}>{stamp.text}</span>
          </div>

          {/* Sold by / Billed to / Payment */}
          <section className="grid grid-cols-1 gap-6 text-[13px] leading-6 sm:grid-cols-3">
            <div>
              <SectionLabel>Sold by</SectionLabel>
              <p className="font-bold text-fg">{storeDetails.name}</p>
              <p className="text-fg-2">{storeDetails.address}</p>
              <p className="text-fg-2">
                GSTIN <span className="font-mono font-semibold text-fg">{storeDetails.gstin}</span>
              </p>
              <p className="text-fg-2">
                PAN <span className="font-mono font-semibold text-fg">{storeDetails.pan}</span>
              </p>
              <p className="text-xs text-muted">
                {storeDetails.email}
                <br />
                {storeDetails.phone}
              </p>
            </div>
            <div>
              <SectionLabel>{inStore ? "Billed to" : "Billed & shipped to"}</SectionLabel>
              <p className="font-bold text-fg">{customerDetails.name}</p>
              {inStore ? (
                <p className="text-muted">Walk-in purchase at the store counter</p>
              ) : (
                <p className="text-fg-2">
                  {addr.street}
                  {addr.landmark && `, ${addr.landmark}`}
                  <br />
                  {addr.city}, {addr.state} - {addr.pinCode}
                  <br />
                  {addr.country}
                </p>
              )}
              {showPhone && <p className="text-fg-2">Phone: {customerDetails.phone}</p>}
              {showEmail && <p className="break-all text-fg-2">{customerDetails.email}</p>}
            </div>
            <div>
              <SectionLabel>Payment &amp; supply</SectionLabel>
              <p className="font-bold text-fg">{PAYMENT_LABEL[invoice.paymentMethod] || invoice.paymentMethod}</p>
              <p className="text-fg-2">Status: {paid ? "Paid" : invoice.paymentStatus.replace(/_/g, " ").toLowerCase()}</p>
              {invoice.paymentRef && (
                <p className="text-fg-2">
                  Ref: <span className="break-all font-mono font-semibold text-fg">{invoice.paymentRef}</span>
                </p>
              )}
              <p className="text-fg-2">Place of supply: {addr.state}</p>
              <p className="text-xs text-muted">{isInterState ? "Inter-state supply (IGST)" : "Intra-state supply (CGST + SGST)"}</p>
            </div>
          </section>

          {/* Line items */}
          <section className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0 print:mx-0 print:overflow-visible print:px-0">
            <table className="w-full min-w-[680px] border-collapse text-left text-xs print:min-w-0">
              <thead>
                <tr className="bg-ink text-[10px] font-bold uppercase tracking-[0.12em] text-white [print-color-adjust:exact]">
                  <th scope="col" className="rounded-l-lg px-3 py-3">#</th>
                  <th scope="col" className="px-3 py-3">Item</th>
                  <th scope="col" className="px-3 py-3">HSN</th>
                  <th scope="col" className="px-3 py-3 text-right">Qty</th>
                  <th scope="col" className="px-3 py-3 text-right">Rate</th>
                  <th scope="col" className="px-3 py-3 text-right">Taxable</th>
                  <th scope="col" className="px-3 py-3 text-right">GST {gstDetails.cgstRate + gstDetails.sgstRate + gstDetails.igstRate}%</th>
                  <th scope="col" className="rounded-r-lg px-3 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className={`align-top ${idx % 2 ? "bg-surface-2" : ""} [print-color-adjust:exact]`}>
                    <td className="px-3 py-3 text-muted">{idx + 1}</td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-fg">{it.productTitle}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted">SKU {it.productSku}</p>
                    </td>
                    <td className="px-3 py-3 font-mono text-fg-2">{it.hsn}</td>
                    <td className="px-3 py-3 text-right font-bold text-fg">{it.quantity}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-fg-2">{money(it.unitPrice)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-muted">{money(it.taxableAmount)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-muted">{money(it.taxAmount)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-fg">{money(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Tax summary & totals */}
          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 print:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface-2 p-5 text-xs [print-color-adjust:exact]">
              <SectionLabel>Tax summary</SectionLabel>
              <dl className="space-y-1.5 text-fg-2">
                <div className="flex justify-between gap-4">
                  <dt>Taxable value</dt>
                  <dd className="font-semibold text-fg">{money(taxable)}</dd>
                </div>
                {isInterState ? (
                  <div className="flex justify-between gap-4">
                    <dt>IGST @ {gstDetails.igstRate}%</dt>
                    <dd className="font-semibold text-fg">{money(gstDetails.igstAmount)}</dd>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between gap-4">
                      <dt>CGST @ {gstDetails.cgstRate}%</dt>
                      <dd className="font-semibold text-fg">{money(gstDetails.cgstAmount)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>SGST @ {gstDetails.sgstRate}%</dt>
                      <dd className="font-semibold text-fg">{money(gstDetails.sgstAmount)}</dd>
                    </div>
                  </>
                )}
                <div className="flex justify-between gap-4 border-t border-line pt-1.5 font-bold text-fg">
                  <dt>Total tax (included in prices)</dt>
                  <dd>{money(gstDetails.totalTax)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Amount in words</p>
              <p className="mt-1 text-[13px] font-semibold leading-5 text-fg">{amountInWords(pricing.grandTotal)}</p>
              <p className="mt-2 text-[11px] text-muted">HSN {gstDetails.hsnCode} — toys, scale figures &amp; models</p>
            </div>

            <div className="flex flex-col justify-between gap-4">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4 text-fg-2">
                  <dt>Subtotal (incl. GST)</dt>
                  <dd className="font-semibold text-fg">{money(pricing.subtotal)}</dd>
                </div>
                {pricing.discountTotal > 0 && (
                  <div className="flex justify-between gap-4 text-fg-2">
                    <dt>Discount</dt>
                    <dd className="font-semibold text-success">-{money(pricing.discountTotal)}</dd>
                  </div>
                )}
                {(!inStore || pricing.shippingFee > 0) && (
                  <div className="flex justify-between gap-4 text-fg-2">
                    <dt>Shipping &amp; handling</dt>
                    <dd className="font-semibold text-fg">{money(pricing.shippingFee)}</dd>
                  </div>
                )}
              </dl>
              <div className="relative overflow-hidden rounded-xl bg-brand px-5 py-4 text-white [print-color-adjust:exact]">
                <span className="pointer-events-none absolute -right-4 top-0 h-full w-10 skew-x-[-20deg] bg-white/15" aria-hidden="true" />
                <div className="relative flex items-baseline justify-between gap-4">
                  <span className="text-xs font-bold uppercase tracking-[0.16em]">Grand total</span>
                  <span className="font-display text-3xl font-bold">{money(pricing.grandTotal)}</span>
                </div>
              </div>
              <p className="-mt-2 text-right text-[11px] text-muted">Inclusive of all taxes · INR</p>
            </div>
          </section>

          {/* QR + signature */}
          <section className="flex flex-col gap-6 border-t border-line pt-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-4">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="QR code linking to this invoice" className="h-20 w-20 rounded-md border border-line bg-white p-1" />
              ) : (
                <div className="h-20 w-20 rounded-md border border-line bg-surface-2" />
              )}
              <div className="text-xs">
                <p className="font-bold text-fg">Scan to view this invoice online</p>
                <p className="mt-0.5 text-muted">Keep it for warranty and returns.</p>
              </div>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold text-fg">For {storeDetails.name}</p>
              <div className="ml-auto mt-8 w-44 border-t border-line-strong" />
              <p className="mt-1 text-muted">Authorised Signatory</p>
            </div>
          </section>

          {/* Footer */}
          <footer className="flex flex-col gap-2 border-t border-line pt-5 text-[11px] leading-4 text-muted sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold text-fg">Thank you for collecting with Figure World.</p>
              <p className="mt-1">This is a computer-generated tax invoice and requires no physical signature. Prices include GST.</p>
            </div>
            <p className="shrink-0 font-display text-xs font-bold uppercase tracking-[0.22em] text-brand-ink">Collect × Display × Beyond</p>
          </footer>
        </div>
      </article>
    </div>
  );
}
