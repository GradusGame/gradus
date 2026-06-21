# LOGIC-EXTRACTION-PLAN.md

**Goal.** Pull the framework-agnostic game logic out of the single-file SVG/DOM game
(`index.html`) into plain ES modules that the new Phaser scenes (`game2d/`) can
`import` unchanged — **without ever turning `node game-test.js` red.**

**Status:** Plan only. No code in this document. Baseline to hold:
`node game-test.js` → **69 / 70 pass · 0 failed · 1 pre-existing Upgrades warning.**

---

## 1. The one constraint that shapes everything

`game-test.js` is the oracle, and it consumes logic in a very specific way
([game-test.js:21](game-test.js:21)–[135](game-test.js:135)):

1. It reads `index.html`, scrapes **every inline `<script>` that has no `src`**,
   concatenates the bodies, and runs them as **one plain (sloppy-mode) script**
   inside a Node `vm` sandbox.
2. It appends `EXPOSE_SNIPPET` ([game-test.js:98](game-test.js:98)), which reads
   logic by **bare top-level identifier**:
   `VERSION, BACK_DAYS, DAILY_STEP_GOAL, STRETCH_STEP_GOAL, STEP_CAP, CAL_CAP,
   WEAPONS, ARMOR, SHIELDS, HELMS, PANTS, QUESTS, CLASSES, applyCaps,
   localDateStr, lastNDays, fmt, xpForNext, streakMult, creditDay, streakDays,
   save` — plus `S` / `currentEmail` via the injected `getS` / `setS`.
3. The sandbox stubs `document`, `localStorage`, `Audio`, `AudioContext`, `URL`,
   `Blob`, timers and `console`. It does **not** provide `crypto`, `fetch`, or
   `TextEncoder`.

Two consequences that the whole plan is built around:

- **`import` / `export` syntax is fatal here.** The vm runs the concatenated
  blob as a *script*, not a *module*; an `import`/`export` token throws
  `SyntaxError` and every test fails at load. **No module syntax may reach the
  inline `<script>` that the test reads.**
- **Symbols must remain bare top-level declarations** (`const` / `let` /
  `function`) in one shared scope. Anything that wraps the logic in an IIFE,
  closure, or bundler namespace hides it from `EXPOSE_SNIPPET` → tests fail.

So we have one body of logic with **two consumers that disagree on syntax**:

| Consumer | Wants |
|---|---|
| Phaser / Vite (`game2d/`) | real ESM `import { creditDay } from '…/economy.js'` |
| `game-test.js` (+ the browser `index.html`) | bare top-level declarations, no `import`/`export` |

---

## 2. Recommended strategy — author as modules, *generate* the inline blob

**Single source of truth = the ES modules.** `index.html`'s logic `<script>`
becomes a **generated artifact**, not hand-edited code.

```
game2d/src/logic/*.js      ← hand-authored ES modules (the source of truth)
        │
        ├──> Phaser scenes `import` them directly (Vite bundles normally)
        │
        └──> tools/build-inline-logic.js  (a ~40-line concatenator)
                 │  • inlines modules in dependency (topological) order
                 │  • strips `import …` lines and `export ` keywords
                 │  • writes the result between markers in index.html:
                 │      // <BUILD:logic START> … // <BUILD:logic END>
                 ▼
        index.html  (logic block = bare top-level decls → test + browser happy)
```

Why this works:

- The generator removes only `import` lines and the `export ` keyword. What's
  left is exactly what lives in `index.html` today: plain `const` / `function`
  declarations in one scope. `EXPOSE_SNIPPET` still finds every symbol; the
  browser still runs it; **`game-test.js` keeps reading `index.html` and stays
  green, untouched.**
- Phaser imports the *real* modules — "import unchanged," as required.
- The test is the contract: after each regeneration the blob must be
  behaviour-identical, proven by `node game-test.js` staying at 69/70.

**Authoring rule for logic modules:** plain top-level declarations + a single
trailing `export { … }`. Cross-module references use `import` at the top; both
the import lines and the export block are stripped at generate time, and because
every module lands in the same concatenated scope, the references resolve as
they do today.

