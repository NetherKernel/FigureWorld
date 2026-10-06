"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/ui/Logo";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  FolderTree,
  Users,
  CreditCard,
  FileText,
  Truck,
  Settings,
  LogOut,
  Menu,
  X,
  SlidersHorizontal,
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
  { name: "Subcategories", href: "/dashboard/subcategories", icon: FolderTree },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { name: "Shipments", href: "/dashboard/shipments", icon: Truck },
  { name: "Customize Delivery", href: "/dashboard/customize-delivery", icon: SlidersHorizontal },
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

  // Close the drawer on navigation, lock page scroll while it's open, close with Escape
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileMenuOpen(false);
  }

  useEffect(() => {
    if (!mobileMenuOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileMenuOpen]);

  const currentNav = NAV_ITEMS.find((item) =>
    item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)
  );

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row">
      {/* Mobile top bar — sticky (the storefront header isn't shown on dashboard pages) */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/5 bg-ink px-3 py-2.5 text-white md:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white/85 hover:bg-white/10"
          aria-label="Open navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
        <Logo href="/dashboard" />
        <span className="min-w-0 flex-1 truncate font-display text-sm font-bold tracking-tight">
          {currentNav?.name || "Admin"}
        </span>
      </div>

      {/* Mobile drawer backdrop */}
      <button
        type="button"
        aria-label="Close navigation menu"
        tabIndex={mobileMenuOpen ? 0 : -1}
        onClick={() => setMobileMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Sidebar navigation — mobile: slide-in drawer; desktop: sticky full height */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[min(80vw,272px)] shrink-0 flex-col justify-between overflow-y-auto border-r border-white/5 bg-ink p-4 text-white transition-transform duration-300 [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] md:sticky md:top-0 md:z-10 md:h-screen md:w-60 md:translate-x-0 lg:w-64 ${
          mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6">
          {/* Logo & Brand */}
          <div className="flex items-center justify-between px-1 pt-1">
            <div className="flex items-center gap-3">
              <Logo href="/dashboard" />
              <div>
                <h2 className="text-sm font-bold tracking-tight text-white leading-tight">
                  Figure World
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff5a60]">
                    Admin Suite
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg p-2 text-white/60 hover:bg-white/10 md:hidden"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
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
                  className={`relative flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold md:py-2.5 md:text-xs transition-colors duration-150 ${
                    isActive
                      ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] before:absolute before:inset-y-2 before:left-0 before:w-[4px] before:skew-x-[-20deg] before:rounded-sm before:bg-brand"
                      : "text-white/65 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[#ff5a60]" : "text-white/40"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile & Actions */}
        <div className="mt-6 border-t border-white/10 pt-4 space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.name || "Admin"}</p>
                <p className="text-[10px] text-white/50 truncate">{user?.email}</p>
              </div>
              <span className="shrink-0 rounded-md bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white">
                {user?.role || "ADMIN"}
              </span>
            </div>
            <button
              onClick={() => logout()}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10 hover:text-white transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Breadcrumb bar */}
        <header className="sticky top-0 z-20 hidden items-center justify-between border-b border-line bg-surface/90 px-6 py-3.5 backdrop-blur md:flex lg:px-8">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="font-semibold text-fg-2">Dashboard</span>
            <span>/</span>
            <span className="font-display text-sm font-bold capitalize text-fg">
              {pathname.replace("/dashboard", "").replace("/", "").replace(/-/g, " ") || "Overview"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live</span>
            </div>

          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-3 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
