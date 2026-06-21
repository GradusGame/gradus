# Gradus — Engine Migration Plan

**A 16-bit-style world on a real engine: research, recommendation, and a phased plan.**

Author: lead dev/architect investigation
Date: 2026-06-15
Status: **Proposal for review — no game files changed.** This document is the only deliverable.
Scope: investigation + planning only. Nothing in `index.html` or the game logic has been touched.

All engine versions, licenses, and sizes below were verified by live web search / bundlephobia on 2026-06-15. Anything that could not be fully verified is flagged inline.

---

## 0. TL;DR

- **Recommended engine: three.js (MIT, v0.184.0, ~178 KB gzipped core).**
- **Recommended direction: 2.5D — orthographic camera + billboarded pixel sprites in a real 3D scene, with a low-res render target upscaled nearest-neighbor and a pixelation/dither/palette post-pass** (the "HD-2D" recipe). Not full free-roam 3D.
- **Build step: yes — adopt Vite.** It is the enabler for everything else (modules, the test harness staying green, a real offline service worker). The cost is losing the "double-click the file and it runs" property.
- **Game logic is reused, not rewritten.** The economy, quests, combat, save format, `FitnessProvider`, and the `node game-test.js` suite all survive. The work is extracting that logic out of the single `<script>` into ES modules that both the engine **and** the test harness import.
- **The honest catch:** the renderer is the easy 20%. The hard 80% is re-expressing the entire DOM UI (town map, quest board, combat screen, inventory paperdoll, all the modals) as in-engine scenes — that is a large, mostly-art-and-UX effort, not a rendering problem. A 2D engine (Phaser/KAPLAY) would be a smaller lift; three.js is recommended only because you specifically want a 2.5D/3D world with depth.

If you only read one more section, read **§3 Recommendation & rationale** and **§8 Open decisions**.

---

## 1. Where Gradus is today (grounding)

Verified by reading the repo on 2026-06-15:

| Aspect | Current reality |
|---|---|
| Delivery | Single file `index.html`, **4,642 lines** (~260 KB), all HTML/CSS/JS inline. No build, no framework. |
| Rendering | DOM + hand-written inline SVG/canvas pixel sprites. `monSprite(m)` reads `m.spr:[kind,...args]`; `MON_BUILDERS` keyed by sprite kind ([index.html:1279](index.html:1279)). Town is a single AI-painted PNG (`town.png`, 720×1280) with clickable hotspots; classic button menu falls back if absent. |
| Legacy tile PNGs | `Overworld.png`, `cave.png`, `character.png`, `Inner.png`, `objects.png`, `font.png` (dated 2016 — the archived ArMM1998 CC0 "Zelda-like" tileset era, see CHANGELOG v0.6). Currently **unused** by the shipped click-based build (v1.0 shelved the walkable canvas). |
| Game logic | Economy (1 step = 1 Gradus, 1 kcal = 1 Ries, caps 50k/4k, streak +5%/day≤+50%, Ries cap 5,000), 31 quests in 3 zones, turn-based combat with monster traits, 6 dungeons, life skills, crafting, 7-slot equipment + Forge. All pure-ish functions over a single state object `S`. |
| Fitness data | `FitnessProvider` interface — `async getActivity(dateStr) -> {steps, calories} | null` ([index.html:1860](index.html:1860)). `ManualFitnessProvider` is v1; real data arrives iPhone Shortcut → Cloudflare Worker → `/activity` pull. Clean seam. |
| Persistence | `localStorage` multi-account (`gradus-save-v1-<email>`), `JSON.stringify(S)`; debounced cloud save to Worker; export/import. `freshState()` defines the schema ([index.html:1921](index.html:1921)). |
| Audio | WebAudio-synthesized chiptune SFX + dorian music loop. No audio files. |
| Testing | `node game-test.js` (~578 lines, ~70 checks). **It works by regex-extracting every inline `<script>` block from `index.html` and running it in a Node `vm` sandbox with DOM/localStorage stubs** ([game-test.js:22](game-test.js:22), [game-test.js:133](game-test.js:133)). This extraction mechanism is the single most important thing the migration must not break. |
| PWA | `manifest.json` + `apple-mobile-web-app-*` meta + icons (192/512). **No service worker is registered today** — so it is *installable* but not truly *offline-capable*. The build step is an opportunity to fix this, not just a tax. |
| Deploy | GitHub Pages served **from repo root of `main`** (`deploy.sh`), plus Cloudflare Worker via `wrangler` (`worker.js`, `wrangler.toml`). |

