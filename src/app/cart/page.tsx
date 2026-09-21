"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Truck,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";

export default function CartPage() {
  const {
    items,
    summary,
    stockWarnings,
    isSyncing,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    clearCart,
    refreshCart,
  } = useCart();

  const [confirmClear, setConfirmClear] = useState(false);

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
          <ShoppingBag className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Your Shopping Cart is Empty
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Looks like you haven&apos;t added any collector figures or replicas to your cart yet.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition"
          >
            <Sparkles className="h-4 w-4" /> Explore Collectibles Catalog
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-900/50">
              Sprint 5 Shopping Cart
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Shopping Cart ({summary.itemCount} {summary.itemCount === 1 ? "item" : "items"})
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refreshCart()}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-indigo-600" : ""}`} />
            {isSyncing ? "Validating..." : "Verify Prices & Stock"}
          </button>

          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 transition"
            >
              Clear Cart
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={clearCart}
                className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition"
              >
                Confirm Clear
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stock Warnings Banner */}
      {stockWarnings.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Stock Availability Notice</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
            {stockWarnings.map((warn, idx) => (
              <li key={idx}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Zero-Trust Security Notice */}
      <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
        <span>
          <strong>Zero-Trust Backend Calculation:</strong> All prices, item subtotals, and available warehouse stocks are calculated authoritatively by the server. Client-side price tampering is completely disregarded.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {items.map((item) => {
                const itemTotal = item.unitPrice * item.quantity;
                const isOutOfStock = item.stock <= 0;
                const isAtMaxStock = item.quantity >= item.stock;

                return (
                  <div
                    key={item.productId}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                  >
                    {/* Item Image & Title */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                        {item.isRestricted && (
                          <div className="absolute top-1 left-1 rounded bg-rose-600 px-1 py-0.2 text-[8px] font-black text-white uppercase">
                            18+
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <Link
                          href={`/products/${item.slug}`}
                          className="font-bold text-sm text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400 line-clamp-1 transition"
                        >
                          {item.name}
                        </Link>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                          <span>SKU: {item.sku}</span>
                          <span>•</span>
                          <span>Unit: {formatPrice(item.unitPrice, summary.currency)}</span>
                        </div>

                        {/* Stock status indicator */}
                        <div className="text-[11px]">
                          {isOutOfStock ? (
                            <span className="font-bold text-rose-600">Out of Stock</span>
                          ) : isAtMaxStock ? (
                            <span className="font-medium text-amber-600">
                              Max available stock reached ({item.stock} in stock)
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium">
                              In Stock ({item.stock} available)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Stepper & Price Calculation */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      {/* Quantity Controller */}
                      <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.productId)}
                          disabled={item.quantity <= 1}
                          title="Decrease Quantity"
                          className="p-2 text-slate-600 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="px-3 text-xs font-bold font-mono text-slate-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => increaseQuantity(item.productId)}
                          disabled={isAtMaxStock || isOutOfStock}
                          title={isAtMaxStock ? "Stock Limit Reached" : "Increase Quantity"}
                          className="p-2 text-slate-600 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Line Item Total (e.g. Anime Figure ₹2,499 x 2 = ₹4,998) */}
                      <div className="text-right min-w-[90px]">
                        <p className="text-base font-black text-slate-900 dark:text-white">
                          {formatPrice(itemTotal, summary.currency)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {item.quantity} × {formatPrice(item.unitPrice, summary.currency)}
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        title="Remove Item"
                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 px-2">
            <Link
              href="/products"
              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              ← Continue Shopping
            </Link>
            <span>Standard flat shipping ₹100 applies to your order.</span>
          </div>
        </div>

        {/* Right Column: Order Summary (Matching Example: Subtotal ₹4,998, Shipping ₹100, Total ₹5,098) */}
        <div className="lg:col-span-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5 sticky top-24">
            <h2 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              Order Summary
            </h2>

            {/* Calculations Breakdown */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {formatPrice(summary.subtotal, summary.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Standard Shipping</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {summary.shipping > 0 ? formatPrice(summary.shipping, summary.currency) : "Free"}
                </span>
              </div>

              {summary.hasRestrictedItems && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-[11px] text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                    <span>18+ Compliance Verification</span>
                  </div>
                  <p className="text-[10px] leading-normal">
                    Contains age-restricted items (e.g. katanas). Age verification is required during checkout.
                  </p>
                </div>
              )}

              {/* Exact Line Separator & Total */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">Total</span>
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {formatPrice(summary.total, summary.currency)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 text-right">
                  All taxes & delivery fees included
                </p>
              </div>
            </div>

            {/* Checkout Action */}
            <div className="pt-2">
              <Link
                href="/checkout"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Guarantees */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Backend Calculated: Zero price tampering risk</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Live Inventory Validation before payment</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Padded, discrete Japanese collector shipping</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
