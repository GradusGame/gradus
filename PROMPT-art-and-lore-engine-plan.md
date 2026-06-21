# Claude Code task — plan Gradus's move to a Cursemark/Ball x Pit-style pixel world on three.js, and map the existing lore into it

## Role
You are the lead developer/art director for **Gradus**, a medieval fitness web game. This task is **planning only** — produce one written plan I can review. **Do not edit `index.html` or migrate code yet.** Investigate and decide, but stop at the plan.

## Read first (ground yourself)
- Game design & systems: `DESIGN.md`, `INTEGRATION.md`, `CHANGELOG.md`, and skim `index.html`.
- **Lore & narrative (this is the heart of the task):** `THE-BOOK-OF-GRADUS.md`, `LORE.md`, `CHARACTERS.md`, `STORY-ARCS.md`, `Chapter-01-The-Dawn-That-Lied.md`, `INTERLUDES.md`, `VOICE-AND-CRAFT.md`, `IMAGE_PROMPTS.md`.
- If a prior engine investigation exists, read `ENGINE-MIGRATION-PLAN.md` and build on it rather than repeating it.

## The vision
Move Gradus from its current 8-bit, hand-drawn-SVG look to a **richer 16-bit gothic pixel-art world** in the visual spirit of **Cursemark** (CLYDE — dark, moody, detailed medieval pixel art) and **Ball x Pit** (Kenny Sun — vibrant, crisp pixel sprites). Those are native Unity-class games and are **not usable here** — we are reproducing their *art style* on the web, not their engine.

Rendering target: **three.js** for a **2.5D pixel world** (orthographic camera, pixel-snapped/billboarded sprites, low-res render target upscaled with nearest-neighbor, palette/dither post-processing for the 16-bit feel).

## Art style to match — Cursemark by Clyde Games (study this closely)
Cursemark is a dark-fantasy action roguelite in **hand-drawn pixel art** (Clyde Games + Mad Mushroom, Steam EA June 2026). Reproduce its *visual treatment*, not its gameplay. The defining qualities to aim for:

