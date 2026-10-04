import React from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  rating?: number;
  count?: number;
  size?: "sm" | "md";
  showValue?: boolean;
  className?: string;
}

/** Amazon-style star row with partial fill, optional value and review count. */
export function StarRating({ rating = 0, count, size = "sm", showValue = false, className = "" }: StarRatingProps) {
  const value = Math.max(0, Math.min(5, rating));
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {showValue && <span className="text-sm font-medium text-fg">{value.toFixed(1)}</span>}
      <div className="relative flex" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
        <div className="flex text-line-strong">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`${iconSize} fill-current`} strokeWidth={0} />
          ))}
        </div>
        <div className="absolute inset-0 flex overflow-hidden text-star" style={{ width: `${(value / 5) * 100}%` }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`${iconSize} shrink-0 fill-current`} strokeWidth={0} />
          ))}
        </div>
      </div>
      {typeof count === "number" && (
        <span className="text-xs text-brand-ink">{count.toLocaleString("en-IN")}</span>
      )}
    </div>
  );
}

export default StarRating;
