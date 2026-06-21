# ASSETS.md — Gradus 2D asset pipeline & conventions

How 2D art lives on disk, gets named, loads into Phaser, and gets cleared for use.
This is the **pipeline authority**. The **style authority** is [`STYLE-BIBLE.md`](STYLE-BIBLE.md)
(palette, tile size, ¾ angle, lighting) — when this doc names a number it is the
as‑built value currently in the code; if `STYLE-BIBLE.md` ever disagrees, the
bible wins and this doc gets updated to match.

> Scope: the Phaser 3 rebuild in [`game2d/`](game2d/). Nothing here touches the
> shipping single‑file `index.html`. See [`game2d/README.md`](game2d/README.md)
> for the phase plan; assets land in **Phase 1** (real CC0 tileset + hero‑art
> buildings). Phase 0 ships only the procedural placeholders described below.

---

## 1. Two asset roots — don't confuse them

| Root | Purpose | Formats | Loaded by the game? |
|------|---------|---------|---------------------|
| [`assets/concept/`](assets/concept/) (repo root) | **Source / reference art** — approved Grok generations at generation resolution, mood boards, originals before clean‑up | anything (`.jpg`, `.png`, `.psd`, …) | **No.** Never referenced by Phaser. |
| `game2d/public/assets/` | **Game‑ready art** — cleaned, resized, palette‑snapped PNGs + Tiled maps that Phaser actually loads | `.png`, `.tmj` only | **Yes.** |

A concept piece (e.g. `assets/concept/keep-of-oppidum.jpg`) is the *input*; the
in‑game sprite (`game2d/public/assets/buildings/keep.png`) is the cleaned‑up
*output*. Producing the second from the first is the work the checklist in §8
governs. Keep both — the concept stays as the regen reference.

---

## 2. Folder structure

Everything the engine loads lives under `game2d/public/assets/`. Vite copies
`public/` to the site root verbatim, so a file at
`public/assets/tiles/oppidum-tiles.png` is fetched at runtime as
`assets/tiles/oppidum-tiles.png` (see §6).

```
game2d/public/assets/
├── tiles/          # tileset atlases — repeating ground/wall/path/water tiles
│   └── oppidum-tiles.png
├── maps/           # Tiled maps (.tmj). Tilesets are EMBEDDED in the .tmj (§5)
│   └── oppidum.tmj
├── buildings/      # building exterior sprites (one PNG per building)
│   ├── keep.png
│   ├── tavern.png
│   └── …
├── items/          # inventory / item icons (one PNG per item, square)
│   ├── striders-blade.png
│   └── gradus-coin.png
├── characters/     # character spritesheets (hero + NPCs), frame size in name
│   ├── hero-16x24.png
│   └── npc-elder-16x24.png
├── ui/             # HUD frames, buttons, cursors (add when the HUD lands)
└── CREDITS.txt     # license + attribution ledger — see §7
```

`tiles/` and `maps/` exist today (Phase 0). Create the others when the first
asset of that kind arrives — don't commit empty folders.

---

## 3. Naming conventions

- **lowercase**, words joined by **hyphens** (`strider's-blade` → `striders-blade`).
  No spaces, no caps, no apostrophes/punctuation in filenames.
- Name by **what it is**, not where it came from or its size — except the two
  size encodings below.
- One concept = one file. Don't suffix `-v2`, `-final`, `-new`; the file *is* the
  current version and git holds the history.

| Kind | Pattern | Example | Notes |
|------|---------|---------|-------|
| Tileset atlas | `<zone-or-pack>-tiles.png` | `oppidum-tiles.png` | one atlas per zone or per CC0 pack |
| Tiled map | `<zone>.tmj` | `oppidum.tmj` | `.tmj` (JSON), **not** `.tmx` (XML) |
| Building | `<name>.png` | `keep.png`, `blacksmith.png` | transparent bg, façade angle (§4) |
| Item icon | `<name>.png` | `striders-blade.png` | square, transparent bg |
| Character sheet | `<name>-<W>x<H>.png` | `hero-16x24.png` | **frame** W×H in the name, so the loader call is self‑documenting |
| UI element | `ui-<name>.png` | `ui-coin-badge.png` | |

