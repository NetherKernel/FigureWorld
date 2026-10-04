"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PhoneCall,
  PhoneForwarded,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  AlertTriangle,
  Search,
  RefreshCw,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  User,
  MapPin,
} from "lucide-react";
import { formatPrice } from "@/lib/format";

interface ICodCallLog {
  calledAt: string;
  calledBy: string;
  callStatus: "ANSWERED" | "NO_ANSWER" | "BUSY" | "CALLBACK_REQUESTED";
  notes?: string;
}

interface ICodOrder {
  _id: string;
  orderNumber: string;
  customerEmail: string;
  pricing: {
    grandTotal: number;
    subtotal: number;
    shippingFee: number;
  };
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  codDetails: {
    codStatus: "PENDING_VERIFICATION" | "VERIFIED" | "DISPATCHED" | "REJECTED" | "CANCELLED";
    verifiedAt?: string;
    verifiedBy?: string;
    callLogs: ICodCallLog[];
    rejectionReason?: string;
    cancellationReason?: string;
    courierPartner?: string;
    trackingNumber?: string;
    dispatchedAt?: string;
  };
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
    landmark?: string;
  } | null;
  notes?: string;
  placedAt: string;
}

interface ICodMetrics {
  total: number;
  pendingVerification: number;
  verified: number;
  dispatched: number;
  rejected: number;
  cancelled: number;
}

