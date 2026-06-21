# Claude Code task — research a 16-bit-style engine for Gradus and produce a full migration plan

## Role
You are the lead developer/architect for **Gradus**, a medieval fitness web game. Your job in this task is **investigation and planning only** — produce a recommendation and a detailed phased migration plan. **Do not start migrating the game or editing `index.html` yet.** The single deliverable is a written plan I can review.

## Context — what Gradus is today
Read these first to ground yourself: `DESIGN.md`, `INTEGRATION.md`, `CHANGELOG.md`, and skim `index.html`.

Current state:
- **Single-file PWA**: the entire game lives in `index.html` (~260 KB) — HTML, CSS, and vanilla JS in one file. Playable by opening the file; no build step, no framework.
- **Art**: 8-bit pixel style, rendered with hand-written SVG/canvas sprite code (`monSprite()` / `m.spr:[kind,...args]` convention). Tile sheets exist as PNGs (`town.png`, `Overworld.png`, `cave.png`, `objects.png`, `character.png`, `Inner.png`, `font.png`).
- **Gameplay**: clickable town map → buildings (Tavern, Inn, Bank, Blacksmith, etc.); turn-based combat; 31 quests across 3 zones; dungeons; life skills; crafting; equipment/Forge.
- **Currencies**: Gradus (1 step = 1 G), Ries (1 kcal = 1 Ries). Daily caps, streaks, bonuses.
- **Fitness data**: behind a `FitnessProvider`-style interface; v1 is manual/mock + iPhone Shortcut → Cloudflare Worker → game.
- **Persistence**: `localStorage` saves (multi-account) + optional Cloudflare Worker cloud saves; exportable save.
- **Audio**: synthesized chiptune SFX + a dorian music loop.
- **Testing**: `node game-test.js` runs ~70 automated checks (economy, caps, streaks, fuzz, 100-session sim) and writes `test-report.md`.
- **Deploy**: GitHub Pages + Cloudflare Worker via `wrangler` (`deploy.sh`, `wrangler.toml`).

## Goal
Investigate how to move Gradus onto a **proper game engine** that delivers a **2.5D / 3D world with a retro 16-bit pixel aesthetic** (think SNES-era look, but rendered in a real engine with pixel-snapped textures, dithering/palette shaders, low-res render target upscaled, billboarded sprites, etc.). **three.js** is the leading candidate, but evaluate alternatives too.

Hard constraints (keep these true in any proposal):
- **Free and open-source only.** No paid engines, no proprietary licenses. Note the license of every tool you recommend (MIT, Apache-2.0, etc.).
- **Web-first, runs in any browser**, and must stay installable as a PWA (mobile-first: bottom nav, safe areas, touch input).
- Preserve the **economy, save format, `FitnessProvider` interface, and the `node game-test.js` test suite** — game logic should be reusable, not rewritten from scratch.
- A build step is now acceptable (e.g. Vite), but call out the tradeoff vs. today's zero-build single file.

## What to investigate
1. **Engine/renderer options.** Compare at least:
   - **three.js** (3D, with a pixel/retro post-processing approach for the 16-bit look)
   - **Babylon.js** (3D alternative)
   - **Phaser** and **Kaboom.js / KAPLAY** (2D/2.5D, simpler, closer to current style)
   - one **isometric/2.5D** approach (e.g. three.js orthographic + billboards, or a tilemap lib)
   For each: license, bundle size, mobile/touch + PWA fit, learning curve, how it achieves a 16-bit pixel look, 2.5D vs full-3D suitability for Gradus's town-map + turn-based-combat structure, and asset pipeline.
2. **Achieving the 16-bit look in a 3D engine.** Research concrete techniques: low-resolution render target upscaled with nearest-neighbor, pixelation/dither/palette-limiting post-process shaders, billboarded pixel sprites, orthographic camera for 2.5D. Cite real open-source examples/shaders you'd reuse.
3. **Free asset sources.** Identify open-source / CC0 16-bit medieval pixel-art and audio sources (e.g. Kenney.nl, OpenGameArt, itch.io CC0 packs). List with licenses. Note what would need to be created vs. sourced.
4. **What carries over vs. gets rebuilt.** Map current systems (economy, quests data, combat logic, save/Worker sync, FitnessProvider, audio, test harness) to "reuse as-is", "adapt", or "rebuild", and explain why.
5. **PWA + deploy impact.** How a build step affects the GitHub Pages + Cloudflare Worker deploy, offline/installability, and bundle size budget.

Use web search to verify current versions, licenses, and bundle sizes — don't rely on memory.

## Deliverable
Write a single Markdown file: **`ENGINE-MIGRATION-PLAN.md`** in the project root, containing:
1. **Executive summary** — your recommended engine + 2.5D vs 3D direction, in a few sentences.
2. **Options comparison table** — engines/renderers scored against the criteria above, with licenses and sizes.
3. **Recommendation & rationale** — why the winner fits Gradus specifically; honest tradeoffs and risks.
4. **16-bit look approach** — the rendering technique and specific shaders/examples to reuse (with links).
5. **Asset & audio plan** — sourced free assets (with licenses) vs. what must be made.
6. **Phased migration plan** — concrete, ordered phases (e.g. Phase 0 spike → engine scaffold + build → port town map → port combat → port save/sync/PWA → cutover), each with goals, scope, and a testable end state. Keep my step-by-step working style in mind: every phase should end with something I can open and try, and `node game-test.js` should keep passing.
7. **Open decisions for Rodolfo** — anything that needs my input before any code is written (e.g. accept a build step? full 3D or 2.5D billboards? new art vs. upscaled current sprites?).

Do **not** modify game files. Produce only `ENGINE-MIGRATION-PLAN.md`. End by telling me the logical next step.
