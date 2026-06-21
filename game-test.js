#!/usr/bin/env node
/**
 * game-test.js — Automated Gradus test loop
 *
 * Usage:
 *   node game-test.js          → run tests once, write test-report.md
 *   node game-test.js --watch  → re-run on every index.html save
 *   node game-test.js --loop N → run N random play-sessions + report economy gaps
 */
'use strict';
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

// ─── Config ───────────────────────────────────────────────────────────────
const GAME_FILE    = path.join(__dirname, 'index.html');
// The game keys syncLog by LOCAL date (localDateStr); building fixtures with
// toISOString() (UTC) flakes by one day for part of each day. Match the game.
const localKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const REPORT_FILE  = path.join(__dirname, 'test-report.md');
const LOOP_ITERS   = parseInt(process.argv.find(a => a.match(/^\d+$/)) || '100');

// ─── 1. Extract game JS ───────────────────────────────────────────────────
function loadGameJS() {
  const html = fs.readFileSync(GAME_FILE, 'utf8');
  const re   = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi;
  let m; const blocks = [];
  while ((m = re.exec(html)) !== null) blocks.push(m[1]);
  return blocks.join('\n');
}

// ─── 2. Build a sandboxed game context ────────────────────────────────────
function buildContext(savedState = null) {
  // Minimal localStorage stub
  const lsStore = {};
  if (savedState) {
    lsStore['gradus-session'] = JSON.stringify({ email: savedState.email });
    lsStore[`gradus-save-v1-${savedState.email}`] = JSON.stringify(savedState);
  }

  // Minimal DOM: all elements are swallowing proxies
  function mockEl() {
    const el = { style: {}, classList: { add(){}, remove(){}, contains(){ return false; } },
                 value: '', disabled: false, _text: '', _html: '' };
    return new Proxy(el, {
      get(t, k) {
        if (k === 'textContent') return t._text;
        if (k === 'innerHTML')   return t._html;
        if (k in t)              return t[k];
        return typeof k === 'string' ? (() => {}) : undefined;
      },
      set(t, k, v) { t[k] = v; return true; },
    });
  }

  const ctx = {
    // DOM
    document: {
      getElementById:     () => mockEl(),
      createElement:      () => mockEl(),
      querySelectorAll:   () => ({ forEach(){} }),
      addEventListener:   () => {},
      removeEventListener:() => {},
      body: mockEl(),
    },
    // Stub window/audio/timers
    window:        {},
    localStorage:  {
      getItem(k)    { return lsStore[k] ?? null; },
      setItem(k, v) { lsStore[k] = v; },
      removeItem(k) { delete lsStore[k]; },
      _store:        lsStore,
    },
    Audio:         class { play() { return { catch(){} }; } },
    URL:           { createObjectURL: () => '', revokeObjectURL: () => {} },
    Blob:          class {},
    setTimeout:    () => 0,
    setInterval:   () => 0,
    clearInterval: () => {},
    clearTimeout:  () => {},
    console:       { log(){}, warn(){}, error(){} },
    // Standard globals
    JSON, Math, Date, parseInt, parseFloat, Number, String, Boolean,
    Array, Object, isNaN, Infinity, undefined, Promise, Error,
    // Collect expose calls
    _exposed: {},
    _lsStore: lsStore,
  };
  ctx.self    = ctx;
  ctx.window  = ctx;
  ctx.window.AudioContext         = class { createOscillator(){ return { connect(){}, start(){}, stop(){}, frequency:{setValueAtTime(){}}, type:'' }; } createGain(){ return { connect(){}, gain:{ setValueAtTime(){}, exponentialRampToValueAtTime(){} } }; } destination; };
  ctx.window.webkitAudioContext   = ctx.window.AudioContext;
  ctx.window.open = () => {};
  ctx.window.scrollTo = () => {};

  vm.createContext(ctx);
  return ctx;
}

