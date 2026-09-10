"use client";

import { useEffect } from "react";

/** Service-worker lifecycle manager.
 * - Production: registers /sw.js (hashed, immutable chunks → safe to cache).
 * - Development: actively UNREGISTERS any workers. Turbopack rewrites chunk
 *   graphs on every edit, so a lingering worker serves stale chunks and
 *   crashes pages with "module factory is not available" errors. */
export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((rs) => rs.forEach((r) => r.unregister().catch(() => {})))
        .catch(() => {});
      return;
    }
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
