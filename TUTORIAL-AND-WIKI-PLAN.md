# Tutorial & Wiki — Design and Plan

**Status:** Proposed (2026-06-21). Triggered by playtest feedback:
> "I synced my steps and then didn't know what to do, I went to the bar (tavern), read about a dragon and got confused, maybe a tutorial would be a good idea."

**Decisions locked with Rodolfo (2026-06-21):**
1. Tutorial style → **guided interactive walkthrough** (highlights real buttons, walks Sync → Quest → Battle).
2. Reference location → **both** an in-game "How to Play" section *and* a fuller standalone wiki page.
3. Tone → **plain & clear, lore second** (mechanics in modern language; flavor optional).

---

## 1. Problem

Two distinct failures in the new-player path, both confirmed by the feedback:

- **No active guidance after Sync.** Today the only onboarding is a one-time passive modal ("Welcome to Oppidum", 3 bullet points) plus the `town-hint` banner. The modal is dismissed and forgotten; the player is then alone on the town map. → *"didn't know what to do."*
- **Lore is everywhere, plain rules are nowhere.** The tavern, quests, and Library all speak in dense in-world voice (the dawn-voice, the Hollow, Brand the Returned). A new player reading a quest about a "dragon"/monster has no plain reference for *what they're supposed to do mechanically.* → *"read about a dragon and got confused."*

The fix is two complementary pieces: a **guided first-run tutorial** (teaches the loop by doing) and a **plain-language wiki** (answers "what is this / how does it work" on demand).

## 2. What already exists (reuse, don't rebuild)

Grounding the plan in the current `index.html`:

- `showScreen(name)` (≈ line 2502) — single switch that drives all 28 screens. The tutorial will observe/drive this.
- Post-create welcome modal (≈ line 2349) — the static intro to be **replaced** by the guided walkthrough.
- `town-hint` banner logic (≈ line 2984) — already sequences Sync → Tavern → stats. The tutorial formalizes this; the banner stays as the post-tutorial nudge.
- `#screen-library` (≈ line 903) — holds the lore "Accounts & Glossary" + a short FAQ. The in-game "How to Play" lives here, kept visually separate from the lore.
- `showModal(...)` helper and the `toast(...)` system — reused for tutorial steps and callouts.

## 3. Design — Part A: Guided interactive tutorial

A lightweight overlay engine that runs a scripted sequence of **steps**. Each step can: show a coach-mark bubble, dim the screen, spotlight one real UI element, and wait for the player to perform the real action before advancing.

**Step object (proposed shape):**
```js
{
  id: 'sync-open',
  text: 'Tap the Wayward Keep to open Realm Sync — this is where your real steps become Gradus.',
  target: '[data-tut="keep"]',     // element to spotlight (CSS selector)
  advanceOn: 'screen:sync',         // auto-advance trigger: screen change / click / custom event
  allowSkip: true
}
```

**First-run script (the core loop, ~7 steps):**
1. Welcome — one short panel: "Two realms. Your real steps and calories power your hero here." (Skip / Begin)
2. Spotlight the **Wayward Keep / Milestone** → "Open Realm Sync." (advance when `screen-sync` shows)
3. On the Sync screen → "Enter or simulate today's steps and calories, then confirm." (advance when a sync is recorded)
4. Back in town, spotlight the **Foundered Horse (Tavern)** → "Take your first quest here." (advance on `screen-tavern`)
5. In tavern → "Accept a quest. Don't worry about the story yet — the goal is to fight a monster." (advance when a quest is accepted)
6. Battle screen → callout the **Attack** button → "Win the fight. Attack, use a potion if hurt, flee if it goes bad." (advance on victory/exit)
7. Wrap-up panel → "That's the loop: walk → sync → spend → grow. Open **📖 How to Play** any time from the Library." Offer a button straight to the wiki.

**Behavior rules:**
- Skippable at any step (✕ + "Skip tutorial"); records `S.tutorialDone = true`.
- Replayable from Settings → "Replay tutorial" and from the wiki.
- Non-blocking failsafe: if the player navigates off-script, the overlay pauses and the `town-hint` banner resumes; tutorial can be re-entered.
- Persisted on the save object (`S.tutorialDone`, `S.tutorialStep`) so it survives reloads and respects existing players (don't show to anyone past level 1).

**Implementation surface:** one self-contained module (overlay DOM + CSS spotlight + a `runTutorial(script)` driver hooked into `showScreen` and a few `data-tut` attributes on existing buttons). No framework; matches the single-file vanilla-JS convention.

## 4. Design — Part B: Wiki / How to Play

Same content, two surfaces, authored once as structured sections:

**B1. In-game "📖 How to Play"** — a new collapsible block at the top of `#screen-library`, above the lore "Accounts". Plain language, scannable, answers the immediate questions. Sections:
- The core loop (walk → sync → earn → spend → grow)
- The two currencies (Gradus = steps, Ries = calories) — plain, one flavor line each
- The town: what each building does (one line apiece)
- Combat basics (turn order, traits, death = lose carried Gradus → bank first)
- Gear & the Forge, Quests vs Free Hunts vs Dungeons, Streaks & daily goals
- A short, honest FAQ (fold in the existing six Q&As, rewritten plain-first)

**B2. Standalone wiki page** — `wiki.html` (or a `?wiki` route), same PWA shell, fuller and room to grow: a left-nav/section index, the above sections expanded, a glossary table, monster-trait reference, and a "Realm Sync setup" how-to (manual + device). Linked from: the tutorial wrap-up, the Library, and Settings. Standalone so it's shareable as a link and won't bloat the main game screen.

**Content principle (per locked tone):** every section leads with the plain mechanic; any lore is a single italic flavor line *after*, clearly optional. The dragon/Hollow fiction stays in the Accounts and quest text — the wiki never makes the player decode lore to learn a rule.

## 5. Build sequence (one step per prompt, per your working style)

Each step ends with a file you can open and test. Suggested order:

1. **Wiki content draft** (Markdown) — write all plain-language sections; you review wording before any code. *(content first, lowest risk)*
2. **In-game "How to Play"** — drop the reviewed content into `#screen-library` as a collapsible block.
3. **Standalone `wiki.html`** — same content in the fuller standalone page; link it from Library + Settings.
4. **Tutorial overlay engine** — the `runTutorial` driver + spotlight CSS, tested with a dummy 2-step script.
5. **First-run script + wiring** — the 7-step script, `data-tut` hooks, `S.tutorialDone`, replace the welcome modal, add Settings "Replay tutorial".
6. **Verify** — run `node game-test.js` (ensure no regressions), then a manual new-character playthrough to confirm the guided path and the wiki links.

## 6. Decisions I still need from you

- **Wiki route/filename:** `wiki.html` standalone vs. a `?wiki` view inside the SPA. (I lean `wiki.html` — cleaner to share, no main-bundle bloat.)
- **Tutorial trigger for existing players:** show a one-time "Tutorial now available — replay it?" prompt, or only ever offer it via Settings? (I lean: Settings-only for existing saves; auto-run for brand-new characters.)
- **Scope of v1 wiki:** ship sections in §4 only, or also include a monster/bestiary and gear-grade tables now? (I lean: ship §4 first, grow later.)

---

**Logical next step:** Step 1 — I draft the plain-language wiki content as Markdown for your review, before touching any code.
