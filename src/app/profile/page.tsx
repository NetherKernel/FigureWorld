"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/format";
import { FALLBACK_PRODUCT_IMAGE } from "@/lib/product-view";
import {
  Package,
  ShieldCheck,
  MapPin,
  Wallet,
  Headset,
  Plus,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Truck,
  FileText,
  X,
  Mail,
  Smartphone,
  Banknote,
  ShoppingBag,
  Loader2,
} from "lucide-react";

interface Address {
  _id: string;
  type: "shipping" | "billing" | "both";
  fullName: string;
  phone: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

interface CustomerOrder {
  orderNumber: string;
  customerEmail: string;
  pricing: {
    subtotal: number;
    discountTotal?: number;
    taxTotal?: number;
    shippingFee?: number;
    grandTotal: number;
    currency?: string;
  };
  paymentMethod: "UPI" | "COD";
  paymentStatus: string;
  orderStatus: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    landmark?: string;
    city: string;
    state: string;
    pinCode: string;
  } | null;
  items: Array<{
    productId?: string;
    name: string;
    sku: string;
    image?: string;
    unitPrice: number;
    quantity: number;
    total: number;
  }>;
  placedAt: string;
  updatedAt: string;
}

type Msg = { type: "success" | "error"; text: string } | null;
type EditableField = "name" | "phone" | "password";
type AddressForm = {
  type: "shipping" | "billing" | "both";
  fullName: string;
  phone: string;
  streetLine1: string;
  streetLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

const DEFAULT_COUNTRY = "India";
const SUPPORT_EMAIL = "support@figuresworld.com";

const ACCOUNT_SECTIONS = [
  { id: "orders", title: "Your Orders", description: "Track packages, view invoices or buy things again", icon: Package },
  { id: "security", title: "Login & security", description: "Edit your name, mobile number and password", icon: ShieldCheck },
  { id: "addresses", title: "Your Addresses", description: "Add, edit or remove delivery addresses", icon: MapPin },
  { id: "payments", title: "Payment options", description: "UPI and Cash on Delivery at checkout", icon: Wallet },
  { id: "help", title: "Contact us", description: "Get help with an order or your account", icon: Headset },
] as const;

/* ------------------------------------------------------------------
   Small helpers
------------------------------------------------------------------- */

function emptyAddressForm(fullName = "", phone = "", isDefault = false): AddressForm {
  return {
    type: "shipping",
    fullName,
    phone,
    streetLine1: "",
    streetLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: DEFAULT_COUNTRY,
    isDefault,
  };
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FW";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatLongDate(value: string | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function formatShortDate(value: string | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

type OrderRange = "all" | "30d" | "3m" | "year";

function orderRangeOptions(): Array<{ value: OrderRange; label: string }> {
  return [
    { value: "all", label: "All time" },
    { value: "30d", label: "Last 30 days" },
    { value: "3m", label: "Last 3 months" },
    { value: "year", label: String(new Date().getFullYear()) },
  ];
}

function isInOrderRange(placedAt: string, range: OrderRange): boolean {
  if (range === "all") return true;
  const placed = new Date(placedAt);
  if (Number.isNaN(placed.getTime())) return false;
  const now = new Date();
  if (range === "year") return placed.getFullYear() === now.getFullYear();
  const cutoff = new Date(now);
  if (range === "30d") cutoff.setDate(cutoff.getDate() - 30);
  else cutoff.setMonth(cutoff.getMonth() - 3);
  return placed >= cutoff;
}

function buyAgainHref(item: { productId?: string; name: string }): string {
  return item.productId ? `/products/${encodeURIComponent(item.productId)}` : `/products?search=${encodeURIComponent(item.name)}`;
}

type Tone = "success" | "warn" | "brand" | "muted" | "fg";

const TONE_CLASS: Record<Tone, string> = {
  success: "text-success",
  warn: "text-warn",
  brand: "text-brand-ink",
  muted: "text-muted",
  fg: "text-fg",
};

const TRACK_STEPS = ["Ordered", "Confirmed", "Shipped", "Out for delivery", "Delivered"];

/** Map a raw order status to an Amazon-style headline. step = -1 means the order left the normal flow. */
function describeOrderStatus(order: CustomerOrder): { headline: string; detail: string; tone: Tone; step: number } {
  const status = (order.orderStatus || "").toUpperCase();
  switch (status) {
    case "PENDING_PAYMENT":
    case "PENDING":
      return {
        headline: order.paymentMethod === "UPI" ? "Awaiting payment" : "Awaiting confirmation",
        detail:
          order.paymentMethod === "UPI"
            ? "Complete your UPI payment so we can confirm this order."
            : "Our team will call you shortly to confirm your Cash on Delivery order.",
        tone: "warn",
        step: 0,
      };
    case "PAYMENT_REVIEW":
      return {
        headline: "Payment under review",
        detail: "We're verifying your UPI payment. This usually takes a few hours.",
        tone: "warn",
        step: 0,
      };
    case "CONFIRMED":
      return { headline: "Order confirmed", detail: "We're getting your items ready for dispatch.", tone: "fg", step: 1 };
    case "PROCESSING":
    case "PACKED":
      return { headline: "Preparing for dispatch", detail: "Your items are being packed with care.", tone: "fg", step: 1 };
    case "DISPATCHED":
    case "SHIPPED":
      return { headline: "Shipped", detail: "Your package is on the way.", tone: "success", step: 2 };
    case "OUT_FOR_DELIVERY":
      return { headline: "Out for delivery", detail: "Arriving today.", tone: "success", step: 3 };
    case "DELIVERED": {
      const when = formatShortDate(order.updatedAt);
      return {
        headline: when ? `Delivered ${when}` : "Delivered",
        detail: "Your package was delivered.",
        tone: "success",
        step: 4,
      };
    }
    case "CANCELLED":
      return { headline: "Cancelled", detail: "This order was cancelled.", tone: "brand", step: -1 };
    case "RETURN_REQUESTED":
      return { headline: "Return requested", detail: "We've received your return request.", tone: "warn", step: -1 };
    case "RETURNED":
      return { headline: "Returned", detail: "Your return has been received.", tone: "muted", step: -1 };
    case "REFUNDED":
      return { headline: "Refunded", detail: "Your refund has been issued to the original payment method.", tone: "muted", step: -1 };
    default: {
      const label = status
        ? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ")
        : "Order placed";
      return { headline: label, detail: "We'll update you as your order progresses.", tone: "fg", step: 0 };
    }
  }
}

/* ------------------------------------------------------------------
   Presentational building blocks
------------------------------------------------------------------- */

function Notice({ msg, className = "" }: { msg: Msg; className?: string }) {
  if (!msg) return null;
  const isSuccess = msg.type === "success";
  return (
    <div
      role={isSuccess ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm animate-fade-in ${
        isSuccess ? "border-success/30 bg-success-soft text-success" : "border-brand/30 bg-brand-soft text-brand-ink"
      } ${className}`}
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span>{msg.text}</span>
    </div>
  );
}

function SectionHeading({ id, title, description, action }: { id: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 id={id} className="text-xl font-bold text-fg sm:text-2xl">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-fg-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function AccountTile({ href, title, description, icon: Icon }: { href: string; title: string; description: string; icon: React.ElementType }) {
  return (
    <a
      href={href}
      className="card group flex min-h-[96px] items-start gap-4 p-4 transition hover:border-line-strong hover:bg-surface-2 hover:shadow-pop sm:p-5"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink transition group-hover:bg-brand group-hover:text-white">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-bold text-fg">{title}</span>
        <span className="mt-0.5 block text-sm text-fg-2">{description}</span>
      </span>
    </a>
  );
}

function SecurityRow({
  title,
  value,
  editing,
  onEdit,
  editLabel,
  aside,
  children,
}: {
  title: string;
  value: React.ReactNode;
  editing?: boolean;
  onEdit?: () => void;
  editLabel?: string;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-fg">{title}</p>
          <div className="mt-0.5 break-words text-sm text-fg-2">{value}</div>
        </div>
        {onEdit && !editing && (
          <button type="button" onClick={onEdit} className="btn btn-secondary btn-sm min-h-10 w-24 shrink-0" aria-label={editLabel}>
            Edit
          </button>
        )}
        {aside}
      </div>
      {editing && <div className="mt-4 animate-fade-up">{children}</div>}
    </div>
  );
}

function OrderTracker({ step }: { step: number }) {
  return (
    <ol className="mt-4 grid grid-cols-5 gap-1" aria-label="Delivery progress">
      {TRACK_STEPS.map((label, i) => {
        const done = i <= step;
        return (
          <li key={label} className="flex flex-col items-center text-center" aria-current={i === step ? "step" : undefined}>
            <div className="flex w-full items-center">
              <span className={`h-1 flex-1 rounded-full ${i === 0 ? "invisible" : done ? "bg-success" : "bg-surface-3"}`} />
              <span
                className={`mx-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  done ? "border-success bg-success text-white" : "border-line-strong bg-surface"
                }`}
              >
                {done && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
              </span>
              <span
                className={`h-1 flex-1 rounded-full ${i === TRACK_STEPS.length - 1 ? "invisible" : i < step ? "bg-success" : "bg-surface-3"}`}
              />
            </div>
            <span className={`mt-1.5 text-xs leading-tight ${done ? "font-semibold text-fg" : "text-muted"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function OrderCard({ order, highlighted = false }: { order: CustomerOrder; highlighted?: boolean }) {
  const router = useRouter();
  const [showTracking, setShowTracking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const status = describeOrderStatus(order);
  const ship = order.shippingAddress;
  const currency = order.pricing?.currency || "INR";
  const detailsId = `order-details-${order.orderNumber}`;
  const trackingId = `order-tracking-${order.orderNumber}`;

  const openInvoice = async () => {
    setInvoiceBusy(true);
    setInvoiceError(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.orderNumber)}/invoice`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.success && json.data?.invoiceNumber) {
        router.push(`/invoices/${encodeURIComponent(json.data.invoiceNumber)}`);
        return;
      }
      setInvoiceError(
        res.status === 404
          ? "Your invoice will be available once this order is confirmed."
          : json.error?.message || "Invoice isn't available right now."
      );
    } catch {
      setInvoiceError("Network error occurred.");
    } finally {
      setInvoiceBusy(false);
    }
  };

  return (
    <article
      id={`order-${order.orderNumber}`}
      className={`card scroll-mt-36 overflow-hidden animate-fade-up ${highlighted ? "ring-2 ring-brand" : ""}`}
      aria-label={`Order ${order.orderNumber}`}
      aria-current={highlighted ? "true" : undefined}
    >
      {/* Grey header strip */}
      <header className="flex flex-wrap items-start gap-x-8 gap-y-3 border-b border-line bg-surface-2 px-4 py-3 text-xs text-fg-2 sm:px-5">
        <div>
          <p className="font-semibold uppercase tracking-wide text-muted">Order placed</p>
          <p className="mt-0.5 text-sm text-fg-2">{formatLongDate(order.placedAt)}</p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide text-muted">Total</p>
          <p className="mt-0.5 text-sm text-fg-2">{formatPrice(order.pricing?.grandTotal ?? 0, currency)}</p>
        </div>
        {ship && (
          <div className="min-w-0 max-w-[12rem]">
            <p className="font-semibold uppercase tracking-wide text-muted">Ship to</p>
            <p
              className="mt-0.5 truncate text-sm text-brand-ink"
              title={`${ship.fullName}, ${ship.address}, ${ship.city}, ${ship.state} ${ship.pinCode}`}
            >
              {ship.fullName}
            </p>
          </div>
        )}
        <div className="w-full min-w-0 sm:ml-auto sm:w-auto sm:text-right">
          <p className="font-semibold uppercase tracking-wide text-muted">
            Order # <span className="break-all font-mono normal-case tracking-normal text-fg-2">{order.orderNumber}</span>
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm sm:justify-end">
            <button
              type="button"
              className="link py-1"
              aria-expanded={showDetails}
              aria-controls={detailsId}
              onClick={() => setShowDetails((v) => !v)}
            >
              {showDetails ? "Hide order details" : "View order details"}
            </button>
            <span className="text-line-strong" aria-hidden="true">
              |
            </span>
            <button type="button" className="link py-1" onClick={openInvoice} disabled={invoiceBusy}>
              Invoice
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <h3 className={`text-lg font-bold ${TONE_CLASS[status.tone]}`}>{status.headline}</h3>
          <p className="text-sm text-fg-2">{status.detail}</p>

          {showTracking && (
            <div id={trackingId} className="mt-2 animate-fade-in">
              {status.step >= 0 ? (
                <OrderTracker step={status.step} />
              ) : (
                <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-fg-2">
                  Tracking isn&apos;t available for {status.headline.toLowerCase()} orders.
                </p>
              )}
            </div>
          )}

          {invoiceError && <Notice msg={{ type: "error", text: invoiceError }} className="mt-3" />}

          <ul className="mt-4 space-y-4">
            {order.items.map((item, idx) => (
              <li key={`${item.sku}-${idx}`} className="flex gap-3 sm:gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2 sm:h-24 sm:w-24">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image || FALLBACK_PRODUCT_IMAGE}
                    alt={item.name}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  {item.productId ? (
                    <Link href={buyAgainHref(item)} className="link line-clamp-2 text-sm">
                      {item.name}
                    </Link>
                  ) : (
                    <p className="line-clamp-2 text-sm font-medium text-fg">{item.name}</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted">
                    Qty {item.quantity} · {formatPrice(item.unitPrice, currency)} each
                  </p>
                  <Link
                    href={buyAgainHref(item)}
                    className="btn btn-secondary btn-sm mt-2 min-h-10"
                    aria-label={`Buy ${item.name} again`}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Buy it again
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="btn btn-primary min-h-10 w-full"
            aria-expanded={showTracking}
            aria-controls={trackingId}
            onClick={() => setShowTracking((v) => !v)}
          >
            <Truck className="h-4 w-4" aria-hidden="true" />
            {showTracking ? "Hide tracking" : "Track package"}
          </button>
          <button type="button" className="btn btn-secondary min-h-10 w-full" onClick={openInvoice} disabled={invoiceBusy}>
            {invoiceBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
            View invoice
          </button>
        </div>
      </div>

      {/* Expanded order details */}
      {showDetails && (
        <div id={detailsId} className="grid gap-5 border-t border-line bg-surface-2 p-4 text-sm animate-fade-in sm:grid-cols-3 sm:p-5">
          <div>
            <p className="font-bold text-fg">Shipping address</p>
            {ship ? (
              <address className="mt-1 not-italic text-fg-2">
                {ship.fullName}
                <br />
                {ship.address}
                {ship.landmark ? (
                  <>
                    <br />
                    {ship.landmark}
                  </>
                ) : null}
                <br />
                {ship.city}, {ship.state} {ship.pinCode}
                <br />
                Phone: {ship.phone}
              </address>
            ) : (
              <p className="mt-1 text-muted">Not available</p>
            )}
          </div>
          <div>
            <p className="font-bold text-fg">Payment method</p>
            <p className="mt-1 text-fg-2">{({ UPI: "UPI (direct payment)", COD: "Cash on Delivery", CASH: "Cash (paid in store)", CARD: "Card (paid in store)" } as Record<string, string>)[order.paymentMethod] ?? order.paymentMethod}</p>
            <p className="mt-1 text-xs text-muted">
              Payment status: {(order.paymentStatus || "").replace(/_/g, " ").toLowerCase() || "—"}
            </p>
          </div>
          <div>
            <p className="font-bold text-fg">Order summary</p>
            <dl className="mt-1 space-y-1 text-fg-2">
              <div className="flex justify-between gap-4">
                <dt>Item(s) subtotal</dt>
                <dd>{formatPrice(order.pricing?.subtotal ?? 0, currency)}</dd>
              </div>
              {!!order.pricing?.discountTotal && (
                <div className="flex justify-between gap-4">
                  <dt>Discount</dt>
                  <dd className="text-success">-{formatPrice(order.pricing.discountTotal, currency)}</dd>
                </div>
              )}
              {!!order.pricing?.taxTotal && (
                <div className="flex justify-between gap-4">
                  <dt>Tax</dt>
                  <dd>{formatPrice(order.pricing.taxTotal, currency)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt>Shipping</dt>
                <dd>{order.pricing?.shippingFee ? formatPrice(order.pricing.shippingFee, currency) : "FREE"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-1 font-bold text-fg">
                <dt>Grand total</dt>
                <dd>{formatPrice(order.pricing?.grandTotal ?? 0, currency)}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </article>
  );
}

function Field({ id, label, children, className = "" }: { id: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------
   Page
------------------------------------------------------------------- */

export default function ProfilePage() {
  const { user, isLoading, refreshUser } = useAuth();

  // Inline editor currently open in "Login & security"
  const [editingField, setEditingField] = useState<EditableField | null>(null);

  // Profile edit state
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Msg>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<Msg>(null);

  // Addresses state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressMsg, setAddressMsg] = useState<Msg>(null);
  const [addressListMsg, setAddressListMsg] = useState<Msg>(null);

  // New / edited address form state
  const [newAddress, setNewAddress] = useState<AddressForm>(emptyAddressForm());

  // Orders state
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [orderRange, setOrderRange] = useState<OrderRange>("all");
  const [highlightedOrder, setHighlightedOrder] = useState<string | null>(null);

  const userId = user?.id;

  // Profile details are copied from `user` into the edit fields when an inline editor opens
  // (see startEditing), so no sync effect is needed.

  // Load addresses (loadingAddresses starts true, so the initial skeleton shows without a sync setState)
  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch("/api/user/addresses");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setAddresses(json.data.addresses || []);
        }
      }
    } catch {
      // Ignore address load error
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      await fetchAddresses();
    };
    load();
  }, [fetchAddresses]);

  // Client-rendered sections don't exist when the browser first applies the URL hash,
  // so re-apply it once the account content has mounted (e.g. /profile#addresses).
  useEffect(() => {
    if (!userId) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const target = document.getElementById(hash);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [userId]);

  // Load "Your Orders" for the signed-in customer (newest first).
  // loadingOrders starts true, so the first skeleton needs no synchronous setState in the effect.
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.success) {
        setOrders(json.data?.orders || []);
        setOrdersError(null);
      } else {
        setOrdersError(json.error?.message || "We couldn't load your orders.");
      }
    } catch {
      setOrdersError("Network error occurred.");
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      await fetchOrders();
      // /profile?order=FW-... (e.g. from checkout) highlights that order once the list is in.
      const fromQuery = new URLSearchParams(window.location.search).get("order")?.trim().toUpperCase();
      if (fromQuery) setHighlightedOrder(fromQuery);
    };
    load();
  }, [userId, fetchOrders]);

  // Bring a highlighted order into view once it has rendered.
  useEffect(() => {
    if (!highlightedOrder || loadingOrders) return;
    const el = document.getElementById(`order-${highlightedOrder}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlightedOrder, loadingOrders]);

  const retryOrders = () => {
    setLoadingOrders(true);
    setOrdersError(null);
    fetchOrders();
  };

  // Close the address dialog with Escape
  useEffect(() => {
    if (!showAddAddressModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAddAddressModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAddAddressModal]);

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName, phone: profilePhone }),
      });
      const json = await res.json();
      setProfileSaving(false);

      if (res.ok && json.success) {
        setProfileMsg({ type: "success", text: "Your account details have been updated." });
        setEditingField(null);
        await refreshUser();
      } else {
        setProfileMsg({ type: "error", text: json.error?.message || "Failed to update profile." });
      }
    } catch {
      setProfileSaving(false);
      setProfileMsg({ type: "error", text: "Network error occurred." });
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      setPasswordSaving(false);

      if (res.ok && json.success) {
        setPasswordMsg({ type: "success", text: "Your password has been changed." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setEditingField(null);
      } else {
        setPasswordMsg({ type: "error", text: json.error?.message || "Failed to change password." });
      }
    } catch {
      setPasswordSaving(false);
      setPasswordMsg({ type: "error", text: "Network error occurred." });
    }
  };

  // Handle Add Address
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressSaving(true);
    setAddressMsg(null);

    try {
      const res = await fetch("/api/user/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddress),
      });
      const json = await res.json();
      setAddressSaving(false);

      if (res.ok && json.success) {
        setShowAddAddressModal(false);
        setNewAddress(emptyAddressForm(user?.name || "", user?.phone || ""));
        await fetchAddresses();
      } else {
        setAddressMsg({ type: "error", text: json.error?.message || "Failed to add address." });
      }
    } catch {
      setAddressSaving(false);
      setAddressMsg({ type: "error", text: "Network error occurred." });
    }
  };

  // Handle Edit Address (same form, PUT to the existing per-address endpoint)
  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddressId) return;
    setAddressSaving(true);
    setAddressMsg(null);

    // Only send isDefault when promoting; unticking must not leave the account without a default.
    const { isDefault, ...fields } = newAddress;
    try {
      const res = await fetch(`/api/user/addresses/${editingAddressId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isDefault ? { ...fields, isDefault: true } : fields),
      });
      const json = await res.json();
      setAddressSaving(false);

      if (res.ok && json.success) {
        setShowAddAddressModal(false);
        setEditingAddressId(null);
        await fetchAddresses();
      } else {
        setAddressMsg({ type: "error", text: json.error?.message || "Failed to update address." });
      }
    } catch {
      setAddressSaving(false);
      setAddressMsg({ type: "error", text: "Network error occurred." });
    }
  };

  // Delete Address
  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    setAddressListMsg(null);

    try {
      const res = await fetch(`/api/user/addresses/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchAddresses();
      } else {
        setAddressListMsg({ type: "error", text: "Couldn't remove that address. Please try again." });
      }
    } catch {
      setAddressListMsg({ type: "error", text: "Network error occurred." });
    }
  };

  // Set Default Address
  const handleSetDefaultAddress = async (id: string) => {
    setAddressListMsg(null);
    try {
      const res = await fetch(`/api/user/addresses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        await fetchAddresses();
      } else {
        setAddressListMsg({ type: "error", text: "Couldn't update your default address. Please try again." });
      }
    } catch {
      setAddressListMsg({ type: "error", text: "Network error occurred." });
    }
  };

  // Inline editor controls
  const startEditing = (field: EditableField) => {
    setProfileMsg(null);
    setPasswordMsg(null);
    setProfileName(user?.name || "");
    setProfilePhone(user?.phone || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setEditingField(field);
  };

  const cancelEditing = () => {
    setProfileName(user?.name || "");
    setProfilePhone(user?.phone || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMsg(null);
    setProfileMsg(null);
    setEditingField(null);
  };

  const openAddAddress = () => {
    setAddressMsg(null);
    setEditingAddressId(null);
    setNewAddress(emptyAddressForm(user?.name || "", user?.phone || "", addresses.length === 0));
    setShowAddAddressModal(true);
  };

  const openEditAddress = (addr: Address) => {
    setAddressMsg(null);
    setEditingAddressId(addr._id);
    setNewAddress({
      type: addr.type,
      fullName: addr.fullName,
      phone: addr.phone,
      streetLine1: addr.streetLine1,
      streetLine2: addr.streetLine2 || "",
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country || DEFAULT_COUNTRY,
      isDefault: addr.isDefault,
    });
    setShowAddAddressModal(true);
  };

  const closeAddressModal = () => {
    setShowAddAddressModal(false);
    setEditingAddressId(null);
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-[1200px] px-3 py-16 sm:px-4 lg:px-6">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading your account...
          </div>
        ) : (
          <div className="card mx-auto max-w-md p-6 text-center">
            <h1 className="text-xl font-bold text-fg">Sign in to view your account</h1>
            <p className="mt-1 text-sm text-fg-2">Track orders, manage addresses and update your details.</p>
            <Link href="/auth/login?redirect=/profile" className="btn btn-primary mt-4 min-h-10">
              Sign in
            </Link>
          </div>
        )}
      </div>
    );
  }

  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const isEditingAddress = editingAddressId !== null;
  const visibleOrders = orders.filter((o) => isInOrderRange(o.placedAt, orderRange));

  return (
    <div className="mx-auto max-w-[1200px] space-y-10 px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      {/* Title + greeting */}
      <div className="flex flex-col gap-4 animate-fade-in sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-base font-bold text-white sm:h-14 sm:w-14 sm:text-lg"
            aria-hidden="true"
          >
            {initialsOf(user.name)}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-fg sm:text-3xl">Your Account</h1>
            <p className="text-sm text-fg-2">
              Hello, <span className="font-semibold text-fg">{firstName}</span>. Manage your orders, addresses and sign-in
              details.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="break-all">{user.email}</span>
          {user.role !== "CUSTOMER" && <span className="chip chip-neutral">{user.role === "ADMIN" ? "Admin" : user.role === "DEVELOPER" ? "Developer" : "Staff"}</span>}
        </div>
      </div>

      {/* Tiles */}
      <nav aria-label="Account sections" className="-mt-4">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {ACCOUNT_SECTIONS.map((s) => (
            <li key={s.id}>
              <AccountTile href={`#${s.id}`} title={s.title} description={s.description} icon={s.icon} />
            </li>
          ))}
        </ul>
      </nav>

      {/* ---------------- Your Orders ---------------- */}
      <section id="orders" aria-labelledby="orders-heading" className="scroll-mt-36">
        <SectionHeading
          id="orders-heading"
          title="Your Orders"
          description="Track packages, download invoices and reorder your favourites."
        />

        {!loadingOrders && !ordersError && orders.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-fg-2">
            <span>
              <span className="font-bold text-fg">
                {visibleOrders.length} {visibleOrders.length === 1 ? "order" : "orders"}
              </span>{" "}
              placed in
            </span>
            <label htmlFor="order-range" className="sr-only">
              Show orders placed in
            </label>
            <select
              id="order-range"
              value={orderRange}
              onChange={(e) => setOrderRange(e.target.value as OrderRange)}
              className="input min-h-10 w-auto py-1.5 pr-8"
            >
              {orderRangeOptions().map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-4" aria-busy={loadingOrders}>
          {loadingOrders ? (
            <>
              <div className="card h-48 animate-pulse bg-surface-2" />
              <div className="card h-48 animate-pulse bg-surface-2" />
            </>
          ) : ordersError ? (
            <div className="flex flex-col gap-3 rounded-xl border border-brand/30 bg-brand-soft p-4 text-brand-ink sm:flex-row sm:items-center sm:justify-between" role="alert">
              <p className="flex items-start gap-2 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{ordersError}</span>
              </p>
              <button type="button" onClick={retryOrders} className="btn btn-secondary min-h-10 shrink-0">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Try again
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="card flex flex-col items-center px-4 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
                <ShoppingBag className="h-7 w-7" aria-hidden="true" />
              </span>
              <p className="mt-3 text-lg font-bold text-fg">You haven&apos;t placed any orders yet</p>
              <p className="mt-1 max-w-md text-sm text-fg-2">
                When you do, you&apos;ll be able to track them, view invoices and buy again from here.
              </p>
              <Link href="/products" className="btn btn-primary mt-4 min-h-10">
                Start shopping
              </Link>
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="card px-4 py-8 text-center">
              <p className="text-base font-bold text-fg">No orders in this period</p>
              <button type="button" onClick={() => setOrderRange("all")} className="link mt-1 min-h-10 text-sm">
                Show all orders
              </button>
            </div>
          ) : (
            visibleOrders.map((order) => (
              <OrderCard key={order.orderNumber} order={order} highlighted={order.orderNumber === highlightedOrder} />
            ))
          )}
        </div>
      </section>

      {/* ---------------- Login & security ---------------- */}
      <section id="security" aria-labelledby="security-heading" className="scroll-mt-36">
        <SectionHeading id="security-heading" title="Login & security" description="Keep your sign-in details up to date." />

        <div className="card max-w-3xl">
          <div aria-live="polite">
            {(profileMsg || passwordMsg) && (
              <div className="space-y-2 px-4 pt-4 sm:px-5">
                <Notice msg={profileMsg} />
                <Notice msg={passwordMsg} />
              </div>
            )}
          </div>

          <div className="divide-y divide-line">
            {/* Name */}
            <SecurityRow
              title="Name"
              value={user.name}
              editing={editingField === "name"}
              onEdit={() => startEditing("name")}
              editLabel="Edit name"
            >
              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <Field id="profile-name" label="New name">
                  <input
                    id="profile-name"
                    type="text"
                    required
                    autoComplete="name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="input max-w-md"
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={profileSaving} className="btn btn-primary min-h-10">
                    {profileSaving ? "Saving..." : "Save changes"}
                  </button>
                  <button type="button" onClick={cancelEditing} className="btn btn-ghost min-h-10">
                    Cancel
                  </button>
                </div>
              </form>
            </SecurityRow>

            {/* Email */}
            <SecurityRow
              title="Email"
              value={user.email}
              aside={<span className="shrink-0 pt-0.5 text-right text-xs text-muted">Contact us to change</span>}
            />

            {/* Phone */}
            <SecurityRow
              title="Mobile number"
              value={user.phone || <span className="text-muted">Not added</span>}
              editing={editingField === "phone"}
              onEdit={() => startEditing("phone")}
              editLabel="Edit mobile number"
            >
              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <Field id="profile-phone" label="Mobile number">
                  <input
                    id="profile-phone"
                    type="tel"
                    autoComplete="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="input max-w-md"
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={profileSaving} className="btn btn-primary min-h-10">
                    {profileSaving ? "Saving..." : "Save changes"}
                  </button>
                  <button type="button" onClick={cancelEditing} className="btn btn-ghost min-h-10">
                    Cancel
                  </button>
                </div>
              </form>
            </SecurityRow>

            {/* Password */}
            <SecurityRow
              title="Password"
              value={<span aria-label="Password hidden">••••••••</span>}
              editing={editingField === "password"}
              onEdit={() => startEditing("password")}
              editLabel="Change password"
            >
              <form onSubmit={handleChangePassword} className="max-w-md space-y-3">
                <Field id="current-password" label="Current password">
                  <input
                    id="current-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input"
                  />
                </Field>
                <Field id="new-password" label="New password">
                  <input
                    id="new-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    aria-describedby="new-password-hint"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input"
                  />
                  <p id="new-password-hint" className="mt-1 text-xs text-muted">
                    At least 6 characters.
                  </p>
                </Field>
                <Field id="confirm-password" label="Re-enter new password">
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={passwordSaving} className="btn btn-primary min-h-10">
                    {passwordSaving ? "Updating..." : "Save changes"}
                  </button>
                  <button type="button" onClick={cancelEditing} className="btn btn-ghost min-h-10">
                    Cancel
                  </button>
                </div>
              </form>
            </SecurityRow>
          </div>
        </div>
      </section>

      {/* ---------------- Your Addresses ---------------- */}
      <section id="addresses" aria-labelledby="addresses-heading" className="scroll-mt-36">
        <SectionHeading
          id="addresses-heading"
          title="Your Addresses"
          description="Your default address is pre-selected at checkout."
        />

        <div aria-live="polite">
          <Notice msg={addressListMsg} className="mb-4" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            onClick={openAddAddress}
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-surface p-6 text-fg-2 transition hover:border-brand hover:bg-brand-soft hover:text-brand-ink"
          >
            <Plus className="h-10 w-10" aria-hidden="true" />
            <span className="text-lg font-bold">Add address</span>
          </button>

          {loadingAddresses && addresses.length === 0
            ? [0, 1].map((i) => <div key={i} className="card min-h-[220px] animate-pulse bg-surface-2" />)
            : addresses.map((addr) => (
                <div key={addr._id} className="card flex min-h-[220px] flex-col overflow-hidden animate-fade-up">
                  <div className="flex items-center gap-2 border-b border-line px-4 py-2">
                    {addr.isDefault ? (
                      <span className="chip chip-brand">Default</span>
                    ) : (
                      <span className="text-xs text-muted">Saved address</span>
                    )}
                    <span className="chip chip-neutral ml-auto capitalize">
                      {addr.type === "both" ? "Shipping & billing" : addr.type}
                    </span>
                  </div>

                  <div className="flex-1 space-y-0.5 px-4 py-3 text-sm text-fg-2">
                    <p className="font-bold text-fg">{addr.fullName}</p>
                    <p className="break-words">{addr.streetLine1}</p>
                    {addr.streetLine2 && <p className="break-words">{addr.streetLine2}</p>}
                    <p>
                      {addr.city}, {addr.state} {addr.postalCode}
                    </p>
                    <p>{addr.country}</p>
                    <p className="pt-1">Phone number: {addr.phone}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 px-4 pb-2 text-sm">
                    <button
                      type="button"
                      className="link min-h-10"
                      onClick={() => openEditAddress(addr)}
                      aria-label={`Edit address for ${addr.fullName}`}
                    >
                      Edit
                    </button>
                    <span className="text-line-strong" aria-hidden="true">
                      |
                    </span>
                    <button
                      type="button"
                      className="link min-h-10"
                      onClick={() => handleDeleteAddress(addr._id)}
                      aria-label={`Remove address for ${addr.fullName}`}
                    >
                      Remove
                    </button>
                    {!addr.isDefault && (
                      <>
                        <span className="text-line-strong" aria-hidden="true">
                          |
                        </span>
                        <button type="button" className="link min-h-10" onClick={() => handleSetDefaultAddress(addr._id)}>
                          Set as default
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
        </div>
      </section>

      {/* ---------------- Payment options ---------------- */}
      <section id="payments" aria-labelledby="payments-heading" className="scroll-mt-36">
        <SectionHeading
          id="payments-heading"
          title="Payment options"
          description="Choose how to pay each time you check out. No card details are stored on your account."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="card flex items-start gap-4 p-4 sm:p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-fg">
              <Smartphone className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="flex flex-wrap items-center gap-2 text-base font-bold text-fg">
                UPI <span className="chip chip-soft">Recommended</span>
              </p>
              <p className="mt-0.5 text-sm text-fg-2">
                Scan the QR code at checkout with any UPI app — Google Pay, PhonePe, Paytm or your bank app — then
                share the transaction reference.
              </p>
            </div>
          </div>
          <div className="card flex items-start gap-4 p-4 sm:p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-fg">
              <Banknote className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-base font-bold text-fg">Cash on Delivery</p>
              <p className="mt-0.5 text-sm text-fg-2">
                Available on orders up to <span className="font-semibold text-fg">{formatPrice(15000)}</span>. We&apos;ll
                call to confirm before dispatch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Contact us ---------------- */}
      <section id="help" aria-labelledby="help-heading" className="scroll-mt-36">
        <SectionHeading id="help-heading" title="Contact us" description="We're here to help with orders, payments and your account." />
        <div className="card grid grid-cols-1 divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="p-4 sm:p-5">
            <p className="flex items-center gap-2 text-base font-bold text-fg">
              <Mail className="h-5 w-5 text-brand-ink" aria-hidden="true" /> Email support
            </p>
            <p className="mt-1 text-sm text-fg-2">Include your order number so we can help faster.</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="link mt-2 inline-flex min-h-10 items-center break-all text-sm">
              {SUPPORT_EMAIL}
            </a>
          </div>
          <div className="p-4 sm:p-5">
            <p className="flex items-center gap-2 text-base font-bold text-fg">
              <Package className="h-5 w-5 text-brand-ink" aria-hidden="true" /> Where&apos;s my order?
            </p>
            <p className="mt-1 text-sm text-fg-2">See where your order is and download its invoice.</p>
            <a href="#orders" className="link mt-2 inline-flex min-h-10 items-center text-sm">
              Track an order
            </a>
          </div>
          <div className="p-4 sm:p-5">
            <p className="flex items-center gap-2 text-base font-bold text-fg">
              <MapPin className="h-5 w-5 text-brand-ink" aria-hidden="true" /> Delivery details
            </p>
            <p className="mt-1 text-sm text-fg-2">Moved recently? Update your default address before your next order.</p>
            <a href="#addresses" className="link mt-2 inline-flex min-h-10 items-center text-sm">
              Manage addresses
            </a>
          </div>
        </div>
      </section>

      {/* ---------------- Add / edit address dialog ---------------- */}
      {showAddAddressModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-fade-in sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAddressModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="address-dialog-title"
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-pop animate-pop-in sm:rounded-xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface-2 px-4 py-3 sm:px-5">
              <h3 id="address-dialog-title" className="text-lg font-bold text-fg">
                {isEditingAddress ? "Edit your address" : "Add a new address"}
              </h3>
              <button
                type="button"
                onClick={closeAddressModal}
                className="btn btn-ghost h-10 w-10 !p-0"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={isEditingAddress ? handleUpdateAddress : handleAddAddress} className="space-y-4 p-4 sm:p-5">
              <Notice msg={addressMsg} />

              <Field id="addr-type" label="Address type">
                <select
                  id="addr-type"
                  value={newAddress.type}
                  onChange={(e) => setNewAddress({ ...newAddress, type: e.target.value as "shipping" | "billing" | "both" })}
                  className="input"
                >
                  <option value="shipping">Shipping address</option>
                  <option value="billing">Billing address</option>
                  <option value="both">Both (shipping &amp; billing)</option>
                </select>
              </Field>

              <Field id="addr-name" label="Full name (first and last name)">
                <input
                  id="addr-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={newAddress.fullName}
                  onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                  className="input"
                />
              </Field>

              <Field id="addr-phone" label="Mobile number">
                <input
                  id="addr-phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                  className="input"
                />
              </Field>

              <Field id="addr-line1" label="Flat, house no., building, street">
                <input
                  id="addr-line1"
                  type="text"
                  required
                  autoComplete="address-line1"
                  value={newAddress.streetLine1}
                  onChange={(e) => setNewAddress({ ...newAddress, streetLine1: e.target.value })}
                  className="input"
                />
              </Field>

              <Field id="addr-line2" label="Area, landmark (optional)">
                <input
                  id="addr-line2"
                  type="text"
                  autoComplete="address-line2"
                  value={newAddress.streetLine2}
                  onChange={(e) => setNewAddress({ ...newAddress, streetLine2: e.target.value })}
                  className="input"
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="addr-city" label="Town / city">
                  <input
                    id="addr-city"
                    type="text"
                    required
                    autoComplete="address-level2"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field id="addr-state" label="State">
                  <input
                    id="addr-state"
                    type="text"
                    required
                    autoComplete="address-level1"
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="addr-postal" label="PIN code">
                  <input
                    id="addr-postal"
                    type="text"
                    required
                    inputMode="numeric"
                    autoComplete="postal-code"
                    value={newAddress.postalCode}
                    onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field id="addr-country" label="Country">
                  <input
                    id="addr-country"
                    type="text"
                    required
                    autoComplete="country-name"
                    value={newAddress.country}
                    onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>

              {!(isEditingAddress && addresses.find((a) => a._id === editingAddressId)?.isDefault) && (
                <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-fg">
                  <input
                    type="checkbox"
                    checked={newAddress.isDefault}
                    onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                    className="h-4 w-4 accent-[var(--brand)]"
                  />
                  Make this my default address
                </label>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeAddressModal} className="btn btn-secondary min-h-10">
                  Cancel
                </button>
                <button type="submit" disabled={addressSaving} className="btn btn-primary min-h-10">
                  {addressSaving ? "Saving..." : isEditingAddress ? "Save changes" : "Add address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
