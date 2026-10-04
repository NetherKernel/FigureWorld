import React from "react";

interface PriceProps {
  amount: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: { whole: "text-lg", sup: "text-[10px] top-[-0.55em]" },
  md: { whole: "text-2xl", sup: "text-xs top-[-0.75em]" },
  lg: { whole: "text-3xl", sup: "text-sm top-[-0.9em]" },
  xl: { whole: "text-4xl", sup: "text-base top-[-1em]" },
};

/** Amazon-style price: superscript ₹ and paise, large rupee value. */
export function Price({ amount, size = "md", className = "" }: PriceProps) {
  const safe = Number.isFinite(amount) ? amount : 0;
  const whole = Math.floor(safe);
  const fraction = Math.round((safe - whole) * 100);
  const s = SIZES[size];

  return (
    <span className={`inline-flex items-start font-medium leading-none text-fg ${className}`} aria-label={`₹${safe}`}>
      <span className={`relative ${s.sup}`}>₹</span>
      <span className={`${s.whole} tracking-tight`}>{whole.toLocaleString("en-IN")}</span>
      {fraction > 0 && <span className={`relative ${s.sup}`}>{String(fraction).padStart(2, "0")}</span>}
    </span>
  );
}

export default Price;
