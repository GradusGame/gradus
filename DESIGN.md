# Gradus — Design Document v0.1

Medieval RPG where real-world movement funds your adventure. 1 step = 1 **Gradus**. 1 calorie burned = 1 **Ries**.

---

## 1. Core loop (a 5-minute session)

1. **Sync** — open the game, sync today's steps/calories. Coins pour in with a satisfying counter animation. (~10K Gradus + ~2K Ries on a goal day.)
2. **Spend** — visit the town shops: blacksmith (weapons), armorer (armor), apothecary (potions). Buy or save toward the next tier.
3. **Quest** — take one quest from the tavern board. Combat is **auto-resolved**: the battle plays out on its own (8-bit animation), and your prep — gear, potions, level — decides the outcome. Strategy happens before the fight, not during.
4. **Reward** — quest pays a small Gradus bonus + loot; progress bar toward the next zone advances.
5. **Leave wanting more** — next quest is visible but harder; the gear you need is priced 2–4 days of walking away.

The real-world hook: the only way to get stronger faster is to move more.

## 2. Economy — one catalog, two ways to pay

Every item has **two prices**, and the player chooses which currency to spend at checkout. Ries price = Gradus price ÷ 5, matching the daily income ratio (~10K Gradus : ~2K Ries), so neither currency is strictly better.

| | Gradus (steps) | Ries (calories) |
|---|---|---|
| Daily income (goal day) | ~10,000 | ~2,000 |
| Earned by | Consistency — walking every day | Intensity — workouts, runs |

Why both: two wallets funded by different fitness behaviors. The strategy is budgeting — e.g., spend 5,000 Gradus on a sword and keep Ries for a 200-Ries potion pack, or the reverse if today was a gym day. Every number on the tracker is spendable.

Quest rewards pay small bonuses (5–10% of a daily income) so play matters, but real wealth only comes from real movement.

## 3. Starter item catalog

Anchor: ~10K Gradus or ~2K Ries per day. Tier N gear ≈ N–ish days of activity. Pay with either currency.

### Weapons (blacksmith)
| Item | Gradus | Ries | Days of activity |
|---|---|---|---|
| Rusty Sword (starter) | free | free | — |
| Iron Dagger | 4,000 | 800 | 0.5 |
| Iron Sword | 9,000 | 1,800 | ~1 |
| Steel Mace | 22,000 | 4,400 | ~2 |
| Steel Longsword | 38,000 | 7,600 | ~4 |
| Knight's Blade | 75,000 | 15,000 | ~7.5 |

### Armor (armorer)
| Item | Gradus | Ries | Days of activity |
|---|---|---|---|
| Cloth Tunic (starter) | free | free | — |
| Leather Vest | 6,000 | 1,200 | 0.6 |
| Leather Set | 15,000 | 3,000 | 1.5 |
| Chainmail | 30,000 | 6,000 | 3 |
| Plate Cuirass | 65,000 | 13,000 | ~6.5 |

### Potions & magic (apothecary)
| Item | Gradus | Ries | Effect |
|---|---|---|---|
| Minor Health Potion | 200 | 40 | Heal 30% HP |
| — pack of 5 | 1,000 | 200 | |
| Health Potion | 600 | 120 | Heal 70% HP |
| Stamina Draught | 400 | 80 | +1 extra quest today |
| Strength Elixir | 900 | 180 | +25% damage, one battle |
| Weapon Enchantment | 9,000 | 1,800 | Permanent +10% to equipped weapon |

## 4. Progression — levels & classes

Heroes start as a **Wanderer** (level 1) and earn XP from quests. Levels raise base stats (HP, damage). At **level 10**, the player chooses a class path:

| Class | Identity | Bonus (v1, simple) |
|---|---|---|
| Knight | Tank | +25% HP |
| Mage | Burst | +25% damage |
| Archer | Striker | Attacks first; chance to dodge |
| Cleric | Sustain | Potions 50% more effective |

(Distinct class gear trees and abilities are v2+.)

