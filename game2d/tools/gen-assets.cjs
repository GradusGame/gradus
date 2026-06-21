#!/usr/bin/env node
/* ---------------------------------------------------------------------------
 * gen-assets.cjs — Phase-1 ground atlas + Ninja sprites + the Oppidum town map.
 *
 * Ground tiles + the placeholder house/tree are cropped from the Ninja
 * Adventure CC0 pack (pixel-boy — tracked in CREDITS.txt). The Keep is the Grok
 * concept art (process-keep.cjs). The hero is original procedural CC0 (Phase 2
 * replaces it). Non-Keep buildings reuse the one timber house, re-tinted per
 * role in the scene (placeholders until each gets its own art).
 *
 * Outputs:
 *   public/assets/tiles/oppidum-tiles.png   6-tile ground atlas (96x32)
 *   public/assets/tiles/hero.png            16x24 placeholder hero
 *   public/assets/buildings/house.png       63x79 Ninja timber house
 *   public/assets/props/tree.png            54x47 Ninja tree
 *   public/assets/maps/oppidum.tmj          Tiled JSON town map
 * ------------------------------------------------------------------------- */
'use strict';
const fs = require('fs');
const path = require('path');
const P = require('./pixutil.cjs');

const OUT = path.join(__dirname, '..', 'public', 'assets');
const T = 16;
const NINJA = (f) => path.join(OUT, 'tiles', 'ninja', f);
const FLOOR = 'tileset_floor.png', INTERIOR = 'tileset_interior_floor.png', VILLAGE = 'tileset_village_abandoned.png';

const _cache = {};
const src = (f) => (_cache[f] ||= P.decodePNG(fs.readFileSync(NINJA(f))));
function cropPNG(file, x, y, w, h) {
  const out = P.blank(w, h);
  P.copyRegion(src(file), x, y, w, h, out, 0, 0);
  return P.encodePNG(w, h, out.data);
}

/* ---- ground atlas (gid → [name, file, srcCol, srcRow]) ----------------- */
const TILES = [
  ['grass',  FLOOR,    13, 12],  // 1 cooler green grass
  ['grass2', FLOOR,    12, 12],  // 2 grass variant
  ['dirt',   FLOOR,     1,  8],  // 3 warm brown path / Road
  ['cobble', INTERIOR,  4, 14],  // 4 rounded cobblestone (square)
  ['water',  FLOOR,     1, 22],  // 5 lake water
  ['grass3', FLOOR,    13, 12],  // 6 spare
];
function buildAtlas() {
  const cols = 3, rows = 2;
  const atlas = P.blank(cols * T, rows * T);
  TILES.forEach(([, file, sc, sr], i) => {
    const dx = (i % cols) * T, dy = Math.floor(i / cols) * T;
    P.copyRegion(src(file), sc * T, sr * T, T, T, atlas, dx, dy);
  });
  return P.encodePNG(atlas.w, atlas.h, atlas.data);
}

/* ---- placeholder hero (original CC0) ----------------------------------- */
function buildHero() {
  const img = P.blank(16, 24);
  const set = (x, y, r, g, b, a = 255) => P.setPx(img, x, y, r, g, b, a);
  const rectf = (x0, y0, x1, y1, r, g, b, a = 255) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, r, g, b, a); };
  const cloak = [44, 38, 52], cloakLo = [32, 28, 40], skin = [201, 168, 134], boot = [38, 30, 26];
  for (let y = 8; y < 22; y++) { const w = Math.min(6, 2 + Math.floor((y - 6) / 2)); rectf(8 - w, y, 7 + w, y, ...cloak); set(8 - w, y, ...cloakLo); set(7 + w, y, ...cloakLo); }
  rectf(5, 2, 10, 8, ...cloak); rectf(6, 5, 9, 7, ...skin); rectf(5, 2, 10, 3, ...cloakLo);
  rectf(4, 22, 7, 23, ...boot); rectf(8, 22, 11, 23, ...boot);
  rectf(12, 14, 13, 16, 255, 196, 120); set(12, 13, 120, 80, 40);
  return P.encodePNG(img.w, img.h, img.data);
}