export default function AdminCodPage() {
  const [orders, setOrders] = useState<ICodOrder[]>([]);
  const [metrics, setMetrics] = useState<ICodMetrics>({
    total: 0,
    pendingVerification: 0,
    verified: 0,
    dispatched: 0,
    rejected: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("PENDING_VERIFICATION");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals state
  const [callModalOrder, setCallModalOrder] = useState<ICodOrder | null>(null);
  const [callStatus, setCallStatus] = useState<"ANSWERED" | "NO_ANSWER" | "BUSY" | "CALLBACK_REQUESTED">("ANSWERED");
  const [callNotes, setCallNotes] = useState("");

  const [dispatchModalOrder, setDispatchModalOrder] = useState<ICodOrder | null>(null);
  const [courierPartner, setCourierPartner] = useState("Blue Dart Express");
  const [trackingNumber, setTrackingNumber] = useState("");

  const [rejectModalOrder, setRejectModalOrder] = useState<ICodOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [historyModalOrder, setHistoryModalOrder] = useState<ICodOrder | null>(null);

  const fetchCodOrders = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/cod", window.location.origin);
      if (filterStatus && filterStatus !== "ALL") {
        url.searchParams.set("status", filterStatus);
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
      }
    } catch {
      setToastMessage({ type: "error", text: "Network error loading COD orders." });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery]);

  useEffect(() => {
    fetchCodOrders();
  }, [fetchCodOrders]);

  const executeAction = async (payload: any) => {
    setProcessingOrder(payload.orderNumber);
    setToastMessage(null);
    try {
      const res = await fetch("/api/admin/cod/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setToastMessage({
          type: "success",
          text: `Action "${payload.action}" executed successfully on order ${payload.orderNumber}.`,
        });
        await fetchCodOrders();
      } else {
        setToastMessage({
          type: "error",
          text: json.error?.message || "Failed to process COD action.",
        });
      }
    } catch {
      setToastMessage({ type: "error", text: "Network error executing COD action." });
    } finally {
      setProcessingOrder(null);
      setCallModalOrder(null);
      setDispatchModalOrder(null);
      setRejectModalOrder(null);
      setCallNotes("");
      setTrackingNumber("");
      setRejectionReason("");
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "PENDING_VERIFICATION":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
            <Clock className="h-3 w-3" />
            PENDING VERIFICATION
          </span>
        );
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-brand-ink border border-brand/50">
            <CheckCircle2 className="h-3 w-3" />
            VERIFIED & CONFIRMED
          </span>
        );
      case "DISPATCHED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <Truck className="h-3 w-3" />
            DISPATCHED
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="h-3 w-3" />
            REJECTED
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-200 px-2.5 py-0.5 text-[11px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-0.5 text-[11px] font-bold text-fg-2">
            {s}
          </span>
        );
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-fade-in text-xs">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-950 via-zinc-900 to-red-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 text-slate-300 hover:text-white transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Admin Console</span>
              </Link>
              <span className="text-muted">•</span>
              <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-500/30">
                Sprint 8: COD Lifecycle
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <PhoneCall className="h-8 w-8 text-amber-400" />
              COD Order Verification & Dispatch Console
            </h1>
            <p className="mt-1 text-xs text-slate-300 max-w-2xl">
              Execute customer phone verification, audit delivery coordinates, confirm genuine intent, and transition COD orders to dispatch.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchCodOrders}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 font-bold text-white transition backdrop-blur-xs border border-white/15"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div
          className={`flex items-center gap-2 rounded-2xl p-4 font-semibold text-xs animate-fade-in ${
            toastMessage.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setFilterStatus("PENDING_VERIFICATION")}
          className={`rounded-2xl border p-4 text-left transition ${
            filterStatus === "PENDING_VERIFICATION"
              ? "border-amber-500 bg-amber-50/50 dark:border-amber-500/80 dark:bg-amber-950/30 ring-2 ring-amber-500/20"
              : "border-line bg-surface hover:bg-surface-2"
          }`}
        >
          <div className="flex items-center justify-between text-muted">
            <span className="font-semibold">Pending Verification</span>
            <PhoneCall className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {metrics.pendingVerification}
          </p>
          <p className="text-[11px] text-muted mt-0.5">Call Customer to Verify</p>
        </button>

        <button
          onClick={() => setFilterStatus("VERIFIED")}
          className={`rounded-2xl border p-4 text-left transition ${
            filterStatus === "VERIFIED"
              ? "border-brand bg-brand-soft ring-2 ring-brand/20"
              : "border-line bg-surface hover:bg-surface-2"
          }`}
        >
          <div className="flex items-center justify-between text-muted">
            <span className="font-semibold">Verified & Confirmed</span>
            <CheckCircle2 className="h-4 w-4 text-brand-ink" />
          </div>
          <p className="mt-2 text-2xl font-black text-brand-ink">
            {metrics.verified}
          </p>
          <p className="text-[11px] text-muted mt-0.5">Ready for Warehouse Dispatch</p>
        </button>

        <button
          onClick={() => setFilterStatus("DISPATCHED")}
          className={`rounded-2xl border p-4 text-left transition ${
            filterStatus === "DISPATCHED"
              ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-500/80 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20"
              : "border-line bg-surface hover:bg-surface-2"
          }`}
        >
          <div className="flex items-center justify-between text-muted">
            <span className="font-semibold">Dispatched Orders</span>
            <Truck className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {metrics.dispatched}
          </p>
          <p className="text-[11px] text-muted mt-0.5">Courier in transit</p>
        </button>

        <button
          onClick={() => setFilterStatus("REJECTED")}
          className={`rounded-2xl border p-4 text-left transition ${
            filterStatus === "REJECTED"
              ? "border-rose-500 bg-rose-50/50 dark:border-rose-500/80 dark:bg-rose-950/30 ring-2 ring-rose-500/20"
              : "border-line bg-surface hover:bg-surface-2"
          }`}
        >
          <div className="flex items-center justify-between text-muted">
            <span className="font-semibold">Rejected / Cancelled</span>
            <XCircle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {metrics.rejected + metrics.cancelled}
          </p>
          <p className="text-[11px] text-muted mt-0.5">Stock restored to inventory</p>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="rounded-2xl border border-line bg-surface p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: "PENDING_VERIFICATION", label: `Pending Call (${metrics.pendingVerification})` },
            { id: "VERIFIED", label: `Verified (${metrics.verified})` },
            { id: "DISPATCHED", label: `Dispatched (${metrics.dispatched})` },
            { id: "REJECTED", label: `Rejected (${metrics.rejected})` },
            { id: "ALL", label: `All COD (${metrics.total})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`rounded-xl px-3.5 py-1.5 font-bold transition text-[11px] whitespace-nowrap ${
                filterStatus === tab.id
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-surface-3 text-fg-2 hover:bg-line"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search order, customer, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-line bg-bg py-2 pl-9 pr-3 text-fg focus:border-amber-500 focus:bg-surface focus:outline-none"
          />
        </div>
      </div>

      {/* COD Orders Table */}
      <div className="rounded-3xl border border-line bg-surface shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-[11px] font-bold text-muted uppercase tracking-wider">
                <th className="py-3 px-4">Order / Placed</th>
                <th className="py-3 px-4">Customer & Contact</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Call Verification Logs</th>
                <th className="py-3 px-4">COD Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted font-medium">
                    {loading ? "Loading COD orders..." : "No orders found in this view."}
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isProcessing = processingOrder === o.orderNumber;
                  const codSt = o.codDetails?.codStatus || "PENDING_VERIFICATION";
                  const isPending = codSt === "PENDING_VERIFICATION";
                  const isVerified = codSt === "VERIFIED";
                  const isDispatched = codSt === "DISPATCHED";
                  const isRejected = codSt === "REJECTED" || codSt === "CANCELLED";
                  const callCount = o.codDetails?.callLogs?.length || 0;

                  return (
                    <tr
                      key={o._id}
                      className={`hover:bg-surface-2 transition ${
                        isPending ? "bg-amber-50/15 dark:bg-amber-950/10" : ""
                      }`}
                    >
                      {/* Order Number */}
                      <td className="py-4 px-4">
                        <div className="font-mono font-bold text-brand-ink">
                          {o.orderNumber}
                        </div>
                        <div className="text-muted text-[10px]">
                          {new Date(o.placedAt).toLocaleString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Customer & Phone */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-fg">
                          {o.shippingAddress?.fullName || "Guest Customer"}
                        </div>
                        <div className="text-muted text-[11px] font-mono flex items-center gap-1 mt-0.5">
                          <a
                            href={`tel:${o.shippingAddress?.phone}`}
                            className="text-amber-600 dark:text-amber-400 font-semibold hover:underline inline-flex items-center gap-1"
                            title="Click to dial"
                          >
                            <PhoneCall className="h-3 w-3" />
                            <span>{o.shippingAddress?.phone || "N/A"}</span>
                          </a>
                        </div>
                        <div className="text-muted text-[10px] truncate max-w-[150px]">
                          {o.customerEmail}
                        </div>
                      </td>

                      {/* Destination */}
                      <td className="py-4 px-4 text-fg-2">
                        <div className="font-semibold text-fg">
                          {o.shippingAddress?.city}, {o.shippingAddress?.state}
                        </div>
                        <div className="text-[10px] text-muted">
                          PIN: {o.shippingAddress?.pinCode}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4 font-bold text-fg">
                        {formatPrice(o.pricing?.grandTotal || 0)}
                      </td>

                      {/* Call Logs */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setHistoryModalOrder(o)}
                            className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border transition flex items-center gap-1 ${
                              callCount > 0
                                ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                : "bg-surface-3 text-muted border-line"
                            }`}
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>{callCount} Call{callCount === 1 ? "" : "s"}</span>
                          </button>
                        </div>
                        {callCount > 0 && (
                          <p className="text-[10px] text-muted mt-1 truncate max-w-[160px]">
                            Last: {o.codDetails?.callLogs?.[callCount - 1]?.callStatus}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">{getStatusBadge(codSt)}</td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              disabled={isProcessing}
                              onClick={() => setCallModalOrder(o)}
                              className="rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-bold px-2.5 py-1.5 transition flex items-center gap-1"
                              title="Record phone verification call outcome"
                            >
                              <PhoneForwarded className="h-3.5 w-3.5" />
                              <span>Call</span>
                            </button>

                            <button
                              disabled={isProcessing}
                              onClick={() =>
                                executeAction({ orderNumber: o.orderNumber, action: "ACCEPT" })
                              }
                              className="rounded-xl bg-brand hover:bg-brand-hover text-white font-bold px-3 py-1.5 transition shadow-xs disabled:opacity-50"
                              title="Accept COD & Mark Verified"
                            >
                              Verify
                            </button>

                            <button
                              disabled={isProcessing}
                              onClick={() => setRejectModalOrder(o)}
                              className="rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 font-semibold px-2 py-1.5 transition"
                            >
                              Reject
                            </button>
                          </div>
                        ) : isVerified ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              disabled={isProcessing}
                              onClick={() => setDispatchModalOrder(o)}
                              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 transition shadow-xs flex items-center gap-1"
                            >
                              <Truck className="h-3.5 w-3.5" />
                              <span>Dispatch</span>
                            </button>
                            <button
                              disabled={isProcessing}
                              onClick={() =>
                                executeAction({
                                  orderNumber: o.orderNumber,
                                  action: "CANCEL",
                                  cancellationReason: "Cancelled prior to dispatch.",
                                })
                              }
                              className="rounded-xl border border-line-strong text-fg-2 hover:bg-surface-2 px-2 py-1.5 font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : isDispatched ? (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            <span className="block font-bold">{o.codDetails?.courierPartner}</span>
                            <span className="font-mono text-[10px] text-muted">
                              {o.codDetails?.trackingNumber}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-rose-500 italic block">
                            {o.codDetails?.rejectionReason || o.codDetails?.cancellationReason || "Cancelled"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Log Phone Call Modal */}
      {callModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/60">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-fg">
                  Log Customer Phone Call
                </h3>
                <p className="text-[11px] text-muted font-mono">
                  Order: {callModalOrder.orderNumber} • Dial:{" "}
                  <a
                    href={`tel:${callModalOrder.shippingAddress?.phone}`}
                    className="underline text-amber-600 font-bold"
                  >
                    {callModalOrder.shippingAddress?.phone}
                  </a>
                </p>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-fg-2 mb-1">
                Call Outcome *
              </label>
              <select
                value={callStatus}
                onChange={(e: any) => setCallStatus(e.target.value)}
                className="w-full rounded-xl border border-line bg-bg p-2.5 text-xs text-fg focus:border-amber-500 focus:bg-surface focus:outline-none font-medium"
              >
                <option value="ANSWERED">ANSWERED — Customer Confirmed Order</option>
                <option value="NO_ANSWER">NO ANSWER — Phone Rang, No Response</option>
                <option value="BUSY">BUSY — Line Engaged</option>
                <option value="CALLBACK_REQUESTED">CALLBACK REQUESTED — Customer requested call later</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-fg-2 mb-1">
                Call Verification Notes
              </label>
              <textarea
                rows={3}
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="e.g. Customer verified delivery address. Available for delivery Saturday morning."
                className="w-full rounded-xl border border-line bg-bg p-2.5 text-xs text-fg focus:border-amber-500 focus:bg-surface focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCallModalOrder(null)}
                className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-fg-2 hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  executeAction({
                    orderNumber: callModalOrder.orderNumber,
                    action: "LOG_CALL",
                    callStatus,
                    notes: callNotes,
                  })
                }
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-amber-700 transition"
              >
                Save Call Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Dispatch Order Modal */}
      {dispatchModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-fg">
                  Dispatch COD Order
                </h3>
                <p className="text-[11px] text-muted font-mono">
                  Order: {dispatchModalOrder.orderNumber} • ₹{dispatchModalOrder.pricing.grandTotal} COD
                </p>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-fg-2 mb-1">
                Courier Partner *
              </label>
              <select
                value={courierPartner}
                onChange={(e) => setCourierPartner(e.target.value)}
                className="w-full rounded-xl border border-line bg-bg p-2.5 text-xs text-fg focus:border-emerald-500 focus:bg-surface focus:outline-none font-medium"
              >
                <option value="Blue Dart Express">Blue Dart Express</option>
                <option value="Delhivery Surface">Delhivery Surface</option>
                <option value="DTDC Express">DTDC Express</option>
                <option value="XpressBees">XpressBees</option>
                <option value="Shadowfax">Shadowfax</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-fg-2 mb-1">
                Airway Bill / Tracking Number
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. BD-849201948 (leave blank to auto-generate)"
                className="w-full rounded-xl border border-line bg-bg p-2.5 text-xs font-mono text-fg focus:border-emerald-500 focus:bg-surface focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDispatchModalOrder(null)}
                className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-fg-2 hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  executeAction({
                    orderNumber: dispatchModalOrder.orderNumber,
                    action: "DISPATCH",
                    courierPartner,
                    trackingNumber: trackingNumber || undefined,
                  })
                }
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Reject COD Modal */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/60">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-fg">
                  Reject COD Order
                </h3>
                <p className="text-[11px] text-muted font-mono">
                  Order: {rejectModalOrder.orderNumber}
                </p>
              </div>
            </div>

            <p className="text-xs text-fg-2">
              Rejecting this COD order will cancel the order and <strong>automatically return all reserved products to warehouse inventory stock</strong>.
            </p>

            <div>
              <label className="block font-semibold text-fg-2 mb-1">
                Rejection Reason
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Customer cancelled on phone call, fake phone number, or delivery unreachable."
                className="w-full rounded-xl border border-line bg-bg p-2.5 text-xs text-fg focus:border-rose-500 focus:bg-surface focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-fg-2 hover:bg-surface-2"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() =>
                  executeAction({
                    orderNumber: rejectModalOrder.orderNumber,
                    action: "REJECT",
                    rejectionReason:
                      rejectionReason || "Customer cancelled or unreachable during COD phone verification.",
                  })
                }
                className="rounded-xl border border-rose-300 bg-surface px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40 transition"
              >
                Reject & Restore Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Call History Logs Modal */}
      {historyModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-line bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <PhoneForwarded className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold text-fg">
                  Phone Verification History
                </h3>
              </div>
              <span className="font-mono text-xs text-muted">
                {historyModalOrder.orderNumber}
              </span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {(!historyModalOrder.codDetails?.callLogs ||
                historyModalOrder.codDetails.callLogs.length === 0) ? (
                <p className="text-muted py-6 text-center italic">
                  No phone verification calls have been logged yet for this order.
                </p>
              ) : (
                historyModalOrder.codDetails.callLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-line bg-surface-2 p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-fg">
                        Outcome: {log.callStatus}
                      </span>
                      <span className="text-[10px] text-muted font-mono">
                        {new Date(log.calledAt).toLocaleString("en-IN")}
                      </span>
                    </div>
                    {log.notes && (
                      <p className="text-fg-2 text-[11px] leading-relaxed">
                        {log.notes}
                      </p>
                    )}
                    <p className="text-[10px] text-muted">Agent: {log.calledBy}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setHistoryModalOrder(null)}
                className="rounded-xl bg-surface-3 hover:bg-surface-3 px-4 py-2 font-semibold text-fg-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
