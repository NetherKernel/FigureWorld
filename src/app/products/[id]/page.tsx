"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  Heart,
  Share2,
  Truck,
  RotateCcw,
  Check,
  ChevronRight,
  PackageCheck,
  Ruler,
  Weight,
  Sparkles,
  Lock,
} from "lucide-react";
import ProductDetailSkeleton from "@/components/skeletons/ProductDetailSkeleton";

interface IProduct {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number;
  stock: number;
  category: { _id: string; name: string; slug: string; isRestricted: boolean } | string;
  brand?: string;
  sku: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  images: Array<{ url: string; altText?: string; isPrimary: boolean }>;
  status: string;
  isFeatured: boolean;
  isRestricted: boolean;
  ageRequirement?: number;
  shippingRestrictions?: string[];
}

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
  const idOrSlug = routeParams.id as string;

  const [product, setProduct] = useState<IProduct | null>(null);
  const [category, setCategory] = useState<ICategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Cart & Compliance acknowledgment
  const [quantity, setQuantity] = useState(1);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [addedToCartToast, setAddedToCartToast] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/${idOrSlug}`);
        const data = await res.json();

        if (data.success && data.data?.product) {
          setProduct(data.data.product);
          setCategory(data.data.category || null);
          // Set initial image
          const primaryIdx = data.data.product.images?.findIndex((img: any) => img.isPrimary);
          setActiveImageIndex(primaryIdx >= 0 ? primaryIdx : 0);
        } else {
          setError(data.message || "Product not found");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load product details");
      } finally {
        setLoading(false);
      }
    }
    if (idOrSlug) {
      loadProduct();
    }
  }, [idOrSlug]);

  const handleAddToCart = () => {
    if (isRestrictedItem && !ageConfirmed) return;
    setAddedToCartToast(true);
    setTimeout(() => setAddedToCartToast(false), 3000);
  };

  if (loading) {
    return (
      <main className="min-h-screen py-8">
        <ProductDetailSkeleton />
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-rose-500 mb-3" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Product Not Found</h1>
        <p className="mt-2 text-sm text-slate-500">
          {error || "The collectible you are looking for may have been archived or moved."}
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-700"
        >
          Return to Catalog
        </Link>
      </main>
    );
  }

  const isRestrictedItem = product.isRestricted || category?.isRestricted;
  const ageReq = product.ageRequirement || category?.complianceRequirements?.minAge || 18;
  const restrictedRegions =
    (product.shippingRestrictions && product.shippingRestrictions.length > 0
      ? product.shippingRestrictions
      : category?.complianceRequirements?.restrictedRegions) || [];
  const legalDisclaimer =
    category?.complianceRequirements?.disclaimerText ||
    "Notice: This product is subject to local compliance laws. Buyer must be of legal age.";

  const discountPercent = product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  const imagesList = product.images && product.images.length > 0
    ? product.images
    : [{ url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800", altText: product.name, isPrimary: true }];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-6">
        <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <Link href="/products" className="hover:text-indigo-600 dark:hover:text-indigo-400">
          Store Catalog
        </Link>
        {category && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-700 dark:text-slate-300 font-semibold">{category.name}</span>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-900 dark:text-white font-bold truncate max-w-xs">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Left Column: Image Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <img
              src={imagesList[activeImageIndex]?.url || imagesList[0]?.url}
              alt={imagesList[activeImageIndex]?.altText || product.name}
              className="h-full w-full object-cover object-center"
            />

            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {discountPercent > 0 && (
                <span className="rounded-full bg-rose-600 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-md">
                  {discountPercent}% OFF
                </span>
              )}
              {isRestrictedItem && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-md">
                  <ShieldAlert className="h-3.5 w-3.5" /> {ageReq}+ RESTRICTED
                </span>
              )}
            </div>
          </div>

          {/* Gallery Thumbnails */}
          {imagesList.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {imagesList.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition ${
                    activeImageIndex === idx
                      ? "border-indigo-600 shadow-md ring-2 ring-indigo-500/30"
                      : "border-slate-200 opacity-70 hover:opacity-100 dark:border-slate-800"
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.altText || `Thumbnail ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Metadata & Buy Box */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              {product.brand && <span>{product.brand}</span>}
              <span>•</span>
              <span className="font-mono text-slate-500">SKU: {product.sku}</span>
            </div>

            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {product.name}
            </h1>
          </div>

          {/* Pricing Box */}
          <div className="flex items-baseline gap-3">
            {product.discountPrice ? (
              <>
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  ${product.discountPrice.toFixed(2)}
                </span>
                <span className="text-lg font-semibold text-slate-400 line-through">
                  ${product.price.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md">
                  Save ${(product.price - product.discountPrice).toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                ${product.price.toFixed(2)}
              </span>
            )}
          </div>

          {/* COMPLIANCE WARNING BANNER FOR RESTRICTED PRODUCTS */}
          {isRestrictedItem && (
            <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/80 p-5 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/30 space-y-3">
              <div className="flex items-center gap-2.5 font-bold text-rose-800 dark:text-rose-300">
                <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600" />
                <span className="text-sm">18+ Legal Compliance & Restricted Product Notice</span>
              </div>

              <p className="text-xs text-rose-900/90 dark:text-rose-200/90 leading-relaxed">
                {legalDisclaimer}
              </p>

              {restrictedRegions.length > 0 && (
                <div className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 pt-2 border-t border-rose-200/60 dark:border-rose-900/40">
                  <span>Restricted Delivery Zones: </span>
                  <span className="font-mono text-rose-950 dark:text-rose-100">
                    Cannot ship to: {restrictedRegions.join(", ")}
                  </span>
                </div>
              )}

              {/* Age Verification Gate Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-rose-900 font-semibold dark:text-rose-200">
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span>
                    I certify that I am at least {ageReq} years of age and eligible to purchase ornamental collector weapons/restricted items under local laws.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Stock & Availability */}
          <div className="flex items-center gap-3 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 font-bold px-3 py-1 rounded-full ${
                product.stock > 10
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : product.stock > 0
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${product.stock > 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
              {product.stock > 0 ? `In Stock (${product.stock} units available)` : "Out of Stock"}
            </span>

            {product.status === "preorder" && (
              <span className="font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full">
                Pre-Order
              </span>
            )}
          </div>

          {/* Quantity and Add to Cart */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3.5 py-2.5 font-bold text-slate-600 hover:text-indigo-600"
                >
                  -
                </button>
                <span className="px-3 font-semibold text-xs text-slate-900 dark:text-white">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-3.5 py-2.5 font-bold text-slate-600 hover:text-indigo-600"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                disabled={product.stock === 0 || (isRestrictedItem && !ageConfirmed)}
                onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ShoppingBag className="h-4 w-4" />
                {isRestrictedItem && !ageConfirmed
                  ? "Age Verification Required"
                  : product.stock === 0
                  ? "Out of Stock"
                  : "Add to Cart"}
              </button>

              <button
                type="button"
                className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <Heart className="h-5 w-5" />
              </button>
            </div>

            {addedToCartToast && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 animate-fade-in">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Added {quantity} unit(s) of "{product.name}" to cart!</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Product Overview
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>

          {/* Physical Specifications Grid */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-xs dark:border-slate-800 dark:bg-slate-900/60 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white">Collector Specifications</h3>
            <div className="grid grid-cols-2 gap-3 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Weight className="h-4 w-4 text-indigo-500" />
                <span>Weight: <strong className="text-slate-900 dark:text-white">{product.weight}g</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-indigo-500" />
                <span>
                  Dimensions:{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {product.dimensions?.length || 0} x {product.dimensions?.width || 0} x {product.dimensions?.height || 0} {product.dimensions?.unit || "cm"}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Assurance badges */}
          <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>100% Authentic Japanese Import</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-indigo-500 shrink-0" />
              <span>Padded Collector Box Shipping</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