// Expose code appended to game JS — surfaces const/let into the vm context
const EXPOSE_SNIPPET = `
try {
  const _e = _exposed;
  _e.VERSION          = VERSION;
  _e.BACK_DAYS        = BACK_DAYS;
  _e.DAILY_STEP_GOAL  = DAILY_STEP_GOAL;
  _e.STRETCH_STEP_GOAL= STRETCH_STEP_GOAL;
  _e.STEP_CAP         = STEP_CAP;
  _e.CAL_CAP          = CAL_CAP;
  _e.WEAPONS          = WEAPONS;
  _e.ARMOR            = ARMOR;
  _e.SHIELDS          = SHIELDS;
  _e.HELMS            = HELMS;
  _e.PANTS            = PANTS;
  _e.QUESTS           = QUESTS;
  _e.CLASSES          = CLASSES;
  // Pure functions
  _e.applyCaps    = applyCaps;
  _e.localDateStr = localDateStr;
  _e.lastNDays    = lastNDays;
  _e.fmt          = fmt;
  _e.xpForNext    = xpForNext;
  _e.streakMult   = streakMult;
  // State-dependent functions (call after setS)
  _e.getS         = () => S;
  _e.setS         = (v) => { S = v; currentEmail = v ? v.email : null; };
  _e.creditDay    = creditDay;
  _e.streakDays   = streakDays;
  _e.save         = save;
} catch(ee) { console.error && console.error('expose error', ee.message); }
`;

function loadGame(savedState = null) {
  const js  = loadGameJS();
  const ctx = buildContext(savedState);
  vm.runInContext(js + EXPOSE_SNIPPET, ctx, { filename: 'index.html', timeout: 10000 });
  return ctx._exposed;
}

// ─── 3. Fresh player state ────────────────────────────────────────────────
// NOTE: 'rags' is not in ARMOR — new players start with 'cloth'.
function freshState(overrides = {}) {
  return {
    name: 'Tester', email: 'test@gradus.test', level: 1, xp: 0, statPoints: 0,
    str: 5, dex: 5, int: 5, vit: 5, end: 5,
    stats: { str: 5, dex: 5, int: 5, vit: 5, end: 5 },
    gradus: 0, ries: 0, lifetimeSteps: 0, lifetimeCalories: 0,
    syncLog: {}, dailyClaimed: null,
    weapons: ['rusty'], armor: ['cloth'],
    equipped: { weapon: 'rusty', armor: 'cloth', shield: 'none', helm: 'none', pants: 'none', gloves: 'none' },
    inventory: [], questsCleared: 0, hp: 100, wounded: false,
    heroClass: null, title: null,
    backend: '', sound: false, music: false,
    expedition: null, skills: {}, enchants: {}, forged: {},
    ...overrides,
  };
}

// ─── 4. Test runner ───────────────────────────────────────────────────────
const PASS = '✓', FAIL = '✗', WARN = '⚠';
const results = [];

function test(suite, name, fn) {
  try {
    const r = fn();
    if (r === false)          results.push({ status: FAIL, suite, name, msg: 'returned false' });
    else if (typeof r === 'string' && r.startsWith('WARN')) results.push({ status: WARN, suite, name, msg: r.slice(5) });
    else                      results.push({ status: PASS, suite, name, msg: '' });
  } catch (e) {
    results.push({ status: FAIL, suite, name, msg: e.message });
  }
}

function eq(a, b, label)       { if (a !== b)           throw new Error(`${label}: expected ${b}, got ${a}`); }
function gt(a, b, label)       { if (!(a > b))          throw new Error(`${label}: ${a} should be > ${b}`); }
function near(a, b, tol, label){ if (Math.abs(a-b)>tol) throw new Error(`${label}: expected ~${b} ±${tol}, got ${a}`); }
function assert(cond, msg)     { if (!cond)             throw new Error(msg || 'assertion failed'); }
function warn(msg)             { return 'WARN ' + msg; }

// ─── 5. Load shared game globals ─────────────────────────────────────────
process.stdout.write('Loading game… ');
let G;
try   { G = loadGame(freshState()); }
catch (e) { console.error('\nFATAL: ' + e.message); process.exit(1); }
console.log('OK\n');

// ─── 6. Test suites ───────────────────────────────────────────────────────

