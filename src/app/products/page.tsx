"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  Package,
  ShieldAlert,
  Sparkles,
  ShoppingBag,
  Check,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import ProductListingSkeleton from "@/components/skeletons/ProductListingSkeleton";
import { formatPrice } from "@/lib/format";

interface IProduct {
  _id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice?: number;
  stock: number;
  category: { _id: string; name: string; slug: string; isRestricted: boolean } | string;
  brand?: string;
  sku: string;
  images: Array<{ url: string; altText?: string; isPrimary: boolean }>;
  status: string;
  isFeatured: boolean;
  isRestricted: boolean;
  ageRequirement?: number;
}

interface ICategory {
  _id: string;
  name: string;
  slug: string;
  isRestricted: boolean;
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "";
  const initialStatus = searchParams.get("status") || "";

  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [restrictedFilter, setRestrictedFilter] = useState("");

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        if (data.success && data.data?.categories) {
          setCategories(data.data.categories);
        }
      } catch (err) {
        console.error("Failed loading categories", err);
      }
    }
    loadCategories();
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (initialStatus) params.set("status", initialStatus);
      if (restrictedFilter) params.set("isRestricted", restrictedFilter);
      if (searchQuery) params.set("search", searchQuery);
      if (sortBy) params.set("sort", sortBy);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data?.products) {
        setProducts(data.data.products);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Failed loading products", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, initialStatus, restrictedFilter, searchQuery, sortBy]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 text-xs font-semibold text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" /> Official Collector Catalog
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Authentic Anime Figures & Replicas
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Browse genuine scale statues, limited collectibles, and ornamental katana replicas with verified compliance.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search characters, scale figures, katanas..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} {c.isRestricted ? "(18+ Restricted)" : ""}
              </option>
            ))}
          </select>

          <select
            value={restrictedFilter}
            onChange={(e) => setRestrictedFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          >
            <option value="">All Products</option>
            <option value="true">18+ Restricted Only</option>
            <option value="false">Standard Products</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          >
            <option value="newest">Newest Arrivals</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name">Product Name</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <ProductListingSkeleton />
      ) : products.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <Package className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Figures Found</h3>
          <p className="text-xs text-slate-500 mt-1">Try resetting your category or search filter.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("");
              setRestrictedFilter("");
              setSearchQuery("");
            }}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => {
            const primaryImg =
              p.images?.find((img) => img.isPrimary)?.url ||
              p.images?.[0]?.url ||
              "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600";

            const discountPercent = p.discountPrice
              ? Math.round(((p.price - p.discountPrice) / p.price) * 100)
              : 0;

            return (
              <Link
                key={p._id}
                href={`/products/${p.slug || p._id}`}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Image Container */}
                <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={primaryImg}
                    alt={p.name}
                    className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
                  />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    {discountPercent > 0 && (
                      <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-md">
                        {discountPercent}% OFF
                      </span>
                    )}
                    {p.isRestricted && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-md">
                        <ShieldAlert className="h-3 w-3" /> 18+ Restricted
                      </span>
                    )}
                  </div>

                  {p.stock <= 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
                      <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white uppercase tracking-wider">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Info */}
                <div className="flex flex-1 flex-col p-5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{p.brand || "FiguresWorld Exclusive"}</span>
                    <span className="font-mono text-[10px]">{p.sku}</span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 line-clamp-2 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {p.name}
                  </h3>

                  <div className="mt-auto pt-2 flex items-baseline justify-between">
                    <div>
                      {p.discountPrice ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-black text-slate-900 dark:text-white">
                            {formatPrice(p.discountPrice)}
                          </span>
                          <span className="text-xs text-slate-400 line-through">
                            {formatPrice(p.price)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          {formatPrice(p.price)}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.stock > 10
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : p.stock > 0
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      {p.stock > 0 ? `${p.stock} in stock` : "Sold Out"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductListingSkeleton />}>
      <ProductsContent />
    </Suspense>
  );
}
