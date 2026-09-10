// Probe candidate fixes live: applies each style override to /admin/guests
// and reports scrollWidth. No file edits needed.
import { chromium } from "playwright-core";

const EXE =
  "C:\\Users\\Asus\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe";
const BASE = process.env.AUDIT_BASE || "http://localhost:3103";

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 360, height: 740 }, isMobile: true });
await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
await page.locator("input").nth(0).fill("admin@stay.local");
await page.locator('input[type="password"]').fill("admin123");
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL("**/admin", { timeout: 10000 });
await page.goto(`${BASE}/admin/guests`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const base = await page.evaluate(() => document.documentElement.scrollWidth);
console.log("baseline scrollW=" + base);

const candidates = {
  "page-root fr column": () => {
    document.querySelector("main > div").style.gridTemplateColumns =
      "repeat(1, minmax(0, 1fr))";
  },
  "scroller min-w-0": () => {
    document.querySelectorAll(".no-scrollbar").forEach((el) => (el.style.minWidth = "0"));
  },
  "section overflow-hidden": () => {
    document.querySelector("main > div").children[2].style.overflow = "hidden";
  },
};

for (const name of Object.keys(candidates)) {
  // reload resets styles, then apply one candidate
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.evaluate(`(${candidates[name].toString()})()`);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(`candidate "${name}" scrollW=${sw}`);
}
await browser.close();