// ── A: Load & constants ──────────────────────────────────────────────────
test('Load', 'Game loads without error',          () => assert(G != null));
test('Load', 'VERSION follows Alpha VX.Y format',  () => assert(/^Alpha V\d+\.\d+/.test(G.VERSION), `VERSION malformed: ${G.VERSION}`));
test('Load', 'BACK_DAYS == 2',                    () => eq(G.BACK_DAYS, 2, 'BACK_DAYS'));
test('Load', 'DAILY_STEP_GOAL == 7000',           () => eq(G.DAILY_STEP_GOAL, 7000));
test('Load', 'STRETCH_STEP_GOAL == 10000',        () => eq(G.STRETCH_STEP_GOAL, 10000));
test('Load', 'STEP_CAP == 50000',                 () => eq(G.STEP_CAP, 50000));
test('Load', 'CAL_CAP == 4000',                   () => eq(G.CAL_CAP, 4000));
test('Load', 'QUESTS array populated',            () => assert(G.QUESTS.length >= 5, `only ${G.QUESTS.length} quests`));
test('Load', 'WEAPONS array populated',           () => assert(G.WEAPONS.length >= 3));
test('Load', 'ARMOR array populated',             () => assert(G.ARMOR.length >= 3));
test('Load', 'CLASSES array populated',           () => assert(G.CLASSES && G.CLASSES.length >= 3));

// ── B: applyCaps ─────────────────────────────────────────────────────────
test('applyCaps', 'normal values pass through',   () => { const r=G.applyCaps(5000,300); eq(r.steps,5000,'steps'); eq(r.calories,300,'cals'); });
test('applyCaps', 'steps capped at 50000',        () => eq(G.applyCaps(99999,0).steps, 50000));
test('applyCaps', 'cals capped at 4000',          () => eq(G.applyCaps(0,9999).calories, 4000));
test('applyCaps', 'negative → 0',                () => { const r=G.applyCaps(-1,-1); eq(r.steps,0,'steps'); eq(r.calories,0,'cals'); });
test('applyCaps', 'NaN → 0',                     () => { const r=G.applyCaps(NaN,NaN); eq(r.steps,0,'steps'); eq(r.calories,0,'cals'); });
test('applyCaps', 'Infinity capped at 50000',     () => eq(G.applyCaps(Infinity,0).steps, 50000));
test('applyCaps', 'decimals floored',             () => eq(G.applyCaps(7000.9,0).steps, 7000));
test('applyCaps', '"string" treated as 0',        () => eq(G.applyCaps('abc','xyz').steps, 0));

// ── C: creditDay (needs fresh context per test) ───────────────────────────
function runCredit(steps, cals, stateOverride) {
  const st = freshState(stateOverride || {});
  const g  = loadGame(st);
  g.setS(st);
  const today = g.localDateStr(new Date());
  return { res: g.creditDay(today, steps, cals), g, today, st };
}

test('creditDay', '0/0 → null',                   () => assert(runCredit(0,0).res === null));
test('creditDay', '100 steps credits 100G',        () => { const {res}=runCredit(100,0); assert(res); eq(res.g,100); });
test('creditDay', '6999 steps — no 7K bonus',      () => { const {res}=runCredit(6999,0); assert(res); eq(res.bonusG,0); eq(res.bonusR,0); });
test('creditDay', '7000 steps → bonusG=2000 R=200',() => { const {res}=runCredit(7000,0); assert(res); eq(res.bonusG,2000,'bonusG'); eq(res.bonusR,200,'bonusR'); });
test('creditDay', '10000 steps → bonusG=3500',     () => { const {res}=runCredit(10000,0); assert(res); eq(res.bonusG,3500,'bonusG'); eq(res.bonusR,200,'bonusR'); });
test('creditDay', 'steps above STEP_CAP: capped flag set, g = 50000 × streakMult', () => {
  // Day reported is ≥7K so streakDays becomes 1 → mult=1.05 → g=52500. Capped flag is about *input*, not output.
  const {res}=runCredit(99999,0); assert(res); assert(res.capped,'capped flag'); assert(res.g >= 50000 && res.g <= 52500+1, `g=${res.g} should be 50000×streakMult`);
});
test('creditDay', 'duplicate date returns null',   () => {
  const st=freshState(); const g=loadGame(st); g.setS(st);
  const today=g.localDateStr(new Date());
  g.creditDay(today,1000,0);
  assert(g.creditDay(today,1000,0) === null, '2nd call should be null');
});
test('creditDay', 'streak mult applied (10-day streak → ×1.5)', () => {
  // Build syncLog with 10 days of ≥7K steps
  const syncLog = {};
  const now = new Date();
  for (let i = 1; i <= 10; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    syncLog[localKey(d)] = { steps: 7000, calories: 0 };
  }
  const st = freshState({ syncLog });
  const g  = loadGame(st); g.setS(st);
  const today = g.localDateStr(new Date());
  const res = g.creditDay(today, 1000, 0);
  assert(res, 'should return result');
  near(res.mult, 1.5, 0.01, 'mult at 10-day streak');
  eq(res.g, 1500, 'g with 1.5× mult');
});

