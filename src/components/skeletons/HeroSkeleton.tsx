import React from "react";
import Skeleton from "../ui/Skeleton";

export function HeroSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-16 sm:px-12 sm:py-24 lg:px-16 shadow-xl">
      <div className="relative z-10 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
        {/* Left Column: Heading, Subheading & CTAs */}
        <div className="space-y-6 lg:col-span-7">
          {/* Badge */}
          <Skeleton className="h-7 w-36 rounded-full bg-slate-800" />

          {/* Big Headline */}
          <div className="space-y-3">
            <Skeleton className="h-10 w-full sm:h-12 bg-slate-800" />
            <Skeleton className="h-10 w-4/5 sm:h-12 bg-slate-800" />
          </div>

          {/* Subtitle */}
          <div className="space-y-2 max-w-xl">
            <Skeleton className="h-4 w-full bg-slate-800/80" />
            <Skeleton className="h-4 w-5/6 bg-slate-800/80" />
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Skeleton className="h-12 w-40 rounded-xl bg-indigo-900/60" />
            <Skeleton className="h-12 w-36 rounded-xl bg-slate-800" />
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800/80">
            <div>
              <Skeleton className="h-6 w-16 bg-slate-800" />
              <Skeleton className="mt-1 h-3 w-20 bg-slate-800/60" />
            </div>
            <div>
              <Skeleton className="h-6 w-16 bg-slate-800" />
              <Skeleton className="mt-1 h-3 w-20 bg-slate-800/60" />
            </div>
            <div>
              <Skeleton className="h-6 w-16 bg-slate-800" />
              <Skeleton className="mt-1 h-3 w-20 bg-slate-800/60" />
            </div>
          </div>
        </div>

        {/* Right Column: Hero Figure Spotlight */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative aspect-[4/5] w-full max-w-md rounded-2xl bg-slate-800/50 p-6">
            <Skeleton className="h-full w-full rounded-xl bg-slate-800" />
            <div className="absolute bottom-10 left-10 right-10 rounded-xl bg-slate-900/80 p-4 backdrop-blur-md">
              <Skeleton className="h-4 w-28 bg-slate-700" />
              <Skeleton className="mt-1 h-3 w-40 bg-slate-700/60" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroSkeleton;
