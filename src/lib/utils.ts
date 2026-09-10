import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatINPhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export function waLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  // default to India country code if 10 digits
  const intl = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

export function checkinUrl(base: string, roomNumber: string, token?: string): string {
  const url = new URL("/checkin", base);
  url.searchParams.set("room", roomNumber);
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

export function tokenForStay(): string {
  return (
    Math.random().toString(36).slice(2, 8) +
    Date.now().toString(36).slice(-4)
  ).toLowerCase();
}

export function otpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function guestInviteMessage(
  guestName: string,
  roomNumber: string,
  link: string,
): string {
  return `Hello ${guestName || "Guest"}, your Room ${roomNumber} check-in is ready. Please fill your details + ID proof here: ${link} - Thank you!`;
}