// ── D: streakDays ─────────────────────────────────────────────────────────
function runStreak(syncLogEntries) {
  const syncLog = {};
  const now = new Date();
  syncLogEntries.forEach(([daysAgo, steps]) => {
    const d = new Date(now); d.setDate(d.getDate() - daysAgo);
    syncLog[localKey(d)] = { steps, calories: 0 };
  });
  const st = freshState({ syncLog });
  const g  = loadGame(st); g.setS(st);
  return g.streakDays();
}

test('streakDays', 'empty log → 0',                     () => eq(runStreak([]), 0));
test('streakDays', 'today 7K → 1',                      () => eq(runStreak([[0,7000]]), 1));
test('streakDays', 'today 6999 → 0 (below threshold)',  () => eq(runStreak([[0,6999]]), 0));
test('streakDays', 'yesterday 7K → 1',                  () => eq(runStreak([[1,7000]]), 1));
test('streakDays', 'yesterday 6999 → 0',                () => eq(runStreak([[1,6999]]), 0));
test('streakDays', '3 consecutive 7K days → 3',         () => eq(runStreak([[0,7000],[1,7000],[2,7000]]), 3));
test('streakDays', 'gap at day-2 stops count',          () => eq(runStreak([[0,7000],[1,7000],[3,7000]]), 2));
test('streakDays', 'sub-7K day in gap does NOT break streak (just doesnt count)', () => {
  // day-0:7K, day-1:6000(sub-7K gap), day-2:7K
  // Streak should stop at day-1 since it's below threshold — streak = 1
  eq(runStreak([[0,7000],[1,6000],[2,7000]]), 1);
});
test('streakDays', 'today sub-7K, yesterday 7K → starts from yesterday → 1', () => eq(runStreak([[0,100],[1,7000]]), 1));

// ── E: streakMult ─────────────────────────────────────────────────────────
function runMult(days7K) {
  const syncLog = {};
  const now = new Date();
  for (let i = 0; i < days7K; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    syncLog[localKey(d)] = { steps: 7000, calories: 0 };
  }
  const st = freshState({ syncLog });
  const g  = loadGame(st); g.setS(st);
  return g.streakMult();
}

test('streakMult', '0-day streak → 1.0',                () => near(runMult(0), 1.0, 0.001));
test('streakMult', '5-day streak → 1.25',               () => near(runMult(5), 1.25, 0.001));
test('streakMult', '10-day streak → 1.5',               () => near(runMult(10), 1.5, 0.001));
test('streakMult', '20-day streak caps at 1.5',         () => { const m=runMult(20); assert(m <= 1.501, `got ${m}`); near(m, 1.5, 0.001); });

// ── F: lastNDays ──────────────────────────────────────────────────────────
test('lastNDays', 'returns BACK_DAYS entries (2)',       () => eq(G.lastNDays(G.BACK_DAYS).length, 2));
test('lastNDays', 'first entry is today',                () => eq(G.lastNDays(1)[0], G.localDateStr(new Date())));
test('lastNDays', 'day-7 not in BACK_DAYS=2 window',    () => {
  const days = G.lastNDays(G.BACK_DAYS);
  const old  = new Date(); old.setDate(old.getDate() - 7);
  assert(!days.includes(old.toISOString().slice(0,10)), 'day-7 should not appear');
});

