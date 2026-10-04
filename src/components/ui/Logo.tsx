import React from "react";
import Link from "next/link";

interface LogoProps {
  className?: string;
  size?: "md" | "lg";
  href?: string;
}

/** Brand badge: the logo artwork sits on its native black, cropped to the mark + wordmark. */
export function Logo({ className = "", size = "md", href = "/" }: LogoProps) {
  const box = size === "lg" ? "h-14 w-[100px]" : "h-10 w-[72px]";
  return (
    <Link href={href} aria-label="Figure World home" className={`flex shrink-0 items-center ${className}`}>
      <span className={`block overflow-hidden rounded-md bg-black ring-1 ring-black/20 ${box}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Figure World" className="h-full w-full object-cover" />
      </span>
    </Link>
  );
}

export default Logo;
