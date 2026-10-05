"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Download,
  LayoutDashboard,
  Loader2,
  LogOut,
  Minus,
  Plus,
  Printer,
  ReceiptText,
  ScanBarcode,
  Search,
  ShieldAlert,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/ui/Logo";
import { formatPrice } from "@/lib/format";
import { StoreProduct, effectivePrice, hasDiscount, primaryImage } from "@/lib/product-view";

/**
 * Store counter (physical shop billing) for STAFF: ring up a walk-in customer's items,
 * take payment, hand over the products with a GST invoice. Stock is deducted on sale.
 */

type PaymentMethod = "CASH" | "CARD" | "UPI";

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; icon: React.ElementType }> = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "UPI", label: "UPI", icon: Smartphone },
];

interface BillLine {
  product: StoreProduct;
  quantity: number;
}

interface SaleResult {
  orderNumber: string;
  invoiceNumber: string | null;
  pdfUrl: string | null;
  invoiceError: string | null;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  customerName: string;
  emailedTo: string | null;
  items: Array<{ name: string; sku: string; quantity: number; unitPrice: number; total: number }>;
  changeDue?: number;
}

interface TodaySales {
  sales: Array<{
    orderNumber: string;
    invoiceNumber: string | null;
    customerName: string;
    grandTotal: number;
    paymentMethod: PaymentMethod;
    itemCount: number;
    servedBy: string | null;
    placedAt: string;
  }>;
  totals: { count: number; revenue: number; byMethod: Record<string, number> };
}

function stockLabel(stock: number) {
  if (stock <= 0) return { text: "Out of stock", cls: "bg-surface-3 text-muted" };
  if (stock <= 5) return { text: `Only ${stock} left`, cls: "bg-warn-soft text-warn" };
  return { text: `${stock} in stock`, cls: "bg-success-soft text-success" };
}