- **Mood:** gothic, occult, arcane, ominous. A cursed medieval world — ruined, corrupted, mysterious. Everything feels weighty and atmospheric, never cute or bright-cheery.
- **Palette:** dominated by deep blacks and shadow, with desaturated cool base tones (cold blues, teals, muted purples, sickly/corrupted greens, ashen greys, dried-blood reds). High contrast. The dark base makes **vivid magic accents pop** — fire orange, lightning cyan, poison green, holy gold — used sparingly as focal glows.
- **Lighting & atmosphere:** dramatic dynamic lighting, strong rim/glow on light sources, ambient occlusion in shadows. Layered atmosphere — fog, drifting embers/dust/spell particles, god-rays, vignette. Light pools out of torches, runes, and shrines against surrounding gloom.
- **Detail & texture:** richly detailed, textured pixel tiles (weathered stone, gnarled wood, cracked earth, arcane carvings) — clearly **16-bit-class fidelity, well beyond Gradus's current flat 8-bit SVG sprites**. Readable silhouettes; clean pixel clusters, deliberate dithering for gradients/shadow; no anti-aliased blur (nearest-neighbor only).
- **VFX:** flashy, colorful spell/impact effects (fireballs, lightning arcs, poison clouds, runic glyphs) layered as glowing pixel particles over the dark scene — the signature Cursemark contrast of bright magic against darkness.
- **Reference materials to pull:** look at the Cursemark Steam page (store.steampowered.com/app/3219180), the Clyde Games site (clyde.games), and the launch trailer for screenshots; capture this in the style bible (palette swatches, lighting rules, do/don't examples). Lean on `IMAGE_PROMPTS.md` for our existing visual vocabulary and evolve it toward this look.

For **Ball x Pit** (Kenny Sun) borrow only the crispness and clean, punchy sprite readability — Gradus's tone is Cursemark's dark fantasy, not Ball x Pit's brightness.

## Camera & character scale — small hero (this matters)
**Zoom like classic top-down Zelda / Pokémon, NOT like Cursemark's combat camera.** Cursemark is fairly zoomed-in on a large hero; we do **not** want that framing.

- Reference framing: **The Legend of Zelda: A Link to the Past** and **Pokémon** (Game Boy Advance era) — a ¾ top-down overworld where the **hero sprite is small** relative to the screen (roughly 16–24 px tall, on the order of ~1/12 to ~1/16 of screen height), so a generous area of the world is visible around them.
- Tile-based grid movement, camera smoothly follows the hero, walkable towns and zones with **enterable buildings** and zone transitions. This replaces today's static clickable map with a walkable world.
- Apply Cursemark's *art rendering* (palette, detail, lighting, mood) **at this Zelda/Pokémon zoom level** — a small, detailed hero in a moody, atmospheric overworld. Make the style bible state the sprite-to-screen ratio explicitly so all assets are authored to the right scale.
- Combat can stay turn-based but should be re-skinned into the new look.

## Hard constraints
- **Free and open-source only.** three.js plus only free/OSS tools and CC0/permissive assets. Note the license of everything you recommend.
- **Web-first, any browser, stays a PWA** (mobile-first: touch controls, bottom nav, safe areas, installable, offline-capable).
- **Preserve game logic & data**: economy (Gradus/Ries, caps, streaks), save format, the `FitnessProvider` interface, Cloudflare Worker sync, and the `node game-test.js` suite must carry over — reuse logic, don't rewrite it.
- A build step (e.g. Vite) is acceptable; call out the tradeoff vs. today's zero-build single file.

## What to investigate & decide
1. **Reproducing the Cursemark/Ball x Pit look on three.js.** Concrete techniques and reusable open-source shaders/examples: orthographic 2.5D, low-res render target + nearest-neighbor upscale, pixelation/dither/palette-limit post-process, billboarded sprites, lighting/atmosphere for the gothic mood. Cite real repos/examples with links and licenses.
2. **Pokémon-style world & camera.** Tile/grid movement, small-character scale, camera follow, collision, zone transitions, walkable towns with enterable buildings. Identify free tilemap/movement helpers or confirm doing it directly in three.js. Map today's clickable Town buildings (Keep, Tavern, Inn, Bank, Blacksmith, etc.) to walkable locations.
3. **Free 16-bit medieval asset sources.** CC0/permissive pixel-art tilesets, character/NPC sprites, building exteriors/interiors, monsters, UI, plus chiptune/orchestral-retro audio (e.g. Kenney.nl, OpenGameArt, itch.io CC0). List with licenses; note what must be commissioned/generated vs. sourced. Reference `IMAGE_PROMPTS.md` style.
4. **Reuse vs. rebuild map.** For each system (economy, quests data, combat, save/Worker sync, FitnessProvider, audio, test harness, PWA shell), say reuse-as-is / adapt / rebuild and why.

## The lore mapping — make the Book playable (give this real weight)
Translate the written world into the playable one. Produce a concrete mapping from the lore docs into game content:
- **World & zones:** turn the realms/regions described in `LORE.md` / `THE-BOOK-OF-GRADUS.md` into walkable Pokémon-style maps (overworld, towns, dungeons), with which lore location becomes which map and how zones gate (tie to existing zone unlocks where relevant).
- **Characters & NPCs:** map named characters from `CHARACTERS.md` to in-world NPCs, their locations, and dialogue hooks (using the tone in `VOICE-AND-CRAFT.md`).
- **Story & quests:** map `STORY-ARCS.md`, `Chapter-01`, and `INTERLUDES.md` beats onto the quest structure (main-story vs. side), noting where new walkable scenes/cutscenes are needed.
- **Art direction doc:** a short style bible for the 16-bit gothic look (palette, lighting, sprite scale for the small-character Pokémon zoom, UI treatment) so all future assets stay consistent.
Keep `THE-BOOK-OF-GRADUS.md` as the canonical lore source per project convention — do not rewrite it; reference it.

## Deliverable
Write one Markdown file: **`ART-LORE-ENGINE-PLAN.md`** in the project root, containing:
1. **Executive summary** — the art direction, three.js 2.5D + Pokémon-camera approach, and how the lore maps in, in a few sentences.
2. **Art-style reference & technique** — how we reproduce the Cursemark/Ball x Pit look on three.js, with linked shaders/examples and licenses.
3. **Camera & world model** — Pokémon-style tile movement, small-character scale, camera, zone/building layout (mapping current Town).
4. **Asset & audio plan** — sourced free assets (with licenses) vs. what must be made; art-style bible.
5. **Lore → game mapping tables** — zones, NPCs, and story/quest beats drawn from the lore docs (the section above).
6. **Reuse-vs-rebuild map** of existing systems.
7. **Phased migration plan** — ordered phases (Phase 0 spike → engine + build scaffold → walkable town with small-character camera → port one zone + NPCs from lore → port combat → port save/sync/PWA → cutover). Every phase ends with something I can open and try, and `node game-test.js` keeps passing. Respect my step-by-step style — small, testable increments, no building ahead.
8. **Open decisions for Rodolfo** — what you need from me before any code (build step? full new art vs. upscaled current sprites? how faithful to keep turn-based combat? which zone to prototype first?).

Do not modify game files. Produce only `ART-LORE-ENGINE-PLAN.md`. End by stating the single logical next step.
