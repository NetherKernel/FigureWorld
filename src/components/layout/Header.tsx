"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  Search, 
  User as UserIcon, 
  Menu, 
  X, 
  Sparkles,
  Layers,
  Heart,
  LogOut,
  Shield,
  Briefcase,
  MapPin,
  KeyRound,
  ChevronDown
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout, isLoading } = useAuth();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
      {/* Top promotional bar */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-4 py-1.5 text-center text-xs font-medium text-white tracking-wide">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          <span>Sprint 2 Active: Customer Accounts, RBAC Roles & Saved Addresses</span>
          <span className="hidden sm:inline">| Free domestic shipping over $99</span>
        </span>
      </div>

      {/* Main navigation header */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20 transition-transform group-hover:scale-105">
              <Layers className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Figures<span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">World</span>
              </span>
              <span className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
                Premium Collectibles
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Link href="/" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
              Home
            </Link>
            <Link href="/products" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
              All Figures
            </Link>
            <Link href="/products?category=anime" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
              Anime & Manga
            </Link>
            <Link href="/products?category=gaming" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
              Gaming
            </Link>
            <Link href="/products?status=preorder" className="flex items-center gap-1.5 text-amber-600 transition hover:text-amber-700 dark:text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              Pre-Orders
            </Link>
          </nav>
        </div>

        {/* Search Bar (Desktop) */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search scale figures, characters, nendoroids..."
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-xs font-normal text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-400"
            />
          </div>
        </div>

        {/* Action icons & Account menu */}
        <div className="flex items-center gap-3">
          {/* Wishlist */}
          <button 
            type="button"
            aria-label="Wishlist" 
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Heart className="h-5 w-5" />
          </button>

          {/* User Account / Auth Dropdown */}
          <div className="relative" ref={dropdownRef}>
            {isLoading ? (
              <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
            ) : user ? (
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1.5 pr-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white uppercase shadow-xs">
                  {user.name.slice(0, 2)}
                </div>
                <span className="hidden sm:inline font-semibold">{user.name.split(" ")[0]}</span>
                {user.role !== "CUSTOMER" && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    user.role === "ADMIN" 
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                  }`}>
                    {user.role}
                  </span>
                )}
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Dropdown Menu */}
            {userDropdownOpen && user && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  <span className="mt-1 inline-block text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                    Role: {user.role}
                  </span>
                </div>

                <div className="py-1 space-y-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Link
                    href="/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <UserIcon className="h-4 w-4 text-slate-400" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    href="/profile#addresses"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>Saved Addresses</span>
                  </Link>

                  <Link
                    href="/profile#security"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <KeyRound className="h-4 w-4 text-slate-400" />
                    <span>Change Password</span>
                  </Link>

                  {/* Staff / Admin Links */}
                  {(user.role === "STAFF" || user.role === "ADMIN") && (
                    <Link
                      href="/staff"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                    >
                      <Briefcase className="h-4 w-4" />
                      <span>Staff Portal</span>
                    </Link>
                  )}

                  {user.role === "ADMIN" && (
                    <Link
                      href="/admin"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}
                </div>

                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={async () => {
                      setUserDropdownOpen(false);
                      await logout();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cart with count badge */}
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-900 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
              0
            </span>
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer / menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search figures, scales, series..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>
          <div className="flex flex-col space-y-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Link 
              href="/" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Home
            </Link>
            <Link 
              href="/products" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              All Figures
            </Link>
            <Link 
              href="/products?category=anime" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Anime & Manga
            </Link>
            <Link 
              href="/products?status=preorder" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md text-amber-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Pre-Orders
            </Link>

            {user ? (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-2 py-1.5 rounded-md font-semibold text-indigo-600 dark:text-indigo-400"
                >
                  My Profile ({user.name})
                </Link>
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-2 py-1.5 rounded-md font-semibold text-purple-600 dark:text-purple-400"
                  >
                    Admin Dashboard
                  </Link>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                  }}
                  className="block w-full text-left px-2 py-1.5 rounded-md text-rose-600"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 rounded-lg bg-slate-100 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
