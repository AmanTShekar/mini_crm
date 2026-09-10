"use client";

import { useEffect } from "react";

/** Registers /sw.js (skipped only if the browser has no SW support).
 * The handler caches versioned statics + the two public guest pages
 * (network-first), so dev HMR and fresh HTML keep working. */
export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
