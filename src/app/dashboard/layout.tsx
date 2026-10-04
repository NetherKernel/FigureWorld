"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/ui/Logo";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  Users,
  CreditCard,
  FileText,
  Truck,
  Ticket,
  Settings,
  Store,
  LogOut,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
  { name: "Products", href: "/dashboard/products", icon: Package },
  { name: "Categories", href: "/dashboard/categories", icon: Layers },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { name: "Shipments", href: "/dashboard/shipments", icon: Truck },
  { name: "Coupons", href: "/dashboard/coupons", icon: Ticket },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row">
      {/* Mobile header — not sticky: the global storefront header is already sticky above it */}
      <div className="flex md:hidden items-center justify-between px-4 py-3 bg-surface border-b border-line">
        <div className="flex items-center gap-2.5">
          <Logo href="/dashboard" />
          <span className="font-extrabold text-sm tracking-tight text-fg">
            Figure World <span className="text-brand-ink">Admin</span>
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-fg-2 hover:bg-surface-3"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden animate-fade-in"
        />
      )}

      {/* Sidebar navigation — mobile: overlay drawer; desktop: sticks just below the global header */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-line bg-surface p-4 md:sticky md:top-[112px] md:z-10 md:h-[calc(100vh-112px)] md:flex ${
          mobileMenuOpen ? "flex animate-fade-in" : "hidden md:flex"
        }`}
      >
        <div className="space-y-6">
          {/* Logo & Brand */}
          <div className="flex items-center justify-between px-1 pt-1">
            <div className="flex items-center gap-3">
              <Logo href="/dashboard" />
              <div>
                <h2 className="text-sm font-black tracking-tight text-fg leading-tight">
                  Figure World
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-ink">
                    Admin Suite
                  </span>
                </div>
              </div>
            </div>
            {mobileMenuOpen && (
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="md:hidden p-1.5 rounded-lg text-muted hover:bg-surface-3"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors duration-150 ${
                    isActive
                      ? "bg-brand-soft text-brand-ink before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-brand"
                      : "text-fg-2 hover:bg-surface-3 hover:text-fg"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-brand-ink" : "text-muted"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile & Actions */}
        <div className="mt-6 border-t border-line pt-4 space-y-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-fg-2 hover:bg-surface-3 hover:text-fg transition"
          >
            <Store className="h-4 w-4 text-muted" />
            <span>View Live Store</span>
          </Link>

          <div className="rounded-xl border border-line bg-surface-2 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-fg truncate">{user?.name || "Admin"}</p>
                <p className="text-[10px] text-muted truncate">{user?.email}</p>
              </div>
              <span className="shrink-0 rounded-md bg-brand-soft px-1.5 py-0.5 text-[9px] font-bold text-brand-ink">
                {user?.role || "ADMIN"}
              </span>
            </div>
            <button
              onClick={() => logout()}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-surface py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/30 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Breadcrumb bar — not sticky, so it never slides under the global header */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-surface border-b border-line">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="font-semibold text-fg-2">Dashboard</span>
            <span>/</span>
            <span className="text-brand-ink font-bold capitalize">
              {pathname.replace("/dashboard", "").replace("/", "") || "Overview"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Production Telemetry Active</span>
            </div>

            <Link href="/" target="_blank" className="btn btn-secondary btn-sm">
              <Store className="h-3.5 w-3.5" />
              <span>Storefront</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
