# Gradus — Art, Lore & Engine Plan

**A walkable 16-bit gothic world on three.js: art direction, a Pokémon-style camera, and the Book of Gradus made playable.**

Author: lead dev / art director investigation
Date: 2026-06-15
Status: **Proposal for review — no game files changed.** This document is the only deliverable. Nothing in `index.html` or the game logic has been touched.
Scope: planning only. Investigate and decide; stop at the plan.

This builds on [ENGINE-MIGRATION-PLAN.md](ENGINE-MIGRATION-PLAN.md) (the engine choice, the bundle/size/license comparison, the test-harness constraint, the reuse map) and does **not** repeat its option comparison. three.js + Vite is taken as settled there. What is new here: (1) reproducing the **Cursemark / Ball x Pit** look specifically, (2) a **Pokémon-style walkable world** that replaces the static clickable map, and above all (3) **mapping the lore into playable content** — the heart of this task. All web claims were re-verified on 2026-06-15; anything unverified is flagged inline.

> The single most important new idea in this document: the two reference games are not one target, they are the **two ends of a gradient the lore already demands**. Ball x Pit's bright, crisp, saturated look is early Gradus (Oppidum's lake, the Greenwood). Cursemark's dark, painterly gothic gloom is late Gradus (the Ruins, the Hoarmarch, the Bleeding Mile). The world is a *dying paradise* (LORE §12 "beauty is the rule, blight the contrast"), so the art literally darkens as the player walks toward the wound. We do not pick one look. We tune one pipeline across the Road.

---

## 1. Executive summary

- **Art direction:** a 16-bit gothic pixel world rendered as **HD-2D** (pixel sprites in a low-res 3D scene under an orthographic camera, upscaled nearest-neighbor, color-graded with dither + a limited palette). The mood is a **gradient**: vibrant and warm at the head of the Road (Ball x Pit register), desaturated and gothic at its end (Cursemark register). The same post-processing stack drives both ends by swapping palette LUT, dither strength, vignette, and fog per Reach.
- **Engine & camera:** three.js (MIT) + Vite, per the prior plan. The static `town.png`-with-hotspots map becomes a **Pokémon-style walkable overworld**: a small character sprite, tile-grid movement, a camera that follows the hero, enterable buildings, and zone transitions down the Road. Combat stays turn-based, reframed as an orthographic battle scene with billboard hero + monster.
- **Lore mapping (the heart):** the five **Reaches** of the Road (LORE §12) become five walkable zones; **Oppidum's twelve current locations** map one-to-one onto enterable buildings in a walkable town; the named cast (Maren, Big Doll, Vane, the Vagabond, Orris, Edra, Col, Brand, Mordric, Roderic) become placed NPCs with dialogue hooks in the VOICE-AND-CRAFT register; and the **Chapter 1–7 Oppidum arc** maps onto the existing quest spine plus a handful of new walkable cutscene-scenes (the dawn Litany, the descent into the Hollow, Brand's return).
- **Constraints honored:** free/OSS only (licenses noted for everything); web-first PWA, mobile-first, offline-capable; economy / saves / `FitnessProvider` / Worker sync / `node game-test.js` all **reused, not rewritten** (logic extracted to modules, same assertions).
- **The honest catch (unchanged from the prior plan):** the renderer is the easy part. The hard part is re-homing the full DOM UI and now *also* building grid movement + collision + warps from scratch (no three.js drop-in exists). Budget accordingly. Every phase below still ends in something you can open and try, with the test suite green.

---

## 2. Art-style reference & technique (Cursemark / Ball x Pit on three.js)

### 2.1 What the two references actually look like

Neither game published an art post-mortem, so the palette/resolution numbers below are **reproduction recommendations**, not measured facts. Pull real screenshots and color-sample before locking the bible.

**Cursemark** (CLYDE / FrivolousKnight, pub. Mad Mushroom) — itch: <https://clydegames.itch.io/cursemark> · Steam screenshots: <https://steambase.io/games/cursemark/info> · press: <https://gamesbeat.com/dark-fantasy-action-roguelike-cursemark-live-in-steam-early-access/>. *(Game art is copyrighted — reference only, never reuse.)*
- Gothic dark-fantasy "pixelated soulslike." Dark, desaturated base (blue-blacks, cold greys, muted browns) with a few high-chroma accents reserved for fire/magic/UI. Heavy value contrast: a readable bright character against near-black backgrounds.
- Relatively high-detail, painterly hand-drawn pixel shading (not chunky NES blocks). Strong rim/glow lighting on light sources; vignette and darkness focus the eye; ambient fog for depth.

