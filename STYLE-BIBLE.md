# Gradus — Style Bible

*The single source of truth for the look of the top-down 2D pixel-art Gradus.
Every tile, sprite, building, and Grok generation is matched to this document.
If a rule here and a rule in another doc disagree, this one wins for **art**;
[`PROMPTS-2d-pixel-setup-and-art.md`](PROMPTS-2d-pixel-setup-and-art.md) wins for
**engine/build**, and they are written to agree.*

**Companions:** subject/colour vocabulary is pulled from
[`IMAGE_PROMPTS.md`](IMAGE_PROMPTS.md) (the building roster, NPC descriptions,
monster palettes, per-room light colours). Mood is pulled from
[`THE-BOOK-OF-GRADUS.md`](THE-BOOK-OF-GRADUS.md). Asset foldering, naming, and
the per-asset checklist live in `ASSETS.md` (to be written). The live Phase-0
values quoted below are real: they come from
[`game2d/src/scenes/TownScene.js`](game2d/src/scenes/TownScene.js) and
[`game2d/tools/gen-assets.cjs`](game2d/tools/gen-assets.cjs).

---

## 0. The look in one paragraph

A small, lantern-carrying figure on a cobbled square at dusk. The world is
rendered in crisp 16-bit JRPG pixels at a ¾ overhead angle — the *Zelda: A Link
to the Past / Stardew Valley / Cursemark* family — viewed through a
small-character camera so a generous world sits around the hero. A near-black
veil frames everything; the only light that matters is **warm and local**: torch
pools, a forge's red spill, a brazier in the square, the hero's own lantern.
Pixels are chunky and nearest-neighbour — **never** blurred, anti-aliased, or
soft-shadowed. The mood is oppressive dark pierced by warmth you have to stand
near. That warmth is the whole emotional promise of the game: *a man walking the
dark with a small light, refusing to stop.*

---

## 1. The governing mood rule — **the gradient**

From [`THE-BOOK-OF-GRADUS.md`](THE-BOOK-OF-GRADUS.md) §Six: *"it is beautiful out
there… you are not watching a ruin die, you are watching a paradise… the country
itself tells you how close you are by how little of its beauty is left."*

> **Beauty is the default; blight is the contrast.**

- **Oppidum and the early Road** are the **gentlest, prettiest** places — warmer,
  more saturated, more ambient light, the veil pulled back. The dark+torch
  signature is present but *kind*: a soft blue dusk, not a crypt.
- The look **desaturates and turns gothic** the nearer you walk to the **Bleeding
  Mile** — colder tint, deeper veil, the warm pools smaller and more precious.
- **Never grey-filter the whole map.** Drive the gradient with three engine knobs
  per Reach — **veil alpha, colour grade (warm→cold), and fog** — *not* with new,
  darker art. The same tiles are reused; the lighting tells you where you are.

This rule resolves the apparent tension between "match the dark reference" and
"Oppidum is the pretty place": **dark + warm torch is the framing signature
everywhere; the *degree* of darkness is the per-Reach dial, and Oppidum sits at
its warmest end.**

---

## 2. Master palette (hex)

A limited, cohesive palette. Sprites stay near **~16 colours each**; the whole
world reads from the ramps below. Values marked **[live]** are the exact colours
already shipping in the Phase-0 procedural art and lighting; values marked
**[author]** are the sanctioned extensions for the accents the lore calls for —
add them to the Lospec/LibreSprite master `.gpl` before generating assets.

### 2.1 Darkness & stone (the world frame and masonry)

| Hex | Name | Use | |
|------|------|-----|---|
| `#05050B` | Void | the darkness veil; off-map; pure shadow | **[live]** |
| `#0B0E17` | Pitch | deep shadow, night sky base | [author] |
| `#14182A` | Deep slate | cast shadow on lit stone, indigo night | [author] |
| `#282522` | Wall grout | mortar lines, deepest stone crevice | **[live]** |
| `#3A352F` | Cobble grout | gaps between flagstones | **[live]** |
| `#5C5852` | Wall stone | castle / keep / wall faces | **[live]** |
| `#6E655A` | Cobble stone | the square, paved floors | **[live]** |
| `#807769` | Stone highlight | top-lit edges of masonry | [author] |

