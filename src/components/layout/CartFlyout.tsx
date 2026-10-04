"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";

const AUTO_DISMISS_MS = 5000;

/** Amazon-style "Added to Cart" confirmation that slides in after any add-to-cart. */
export function CartFlyout() {
  const { lastAdded, dismissLastAdded, summary, isSyncing } = useCart();
  const pathname = usePathname();

  useEffect(() => {
    if (!lastAdded) return;
    const t = window.setTimeout(dismissLastAdded, AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [lastAdded, dismissLastAdded]);

  // Close on route change
  useEffect(() => {
    dismissLastAdded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!lastAdded || pathname?.startsWith("/cart") || pathname?.startsWith("/checkout")) return null;

  const { item, quantity } = lastAdded;

  return (
    <div
      role="status"
      aria-live="polite"
      key={lastAdded.at}
      className="fixed inset-x-3 bottom-3 z-[60] animate-fade-up sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-[124px] sm:w-[380px] sm:animate-slide-in-right"
    >
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
        <div className="flex items-start gap-3 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image} alt="" className="h-16 w-16 shrink-0 rounded-md border border-line object-cover" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[15px] font-bold text-success">
              <CheckCircle2 className="h-5 w-5" /> Added to cart
            </p>
            <p className="mt-0.5 line-clamp-1 text-sm text-fg-2">
              {quantity > 1 ? `${quantity} × ` : ""}
              {item.name}
            </p>
            <p className="mt-1 text-sm text-fg">
              Cart subtotal ({summary.itemCount} {summary.itemCount === 1 ? "item" : "items"}):{" "}
              <span className={`font-bold ${isSyncing ? "opacity-50" : ""}`}>{formatPrice(summary.subtotal)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={dismissLastAdded}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-full p-1 text-muted transition hover:bg-surface-3 hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-line bg-surface-2 p-3">
          <Link href="/checkout" className="btn btn-primary btn-sm">
            Proceed to Buy
          </Link>
          <Link href="/cart" className="btn btn-secondary btn-sm">
            Go to Cart
          </Link>
        </div>
        <div className="h-1 bg-surface-3">
          <div
            className="h-full origin-left bg-brand"
            style={{ animation: `shrink-x ${AUTO_DISMISS_MS}ms linear forwards` }}
          />
        </div>
      </div>
    </div>
  );
}

export default CartFlyout;
