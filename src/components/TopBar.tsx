"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Simple top nav bar with a back button. Falls back to `fallback` when no history. */
export default function TopBar({
  title,
  fallback = "/",
  right,
  className,
}: {
  title: string;
  fallback?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        aria-label="Go back"
        onClick={() => {
          if (typeof window !== "undefined" && window.history.length > 1)
            router.back();
          else router.push(fallback);
        }}
        className="btn-ghost !px-3 !py-2"
      >
        <ArrowLeft size={18} />
      </button>
      <p className="min-w-0 flex-1 truncate text-[15px] font-bold">{title}</p>
      {right && <div className="ml-auto shrink-0">{right}</div>}
    </div>
  );
}