export default function StoreCounterPage() {
  const { user, logout } = useAuth();

  // ---------- catalog search ----------
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StoreProduct[]>([]);
  const [searching, setSearching] = useState(true);
  const [catalogVersion, setCatalogVersion] = useState(0); // bump to re-fetch stock levels
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const t = window.setTimeout(async () => {
      setSearching(true);
      try {
        const q = query.trim();
        const res = await fetch(`/api/products?limit=50${q ? `&search=${encodeURIComponent(q)}` : ""}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const json = await res.json();
        setResults(json?.success ? json.data.products || [] : []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 200);
    return () => {
      controller.abort();
      window.clearTimeout(t);
    };
  }, [query, catalogVersion]);

  // ---------- bill ----------
  const [lines, setLines] = useState<BillLine[]>([]);
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentRef, setPaymentRef] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [ageVerified, setAgeVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SaleResult | null>(null);

  const qtyInBill = (id: string) => lines.find((l) => l.product._id === id)?.quantity || 0;

  const addToBill = useCallback((p: StoreProduct) => {
    setError(null);
    setLines((prev) => {
      const existing = prev.find((l) => l.product._id === p._id);
      if (existing) {
        if (existing.quantity >= p.stock) return prev;
        return prev.map((l) => (l.product._id === p._id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      if (p.stock <= 0) return prev;
      return [...prev, { product: p, quantity: 1 }];
    });
  }, []);

  const setQty = (id: string, quantity: number) =>
    setLines((prev) =>
      prev.flatMap((l) => (l.product._id !== id ? [l] : quantity <= 0 ? [] : [{ ...l, quantity: Math.min(quantity, l.product.stock) }]))
    );

  const total = useMemo(() => lines.reduce((sum, l) => sum + effectivePrice(l.product) * l.quantity, 0), [lines]);
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const hasRestricted = lines.some((l) => l.product.isRestricted);
  const cash = Number(cashReceived);
  const changeDue = paymentMethod === "CASH" && cashReceived !== "" && Number.isFinite(cash) ? cash - total : null;

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    // Barcode scanners type the SKU and press Enter: add the exact SKU match, or the only result
    const q = query.trim().toLowerCase();
    const exact = results.find((p) => p.sku?.toLowerCase() === q);
    const pick = exact || (results.length === 1 ? results[0] : null);
    if (pick) {
      addToBill(pick);
      setQuery("");
    }
  };

  // ---------- today's sales ----------
  const [today, setToday] = useState<TodaySales | null>(null);
  const loadToday = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/pos/sales", { cache: "no-store" });
      const json = await res.json();
      if (json?.success) setToday(json.data);
    } catch {
      /* keep the last figures */
    }
  }, []);
  useEffect(() => {
    let alive = true;
    fetch("/api/staff/pos/sales", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => alive && json?.success && setToday(json.data))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const resetSale = () => {
    setLines([]);
    setCustomer({ name: "", phone: "", email: "" });
    setPaymentMethod("CASH");
    setPaymentRef("");
    setCashReceived("");
    setAgeVerified(false);
    setError(null);
    setResult(null);
    setQuery("");
    window.setTimeout(() => searchRef.current?.focus(), 0);
  };

  const completeSale = async () => {
    setError(null);
    if (!lines.length) return setError("Add at least one product to the bill.");
    if (hasRestricted && !ageVerified) return setError("This bill has an 18+ item. Check the customer's ID and tick “Age verified”.");
    if (paymentMethod === "CASH" && changeDue !== null && changeDue < 0) {
      return setError(`Cash received is ${formatPrice(-changeDue)} short of the total.`);
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/staff/pos/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.product._id, quantity: l.quantity })),
          customer: {
            name: customer.name.trim() || undefined,
            phone: customer.phone.trim() || undefined,
            email: customer.email.trim() || undefined,
          },
          paymentMethod,
          paymentRef: paymentMethod !== "CASH" && paymentRef.trim() ? paymentRef.trim() : undefined,
          ageVerified,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const details = json.error?.details && typeof json.error.details === "object" ? Object.values(json.error.details)[0] : null;
        setError((details as string) || json.error?.message || "Couldn't complete the sale.");
        return;
      }
      setResult({ ...json.data, changeDue: changeDue ?? undefined });
      loadToday();
      setCatalogVersion((v) => v + 1); // show the reduced stock
    } catch {
      setError("Network error — the sale was not completed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink text-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Logo href="/staff" />
            <div className="leading-tight">
              <p className="font-display text-base font-bold tracking-tight text-white">Store Counter</p>
              <p className="text-[11px] text-white/55">In-store billing · Figure World, Bandra West</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === "ADMIN" && (
              <Link href="/dashboard" className="btn btn-sm text-white/80 hover:bg-white/10 hover:text-white">
                <LayoutDashboard className="h-4 w-4" /> <span className="hidden sm:inline">Admin dashboard</span>
              </Link>
            )}
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-white">{user?.name || "Staff"}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff5a60]">{user?.role}</p>
            </div>
            <button type="button" onClick={() => logout()} className="btn btn-sm border border-white/20 text-white hover:bg-white/10">
              <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* -------- Products -------- */}
        <section className="card flex min-h-[420px] flex-col overflow-hidden lg:h-[calc(100vh-96px)]" aria-label="Products">
          <div className="border-b border-line p-3">
            <label htmlFor="pos-search" className="sr-only">
              Search products or scan a barcode
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="pos-search"
                ref={searchRef}
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search by name or SKU, or scan a barcode"
                className="input h-11 pl-9 pr-24"
                autoComplete="off"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[11px] text-muted">
                <ScanBarcode className="h-3.5 w-3.5" /> Enter adds
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {searching && !results.length ? (
              <div className="flex h-40 items-center justify-center gap-2 text-sm text-fg-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading products…
              </div>
            ) : !results.length ? (
              <div className="flex h-40 items-center justify-center text-sm text-fg-2">No products match “{query.trim()}”.</div>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((p) => {
                  const inBill = qtyInBill(p._id);
                  const left = p.stock - inBill;
                  const s = stockLabel(left);
                  return (
                    <li key={p._id}>
                      <button
                        type="button"
                        onClick={() => addToBill(p)}
                        disabled={left <= 0}
                        className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-2.5 text-left transition hover:border-brand/50 hover:bg-brand-soft/40 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={primaryImage(p)} alt="" className="h-14 w-14 shrink-0 rounded-lg bg-surface-2 object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-fg">{p.name}</span>
                          <span className="mt-0.5 block font-mono text-[10px] text-muted">{p.sku}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-bold text-fg">{formatPrice(effectivePrice(p))}</span>
                            {hasDiscount(p) && <span className="text-[11px] text-muted line-through">{formatPrice(p.price)}</span>}
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${s.cls}`}>{s.text}</span>
                            {p.isRestricted && <span className="chip chip-brand">18+</span>}
                            {inBill > 0 && <span className="chip chip-soft">{inBill} on bill</span>}
                          </span>
                        </span>
                        <Plus className="h-5 w-5 shrink-0 text-brand-ink" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* -------- Bill / receipt -------- */}
        <section className="card flex flex-col overflow-hidden lg:h-[calc(100vh-96px)]" aria-label="Current bill">
          {result ? (
            <Receipt result={result} onNewSale={resetSale} />
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h1 className="flex items-center gap-2 text-sm font-bold text-fg">
                  <ReceiptText className="h-4 w-4 text-brand-ink" /> Current bill
                  {itemCount > 0 && <span className="chip chip-soft">{itemCount} item{itemCount === 1 ? "" : "s"}</span>}
                </h1>
                {lines.length > 0 && (
                  <button type="button" onClick={() => setLines([])} className="text-xs font-semibold text-fg-2 hover:text-brand-ink">
                    Clear
                  </button>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {lines.length === 0 ? (
                  <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-1 p-6 text-center text-sm text-fg-2">
                    <ScanBarcode className="h-8 w-8 text-muted" aria-hidden="true" />
                    Scan or tap products to add them to the bill.
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {lines.map((l) => (
                      <li key={l.product._id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-[13px] font-semibold text-fg">{l.product.name}</p>
                          <p className="text-[11px] text-muted">
                            {formatPrice(effectivePrice(l.product))} each
                            {l.product.isRestricted && <span className="ml-1.5 font-bold text-brand-ink">18+</span>}
                          </p>
                        </div>
                        <div className="flex items-center rounded-lg border border-line">
                          <button
                            type="button"
                            onClick={() => setQty(l.product._id, l.quantity - 1)}
                            aria-label={`One less ${l.product.name}`}
                            className="flex h-8 w-8 items-center justify-center text-fg-2 hover:text-fg"
                          >
                            {l.quantity === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                          </button>
                          <span className="w-7 text-center text-sm font-bold tabular-nums text-fg" aria-live="polite">
                            {l.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(l.product._id, l.quantity + 1)}
                            disabled={l.quantity >= l.product.stock}
                            aria-label={`One more ${l.product.name}`}
                            title={l.quantity >= l.product.stock ? "No more in stock" : undefined}
                            className="flex h-8 w-8 items-center justify-center text-fg-2 hover:text-fg disabled:opacity-30"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="w-20 text-right text-sm font-bold tabular-nums text-fg">{formatPrice(effectivePrice(l.product) * l.quantity)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-3 border-t border-line bg-surface-2 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-fg-2">Total</span>
                  <span className="text-2xl font-black tabular-nums text-fg">{formatPrice(total)}</span>
                </div>
                <p className="-mt-2 text-right text-[11px] text-muted">Prices include GST</p>

                <details className="group rounded-lg border border-line bg-surface">
                  <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-fg-2 [&::-webkit-details-marker]:hidden">
                    Customer details <span className="font-normal text-muted">(optional — printed on the invoice)</span>
                  </summary>
                  <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                    <input
                      aria-label="Customer name"
                      placeholder="Name"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      className="input py-1.5 text-[13px]"
                    />
                    <input
                      aria-label="Customer phone"
                      placeholder="Phone"
                      inputMode="tel"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      className="input py-1.5 text-[13px]"
                    />
                    <input
                      aria-label="Customer email"
                      placeholder="Email (to send the invoice)"
                      type="email"
                      value={customer.email}
                      onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                      className="input col-span-2 py-1.5 text-[13px]"
                    />
                  </div>
                </details>

                <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === value}
                      onClick={() => setPaymentMethod(value)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold transition ${
                        paymentMethod === value ? "border-brand bg-brand-soft text-brand-ink" : "border-line bg-surface text-fg-2 hover:border-line-strong"
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>

                {paymentMethod === "CASH" ? (
                  <div className="grid grid-cols-2 items-center gap-2">
                    <input
                      aria-label="Cash received"
                      placeholder="Cash received (₹)"
                      inputMode="decimal"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value.replace(/[^0-9.]/g, ""))}
                      className="input py-1.5 text-[13px]"
                    />
                    <p className={`text-right text-xs font-semibold ${changeDue !== null && changeDue < 0 ? "text-brand-ink" : "text-fg-2"}`}>
                      {changeDue === null ? "Enter cash to see change" : changeDue < 0 ? `${formatPrice(-changeDue)} short` : `Change: ${formatPrice(changeDue)}`}
                    </p>
                  </div>
                ) : (
                  <input
                    aria-label={`${paymentMethod} reference`}
                    placeholder={paymentMethod === "CARD" ? "Card slip / approval no. (optional)" : "UPI transaction ID (optional)"}
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="input py-1.5 text-[13px]"
                  />
                )}

                {hasRestricted && (
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-brand/30 bg-brand-soft p-2.5 text-xs text-brand-ink">
                    <input type="checkbox" checked={ageVerified} onChange={(e) => setAgeVerified(e.target.checked)} className="mt-0.5" />
                    <span>
                      <span className="flex items-center gap-1 font-bold">
                        <ShieldAlert className="h-3.5 w-3.5" /> Age verified (18+)
                      </span>
                      I checked a government photo ID. Replicas are display-only and unsharpened.
                    </span>
                  </label>
                )}

                {error && (
                  <p role="alert" className="flex items-start gap-1.5 text-xs font-semibold text-brand-ink">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={completeSale}
                  disabled={submitting || !lines.length}
                  className="btn btn-primary btn-lg w-full"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {submitting ? "Completing sale…" : `Complete sale · ${formatPrice(total)}`}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {/* -------- Today's sales -------- */}
      <section className="mx-auto max-w-[1500px] px-4 pb-8" aria-label="Today's counter sales">
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="text-sm font-bold text-fg">Today&apos;s counter sales</h2>
            {today && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-2">
                <span>
                  <strong className="text-fg">{today.totals.count}</strong> sale{today.totals.count === 1 ? "" : "s"}
                </span>
                <span>
                  Revenue <strong className="text-fg">{formatPrice(today.totals.revenue)}</strong>
                </span>
                {PAYMENT_METHODS.map(({ value, label }) => (
                  <span key={value}>
                    {label} {formatPrice(today.totals.byMethod[value] || 0)}
                  </span>
                ))}
              </div>
            )}
          </div>
          {!today ? (
            <p className="p-4 text-xs text-muted">Loading…</p>
          ) : today.sales.length === 0 ? (
            <p className="p-4 text-xs text-muted">No counter sales yet today.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Time</th>
                    <th className="px-4 py-2 font-semibold">Invoice</th>
                    <th className="px-4 py-2 font-semibold">Customer</th>
                    <th className="px-4 py-2 font-semibold">Payment</th>
                    <th className="px-4 py-2 font-semibold">Served by</th>
                    <th className="px-4 py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {today.sales.map((s) => (
                    <tr key={s.orderNumber}>
                      <td className="px-4 py-2 text-fg-2">{new Date(s.placedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-4 py-2">
                        {s.invoiceNumber ? (
                          <a href={`/invoices/${encodeURIComponent(s.invoiceNumber)}`} target="_blank" rel="noreferrer" className="link font-mono">
                            {s.invoiceNumber}
                          </a>
                        ) : (
                          <span className="font-mono text-muted">{s.orderNumber}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-fg">{s.customerName}</td>
                      <td className="px-4 py-2 text-fg-2">{s.paymentMethod}</td>
                      <td className="px-4 py-2 text-fg-2">{s.servedBy || "—"}</td>
                      <td className="px-4 py-2 text-right font-bold tabular-nums text-fg">{formatPrice(s.grandTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Receipt({ result, onNewSale }: { result: SaleResult; onNewSale: () => void }) {
  const invoiceHref = result.invoiceNumber ? `/invoices/${encodeURIComponent(result.invoiceNumber)}` : null;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h1 className="flex items-center gap-2 text-sm font-bold text-success">
          <CheckCircle2 className="h-4 w-4" /> Sale complete
        </h1>
        <button type="button" onClick={onNewSale} aria-label="Close and start a new sale" className="text-fg-2 hover:text-fg">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="rounded-xl bg-success-soft p-4 text-center">
          <p className="text-xs font-semibold text-success">Paid by {result.paymentMethod.toLowerCase()}</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-fg">{formatPrice(result.grandTotal)}</p>
          {result.changeDue !== undefined && result.changeDue > 0 && (
            <p className="mt-1 text-sm font-bold text-fg">Give change: {formatPrice(result.changeDue)}</p>
          )}
          <p className="mt-2 text-xs text-fg-2">
            {result.customerName}
            {result.invoiceNumber && (
              <>
                {" · "}Invoice <span className="font-mono font-semibold text-fg">{result.invoiceNumber}</span>
              </>
            )}
          </p>
          {result.emailedTo && <p className="mt-1 text-[11px] text-fg-2">Invoice emailed to {result.emailedTo}</p>}
        </div>

        {result.invoiceError && (
          <p role="alert" className="flex items-start gap-1.5 rounded-lg border border-brand/30 bg-brand-soft p-3 text-xs font-semibold text-brand-ink">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {result.invoiceError}
          </p>
        )}

        <ul className="divide-y divide-line rounded-xl border border-line text-[13px]">
          {result.items.map((it) => (
            <li key={it.sku} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className="line-clamp-1 font-semibold text-fg">{it.name}</span>
                <span className="text-[11px] text-muted">
                  {it.quantity} × {formatPrice(it.unitPrice)}
                </span>
              </span>
              <span className="font-bold tabular-nums text-fg">{formatPrice(it.total)}</span>
            </li>
          ))}
        </ul>
        <p className="text-center text-[11px] text-muted">Stock has been updated. Hand over the products with the printed invoice.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-line bg-surface-2 p-4">
        {invoiceHref ? (
          <a href={invoiceHref} target="_blank" rel="noreferrer" className="btn btn-secondary">
            <Printer className="h-4 w-4" /> Print invoice
          </a>
        ) : (
          <span className="btn btn-secondary pointer-events-none opacity-50">
            <Printer className="h-4 w-4" /> Print invoice
          </span>
        )}
        {result.pdfUrl ? (
          <a href={result.pdfUrl} download className="btn btn-secondary">
            <Download className="h-4 w-4" /> Download PDF
          </a>
        ) : (
          <span className="btn btn-secondary pointer-events-none opacity-50">
            <Download className="h-4 w-4" /> Download PDF
          </span>
        )}
        <button type="button" onClick={onNewSale} autoFocus className="btn btn-primary col-span-2">
          <Plus className="h-4 w-4" /> New sale
        </button>
      </div>
    </div>
  );
}
