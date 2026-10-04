"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  MapPin,
  Truck,
  CreditCard,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  User,
  Building,
  Navigation,
  Check,
  Clock,
  Copy,
  ExternalLink,
  QrCode,
  RefreshCw,
  XCircle,
  Lock,
  Smartphone,
  Banknote,
  PackageCheck,
  type LucideIcon,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/format";
import { Price } from "@/components/ui/Price";
import { deliveryDate } from "@/lib/product-view";

interface IPlacedOrder {
  orderNumber: string;
  orderId: string;
  pricing: {
    subtotal: number;
    shippingFee: number;
    discountTotal?: number;
    grandTotal: number;
    currency: string;
  };
  paymentMethod: "UPI" | "COD";
  paymentStatus: string;
  orderStatus: string;
  paymentDetails?: {
    merchantUpiId?: string;
    merchantName?: string;
    customerUpiId?: string;
    transactionRef?: string;
    upiApp?: string;
    qrPayload?: string;
    qrDataUrl?: string;
    submittedAt?: string;
    verifiedAt?: string;
    verificationNotes?: string;
    rejectionReason?: string;
  };
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    landmark?: string;
    city: string;
    state: string;
    pinCode: string;
  };
  items: Array<{
    name: string;
    sku: string;
    image: string;
    unitPrice: number;
    quantity: number;
    total: number;
  }>;
  estimatedDelivery: string;
  complianceVerified: boolean;
}

/** Shape of a saved address returned by GET /api/user/addresses */
interface ISavedAddress {
  _id: string;
  fullName?: string;
  phone?: string;
  streetLine1?: string;
  streetLine2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  isDefault?: boolean;
}

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
];

const UPI_APPS = ["Google Pay", "PhonePe", "Paytm", "BHIM UPI", "Cred", "Other UPI App"];

const NEW_ADDRESS = "new";

type StepStatus = "active" | "done" | "locked";
type Tone = "error" | "warn" | "success";

/* ------------------------------------------------------------------
   Small presentational helpers (local to checkout)
------------------------------------------------------------------- */

const TONE_CLASSES: Record<Tone, { box: string; icon: string; title: string }> = {
  error: { box: "border-brand/30 bg-brand-soft", icon: "text-brand", title: "text-brand-ink" },
  warn: { box: "border-warn/30 bg-warn-soft", icon: "text-warn", title: "text-warn" },
  success: { box: "border-success/30 bg-success-soft", icon: "text-success", title: "text-success" },
};

function Notice({
  tone,
  icon: Icon,
  title,
  children,
  className = "",
}: {
  tone: Tone;
  icon: LucideIcon;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const t = TONE_CLASSES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`flex items-start gap-3 rounded-lg border p-3 text-sm animate-fade-in ${t.box} ${className}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${t.icon}`} aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className={`font-bold ${t.title}`}>{title}</p>}
        {children && <div className="text-fg-2 leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

function StepCard({
  n,
  title,
  status,
  summary,
  onChange,
  sectionRef,
  children,
}: {
  n: number;
  title: string;
  status: StepStatus;
  summary?: React.ReactNode;
  onChange?: () => void;
  sectionRef?: (el: HTMLElement | null) => void;
  children?: React.ReactNode;
}) {
  const titleId = `checkout-step-${n}-title`;
  return (
    <section
      ref={sectionRef}
      aria-labelledby={titleId}
      aria-current={status === "active" ? "step" : undefined}
      className={`card scroll-mt-32 overflow-hidden ${status === "active" ? "border-line-strong" : ""}`}
    >
      <div className="flex items-start gap-3 p-4 sm:px-5">
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            status === "active"
              ? "bg-brand text-white"
              : status === "done"
                ? "bg-success-soft text-success"
                : "bg-surface-3 text-muted"
          }`}
          aria-hidden="true"
        >
          {status === "done" ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id={titleId}
            className={`text-lg font-bold leading-7 ${
              status === "active" ? "text-brand-ink" : status === "locked" ? "text-muted" : "text-fg"
            }`}
          >
            {title}
          </h2>
          {status === "done" && summary && <div className="mt-1 text-sm text-fg-2">{summary}</div>}
        </div>
        {status === "done" && onChange && (
          <button
            type="button"
            onClick={onChange}
            className="link -my-1 min-h-10 shrink-0 rounded-md px-2 text-sm"
            aria-label={`Change ${title.toLowerCase()}`}
          >
            Change
          </button>
        )}
      </div>
      {status === "active" && (
        <div className="border-t border-line px-4 pb-5 pt-4 sm:px-5 animate-fade-in">{children}</div>
      )}
    </section>
  );
}

function RadioCard({
  name,
  value,
  checked,
  onChange,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors sm:p-4 ${
        checked
          ? "border-brand bg-brand-soft ring-1 ring-brand"
          : "border-line bg-surface hover:border-line-strong hover:bg-surface-2"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand"
      />
      <div className="min-w-0 flex-1 text-sm text-fg-2">{children}</div>
    </label>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  className = "",
  children,
}: {
  id: string;
  label: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
        )}
        {children}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, className = "" }: { label: React.ReactNode; value: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${className}`}>
      <dt>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
}