The `-WxH` suffix on spritesheets is the frame size, not the image size — it's
exactly the `frameWidth`/`frameHeight` you pass to `load.spritesheet` (§5).

---

## 4. As‑built style values (mirror of `STYLE-BIBLE.md`)

These are the concrete numbers the Phase‑0 code uses. Match them when authoring;
if you change one, change it here **and** in `STYLE-BIBLE.md`.

- **Tile size:** `16 × 16 px`. Every tile, building footprint, and sprite frame
  is a whole multiple of 16 (defined as `TILE = 16` in `TownScene.js`, `T = 16`
  in `gen-assets.cjs`).
- **Tileset atlas layout:** tightly packed grid, `margin: 0`, `spacing: 0`,
  row‑major, gid `1` = top‑left. `oppidum-tiles.png` is 4 cols × 2 rows = 8 tiles
  at 64 × 32 px.
- **Hero / character scale:** `16 × 24 px` figure, **feet at the bottom edge** of
  the frame (drawn with `setOrigin(0.5, 1)` so the sprite stands on its tile).
- **Camera:** integer zoom (~2–6×, ~`13` tiles across the short edge) → small
  hero, generous world. Art must read at 16px **before** zoom — no detail that
  only survives upscaled.
- **Rendering:** `pixelArt: true` (NEAREST filtering) + `roundPixels`. So:
  **no anti‑aliasing, no semi‑transparent edges, no blur** in source PNGs.
- **Angle:**
  - *Ground tiles & characters* → top‑down **¾ overhead**.
  - *Buildings* → **slightly front‑facing façade** (Stardew‑style), **not** true
    ¾. Every building uses this same angle so the town reads as one set. (Per
    [`assets/concept/README.md`](assets/concept/README.md).)
