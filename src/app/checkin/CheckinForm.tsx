"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronDown, Plus, Upload, X } from "lucide-react";
import { Card, Field, PrimaryButton } from "@/components/ui";
import TopBar from "@/components/TopBar";
import { cn } from "@/lib/utils";
import { uploadIdProof } from "@/lib/supabase";
import type { Room, Stay } from "@/lib/types";

interface Member {
  name: string;
  phone: string;
  email: string;
  idType: string;
  idNumber: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const blankMember = (): Member => ({ name: "", phone: "", email: "", idType: "Aadhaar", idNumber: "" });

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
  const [tried, setTried] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [guestAge, setGuestAge] = useState("");
  const [guestDob, setGuestDob] = useState("");
  const [idType, setIdType] = useState("Aadhaar");
  const [idNumber, setIdNumber] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingProofs, setExistingProofs] = useState(0);
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
        if (!roomNumber && list.length === 1) setRoomNumber(list[0].number);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Personal-link prefill: details already on file
  useEffect(() => {
    const t = params.get("token") ?? presetToken;
    if (!t) return;
    fetch(`/api/stays?token=${encodeURIComponent(t)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const st = d?.stay as Stay | undefined;
        if (!st) return;
        setRoomNumber(st.roomNumber ?? "");
        setName(st.clientName ?? "");
        setPhone(st.clientPhone ?? "");
        setEmail(st.clientEmail ?? "");
        setCity(st.city ?? "");
        setGuestAge(st.guestAge ?? "");
        setGuestDob(st.guestDob ?? "");
        setIdType(st.idType ?? "Aadhaar");
        setIdNumber(st.idNumber ?? "");
        if (Array.isArray(st.members) && st.members.length) {
          setMembers(
            st.members.map((m) => ({
              name: m.name ?? "",
              phone: m.phone ?? "",
              email: m.email ?? "",
              idType: m.idType ?? "Aadhaar",
              idNumber: m.idNumber ?? "",
            })),
          );
        }
        setExistingProofs(Array.isArray(st.idProofUrls) ? st.idProofUrls.length : 0);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const urls = files.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : ""));
    setPreviews(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [files]);

  // ---------- validation (mandatory fields go red) ----------
  const roomOk = roomNumber.trim().length > 0;
  const nameOk = name.trim().length > 0;
  const phoneOk = phone.replace(/\D/g, "").length >= 10;
  const emailOk = EMAIL_RE.test(email.trim());
  const cityOk = city.trim().length > 0;
  const idNumberOk = idNumber.trim().length > 0;
  const proofsOk = files.length > 0 || existingProofs > 0;
  const showEmailError = (tried || emailTouched) && !emailOk;

  function memberIssue(m: Member): { name: boolean; phone: boolean; email: boolean } {
    return {
      name: tried && !m.name.trim(),
      phone: m.phone.trim().length > 0 && m.phone.replace(/\D/g, "").length < 10,
      email: m.email.trim().length > 0 && !EMAIL_RE.test(m.email.trim()),
    };
  }
  const membersOk = members.every(
    (m) => m.name.trim() && !memberIssue(m).phone && !memberIssue(m).email,
  );
  const allOk =
    roomOk && nameOk && phoneOk && emailOk && cityOk && idNumberOk && proofsOk && membersOk;

  async function submit() {
    setTried(true);
    if (!allOk) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
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
          email: email.trim(),
          city: city.trim(),
          guestAge: guestAge.trim() || undefined,
          guestDob: guestDob || undefined,
          idType,
          idNumber: idNumber.trim(),
          idProofUrls,
          members: members
            .filter((m) => m.name.trim())
            .map((m) => ({
              name: m.name.trim(),
              phone: m.phone.trim() || undefined,
              email: m.email.trim() || undefined,
              idType: m.idType || undefined,
              idNumber: m.idNumber.trim() || undefined,
            })),
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
        {/* 1 — Guest details (all mandatory) */}
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
          <Field
            label="Your full name *"
            error={tried && !nameOk ? "Please enter your name" : undefined}
          >
            <input
              className={cn("input", tried && !nameOk && "input-error")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="As per govt ID"
              autoComplete="name"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Mobile number *"
              error={tried && !phoneOk ? "10-digit number needed" : undefined}
            >
              <input
                className={cn("input", tried && !phoneOk && "input-error")}
                inputMode="tel"
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </Field>
            <Field
              label="Email *"
              error={showEmailError ? "Valid email needed" : undefined}
            >
              <input
                className={cn("input", showEmailError && "input-error")}
                inputMode="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                autoComplete="email"
              />
            </Field>
          </div>
          <Field
            label="City *"
            error={tried && !cityOk ? "Which city are you from?" : undefined}
          >
            <input
              className={cn("input", tried && !cityOk && "input-error")}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Jaipur"
              autoComplete="address-level2"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <input
                className="input"
                inputMode="numeric"
                placeholder="Years"
                value={guestAge}
                onChange={(e) => setGuestAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
              />
            </Field>
            <Field label="Date of birth">
              <input
                className="input"
                type="date"
                value={guestDob}
                onChange={(e) => setGuestDob(e.target.value)}
              />
            </Field>
          </div>
        </Card>

        {/* 2 — ID proof (mandatory: type + number + min 1 photo) */}
        <Card className="grid gap-3">
          <p className="text-[13px] font-bold">ID proof *</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ID type *">
              <select className="input" value={idType} onChange={(e) => setIdType(e.target.value)}>
                <option>Aadhaar</option>
                <option>PAN</option>
                <option>Passport</option>
                <option>Driving Licence</option>
                <option>Voter ID</option>
              </select>
            </Field>
            <Field
              label="ID number *"
              error={tried && !idNumberOk ? "Required" : undefined}
            >
              <input
                className={cn("input", tried && !idNumberOk && "input-error")}
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="As on ID"
              />
            </Field>
          </div>
          <div>
            <label
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed p-4 text-sm font-semibold text-[#3d403d]",
                tried && !proofsOk
                  ? "border-[#d92d20] bg-[#fffafa]"
                  : "border-[#c9c9c4] bg-[#fafaf8]",
              )}
            >
              <Upload size={16} />
              {files.length
                ? `${files.length} file(s) selected`
                : existingProofs > 0
                  ? `${existingProofs} photo(s) already on file — tap to replace/add`
                  : "Tap to upload ID photo / PDF *"}
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 3))}
              />
            </label>
            {tried && !proofsOk && (
              <span className="field-error">At least one ID proof photo is required</span>
            )}
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
              <p className="text-xs text-[#6b6f6b]">
                Everyone in Room {roomNumber || "…"} — name mandatory, phone/email optional
              </p>
            </div>
            <button
              className="btn-ghost !py-1.5"
              onClick={() => setMembers([...members, blankMember()])}
            >
              <span className="inline-flex items-center gap-1 text-[13px]">
                <Plus size={14} /> Add
              </span>
            </button>
          </div>
          {members.length === 0 && (
            <button
              className="rounded-[10px] border border-dashed border-[#c9c9c4] p-3 text-sm font-semibold text-[#6b6f6b]"
              onClick={() => setMembers([blankMember()])}
            >
              + Add companion
            </button>
          )}
          {members.map((m, i) => {
            const issue = memberIssue(m);
            const set = (patch: Partial<Member>) => {
              const c = [...members];
              c[i] = { ...c[i], ...patch };
              setMembers(c);
            };
            return (
              <div key={i} className="grid gap-2 rounded-[10px] border border-[#e8e8e4] p-2.5">
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      className={cn("input", issue.name && "input-error")}
                      placeholder={`Companion ${i + 1} name *`}
                      value={m.name}
                      onChange={(e) => set({ name: e.target.value })}
                    />
                    {issue.name && <span className="field-error">Name required</span>}
                  </div>
                  <button
                    aria-label="remove"
                    className="btn-ghost h-fit shrink-0"
                    onClick={() => setMembers(members.filter((_, j) => j !== i))}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      className={cn("input", issue.phone && "input-error")}
                      placeholder="Phone (optional)"
                      inputMode="tel"
                      value={m.phone}
                      onChange={(e) => set({ phone: e.target.value })}
                    />
                    {issue.phone && <span className="field-error">10 digits needed</span>}
                  </div>
                  <div>
                    <input
                      className={cn("input", issue.email && "input-error")}
                      placeholder="Email (optional)"
                      inputMode="email"
                      value={m.email}
                      onChange={(e) => set({ email: e.target.value })}
                    />
                    {issue.email && <span className="field-error">Invalid email</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="input"
                    value={m.idType}
                    onChange={(e) => set({ idType: e.target.value })}
                    aria-label="Companion ID type"
                  >
                    <option value="">ID type (optional)</option>
                    <option>Aadhaar</option>
                    <option>PAN</option>
                    <option>Passport</option>
                    <option>Driving Licence</option>
                    <option>Voter ID</option>
                  </select>
                  <input
                    className="input"
                    placeholder="ID number (optional)"
                    value={m.idNumber}
                    onChange={(e) => set({ idNumber: e.target.value })}
                  />
                </div>
              </div>
            );
          })}
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
