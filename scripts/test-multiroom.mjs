// Dropdown multi-room test: open list, tick 2 rooms, submit ONCE.
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

// single mode: pick 101 (dropdown auto-closes)
await page.getByRole("button", { name: "Select rooms", exact: true }).click();
await page.locator(".absolute.top-full button").nth(0).click();
await page.waitForTimeout(300);
const closedAfterSingle = (await page.locator(".absolute.top-full").count()) === 0;
console.log("single pick auto-closes:", closedAfterSingle);

// multi mode: tick 102 (stays open), remove via ×, re-add
await page.getByRole("button", { name: "Multiple rooms", exact: true }).click();
await page.getByRole("button", { name: "Select rooms", exact: true }).click();
await page.locator(".absolute.top-full button").nth(1).click();
await page.getByRole("button", { name: "Close room list", exact: true }).click();
const pills = await page.locator("text=Room 102").count();
await page.getByRole("button", { name: "Remove room 102", exact: true }).click();
await page.waitForTimeout(300);
const pillGone = (await page.locator("text=Room 102").count()) < pills;
console.log("× pill removes room:", pillGone);
await page.getByRole("button", { name: "Select rooms", exact: true }).click();
await page.locator(".absolute.top-full button").nth(1).click();
await page.keyboard.press("Escape");
await page.getByRole("button", { name: "Close room list", exact: true }).click();

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
