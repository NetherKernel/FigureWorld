"use client";

import React from "react";
import Link from "next/link";
import { Layers, ShieldCheck, Truck, RefreshCw, Send } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      {/* Guarantees Banner */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">100% Authentic Collectibles</h4>
                <p className="text-xs text-slate-500">Directly sourced licensed figures from certified studios.</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Collector-Grade Shipping</h4>
                <p className="text-xs text-slate-500">Corner protectors, bubble wrap & heavy-duty outer boxes.</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-950/60 dark:text-pink-400">
                <RefreshCw className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Hassle-Free Pre-Orders</h4>
                <p className="text-xs text-slate-500">Deposit options, guarantee delivery & cancellation flexibility.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer links */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand info */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                <Layers className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Figures<span className="text-indigo-600 dark:text-indigo-400">World</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-slate-500">
              Your premier destination for licensed anime scale figures, figma, nendoroids, resin statues, and gaming memorabilia. Built with love for collectors worldwide.
            </p>

            {/* Newsletter */}
            <div className="mt-6 max-w-sm">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Subscribe for Release Alerts & Drops
              </span>
              <form className="mt-2 flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  aria-label="Subscribe to newsletter"
                  className="flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-indigo-700"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Catalog */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
              Catalog
            </h3>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/products?category=scale-figures" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Scale Figures (1/4, 1/7, 1/8)
                </Link>
              </li>
              <li>
                <Link href="/products?category=nendoroid" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Nendoroids & Chibi
                </Link>
              </li>
              <li>
                <Link href="/products?category=action-figures" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Articulated Action Figures
                </Link>
              </li>
              <li>
                <Link href="/products?category=statues" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Resin Statues & Busts
                </Link>
              </li>
              <li>
                <Link href="/products?category=pop-up-parade" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Pop Up Parade
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
              Customer Care
            </h3>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <a href="#shipping" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Shipping Policies
                </a>
              </li>
              <li>
                <a href="#preorder-guide" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Pre-Order FAQ
                </a>
              </li>
              <li>
                <a href="#order-tracking" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Track Your Shipment
                </a>
              </li>
              <li>
                <a href="#damage-protection" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Collector Box Guarantee
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>

          {/* System & Architecture */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
              Platform
            </h3>
            <ul className="mt-3 space-y-2 text-xs">
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-500">Live & Operational</span>
              </li>
              <li>
                <Link href="/api/health" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  System Health (/api/health)
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-purple-600 dark:text-purple-400 hover:underline">
                  Admin Dashboard
                </Link>
              </li>
              <li>
                <span className="text-slate-400">Next.js App Router</span>
              </li>
              <li>
                <span className="text-slate-400">MongoDB Database</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-slate-200 pt-6 text-center text-xs text-slate-500 dark:border-slate-800">
          <p>© {new Date().getFullYear()} FiguresWorld. All rights reserved. Premium Anime Figures & Collectibles Store.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
