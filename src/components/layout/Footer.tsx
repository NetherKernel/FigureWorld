"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, MessageCircle, PackageCheck, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const COLUMNS = [
  {
    title: "Get to Know Us",
    links: [
      { label: "About Figure World", href: "/#about" },
      { label: "Authenticity Guarantee", href: "/#guarantees" },
      { label: "Studio Partners", href: "/products?sort=rating" },
      { label: "New Arrivals", href: "/products?sort=newest" },
    ],
  },
  {
    title: "Shop with Us",
    links: [
      { label: "Scale Figures", href: "/products?category=anime-figures" },
      { label: "Resin Statues", href: "/products?category=collectibles" },
      { label: "Katanas & Replicas (18+)", href: "/products?category=katanas-replicas" },
      { label: "Today's Deals", href: "/products?onSale=true" },
    ],
  },
  {
    title: "Your Account",
    links: [
      { label: "Your Account", href: "/profile" },
      { label: "Your Orders", href: "/profile#orders" },
      { label: "Your Addresses", href: "/profile#addresses" },
      { label: "Your Cart", href: "/cart" },
    ],
  },
  {
    title: "Let Us Help You",
    links: [
      { label: "Shipping Rates & Policies", href: "/#delivery" },
      { label: "Returns & Replacements", href: "/#guarantees" },
      { label: "18+ Replica Policy", href: "/products?category=katanas-replicas" },
      { label: "Help & Support", href: "mailto:support@figureworld.in" },
    ],
  },
];

const ASSURANCES = [
  { icon: ShieldCheck, title: "100% Authentic", text: "Licensed imports only" },
  { icon: PackageCheck, title: "Collector-safe packing", text: "Double-boxed & padded" },
  { icon: Truck, title: "Pan-India delivery", text: "Tracked to your door" },
  { icon: CreditCard, title: "UPI & Cash on Delivery", text: "No gateway fees" },
  { icon: RotateCcw, title: "Damage protection", text: "Free replacement" },
];

export function Footer() {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  // Minimal Amazon-style footer on sign-in / registration pages
  if (pathname?.startsWith("/auth")) {
    return (
      <footer className="mt-10 border-t border-line bg-surface-2 py-6 text-center text-xs text-muted">
        <div className="mb-2 flex justify-center gap-6">
          <Link href="/#guarantees" className="link">
            Conditions of Use
          </Link>
          <Link href="/#guarantees" className="link">
            Privacy Notice
          </Link>
          <a href="mailto:support@figureworld.in" className="link">
            Help
          </a>
        </div>
        <p>© {year} Figure World. All rights reserved.</p>
      </footer>
    );
  }

  return (
    <footer className="mt-auto w-full text-white">
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="w-full bg-[#2b2b31] py-4 text-center text-[13px] font-medium transition hover:bg-[#36363d] dark:bg-[#1c1c21] dark:hover:bg-[#25252b]"
      >
        Back to top
      </button>

      {/* Assurance strip */}
      <div className="bg-brand dark:bg-[#7c0d11]">
        <div className="no-scrollbar mx-auto flex max-w-[1500px] gap-6 overflow-x-auto px-4 py-4 sm:justify-between lg:px-8">
          {ASSURANCES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex shrink-0 items-center gap-2.5">
              <Icon className="h-7 w-7 shrink-0 opacity-90" strokeWidth={1.75} />
              <div className="leading-tight">
                <p className="text-sm font-bold">{title}</p>
                <p className="text-xs text-white/80">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#1d1d22] dark:bg-[#111114]">
        <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-x-6 gap-y-8 px-6 py-12 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-base font-bold">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-white/75 transition hover:text-white hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-4 px-6 py-8 sm:flex-row sm:justify-between">
            <Logo />
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="rounded border border-white/25 px-3 py-1.5 text-white/85">English</span>
              <span className="rounded border border-white/25 px-3 py-1.5 text-white/85">₹ INR - Indian Rupee</span>
              <span className="rounded border border-white/25 px-3 py-1.5 text-white/85">India</span>
            </div>
            <a
              href="mailto:support@figureworld.in"
              className="flex items-center gap-1.5 text-sm text-white/80 transition hover:text-white"
            >
              <MessageCircle className="h-4 w-4" /> support@figureworld.in
            </a>
          </div>
        </div>
      </div>

      <div className="bg-[#141417] py-6 text-center text-xs text-white/60 dark:bg-[#0a0a0c]">
        <div className="mb-2 flex flex-wrap justify-center gap-x-6 gap-y-1">
          <Link href="/#guarantees" className="hover:text-white hover:underline">
            Conditions of Use & Sale
          </Link>
          <Link href="/#guarantees" className="hover:text-white hover:underline">
            Privacy Notice
          </Link>
          <Link href="/products?category=katanas-replicas" className="hover:text-white hover:underline">
            Age-Restricted Products Policy
          </Link>
        </div>
        <p>© {year} Figure World. All characters and trademarks belong to their respective owners.</p>
      </div>
    </footer>
  );
}

export default Footer;
