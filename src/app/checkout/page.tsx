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

  // Auto-fill logged in user info
  useEffect(() => {
    if (user) {
      if (!fullName) setFullName(user.name || "");
      if (!email) setEmail(user.email || "");
      if (user.phone && !mobileNumber) setMobileNumber(user.phone);

      // If user has saved addresses, fetch default
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
        setError(data.message || "Checkout failed. Please check your information.");
      }
    } catch (err: any) {
      setError(err.message || "Network error occurred during checkout.");
    } finally {
      setSubmitting(false);
    }
  };

  // If order was successfully placed, render Order Confirmation View
  if (placedOrder) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-8 text-center dark:border-emerald-900/60 dark:bg-emerald-950/30 space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <Check className="h-8 w-8 stroke-[3]" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-0.5 rounded-full">
              Order Confirmed
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

        {/* Order Details Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
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
              <span>Payment Details</span>
            </div>
            <div className="space-y-2 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <strong className="text-slate-900 dark:text-white">
                  {placedOrder.paymentMethod === "UPI" ? "UPI (Instant Payment)" : "Cash on Delivery (COD)"}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Payment Status:</span>
                <span className="font-bold uppercase text-emerald-600">
                  {placedOrder.paymentStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatPrice(placedOrder.pricing.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee:</span>
                <span>{formatPrice(placedOrder.pricing.shippingFee)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-sm font-black text-slate-900 dark:text-white">
                <span>Total Amount:</span>
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
              <div key={idx} className="py-3 flex items-center justify-between gap-4 text-xs">
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
            Sprint 6 Checkout System
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
                    placeholder="collector@figuresworld.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Street Address *
                </label>
                <div className="relative mt-1">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea
                    rows={2}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House/Flat number, Building name, Street, Area"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
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
                  placeholder="e.g. Mumbai, Bengaluru"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  State *
                </label>
                <select
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
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
                  Landmark <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <div className="relative mt-1">
                  <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="Near metro station / school"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Delivery Calculation & Compliance */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-black text-sm">
                2
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Delivery Calculation & Compliance
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
                  Select your preferred payment gateway: UPI or Cash on Delivery.
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
                    <span>UPI (Instant Transfer)</span>
                  </div>
                  <span className="rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 font-bold px-2 py-0.5 text-[10px]">
                    Fastest
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Pay instantly via GPay, PhonePe, Paytm, or BHIM UPI ID.
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
                  Pay with cash or UPI QR directly to the courier agent upon doorstep delivery.
                </p>
              </label>
            </div>

            {/* UPI ID Input if UPI selected */}
            {paymentMethod === "UPI" && (
              <div className="pt-2 animate-fade-in text-xs">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Enter Your UPI ID (VPA) *
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
                  A payment authorization prompt will be simulated upon placing order.
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

            {/* Place Order CTA Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{submitting ? "Placing Order..." : `Confirm & Place Order (${paymentMethod})`}</span>
            </button>

            {/* Trust Assurances */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Zero-Trust Server Verified Prices</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>100% Authentic Japanese Collector Imports</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
