import Link from "next/link";
import { listRooms, listStaysByDate, occupancyFor } from "@/lib/data";
import { todayISO } from "@/lib/utils";
import { Card, StatusChip } from "@/components/ui";
import { CallButton, InviteBox, RoomQR, WhatsAppButton } from "@/components/actions";
import { guestInviteMessage, checkinUrl } from "@/lib/utils";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function AdminToday() {
  const today = todayISO();
  const [rooms, stays, occ] = await Promise.all([
    listRooms(),
    listStaysByDate(today),
    occupancyFor(today),
  ]);
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  const base = `${proto}://${host}`;

  const stayByRoom = new Map(stays.map((s) => [s.roomId, s]));

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6b6f6b]">
          {today}
        </p>
        <h1 className="text-[22px] font-bold">Today · who&apos;s in?</h1>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { k: "Rooms", v: occ.total },
          { k: "In", v: occ.occupied },
          { k: "Pending", v: occ.pending },
          { k: "Free", v: occ.available },
        ].map((s) => (
          <Card key={s.k} className="!p-3 text-center">
            <p className="text-xl font-bold">{s.v}</p>
            <p className="text-[11px] font-semibold text-[#6b6f6b]">{s.k}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => {
          const stay = stayByRoom.get(room.id);
          const link = stay
            ? `${base}/c/${stay.token}`
            : checkinUrl(base, room.number);
          return (
            <Card key={room.id} className="!p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[16px] font-bold">Room {room.number}</p>
                    {stay ? (
                      <StatusChip status={stay.status} />
                    ) : (
                      <span className="chip bg-[#f1f1ee] text-[#6b6f6b]">Free</span>
                    )}
                    {stay?.isRevisit && (
                      <span className="chip bg-[#e7f2ec] text-[#1f6f4a] border-[#cde4d6]">
                        Revisit
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6b6f6b]">
                    {room.type} · {room.floor || "—"} · cap {room.capacity}
                    {stay
                      ? ` · ${stay.clientName} · ${stay.members.length || 1} guest(s)`
                      : " · no check-in yet"}
                  </p>
                </div>
                <RoomQR roomNumber={room.number} token={stay?.token} />
              </div>

              {stay && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <CallButton phone={stay.clientPhone} />
                  <WhatsAppButton
                    phone={stay.clientPhone}
                    message={guestInviteMessage(stay.clientName, room.number, link)}
                  />
                  <Link href={`/admin/guests?q=${encodeURIComponent(stay.clientPhone)}`} className="btn-ghost !py-2 text-[13px]">
                    Open file
                  </Link>
                </div>
              )}
              {!stay && <InviteBox roomNumber={room.number} />}
            </Card>
          );
        })}
      </div>

      {rooms.length === 0 && (
        <Card>
          <p className="font-bold">No rooms yet</p>
          <p className="text-sm text-[#6b6f6b]">
            Go to Rooms → add numbers like 101–110. Rooms are pre-assigned; guests
            only fill details.
          </p>
          <Link href="/admin/rooms" className="btn-ghost mt-2 inline-block">
            Create rooms
          </Link>
        </Card>
      )}
    </div>
  );
}
