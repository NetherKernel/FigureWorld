import React from "react";
import Skeleton from "../ui/Skeleton";
import ProductCardSkeleton from "./ProductCardSkeleton";

export function ProductListingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-3 w-12" />
        <span className="text-slate-300">/</span>
        <Skeleton className="h-3 w-20" />
        <span className="text-slate-300">/</span>
        <Skeleton className="h-3 w-28" />
      </div>

      {/* Catalog Title & Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <Skeleton className="h-8 w-60" />
          <Skeleton className="mt-2 h-4 w-40" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
      </div>

      {/* Main Catalog Layout: Sidebar + Grid */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Filter Sidebar Skeleton */}
        <aside className="hidden lg:block space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>

            {/* Category Filter Group */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-3.5 w-28" />
                    </div>
                    <Skeleton className="h-3 w-6" />
                  </div>
                ))}
              </div>
            </div>

            {/* Scale Filter Group */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Skeleton className="h-4 w-20" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-7 w-12 rounded-lg" />
                <Skeleton className="h-7 w-12 rounded-lg" />
                <Skeleton className="h-7 w-12 rounded-lg" />
                <Skeleton className="h-7 w-16 rounded-lg" />
              </div>
            </div>

            {/* Price Range Slider Skeleton */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full rounded-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>

            {/* Availability Filter */}
            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Skeleton className="h-4 w-28" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Product Grid Area */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>

          {/* Pagination Controls Skeleton */}
          <div className="mt-12 flex items-center justify-center gap-2">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductListingSkeleton;
