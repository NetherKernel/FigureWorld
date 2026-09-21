import React from "react";
import Skeleton from "../ui/Skeleton";

export function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2 mb-8">
        <Skeleton className="h-3 w-12" />
        <span className="text-slate-300">/</span>
        <Skeleton className="h-3 w-20" />
        <span className="text-slate-300">/</span>
        <Skeleton className="h-3 w-24" />
        <span className="text-slate-300">/</span>
        <Skeleton className="h-3 w-36" />
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        {/* Left Column: Image Gallery Skeleton (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Showcase Image */}
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <Skeleton className="h-full w-full rounded-2xl" />
            <div className="absolute top-8 left-8">
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>

          {/* Thumbnails Row */}
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
                <Skeleton className="h-full w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Details, Pricing & Purchase Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Badges & Series */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-4/5" />
          </div>

          {/* Rating & SKU */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-3 pt-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-6 w-20" />
          </div>

          {/* Short Description */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Edition Selector */}
          <div className="space-y-3 pt-4">
            <Skeleton className="h-4 w-28" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>

          {/* Quantity & CTA Buttons */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-32 rounded-xl" />
              <Skeleton className="h-12 flex-1 rounded-xl" />
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>

          {/* Collector Assurance Box */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs / Specifications Skeleton */}
      <div className="mt-16 border-t border-slate-200 pt-10 dark:border-slate-800">
        <div className="flex gap-6 border-b border-slate-200 pb-4 dark:border-slate-800">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProductDetailSkeleton;
