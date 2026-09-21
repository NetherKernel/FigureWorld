import React from "react";
import Skeleton from "../ui/Skeleton";

export function CategoryPillSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
      <div className="space-y-1.5 w-24">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-2.5 w-14" />
      </div>
    </div>
  );
}

export function CategorySectionSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <CategoryPillSkeleton key={i} />
      ))}
    </div>
  );
}

export default CategorySectionSkeleton;