function humanizeStatus(status: string): string {
  const s = (status || "").replace(/_/g, " ").toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
}

const CONTAINER = "mx-auto max-w-[1200px] px-3 sm:px-4 lg:px-6 py-4 sm:py-6";

export default function CheckoutPage() {
  const { items, summary, clearCart } = useCart();
  const { user } = useAuth();

  // Address form fields
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [pinCode, setPinCode] = useState("");
  const [landmark, setLandmark] = useState("");

  // Saved addresses (logged-in customers) — selecting one fills the address fields
  const [savedAddresses, setSavedAddresses] = useState<ISavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(NEW_ADDRESS);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "COD">("UPI");
  const [upiId, setUpiId] = useState("");

  // 18+ Compliance Confirmation
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<IPlacedOrder | null>(null);

  // UPI reference submission & polling state
  const [inputUtr, setInputUtr] = useState("");
  const [selectedUpiApp, setSelectedUpiApp] = useState("Google Pay");
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrError, setUtrError] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState(false);
  const [copiedVpa, setCopiedVpa] = useState(false);

  // Checkout step UI (1 = address, 2 = payment, 3 = review & place order)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [paymentDone, setPaymentDone] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const stepRefs = useRef<Record<number, HTMLElement | null>>({});
  const didMountRef = useRef(false);

  // Auto-fill logged in user contact info (once per signed-in user).
  // Done during render rather than in an effect, per React's "adjusting state when a prop changes" pattern.
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  if (user && prefilledFor !== user.id) {
    setPrefilledFor(user.id);
    if (!fullName) setFullName(user.name || "");
    if (!email) setEmail(user.email || "");
    if (user.phone && !mobileNumber) setMobileNumber(user.phone);
  }

  const applySavedAddress = (a: ISavedAddress) => {
    setAddress(a.streetLine1 || "");
    setCity(a.city || "");
    setState(a.state || "Maharashtra");
    setPinCode(a.postalCode || "");
    setLandmark(a.landmark || a.streetLine2 || "");
  };

  // Load the customer's saved addresses and pre-select the default one
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;

    async function loadSavedAddress() {
      try {
        const res = await fetch("/api/user/addresses");
        const data = await res.json();
        if (data.success && data.data?.addresses?.length > 0) {
          const list: ISavedAddress[] = data.data.addresses;
          const def = list.find((a) => a.isDefault) || list[0];
          setSavedAddresses(list);
          if (def) {
            setSelectedAddressId(def._id);
            setAddress(def.streetLine1 || "");
            setCity(def.city || "");
            setState(def.state || "Maharashtra");
            setPinCode(def.postalCode || "");
            setLandmark(def.landmark || def.streetLine2 || "");
          }
        }
      } catch {
        // Ignore
      }
    }
    loadSavedAddress();
  }, [userId]);

  // Bring the newly opened step into view (skip the very first render)
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    stepRefs.current[step]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  // Handle Checkout submission
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (summary.hasRestrictedItems && !ageConfirmed) {
      setError("You must verify that you are at least 18 years old to purchase restricted items.");
      return;
    }

    if (paymentMethod === "UPI" && (!upiId || !upiId.includes("@"))) {
      setError("Please provide a valid UPI ID (e.g. user@bank or mobile@upi).");
      return;
    }

    if (paymentMethod === "COD" && summary.subtotal + 100 > 15000) {
      setError("Cash on Delivery is limited to orders up to ₹15,000. Please select Direct UPI payment.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        customer: {
          fullName: fullName.trim(),
          mobileNumber: mobileNumber.trim(),
          email: email.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          pinCode: pinCode.trim(),
          landmark: landmark.trim() || undefined,
        },
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
        })),
        paymentMethod,
        upiId: paymentMethod === "UPI" ? upiId.trim() : undefined,
        ageConfirmed,
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success && data.data) {
        setPlacedOrder(data.data);
        clearCart();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(data.message || data.error?.message || "Checkout failed. Please check your information.");
      }
    } catch (err) {
      setError((err instanceof Error && err.message) || "Network error occurred during checkout.");
    } finally {
      setSubmitting(false);
    }
  };

  // Step-aware form submit: steps 1 and 2 advance the checkout; step 3 places the order.
  const codUnavailable = summary.subtotal + 100 > 15000;
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (step === 1) {
      e.preventDefault();
      setStepError(null);
      setStep(paymentDone ? 3 : 2);
      return;
    }
    if (step === 2) {
      e.preventDefault();
      if (paymentMethod === "UPI" && (!upiId || !upiId.includes("@"))) {
        setStepError("Please enter a valid UPI ID, for example name@okhdfcbank or 9876543210@paytm.");
        return;
      }
      if (paymentMethod === "COD" && codUnavailable) {
        setStepError("Cash on Delivery is available for orders up to ₹15,000. Please pay by UPI instead.");
        return;
      }
      setStepError(null);
      setPaymentDone(true);
      setStep(3);
      return;
    }
    void handlePlaceOrder(e);
  };

  // Submit UTR Reference ID (moves payment to UNDER_REVIEW)
  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placedOrder) return;
    setUtrError(null);

    const ref = inputUtr.trim();
    if (!ref || ref.length < 6) {
      setUtrError("Please enter a valid 12-digit UTR or transaction reference number (minimum 6 digits).");
      return;
    }

    setSubmittingUtr(true);
    try {
      const res = await fetch(`/api/orders/${placedOrder.orderNumber}/payment-reference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionRef: ref,
          upiApp: selectedUpiApp,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPlacedOrder((prev) =>
          prev
            ? {
                ...prev,
                paymentStatus: data.data.paymentStatus,
                orderStatus: data.data.orderStatus,
                paymentDetails: {
                  ...prev.paymentDetails,
                  transactionRef: data.data.transactionRef,
                  submittedAt: data.data.submittedAt,
                  upiApp: selectedUpiApp,
                },
              }
            : null
        );
      } else {
        setUtrError(data.error?.message || data.message || "Failed to submit reference ID.");
      }
    } catch (err) {
      setUtrError((err instanceof Error && err.message) || "Network error submitting reference ID.");
    } finally {
      setSubmittingUtr(false);
    }
  };

  // Poll / Refresh live order status
  const handleCheckStatus = async () => {
    if (!placedOrder) return;
    setPollingStatus(true);
    try {
      const res = await fetch(`/api/orders/${placedOrder.orderNumber}`);
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setPlacedOrder((prev) => ({
          ...prev!,
          paymentStatus: data.data.paymentStatus,
          orderStatus: data.data.orderStatus,
          paymentDetails: data.data.paymentDetails,
        }));
      }
    } catch {
      // Ignore
    } finally {
      setPollingStatus(false);
    }
  };

  const copyMerchantVpa = async (vpa: string) => {
    try {
      await navigator.clipboard.writeText(vpa);
      setCopiedVpa(true);
      setTimeout(() => setCopiedVpa(false), 2500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — the UPI ID is still visible to copy manually
    }
  };

  /* ==================================================================
     Post-order views
  =================================================================== */
  if (placedOrder) {
    const isUpi = placedOrder.paymentMethod === "UPI";
    const paymentStatusNormalized = (placedOrder.paymentStatus || "").toUpperCase();
    const isPaid = paymentStatusNormalized === "PAID";
    const isUnderReview = paymentStatusNormalized === "UNDER_REVIEW";
    const isFailed = paymentStatusNormalized === "FAILED";
    const discountTotal = placedOrder.pricing.discountTotal || 0;

    // 1. UPI Payment screen (PENDING or UNDER_REVIEW or FAILED)
    if (isUpi && !isPaid) {
      const merchantVpa = placedOrder.paymentDetails?.merchantUpiId || "figuresworld@icici";
      const qrDataUrl = placedOrder.paymentDetails?.qrDataUrl;
      const qrPayload = placedOrder.paymentDetails?.qrPayload;

      return (
        <div className={CONTAINER}>
          <div className="mx-auto max-w-3xl space-y-4 animate-fade-in sm:space-y-5">
            {/* Header */}
            <div className="space-y-1">
              <span className="chip chip-soft">
                <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                Order placed · payment pending
              </span>
              <h1 className="text-2xl font-bold text-fg sm:text-3xl">Complete your UPI payment</h1>
              <p className="text-sm text-fg-2">
                Order number <strong className="font-mono text-fg">{placedOrder.orderNumber}</strong>
              </p>
            </div>

            {/* Under review notice */}
            {isUnderReview && (
              <div className="card border-warn/30 bg-warn-soft p-4 sm:p-5 animate-fade-in" aria-live="polite">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn text-white">
                    <Clock className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-lg font-bold text-fg">We&apos;re verifying your payment</p>
                    <p className="text-sm leading-relaxed text-fg-2">
                      We received your UPI reference{" "}
                      <strong className="font-mono text-fg">{placedOrder.paymentDetails?.transactionRef}</strong>. Our
                      team is matching it with our bank records, and your order will be confirmed as soon as the
                      payment is verified.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:pl-[52px]">
                  <button
                    type="button"
                    onClick={handleCheckStatus}
                    disabled={pollingStatus}
                    className="btn btn-secondary min-h-10"
                  >
                    <RefreshCw className={`h-4 w-4 ${pollingStatus ? "animate-spin" : ""}`} aria-hidden="true" />
                    {pollingStatus ? "Checking…" : "Check verification status"}
                  </button>
                  <Link href="/products" className="btn btn-ghost min-h-10">
                    Continue shopping
                  </Link>
                </div>
              </div>
            )}

            {/* Failed notice */}
            {isFailed && (
              <Notice tone="error" icon={XCircle} title="We couldn't verify your payment">
                <p>
                  {placedOrder.paymentDetails?.rejectionReason ||
                    "The submitted reference ID could not be matched with bank deposit records."}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Please check the UTR number on your payment app receipt and submit it again below.
                </p>
              </Notice>
            )}

            {/* Payment card */}
            <div className="card divide-y divide-line">
              {/* Amount + merchant UPI ID */}
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <p className="text-sm font-semibold text-fg-2">Amount to pay</p>
                  <p className="mt-1 text-3xl font-bold text-brand-ink tabular-nums">
                    {formatPrice(placedOrder.pricing.grandTotal)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Items {formatPrice(placedOrder.pricing.subtotal)}
                    {discountTotal > 0 && <> − discount {formatPrice(discountTotal)}</>} + delivery{" "}
                    {formatPrice(placedOrder.pricing.shippingFee)}
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-surface-2 p-3">
                  <p className="text-xs font-semibold text-muted">Pay to Figure World UPI ID</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="break-all font-mono text-sm font-bold text-fg">{merchantVpa}</span>
                    <button
                      type="button"
                      onClick={() => copyMerchantVpa(merchantVpa)}
                      className="btn btn-ghost btn-sm h-10 w-10 shrink-0 p-0"
                      aria-label={copiedVpa ? "UPI ID copied" : "Copy UPI ID"}
                      title="Copy UPI ID"
                    >
                      {copiedVpa ? (
                        <Check className="h-4 w-4 text-success" aria-hidden="true" />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  <span className="sr-only" aria-live="polite">
                    {copiedVpa ? "UPI ID copied to clipboard" : ""}
                  </span>
                </div>
              </div>

              {/* QR code */}
              <div className="flex flex-col items-center gap-3 p-4 text-center sm:p-5">
                {/* QR codes need a light background to scan reliably, so this panel stays white in dark mode */}
                <div className="rounded-xl border border-line bg-white p-3 shadow-card">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt={`UPI QR code to pay ${formatPrice(placedOrder.pricing.grandTotal)} to ${merchantVpa}`}
                      className="mx-auto h-48 w-48 object-contain sm:h-56 sm:w-56"
                    />
                  ) : (
                    <div className="flex h-48 w-48 items-center justify-center rounded-lg bg-surface-3">
                      <QrCode className="h-16 w-16 text-muted" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium text-muted">Scan with Google Pay, PhonePe, Paytm or BHIM</p>

                {qrPayload && (
                  <a href={qrPayload} className="btn btn-primary min-h-10 w-full sm:w-auto">
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Open in UPI app
                  </a>
                )}
              </div>

              {/* How-to */}
              <div className="p-4 sm:p-5">
                <p className="text-sm font-bold text-fg">How to complete your payment</p>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-fg-2 marker:font-semibold marker:text-muted">
                  <li>
                    Scan the QR code or send {formatPrice(placedOrder.pricing.grandTotal)} to{" "}
                    <strong className="font-mono text-fg">{merchantVpa}</strong>.
                  </li>
                  <li>
                    Find the <strong className="text-fg">12-digit UTR</strong> or{" "}
                    <strong className="text-fg">UPI reference number</strong> on your payment receipt.
                  </li>
                  <li>
                    Enter it below and select <strong className="text-fg">Submit for verification</strong>.
                  </li>
                </ol>
              </div>

              {/* Reference ID submission */}
              {(!isUnderReview || isFailed) && (
                <form onSubmit={handleSubmitUtr} className="space-y-4 p-4 sm:p-5">
                  <h2 className="text-lg font-bold text-fg">Submit your payment reference</h2>

                  {utrError && (
                    <Notice tone="error" icon={AlertTriangle}>
                      <span className="font-medium text-brand-ink">{utrError}</span>
                    </Notice>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field id="utr-app" label="UPI app used">
                      <select
                        id="utr-app"
                        value={selectedUpiApp}
                        onChange={(e) => setSelectedUpiApp(e.target.value)}
                        className="input min-h-10"
                      >
                        {UPI_APPS.map((app) => (
                          <option key={app} value={app}>
                            {app}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field id="utr-ref" label="UTR / transaction reference" className="sm:col-span-2">
                      <input
                        id="utr-ref"
                        type="text"
                        required
                        inputMode="text"
                        autoComplete="off"
                        value={inputUtr}
                        onChange={(e) => setInputUtr(e.target.value)}
                        placeholder="e.g. 426189304721"
                        className="input min-h-10 font-mono"
                      />
                    </Field>
                  </div>

                  <button type="submit" disabled={submittingUtr} className="btn btn-primary btn-lg w-full">
                    {submittingUtr ? "Submitting…" : "Submit for verification"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 2. Order confirmed view (PAID or COD)
    const addr = placedOrder.shippingAddress;
    return (
      <div className={CONTAINER}>
        <div className="mx-auto max-w-4xl space-y-4 animate-fade-in sm:space-y-5">
          {/* Thank-you header */}
          <div className="card p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success text-white">
                <Check className="h-6 w-6" strokeWidth={3} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-success sm:text-3xl">Order placed, thank you!</h1>
                <p className="mt-1 text-sm text-fg-2">
                  {isPaid ? "Your payment has been verified and your order is confirmed." : "Your Cash on Delivery order has been received."}
                </p>
                <p className="mt-2 text-sm text-fg-2">
                  Order number <strong className="font-mono text-fg">{placedOrder.orderNumber}</strong>
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-fg">
                  <Truck className="h-4 w-4 text-success" aria-hidden="true" />
                  Estimated delivery: {placedOrder.estimatedDelivery}
                </p>
              </div>
            </div>
          </div>

          {/* COD phone verification tracker */}
          {placedOrder.paymentMethod === "COD" && (
            <div className="card border-warn/30 bg-warn-soft p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn text-white">
                  <Phone className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-fg">We&apos;ll call to confirm your order</p>
                  <p className="mt-0.5 text-sm text-fg-2">
                    For Cash on Delivery orders, our team will call{" "}
                    <strong className="font-mono text-fg">{addr.phone}</strong> within 2–4 hours to confirm delivery
                    before your order is dispatched.
                  </p>
                </div>
              </div>

              <ol className="mt-4 grid grid-cols-1 gap-2 border-t border-warn/20 pt-4 text-sm sm:grid-cols-3">
                <li className="flex items-center gap-2 font-semibold text-success">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Order placed
                </li>
                <li className="flex items-center gap-2 font-bold text-warn" aria-current="step">
                  <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Phone verification
                </li>
                <li className="flex items-center gap-2 text-muted">
                  <Truck className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Confirmed &amp; dispatched
                </li>
              </ol>
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="card p-4 sm:p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold text-fg">
                <MapPin className="h-5 w-5 text-brand" aria-hidden="true" />
                Delivery address
              </h2>
              <address className="mt-2 space-y-0.5 text-sm not-italic text-fg-2">
                <p className="font-bold text-fg">{addr.fullName}</p>
                <p>{addr.address}</p>
                {addr.landmark && <p>Landmark: {addr.landmark}</p>}
                <p>
                  {addr.city}, {addr.state} {addr.pinCode}
                </p>
                <p className="pt-1">Phone: {addr.phone}</p>
              </address>
            </div>

            <div className="card p-4 sm:p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold text-fg">
                <CreditCard className="h-5 w-5 text-brand" aria-hidden="true" />
                Payment
              </h2>
              <dl className="mt-2 space-y-1.5 text-sm text-fg-2">
                <SummaryRow
                  label="Method"
                  value={
                    <span className="font-semibold text-fg">
                      {placedOrder.paymentMethod === "UPI" ? "UPI" : "Cash on Delivery"}
                    </span>
                  }
                />
                <SummaryRow
                  label="Status"
                  value={
                    <span className={`chip ${isPaid ? "bg-success-soft text-success" : "bg-warn-soft text-warn"}`}>
                      {humanizeStatus(placedOrder.paymentStatus)}
                    </span>
                  }
                />
                {placedOrder.paymentDetails?.transactionRef && (
                  <SummaryRow
                    label="UPI reference"
                    value={<span className="break-all font-mono text-fg">{placedOrder.paymentDetails.transactionRef}</span>}
                  />
                )}
                <SummaryRow label="Items" value={formatPrice(placedOrder.pricing.subtotal)} className="pt-2" />
                {discountTotal > 0 && (
                  <SummaryRow
                    label="Discount"
                    value={<span className="text-success">−{formatPrice(discountTotal)}</span>}
                  />
                )}
                <SummaryRow label="Delivery" value={formatPrice(placedOrder.pricing.shippingFee)} />
                <SummaryRow
                  label={<span className="text-base font-bold text-fg">Order total</span>}
                  value={
                    <span className="text-lg font-bold text-brand-ink">{formatPrice(placedOrder.pricing.grandTotal)}</span>
                  }
                  className="mt-1 border-t border-line pt-2"
                />
              </dl>
            </div>
          </div>

          {/* Items */}
          <div className="card p-4 sm:p-5">
            <h2 className="text-lg font-bold text-fg">Items in this order</h2>
            <ul className="mt-2 divide-y divide-line">
              {placedOrder.items.map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg bg-surface-2 object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-fg">{item.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Qty {item.quantity} × {formatPrice(item.unitPrice)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-fg tabular-nums">{formatPrice(item.total)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/products" className="btn btn-primary btn-lg">
              Continue shopping
            </Link>
            <Link href="/profile" className="btn btn-secondary btn-lg">
              Go to your account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ==================================================================
     Empty cart
  =================================================================== */
  if (items.length === 0) {
    return (
      <div className={CONTAINER}>
        <div className="card mx-auto max-w-md p-6 text-center sm:p-8 animate-fade-in">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-3">
            <ShoppingBag className="h-7 w-7 text-muted" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-fg">Your cart is empty</h1>
          <p className="mt-1 text-sm text-fg-2">Add some figures to your cart before checking out.</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/products" className="btn btn-primary">
              Browse figures
            </Link>
            <Link href="/cart" className="btn btn-secondary">
              Go to cart
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ==================================================================
     Checkout
  =================================================================== */
  const itemCount = items.reduce((n, it) => n + it.quantity, 0);
  const orderTotal = summary.subtotal + 100;
  const deliveryWindow = `${deliveryDate(3)} – ${deliveryDate(5)}`;

  const stepStatus = (n: 1 | 2 | 3): StepStatus => {
    if (n === step) return "active";
    if (n === 1) return "done";
    if (n === 2) return step === 3 || paymentDone ? "done" : "locked";
    return "locked";
  };

  const goToStep = (n: 1 | 2) => {
    setStepError(null);
    setStep(n);
  };

  const primaryLabel =
    step === 1 ? "Use this address" : step === 2 ? "Use this payment method" : submitting ? "Placing your order…" : "Place your order";

  const primaryHint =
    step < 3
      ? "Choose a delivery address and payment method to continue. You'll still be able to review your order before it's final."
      : paymentMethod === "UPI"
        ? "After you place your order, you'll pay by UPI on the next screen."
        : "You'll pay in cash or UPI when your order is delivered.";

  const addressSummary = (
    <div className="space-y-0.5">
      <p className="font-semibold text-fg">{fullName}</p>
      <p className="break-words">
        {[address, landmark, city, state].filter(Boolean).join(", ")} {pinCode}
      </p>
      <p className="text-muted">
        {mobileNumber}
        {email && <> · {email}</>}
      </p>
    </div>
  );

  const paymentSummary =
    paymentMethod === "UPI" ? (
      <p>
        <span className="font-semibold text-fg">UPI</span>
        {upiId && <span className="break-all"> · {upiId}</span>}
      </p>
    ) : (
      <p>
        <span className="font-semibold text-fg">Cash on Delivery</span> · pay at your doorstep
      </p>
    );

  return (
    <div className={CONTAINER}>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-line pb-3 sm:mb-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-fg sm:text-3xl">
            Secure checkout
            <Lock className="h-5 w-5 text-muted sm:h-6 sm:w-6" aria-hidden="true" />
          </h1>
          <p className="mt-0.5 text-sm text-fg-2">
            {itemCount} {itemCount === 1 ? "item" : "items"} · Order total{" "}
            <span className="font-semibold text-fg">{formatPrice(orderTotal)}</span>
          </p>
        </div>
        <Link href="/cart" className="link inline-flex min-h-10 items-center text-sm">
          Return to cart
        </Link>
      </div>

      <form onSubmit={handleFormSubmit} aria-label="Checkout">
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
          {/* ---------------- Left: steps ---------------- */}
          <div className="min-w-0 space-y-3 sm:space-y-4">
            {/* Step 1 — Delivery address */}
            <StepCard
              n={1}
              title="Delivery address"
              status={stepStatus(1)}
              summary={addressSummary}
              onChange={step > 1 ? () => goToStep(1) : undefined}
              sectionRef={(el) => {
                stepRefs.current[1] = el;
              }}
            >
              <div className="space-y-5">
                {savedAddresses.length > 0 && (
                  <fieldset className="space-y-2">
                    <legend className="mb-2 text-sm font-bold text-fg">Your addresses</legend>
                    {savedAddresses.map((a) => (
                      <RadioCard
                        key={a._id}
                        name="savedAddress"
                        value={a._id}
                        checked={selectedAddressId === a._id}
                        onChange={() => {
                          setSelectedAddressId(a._id);
                          applySavedAddress(a);
                        }}
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-fg">{a.fullName || "Saved address"}</span>
                          {a.isDefault && <span className="chip chip-neutral">Default</span>}
                        </span>
                        <span className="mt-0.5 block break-words">
                          {[a.streetLine1, a.streetLine2, a.landmark, a.city, a.state].filter(Boolean).join(", ")}{" "}
                          {a.postalCode}
                        </span>
                        {a.phone && <span className="mt-0.5 block text-muted">Phone: {a.phone}</span>}
                      </RadioCard>
                    ))}
                    <RadioCard
                      name="savedAddress"
                      value={NEW_ADDRESS}
                      checked={selectedAddressId === NEW_ADDRESS}
                      onChange={() => {
                        setSelectedAddressId(NEW_ADDRESS);
                        setAddress("");
                        setCity("");
                        setPinCode("");
                        setLandmark("");
                      }}
                    >
                      <span className="font-semibold text-fg">Deliver to a new address</span>
                    </RadioCard>
                  </fieldset>
                )}

                <fieldset>
                  <legend className="mb-3 text-sm font-bold text-fg">Contact details</legend>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field id="co-name" label="Full name" icon={User}>
                      <input
                        id="co-name"
                        type="text"
                        required
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="First and last name"
                        className="input min-h-10 pl-9"
                      />
                    </Field>
                    <Field id="co-mobile" label="Mobile number" icon={Phone}>
                      <input
                        id="co-mobile"
                        type="tel"
                        required
                        inputMode="tel"
                        autoComplete="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="input min-h-10 pl-9"
                      />
                    </Field>
                    <Field id="co-email" label="Email" icon={Mail} className="sm:col-span-2">
                      <input
                        id="co-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="input min-h-10 pl-9"
                      />
                    </Field>
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-3 text-sm font-bold text-fg">
                    {savedAddresses.length > 0 ? "Address details" : "Address"}
                  </legend>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                      id="co-street"
                      label="Flat, house no., building, street"
                      icon={Building}
                      className="sm:col-span-2"
                    >
                      <input
                        id="co-street"
                        type="text"
                        required
                        autoComplete="street-address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. 42 Marine Drive, Apartment 4B"
                        className="input min-h-10 pl-9"
                      />
                    </Field>
                    <Field id="co-landmark" label={<>Landmark <span className="font-normal text-muted">(optional)</span></>} icon={Navigation} className="sm:col-span-2">
                      <input
                        id="co-landmark"
                        type="text"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        placeholder="e.g. Near Gateway of India"
                        className="input min-h-10 pl-9"
                      />
                    </Field>
                    <Field id="co-city" label="Town / city">
                      <input
                        id="co-city"
                        type="text"
                        required
                        autoComplete="address-level2"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Mumbai"
                        className="input min-h-10"
                      />
                    </Field>
                    <Field id="co-pin" label="PIN code">
                      <input
                        id="co-pin"
                        type="text"
                        required
                        inputMode="numeric"
                        autoComplete="postal-code"
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value)}
                        placeholder="6-digit PIN code"
                        className="input min-h-10"
                      />
                    </Field>
                    <Field id="co-state" label="State" className="sm:col-span-2">
                      <select
                        id="co-state"
                        autoComplete="address-level1"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="input min-h-10"
                      >
                        {INDIAN_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </fieldset>

                <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center">
                  <button type="submit" className="btn btn-primary min-h-10">
                    Use this address
                  </button>
                  <p className="text-xs text-muted">Discreet, padded packaging on every order.</p>
                </div>
              </div>
            </StepCard>

            {/* Step 2 — Payment method */}
            <StepCard
              n={2}
              title="Payment method"
              status={stepStatus(2)}
              summary={paymentSummary}
              onChange={step > 2 ? () => goToStep(2) : undefined}
              sectionRef={(el) => {
                stepRefs.current[2] = el;
              }}
            >
              <div className="space-y-4">
                {stepError && (
                  <Notice tone="error" icon={AlertTriangle}>
                    <span className="font-medium text-brand-ink">{stepError}</span>
                  </Notice>
                )}

                <fieldset className="space-y-2">
                  <legend className="sr-only">Choose a payment method</legend>

                  <RadioCard
                    name="payment"
                    value="UPI"
                    checked={paymentMethod === "UPI"}
                    onChange={() => {
                      setPaymentMethod("UPI");
                      setStepError(null);
                    }}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <Smartphone className="h-4 w-4 text-fg-2" aria-hidden="true" />
                      <span className="font-semibold text-fg">UPI</span>
                      <span className="chip chip-soft">Recommended</span>
                    </span>
                    <span className="mt-0.5 block">
                      Pay with Google Pay, PhonePe, Paytm, BHIM or any UPI app. You&apos;ll scan a QR code after
                      placing your order.
                    </span>
                  </RadioCard>

                  {paymentMethod === "UPI" && (
                    <div className="rounded-lg border border-line bg-surface-2 p-3 animate-fade-in sm:p-4">
                      <label htmlFor="co-upi" className="label">
                        Your UPI ID
                      </label>
                      <input
                        id="co-upi"
                        type="text"
                        required
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="name@okhdfcbank or 9876543210@paytm"
                        aria-describedby="co-upi-hint"
                        className="input min-h-10 max-w-md font-mono"
                      />
                      <p id="co-upi-hint" className="mt-1.5 text-xs text-muted">
                        We use this to match your payment. You&apos;ll pay Figure World&apos;s UPI ID on the next
                        screen.
                      </p>
                    </div>
                  )}

                  <RadioCard
                    name="payment"
                    value="COD"
                    checked={paymentMethod === "COD"}
                    onChange={() => {
                      setPaymentMethod("COD");
                      setStepError(null);
                    }}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <Banknote className="h-4 w-4 text-fg-2" aria-hidden="true" />
                      <span className="font-semibold text-fg">Cash on Delivery</span>
                    </span>
                    <span className="mt-0.5 block">
                      Pay in cash or by UPI to the delivery agent. We&apos;ll call to confirm before dispatch.
                    </span>
                    {codUnavailable && (
                      <span className="mt-1 block text-xs font-semibold text-warn">
                        Not available for orders over ₹15,000.
                      </span>
                    )}
                  </RadioCard>
                </fieldset>

                <div className="border-t border-line pt-4">
                  <button type="submit" className="btn btn-primary min-h-10 w-full sm:w-auto">
                    Use this payment method
                  </button>
                </div>
              </div>
            </StepCard>

            {/* Step 3 — Review items and delivery */}
            <StepCard
              n={3}
              title="Review items and delivery"
              status={stepStatus(3)}
              sectionRef={(el) => {
                stepRefs.current[3] = el;
              }}
            >
              <div className="space-y-4">
                {/* Delivery option */}
                <div className="rounded-lg border border-line">
                  <div className="border-b border-line bg-surface-2 px-3 py-2.5 sm:px-4">
                    <p className="text-base font-bold text-success">Arriving {deliveryWindow}</p>
                    <p className="text-xs text-muted">Ships to {city || "your address"} · discreet, padded packaging</p>
                  </div>

                  <ul className="divide-y divide-line">
                    {items.map((it) => (
                      <li key={it.productId} className="flex gap-3 p-3 sm:p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={it.image}
                          alt=""
                          className="h-20 w-20 shrink-0 rounded-lg bg-surface-2 object-contain sm:h-24 sm:w-24"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <Link
                            href={`/products/${it.slug || it.productId}`}
                            className="line-clamp-2 text-sm font-semibold text-fg hover:text-brand-ink hover:underline"
                          >
                            {it.name}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2">
                            <Price amount={it.unitPrice} size="sm" />
                            {it.isRestricted && <span className="chip chip-brand">18+</span>}
                          </div>
                          <p className="text-xs text-fg-2">
                            Qty: <span className="font-semibold text-fg">{it.quantity}</span>
                            {it.quantity > 1 && (
                              <>
                                {" "}
                                · Subtotal{" "}
                                <span className="font-semibold text-fg">{formatPrice(it.unitPrice * it.quantity)}</span>
                              </>
                            )}
                          </p>
                          {it.stockWarning && it.stockStatus && it.stockStatus !== "in_stock" && (
                            <p className="text-xs font-semibold text-warn">{it.stockWarning}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="border-t border-line p-3 sm:p-4">
                    <p className="mb-2 text-sm font-bold text-fg">Delivery option</p>
                    <div className="flex items-start gap-3 rounded-lg border border-brand bg-brand-soft p-3 ring-1 ring-brand">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-semibold text-fg">
                          Standard Delivery · <span className="text-success">{deliveryWindow}</span>
                        </p>
                        <p className="text-fg-2">₹100 · 3–5 business days across India</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 18+ compliance gate */}
                {summary.hasRestrictedItems && (
                  <div className="rounded-lg border border-brand/30 bg-brand-soft p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                      <div className="min-w-0 flex-1 space-y-1 text-sm">
                        <p className="font-bold text-brand-ink">Age verification required (18+)</p>
                        <p className="text-fg-2">
                          Your order contains ornamental replica weapons such as katanas. Delivery is subject to age
                          eligibility and destination restriction checks.
                        </p>
                      </div>
                    </div>
                    <label className="mt-3 flex min-h-10 cursor-pointer select-none items-start gap-3 border-t border-brand/20 pt-3 text-sm font-semibold text-fg">
                      <input
                        type="checkbox"
                        checked={ageConfirmed}
                        onChange={(e) => setAgeConfirmed(e.target.checked)}
                        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand"
                      />
                      <span>
                        I confirm that I am at least 18 years old and eligible to purchase ornamental collector
                        weapons.
                      </span>
                    </label>
                  </div>
                )}

                {error && (
                  <Notice tone="error" icon={AlertTriangle} title="There was a problem with your order">
                    {error}
                  </Notice>
                )}

                {/* Bottom place-order bar (Amazon-style) */}
                <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface-2 p-3 sm:flex-row sm:items-center sm:p-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary btn-lg w-full shrink-0 sm:w-auto"
                  >
                    {submitting ? "Placing your order…" : "Place your order"}
                  </button>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-brand-ink">Order total: {formatPrice(orderTotal)}</p>
                    <p className="text-xs text-muted">
                      By placing your order, you confirm your details are correct. Prices and stock are confirmed when
                      you place your order.
                    </p>
                  </div>
                </div>
              </div>
            </StepCard>
          </div>

          {/* ---------------- Right: order summary ---------------- */}
          <aside aria-label="Order summary" className="lg:sticky lg:top-24">
            <div className="card p-4 sm:p-5">
              <div className="hidden lg:block">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-lg w-full"
                >
                  {primaryLabel}
                </button>
                <p className="mt-2 text-center text-xs leading-snug text-muted">{primaryHint}</p>
                <div className="my-4 border-t border-line" />
              </div>

              <h2 className="text-lg font-bold text-fg">Order Summary</h2>
              <dl className="mt-3 space-y-1.5 text-sm text-fg-2">
                <SummaryRow label={`Items (${itemCount}):`} value={formatPrice(summary.subtotal)} />
                <SummaryRow label="Delivery:" value={formatPrice(100)} />
                <SummaryRow
                  label={<span className="text-lg font-bold text-brand-ink">Order Total:</span>}
                  value={<span className="text-lg font-bold text-brand-ink">{formatPrice(orderTotal)}</span>}
                  className="mt-2 border-t border-line pt-3"
                />
              </dl>

              {error && step === 3 && (
                <Notice tone="error" icon={AlertTriangle} className="mt-3 hidden lg:flex">
                  <span className="font-medium text-brand-ink">{error}</span>
                </Notice>
              )}

              <div className="mt-4 space-y-2 border-t border-line pt-3 text-xs text-muted">
                <p className="flex items-start gap-2">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Prices and stock are confirmed when you place your order.
                </p>
                <p className="flex items-start gap-2">
                  <PackageCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  100% genuine collectibles in discreet, padded packaging.
                </p>
                <p className="flex items-start gap-2">
                  <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Cash on Delivery available for orders up to ₹15,000.
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile / tablet sticky action bar keeps the primary action in reach */}
        <div className="sticky bottom-0 z-30 -mx-3 mt-4 border-t border-line bg-surface px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-pop sm:-mx-4 sm:px-4 lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">Order total</p>
              <p className="text-lg font-bold leading-tight text-brand-ink tabular-nums">{formatPrice(orderTotal)}</p>
            </div>
            <button type="submit" disabled={submitting} className="btn btn-primary min-h-11 shrink-0 px-5">
              {primaryLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
