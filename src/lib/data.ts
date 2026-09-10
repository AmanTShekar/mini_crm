import type { Client, Room, Stay, StayStatus } from "./types";
import { todayISO, tokenForStay } from "./utils";

/**
 * Persistence layer.
 *
 * Demo mode (default): in-memory store seeded with sample data so the app
 * runs instantly on Vercel free with zero config.
 *
 * Production mode: set Supabase env vars and run supabase/schema.sql,
 * then replace these functions with Supabase queries (same signatures).
 * Signatures are intentionally DB-shaped (async, id-based) to make that
 * swap a drop-in.
 */

interface Store {
  rooms: Room[];
  clients: Client[];
  stays: Stay[];
}

const g = globalThis as unknown as { __crmStore?: Store };

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}

function seed(): Store {
  const now = new Date().toISOString();
  const today = todayISO();
  const rooms: Room[] = ["101", "102", "103", "104", "201", "202"].map(
    (n, i) => ({
      id: `room_${n}`,
      number: n,
      floor: n.startsWith("1") ? "Ground" : "First",
      type: i % 3 === 0 ? "Deluxe" : "Standard",
      capacity: i % 3 === 0 ? 3 : 2,
      status: i < 2 ? "occupied" : "available",
      createdAt: now,
    }),
  );
  const clients: Client[] = [
    {
      id: "client_1",
      name: "Aarav Sharma",
      phone: "9876543210",
      email: "aarav@example.com",
      address: "Jaipur, Rajasthan",
      idType: "Aadhaar",
      idNumber: "XXXX-XXXX-1234",
      visitCount: 3,
      lastStayAt: today,
      createdAt: now,
    },
    {
      id: "client_2",
      name: "Priya Nair",
      phone: "9811112233",
      email: "priya@example.com",
      address: "Kochi, Kerala",
      idType: "Aadhaar",
      idNumber: "XXXX-XXXX-5678",
      visitCount: 1,
      lastStayAt: today,
      createdAt: now,
    },
  ];
  const stays: Stay[] = [
    {
      id: "stay_1",
      token: "demo101a",
      roomId: "room_101",
      roomNumber: "101",
      clientId: "client_1",
      clientName: "Aarav Sharma",
      clientPhone: "9876543210",
      clientEmail: "aarav@example.com",
      address: "Jaipur, Rajasthan",
      idType: "Aadhaar",
      idNumber: "XXXX-XXXX-1234",
      idProofUrls: [],
      members: [{ name: "Aarav Sharma" }, { name: "Riya Sharma", relation: "Spouse" }],
      checkInDate: today,
      status: "checked_in",
      isRevisit: true,
      createdAt: now,
    },
    {
      id: "stay_2",
      token: "demo102b",
      roomId: "room_102",
      roomNumber: "102",
      clientId: "client_2",
      clientName: "Priya Nair",
      clientPhone: "9811112233",
      clientEmail: "priya@example.com",
      address: "Kochi, Kerala",
      idType: "Aadhaar",
      idNumber: "XXXX-XXXX-5678",
      idProofUrls: [],
      members: [{ name: "Priya Nair" }],
      checkInDate: today,
      status: "checked_in",
      isRevisit: false,
      createdAt: now,
    },
  ];
  return { rooms, clients, stays };
}

export function store(): Store {
  if (!g.__crmStore) g.__crmStore = seed();
  return g.__crmStore;
}

// ---------- Rooms ----------

export async function listRooms(): Promise<Room[]> {
  return [...store().rooms].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
}

export async function createRoomsBulk(input: {
  numbers: string[];
  floor?: string;
  type?: string;
  capacity?: number;
}): Promise<Room[]> {
  const s = store();
  const now = new Date().toISOString();
  const created: Room[] = [];
  for (const raw of input.numbers) {
    const number = raw.trim();
    if (!number) continue;
    if (s.rooms.some((r) => r.number === number)) continue;
    const room: Room = {
      id: uid("room"),
      number,
      floor: input.floor ?? "",
      type: input.type ?? "Standard",
      capacity: input.capacity ?? 2,
      status: "available",
      createdAt: now,
    };
    s.rooms.push(room);
    created.push(room);
  }
  return created;
}

export async function deleteRoom(id: string): Promise<void> {
  const s = store();
  s.rooms = s.rooms.filter((r) => r.id !== id);
}

// ---------- Clients / Stays ----------

export async function findClientByPhoneOrEmail(
  phone: string,
  email?: string,
): Promise<Client | undefined> {
  const digits = phone.replace(/\D/g, "").slice(-10);
  const s = store();
  return s.clients.find(
    (c) =>
      c.phone.replace(/\D/g, "").slice(-10) === digits ||
      (email && c.email?.toLowerCase() === email.toLowerCase()),
  );
}

