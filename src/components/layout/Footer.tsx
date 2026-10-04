"use client";

import React from "react";
import Link from "next/link";
import {
  ChevronUp,
  Globe,
  ShieldCheck,
  Truck,
  CreditCard,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="w-full bg-[#232F3E] text-white selection:bg-red-500 selection:text-white border-t border-slate-700">
      {/* 1. AMAZON-STYLE "BACK TO TOP" BAR */}
      <button
        type="button"
        onClick={scrollToTop}
        className="w-full py-3.5 bg-[#37475A] hover:bg-[#485769] text-center text-xs font-semibold text-slate-200 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
        aria-label="Back to top of page"
      >
        <span>Back to top</span>
        <ChevronUp className="h-4 w-4" />
      </button>

      {/* 2. 4-COLUMN MEGA DIRECTORY LINKS */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-xs">
          {/* Column 1: Get to Know Us */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">
              Get to Know Us
            </h3>
            <ul className="space-y-2 text-slate-300">
              <li>
                <Link href="/about" className="hover:underline hover:text-white">
                  About Figure World
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:underline hover:text-white">
                  Studio Partnerships
                </Link>
              </li>
              <li>
                <Link href="#guarantees" className="hover:underline hover:text-white">
                  Authenticity Verification
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:underline hover:text-white text-red-400 font-semibold">
                  Admin Dashboard Portal
                </Link>
              </li>
              <li>
                <Link href="/api/health" className="hover:underline hover:text-white">
                  System Health & Uptime
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Connect with Us */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">
              Connect with Us
            </h3>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                <a href="https://whatsapp.com" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-white">
                  WhatsApp Support Hotline
                </a>
              </li>
              <li>
                <a href="#instagram" className="hover:underline hover:text-white">
                  Instagram Collectibles
                </a>
              </li>
              <li>
                <a href="#youtube" className="hover:underline hover:text-white">
                  YouTube Figure Unboxings
                </a>
              </li>
              <li>
                <a href="#discord" className="hover:underline hover:text-white">
                  Collector Discord Community
                </a>
              </li>
              <li>
                <a href="#community" className="hover:underline hover:text-white">
                  Customer Testimonials
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Payment & Shipping Products */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">
              Payment & Shipping
            </h3>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-red-400" />
                <Link href="/checkout" className="hover:underline hover:text-white">
                  Direct UPI QR Payment
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="hover:underline hover:text-white">
                  Cash on Delivery (COD)
                </Link>
              </li>
              <li className="flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-blue-400" />
                <Link href="/dashboard/shipments" className="hover:underline hover:text-white">
                  Blue Dart & Delhivery Express
                </Link>
              </li>
              <li>
                <Link href="#guarantees" className="hover:underline hover:text-white">
                  Collector Box Safe Guarantee
                </Link>
              </li>
              <li>
                <span className="text-amber-400 font-semibold">Flat ₹100 Flat-Rate Shipping</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Let Us Help You */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">
              Let Us Help You
            </h3>
            <ul className="space-y-2 text-slate-300">
              <li>
                <Link href="/profile" className="hover:underline hover:text-white">
                  Your Account & Orders
                </Link>
              </li>
              <li>
                <Link href="/dashboard/shipments" className="hover:underline hover:text-white">
                  Track Your Package
                </Link>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                <Link href="#compliance" className="hover:underline hover:text-rose-300 font-semibold">
                  18+ Katana Compliance Notice
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:underline hover:text-white">
                  Cart & Pre-Orders
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:underline hover:text-white">
                  Help Center & FAQs
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3. AMAZON-STYLE MID-FOOTER (LOGO + REGIONAL SELECTORS) */}
      <div className="border-t border-[#3a4553] bg-[#131A22] py-8">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-center gap-6 text-xs text-slate-300">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/logo.jpg"
              alt="Figure World Logo"
              className="h-9 w-auto object-contain rounded bg-black"
            />
          </Link>

          {/* Selector Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 rounded border border-[#848688] px-3 py-1.5 hover:border-white transition">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <span>English</span>
            </div>

            <div className="flex items-center gap-1.5 rounded border border-[#848688] px-3 py-1.5 hover:border-white transition font-mono">
              <span className="text-red-400 font-bold">₹</span>
              <span>INR - Indian Rupee</span>
            </div>

            <div className="flex items-center gap-1.5 rounded border border-[#848688] px-3 py-1.5 hover:border-white transition">
              <span>🇮🇳</span>
              <span>India</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. AMAZON-STYLE BOTTOM COMPLIANCE & COPYRIGHT BAR */}
      <div className="bg-[#131A22] border-t border-[#232F3E] py-6 text-[11px] text-slate-400 text-center space-y-2">
        <div className="mx-auto max-w-5xl px-4">
          <p className="leading-relaxed text-slate-400">
            <span className="text-red-400 font-bold">18+ Age & Weapon Regulations Notice:</span> All swords, katanas, and ornamental blades displayed on Figure World are intended exclusively for adult collector display and cosmetic cosplay purposes. Blades are engineered with unsharpened safety edges. Mandatory age verification (18+) and geographic shipping eligibility are validated server-side.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3 text-xs">
            <Link href="/products" className="hover:underline hover:text-white">Conditions of Use & Sale</Link>
            <Link href="#compliance" className="hover:underline hover:text-white">Privacy Notice</Link>
            <Link href="#guarantees" className="hover:underline hover:text-white">Collector Authenticity</Link>
            <Link href="/dashboard" className="hover:underline hover:text-white">Admin Operations</Link>
          </div>
          <p className="pt-2 text-slate-400">
            © {new Date().getFullYear()}, Figure World, Inc. or its affiliates. All rights reserved. <span className="text-white font-semibold">COLLECT × DISPLAY × BEYOND</span>.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
