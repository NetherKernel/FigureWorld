"use client";

import React, { useState, useEffect } from "react";
import { Ticket, Plus, Search, RefreshCw, Trash2, CheckCircle2, XCircle, AlertCircle, Calendar } from "lucide-react";

interface CouponRecord {
  _id: string;
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minimumOrderValue: number;
  maximumDiscountAmount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
}

interface CouponsResponse {
  coupons: CouponRecord[];
  metrics: {
    totalCoupons: number;
    activeCoupons: number;
    inactiveCoupons: number;
  };
}

export default function DashboardCouponsPage() {
  const [data, setData] = useState<CouponsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minimumOrderValue, setMinimumOrderValue] = useState<number>(999);
  const [maximumDiscountAmount, setMaximumDiscountAmount] = useState<number>(500);
  const [validUntil, setValidUntil] = useState<string>("2027-12-31");
  const [usageLimit, setUsageLimit] = useState<number>(100);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchCoupons = async (search = query) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/coupons?q=${encodeURIComponent(search)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch coupons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons(query);
  }, [query]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const payload = {
      code: code.toUpperCase().trim(),
      description,
      discountType,
      discountValue: Number(discountValue),
      minimumOrderValue: Number(minimumOrderValue),
      maximumDiscountAmount: discountType === "percentage" ? Number(maximumDiscountAmount) : undefined,
      validUntil: new Date(`${validUntil}T23:59:59Z`).toISOString(),
      usageLimit: usageLimit ? Number(usageLimit) : undefined,
      isActive: true,
    };

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({ type: "success", text: `Coupon ${payload.code} created successfully!` });
        setShowModal(false);
        setCode("");
        setDescription("");
        fetchCoupons(query);
      } else {
        setFeedback({ type: "error", text: json.error?.message || "Failed to create coupon" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to create coupon" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        fetchCoupons(query);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCoupon = async (id: string, couponCode: string) => {
    if (!confirm(`Are you sure you want to permanently delete coupon "${couponCode}"?`)) return;

    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchCoupons(query);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const metrics = data?.metrics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-fg">
            Promotional Coupons & Discounts
          </h1>
          <p className="text-xs text-muted mt-1">
            Discount campaigns, percentage vouchers, minimum cart thresholds, and redemption metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchCoupons(query)}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-fg-2 hover:bg-surface-2 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-hover transition shadow-sm shadow-brand/30"
          >
            <Plus className="h-4 w-4" />
            <span>New Coupon</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Total Coupons</span>
            <Ticket className="h-5 w-5 text-brand-ink" />
          </div>
          <p className="mt-3 text-2xl font-black text-fg">
            {metrics ? metrics.totalCoupons : "—"}
          </p>
          <p className="mt-1 text-[11px] text-muted">Configured promotional codes</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Active Campaigns</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-fg">
            {metrics ? metrics.activeCoupons : "—"}
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium">Eligible at checkout</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Expired / Disabled</span>
            <XCircle className="h-5 w-5 text-muted" />
          </div>
          <p className="mt-3 text-2xl font-black text-fg">
            {metrics ? metrics.inactiveCoupons : "—"}
          </p>
          <p className="mt-1 text-[11px] text-muted">Past dates or toggled off</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search coupons by code or description..."
          className="w-full rounded-2xl border border-line bg-surface pl-10 pr-4 py-2.5 text-xs text-fg shadow-xs focus:ring-2 focus:ring-brand outline-none uppercase"
        />
      </div>

      {/* Coupons Table */}
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead className="border-b border-line text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="pb-3">Code</th>
                <th className="pb-3">Discount</th>
                <th className="pb-3">Min Order</th>
                <th className="pb-3">Max Cap</th>
                <th className="pb-3">Redemptions</th>
                <th className="pb-3">Expiry</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data?.coupons && data.coupons.length > 0 ? (
                data.coupons.map((c) => {
                  const isExpired = new Date(c.validUntil) < new Date();

                  return (
                    <tr key={c._id} className="hover:bg-surface-2">
                      <td className="py-3.5">
                        <div className="space-y-0.5">
                          <span className="font-mono font-black text-xs text-brand-ink bg-brand-soft px-2 py-0.5 rounded-md">
                            {c.code}
                          </span>
                          {c.description && (
                            <p className="text-[11px] text-muted line-clamp-1 max-w-xs">
                              {c.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 font-bold text-fg">
                        {c.discountType === "percentage" ? `${c.discountValue}% OFF` : `₹${c.discountValue} FLAT`}
                      </td>
                      <td className="py-3.5 text-fg-2">
                        ₹{c.minimumOrderValue.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 text-fg-2">
                        {c.maximumDiscountAmount ? `₹${c.maximumDiscountAmount.toLocaleString("en-IN")}` : "No Limit"}
                      </td>
                      <td className="py-3.5">
                        <span className="font-semibold text-fg-2">
                          {c.usedCount}
                        </span>
                        {c.usageLimit && (
                          <span className="text-muted text-[10px]"> / {c.usageLimit}</span>
                        )}
                      </td>
                      <td className="py-3.5 text-muted">
                        {new Date(c.validUntil).toLocaleDateString()}
                      </td>
                      <td className="py-3.5">
                        <button
                          onClick={() => handleToggleActive(c._id, c.isActive)}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase transition ${
                            c.isActive && !isExpired
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-surface-3 text-fg-2"
                          }`}
                        >
                          {isExpired ? "Expired" : c.isActive ? "Active" : "Disabled"}
                        </button>
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteCoupon(c._id, c.code)}
                          className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Delete coupon"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted">
                    No matching coupons found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl border border-line space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-fg">Create New Coupon</h2>

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-fg-2 mb-1">
                  Coupon Code
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SUMMER25"
                  className="w-full rounded-xl border border-line px-3 py-2 bg-surface text-fg uppercase font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-fg-2 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 25% off on anime collectibles"
                  className="w-full rounded-xl border border-line px-3 py-2 bg-surface text-fg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-fg-2 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full rounded-xl border border-line px-3 py-2 bg-surface text-fg"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Flat (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-fg-2 mb-1">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-line px-3 py-2 bg-surface text-fg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-fg-2 mb-1">
                    Min Order Value (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minimumOrderValue}
                    onChange={(e) => setMinimumOrderValue(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-line px-3 py-2 bg-surface text-fg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-fg-2 mb-1">
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={discountType === "fixed"}
                    value={maximumDiscountAmount}
                    onChange={(e) => setMaximumDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-line px-3 py-2 bg-surface text-fg disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-fg-2 mb-1">
                    Valid Until Date
                  </label>
                  <input
                    type="date"
                    required
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 bg-surface text-fg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-fg-2 mb-1">
                    Usage Limit (Max Uses)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(parseInt(e.target.value) || 100)}
                    className="w-full rounded-xl border border-line px-3 py-2 bg-surface text-fg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-fg-2 hover:bg-surface-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-hover shadow-md transition"
                >
                  {submitting ? "Creating..." : "Save Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