**Alternatives considered (and why not):**

- *Point the test at the modules instead of `index.html`.* Allowed by the
  letter of "keep it green," but it deletes the safety property the project
  relies on ("anything outside `index.html` can't break the test"). Keep as an
  **optional final hardening step** (§6, step 9), not the mechanism.
- *Bundle to an IIFE / UMD.* Hides symbols from `EXPOSE_SNIPPET`; would force a
  rewrite of the harness. Rejected.
- *`<script type="module" src="…">` in `index.html`.* The scraper only reads
  *inline, non-`src`* scripts, so module-`src` logic is invisible to the test →
  instant red. Rejected.

---

## 3. What is logic vs. what stays presentation

The dividing line is **not** "pure function vs. impure." It is **"does it touch
the DOM / SVG / Web Audio?"** Functions that only read & mutate the shared state
object `S` (no `document`, no `innerHTML`) are logic and move out. Everything
that renders stays and gets **reimplemented by Phaser scenes** — never imported.

### Moves out (framework-agnostic logic)
- Config constants & unlock rules
- Pure data tables (items, quests, world, drops, progression, flavor)
- Time / formatting / math helpers
- Economy & retention (caps, crediting, streaks)
- Combat & progression math (operate on `S`, return numbers/outcomes)
- Durability, quest gating, crafting eligibility
- `FitnessProvider` interface
- Save / load / migrate, accounts, cloud sync (behind injected adapters)

### Stays in the presentation shell (NOT extracted — Phaser reimplements)
- `$`, `toast`, `blog`, `showModal`, `showScreen`, `renderHUD`, and all
  `render*` functions (66 `innerHTML` sites, 176 `$()`/`getElementById` sites).
- SVG sprite/icon builders: `pix`, `PIX`, `heroSpriteSVG`, `monSprite`,
  `MON_BUILDERS`, `ICONS`, `SPR_*` colours
  ([index.html:1089](index.html:1089)–[1297](index.html:1297),
  [index.html:3828](index.html:3828)).
- Sound/music: `sfx`, `MELODY`, `MUSIC`, `mnote`, `startMusic`, Web-Audio code.
- DOM event wiring, clock, screen-lock UI.

### The seam inside mixed functions
Several functions mutate `S` **and** drive UI in one body — e.g. `gainXP`
([index.html:3982](index.html:3982)) mutates XP/level then calls `toast`, `sfx`,
`renderStats`; `chooseClass`, `syncDay`, `spendStat`, `doRoom` follow the same
pattern. The codebase already shows the correct split:
**`creditDay` is pure (mutates `S`, returns an outcome object); `syncDay` is the
DOM wrapper that reacts** ([index.html:2907](index.html:2907) vs
[index.html:2925](index.html:2925)). Replicate that everywhere logic is moved:
the **logic core returns an outcome** (e.g. `{ leveled, newLevel, gained }`); the
**presentation shell does the `toast`/`sfx`/`render`.** Only split the functions
the migration actually needs; leave the rest until Phaser needs them.

---

## 4. Module decomposition & public interfaces

Target directory: **`game2d/src/logic/`** (sits beside `src/scenes/`,
`src/main.js`; Vite + `"type": "module"` already in place per
[game2d/package.json](game2d/package.json)).

Dependency order is top-to-bottom; later modules import earlier ones. This is
also the topological order the generator inlines them in.

### 4.1 `config.js` — constants & unlock rules
No dependencies. **Exports:** `VERSION, STEP_CAP, CAL_CAP, BACK_DAYS,
DAILY_STEP_GOAL, STRETCH_STEP_GOAL, RIES_DIVISOR, RIES_CAP, QUESTS_PER_DAY,
FOREST_UNLOCK, RUINS_UNLOCK, DUR_MAX, SAVE_KEY_PREFIX, ACCT_KEY, LEGACY_KEY,
DEFAULT_BACKEND, UNLOCKS`.
Source: [index.html:1019](index.html:1019),
[1306](index.html:1306)–[1314](index.html:1314),
[996](index.html:996), [1086](index.html:1086).
*Test surface:* `STEP_CAP, CAL_CAP, BACK_DAYS, DAILY_STEP_GOAL,
STRETCH_STEP_GOAL, VERSION` are read directly by `EXPOSE_SNIPPET`.

