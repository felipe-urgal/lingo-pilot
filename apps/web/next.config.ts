import "./config/server";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@lingo-pilot/ui"],
};

export default nextConfig;
