import { notFound } from "next/navigation";
import { getStay } from "@/lib/data";
import { Card, StatusChip } from "@/components/ui";
import TopBar from "@/components/TopBar";
import { CallButton, WhatsAppButton } from "@/components/actions";
import { guestInviteMessage } from "@/lib/utils";
import { headers } from "next/headers";
import CheckoutButton from "./CheckoutButton";

export const dynamic = "force-dynamic";

export default async function GuestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stay = await getStay(id);
  if (!stay) notFound();

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  const link = `${proto}://${host}/c/${stay.token}`;

  return (
    <div className="grid gap-3">
      <TopBar title="Guest file" fallback="/admin/guests" />
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-bold">{stay.clientName}</h1>
            {stay.isRevisit && (
              <span className="chip bg-[#e7f2ec] text-[#1f6f4a] border-[#cde4d6]">
                Revisit guest
              </span>
            )}
          </div>
          <p className="text-sm text-[#6b6f6b]">
            Room {stay.roomNumber} · {stay.checkInDate}
          </p>
        </div>
        <StatusChip status={stay.status} />
      </div>

      <Card className="grid gap-2">
        <Row k="Phone" v={stay.clientPhone} />
        <Row k="Email" v={stay.clientEmail ?? "—"} />
        <Row k="Address" v={stay.address ?? "—"} />
        <Row k="ID" v={stay.idType ? `${stay.idType} · ${stay.idNumber ?? ""}` : "—"} />
        <Row k="Guests" v={stay.members.length ? stay.members.map((m) => m.name).join(", ") : stay.clientName} />
        <Row k="Link" v={link} mono />
        <div className="mt-1 flex flex-wrap gap-2">
          <CallButton phone={stay.clientPhone} label={stay.clientPhone} />
          <WhatsAppButton
            phone={stay.clientPhone}
            message={guestInviteMessage(stay.clientName, stay.roomNumber, link)}
          />
          <CheckoutButton id={stay.id} status={stay.status} />
        </div>
      </Card>

      <Card>
        <p className="text-[13px] font-bold">ID proofs ({stay.idProofUrls.length})</p>
        {stay.idProofUrls.length === 0 && (
          <p className="mt-1 text-sm text-[#6b6f6b]">No uploads yet.</p>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2">
          {stay.idProofUrls.map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-[10px] border border-[#e8e8e4]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`ID ${i + 1}`} className="h-32 w-full object-cover" />
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[#f1f1ee] py-1.5 text-sm last:border-0">
      <span className="shrink-0 font-semibold text-[#6b6f6b]">{k}</span>
      <span className={`text-right font-semibold ${mono ? "break-all font-mono text-[12px]" : ""}`}>{v}</span>
    </div>
  );
}
