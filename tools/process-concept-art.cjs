#!/usr/bin/env node
/* process-concept-art.cjs — key out the flat dark background of a Grok concept
 * PNG (edge flood-fill, so interior darks survive) and crop to content.
 *   node tools/process-concept-art.cjs <in.png> <out.png> [tolerance]
 * Used by `npm run art` to turn assets/concept/*.jpg into art/*.png for the
 * click/read game. Dependency-free (see tools/pixutil.cjs). */
'use strict';
const fs = require('fs');
const P = require('./pixutil.cjs');

const [, , inPng, outPng, tolArg] = process.argv;
const TOL = Number(tolArg) || 50;
const img = P.decodePNG(fs.readFileSync(inPng));
const { w, h } = img;
const [br, bg, bb] = P.getPx(img, 0, 0);
const near = (x, y) => { const [r, g, b] = P.getPx(img, x, y); return Math.abs(r - br) <= TOL && Math.abs(g - bg) <= TOL && Math.abs(b - bb) <= TOL; };

const isBg = new Uint8Array(w * h);
const st = [];
for (let x = 0; x < w; x++) st.push(x, 0, x, h - 1);
for (let y = 0; y < h; y++) st.push(0, y, w - 1, y);
while (st.length) {
  const y = st.pop(), x = st.pop();
  if (x < 0 || y < 0 || x >= w || y >= h) continue;
  const i = y * w + x;
  if (isBg[i] || !near(x, y)) continue;
  isBg[i] = 1;
  st.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
}
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (isBg[y * w + x]) P.setPx(img, x, y, 0, 0, 0, 0);

const box = P.contentBBox(img, (r, g, b, a) => a < 16);
if (!box) throw new Error('nothing left after keying — lower the tolerance');
const out = P.blank(box.w, box.h);
P.copyRegion(img, box.x, box.y, box.w, box.h, out, 0, 0);
fs.writeFileSync(outPng, P.encodePNG(out.w, out.h, out.data));
console.log(`${outPng}  ${out.w}x${out.h}  (bg #${((br << 16) | (bg << 8) | bb).toString(16).padStart(6, '0')}, tol ${TOL})`);
