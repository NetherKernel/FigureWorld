"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Minus, Plus, RefreshCw, ShieldAlert, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductShelf, ShelfItem } from "@/components/product/ProductShelf";
import { Price } from "@/components/ui/Price";
import { formatPrice } from "@/lib/format";
import { StoreProduct } from "@/lib/product-view";

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
  const { user } = useAuth();

  const [confirmClear, setConfirmClear] = useState(false);
  const [suggestions, setSuggestions] = useState<StoreProduct[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/products?sort=rating&limit=12&isRestricted=false");
        const json = await res.json();
        if (!cancelled && json.success) setSuggestions(json.data.products || []);
      } catch {
        /* recommendations are optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const inCart = new Set(items.map((i) => i.productId));
  const recommended = suggestions.filter((p) => !inCart.has(p._id));
  const itemLabel = `${summary.itemCount} ${summary.itemCount === 1 ? "item" : "items"}`;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-5 px-3 py-5 sm:px-4">
        <div className="card flex flex-col items-center gap-6 p-6 sm:flex-row sm:p-8">
          <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
            <ShoppingCart className="h-16 w-16" strokeWidth={1.5} />
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-fg">Your Figure World Cart is empty</h1>
            <Link href="/products?onSale=true" className="link mt-1 inline-block text-sm">
              Shop today&apos;s deals
            </Link>
            <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
              {user ? (
                <Link href="/products" className="btn btn-primary">
                  Continue shopping
                </Link>
              ) : (
                <>
                  <Link href="/auth/login?redirect=/cart" className="btn btn-primary">
                    Sign in to your account
                  </Link>
                  <Link href="/auth/register" className="btn btn-secondary">
                    Sign up now
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        <RecommendedShelf products={recommended} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 px-3 py-5 sm:px-4">
      {stockWarnings.length > 0 && (
        <div role="alert" className="flex gap-3 rounded-xl border border-warn/40 bg-warn-soft p-4 text-sm text-fg">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warn" />
          <div>
            <p className="font-bold">Some items in your cart have changed</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-fg-2">
              {stockWarnings.map((warn, idx) => (
                <li key={idx}>{warn}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Subtotal box — shown first on mobile like Amazon */}
        <aside className="lg:sticky lg:top-[116px] lg:order-2">
          <div className="card p-5">
            {summary.hasStockIssues ? (
              <p className="flex items-start gap-2 text-[13px] text-warn">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Please review the stock notices before checking out.
              </p>
            ) : (
              <p className="flex items-start gap-2 text-[13px] text-success">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Your order is eligible for <span className="font-bold">Cash on Delivery</span> and tracked shipping.
                </span>
              </p>
            )}

            <p className="mt-3 text-lg text-fg">
              Subtotal ({itemLabel}):{" "}
              <span className={`font-bold transition-opacity ${isSyncing ? "opacity-50" : ""}`}>
                {formatPrice(summary.subtotal, summary.currency)}
              </span>
            </p>
            <div className="mt-1 space-y-0.5 text-[13px] text-fg-2">
              <p className="flex justify-between">
                <span>Delivery</span>
                <span>{summary.shipping > 0 ? formatPrice(summary.shipping, summary.currency) : "FREE"}</span>
              </p>
              <p className="flex justify-between font-semibold text-fg">
                <span>Order total</span>
                <span className={isSyncing ? "opacity-50" : ""}>{formatPrice(summary.total, summary.currency)}</span>
              </p>
            </div>

            {summary.hasRestrictedItems && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-brand/30 bg-brand-soft p-2.5 text-[13px] text-fg">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" />
                Your cart has 18+ items. You&apos;ll confirm your age at checkout.
              </p>
            )}

            <Link
              href="/checkout"
              aria-disabled={summary.hasStockIssues}
              className={`btn btn-primary mt-4 w-full ${summary.hasStockIssues ? "pointer-events-none opacity-50" : ""}`}
            >
              Proceed to Buy
            </Link>
            <p className="mt-2 text-center text-xs text-muted">Prices and stock are confirmed when you place your order.</p>
          </div>
        </aside>

        {/* Items */}
        <section className="card p-4 sm:p-6 lg:order-1" aria-label="Shopping cart items">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line pb-3">
            <div>
              <h1 className="text-2xl font-bold text-fg sm:text-3xl">Shopping Cart</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                {!confirmClear ? (
                  <button type="button" onClick={() => setConfirmClear(true)} className="link">
                    Remove all items
                  </button>
                ) : (
                  <span className="flex items-center gap-2 text-fg-2">
                    Remove everything?
                    <button type="button" onClick={clearCart} className="font-semibold text-brand-ink hover:underline">
                      Yes, remove
                    </button>
                    <button type="button" onClick={() => setConfirmClear(false)} className="hover:underline">
                      Cancel
                    </button>
                  </span>
                )}
                <span className="text-line-strong">|</span>
                <button type="button" onClick={() => refreshCart()} disabled={isSyncing} className="link inline-flex items-center gap-1">
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Updating…" : "Refresh prices"}
                </button>
              </div>
            </div>
            <span className="hidden text-sm text-muted sm:block">Price</span>
          </div>

          <ul className="divide-y divide-line">
            {items.map((item) => {
              const isOutOfStock = item.stock <= 0 || item.stockStatus === "out_of_stock" || item.stockStatus === "item_unavailable";
              const isAtMaxStock = item.quantity >= item.stock;
              const lineTotal = item.unitPrice * item.quantity;

              return (
                <li key={item.productId} className="flex gap-3 py-4 sm:gap-5">
                  <Link href={`/products/${item.slug}`} className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:h-44 sm:w-44">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    {item.isRestricted && <span className="chip chip-brand absolute left-1.5 top-1.5">18+</span>}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <Link href={`/products/${item.slug}`} className="line-clamp-2 text-base font-medium text-fg hover:text-brand-ink sm:text-lg">
                        {item.name}
                      </Link>
                      <div className="mt-1 sm:hidden">
                        <Price amount={lineTotal} size="sm" />
                      </div>
                      <p
                        className={`mt-1 text-xs font-medium ${
                          isOutOfStock ? "text-brand-ink" : isAtMaxStock || item.stockStatus === "insufficient_stock" ? "text-warn" : "text-success"
                        }`}
                      >
                        {isOutOfStock
                          ? "Currently unavailable"
                          : item.stockWarning || (isAtMaxStock ? `Only ${item.stock} available` : "In stock")}
                      </p>
                      <p className="mt-0.5 text-xs text-fg-2">Eligible for Cash on Delivery</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatPrice(item.unitPrice, summary.currency)} each · SKU {item.sku}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <div className="flex h-9 items-center rounded-full border-2 border-brand/70 bg-surface">
                          <button
                            type="button"
                            onClick={() => (item.quantity <= 1 ? removeFromCart(item.productId) : decreaseQuantity(item.productId))}
                            aria-label={item.quantity <= 1 ? `Remove ${item.name}` : `Decrease quantity of ${item.name}`}
                            className="flex h-full w-9 items-center justify-center rounded-l-full text-fg transition hover:bg-surface-3"
                          >
                            {item.quantity <= 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                          </button>
                          <span className="min-w-8 text-center text-sm font-bold text-fg" aria-live="polite">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => increaseQuantity(item.productId)}
                            disabled={isAtMaxStock || isOutOfStock}
                            aria-label={`Increase quantity of ${item.name}`}
                            title={isAtMaxStock ? "No more stock available" : undefined}
                            className="flex h-full w-9 items-center justify-center rounded-r-full text-fg transition hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="text-line-strong">|</span>
                        <button type="button" onClick={() => removeFromCart(item.productId)} className="link text-[13px]">
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="hidden text-right sm:block">
                      <Price amount={lineTotal} size="sm" />
                      {item.quantity > 1 && <p className="mt-1 text-xs text-muted">{item.quantity} × {formatPrice(item.unitPrice)}</p>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="border-t border-line pt-3 text-right text-lg text-fg">
            Subtotal ({itemLabel}):{" "}
            <span className={`font-bold ${isSyncing ? "opacity-50" : ""}`}>{formatPrice(summary.subtotal, summary.currency)}</span>
          </p>
        </section>
      </div>

      <RecommendedShelf products={recommended} />
    </div>
  );
}

function RecommendedShelf({ products }: { products: StoreProduct[] }) {
  if (products.length === 0) return null;
  return (
    <ProductShelf title="Customers who shopped here also bought" seeAllHref="/products?sort=rating">
      {products.map((p) => (
        <ShelfItem key={p._id}>
          <ProductCard product={p} variant="compact" />
        </ShelfItem>
      ))}
    </ProductShelf>
  );
}
