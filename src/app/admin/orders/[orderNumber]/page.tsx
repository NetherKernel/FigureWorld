"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  ShoppingBag,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  AlertCircle,
  XCircle,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Layers,
  Edit3,
  FileText,
  Send,
  Download,
  MessageSquare,
  CheckCheck,
  Smartphone,
  Package,
} from "lucide-react";
import { formatPrice } from "@/lib/format";

interface IOrderItem {
  _id: string;
  product?: string;
  productTitle: string;
  productSku: string;
  productImage?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  total: number;
}

interface IOrderStatusHistory {
  status: string;
  changedAt: string;
  changedBy?: string;
  notes?: string;
}

interface IOrderDetail {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customer: {
    id?: string;
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    fullName: string;
    phone: string;
    streetLine1: string;
    streetLine2?: string;
    landmark?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  items: IOrderItem[];
  pricing: {
    subtotal: number;
    shippingFee: number;
    discountTotal: number;
    taxTotal: number;
    grandTotal: number;
    currency: string;
  };
  paymentMethod: "UPI" | "COD";
  paymentStatus: string;
  orderStatus: string;
  paymentDetails?: {
    merchantUpiId?: string;
    customerUpiId?: string;
    transactionRef?: string;
    upiApp?: string;
    submittedAt?: string;
    verifiedAt?: string;
    verificationNotes?: string;
    rejectionReason?: string;
  };
  codDetails?: {
    codStatus: string;
    verifiedAt?: string;
    callLogs: Array<{
      calledAt: string;
      calledBy: string;
      callStatus: string;
      notes?: string;
    }>;
    courierPartner?: string;
    trackingNumber?: string;
    dispatchedAt?: string;
  };
  shipment: {
    courier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    dispatchedAt?: string;
    estimatedDelivery?: string;
    deliveredAt?: string;
    shippingNotes?: string;
  };
  statusHistory: IOrderStatusHistory[];
  invoiceNumber?: string;
  invoiceId?: string;
  complianceVerified: boolean;
  notes?: string;
  placedAt: string;
  createdAt: string;
  updatedAt: string;
}

const ALL_ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAYMENT_REVIEW",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "DISPATCHED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "REFUNDED",
];

const COURIER_OPTIONS = [
  "Blue Dart Express",
  "Delhivery Express",
  "Shadowfax Logistics",
  "Xpressbees Logistics",
  "India Post Speed Post",
  "DTDC Express",
  "FedEx India",
];

