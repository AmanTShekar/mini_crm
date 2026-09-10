// Deep probe: computed styles behind the 320px guests overflow.
import { chromium } from "playwright-core";

const EXE =
  "C:\\Users\\Asus\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe";
const BASE = process.env.AUDIT_BASE || "http://localhost:3000";

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true });
await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
await page.locator("input").nth(0).fill("admin@stay.local");
await page.locator('input[type="password"]').fill("admin123");
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL("**/admin", { timeout: 10000 });
await page.goto(`${BASE}/admin/guests`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const rep = await page.evaluate(() => {
  const cs = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return "MISSING";
    const c = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return `${c.display} | cols=${c.gridTemplateColumns} | w=${c.width} minw=${c.minWidth} pos=${c.position} | rect=${Math.round(r.left)}-${Math.round(r.right)}`;
  };
  return {
    innerW: window.innerWidth,
    docClientW: document.documentElement.clientWidth,
    docScrollW: document.documentElement.scrollWidth,
    bodySW: document.body.scrollWidth,
    meta: document.querySelector('meta[name="viewport"]')?.content,
    rootFont: getComputedStyle(document.documentElement).fontSize,
    pageRoot: cs("main > div"),
    statGrid: cs("main > div > div.grid"),
    navInner: cs("nav > div"),
    nav: cs("nav.fixed"),
    main: cs("main"),
    galleryCard: cs("main .box"),
  };
});
console.log(JSON.stringify(rep, null, 1));
await browser.close();