**Ball x Pit** (Kenny Sun, pub. Devolver) — announce: <https://kennysun.com/announcements/announcing-ball-x-pit/> · review describing the art: <https://www.well-played.com.au/ball-x-pit-review/>.
- Reviewers describe "crunchy pixel art combined with low-poly 3D" — a 2.5D hybrid of pixel sprites over simple geometry. Mood is "neo-gothic" but rendered **vibrant and high-contrast**: saturated accents, heavy colorful particle FX, "busy but immediately readable."
- Smaller tighter palette per sprite (~16), crisp solid 1px outlines for readability at small scale, minimal dithering on sprites.

The Ball x Pit "pixel sprites over low-poly 3D" approach **is** our three.js 2.5D target. The Cursemark approach is the same pipeline with a darker palette and more atmospheric post.

### 2.2 The pipeline (reuses the prior plan's verified stack)

Order of operations, all building blocks verified in [ENGINE-MIGRATION-PLAN.md §4](ENGINE-MIGRATION-PLAN.md):

1. **Orthographic camera**, slight Pokémon tilt or flat top-down. No foreshortening → constant sprite scale.
2. **Low-res render target → nearest-neighbor upscale** (¼-res internal), MSAA off. Pixelates geometry edges, not just textures, and *helps* mobile perf.
3. **`RenderPixelatedPass`** (three.js addons, **MIT**) via `EffectComposer` + `OutputPass` — pixelation plus tunable normal/depth edge outlines (the deliberate-pixel-art look). Docs: <https://threejs.org/docs/pages/RenderPixelatedPass.html>.
4. **Dither + palette limit.** Ordered Bayer dither via [samwhitford/threejs-ordered-dithering-effect](https://github.com/samwhitford/threejs-ordered-dithering-effect) (**MIT**), or a custom effect in [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) (**Zlib**). **This is the per-Reach mood knob:** snap to a dark LUT + heavier dither + vignette for the Ruins/Hoarmarch/Mile; a bright LUT + light dither for Oppidum/Greenwood.
5. **Billboarded sprites** (`THREE.Sprite`, `center=(0.5,0)` to plant feet) and, for animated sprite-sheets / tile rendering, [spearwolf/twopoint5d](https://github.com/spearwolf/twopoint5d) (**Apache-2.0**).
6. **Texture hygiene:** `NearestFilter`, `generateMipmaps=false`, `SRGBColorSpace`, 1–2px atlas gutters.

### 2.3 Reproducing each register

| Knob | Ball x Pit register (early Reaches) | Cursemark register (late Reaches) |
|---|---|---|
| Palette | ~32 colors, high saturation/contrast (e.g. Lospec **Endesga 32** <https://lospec.com/palette-list/endesga-32>) | ~24–48 colors, desaturated material ramps + 1–2 saturated fire/magic accents (e.g. **Dead Knights Dark Lights 36** <https://lospec.com/palette-list/dead-knights-dark-lights-36>, **Gothic Temple** <https://lospec.com/palette-list/gothic-temple>) |
| Outlines | crisp solid dark 1px | colored "selout" outlines, softer/painterly |
| Dither | minimal on sprites | sparing on fog/smoke/light-falloff gradients |
| Lighting/post | bright, bloom on particle FX | additive glow on light sources, strong vignette, ambient fog |
| Mood | warm, alive, saturated | oppressive, cold, value-contrast |

> Fog and god-light shafts: the research found **no** worth-citing CC0 gothic fog/lighting *art* pack. Do atmosphere **in-engine** (bloom + vignette + animated noise/dither in the existing post stack), not as sprites. This also makes the per-Reach gradient a parameter, not new art.

License note: the **technique** transfers from these games; **no code or art** is copied. There is no open-source HD-2D engine to fork; `twopoint5d` is the nearest single web reference. We assemble the look from the MIT/Zlib/Apache blocks above.

---

## 3. Camera & world model (Pokémon-style walkable Gradus)

### 3.1 The shift

Today: a single `town.png` (720×1280) with clickable hotspots; tapping a building opens a DOM screen. Locations unlock progressively (`UNLOCKS`, [index.html:993](index.html:993)).

New: a **walkable overworld**. A small hero sprite (Pokémon scale — character is a small fraction of the screen) moves on a tile grid; the orthographic camera follows; the player walks up to a building door and a *trigger* opens the (still mostly DOM) interior screen. Buildings that are story-locked are simply not yet enterable (door barred, NPC turns you away) — the same `UNLOCKS` gates, expressed spatially.

### 3.2 What exists vs. what we build (research verdict)

**There is no off-the-shelf grid-movement library for three.js.** The good ones (Grid Engine, Apache-2.0, <https://github.com/Annoraaq/grid-engine>) are Phaser-bound; read them as *reference implementations* only. The realistic path:

- **Roll grid movement directly in three.js** — snap-to-tile, step-tween, facing, input buffering. ~1–2 days; crib the algorithm from [Annoraaq/grid-movement](https://github.com/Annoraaq/grid-movement) (MIT-style tutorial repo).
- **Camera-follow** — lerp/snap an `OrthographicCamera` to `player.position + offset`, clamp to map bounds. ~½ day, ~20 lines. Ortho docs: <https://threejs.org/docs/#api/en/cameras/OrthographicCamera>.
- **Tile rendering** — use **twopoint5d**'s `map2d` (`Map2DTileRenderer`, `TileSet`/`TileSetLoader`, `RepeatingTilesProvider`); it does GPU tile rendering + camera visibility + chunk streaming, but you feed it a 2D tile-ID array. It does **not** parse Tiled files and has **no** collision/trigger/warp system (verified by reading its `map2d` source).
- **Maps authored in [Tiled](https://www.mapeditor.org/)** (GPL-licensed editor, free) → export **JSON** → parse layers yourself: visual layer → tile-ID grid for twopoint5d; **collision layer** and **trigger layer** → plain arrays your movement step reads. (Optional MIT parser: [node-tmx-parser](https://github.com/andrewrk/node-tmx-parser); JSON export + `JSON.parse` is simpler.)
- **Zone transitions / building warps** — custom: on entering a trigger tile, fire the existing screen handler (building interior) or load-next-map + fade + spawn-point (Reach boundary). ~1–2 days.

**Total ~1 week** for a solid walkable foundation (single dev comfortable with three.js). Mobile input: on-screen D-pad / swipe-to-step + tap-to-interact, reusing today's bottom-nav idiom for the rest of the UI.

### 3.3 Mapping today's Oppidum to a walkable town

The current twelve locations ([index.html:539–571](index.html:539), [DESIGN.md](DESIGN.md) "Town") become buildings around Oppidum's **one cobbled square with the chapel at its heart, the Road running out the far gate** (LORE §12 "Oppidum in detail"). Layout follows the lore's own geography, not an arbitrary grid:

| Current location (handler) | Lore identity (LORE §12) | Walkable placement | Enter-gate (keep existing `UNLOCKS`) |
|---|---|---|---|
| The Keep — `sync` | The **Wayward Keep / the Milestone**, watchtower at the Road's head | At the gate where the Road leaves town; the Milestone hums as you approach | start |
| Foundered Horse — `quests` | The flagship **tavern**, town's warm loud heart | On the square, warmest-lit building | start |
| Maren's — `inn` | The **Inn**, quieter, grief over Tam | Just off the square, lantern lit | start |
| Chapel — `chapel` | The **Hollow Choir's** chapel, only perfectly-kept building | Centre of the square (story focal point) | level 6 |
| Blacksmith — `blacksmith` | The **Blacksmith** / Forge | Smith's row off the square | start |
| Woodsmith — `woodsmith` | The **Woodsmith** | Smith's row | level 5 |
| Armorer — `armorer` | The **Armorer** | Smith's row | after 1st hunt |
| Apothecary — `apothecary` | The **Apothecary**, herb-hung | Lane off the square | after 2nd hunt |
| Bank — `bank` | The **Bank** vault | Stone building on the square | carry 3,000G |
| Library — `library` | The **Library** of salvaged Accounts | Quiet corner; codex/clarity-gated text | start |
| Commons — `commons` | The **Commons** green & woodlot | Town edge gate → small open area | after 6 hunts |
| Lake — `lake` | The grey **Lake** shore | Out the lake-side gate → dock | after 6 hunts |
| Hunting Grounds — `hunt` | Open **scrub beyond the walls** | Out the Road gate → first walkable wilds | level 4 |

NPCs the town already references (Big Doll, Wick & Gorn, Sweet Lyle, Pinch, Captain the dog, Orris, Maren, Edrin/Wenna, Vane, the Vagabond — [DESIGN.md](DESIGN.md) "Narrative / canon alignment") become **placed, walk-up-and-talk sprites** inside those buildings (see §5.2). The progressive-disclosure "each location wakes up as you earn it" beat (V1.24) survives intact, now expressed as doors opening in a walkable square.

### 3.4 The Road as the macro-map

The five Reaches (LORE §12 table) are five linked walkable zones strung along one **Road**, gated by the existing zone-unlock constants:

| Reach | Zone | Levels | Gate (existing) | Walkable character |
|---|---|---|---|---|
| 1 Oppidum | 1 | 1–10 | start | lake-town + square; Road gate south |
| 2 Greenwood | 2 | 10–20 | beat **Brand the Returned** (idx 13; `FOREST_UNLOCK=14`) | forest paths, rivers, waterfalls |
| 3 The Ruins | 3 | 20–30 | progress past Greenwood (`RUINS_UNLOCK=23`) | desert canyon + dead temple-city |
| 4 The Hoarmarch | (new) | 30–40 | progress past Ruins | unnatural frozen borderland; Wendholt; Frozen Ford |
| 5 The Bleeding Mile | (new) | 40–50 | progress past Hoarmarch | blood-warped end of the Road |

Reaches 1–3 already exist as content; 4–5 are lore-defined but not yet built. The walkable model lets each Reach hold a piece of Gradus's own history (LORE §12), since the Road *is* the path he walked.

---

## 4. Asset & audio plan + style bible

### 4.1 Sourceable now (license noted; prefer CC0)

Builds on the prior plan's list ([ENGINE-MIGRATION-PLAN.md §5](ENGINE-MIGRATION-PLAN.md): Kenney CC0 tiles/characters/UI/fonts, LPC CC-BY-SA/GPL, CC0 chiptunes). **New, gothic-specific** finds for the dark end of the gradient:

| Need | Source | License |
|---|---|---|
| Gothic church/castle tiles + animated gothic enemies | ansimuz **GothicVania Church Pack** <https://opengameart.org/content/gothicvania-church-pack> | **CC0** |
| Gothic castle/town-at-night environments + demon/undead monsters | ansimuz **Gothicvania Patreon's Collection** <https://opengameart.org/content/gothicvania-patreons-collection> | **CC0** (attribution appreciated) |
| Bright/clean town & overworld tiles (early Reaches) | Kenney Roguelike/RPG, Tiny Town | **CC0** |
| Directional animated characters (best billboards) | LPC base + Universal LPC Generator | **CC-BY-SA 3.0 + GPL** (Sharm/Redshrike subset CC-BY/OGA-BY) |
| 8-dir CC0 characters (cleanest billboards, no share-alike) | itch CC0 (Shade "Puny", Hormelz 8-dir Knight) | **CC0** |
| Palettes (mood gradient) | Lospec: Endesga 32, Sweetie 16, PICO-8 (bright) / Dead Knights Dark Lights 36, Gothic Temple, Gothic Bit (dark) | per-palette, mostly free — check each |
| Music + SFX | OpenGameArt CC0 medieval chiptunes; Kenney RPG Audio / Interface Sounds | **CC0** |

**Cautions (re-verified):** LPC's share-alike is a real obligation on derivatives — prefer the CC-BY subset or stay CC0 if art must remain unencumbered. **Tiny Swords (Pixel Frog)** is *not* CC0 in its current version. Kenney art skews bright and will need recoloring to a dark ramp to sit beside ansimuz gothic. Re-confirm every itch/OGA page's license before shipping.

**Tools (free/OSS):** [LibreSprite](https://libresprite.github.io/) (**GPLv2**, the free Aseprite fork) for sprite/tile authoring; [Tiled](https://www.mapeditor.org/) for maps; [Lospec](https://lospec.com/palette-list) for palette export into LibreSprite.

### 4.2 Must be made custom (kitbash then finalize)

- **Named Oppidum landmarks with identity** — the Foundered Horse (sign: a horse flat on its back, legs up), the Wayward Keep + the **Milestone** standing stone, the Hollow Choir's chapel, Maren's Inn. Generic packs give houses, not *these*.
- **Signature NPCs** — Big Doll (mountainous ex-strongwoman), the Vagabond (impossibly thin boots — a visual clue), Vane, Mordric the Iron Hound (chains motif), Roderic the Broken Strider, Captain the three-legged dog.
- **Lore monsters** — the **Tithe-Eater** (the Hollow boss), **Brand the Returned** and the **Hollowed** (body-horror former-vessels, wrong in the joints and eyes), the blood-warped beasts of the Mile.
- **Fitness-RPG HUD** — Realm Sync / Milestone widget, streak/day, Gradus 🪙 / Ries ⚡ bars, quest-board, 7-slot paperdoll. Sourced UI gives primitives only.
- **Brand art** — title, the Gradus coin/crest (a dead man's face), Gradus's Sword (the holiest, most-faked relic), Maelis's Ring.

The existing **WebAudio synth** (chiptune SFX + dorian loop) is zero-byte and engine-agnostic — **keep it**; treat sourced music as optional flavor.

### 4.3 Art-style bible (the short version)

Append to every asset/prompt, echoing [IMAGE_PROMPTS.md](IMAGE_PROMPTS.md) but with the gradient added:

- **Base style:** 16-bit gothic pixel art, crisp clean outlines, limited palette, no anti-aliasing, retro RPG aesthetic.
- **The gradient (the rule):** *beauty is the default, blight is the contrast* (LORE §12, VOICE-AND-CRAFT "World texture"). Early Reaches read bright, warm, saturated (Ball x Pit); the look desaturates and turns gothic toward the Bleeding Mile (Cursemark). **Never grey-filter the whole map.** Drive it with palette LUT + dither + vignette + fog per Reach, not new art.
- **Camera/scale:** Pokémon zoom — small character, ~16–24px sprite reading small against the tile world; orthographic, slight tilt; tile-snapped movement.
- **Lighting:** additive glow on fires/embers/magic; the **ember** (the world's signature warm drink, the anti-Hollowing "bonfire") and the Foundered Horse glow warm amber against cold dark — a deliberate light-against-dark motif.
- **Humans only** — no orcs/elves/dwarves (LORE §12). Variety comes from human cultures (lake/forest/desert folk). Menace from gods, the Hollowed, the broken-door things.
- **UI treatment:** DOM/CSS chrome overlaid on the canvas (not 3D meshes), styled as worn parchment + iron; pixel font (Kenney Pixel/Mini, CC0); bottom nav + safe areas preserved.

---

## 5. Lore → game mapping (the heart)

Canonical source stays [THE-BOOK-OF-GRADUS.md](THE-BOOK-OF-GRADUS.md) — referenced, never rewritten. Mappings below draw from [LORE.md](LORE.md), [CHARACTERS.md](CHARACTERS.md), [STORY-ARCS.md](STORY-ARCS.md), [Chapter-01-The-Dawn-That-Lied.md](Chapter-01-The-Dawn-That-Lied.md), [INTERLUDES.md](INTERLUDES.md), in the [VOICE-AND-CRAFT.md](VOICE-AND-CRAFT.md) register (dry, dark, asymmetric; withhold; no thematic bows).

### 5.1 World & zones → walkable maps

| Lore location (source) | Becomes | Gating | New walkable scenes needed |
|---|---|---|---|
| **Oppidum**, lake-town at the Road's head (LORE §12) | Reach 1 town + square + lake/commons/hunting edges | start | dawn-Litany square scene; descent into the Hollow |
| **The Hollow**, cave where the broken door leaks (LORE §9e) | Reach 1 dungeon (boss: **Tithe-Eater**) | story (Ch1–2) | cave interior; boss arena |
| **The Greenwood**, feral forest (LORE §12) | Reach 2 overworld | beat Brand (idx 13) | forest paths, rivers; Footsworn camp |
| **The Ruins**, desert dead temple-city (LORE §12, §9g) | Reach 3 overworld + dungeon-city | `RUINS_UNLOCK=23` | dead-city streets; Roderic's arena; the "rest" offer scene |
| **The Hoarmarch**, unnatural frozen borderland (LORE §12) | Reach 4 (new) | past Ruins | ruined **Wendholt**; the **Frozen Ford** (Maelis drowned here) |
| **The Bleeding Mile / Caedmon's Wound** (LORE §9d) | Reach 5 (new), Road's end | past Hoarmarch | blood-warped country; the dead-god remnant; the threshold to the Court |
| **The Elder Road / the Milestone** (LORE §2b) | the Wayward Keep's standing stone = Realm Sync | start | hum-on-approach VFX; humming intensifies for vessels |
| **The Sunless Court** (LORE §2, §7b) | Book Two / future expansion (lv 50–100) | not built now | reserved |

Mood gradient by Reach matches §4.3: Oppidum/Greenwood bright with a *faint dawn chill*; Ruins desaturating; Hoarmarch cold gothic; Bleeding Mile blood-warped wrongness.

### 5.2 Characters → placed NPCs & dialogue hooks

Tone per VOICE-AND-CRAFT "Dialogue." Hooks are seeds, not final lines.

| Character (CHARACTERS.md) | In-world role | Where (walkable) | Dialogue hook (register) |
|---|---|---|---|
| **Maren** (Footsworn innkeeper, grieving Tam) | Inn keeper; first Footsworn contact | Maren's Inn | blunt, tired, brave: *"You defied a god before breakfast and you haven't touched my stew. Sit. Heroes faint the same as anyone."* |
| **Big Doll** | Foundered Horse barkeep | tavern | deadpan: ember "has put bigger men than you on the floor and written to their mothers about it." |
| **Wick & Gorn / Sweet Lyle / Pinch / Captain** | tavern running-gags (stones game, bad bard, known informer, the dog) | tavern | comic chorus; Sweet Lyle sings the Gradus ballad *wrong* (unreliable history as comedy) |
| **Orris the Inkfinger** | letter-writer / master of whispers; ambiguous | corner of the Inn | soft, courteous, deniable: *"Strane. A name I've written more than once, though never for one as poor as you. I'll not charge you for the chair."* |
| **Choirmaster Vane** | first human antagonist; reads the poisoned Litany | Chapel | menace-as-politeness: *"Open that well and you've murdered us all by morning. I am only trying to be kind, child."* |
| **The Vagabond** | guide; son of Aelric; agenda suspect | square edge → recurs | wry, oblique: *"You want to know what you are. Walk with me. I'll ruin it for you slowly."* |
| **Col** (child) / **Hesta** | the saved child who trails the hero; townsfolk | Inn / square | warmth + the flaw seed (Cassian can't refuse him, can't take him on the Road) |
| **Edrin** (baker) + **Wenna** | the Informer beat (coerced by the Choir) | Commons / bakery | the no-clean-answer Ch5 quest |
| **Edra** | first companion; deadpan counterweight | joins at the gate (Ch7) | *"I would sooner kiss the Hound. We're going to get along beautifully."* |
| **Brand the Returned** | Reach-1 gate boss (Hollowed local hero) | end of Oppidum board | the small rehearsal of Roderic; town's hope curdles |
| **Mordric the Iron Hound** | recurring hunter; turns toward you at Ch2's close | off-map → hunts across Reaches | clipped, contemptuous: *"You're the new one. They always run. It changes nothing."* |
| **Roderic, the Broken Strider** | Reach-3 capstone; living mirror of the flaw | the Ruins | gentle, sorrowful despair: *"Sit down. You've come so far. I came farther. Put it down. I'll wait."* |
| The gods (Valdric, Myrren, Aelric, Seraphine; Caelvorn; Caedmon) | class patrons + lore/Account voices | the level-10 calling scene; codex | each aids for their own reason and cost (LORE §14) |

Mechanic hook from lore: **clarity-gated text** — Accounts carrying Maelis's truth are fully legible only to **Maelis vessels**; **Gradus vessels** see them smudged/self-contradictory (LORE §9c). The Library is where this lands.

### 5.3 Story & quests → quest structure

The Oppidum arc (STORY-ARCS Reach 1, Ch1–7) maps onto the existing quest spine + a few new walkable scenes. Main-story beats are the two existing story bosses + scripted scenes; the rest are side/contract/hunt quests already in the game.

| Chapter (STORY-ARCS) | Maps to | Type | New walkable scene? |
|---|---|---|---|
| **Prologue — Brand's last mile** | optional cold-open cutscene (pays off Ch6) | cutscene | yes — a hunted-through-a-beautiful-valley vignette (or defer) |
| **Ch1 The Dawn That Lied** | the **dawn-Litany square scene** + Milestone first-sync (the awakening / loop tutorial) | main story | **yes** — town square gathers; Vane reads; the Vagabond points you to the Keep |
| **Ch2 The Hollow** | **idx 12 Tithe-Eater** boss in the Hollow cave | main story (boss) | yes — cave descent; Tam dies (the flaw, paid in one life) |
| **Ch3 The Marked** | aftermath; Footsworn intro; the **Foundered Horse** warm beat | side + town | reuses tavern; Tam's grave |
| **Ch4 What the Well Fed** | investigate the Choir/tithe machinery | side/contract | mostly dialogue + a hunt |
| **Ch5 The Informer (Edrin)** | the coerced-informer quest, no clean answer | side (choice) | bakery / Commons scene |
| **Ch6 The Returned** | **idx 13 Brand the Returned** gate boss | main story (boss) | yes — Brand walks into Oppidum; the lake mercy-kill |
| **Ch7 The Long Way Out** | leave Oppidum; **Edra** joins at the gate; goodbye to Col | main story | yes — gate departure; Road south opens (existing `FOREST_UNLOCK`) |

Threaded through (per STORY-ARCS per-Reach template): collectible **Accounts** (Library/Inn), one **warm/funny beat** (the tavern, the ember, the running gags), quiet **interlude** glimpses of the dead (cutscene/lore unlocks at milestones). The four **founding interludes** in [INTERLUDES.md](INTERLUDES.md) ("What She Saw," "The Long Way to the Well," "Crossing the Ice," "What She Could Not Mend") become **memory-fragment unlocks** at milestones — short illustrated text scenes, no new mechanics.

Reaches 2–5 follow the same template (STORY-ARCS stubs); the Greenwood (Footsworn form, calling choice at lv10, first Second-Strider rumor) is the natural second arc to build after Oppidum.

---

## 6. Reuse vs. rebuild map

Per the prior plan's keystone refactor (extract logic to ES modules both the app and `game-test.js` import). Deltas from [ENGINE-MIGRATION-PLAN.md §6](ENGINE-MIGRATION-PLAN.md) are noted where the **walkable** model changes the disposition.

| System | Disposition | Why / delta |
|---|---|---|
| Economy (Gradus/Ries, caps, streaks, Forge) | **Reuse as-is** | Pure functions over `S`; guarded by tests. |
| Quest data + combat logic (31 quests, traits, dungeons, drops) | **Reuse as-is** | Data + pure resolution; `m.spr` stays the sprite key. |
| Save format / `freshState` / multi-account | **Reuse as-is** | Hard constraint: do not break `gradus-save-v1-*` saves. |
| Worker sync (`worker.js`, `/push` `/activity` `/save` `/load`) | **Reuse as-is** | Backend independent of frontend engine. |
| `FitnessProvider` interface | **Reuse as-is** | Clean async seam ([index.html:1860](index.html:1860)). |
| Audio (synth chiptune + dorian loop) | **Reuse / adapt** | Engine-agnostic WebAudio; move to a module. |
| `game-test.js` (~70 checks) | **Adapt (loader only)** | Swap the `<script>`-scrape for `import` of modules; **all assertions stay**, green every phase. |
| DOM UI shell (menus, modals, quest board, inventory, settings, shops, Bank, Library, combat panel) | **Adapt** | Port as canvas overlay; reuse structure. *Building interiors stay DOM screens, now opened by a walk-up trigger instead of a hotspot tap.* |
| **Town map** (`town.png` + hotspots) | **Rebuild → walkable** | *New:* tile overworld + grid movement + camera follow + door triggers, replacing the static image. |
| **Overworld / Reaches** | **Build (new layer)** | *New:* the Road as linked walkable zones; Reaches 4–5 are new content. |
| Combat scene (inline SVG `monSprite`/`MON_BUILDERS`) | **Rebuild** | Ortho battle scene; `m.spr` → sprite-atlas lookup (same data). |
| Progressive disclosure (`UNLOCKS`) | **Reuse (re-express)** | Same gates, now "doors opening" in the walkable square. |
| PWA shell (manifest/meta) | **Adapt + upgrade** | Add a Workbox service worker via `vite-plugin-pwa` → true offline (a net gain). |
| Deploy (Pages from root, Worker) | **Adapt** | Pages serves Vite `dist/` (GitHub Action); Worker unchanged. |

---

## 7. Phased migration plan

Principle (your step-by-step style): **every phase ends in something you can open and try, and `node game-test.js` stays green.** Each phase is independently shippable/abandonable; legacy `index.html` keeps working until cutover. No building ahead.

- **Phase 0 — Spike (throwaway).** Standalone Vite + three.js demo: ortho camera, a tiled ground, a **small character you can walk on a grid** with camera-follow, 2–3 buildings with door triggers (log on enter), `RenderPixelatedPass` + dither + a per-Reach palette toggle (bright ↔ gothic). Load a few CC0 Kenney tiles + ansimuz gothic tiles + one 8-dir character. **Open on desktop and your phone**, judge the Pokémon feel, the gradient, and mobile perf. *No game files touched; tests untouched.* Exit: green-light three.js + the walkable model, or fall back.

- **Phase 1 — Logic extraction + test-harness adaptation (no visual change).** Lift economy/quests/combat/state/fitness/audio into ES modules; current `index.html` imports them; rewrite `game-test.js`'s loader to `import` modules, **keeping all ~70 assertions**. End: game plays identically; tests pass from modules. *This is the safety-net milestone.*

- **Phase 2 — Vite scaffold + build/deploy + offline.** Vite project; `vite-plugin-pwa` (Workbox) for manifest + offline SW; import Phase-1 modules; keep the **existing DOM UI** fully playable (no engine yet); Pages serves `dist/` via Action. End: `npm run build` → full game plays, installable **and offline**. Tradeoff made explicit: lose double-click-to-run (recoverable via `vite-plugin-singlefile`); gain modules + real offline.

- **Phase 3 — Walkable Oppidum town with the small-character camera.** Replace `town.png` with the tile square of §3.3: grid movement, camera follow, the twelve buildings as door-triggers that open the **existing DOM interiors**; respect `UNLOCKS` (barred doors for locked buildings). Place a first batch of ambient NPC sprites. End: walk Oppidum's square, enter every building, every screen still works. Tests green (logic untouched).

- **Phase 4 — Port one zone + its NPCs/story from the lore (Oppidum arc).** Add the named NPCs with dialogue hooks (§5.2); script the **Ch1 dawn-Litany scene** + Milestone first-sync, and wire the **Hollow** as a walkable cave to the existing **Tithe-Eater** boss; Accounts in the Library (clarity-gated). End: play the opening beat — wake, feel the lie, sync at the Milestone, go down into the Hollow — in the new look. Tests green; manual story pass.

- **Phase 5 — Port turn-based combat to a battle scene.** Ortho battle scene; billboard hero (class/gender/equipment) vs. billboard monster driven by `m.spr` → atlas lookup (replacing `monSprite`, **same data**); combat panel stays DOM; wire SFX; trait/crit/flee unchanged. Include **Brand the Returned** (gate boss) with its new sprite. End: fight a quest, a dungeon floor, and the gate boss end-to-end. Tests green; `node game-test.js --loop` sanity.

- **Phase 6 — Port save/sync/PWA + finalize, then the Road.** Verify cloud-save round-trip, device pull, leaderboard, old-save load all work through the built engine; finalize custom landmarks/HUD/brand art; tune the per-Reach gradient; add the walkable Greenwood transition (existing `FOREST_UNLOCK`) as the proof the Road model scales. End: coherent walkable Oppidum→Greenwood at parity. Tests green; phone regression; Lighthouse PWA check.

- **Phase 7 — Cutover.** Point Pages at the Vite build as canonical; archive legacy `index.html`; update DESIGN/INTEGRATION/README; bump version + CHANGELOG. End: live URL is the new engine; saves load; sync/cloud/leaderboard work. Tests green; production smoke test.

**Rollback:** Phases 1–2 are behavior-preserving; 3–5 are additive (keep the DOM/`town.png` path behind a flag until confident). The test suite is the through-line.

---

## 8. Open decisions for Rodolfo (need your call before any code)

1. **Build step (Vite)?** The linchpin — modules, green tests, real offline all depend on it. Cost: no double-click-to-run (recoverable). *My rec: yes.*
2. **Walkable Pokémon world vs. a prettier static map?** This task asks for walkable; it costs ~1 extra week (grid movement/collision/warps, no drop-in exists). *My rec: yes, walkable — it's the whole point, and the lore's "retrace Gradus's Road" theme demands it.*
3. **Art: source-and-kitbash (mostly CC0 + ansimuz gothic) vs. commission/AI-generate a bespoke set vs. upscale current SVG sprites?** Sets the budget and how faithfully we hit the Cursemark/Ball x Pit gradient. (Current inline SVG sprites aren't designed as billboard atlases.) *My rec: kitbash CC0 + custom landmarks/monsters/HUD.*
4. **Attribution tolerance?** Strict CC0 (Kenney + ansimuz + CC0 itch + CC0 chiptunes, zero obligations) vs. allow LPC (richer animated characters, but CC-BY-SA share-alike). *My rec: strict CC0 for shippable art; LPC only as reference.*
5. **How faithful to keep turn-based combat?** Reframe-in-place (same math, new ortho battle scene — my rec) vs. a deeper redesign. *My rec: reframe only; the combat data/logic is reused.*
6. **Which zone to prototype first after Oppidum?** *My rec: the Greenwood* (it already exists as content, proves the Road/zone-transition model, and is the natural Reach-2 arc — Footsworn form, calling choice at lv10).
7. **Keep the synthesized chiptune audio?** Free and already works. *My rec: keep synth; add sourced tracks only if desired.*
8. **Deploy mechanism:** GitHub Action → Pages (cleaner) vs. committing `dist/` (simpler). *My rec: Action.*

---

## 9. The single logical next step

**Run Phase 0 — the throwaway walkable spike.** Stand up a standalone Vite + three.js demo where a **small character walks a tile grid with a follow-camera**, a couple of buildings open on a door-trigger, and a one-key toggle flips the post-stack between the **bright (Ball x Pit) and gothic (Cursemark) palettes** at a low-res target. Open it on desktop **and** your phone. That single afternoon turns Open Decisions #1–#3 from theory into an evidence-based call — does the Pokémon feel land, does the gradient read, is mobile perf fine — and it touches no game files, so the current Gradus and `node game-test.js` stay exactly as they are.

After your decisions, **Phase 1 (logic extraction + test-harness adaptation)** is the safe, behavior-preserving refactor everything else builds on.
