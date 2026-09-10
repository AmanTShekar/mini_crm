"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

/**
 * Always-visible "Install app" menu row for the admin sidebar + drawer.
 * - Chrome ready → one-tap system install dialog.
 * - Otherwise → help sheet (Chrome menu ⋮ → Install app / iPhone Share →
 *   Add to Home Screen) + copy-app-link for staff phones.
 * Hidden only when already running as an installed app.
 */
export default function InstallAppButton({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  const [help, setHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setHidden(true);
      return;
    }
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden) return null;

  async function onClick() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice.catch(() => {});
      setDeferred(null);
    } else {
      setHelp(true);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <>
      <button onClick={onClick} className={cn("flex w-full items-center gap-3 text-left", className)}>
        <Download size={18} />
        Install app
      </button>

      {help && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHelp(false)} />
          <div className="box relative w-full max-w-xs p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-bold">Install Stay CRM</p>
              <button
                aria-label="Close"
                onClick={() => setHelp(false)}
                className="btn-ghost !px-2.5 !py-1.5"
              >
                <X size={16} />
              </button>
            </div>
            {isIOS ? (
              <ol className="grid gap-1.5 text-sm text-[#3d403d]">
                <li>1. Tap the <b>Share</b> button in Safari</li>
                <li>2. Tap <b>Add to Home Screen</b></li>
                <li>3. Open Stay CRM from your home screen — no browser needed</li>
              </ol>
            ) : (
              <ol className="grid gap-1.5 text-sm text-[#3d403d]">
                <li>1. Tap the Chrome menu <b>⋮</b> (top right)</li>
                <li>2. Tap <b>Install app</b> / <b>Add to Home screen</b></li>
                <li>3. Open Stay CRM from your home screen — no browser needed</li>
              </ol>
            )}
            <button onClick={copyLink} className="btn-ghost mt-3 inline-flex w-full items-center justify-center gap-1.5">
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Link copied!" : "Copy app link for staff phones"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
