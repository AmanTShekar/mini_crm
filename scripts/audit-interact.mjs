// Interaction audit: measures overflow AFTER real user actions
// (typing, chips, drawer, modals, companions) at 360px.
// Run: AUDIT_BASE=http://localhost:3000 node scripts/audit-interact.mjs
import { chromium } from "playwright-core";

const EXE =
  "C:\\Users\\Asus\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe";
const BASE = process.env.AUDIT_BASE || "http://localhost:3000";
const OUT = "C:\\Users\\Asus\\AppData\\Local\\Temp";

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

async function snap(name, path, authed, act) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  if (act) await act().catch((e) => console.log(`   action failed: ${e.message.split("\n")[0]}`));
  await page.waitForTimeout(400);
  const rep = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    vw: document.documentElement.clientWidth,
  }));
  await page.screenshot({ path: `${OUT}/x-${name}.png` });
  console.log(`${name}: vw=${rep.vw} sw=${rep.sw} overflow=${rep.sw - rep.vw}`);
}

// login once (sets cookies for authed pages)
await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
await page.locator("input").nth(0).fill("admin@stay.local");
await page.locator('input[type="password"]').fill("admin123");
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL("**/admin", { timeout: 10000 });

await snap("g-search-type", "/admin/guests", true, () =>
  page.getByPlaceholder(/search name/i).fill("aarav sharma extra long query text here"),
);
await snap("g-chip", "/admin/guests", true, () =>
  page.getByRole("button", { name: /jaipur/i }).click(),
);
await snap("g-drawer", "/admin/guests", true, () =>
  page.getByRole("button", { name: /^menu$/i }).click(),
);
await snap("today-qr", "/admin", true, () =>
  page.getByRole("button", { name: /^qr$/i }).first().click(),
);
await snap("c-companions", "/checkin", false, async () => {
  await page.getByRole("button", { name: /add companion/i }).click();
  await page.getByPlaceholder(/companion 1 name/i).fill("A very long companion name that keeps going");
});
await snap("c-room-select", "/checkin", false, async () => {
  const sel = page.locator("select").first();
  if ((await sel.count()) > 0) await sel.selectOption({ index: 1 });
});
await browser.close();
console.log("done");