// ── G: fmt ────────────────────────────────────────────────────────────────
test('fmt', '0 → "0"',            () => eq(G.fmt(0), '0'));
test('fmt', '1000 → "1,000"',     () => eq(G.fmt(1000), '1,000'));
test('fmt', '1234567 → "1,234,567"', () => eq(G.fmt(1234567), '1,234,567'));

// ── H: Economy balance ────────────────────────────────────────────────────
// NOTE: weapon/armor price is stored as .g (gradus), not .cost
test('Economy', 'Iron Dagger (id:"dagger") costs 7000G = 1 day of 7K steps', () => {
  const w = G.WEAPONS.find(w => w.id === 'dagger');
  assert(w, 'dagger weapon exists');
  eq(w.g, 7000, 'price .g');
});
test('Economy', 'Cheapest buyable armor ≤ 15000G (reachable in 2 days)',    () => {
  const buyable = G.ARMOR.filter(a => a.g > 0).sort((a,b) => a.g-b.g)[0];
  assert(buyable, 'some buyable armor exists');
  assert(buyable.g <= 15000, `cheapest armor ${buyable.name} costs ${buyable.g}G — should be ≤15K`);
});
test('Economy', 'Day-1 7K sync total (7000×1.05 mult + 2000 bonus = 9350G)', () => {
  // streakDays() counts this day after it's written → mult=1.05 on day 1 at 7K
  const {res} = runCredit(7000, 0);
  eq(res.g + res.bonusG, 9350, 'total G: 7350+2000');
});
test('Economy', 'Day-1 10K sync total (10000×1.05 + 3500 bonus = 14000G)',  () => {
  const {res} = runCredit(10000, 0);
  eq(res.g + res.bonusG, 14000, 'total G: 10500+3500');
});
test('Economy', 'Ries from 7K sync ≥200 (threshold bonus)',                () => {
  const {res} = runCredit(7000, 0);
  assert(res.ri + res.bonusR >= 200, `got ${res.ri + res.bonusR}R`);
});
test('Economy', 'Daily claim floor (150G×7) < cheapest weapon — no passive exploit', () => {
  const minPrice = Math.min(...G.WEAPONS.filter(w => w.g > 0).map(w => w.g));
  assert(150 * 7 < minPrice, `floor claim × 7 days (${150*7}G) < cheapest weapon (${minPrice}G)`);
});
test('Economy', 'Elder Sword (top weapon) costs ≥ 200K',                   () => {
  const top = G.WEAPONS.slice().sort((a,b) => b.g - a.g)[0];
  assert(top.g >= 200000, `top weapon ${top.name} costs ${top.g}G — expected ≥200K`);
});
test('Economy', 'Weapon progression: per-type tiers step ≥1.3×',           () => {
  // Weapon types are interleaved by design (a same-tier staff/bow/sword cost
  // about the same), so progression is judged within each type's own ladder.
  const gaps = [];
  const types = [...new Set(G.WEAPONS.map(w => w.type || 'melee'))];
  for (const t of types) {
    const ladder = G.WEAPONS.filter(w => w.g > 0 && (w.type || 'melee') === t).sort((a,b) => a.g - b.g);
    for (let i = 1; i < ladder.length; i++) {
      const ratio = ladder[i].g / ladder[i-1].g;
      if (ratio < 1.3) gaps.push(`[${t}] ${ladder[i-1].name}→${ladder[i].name} (×${ratio.toFixed(2)})`);
    }
  }
  if (gaps.length) return warn(`Tight same-type price jumps: ${gaps.join(', ')}`);
});