export default function AdminOrderDetailPage() {
  const params = useParams();
  const rawOrderNumber = params.orderNumber as string;

  const [order, setOrder] = useState<IOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Status Change Modal / Controls
  const [selectedNewStatus, setSelectedNewStatus] = useState<string>("");
  const [statusChangeNotes, setStatusChangeNotes] = useState<string>("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Shipment Modal Controls
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [courierInput, setCourierInput] = useState(COURIER_OPTIONS[0]);
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [autoDispatchShipment, setAutoDispatchShipment] = useState(true);
  const [shippingNotesInput, setShippingNotesInput] = useState("");
  const [dispatchDateInput, setDispatchDateInput] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDeliveryInput, setExpectedDeliveryInput] = useState(
    new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0]
  );
  const [trackingUrlInput, setTrackingUrlInput] = useState("");
  const [notifyCustomerShipment, setNotifyCustomerShipment] = useState(true);
  const [updatingShipment, setUpdatingShipment] = useState(false);
  const [packingOrder, setPackingOrder] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);

  // WhatsApp Notifications State (Sprint 11)
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!rawOrderNumber) return;
    setLoadingNotifications(true);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(rawOrderNumber)}/notifications`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setNotifications(json.data.notifications || []);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingNotifications(false);
    }
  }, [rawOrderNumber]);

  const handleSendNotification = async (type: string, customMessage?: string) => {
    setSendingNotification(true);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(rawOrderNumber)}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, customMessage }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setToastMessage({ type: "success", text: `WhatsApp ${type} dispatched successfully!` });
        await fetchNotifications();
      } else {
        setToastMessage({ type: "error", text: json.message || "Failed to send WhatsApp message." });
      }
    } catch {
      setToastMessage({ type: "error", text: "Network error sending WhatsApp message." });
    } finally {
      setSendingNotification(false);
    }
  };

  const fetchOrderDetail = useCallback(async () => {
    if (!rawOrderNumber) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(rawOrderNumber)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setOrder(json.data);
          setSelectedNewStatus(json.data.orderStatus.toUpperCase());
          if (json.data.shipment?.courier) {
            setCourierInput(json.data.shipment.courier);
          }
          if (json.data.shipment?.trackingNumber) {
            setTrackingNumberInput(json.data.shipment.trackingNumber);
          }
        } else {
          setToastMessage({ type: "error", text: json.message || "Failed to load order." });
        }
      } else {
        setToastMessage({ type: "error", text: "Order not found or server error." });
      }
    } catch {
      setToastMessage({ type: "error", text: "Network error fetching order details." });
    } finally {
      setLoading(false);
    }
  }, [rawOrderNumber]);

  useEffect(() => {
    fetchOrderDetail();
    fetchNotifications();
  }, [fetchOrderDetail, fetchNotifications]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleUpdateStatus = async (targetStatus: string, notes?: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(rawOrderNumber)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          notes: notes || statusChangeNotes,
          restockInventory: true,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setToastMessage({ type: "success", text: `Order status updated to ${targetStatus}.` });
        setIsStatusModalOpen(false);
        setStatusChangeNotes("");
        await fetchOrderDetail();
      } else {
        setToastMessage({ type: "error", text: json.message || "Failed to update status." });
      }
    } catch {
      setToastMessage({ type: "error", text: "Network error updating order status." });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleMarkPacked = async () => {
    setPackingOrder(true);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(rawOrderNumber)}/pack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Items picked and packed into shipping box." }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setToastMessage({ type: "success", text: "Order marked as PACKED!" });
        await fetchOrderDetail();
      } else {
        setToastMessage({ type: "error", text: json.message || "Failed to pack order." });
      }
    } catch {
      setToastMessage({ type: "error", text: "Network error packing order." });
    } finally {
      setPackingOrder(false);
    }
  };

  const handleSaveShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumberInput.trim()) {
      setToastMessage({ type: "error", text: "Please enter a tracking number." });
      return;
    }

    setUpdatingShipment(true);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(rawOrderNumber)}/shipment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courier: courierInput,
          trackingNumber: trackingNumberInput.trim(),
          dispatchDate: dispatchDateInput,
          expectedDeliveryDate: expectedDeliveryInput,
          trackingUrl: trackingUrlInput.trim() || undefined,
          shippingNotes: shippingNotesInput.trim() || undefined,
          autoDispatch: autoDispatchShipment,
          notifyCustomer: notifyCustomerShipment,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setToastMessage({ type: "success", text: "Order dispatched & customer notified successfully." });
        setIsShipmentModalOpen(false);
        await fetchOrderDetail();
      } else {
        setToastMessage({ type: "error", text: json.message || "Failed to update shipment." });
      }
    } catch {
      setToastMessage({ type: "error", text: "Network error updating shipment details." });
    } finally {
      setUpdatingShipment(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setGeneratingInvoice(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(rawOrderNumber)}/invoice`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setToastMessage({ type: "success", text: `Invoice ${json.data.invoiceNumber} generated successfully!` });
        await fetchOrderDetail();
      } else {
        setToastMessage({ type: "error", text: json.message || "Failed to generate invoice." });
      }
    } catch {
      setToastMessage({ type: "error", text: "Network error generating invoice." });
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!order?.invoiceNumber) return;
    setSendingInvoice(true);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(order.invoiceNumber)}/send`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setToastMessage({ type: "success", text: `Invoice sent to customer at ${order.customerEmail}` });
      } else {
        setToastMessage({ type: "error", text: json.message || "Failed to send invoice email." });
      }
    } catch {
      setToastMessage({ type: "error", text: "Network error sending invoice email." });
    } finally {
      setSendingInvoice(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case "PENDING_PAYMENT":
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
            <Clock className="h-4 w-4" />
            PENDING PAYMENT
          </span>
        );
      case "PAYMENT_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700 border border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800/60">
            <Clock className="h-4 w-4" />
            PAYMENT REVIEW
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60">
            <CheckCircle2 className="h-4 w-4" />
            CONFIRMED
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60">
            <Layers className="h-4 w-4" />
            PROCESSING
          </span>
        );
      case "PACKED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/60">
            <PackageCheck className="h-4 w-4" />
            PACKED
          </span>
        );
      case "DISPATCHED":
      case "SHIPPED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60">
            <Truck className="h-4 w-4" />
            DISPATCHED
          </span>
        );
      case "OUT_FOR_DELIVERY":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
            <Truck className="h-4 w-4" />
            OUT FOR DELIVERY
          </span>
        );
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            DELIVERED
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60">
            <XCircle className="h-4 w-4" />
            CANCELLED
          </span>
        );
      case "RETURN_REQUESTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60">
            <AlertCircle className="h-4 w-4" />
            RETURN REQUESTED
          </span>
        );
      case "RETURNED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-3 px-3 py-1 text-xs font-bold text-fg-2 border border-line-strong">
            <RotateCcw className="h-4 w-4" />
            RETURNED
          </span>
        );
      case "REFUNDED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-50 px-3 py-1 text-xs font-bold text-stone-700 border border-stone-200 dark:bg-stone-950/40 dark:text-stone-300">
            <RotateCcw className="h-4 w-4" />
            REFUNDED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-3 px-3 py-1 text-xs font-bold text-fg-2 border border-line">
            {status}
          </span>
        );
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === "PAID") {
      return (
        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
          PAID
        </span>
      );
    }
    if (s === "UNDER_REVIEW") {
      return (
        <span className="rounded-lg bg-yellow-50 px-2.5 py-1 text-xs font-bold text-yellow-700 border border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300">
          UNDER REVIEW
        </span>
      );
    }
    if (s === "PENDING") {
      return (
        <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
          PENDING
        </span>
      );
    }
    return (
      <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
        {s}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center space-y-3">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-brand-ink" />
        <p className="text-xs text-muted">Loading order details for #{rawOrderNumber}...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center space-y-4">
        <ShoppingBag className="h-12 w-12 mx-auto text-muted" />
        <h2 className="text-lg font-bold text-fg">Order Not Found</h2>
        <p className="text-xs text-muted">
          Could not locate order #{rawOrderNumber} in the database.
        </p>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Orders</span>
        </Link>
      </div>
    );
  }

  const customerName = order.customer?.name || order.shippingAddress?.fullName || "Guest Customer";
  const customerPhone = order.customer?.phone || order.shippingAddress?.phone || "N/A";
  const courier = order.shipment?.courier;
  const trackingNumber = order.shipment?.trackingNumber;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-xs font-semibold shadow-md ${
            toastMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-200"
          }`}
        >
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-4 font-bold text-muted hover:text-fg">
            ×
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Link
                href="/admin/orders"
                className="rounded-lg p-1.5 text-muted hover:bg-surface-3 hover:text-fg transition"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-black tracking-tight text-fg">
                Order #{order.orderNumber}
              </h1>
              <button
                onClick={() => copyToClipboard(order.orderNumber, "orderNumber")}
                className="rounded-lg p-1 text-muted hover:bg-surface-3 hover:text-fg transition"
                title="Copy Order Number"
              >
                {copiedText === "orderNumber" ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted">
              Placed on{" "}
              <span className="font-semibold text-fg-2">
                {new Date(order.placedAt).toLocaleString("en-IN", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">Order Status:</span>
              {getStatusBadge(order.orderStatus)}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">Payment:</span>
              <span className="rounded-md bg-surface-3 px-2 py-0.5 text-xs font-bold text-fg-2">
                {order.paymentMethod}
              </span>
              {getPaymentStatusBadge(order.paymentStatus)}
            </div>

            {/* Quick fulfillment buttons (Sprint 12) */}
            {(order.orderStatus === "CONFIRMED" || order.orderStatus === "PROCESSING" || order.orderStatus === "confirmed" || order.orderStatus === "processing") && (
              <button
                onClick={handleMarkPacked}
                disabled={packingOrder}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500 transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <Package className="h-3.5 w-3.5" />
                <span>{packingOrder ? "Packing..." : "Pack Order"}</span>
              </button>
            )}

            {order.orderStatus === "PACKED" && (
              <button
                onClick={() => setIsShipmentModalOpen(true)}
                className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-hover transition shadow-sm flex items-center gap-1.5"
              >
                <Truck className="h-3.5 w-3.5" />
                <span>Dispatch Order</span>
              </button>
            )}

            <button
              onClick={() => setIsStatusModalOpen(true)}
              className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover transition shadow-sm flex items-center gap-1.5"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Update Status</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Products & Shipment & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Products Ordered Card */}
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-fg">Products Ordered</h2>
                  <p className="text-[11px] text-muted">Items and price calculation</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-muted">
                {order.items.reduce((sum, it) => sum + it.quantity, 0)} items
              </span>
            </div>

            <div className="divide-y divide-line">
              {order.items.map((item, index) => (
                <div key={index} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={item.productImage || "https://images.unsplash.com/photo-1563089145-599997674d42?w=200"}
                      alt={item.productTitle}
                      className="h-14 w-14 rounded-xl object-cover border border-line"
                    />
                    <div>
                      <p className="text-xs font-bold text-fg">{item.productTitle}</p>
                      <p className="text-[11px] font-mono text-muted mt-0.5">SKU: {item.productSku}</p>
                      <p className="text-[11px] text-muted mt-0.5">
                        {formatPrice(item.unitPrice)} × {item.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-black text-fg">{formatPrice(item.total)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Totals */}
            <div className="border-t border-line pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="font-semibold text-fg">
                  {formatPrice(order.pricing.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Shipping Fee</span>
                <span className="font-semibold text-fg">
                  {formatPrice(order.pricing.shippingFee)}
                </span>
              </div>
              <div className="flex justify-between text-fg pt-2 border-t border-line font-black text-sm">
                <span>Grand Total</span>
                <span className="text-brand-ink">{formatPrice(order.pricing.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Shipment & Tracking Card */}
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-fg">Shipment & Courier Tracking</h2>
                  <p className="text-[11px] text-muted">Logistics dispatch partner & AWB code</p>
                </div>
              </div>
              <button
                onClick={() => setIsShipmentModalOpen(true)}
                className="rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg-2 hover:bg-surface-3 transition"
              >
                {trackingNumber ? "Edit Shipment" : "+ Assign Courier"}
              </button>
            </div>

            {trackingNumber ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-2xl border border-line bg-surface-2 p-4">
                  <span className="text-muted font-medium">Courier Partner</span>
                  <p className="text-sm font-bold text-fg mt-1">{courier || "Express Courier"}</p>
                </div>

                <div className="rounded-2xl border border-line bg-surface-2 p-4">
                  <span className="text-muted font-medium">Tracking Number (AWB)</span>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm font-mono font-bold text-teal-600 dark:text-teal-400">{trackingNumber}</p>
                    <button
                      onClick={() => copyToClipboard(trackingNumber, "tracking")}
                      className="text-muted hover:text-fg p-1"
                      title="Copy Tracking Number"
                    >
                      {copiedText === "tracking" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {order.shipment?.dispatchedAt && (
                  <div className="rounded-2xl border border-line bg-surface-2 p-4 sm:col-span-2">
                    <span className="text-muted font-medium">Dispatch Timestamp</span>
                    <p className="text-xs font-semibold text-fg mt-1">
                      {new Date(order.shipment.dispatchedAt).toLocaleString("en-IN", {
                        dateStyle: "full",
                        timeStyle: "short",
                      })}
                    </p>
                    {order.shipment.shippingNotes && (
                      <p className="text-[11px] text-muted mt-1 italic">
                        Notes: {order.shipment.shippingNotes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center rounded-2xl border border-dashed border-line bg-surface-2 text-xs text-muted space-y-2">
                <Truck className="h-8 w-8 mx-auto text-muted" />
                <p className="font-semibold text-fg-2">Shipment Not Yet Assigned</p>
                <p className="text-[11px] text-muted max-w-sm mx-auto">
                  Assign courier partner and tracking code once items have been packed for dispatch.
                </p>
                <button
                  onClick={() => setIsShipmentModalOpen(true)}
                  className="mt-2 inline-flex items-center gap-1 rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition"
                >
                  <span>Assign Tracking Now</span>
                </button>
              </div>
            )}
          </div>

          {/* Status Timeline / History */}
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-line pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-fg">Status Audit Trail & Timeline</h2>
                <p className="text-[11px] text-muted">Chronological history of state transitions</p>
              </div>
            </div>

            {order.statusHistory && order.statusHistory.length > 0 ? (
              <div className="space-y-4 text-xs pl-2">
                {order.statusHistory.map((item, idx) => (
                  <div key={idx} className="relative pl-6 border-l-2 border-line pb-2">
                    <div className="absolute -left-1.5 top-0.5 h-3 w-3 rounded-full bg-brand ring-4 ring-brand-soft" />
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-fg">{item.status}</span>
                      <span className="text-[10px] text-muted">
                        {new Date(item.changedAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-[11px] text-muted mt-0.5">{item.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted italic">No previous transition logs recorded.</p>
            )}
          </div>
        </div>

        {/* Right Column (1/3 width): Customer, Address & Payment */}
        <div className="space-y-6">
          {/* Customer Card */}
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-line pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-fg">Customer Info</h2>
                <p className="text-[11px] text-muted">Contact details</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted text-[11px] block">Full Name</span>
                <span className="font-bold text-fg text-sm">{customerName}</span>
              </div>

              <div>
                <span className="text-muted text-[11px] block">Phone Number</span>
                {customerPhone !== "N/A" ? (
                  <a
                    href={`tel:${customerPhone}`}
                    className="font-semibold text-brand-ink hover:text-brand-hover flex items-center gap-1.5 mt-0.5"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>{customerPhone}</span>
                  </a>
                ) : (
                  <span className="text-muted">N/A</span>
                )}
              </div>

              <div>
                <span className="text-muted text-[11px] block">Email Address</span>
                <a
                  href={`mailto:${order.customerEmail}`}
                  className="font-semibold text-brand-ink hover:text-brand-hover flex items-center gap-1.5 mt-0.5 break-all"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span>{order.customerEmail}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Delivery Address Card */}
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-line pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-fg">Shipping Address</h2>
                <p className="text-[11px] text-muted">Destination coordinates</p>
              </div>
            </div>

            {order.shippingAddress ? (
              <div className="text-xs space-y-1.5 text-fg-2">
                <p className="font-bold text-fg">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.streetLine1}</p>
                {order.shippingAddress.landmark && (
                  <p className="text-muted text-[11px]">Landmark: {order.shippingAddress.landmark}</p>
                )}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
                </p>
                <p className="text-muted font-semibold">{order.shippingAddress.country}</p>
              </div>
            ) : (
              <p className="text-xs text-muted italic">No shipping address record attached.</p>
            )}
          </div>

          {/* Payment Card */}
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-fg">Payment Method</h2>
                  <p className="text-[11px] text-muted">Transaction details</p>
                </div>
              </div>
              {getPaymentStatusBadge(order.paymentStatus)}
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Method</span>
                <span className="font-bold text-fg">{order.paymentMethod}</span>
              </div>

              {order.paymentMethod === "UPI" && order.paymentDetails && (
                <>
                  {order.paymentDetails.transactionRef && (
                    <div className="rounded-xl border border-line bg-surface-2 p-3">
                      <span className="text-muted text-[10px] block">12-Digit UTR Reference</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-mono font-bold text-fg">
                          {order.paymentDetails.transactionRef}
                        </span>
                        <button
                          onClick={() => copyToClipboard(order.paymentDetails!.transactionRef!, "utr")}
                          className="text-muted hover:text-fg p-0.5"
                        >
                          {copiedText === "utr" ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {order.paymentDetails.merchantUpiId && (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted">Merchant VPA</span>
                      <span className="font-mono text-fg-2">
                        {order.paymentDetails.merchantUpiId}
                      </span>
                    </div>
                  )}

                  {order.paymentDetails.customerUpiId && (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted">Customer VPA</span>
                      <span className="font-mono text-fg-2">
                        {order.paymentDetails.customerUpiId}
                      </span>
                    </div>
                  )}
                </>
              )}

              {order.paymentMethod === "COD" && order.codDetails && (
                <div className="rounded-xl border border-line bg-surface-2 p-3 space-y-1">
                  <span className="text-muted text-[10px] block">COD Verification Status</span>
                  <span className="font-bold text-amber-600">{order.codDetails.codStatus}</span>
                  <span className="text-[11px] text-muted block">
                    {order.codDetails.callLogs.length} customer phone verification calls logged.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Official Tax Invoice Card (Sprint 10) */}
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-fg">Tax Invoice</h2>
                  <p className="text-[11px] text-muted">GST 18% Compliant Billing</p>
                </div>
              </div>
              {order.invoiceNumber ? (
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                  GENERATED
                </span>
              ) : (
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                  NOT GENERATED
                </span>
              )}
            </div>

            {order.invoiceNumber ? (
              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-line bg-surface-2 p-3">
                  <span className="text-muted text-[10px] block">Invoice Number (Server-Generated)</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono font-bold text-brand-ink">
                      {order.invoiceNumber}
                    </span>
                    <button
                      onClick={() => copyToClipboard(order.invoiceNumber!, "invoiceNumber")}
                      className="text-muted hover:text-fg p-0.5"
                    >
                      {copiedText === "invoiceNumber" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-[11px] text-muted">
                  <span>Store GSTIN:</span>
                  <span className="font-mono font-bold text-fg">27AADCF1234F1Z5</span>
                </div>

                <div className="flex justify-between text-[11px] text-muted">
                  <span>HSN Code:</span>
                  <span className="font-mono text-fg">95030090</span>
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/invoices/${order.invoiceNumber}`}
                      target="_blank"
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-line bg-surface py-2 text-xs font-semibold text-fg-2 hover:bg-surface-2 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Web View</span>
                    </Link>

                    <a
                      href={`/api/invoices/${order.invoiceNumber}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 rounded-xl bg-brand py-2 text-xs font-semibold text-white hover:bg-brand-hover transition shadow-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>PDF</span>
                    </a>
                  </div>

                  <button
                    onClick={handleSendInvoice}
                    disabled={sendingInvoice}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand/30 bg-brand-soft py-2 text-xs font-semibold text-brand-ink hover:bg-brand/15 transition"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{sendingInvoice ? "Sending..." : "Email Invoice to Customer"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-2 text-xs">
                <p className="text-muted">No invoice generated yet for this order.</p>
                <button
                  onClick={handleGenerateInvoice}
                  disabled={generatingInvoice}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-hover transition shadow-xs disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" />
                  <span>{generatingInvoice ? "Generating..." : "Generate Tax Invoice"}</span>
                </button>
              </div>
            )}
          </div>

          {/* WhatsApp Business Card (Sprint 11) */}
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-fg flex items-center gap-1.5">
                    <span>WhatsApp Business</span>
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </h2>
                  <p className="text-[11px] text-muted">Automated & Direct Messaging</p>
                </div>
              </div>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                {notifications.length} {notifications.length === 1 ? "MESSAGE" : "MESSAGES"}
              </span>
            </div>

            {/* Direct Customer WhatsApp Link */}
            {order.shippingAddress?.phone ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-950/50 dark:bg-emerald-950/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-mono text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    {order.shippingAddress.phone}
                  </span>
                </div>
                <a
                  href={`https://wa.me/${order.shippingAddress.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${order.shippingAddress.fullName}, regarding your FiguresWorld order #${order.orderNumber}:`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-500 transition shadow-xs"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Open Chat</span>
                </a>
              </div>
            ) : null}

            {/* Quick WhatsApp Action Triggers */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                Trigger WhatsApp Notification:
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  onClick={() => handleSendNotification("ORDER_CONFIRMATION")}
                  disabled={sendingNotification}
                  className="rounded-xl border border-line bg-surface-2 px-2.5 py-1.5 font-medium text-fg-2 hover:bg-surface-3 hover:text-fg transition disabled:opacity-50 text-left truncate"
                >
                  📦 Confirmation
                </button>
                <button
                  onClick={() => handleSendNotification("PAYMENT_CONFIRMATION")}
                  disabled={sendingNotification}
                  className="rounded-xl border border-line bg-surface-2 px-2.5 py-1.5 font-medium text-fg-2 hover:bg-surface-3 hover:text-fg transition disabled:opacity-50 text-left truncate"
                >
                  💰 Payment Recv
                </button>
                <button
                  onClick={() => handleSendNotification("INVOICE")}
                  disabled={sendingNotification}
                  className="rounded-xl border border-brand/30 bg-brand-soft px-2.5 py-1.5 font-medium text-brand-ink hover:bg-brand/15 transition disabled:opacity-50 text-left truncate"
                >
                  📄 Send Invoice
                </button>
                <button
                  onClick={() => handleSendNotification("DISPATCH")}
                  disabled={sendingNotification}
                  className="rounded-xl border border-brand/30 bg-brand-soft px-2.5 py-1.5 font-medium text-brand-ink hover:bg-brand/15 transition disabled:opacity-50 text-left truncate"
                >
                  🚀 Dispatch Alert
                </button>
                <button
                  onClick={() => handleSendNotification("DELIVERY")}
                  disabled={sendingNotification}
                  className="col-span-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5 font-medium text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50 text-center truncate dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                >
                  🎉 Delivery Notice ("Thank you for shopping")
                </button>
              </div>
            </div>

            {/* Notification History Timeline */}
            <div className="space-y-2 pt-2 border-t border-line">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                  Dispatch History:
                </span>
                <button
                  onClick={fetchNotifications}
                  disabled={loadingNotifications}
                  className="text-[10px] text-emerald-600 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className={`h-2.5 w-2.5 ${loadingNotifications ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {notifications.length === 0 ? (
                <p className="text-[11px] text-muted py-2 text-center">
                  No WhatsApp messages dispatched yet.
                </p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-xs">
                  {notifications.map((n: any, idx: number) => (
                    <div
                      key={n._id || idx}
                      className="rounded-xl border border-line bg-surface-2 p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded font-bold text-[10px] px-1.5 py-0.5 bg-surface-3 text-fg-2">
                          {n.notificationType}
                        </span>
                        <div className="flex items-center gap-1">
                          {n.status === "READ" ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
                              <CheckCheck className="h-3 w-3" /> READ
                            </span>
                          ) : n.status === "DELIVERED" ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-teal-600">
                              <Check className="h-3 w-3" /> DELIVERED
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-brand-ink">
                              {n.status}
                            </span>
                          )}
                        </div>
                      </div>

                      {n.body && (
                        <p className="text-[11px] text-fg-2 whitespace-pre-line line-clamp-3">
                          {n.body}
                        </p>
                      )}

                      {n.documentUrl && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-brand-ink font-mono truncate max-w-[150px]">
                            📎 {n.filename || "invoice.pdf"}
                          </span>
                          <a
                            href={n.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold text-brand-ink hover:underline shrink-0"
                          >
                            View Document
                          </a>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[9px] text-muted pt-0.5 border-t border-line">
                        <span>To: +{n.recipientPhone}</span>
                        <span>{new Date(n.sentAt || n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Transition Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-fg">
                Update Order Status
              </h3>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="text-muted hover:text-fg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-fg-2 block mb-1.5">
                  Select New Lifecycle Status:
                </label>
                <select
                  value={selectedNewStatus}
                  onChange={(e) => setSelectedNewStatus(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface-2 p-3 font-semibold text-fg"
                >
                  {ALL_ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-fg-2 block mb-1.5">
                  Internal Audit Note (Optional):
                </label>
                <textarea
                  rows={3}
                  value={statusChangeNotes}
                  onChange={(e) => setStatusChangeNotes(e.target.value)}
                  placeholder="e.g., Goods packed into box 4, handed to courier driver..."
                  className="w-full rounded-xl border border-line bg-surface-2 p-3 text-fg"
                />
              </div>

              {selectedNewStatus === "CANCELLED" && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 text-[11px] space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Automatic Warehouse Restock Active
                  </p>
                  <p>
                    Transitioning this order to CANCELLED will automatically restore all reserved product units back to warehouse inventory.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-fg-2 hover:bg-surface-3 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleUpdateStatus(selectedNewStatus)}
                className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover transition shadow-sm disabled:opacity-50"
              >
                {updatingStatus ? "Updating..." : "Save Status Transition"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shipment Modal */}
      {isShipmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveShipment}
            className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-fg">
                Assign Shipment & Tracking
              </h3>
              <button
                type="button"
                onClick={() => setIsShipmentModalOpen(false)}
                className="text-muted hover:text-fg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-fg-2 block mb-1.5">
                  Courier Partner:
                </label>
                <select
                  value={courierInput}
                  onChange={(e) => setCourierInput(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface-2 p-3 font-semibold text-fg"
                >
                  {COURIER_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-fg-2 block mb-1.5">
                  Tracking Number (AWB Code):
                </label>
                <input
                  type="text"
                  required
                  value={trackingNumberInput}
                  onChange={(e) => setTrackingNumberInput(e.target.value)}
                  placeholder="e.g., BD-84920491 or DEL-9021482"
                  className="w-full rounded-xl border border-line bg-surface-2 p-3 font-mono font-bold text-fg"
                />
              </div>

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

              <div>
                <label className="font-bold text-fg-2 block mb-1.5">
                  Live Tracking URL (Optional - Auto-Generated):
                </label>
                <input
                  type="url"
                  value={trackingUrlInput}
                  onChange={(e) => setTrackingUrlInput(e.target.value)}
                  placeholder="https://www.bluedart.com/tracking?track=..."
                  className="w-full rounded-xl border border-line bg-surface-2 p-2.5 font-mono text-[11px] text-fg"
                />
              </div>

              <div>
                <label className="font-bold text-fg-2 block mb-1.5">
                  Dispatch Notes:
                </label>
                <input
                  type="text"
                  value={shippingNotesInput}
                  onChange={(e) => setShippingNotesInput(e.target.value)}
                  placeholder="e.g. Fragile figure, double boxed"
                  className="w-full rounded-xl border border-line bg-surface-2 p-3 text-fg"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoDispatchCheckbox"
                    checked={autoDispatchShipment}
                    onChange={(e) => setAutoDispatchShipment(e.target.checked)}
                    className="h-4 w-4 rounded-md border-line-strong text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor="autoDispatchCheckbox" className="font-semibold text-fg-2 cursor-pointer">
                    Automatically transition Order Status to <strong>DISPATCHED</strong>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="notifyCustomerCheckbox"
                    checked={notifyCustomerShipment}
                    onChange={(e) => setNotifyCustomerShipment(e.target.checked)}
                    className="h-4 w-4 rounded-md border-line-strong text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="notifyCustomerCheckbox" className="font-semibold text-emerald-800 dark:text-emerald-300 cursor-pointer text-[11px]">
                    Automatically notify customer via <strong>WhatsApp & Email</strong> with tracking details
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsShipmentModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-fg-2 hover:bg-surface-3 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingShipment}
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition shadow-sm disabled:opacity-50"
              >
                {updatingShipment ? "Saving..." : "Save Shipment Details"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
