import React from "react";
import Skeleton from "../ui/Skeleton";

export function HeroSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface px-6 py-16 shadow-card sm:px-12 sm:py-24 lg:px-16">
      <div className="relative z-10 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
        {/* Left Column: Heading, Subheading & CTAs */}
        <div className="space-y-6 lg:col-span-7">
          {/* Badge */}
          <Skeleton className="h-7 w-36 rounded-full" />

          {/* Big Headline */}
          <div className="space-y-3">
            <Skeleton className="h-10 w-full sm:h-12" />
            <Skeleton className="h-10 w-4/5 sm:h-12" />
          </div>

          {/* Subtitle */}
          <div className="max-w-xl space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Skeleton className="h-12 w-40 rounded-full" />
            <Skeleton className="h-12 w-36 rounded-full" />
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-4 border-t border-line pt-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-6 w-16" />
                <Skeleton className="mt-1 h-3 w-20" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Hero Figure Spotlight */}
        <div className="flex justify-center lg:col-span-5">
          <div className="relative aspect-[4/5] w-full max-w-md rounded-xl bg-surface-2 p-6">
            <Skeleton className="h-full w-full rounded-xl" />
            <div className="absolute bottom-10 left-10 right-10 rounded-xl border border-line bg-surface p-4 shadow-card">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-1 h-3 w-40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroSkeleton;