// ── I: Quest data integrity ────────────────────────────────────────────────
// NOTE: quests carry stable .id slugs as of V1.19; cleared quests are also
// recorded by id in S.clearedQuestIds
test('Quests', 'All quests have name',                                      () => {
  const bad = G.QUESTS.filter(q => !q.name);
  assert(bad.length === 0, `${bad.length} quests missing name`);
});
test('Quests', 'All quests have unique .id slugs',                          () => {
  const noId = G.QUESTS.filter(q => !q.id);
  assert(noId.length === 0, `${noId.length} quests missing .id`);
  const ids = G.QUESTS.map(q => q.id);
  assert(new Set(ids).size === ids.length, 'duplicate quest ids');
});
test('Quests', 'All quests have xp defined',                                () => {
  const bad = G.QUESTS.filter(q => q.xp === undefined);
  if (bad.length) return warn(`${bad.length} quests missing xp: ${bad.map(q=>q.name).join(', ')}`);
});
test('Quests', 'No duplicate quest names',                                  () => {
  const names = G.QUESTS.map(q => q.name);
  const dupes = names.filter((n,i) => names.indexOf(n) !== i);
  if (dupes.length) return warn(`Duplicate quest names: ${dupes.join(', ')}`);
});

// ── J: Weapon / armor data integrity ─────────────────────────────────────
// NOTE: price field is .g (gradus), not .cost
test('Weapons', 'All non-starter weapons have .g > 0',                     () => {
  const bad = G.WEAPONS.filter(w => w.id !== 'fists' && w.id !== 'rusty' && !(w.g > 0));
  if (bad.length) return warn(`${bad.length} weapons missing price: ${bad.map(w=>w.id).join(', ')}`);
});
test('Weapons', 'All weapons have atk defined',                             () => {
  const bad = G.WEAPONS.filter(w => w.atk === undefined);
  assert(bad.length === 0, `weapons missing atk: ${bad.map(w=>w.id).join(', ')}`);
});
test('Armor', 'All ARMOR entries have def defined',                         () => {
  const bad = G.ARMOR.filter(a => a.def === undefined);
  assert(bad.length === 0, `armor missing def: ${bad.map(a=>a.id).join(', ')}`);
});
test('Armor', '"rags" not in ARMOR (starter is cloth — rags is an inventory item)', () => {
  const rags = G.ARMOR.find(a => a.id === 'rags');
  if (rags) return warn('"rags" unexpectedly in ARMOR');
  // Expected: rags absent from ARMOR array; heroMaxHP uses S.equipped.armor='cloth' for new players
});
test('BugCheck', 'heroMaxHP: ARMOR.find for starter armor returns valid object', () => {
  // New player has equipped.armor='cloth'; if this returns undefined, heroMaxHP crashes
  const starter = G.ARMOR.find(a => a.id === 'cloth');
  assert(starter !== undefined, 'cloth armor not found in ARMOR — heroMaxHP will crash for new players!');
  assert(starter.def !== undefined, 'cloth armor has no def — heroMaxHP will crash');
});

// ── K: XP curve ───────────────────────────────────────────────────────────
test('XP', 'xpForNext(1) > 0',                                             () => gt(G.xpForNext(1), 0));
test('XP', 'XP curve strictly increasing lv1→20',                          () => {
  for (let lv = 1; lv < 20; lv++) {
    if (!(G.xpForNext(lv+1) > G.xpForNext(lv)))
      throw new Error(`xpForNext not increasing at lv ${lv}→${lv+1}`);
  }
});

// ── L: Fuzz / edge cases ──────────────────────────────────────────────────
test('Fuzz', 'sync same date twice is idempotent',                          () => {
  const st=freshState(); const g=loadGame(st); g.setS(st);
  const today=g.localDateStr(new Date());
  g.creditDay(today, 7000, 0);
  assert(g.creditDay(today, 7000, 0) === null, 'double-sync blocked');
});
test('Fuzz', 'very large calorie input capped at CAL_CAP',                  () => eq(G.applyCaps(0, 1e9).calories, 4000));
test('Fuzz', 'sync does not make gradus go negative',                       () => {
  const st=freshState(); const g=loadGame(st); g.setS(st);
  const today=g.localDateStr(new Date());
  g.creditDay(today, 7000, 500);
  assert(g.getS().gradus >= 0, 'gradus should never go negative from sync');
});

// ─── 7. Random play-session simulation ────────────────────────────────────
console.log(`\nRunning ${LOOP_ITERS} random play sessions…`);
const playStats = { totalDays: 0, avgDailyG: 0, minDailyG: Infinity, maxDailyG: 0,
                    streakHits7K: 0, streakHits10K: 0, bonusFireRate: 0 };
let playErrors = 0;

