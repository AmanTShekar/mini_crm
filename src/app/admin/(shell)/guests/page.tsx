"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock3, MessageCircle, Repeat2, Trophy } from "lucide-react";
import type { Stay } from "@/lib/types";
import { guestInviteMessage, waLink } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card, StatusChip } from "@/components/ui";
import { CallButton, WhatsAppButton } from "@/components/actions";

interface RankedGuest {
  name: string;
  phone: string;
  city: string;
  visits: number;
  lastStay: string;
  lastRoom: string;
  score: number;
}

function winBackMessage(name: string): string {
  return (
    `Hello ${name}! We miss hosting you — hope your last stay was comfortable. ` +
    `We'd love to welcome you back! Reply here and we'll keep a room ready for you.`
  );
}

function cityOf(s: Stay): string {
  return s.city?.trim() || s.address?.split(",")[0]?.trim() || "Unknown";
}

function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

function scoreOf(visits: number, lastStay: string): number {
  const days = Math.floor(
    (Date.now() - new Date(`${lastStay}T12:00:00`).getTime()) / 86400000,
  );
  return visits * 10 + (days <= 7 ? 10 : days <= 30 ? 5 : 0);
}

function GuestsInner() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [city, setCity] = useState("All");
  const [stays, setStays] = useState<Stay[]>([]);
  const [allStays, setAllStays] = useState<Stay[]>([]);
  const firstRender = useRef(true);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function load(query: string) {
    const res = await fetch(`/api/stays?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setStays(data.stays ?? []);
  }

  useEffect(() => {
    // Full list powers CRM insights (rankings, cities) — independent of search.
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

  // ---------- CRM engine: rankings, cities, pending ----------
  const crm = useMemo(() => {
    const byPhone = new Map<string, Stay[]>();
    for (const s of allStays) {
      const k = phoneKey(s.clientPhone);
      if (!byPhone.has(k)) byPhone.set(k, []);
      byPhone.get(k)!.push(s);
    }
    const guests: RankedGuest[] = [...byPhone.values()].map((list) => {
      const sorted = [...list].sort((a, b) => b.checkInDate.localeCompare(a.checkInDate));
      const latest = sorted[0];
      return {
        name: latest.clientName,
        phone: latest.clientPhone,
        city: cityOf(latest),
        visits: list.length,
        lastStay: latest.checkInDate,
        lastRoom: latest.roomNumber,
        score: scoreOf(list.length, latest.checkInDate),
      };
    });
    guests.sort((a, b) => b.score - a.score || b.visits - a.visits);
    const repeat = guests.filter((g) => g.visits > 1);
    const pending = [...allStays]
      .filter((s) => s.status === "pending")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCount = allStays.filter((s) => s.checkInDate === todayStr).length;
    const cities = new Map<string, number>();
    for (const g of guests) cities.set(g.city, (cities.get(g.city) ?? 0) + 1);
    const visitsByPhone = new Map<string, number>(
      guests.map((g) => [phoneKey(g.phone), g.visits]),
    );
    return {
      guests,
      top: guests.slice(0, 5),
      repeat,
      pending,
      todayCount,
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
    <div className="grid gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6b6f6b]">
          CRM · {crm.guests.length} guests · {allStays.length} stays
        </p>
        <h1 className="text-[22px] font-bold">Guests</h1>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { k: "Guests", v: crm.guests.length },
          { k: "Repeat", v: crm.repeat.length },
          { k: "Pending", v: crm.pending.length },
          { k: "Today", v: crm.todayCount },
        ].map((s) => (
          <Card key={s.k} className="!p-3 text-center">
            <p className="text-xl font-bold">{s.v}</p>
            <p className="text-[11px] font-semibold text-[#6b6f6b]">{s.k}</p>
          </Card>
        ))}
      </div>

      {/* Action needed — invites not filled yet */}
      {crm.pending.length > 0 && (
        <section className="grid gap-2">
          <p className="flex items-center gap-1.5 text-[13px] font-bold">
            <Clock3 size={14} className="text-[#9a6b1a]" />
            Action needed · {crm.pending.length} invite{crm.pending.length > 1 ? "s" : ""} not filled
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {crm.pending.slice(0, 4).map((s) => (
              <Card key={s.id} className="flex !border-[#f0ddb8] !p-3 flex-col">
                <p className="break-words font-bold">
                  Room {s.roomNumber} · {s.clientName}
                </p>
                <p className="break-words text-xs text-[#6b6f6b]">
                  {s.clientPhone} · invited {s.checkInDate}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <CallButton phone={s.clientPhone} />
                  <a
                    href={waLink(
                      s.clientPhone,
                      guestInviteMessage(s.clientName, s.roomNumber, `${origin}/c/${s.token}`),
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost inline-flex items-center gap-1.5 !border-[#1f6f4a] !py-2 !text-[#1f6f4a]"
                  >
                    <MessageCircle size={15} />
                    Resend link
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Top guests — scored & ranked */}
      {crm.top.length > 0 && (
        <section>
          <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold">
            <Trophy size={14} className="text-[#9a6b1a]" />
            Top guests · scored by visits + recency
          </p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {crm.top.map((g, i) => (
              <Card key={g.phone} className="flex w-60 shrink-0 flex-col !p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1f6f4a] text-[13px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{g.name}</p>
                    <p className="truncate text-xs text-[#6b6f6b]">
                      {g.visits} visit{g.visits > 1 ? "s" : ""} · score {g.score}
                    </p>
                  </div>
                </div>
                <p className="mt-1 truncate text-xs text-[#6b6f6b]">
                  {g.city} · last {g.lastStay}
                </p>
                <div className="mt-auto flex gap-2 pt-2">
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
        </section>
      )}

      {/* Repeat customers — full ranked list, one-click contact */}
      {crm.repeat.length > 0 && (
        <section className="grid gap-2">
          <p className="flex items-center gap-1.5 text-[13px] font-bold">
            <Repeat2 size={15} className="text-[#1f6f4a]" />
            Repeat customers · {crm.repeat.length}
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {crm.repeat.slice(0, 10).map((g, i) => (
              <Card key={g.phone} className="flex !p-3 flex-col">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f1f1ee] text-[13px] font-bold text-[#3d403d]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{g.name}</p>
                    <p className="truncate text-xs text-[#6b6f6b]">
                      {g.visits} visits · score {g.score} · {g.city} · last {g.lastStay}
                    </p>
                  </div>
                </div>
                <div className="mt-auto flex gap-2 pt-2">
                  <CallButton phone={g.phone} />
                  <a
                    href={waLink(g.phone, winBackMessage(g.name))}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost inline-flex items-center gap-1.5 !py-2"
                  >
                    <MessageCircle size={15} />
                    WhatsApp
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Search + city filter */}
      <section className="grid gap-2">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load(q);
          }}
        >
        <input
          className="input min-w-0 flex-1"
          placeholder="Search name, phone, email, room…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
          <button className="btn-ghost shrink-0" type="submit">
            Search
          </button>
        </form>

        {crm.cities.length > 1 && (
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 md:flex-wrap">
            {["All", ...crm.cities.map(([c]) => c)].map((c) => (
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
                    ·{crm.cities.find(([x]) => x === c)?.[1]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Gallery */}
      {grouped.map((g) => (
        <div key={g.month} className="grid gap-2">
          <p className="mt-1 text-[13px] font-bold uppercase tracking-wide text-[#6b6f6b]">
            {new Date(g.month + "-02").toLocaleString("en-IN", { month: "long", year: "numeric" })}
          </p>
          {g.days.map((d) => (
            <div key={d.date} className="grid gap-2">
              <p className="text-[13px] font-semibold">{d.date} · {d.stays.length}</p>
              <div className="grid gap-2 md:grid-cols-2">
                {d.stays.map((s) => {
                  const visits = crm.visitsByPhone.get(phoneKey(s.clientPhone)) ?? 1;
                  return (
                    <Card key={s.id} className="flex !p-3 flex-col">
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
                      <div className="mt-auto flex flex-wrap gap-2 pt-2">
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
