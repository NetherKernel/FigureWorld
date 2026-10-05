"use client";

import React, { createContext, useCallback, useContext, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

interface ThemeOrigin {
  x: number;
  y: number;
}

interface ThemeContextType {
  theme: Theme;
  /** Toggle theme. Pass the click origin to grow the reveal from that point. */
  toggleTheme: (origin?: ThemeOrigin) => void;
  setTheme: (theme: Theme, origin?: ThemeOrigin) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_STORAGE_KEY = "fw_theme";

/**
 * Inline script injected in <head> so the correct theme class is applied
 * before first paint (prevents a white flash for dark-mode users).
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}var r=document.documentElement;if(t==='dark'){r.classList.add('dark')}else{r.classList.remove('dark')}r.setAttribute('data-theme',t)}catch(e){}})();`;

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.setAttribute("data-theme", theme);
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> };
};

/** The <html> class (set by the inline script before paint) is the single source of truth. */
function subscribeToThemeClass(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function readThemeClass(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore<Theme>(subscribeToThemeClass, readThemeClass, () => "light");

  const setTheme = useCallback((next: Theme, origin?: ThemeOrigin) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage may be blocked (private mode) — theme still applies for this session
    }

    const doc = document as ViewTransitionDocument;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const commit = () => applyThemeClass(next);

    // Cool path: circular ink-spread reveal from the toggle button
    if (doc.startViewTransition && !reduceMotion) {
      const x = origin?.x ?? window.innerWidth - 40;
      const y = origin?.y ?? 32;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

      const transition = doc.startViewTransition(commit);
      transition.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
            },
            {
              duration: 650,
              easing: "cubic-bezier(0.65, 0, 0.35, 1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        })
        .catch(() => {
          /* transition skipped — theme is already applied */
        });
      return;
    }

    // Fallback: smooth colour cross-fade
    const root = document.documentElement;
    root.classList.add("theme-transition");
    commit();
    window.setTimeout(() => root.classList.remove("theme-transition"), 400);
  }, []);

  const toggleTheme = useCallback(
    (origin?: ThemeOrigin) => setTheme(theme === "dark" ? "light" : "dark", origin),
    [theme, setTheme]
  );

  return <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
