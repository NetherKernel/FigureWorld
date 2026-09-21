"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Briefcase, Package, ShoppingBag, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function StaffPortalPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Staff Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/40">
              <Briefcase className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Staff Operations Portal</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider rounded-md bg-blue-500/30 border border-blue-400/40 px-2 py-0.5 text-blue-200">
                  {user?.role} Access
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-1">
                Welcome back, <span className="font-semibold">{user?.name}</span> ({user?.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="rounded-xl border border-blue-400/30 bg-blue-950/40 px-4 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-900/60 transition"
            >
              My Profile
            </Link>
            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition"
              >
                Go to Admin Console
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Staff Permission Notice */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-800/40 dark:bg-blue-950/20 text-xs">
        <div className="flex items-center gap-2 font-bold text-blue-800 dark:text-blue-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
          <span>Staff Privileges Active</span>
        </div>
        <p className="mt-1 text-blue-700 dark:text-blue-400">
          Accessible by both `STAFF` and `ADMIN` roles. Standard customers (`CUSTOMER`) cannot access this operational hub.
        </p>
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Package className="h-5 w-5 text-indigo-600" />
            <span>Catalog Operations</span>
          </div>
          <p className="text-slate-500">
            View products, inventory levels, and upcoming figure releases across universes.
          </p>
          <Link href="/products" className="inline-block font-semibold text-indigo-600 hover:underline">
            Browse Store Catalog →
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <ShoppingBag className="h-5 w-5 text-purple-600" />
            <span>Order Processing</span>
          </div>
          <p className="text-slate-500">
            Monitor customer orders, shipping labels, and status updates for dispatched collectibles.
          </p>
          <span className="inline-block text-[11px] font-semibold text-slate-400">
            Integrated with Order and Shipment Models
          </span>
        </div>
      </div>
    </div>
  );
}
