// One-go multi-room test: select 2 rooms, submit ONCE, expect 2 stays.
// Plus atomicity: invalid room in batch → 400, nothing created.
// Run: AUDIT_BASE=http://localhost:3102 node scripts/test-multiroom.mjs
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";

const EXE =
  "C:\\Users\\Asus\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe";
const BASE = process.env.AUDIT_BASE || "http://localhost:3102";
const PROOF = "C:\\Users\\Asus\\AppData\\Local\\Temp\\proof.png";
writeFileSync(PROOF, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

await page.goto(`${BASE}/checkin`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.getByRole("button", { name: "Multiple rooms", exact: true }).click();
await page.locator("button", { hasText: "101" }).click();
await page.locator("button", { hasText: "102" }).click();
// remove + re-add 102 via the × pill to verify removal works
await page.getByRole("button", { name: "Remove room 102", exact: true }).click();
await page.locator("button", { hasText: "102" }).click();
await page.getByPlaceholder(/as per govt id/i).fill("Two Rooms One Go");
await page.getByPlaceholder(/10-digit mobile/i).fill("9998881116");
await page.getByPlaceholder(/you@example\.com/i).fill("two@go.com");
await page.getByPlaceholder(/e\.g\. jaipur/i).fill("Jaipur");
await page.getByPlaceholder(/as on id/i).fill("ID9999");
await page.locator('input[type="file"]').setInputFiles(PROOF);
await page.getByRole("button", { name: /confirm · check in 2 rooms/i }).click();
await page.waitForTimeout(1500);
const done = await page.getByRole("heading", { name: /checked in/i }).count();
const roomsShown = await page.locator("text=Rooms 101, 102").count();
console.log("one-go done screen:", done === 1, "| rooms listed:", roomsShown >= 1);
await page.screenshot({ path: "C:\\Users\\Asus\\AppData\\Local\\Temp\\x-multiroom.png" });

const q1 = await (await page.request.get(`${BASE}/api/stays?q=9998881116`)).json();
const mine = q1.stays.filter((s) => s.clientName === "Two Rooms One Go");
console.log("stays created:", mine.length, mine.map((s) => `${s.roomNumber}:${s.status}`).join(","));

// atomicity: batch with a bad room must fail entirely
const bad = await (await page.request.post(`${BASE}/api/stays`, {
  data: { roomNumbers: ["101", "999"], name: "Nope", phone: "9998882226", email: "n@n.com", city: "X", idType: "Aadhaar", idNumber: "1", idProofUrls: ["data:image/png;base64,iVBOR"] },
})).json();
const q2 = await (await page.request.get(`${BASE}/api/stays?q=9998882226`)).json();
console.log("bad batch rejected:", !!bad.error, "| partial stays:", q2.stays.length);
await browser.close();
