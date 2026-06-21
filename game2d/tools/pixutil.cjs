'use strict';
/* pixutil.cjs — tiny dependency-free PNG decode/encode + pixel helpers.
 * Shared by the asset tools. Handles 8-bit PNG colour types 0/2/3/4/6,
 * non-interlaced (all that the Ninja Adventure pack + sips output use). */
const zlib = require('zlib');

/* ---- CRC + encoder (RGBA out) ---- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0); const body = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0); return Buffer.concat([len, body, crc]); }
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* ---- decoder → {w,h,data:RGBA} ---- */
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let off = 8, w = 0, h = 0, bitDepth = 0, colorType = 0, interlace = 0;
  let palette = null, trns = null; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off); const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; interlace = data[12]; }
    else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8) throw new Error('only 8-bit PNG supported, got ' + bitDepth);
  if (interlace) throw new Error('interlaced PNG not supported');
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const bpp = channels; const stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const cur = Buffer.alloc(stride); const prev = Buffer.alloc(stride);
  const out = Buffer.alloc(w * h * 4);
  const pa = (i) => (i < 0 ? 0 : cur[i]); const pb = (i) => prev[i];
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    raw.copy(cur, 0, y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = cur[i];
      if (filter === 1) v += a; else if (filter === 2) v += b; else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) { const p = a + b - c, pa2 = Math.abs(p - a), pb2 = Math.abs(p - b), pc2 = Math.abs(p - c); v += (pa2 <= pb2 && pa2 <= pc2) ? a : (pb2 <= pc2 ? b : c); }
      cur[i] = v & 0xff;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4; let r, g, bl, al = 255;
      if (colorType === 6) { r = cur[x * 4]; g = cur[x * 4 + 1]; bl = cur[x * 4 + 2]; al = cur[x * 4 + 3]; }
      else if (colorType === 2) { r = cur[x * 3]; g = cur[x * 3 + 1]; bl = cur[x * 3 + 2]; }
      else if (colorType === 0) { r = g = bl = cur[x]; }
      else if (colorType === 4) { r = g = bl = cur[x * 2]; al = cur[x * 2 + 1]; }
      else if (colorType === 3) { const idx = cur[x]; r = palette[idx * 3]; g = palette[idx * 3 + 1]; bl = palette[idx * 3 + 2]; al = trns && idx < trns.length ? trns[idx] : 255; }
      out[o] = r; out[o + 1] = g; out[o + 2] = bl; out[o + 3] = al;
    }
    cur.copy(prev);
  }
  return { w, h, data: out };
}

/* ---- helpers on RGBA {w,h,data} ---- */
function getPx(img, x, y) { const i = (y * img.w + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]]; }
function setPx(img, x, y, r, g, b, a) { if (x < 0 || y < 0 || x >= img.w || y >= img.h) return; const i = (y * img.w + x) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = a; }
function blank(w, h) { return { w, h, data: Buffer.alloc(w * h * 4) }; }
// average colour + alpha coverage + colour variance of a rectangular region
function regionStats(img, x0, y0, w, h) {
  let r = 0, g = 0, b = 0, cov = 0, n = 0; const rs = [];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const [pr, pg, pb, pa] = getPx(img, x, y); n++;
    if (pa > 16) { cov++; r += pr; g += pg; b += pb; rs.push([pr, pg, pb]); }
  }
  if (cov === 0) return { hex: '------', cov: 0, varr: 0 };
  r = Math.round(r / cov); g = Math.round(g / cov); b = Math.round(b / cov);
  let v = 0; for (const [pr, pg, pb] of rs) v += (pr - r) ** 2 + (pg - g) ** 2 + (pb - b) ** 2;
  const hex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  return { hex, r, g, b, cov: cov / n, varr: Math.round(Math.sqrt(v / cov)) };
}
function copyRegion(src, x0, y0, w, h, dst, dx, dy) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b, a] = getPx(src, x0 + x, y0 + y); setPx(dst, dx + x, dy + y, r, g, b, a);
  }
}
// content bounding box of non-(near-bg) pixels
function contentBBox(img, isBg) {
  let minx = img.w, miny = img.h, maxx = -1, maxy = -1;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const [r, g, b, a] = getPx(img, x, y);
    if (!isBg(r, g, b, a)) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  }
  return maxx < 0 ? null : { x: minx, y: miny, w: maxx - minx + 1, h: maxy - miny + 1 };
}

module.exports = { encodePNG, decodePNG, getPx, setPx, blank, regionStats, copyRegion, contentBBox };