### 2.2 Earth, wood & leather (the warm neutrals)

| Hex | Name | Use | |
|------|------|-----|---|
| `#3C291A` | Plank seam | timber joints, dark wood | **[live]** |
| `#5B3F28` | Timber | wood floors, beams, barrels, signposts | **[live]** |
| `#6A4F34` | Dirt road | the Road, paths, churned mud | **[live]** |
| `#8A6B45` | Worn wood | highlight on timber, dry earth | [author] |
| `#261E1A` | Boot leather | boots, straps, dark leather | **[live]** |
| `#C9A886` | Skin (warm) | faces, hands (mid tone) | **[live]** |

### 2.3 Foliage & water (the living world)

| Hex | Name | Use | |
|------|------|-----|---|
| `#2A4A2C` | Dark grass | shaded turf, map-edge framing, Greenwood floor | **[live]** |
| `#3F6B3A` | Grass | the default ground | **[live]** |
| `#5C8A54` | Grass tuft | sunlit tufts, leaf highlights | **[live]** |
| `#234B5E` | Lake water | the lake, ponds, deep water | **[live]** |
| `#78AAB9` | Water glint | reflections, surface shimmer | **[live]** |

### 2.4 Hero & cloth

| Hex | Name | Use | |
|------|------|-----|---|
| `#201C28` | Cloak shadow | folds, hood interior | **[live]** |
| `#2C2634` | Cloak | the wanderer's cloak (base hero) | **[live]** |

### 2.5 Warm light (torch / forge / candle — the emotional colour)

| Hex | Name | Use | |
|------|------|-----|---|
| `#FFE6B0` | Candle pale | chapel candle, library reading-light core | [author] |
| `#FFC278` | Torch core | centre of every warm glow pool | **[live]** |
| `#FFC478` | Lantern | the hero's carried light | **[live]** |
| `#FF9444` | Torch mid | mid-falloff of the glow | **[live]** |
| `#FF7832` | Torch edge | outer falloff (fades to 0 alpha) | **[live]** |
| `#C8410F` | Forge red | the blacksmith's forge spill, embers | [author] |

### 2.6 Cool light & accents (moon, rune, potion, danger, coin)

| Hex | Name | Use | |
|------|------|-----|---|
| `#C8D6E8` | Moon silver | moonlight, the First Wanderer, snow | [author] |
| `#5A8FD0` | Cold blue | Restless Knight eye-glow, undead light | [author] |
| `#A6F0EA` | Rune cyan | the Strider's Blade glow, awakened-vessel sigils | [author] |
| `#2E6F78` | Rune deep | falloff of cyan rune light | [author] |
| `#6FE08F` | Apothecary green | potion glow, poison, Treant sap | [author] |
| `#7A4FB0` | Arcane purple | mage energy, cultist mark, Webweaver chitin | [author] |
| `#9E2B2B` | Blood red | danger, the Bleeding Mile, health-low UI | [author] |
| `#C9A24B` | Gradus gold | the coin, gold trim, the Bank | [author] |
| `#E8C870` | Gold highlight | coin face, lit gold, victory light | [author] |
| `#F0902E` | Ries amber | the energy currency, the streak flame | [author] |

**Per-establishment light colour** (the in-world signatures from
[`IMAGE_PROMPTS.md`](IMAGE_PROMPTS.md) — these tint the *glow pool*, not just the
sprite): Tavern/Inn → torch warm `#FFC278`; Blacksmith → forge red `#C8410F`;
Apothecary → green `#6FE08F` + purple `#7A4FB0`; Chapel → candle pale `#FFE6B0`
through coloured-glass accents; Library → warm candle, dimmer; Bank → gold
`#C9A24B` over cold stone; Graveyard/undead → cold blue `#5A8FD0`.

