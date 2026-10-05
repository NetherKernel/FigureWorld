/**
 * Back-office accounts (admin, staff, developer) work only in their own dashboard — they never
 * see the storefront. Shared by the middleware (redirects), the login page and the root layout.
 * Edge-safe: no Node or database imports.
 */

const AREAS: Record<string, { home: string; allowed: string[] }> = {
  ADMIN: { home: "/dashboard", allowed: ["/dashboard", "/admin", "/staff", "/invoices"] },
  STAFF: { home: "/staff", allowed: ["/staff", "/invoices"] },
  DEVELOPER: { home: "/developer", allowed: ["/developer"] },
};

/** Sign-in, sign-out and password reset stay reachable for everyone */
const SHARED = ["/auth"];

/** The homepage editor's preview renders the real storefront (header, footer) on purpose */
export const LANDING_PREVIEW_PATH = "/developer/landing-preview";

const BACKOFFICE_PREFIXES = ["/dashboard", "/admin", "/staff", "/developer"];

const isUnder = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/** Dashboard a back-office role lands on, or null for customers / signed-out visitors. */
export function backofficeHome(role: string | null | undefined): string | null {
  return (role && AREAS[role]?.home) || null;
}

/** Whether a back-office role may open this page (always true for customers — other rules apply to them). */
export function isAllowedForRole(role: string | null | undefined, pathname: string): boolean {
  const area = role ? AREAS[role] : undefined;
  if (!area) return true;
  return [...area.allowed, ...SHARED].some((p) => isUnder(pathname, p));
}

/** Dashboard pages, where the storefront header/footer is never shown. */
export function isBackofficePage(pathname: string): boolean {
  return !isUnder(pathname, LANDING_PREVIEW_PATH) && BACKOFFICE_PREFIXES.some((p) => isUnder(pathname, p));
}
