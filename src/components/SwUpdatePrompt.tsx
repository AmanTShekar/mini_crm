"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * "Update available" toast. When a new app version is deployed, the waiting
 * service worker is activated on tap and the page reloads — no more
 * stuck-on-old-version hangs with refresh doing nothing.
 */
export default function SwUpdatePrompt() {
  const [ready, setReady] = useState(false);
  const regRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let gone = false;

    function track(reg: ServiceWorkerRegistration) {
      regRef.current = reg;
      if (reg.waiting && navigator.serviceWorker.controller) setReady(true);
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener("statechange", () => {
          if (w.state === "installed" && navigator.serviceWorker.controller && !gone) {
            setReady(true);
          }
        });
      });
    }

    navigator.serviceWorker.ready.then(track).catch(() => {});
    const onVis = () => {
      if (document.visibilityState === "visible") {
        navigator.serviceWorker.ready.then((r) => r.update().catch(() => {}));
      }
    };
    const onCtrl = () => window.location.reload();
    document.addEventListener("visibilitychange", onVis);
    navigator.serviceWorker.addEventListener("controllerchange", onCtrl);
    return () => {
      gone = true;
      document.removeEventListener("visibilitychange", onVis);
      navigator.serviceWorker.removeEventListener("controllerchange", onCtrl);
    };
  }, []);

  if (!ready) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit max-w-[calc(100vw-2rem)] md:bottom-8">
      <button
        onClick={() => regRef.current?.waiting?.postMessage({ type: "SKIP_WAITING" })}
        className="box flex items-center gap-2 !border-[#1f6f4a] px-4 py-3 text-sm font-bold text-[#1f6f4a] shadow-lg"
      >
        <RefreshCw size={16} />
        New version available — tap to refresh
      </button>
    </div>
  );
}