---

## 3. Tile size & scale

| Spec | Value | Source |
|------|-------|--------|
| **Tile size** | **16 × 16 px** | `gen-assets.cjs` `T = 16`; matches CC0 packs |
| Scaling filter | **nearest-neighbour** (`pixelArt: true`) — no blur, ever | Phaser config |
| Camera zoom | **integer only**, clamped **2×–6×**, target **~3×** | `TownScene.frameCamera()` |
| Framing | **~13 tiles across the shorter screen edge** | `SHORT_SIDE_TILES = 13` |
| Map orientation | **orthogonal**, render order right-down | `oppidum.tmj` |

- **16 px, not 32 px.** Decision is locked: 16 px matches "16-bit JRPG," keeps the
  bundle lean for the mobile-first PWA, and matches every named CC0 pack. Detail
  comes from *painted shading inside the tile*, not from more pixels — see the
  spike lesson in [`spike/WORKLOG.md`](spike/WORKLOG.md): *"detail lives in the
  tiles, not in uniform post-noise."*
- Zoom is **always an integer** so a source pixel maps to an exact square of
  screen pixels. On a typical phone short edge (~720–820 CSS px) this lands on 3×;
  the clamp keeps tablets/desktops at 4–6× without ever going fractional.
- The world may extend past the screen — there is **no camera bounds clamp**;
  off-map is the same `#05050B` void, so the lit area stays dead-centre on every
  aspect ratio.

---

## 4. Hero-sprite-to-screen ratio

| Spec | Value |
|------|-------|
| Hero cell | **16 × 24 px** (1 tile wide × 1.5 tiles tall) — `buildHero()` |
| Origin | **feet-anchored**, `setOrigin(0.5, 1)` — the sprite stands *on* the tile |
| On-screen height | **~1/13 of the short edge** (≈ 8–10 % of screen height) at 3× |
| NPCs | same 16 px footprint; 16×16 to 16×24 by build; same feet anchor |
| Monsters | scale to threat: rats ~16×16, bosses up to ~48×64 (3×4 tiles) |

The hero is **deliberately small** — "Pokémon-scale," per the spike target. The
generous world around them *is* the point: it makes the dark feel large and the
light pools feel earned. Do not enlarge the hero to show off detail; legibility
at this size is the constraint every hero/NPC sprite must pass.

---

## 5. Lighting rules

Lighting is the single most important style element and the cheapest mood dial.

### 5.1 How it works (locked Phase-0 approach)

**Additive radial glow sprites + a darkness render-texture** whose pools are
"punched" open with `ERASE`. **Not** Phaser Light2D / normal maps — CC0 packs
don't ship normal maps, and additive glow is cheaper on mobile and reads exactly
like the reference. Light positions are **authored** in the Tiled map's `lights`
object layer, never hard-coded. See
[`game2d/src/scenes/TownScene.js`](game2d/src/scenes/TownScene.js).

Two pre-built radial textures keep it renderer-agnostic (WebGL **and** Canvas2D):
a white `lightmask` (ERASE-reveals the world) and a pre-warmed `glow` (ADD warmth,
no runtime tint).

### 5.2 Ambient darkness (the veil)

- Colour: **`#05050B`** (Void) — a near-black with a faint cold-blue cast.
- Alpha sets the Reach mood. **Drive the gradient here:**

  | Register | Veil alpha | Feel |
  |----------|-----------|------|
  | **Oppidum / early Road** | **~0.82** | gentle blue dusk, world readable |
  | Mid-Road | ~0.88 | night closing in |
  | Ruins / Hoarmarch / Bleeding Mile | **~0.94** | crypt-black, light is precious |

  *(Phase-0 ships `0.93` as a single deep-night value while only the start square
  exists; split it into the per-Reach table above as zones come online.)*

### 5.3 Light pools (per source)