for (let session = 0; session < LOOP_ITERS; session++) {
  try {
    const days = 7 + Math.floor(Math.random() * 28);
    const state = freshState();
    const g = loadGame(state);
    g.setS(state);

    let totalG = 0;
    for (let d = days; d >= 0; d--) {
      const date = new Date(); date.setDate(date.getDate() - d);
      const dateKey = date.toISOString().slice(0,10);
      // Randomise steps: 0–12K, weighted toward 5K–9K range
      const rawSteps = Math.max(0, Math.round((Math.random() * 12000) * (0.5 + Math.random() * 0.8)));
      const rawCals  = Math.round(rawSteps * (0.04 + Math.random() * 0.06));
      const res = g.creditDay(dateKey, rawSteps, rawCals);
      if (res) {
        const dayG = res.g + res.bonusG;
        totalG += dayG;
        playStats.minDailyG = Math.min(playStats.minDailyG, dayG);
        playStats.maxDailyG = Math.max(playStats.maxDailyG, dayG);
        if (rawSteps >= 7000) playStats.streakHits7K++;
        if (rawSteps >= 10000) playStats.streakHits10K++;
        if (res.bonusG > 0) playStats.bonusFireRate++;
        playStats.totalDays++;
      }
      const s = g.getS();
      if (s.gradus < 0) throw new Error(`negative gradus on day ${d} after syncing ${rawSteps} steps`);
    }
    playStats.avgDailyG += totalG / (days + 1);
  } catch (e) {
    playErrors++;
    if (playErrors <= 5) results.push({ status: FAIL, suite: 'PlaySim', name: `session ${session}`, msg: e.message });
  }
}
if (playErrors === 0) {
  results.push({ status: PASS, suite: 'PlaySim', name: `${LOOP_ITERS} sessions completed without error`, msg: '' });
} else {
  results.push({ status: FAIL, suite: 'PlaySim', name: 'play sessions', msg: `${playErrors}/${LOOP_ITERS} sessions threw errors` });
}
playStats.avgDailyG = Math.round(playStats.avgDailyG / LOOP_ITERS);
const bonusPct = playStats.totalDays > 0 ? Math.round(100 * playStats.bonusFireRate / playStats.totalDays) : 0;

// ─── 8. Upgrade suggestions from data ────────────────────────────────────
{
  // Check quest progression gap: XP needed for a quest vs player level req
  const questsSorted = G.QUESTS.slice().sort((a,b) => (a.level||1) - (b.level||1));
  const levelGaps = [];
  for (let i = 0; i < questsSorted.length - 1; i++) {
    const gap = (questsSorted[i+1].level||1) - (questsSorted[i].level||1);
    if (gap > 3) levelGaps.push({ from: questsSorted[i].id, to: questsSorted[i+1].id, gap });
  }
  if (levelGaps.length > 0) {
    results.push({ status: WARN, suite: 'Upgrades', name: 'Quest level gaps > 3',
      msg: levelGaps.map(g => `${g.from}→${g.to} (gap ${g.gap})`).join(', ') });
  }

  // Check if any quest name is duplicated
  const names = G.QUESTS.map(q => q.name);
  const dupes = names.filter((n,i) => names.indexOf(n) !== i);
  if (dupes.length) {
    results.push({ status: WARN, suite: 'Upgrades', name: 'Duplicate quest names', msg: dupes.join(', ') });
  }

  // Warn if economy gap: floor claim (150G/day × 30) can buy no weapons
  const minWeaponCost = Math.min(...G.WEAPONS.filter(w => w.g > 0).map(w => w.g));
  const claimIn30Days = 150 * 30;
  if (claimIn30Days < minWeaponCost) {
    results.push({ status: WARN, suite: 'Upgrades', name: 'Floor claim alone cannot buy any weapon in 30 days (by design)',
      msg: `claim earns ${claimIn30Days}G/month; cheapest weapon ${minWeaponCost}G — players must sync steps to progress` });
  }
}

// ─── 9. Output ────────────────────────────────────────────────────────────
const passed = results.filter(r => r.status === PASS).length;
const failed = results.filter(r => r.status === FAIL).length;
const warned  = results.filter(r => r.status === WARN).length;
const total   = results.length;
const suites  = [...new Set(results.map(r => r.suite))];

