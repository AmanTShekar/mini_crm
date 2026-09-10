export type RoomStatus = "available" | "occupied" | "cleaning";
export type StayStatus = "pending" | "checked_in" | "checked_out";

export interface Room {
  id: string;
  number: string;
  floor?: string;
  type: string;
  capacity: number;
  status: RoomStatus;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  idType?: string;
  idNumber?: string;
  visitCount: number;
  lastStayAt?: string;
  createdAt: string;
}

export interface StayMember {
  name: string;
  age?: string;
  relation?: string;
}

export interface Stay {
  id: string;
  token: string;
  roomId: string;
  roomNumber: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  address?: string;
  idType?: string;
  idNumber?: string;
  idProofUrls: string[];
  members: StayMember[];
  checkInDate: string; // YYYY-MM-DD
  checkOutDate?: string;
  status: StayStatus;
  notes?: string;
  isRevisit: boolean;
  createdAt: string;
}

export interface OtpSession {
  phone: string;
  roomNumber: string;
  code: string;
  expiresAt: number;
  verified: boolean;
}