### 4.2 `pricing.js` — tiny pure helpers used *inside* the data literals
**Exports:** `prices(g) → {g, r}`, `defPrices(g) → {g, r}`, `wtype(w) → string`.
Source: [index.html:1317](index.html:1317), [1343](index.html:1343),
[1365](index.html:1365). Must be inlined **before** the item tables — the
`WEAPONS` literal spreads `...prices(7000)` at definition time.

### 4.3 `data/items.js` — gear & consumable catalogs
Deps: `config`, `pricing`. **Exports:** `WEAPONS, ARMOR, SHIELDS, HELMS, GLOVES,
BOOTS, PANTS, POTIONS, JUNK, BACKPACKS, AFFINITY`.
Source: [index.html:1319](index.html:1319)–[1474](index.html:1474).
*Test surface:* `WEAPONS, ARMOR, SHIELDS, HELMS, PANTS` (counts, ids, prices,
per-type progression, `def`/`atk` presence).
> Catalogs carry presentation hints (`emoji`, `icon`, `spr:[…]`). Those are
> engine-agnostic strings — **keep them in the data;** Phaser decides how to draw.

### 4.4 `data/drops.js` — loot tables
Deps: none (id strings only). **Exports:** `JUNK_DROPS, WEAPON_DROPS, MOB_DROPS,
MATS`. Source: [index.html:1415](index.html:1415),
[1448](index.html:1448), [3552](index.html:3552), [3554](index.html:3554).

### 4.5 `data/quests.js` — quests, rumors, lore
Deps: `config`. **Exports:** `QUESTS, RUMORS, RUMOR_BY_QUEST, CHAPEL_QUESTS,
LORE_CHATS`. `RUMOR_BY_QUEST` is a derived map built at module load
([index.html:1854](index.html:1854)). Source:
[index.html:1550](index.html:1550)–[1745](index.html:1745),
[3498](index.html:3498). *Test surface:* `QUESTS` (unique `.id`, names, `xp`,
level gaps).

### 4.6 `data/world.js` — places, NPCs, encounters
Deps: `pricing`. **Exports:** `DUNGEONS, GRIND_ZONES, EXPED_TYPES, SHOPS,
SHOP_VENDORS, TOWN_NPCS, INNFOLK, TOWN_HOTSPOTS, RARE_MOBS, ACHS`.
Source: [index.html:1474](index.html:1474), [1746](index.html:1746),
[1788](index.html:1788), [2491](index.html:2491), [2767](index.html:2767),
[2993](index.html:2993), [3471](index.html:3471), [3488](index.html:3488),
[4185](index.html:4185).

### 4.7 `data/progression.js` — classes, abilities, recipes
Deps: none. **Exports:** `CLASSES, ABILITIES, RECIPES, STAT_DESC`.
Source: [index.html:4557](index.html:4557), [3667](index.html:3667),
[3746](index.html:3746). *Test surface:* `CLASSES` (count).
> `AFFINITY` lives with `data/items.js` (4.3) because `heroATK` pairs it with
> weapon `type`; keep the two together to avoid a back-edge.

### 4.8 `data/flavor.js` — non-mechanical text
Deps: none. **Exports:** `EVENTS, DAILY_QUIPS, TAVERN_SCENES, PATCHNOTES,
DEATH_QUOTES`. Source: [index.html:1022](index.html:1022)–[1086](index.html:1086),
[2724](index.html:2724). Pure data the UI reads; no mechanics.

### 4.9 `time.js` — date helpers
Deps: none. **Exports:** `localDateStr(d) → 'YYYY-MM-DD'`, `lastNDays(n) →
string[]`, `dayLabel(dateStr, idx) → string`, `addDays(dateStr, n) → string`.
Source: [index.html:2294](index.html:2294)–[2311](index.html:2311),
[3405](index.html:3405). *Test surface:* `localDateStr, lastNDays`.

