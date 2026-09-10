"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  BedDouble,
  CalendarDays,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Today", icon: LayoutDashboard, exact: true },
  { href: "/admin/rooms", label: "Rooms", icon: BedDouble },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/guests", label: "Guests", icon: Images },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const logout = () => signOut({ callbackUrl: "/admin/login" });
  const section =
    pathname === "/admin"
      ? "Today"
      : pathname.startsWith("/admin/rooms")
        ? "Rooms"
        : pathname.startsWith("/admin/calendar")
          ? "Calendar"
          : pathname.startsWith("/admin/guests")
            ? "Guests"
            : "Admin";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-[#e8e8e4] bg-white/80 p-4 backdrop-blur md:flex">
        <div className="mb-3 px-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b6f6b]">
            Stay CRM
          </p>
          <p className="text-lg font-bold">Admin</p>
        </div>
        {NAV.map((n) => {
          const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] font-semibold",
                active ? "bg-[#1f6f4a] text-white" : "text-[#3d403d] hover:bg-[#f1f1ee]",
              )}
            >
              <n.icon size={18} />
              {n.label}
            </Link>
          );
        })}
        <div className="my-2 border-t border-[#e8e8e4]" />
        <Link
          href="/checkin"
          className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] font-semibold text-[#3d403d] hover:bg-[#f1f1ee]"
        >
          <QrCode size={18} />
          Guest form
        </Link>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[15px] font-semibold text-[#3d403d] hover:bg-[#f1f1ee]"
        >
          <LogOut size={18} />
          Sign out
        </button>
        <div className="mt-auto truncate px-2 text-xs text-[#6b6f6b]">
          {session?.user?.email ?? "Admin"}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-[#e8e8e4] bg-[#f7f7f5]/90 px-4 py-3 backdrop-blur md:hidden">
          <button
            aria-label="Menu"
            onClick={() => setOpen(true)}
            className="btn-ghost !px-3 !py-2"
          >
            <Menu size={18} />
          </button>
          <div className="font-bold">Stay CRM · {section}</div>
        </header>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-30 md:hidden">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 top-0 flex h-full w-72 flex-col gap-1 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-bold">Menu</div>
                <button
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="btn-ghost !px-3 !py-2"
                >
                  <X size={18} />
                </button>
              </div>
              {NAV.map((n) => {
                const active = n.exact
                  ? pathname === n.href
                  : pathname.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-[10px] px-3 py-3 text-[16px] font-semibold",
                      active
                        ? "bg-[#1f6f4a] text-white"
                        : "text-[#3d403d] hover:bg-[#f1f1ee]",
                    )}
                  >
                    <n.icon size={19} />
                    {n.label}
                  </Link>
                );
              })}
              <div className="my-2 border-t border-[#e8e8e4]" />
              <Link
                href="/checkin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-[10px] px-3 py-3 text-[16px] font-semibold text-[#3d403d] hover:bg-[#f1f1ee]"
              >
                <QrCode size={19} />
                Guest form
              </Link>
              <button
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left text-[16px] font-semibold text-[#3d403d] hover:bg-[#f1f1ee]"
              >
                <LogOut size={19} />
                Sign out
              </button>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-4 md:max-w-none md:px-8 md:pt-6">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e8e8e4] bg-white/95 backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4">
            {NAV.map((n) => {
              const active = n.exact
                ? pathname === n.href
                : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                    active ? "text-[#1f6f4a]" : "text-[#6b6f6b]",
                  )}
                >
                  <n.icon size={20} />
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
