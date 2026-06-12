# Gradus — Design Document (current as of Alpha V1.19, 2026-06-12)

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
| 2. The Greenwood | D | defeat the Forest Troll |
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

Keep (Realm Sync), Tavern (quest board), Inn (rest/rooms/rumors), Bank (vault + 5%/30-day investments), Blacksmith (melee/crossbows, Forge, repairs), Woodsmith (bows/staffs), Armorer, Apothecary, Commons, Lake, Hunting Grounds, Library (glossary/FAQ), Chapel.

## Retention

7K/10K daily goals, streaks, daily bonus quest (3×), loot drops, deeds & titles (wearable), 2-hour "go walk" reminder, investments maturing in 30 days.

## Platform

Single-file PWA (mobile-first: bottom nav, safe areas), localStorage saves with local multi-account + optional Worker cloud saves, synthesized audio (chiptune SFX + dorian music loop), analytics. Deployed via GitHub Pages + Cloudflare Worker (wrangler).

## Testing

`node game-test.js` — 70 automated checks (economy, streaks, caps, fuzz, 100-session play sim) writing test-report.md.
