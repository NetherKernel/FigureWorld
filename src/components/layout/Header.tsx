"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Search,
  ShieldAlert,
  ShoppingCart,
  Truck,
  User as UserIcon,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { formatPrice } from "@/lib/format";
import { STORE_CATEGORIES, StoreProduct, effectivePrice, primaryImage, productHref } from "@/lib/product-view";
import { DELIVERY_PIN_KEY, useStoredValue } from "@/lib/use-stored-value";

const SUBNAV_LINKS = [
  { label: "Today's Deals", href: "/products?onSale=true", highlight: true },
  { label: "Best Sellers", href: "/products?sort=rating" },
  { label: "New Arrivals", href: "/products?sort=newest" },
  { label: "Action Figures", href: "/products?category=action-figures" },
  { label: "Scale Figures", href: "/products?category=anime-figures" },
  { label: "Statues", href: "/products?category=collectibles" },
  { label: "Katanas 18+", href: "/products?category=katanas-replicas" },
  { label: "Keychains", href: "/products?category=keychains" },
  { label: "Manga", href: "/products?category=manga" },
  { label: "Posters", href: "/products?category=posters" },
  { label: "Accessories", href: "/products?category=accessories" },
];

function buildSearchUrl(query: string, category: string) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("search", query.trim());
  if (category) {
    const parent = STORE_CATEGORIES.find((c) => c.subcategories?.some((s) => s.slug === category));
    if (parent) {
      params.set("category", parent.slug);
      params.set("subcategory", category);
    } else {
      params.set("category", category);
    }
  }
  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const { summary } = useCart();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [pin, savePin] = useStoredValue(DELIVERY_PIN_KEY);
  const [subnavHidden, setSubnavHidden] = useState(false);

  const accountTimer = useRef<number | null>(null);
  const isStaff = user?.role === "ADMIN" || user?.role === "STAFF";
  const firstName = user?.name?.split(" ")[0];

  // Close menus on navigation
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setDrawerOpen(false);
    setAccountOpen(false);
  }

  // Collapse the sub-navigation when scrolling down, reveal on scroll up.
  // Showing/hiding the bar changes the sticky header's height. With the browser's default scroll
  // anchoring, scrollY then shifts by that height to keep the content still — and this handler
  // read that shift as the user reversing direction, toggling the bar back: an endless flicker.
  // Switching anchoring off only around each toggle isn't reliable (Chrome applies a delayed
  // catch-up shift when it comes back on), so it stays off while the header is mounted; the page
  // content simply follows the header's bottom edge as the bar slides.
  useEffect(() => {
    const SHOW_ABOVE = 60; // always visible this close to the top
    const HIDE_BELOW = 160; // only collapse once clearly past the header
    const MIN_TRAVEL = 24; // px scrolled in one direction before toggling (works for slow trackpad scrolls too)
    const SETTLE_MS = 400; // > the 300ms max-height transition
    const root = document.documentElement;
    root.style.overflowAnchor = "none";
    let lastY = window.scrollY;
    let turnY = lastY; // where the current scroll direction started
    let lastDir = 0;
    let ticking = false;
    let hidden = false;
    let settleUntil = 0;

    const apply = (next: boolean) => {
      if (next === hidden) return;
      hidden = next;
      settleUntil = performance.now() + SETTLE_MS;
      setSubnavHidden(next);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        if (performance.now() < settleUntil) {
          // Bar is still animating — don't start a new toggle yet
          lastY = turnY = y;
          return;
        }
        // Direction changed: measure travel from where it turned
        const dir = Math.sign(y - lastY);
        if (dir !== 0 && dir !== lastDir) {
          lastDir = dir;
          turnY = lastY;
        }
        if (y < SHOW_ABOVE) apply(false);
        else if (y - turnY > MIN_TRAVEL && y > HIDE_BELOW) apply(true);
        else if (turnY - y > MIN_TRAVEL) apply(false);
        lastY = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      root.style.removeProperty("overflow-anchor");
    };
  }, []);

  // Lock page scroll while the drawer is open; close overlays with Escape
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setAccountOpen(false);
        setLocationOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openAccount = () => {
    if (accountTimer.current) window.clearTimeout(accountTimer.current);
    setAccountOpen(true);
  };
  const closeAccountSoon = () => {
    if (accountTimer.current) window.clearTimeout(accountTimer.current);
    accountTimer.current = window.setTimeout(() => setAccountOpen(false), 160);
  };

  const handleLogout = async () => {
    setAccountOpen(false);
    setDrawerOpen(false);
    await logout();
  };

  // Sign-in / registration pages use their own minimal Amazon-style chrome
  if (pathname?.startsWith("/auth")) return null;

  const deliverLabel = pin ? `India ${pin}` : "Update location";

  return (
    <>
      <header className="sticky top-0 z-40 w-full select-none print:hidden text-white shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
        {/* ROW 1 — brand bar */}
        <div className="bg-nav dark:border-b dark:border-white/5">
          <div className="mx-auto flex h-[60px] max-w-[1500px] items-center gap-1 px-2 sm:gap-2 sm:px-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="nav-item flex h-11 w-11 shrink-0 items-center justify-center md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>

            <Logo className="nav-item p-1" />

            <button
              type="button"
              onClick={() => setLocationOpen(true)}
              className="nav-item hidden shrink-0 items-end gap-1 px-2 py-1.5 text-left lg:flex"
            >
              <MapPin className="mb-0.5 h-[18px] w-[18px]" />
              <span className="flex flex-col leading-tight">
                <span className="text-xs text-white/80">
                  {firstName ? `Deliver to ${firstName}` : "Delivering to"}
                </span>
                <span className="text-sm font-bold">{deliverLabel}</span>
              </span>
            </button>

            <SearchBar className="mx-1 hidden flex-1 md:flex lg:mx-2" onNavigate={(url) => router.push(url)} />

            <div className="ml-auto flex items-center gap-0.5 sm:gap-1 md:ml-0">
              <ThemeToggle className="mx-0.5 sm:mx-2" />

              {/* Account & Lists — hover flyout on desktop, tap on touch */}
              <div className="relative" onMouseEnter={openAccount} onMouseLeave={closeAccountSoon}>
                <button
                  type="button"
                  onClick={() => setAccountOpen((v) => !v)}
                  aria-expanded={accountOpen}
                  aria-haspopup="true"
                  className="nav-item flex items-center gap-1 px-2 py-1.5 text-left"
                >
                  <span className="hidden flex-col leading-tight sm:flex">
                    <span className="text-xs text-white/80">
                      {isLoading ? "Hello" : user ? `Hello, ${firstName}` : "Hello, sign in"}
                    </span>
                    <span className="flex items-center gap-0.5 text-sm font-bold">
                      Account & Lists <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                    </span>
                  </span>
                  <span className="flex items-center gap-0.5 whitespace-nowrap text-sm font-semibold sm:hidden">
                    <span className="max-w-[72px] truncate max-[379px]:hidden">{user ? firstName : "Sign in"}</span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-70 max-[379px]:hidden" />
                    <UserIcon className="h-6 w-6" />
                  </span>
                </button>

                {accountOpen && (
                  <AccountFlyout
                    user={user}
                    isStaff={isStaff}
                    onClose={() => setAccountOpen(false)}
                    onLogout={handleLogout}
                  />
                )}
              </div>

              <Link
                href="/profile#orders"
                className="nav-item hidden flex-col px-2 py-1.5 leading-tight sm:flex"
              >
                <span className="text-xs text-white/80">Returns</span>
                <span className="text-sm font-bold">& Orders</span>
              </Link>

              <Link
                href="/cart"
                aria-label={`Cart, ${summary.itemCount} items`}
                className="nav-item relative flex items-end gap-0.5 px-2 py-1"
              >
                <span className="relative">
                  <ShoppingCart className="h-8 w-8" strokeWidth={1.75} />
                  <span
                    key={summary.itemCount}
                    className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 animate-pop-in items-center justify-center rounded-full bg-brand px-1 text-xs font-extrabold text-white ring-2 ring-nav"
                  >
                    {summary.itemCount}
                  </span>
                </span>
                <span className="mb-0.5 hidden text-sm font-bold sm:inline">Cart</span>
              </Link>
            </div>
          </div>

          {/* Mobile search row */}
          <div className="px-2 pb-2 md:hidden">
            <SearchBar onNavigate={(url) => router.push(url)} />
          </div>
        </div>

        {/* ROW 2 — sub navigation */}
        <nav
          aria-label="Departments"
          className={`overflow-hidden bg-nav-2 transition-[max-height] duration-300 ease-out dark:border-b dark:border-white/5 ${
            subnavHidden ? "max-h-0" : "max-h-12"
          }`}
        >
          <div className="no-scrollbar mx-auto flex h-10 max-w-[1500px] items-center gap-0.5 overflow-x-auto px-2 text-sm sm:px-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="nav-item hidden shrink-0 items-center gap-1 px-2 py-1 font-bold md:flex"
            >
              <Menu className="h-5 w-5" /> All
            </button>
            {SUBNAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`nav-item shrink-0 whitespace-nowrap px-2 py-1 ${l.highlight ? "font-bold" : "text-white/95"}`}
              >
                {l.label}
              </Link>
            ))}
            <span className="ml-auto hidden shrink-0 whitespace-nowrap pl-4 text-[13px] font-semibold xl:inline">
              Use code <span className="rounded bg-brand px-1.5 py-0.5 font-bold text-white">WELCOME10</span>{" "}
              for 10% off your first order
            </span>
          </div>
        </nav>

        {/* Mobile delivery strip */}
        <button
          type="button"
          onClick={() => setLocationOpen(true)}
          className={`flex w-full items-center gap-1.5 overflow-hidden bg-nav-3 px-3 text-left text-[13px] transition-[max-height] duration-300 lg:hidden ${
            subnavHidden ? "max-h-0" : "max-h-10 py-2"
          }`}
        >
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {firstName ? `Deliver to ${firstName} - ` : "Deliver to "}
            <span className="font-semibold">{deliverLabel}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
        </button>
      </header>

      {/* Dim the page behind the account flyout like Amazon */}
      <div
        aria-hidden
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-200 ${
          accountOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setAccountOpen(false)}
      />

      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        isStaff={isStaff}
        cartCount={summary.itemCount}
        onLogout={handleLogout}
      />

      {locationOpen && (
        <LocationModal
          initial={pin}
          onClose={() => setLocationOpen(false)}
          onSave={(value) => {
            savePin(value);
            setLocationOpen(false);
          }}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Search bar with live suggestions                                    */
/* ------------------------------------------------------------------ */

function SearchBar({ className = "", onNavigate }: { className?: string; onNavigate: (url: string) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [suggestions, setSuggestions] = useState<StoreProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getCategoryLabel = (slug: string) => {
    if (!slug) return "All";
    for (const c of STORE_CATEGORIES) {
      if (c.slug === slug) return c.label;
      const sub = c.subcategories?.find((s) => s.slug === slug);
      if (sub) return sub.label;
    }
    return "All";
  };

  const categoryLabel = getCategoryLabel(category);

  // Debounced suggestion fetch
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: term, limit: "6" });
        if (category) {
          const parent = STORE_CATEGORIES.find((c) => c.subcategories?.some((s) => s.slug === category));
          if (parent) {
            params.set("category", parent.slug);
            params.set("subcategory", category);
          } else {
            params.set("category", category);
          }
        }
        const res = await fetch(`/api/products?${params}`, { signal: controller.signal });
        const json = await res.json();
        setSuggestions(json?.success ? json.data.products : []);
        setActive(-1);
      } catch {
        /* aborted or offline */
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(t);
    };
  }, [query, category]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const submit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      setOpen(false);
      inputRef.current?.blur();
      const picked = query.trim().length >= 2 ? suggestions[active] : undefined;
      if (active >= 0 && picked) {
        onNavigate(productHref(picked));
        return;
      }
      onNavigate(buildSearchUrl(query, category));
    },
    [active, suggestions, query, category, onNavigate]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (visibleSuggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % visibleSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? visibleSuggestions.length - 1 : i - 1));
    }
  };

  const showDropdown = open && query.trim().length >= 2;
  const visibleSuggestions = showDropdown ? suggestions : [];

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <form
        onSubmit={submit}
        role="search"
        className="flex h-11 w-full overflow-hidden rounded-lg bg-white ring-brand/0 transition focus-within:ring-[3px] focus-within:ring-white/70 dark:bg-surface-2 dark:focus-within:ring-brand/70"
      >
        <label className="relative hidden shrink-0 items-center border-r border-black/10 bg-[#f1f1f2] text-xs text-[#3a3a40] transition hover:bg-[#e3e3e6] sm:flex dark:border-white/10 dark:bg-surface-3 dark:text-fg-2">
          <span className="pointer-events-none flex items-center gap-1 pl-3 pr-2">
            {categoryLabel} <ChevronDown className="h-3 w-3" />
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Search in department"
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="">All Departments</option>
            {STORE_CATEGORIES.map((c) => (
              <optgroup key={c.slug} label={c.label}>
                <option value={c.slug}>All {c.label}</option>
                {c.subcategories?.map((sub) => (
                  <option key={sub.slug} value={sub.slug}>
                    {c.label} &gt; {sub.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search Figure World"
          aria-label="Search Figure World"
          role="combobox"
          aria-controls="search-suggestions"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-3 text-[15px] text-[#0f1111] placeholder:text-[#6b6b73] focus:outline-none dark:text-fg dark:placeholder:text-muted"
        />

        <button
          type="submit"
          aria-label="Go"
          className="flex w-12 shrink-0 items-center justify-center bg-brand text-white transition hover:bg-brand-hover"
        >
          <Search className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </form>

      {showDropdown && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1 animate-pop-in overflow-hidden rounded-lg border border-line bg-surface text-fg shadow-pop"
        >
          {visibleSuggestions.map((p, i) => (
            <button
              key={p._id}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                setOpen(false);
                onNavigate(productHref(p));
              }}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition ${
                i === active ? "bg-surface-3" : "hover:bg-surface-2"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={primaryImage(p)} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="shrink-0 text-xs font-semibold text-fg-2">{formatPrice(effectivePrice(p))}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => submit()}
            className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5 text-left text-sm hover:bg-surface-2"
          >
            <Search className="h-4 w-4 text-muted" />
            <span>
              Search for <span className="font-bold">&ldquo;{query.trim()}&rdquo;</span>
              {category && <span className="text-muted"> in {categoryLabel}</span>}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Account flyout                                                      */
/* ------------------------------------------------------------------ */

interface MenuUser {
  name: string;
  email: string;
  role: string;
}

function AccountFlyout({
  user,
  isStaff,
  onClose,
  onLogout,
}: {
  user: MenuUser | null;
  isStaff: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  const linkCls = "block py-1 text-[13px] text-fg-2 hover:text-brand-ink hover:underline";
  return (
    <div className="absolute right-0 top-full z-50 pt-2 sm:-right-16">
      <div className="relative w-[min(92vw,420px)] animate-pop-in rounded-lg border border-line bg-surface p-5 text-fg shadow-pop">
        <span
          aria-hidden
          className="absolute -top-[7px] right-8 h-3.5 w-3.5 rotate-45 border-l border-t border-line bg-surface sm:right-24"
        />
        {!user ? (
          <div className="flex flex-col items-center border-b border-line pb-4">
            <Link href="/auth/login" onClick={onClose} className="btn btn-primary w-56">
              Sign in
            </Link>
            <p className="mt-2 text-xs text-fg-2">
              New customer?{" "}
              <Link href="/auth/register" onClick={onClose} className="link">
                Start here.
              </Link>
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 pt-4">
          <div>
            <h3 className="mb-1 text-[15px] font-bold">Shop</h3>
            <Link href="/products?onSale=true" onClick={onClose} className={linkCls}>
              Today&apos;s Deals
            </Link>
            <Link href="/products?sort=rating" onClick={onClose} className={linkCls}>
              Best Sellers
            </Link>
            <Link href="/products?sort=newest" onClick={onClose} className={linkCls}>
              New Arrivals
            </Link>
            <Link href="/cart" onClick={onClose} className={linkCls}>
              Your Cart
            </Link>
          </div>
          <div className="border-l border-line pl-6">
            <h3 className="mb-1 text-[15px] font-bold">Your Account</h3>
            <Link href="/profile" onClick={onClose} className={linkCls}>
              Account
            </Link>
            <Link href="/profile#orders" onClick={onClose} className={linkCls}>
              Orders
            </Link>
            <Link href="/profile#addresses" onClick={onClose} className={linkCls}>
              Addresses
            </Link>
            <Link href="/profile#security" onClick={onClose} className={linkCls}>
              Login & security
            </Link>
            {isStaff && (
              <Link href="/dashboard" onClick={onClose} className={`${linkCls} font-semibold !text-brand-ink`}>
                Seller dashboard
              </Link>
            )}
            {user?.role === "DEVELOPER" && (
              <Link href="/developer" onClick={onClose} className={`${linkCls} font-semibold !text-brand-ink`}>
                Developer console
              </Link>
            )}
            {user && (
              <button type="button" onClick={onLogout} className={`${linkCls} w-full text-left`}>
                Sign out
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* "All" side drawer                                                   */
/* ------------------------------------------------------------------ */

function SideDrawer({
  open,
  onClose,
  user,
  isStaff,
  cartCount,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  user: MenuUser | null;
  isStaff: boolean;
  cartCount: number;
  onLogout: () => void;
}) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const row =
    "flex items-center justify-between rounded-md px-5 py-3 text-sm text-fg transition hover:bg-surface-3";

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      <button
        type="button"
        onClick={onClose}
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        className={`absolute left-[min(85vw,365px)] top-3 ml-3 rounded-full p-1 text-white transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      >
        <X className="h-8 w-8" />
      </button>

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        className={`absolute inset-y-0 left-0 flex w-[min(85vw,365px)] flex-col bg-surface shadow-2xl transition-transform duration-300 [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link
          href={user ? "/profile" : "/auth/login"}
          onClick={onClose}
          tabIndex={open ? 0 : -1}
          className="flex items-center gap-3 bg-nav-2 px-5 py-4 text-white"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
            <UserIcon className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold">{user ? `Hello, ${user.name.split(" ")[0]}` : "Hello, sign in"}</span>
        </Link>

        <div className="flex-1 overflow-y-auto py-2">
          <DrawerSection title="Trending">
            <Link href="/products?sort=rating" onClick={onClose} className={row} tabIndex={open ? 0 : -1}>
              Best Sellers
            </Link>
            <Link href="/products?sort=newest" onClick={onClose} className={row} tabIndex={open ? 0 : -1}>
              New Arrivals
            </Link>
            <Link href="/products?onSale=true" onClick={onClose} className={row} tabIndex={open ? 0 : -1}>
              Today&apos;s Deals
            </Link>
          </DrawerSection>

          <DrawerSection title="Shop by Category">
            {STORE_CATEGORIES.map((c) => {
              const hasSub = (c.subcategories?.length ?? 0) > 0;
              const isExpanded = expandedCategory === c.slug;

              return (
                <div key={c.slug} className="overflow-hidden">
                  <div className="flex items-center justify-between rounded-md px-5 py-2.5 text-sm text-fg transition hover:bg-surface-3 group">
                    <Link
                      href={`/products?category=${c.slug}`}
                      onClick={onClose}
                      className="flex-1 flex items-center gap-2 group-hover:text-brand-ink transition"
                      tabIndex={open ? 0 : -1}
                    >
                      <span className="font-medium">{c.label}</span>
                      {"restricted" in c && c.restricted && <span className="chip chip-brand">18+</span>}
                    </Link>
                    {hasSub ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCategory(isExpanded ? null : c.slug);
                        }}
                        aria-label={`Toggle ${c.label} subcategories`}
                        className="p-1 -mr-2 rounded-md text-muted hover:text-fg hover:bg-surface-2 transition"
                        tabIndex={open ? 0 : -1}
                      >
                        <ChevronRight
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isExpanded ? "rotate-90 text-brand-ink" : ""
                          }`}
                        />
                      </button>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted opacity-40" />
                    )}
                  </div>

                  {hasSub && isExpanded && (
                    <div className="bg-surface-2/60 border-y border-line/40 pl-8 pr-4 py-1.5 space-y-0.5">
                      <Link
                        href={`/products?category=${c.slug}`}
                        onClick={onClose}
                        className="block py-1.5 px-2 text-xs font-bold text-brand-ink hover:underline"
                        tabIndex={open ? 0 : -1}
                      >
                        All {c.label} &rarr;
                      </Link>
                      {c.subcategories?.map((sub) => (
                        <Link
                          key={sub.slug}
                          href={`/products?category=${c.slug}&subcategory=${sub.slug}`}
                          onClick={onClose}
                          className="block py-1.5 px-2 text-xs text-fg-2 hover:text-brand-ink hover:bg-surface-3 rounded transition"
                          tabIndex={open ? 0 : -1}
                        >
                          {sub.label}
                          {"restricted" in sub && sub.restricted && (
                            <span className="ml-1.5 text-[10px] text-amber-600 font-bold">18+</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </DrawerSection>

          <DrawerSection title="Anime Franchises & Subcategories">
            <div className="px-5 py-2">
              <p className="text-[11px] text-muted mb-2.5">
                Popular anime universes & collections:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Dragon Ball", slug: "dragon-ball" },
                  { label: "Jujutsu Kaisen", slug: "jujutsu-kaisen" },
                  { label: "Marvel", slug: "marvel" },
                  { label: "DC Comics", slug: "dc-comics" },
                  { label: "One Piece", slug: "one-piece" },
                  { label: "Naruto", slug: "naruto" },
                  { label: "Demon Slayer", slug: "demon-slayer" },
                  { label: "Attack on Titan", slug: "attack-on-titan" },
                  { label: "Bleach", slug: "bleach" },
                  { label: "Chainsaw Man", slug: "chainsaw-man" },
                  { label: "Solo Leveling", slug: "solo-leveling" },
                  { label: "Pokemon", slug: "pokemon" },
                ].map((f) => (
                  <Link
                    key={f.slug}
                    href={`/products?category=action-figures&subcategory=${f.slug}`}
                    onClick={onClose}
                    tabIndex={open ? 0 : -1}
                    className="inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-surface-2 hover:bg-brand-soft text-fg-2 hover:text-brand-ink border border-line hover:border-brand/40 transition active:scale-95"
                  >
                    {f.label}
                  </Link>
                ))}
              </div>
            </div>
          </DrawerSection>

          <DrawerSection title="Help & Settings">
            <Link href="/profile" onClick={onClose} className={row} tabIndex={open ? 0 : -1}>
              <span className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted" /> Your Account
              </span>
            </Link>
            <Link href="/profile#orders" onClick={onClose} className={row} tabIndex={open ? 0 : -1}>
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted" /> Your Orders
              </span>
            </Link>
            <Link href="/cart" onClick={onClose} className={row} tabIndex={open ? 0 : -1}>
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-muted" /> Cart
              </span>
              <span className="chip chip-neutral">{cartCount}</span>
            </Link>
            <Link href="/#delivery" onClick={onClose} className={row} tabIndex={open ? 0 : -1}>
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted" /> Shipping & Delivery
              </span>
            </Link>
            <Link href="/products?category=katanas-replicas" onClick={onClose} className={row} tabIndex={open ? 0 : -1}>
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-muted" /> 18+ Replica Policy
              </span>
            </Link>
            <div className="flex items-center justify-between px-5 py-3 text-sm text-fg">
              <span>Appearance</span>
              <span className="rounded-full bg-nav p-0.5">
                <ThemeToggle />
              </span>
            </div>
            {isStaff && (
              <Link href="/dashboard" onClick={onClose} className={`${row} font-semibold text-brand-ink`} tabIndex={open ? 0 : -1}>
                <span className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" /> Seller Dashboard
                </span>
              </Link>
            )}
            {user?.role === "DEVELOPER" && (
              <Link href="/developer" onClick={onClose} className={`${row} font-semibold text-brand-ink`} tabIndex={open ? 0 : -1}>
                <span className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" /> Developer Console
                </span>
              </Link>
            )}
            {user ? (
              <button type="button" onClick={onLogout} className={`${row} w-full`} tabIndex={open ? 0 : -1}>
                <span className="flex items-center gap-2">
                  <LogOut className="h-4 w-4 text-muted" /> Sign out
                </span>
              </button>
            ) : (
              <Link href="/auth/login" onClick={onClose} className={`${row} font-semibold`} tabIndex={open ? 0 : -1}>
                Sign in
              </Link>
            )}
          </DrawerSection>
        </div>
      </aside>
    </div>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line py-2 last:border-b-0">
      <h3 className="px-5 pb-1 pt-2 text-[17px] font-bold text-fg">{title}</h3>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Delivery location modal                                             */
/* ------------------------------------------------------------------ */

function LocationModal({
  initial,
  onClose,
  onSave,
}: {
  initial: string;
  onClose: () => void;
  onSave: (pin: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const valid = /^[1-9][0-9]{5}$/.test(value);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="loc-title">
      <div className="absolute inset-0 animate-fade-in bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-sm animate-fade-up overflow-hidden rounded-t-2xl bg-surface text-fg shadow-pop sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-line bg-surface-2 px-5 py-3.5">
          <h2 id="loc-title" className="font-bold">
            Choose your location
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-muted hover:bg-surface-3 hover:text-fg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          className="space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onSave(value);
          }}
        >
          <p className="text-sm text-fg-2">
            Delivery options and delivery speeds may vary for different locations.
          </p>
          <div className="flex gap-2">
            <input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter a 6-digit PIN code"
              aria-label="PIN code"
              className="input"
            />
            <button type="submit" disabled={!valid} className="btn btn-secondary shrink-0">
              Apply
            </button>
          </div>
          {value.length === 6 && !valid && <p className="text-xs text-brand-ink">Please enter a valid PIN code.</p>}
        </form>
      </div>
    </div>
  );
}

export default Header;
