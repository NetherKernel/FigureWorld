"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  Check,
  ChevronRight,
  Lock,
  MapPin,
  PackageCheck,
  RotateCcw,
  Share2,
  ShieldAlert,
  Truck,
} from "lucide-react";
import ProductDetailSkeleton from "@/components/skeletons/ProductDetailSkeleton";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductShelf, ShelfItem } from "@/components/product/ProductShelf";
import { Price } from "@/components/ui/Price";
import { StarRating } from "@/components/ui/StarRating";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import { DELIVERY_PIN_KEY, useStoredValue } from "@/lib/use-stored-value";
import {
  FALLBACK_PRODUCT_IMAGE,
  StoreProduct,
  deliveryDate,
  discountPercent,
  effectivePrice,
  hasDiscount,
} from "@/lib/product-view";

interface ICategory {
  _id: string;
  name: string;
  slug: string;
  isRestricted: boolean;
  complianceRequirements?: {
    minAge: number;
    requiresIdVerification: boolean;
    disclaimerText: string;
    restrictedRegions: string[];
  };
}

export default function ProductDetailPage() {
  const routeParams = useParams();
  const router = useRouter();
  const idOrSlug = routeParams.id as string;
  const { addToCart } = useCart();

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [category, setCategory] = useState<ICategory | null>(null);
  const [related, setRelated] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [busy, setBusy] = useState<"cart" | "buy" | null>(null);
  const [added, setAdded] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [pin] = useStoredValue(DELIVERY_PIN_KEY);

  useEffect(() => {
    if (!idOrSlug) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/products/${idOrSlug}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success && data.data?.product) {
          const p: StoreProduct = data.data.product;
          setProduct(p);
          setCategory(data.data.category || null);
          const primaryIdx = p.images?.findIndex((img) => img.isPrimary) ?? -1;
          setActiveImageIndex(primaryIdx >= 0 ? primaryIdx : 0);
          document.title = `${p.name} | Figure World`;

          // Related items from the same category
          const catId = typeof p.category === "string" ? p.category : p.category?._id;
          if (catId) {
            const relRes = await fetch(`/api/products?category=${catId}&limit=12`);
            const relJson = await relRes.json();
            if (!cancelled && relJson.success) {
              setRelated((relJson.data.products as StoreProduct[]).filter((r) => r._id !== p._id));
            }
          }
        } else {
          setError(data.error?.message || data.message || "Product not found");
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "Failed to load product details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idOrSlug]);

  if (loading) {
    return (
      <div className="py-6">
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
        <AlertTriangle className="h-12 w-12 text-brand-ink" strokeWidth={1.5} />
        <h1 className="mt-3 text-2xl font-bold text-fg">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-sm text-fg-2">
          {error && error !== "Product not found" ? error : "The collectible you are looking for may have sold out, been archived or moved."}
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/products" className="btn btn-primary">
            Continue shopping
          </Link>
          <Link href="/" className="btn btn-secondary">
            Go to homepage
          </Link>
        </div>
      </div>
    );
  }

  const isRestrictedItem = Boolean(product.isRestricted || category?.isRestricted);
  const ageReq = product.ageRequirement || category?.complianceRequirements?.minAge || 18;
  const restrictedRegions =
    (product.shippingRestrictions && product.shippingRestrictions.length > 0
      ? product.shippingRestrictions
      : category?.complianceRequirements?.restrictedRegions) || [];
  const legalDisclaimer =
    category?.complianceRequirements?.disclaimerText ||
    "This product is subject to local laws. The buyer must be of legal age to purchase it.";

  const off = discountPercent(product);
  const price = effectivePrice(product);
  const inStock = product.stock > 0;
  const blocked = !inStock || (isRestrictedItem && !ageConfirmed);
  const maxQty = Math.min(product.stock, 10);
  const etaDays = isRestrictedItem ? 5 : 3;

  const isLargeProduct =
    Boolean(product.weight && product.weight >= 2000) ||
    Boolean(
      product.tags?.some((t: string) =>
        ["statue", "resin", "diorama", "large-statue"].includes(t.toLowerCase())
      )
    ) ||
    (product.name || "").toLowerCase().includes("statue") ||
    (product.name || "").toLowerCase().includes("diorama") ||
    (product.name || "").toLowerCase().includes("3-sword complete set");

  const productDeliveryFee = isLargeProduct ? 299 : 180;
  const deliveryTierLabel = isLargeProduct ? "Large Weight / Statue" : "Light Weight Order";

  const imagesList =
    product.images && product.images.length > 0
      ? product.images
      : [{ url: FALLBACK_PRODUCT_IMAGE, altText: product.name, isPrimary: true }];

  const specRows: Array<[string, string | number | undefined]> = [
    ["Brand", product.brand],
    ["Series", product.series],
    ["Scale", product.specifications?.scale],
    ["Material", product.specifications?.material],
    ["Height", product.specifications?.heightCm ? `${product.specifications.heightCm} cm` : undefined],
    ["Manufacturer", product.specifications?.manufacturer],
    ["Country of origin", product.specifications?.originCountry],
    ["Release year", product.specifications?.releaseYear],
    [
      "Package dimensions",
      product.dimensions && (product.dimensions.length || product.dimensions.width || product.dimensions.height)
        ? `${product.dimensions.length} × ${product.dimensions.width} × ${product.dimensions.height} ${product.dimensions.unit || "cm"}`
        : undefined,
    ],
    ["Item weight", product.weight ? `${product.weight} g` : undefined],
    ["Item model number (SKU)", product.sku],
  ];
  const visibleSpecs = specRows.filter(([, v]) => v !== undefined && v !== null && v !== "");

  const bullets = (product.description || "")
    .split(/\n+|(?<=\.)\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3)
    .slice(0, 6);

  const handleAdd = async (mode: "cart" | "buy") => {
    if (blocked || busy) return;
    setBusy(mode);
    const ok = await addToCart(product, quantity);
    setBusy(null);
    if (!ok) return;
    if (mode === "buy") {
      router.push("/checkout");
    } else {
      setAdded(true);
      window.setTimeout(() => setAdded(false), 2500);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMsg("Link copied");
    } catch {
      setShareMsg("");
      return;
    }
    window.setTimeout(() => setShareMsg(""), 2000);
  };

  const categoryName = category?.name;
  const categorySlug = category?.slug;

  return (
    <div className="bg-surface pb-10">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mx-auto max-w-[1500px] px-3 pt-3 sm:px-4">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
          <li>
            <Link href="/" className="hover:text-brand-ink hover:underline">
              Home
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li>
            <Link href="/products" className="hover:text-brand-ink hover:underline">
              All products
            </Link>
          </li>
          {categoryName && (
            <>
              <ChevronRight className="h-3 w-3" />
              <li>
                <Link href={`/products?category=${categorySlug}`} className="hover:text-brand-ink hover:underline">
                  {categoryName}
                </Link>
              </li>
            </>
          )}
        </ol>
      </nav>

      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-x-8 gap-y-4 px-3 pt-4 [grid-template-areas:'head'_'gallery'_'buy'_'body'] sm:px-4 md:grid-cols-2 md:[grid-template-areas:'gallery_head'_'gallery_buy'_'body_body'] lg:grid-cols-[minmax(0,5fr)_minmax(0,5fr)_minmax(260px,3fr)] lg:grid-rows-[auto_1fr] lg:[grid-template-areas:'gallery_head_buy'_'gallery_body_buy']">
        {/* ---------- Gallery ---------- */}
        <div className="[grid-area:gallery] md:sticky md:top-[116px] md:self-start">
          <Gallery
            images={imagesList}
            active={activeImageIndex}
            onSelect={setActiveImageIndex}
            name={product.name}
            badges={
              <>
                {off > 0 && <span className="chip chip-brand">-{off}%</span>}
                {isRestrictedItem && (
                  <span className="chip bg-black/80 text-white">
                    <ShieldAlert className="h-3 w-3" /> {ageReq}+
                  </span>
                )}
              </>
            }
          />
          <div className="mt-3 flex justify-center">
            <button type="button" onClick={handleShare} className="btn btn-ghost btn-sm">
              <Share2 className="h-4 w-4" /> {shareMsg || "Share"}
            </button>
          </div>
        </div>

        {/* ---------- Title ---------- */}
        <div className="min-w-0 [grid-area:head]">
          <h1 className="text-xl font-medium leading-snug text-fg sm:text-2xl">{product.name}</h1>
          {product.brand && (
            <Link href={`/products?search=${encodeURIComponent(product.brand)}`} className="link mt-1 inline-block text-sm">
              Visit the {product.brand} Store
            </Link>
          )}
          {(product.reviewsCount ?? 0) > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <StarRating rating={product.ratingAverage} count={product.reviewsCount} showValue size="md" />
              <span className="text-sm text-muted">ratings</span>
            </div>
          )}
          {product.isFeatured && (
            <span className="mt-2 flex w-fit items-center gap-1 rounded-sm bg-fg px-2 py-0.5 text-xs font-bold text-bg">
              Figure World&apos;s <span className="text-brand">Choice</span>
            </span>
          )}
        </div>

        {/* ---------- Details ---------- */}
        <div className="min-w-0 [grid-area:body]">
          {/* Price is shown in the buy box on smaller screens */}
          <div className="hidden lg:block">
          <hr className="mb-3 border-line" />

          {off > 0 && <span className="rounded-sm bg-brand px-2 py-1 text-xs font-bold text-white">Limited time deal</span>}
          <div className="mt-2 flex flex-wrap items-start gap-2">
            {off > 0 && <span className="text-3xl font-light text-brand-ink">-{off}%</span>}
            <Price amount={price} size="xl" />
          </div>
          {hasDiscount(product) && (
            <p className="mt-1 text-sm text-muted">
              M.R.P.: <span className="line-through">{formatPrice(product.price)}</span>
            </p>
          )}
          <p className="mt-1 text-sm text-fg">Inclusive of all taxes</p>
          {product.status === "preorder" && <p className="mt-2 chip chip-soft">Pre-order — ships on release</p>}
          </div>

          {/* Offer/feature icons */}
          <div className="no-scrollbar mt-4 flex gap-4 overflow-x-auto border-y border-line py-4">
            {[
              { icon: Banknote, label: "Cash on Delivery" },
              { icon: Truck, label: "Tracked Delivery" },
              { icon: BadgeCheck, label: "100% Authentic" },
              { icon: PackageCheck, label: "Collector Packing" },
              { icon: Lock, label: "Secure transaction" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex w-[74px] shrink-0 flex-col items-center gap-1.5 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] leading-tight text-brand-ink">{label}</span>
              </div>
            ))}
          </div>

          {visibleSpecs.length > 0 && (
            <table className="mt-4 w-full text-sm">
              <tbody>
                {visibleSpecs.slice(0, 5).map(([k, v]) => (
                  <tr key={k}>
                    <th className="w-2/5 py-1 pr-3 text-left align-top font-bold text-fg">{k}</th>
                    <td className="py-1 text-fg-2">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {bullets.length > 0 && (
            <>
              <hr className="my-4 border-line" />
              <h2 className="text-base font-bold text-fg">About this item</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-fg">
                {bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </>
          )}

          {isRestrictedItem && (
            <div className="mt-5 rounded-lg border border-brand/30 bg-brand-soft p-4">
              <p className="flex items-center gap-2 font-bold text-brand-ink">
                <ShieldAlert className="h-5 w-5 shrink-0" /> Age-restricted product ({ageReq}+)
              </p>
              <p className="mt-1.5 text-sm text-fg-2">{legalDisclaimer}</p>
              {restrictedRegions.length > 0 && (
                <p className="mt-2 text-sm text-fg-2">
                  <span className="font-semibold text-fg">Cannot be delivered to:</span> {restrictedRegions.join(", ")}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ---------- Buy box ---------- */}
        <aside className="[grid-area:buy]">
          <div className="rounded-xl border border-line p-4 shadow-card lg:sticky lg:top-[116px]">
            {off > 0 && (
              <span className="mb-2 inline-block rounded-sm bg-brand px-2 py-1 text-xs font-bold text-white lg:hidden">
                Limited time deal
              </span>
            )}
            <div className="flex flex-wrap items-start gap-2">
              {off > 0 && <span className="text-2xl font-light text-brand-ink lg:hidden">-{off}%</span>}
              <Price amount={price} size="lg" />
            </div>
            {hasDiscount(product) && (
              <p className="mt-1 text-sm text-muted lg:hidden">
                M.R.P.: <span className="line-through">{formatPrice(product.price)}</span> · Inclusive of all taxes
              </p>
            )}
            <p className="mt-2 text-sm text-fg">
              {formatPrice(productDeliveryFee)} delivery <span className="font-bold">{deliveryDate(etaDays)}</span>.
            </p>
            <p className="text-xs text-muted">
              {deliveryTierLabel} · Fast delivery across India
            </p>
            <p className="mt-2 flex items-start gap-1 text-[13px] text-brand-ink">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              {pin ? `Delivering to India ${pin}` : "Delivering across India"}
            </p>

            <p className={`mt-3 text-lg font-medium ${inStock ? (product.stock <= 5 ? "text-brand-ink" : "text-success") : "text-brand-ink"}`}>
              {inStock ? (product.stock <= 5 ? `Only ${product.stock} left in stock.` : "In stock") : "Currently unavailable."}
            </p>

            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13px]">
              <dt className="text-muted">Ships from</dt>
              <dd className="text-fg">Figure World</dd>
              <dt className="text-muted">Sold by</dt>
              <dd className="text-fg">Figure World</dd>
              <dt className="text-muted">Payment</dt>
              <dd className="text-fg">UPI / Cash on Delivery</dd>
            </dl>

            {isRestrictedItem && inStock && (
              <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg border border-brand/30 bg-brand-soft p-3 text-[13px] text-fg">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--brand)]"
                />
                <span>
                  I confirm I am at least <strong>{ageReq} years old</strong> and allowed to buy ornamental replicas
                  where I live.
                </span>
              </label>
            )}

            {inStock && (
              <label className="mt-4 flex items-center gap-2 text-sm text-fg">
                <span>Quantity:</span>
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="input h-9 w-20 cursor-pointer rounded-lg bg-surface-2 py-1"
                >
                  {Array.from({ length: maxQty }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                disabled={blocked || busy !== null}
                onClick={() => handleAdd("cart")}
                className={`btn w-full ${added ? "bg-success text-white" : "btn-primary"}`}
                title={isRestrictedItem && !ageConfirmed ? "Confirm your age to continue" : undefined}
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" /> Added to Cart
                  </>
                ) : busy === "cart" ? (
                  "Adding…"
                ) : (
                  "Add to Cart"
                )}
              </button>
              <button
                type="button"
                disabled={blocked || busy !== null}
                onClick={() => handleAdd("buy")}
                className="btn btn-dark w-full"
              >
                {busy === "buy" ? "Please wait…" : "Buy Now"}
              </button>
              {isRestrictedItem && !ageConfirmed && inStock && (
                <p className="text-center text-xs text-brand-ink">Please confirm your age above to continue.</p>
              )}
            </div>

            <div className="mt-4 space-y-2 border-t border-line pt-3 text-[13px] text-fg-2">
              <p className="flex items-center gap-2">
                <Lock className="h-4 w-4 shrink-0 text-muted" /> Secure transaction
              </p>
              <p className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 shrink-0 text-muted" /> Free replacement if it arrives damaged
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* ---------- Description & details ---------- */}
      <div className="mx-auto mt-8 max-w-[1500px] space-y-8 px-3 sm:px-4">
        <hr className="border-line" />
        <section className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="section-title">Product description</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-fg">{product.description}</p>
          </div>
          {visibleSpecs.length > 0 && (
            <div>
              <h2 className="section-title">Product information</h2>
              <table className="mt-3 w-full overflow-hidden rounded-lg border border-line text-sm">
                <tbody>
                  {visibleSpecs.map(([k, v]) => (
                    <tr key={k} className="border-b border-line last:border-b-0">
                      <th className="w-2/5 bg-surface-2 px-3 py-2 text-left font-semibold text-fg">{k}</th>
                      <td className="px-3 py-2 text-fg-2">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {related.length > 0 && (
          <ProductShelf title="Products related to this item" seeAllHref={categorySlug ? `/products?category=${categorySlug}` : "/products"}>
            {related.map((p) => (
              <ShelfItem key={p._id}>
                <ProductCard product={p} variant="compact" />
              </ShelfItem>
            ))}
          </ProductShelf>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gallery: vertical thumbnails + hover zoom (desktop), swipe (mobile) */
/* ------------------------------------------------------------------ */

function Gallery({
  images,
  active,
  onSelect,
  name,
  badges,
}: {
  images: Array<{ url: string; altText?: string }>;
  active: number;
  onSelect: (i: number) => void;
  name: string;
  badges: React.ReactNode;
}) {
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const touchX = useRef<number | null>(null);
  const current = images[active] || images[0];

  return (
    <div className="flex gap-3">
      {images.length > 1 && (
        <div className="hidden flex-col gap-2 sm:flex">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onMouseEnter={() => onSelect(i)}
              onClick={() => onSelect(i)}
              aria-label={`Show image ${i + 1}`}
              className={`h-14 w-14 overflow-hidden rounded-md border-2 transition ${
                i === active ? "border-brand shadow-[0_0_0_3px_var(--brand-ring)]" : "border-line hover:border-line-strong"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div
          className="relative aspect-square cursor-zoom-in overflow-hidden rounded-lg bg-surface-2"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 40) onSelect((active + (dx < 0 ? 1 : -1) + images.length) % images.length);
            touchX.current = null;
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={current.url}
            src={current.url}
            alt={current.altText || name}
            className="h-full w-full animate-fade-in object-cover transition-transform duration-200 ease-out"
            style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            draggable={false}
          />
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1">{badges}</div>
          {!zoom && (
            <span className="pointer-events-none absolute bottom-3 right-3 hidden rounded-full bg-black/55 px-2.5 py-1 text-[11px] text-white md:block">
              Roll over image to zoom in
            </span>
          )}
        </div>

        {images.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5 sm:hidden">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`Show image ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === active ? "w-5 bg-brand" : "w-2 bg-line-strong"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