**Architectural consequence #1:** the test harness couples logic-loading to "inline script in one HTML file." Any move to modules requires adapting *how* `game-test.js` loads code (Phase 1), while keeping every assertion intact.

**Architectural consequence #2:** roughly 95% of Gradus's surface area is **UI**, not world rendering. The engine swap is really a UI re-platforming with a pretty world layer on top.

---

## 2. Options comparison

Versions/licenses/sizes verified 2026-06-15 (npm, GitHub releases, bundlephobia).

| Criterion | **three.js** | Babylon.js | Phaser | KAPLAY (Kaboom fork) | three.js + 2.5D libs |
|---|---|---|---|---|---|
| Version | 0.184.0 (Apr 2026) | 9.12.0 core (2026) | 4.1.0 "Salusa" (Apr 2026) | 3001.0.x (npm, 2026) | three 0.184 + helpers |
| **License (SPDX)** | **MIT** | **Apache-2.0** | **MIT** | **MIT** | MIT + lib licenses |
| Core gzip size | **~178 KB** | ~1.59 MB full-core (tree-shakes lower; minimal build size unverified) | **~341 KB** | **~65 KB** | ~178 KB + 10–40 KB |
| Dimensionality | 3D (+ ortho 2.5D) | 3D (+ ortho 2.5D) | 2D only | 2D only | 2.5D (ortho 3D) |
| 16-bit look | First-class: built-in `RenderPixelatedPass`, LUT/dither passes | Custom post-process shaders | `pixelArt:true` (nearest-neighbor) native | Native crisp pixel scaling | Ortho cam + nearest sprites + pixel pass |
| 2.5D/3D fit for town+combat | **Excellent** — depth, billboards, camera moves, room to grow | Excellent but heavy | Good (fake iso tilemaps, depth-sort) | OK (sprite scenes) | **Excellent** |
| Mobile/touch + PWA | Strong (you wire input yourself) | Strong (built-in input) | **Strong (built-in touch, Scale Manager)** | **Strong (tiny, built-in input)** | Strong |
| Learning curve | Steep (renderer, not a game engine) | Moderate–steep | **Gentle–moderate** | **Gentlest** | Steep |
| Built-in game systems | None (DIY loop/input/UI) | Some (input, GUI, physics) | **Lots (scenes, tilemaps, tweens)** | Some (components/tags) | None |
| Asset pipeline | glTF + Aseprite atlases (DIY loaders) | glTF + sprite manager | **Tiled (TMX/JSON) + atlases** | Sprite sheets | Aseprite atlases (+ Tiled via twopoint5d) |

Supporting libraries (for the three.js route), all verified:

