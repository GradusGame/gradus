# Gradus Automated Test Report

**Date:** 2026-06-12T17:37:13.730Z  
**Version:** Alpha V1.21  

## Summary

| | Count |
|---|---|
| ✓ Pass | 69 |
| ✗ Fail | 0 |
| ⚠ Warn | 1 |
| Total | 70 |

### Load

- ✓ **Game loads without error**
- ✓ **VERSION follows Alpha VX.Y format**
- ✓ **BACK_DAYS == 2**
- ✓ **DAILY_STEP_GOAL == 7000**
- ✓ **STRETCH_STEP_GOAL == 10000**
- ✓ **STEP_CAP == 50000**
- ✓ **CAL_CAP == 4000**
- ✓ **QUESTS array populated**
- ✓ **WEAPONS array populated**
- ✓ **ARMOR array populated**
- ✓ **CLASSES array populated**

### applyCaps

- ✓ **normal values pass through**
- ✓ **steps capped at 50000**
- ✓ **cals capped at 4000**
- ✓ **negative → 0**
- ✓ **NaN → 0**
- ✓ **Infinity capped at 50000**
- ✓ **decimals floored**
- ✓ **"string" treated as 0**

### creditDay

- ✓ **0/0 → null**
- ✓ **100 steps credits 100G**
- ✓ **6999 steps — no 7K bonus**
- ✓ **7000 steps → bonusG=2000 R=200**
- ✓ **10000 steps → bonusG=3500**
- ✓ **steps above STEP_CAP: capped flag set, g = 50000 × streakMult**
- ✓ **duplicate date returns null**
- ✓ **streak mult applied (10-day streak → ×1.5)**

### streakDays

- ✓ **empty log → 0**
- ✓ **today 7K → 1**
- ✓ **today 6999 → 0 (below threshold)**
- ✓ **yesterday 7K → 1**
- ✓ **yesterday 6999 → 0**
- ✓ **3 consecutive 7K days → 3**
- ✓ **gap at day-2 stops count**
- ✓ **sub-7K day in gap does NOT break streak (just doesnt count)**
- ✓ **today sub-7K, yesterday 7K → starts from yesterday → 1**

### streakMult

- ✓ **0-day streak → 1.0**
- ✓ **5-day streak → 1.25**
- ✓ **10-day streak → 1.5**
- ✓ **20-day streak caps at 1.5**

### lastNDays

- ✓ **returns BACK_DAYS entries (2)**
- ✓ **first entry is today**
- ✓ **day-7 not in BACK_DAYS=2 window**

### fmt

- ✓ **0 → "0"**
- ✓ **1000 → "1,000"**
- ✓ **1234567 → "1,234,567"**

### Economy

- ✓ **Iron Dagger (id:"dagger") costs 7000G = 1 day of 7K steps**
- ✓ **Cheapest buyable armor ≤ 15000G (reachable in 2 days)**
- ✓ **Day-1 7K sync total (7000×1.05 mult + 2000 bonus = 9350G)**
- ✓ **Day-1 10K sync total (10000×1.05 + 3500 bonus = 14000G)**
- ✓ **Ries from 7K sync ≥200 (threshold bonus)**
- ✓ **Daily claim floor (150G×7) < cheapest weapon — no passive exploit**
- ✓ **Elder Sword (top weapon) costs ≥ 200K**
- ✓ **Weapon progression: per-type tiers step ≥1.3×**

### Quests

- ✓ **All quests have name**
- ✓ **All quests have unique .id slugs**
- ✓ **All quests have xp defined**
- ✓ **No duplicate quest names**

### Weapons

- ✓ **All non-starter weapons have .g > 0**
- ✓ **All weapons have atk defined**

### Armor

- ✓ **All ARMOR entries have def defined**
- ✓ **"rags" not in ARMOR (starter is cloth — rags is an inventory item)**

### BugCheck

- ✓ **heroMaxHP: ARMOR.find for starter armor returns valid object**

### XP

- ✓ **xpForNext(1) > 0**
- ✓ **XP curve strictly increasing lv1→20**

### Fuzz

- ✓ **sync same date twice is idempotent**
- ✓ **very large calorie input capped at CAL_CAP**
- ✓ **sync does not make gradus go negative**

### PlaySim

- ✓ **100 sessions completed without error**

### Upgrades

- ⚠ **Floor claim alone cannot buy any weapon in 30 days (by design)** — claim earns 4500G/month; cheapest weapon 7000G — players must sync steps to progress

## Play Simulation (100 sessions)

- Sessions: 100
- Days simulated: 2144
- Avg daily earnings: **6,362G**
- Range: 1G – 19,407G
- Days hitting 7K goal: 33%
- Threshold bonus rate: 33%

## Issues

- **[Upgrades] Floor claim alone cannot buy any weapon in 30 days (by design)**: claim earns 4500G/month; cheapest weapon 7000G — players must sync steps to progress
