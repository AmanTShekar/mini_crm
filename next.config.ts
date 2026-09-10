import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // The worker bootstrap must never be cached — a stale sw.js keeps
      // serving outdated chunk graphs ("module factory is not available").
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
