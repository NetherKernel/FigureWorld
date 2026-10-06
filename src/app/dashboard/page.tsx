"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  IndianRupee,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  ArrowRight,
  CreditCard,
  FileText,
  ChevronRight,
} from "lucide-react";
import RevenueChart from "@/components/dashboard/charts/RevenueChart";
import OrdersChart from "@/components/dashboard/charts/OrdersChart";
import ProductsChart from "@/components/dashboard/charts/ProductsChart";
import CategoriesChart from "@/components/dashboard/charts/CategoriesChart";
import PaymentMethodsChart from "@/components/dashboard/charts/PaymentMethodsChart";

interface DashboardStatsResponse {
  metrics: {
    todayOrders: number;
    todayRevenue: number;
    pendingPayments: {
      count: number;
      amount: number;
    };
    codOrders: {
      count: number;
      amount: number;
    };
    pendingDispatch: number;
    deliveredOrders: number;
    cancelledOrders: number;
    lowStockCount: number;
  };
  charts: {
    revenue: React.ComponentProps<typeof RevenueChart>["data"];
    orders: React.ComponentProps<typeof OrdersChart>["data"];
    products: React.ComponentProps<typeof ProductsChart>["data"];
    categories: React.ComponentProps<typeof CategoriesChart>["data"];
    paymentMethods: React.ComponentProps<typeof PaymentMethodsChart>["data"];
  };
  lowStockItems: Array<{ title: string; sku: string; stock: number }>;
  recentOrders: Array<{
    orderNumber: string;
    customerName: string;
    orderStatus: string;
    paymentMethod: string;
    grandTotal: number;
  }>;
}

const TIMEFRAMES = [7, 14, 30];

