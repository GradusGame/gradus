# Gradus — Changelog

## Alpha V1.27 — 2026-06-12
A calm front door.
- **Title screen reorganized into tabs**: ⚔️ Enter (crest, title, login/create — nothing else), 📖 About (Seneca, tagline, FAQ, privacy, patch notes), 🏆 Realm (live population, today's steps, event banner, townsfolk quip, leaderboard)
- First impression is now just the game's name and the door in

## Alpha V1.26 — 2026-06-12

## Alpha V1.26 — 2026-06-12
The front door, finished.
- **Title art support**: drop the generated `title.png` in the folder and it becomes the title screen backdrop (dimmed behind the panel; silent fallback without it)
- **🌅 Today across the realm**: live combined steps synced today by all walkers (new worker `/today` endpoint)
- **Daily townsfolk line**: a date-rotated quip from one of ten NPCs greets visitors ("Steel doesn't care how you feel about cardio." — Wulfric)
- **Seasonal event scaffold**: an EVENTS list renders a gold banner on the title screen during date windows; first event ready to write in one line

## Alpha V1.25 — 2026-06-12

## Alpha V1.25 — 2026-06-12
Patch notes on the site, livelier front door.
- **📜 Patch Notes** in-game: player-facing version history (internals omitted) reachable from the title screen, Library, and Settings
- **Title screen additions**: tagline ("Your steps are gold · your sweat is power · your habit is a hero"), Patch Notes + Hall of Wanderers buttons before login, live realm population ("N wanderers walk this realm" with combined lifetime steps), and a privacy line: no GPS, no location tracking

## Alpha V1.24 — 2026-06-12

## Alpha V1.24 — 2026-06-12
Progressive disclosure: the town wakes up as you earn it.
- Day one shows just the Keep, Tavern, Blacksmith and Library; ten locations now unlock at milestones with a 🔓 celebration: Armorer (1 hunt), Apothecary (2 hunts), Inn (level 3 / wounded / out of attempts), Bank (3,000 Gradus carried), Hunting Grounds (lv4), Woodsmith (lv5), Crafting (4 hunts), Chapel (lv6), Commons & Lake (Troll slain)
- Locked buildings dim on the map with 🔒 and explain how to open them; guards cover the map, menu, and bottom nav
- Existing saves unlock everything they've already earned, silently

## Alpha V1.23 — 2026-06-12

## Alpha V1.23 — 2026-06-12
Energy economy: the cap.
- **Ries capped at 5,000**: all gains (sync, thresholds, meals, draughts, thieving) clamp to the cap — energy is now a resource you spend, not hoard; a full bar means wasted calories
- **Forge costs rescaled to the cap**: was 1% of item price per level, floor 50 / ceiling 2,500 Ries (top-tier +5 previously demanded an impossible 38K)
- HUD energy bar and glossary updated for the cap

## Alpha V1.22 — 2026-06-12

## Alpha V1.22 — 2026-06-12
Settings, story-first quests, crits, casual-friendly leveling.
- **⚙️ Settings screen** (gear in the top bar): sound/music toggles, account status, log out, export/import save, reset character
- **Quest board reorganized**: each zone now shows 📖 THE STORY OF THE REALM first (highlighted; story quests complete once), then ⚔️ HUNTS & CONTRACTS (repeatable), then 🗺️ SIDE QUESTS (once each)
- **💥 Critical hits**: 5% base chance, +0.5% per DEX, Archers +5%; crits deal ×1.5 with their own flair; chance shown on the Stats screen
- **Casual-friendly early game**: levels 1–10 need ~38% less XP (tier-1 base 80→50); class choice arrives much sooner
- Restored save import; logout now lives in Settings (it had become hard to find)

## Alpha V1.21 — 2026-06-12

## Alpha V1.21 — 2026-06-12
Analytics you can read, auth you can trust.
- **Visual analytics dashboard**: /admin/analytics now serves a dark-themed HTML page — stat cards (registered / saves / active / events), bar charts for actions, screens visited, and hero-level distribution, plus heroes-by-steps and recent-players tables (`&format=json` for raw data)
- **Dashboard protected**: requires `?key=<ADMIN_KEY>` once you set the secret (`npx wrangler secret put ADMIN_KEY`); open until then
- **Passwords never stored**: device keeps only a SHA-256 hash for offline verification (legacy plaintext entries upgrade on next login); expired cloud sessions now prompt for re-login instead of silently reusing credentials
- **/push hardened**: uid and date format validation, step/calorie caps to keep junk out of storage

## Alpha V1.20 — 2026-06-12

## Alpha V1.20 — 2026-06-12
Going live: real accounts, cloud saves, leaderboard, new town art.
- **Live accounts**: Create/Login now register against the worker (token auth); offline play still works and reconciles on the next login. Passwords now require 6+ chars (matching the server). Brand-new devices can log in and pull their save
- **Automatic cloud saves**: every save debounce-pushes to the worker (8s, flushed when the tab hides); on login the newer of local vs cloud wins (savedAt timestamp); stale tokens silently re-authenticate
- **Backend on by default**: the worker URL ships baked in, so friends' analytics and saves flow without setup
- **🏆 Hall of Wanderers**: live leaderboard (lifetime steps, level, quests) in the Library; new GET /leaderboard worker endpoint
- **New portrait town map** (720×1280, 16-bit): all 13 hotspots remapped and visually verified, town NPCs repositioned, map capped at 520px on desktop
- signup/login analytics events

## Alpha V1.19 — 2026-06-12
Review pass: critical loot fix, save robustness, balance, docs.
- **Fixed (critical): equipping dungeon loot crashed the game after reload.** Gear catalogs rebuild from code on every boot, so an equipped relic id (e.g. lich_staff) resolved to nothing and heroATK/heroMaxHP threw. `migrate()` now reinjects owned/equipped dungeon-loot defs into the catalogs on every load path; stat functions also gained starter-item fallbacks as a safety net
- **Quest ids**: all 31 quests carry stable id slugs; first-clears are recorded in `S.clearedQuestIds` (progression stays index-based, saves now survive future reordering)
- **Balance**: Legend stat inversions fixed (Echo of the First Wanderer 680→780 HP, Cursed Colossus 600→750 HP / 40 ATK — both were easier than the zone bosses before them); Knight's Blade 125K→110K restores the ≥1.3× melee price ladder
- **Library**: glossary entries for Dungeons, Equipment slots, and Durability
- **Test harness**: weapon-price check judges per-type ladders (types interleave by design), quest-id test enforces unique slugs, VERSION test format-based, window.scrollTo stubbed — 69/70 passing
- Repo: .gitignore covers .DS_Store and .wrangler

## Alpha V1.14 – V1.18 — 2026-06-11 (consolidated; built across sessions)
The mobile + depth era.
- **Zone 3: the Ruins** — 8 new quests (Hounds of Ash through ✠ The Lich of Oppidum); 31 quest entries total including side/daily quests
- **Dungeons**: six level-gated multi-fight delves (Rat Warrens lv5 → Necromancer's Tower lv55), each with a unique first-clear relic (C-grade gear such as the Warlord's Helm)
- **Full equipment paperdoll**: 7 slots (weapon/shield/helm/armor/gloves/pants/boots) with new catalogs; Dungeon Finds inventory section with equip/discard
- **Durability**: gear wears with use, repaired at the Blacksmith
- **Economy/XP rebalance**: daily step goal 7,000 (+2,000G bonus), stretch 10,000 (+3,500G); daily claim floor (150G/day); streak counts only 7K+ days; back-entry window now 2 days; XP curve reworked; weapon prices rescaled (7K entry → 255K top)
- **Sync pivot**: Terra replaced by a push-based worker — an iPhone Shortcut POSTs {uid, date, steps, calories}; no API keys needed
- **Mobile-first PWA**: manifest + icons, bottom nav, safe areas, touch targets; gender + hair sprite variants; analytics; local multi-account system with sessions; stat points (VIT)
- Misc: chapel offerings, NPC chats, gathering skill, AI-art prompt pack (IMAGE_PROMPTS.md), deploy/setup scripts

## Alpha V1.13 — 2026-06-10
Map polish, the Greenwood, drops, and the crafting bench.
- Town map hover shows the building name only (gold frame removed)
- **🌾 Hunting Grounds** and **🎣 Lake** are places on the map (and menu) — free hunts moved out of the tavern; fishing happens at the Lake with Old Hessa
- **Zone 2 renamed: Silva → The Greenwood** (matching its quests' own lore)
- **Drop system**: every mob, quest or wild, has a drop table — herbs, hides, timber, venom sacs, glowdust
- **🛠 Crafting Bench** (top bar, also via Blacksmith and Woodsmith): 5 recipes — Grilled Fish, Minor/Health Potions, Strength Elixir, Weapon Enchantment — all from drops + ⚡; crafting trains Cooking
- Life skill levels now display in the Skills window; the Commons keeps Woodcutting and Thieving actions
- Library: inspirations section removed (cameos and easter eggs will replace it later)

## Alpha V1.12 — 2026-06-10
The big one: energy, life skills, free hunts, accounts, the Library.
- **Ries is now energy (⚡), not currency**: shops sell for Gradus only; Ries fuels quests (⚡40 Oppidum / ⚡80 Silva / ⚡150 Legend), free hunts, life skills, crafting, and the Forge (upgrades now cost Ries)
- **HUD bars**: ❤️ health (drops while wounded) and ⚡ Ries energy beside the purse
- **🌾 Free hunts**: each zone has open ground on the tavern board — fight roaming mobs (3 per zone) for XP and coin, no quest, no daily limit, only Ries; built for high-level grinding
- **🧺 The Commons**: life skills that level up — Fishing, Woodcutting, Cooking, Thieving; craft Grilled Fish (fish + timber) and eat meals to restore Ries
- **📚 The Library**: glossary (the Two Realms and everything else), FAQ, and acknowledged inspirations (Witcher 3, Elden Ring, Dragon's Dogma, Lineage 2, Diablo, Mu Online, Elder Scrolls, RuneScape)
- **☁️ Accounts**: create with email/password on your worker; cloud save/load from the Realm Sync screen (worker.js updated with auth endpoints)
- **NPCs everywhere**: Wulfric the smith, Aldwin the bowyer, Brunhild the armorer, Mother Elswyth, Osgar the keeper, Master Aurelius, Edwin the Reeve's clerk, Old Hessa, Brother Caedmon
- **Fixed**: new characters had all quests locked (fresh saves were missing quest fields); Ambulare Report renamed to **Realm Sync**

## Alpha V1.11 — 2026-06-10
Oppidum becomes a place you can see.
- The town screen now displays the painted town map (`town.png` in the game folder) with clickable buildings: Bank temple, Tavern, the central Keep (Ambulare Report), Armorer, Blacksmith forge, the Apothecary's purple tower, Inn, and the Woodsmith's training yard
- Hovering a building outlines it in gold with a name tag; the Market and Chapel respond with flavor
- If `town.png` is absent, the classic button menu shows instead (the game stays single-file portable)

## Alpha V1.10 — 2026-06-10
The real world arrives: device integration scaffolding.
- **Device link in the Ambulare Report**: save your backend URL, 🔗 Connect device (opens the Terra widget for Garmin/Oura/Strava/Fitbit logins), ⬇️ Pull from device (last 7 days flow through the normal rules: caps, streak bonus, one report per day)
- **`worker.js`**: Cloudflare Worker backend bridging Terra to the game (connect sessions, daily webhook storage, activity endpoint); data expires after 45 days, only daily totals stored
- **`INTEGRATION.md`**: step-by-step setup guide (GitHub Pages hosting, Terra dev account, Cloudflare Worker, ~45 min one-time)
- Internal: manual entry and device pull share one crediting path (`creditDay`)
- Note: research confirmed direct Garmin requires a company entity and Oura killed personal tokens (Dec 2025), so the Terra aggregator route covers both devices without either roadblock

## Alpha V1.9.1 — 2026-06-10
Fixes.
- ❓ rumor hunts now show on the board even before you reach them in progression (previously they only appeared when next in line, so most players never saw one)
- Hunts you already cleared count as known: no rumor needed to repeat them, and their rumors are marked heard on old saves
- Removed em dashes from all lore, flavor, and rumor text; passages repunctuated by hand

## Alpha V1.9 — 2026-06-10
Rumors in the common room, a candle for the road, and music.
- **Pre-fight Gradus warning is now a popup**: carrying coin into battle triggers "A Heavy Purse" — fight anyway, or think better of it
- **Two-hour realm reminder**: after 2 hours in-game, a popup reminds you it's time to earn Gradus in the other realm (re-arms every 2 hours)
- **Deeper lore**: Oppidum quests expanded with full histories — when the trouble began, what it's doing, why the giver pays (Marta's grain barge, Calloway's autumn shearing, the Chief's ledger)
- **Rumor-locked hunts**: three quests (the Graveyard Shift, Lights in the Mist, and the Legend itself) now appear as "❓ A hunt not yet known" until you buy a round in the Inn's common room and hear the tale — the gravedigger, Wenna's cousin, and a hooded pilgrim each hold a key
- **Minimal medieval music**: a soft synthesized dorian lute loop with drone bass, no audio files; separate 🎵 toggle next to the sound toggle

## Alpha V1.8 — 2026-06-10
Lore, ventures, and duels you can see.
- **Renamed for simplicity**: Hospitium → **Inn**, Argentaria → **Bank** (zones keep their Latin names)
- **A world full of stories**: every quest now has a named giver and a full lore passage shown at quest prep — Marta of the Resting Boar, Reeve Ostric, Father Bede, Warden Yvet, the last druid Maelo, a nameless pilgrim… thirteen tales that tie Oppidum and Silva together (the Bandit Chief and the Greenwood Warlord are brothers; the Ancient Treant woke the walking saplings)
- **📜 Letters of Investment** at the Bank: seal Gradus into a venture for **+5% profit after 30 days** — untouchable until maturity, by you or by looters
- **Battle scenes**: every fight opens with an 8-bit duel — your armored hero facing the quest's monster (13 hand-drawn pixel sprites: rat, dire wolf, hooded bandits, spiders, the restless knight, trolls and treants, the boar, the wisp, and the golden-eyed First Wanderer)

## Alpha V1.7 — 2026-06-10
Quest-budget fixes, Woodsmith, the Forge, and a fair warning.
- **Fixed the confusing "Rest" state**: quests showing 😴 meant your 3 daily quest attempts were spent (not wounds). Label is now "Spent", the tavern explains it, and the **Hospitium rents rooms** (100 × level Gradus) that restore today's attempts — wounds still healed there too (25 × level, free if broke)
- **🏹 Woodsmith** (new shop): bows and staffs — Shortbow/Hunting Bow/Silvan Recurve [D], Oak/Runed/Heartwood [D] staffs
- **Blacksmith** now stocks crossbows (Light Crossbow, Arbalest [D]) and runs **the Forge**: upgrade any owned gear +1 to +5 (+4% per level, 15% of item price per level, gold only) — item names show their +level everywhere
- **Weapon affinity**: +10% ATK when your class wields its weapon — Knight: melee, Mage: staff, Archer: bow/crossbow, Cleric: staff/melee (shown in Skills)
- **Death warning**: quest prep now warns in red when you carry Gradus into a fight — bank it or risk it

## Alpha V1.6 — 2026-06-10
Death has a price. Sound, deeds, and two new buildings.
- **Death penalty**: fall in battle and looters take every Gradus in your purse; you wake wounded and cannot quest until you rest
- **🛏️ Hospitium** (inn): rest off your wounds for 25 × level Gradus — if you can't pay, the keeper takes pity
- **🏦 Argentaria** (bank): deposit/withdraw Gradus; the vault is untouchable by death — bank before bosses
- **Chiptune sound**: WebAudio-synthesized hits, potions, coins, level-ups, victory/defeat jingles, ability chimes — no audio files, mute toggle in the HUD
- **Deeds & Titles**: 11 achievements (sync milestones, streaks, bosses, wealth, dying) each unlocking a wearable title shown by your name — "Rodolfo the Devoted", "Rodolfo Trollsbane" — managed from the Stats window; earned retroactively from your save

## Alpha V1.5 — 2026-06-10
Dark medieval retheme, real class abilities, pixel iconography.
- **Theme overhaul** (Elden Ring / Witcher / Diablo / Mu inspiration): aged parchment text on near-black leather panels, double bronze borders, serif smallcaps headings with gold glow, ember/blood/moss accents — the sterile blue is gone
- **Class abilities are real**: one active per class usable in battle on cooldown — Knight 🛡️ Shield Wall (next hit halved), Mage 🔥 Fireball (2× damage, ignores armor), Archer 🏹 Double Shot, Cleric ⚕️ Mending Prayer (50% heal, no potion); shown in the Skills window with cooldowns
- **8-bit medieval icons** drawn in code (inline pixel SVG, dark palette): title crest (sword on shield), sealed scroll on the Ambulare Report, tavern mug, battle skull, and per-shop anvil/shield/flask
- **Board renamed to "Ambulare Report"** (ambulare — Latin, "to walk")

## Alpha V1.4 — 2026-06-10
Turn-based combat, living quests, MMORPG menus.
- **Combat is now turn-based**: choose Attack, drink a potion mid-fight, or Flee; every action gives the monster its turn. Potions moved from pre-battle prep into battle (prep keeps elixir + enchanting)
- **Monster traits** make fights tactical: ⚡Swift (strikes first), 🛡️Armored (your damage −25%), ☠️Venom (bleeds you each turn once bitten), 😡Frenzy (+50% ATK below 30% HP), 💚Regen (heals after acting)
- **Quest redesign** (Witcher/L2/Elden inspiration): every quest has a type tag (Hunt/Contract/Boss/Legend) and flavor text with tactical hints; new optional superboss "✠ Echo of the First Wanderer" (Legend) after clearing Silva — 2,000 XP, 20,000 Gradus, demands full prep including an enchanted weapon
- **Difficulty raised**: all monsters retuned and simulated for turn-based play — regular quests ~78–93% at expected gear, bosses ~70% with prep, the Legend ~76% only with everything
- **UI restructure**: Stats, Skills, and Inventory are separate windows on the top bar (MMORPG style); Character removed from the town menu; Courier Post renamed to **Board**
- New Skills window: class passive, weapon enchanting status, future ability slots

## Alpha V1.3 — 2026-06-10
Grid inventory, Latin zones, reward rework.
- Inventory rebuilt Mu Online / Diablo style: equipment paperdoll (weapon + armor boxes) above an 8-wide slot grid; items sit in boxes with icons, grade chips, and stack counts; click any box to inspect and equip from the detail bar
- Zones renamed in Latin: **Oppidum** (town) and **Silva** (forest) — quest board sections, shop locks, and boss messages updated
- Quest rewards reworked: first clear = full XP + Gradus; repeats = ½ XP only, no currency — except the ★ daily bonus quest, which still pays Gradus (currency now comes overwhelmingly from real steps)

## Alpha V1.2 — 2026-06-10
Character menu.
- New 🎒 Character screen: full stats (HP, ATK with equipped weapon, XP, streak bonus, quests cleared, lifetime steps/kcal, purse), owned weapons & armor with one-click equip, and potion satchel
- Reachable from the town menu and a persistent HUD button

## Alpha V1.1 — 2026-06-10
The Whispering Forest (Zone 2) + L2-style gear grades.
- New zone with 6 quests (Sprouting Treant → Ancient Treant boss), unlocked by defeating the Forest Troll
- Gear grade ladder begins: existing gear is No-grade; Forest introduces **D-grade** (3 weapons 85K–150K, 3 armors 80K–140K — each upgrade ≈ 2 days of active play with forest income); C/B/A/S reserved for future zones
- D-grade items show a gold [D] tag and stay locked in shops until the Forest opens
- Quest board now grouped by zone; balance simulated: every fight winnable at expected gear, zone boss requires potion + elixir prep
- Forest XP carries levels 10 → 16 in roughly a week of play

Versioning starts at **Alpha V1.0** (2026-06-10). Earlier development builds are recorded below as v0.x for history. Each future edit bumps the version (V1.1, V1.2, …) and gets an entry here. The in-game version is shown on the title screen and the town footer.

## Alpha V1.0 — 2026-06-10
Back to basics: click-based web build, declared the baseline.
- Removed the walkable canvas town and embedded sprite sheets; town is a click menu again
- Graphics development shelved until the game loop is proven (tileset build archived at `archive/gradus-v0.9-tileset-graphics.html`; tileset PNGs kept for later)
- Added version display (title screen + town footer) and this changelog
- Kept: full economy, shops, sync with 7-day back-entry and caps, auto-battle quests, XP/classes, streaks, daily bonus quest, loot drops, JRPG UI theme, saves

---

### Pre-versioning history (v0.x)

- **v0.8** — Single-file build: tileset PNGs embedded as base64
- **v0.7** — Retention layer: sync streak (+5%/day, cap +50%), rotating 3× daily bonus quest, battle loot drops (30% potion / 5% gem)
- **v0.6** — Real pixel art: CC0 "Zelda-like" tileset (ArMM1998), 20×14 town map, animated 4-direction hero & villager, painter-sorted occlusion
- **v0.5** — Art pass toward 8-Bit Adventures 2: pagoda roofs, cobblestones, cherry trees, river + bridge, wandering NPC
- **v0.4** — Top-down JRPG town (NES-res canvas) + full JRPG UI theme (navy panels, white double borders); walk-into-door entry
- **v0.3** — Isometric walkable town prototype (Diablo-style camera)
- **v0.2** — Combat layer: auto-resolved battles, prep screen (potions/elixir/enchant), 6 gated quests, 3 quests/day + stamina, XP/levels, class choice at level 10 (Knight/Mage/Archer/Cleric)
- **v0.1** — Skeleton: title/town/shops/tavern, dual-currency economy (1 step = 1 Gradus, 1 kcal = 1 Ries, Ries price = Gradus ÷ 5), manual sync via FitnessProvider interface, localStorage save + export/import
