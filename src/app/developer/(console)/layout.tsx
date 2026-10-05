"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/ui/Logo";
import { Code2, LayoutDashboard, LogOut, Menu, Paintbrush, Ticket, X } from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

/** Developer console — storefront tools kept out of the admin dashboard (DEVELOPER role only, enforced in middleware). */
const NAV_ITEMS: NavItem[] = [
  { name: "Overview", href: "/developer", icon: LayoutDashboard },
  { name: "Customize Homepage", href: "/developer/customize", icon: Paintbrush },
  { name: "Coupons", href: "/developer/coupons", icon: Ticket },
];

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const current = NAV_ITEMS.find((i) => (i.href === "/developer" ? pathname === i.href : pathname.startsWith(i.href)));

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row">
      {/* Mobile header */}
      <div className="flex md:hidden items-center justify-between px-4 py-3 bg-ink text-white border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <Logo href="/developer" />
          <span className="font-display font-bold text-sm tracking-tight text-white">
            Figure World <span className="text-[#ff5a60]">Developer</span>
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-white/80 hover:bg-white/10"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden animate-fade-in"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-white/5 bg-ink text-white p-4 md:sticky md:top-0 md:z-10 md:h-screen md:flex ${
          mobileMenuOpen ? "flex animate-fade-in" : "hidden md:flex"
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1 pt-1">
            <div className="flex items-center gap-3">
              <Logo href="/developer" />
              <div>
                <h2 className="text-sm font-bold tracking-tight text-white leading-tight">Figure World</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Code2 className="h-3 w-3 text-[#ff5a60]" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff5a60]">Developer Console</span>
                </div>
              </div>
            </div>
            {mobileMenuOpen && (
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="md:hidden p-1.5 rounded-lg text-white/60 hover:bg-white/10"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item === current;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors duration-150 ${
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

        <div className="mt-6 border-t border-white/10 pt-4 space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.name || "Developer"}</p>
                <p className="text-[10px] text-white/50 truncate">{user?.email}</p>
              </div>
              <span className="shrink-0 rounded-md bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white">
                {user?.role || "DEVELOPER"}
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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-surface border-b border-line">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="font-semibold text-fg-2">Developer</span>
            <span>/</span>
            <span className="font-display text-sm font-bold text-fg">{current?.name || "Overview"}</span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
