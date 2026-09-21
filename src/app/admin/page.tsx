"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Shield, Users, Package, DollarSign, Layers, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Admin Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-600/40">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Admin Master Console</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider rounded-md bg-purple-500/30 border border-purple-400/40 px-2 py-0.5 text-purple-200">
                  Superuser Access
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-1">
                Authenticated as <span className="font-semibold">{user?.email}</span> ({user?.name})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="rounded-xl border border-purple-400/30 bg-purple-950/40 px-4 py-2 text-xs font-semibold text-purple-200 hover:bg-purple-900/60 transition"
            >
              My Profile
            </Link>
            <Link
              href="/staff"
              className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition shadow-md shadow-purple-600/30"
            >
              View Staff Portal
            </Link>
          </div>
        </div>
      </div>

      {/* Role Differentiation Notice */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800/40 dark:bg-emerald-950/20 text-xs">
        <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>RBAC Enforcement Active</span>
        </div>
        <p className="mt-1 text-emerald-700 dark:text-emerald-400">
          This portal is protected by Edge Middleware. Customers (`CUSTOMER`) and Staff (`STAFF`) cannot access this page. Only `ADMIN` accounts are authorized.
        </p>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 text-xs">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Customer Accounts</span>
            <Users className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">Active</p>
          <p className="mt-1 text-[11px] text-emerald-600 font-semibold">Protected with bcryptjs</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">RBAC Roles Defined</span>
            <Shield className="h-5 w-5 text-purple-500" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">3 Roles</p>
          <p className="mt-1 text-[11px] text-slate-500">CUSTOMER, STAFF, ADMIN</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Token Mechanism</span>
            <Layers className="h-5 w-5 text-blue-500" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">jose JWT</p>
          <p className="mt-1 text-[11px] text-slate-500">HTTP-only cookie + Bearer</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Edge Middleware</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">Enabled</p>
          <p className="mt-1 text-[11px] text-emerald-600 font-semibold">Route-level access gate</p>
        </div>
      </div>

      {/* Catalog & Store Management (Sprint 3) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Store Catalog & Products</h2>
              <p className="text-xs text-slate-500">
                Sprint 3: Manage product inventory, edit prices, upload images, and control 18+ compliance.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/products/new"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
            >
              + Add Product
            </Link>
            <Link
              href="/admin/products"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-sm"
            >
              Manage Catalog
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs pt-1">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <p className="font-bold text-slate-900 dark:text-white">Quick Price & Stock Controls</p>
            <p className="mt-1 text-slate-500 text-[11px]">
              Directly adjust prices, set discount rates, and update warehouse inventory inline without full reloads.
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <p className="font-bold text-slate-900 dark:text-white">18+ Restricted Categories</p>
            <p className="mt-1 text-slate-500 text-[11px]">
              Katanas and replica swords automatically inherit minimum age verification gates and shipping territory blocks.
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <p className="font-bold text-slate-900 dark:text-white">File Upload & CDN</p>
            <p className="mt-1 text-slate-500 text-[11px]">
              Multipart file uploader storing images in public uploads with MIME validation and primary photo selection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
