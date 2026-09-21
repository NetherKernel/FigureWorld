"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  MapPin,
  Truck,
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
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
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/format";

interface IPlacedOrder {
  orderNumber: string;
  orderId: string;
  pricing: {
    subtotal: number;
    shippingFee: number;
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

export default function CheckoutPage() {
  const router = useRouter();
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

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "COD">("UPI");
  const [upiId, setUpiId] = useState("");

  // 18+ Compliance Confirmation
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<IPlacedOrder | null>(null);

  // Sprint 7: UPI Reference Submission & Polling State
  const [inputUtr, setInputUtr] = useState("");
  const [selectedUpiApp, setSelectedUpiApp] = useState("Google Pay");
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrError, setUtrError] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState(false);
  const [copiedVpa, setCopiedVpa] = useState(false);

  // Auto-fill logged in user info
  useEffect(() => {
    if (user) {
      if (!fullName) setFullName(user.name || "");
      if (!email) setEmail(user.email || "");
      if (user.phone && !mobileNumber) setMobileNumber(user.phone);

      async function loadSavedAddress() {
        try {
          const res = await fetch("/api/user/addresses");
          const data = await res.json();
          if (data.success && data.data?.addresses?.length > 0) {
            const def = data.data.addresses.find((a: any) => a.isDefault) || data.data.addresses[0];
            if (def) {
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
    }
  }, [user]);

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
    } catch (err: any) {
      setError(err.message || "Network error occurred during checkout.");
    } finally {
      setSubmitting(false);
    }
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
    } catch (err: any) {
      setUtrError(err.message || "Network error submitting reference ID.");
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

  const copyMerchantVpa = (vpa: string) => {
    navigator.clipboard.writeText(vpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2500);
  };

  // If order was placed, check whether we show the UPI Payment Gateway or Confirmed Order
  if (placedOrder) {
    const isUpi = placedOrder.paymentMethod === "UPI";
    const paymentStatusNormalized = (placedOrder.paymentStatus || "").toUpperCase();
    const isPaid = paymentStatusNormalized === "PAID";
    const isUnderReview = paymentStatusNormalized === "UNDER_REVIEW";
    const isFailed = paymentStatusNormalized === "FAILED";

    // 1. UPI Payment Gateway (PENDING or UNDER_REVIEW or FAILED)
    if (isUpi && !isPaid) {
      const merchantVpa = placedOrder.paymentDetails?.merchantUpiId || "figuresworld@icici";
      const qrDataUrl = placedOrder.paymentDetails?.qrDataUrl;
      const qrPayload = placedOrder.paymentDetails?.qrPayload;

      return (
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 space-y-8 animate-fade-in text-xs">
          {/* Header Progress */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-3 py-1 font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
              <QrCode className="h-3.5 w-3.5" />
              <span>Sprint 7 Direct UPI Payment</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Complete Your UPI Transfer
            </h1>
            <p className="text-slate-500">
              Order Reference: <strong className="font-mono text-slate-900 dark:text-white">{placedOrder.orderNumber}</strong>
            </p>
          </div>

          {/* Under Review Notice */}
          {isUnderReview && (
            <div className="rounded-3xl border-2 border-amber-300 bg-amber-50/90 p-6 sm:p-8 dark:border-amber-800/80 dark:bg-amber-950/30 space-y-4 animate-fade-in text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30 animate-pulse">
                <Clock className="h-7 w-7" />
              </div>
              <div>
                <span className="rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-3 py-0.5 font-bold uppercase tracking-wider text-[10px]">
                  Payment Status: UNDER_REVIEW
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                  Transaction Reference Submitted!
                </h2>
                <p className="text-slate-600 dark:text-slate-300 mt-1 max-w-lg mx-auto leading-relaxed">
                  We have received your UTR Reference{" "}
                  <strong className="font-mono text-amber-800 dark:text-amber-300">
                    {placedOrder.paymentDetails?.transactionRef}
                  </strong>
                  . Our verification team is verifying your payment with our merchant bank. The order will be confirmed as soon as payment is confirmed.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={handleCheckStatus}
                  disabled={pollingStatus}
                  className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2.5 transition shadow-sm flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${pollingStatus ? "animate-spin" : ""}`} />
                  Check Verification Status
                </button>
                <Link
                  href="/products"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          )}

          {/* Failed Notice */}
          {isFailed && (
            <div className="rounded-3xl border-2 border-rose-300 bg-rose-50/90 p-6 dark:border-rose-900/60 dark:bg-rose-950/30 space-y-3 animate-fade-in text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md">
                <XCircle className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-rose-900 dark:text-rose-200">
                Payment Verification Failed
              </h2>
              <p className="text-rose-700 dark:text-rose-300 max-w-md mx-auto">
                {placedOrder.paymentDetails?.rejectionReason ||
                  "The submitted reference ID could not be matched with bank deposit records."}
              </p>
              <p className="text-[11px] text-slate-500">
                Please verify your UTR number from your payment app receipt and resubmit below.
              </p>
            </div>
          )}

          {/* Payment Card (QR Code & Merchant VPA) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800 text-center sm:text-left">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                  Total Payable Amount
                </span>
                <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {formatPrice(placedOrder.pricing.grandTotal)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Includes Items ({formatPrice(placedOrder.pricing.subtotal)}) + Standard Delivery (₹100)
                </p>
              </div>

              {/* Merchant VPA Pill */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950 text-left">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                  FiguresWorld Merchant UPI ID
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                    {merchantVpa}
                  </span>
                  <button
                    onClick={() => copyMerchantVpa(merchantVpa)}
                    className="p-1 rounded-md text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition"
                    title="Copy UPI ID"
                  >
                    {copiedVpa ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* QR Code + Intent Section */}
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="rounded-3xl border-2 border-indigo-100 bg-white p-4 shadow-md dark:border-indigo-950 dark:bg-slate-950 inline-block">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Scan UPI QR Code to Pay"
                    className="h-48 w-48 rounded-xl object-contain mx-auto"
                  />
                ) : (
                  <div className="h-48 w-48 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <QrCode className="h-16 w-16 text-slate-400" />
                  </div>
                )}
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mt-2">
                  Scan with GPay, PhonePe, Paytm, or BHIM
                </span>
              </div>

              {qrPayload && (
                <a
                  href={qrPayload}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 text-xs shadow-sm transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open in UPI App</span>
                </a>
              )}
            </div>

            {/* Step-by-Step Instructions */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
              <p className="font-bold text-slate-900 dark:text-white">How to complete your payment:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
                <li>Scan the QR code or transfer {formatPrice(placedOrder.pricing.grandTotal)} to <strong className="font-mono">{merchantVpa}</strong>.</li>
                <li>In your UPI app receipt, locate the <strong>12-digit UTR</strong> or <strong>UPI Reference Number</strong>.</li>
                <li>Enter the reference ID below and click <strong>Submit Reference for Verification</strong>.</li>
              </ol>
            </div>

            {/* Reference ID Submission Form */}
            {(!isUnderReview || isFailed) && (
              <form onSubmit={handleSubmitUtr} className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Submit Transaction Reference ID
                </h3>

                {utrError && (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 font-semibold">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{utrError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      UPI App Used
                    </label>
                    <select
                      value={selectedUpiApp}
                      onChange={(e) => setSelectedUpiApp(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-medium focus:border-indigo-500 focus:outline-none"
                    >
                      {UPI_APPS.map((app) => (
                        <option key={app} value={app}>
                          {app}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      12-Digit UTR / Transaction Reference ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={inputUtr}
                      onChange={(e) => setInputUtr(e.target.value)}
                      placeholder="e.g. 426189304721 or T2409..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 font-mono text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingUtr}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {submittingUtr ? "Submitting Reference..." : "Submit Reference ID for Verification"}
                </button>
              </form>
            )}
          </div>
        </main>
      );
    }

    // 2. Order Confirmed View (PAID or COD)
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8 animate-fade-in text-xs">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-8 text-center dark:border-emerald-900/60 dark:bg-emerald-950/30 space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <Check className="h-8 w-8 stroke-[3]" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-0.5 rounded-full">
              {isPaid ? "Payment Verified • Order Confirmed" : "Order Confirmed (Cash on Delivery)"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
              Thank You for Your Order!
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
              Order Reference:{" "}
              <strong className="font-mono text-emerald-800 dark:text-emerald-300">
                {placedOrder.orderNumber}
              </strong>
            </p>
          </div>
        </div>

        {/* COD Verification Status Tracker (Sprint 8) */}
        {placedOrder.paymentMethod === "COD" && (
          <div className="rounded-3xl border-2 border-amber-300 bg-amber-50/90 p-6 sm:p-8 dark:border-amber-800/80 dark:bg-amber-950/30 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <span className="rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 font-bold uppercase tracking-wider text-[10px]">
                  COD Verification Required
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  Customer Phone Verification in Progress
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                  Our verification agent will dial <strong className="font-mono">{placedOrder.shippingAddress.phone}</strong> within 2-4 hours to confirm delivery schedule prior to dispatch.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px]">
              <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>1. Order Created</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200 animate-pulse">
                <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                <span>2. Phone Verification</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Truck className="h-4 w-4 shrink-0" />
                <span>3. Confirmed & Dispatch</span>
              </div>
            </div>
          </div>
        )}

        {/* Order Details Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shipping & Delivery Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-2 dark:border-slate-800">
              <MapPin className="h-4 w-4 text-indigo-600" />
              <span>Delivery Address</span>
            </div>
            <div className="space-y-1 text-slate-600 dark:text-slate-300">
              <p className="font-bold text-slate-900 dark:text-white">{placedOrder.shippingAddress.fullName}</p>
              <p>{placedOrder.shippingAddress.address}</p>
              {placedOrder.shippingAddress.landmark && <p>Landmark: {placedOrder.shippingAddress.landmark}</p>}
              <p>
                {placedOrder.shippingAddress.city}, {placedOrder.shippingAddress.state} — {placedOrder.shippingAddress.pinCode}
              </p>
              <p className="pt-1 font-mono text-[11px]">Phone: {placedOrder.shippingAddress.phone}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                <Truck className="h-4 w-4" />
                <span>Estimated Delivery: {placedOrder.estimatedDelivery}</span>
              </div>
            </div>
          </div>

          {/* Payment Summary Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-2 dark:border-slate-800">
              <CreditCard className="h-4 w-4 text-indigo-600" />
              <span>Payment & Verification Details</span>
            </div>
            <div className="space-y-2 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <strong className="text-slate-900 dark:text-white">
                  {placedOrder.paymentMethod === "UPI" ? "UPI (Direct Payment)" : "Cash on Delivery (COD)"}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Payment Status:</span>
                <span className="font-bold uppercase text-emerald-600">
                  {placedOrder.paymentStatus}
                </span>
              </div>
              {placedOrder.paymentDetails?.transactionRef && (
                <div className="flex justify-between">
                  <span>UTR Reference ID:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {placedOrder.paymentDetails.transactionRef}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatPrice(placedOrder.pricing.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee:</span>
                <span>{formatPrice(placedOrder.pricing.shippingFee)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-sm font-black text-slate-900 dark:text-white">
                <span>Grand Total:</span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  {formatPrice(placedOrder.pricing.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Ordered Items List */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Items in this Order</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {placedOrder.items.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-12 w-12 rounded-xl object-cover bg-slate-100 dark:bg-slate-800"
                  />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Qty: {item.quantity} × {formatPrice(item.unitPrice)}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {formatPrice(item.total)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 pt-4">
          <Link
            href="/products"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
          >
            Continue Shopping
          </Link>
          <Link
            href="/profile"
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            View Account Profile
          </Link>
        </div>
      </main>
    );
  }

  // If cart is empty, prompt user
  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center space-y-4">
        <ShoppingBag className="mx-auto h-12 w-12 text-slate-400" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Your Cart is Empty</h1>
        <p className="text-xs text-slate-500">Please add items to your cart before proceeding to checkout.</p>
        <Link
          href="/products"
          className="inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-700"
        >
          Browse Figures
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Checkout Header */}
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-900/50">
            Sprint 7 Direct UPI Checkout
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Secure Checkout
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Cart → Address → Delivery Calculation → Payment Method (UPI / COD) → Order Confirmation
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 animate-fade-in">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Multi-Step Forms */}
        <div className="lg:col-span-8 space-y-6">
          {/* Step 1: Customer & Address Information */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-black text-sm">
                1
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Customer & Shipping Address
                </h2>
                <p className="text-[11px] text-slate-500">
                  Enter delivery coordinates for discreet, padded collector shipping.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Full Name *
                </label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Roronoa Zoro"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Mobile Number *
                </label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 font-mono text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Email Address *
                </label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. zoro@wano.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Street Address (House No, Building, Street) *
                </label>
                <div className="relative mt-1">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 42 Swordmaster Boulevard, Apartment 4B"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  State *
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white font-medium"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  PIN Code *
                </label>
                <input
                  type="text"
                  required
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="e.g. 400001"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 font-mono text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Landmark (Optional)
                </label>
                <div className="relative mt-1">
                  <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Near Gateway of India"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Delivery Calculation */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-black text-sm">
                2
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Delivery Calculation
                </h2>
                <p className="text-[11px] text-slate-500">
                  Standard delivery fee calculated automatically by the server.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 text-xs">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Standard Delivery</p>
                  <p className="text-[11px] text-slate-500">3-5 business days across India</p>
                </div>
              </div>
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                ₹100
              </span>
            </div>

            {/* Restricted Items Age & Destination Gate */}
            {summary.hasRestrictedItems && (
              <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/90 p-5 dark:border-rose-900/60 dark:bg-rose-950/30 space-y-3">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
                  <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
                  <span>Compliance Gate: 18+ Restricted Goods in Cart</span>
                </div>
                <p className="text-[11px] text-rose-900/90 dark:text-rose-200/90 leading-relaxed">
                  Your order contains ornamental replica weapons (e.g. katanas). Under applicable legal compliance standards, delivery is subject to age eligibility and destination restriction checks.
                </p>

                <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-rose-950 dark:text-rose-100 font-semibold">
                    <input
                      type="checkbox"
                      checked={ageConfirmed}
                      onChange={(e) => setAgeConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span>
                      I certify that I am at least 18 years of age and eligible to purchase ornamental collector weapons.
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Payment Method (UPI & COD) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-black text-sm">
                3
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Payment Method
                </h2>
                <p className="text-[11px] text-slate-500">
                  Select your preferred payment gateway: Direct UPI or Cash on Delivery.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* UPI Option */}
              <label
                className={`relative flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition ${
                  paymentMethod === "UPI"
                    ? "border-indigo-600 bg-indigo-50/20 dark:border-indigo-400"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-950"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                    <input
                      type="radio"
                      name="payment"
                      value="UPI"
                      checked={paymentMethod === "UPI"}
                      onChange={() => setPaymentMethod("UPI")}
                      className="h-4 w-4 text-indigo-600"
                    />
                    <span>Direct UPI Payment</span>
                  </div>
                  <span className="rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 font-bold px-2 py-0.5 text-[10px]">
                    QR / VPA
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Scan QR code or pay directly with Google Pay, PhonePe, Paytm, or BHIM.
                </p>
              </label>

              {/* COD Option */}
              <label
                className={`relative flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition ${
                  paymentMethod === "COD"
                    ? "border-indigo-600 bg-indigo-50/20 dark:border-indigo-400"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-950"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                    <input
                      type="radio"
                      name="payment"
                      value="COD"
                      checked={paymentMethod === "COD"}
                      onChange={() => setPaymentMethod("COD")}
                      className="h-4 w-4 text-indigo-600"
                    />
                    <span>Cash on Delivery (COD)</span>
                  </div>
                  <span className="rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold px-2 py-0.5 text-[10px]">
                    Pay on Arrival
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Pay with cash or UPI QR directly to courier agent upon doorstep arrival.
                </p>
              </label>
            </div>

            {/* UPI ID Input if UPI selected */}
            {paymentMethod === "UPI" && (
              <div className="pt-2 animate-fade-in text-xs">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Your UPI ID (VPA) *
                </label>
                <div className="relative mt-1 max-w-md">
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="username@okhdfcbank or 9876543210@paytm"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 font-mono text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Next, you will be presented with the FiguresWorld merchant QR code to scan and pay.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary Sidebar */}
        <div className="lg:col-span-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5 sticky top-24 text-xs">
            <h2 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              Order Summary
            </h2>

            {/* Items Mini List */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {items.map((it) => (
                <div key={it.productId} className="flex items-center gap-3">
                  <img
                    src={it.image}
                    alt={it.name}
                    className="h-12 w-12 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{it.name}</p>
                    <p className="text-[11px] text-slate-500">
                      Qty: {it.quantity} × {formatPrice(it.unitPrice)}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white shrink-0">
                    {formatPrice(it.unitPrice * it.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatPrice(summary.subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Delivery Fee</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">
                  ₹100
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">Grand Total</span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {formatPrice(summary.subtotal + 100)}
                </span>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-indigo-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>Generating Order...</span>
              ) : paymentMethod === "UPI" ? (
                <>
                  <span>Proceed to Direct UPI Payment</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Confirm Cash on Delivery Order</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="pt-2 text-center text-[10px] text-slate-400">
              Discreet packaging • 100% Genuine Collectibles
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