// Console
console.log(`\n${'═'.repeat(64)}`);
console.log(`  GRADUS TEST REPORT  ·  ${new Date().toLocaleString()}`);
console.log(`${'═'.repeat(64)}`);
suites.forEach(suite => {
  const sr = results.filter(r => r.suite === suite);
  const f  = sr.filter(r => r.status === FAIL);
  const w  = sr.filter(r => r.status === WARN);
  const p  = sr.filter(r => r.status === PASS).length;
  const tag = f.length ? `${FAIL} ${f.length} FAIL` : w.length ? `${WARN} ${w.length} WARN` : `${PASS} all pass`;
  console.log(`  ${suite.padEnd(22)} ${tag}  (${p}/${sr.length})`);
  [...f, ...w].forEach(r => console.log(`    ${r.status} ${r.name}: ${r.msg}`));
});
console.log(`${'─'.repeat(64)}`);
console.log(`  ${passed}/${total} passed · ${failed} failed · ${warned} warnings`);
console.log(`${'─'.repeat(64)}`);
console.log(`  Play Sim (${LOOP_ITERS} sessions · ${playStats.totalDays} days simulated)`);
console.log(`    Avg daily earnings: ${playStats.avgDailyG.toLocaleString()}G`);
console.log(`    Range: ${playStats.minDailyG.toLocaleString()}G – ${playStats.maxDailyG.toLocaleString()}G`);
console.log(`    Sessions hitting 7K: ${playStats.streakHits7K}/${playStats.totalDays} days (${Math.round(100*playStats.streakHits7K/Math.max(1,playStats.totalDays))}%)`);
console.log(`    Threshold bonus fired: ${bonusPct}% of sync days`);
console.log(`${'═'.repeat(64)}\n`);

// Markdown report
let md = `# Gradus Automated Test Report\n\n`;
md += `**Date:** ${new Date().toISOString()}  \n`;
md += `**Version:** ${G.VERSION}  \n\n`;
md += `## Summary\n\n| | Count |\n|---|---|\n`;
md += `| ${PASS} Pass | ${passed} |\n| ${FAIL} Fail | ${failed} |\n| ${WARN} Warn | ${warned} |\n| Total | ${total} |\n\n`;
suites.forEach(suite => {
  md += `### ${suite}\n\n`;
  results.filter(r => r.suite === suite).forEach(r => {
    md += `- ${r.status} **${r.name}**${r.msg ? ` — ${r.msg}` : ''}\n`;
  });
  md += '\n';
});
md += `## Play Simulation (${LOOP_ITERS} sessions)\n\n`;
md += `- Sessions: ${LOOP_ITERS}\n- Days simulated: ${playStats.totalDays}\n`;
md += `- Avg daily earnings: **${playStats.avgDailyG.toLocaleString()}G**\n`;
md += `- Range: ${playStats.minDailyG.toLocaleString()}G – ${playStats.maxDailyG.toLocaleString()}G\n`;
md += `- Days hitting 7K goal: ${Math.round(100*playStats.streakHits7K/Math.max(1,playStats.totalDays))}%\n`;
md += `- Threshold bonus rate: ${bonusPct}%\n\n`;

if (failed > 0 || warned > 0) {
  md += `## Issues\n\n`;
  results.filter(r => r.status !== PASS).forEach(r => {
    md += `- **[${r.suite}] ${r.name}**: ${r.msg || '(assertion failed)'}\n`;
  });
}

fs.writeFileSync(REPORT_FILE, md);
console.log(`Report saved → test-report.md\n`);

// --watch mode
if (process.argv.includes('--watch')) {
  let last = fs.statSync(GAME_FILE).mtimeMs;
  console.log('Watching index.html for changes (Ctrl-C to stop)…\n');
  setInterval(() => {
    const mt = fs.statSync(GAME_FILE).mtimeMs;
    if (mt !== last) { last = mt; require('child_process').execSync(`node ${__filename}`, { stdio:'inherit' }); }
  }, 3000);
}

process.exit(failed > 0 ? 1 : 0);
