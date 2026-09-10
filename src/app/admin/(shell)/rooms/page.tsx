"use client";

import { useEffect, useState } from "react";
import type { Room } from "@/lib/types";
import { Card, Field, PrimaryButton } from "@/components/ui";
import { RoomQR, InviteBox } from "@/components/actions";
import { Trash2 } from "lucide-react";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [from, setFrom] = useState("101");
  const [to, setTo] = useState("110");
  const [floor, setFloor] = useState("Ground");
  const [type, setType] = useState("Standard");
  const [capacity, setCapacity] = useState("2");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const res = await fetch("/api/rooms");
    const data = await res.json();
    setRooms(data.rooms ?? []);
    setLoaded(true);
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    setBusy(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, floor, type, capacity: Number(capacity) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this room?")) return;
    await fetch(`/api/rooms?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6b6f6b]">
          Inventory
        </p>
        <h1 className="text-[22px] font-bold">Rooms</h1>
        <p className="text-sm text-[#6b6f6b]">
          Create numbers in bulk. Guests select their room from this list at
          check-in, and each room gets a printable QR.
        </p>
      </div>

      <Card className="grid gap-3">
        <p className="text-[13px] font-bold">Bulk create (e.g. 101 → 110)</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><input className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><input className="input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="Floor"><input className="input" value={floor} onChange={(e) => setFloor(e.target.value)} /></Field>
          <Field label="Type">
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option>Standard</option>
              <option>Deluxe</option>
              <option>Suite</option>
              <option>Dorm</option>
            </select>
          </Field>
        </div>
        <Field label="Capacity per room">
          <input className="input" value={capacity} onChange={(e) => setCapacity(e.target.value)} inputMode="numeric" />
        </Field>
        <PrimaryButton disabled={busy} onClick={create}>
          {busy ? "Creating…" : `Create rooms ${from}–${to}`}
        </PrimaryButton>
      </Card>

      <div className="grid gap-2">
        {loaded && rooms.length === 0 && (
          <Card>
            <p className="font-bold">No rooms yet</p>
            <p className="text-sm text-[#6b6f6b]">
              Create your first range above, e.g. 101 → 110.
            </p>
          </Card>
        )}
        {rooms.map((r) => (
          <Card key={r.id} className="!p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">Room {r.number}</p>
                <p className="text-xs text-[#6b6f6b]">
                  {r.type} · {r.floor || "—"} · cap {r.capacity}
                </p>
              </div>
              <div className="flex gap-2">
                <RoomQR roomNumber={r.number} />
                <button aria-label="delete" className="btn-ghost !px-3 !py-2 text-red-700" onClick={() => remove(r.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <InviteBox roomNumber={r.number} />
          </Card>
        ))}
      </div>
    </div>
  );
}