### 4.10 `format.js` — number formatting
Deps: none. **Exports:** `fmt(n) → string`. Source:
[index.html:2293](index.html:2293). *Test surface:* `fmt`.
> Do **not** move `$` here — it's `document.getElementById` (presentation).

### 4.11 `state.js` — the shared mutable singleton + factory
Deps: `config`. **Exports:** the live `S` binding plus `getS()`, `setS(v)`,
`currentEmail` accessors, and `freshState(name) → newSaveObject`.
Source: [index.html:1905](index.html:1905), [1947](index.html:1947).

> **Critical compatibility note.** Nearly all logic reads/writes the ambient
> global `S` (588 references) and `currentEmail` (12). `EXPOSE_SNIPPET`'s
> `setS` assigns *both*. Keep `S` a **single live binding** owned by this one
> module — do **not** thread state through every function signature in this
> pass. A `(state, …)` pure-function refactor is a *separate, later* effort
> (§7); attempting it now would 3,000-line-churn the file and break the
> harness's `getS`/`setS` contract. The generator keeps `S` as one `let S` in
> the shared scope; Phaser gets one module singleton via `state.js`. Same object,
> two entry points.

### 4.12 `economy.js` — caps, crediting, streaks
Deps: `config`, `state`, `time`. **Exports:**
- `applyCaps(steps, calories) → { steps, calories }` — clamp to caps, floor,
  NaN/negative → 0. *Pure.* ([index.html:2899](index.html:2899))
- `creditDay(date, rawSteps, rawCals) → outcome | null` — caps + streak mult +
  threshold bonuses; mutates `S` wallets/`syncLog`; returns
  `{ g, ri, mult, bonusG, bonusR, capped }` or `null` (duplicate date / empty).
  *No DOM.* ([index.html:2907](index.html:2907))
- `streakDays() → int`, `streakMult() → float`, `dailyBonusIdx() → int`,
  `gainRies(n)`. ([index.html:2369](index.html:2369)–[2392](index.html:2392),
  [1020](index.html:1020))
*Test surface:* all of `applyCaps`, `creditDay`, `streakDays`, `streakMult`,
plus the Economy suite — the single most-tested cluster. Extract only after
`config` + `state` + `time` are in place.

### 4.13 `combat.js` — hero/progression math
Deps: `config`, `state`, `data/items`, `data/progression`. **Exports:**
- `xpForNext(level) → int` *(pure; test surface)*
  ([index.html:2353](index.html:2353))
- `gainXP(rawXp) → { leveled, newLevel, gained }` — **refactor to return an
  outcome;** move its `toast`/`sfx`/`renderStats` calls to the shell
  ([index.html:3982](index.html:3982)).
- `heroMaxHP() → int`, `heroATK(elixir) → int`, `critChance() → float`,
  `vary(x) → int` ([index.html:3959](index.html:3959),
  [3971](index.html:3971), [4371](index.html:4371), [4169](index.html:4169)).
- Upgrade math: `upgradeLvl, upMult, upgradeCost, upgradeGoldCost, dispName`
  ([index.html:3954](index.html:3954)–[3958](index.html:3958)).
- `questEnergy(q)`, `restCost()`, `roomCost()`
  ([index.html:4184](index.html:4184), [3332](index.html:3332)).

### 4.14 `durability.js` — wear & repair
Deps: `config`, `state`, `data/items`. **Exports:** `getDur, setDur, durColor,
wearItem, gradeRepairMulti, repairCost`.
Source: [index.html:2313](index.html:2313)–[2351](index.html:2351).
> `durBar(id)` builds an HTML string — leave it in the render layer.

### 4.15 `quest-logic.js` — gating & unlocks
Deps: `config`, `state`, `data/quests`. **Exports:** `questDoneOnce,
questAvailable, questBudget, isLocked, checkUnlocks, canCraft`.
Source: [index.html:1008](index.html:1008)–[1018](index.html:1018),
[1908](index.html:1908)–[1921](index.html:1921), [3675](index.html:3675),
[4008](index.html:4008).
> `checkUnlocks` currently can `toast` on a newly-fired unlock — return the
> fired keys and let the shell toast.

