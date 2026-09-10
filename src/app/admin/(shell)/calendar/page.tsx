"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Stay } from "@/lib/types";
import { Card, StatusChip } from "@/components/ui";
import { CallButton } from "@/components/actions";

function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= days; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return cells;
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [stays, setStays] = useState<Stay[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const cells = useMemo(() => monthGrid(year, month), [year, month]);

  useEffect(() => {
    // Load all stays once (demo scale) and bucket client-side.
    fetch("/api/stays")
      .then((r) => r.json())
      .then((d) => {
        const list: Stay[] = d.stays ?? [];
        setStays(list);
        const c: Record<string, number> = {};
        for (const s of list) c[s.checkInDate] = (c[s.checkInDate] ?? 0) + 1;
        setCounts(c);
      });
  }, []);

  const dayStays = selected ? stays.filter((s) => s.checkInDate === selected) : [];

  function shift(dir: number) {
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6b6f6b]">
            Bookings
          </p>
          <h1 className="text-[22px] font-bold">Calendar</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => shift(-1)}>‹</button>
          <button className="btn-ghost" onClick={() => shift(1)}>›</button>
        </div>
      </div>

      <Card>
        <p className="mb-2 text-center text-sm font-bold">
          {new Date(year, month, 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}
        </p>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#6b6f6b]">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((date, i) =>
            date ? (
              <button
                key={i}
                onClick={() => setSelected(date)}
                className={`relative rounded-[10px] border p-1.5 text-center text-[13px] font-semibold ${
                  selected === date
                    ? "border-[#1f6f4a] bg-[#e7f2ec] text-[#1f6f4a]"
                    : "border-[#e8e8e4] bg-white"
                }`}
              >
                {Number(date.slice(-2))}
                {(counts[date] ?? 0) > 0 && (
                  <span className="mx-auto mt-0.5 block w-fit rounded-full bg-[#1f6f4a] px-1.5 text-[10px] font-bold text-white">
                    {counts[date]}
                  </span>
                )}
              </button>
            ) : (
              <div key={i} />
            ),
          )}
        </div>
      </Card>

      {selected && (
        <div className="grid gap-2">
          <p className="text-sm font-bold">
            {selected} · {dayStays.length} check-in(s)
          </p>
          {dayStays.map((s) => (
            <Card key={s.id} className="!p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold">
                    Room {s.roomNumber} · {s.clientName}
                  </p>
                  <p className="text-xs text-[#6b6f6b]">
                    {s.clientPhone} · {s.members.length || 1} guest(s)
                  </p>
                </div>
                <StatusChip status={s.status} />
              </div>
              <div className="mt-2 flex gap-2">
                <CallButton phone={s.clientPhone} />
                <Link href={`/admin/guests/${s.id}`} className="btn-ghost !py-2 text-[13px]">
                  Open file
                </Link>
              </div>
            </Card>
          ))}
          {dayStays.length === 0 && (
            <Card><p className="text-sm text-[#6b6f6b]">No bookings on this date.</p></Card>
          )}
        </div>
      )}
    </div>
  );
}
