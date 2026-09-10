import { NextResponse } from "next/server";
import { createRoomsBulk, deleteRoom, listRooms } from "@/lib/data";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ rooms: await listRooms() });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  // Accept: { numbers: string[] } or { from, to, prefix } or { count, start }
  let numbers: string[] = body.numbers ?? [];
  if (!numbers.length && body.from && body.to) {
    const a = Number(body.from);
    const b = Number(body.to);
    if (Number.isFinite(a) && Number.isFinite(b) && b >= a && b - a < 500) {
      numbers = Array.from({ length: b - a + 1 }, (_, i) => String(a + i));
    }
  }
  if (!numbers.length && body.count && body.start) {
    const c = Math.min(Number(body.count), 200);
    const s = Number(body.start);
    numbers = Array.from({ length: c }, (_, i) => String(s + i));
  }
  if (!numbers.length) {
    return NextResponse.json({ error: "No room numbers provided" }, { status: 400 });
  }
  const rooms = await createRoomsBulk({
    numbers,
    floor: body.floor,
    type: body.type,
    capacity: body.capacity ? Number(body.capacity) : 2,
  });
  return NextResponse.json({ rooms, created: rooms.length });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deleteRoom(id);
  return NextResponse.json({ ok: true });
}
