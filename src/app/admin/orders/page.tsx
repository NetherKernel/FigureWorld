"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Search,
  RefreshCw,
  ArrowLeft,
  Filter,
  ExternalLink,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  Truck,
  PackageCheck,
  AlertCircle,
  XCircle,
  RotateCcw,
  DollarSign,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { formatPrice } from "@/lib/format";

interface IOrderSummary {
  _id: string;
  orderNumber: string;
  customerEmail: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  } | null;
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
    country: string;
  } | null;
  itemsCount: number;
  items: Array<{
    name: string;
    sku: string;
    image?: string;
    unitPrice: number;
    quantity: number;
    total: number;
  }>;
  pricing: {
    subtotal: number;
    shippingFee: number;
    grandTotal: number;
  };
  paymentMethod: "UPI" | "COD";
  paymentStatus: string;
  orderStatus: string;
  shipment: {
    courier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    dispatchedAt?: string;
  };
  placedAt: string;
  createdAt: string;
}

interface IOrderMetrics {
  total: number;
  pendingPayment: number;
  paymentReview: number;
  confirmed: number;
  processing: number;
  packed: number;
  dispatched: number;
  outForDelivery: number;
  delivered: number;
  cancelled: number;
  returnRequested: number;
  returned: number;
  refunded: number;
}

