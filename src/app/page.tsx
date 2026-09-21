import React from "react";
import Link from "next/link";
import HeroSkeleton from "@/components/skeletons/HeroSkeleton";
import CategorySectionSkeleton from "@/components/skeletons/CategorySkeleton";
import ProductCardSkeleton from "@/components/skeletons/ProductCardSkeleton";
import Skeleton from "@/components/ui/Skeleton";
import { ArrowRight, CheckCircle2, Database, Globe, Server, Cpu, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-16">
      {/* Architectural Flow Banner */}
      <section className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-pink-50/70 p-6 dark:border-indigo-900/40 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-pink-950/20 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              Sprint 1 Completed Architecture
            </div>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              End-to-End Foundation Ready
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Complete skeleton flow: Website → Next.js App Router → API Route Handlers → MongoDB (12 Mongoose Models).
            </p>
          </div>

          {/* Architecture Pipeline Visualizer */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <Globe className="h-4 w-4 text-blue-500" />
              <span>Website</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <Cpu className="h-4 w-4 text-purple-500" />
              <span>Next.js 16</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <Server className="h-4 w-4 text-emerald-500" />
              <span>API Layer</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <Database className="h-4 w-4 text-green-600" />
              <span>MongoDB</span>
            </div>
          </div>
        </div>

        {/* Quick Demo Navigation Links */}
        <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-indigo-100/60 dark:border-indigo-900/30 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Quick Skeleton Navigation:</span>
          <Link
            href="/products"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white transition hover:bg-indigo-700 shadow-xs"
          >
            Explore Product Listing Skeleton →
          </Link>
          <Link
            href="/products/figure-demo-01"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 shadow-xs"
          >
            Explore Product Detail Skeleton →
          </Link>
          <Link
            href="/api/health"
            target="_blank"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            Test API Health (/api/health) ↗
          </Link>
        </div>
      </section>

      {/* 1. Hero Skeleton Section */}
      <section>
        <HeroSkeleton />
      </section>

      {/* 2. Featured Categories Skeleton Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Explore by Category
            </h2>
            <p className="text-xs text-slate-500">Popular collectible universes and figure types</p>
          </div>
          <Link href="/products" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1">
            Browse All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <CategorySectionSkeleton />
      </section>

      {/* 3. Featured Products / Trending Collectibles Skeleton */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Trending Releases & Hot Pre-Orders
            </h2>
            <p className="text-xs text-slate-500">
              High-demand collector scale figures, resin statues & limited editions
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>

        {/* 4-column responsive product card skeleton grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* 4. Promotional Banner Skeleton */}
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 to-indigo-950 p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <Skeleton className="h-6 w-32 rounded-full bg-indigo-800" />
          <div className="space-y-2">
            <Skeleton className="h-9 w-full sm:w-3/4 bg-slate-800" />
            <Skeleton className="h-4 w-5/6 bg-slate-800/70" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Skeleton className="h-11 w-36 rounded-xl bg-indigo-600" />
            <Skeleton className="h-11 w-32 rounded-xl bg-slate-800" />
          </div>
        </div>
      </section>

      {/* 5. Sprint 1 Database Collections Checklist */}
      <section className="rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Initial Database Collections Architecture
            </h3>
            <p className="text-xs text-slate-500">
              All 12 core collections defined with TypeScript interfaces and Mongoose schemas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          {[
            "User",
            "Product",
            "Category",
            "Order",
            "OrderItem",
            "Payment",
            "Address",
            "Invoice",
            "Shipment",
            "Coupon",
            "Admin",
            "Result",
          ].map((col) => (
            <div
              key={col}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/40"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">{col}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
