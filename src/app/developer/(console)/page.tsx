"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Paintbrush, Ticket } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const TOOLS = [
  {
    name: "Customize Homepage",
    href: "/developer/customize",
    icon: Paintbrush,
    text: "Choose which sections appear on the storefront homepage, in what order and for whom. Edit content with a live preview, then publish.",
  },
  {
    name: "Coupons",
    href: "/developer/coupons",
    icon: Ticket,
    text: "Create discount codes, set limits and validity, and switch coupons on or off.",
  },
];

export default function DeveloperOverviewPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">
          <span className="slash" aria-hidden="true" /> Storefront tools
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-fg">Developer Console</h1>
        <p className="mt-1 text-xs text-muted">
          Signed in as <span className="font-semibold text-fg-2">{user?.email}</span>. Storefront tools that are kept out of the admin dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {TOOLS.map(({ name, href, icon: Icon, text }) => (
          <Link
            key={href}
            href={href}
            className="card card-hover group flex flex-col gap-3 p-6"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-glow" style={{ backgroundImage: "var(--brand-gradient)" }}>
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-display text-lg font-bold text-fg">{name}</span>
              <span className="mt-1 block text-xs leading-5 text-fg-2">{text}</span>
            </span>
            <span className="mt-auto flex items-center gap-1 text-xs font-semibold text-brand-ink">
              Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
