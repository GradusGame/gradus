> ⏸️ **STATUS: PARKED (2026-06-16).** This Phaser pixel-world engine is shelved,
> not abandoned. Decision: the target look (Stoneshard-tier HD pixel art) needs
> bespoke/commissioned art beyond current budget — the engine & mechanics here
> (walkable town, follow camera, collision, enterable buildings that open the
> real game) are proven and reusable, but the *art* is the blocker. The live
> product is the original click/read browser game at repo-root `index.html`,
> which this never modified. Revive `/game2d/` if an art budget/pipeline appears.
> Nothing here affects the shipping game — delete-safe, but kept for revival.

# Gradus — `/game2d/` (Phaser 3 · Phase 3 done · PARKED)

The top-down **16-bit pixel-art** rebuild of Gradus, on **Phaser 3 + Vite**, with
maps authored in **Tiled**. Target look: a near-black world with warm torch-glow
pools and a small hero — *Zelda: A Link to the Past / Stardew Valley / Cursemark*.

**Status — Phase 3 (enterable buildings):** walk up to a building door → an
"Enter" prompt (key **E** / on-screen **A** button) → it opens the **existing
game's real screen** (Keep→Realm Sync, Tavern→quests, Bank→vault, Blacksmith/
Armorer/…→shops). This **reuses the shipping game unchanged**: the real
`index.html` is served at `/legacy/` (a Vite middleware in dev; copied to
`dist/legacy/` on build — single source of truth, no fork) and embedded in an
iframe; on enter we call its global `showScreen(...)` / `openShop(...)`. The
game's `UNLOCKS` gates are respected (a locked building shows a toast and won't
open). "✕ Leave" returns to the pixel overworld. Economy / saves / sync / the
`node game-test.js` suite are all untouched.

Phase 2 (walkable): animated 4-dir hero (Ninja CC0 placeholder), snap-to-tile
movement (WASD/arrows + D-pad), follow camera, collision (water / building
footprints / trees / edge).

Earlier phases: base tiles standardized on **Ninja Adventure** (CC0); the **Keep**
is Grok concept art; ground **graded toward the Keep** (`GROUND_GRADE`) with a
cooler grass + grey cobble square; the full square laid out with the Keep + a
ring of tinted placeholder houses (`tools/gen-assets.cjs`).

> Note: in a **headless/throttled** preview, `requestAnimationFrame` is paused,
> so the hero won't appear to move there — the logic is correct (verified by
> driving the loop), it just needs a real focused browser tab to animate.

This folder is **fully separate** from the shipping game. It imports nothing from
the root `index.html`, changes none of the game's files, and `node game-test.js`
(which reads `index.html`) is unaffected. Delete `/game2d/` and the live game is
untouched. This **replaces** the earlier three.js spike in `/spike/` (that
exploration is what led to the flat-2D-Phaser decision; see
`PROMPTS-2d-pixel-setup-and-art.md`).

## What Phase 0 proves

Open it and you see the **target mood with one lit area**:

- A small Tiled tilemap (Oppidum's cobbled **square**, the **Keep** at its head,
  the grey **lake** to the west, the **Road** leaving south) loaded into Phaser
  from a real `.tmj` + tileset PNG — the genuine Tiled → Phaser pipeline.
- A **near-black world** with a few **warm torch-glow pools** (two torches at the
  Keep door, a square brazier, the hero's lantern).
- **Nearest-neighbour crispness** (`pixelArt: true`) — chunky pixels, no blur.
- An **orthographic small-character camera**: the hero is a small fraction of the
  screen with a generous world visible; the camera frames the lit square.
- Runs in any browser and on a phone (responsive, installable PWA shell).

Not in Phase 0 (on purpose — later phases): movement/touch controls (Phase 2),
real CC0 tileset + hero-art buildings (Phase 1), enterable buildings wired to
game screens (Phase 3), NPCs/combat/save-sync (Phase 4). The hero here is a
**static placeholder** for scale only.

## Run it

```bash
cd game2d
npm install
npm run dev      # prints a LAN URL (http://<your-ip>:5173) — open it on your phone
```

Production build / local preview:

```bash
npm run build && npm run preview
```

Regenerate the placeholder art + map (deterministic):

```bash
npm run gen:assets
```

## Phase-0 decisions (flagged for review — cheap to change now)

1. **Lighting = additive radial glow sprites + a darkness render-texture**
   (pools "punched" open with `ERASE`), **not** Phaser's Light2D + normal maps.
   Why: mobile-first PWA + lean bundle; CC0 tilesets don't ship normal maps; the
   prior three.js spike measured real per-light lighting at ~45 fps with 16
   lights. Additive glow is cheap, art-agnostic, and reads exactly like the
   reference. Light positions are authored in the map's `lights` object layer, so
   swapping to Light2D later is contained to `TownScene`. **Say the word if you
   want real Light2D instead.**
2. **Tile size = 16 px**, nearest-neighbour, integer camera zoom (~3×) so a
   16×24 hero reads small (~1/13 of the short screen edge). Matches "16-bit JRPG"
   and the CC0 packs named in the plan (Cute Fantasy / Mana Seed / Ninja
   Adventure are all 16 px). Alternative: 32 px (more detail/tile, fewer tiles on
   screen, heavier). **Rec: 16 px.**

## Deploy change vs. today (documented, not yet applied)

Today: single-file `index.html` served from the repo root on GitHub Pages, with
the Cloudflare Worker for sync. The Phaser app adds a **Vite build step**:
`npm run build` emits a static `dist/` (HTML + hashed JS + the `public/` assets).
`base: './'` keeps every URL relative, so `dist/` drops into a **`/game2d/`
subpath** on the same Pages site without disturbing the live game or the Worker.
Full offline (Workbox service worker via `vite-plugin-pwa`) and the touch
controls are deferred to their phases per the plan; this Phase-0 shell ships the
manifest + correct mobile viewport so it's installable now. Trade-off: we lose
double-click-to-run (recoverable later via `vite-plugin-singlefile`); we gain
modules + a real build.

## Licenses

- Phaser 3 — **MIT**. Vite — **MIT**. Tiled (map editor) — free/GPL.
- All art in this folder is **original procedural CC0** (see
  `public/assets/CREDITS.txt`). No third-party art is bundled yet.
