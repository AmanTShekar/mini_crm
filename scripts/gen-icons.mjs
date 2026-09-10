// Generates PWA icons (no dependencies, Node stdlib only).
// Run: node scripts/gen-icons.mjs
// Design: white bed glyph on Stay green — full-bleed bg so any-mask cropping stays safe.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "icons");
mkdirSync(OUT, { recursive: true });

const GREEN = [31, 111, 74, 255];
const WHITE = [255, 255, 255, 255];

function canvas(size, bg) {
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = bg[0];
    buf[i * 4 + 1] = bg[1];
    buf[i * 4 + 2] = bg[2];
    buf[i * 4 + 3] = 255;
  }
  return buf;
}

function rrect(buf, size, x0, y0, x1, y1, r, color) {
  const sx = (x0 / 512) * size;
  const sy = (y0 / 512) * size;
  const ex = (x1 / 512) * size;
  const ey = (y1 / 512) * size;
  const rr = (r / 512) * size;
  for (let y = Math.floor(sy); y < Math.ceil(ey); y++) {
    for (let x = Math.floor(sx); x < Math.ceil(ex); x++) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const dx = Math.min(x - sx, ex - 1 - x);
      const dy = Math.min(y - sy, ey - 1 - y);
      let inside = true;
      if (dx < rr && dy < rr) {
        const cx = dx - rr;
        const cy = dy - rr;
        inside = cx * cx + cy * cy <= rr * rr;
      }
      if (inside) {
        const o = (y * size + x) * 4;
        buf[o] = color[0];
        buf[o + 1] = color[1];
        buf[o + 2] = color[2];
        buf[o + 3] = 255;
      }
    }
  }
}

function drawBed(buf, size) {
  // legs
  rrect(buf, size, 96, 336, 128, 416, 8, WHITE);
  rrect(buf, size, 384, 336, 416, 416, 8, WHITE);
  // mattress + headboard + pillow (merge into one silhouette)
  rrect(buf, size, 64, 272, 448, 336, 28, WHITE);
  rrect(buf, size, 64, 160, 104, 300, 16, WHITE);
  rrect(buf, size, 120, 216, 224, 272, 16, WHITE);
  // blanket fold in brand green
  rrect(buf, size, 280, 288, 448, 320, 10, GREEN);
}

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, draw) {
  const px = canvas(size, GREEN);
  draw(px, size);
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png;
}

for (const [name, size] of [["icon-512.png", 512], ["icon-192.png", 192], ["apple-touch-icon.png", 180]]) {
  writeFileSync(join(OUT, name), encodePNG(size, drawBed));
  console.log("wrote", name);
}
