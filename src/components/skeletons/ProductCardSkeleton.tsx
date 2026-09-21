import React from "react";
import Skeleton from "../ui/Skeleton";

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900">
      {/* Product Image Skeleton */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800/80">
        <Skeleton className="h-full w-full" />
        {/* Scale/Tag Pill Skeleton */}
        <div className="absolute left-3 top-3">
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>

      {/* Meta/Series Skeleton */}
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>

      {/* Title Skeleton */}
      <div className="mt-2 space-y-1.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Price & Action Skeleton */}
      <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
        <div>
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export default ProductCardSkeleton;
