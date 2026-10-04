"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  IndianRupee,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Plus,
  ArrowRight,
  CreditCard,
  FileText,
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
    revenue: any[];
    orders: any[];
    products: any[];
    categories: any[];
    paymentMethods: any[];
  };
  lowStockItems: any[];
  recentOrders: any[];
}

export default function DashboardOverviewPage() {
  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<number>(14);

  const fetchStats = async (days = timeframe) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/dashboard/stats?days=${days}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(timeframe);
  }, [timeframe]);

  const metrics = data?.metrics;

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-fg">
            Executive Telemetry
          </h1>
          <p className="text-xs text-muted mt-1">
            Real-time sales velocity, logistics pipelines, inventory alarms, and financial metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex items-center rounded-xl bg-surface-3 p-1 text-xs font-semibold">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setTimeframe(days)}
                className={`rounded-lg px-3 py-1.5 transition ${
                  timeframe === days
                    ? "bg-surface text-fg shadow-xs"
                    : "text-muted hover:text-fg"
                }`}
              >
                {days}D
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchStats(timeframe)}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-fg-2 hover:bg-surface-2 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 8 Core Operational KPIs Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Today's Orders */}
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Today&apos;s Orders</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-fg">
            {metrics ? metrics.todayOrders : "—"}
          </p>
          <p className="mt-1 text-[11px] text-muted">Placed since 00:00:00 today</p>
        </div>

        {/* 2. Today's Revenue */}
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Today&apos;s Revenue</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-fg">
            ₹{metrics ? metrics.todayRevenue.toLocaleString("en-IN") : "—"}
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium">Authoritative gross bookings</p>
        </div>

        {/* 3. Pending Payments */}
        <Link
          href="/dashboard/payments"
          className="rounded-2xl border border-line bg-surface p-5 shadow-xs hover:border-amber-300 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Pending Payments</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl font-black text-fg">
              {metrics ? metrics.pendingPayments.count : "—"}
            </p>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              ₹{metrics ? metrics.pendingPayments.amount.toLocaleString("en-IN") : "0"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted group-hover:text-amber-600 transition">
            Awaiting UTR audit →
          </p>
        </Link>

        {/* 4. COD Orders */}
        <Link
          href="/dashboard/payments"
          className="rounded-2xl border border-line bg-surface p-5 shadow-xs hover:border-blue-300 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">COD Orders</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl font-black text-fg">
              {metrics ? metrics.codOrders.count : "—"}
            </p>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              ₹{metrics ? metrics.codOrders.amount.toLocaleString("en-IN") : "0"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted group-hover:text-blue-600 transition">
            Doorstep collection pipeline →
          </p>
        </Link>

        {/* 5. Pending Dispatch */}
        <Link
          href="/dashboard/shipments"
          className="rounded-2xl border border-line bg-surface p-5 shadow-xs hover:border-brand/50 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Pending Dispatch</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
              <Truck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-fg">
            {metrics ? metrics.pendingDispatch : "—"}
          </p>
          <p className="mt-1 text-[11px] text-muted group-hover:text-brand-hover transition">
            Confirmed, processing or packed →
          </p>
        </Link>

        {/* 6. Delivered Orders */}
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Delivered Orders</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-fg">
            {metrics ? metrics.deliveredOrders : "—"}
          </p>
          <p className="mt-1 text-[11px] text-emerald-600">Fulfilled customer orders</p>
        </div>

        {/* 7. Cancelled Orders */}
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Cancelled Orders</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-fg">
            {metrics ? metrics.cancelledOrders : "—"}
          </p>
          <p className="mt-1 text-[11px] text-rose-500">Inventory automatically restocked</p>
        </div>

        {/* 8. Low Stock Alerts */}
        <Link
          href="/dashboard/products"
          className="rounded-2xl border border-line bg-surface p-5 shadow-xs hover:border-amber-300 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Low Stock Alarm</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-fg">
            {metrics ? metrics.lowStockCount : "—"}
          </p>
          <p className="mt-1 text-[11px] text-amber-600 group-hover:underline">
            Items ≤ 5 units in warehouse →
          </p>
        </Link>
      </div>

      {/* Visual Analytics: Revenue & Orders Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueChart data={data?.charts?.revenue || []} />
        <OrdersChart data={data?.charts?.orders || []} />
      </div>

      {/* Product & Category Performance Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <PaymentMethodsChart data={data?.charts?.paymentMethods || []} />
        </div>
        <div className="lg:col-span-1">
          <CategoriesChart data={data?.charts?.categories || []} />
        </div>
        <div className="lg:col-span-1">
          <ProductsChart data={data?.charts?.products || []} />
        </div>
      </div>

      {/* Quick Admin Actions Ribbon */}
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-fg">Quick Control Shortcuts</h3>
            <p className="text-xs text-muted">Direct access to daily operational workflows</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-3 font-semibold text-fg-2 hover:bg-brand-soft hover:border-brand/30 hover:text-brand-ink transition"
          >
            <Plus className="h-4 w-4 text-brand-ink" />
            <span>Add Figure</span>
          </Link>
          <Link
            href="/dashboard/payments"
            className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-3 font-semibold text-fg-2 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 dark:hover:bg-emerald-950/40 transition"
          >
            <CreditCard className="h-4 w-4 text-emerald-600" />
            <span>Audit Payments</span>
          </Link>
          <Link
            href="/dashboard/shipments"
            className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-3 font-semibold text-fg-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 dark:hover:bg-blue-950/40 transition"
          >
            <Truck className="h-4 w-4 text-blue-600" />
            <span>Dispatch Queue</span>
          </Link>
          <Link
            href="/dashboard/invoices"
            className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-3 font-semibold text-fg-2 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 dark:hover:bg-amber-950/40 transition"
          >
            <FileText className="h-4 w-4 text-amber-600" />
            <span>Tax Invoices</span>
          </Link>
        </div>
      </div>

      {/* Split: Recent Orders vs Low Stock Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Orders Feed */}
        <div className="lg:col-span-2 rounded-3xl border border-line bg-surface p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h3 className="text-sm font-bold text-fg">Recent Orders Stream</h3>
              <p className="text-xs text-muted">Live order bookings from storefront</p>
            </div>
            <Link
              href="/dashboard/orders"
              className="text-xs font-semibold text-brand-ink hover:text-brand-hover flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="border-b border-line text-[11px] font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="pb-3">Order</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Payment</th>
                  <th className="pb-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data?.recentOrders && data.recentOrders.length > 0 ? (
                  data.recentOrders.map((ord: any) => (
                    <tr key={ord.orderNumber} className="hover:bg-surface-2">
                      <td className="py-3 font-bold text-brand-ink">
                        <Link href={`/admin/orders/${ord.orderNumber}`} className="hover:underline">
                          #{ord.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3 font-medium text-fg">
                        {ord.customerName}
                      </td>
                      <td className="py-3">
                        <span className="rounded-md bg-surface-3 px-2 py-0.5 text-[10px] font-bold text-fg-2 uppercase">
                          {ord.orderStatus}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="font-semibold text-fg-2">
                          {ord.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 text-right font-black text-fg">
                        ₹{ord.grandTotal.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted">
                      No recent orders recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Drawer */}
        <div className="lg:col-span-1 rounded-3xl border border-line bg-surface p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h3 className="text-sm font-bold text-fg">Low Stock Watch</h3>
              <p className="text-xs text-muted">Replenishment priority items</p>
            </div>
            <Link
              href="/dashboard/products"
              className="text-xs font-semibold text-brand-ink hover:text-brand-hover"
            >
              Manage
            </Link>
          </div>

          <div className="space-y-3">
            {data?.lowStockItems && data.lowStockItems.length > 0 ? (
              data.lowStockItems.map((item: any) => (
                <div
                  key={item.sku}
                  className="flex items-center justify-between rounded-xl border border-line p-3 bg-surface-2 text-xs"
                >
                  <div className="truncate max-w-[170px]">
                    <p className="font-semibold text-fg truncate">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-muted">{item.sku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        item.stock === 0
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                    >
                      {item.stock === 0 ? "Out of Stock" : `${item.stock} left`}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-muted">
                All catalog inventory healthy!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
