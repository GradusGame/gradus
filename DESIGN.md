# Gradus — Design Document (current as of Alpha V1.30, 2026-06-13)

A medieval fitness RPG. There are two realms: the Gradus realm (the game) and the real-life realm. Steps become coin, calories become energy. Neither realm prospers without the other.

## Core currencies

- **Gradus 🪙** (coin): 1 step = 1 Gradus. Daily goal 7,000 steps pays a +2,000G threshold bonus; the 10,000 stretch goal pays +3,500G. A daily claim floor (150G/day) keeps lapsed players moving, but cannot fund gear by itself. Carried Gradus is lost to looters on death; the Bank vault and sealed investments survive.
- **Ries ⚡** (energy): 1 calorie burned = 1 Ries. Fuels quests, free hunts, dungeons, life skills, crafting, and Forge upgrades. Restored by real-world calories or cooked meals.

## Sync (Realm Sync)

Manual entry or push-based device sync (see INTEGRATION.md): iPhone Shortcut → Worker → game. Daily caps 50,000 steps / 4,000 kcal; back-entry window 2 days; streaks count only 7K+ days and grant +5%/day earnings up to +50%.

## World

| Zone | Grade | Unlock |
|---|---|---|
| 1. Oppidum | No-grade | start |
| 2. The Greenwood | D | lay Brand the Returned to rest (Oppidum gate boss) |
| 3. The Ruins | C (dungeon relics) | progress past the Greenwood |

- **31 quests** (Hunt / Contract / Boss / Legend; some repeatable, some story) with lore, named givers, and rumor-locked entries heard in the Inn's common room.
- **Free hunts**: open grind areas per zone, energy-only, no daily cap.
- **Dungeons**: six level-gated multi-fight delves (lv5 → lv55); first clear grants a unique relic.

## Combat

Turn-based: Attack / class ability (cooldown) / potion / flee. Monster traits: Swift, Armored, Venom, Frenzy, Regen. Death wipes carried Gradus and wounds the hero (rest at the Inn). Daily quest attempts limited (rooms at the Inn restore them); every fight costs Ries.

## Character

- Start as a Wanderer (gender + hair sprite variants); choose a class at level 10: Knight, Mage, Archer, Cleric — each has a passive, a weapon affinity (+10% with its weapon type), and an active battle ability.
- **Equipment**: 7 slots (weapon, shield, helm, armor, gloves, pants, boots), grades No-grade → D → C → B → A → S, Forge upgrades to +5 (Ries), durability with Blacksmith repairs, Apothecary enchantments (+10% permanent).
- **Stat points** (VIT etc.) on level-up.
- **Life skills**: Fishing (Lake), Woodcutting/Thieving (Commons), Gathering, Cooking (Crafting bench) — all level independently.
- **Crafting**: mob drops (herbs, hides, venom sacs, glowdust, timber) + Ries → potions, meals, enchantments.

## Town (clickable map)

The Wayward Keep / the Milestone (Realm Sync), the Foundered Horse (quest board / tavern), Maren's (Inn — rest/rooms/rumors), Bank (vault + 5%/30-day investments), Blacksmith (melee/crossbows, Forge, repairs), Woodsmith (bows/staffs), Armorer, Apothecary, Commons, Lake, Hunting Grounds, Library (Accounts/glossary/FAQ), Chapel (the Hollow Choir / Choirmaster Vane).

## Retention

7K/10K daily goals, streaks, daily bonus quest (3×), loot drops, deeds & titles (wearable), 2-hour "go walk" reminder, investments maturing in 30 days.

## Platform

Single-file PWA (mobile-first: bottom nav, safe areas), localStorage saves with local multi-account + optional Worker cloud saves, synthesized audio (chiptune SFX + dorian music loop), analytics. Deployed via GitHub Pages + Cloudflare Worker (wrangler).

## Testing

`node game-test.js` — 70 automated checks (economy, streaks, caps, fuzz, 100-session play sim) writing test-report.md.

## Monster sprites & zone unlocks (decided 2026-06-13)

Each quest's `monster` object carries its own `spr:[kind, ...args]` (same convention as grind/free-hunt monsters). The renderer uses `monSprite(m)`, which reads `m.spr` directly. The old position-indexed `MON_SCENE` array + `monsterSpriteSVG(QUESTS.indexOf(q))` were removed — they had desynced from the quest order (e.g. the Forest Troll rendered as a spider; six Ruins quests fell back to a rat). Inserting or reordering quests can no longer break sprite assignment.

