import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: "rectangular" | "circular" | "rounded";
}

export function Skeleton({ className = "", variant = "rounded", ...props }: SkeletonProps) {
  const variantClasses = {
    rectangular: "rounded-none",
    circular: "rounded-full",
    rounded: "rounded-lg",
  }[variant];

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden bg-surface-3 ${variantClasses} ${className}`}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/5" />
    </div>
  );
}

export default Skeleton;
