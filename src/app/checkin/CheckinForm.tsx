"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronDown, Plus, Upload, X } from "lucide-react";
import { Card, Field, PrimaryButton } from "@/components/ui";
import TopBar from "@/components/TopBar";
import { cn } from "@/lib/utils";
import { uploadIdProof } from "@/lib/supabase";
import type { Room } from "@/lib/types";

interface Member {
  name: string;
  age: string;
  relation: string;
}

function CheckinInner({
  presetToken,
  presetRoom,
}: {
  presetToken?: string;
  presetRoom?: string;
}) {
  const params = useSearchParams();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomNumber, setRoomNumber] = useState(
    presetRoom ?? params.get("room") ?? "",
  );
  const [token, setToken] = useState(params.get("token") ?? presetToken ?? "");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [tried, setTried] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [idType, setIdType] = useState("Aadhaar");
  const [idNumber, setIdNumber] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const r = params.get("room");
    const t = params.get("token");
    if (r) setRoomNumber(r);
    if (t) setToken(t);
  }, [params]);

  useEffect(() => {
    if (presetRoom) setRoomNumber(presetRoom);
    if (presetToken) setToken(presetToken);
  }, [presetRoom, presetToken]);

  // Rooms come straight from what admin created (/admin/rooms)
  useEffect(() => {
    fetch("/api/rooms")
      .then((r) => r.json())
      .then((d) => {
        const list: Room[] = d.rooms ?? [];
        setRooms(list);
        // auto-select if only one room or ?room= matches
        if (!roomNumber && list.length === 1) setRoomNumber(list[0].number);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const urls = files.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : ""));
    setPreviews(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [files]);

  const roomOk = roomNumber.trim().length > 0;
  const nameOk = name.trim().length > 0;
  const phoneOk = phone.replace(/\D/g, "").length >= 10;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const showEmailError = (tried || emailTouched) && !emailOk;

  async function submit() {
    setTried(true);
    if (!roomOk || !nameOk || !phoneOk || !emailOk) return;
    setBusy(true);
    try {
      const idProofUrls: string[] = [];
      for (const f of files.slice(0, 3)) {
        idProofUrls.push(await uploadIdProof(f, token || roomNumber));
      }
      const res = await fetch("/api/stays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token || undefined,
          roomNumber: roomNumber.trim(),
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          idType,
          idNumber: idNumber.trim() || undefined,
          idProofUrls,
          members: members.filter((m) => m.name.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      setDone(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-10">
        <Card className="text-center">
          <CheckCircle2 size={40} className="mx-auto text-[#1f6f4a]" />
          <h1 className="mt-2 text-xl font-bold">Checked in 🎉</h1>
          <p className="mt-1 text-sm text-[#6b6f6b]">
            Room {roomNumber} · {name}. Your details are saved with the front desk.
            Enjoy your stay!
          </p>
          <Link href="/" className="btn-ghost mt-4 inline-block">
            ← Back to home
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 py-6">
      <TopBar title="Guest check-in" fallback="/" />
      <h1 className="mt-2 text-[22px] font-bold">Your stay details</h1>
      <p className="text-sm text-[#6b6f6b]">
        One entry per room per day. Fill once for everyone in the room.
      </p>

      <div className="mt-4 grid gap-3">
        {/* 1 — Room first, selectable from admin inventory */}
        <Card className="grid gap-3">
          <Field
            label="Room number *"
            error={tried && !roomOk ? "Please select your room" : undefined}
          >
            {rooms.length > 0 ? (
              <div className="relative">
                <select
                  className={cn(
                    "input appearance-none pr-10",
                    tried && !roomOk && "input-error",
                  )}
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                >
                  <option value="">Select your room…</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.number}>
                      Room {r.number} · {r.type}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6f6b]"
                />
              </div>
            ) : (
              <input
                className={cn("input", tried && !roomOk && "input-error")}
                inputMode="numeric"
                placeholder="e.g. 101"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
              />
            )}
          </Field>
          <div className="grid grid-cols-1 gap-3">
            <Field
              label="Your full name *"
              error={tried && !nameOk ? "Please enter your name" : undefined}
            >
              <input
                className={cn("input", tried && !nameOk && "input-error")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="As per ID"
              />
            </Field>
            <Field
              label="Mobile number *"
              error={tried && !phoneOk ? "Enter a valid 10-digit number" : undefined}
            >
              <input
                className={cn("input", tried && !phoneOk && "input-error")}
                inputMode="tel"
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field
              label="Email *"
              error={showEmailError ? "Enter a valid email address" : undefined}
            >
              <input
                className={cn("input", showEmailError && "input-error")}
                inputMode="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
              />
            </Field>
          </div>
        </Card>

        {/* 2 — ID + photo upload */}
        <Card className="grid gap-3">
          <p className="text-[13px] font-bold">ID proof + photo</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ID type">
              <select className="input" value={idType} onChange={(e) => setIdType(e.target.value)}>
                <option>Aadhaar</option>
                <option>PAN</option>
                <option>Passport</option>
                <option>Driving Licence</option>
                <option>Voter ID</option>
              </select>
            </Field>
            <Field label="ID number">
              <input
                className="input"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="last 4 / full"
              />
            </Field>
          </div>
          <div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#c9c9c4] bg-[#fafaf8] p-4 text-sm font-semibold text-[#3d403d]">
              <Upload size={16} />
              {files.length ? `${files.length} file(s) selected` : "Tap to upload ID photo / PDF"}
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 3))}
              />
            </label>
            {previews.some(Boolean) && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {files.map((f, i) =>
                  previews[i] ? (
                    <div key={i} className="relative overflow-hidden rounded-[10px] border border-[#e8e8e4]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previews[i]} alt={f.name} className="h-20 w-full object-cover" />
                      <button
                        aria-label="remove file"
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                        onClick={() => setFiles(files.filter((_, j) => j !== i))}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div key={i} className="flex h-20 items-center justify-center rounded-[10px] border border-[#e8e8e4] bg-[#f7f7f5] p-1 text-center text-[10px] font-semibold text-[#6b6f6b]">
                      {f.name}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </Card>

        {/* 3 — Companions: + so all add in a single form */}
        <Card className="grid gap-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-bold">Companions</p>
              <p className="text-xs text-[#6b6f6b]">Everyone staying in Room {roomNumber || "…"} — add all here</p>
            </div>
            <button
              className="btn-ghost !py-1.5"
              onClick={() => setMembers([...members, { name: "", age: "", relation: "" }])}
            >
              <span className="inline-flex items-center gap-1 text-[13px]">
                <Plus size={14} /> Add
              </span>
            </button>
          </div>
          {members.length === 0 && (
            <button
              className="rounded-[10px] border border-dashed border-[#c9c9c4] p-3 text-sm font-semibold text-[#6b6f6b]"
              onClick={() => setMembers([{ name: "", age: "", relation: "" }])}
            >
              + Add companion
            </button>
          )}
          {members.map((m, i) => (
            <div key={i} className="grid gap-2 rounded-[10px] border border-[#e8e8e4] p-2.5">
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder={`Companion ${i + 1} name *`}
                  value={m.name}
                  onChange={(e) => {
                    const c = [...members];
                    c[i] = { ...c[i], name: e.target.value };
                    setMembers(c);
                  }}
                />
                <button
                  aria-label="remove"
                  className="btn-ghost shrink-0"
                  onClick={() => setMembers(members.filter((_, j) => j !== i))}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input"
                  placeholder="Age (optional)"
                  value={m.age}
                  onChange={(e) => {
                    const c = [...members];
                    c[i] = { ...c[i], age: e.target.value };
                    setMembers(c);
                  }}
                />
                <input
                  className="input"
                  placeholder="Relation (optional)"
                  value={m.relation}
                  onChange={(e) => {
                    const c = [...members];
                    c[i] = { ...c[i], relation: e.target.value };
                    setMembers(c);
                  }}
                />
              </div>
            </div>
          ))}
        </Card>

        {/* 4 — More details (collapsible) */}
        <Card>
          <button
            className="flex w-full items-center justify-between py-1 text-left"
            onClick={() => setShowMore(!showMore)}
          >
            <span className="text-[13px] font-bold">
              More details {showMore ? "▾" : "▸"}
            </span>
            <span className="text-xs text-[#6b6f6b]">address, notes</span>
          </button>
          {showMore && (
            <div className="mt-2 grid gap-3">
              <Field label="Address">
                <input
                  className="input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="City, State"
                />
              </Field>
            </div>
          )}
        </Card>

        <PrimaryButton disabled={busy} onClick={submit}>
          {busy ? "Saving…" : `Confirm · Check in Room ${roomNumber || "…"}`}
        </PrimaryButton>
        <p className="text-center text-xs text-[#6b6f6b]">
          By confirming you agree your stay details are shared with the property.
        </p>
      </div>
    </div>
  );
}

export default function CheckinPage({
  presetToken,
  presetRoom,
}: {
  presetToken?: string;
  presetRoom?: string;
}) {
  return (
    <Suspense>
      <CheckinInner presetToken={presetToken} presetRoom={presetRoom} />
    </Suspense>
  );
}
