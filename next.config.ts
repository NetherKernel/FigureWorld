import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only: let phones/tablets on the local network (e.g. http://192.168.x.x:3000)
  // load the dev server's scripts. Without this, Next.js blocks them for any
  // origin other than localhost, so the page renders but nothing is clickable.
  // Has no effect on production builds.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
};

export default nextConfig;