Tuned so overlapping pools **warm** the scene instead of blowing to white. Keep
warm-core radius well under the reveal radius and alphas low.

| Kind | Reveal (px) | Warm core (px) | Alpha | Notes |
|------|-------------|----------------|-------|-------|
| `torch` | 50 | 30 | 0.50 | wall torches, signpost lamps |
| `brazier` | 92 | 54 | 0.60 | the square's centrepiece fire |
| `lantern` | 60 | 34 | 0.52 | the **hero's carried light** — follows them |

- **Warm glow ramp** (the `glow` texture): core `#FFC278` α.62 → mid `#FF9444`
  α.30 → edge `#FF7832` α.0. This amber is the default. For coloured sources
  (forge red, apothecary green/purple, chapel candle, rune cyan) author a tinted
  glow texture per §2.6 — *tint the pool, not just the prop.*
- **Flicker:** done on the *light*, not the sprite — a yoyo tween on glow alpha
  (~×0.72) and scale (~×0.92) over 0.85–1.35 s. **Deterministic only** — vary by
  position (`l.x*13 + l.y*7`), **never** `Math.random()` (it breaks determinism
  and the spike's byte-stable regen).

### 5.4 Lighting do / don't

- **Do** make every light *local and motivated* — there is an object in the world
  making it (torch, forge, candle, lantern, rune).
- **Do** let the hero's lantern be the one light that moves. Walking into the dark
  with your own pool is the iconic beat.
- **Don't** add a global "fill" light or lift the ambient to read a sprite — if
  something must be seen, put a *motivated* light near it.
- **Don't** paint large bloom halos *into* the Grok art (§8). The engine adds the
  pool; a baked halo will double up and smear. Small **self-lit** details (a lit
  window, glowing forge mouth, a rune line) are fine and encouraged.

---

## 6. Perspective & angle rules (buildings and props)

The whole world is **¾ top-down overhead** — the ALttP/Stardew angle. This
**supersedes** the "isometric town overview" phrasing in
[`IMAGE_PROMPTS.md`](IMAGE_PROMPTS.md) §1 *for in-world game assets*; that doc's
*subject and colour* vocabulary still stands, only its camera angle is replaced.

**The flat-vs-standing rule:**

- **Flat things lie in the ground plane** and are drawn true top-down: paths,
  cobbles, water, grass, interior floors. These are the tile layers.
- **Standing things rise toward the camera** and show a face: buildings, walls,
  trees, people, signposts, braziers. These are billboards/props placed on the
  ground plane, sorted by their **base Y** (depth = where the feet/footprint meet
  the ground).

**Building convention:**

- A building shows its **front facade + door + a shallow, foreshortened roof** —
  you see the front and a little of the top, the classic ¾ "you can tell it's a
  3D thing but it's drawn flat" look. **Never** a pure bird's-eye roof-only plan,
  and **never** a true side or back.
- **Doors face *down* (south, toward the camera).** Entry is always from the
  front. The door tile is the trigger/collision footprint.
- **One consistent angle for every building** — all roofs tilt away by the same
  shallow amount; light falls from **above and slightly front**. No per-building
  vanishing points; this is flat/axonometric, **no true perspective convergence**.
- **Footprint = collision.** The base where the building meets the ground is its
  walkable footprint (in tiles); the roof may overhang upward (drawn) but does not
  add collision.

**Rough footprints** (tiles, for scale consistency — a building beside a 16 px
tile must share pixel density): cottage/shop **3–4 w × 3–4 tall**; Tavern/Inn
**5–6 w**; the **Keep** is the landmark — taller tower, **6+ w**, with the gold
coin emblem above the gate (the reference's signature).

---

## 7. Animation frame conventions

Pixel motion is minimal and readable — a few good frames, not many soft ones.

| Subject | Frames | Rate | Notes |
|---------|--------|------|-------|
| Hero/NPC **walk** | 4 per direction (contact-L, pass, contact-R, pass) | ~8 fps (125 ms) | ping-pong is fine |
| Hero/NPC **idle** | 1–2 (a slow "breathe" bob) | ~2 fps | optional |
| Facing | **4-direction**: down / up / right (mirror for left) | — | sheet rows = directions |
| **Fire sprite** (torch/brazier flame) | 2–4 | ~6–8 fps | the *light* flickers separately (§5.3) |
| **Water** shimmer | 2–3 | ~3 fps | subtle; glints drift, don't strobe |
| **Rune / magic** pulse | 2–4 | slow | pairs with a tinted light pulse |
| **Coin / pickup** spin/shine | 4 | ~8 fps | for loot drops |

- **Spritesheet layout:** rows = direction (down, up, right), columns = frames.
  Left is the mirrored right row (saves art and guarantees symmetry).
- **Cell size fixed per sheet** (e.g. 16×24 hero, 16×16 NPC) with a **1 px
  transparent margin**; feet anchored to the cell bottom so the figure never
  "floats" when the engine sorts by base Y.
- **No tweened/interpolated frames.** Animation is discrete pixel frames only.
  Smooth motion (camera follow, glow flicker) is engine tweening on *position and
  alpha*, never on the sprite's pixels.
- **Contact shadow:** a small soft-edged dark ellipse under every standing
  billboard grounds it (per the spike's pass F). It is a separate sprite, drawn
  below the figure — *not* anti-aliasing on the figure itself.

---

## 8. CC0 tileset standard & matching Grok pieces

### 8.1 Division of labour

- **Tilesets (repeating ground/terrain/path/water/wall) → CC0 pack.** Grok cannot
  produce seamless, Wang-tileable terrain. These are the tile layers in Tiled.
- **Hero pieces (landmark buildings, NPC/monster sprites, item icons, class
  portraits, title/UI art) → Grok**, then matched to the tileset (§8.3). These are
  the unique, authored billboards and icons.

### 8.2 The standardised pack

> **Standardise on the *Ninja Adventure Pack* (Pixel-Boy & AAA) — CC0, 16 px — as
> the base tileset**, supplemented by **Kenney** (Roguelike/RPG, Tiny Town — CC0,
> 16 px) for clean medieval terrain/prop gaps, and **ansimuz GothicVania**
> (Patreon Collection — CC0) reserved for the **dark-Reach** gothic tiles
> (Ruins → Bleeding Mile) later.

**Why this set, and why not the others the plans floated:**

- It is **genuinely CC0** and **16 px** — matching our engine and the
  zero-attribution mandate. The team was already burned once: **LPC is CC-BY-SA /
  GPL share-alike** (see [`spike/WORKLOG.md`](spike/WORKLOG.md) Phase 5) — it is
  **reference-only** unless we commit to honouring share-alike. **Mana Seed is a
  paid/commercial licence (not CC0)** and **Tiny Swords (Pixel Frog) is not CC0**
  in its current version — **both are excluded.** **Cute Fantasy RPG** is free but
  not strict CC0 — not the standard.
- Ninja Adventure is **comprehensive** (terrain + characters + monsters + items +
  UI + audio, all 16 px) so most repeating-tile needs come from one coherent
  source. Its clean JRPG terrain is the right base because **our engine supplies
  the dark mood at runtime** (§5) — we want a *clean, warm-capable* base tileset
  and let the veil + per-Reach grade do the gothic, exactly per the §1 rule
  *"never grey-filter the art; drive mood with lighting."*
- **Every added asset is recorded in `public/assets/CREDITS.txt` with its source
  URL and licence *before* use.** Strict CC0/permissive only.

**Authoring tools (free/OSS):** **Tiled** (maps), **LibreSprite** (GPLv2,
free Aseprite fork — sprite/tile edits + palette mapping), **Lospec** (export the
§2 master palette to a `.gpl`).

### 8.3 How Grok-generated pieces must be matched to the tileset

A Grok piece is not done until it passes this checklist. Workflow:

1. **Prompt for the right angle & framing.** Prepend the reusable preamble from
   [`PROMPTS-2d-pixel-setup-and-art.md`](PROMPTS-2d-pixel-setup-and-art.md) §2:
   *`top-down 2D pixel art, 16-bit SNES JRPG style, 3/4 overhead view, single
   subject centered on a plain transparent or flat dark background, warm
   torchlight glow, dark night ambiance, crisp nearest-neighbor no blur, in the
   style of Stardew Valley and Zelda A Link to the Past`*. For buildings always
   include **`3/4 overhead view`** and **door facing front** (§6). Generate 4
   variants; pick the one whose **angle and pixel scale** match the tileset.
2. **Resolve down to the grid.** Treat the art at **1 source pixel = 1 game
   pixel** at 16 px. If Grok gives a larger image, **downscale nearest-neighbour**
   to the target tile-multiple size (e.g. a 4-tile-wide shop → 64 px wide). The
   on-screen pixel must be the **same physical size** as a tile pixel — hold a
   tileset tile beside it and check the grain matches.
3. **Quantise to the master palette.** Map the image to the §2 `.gpl` in
   LibreSprite (*Convert to indexed → map to palette*). Strip Grok's gradients,
   blur, and anti-aliasing. Aim for **~16 colours**; clean stray off-palette
   pixels by hand.
4. **Hard edges only.** Solid **1 px outline** (or selective dark-line "selout"),
   **no anti-aliased fringe, no soft drop shadow** baked in (the engine adds the
   contact shadow, §7).
5. **Bake minimal, motivated shading; leave the glow to the engine.** Light from
   **above-front** (§6). Small **self-lit** windows/forge/runes are good; **do not
   paint large coloured bloom halos** — the engine's additive pool supplies those
   (§5.4).
6. **Transparent background, single subject, base-aligned.** Cut the background
   cleanly; centre the subject; align its **feet/footprint to the cell bottom** so
   depth-sorting works.
7. **Scale-check against the footprint table** (§6) and **record provenance** —
   "Grok-generated, original, CC0-equivalent for our use" — in
   `public/assets/CREDITS.txt`, alongside the tile-multiple size.

---

## 9. Do / Don't (quick reference)

**Do**

- Keep pixels **crisp, chunky, nearest-neighbour**; integer zoom only.
- Make the world **dark and the light local and warm** — torches, forge, lantern.
- Put **detail in the tiles** (painted shading), not in post-noise.
- Keep Oppidum **gentle and warm**; reserve the cold/gothic for the deep Road.
- Anchor every standing sprite **at the feet**; sort by base Y.
- Match every Grok piece to the **16 px grid + master palette + ¾ angle** (§8.3).
- Track **CC0 licence + source** for every borrowed asset before use.
- Animate with **few discrete frames**; tween only light/position.

**Don't**

- ❌ Blur, anti-alias, soft-shadow, or fractional-scale the pixels.
- ❌ Use a **global/fill light** or lift ambient to "see better."
- ❌ Paint **bloom halos** into Grok art (the engine adds them).
- ❌ Apply a flat **grey filter** over a whole map to make it "dark/gothic."
- ❌ Draw buildings **roof-only (true bird's-eye)** or showing a **side/back**, or
  with doors facing any way but **down**.
- ❌ Mix tile **pixel densities** (a 32 px-grain sprite beside 16 px tiles).
- ❌ Use **non-CC0** art in shippable builds (no LPC/Mana Seed/Tiny Swords/Cute
  Fantasy as the standard; LPC reference-only).
- ❌ Use `Math.random()` in any generative/flicker code — **deterministic only**.
- ❌ Enlarge the hero to show off detail — small hero, big world is the signature.

---

*Living document — update as zones, the per-Reach gradient, and the asset library
grow. Last grounded against the Phase-0 `game2d/` build (16 px tiles, ~3× integer
zoom, 16×24 feet-anchored hero, `#05050B` veil + amber additive glow).*