const CANONICAL_STATUSES = [
  { id: "ALL", label: "All Orders" },
  { id: "PENDING_PAYMENT", label: "Pending Payment" },
  { id: "PAYMENT_REVIEW", label: "Payment Review" },
  { id: "CONFIRMED", label: "Confirmed" },
  { id: "PROCESSING", label: "Processing" },
  { id: "PACKED", label: "Packed" },
  { id: "DISPATCHED", label: "Dispatched" },
  { id: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "CANCELLED", label: "Cancelled" },
  { id: "RETURN_REQUESTED", label: "Return Req" },
  { id: "RETURNED", label: "Returned" },
  { id: "REFUNDED", label: "Refunded" },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<IOrderSummary[]>([]);
  const [metrics, setMetrics] = useState<IOrderMetrics>({
    total: 0,
    pendingPayment: 0,
    paymentReview: 0,
    confirmed: 0,
    processing: 0,
    packed: 0,
    dispatched: 0,
    outForDelivery: 0,
    delivered: 0,
    cancelled: 0,
    returnRequested: 0,
    returned: 0,
    refunded: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/orders", window.location.origin);
      if (filterStatus && filterStatus !== "ALL") {
        url.searchParams.set("status", filterStatus);
      }
      if (paymentMethodFilter && paymentMethodFilter !== "ALL") {
        url.searchParams.set("paymentMethod", paymentMethodFilter);
      }
      if (paymentStatusFilter && paymentStatusFilter !== "ALL") {
        url.searchParams.set("paymentStatus", paymentStatusFilter);
      }
      if (searchQuery.trim()) {
        url.searchParams.set("search", searchQuery.trim());
      }

      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setOrders(json.data.orders || []);
          setMetrics(json.data.metrics);
        }
      } else {
        setToastMessage({ type: "error", text: "Failed to fetch orders from server." });
      }
    } catch {
      setToastMessage({ type: "error", text: "Network error fetching orders." });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, paymentMethodFilter, paymentStatusFilter, searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case "PENDING_PAYMENT":
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
            <Clock className="h-3 w-3" />
            Pending Payment
          </span>
        );
      case "PAYMENT_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60">
            <Clock className="h-3 w-3" />
            Payment Review
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60">
            <CheckCircle2 className="h-3 w-3" />
            Confirmed
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60">
            <Layers className="h-3 w-3" />
            Processing
          </span>
        );
      case "PACKED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-700 border border-cyan-200/80 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/60">
            <PackageCheck className="h-3 w-3" />
            Packed
          </span>
        );
      case "DISPATCHED":
      case "SHIPPED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 border border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60">
            <Truck className="h-3 w-3" />
            Dispatched
          </span>
        );
      case "OUT_FOR_DELIVERY":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
            <Truck className="h-3 w-3" />
            Out for Delivery
          </span>
        );
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Delivered
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60">
            <XCircle className="h-3 w-3" />
            Cancelled
          </span>
        );
      case "RETURN_REQUESTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60">
            <AlertCircle className="h-3 w-3" />
            Return Req
          </span>
        );
      case "RETURNED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300">
            <RotateCcw className="h-3 w-3" />
            Returned
          </span>
        );
      case "REFUNDED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300">
            <RotateCcw className="h-3 w-3" />
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getPaymentStatusBadge = (status: string, method: string) => {
    const s = status.toUpperCase();
    if (s === "PAID") {
      return (
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300">
          PAID
        </span>
      );
    }
    if (s === "UNDER_REVIEW") {
      return (
        <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300">
          UNDER REVIEW
        </span>
      );
    }
    if (s === "PENDING") {
      return (
        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300">
          {method === "COD" ? "COD PENDING" : "PAYMENT PENDING"}
        </span>
      );
    }
    return (
      <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
        {s}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-xs font-semibold shadow-md ${
            toastMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-200"
          }`}
        >
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-4 font-bold text-slate-500 hover:text-slate-700">
            ×
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/40">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Order Management</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider rounded-md bg-blue-500/30 border border-blue-400/40 px-2.5 py-0.5 text-blue-200">
                  Heart of Admin Panel
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-1">
                Full 12-stage lifecycle management, shipment tracking, customer contacts & order inspection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-xl border border-blue-400/30 bg-blue-950/40 px-4 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-900/60 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Admin Console</span>
            </Link>
            <button
              onClick={() => fetchOrders()}
              disabled={loading}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition shadow-md shadow-blue-600/30 flex items-center gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 text-xs">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-slate-500 font-medium">Total Orders</span>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{metrics.total}</p>
          <p className="mt-1 text-[11px] text-blue-600 font-medium">All recorded orders</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-slate-500 font-medium">Confirmed</span>
          <p className="mt-2 text-2xl font-black text-blue-600">{metrics.confirmed}</p>
          <p className="mt-1 text-[11px] text-slate-500">Ready for warehouse</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-slate-500 font-medium">Processing & Packed</span>
          <p className="mt-2 text-2xl font-black text-indigo-600">{metrics.processing + metrics.packed}</p>
          <p className="mt-1 text-[11px] text-slate-500">{metrics.processing} proc, {metrics.packed} packed</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-slate-500 font-medium">Dispatched</span>
          <p className="mt-2 text-2xl font-black text-teal-600">{metrics.dispatched + metrics.outForDelivery}</p>
          <p className="mt-1 text-[11px] text-slate-500">In courier transit</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-slate-500 font-medium">Delivered</span>
          <p className="mt-2 text-2xl font-black text-emerald-600">{metrics.delivered}</p>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium">Fulfilled</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-slate-500 font-medium">Cancelled / Ret</span>
          <p className="mt-2 text-2xl font-black text-rose-600">{metrics.cancelled + metrics.returnRequested + metrics.returned}</p>
          <p className="mt-1 text-[11px] text-slate-500">{metrics.cancelled} cancelled</p>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        {/* Search & Secondary Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Order # (e.g. KF100001), Customer Name, Phone, Email, or Tracking AWB..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="UPI">UPI Payments</option>
              <option value="COD">Cash on Delivery (COD)</option>
            </select>

            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">PAID</option>
              <option value="UNDER_REVIEW">UNDER REVIEW</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>
        </div>

        {/* 12-Status Tabs Carousel/Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar border-t border-slate-100 pt-3 dark:border-slate-800">
          {CANONICAL_STATUSES.map((tab) => {
            const isActive = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`whitespace-nowrap rounded-xl px-3 py-1.5 font-semibold transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500" />
            <p className="text-xs text-slate-500">Loading orders from FiguresWorld master database...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <ShoppingBag className="h-10 w-10 mx-auto text-slate-400" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No orders found</p>
            <p className="text-xs text-slate-500">
              No orders match the selected filters or search criteria. Try selecting "All Orders" or clearing search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Customer & Phone</th>
                  <th className="py-3.5 px-4">Products</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Order Status</th>
                  <th className="py-3.5 px-4">Shipment</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((order) => {
                  const customerName = order.customer?.name || order.shippingAddress?.fullName || "Customer";
                  const phone = order.customer?.phone || order.shippingAddress?.phone || "N/A";
                  const courier = order.shipment?.courier;
                  const tracking = order.shipment?.trackingNumber;

                  return (
                    <tr
                      key={order._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                    >
                      {/* Order Number & Placed Date */}
                      <td className="py-3.5 px-4 align-top">
                        <Link
                          href={`/admin/orders/${order.orderNumber}`}
                          className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                        >
                          <span>#{order.orderNumber}</span>
                          <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {new Date(order.placedAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      {/* Customer & Phone */}
                      <td className="py-3.5 px-4 align-top">
                        <p className="font-semibold text-slate-900 dark:text-white">{customerName}</p>
                        {phone !== "N/A" && (
                          <a
                            href={`tel:${phone}`}
                            className="text-[11px] text-slate-500 hover:text-blue-600 flex items-center gap-1 mt-0.5"
                          >
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{phone}</span>
                          </a>
                        )}
                        <span className="text-[11px] text-slate-400 block truncate max-w-[160px]">
                          {order.customerEmail}
                        </span>
                      </td>

                      {/* Products Summary */}
                      <td className="py-3.5 px-4 align-top">
                        <p className="font-medium text-slate-800 dark:text-slate-200">
                          {order.items[0]?.name || "Figure Item"}
                          {order.items.length > 1 && (
                            <span className="text-slate-400 text-[10px] ml-1">+{order.items.length - 1} more</span>
                          )}
                        </p>
                        <span className="text-[11px] text-slate-500">
                          {order.itemsCount} {order.itemsCount === 1 ? "unit" : "units"} total
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 align-top">
                        <span className="font-black text-slate-900 dark:text-white">
                          {formatPrice(order.pricing.grandTotal)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          incl. ₹{order.pricing.shippingFee} shipping
                        </span>
                      </td>

                      {/* Payment */}
                      <td className="py-3.5 px-4 align-top space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {order.paymentMethod}
                          </span>
                          {getPaymentStatusBadge(order.paymentStatus, order.paymentMethod)}
                        </div>
                      </td>

                      {/* Order Status */}
                      <td className="py-3.5 px-4 align-top">
                        {getStatusBadge(order.orderStatus)}
                      </td>

                      {/* Shipment Tracking */}
                      <td className="py-3.5 px-4 align-top">
                        {tracking ? (
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <Truck className="h-3 w-3 text-teal-600" />
                              <span>{courier || "Courier"}</span>
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 block">{tracking}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Not yet dispatched</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <Link
                          href={`/admin/orders/${order.orderNumber}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-600 hover:text-white transition shadow-2xs dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-blue-600 dark:hover:text-white"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
