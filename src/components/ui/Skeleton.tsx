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
      className={`relative overflow-hidden bg-slate-200 dark:bg-slate-800 ${variantClasses} ${className}`}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
    </div>
  );
}

export default Skeleton;
