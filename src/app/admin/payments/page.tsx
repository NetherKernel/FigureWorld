"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { formatPrice } from "@/lib/format";

interface IPaymentOrder {
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
  paymentDetails: {
    merchantUpiId?: string;
    customerUpiId?: string;
    transactionRef?: string;
    upiApp?: string;
    submittedAt?: string;
    verifiedAt?: string;
    verificationNotes?: string;
    rejectionReason?: string;
  };
  placedAt: string;
  createdAt: string;
}

interface IMetrics {
  total: number;
  underReview: number;
  pending: number;
  paid: number;
  failed: number;
  expired: number;
  refunded: number;
}

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<IPaymentOrder[]>([]);
  const [metrics, setMetrics] = useState<IMetrics>({
    total: 0,
    underReview: 0,
    pending: 0,
    paid: 0,
    failed: 0,
    expired: 0,
    refunded: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("UNDER_REVIEW");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Rejection modal state
  const [rejectModalOrder, setRejectModalOrder] = useState<IPaymentOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/payments", window.location.origin);
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
      } else {
        setToastMessage({ type: "error", text: "Failed to load payment transactions." });
      }
    } catch {
      setToastMessage({ type: "error", text: "Network error loading payments." });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleAction = async (
    order: IPaymentOrder,
    action: "CONFIRM" | "REJECT" | "EXPIRE",
    reason?: string
  ) => {
    setProcessingId(order.orderNumber);
    setToastMessage(null);
    try {
      const res = await fetch("/api/admin/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          action,
          rejectionReason: reason,
          notes: action === "CONFIRM" ? "Payment verified in merchant bank statement." : reason,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setToastMessage({
          type: "success",
          text: `Order ${order.orderNumber} successfully marked as ${action === "CONFIRM" ? "PAID & CONFIRMED" : action}!`,
        });
        await fetchPayments();
      } else {
        setToastMessage({
          type: "error",
          text: json.error?.message || "Failed to update payment status.",
        });
      }
    } catch {
      setToastMessage({ type: "error", text: "Network error processing verification." });
    } finally {
      setProcessingId(null);
      setRejectModalOrder(null);
      setRejectionReason("");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(id);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
            <Clock className="h-3 w-3" />
            UNDER REVIEW
          </span>
        );
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            PAID
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-0.5 text-[11px] font-bold text-fg-2 border border-line-strong">
            <Clock className="h-3 w-3" />
            PENDING
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="h-3 w-3" />
            FAILED
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-200 px-2.5 py-0.5 text-[11px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            EXPIRED
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
      <div className="rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-red-950 p-6 sm:p-8 text-white shadow-xl">
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
              <span className="rounded-md bg-brand/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300 border border-brand/30">
                Sprint 7: Direct UPI
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-emerald-400" />
              UPI Payment Verification Console
            </h1>
            <p className="mt-1 text-xs text-slate-300 max-w-2xl">
              Audit customer UTR reference IDs against FiguresWorld merchant bank statements. Orders move to confirmed status strictly upon admin verification.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchPayments}
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
          onClick={() => setFilterStatus("UNDER_REVIEW")}
          className={`rounded-2xl border p-4 text-left transition ${
            filterStatus === "UNDER_REVIEW"
              ? "border-amber-500 bg-amber-50/50 dark:border-amber-500/80 dark:bg-amber-950/30 ring-2 ring-amber-500/20"
              : "border-line bg-surface hover:bg-surface-2"
          }`}
        >
          <div className="flex items-center justify-between text-muted">
            <span className="font-semibold">Under Review</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {metrics.underReview}
          </p>
          <p className="text-[11px] text-muted mt-0.5">Action Required</p>
        </button>

        <button
          onClick={() => setFilterStatus("PENDING")}
          className={`rounded-2xl border p-4 text-left transition ${
            filterStatus === "PENDING"
              ? "border-brand bg-brand-soft ring-2 ring-brand/20"
              : "border-line bg-surface hover:bg-surface-2"
          }`}
        >
          <div className="flex items-center justify-between text-muted">
            <span className="font-semibold">Pending Reference</span>
            <Clock className="h-4 w-4 text-brand-ink" />
          </div>
          <p className="mt-2 text-2xl font-black text-fg">
            {metrics.pending}
          </p>
          <p className="text-[11px] text-muted mt-0.5">Awaiting UTR submission</p>
        </button>

        <button
          onClick={() => setFilterStatus("PAID")}
          className={`rounded-2xl border p-4 text-left transition ${
            filterStatus === "PAID"
              ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-500/80 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20"
              : "border-line bg-surface hover:bg-surface-2"
          }`}
        >
          <div className="flex items-center justify-between text-muted">
            <span className="font-semibold">Verified & Confirmed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {metrics.paid}
          </p>
          <p className="text-[11px] text-muted mt-0.5">Funds confirmed in bank</p>
        </button>

        <button
          onClick={() => setFilterStatus("FAILED")}
          className={`rounded-2xl border p-4 text-left transition ${
            filterStatus === "FAILED"
              ? "border-rose-500 bg-rose-50/50 dark:border-rose-500/80 dark:bg-rose-950/30 ring-2 ring-rose-500/20"
              : "border-line bg-surface hover:bg-surface-2"
          }`}
        >
          <div className="flex items-center justify-between text-muted">
            <span className="font-semibold">Failed / Rejected</span>
            <XCircle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {metrics.failed}
          </p>
          <p className="text-[11px] text-muted mt-0.5">Rejected transactions</p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-line bg-surface p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["UNDER_REVIEW", "PENDING", "PAID", "FAILED", "ALL"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`rounded-xl px-3.5 py-1.5 font-bold transition text-[11px] whitespace-nowrap ${
                filterStatus === st
                  ? "bg-brand text-white shadow-xs"
                  : "bg-surface-3 text-fg-2 hover:bg-line"
              }`}
            >
              {st === "UNDER_REVIEW"
                ? `Under Review (${metrics.underReview})`
                : st === "ALL"
                ? `All (${metrics.total})`
                : st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search order, email, or UTR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-line bg-bg py-2 pl-9 pr-3 text-fg focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-3xl border border-line bg-surface shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-[11px] font-bold text-muted uppercase tracking-wider">
                <th className="py-3 px-4">Order / Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method & UTR Ref</th>
                <th className="py-3 px-4">Submission Time</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted font-medium">
                    {loading ? "Loading transactions..." : "No orders found for this filter."}
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isProcessing = processingId === o.orderNumber;
                  const hasRef = !!o.paymentDetails?.transactionRef;
                  const isUnderReview = o.paymentStatus === "UNDER_REVIEW";
                  const isPaid = o.paymentStatus === "PAID";
                  const isFailed = o.paymentStatus === "FAILED";

                  return (
                    <tr
                      key={o._id}
                      className={`hover:bg-surface-2 transition ${
                        isUnderReview ? "bg-amber-50/20 dark:bg-amber-950/10" : ""
                      }`}
                    >
                      {/* Order / Customer */}
                      <td className="py-4 px-4">
                        <div className="font-mono font-bold text-brand-ink">
                          {o.orderNumber}
                        </div>
                        <div className="text-muted text-[11px]">{o.customerEmail}</div>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4 font-bold text-fg">
                        {formatPrice(o.pricing?.grandTotal || 0)}
                      </td>

                      {/* Method & UTR */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-fg">
                            {o.paymentMethod}
                          </span>
                          {o.paymentDetails?.upiApp && (
                            <span className="rounded bg-surface-3 px-1.5 py-0.2 text-[10px] text-fg-2">
                              {o.paymentDetails.upiApp}
                            </span>
                          )}
                        </div>

                        {hasRef ? (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="font-mono text-xs font-semibold text-fg bg-surface-3 px-2 py-0.5 rounded">
                              {o.paymentDetails.transactionRef}
                            </span>
                            <button
                              onClick={() =>
                                copyToClipboard(o.paymentDetails.transactionRef!, o._id)
                              }
                              title="Copy UTR ID"
                              className="text-muted hover:text-fg p-1"
                            >
                              {copiedRef === o._id ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted italic mt-0.5 block">
                            No reference submitted yet
                          </span>
                        )}
                      </td>

                      {/* Submission Time */}
                      <td className="py-4 px-4 text-muted text-[11px]">
                        {o.paymentDetails?.submittedAt
                          ? new Date(o.paymentDetails.submittedAt).toLocaleString("en-IN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : new Date(o.placedAt).toLocaleString("en-IN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                      </td>

                      {/* Payment Status */}
                      <td className="py-4 px-4">{getStatusBadge(o.paymentStatus)}</td>

                      {/* Action Buttons */}
                      <td className="py-4 px-4 text-right">
                        {isPaid ? (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Confirmed
                          </span>
                        ) : isFailed ? (
                          <span className="text-[11px] text-rose-500 italic block">
                            {o.paymentDetails?.rejectionReason || "Payment Rejected"}
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              disabled={isProcessing}
                              onClick={() => handleAction(o, "CONFIRM")}
                              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 transition shadow-xs disabled:opacity-50"
                            >
                              {isProcessing ? "Processing..." : "Verify & Confirm"}
                            </button>
                            <button
                              disabled={isProcessing}
                              onClick={() => setRejectModalOrder(o)}
                              className="rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 font-semibold px-2.5 py-1.5 transition disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
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

      {/* Reject Confirmation Modal */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/60">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-fg">
                  Reject UPI Transaction
                </h3>
                <p className="text-[11px] text-muted font-mono">
                  Order: {rejectModalOrder.orderNumber}
                </p>
              </div>
            </div>

            <p className="text-xs text-fg-2">
              Rejecting this payment will set payment status to <strong>FAILED</strong>, cancel the order, and automatically return reserved inventory items back to warehouse stock.
            </p>

            <div>
              <label className="block font-semibold text-fg-2 text-xs mb-1">
                Rejection Reason (Customer Notification)
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. UTR ID not found in bank statement, amount mismatch, or transaction reversed."
                className="w-full rounded-xl border border-line bg-bg p-2.5 text-xs text-fg focus:border-rose-500 focus:bg-surface focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectModalOrder(null);
                  setRejectionReason("");
                }}
                className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-fg-2 hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAction(
                    rejectModalOrder,
                    "REJECT",
                    rejectionReason || "UTR reference invalid or funds not received in bank account."
                  )
                }
                className="rounded-xl border border-rose-300 bg-surface px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40 transition"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