export async function listStays(): Promise<Stay[]> {
  return [...store().stays].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listStaysByDate(dateISO: string): Promise<Stay[]> {
  return (await listStays()).filter((s) => s.checkInDate === dateISO);
}

export async function getStayByToken(token: string): Promise<Stay | undefined> {
  return store().stays.find((s) => s.token === token.toLowerCase());
}

export async function getStay(id: string): Promise<Stay | undefined> {
  return store().stays.find((s) => s.id === id);
}

export async function searchStays(query: string): Promise<Stay[]> {
  const q = query.trim().toLowerCase();
  if (!q) return listStays();
  const digits = q.replace(/\D/g, "");
  return (await listStays()).filter(
    (s) =>
      s.clientName.toLowerCase().includes(q) ||
      s.roomNumber.toLowerCase().includes(q) ||
      s.clientEmail?.toLowerCase().includes(q) ||
      (digits.length >= 4 && s.clientPhone.replace(/\D/g, "").includes(digits)),
  );
}

export async function createPendingStay(roomNumber: string, phone: string, name = "Guest"): Promise<Stay> {
  const s = store();
  const room = s.rooms.find((r) => r.number === roomNumber);
  if (!room) throw new Error("Room not found");
  const existing = await findClientByPhoneOrEmail(phone);
  const now = new Date().toISOString();
  const token = tokenForStay();
  // One live entry per room per date: reuse pending stay if present
  const today = todayISO();
  const dup = s.stays.find(
    (x) => x.roomNumber === roomNumber && x.checkInDate === today && x.status === "pending",
  );
  if (dup) return dup;
  const stay: Stay = {
    id: uid("stay"),
    token,
    roomId: room.id,
    roomNumber: room.number,
    clientId: existing?.id ?? uid("client"),
    clientName: existing?.name ?? name,
    clientPhone: phone,
    clientEmail: existing?.email,
    idProofUrls: [],
    members: [],
    checkInDate: today,
    status: "pending",
    isRevisit: Boolean(existing && existing.visitCount > 0),
    createdAt: now,
  };
  s.stays.push(stay);
  if (!existing) {
    s.clients.push({
      id: stay.clientId,
      name: name,
      phone,
      email: undefined,
      visitCount: 0,
      createdAt: now,
    });
  }
  return stay;
}

export async function submitCheckin(input: {
  token?: string;
  roomNumber: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  idType?: string;
  idNumber?: string;
  idProofUrls?: string[];
  members?: { name: string; age?: string; relation?: string }[];
  notes?: string;
}): Promise<Stay> {
  const s = store();
  const room = s.rooms.find((r) => r.number === input.roomNumber);
  if (!room) throw new Error("Invalid room number");
  const today = todayISO();
  const existingClient = await findClientByPhoneOrEmail(input.phone, input.email);
  const now = new Date().toISOString();

  let client: Client;
  if (existingClient) {
    client = existingClient;
    client.name = input.name || client.name;
    if (input.email) client.email = input.email;
    if (input.address) client.address = input.address;
    if (input.idType) client.idType = input.idType;
    if (input.idNumber) client.idNumber = input.idNumber;
    client.visitCount += 1;
    client.lastStayAt = today;
  } else {
    client = {
      id: uid("client"),
      name: input.name,
      phone: input.phone,
      email: input.email,
      address: input.address,
      idType: input.idType,
      idNumber: input.idNumber,
      visitCount: 1,
      lastStayAt: today,
      createdAt: now,
    };
    s.clients.push(client);
  }

  // One entry per room per date: update if a stay already exists for room+date
  let stay = input.token
    ? s.stays.find((x) => x.token === input.token!.toLowerCase())
    : s.stays.find((x) => x.roomNumber === room.number && x.checkInDate === today && x.status !== "checked_out");

  const isRevisit = client.visitCount > 1;
  if (stay) {
    Object.assign(stay, {
      clientId: client.id,
      clientName: input.name,
      clientPhone: input.phone,
      clientEmail: input.email,
      address: input.address,
      idType: input.idType,
      idNumber: input.idNumber,
      idProofUrls: input.idProofUrls ?? stay.idProofUrls,
      members: input.members?.length ? input.members : [{ name: input.name }],
      status: "checked_in" as StayStatus,
      isRevisit,
      notes: input.notes,
    });
  } else {
    stay = {
      id: uid("stay"),
      token: tokenForStay(),
      roomId: room.id,
      roomNumber: room.number,
      clientId: client.id,
      clientName: input.name,
      clientPhone: input.phone,
      clientEmail: input.email,
      address: input.address,
      idType: input.idType,
      idNumber: input.idNumber,
      idProofUrls: input.idProofUrls ?? [],
      members: input.members?.length ? input.members : [{ name: input.name }],
      checkInDate: today,
      status: "checked_in",
      isRevisit,
      notes: input.notes,
      createdAt: now,
    };
    s.stays.push(stay);
  }
  room.status = "occupied";
  return stay;
}

export async function checkoutStay(id: string): Promise<Stay | undefined> {
  const stay = await getStay(id);
  if (!stay) return undefined;
  stay.status = "checked_out";
  const room = store().rooms.find((r) => r.id === stay.roomId);
  // free room if no other active stay today
  const today = todayISO();
  const otherActive = store().stays.some(
    (x) => x.roomId === stay.roomId && x.checkInDate === today && x.status === "checked_in",
  );
  if (room && !otherActive) room.status = "available";
  return stay;
}

export async function staysGroupedByMonth(): Promise<
  { month: string; days: { date: string; stays: Stay[] }[] }[]
> {
  const stays = await listStays();
  const byMonth = new Map<string, Map<string, Stay[]>>();
  for (const st of stays) {
    const month = st.checkInDate.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, new Map());
    const days = byMonth.get(month)!;
    if (!days.has(st.checkInDate)) days.set(st.checkInDate, []);
    days.get(st.checkInDate)!.push(st);
  }
  return [...byMonth.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, days]) => ({
      month,
      days: [...days.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([date, list]) => ({ date, stays: list })),
    }));
}

export async function occupancyFor(dateISO: string): Promise<{
  total: number;
  occupied: number;
  pending: number;
  available: number;
}> {
  const rooms = await listRooms();
  const stays = await listStaysByDate(dateISO);
  const occupiedRooms = new Set(
    stays.filter((s) => s.status === "checked_in").map((s) => s.roomId),
  );
  const pendingRooms = new Set(
    stays.filter((s) => s.status === "pending").map((s) => s.roomId),
  );
  return {
    total: rooms.length,
    occupied: occupiedRooms.size,
    pending: pendingRooms.size,
    available: Math.max(0, rooms.length - occupiedRooms.size - pendingRooms.size),
  };
}
