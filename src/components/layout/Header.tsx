"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  MapPin,
  Menu,
  X,
  ChevronDown,
  User as UserIcon,
  Heart,
  LogOut,
  Shield,
  Briefcase,
  KeyRound,
  Package,
  Sun,
  Moon,
  Sparkles,
  Sword,
  Flame,
  HelpCircle,
  Truck,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useTheme } from "@/context/ThemeContext";

const CATEGORY_SEARCH_OPTIONS = [
  { label: "All Categories", value: "" },
  { label: "Anime Figures", value: "anime-figures" },
  { label: "Collectibles & Statues", value: "collectibles" },
  { label: "18+ Katanas & Replicas", value: "katanas-replicas" },
  { label: "Keychains & Chibi", value: "keychains" },
  { label: "Posters & Wall Art", value: "posters" },
  { label: "Manga & Artbooks", value: "manga" },
  { label: "Accessories", value: "accessories" },
];

export function Header() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const { summary } = useCart();
  const { theme, toggleTheme } = useTheme();

  // Navigation & Dropdown states
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [searchCategory, setSearchCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [postalCode, setPostalCode] = useState("400001");
  const [tempPostalCode, setTempPostalCode] = useState("400001");

  const accountRef = useRef<HTMLDivElement>(null);

  // Close account dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock body scroll when side drawer is open
  useEffect(() => {
    if (sideMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [sideMenuOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (searchCategory) {
      if (searchCategory === "katanas-replicas") {
        params.set("isRestricted", "true");
      } else {
        params.set("category", searchCategory);
      }
    }
    router.push(`/products?${params.toString()}`);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full select-none shadow-md">
        {/* ROW 1: AMAZON-STYLE MAIN HEADER (BLACK & WHITE WITH VIBRANT RED ACCENTS) */}
        <div className="bg-[#131921] text-white px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-4 border-b border-slate-800">
          {/* 1. BRAND LOGO */}
          <Link
            href="/"
            className="flex items-center gap-2 px-1.5 py-1 rounded hover:outline-1 hover:outline-white transition shrink-0"
            aria-label="Figure World Home"
          >
            <img
              src="/logo.jpg"
              alt="Figure World"
              className="h-9 sm:h-10 w-auto object-contain rounded bg-black"
            />
            <div className="hidden xl:flex flex-col leading-tight">
              <span className="text-sm font-black tracking-tight text-white">
                FIGURE <span className="text-red-500">WORLD</span>
              </span>
              <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">
                COLLECT × DISPLAY
              </span>
            </div>
          </Link>

          {/* 2. DELIVER TO LOCATION BUTTON */}
          <button
            type="button"
            onClick={() => setLocationModalOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded hover:outline-1 hover:outline-white transition text-left cursor-pointer shrink-0"
          >
            <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-2" />
            <div className="flex flex-col leading-none">
              <span className="text-[11px] text-slate-300">Deliver to</span>
              <span className="text-xs font-bold text-white flex items-center gap-0.5">
                India {postalCode}
              </span>
            </div>
          </button>

          {/* 3. MASSIVE AMAZON-STYLE SEARCH BAR (WHITE INPUT + RED BUTTON) */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 max-w-3xl flex items-stretch h-10 rounded-md overflow-hidden bg-white shadow-inner focus-within:ring-2 focus-within:ring-red-500"
          >
            {/* Category Dropdown */}
            <div className="relative hidden sm:flex items-center bg-slate-100 hover:bg-slate-200 border-r border-slate-300 text-slate-700 text-xs font-medium cursor-pointer transition">
              <select
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                aria-label="Select search category"
                className="appearance-none bg-transparent pl-3 pr-7 py-2 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                {CATEGORY_SEARCH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="text-slate-900 bg-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500 absolute right-2 pointer-events-none" />
            </div>

            {/* Search Input */}
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Figure World for anime figures, scale statues, katanas, manga..."
              className="flex-1 px-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-white font-normal"
            />

            {/* Red Search Submit Button */}
            <button
              type="submit"
              aria-label="Search"
              className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-5 flex items-center justify-center transition cursor-pointer"
            >
              <Search className="h-5 w-5" />
            </button>
          </form>

          {/* 4. LANGUAGE SELECTOR */}
          <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded hover:outline-1 hover:outline-white cursor-pointer shrink-0">
            <span className="text-sm">🇮🇳</span>
            <span className="text-xs font-bold text-white">EN</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </div>

          {/* 5. HELLO, SIGN IN / ACCOUNT & LISTS */}
          <div className="relative shrink-0" ref={accountRef}>
            <button
              type="button"
              onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              className="flex flex-col text-left px-2 py-1 rounded hover:outline-1 hover:outline-white transition cursor-pointer"
            >
              <span className="text-[11px] text-slate-300 leading-tight">
                {isLoading ? "Loading..." : user ? `Hello, ${user.name.split(" ")[0]}` : "Hello, sign in"}
              </span>
              <span className="text-xs font-bold text-white flex items-center gap-0.5 leading-tight">
                Account & Lists <ChevronDown className="h-3 w-3 text-slate-400" />
              </span>
            </button>

            {/* Amazon Account Dropdown Menu */}
            {accountDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-2xl text-slate-900 z-50 animate-in fade-in-50 zoom-in-95 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                {/* User Status / Login Button */}
                {!user ? (
                  <div className="text-center pb-3 border-b border-slate-200 dark:border-slate-800">
                    <Link
                      href="/auth/login"
                      onClick={() => setAccountDropdownOpen(false)}
                      className="block w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition"
                    >
                      Sign In
                    </Link>
                    <p className="text-[11px] text-slate-500 mt-2">
                      New collector?{" "}
                      <Link
                        href="/auth/register"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="text-red-600 font-bold hover:underline"
                      >
                        Start here.
                      </Link>
                    </p>
                  </div>
                ) : (
                  <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase text-red-700 dark:bg-red-950 dark:text-red-300">
                        {user.role}
                      </span>
                      <span className="text-[11px] text-slate-400">Collector Member</span>
                    </div>
                  </div>
                )}

                {/* Account Links */}
                <div className="py-2 space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-1">
                    Your Account
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setAccountDropdownOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <UserIcon className="h-4 w-4 text-slate-400" />
                    <span>Your Profile & Orders</span>
                  </Link>
                  <Link
                    href="/profile#addresses"
                    onClick={() => setAccountDropdownOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>Your Addresses</span>
                  </Link>
                  <Link
                    href="/profile#security"
                    onClick={() => setAccountDropdownOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <KeyRound className="h-4 w-4 text-slate-400" />
                    <span>Security & Password</span>
                  </Link>

                  {/* Staff / Admin Direct Shortcuts */}
                  {(user?.role === "ADMIN" || user?.role === "STAFF") && (
                    <>
                      <div className="text-[11px] font-bold text-red-600 uppercase tracking-wider px-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        Operations
                      </div>
                      <Link
                        href="/dashboard"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Shield className="h-4 w-4" />
                        <span className="font-bold">Executive Admin Dashboard</span>
                      </Link>
                      <Link
                        href="/dashboard/shipments"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Package className="h-4 w-4" />
                        <span>Logistics & Dispatch Console</span>
                      </Link>
                    </>
                  )}
                </div>

                {user && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={async () => {
                        setAccountDropdownOpen(false);
                        await logout();
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 6. RETURNS & ORDERS */}
          <Link
            href={user?.role === "ADMIN" ? "/dashboard/orders" : "/profile"}
            className="hidden sm:flex flex-col text-left px-2 py-1 rounded hover:outline-1 hover:outline-white transition shrink-0"
          >
            <span className="text-[11px] text-slate-300 leading-tight">Returns</span>
            <span className="text-xs font-bold text-white leading-tight">& Orders</span>
          </Link>

          {/* 7. AMAZON-STYLE SHOPPING CART */}
          <Link
            href="/cart"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded hover:outline-1 hover:outline-white transition shrink-0 relative"
            aria-label="Shopping Cart"
          >
            <div className="relative">
              <ShoppingCart className="h-6 w-6 text-white" />
              <span className="absolute -top-1.5 -right-2 bg-red-600 text-white font-extrabold text-[11px] h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center border-2 border-[#131921]">
                {summary.itemCount}
              </span>
            </div>
            <span className="hidden sm:inline text-xs font-bold text-white mt-2">Cart</span>
          </Link>

          {/* 8. ANIMATED DARK MODE TOGGLE */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white transition-all transform active:scale-95 cursor-pointer shrink-0 border border-slate-700"
          >
            <Sun
              className={`h-5 w-5 text-amber-400 transition-all duration-300 transform ${
                theme === "dark" ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
              }`}
            />
            <Moon
              className={`absolute h-5 w-5 text-indigo-200 transition-all duration-300 transform ${
                theme === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
              }`}
            />
          </button>
        </div>

        {/* ROW 2: AMAZON-STYLE SUB-NAVIGATION RIBBON ("☰ All" + CATEGORIES) */}
        <div className="bg-[#232f3e] text-white px-3 sm:px-4 py-1.5 flex items-center justify-between text-xs font-medium overflow-x-auto no-scrollbar gap-4">
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* "☰ All" Hamburger Button */}
            <button
              type="button"
              onClick={() => setSideMenuOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded font-bold text-white hover:outline-1 hover:outline-white transition cursor-pointer"
            >
              <Menu className="h-4 w-4" />
              <span>All</span>
            </button>

            {/* Category Ribbon Links */}
            <Link
              href="/products"
              className="px-2 py-1 rounded text-slate-200 hover:text-white hover:outline-1 hover:outline-white transition whitespace-nowrap"
            >
              All Figures
            </Link>

            <Link
              href="#deals"
              className="flex items-center gap-1 px-2 py-1 rounded text-amber-300 hover:text-amber-200 font-bold hover:outline-1 hover:outline-white transition whitespace-nowrap"
            >
              <Flame className="h-3.5 w-3.5 text-amber-400 animate-bounce" />
              Today's Deals
            </Link>

            <Link
              href="/products?category=anime-figures"
              className="px-2 py-1 rounded text-slate-200 hover:text-white hover:outline-1 hover:outline-white transition whitespace-nowrap hidden sm:inline"
            >
              Scale Figures
            </Link>

            <Link
              href="/products?category=collectibles"
              className="px-2 py-1 rounded text-slate-200 hover:text-white hover:outline-1 hover:outline-white transition whitespace-nowrap hidden md:inline"
            >
              Resin Statues
            </Link>

            <Link
              href="/products?isRestricted=true"
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-rose-300 hover:text-white font-semibold hover:outline-1 hover:outline-white transition whitespace-nowrap"
            >
              <Sword className="h-3.5 w-3.5 text-rose-400" />
              18+ Katanas & Replicas
            </Link>

            <Link
              href="/products?category=keychains"
              className="px-2 py-1 rounded text-slate-200 hover:text-white hover:outline-1 hover:outline-white transition whitespace-nowrap hidden lg:inline"
            >
              Keychains & Chibi
            </Link>

            <Link
              href="/products?category=manga"
              className="px-2 py-1 rounded text-slate-200 hover:text-white hover:outline-1 hover:outline-white transition whitespace-nowrap hidden xl:inline"
            >
              Manga & Artbooks
            </Link>

            <Link
              href="#compliance"
              className="px-2 py-1 rounded text-slate-300 hover:text-white hover:outline-1 hover:outline-white transition whitespace-nowrap hidden xl:inline"
            >
              18+ Compliance Guide
            </Link>
          </div>

          {/* Right Promotional Announcement */}
          <div className="hidden lg:flex items-center gap-2 text-slate-300 text-[11px] shrink-0">
            <span className="font-semibold text-white">Flat ₹100 Express Delivery</span>
            <span>|</span>
            <span className="text-amber-300 font-bold">Use Code WELCOME10 for 10% Off</span>
          </div>
        </div>
      </header>

      {/* AMAZON-STYLE SLIDING SIDE DRAWER ("☰ All" MENU) */}
      {sideMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setSideMenuOpen(false)}
          />

          {/* Side Drawer Content */}
          <div className="relative w-80 sm:w-96 max-w-[85vw] h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-300 overflow-hidden">
            {/* Header User Banner */}
            <div className="bg-[#232f3e] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-red-600 flex items-center justify-center font-black text-white">
                  {user ? user.name.slice(0, 1).toUpperCase() : <UserIcon className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-bold text-sm">
                    {user ? `Hello, ${user.name}` : "Hello, Sign in"}
                  </p>
                  <p className="text-[10px] text-slate-300">Figure World Collector</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSideMenuOpen(false)}
                className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Scrollable Categories List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 text-sm divide-y divide-slate-100 dark:divide-slate-800">
              {/* Section 1: Trending */}
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2">
                  Trending & Hot
                </h4>
                <div className="space-y-1 font-medium">
                  <Link
                    href="/products"
                    onClick={() => setSideMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span>Best Sellers</span>
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  </Link>
                  <Link
                    href="#deals"
                    onClick={() => setSideMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-red-600 font-bold hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <span>Lightning Deals & Offers</span>
                    <Flame className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/products?sort=newest"
                    onClick={() => setSideMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span>New Arrivals & Pre-Orders</span>
                  </Link>
                </div>
              </div>

              {/* Section 2: Shop by Category */}
              <div className="space-y-2 pt-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2">
                  Shop by Department
                </h4>
                <div className="space-y-1 font-medium">
                  <Link
                    href="/products?category=anime-figures"
                    onClick={() => setSideMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span>Scale Figures (1/7, 1/8 Scale)</span>
                  </Link>
                  <Link
                    href="/products?category=collectibles"
                    onClick={() => setSideMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span>Resin Statues & Busts</span>
                  </Link>
                  <Link
                    href="/products?isRestricted=true"
                    onClick={() => setSideMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-rose-600 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <span className="flex items-center gap-2">
                      <Sword className="h-4 w-4" /> 18+ Katanas & Replicas
                    </span>
                    <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-black text-white">
                      18+
                    </span>
                  </Link>
                  <Link
                    href="/products?category=keychains"
                    onClick={() => setSideMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span>Keychains, Chibi & Accessories</span>
                  </Link>
                  <Link
                    href="/products?category=posters"
                    onClick={() => setSideMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span>Posters & Metallic Wall Scrolls</span>
                  </Link>
                  <Link
                    href="/products?category=manga"
                    onClick={() => setSideMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span>Manga & Official Artbooks</span>
                  </Link>
                </div>
              </div>

              {/* Section 3: Programs & Features */}
              <div className="space-y-2 pt-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2">
                  Programs & Compliance
                </h4>
                <div className="space-y-1 font-medium">
                  <Link
                    href="#compliance"
                    onClick={() => setSideMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span>18+ Katana Legal Notice</span>
                  </Link>
                  <Link
                    href="#guarantees"
                    onClick={() => setSideMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span>Collector Box Safe Packing</span>
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setSideMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-purple-600 font-bold hover:bg-purple-50 dark:hover:bg-purple-950/40"
                  >
                    <span>Admin Operations Console</span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Section 4: Help & Settings */}
              <div className="space-y-2 pt-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2">
                  Help & Settings
                </h4>
                <div className="space-y-1 font-medium">
                  <Link
                    href="/profile"
                    onClick={() => setSideMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span>Your Account</span>
                  </Link>
                  <Link
                    href="/cart"
                    onClick={() => setSideMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span>Your Cart ({summary.itemCount})</span>
                  </Link>
                  {user ? (
                    <button
                      type="button"
                      onClick={async () => {
                        setSideMenuOpen(false);
                        await logout();
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 rounded-lg text-rose-600 font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <span>Sign Out</span>
                      <LogOut className="h-4 w-4" />
                    </button>
                  ) : (
                    <Link
                      href="/auth/login"
                      onClick={() => setSideMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-red-600 font-bold hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <span>Sign In</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOCATION SELECTOR MODAL */}
      {locationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setLocationModalOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 text-slate-900 dark:text-white z-10 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-600" />
                Choose Delivery Location
              </h3>
              <button
                type="button"
                onClick={() => setLocationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              Delivery options and speeds may vary based on your postal location across India.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPostalCode(tempPostalCode || "400001");
                setLocationModalOpen(false);
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Enter an Indian PIN Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={tempPostalCode}
                  onChange={(e) => setTempPostalCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 400001"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 transition shadow-sm cursor-pointer"
                >
                  Apply PIN Code
                </button>
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
