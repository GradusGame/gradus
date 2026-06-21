# Gradus → top-down 2D pixel-art RPG (Phaser 3) — setup & art prompts

**This replaces the earlier voxel/three.js plan.** The target look (see reference screenshot) is **top-down 16-bit-style 2D pixel art** with atmospheric night lighting — *Zelda: A Link to the Past / Stardew Valley / Cursemark* family. It is **flat 2D, not voxel, not 3D — three.js is not used.**

**Free/OSS stack:** Phaser 3 (MIT, 2D web engine) · Vite (MIT, dev/build) · Tiled (free, map/tilemap editor) · LibreSprite or Piskel (free, sprite editing) · CC0/permissive art packs for tiles. No paid engines.

**Asset reality:** use Grok for hero pieces (buildings, items, characters). Use a CC0 tileset pack (e.g. Cute Fantasy RPG, Mana Seed, Ninja Adventure) for repeating ground/wall/path tiles — Grok can't reliably produce seamless tilesets.

---

## 1) Claude Code prompt — build the 2D pixel town (paste into Claude Code)

> **Role:** You are the lead engine developer for **Gradus**, a medieval fitness web RPG. We are moving the presentation from flat 8-bit SVG sprites to a **top-down 16-bit-style 2D pixel-art world rendered in Phaser 3**, matching the reference: a ¾ overhead camera, small characters, detailed pixel sprites, a near-black background, and warm torch-glow lighting (Zelda: A Link to the Past / Stardew Valley / Cursemark look). This is a real implementation task done **strictly step by step** — do exactly the phase I name, end with something I can open in a browser, then stop and tell me the next step. **Do not build ahead.**
>
> **Read first:** `DESIGN.md`, `THE-BOOK-OF-GRADUS.md`, `LORE.md`, `CHARACTERS.md`, and skim `index.html`. If `STYLE-BIBLE.md` or `LOGIC-EXTRACTION-PLAN.md` exist, read and follow them.
>
> **Hard constraints (keep all true):**
> - **Free & open-source only.** Phaser 3 (MIT) for the engine, Vite (MIT) for dev/build, Tiled (free) for maps. CC0/permissive assets only — track licenses/attribution. Note the license of anything added.
> - **Web-first, any browser, stays a PWA** (mobile-first: touch controls, installable, offline). A Vite build step is allowed — keep the bundle lean and document the deploy change vs. today's single-file GitHub Pages + Cloudflare Worker setup.
> - **Preserve game logic & data.** Economy (Gradus/Ries, caps, streaks), save format, the `FitnessProvider` interface, Worker cloud sync, and the `node game-test.js` suite must keep working. Treat existing game logic as a reusable module the Phaser scene sits on top of — do **not** rewrite it. `node game-test.js` must keep passing at the end of every phase.
>
> **Art direction (match the reference):** top-down ¾ overhead 2D pixel art, 16-bit JRPG fidelity. Near-black/dark background framing the lit area; warm torch-glow light pools (additive radial sprites or Phaser's Light2D pipeline) over a darkened scene; detailed building exteriors with shingled roofs and shutters; dirt paths connecting buildings around a central market square; forest and a lake/pond at the edges. Cohesive, readable, slightly chunky pixels — nearest-neighbor scaling, no blur.
>
> **Camera & movement:** orthographic top-down camera with a **small hero** relative to the screen (generous world visible around them), tile-grid movement, camera smoothly follows the hero. Walkable town with collision and **enterable buildings**. Mirror the current Town locations (Keep/Realm Sync, Tavern, Inn, Bank, Blacksmith, Woodsmith, Armorer, Apothecary, Library, Chapel, Commons, Lake, Hunting Grounds).
>
> **Build order — one phase at a time. Do only Phase 0 now.**
> - **Phase 0 (do this now): scaffold + proof of look.** New Vite + Phaser 3 project in a subfolder (e.g. `/game2d/`), leaving the current game untouched. Render one small Tiled tilemap scene (placeholder/CC0 tiles are fine) with the dark background + a couple of warm torch-glow light pools + nearest-neighbor crispness, viewed through the orthographic small-character camera. Confirm it builds, runs in-browser, and works on mobile. End state: I open it and see the target mood with one lit area. Document how to run it.
> - **Phase 1 (next): tileset + key buildings.** Import the chosen CC0 tileset and the hero-art buildings (Keep, etc.); assemble the Oppidum market-square layout in Tiled to match the reference composition.
> - **Phase 2: hero + movement + camera follow + collision.**
> - **Phase 3: enterable buildings wired to existing game screens** (Tavern→quests, Bank→vault, etc.).
> - **Phase 4: port one zone + NPCs from the lore**, then combat re-skin, then save/sync/PWA cutover.
>
> Before writing Phase 0, briefly confirm: the lighting approach (additive glow sprites vs. Light2D + normal maps) and the tile size/scale. Flag anything needing my decision. Then implement **Phase 0 only** and stop.

---

## 2) Grok Imagine prompts — first item & first building (2D pixel art)

Generate 4 variants each, pick one, clean up the background, then drop into the game. Match the reference's fidelity and lighting.

### Reusable style preamble (prepend to any asset prompt)
> `top-down 2D pixel art, 16-bit SNES JRPG style, hand-drawn detailed pixel sprite, 3/4 overhead view, single subject centered on a plain transparent or flat dark background, warm torchlight glow, dark night ambiance, cohesive readable chunky pixels, crisp nearest-neighbor no blur, game asset, in the style of Stardew Valley and Zelda A Link to the Past`

### First item — **The Strider's Blade** (Gradus's rusted ancestral sword), as an inventory icon
*Lore: a plain man's rusted grandfather's blade, swung like an axe to kill a god — holy yet humble, worn, ruined iron.*

> `pixel art item icon, 16-bit SNES JRPG style, a single ancient medieval short sword, old rusted pitted iron blade nicked and worn like a tool not a treasure, frayed wrapped leather grip, a faint cold cyan-white rune glow along the pitted metal, centered on a transparent background, slight torchlight rim glow, crisp chunky pixels no blur, inventory item asset, in the style of Stardew Valley`

*Currency variant — the **Gradus coin**:* `pixel art icon of a single thick worn medieval coin stamped with a stern walking man's face in profile, tarnished gold with warm highlights, centered on transparent background, crisp pixels` (matches the coin emblem on the Keep in the reference).

### First building — **The Keep of Oppidum** (top-down building sprite)
*Lore: the lakeside keep at the head of the Road; inside sits a grey loaf-shaped Elder Road stone that hums — your in-game Realm Sync.*

> `top-down 2D pixel art building, 16-bit SNES JRPG style, 3/4 overhead view, a small weathered grey stone keep with crenellated tower, slate roof, narrow shuttered windows and a low arched wooden door, a round gold coin emblem mounted above the gate, hanging banners, lit torches flanking the entrance casting warm glow, weathered cobble base, lakeside reeds at one corner, centered on a flat dark background, crisp chunky pixels no blur, building asset matching a town map, in the style of Stardew Valley and Zelda A Link to the Past`

**Grok tips:** keep "single subject / centered / plain background" so it cuts out cleanly; if Grok drifts toward realistic or 3D, push `pixel art, 16-bit, sprite, flat, no blur`; for buildings, always include `top-down 3/4 overhead view` so the angle matches the map; generate a few and pick the one whose perspective and pixel scale match your tileset.

---

## 3) Extra setup prompts (paste into Claude Code as separate steps)

### A) Art-style bible (do before generating lots of assets)
> Write `STYLE-BIBLE.md` for our top-down 2D pixel-art direction (matching the reference: 16-bit JRPG, ¾ overhead, dark background + warm torch glow, small-character zoom). Specify: palette swatches (hex), the tile size (e.g. 16px or 32px) and overall scale, hero-sprite-to-screen ratio, lighting rules (glow color/intensity, ambient darkness level), perspective/angle rules for buildings, animation frame conventions, and do/don't examples. Note which CC0 tileset pack we standardize on and how Grok-generated hero pieces must be matched to it. Pull visual vocabulary from `IMAGE_PROMPTS.md`; reference `THE-BOOK-OF-GRADUS.md` for mood. Doc only, no code.

### B) Decouple game logic from rendering (de-risks the migration)
> Audit `index.html` and produce `LOGIC-EXTRACTION-PLAN.md`: identify every piece of pure game logic (economy, quests data, combat, save/load, FitnessProvider, streaks/caps) currently tangled with SVG/DOM rendering, and propose extracting it into framework-agnostic ES modules the new Phaser scenes can import unchanged, keeping `node game-test.js` green. List modules, public interfaces, and a safe extraction order. Plan only, no code.

### C) Asset-pipeline convention
> Write `ASSETS.md`: a folder structure and naming convention for 2D assets (tilesets, building sprites, item icons, character spritesheets), how Tiled maps and spritesheets load into Phaser, CC0 licensing/attribution tracking, and a checklist for adding a new asset so it matches `STYLE-BIBLE.md` (correct tile size, palette, ¾ angle, transparent background). Doc only.
