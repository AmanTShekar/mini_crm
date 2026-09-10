// Mobile layout audit: logs in, visits every page at 360px wide and reports
// any element sticking out past the viewport (page-level horizontal scroll).
// Run: BASE=http://localhost:3102 node scripts/audit-mobile.mjs
import { chromium } from "playwright-core";

const EXE =
  "C:\\Users\\Asus\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe";
const BASE = process.env.AUDIT_BASE || "http://localhost:3102";
const OUT = "C:\\Users\\Asus\\AppData\\Local\\Temp";

const browser = await chromium.launch({ executablePath: EXE });
const VW = Number(process.env.AUDIT_VW || 360);
const page = await browser.newPage({
  viewport: { width: VW, height: 740 },
  isMobile: true,
  hasTouch: true,
});

// login
await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
await page.locator("input").nth(0).fill("admin@stay.local");
await page.locator('input[type="password"]').fill("admin123");
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL("**/admin", { timeout: 10000 });

async function check(name, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const rep = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const sw = document.documentElement.scrollWidth;
    const bad = [];
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      if (r.right <= vw + 1 && r.left >= -1) return;
      let p = el.parentElement;
      let insideScroller = false;
      while (p && p !== document.body) {
        const o = getComputedStyle(p).overflowX;
        if (o === "auto" || o === "scroll") {
          insideScroller = true;
          break;
        }
        p = p.parentElement;
      }
      if (insideScroller) return;
      if (getComputedStyle(el).position === "fixed") return;
      const cls = String(el.className?.baseVal ?? el.className ?? "").slice(0, 60);
      bad.push(
        `${el.tagName}.${cls} L=${Math.round(r.left)} R=${Math.round(r.right)} :: ${(el.innerText || "").replace(/\s+/g, " ").slice(0, 50)}`,
      );
    });
    return { vw, sw, overflow: sw - vw, bad: bad.slice(0, 20) };
  });
  await page.screenshot({ path: `${OUT}/m-${name}.png` });
  console.log(`### ${name} vw=${rep.vw} scrollW=${rep.sw} overflow=${rep.overflow}`);
  rep.bad.forEach((b) => console.log("   " + b));
}

await check("today", "/admin");
await check("rooms", "/admin/rooms");
await check("calendar", "/admin/calendar");
await check("guests", "/admin/guests");

// Bisect the guests page: hide each top-level section, find the stretcher
const kids = await page.evaluate(() =>
  [...document.querySelector("main > div").children].map((el, i) => ({
    i,
    html: el.outerHTML.slice(0, 90).replace(/\s+/g, " "),
  })),
);
console.log("### bisect guests root children:");
for (const k of kids) {
  const sw = await page.evaluate((i) => {
    const root = document.querySelector("main > div");
    const el = root.children[i];
    const prev = el.style.display;
    el.style.display = "none";
    const w = document.documentElement.scrollWidth;
    el.style.display = prev;
    return w;
  }, k.i);
  console.log(`   hide[${k.i}] scrollW=${sw} :: ${k.html}`);
}
// scroller internals
const scr = await page.evaluate(() =>
  [...document.querySelectorAll(".no-scrollbar")].map((el) => ({
    cls: String(el.className).slice(0, 50),
    clientW: el.clientWidth,
    scrollW: el.scrollWidth,
    overflowX: getComputedStyle(el).overflowX,
    kids: el.children.length,
  })),
);
console.log("### scrollers:", JSON.stringify(scr));
await check("checkin", "/checkin");
await check("home", "/");
await browser.close();
console.log("done");
