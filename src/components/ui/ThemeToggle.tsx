"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

/**
 * Sliding day/night switch. Clicking grows the new theme outward from the
 * knob in a circular reveal (see ThemeContext).
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }}
      className={`group relative h-8 w-[60px] shrink-0 cursor-pointer overflow-hidden rounded-full border transition-colors duration-500 ${
        isDark ? "border-white/15 bg-[#1d1d24]" : "border-white/40 bg-white/20 hover:bg-white/30"
      } ${className}`}
    >
      {/* Night sky stars */}
      <span aria-hidden className={`absolute inset-0 transition-opacity duration-500 ${isDark ? "opacity-100" : "opacity-0"}`}>
        <span className="absolute left-[10px] top-[8px] h-[3px] w-[3px] rounded-full bg-white [animation:twinkle_2.4s_ease-in-out_infinite]" />
        <span className="absolute left-[20px] top-[18px] h-[2px] w-[2px] rounded-full bg-white [animation:twinkle_3s_ease-in-out_0.6s_infinite]" />
        <span className="absolute left-[28px] top-[7px] h-[2px] w-[2px] rounded-full bg-white [animation:twinkle_2.2s_ease-in-out_1.1s_infinite]" />
      </span>

      {/* Sliding knob */}
      <span
        aria-hidden
        className={`absolute top-[3px] flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-all duration-500 [transition-timing-function:cubic-bezier(0.65,0,0.35,1)] ${
          isDark ? "left-[31px] bg-[#2b2b35] text-amber-200" : "left-[3px] bg-white text-amber-500"
        }`}
      >
        <Sun
          className={`absolute h-4 w-4 transition-all duration-500 ${isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
        />
        <Moon
          className={`absolute h-3.5 w-3.5 fill-current transition-all duration-500 ${
            isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
          }`}
        />
      </span>
    </button>
  );
}

export default ThemeToggle;
