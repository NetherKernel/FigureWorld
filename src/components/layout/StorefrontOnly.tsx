"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LANDING_PREVIEW_PATH, backofficeHome, isBackofficePage } from "@/lib/backoffice";

/**
 * Storefront chrome (header, footer, cart flyout): hidden on dashboard pages and for back-office
 * accounts, which only work in their own dashboards. The homepage editor's preview keeps it so the
 * preview looks exactly like the live site.
 */
export function StorefrontOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  if (pathname.startsWith(LANDING_PREVIEW_PATH)) return <>{children}</>;
  if (isBackofficePage(pathname) || backofficeHome(user?.role)) return null;
  return <>{children}</>;
}
