"use client";

import { useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Download, MessageCircle, Phone, Printer, X } from "lucide-react";
import { checkinUrl, waLink, guestInviteMessage } from "@/lib/utils";

export function CallButton({ phone, label }: { phone: string; label?: string }) {
  return (
    <a
      href={`tel:${phone}`}
      className="btn-ghost inline-flex items-center gap-1.5 !py-2 text-[#1f6f4a]"
    >
      <Phone size={15} />
      {label ?? "Call"}
    </a>
  );
}

export function WhatsAppButton({ phone, message }: { phone: string; message: string }) {
  return (
    <a
      href={waLink(phone, message)}
      target="_blank"
      rel="noreferrer"
      className="btn-ghost inline-flex items-center gap-1.5 !py-2"
    >
      <MessageCircle size={15} />
      WhatsApp
    </a>
  );
}

export function InviteBox({
  roomNumber,
  token,
  defaultPhone = "",
  defaultName = "Guest",
}: {
  roomNumber: string;
  token?: string;
  defaultPhone?: string;
  defaultName?: string;
}) {
  const [phone, setPhone] = useState(defaultPhone);
  const [sent, setSent] = useState<string | null>(null);

  async function sendInvite() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      alert("Enter a valid phone number");
      return;
    }
    const res = await fetch("/api/stays/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomNumber, phone: digits, name: defaultName }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Failed");
      return;
    }
    const base = window.location.origin;
    const link = token
      ? `${base}/c/${data.stay.token}`
      : checkinUrl(base, roomNumber, data.stay.token);
    window.open(waLink(digits, guestInviteMessage(defaultName, roomNumber, link)), "_blank");
    setSent(data.stay.token);
  }

  return (
    <div className="box mt-3 p-3">
      <p className="text-[13px] font-bold">Invite guest on WhatsApp</p>
      <p className="text-xs text-[#6b6f6b]">
        Enter phone number → creates a one-time check-in link for Room {roomNumber} and
        opens WhatsApp.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          className="input min-w-0 flex-1"
          inputMode="tel"
          placeholder="Guest phone, e.g. 98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button onClick={sendInvite} className="btn-ghost shrink-0 !border-[#1f6f4a] !text-[#1f6f4a]">
          Send
        </button>
      </div>
      {sent && <p className="mt-1 text-xs text-[#1f6f4a]">Link ready · token {sent}</p>}
    </div>
  );
}

export function RoomQR({ roomNumber }: { roomNumber: string; token?: string }) {
  const [show, setShow] = useState(false);
  const [link, setLink] = useState("");
  const qrWrap = useRef<HTMLDivElement>(null);

  function open() {
    const base = window.location.origin;
    // Printed QR must work forever → room-only link, no one-time token.
    // Guest picks room (pre-selected) → details + ID + companions.
    setLink(checkinUrl(base, roomNumber));
    setShow(true);
  }

  function qrSvg(): SVGSVGElement | null {
    return qrWrap.current?.querySelector("svg") ?? null;
  }

  function downloadPNG() {
    const svg = qrSvg();
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const a = document.createElement("a");
      a.download = `room-${roomNumber}-checkin-qr.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
  }

  function printCard() {
    const svg = qrSvg()?.outerHTML ?? "";
    const w = window.open("", "_blank", "width=640,height=780");
    if (!w) {
      alert("Please allow popups to print the QR card");
      return;
    }
    w.document.write(`<!doctype html>
<html><head><title>Room ${roomNumber} · Scan to check in</title>
<style>
  * { font-family: Arial, Helvetica, sans-serif; }
  body { display: flex; justify-content: center; padding: 24px; }
  .card { width: 340px; border: 2px solid #1a1a18; border-radius: 18px; padding: 28px 24px; text-align: center; }
  .brand { font-size: 11px; font-weight: 700; letter-spacing: 3px; color: #6b6f6b; margin: 0; }
  h1 { font-size: 44px; margin: 6px 0 0; }
  .sub { font-size: 15px; font-weight: 700; margin: 2px 0 14px; }
  svg { width: 240px; height: 240px; }
  .url { font-size: 10px; color: #6b6f6b; word-break: break-all; margin: 12px 0 0; }
  .hint { font-size: 12px; margin: 8px 0 0; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="card">
    <p class="brand">STAY CRM</p>
    <h1>Room ${roomNumber}</h1>
    <p class="sub">Scan to check in</p>
    ${svg}
    <p class="url">${link}</p>
    <p class="hint">Select room → details + ID + companions</p>
  </div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };</script>
</body></html>`);
    w.document.close();
  }

  return (
    <>
      <button className="btn-ghost !py-2" onClick={open}>
        QR
      </button>
      {show && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShow(false)} />
          <div className="box relative w-full max-w-sm p-5 text-center">
            <button
              aria-label="Close"
              onClick={() => setShow(false)}
              className="btn-ghost absolute right-3 top-3 !px-2.5 !py-1.5"
            >
              <X size={16} />
            </button>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6b6f6b]">
              Stay CRM · Guest check-in
            </p>
            <p className="text-[26px] font-bold">Room {roomNumber}</p>
            <p className="text-sm font-semibold text-[#3d403d]">Scan to check in</p>
            <div
              ref={qrWrap}
              className="mx-auto mt-3 w-fit rounded-[12px] border border-[#e8e8e4] bg-white p-3"
            >
              <QRCode value={link || "https://example.com"} size={200} />
            </div>
            <p className="mx-auto mt-2 max-w-full break-all text-[11px] text-[#6b6f6b]">
              {link}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={downloadPNG}
                className="btn-ghost inline-flex items-center justify-center gap-1.5"
              >
                <Download size={15} />
                PNG
              </button>
              <button
                onClick={printCard}
                className="btn-ghost inline-flex items-center justify-center gap-1.5 !border-[#1f6f4a] !text-[#1f6f4a]"
              >
                <Printer size={15} />
                Print
              </button>
            </div>
            <p className="mt-2 text-xs text-[#6b6f6b]">
              Stick it on the door — this QR never expires.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
