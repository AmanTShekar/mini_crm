// UI-level multi-room test: fills /checkin twice via "Book another room"
// and confirms 2 distinct stays exist. Run against a live server:
// AUDIT_BASE=http://localhost:3000 node scripts/test-multiroom.mjs
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";

const EXE =
  "C:\\Users\\Asus\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe";
const BASE = process.env.AUDIT_BASE || "http://localhost:3000";
const PROOF = "C:\\Users\\Asus\\AppData\\Local\\Temp\\proof.png";
// 1x1 png
writeFileSync(PROOF, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

async function fillCheckin(room, name) {
  await page.goto(`${BASE}/checkin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const roomSel = page.locator("select").first();
  if ((await roomSel.count()) > 0) {
    await roomSel.selectOption(room);
  } else {
    await page.getByPlaceholder(/e\.g\. 101/i).fill(room);
  }
  await page.getByPlaceholder(/as per govt id/i).fill(name);
  await page.getByPlaceholder(/10-digit mobile/i).fill("9998887776");
  await page.getByPlaceholder(/you@example\.com/i).fill("multi@test.com");
  await page.getByPlaceholder(/e\.g\. jaipur/i).fill("Jaipur");
  await page.getByPlaceholder(/as on id/i).fill("ID1234");
  await page.locator('input[type="file"]').setInputFiles(PROOF);
  await page.getByRole("button", { name: /confirm · check in/i }).click();
  await page.waitForTimeout(1500);
}

await fillCheckin("101", "Multi Room");
const done1 = await page.getByRole("heading", { name: /checked in/i }).count();
console.log("booking1 done screen:", done1 === 1);
const multiBtn = await page.getByRole("button", { name: /book another room/i }).count();
console.log("book-another-room button present:", multiBtn === 1);
if (multiBtn) {
  await page.getByRole("button", { name: /book another room/i }).click();
  await page.waitForTimeout(800);
  const keptName = await page.getByPlaceholder(/as per govt id/i).inputValue();
  console.log("details kept after reset:", keptName === "Multi Room");
  const roomSel = page.locator("select").first();
  if ((await roomSel.count()) > 0) {
    await roomSel.selectOption("102");
  } else {
    await page.getByPlaceholder(/e\.g\. 101/i).fill("102");
  }
  await page.locator('input[type="file"]').setInputFiles(PROOF);
  await page.getByRole("button", { name: /confirm · check in/i }).click();
  await page.waitForTimeout(1500);
  const done2 = await page.getByRole("heading", { name: /checked in/i }).count();
  console.log("booking2 done screen:", done2 === 1);
}

const res = await page.request.get(`${BASE}/api/stays?q=9998887776`);
const data = await res.json();
const mine = data.stays.filter((s) => s.clientName === "Multi Room");
console.log("distinct stays for guest:", mine.length, mine.map((s) => s.roomNumber).join(","));
await browser.close();