### 4.16 `fitness.js` — activity source interface
Deps: none. **Exports:** `FitnessProvider`, `ManualFitnessProvider`, `provider`
(default instance). Already a clean async contract:
`getActivity(dateStr) → {steps, calories} | null`
([index.html:1886](index.html:1886)–[1896](index.html:1896)). This is the seam
where a real Apple Health / Garmin / Oura adapter slots in later — move it
intact.

### 4.17 `persistence.js` — save / load / migrate (env-injected)
Deps: `config`, `state`, and (by reference, for back-fills) the data tables.
**Exports:** `saveKey, save, load, migrate, getAccounts, saveAccounts`.
Source: [index.html:1973](index.html:1973), [2038](index.html:2038),
[2112](index.html:2112), [2132](index.html:2132)–[2135](index.html:2135).
*Test surface:* `save` is exposed (callable, asserts no throw).

> **Injection seam (required).** `migrate` calls `crypto.randomUUID()`
> ([index.html:2057](index.html:2057)); `save`/`load` use `localStorage`. The
> test vm stubs `localStorage` but **not** `crypto`. Today this is safe only
> because the harness never calls `migrate`. Make the module take a small
> adapter — `{ storage = globalThis.localStorage, uuid = () =>
> globalThis.crypto?.randomUUID?.() ?? fallback }` — defaulted to the platform
> globals. Browser & Phaser get the real ones; Node tests pass the stub. **Do
> not call `crypto`/`fetch` at module top level** — keep them inside functions
> so importing the module never throws in a bare Node context.

### 4.18 `accounts.js` + `cloud.js` — network-coupled (last, injectable)
Deps: `config`, `state`. **`accounts.js` exports:** `passHash` (`crypto.subtle`),
the signup/login fetch core ([index.html:2029](index.html:2029),
[2140](index.html:2140)–[2225](index.html:2225) minus their DOM bits).
**`cloud.js` exports:** `cloudToken, scheduleCloudPush, cloudPush, track`
([index.html:2000](index.html:2000)–[2027](index.html:2027),
[1926](index.html:1926)–[1941](index.html:1941)). Both take an injectable
`fetch`/transport so headless runs (cron, tests) don't hit the network. Lowest
priority — extract only when Phaser needs cloud parity.

---

## 5. Generator contract (`tools/build-inline-logic.js`)

A ~40-line Node script. **Inputs:** the ordered module list (§4.1→4.18).
**For each module:** read the file, delete lines matching `^\s*import\b`, delete
the leading `export ` keyword (and drop a trailing `export { … }` block), append
the remaining body. **Output:** write the concatenation between
`// <BUILD:logic START>` / `// <BUILD:logic END>` markers inside the inline
`<script>` of `index.html`, leaving the presentation code around it untouched.

Invariants the generator must hold (each is a way the test goes red):
1. **No `import`/`export` token survives** into `index.html`.
2. **No wrapping scope** — bodies are concatenated at top level so every exposed
   symbol stays a bare global.
3. **Topological order** — a module is inlined after everything it references by
   *value* (esp. `pricing` before `items`; `config`/`state`/`time` before
   `economy`). Order-tolerant `typeof X !== 'undefined'` guards in `migrate`
   ([index.html:2054](index.html:2054), [2087](index.html:2087),
   [2091](index.html:2091), [2107](index.html:2107)) are fine, but real value
   refs are not.
4. **Idempotent & reviewable** — re-running with no source change yields a
   byte-identical block; the diff is the audit trail.

Run it in `game2d` `dev`/`build` (and a pre-test hook if desired) so
`index.html` never drifts from the modules.

---

## 6. Safe extraction order

Each step is: *move one cluster into its module → run the generator →
`node game-test.js` must read **69 / 70 · 0 failed**.* Stop and fix on any
regression before continuing. Order is chosen so the **test-covered clusters
move only after their dependencies exist**, and the riskiest (env-coupled) move
last.

