"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MessageCircle, Trophy } from "lucide-react";
import type { Stay } from "@/lib/types";
import { waLink } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card, StatusChip } from "@/components/ui";
import { CallButton, WhatsAppButton } from "@/components/actions";

interface TopGuest {
  name: string;
  phone: string;
  city: string;
  visits: number;
  lastStay: string;
  lastRoom: string;
}

function winBackMessage(name: string): string {
  return (
    `Hello ${name}! We miss hosting you — hope your last stay was comfortable. ` +
    `We'd love to welcome you back! Reply here and we'll keep a room ready for you.`
  );
}

function cityOf(s: Stay): string {
  return s.address?.split(",")[0]?.trim() || "Unknown";
}

function GuestsInner() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [city, setCity] = useState("All");
  const [stays, setStays] = useState<Stay[]>([]);
  const [allStays, setAllStays] = useState<Stay[]>([]);
  const firstRender = useRef(true);

  async function load(query: string) {
    const res = await fetch(`/api/stays?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setStays(data.stays ?? []);
  }

  useEffect(() => {
    // Full list powers CRM insights (top guests, cities) — independent of search.
    fetch("/api/stays")
      .then((r) => r.json())
      .then((d) => setAllStays(d.stays ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      load(params.get("q") ?? "");
      return;
    }
    // Live search as you type (debounced)
    const t = setTimeout(() => load(q), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // ---------- CRM insights from the full dataset ----------
  const insights = useMemo(() => {
    const byPhone = new Map<string, Stay[]>();
    for (const s of allStays) {
      const k = s.clientPhone.replace(/\D/g, "").slice(-10);
      if (!byPhone.has(k)) byPhone.set(k, []);
      byPhone.get(k)!.push(s);
    }
    const guests: TopGuest[] = [...byPhone.values()].map((list) => {
      const sorted = [...list].sort((a, b) => b.checkInDate.localeCompare(a.checkInDate));
      const latest = sorted[0];
      return {
        name: latest.clientName,
        phone: latest.clientPhone,
        city: cityOf(latest),
        visits: list.length,
        lastStay: latest.checkInDate,
        lastRoom: latest.roomNumber,
      };
    });
    guests.sort((a, b) => b.visits - a.visits || b.lastStay.localeCompare(a.lastStay));
    const cities = new Map<string, number>();
    for (const g of guests) cities.set(g.city, (cities.get(g.city) ?? 0) + 1);
    const visitsByPhone = new Map<string, number>(guests.map((g) => [g.phone.replace(/\D/g, "").slice(-10), g.visits]));
    return {
      guests,
      top: guests.slice(0, 5),
      cities: [...cities.entries()].sort((a, b) => b[1] - a[1]),
      visitsByPhone,
    };
  }, [allStays]);

  // ---------- Gallery (month → date), city-filtered ----------
  const grouped = useMemo(() => {
    const visible = city === "All" ? stays : stays.filter((s) => cityOf(s) === city);
    const byMonth = new Map<string, Map<string, Stay[]>>();
    for (const s of visible) {
      const m = s.checkInDate.slice(0, 7);
      if (!byMonth.has(m)) byMonth.set(m, new Map());
      const days = byMonth.get(m)!;
      if (!days.has(s.checkInDate)) days.set(s.checkInDate, []);
      days.get(s.checkInDate)!.push(s);
    }
    return [...byMonth.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, days]) => ({
        month,
        days: [...days.entries()]
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([date, items]) => ({ date, stays: items })),
      }));
  }, [stays, city]);

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6b6f6b]">
          CRM · {insights.guests.length} guests · {allStays.length} stays
        </p>
        <h1 className="text-[22px] font-bold">Guests</h1>
        <p className="text-sm text-[#6b6f6b]">
          Best customers on top. Search, filter by city, call or message anyone
          to invite them back.
        </p>
      </div>

      {/* Top guests — most visits first */}
      {insights.top.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold">
            <Trophy size={14} className="text-[#9a6b1a]" />
            Top guests
          </p>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
            {insights.top.map((g, i) => (
              <Card key={g.phone} className="w-60 shrink-0 !p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1f6f4a] text-[13px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{g.name}</p>
                    <p className="truncate text-xs text-[#6b6f6b]">
                      {g.visits} visit{g.visits > 1 ? "s" : ""} · last {g.lastStay}
                    </p>
                  </div>
                </div>
                <p className="mt-1 truncate text-xs text-[#6b6f6b]">
                  {g.city} · Room {g.lastRoom}
                </p>
                <div className="mt-2 flex gap-2">
                  <CallButton phone={g.phone} />
                  <a
                    href={waLink(g.phone, winBackMessage(g.name))}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost inline-flex items-center gap-1.5 !border-[#1f6f4a] !py-2 !text-[#1f6f4a]"
                  >
                    <MessageCircle size={15} />
                    Invite back
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
      >
        <input
          className="input"
          placeholder="Search name, phone, email, room…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn-ghost shrink-0" type="submit">
          Search
        </button>
      </form>

      {/* City filter */}
      {insights.cities.length > 1 && (
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {["All", ...insights.cities.map(([c]) => c)].map((c) => (
            <button
              key={c}
              onClick={() => setCity(c)}
              className={cn(
                "chip shrink-0 !py-1.5",
                city === c && "!border-[#1f6f4a] !bg-[#1f6f4a] !text-white",
              )}
            >
              {c}
              {c !== "All" && (
                <span className="opacity-70">
                  ·{insights.cities.find(([x]) => x === c)?.[1]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {grouped.map((g) => (
        <div key={g.month} className="grid gap-2">
          <p className="mt-1 text-[13px] font-bold uppercase tracking-wide text-[#6b6f6b]">
            {new Date(g.month + "-02").toLocaleString("en-IN", { month: "long", year: "numeric" })}
          </p>
          {g.days.map((d) => (
            <div key={d.date} className="grid gap-2">
              <p className="text-[13px] font-semibold">{d.date} · {d.stays.length}</p>
              <div className="grid gap-2">
                {d.stays.map((s) => {
                  const visits = insights.visitsByPhone.get(s.clientPhone.replace(/\D/g, "").slice(-10)) ?? 1;
                  return (
                    <Card key={s.id} className="!p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate font-bold">{s.clientName}</p>
                            {visits > 1 && (
                              <span className="chip bg-[#e7f2ec] text-[#1f6f4a] border-[#cde4d6]">
                                {visits} visits
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-[#6b6f6b]">
                            Room {s.roomNumber} · {s.clientPhone}
                            {s.clientEmail ? ` · ${s.clientEmail}` : ""}
                          </p>
                        </div>
                        <StatusChip status={s.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <CallButton phone={s.clientPhone} />
                        <WhatsAppButton
                          phone={s.clientPhone}
                          message={winBackMessage(s.clientName)}
                        />
                        <Link href={`/admin/guests/${s.id}`} className="btn-ghost !py-2 text-[13px]">
                          Open file
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}

      {grouped.length === 0 && (
        <Card><p className="text-sm text-[#6b6f6b]">No guests found.</p></Card>
      )}
    </div>
  );
}

export default function GuestsPage() {
  return (
    <Suspense>
      <GuestsInner />
    </Suspense>
  );
}