const STATUS_STYLES: Record<string, string> = {
  DELIVERED: "bg-success-soft text-success",
  DISPATCHED: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  OUT_FOR_DELIVERY: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  CANCELLED: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  REFUNDED: "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  PENDING_PAYMENT: "bg-warn-soft text-warn",
  PAYMENT_REVIEW: "bg-warn-soft text-warn",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
        STATUS_STYLES[String(status || "").toUpperCase()] || "bg-surface-3 text-fg-2"
      }`}
    >
      {String(status || "").replace(/_/g, " ")}
    </span>
  );
}

type Tone = "brand" | "success" | "warn" | "info" | "danger";

const TONES: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand-ink",
  success: "bg-success-soft text-success",
  warn: "bg-warn-soft text-warn",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
};

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  href,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  detail: React.ReactNode;
  icon: React.ElementType;
  tone: Tone;
  href?: string;
  loading: boolean;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold leading-tight text-muted sm:text-xs">{label}</span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 sm:rounded-xl ${TONES[tone]}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
      </div>
      {loading ? (
        <div className="mt-2 h-7 w-16 animate-pulse rounded bg-surface-3" />
      ) : (
        <p className="mt-2 truncate text-xl font-black tracking-tight text-fg sm:text-2xl">{value}</p>
      )}
      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted">{detail}</p>
    </>
  );

  const cls = "group flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-3.5 shadow-card transition sm:p-5";
  return href ? (
    <Link href={href} className={`${cls} hover:border-brand/40 hover:shadow-pop`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export default function DashboardOverviewPage() {
  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<number>(14);

  // Bumped by "Refresh" to re-run the fetch for the same range
  const [reloadKey, setReloadKey] = useState(0);
  // Only the latest request may update the screen (fast range switching can reorder responses)
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    fetch(`/api/admin/dashboard/stats?days=${timeframe}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && id === requestId.current) setData(json.data);
      })
      .catch((err) => console.error("Failed to load dashboard statistics:", err))
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [timeframe, reloadKey]);

  const changeTimeframe = (days: number) => {
    if (days === timeframe) return;
    setLoading(true);
    setTimeframe(days);
  };

  const refresh = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const metrics = data?.metrics;
  // Skeletons only on first load; later refreshes keep the current numbers on screen
  const firstLoad = loading && !data;
  const inr = (n: number | undefined) => `₹${(n ?? 0).toLocaleString("en-IN")}`;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Title & controls */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-[1_1_220px]">
          <h1 className="text-xl font-black tracking-tight text-fg sm:text-2xl">Overview</h1>
          <p className="mt-1 text-xs text-muted sm:text-sm">Sales, orders, payments and stock at a glance.</p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div role="group" aria-label="Time range" className="flex flex-1 items-center rounded-xl bg-surface-3 p-1 text-xs font-semibold sm:flex-none">
            {TIMEFRAMES.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => changeTimeframe(days)}
                aria-pressed={timeframe === days}
                className={`flex-1 rounded-lg px-3 py-2 transition sm:flex-none sm:py-1.5 ${
                  timeframe === days ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg"
                }`}
              >
                {days} days
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh"
            className="flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-fg-2 transition hover:bg-surface-2 disabled:opacity-60 sm:h-9"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* KPIs — 2 per row on phones, 4 on wide screens */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard loading={firstLoad} label="Today's orders" value={metrics?.todayOrders ?? "—"} detail="Placed since midnight" icon={ShoppingBag} tone="brand" />
        <KpiCard loading={firstLoad} label="Today's revenue" value={inr(metrics?.todayRevenue)} detail="Gross bookings today" icon={IndianRupee} tone="success" />
        <KpiCard
          loading={firstLoad}
          href="/dashboard/payments"
          label="Pending payments"
          value={metrics?.pendingPayments.count ?? "—"}
          detail={<>{inr(metrics?.pendingPayments.amount)} awaiting UPI check</>}
          icon={Clock}
          tone="warn"
        />
        <KpiCard
          loading={firstLoad}
          href="/dashboard/payments"
          label="COD orders"
          value={metrics?.codOrders.count ?? "—"}
          detail={<>{inr(metrics?.codOrders.amount)} to collect</>}
          icon={CreditCard}
          tone="info"
        />
        <KpiCard loading={firstLoad} href="/dashboard/shipments" label="To dispatch" value={metrics?.pendingDispatch ?? "—"} detail="Confirmed, processing or packed" icon={Truck} tone="brand" />
        <KpiCard loading={firstLoad} label="Delivered" value={metrics?.deliveredOrders ?? "—"} detail="Completed orders" icon={CheckCircle2} tone="success" />
        <KpiCard loading={firstLoad} label="Cancelled" value={metrics?.cancelledOrders ?? "—"} detail="Stock returned automatically" icon={XCircle} tone="danger" />
        <KpiCard loading={firstLoad} href="/dashboard/products" label="Low stock" value={metrics?.lowStockCount ?? "—"} detail="Items with 5 or fewer units" icon={AlertTriangle} tone="warn" />
      </div>

      {/* Trend charts — side by side only when each gets enough room */}
      <div className={`grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2 ${loading && data ? "opacity-70 transition-opacity" : ""}`}>
        <RevenueChart data={data?.charts?.revenue || []} loading={firstLoad} />
        <OrdersChart data={data?.charts?.orders || []} loading={firstLoad} />
      </div>

      {/* Breakdown charts: 1 → 2 → 3 columns */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        <PaymentMethodsChart data={data?.charts?.paymentMethods || []} loading={firstLoad} />
        <CategoriesChart data={data?.charts?.categories || []} loading={firstLoad} />
        <div className="lg:col-span-2 2xl:col-span-1">
          <ProductsChart data={data?.charts?.products || []} loading={firstLoad} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { href: "/admin/products/new", label: "Add product", icon: Plus },
          { href: "/dashboard/payments", label: "Review payments", icon: CreditCard },
          { href: "/dashboard/shipments", label: "Dispatch queue", icon: Truck },
          { href: "/dashboard/invoices", label: "Tax invoices", icon: FileText },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href + label}
            href={href}
            className="group flex min-h-12 items-center gap-2.5 rounded-xl border border-line bg-surface p-3 text-xs font-semibold text-fg-2 shadow-card transition hover:border-brand/40 hover:bg-brand-soft hover:text-brand-ink sm:text-sm"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-ink" />
          </Link>
        ))}
      </div>

      {/* Recent orders + low stock */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
        <section className="min-w-0 rounded-2xl border border-line bg-surface shadow-card xl:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-fg">Recent orders</h3>
              <p className="text-xs text-muted">Latest orders from the store</p>
            </div>
            <Link href="/dashboard/orders" className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-ink hover:text-brand-hover">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {firstLoad ? (
            <div className="space-y-2 p-4 sm:p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-3" />
              ))}
            </div>
          ) : data?.recentOrders && data.recentOrders.length > 0 ? (
            <>
              {/* Phones & tablets: compact list */}
              <ul className="divide-y divide-line lg:hidden">
                {data.recentOrders.map((ord) => (
                  <li key={ord.orderNumber}>
                    <Link href={`/admin/orders/${ord.orderNumber}`} className="flex items-center gap-3 px-4 py-3 active:bg-surface-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-brand-ink">#{ord.orderNumber}</p>
                        <p className="truncate text-xs text-fg">{ord.customerName}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <StatusBadge status={ord.orderStatus} />
                          <span className="text-[11px] text-muted">{ord.paymentMethod}</span>
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-black text-fg">₹{ord.grandTotal.toLocaleString("en-IN")}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Laptop & desktop: table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line text-[11px] font-bold uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-5 py-3">Order</th>
                      <th className="px-3 py-3">Customer</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Payment</th>
                      <th className="px-5 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.recentOrders.map((ord) => (
                      <tr key={ord.orderNumber} className="hover:bg-surface-2">
                        <td className="whitespace-nowrap px-5 py-3 font-bold text-brand-ink">
                          <Link href={`/admin/orders/${ord.orderNumber}`} className="hover:underline">
                            #{ord.orderNumber}
                          </Link>
                        </td>
                        <td className="max-w-[180px] truncate px-3 py-3 font-medium text-fg">{ord.customerName}</td>
                        <td className="px-3 py-3">
                          <StatusBadge status={ord.orderStatus} />
                        </td>
                        <td className="px-3 py-3 font-semibold text-fg-2">{ord.paymentMethod}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right font-black text-fg">₹{ord.grandTotal.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="px-5 py-10 text-center text-xs text-muted">No recent orders yet.</p>
          )}
        </section>

        <section className="min-w-0 rounded-2xl border border-line bg-surface shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-fg">Low stock</h3>
              <p className="text-xs text-muted">Restock these first</p>
            </div>
            <Link href="/dashboard/products" className="shrink-0 text-xs font-semibold text-brand-ink hover:text-brand-hover">
              Manage
            </Link>
          </div>

          <div className="space-y-2 p-4 sm:p-5">
            {firstLoad ? (
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-3" />)
            ) : data?.lowStockItems && data.lowStockItems.length > 0 ? (
              data.lowStockItems.map((item) => (
                <div key={item.sku} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 p-3 text-xs">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-fg" title={item.title}>
                      {item.title}
                    </p>
                    <p className="truncate text-[11px] text-muted">{item.sku}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      item.stock === 0
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                        : "bg-warn-soft text-warn"
                    }`}
                  >
                    {item.stock === 0 ? "Out of stock" : `${item.stock} left`}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-muted">All products are well stocked.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
