"use client";

import { useEffect } from "react";

/** Registers /sw.js in production only.
 * Dev builds (Turbopack) change chunk graphs constantly — caching them
 * poisons HMR with stale-module crashes. Production chunks are hashed
 * and immutable, so caching there is safe. */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