| Library | Purpose | License |
|---|---|---|
| three.js core + `addons` (`RenderPixelatedPass`, `Sprite`, `EffectComposer`, `OutputPass`) | renderer + built-in pixelation | MIT |
| [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) | post FX stack, custom-effect API for palette/dither | **Zlib** |
| [samwhitford/threejs-ordered-dithering-effect](https://github.com/samwhitford/threejs-ordered-dithering-effect) | drop-in Bayer ordered-dither pass | MIT |
| [spearwolf/twopoint5d](https://github.com/spearwolf/twopoint5d) | purpose-built 2.5D pixel-art on three.js: billboards, sprite-sheet animation, tilemaps, instancing | **Apache-2.0** |
| Vite + `vite-plugin-pwa` (Workbox) | build + real offline service worker | MIT |

Sources: three.js [npm](https://www.npmjs.com/package/three) / [RenderPixelatedPass docs](https://threejs.org/docs/pages/RenderPixelatedPass.html) / [pixel example](https://threejs.org/examples/webgl_postprocessing_pixel.html); Babylon [releases](https://github.com/BabylonJS/Babylon.js/releases) / [Apache-2.0 license](https://github.com/BabylonJS/Babylon.js/blob/master/license.md); Phaser [4.1.0 notes](https://phaser.io/news/2026/04/phaser-4-1-0-salusa-release) / [Pixel Art Guide](https://github.com/phaserjs/phaser/blob/master/docs/Phaser%204%20Pixel%20Art%20Guide/Phaser%204%20Pixel%20Art%20Guide.md); KAPLAY [site](https://kaplayjs.com/) / [npm](https://www.npmjs.com/package/kaplay). Sizes via bundlephobia. **Flag:** a minimal tree-shaken Babylon size and twopoint5d's exact current version were not independently pinned.

---

## 3. Recommendation & rationale

### Winner: three.js, 2.5D (orthographic + billboards), built with Vite.

**Why three.js specifically for Gradus**

1. **It is the only option that delivers the brief — a 2.5D/3D world with depth — at the smallest credible bundle.** You asked for SNES-look-in-a-real-engine (pixel-snapped textures, dithering/palette shaders, low-res upscaled target, billboarded sprites). That is literally the three.js "HD-2D" recipe, and three.js ships the canonical building block (`RenderPixelatedPass`) in-box. ~178 KB gzipped core is a quarter of Babylon's full core.
2. **MIT license, zero strings.** Cleanest fit with the free/OSS constraint and with whatever you choose for art licensing later.
3. **Room to grow without a re-platform.** Start as a flat orthographic 2.5D town; later add a tilted camera, parallax, lighting, animated billboard NPCs, even a walkable overworld — all within the same scene graph. Phaser/KAPLAY would cap you at fake-iso 2D and you'd hit a wall.
4. **The pixel post-stack is reusable open source, not a research project.** `RenderPixelatedPass` (MIT) for pixelation + edge outlines; `samwhitford/threejs-ordered-dithering-effect` (MIT) or a pmndrs `postprocessing` (Zlib) custom effect for dither + palette quantization. `twopoint5d` (Apache-2.0) exists precisely to do "2.5d realtime pixelart with three.js" (billboards, sprite-sheet animation, tilemaps).

**Honest tradeoffs and risks**

- **three.js is a renderer, not a game engine.** No built-in scenes, input router, tween system, or — critically — UI. You build those. **This is the biggest risk.** Mitigation: keep all *non-world* UI (menus, quest board, inventory, combat command panel, modals) as **HTML/CSS overlaid on the canvas**. Don't rebuild buttons as 3D meshes. Use three.js for the *world* (town, battle backdrop, sprites) and the existing DOM idiom for *chrome*. This also means most of today's UI can be ported nearly verbatim.
- **The 80/20 reality (restated because it's the main risk):** the renderer is days of work; re-homing the full UI surface is weeks. Budget accordingly. If after the Phase 0 spike the 2.5D payoff doesn't feel worth that UI cost, **Phaser 4 is the sane fallback** (built-in tilemaps/input/scaling, MIT, mature) and **KAPLAY** the minimalist fallback (65 KB) — both keep the same logic-extraction plan; only the render/UI layer differs.
- **Pixel-art correctness is fiddly.** Mipmap blur and atlas bleed are real (use `NearestFilter`, `generateMipmaps=false`, sRGB color space, 1–2px frame gutters). Budget time to get crisp.
- **Mobile perf.** WebGL + post passes at low internal resolution is cheap (the low-res target *helps* perf), but verify on a real phone early (Phase 0).
- **Bundle/PWA.** ~178 KB core + ~40 KB helpers + your code + textures. Larger than today's self-contained HTML, but a Workbox service worker makes it genuinely offline (which it isn't today).

**Why not the others (one line each)**

- **Babylon.js** — excellent engine, ~9× the core weight; batteries you don't need for a sprite town. Choose only if you later want full 3D + physics.
- **Phaser 4** — best *2D* choice and the recommended fallback, but 2D-only means fake iso, not true depth; doesn't satisfy the 2.5D/3D brief.
- **KAPLAY** — smallest and friendliest, great for a prototype, but the thinnest tooling and 2D-only.

---

## 4. The 16-bit look — concrete technique & reusable code

The target is "HD-2D": pixel-art 2D sprites standing in a low-res-rendered 3D environment under an orthographic camera, color-graded to a limited palette. Pipeline, in order:

1. **Orthographic camera (2.5D).** `THREE.OrthographicCamera(left,right,top,bottom,near,far)`, tilted ~30–45° for an iso feel or flat for top-down. No perspective foreshortening → consistent sprite scale = SNES feel. Recompute frustum on resize. (Standard three.js; this is the setup in the official pixel example.)

2. **Low-res render target, upscaled nearest-neighbor.** Render the scene into a `WebGLRenderTarget` at ~¼ canvas resolution with `magFilter: NearestFilter`, then blit to a fullscreen quad. Pixelates *geometry edges and shading*, not just textures, and *improves* mobile perf. Cheap alt: small canvas + CSS `image-rendering: pixelated`. Disable MSAA.
   - Ref: [Three.js pixelated lo-fi look (E. Sachse)](https://eriksachse.medium.com/three-js-pixelated-lo-fi-energy-look-298b8dc3eaad); [RenderTarget docs](https://threejs.org/docs/pages/RenderTarget.html).

3. **Pixelation pass (with free outlines).** `RenderPixelatedPass(pixelSize, scene, camera)` via `EffectComposer` + `OutputPass`; tune `normalEdgeStrength`/`depthEdgeStrength` for the 1px outlines that make 3D read as deliberate pixel art. WebGPU variant: `PixelationPassNode`.
   - Ref: [RenderPixelatedPass docs](https://threejs.org/docs/pages/RenderPixelatedPass.html); [official example](https://threejs.org/examples/webgl_postprocessing_pixel.html). MIT.

4. **Dither + palette limiting.** Ordered (Bayer 4×4) dithering + per-channel quantization `floor(c*(n-1)+0.5)/(n-1)`, or a 1D/2D LUT palette snap for a true fixed SNES palette.
   - Drop-in: [samwhitford/threejs-ordered-dithering-effect](https://github.com/samwhitford/threejs-ordered-dithering-effect) (MIT).
   - Or build one effect in [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) (Zlib) — custom-effect API.
   - GLSL refs: [Codrops real-time dithering shader (2025)](https://tympanus.net/codrops/2025/06/04/building-a-real-time-dithering-shader/); [Maxime Heckel — dithering & retro shading](https://blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web/) (gives Bayer + blue-noise + the quantization formula).

5. **Billboarded pixel sprites.** `THREE.Sprite` auto-faces the camera — the core HD-2D trick for heroes/monsters/NPCs. Set `sprite.center=(0.5,0)` to plant feet; `SpriteMaterial.sizeAttenuation=false` for constant on-screen size. For many animated sprites / sprite-sheet frames / tilemaps, use [twopoint5d](https://github.com/spearwolf/twopoint5d) (Apache-2.0).
   - Ref: [Sprite docs](https://threejs.org/docs/pages/Sprite.html), [Billboards manual](https://threejs.org/manual/en/billboards.html). (Octopath/HD-2D is UE4 + proprietary — technique transfers, code does not. There is **no** open web HD-2D engine to copy; you assemble it from the blocks above. `twopoint5d` is the closest single web-native reference.)

6. **Texture filtering hygiene.** `magFilter=minFilter=NearestFilter`, `generateMipmaps=false`, `colorSpace=SRGBColorSpace`, pad atlas frames 1–2px to stop bleeding.
   - Ref: [Texture.minFilter docs](https://threejs.org/docs/#api/en/textures/Texture.minFilter).

**Reusable stack summary:** ortho cam → `RenderPixelatedPass` (MIT) → ordered-dither/quantize effect (MIT or Zlib) → `Sprite`/`twopoint5d` billboards (MIT/Apache-2.0) → nearest, no-mip, sRGB textures.

---

## 5. Asset & audio plan

Licensing ladder, easiest first: **CC0 (no attribution) → CC-BY (credit) → CC-BY-SA / GPL (credit + share-alike, copyleft — avoid for proprietary art).**

### Sourceable now (prefer CC0 to dodge attribution/share-alike friction)

| Need | Source | License |
|---|---|---|
| Town/overworld tiles | Kenney [Roguelike/RPG Pack](https://kenney.nl/assets/roguelike-rpg-pack), [Tiny Town](https://kenney.nl/assets/tiny-town) | **CC0** |
| Dungeon/cave tiles | Kenney [Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon); [0x72 16×16 Dungeon](https://0x72.itch.io/16x16-dungeon-tileset) | **CC0** |
| Generic NPC/monster sprites | Kenney [Roguelike Characters](https://kenney.nl/assets/roguelike-characters), [Monster Builder](https://kenney.nl/assets/monster-builder-pack) | **CC0** |
| Directional/animated characters (best for billboards) | [LPC base assets](https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles) + [Universal LPC Generator](https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/) | **CC-BY-SA 3.0 + GPL 3.0** (Sharm/Redshrike subset also **CC-BY/OGA-BY** — attribution-only; check `CREDITS.TXT`) |
| 8-dir CC0 characters (cleanest billboards) | itch: Shade "Puny" sprites, Hormelz 8-dir Knight | **CC0** |
| Item/equipment icons | itch: Alex's Assets, Shade RPG icon packs | **CC0** |
| UI frames/buttons | Kenney [UI Pack – Pixel Adventure](https://kenney.nl/assets/ui-pack-pixel-adventure), [Pixel UI Pack](https://kenney.nl/assets/pixel-ui-pack) | **CC0** |
| Pixel fonts | Kenney fonts (Kenney Pixel/Mini) | **CC0** |
| Music (chiptune medieval) | [15 Melodic RPG Chiptunes](https://opengameart.org/content/15-melodic-rpg-chiptunes); RandomMind [Bard's Tale](https://opengameart.org/content/chiptune-medieval-the-bards-tale), Old Tower Inn | **CC0** |
| SFX | Kenney [RPG Audio](https://kenney.nl/assets/rpg-audio), [Interface Sounds](https://kenney.nl/assets/interface-sounds) | **CC0** |

**License cautions (verified):**
- **LPC is CC-BY-SA 3.0 + GPL 3.0** — share-alike is a *real* obligation on derivatives, not just a credit. Prefer the Sharm/Redshrike CC-BY subset, or stay CC0, if you want to keep your own art proprietary.
- **Tiny Swords (Pixel Frog)** — popular, but the *current* version is a **custom no-redistribution license, not CC0**; only an older archived build was CC0. Use accordingly.
- **Incompetech/Kevin MacLeod** mostly **CC-BY** (credit required) and orchestral, not chiptune. **Freesound** is per-sound (CC0/CC-BY/CC-BY-SA) — filter to CC0.
- Re-confirm each itch/OGA pack's license *on its own page* before shipping; listing tags occasionally lie.

### Billboard suitability
- **LPC** (4-dir, animated, 64×64, orthographic) and **CC0 8-dir itch packs** are ideal for sprites the camera circles — swap directional rows by camera-relative facing.
- **Kenney single-pose** sprites are fine as static always-face-camera billboards (monsters/props) but look "cardboard" if you orbit them.
- **Tilesets are flat tilemaps**, not billboard material — use as ground/wall geometry textures.

### Must be created custom
- **Named hero buildings** with recognizable identity/signage: Keep, Tavern, Inn, Bank, Blacksmith/Forge, Woodsmith, Armorer, Apothecary, Chapel, Library. Generic packs give houses, not *your* landmarks. Kitbash from Kenney/LPC, finalize custom.
- **Fitness-RPG-specific UI/HUD**: Realm Sync, streak/day widgets, Ries/Gradus bars, quest-board layout, paperdoll. Sourced UI gives primitives only.
- **Brand art**: title screen, crest/logo, signature hero silhouette, lore monsters (the Lich, the First Wanderer).
- **Exercise-themed items** (e.g., a few bespoke icons).

Roughly **~80% of tiles/generic sprites/icons/UI primitives/fonts/audio are sourceable (mostly CC0)**; the custom budget concentrates in named buildings, the bespoke HUD, and brand/lore art.

> Note: your **synthesized audio already works and is zero-byte** — you may simply keep the WebAudio chiptune engine and treat sourced music as optional. That's a free win; don't replace what isn't broken.

---

## 6. What carries over vs. gets rebuilt

| System | Disposition | Why |
|---|---|---|
| **Economy** (currencies, caps, streaks, thresholds, Ries cap, Forge costs) | **Reuse as-is** | Pure functions over `S`. Extract to a module unchanged. The test suite already guards it. |
| **Quest data + combat logic** (31 quests, traits, crits, dungeons, drops) | **Reuse as-is** | Data + pure resolution logic. `m.spr` convention stays as the sprite key. |
| **Save format / state schema** (`freshState`, `migrate`, multi-account) | **Reuse as-is** | Keep `gradus-save-v1-*` keys and JSON shape. **Hard constraint: do not break existing saves.** |
| **Worker sync + cloud saves** (`worker.js`, `/push` `/activity` `/save` `/load` `/leaderboard`) | **Reuse as-is** | Backend is independent of the frontend engine. Untouched. |
| **`FitnessProvider` interface** | **Reuse as-is** | Clean async seam ([index.html:1860](index.html:1860)). |
| **Audio** (synth chiptune + dorian loop) | **Reuse / adapt** | Pure WebAudio, engine-agnostic. Move into a module; keep playing. |
| **`game-test.js` (~70 checks)** | **Adapt (loader only)** | Swap the regex-`<script>`-scrape ([game-test.js:22](game-test.js:22)) for `require`/`import` of the new logic modules. **All assertions stay.** Must stay green every phase. |
| **DOM UI shell** (menus, modals, quest board, inventory, settings, title) | **Adapt** | Port HTML/CSS as a canvas overlay; reuse structure. Don't rebuild as 3D. |
| **World rendering** (`town.png` hotspots, `monSprite` inline SVG/canvas, battle scenes) | **Rebuild** | This is the actual migration: town → 3D scene of building billboards; combat → ortho battle scene with billboard hero+monster; `m.spr` becomes a sprite-atlas lookup instead of an SVG builder. |
| **PWA shell** (manifest, meta) | **Adapt + upgrade** | Keep manifest; **add** a Workbox service worker (`vite-plugin-pwa`) for true offline — a net gain over today. |
| **Deploy** (GitHub Pages from root, Worker) | **Adapt** | Pages must now serve Vite `dist/` — via GitHub Actions or a built-output branch. Worker unchanged. |

**The keystone refactor (Phase 1):** lift all gameplay logic out of the inline `<script>` into framework-free ES modules (`economy.js`, `quests.js`, `combat.js`, `state.js`, `fitness.js`, `audio.js`). Both the new app and `game-test.js` import the same modules. This is the move that makes "reuse, don't rewrite" true and keeps the test suite as the safety net through every later phase.

---

## 7. Phased migration plan

Principle (matching your step-by-step style): **every phase ends with something you can open and try, and `node game-test.js` stays green.** Each phase is independently shippable/abandonable. The legacy `index.html` keeps working until the final cutover.

### Phase 0 — Spike (throwaway, ~prove the look)
- **Goal:** decide three.js vs. fallback on *evidence*, not theory.
- **Scope:** a standalone Vite + three.js demo (separate folder, not wired to the game): ortho camera, 3–4 building billboards on a tile ground, one animated hero billboard, `RenderPixelatedPass` + a dither pass, low-res target. Load a couple of CC0 Kenney tiles + one LPC/8-dir character.
- **End state you can try:** open the demo on **desktop and your phone**; judge whether the 16-bit 2.5D look and mobile perf justify the UI re-platform cost. Screenshot for the record.
- **Tests:** N/A (no game logic touched). Legacy game untouched.
- **Exit decision:** green-light three.js, or fall back to Phaser 4 / KAPLAY (same later phases, different render/UI layer).

### Phase 1 — Logic extraction + test harness adaptation (no visual change)
- **Goal:** make the game logic modular and engine-independent; keep the current game running.
- **Scope:** extract economy/quests/combat/state/fitness/audio into ES modules; have *current* `index.html` import them (via a tiny bundle or `<script type=module>`); rewrite `game-test.js`'s loader to `import` the modules instead of scraping `<script>` blocks — **keeping all ~70 assertions**.
- **End state you can try:** the existing game still plays identically; `node game-test.js` passes from modules.
- **Tests:** full suite green (this phase *is* the test-safety milestone).
- **Risk control:** purely mechanical/behavior-preserving; the test suite proves no regression.

### Phase 2 — Vite scaffold + build/deploy pipeline
- **Goal:** adopt the build step and prove deploy still works.
- **Scope:** Vite project; `vite-plugin-pwa` (Workbox) for manifest + offline SW; import the Phase 1 modules; keep the **existing DOM UI** rendered as-is (no engine yet) so the game is fully playable from the built output. Update `deploy.sh` / add a GitHub Action to publish `dist/` to Pages. Worker untouched.
- **End state you can try:** `npm run build` → open `dist/` → full game plays, now installable **and offline-capable**; deployed build serves from Pages.
- **Tests:** suite green; manually verify install + offline + a cloud save round-trip.
- **Tradeoff made explicit here:** you lose "double-click `index.html`." You gain modules, real offline, and a normal dev server. (Mitigation: `vite-plugin-singlefile` can still emit one inlined HTML if you ever want the portable artifact back.)

### Phase 3 — Port the town map to a 2.5D scene
- **Goal:** replace the `town.png` hotspot image with a real ortho 3D town.
- **Scope:** three.js canvas as the town background; building billboards (sourced + kitbashed) at the existing hotspot positions; tap/click a building → same existing handlers/menus fire. UI chrome stays DOM overlay. Respect the progressive-disclosure unlocks (locked buildings dim, V1.24 behavior).
- **End state you can try:** tap buildings in the new 2.5D town; every building opens the correct (still-DOM) screen.
- **Tests:** suite green (logic untouched); manual town-navigation pass, including locked-building guards.

### Phase 4 — Port turn-based combat to a battle scene
- **Goal:** replace inline SVG battle scenes with an ortho battle scene.
- **Scope:** billboard hero (class/gender/equipment variants) vs. billboard monster driven by `m.spr` → sprite-atlas lookup (replacing `monSprite`/`MON_BUILDERS` rendering, **same data**); combat command panel stays DOM overlay; wire SFX; trait/crit/flee flows unchanged.
- **End state you can try:** fight a quest and a dungeon floor end-to-end with the new visuals; death/wound/flee all behave.
- **Tests:** suite green (combat math is in the modules and already covered); manual fight + 100-session sim sanity (`node game-test.js --loop`).

### Phase 5 — Polish, remaining screens, asset finalization
- **Goal:** close the gap to parity + the intended aesthetic.
- **Scope:** finalize custom buildings/HUD/brand art; port any remaining bespoke visuals (free hunts, life-skill spots, dungeon delves) into the scene idiom; tune palette/dither; animate ambient NPCs; perf-tune mobile (resolution scale, sprite counts).
- **End state you can try:** a coherent 16-bit 2.5D Gradus at feature parity with today.
- **Tests:** suite green; full manual regression on phone; Lighthouse PWA check.

### Phase 6 — Cutover
- **Goal:** make the engine build the canonical Gradus.
- **Scope:** point Pages/deploy at the Vite build as primary; archive the legacy single-file `index.html` (e.g. `archive/`); update `DESIGN.md`/`INTEGRATION.md`/`README`; bump version + CHANGELOG.
- **End state you can try:** the live URL is the new engine; old saves load; sync + cloud save + leaderboard all work.
- **Tests:** suite green; production smoke test (install, offline, sync pull, cloud save, combat).

**Rollback:** every phase keeps the previous artifact runnable; Phases 1–2 are behavior-preserving; Phases 3–4 are additive (you can keep the DOM/`town.png` path behind a flag until confident). The test suite is the through-line.

---

## 8. Open decisions for Rodolfo (need your call before any code)

1. **Accept a build step (Vite)?** It is the linchpin — modules, green tests, real offline all depend on it. Cost: no more double-click-to-run (recoverable via `vite-plugin-singlefile` if you want the portable artifact back). **My rec: yes.**
2. **2.5D billboards vs. full 3D?** I recommend **2.5D** (ortho + billboards) — it nails the SNES look, is far less art, and runs better on phones. Full 3D models are a much bigger asset effort. **My rec: 2.5D.**
3. **Engine: lock three.js, or hold the Phaser-4 fallback until after the Phase 0 spike?** I'd run the spike first and decide on evidence. If you'd rather minimize total effort over maximizing the 3D feel, Phaser 4 is the pragmatic pick today.
4. **Art direction: source-and-kitbash (mostly CC0) vs. commission/AI-generate a bespoke set vs. upscale current sprites?** This sets the asset budget. Note CC0 keeps your art unencumbered; LPC's share-alike does not. (Upscaling the current inline SVG sprites is possible but they're not designed as billboard atlases.)
5. **Attribution tolerance?** If you want **zero** attribution/share-alike obligations, I'll stay strictly CC0 (Kenney + CC0 itch + CC0 chiptunes) and skip LPC. Otherwise LPC (with credits) unlocks far richer animated characters.
6. **Keep the synthesized chiptune audio, or move to sourced music files?** Keeping it is free and already works; sourced music adds bytes but more variety. **My rec: keep synth, add sourced tracks only if desired.**
7. **Deploy mechanism for the build:** GitHub Actions building to Pages (cleaner) vs. committing `dist/` to a branch (simpler). **My rec: Actions.**

---

## 9. Logical next step

**Run Phase 0 — the throwaway spike.** Stand up a tiny standalone Vite + three.js demo (ortho camera, a few CC0 building billboards, one animated character, `RenderPixelatedPass` + a dither pass at a low-res target), then open it on desktop **and** your phone and judge the look + mobile feel against the UI-re-platform cost. That single afternoon turns Open Decisions #1–#3 from speculation into an evidence-based call — and it touches no game files, so the current Gradus and `node game-test.js` stay exactly as they are.

If you want, the step after your decisions is Phase 1 (logic extraction + test-harness adaptation), which is the safe, behavior-preserving refactor that everything else builds on.
