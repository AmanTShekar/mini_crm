"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
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

  return (
    <>
      <button onClick={onClick} className={cn("flex w-full items-center gap-3 text-left", className)}>
        <Download size={18} />
        Install app
      </button>

      {help && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHelp(false)} />
          <div className="box relative w-full max-w-xs p-5 text-center">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-bold">Install Stay CRM</p>
              <button
                aria-label="Close"
                onClick={() => setHelp(false)}
                className="btn-ghost !px-2.5 !py-1.5"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mb-3 text-xs text-[#6b6f6b]">
              {isIOS
                ? "iPhones install in 3 taps — then it opens from your home screen like a real app, no Safari bar."
                : "One tap away — then it opens from your home screen like a real app, no browser bar."}
            </p>
            {isIOS ? (
              <ol className="grid gap-2.5 text-sm font-semibold text-[#3d403d]">
                <li>
                  <span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#e7f2ec] text-[13px] font-bold text-[#1f6f4a]">1</span>
                  Tap <b>Share</b> in Safari&apos;s bottom bar
                </li>
                <li>
                  <span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#e7f2ec] text-[13px] font-bold text-[#1f6f4a]">2</span>
                  Tap <b>Add to Home Screen</b>
                </li>
                <li>
                  <span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#e7f2ec] text-[13px] font-bold text-[#1f6f4a]">3</span>
                  Tap <b>Add</b> — done, open it from home
                </li>
              </ol>
            ) : (
              <ol className="grid gap-2.5 text-sm font-semibold text-[#3d403d]">
                <li>
                  <span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#e7f2ec] text-[13px] font-bold text-[#1f6f4a]">1</span>
                  Use the app for a few seconds (open any page)
                </li>
                <li>
                  <span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#e7f2ec] text-[13px] font-bold text-[#1f6f4a]">2</span>
                  Come back here — the row becomes one-tap <b>Install</b>
                </li>
                <li>
                  <span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#e7f2ec] text-[13px] font-bold text-[#1f6f4a]">3</span>
                  Or right now: Chrome menu <b>⋮ → Install app</b>
                </li>
              </ol>
            )}
            <button onClick={() => setHelp(false)} className="btn-primary mt-4">
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