**First hour:** create your Wanderer → first sync (whatever's already on the tracker today — instant wealth, feels great) → buy Leather Vest + a potion → clear quest 1 (Rats in the Cellar), reach level 2 → see quest 2 needs better gear → close game with a reason to walk.

**First month:** daily sync habit forms. Week 1: iron tier, clear the Village zone. Week 2: steel tier, unlock the Forest, hit **level 10 and pick a class** — the month's big moment. Week 3–4: saving toward Knight's Blade / Plate, first boss (Forest Troll) requires gear AND potion prep. End of month: ~250–300K lifetime Gradus earned, visible "lifetime steps" stat doubling as a fitness trophy.

## 5. Zones & gear grades (Lineage 2-style ladder)

Gear follows an L2-style grade ladder: **No-grade → D → C → B → A → S**. Each zone introduces the next grade; clearing a zone's boss unlocks the next zone.

Zone names are Latin (matching "Gradus"): **Oppidum** (town) and **Silva** (forest).

| Zone | Grade | Levels | Unlock |
|---|---|---|---|
| 1. Oppidum | No-grade | 1–10 | start |
| 2. Silva | D | 10–16 | defeat the Forest Troll |
| 3+ (future) | C, B, A, S | 16+ | each zone's boss |

**Quest rewards:** first clear pays full XP + Gradus (no Ries from quests). Repeats pay **½ XP only** — except the ★ daily bonus quest, which still pays its base Gradus on repeat (3× on first clear). Currency therefore comes overwhelmingly from real-world movement; Ries comes only from calories.

Silva D-grade catalog: Forest Blade 85K / Wolfsbane Axe 115K / Elderwood Sword 150K (ATK 30/36/42); Ranger Tunic 80K / Bark Mail 105K / Treant Plate 140K (DEF 20/26/32). With forest quest income (~1,800–2,600 G per quest + streak + daily bonus), each upgrade lands ≈ 2 days apart. Zone bosses are designed to require potion/elixir prep at full zone gear.

## 6. Retention systems

- **Sync streak:** consecutive synced days shown in the HUD (🔥). Each streak day adds **+5% to Gradus/Ries sync earnings, capped at +50%** (10 days). Missing a day resets it. Computed from the sync log (back-entry within the 7-day window can repair a streak).
- **Daily bonus quest:** one unlocked quest pays **3× currency**, rotating daily (date-seeded), marked ★ on the quest board.
- **Loot drops:** winning a battle has a **30%** chance to drop a potion (weighted toward minor/health) and a **5%** chance for a rare gem worth **+2,000 Gradus**, both announced in the victory message.

## 7. V1 feature list (playable prototype)

**In:**
- Single `index.html`, 8-bit pixel style
- Sync screen with manual step/calorie entry (mock `FitnessProvider`)
- One town screen: blacksmith, armorer, apothecary, tavern quest board
- Catalog above; buy/equip; simple inventory
- Auto-resolved combat (battle plays out automatically; prep is the strategy), 5 monster types, 6 quests in order
- XP & levels; class choice at level 10 (simple stat bonuses)
- HP from armor + level, damage from weapon + level
- Save/load via localStorage + export file

**Out (v2+):** real tracker APIs, explorable world map (the "moving RPG" vision), class gear trees & abilities, multiplayer/leaderboards, crafting, sound.

---

## Roadmap to the "Diablo-style" vision

Diablo's format is **isometric** (top-down ¾ view), not third-person 3D — much more achievable while keeping the 8-bit look.

1. **v1 (done):** menu-driven HTML game — economy, sync, shops, quests, auto-combat, classes.
2. **v1.5 (current web build):** walkable town on `<canvas>` in the **8-Bit Adventures 2 style** — top-down NES-resolution JRPG view (256×192, 16px tiles), bright palette, outlined sprites, classic navy/white-border JRPG UI. Click/WASD movement; walk into a building's door to enter. (Replaced the earlier isometric prototype; the Diablo-style camera can return in the Godot 3D port.)
3. **v2 (Godot engine):** port to Godot — free, exports to web *and* mobile. True 3D with chunky low-res textures ("8-bit 3D") or polished isometric 2D. Real tracker APIs (Garmin/Apple/Oura/Samsung via aggregator + OAuth backend) land here.
4. **Skip Unity/Unreal** — overkill for this art style.

Game logic (economy, quests, `FitnessProvider`) is engine-independent and ports forward at each step.

## Decisions

1. **Combat:** ✅ Turn-based (changed in V1.4 from auto-resolve) — Attack / Potion / Flee each turn; monster traits (Swift, Armored, Venom, Frenzy, Regen) create tactical decisions; potions are drunk in battle, elixirs and enchanting remain pre-battle prep. Quest design follows Witcher-style contracts with flavor-text hints, plus an optional Elden-style Legend superboss per zone.
2. **Daily sync rules:** ✅ Back-entry allowed for the last 7 days. Daily earning cap: **50,000 steps / 4,000 kcal** per day (excess is ignored).
3. **Hero identity:** ✅ Start as **Wanderer** (level 1); at level 10 choose a class path: Knight, Mage, Archer, or Cleric.
