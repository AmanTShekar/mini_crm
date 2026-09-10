import { NextResponse } from "next/server";
import { createPendingStay } from "@/lib/data";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.roomNumber || !body.phone) {
      return NextResponse.json({ error: "roomNumber and phone required" }, { status: 400 });
    }
    const stay = await createPendingStay(
      String(body.roomNumber),
      String(body.phone),
      body.name ? String(body.name) : "Guest",
    );
    return NextResponse.json({ stay });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