- **Background / lighting:** near‑black world (`#06060a`), warm torch‑glow pools
  (amber, additive). Don't bake lighting or shadows into tiles/buildings — the
  scene lights them at runtime (additive glow + an erased darkness veil, authored
  from the map's `lights` layer; see §5).
- **Palette (Phase‑0 placeholders, for reference):** grass `rgb(63,107,58)`,
  dirt `rgb(106,79,52)`, cobble `rgb(110,101,90)`, water `rgb(35,75,94)`, stone
  wall `rgb(92,88,82)`, wood `rgb(91,63,40)`, cloak `rgb(44,38,52)`, skin
  `rgb(201,168,134)`, glow `rgb(255,194,120)`. The real palette is defined in
  `STYLE-BIBLE.md` once it exists; snap CC0 packs and Grok pieces to it.
- **Recurring motif:** the **walking man** (on the Gradus coin and carved above
  the Keep door) — keep it consistent wherever it appears.

---

## 5. How assets load into Phaser

All loads happen in a scene's `preload()` and key off a short string you then
reference everywhere. The live example is [`game2d/src/scenes/TownScene.js`](game2d/src/scenes/TownScene.js).

### Tiles + Tiled map

```js
preload() {
  // tileset IMAGE → a texture key
  this.load.image('tiles', 'assets/tiles/oppidum-tiles.png');
  // the Tiled map JSON → a map key
  this.load.tilemapTiledJSON('map', 'assets/maps/oppidum.tmj');
}

create() {
  const map = this.make.tilemap({ key: 'map' });
  //                         ▼ tileset NAME inside the .tmj   ▼ texture key above
  const tileset = map.addTilesetImage('oppidum', 'tiles');
  map.createLayer('ground', tileset, 0, 0).setDepth(0);
  map.createLayer('walls',  tileset, 0, 0).setDepth(1);
}
```

Two strings must line up or the map renders blank:

1. The **tileset `name`** in the `.tmj` (`"oppidum"`) must be the **first arg**
   to `addTilesetImage`.
2. The **texture key** from `load.image` (`'tiles'`) must be the **second arg**.

**Embed tilesets in the map, don't use external `.tsx`.** Phaser reads the
tileset out of the `.tmj`; it does not parse standalone `.tsx` files. In Tiled,
when adding a tileset choose *Embed in map* (or *Map → Embed Tilesets* before
export). The `image` path stored inside the `.tmj` is relative to the map file
(e.g. `../tiles/oppidum-tiles.png`) — it only needs to be correct so the map
renders **in the Tiled editor**; at runtime Phaser ignores it and uses the
texture key you pass to `addTilesetImage`.

### Map data contract (object layers)

Maps carry gameplay data in object layers, read by the scene — keep this stable
so new maps "just work":

- **`lights`** object layer: **point** objects whose Tiled **Type** is one of
  `torch` | `brazier` | `lantern` (light pools) or `spawn` (hero start). Position
  is in pixels. `TownScene` reads these to place the torch‑glow and the hero — so
  authoring a new lit area is done in Tiled, not in code.
- **`ground`**, **`walls`**: tile layers (`walls` non‑zero tiles = collidable
  later). Add new tile layers above these with explicit `setDepth`.

### Character spritesheets

Frame size comes from the filename suffix (§3):

```js
// hero-16x24.png  → 16×24 frames
this.load.spritesheet('hero', 'assets/characters/hero-16x24.png',
  { frameWidth: 16, frameHeight: 24 });

// then in create(), build named animations from frame ranges:
this.anims.create({
  key: 'hero-walk-down',
  frames: this.anims.generateFrameNumbers('hero', { start: 0, end: 3 }),
  frameRate: 8, repeat: -1,
});
```

Spritesheet rules: **uniform frame size**, `margin: 0`, `spacing: 0`, frames
left‑to‑right then top‑to‑bottom, transparent background. Document the row layout
(which row = which direction/action) in `CREDITS.txt` next to the entry, since
the PNG alone doesn't say.

### Buildings & item icons

Plain transparent PNGs loaded as single images:

```js
this.load.image('keep',           'assets/buildings/keep.png');
this.load.image('striders-blade', 'assets/items/striders-blade.png');
```

Buildings are placed in the world with `setOrigin(0.5, 1)` (footprint on the
ground) and depth‑sorted with the tile layers. Item icons render in the DOM/HUD
at their native size — keep them square and ≥1× the slot size.

---

## 6. The `public/` path rule (why load paths look the way they do)

Vite treats `game2d/public/` as static root: files are copied to the build root
untouched, **not** hashed, and addressed by a **root‑relative `assets/…` URL** —
which is why every `load.*` call above starts with `assets/`, with **no** leading
slash and **no** `import`. `base: './'` in `vite.config.js` keeps these relative
so the build drops into the `/game2d/` subpath on Pages cleanly.

- ✅ Game data art (tiles, maps, sprites, icons) → `public/assets/…`, referenced
  as `'assets/…'`. This is the convention for **everything in this doc**.
- ❌ Don't `import heroUrl from '../assets/hero.png'` from `src/`. That route
  hashes the filename and is for build‑time module assets, not Phaser load keys —
  it breaks the predictable `assets/…` paths the scenes expect.

---

## 7. CC0 licensing & attribution

**Rule: strict CC0 / permissive only, and every third‑party file is recorded in
[`game2d/public/assets/CREDITS.txt`](game2d/public/assets/CREDITS.txt) *before*
it is committed.** No "I'll add the credit later."

- **Acceptable:** CC0, public domain, MIT/BSD‑style, or explicit "free for
  commercial use, no attribution required." Attribution‑required (CC‑BY) is OK
  **only** if its line is added to `CREDITS.txt`.
- **Reference‑only (do not bundle):** share‑alike licenses — notably **LPC
  (CC‑BY‑SA)** — unless we deliberately commit to honoring share‑alike for the
  whole project. They may inform style, not ship.
- **Original art** (procedural, Grok‑generated then hand‑cleaned, hand‑pixeled)
  is **CC0** and still gets a line so provenance is traceable.
- **Standard CC0 packs** named in the plan: Cute Fantasy RPG, Mana Seed, Ninja
  Adventure. Pick one base tileset pack and snap everything else to it.

Ledger entry format (one per file or per pack), matching the existing file:

```
• public/assets/tiles/cute-fantasy-tiles.png
    source : https://example.itch.io/cute-fantasy-rpg
    author : Author Name
    license: CC0 (https://creativecommons.org/publicdomain/zero/1.0/)
    added  : 2026-06-16
    notes  : base ground/wall/path pack; recolored to STYLE-BIBLE palette
```

---

## 8. Checklist — adding a new asset

Run top to bottom for every PNG that enters `game2d/public/assets/`. An asset
isn't "done" until it passes all of these.

**Style (must match `STYLE-BIBLE.md` §4):**
- [ ] **Tile size** — dimensions are whole multiples of **16 px** (frame size for
      spritesheets). Atlas packed with `margin: 0`, `spacing: 0`.
- [ ] **Palette** — colors snapped to the bible's swatches; no off‑palette stray
      pixels, no gradients the palette doesn't allow.
- [ ] **Angle** — ground/characters ¾ top‑down; **buildings front‑facing façade**,
      same angle as the existing set.
- [ ] **Transparent background** — fully transparent alpha around the subject
      (buildings/items/characters). No white/black box, **no matte halo** of
      semi‑transparent edge pixels (a NEAREST renderer shows them as fringe).
      Ground tiles are the exception: opaque and **seamlessly tileable** edge‑to‑edge.
- [ ] **Crisp** — hard 1px edges, **no anti‑aliasing / blur**; reads clearly at
      16px *before* camera zoom. No baked‑in lighting or shadow (scene lights it).

**Pipeline:**
- [ ] **Right folder** per §2 (`tiles/`, `maps/`, `buildings/`, `items/`,
      `characters/`, `ui/`).
- [ ] **Named** per §3 (lowercase‑hyphenated; `-WxH` frame suffix on spritesheets).
- [ ] **License recorded** in `CREDITS.txt` per §7 — *before* commit. CC0/permissive
      only; share‑alike stays reference‑only.
- [ ] **Source kept** — if cleaned from a Grok/concept original, the original is in
      `assets/concept/` for re‑generation.
- [ ] **Loaded** — added to the scene's `preload()` with a sensible key (§5);
      tileset `name` ↔ `addTilesetImage` ↔ texture key all line up for maps.
- [ ] **Verified in browser** — `npm run dev`, confirm it renders crisp, sits at
      the right scale/depth, and lights correctly. No console 404 for the asset.
- [ ] **`node game-test.js` still green** (it reads the shipping `index.html`, which
      this never touches — but confirm).

---

## 9. Tooling

- **Tiled** (free) — author/edit `.tmj` maps; embed tilesets; place `lights`/`spawn`
  objects. Export as JSON (`.tmj`).
- **LibreSprite / Piskel / Aseprite** — pixel editing, palette‑snapping, exporting
  uniform‑frame spritesheets with no spacing.
- **`game2d/tools/gen-assets.cjs`** (`npm run gen:assets`) — regenerates the
  **Phase‑0 procedural placeholders** (`oppidum-tiles.png`, `hero.png`,
  `oppidum.tmj`) deterministically. It's the reference for exact sizes/palette and
  the map data contract — read it before replacing the placeholders in Phase 1.
  Replacing an asset with real art does **not** mean editing this generator;
  it means dropping the new PNG in and removing the placeholder from the generator's
  output list.