/* ---- the Oppidum town map (orthogonal, 40x30, 16px) -------------------- */
const W = 40, H = 30;
const G = { grass: 1, grass2: 2, dirt: 3, cobble: 4, water: 5 };
// [role, label, tileX, tileY]  base anchor = bottom-centre of (tileX,tileY)
const BUILDINGS = [
  ['keep',       'The Wayward Keep',   24,  8],
  ['chapel',     'The Hollow Choir',   24, 13],
  ['tavern',     'The Foundered Horse', 17, 15],
  ['bank',       'The Bank',           31, 15],
  ['inn',        "Maren's Inn",        17, 21],
  ['library',    'The Library',        31, 21],
  ['blacksmith', 'The Blacksmith',     19, 26],
  ['woodsmith',  'The Woodsmith',      28, 26],
  ['armorer',    'The Armorer',        32, 26],
  ['apothecary', 'The Apothecary',     35, 14],
];
const TREES = [
  [13, 2], [17, 1], [21, 2], [27, 1], [31, 2], [36, 2], [38, 5], [38, 9],
  [37, 18], [38, 24], [13, 25], [15, 28], [21, 28], [30, 29], [12, 9], [12, 14],
];
function buildMap() {
  const ground = new Array(W * H).fill(G.grass);
  const at = (x, y) => y * W + x;
  let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const rect = (x0, y0, x1, y1, g) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && x < W && y >= 0 && y < H) ground[at(x, y)] = g; };

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (rnd() < 0.2) ground[at(x, y)] = G.grass2;
  rect(0, 0, 9, H - 1, G.water);                       // lake (west)
  for (let y = 0; y < H; y++) if (rnd() < 0.55) ground[at(10, y)] = G.water; // ragged shore
  rect(17, 12, 31, 21, G.cobble);                      // market square
  for (let y = 21; y < H; y++) rect(23, y, 24, y, G.dirt); // the Road, south out the gate
  // short cobble approaches in front of the off-square buildings
  rect(34, 13, 36, 16, G.cobble);                      // apothecary lane
  rect(18, 25, 33, 27, G.cobble);                      // smith's row

  const objId = (() => { let n = 0; return () => ++n; })();
  const pt = (tx, ty, type, name, extra = {}) => ({ id: objId(), name, type, point: true, x: tx * T + T / 2, y: (ty + 1) * T, width: 0, height: 0, rotation: 0, visible: true, ...extra });

  const buildings = BUILDINGS.map(([role, label, tx, ty]) => pt(tx, ty, role, label));
  const props = TREES.map(([tx, ty]) => pt(tx, ty, 'tree', 'tree'));
  const meta = [
    pt(24, 18, 'spawn', 'spawn'),
    pt(20, 18, 'brazier', 'brazier'),
    pt(28, 18, 'brazier', 'brazier'),
  ];

  return {
    compressionlevel: -1, infinite: false, orientation: 'orthogonal', renderorder: 'right-down',
    width: W, height: H, tilewidth: T, tileheight: T,
    type: 'map', version: '1.10', tiledversion: '1.10.2',
    nextlayerid: 5, nextobjectid: 999,
    tilesets: [{ firstgid: 1, name: 'oppidum', image: '../tiles/oppidum-tiles.png', imagewidth: 48, imageheight: 32, tilewidth: T, tileheight: T, tilecount: 6, columns: 3, margin: 0, spacing: 0 }],
    layers: [
      { id: 1, name: 'ground', type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data: ground },
      { id: 2, name: 'props', type: 'objectgroup', opacity: 1, visible: true, x: 0, y: 0, draworder: 'topdown', objects: props },
      { id: 3, name: 'buildings', type: 'objectgroup', opacity: 1, visible: true, x: 0, y: 0, draworder: 'topdown', objects: buildings },
      { id: 4, name: 'meta', type: 'objectgroup', opacity: 1, visible: true, x: 0, y: 0, draworder: 'topdown', objects: meta },
    ],
  };
}

fs.mkdirSync(path.join(OUT, 'tiles'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'maps'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'buildings'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'props'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'tiles', 'oppidum-tiles.png'), buildAtlas());
fs.writeFileSync(path.join(OUT, 'tiles', 'hero.png'), buildHero());
fs.writeFileSync(path.join(OUT, 'buildings', 'house.png'), cropPNG(VILLAGE, 192, 97, 63, 79));
fs.writeFileSync(path.join(OUT, 'props', 'tree.png'), cropPNG(VILLAGE, 0, 144, 54, 47));
fs.writeFileSync(path.join(OUT, 'maps', 'oppidum.tmj'), JSON.stringify(buildMap(), null, 1));
console.log(`wrote: atlas, hero, house.png, tree.png, oppidum.tmj (${W}x${H}, ${BUILDINGS.length} buildings, ${TREES.length} trees)`);