| # | Step | Modules | Why here / risk |
|---|---|---|---|
| **0** | Stand up the generator; insert the markers; move **zero** logic. | — | Proves the generated-identical blob still passes. Establishes the build before any behaviour changes. |
| **1** | Config constants. | `config` | No deps; immediately validates `EXPOSE_SNIPPET` still resolves `STEP_CAP`, `CAL_CAP`, `VERSION`, … |
| **2** | Time & format helpers. | `time`, `format` | Pure, directly test-covered (`localDateStr`, `lastNDays`, `fmt`). |
| **3** | Pure data, in dependency order. | `pricing` → `data/items` → `data/drops` → `data/quests` → `data/world` → `data/progression` → `data/flavor` | Covers `WEAPONS/ARMOR/SHIELDS/HELMS/PANTS/QUESTS/CLASSES` integrity + Economy/price tests. `pricing` first (literals spread it). |
| **4** | Shared state. | `state` | Harness `setS` assigns `S` **and** `currentEmail`; keep both identical. |
| **5** | Economy & retention. | `economy` | The most-tested cluster; safe now that config + state + time exist. |
| **6** | Combat/progression, durability, quest gating. | `combat`, `durability`, `quest-logic` | Mostly exercised indirectly (play-sim via `creditDay`); apply the outcome-return split to `gainXP`/`checkUnlocks`. |
| **7** | Fitness provider. | `fitness` | Clean contract; used by `syncDay`, not by tests directly. |
| **8** | Persistence, then accounts/cloud. | `persistence`, `accounts`, `cloud` | Last — they touch `localStorage`/`crypto`/`fetch`. Add the injection seams (§4.17); confirm exposed `save` stays callable. |
| **9** | *(Optional hardening)* Add a second oracle. | — | New `game-test-modules.mjs` imports the ESM directly (Node ESM) and re-runs the same assertions, verifying the logic independent of the scrape. Keep the original scrape test until parity is proven, then decide whether to retire it. |

After every step the diff is two-sided and auditable: the new module file, and
the regenerated block in `index.html` (which should match the old hand-written
code line-for-line until you deliberately apply the §3 outcome-return splits).

---

## 7. Risks, gotchas, and explicit non-goals

- **Module syntax in the test path = total failure.** The #1 invariant. The
  generator's strip step and a CI check (`grep -nE '\b(import|export)\b'` inside
  the marker block must be empty) guard it.
- **Symbol hiding.** Any future "optimization" that wraps the inline logic in an
  IIFE/closure silently breaks `EXPOSE_SNIPPET`. Document the bare-top-level
  requirement next to the markers.
- **The ambient `S` singleton.** One live binding, owned by `state.js`. Don't
  duplicate it; don't convert to explicit-state-passing in this pass (588 refs,
  and it breaks `getS`/`setS`). That refactor is a **separate later effort**,
  out of scope here.
- **Env APIs absent in the test vm** (`crypto.randomUUID`, `crypto.subtle`,
  `fetch`, `TextEncoder`). Keep them inside functions (they already are), behind
  injected adapters in `persistence`/`accounts`/`cloud`, and **never at module
  top level** — importing a logic module in bare Node must not throw.
- **Mixed UI+logic functions.** Apply the `creditDay`/`syncDay` outcome pattern
  (§3) only where the migration needs it; over-splitting now is churn for no
  test benefit.
- **Data tables keep their presentation hints.** `emoji`, `icon`, `spr:[…]` are
  engine-agnostic strings; Phaser interprets them. Don't strip them, don't try
  to "clean" the data in this pass.
- **Non-goals:** reimplementing renderers, touching `spike/`, changing the
  Worker, or altering economy numbers. This plan **moves** logic and **proves
  parity** — it does not redesign it.

**Definition of done:** every logic cluster in §4 lives in
`game2d/src/logic/*.js`; Phaser scenes import them directly; `index.html`'s
logic block is fully generated from those modules; and
`node game-test.js` still reports **69 / 70 · 0 failed · 1 warning** at every
step along the way.