Zone-unlock constants equal the first quest index of that zone: `FOREST_UNLOCK = 14` (first zone-2 quest, available right after clearing the Oppidum gate boss **Brand the Returned** at idx 13) and `RUINS_UNLOCK = 23` (first zone-3 quest). A boot-time `validateContent()` IIFE `console.warn`s if any quest lacks a valid `spr` or if either unlock constant drifts from the first zone index.

## Narrative / canon alignment — Oppidum (2026-06-15)

The Oppidum content (Reach 1) was rebuilt to match LORE.md, CHARACTERS.md, STORY-ARCS.md, and the chapter prose (THE-BOOK-OF-GRADUS.md / Chapter-00..07). Mechanics and economy are unchanged; only content (names, givers, descriptions, flavor, lore, milestone dialogue) was rethemed. Canon now in the game:

- **The two story bosses**, in arc order: **idx 12 The Tithe-Eater** (the Hollow / "The Dawn That Lied," Ch1-2) and **idx 13 Brand the Returned** (the Reckoning, Ch6 → the Long Way Out, Ch7). Clearing idx 13 opens the Road south to the Greenwood. The old **Forest Troll** moved to the Greenwood (zone-2 idx 14).
- **Locations**: Realm Sync reframed as **the Wayward Keep / the Milestone**; the Inn is **Maren's** (grief over Tam); the tavern is **the Foundered Horse** (Big Doll, Wick & Gorn, Sweet Lyle, Pinch, Captain, the ember) with a date-rotated cast vignette on the quest board; the Chapel is the **Hollow Choir's** (Choirmaster Vane reads the corrupted dawn Litany); the Library holds the conflicting **Accounts**.
- **Town NPCs (milestone-aware)**: Maren, Edrin the baker (+ daughter Wenna, the Informer beat), Choirmaster Vane, the Vagabond. Inn regulars: Orris the Inkfinger, a frightened Footsworn, Hesta, Col, a Road pilgrim, an off-duty guard.
- **Factions woven in**: the Footsworn (the coin as defiance), the Hollow Choir (Vane / quislings), the Wakeful (hinted in the Library / clear-sight).
- **Currency framing**: Gradus = the name the High Crown swore to unmake; Ries = "breath / spent fire." Glossary updated to Viatera / the Realm of Toil / the Sunless Court.
- **Cross-zone canon fixes**: removed the goblin (humans-only world); renamed the Greenwood/Ruins quest-giver "Captain Roderic" → "Captain Halden" (Roderic the Second Strider is reserved as the Ruins boss); deattributed the chapel records from "Father Bede"/"Brother Caedmon" (Caedmon = the dead god); the Chronicle of Oppidum now reads as a canon unreliable Account.

The novel/lore files were not changed; this pass adapted the game *to* them. No new lore was locked, so THE-BOOK-OF-GRADUS.md needs no extension.

## Onboarding — guided tutorial & wiki (2026-06-21)

Added in response to playtest feedback ("synced steps then didn't know what to do; read about a dragon and got confused"). See TUTORIAL-AND-WIKI-PLAN.md for the full design.

- **Guided interactive tutorial** (`Tut` engine + `TUT_STEPS` in index.html): a 7-step first-run walkthrough that spotlights real buttons and drives the player through Sync → take a quest → win a fight → wrap-up. Replaces the old static "Welcome to Oppidum" modal. Skippable and replayable; persisted via `S.tutorialDone`. Auto-runs once for brand-new characters only (existing saves are untouched). Replay from Settings → Help or the Library "How to Play" block. Spotlight = box-shadow cutout over `[data-tut]` targets; advances on screen changes (`showScreen` hook) plus a `tutNotify('sync')` event.
- **In-game "How to Play"** (Library screen): collapsible plain-language sections (currencies, sync, town, combat, character/quests, FAQ), kept visually separate from the lore "Accounts". Tone: mechanic first, lore as optional italic flavor.
- **Standalone `wiki.html`**: fuller reference with sticky section nav (core loop, currencies, sync, town, combat, character, gear, quests, life skills, bank, zones, FAQ). Linked from the Library block and Settings → Help. Source content kept in WIKI-CONTENT.md.
- **Open question:** device sync is documented in the wiki per DESIGN; confirm it's live in the current build or the line should be softened.
