import { NextResponse } from "next/server";
import {
  getStayByToken,
  listRooms,
  listStays,
  listStaysByDate,
  searchStays,
  submitCheckin,
} from "@/lib/data";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const q = searchParams.get("q");
  const token = searchParams.get("token");
  if (token) {
    // Personal-link prefill: token is unguessable, safe without admin auth.
    const stay = await getStayByToken(token);
    if (!stay) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    return NextResponse.json({ stay });
  }
  if (date) return NextResponse.json({ stays: await listStaysByDate(date) });
  if (q !== null) return NextResponse.json({ stays: await searchStays(q) });
  return NextResponse.json({ stays: await listStays() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fail = (error: string) => NextResponse.json({ error }, { status: 400 });

    // One submit can cover MULTIPLE rooms (guest takes 2 rooms, fills once).
    const rawList: any[] = Array.isArray(body.roomNumbers) ? body.roomNumbers : [];
    const rawRooms: string[] = rawList.length
      ? rawList.map((r) => String(r).trim()).filter(Boolean)
      : body.roomNumber
        ? [String(body.roomNumber).trim()]
        : [];
    const roomNumbers = [...new Set(rawRooms)];
    if (!roomNumbers.length) return fail("Select at least one room");
    if (!body.name?.trim()) return fail("Full name is required");
    if (!String(body.phone ?? "").replace(/\D/g, "").match(/^\d{10,}$/))
      return fail("A valid 10-digit mobile number is required");
    if (!EMAIL_RE.test(String(body.email ?? "").trim()))
      return fail("A valid email address is required");
    if (!body.city?.trim()) return fail("City is required");
    if (!body.idType) return fail("ID type is required");
    if (!body.idNumber?.trim()) return fail("ID number is required");
    if (!Array.isArray(body.idProofUrls) || body.idProofUrls.length === 0)
      return fail("At least one ID proof photo is required");

    const members: any[] = Array.isArray(body.members) ? body.members : [];
    for (const m of members) {
      if (!m?.name?.trim()) return fail("Every companion needs a name");
      if (m.email && !EMAIL_RE.test(String(m.email).trim()))
        return fail(`Invalid email for companion ${m.name}`);
      if (m.phone && String(m.phone).replace(/\D/g, "").length < 10)
        return fail(`Invalid phone for companion ${m.name}`);
    }

    // Validate ALL rooms exist first — no partial bookings.
    const rooms = await listRooms();
    const valid = new Set(rooms.map((r) => r.number));
    for (const rn of roomNumbers) {
      if (!valid.has(rn)) return fail(`Room ${rn} doesn't exist`);
    }

    const cleanMembers = members
      .filter((m: any) => m?.name?.trim())
      .map((m: any) => ({
        name: String(m.name).trim(),
        age: m.age?.trim() || undefined,
        relation: m.relation?.trim() || undefined,
        phone: m.phone?.trim() || undefined,
        email: m.email?.trim() || undefined,
        idType: m.idType || undefined,
        idNumber: m.idNumber?.trim() || undefined,
      }));

    // A personal-link token belongs to its original room only.
    const tokenStay = body.token
      ? await getStayByToken(String(body.token))
      : undefined;

    const base = {
      name: String(body.name).trim(),
      phone: String(body.phone).trim(),
      email: String(body.email).trim(),
      city: String(body.city).trim(),
      guestAge: body.guestAge?.trim() || undefined,
      guestDob: body.guestDob || undefined,
      address: body.address?.trim() || undefined,
      idType: body.idType,
      idNumber: String(body.idNumber).trim(),
      idProofUrls: body.idProofUrls,
      members: cleanMembers,
      notes: body.notes,
    };

    const stays = [];
    for (const rn of roomNumbers) {
      stays.push(
        await submitCheckin({
          ...base,
          roomNumber: rn,
          token:
            tokenStay && tokenStay.roomNumber === rn ? tokenStay.token : undefined,
        }),
      );
    }
    return NextResponse.json({ stays, stay: stays[0] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
