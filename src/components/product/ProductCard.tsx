"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, ShieldAlert, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Price } from "@/components/ui/Price";
import { StarRating } from "@/components/ui/StarRating";
import { formatPrice } from "@/lib/format";
import {
  StoreProduct,
  deliveryDate,
  discountPercent,
  effectivePrice,
  hasDiscount,
  primaryImage,
  productHref,
} from "@/lib/product-view";

interface ProductCardProps {
  product: StoreProduct;
  /** "grid" = search-results card, "compact" = carousel shelf card */
  variant?: "grid" | "compact";
  className?: string;
}

export function ProductCard({ product: p, variant = "grid", className = "" }: ProductCardProps) {
  const { addToCart } = useCart();
  const [state, setState] = useState<"idle" | "adding" | "added">("idle");

  const off = discountPercent(p);
  const price = effectivePrice(p);
  const outOfStock = p.stock <= 0;
  const lowStock = !outOfStock && p.stock <= 5;
  const href = productHref(p);
  const compact = variant === "compact";

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (state !== "idle") return;
    setState("adding");
    const ok = await addToCart(p, 1);
    setState(ok ? "added" : "idle");
    if (ok) window.setTimeout(() => setState("idle"), 1800);
  };

  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-shadow duration-200 hover:shadow-pop ${className}`}
    >
      <Link href={href} className="relative block aspect-square overflow-hidden bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={primaryImage(p)}
          alt={p.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {off > 0 && <span className="chip chip-brand shadow-sm">-{off}%</span>}
          {p.isRestricted && (
            <span className="chip bg-black/80 text-white backdrop-blur-sm">
              <ShieldAlert className="h-3 w-3" /> 18+
            </span>
          )}
        </div>
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-black">Currently unavailable</span>
          </div>
        )}
      </Link>

      <div className={`flex flex-1 flex-col ${compact ? "gap-1 p-3" : "gap-1.5 p-3 sm:p-4"}`}>
        {!compact && p.brand && (
          <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted">{p.brand}</span>
        )}

        <Link
          href={href}
          className={`line-clamp-2 font-medium leading-snug text-fg transition-colors hover:text-brand-ink ${
            compact ? "text-[13px]" : "text-sm"
          }`}
        >
          {p.name}
        </Link>

        {(p.reviewsCount ?? 0) > 0 && <StarRating rating={p.ratingAverage} count={p.reviewsCount} />}

        {off > 0 && !compact && (
          <span className="mt-0.5 w-fit rounded-sm bg-brand px-1.5 py-0.5 text-[11px] font-bold text-white">
            Limited time deal
          </span>
        )}

        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <Price amount={price} size={compact ? "sm" : "md"} />
          {hasDiscount(p) && (
            <span className="text-xs text-muted">
              M.R.P: <span className="line-through">{formatPrice(p.price)}</span>
            </span>
          )}
        </div>

        {!compact && !outOfStock && (
          <p className="text-xs text-fg-2">
            Get it by <span className="font-bold text-fg">{deliveryDate(p.isRestricted ? 5 : 3)}</span>
          </p>
        )}

        {lowStock && <p className="text-xs font-medium text-brand-ink">Only {p.stock} left in stock.</p>}

        <div className="mt-auto pt-2">
          {outOfStock ? (
            <Link href={href} className="btn btn-secondary btn-sm w-full">
              See details
            </Link>
          ) : p.isRestricted ? (
            <Link href={href} className="btn btn-secondary btn-sm w-full" title="Age confirmation required on product page">
              See options
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              disabled={state === "adding"}
              aria-live="polite"
              className={`btn btn-sm w-full ${state === "added" ? "bg-success text-white" : "btn-primary"}`}
            >
              {state === "added" ? (
                <>
                  <Check className="h-4 w-4" /> Added
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" /> {state === "adding" ? "Adding…" : "Add to cart"}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
