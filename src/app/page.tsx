import Link from "next/link";
import { BedDouble, QrCode } from "lucide-react";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-10">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6b6f6b]">
        Stay CRM
      </p>
      <h1 className="mt-1 text-[28px] font-bold leading-tight">
        Guest check-in,
        <br />
        minus the paperwork.
      </h1>
      <p className="mt-2 text-[15px] text-[#6b6f6b]">
        Scan the room QR or open your WhatsApp link, pick your room, add
        everyone + ID. One entry per room per day.
      </p>

      <div className="mt-6 grid gap-3">
        <Link href="/checkin" className="box flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#e7f2ec] text-[#1f6f4a]">
            <QrCode size={22} />
          </span>
          <span>
            <span className="block font-bold">Guest check-in</span>
            <span className="block text-[13px] text-[#6b6f6b]">
              Select room → details + ID + companions
            </span>
          </span>
        </Link>
        <Link href="/admin" className="box flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#f1f1ee] text-[#3d403d]">
            <BedDouble size={22} />
          </span>
          <span>
            <span className="block font-bold">Admin</span>
            <span className="block text-[13px] text-[#6b6f6b]">
              Today · Rooms · Calendar · Guests
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
