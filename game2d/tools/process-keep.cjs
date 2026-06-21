#!/usr/bin/env node
/* process-keep.cjs — turn the Grok concept JPG into a game-ready building sprite.
 *
 *   assets/concept/keep-of-oppidum.jpg  (1024², near-black bg, not transparent)
 *     → game2d/public/assets/buildings/keep.png  (cropped, bg keyed transparent)
 *
 * Background removal is an edge flood-fill (not a global colour key) so the
 * building's own dark outlines / window interiors are preserved — only the
 * connected near-black border region becomes transparent.
 *
 * Needs the PNG that `sips` produces from the JPG; run via `npm run gen:assets`
 * which calls sips first. CC0 source art note tracked in CREDITS.txt.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const P = require('./pixutil.cjs');

const SRC_PNG = process.argv[2] || '/tmp/keep_raw.png';
const OUT = path.join(__dirname, '..', 'public', 'assets', 'buildings', 'keep.png');

const img = P.decodePNG(fs.readFileSync(SRC_PNG));
const { w, h } = img;

// background colour sampled from the corners (median-ish: just use top-left)
const [br, bg, bb] = P.getPx(img, 0, 0);
const TOL = 46; // JPEG-noise tolerance around the flat bg
const near = (x, y) => {
  const [r, g, b, a] = P.getPx(img, x, y);
  return Math.abs(r - br) <= TOL && Math.abs(g - bg) <= TOL && Math.abs(b - bb) <= TOL;
};

// flood fill from every border pixel; mark connected background
const isBg = new Uint8Array(w * h);
const stack = [];
for (let x = 0; x < w; x++) { stack.push(x, 0, x, h - 1); }
for (let y = 0; y < h; y++) { stack.push(0, y, w - 1, y); }
while (stack.length) {
  const y = stack.pop(), x = stack.pop();
  if (x < 0 || y < 0 || x >= w || y >= h) continue;
  const i = y * w + x;
  if (isBg[i]) continue;
  if (!near(x, y)) continue;
  isBg[i] = 1;
  stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
}

// apply transparency
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  if (isBg[y * w + x]) P.setPx(img, x, y, 0, 0, 0, 0);
}

// trim to content
const box = P.contentBBox(img, (r, g, b, a) => a < 16);
if (!box) throw new Error('keep: nothing left after keying — tolerance too high?');
const cropped = P.blank(box.w, box.h);
P.copyRegion(img, box.x, box.y, box.w, box.h, cropped, 0, 0);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, P.encodePNG(cropped.w, cropped.h, cropped.data));
console.log(`keep.png: ${cropped.w}x${cropped.h} (bg #${((br<<16)|(bg<<8)|bb).toString(16).padStart(6,'0')}, trimmed from ${w}x${h})`);
