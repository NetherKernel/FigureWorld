"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Truck,
  Package,
  PackageCheck,
  CheckCircle2,
  Clock,
  Search,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Send,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { SUPPORTED_COURIERS, generateTrackingUrl, calculateExpectedDelivery } from "@/lib/shipping";

interface IShipmentOrder {
  _id: string;
  orderNumber: string;
  customerEmail: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  itemsCount: number;
  grandTotal: number;
  paymentMethod: "UPI" | "COD";
  paymentStatus: string;
  orderStatus: string;
  shipmentDetails?: {
    courier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    dispatchedAt?: string;
    estimatedDelivery?: string;
    deliveredAt?: string;
    shippingNotes?: string;
  };
  placedAt: string;
}

export default function AdminShipmentsPage() {
  const [orders, setOrders] = useState<IShipmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQueue, setActiveQueue] = useState<string>("ready_to_dispatch");
  const [searchQuery, setSearchQuery] = useState("");
  const [courierFilter, setCourierFilter] = useState("");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    total: 0,
    readyToPack: 0,
    readyToDispatch: 0,
    inTransit: 0,
    delivered: 0,
  });

  // Dispatch Modal State
  const [selectedOrder, setSelectedOrder] = useState<IShipmentOrder | null>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [courierInput, setCourierInput] = useState(SUPPORTED_COURIERS[0].name);
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [dispatchDateInput, setDispatchDateInput] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDeliveryInput, setExpectedDeliveryInput] = useState(
    new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0]
  );
  const [trackingUrlInput, setTrackingUrlInput] = useState("");
  const [shippingNotesInput, setShippingNotesInput] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

  // Quick Pack Action State
  const [packingOrderNumber, setPackingOrderNumber] = useState<string | null>(null);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeQueue !== "all") params.set("queue", activeQueue);
      if (courierFilter) params.set("courier", courierFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/admin/shipments?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setOrders(json.data.orders || []);
          if (json.data.metrics) {
            setMetrics(json.data.metrics);
          }
        }
      }
    } catch {
      setToastMessage({ type: "error", text: "Network error fetching shipment queue." });
    } finally {
      setLoading(false);
    }
  }, [activeQueue, courierFilter, searchQuery]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  // Update dynamic tracking URL when courier or tracking changes
  useEffect(() => {
    if (trackingNumberInput) {
      setTrackingUrlInput(generateTrackingUrl(courierInput, trackingNumberInput));
    }
  }, [courierInput, trackingNumberInput]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleOpenDispatchModal = (order: IShipmentOrder) => {
    setSelectedOrder(order);
    const courier = order.shipmentDetails?.courier || SUPPORTED_COURIERS[0].name;
    const tracking = order.shipmentDetails?.trackingNumber || `BD-${Date.now().toString().slice(-8)}`;
    setCourierInput(courier);
    setTrackingNumberInput(tracking);
    setDispatchDateInput(new Date().toISOString().split("T")[0]);
    const exp = calculateExpectedDelivery(new Date(), courier);
    setExpectedDeliveryInput(exp.toISOString().split("T")[0]);
    setTrackingUrlInput(generateTrackingUrl(courier, tracking));
    setShippingNotesInput(order.shipmentDetails?.shippingNotes || "");
    setIsDispatchModalOpen(true);
  };

  const handleSubmitDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!courierInput.trim() || !trackingNumberInput.trim()) {
      setToastMessage({ type: "error", text: "Courier name and tracking number are required." });
      return;
    }

    setSubmittingDispatch(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.orderNumber}/shipment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courier: courierInput.trim(),
          trackingNumber: trackingNumberInput.trim(),
          dispatchDate: dispatchDateInput,
          expectedDeliveryDate: expectedDeliveryInput,
          trackingUrl: trackingUrlInput.trim(),
          shippingNotes: shippingNotesInput.trim(),
          autoDispatch: true,
          notifyCustomer,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setToastMessage({
          type: "success",
          text: `Order #${selectedOrder.orderNumber} dispatched via ${courierInput}! Customer notified.`,
        });
        setIsDispatchModalOpen(false);
        await fetchShipments();
      } else {
        setToastMessage({ type: "error", text: json.message || "Failed to dispatch order." });
      }
    } catch {
      setToastMessage({ type: "error", text: "Network error submitting dispatch." });
    } finally {
      setSubmittingDispatch(false);
    }
  };

  const handleQuickPack = async (orderNumber: string) => {
    setPackingOrderNumber(orderNumber);
    try {
      const res = await fetch(`/api/admin/orders/${orderNumber}/pack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: "Items picked, inspected, and packed with corner protectors.",
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setToastMessage({ type: "success", text: `Order #${orderNumber} marked as PACKED!` });
        await fetchShipments();
      } else {
        setToastMessage({ type: "error", text: json.message || "Failed to pack order." });
      }
    } catch {
      setToastMessage({ type: "error", text: "Network error packing order." });
    } finally {
      setPackingOrderNumber(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface-2 p-6 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-ink">
                Sprint 12
              </span>
              <span className="text-xs text-muted">• Logistics & Fulfillment Pipeline</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-fg flex items-center gap-2.5 mt-1">
              <Truck className="h-7 w-7 text-brand-ink" />
              <span>Dispatch & Shipping Management</span>
            </h1>
            <p className="text-sm text-muted">
              Order $\rightarrow$ Pack $\rightarrow$ Dispatch $\rightarrow$ Enter Courier $\rightarrow$ Customer Notification
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-fg-2 hover:bg-surface-2 transition shadow-xs"
            >
              <Layers className="h-4 w-4 text-muted" />
              <span>All Orders</span>
            </Link>
            <button
              onClick={fetchShipments}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`flex items-center justify-between rounded-2xl p-4 text-sm font-medium shadow-sm animate-in fade-in slide-in-from-top-2 ${
              toastMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs font-bold hover:underline ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Fulfillment Queue KPI Ribbon */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <button
            onClick={() => setActiveQueue("ready_to_pack")}
            className={`rounded-3xl border p-5 text-left transition ${
              activeQueue === "ready_to_pack"
                ? "border-amber-400 bg-amber-50/70 dark:border-amber-700 dark:bg-amber-950/30 ring-2 ring-amber-400/20"
                : "border-line bg-surface hover:border-line-strong"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted">1. Ready to Pack</span>
              <div className="rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-fg">
              {metrics.readyToPack}
            </div>
            <p className="text-[11px] text-muted mt-0.5">Awaiting picking & boxing</p>
          </button>

          <button
            onClick={() => setActiveQueue("ready_to_dispatch")}
            className={`rounded-3xl border p-5 text-left transition ${
              activeQueue === "ready_to_dispatch"
                ? "border-brand bg-brand-soft ring-2 ring-brand/20"
                : "border-line bg-surface hover:border-line-strong"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted">2. Ready to Dispatch</span>
              <div className="rounded-xl bg-brand-soft p-2 text-brand-ink">
                <PackageCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-fg">
              {metrics.readyToDispatch}
            </div>
            <p className="text-[11px] text-muted mt-0.5">Packed; enter courier details</p>
          </button>

          <button
            onClick={() => setActiveQueue("in_transit")}
            className={`rounded-3xl border p-5 text-left transition ${
              activeQueue === "in_transit"
                ? "border-blue-400 bg-blue-50/70 dark:border-blue-700 dark:bg-blue-950/30 ring-2 ring-blue-400/20"
                : "border-line bg-surface hover:border-line-strong"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted">3. In Transit</span>
              <div className="rounded-xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                <Truck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-fg">
              {metrics.inTransit}
            </div>
            <p className="text-[11px] text-muted mt-0.5">Dispatched with live tracking</p>
          </button>

          <button
            onClick={() => setActiveQueue("delivered")}
            className={`rounded-3xl border p-5 text-left transition ${
              activeQueue === "delivered"
                ? "border-emerald-400 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-950/30 ring-2 ring-emerald-400/20"
                : "border-line bg-surface hover:border-line-strong"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted">4. Delivered</span>
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-fg">
              {metrics.delivered}
            </div>
            <p className="text-[11px] text-muted mt-0.5">Completed doorstep delivery</p>
          </button>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-line bg-surface p-4 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search by Order #, phone, AWB, or courier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-line bg-surface-2 pl-10 pr-4 py-2 text-xs font-medium text-fg placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={courierFilter}
              onChange={(e) => setCourierFilter(e.target.value)}
              className="rounded-2xl border border-line bg-surface-2 px-3 py-2 text-xs font-medium text-fg-2"
            >
              <option value="">All Couriers</option>
              {SUPPORTED_COURIERS.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setActiveQueue("all")}
              className={`rounded-2xl border px-3 py-2 text-xs font-bold transition ${
                activeQueue === "all"
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-surface text-fg-2 hover:bg-surface-2"
              }`}
            >
              Show All ({metrics.total})
            </button>
          </div>
        </div>

        {/* Shipments Table */}
        <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="border-b border-line bg-surface-2 font-bold text-fg-2">
                <tr>
                  <th className="py-3.5 pl-6 pr-3">Order Number</th>
                  <th className="px-3 py-3.5">Customer & Destination</th>
                  <th className="px-3 py-3.5">Items & Amount</th>
                  <th className="px-3 py-3.5">Fulfillment Status</th>
                  <th className="px-3 py-3.5">Courier & AWB Tracking</th>
                  <th className="px-3 py-3.5">Dates (Dispatch / ETA)</th>
                  <th className="py-3.5 pl-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-fg-2">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted">
                      <RefreshCw className="mx-auto h-6 w-6 animate-spin text-brand-ink mb-2" />
                      Loading shipments pipeline...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted">
                      No orders currently in the selected queue.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const hasShipment = !!order.shipmentDetails?.trackingNumber;
                    return (
                      <tr key={order._id} className="hover:bg-surface-2 transition">
                        {/* Order Number */}
                        <td className="py-4 pl-6 pr-3 font-mono font-bold text-fg">
                          <Link
                            href={`/admin/orders/${order.orderNumber}`}
                            className="hover:text-brand-hover hover:underline flex items-center gap-1.5"
                          >
                            <span>#{order.orderNumber}</span>
                            <ExternalLink className="h-3 w-3 text-muted" />
                          </Link>
                          <span className="text-[10px] text-muted font-sans font-normal block mt-0.5">
                            {new Date(order.placedAt).toLocaleDateString("en-IN")}
                          </span>
                        </td>

                        {/* Customer & Destination */}
                        <td className="px-3 py-4">
                          <div className="font-semibold text-fg">
                            {order.shippingAddress?.fullName || order.customerEmail}
                          </div>
                          <div className="text-[11px] text-muted">
                            {order.shippingAddress?.city}, {order.shippingAddress?.state}
                          </div>
                          {order.shippingAddress?.phone && (
                            <div className="text-[10px] font-mono text-muted">
                              {order.shippingAddress.phone}
                            </div>
                          )}
                        </td>

                        {/* Items & Amount */}
                        <td className="px-3 py-4">
                          <div className="font-bold text-fg">
                            {formatPrice(order.grandTotal)}
                          </div>
                          <div className="text-[11px] text-muted">
                            {order.itemsCount} {order.itemsCount === 1 ? "item" : "items"} • {order.paymentMethod}
                          </div>
                        </td>

                        {/* Fulfillment Status */}
                        <td className="px-3 py-4">
                          <span
                            className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                              order.orderStatus === "CONFIRMED" || order.orderStatus === "PROCESSING"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : order.orderStatus === "PACKED"
                                ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300"
                                : order.orderStatus === "DISPATCHED" || order.orderStatus === "OUT_FOR_DELIVERY"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                : order.orderStatus === "DELIVERED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-surface-3 text-fg-2"
                            }`}
                          >
                            {order.orderStatus}
                          </span>
                        </td>

                        {/* Courier & AWB Tracking */}
                        <td className="px-3 py-4">
                          {hasShipment ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-fg flex items-center gap-1.5">
                                <Truck className="h-3.5 w-3.5 text-brand-ink" />
                                <span>{order.shipmentDetails?.courier}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[11px] font-bold text-brand-ink">
                                  {order.shipmentDetails?.trackingNumber}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(order.shipmentDetails!.trackingNumber!, order._id)}
                                  className="text-muted hover:text-fg p-0.5"
                                >
                                  {copiedText === order._id ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                              {order.shipmentDetails?.trackingUrl && (
                                <a
                                  href={order.shipmentDetails.trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-ink hover:underline"
                                >
                                  <span>Live Track</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted italic">Not Assigned</span>
                          )}
                        </td>

                        {/* Dates */}
                        <td className="px-3 py-4 text-[11px]">
                          {order.shipmentDetails?.dispatchedAt ? (
                            <div>
                              <span className="text-muted">Dispatched: </span>
                              <span className="font-semibold">
                                {new Date(order.shipmentDetails.dispatchedAt).toLocaleDateString("en-IN")}
                              </span>
                            </div>
                          ) : null}
                          {order.shipmentDetails?.estimatedDelivery ? (
                            <div>
                              <span className="text-muted">ETA: </span>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {new Date(order.shipmentDetails.estimatedDelivery).toLocaleDateString("en-IN")}
                              </span>
                            </div>
                          ) : null}
                          {!order.shipmentDetails?.dispatchedAt && (
                            <span className="text-muted">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 pl-3 pr-6 text-right space-x-2">
                          {order.orderStatus === "CONFIRMED" || order.orderStatus === "PROCESSING" ? (
                            <button
                              onClick={() => handleQuickPack(order.orderNumber)}
                              disabled={packingOrderNumber === order.orderNumber}
                              className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-500 transition shadow-xs disabled:opacity-50"
                            >
                              <Package className="h-3.5 w-3.5" />
                              <span>{packingOrderNumber === order.orderNumber ? "Packing..." : "Mark Packed"}</span>
                            </button>
                          ) : null}

                          {order.orderStatus === "PACKED" ? (
                            <button
                              onClick={() => handleOpenDispatchModal(order)}
                              className="inline-flex items-center gap-1 rounded-xl bg-brand px-3.5 py-1.5 font-bold text-white hover:bg-brand-hover transition shadow-xs"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>Dispatch Order</span>
                            </button>
                          ) : null}

                          {order.orderStatus === "DISPATCHED" || order.orderStatus === "OUT_FOR_DELIVERY" ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleOpenDispatchModal(order)}
                                className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface px-2.5 py-1 font-semibold text-fg-2 hover:bg-surface-2 transition"
                              >
                                Edit AWB
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dispatch Modal: Courier, Tracking, Dates & Customer Notification */}
      {isDispatchModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-surface p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-fg">
                    Dispatch Order #{selectedOrder.orderNumber}
                  </h3>
                  <p className="text-[11px] text-muted">
                    Enter courier handover details & notify customer
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="text-muted hover:text-fg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDispatch} className="space-y-4 text-xs">
              {/* Courier Selection */}
              <div>
                <label className="font-bold text-fg-2 block mb-1.5">
                  Courier Partner:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SUPPORTED_COURIERS.slice(0, 6).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCourierInput(c.name)}
                      className={`rounded-xl border p-2.5 text-left font-semibold transition ${
                        courierInput === c.name
                          ? "border-brand bg-brand-soft text-brand-ink ring-2 ring-brand/20"
                          : "border-line bg-surface-2 text-fg-2 hover:bg-surface-3"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tracking Number */}
              <div>
                <label className="font-bold text-fg-2 block mb-1.5">
                  Tracking Number (AWB):
                </label>
                <input
                  type="text"
                  required
                  value={trackingNumberInput}
                  onChange={(e) => setTrackingNumberInput(e.target.value)}
                  placeholder="e.g., BD-92817401 or DLV-8829104"
                  className="w-full rounded-xl border border-line bg-surface-2 p-3 font-mono font-bold text-fg"
                />
              </div>

              {/* Dates: Dispatch Date & Expected Delivery Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-fg-2 block mb-1.5">
                    Dispatch Date:
                  </label>
                  <input
                    type="date"
                    required
                    value={dispatchDateInput}
                    onChange={(e) => setDispatchDateInput(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface-2 p-2.5 font-medium text-fg"
                  />
                </div>

                <div>
                  <label className="font-bold text-fg-2 block mb-1.5">
                    Expected Delivery (ETA):
                  </label>
                  <input
                    type="date"
                    required
                    value={expectedDeliveryInput}
                    onChange={(e) => setExpectedDeliveryInput(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface-2 p-2.5 font-medium text-fg"
                  />
                </div>
              </div>

              {/* Dynamic Tracking URL */}
              <div>
                <label className="font-bold text-fg-2 block mb-1.5">
                  Live Tracking URL:
                </label>
                <input
                  type="url"
                  value={trackingUrlInput}
                  onChange={(e) => setTrackingUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-line bg-surface-2 p-2.5 font-mono text-[11px] text-fg"
                />
              </div>

              {/* Shipping / Packaging Notes */}
              <div>
                <label className="font-bold text-fg-2 block mb-1.5">
                  Packaging / Logistics Notes:
                </label>
                <input
                  type="text"
                  value={shippingNotesInput}
                  onChange={(e) => setShippingNotesInput(e.target.value)}
                  placeholder="e.g. Fragile collectible figure, tamper-proof tape #04"
                  className="w-full rounded-xl border border-line bg-surface-2 p-2.5 text-fg"
                />
              </div>

              {/* Automatic Customer Notification Checkbox */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-950/50 dark:bg-emerald-950/20">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyCustomer}
                    onChange={(e) => setNotifyCustomer(e.target.checked)}
                    className="h-4 w-4 rounded-sm border-line-strong text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-emerald-950 dark:text-emerald-200 block">
                      Automatically Notify Customer
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">
                      Sends WhatsApp message & email with Courier, Tracking ID, and ETA.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="rounded-xl border border-line bg-surface px-4 py-2 font-semibold text-fg-2 hover:bg-surface-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDispatch}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2 font-bold text-white hover:bg-brand-hover transition shadow-xs disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{submittingDispatch ? "Dispatching..." : "Confirm & Dispatch"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
