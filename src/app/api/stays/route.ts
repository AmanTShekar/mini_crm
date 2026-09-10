import { NextResponse } from "next/server";
import { listStays, listStaysByDate, searchStays, submitCheckin } from "@/lib/data";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const q = searchParams.get("q");
  if (date) return NextResponse.json({ stays: await listStaysByDate(date) });
  if (q !== null) return NextResponse.json({ stays: await searchStays(q) });
  return NextResponse.json({ stays: await listStays() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.roomNumber || !body.name || !body.phone) {
      return NextResponse.json(
        { error: "roomNumber, name and phone are required" },
        { status: 400 },
      );
    }
    const stay = await submitCheckin({
      token: body.token,
      roomNumber: String(body.roomNumber),
      name: String(body.name),
      phone: String(body.phone),
      email: body.email,
      address: body.address,
      idType: body.idType,
      idNumber: body.idNumber,
      idProofUrls: body.idProofUrls ?? [],
      members: body.members ?? [],
      notes: body.notes,
    });
    return NextResponse.json({ stay });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
