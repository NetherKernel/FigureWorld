"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Shield, Users, Package, DollarSign, Layers, AlertCircle, CheckCircle2, PhoneCall, ShoppingBag, Truck } from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Admin Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-red-950 p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/40">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Admin Master Console</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider rounded-md bg-brand/30 border border-red-400/40 px-2 py-0.5 text-red-200">
                  Superuser Access
                </span>
              </div>
              <p className="text-xs text-red-200/80 mt-1">
                Authenticated as <span className="font-semibold">{user?.email}</span> ({user?.name})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-hover transition shadow-lg shadow-brand/40 flex items-center gap-1.5"
            >
              <span>Launch Dashboard Suite →</span>
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
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted font-medium">Customer Accounts</span>
            <Users className="h-5 w-5 text-brand-ink" />
          </div>
          <p className="mt-3 text-2xl font-black text-fg">Active</p>
          <p className="mt-1 text-[11px] text-emerald-600 font-semibold">Protected with bcryptjs</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted font-medium">RBAC Roles Defined</span>
            <Shield className="h-5 w-5 text-brand-ink" />
          </div>
          <p className="mt-3 text-2xl font-black text-fg">3 Roles</p>
          <p className="mt-1 text-[11px] text-muted">CUSTOMER, STAFF, ADMIN</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted font-medium">Token Mechanism</span>
            <Layers className="h-5 w-5 text-brand-ink" />
          </div>
          <p className="mt-3 text-2xl font-black text-fg">jose JWT</p>
          <p className="mt-1 text-[11px] text-muted">HTTP-only cookie + Bearer</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted font-medium">Edge Middleware</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-3 text-2xl font-black text-fg">Enabled</p>
          <p className="mt-1 text-[11px] text-emerald-600 font-semibold">Route-level access gate</p>
        </div>
      </div>

      {/* Order Management — Heart of the Admin Panel (Sprint 9) */}
      <div className="rounded-3xl border-2 border-brand/30 bg-gradient-to-br from-brand-soft via-surface to-surface p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-fg">Order Management</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider rounded-md bg-brand text-white px-2 py-0.5 shadow-2xs">
                  Heart of Admin Panel
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider rounded-md bg-brand/20 text-brand-ink px-2 py-0.5 border border-brand/30">
                  Sprint 9
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Full 12-stage lifecycle engine, Order #KF100001 inspection, shipment tracking, customer contacts, and inventory controls.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/orders"
              className="rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-hover transition shadow-md shadow-brand/30 flex items-center gap-1.5"
            >
              <span>Open Orders Hub</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 text-xs pt-1">
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-bold text-fg">12 Canonical Statuses</p>
            <p className="mt-1 text-muted text-[11px]">
              Pending Payment, Payment Review, Confirmed, Processing, Packed, Dispatched, Out for Delivery, Delivered, Cancelled, Return Req, Returned, Refunded.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-bold text-fg">Order Inspection</p>
            <p className="mt-1 text-muted text-[11px]">
              Complete customer details, click-to-dial phone, full shipping address, products list with quantities, and authoritative calculations.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-bold text-fg">Shipment & Courier Tracking</p>
            <p className="mt-1 text-muted text-[11px]">
              Assign courier partners (Blue Dart, Delhivery, etc.), record AWB tracking codes, and automatically trigger dispatch state.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-bold text-fg">Warehouse Inventory Safety</p>
            <p className="mt-1 text-muted text-[11px]">
              Cancelling or returning an order automatically restores all reserved product quantities back to live warehouse stock.
            </p>
          </div>
        </div>
      </div>

      {/* Catalog & Store Management (Sprint 3) */}
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-fg">Store Catalog & Products</h2>
              <p className="text-xs text-muted">
                Sprint 3: Manage product inventory, edit prices, upload images, and control 18+ compliance.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/products/new"
              className="rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-fg-2 hover:bg-surface-2"
            >
              + Add Product
            </Link>
            <Link
              href="/admin/products"
              className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover transition shadow-sm"
            >
              Manage Catalog
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs pt-1">
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-bold text-fg">Quick Price & Stock Controls</p>
            <p className="mt-1 text-muted text-[11px]">
              Directly adjust prices, set discount rates, and update warehouse inventory inline without full reloads.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-bold text-fg">18+ Restricted Categories</p>
            <p className="mt-1 text-muted text-[11px]">
              Katanas and replica swords automatically inherit minimum age verification gates and shipping territory blocks.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-bold text-fg">File Upload & CDN</p>
            <p className="mt-1 text-muted text-[11px]">
              Multipart file uploader storing images in public uploads with MIME validation and primary photo selection.
            </p>
          </div>
        </div>
      </div>

      {/* Direct UPI Payment Verification (Sprint 7) */}
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-fg">Direct UPI Payment Verification</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 border border-emerald-500/30">
                  Sprint 7
                </span>
              </div>
              <p className="text-xs text-muted">
                Audit submitted customer UTR references, confirm bank transfers, and transition orders from UNDER_REVIEW to PAID & CONFIRMED.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/payments"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-sm flex items-center gap-1.5"
            >
              <span>Open Payment Console</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs pt-1">
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-bold text-fg">Zero-Trust Payment Rule</p>
            <p className="mt-1 text-muted text-[11px]">
              Submitting screenshot or UTR does NOT confirm order. Order moves to confirmed status only after admin verification.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-bold text-fg">Full State Machine</p>
            <p className="mt-1 text-muted text-[11px]">
              PENDING → UNDER_REVIEW → PAID / FAILED / EXPIRED / REFUNDED with audit logs (verifiedAt & verifiedBy).
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-bold text-fg">Auto Stock Restoration</p>
            <p className="mt-1 text-muted text-[11px]">
              When an unverified or invalid transaction is rejected, reserved inventory is instantly restored to active stock.
            </p>
          </div>
        </div>
      </div>

      {/* Cash on Delivery Verification & Dispatch (Sprint 8) */}
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <PhoneCall className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-fg">Cash on Delivery (COD) Management</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 border border-amber-500/30">
                  Sprint 8
                </span>
              </div>
              <p className="text-xs text-muted">
                Log customer phone verification calls, confirm destination coordinates, accept or reject COD orders, and execute courier dispatch.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/cod"
              className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 transition shadow-sm flex items-center gap-1.5"
            >
              <span>Open COD Console</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs pt-1">
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-bold text-fg">Customer Phone Verification</p>
            <p className="mt-1 text-muted text-[11px]">
              Direct click-to-dial with call log history tracking: Answered, No Answer, Busy, or Callback Requested.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-bold text-fg">Strict Verification Gate</p>
            <p className="mt-1 text-muted text-[11px]">
              Order Created → Phone Verification → Confirmed → Courier Dispatch. Orders cannot be dispatched prior to phone confirmation.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-bold text-fg">COD Safeguards & Limit</p>
            <p className="mt-1 text-muted text-[11px]">
              Orders are capped at ₹15,000 maximum for COD. Rejection or cancellation automatically returns reserved items to active inventory.
            </p>
          </div>
        </div>
      </div>

      {/* Dispatch & Shipping Management (Sprint 12) */}
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-fg">Dispatch & Shipping Management</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider rounded-md bg-brand/20 text-brand-ink px-2 py-0.5 border border-brand/30">
                  Sprint 12
                </span>
              </div>
              <p className="text-xs text-muted">
                Warehouse fulfillment queues: Pack orders, enter courier AWB details, dispatch shipments, and auto-notify customers.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/shipments"
              className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover transition shadow-sm flex items-center gap-1.5"
            >
              <span>Open Shipping Console</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs pt-1">
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-bold text-fg">Full Fulfillment Queue</p>
            <p className="mt-1 text-muted text-[11px]">
              Order $\rightarrow$ Pack $\rightarrow$ Dispatch $\rightarrow$ Enter Courier $\rightarrow$ Customer Notification.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-bold text-fg">Courier Tracking & ETA</p>
            <p className="mt-1 text-muted text-[11px]">
              Blue Dart, Delhivery, DTDC, Shiprocket, and more with automatic tracking URL computation and delivery estimates.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-bold text-fg">Pluggable Carrier Adapters</p>
            <p className="mt-1 text-muted text-[11px]">
              Prepared for automated API integrations with Shiprocket, Delhivery, Blue Dart, and DTDC.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
