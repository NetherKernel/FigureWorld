"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, SearchX, SlidersHorizontal, Star, X, Flame, Sparkles } from "lucide-react";
import ProductListingSkeleton from "@/components/skeletons/ProductListingSkeleton";
import ProductCardSkeleton from "@/components/skeletons/ProductCardSkeleton";
import { ProductCard } from "@/components/product/ProductCard";
import { STORE_CATEGORIES, StoreProduct } from "@/lib/product-view";

const PAGE_SIZE = 24;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest Arrivals" },
  { value: "rating", label: "Avg. Customer Review" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Name: A to Z" },
];

const PRICE_RANGES = [
  { label: "Under ₹500", min: "", max: "500" },
  { label: "₹500 – ₹1,000", min: "500", max: "1000" },
  { label: "₹1,000 – ₹2,500", min: "1000", max: "2500" },
  { label: "₹2,500 – ₹5,000", min: "2500", max: "5000" },
  { label: "Over ₹5,000", min: "5000", max: "" },
];

/** Query keys that the results page understands (everything else is ignored). */
const FILTER_KEYS = ["search", "category", "subcategory", "isRestricted", "onSale", "inStock", "minRating", "minPrice", "maxPrice", "sort", "page"] as const;

function ProductsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const search = params.get("search") || "";
  const category = params.get("category") || "";
  const subcategory = params.get("subcategory") || "";
  const sort = params.get("sort") || "newest";
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const queryString = params.toString();

  /** Update one or more URL params; any filter change resets to page 1. */
  const setParams = useCallback(
    (updates: Record<string, string | null>, opts: { keepPage?: boolean } = {}) => {
      const next = new URLSearchParams(queryString);
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (!opts.keepPage) next.delete("page");
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: opts.keepPage ? true : false });
    },
    [queryString, pathname, router]
  );

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const api = new URLSearchParams();
        const current = new URLSearchParams(queryString);
        for (const key of FILTER_KEYS) {
          const v = current.get(key);
          if (v) api.set(key, v);
        }
        api.set("limit", String(PAGE_SIZE));
        const res = await fetch(`/api/products?${api}`, { signal: controller.signal });
        const json = await res.json();
        if (json.success) {
          setProducts(json.data?.products || []);
          setTotal(json.meta?.total ?? json.data?.products?.length ?? 0);
        } else {
          setProducts([]);
          setTotal(0);
          setError(json.error?.message || "We couldn't load results right now.");
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("We couldn't load results right now. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [queryString]);

  // Lock scroll while the mobile filter sheet is open
  useEffect(() => {
    document.body.style.overflow = filtersOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [filtersOpen]);

  const parentCategoryObj = category ? STORE_CATEGORIES.find((c) => c.slug === category) : null;
  const subcategoryObj = subcategory
    ? parentCategoryObj?.subcategories?.find((s) => s.slug === subcategory) ||
      STORE_CATEGORIES.flatMap((c) => c.subcategories || []).find((s) => s.slug === subcategory)
    : null;

  const categoryLabel = subcategoryObj
    ? parentCategoryObj
      ? `${parentCategoryObj.label} › ${subcategoryObj.label}`
      : subcategoryObj.label
    : parentCategoryObj?.label;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  const activeChips: Array<{ label: string; clear: Record<string, null> }> = [];
  if (subcategoryObj) activeChips.push({ label: subcategoryObj.label, clear: { subcategory: null } });
  if (parentCategoryObj) activeChips.push({ label: parentCategoryObj.label, clear: { category: null, subcategory: null } });
  if (params.get("onSale") === "true") activeChips.push({ label: "Today's Deals", clear: { onSale: null } });
  if (params.get("inStock") === "true") activeChips.push({ label: "In stock", clear: { inStock: null } });
  if (params.get("minRating")) activeChips.push({ label: `${params.get("minRating")}★ & up`, clear: { minRating: null } });
  if (params.get("minPrice") || params.get("maxPrice")) {
    const min = params.get("minPrice");
    const max = params.get("maxPrice");
    activeChips.push({
      label: min && max ? `₹${min} – ₹${max}` : min ? `Over ₹${min}` : `Under ₹${max}`,
      clear: { minPrice: null, maxPrice: null },
    });
  }
  if (params.get("isRestricted") === "true") activeChips.push({ label: "18+ replicas only", clear: { isRestricted: null } });
  if (params.get("isRestricted") === "false") activeChips.push({ label: "Hide 18+ items", clear: { isRestricted: null } });

  const clearAll = () => {
    router.push(search ? `${pathname}?search=${encodeURIComponent(search)}` : pathname, { scroll: false });
  };

  const filters = (
    <Filters
      params={params}
      setParams={(u) => {
        setParams(u);
        setFiltersOpen(false);
      }}
    />
  );

  return (
    <div className="pb-10">
      {/* Results bar */}
      <div className="border-b border-line bg-surface shadow-card">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <p className="text-sm text-fg" aria-live="polite">
            {loading ? (
              "Searching…"
            ) : (
              <>
                {total > 0 ? `${from}-${to} of ${total} results` : "No results"}
                {search && (
                  <>
                    {" "}for <span className="font-bold text-brand-ink">&ldquo;{search}&rdquo;</span>
                  </>
                )}
                {categoryLabel && <span className="text-muted"> in {categoryLabel}</span>}
              </>
            )}
          </p>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setFiltersOpen(true)} className="btn btn-secondary btn-sm lg:hidden">
              <SlidersHorizontal className="h-4 w-4" /> Filters
              {activeChips.length > 0 && <span className="chip chip-brand">{activeChips.length}</span>}
            </button>
            <label className="flex items-center gap-2 text-sm">
              <span className="hidden text-fg-2 sm:inline">Sort by:</span>
              <select
                value={sort}
                onChange={(e) => setParams({ sort: e.target.value === "newest" ? null : e.target.value })}
                className="input h-9 w-auto cursor-pointer rounded-full bg-surface-2 py-1.5 pr-8 text-[13px]"
                aria-label="Sort results"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1500px] gap-6 px-3 pt-4 sm:px-4">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 lg:block" aria-label="Filters">
          <div className="no-scrollbar sticky top-[116px] max-h-[calc(100vh-130px)] overflow-y-auto pb-6 pr-1">{filters}</div>
        </aside>

        <section className="min-w-0 flex-1" aria-label="Results">
          {activeChips.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {activeChips.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setParams(c.clear)}
                  className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-surface px-3 py-1 text-[13px] text-fg transition hover:border-brand hover:text-brand-ink"
                >
                  {c.label} <X className="h-3.5 w-3.5" />
                </button>
              ))}
              <button type="button" onClick={clearAll} className="link text-[13px]">
                Clear all
              </button>
            </div>
          )}

          {(parentCategoryObj || subcategoryObj) && (
            <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 text-xs text-muted">
              <Link href="/products" className="hover:text-brand-ink transition">
                All Products
              </Link>
              {parentCategoryObj && (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <Link
                    href={`/products?category=${parentCategoryObj.slug}`}
                    className={`hover:text-brand-ink transition ${!subcategoryObj ? "font-bold text-fg" : ""}`}
                  >
                    {parentCategoryObj.label}
                  </Link>
                </>
              )}
              {subcategoryObj && (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span className="font-bold text-fg">{subcategoryObj.label}</span>
                </>
              )}
            </nav>
          )}

          <h1 className="mb-1 text-xl font-bold text-fg">
            {search
              ? "Results"
              : subcategoryObj
              ? `${subcategoryObj.label}`
              : parentCategoryObj?.label || (params.get("onSale") ? "Today's Deals" : "All products")}
          </h1>
          <p className="mb-4 text-sm text-fg-2">
            Check each product page for other buying options. Price and other details may vary based on product size and
            colour.
          </p>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="card flex flex-col items-center p-10 text-center">
              <p className="font-bold text-fg">Something went wrong</p>
              <p className="mt-1 text-sm text-fg-2">{error}</p>
              <button type="button" onClick={() => router.refresh()} className="btn btn-secondary mt-4">
                Try again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="card flex flex-col items-center p-10 text-center">
              <SearchX className="h-12 w-12 text-muted" strokeWidth={1.5} />
              <p className="mt-3 text-lg font-bold text-fg">
                No results{search ? ` for “${search}”` : ""}.
              </p>
              <p className="mt-1 max-w-md text-sm text-fg-2">
                Try checking your spelling, using more general terms, or removing some filters.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {activeChips.length > 0 && (
                  <button type="button" onClick={clearAll} className="btn btn-primary">
                    Clear filters
                  </button>
                )}
                <Link href="/products" className="btn btn-secondary">
                  Browse all products
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => (
                  <div key={p._id} className="animate-fade-up">
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination page={page} totalPages={totalPages} onChange={(p) => setParams({ page: p === 1 ? null : String(p) }, { keepPage: true })} />
              )}
            </>
          )}
        </section>
      </div>

      {/* Mobile filter sheet */}
      <div className={`fixed inset-0 z-50 lg:hidden ${filtersOpen ? "" : "pointer-events-none"}`} aria-hidden={!filtersOpen}>
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${filtersOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setFiltersOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          className={`absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-surface shadow-pop transition-transform duration-300 [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] ${
            filtersOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-lg font-bold text-fg">Filters</h2>
            <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="rounded-full p-2 text-muted hover:bg-surface-3">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2">{filters}</div>
          <div className="grid grid-cols-2 gap-2 border-t border-line p-3">
            <button
              type="button"
              onClick={() => {
                clearAll();
                setFiltersOpen(false);
              }}
              className="btn btn-secondary"
            >
              Clear all
            </button>
            <button type="button" onClick={() => setFiltersOpen(false)} className="btn btn-primary">
              Show {total} results
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Filters({
  params,
  setParams,
}: {
  params: URLSearchParams | ReturnType<typeof useSearchParams>;
  setParams: (u: Record<string, string | null>) => void;
}) {
  const category = params.get("category") || "";
  const subcategory = params.get("subcategory") || "";
  const minRating = params.get("minRating") || "";
  const minPrice = params.get("minPrice") || "";
  const maxPrice = params.get("maxPrice") || "";
  const restricted = params.get("isRestricted") || "";

  const [min, setMin] = useState(minPrice);
  const [max, setMax] = useState(maxPrice);
  const [syncedRange, setSyncedRange] = useState(`${minPrice}-${maxPrice}`);
  if (syncedRange !== `${minPrice}-${maxPrice}`) {
    setSyncedRange(`${minPrice}-${maxPrice}`);
    setMin(minPrice);
    setMax(maxPrice);
  }

  const optionCls = (active: boolean) =>
    `block w-full rounded px-1 py-1 text-left text-sm transition hover:text-brand-ink ${active ? "font-bold text-fg" : "text-fg-2"}`;

  return (
    <div className="divide-y divide-line text-sm">
      <FilterGroup title="Department">
        <button
          type="button"
          onClick={() => setParams({ category: null, subcategory: null })}
          className={optionCls(!category && !subcategory)}
        >
          {category || subcategory ? "‹ All Departments" : "All Departments"}
        </button>
        {STORE_CATEGORIES.map((c) => {
          const isSelected = category === c.slug;
          const hasSub = (c.subcategories?.length ?? 0) > 0;
          const isParentOfActiveSub = c.subcategories?.some((s) => s.slug === subcategory);
          const showSubcategories = isSelected || isParentOfActiveSub;

          return (
            <div key={c.slug} className="space-y-0.5">
              <button
                type="button"
                onClick={() => setParams({ category: isSelected ? null : c.slug, subcategory: null })}
                className={`${optionCls(isSelected && !subcategory)} pl-2 flex items-center justify-between group`}
              >
                <span className="truncate">{c.label}</span>
                {hasSub && (
                  <span className="text-[11px] text-muted group-hover:text-brand-ink">
                    {c.subcategories?.length}
                  </span>
                )}
              </button>

              {showSubcategories && hasSub && (
                <div className="ml-2.5 pl-2.5 border-l-2 border-brand/30 space-y-1.5 my-2">
                  <button
                    type="button"
                    onClick={() => setParams({ category: c.slug, subcategory: null })}
                    className={`block w-full text-left text-xs py-1.5 px-2.5 rounded-lg transition font-medium ${
                      !subcategory && isSelected
                        ? "font-bold text-brand-ink bg-brand-soft shadow-xs"
                        : "text-muted hover:text-fg hover:bg-surface-2"
                    }`}
                  >
                    All {c.label}
                  </button>
                  <div className="grid grid-cols-1 gap-1">
                    {c.subcategories?.map((sub) => {
                      const isSubActive = subcategory === sub.slug;
                      return (
                        <button
                          key={sub.slug}
                          type="button"
                          onClick={() =>
                            setParams({
                              category: c.slug,
                              subcategory: isSubActive ? null : sub.slug,
                            })
                          }
                          className={`w-full text-left text-xs py-1.5 px-2.5 rounded-xl transition flex items-center justify-between border ${
                            isSubActive
                              ? "bg-gradient-to-r from-violet-600 via-indigo-600 to-brand text-white font-bold border-transparent shadow-xs"
                              : "text-fg-2 hover:text-brand-ink bg-surface-2 hover:bg-surface-3 border-line/60 hover:border-brand/30"
                          }`}
                        >
                          <span className="truncate">{sub.label}</span>
                          {isSubActive && <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </FilterGroup>

      {/* Dedicated Anime Franchises Filter Group */}
      <FilterGroup title="Anime Franchises & Universes">
        <div className="flex flex-wrap gap-1.5 pt-1">
          {[
            { label: "Dragon Ball", slug: "dragon-ball", parent: "action-figures" },
            { label: "Jujutsu Kaisen", slug: "jujutsu-kaisen", parent: "action-figures" },
            { label: "Marvel", slug: "marvel", parent: "action-figures" },
            { label: "DC Comics", slug: "dc-comics", parent: "action-figures" },
            { label: "One Piece", slug: "one-piece", parent: "action-figures" },
            { label: "Naruto", slug: "naruto", parent: "action-figures" },
            { label: "Demon Slayer", slug: "demon-slayer", parent: "action-figures" },
            { label: "Attack on Titan", slug: "attack-on-titan", parent: "action-figures" },
            { label: "Bleach", slug: "bleach", parent: "action-figures" },
            { label: "Chainsaw Man", slug: "chainsaw-man", parent: "action-figures" },
            { label: "Solo Leveling", slug: "solo-leveling", parent: "action-figures" },
            { label: "Pokemon", slug: "pokemon", parent: "action-figures" },
          ].map((f) => {
            const isSubActive = subcategory === f.slug;
            return (
              <button
                key={f.slug}
                type="button"
                onClick={() =>
                  setParams({
                    category: f.parent,
                    subcategory: isSubActive ? null : f.slug,
                  })
                }
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
                  isSubActive
                    ? "bg-gradient-to-r from-violet-600 via-indigo-600 to-brand text-white shadow-brand/20 scale-105"
                    : "bg-surface-2 hover:bg-surface-3 text-fg-2 hover:text-fg border border-line hover:border-brand/40"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup title="Customer Reviews">
        {[4, 3].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setParams({ minRating: minRating === String(r) ? null : String(r) })}
            className={`${optionCls(minRating === String(r))} flex items-center gap-1`}
            aria-pressed={minRating === String(r)}
          >
            <span className="flex text-star">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < r ? "fill-current" : "fill-none text-line-strong"}`} strokeWidth={i < r ? 0 : 1.5} />
              ))}
            </span>
            <span>& Up</span>
          </button>
        ))}
      </FilterGroup>

      <FilterGroup title="Price">
        {PRICE_RANGES.map((r) => {
          const active = minPrice === r.min && maxPrice === r.max;
          return (
            <button
              key={r.label}
              type="button"
              onClick={() => setParams(active ? { minPrice: null, maxPrice: null } : { minPrice: r.min || null, maxPrice: r.max || null })}
              className={optionCls(active)}
            >
              {r.label}
            </button>
          );
        })}
        <form
          className="mt-2 flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            setParams({ minPrice: min || null, maxPrice: max || null });
          }}
        >
          <input
            inputMode="numeric"
            value={min}
            onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))}
            placeholder="₹ Min"
            aria-label="Minimum price"
            className="input h-9 px-2 text-[13px]"
          />
          <input
            inputMode="numeric"
            value={max}
            onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
            placeholder="₹ Max"
            aria-label="Maximum price"
            className="input h-9 px-2 text-[13px]"
          />
          <button type="submit" className="btn btn-secondary btn-sm h-9 shrink-0">
            Go
          </button>
        </form>
      </FilterGroup>

      <FilterGroup title="Deals & Availability">
        <Checkbox
          label="Today's Deals"
          checked={params.get("onSale") === "true"}
          onChange={(v) => setParams({ onSale: v ? "true" : null })}
        />
        <Checkbox
          label="Exclude out of stock"
          checked={params.get("inStock") === "true"}
          onChange={(v) => setParams({ inStock: v ? "true" : null })}
        />
      </FilterGroup>

      <FilterGroup title="Age-restricted items">
        <Checkbox
          label="18+ replicas only"
          checked={restricted === "true"}
          onChange={(v) => setParams({ isRestricted: v ? "true" : null })}
        />
        <Checkbox
          label="Hide 18+ items"
          checked={restricted === "false"}
          onChange={(v) => setParams({ isRestricted: v ? "false" : null })}
        />
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 first:pt-0">
      <h3 className="mb-1.5 font-bold text-fg">{title}</h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1 text-sm text-fg-2 hover:text-fg">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer rounded border-line-strong accent-[var(--brand)]"
      />
      {label}
    </label>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  return (
    <nav aria-label="Pagination" className="mt-8 flex justify-center">
      <div className="flex items-center overflow-hidden rounded-lg border border-line-strong bg-surface text-sm shadow-card">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="flex h-10 items-center gap-1 px-3 text-fg transition hover:bg-surface-3 disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Previous</span>
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="flex h-10 items-center border-l border-line px-3 text-muted">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={`h-10 min-w-10 border-l border-line px-3 transition ${
                p === page ? "bg-brand font-bold text-white" : "text-fg hover:bg-surface-3"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="flex h-10 items-center gap-1 border-l border-line px-3 text-fg transition hover:bg-surface-3 disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-transparent"
        >
          <span className="hidden sm:inline">Next</span> <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={<ProductListingSkeleton />}
    >
      <ProductsContent />
    </Suspense>
  );
}
