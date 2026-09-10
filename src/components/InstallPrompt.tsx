"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

/**
 * "Install app" nudge for guests' phones.
 * - Android/Chrome: uses beforeinstallprompt → real Install button.
 * - iPhone: shows Share → Add to Home Screen hint.
 * Dismissible, remembered in localStorage. Hidden when already installed.
 */
export default function InstallPrompt({ compact }: { compact?: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (localStorage.getItem("pwa-dismissed")) return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    setDismissed(false);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const isiOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (isiOS) setIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (dismissed) return null;
  // iOS with no install event and not iOS → nothing useful to show yet
  if (!deferred && !iosHint) return null;

  function dismiss() {
    localStorage.setItem("pwa-dismissed", "1");
    setDismissed(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null);
    dismiss();
  }

  return (
    <div className={compact ? "box flex items-center gap-3 p-3" : "box flex items-center gap-3 p-4"}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#e7f2ec] text-[#1f6f4a]">
        {deferred ? <Download size={20} /> : <Share size={20} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold">
          {deferred ? "Install check-in app" : "Add to Home Screen"}
        </span>
        <span className="block text-xs text-[#6b6f6b]">
          {deferred
            ? "Open check-in like an app, no browser needed."
            : "Tap Share → Add to Home Screen for one-tap check-in."}
        </span>
      </span>
      {deferred && (
        <button onClick={install} className="btn-ghost shrink-0 !border-[#1f6f4a] !text-[#1f6f4a]">
          Install
        </button>
      )}
      <button aria-label="Dismiss" onClick={dismiss} className="shrink-0 p-1 text-[#6b6f6b]">
        <X size={16} />
      </button>
    </div>
  );
}
