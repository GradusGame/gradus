/* Gradus device-sync + account worker (Cloudflare Workers)
   Push-based fitness sync — works with any device via iPhone Shortcut
   Endpoints:
     POST /push  {uid, date, steps, calories} -> {ok}   (called by iPhone Shortcut)
     GET  /activity?uid=xxx&days=7            -> [{date, steps, calories}, …]
     POST /signup  {email, password}          -> {token}
     POST /login   {email, password}          -> {token}
     POST /save    (Bearer token, body=JSON)  -> {ok}
     GET  /load    (Bearer token)             -> save JSON

   No secrets required — push endpoint is open, keyed by per-user uid.
*/
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type,authorization',
};
const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'content-type': 'application/json' } });

async function sha(text) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function authedEmail(req, env) {
  const tok = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  return tok ? env.KV.get('tok:' + tok) : null;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response('', { headers: CORS });

    // ── Push fitness data (called by iPhone Shortcut / any automation) ───────
    // POST /push  body: { uid, date, steps, calories }
    if (url.pathname === '/push' && req.method === 'POST') {
      // basic shape validation to keep junk out of KV
      let body;
      try { body = await req.json(); } catch { return json({ error: 'invalid json' }, 400); }
      const { uid, date, steps, calories } = body;
      if (!uid || !date) return json({ error: 'uid and date required' }, 400);
      if (typeof uid !== 'string' || uid.length < 8 || uid.length > 64) return json({ error: 'bad uid' }, 400);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'bad date' }, 400);

      const key = `act:${uid}:${date}`;
      const prev = JSON.parse((await env.KV.get(key)) || '{"steps":0,"calories":0}');
      await env.KV.put(key, JSON.stringify({
        steps:    Math.min(100000, Math.max(prev.steps    || 0, Number(steps)    || 0)),
        calories: Math.min(10000,  Math.max(prev.calories || 0, Number(calories) || 0)),
      }), { expirationTtl: 60 * 60 * 24 * 45 }); // keep 45 days
      return json({ ok: true });
    }

    // ── Activity feed ─────────────────────────────────────────────────────────
    // GET /activity?uid=xxx&days=7
    if (url.pathname === '/activity') {
      const uid  = url.searchParams.get('uid');
      const days = Math.min(14, Number(url.searchParams.get('days')) || 7);
      if (!uid) return json({ error: 'uid required' }, 400);
      const out = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const date = d.toISOString().slice(0, 10);
        const v = await env.KV.get(`act:${uid}:${date}`);
        if (v) out.push({ date, ...JSON.parse(v) });
      }
      return json(out);
    }

    // ── Accounts ─────────────────────────────────────────────────────────────
    if (url.pathname === '/signup' && req.method === 'POST') {
      const { email, password } = await req.json().catch(() => ({}));
      if (!email || !password || password.length < 6)
        return json({ error: 'Email + password (6+ chars) required.' }, 400);
      const key = 'user:' + email.toLowerCase().trim();
      if (await env.KV.get(key)) return json({ error: 'Account already exists.' }, 409);
      const salt = crypto.randomUUID();
      await env.KV.put(key, JSON.stringify({ salt, hash: await sha(salt + password) }));
      const token = crypto.randomUUID();
      await env.KV.put('tok:' + token, email.toLowerCase().trim());
      return json({ token });
    }

    if (url.pathname === '/login' && req.method === 'POST') {
      const { email, password } = await req.json().catch(() => ({}));
      const u = JSON.parse((await env.KV.get('user:' + (email || '').toLowerCase().trim())) || 'null');
      if (!u || u.hash !== await sha(u.salt + password))
        return json({ error: 'Wrong email or password.' }, 401);
      const token = crypto.randomUUID();
      await env.KV.put('tok:' + token, email.toLowerCase().trim());
      return json({ token });
    }

    if (url.pathname === '/save' && req.method === 'POST') {
      const email = await authedEmail(req, env);
      if (!email) return json({ error: 'Not logged in.' }, 401);
      const body = await req.text();
      if (body.length > 200000) return json({ error: 'Save too large.' }, 413);
      await env.KV.put('save:' + email, body);
      return json({ ok: true });
    }

    if (url.pathname === '/load') {
      const email = await authedEmail(req, env);
      if (!email) return json({ error: 'Not logged in.' }, 401);
      const v = await env.KV.get('save:' + email);
      return v
        ? new Response(v, { headers: { ...CORS, 'content-type': 'application/json' } })
        : json({ error: 'No cloud save yet.' }, 404);
    }

    // ── Leaderboard (GET /leaderboard) — top wanderers by lifetime steps ─────
    if (url.pathname === '/leaderboard') {
      const saveList = await env.KV.list({ prefix: 'save:' });
      const rows = [];
      for (const k of saveList.keys.slice(0, 200)) {
        try {
          const s = JSON.parse(await env.KV.get(k.name));
          if (s && s.name) rows.push({
            name: s.name, title: s.title || '', level: s.level || 1,
            steps: s.lifetimeSteps || 0, quests: s.questsCleared || 0,
          });
        } catch {}
      }
      rows.sort((a, b) => b.steps - a.steps);
      return json(rows.slice(0, 20));
    }

    // ── Analytics events (POST /events) ───────────────────────────────────────
    if (url.pathname === '/events' && req.method === 'POST') {
      let body;
      try { body = await req.json(); } catch { return json({ ok: true }); }
      const { uid, events } = body;
      if (!uid || !Array.isArray(events) || events.length === 0) return json({ ok: true });
      // Store as a rotating log: keep last 500 events per user
      const key = `evts:${uid}`;
      let existing = [];
      try { existing = JSON.parse((await env.KV.get(key)) || '[]'); } catch {}
      const merged = [...existing, ...events].slice(-500);
      await env.KV.put(key, JSON.stringify(merged), { expirationTtl: 60 * 60 * 24 * 90 });
      return json({ ok: true });
    }
    // ── Analytics read (GET /events?uid=xxx) ─────────────────────────────────
    if (url.pathname === '/events' && req.method === 'GET') {
      const uid = url.searchParams.get('uid');
      if (!uid) return json({ error: 'uid required' }, 400);
      const data = JSON.parse((await env.KV.get(`evts:${uid}`)) || '[]');
      return json(data);
    }

    // ── Admin analytics dashboard (GET /admin/analytics) ─────────────────────
    // Protected: requires ?key=<ADMIN_KEY> (set via `wrangler secret put ADMIN_KEY`)
    if (url.pathname === '/admin/analytics' && req.method === 'GET') {
      if (env.ADMIN_KEY && url.searchParams.get('key') !== env.ADMIN_KEY)
        return json({ error: 'forbidden' }, 403);
      // List all event keys
      const evtList = await env.KV.list({ prefix: 'evts:' });
      const userList = await env.KV.list({ prefix: 'user:' });
      const saveList = await env.KV.list({ prefix: 'save:' });

      const summary = {
        registered_users: userList.keys.length,
        users_with_saves: saveList.keys.length,
        users_with_events: evtList.keys.length,
        users: []
      };

      // Aggregate events per user
      const eventCounts = { screen: {}, combat_attack: 0, combat_win: 0,
        purchase: 0, level_up: 0, sync: 0, js_error: 0 };
      let totalEvents = 0;

      for (const k of evtList.keys) {
        const uid = k.name.replace('evts:', '');
        const raw = await env.KV.get(k.name);
        const events = JSON.parse(raw || '[]');
        totalEvents += events.length;

        const userSummary = { uid, event_count: events.length, events_by_type: {} };
        let maxLevel = 0;
        let lastSeen = null;

        for (const e of events) {
          userSummary.events_by_type[e.event] = (userSummary.events_by_type[e.event] || 0) + 1;
          if (e.event === 'screen') eventCounts.screen[e.name] = (eventCounts.screen[e.name] || 0) + 1;
          else if (eventCounts[e.event] !== undefined) eventCounts[e.event]++;
          if (e.lv > maxLevel) maxLevel = e.lv;
          if (!lastSeen || e.ts > lastSeen) lastSeen = e.ts;
        }
        userSummary.max_level_seen = maxLevel;
        userSummary.last_seen = lastSeen ? new Date(lastSeen).toISOString() : null;
        summary.users.push(userSummary);
      }

      summary.total_events = totalEvents;
      summary.aggregate = eventCounts;
      summary.generated_at = new Date().toISOString();

      // also fold in save-level stats (levels, steps) for richer charts
      const heroes = [];
      for (const k of saveList.keys.slice(0, 200)) {
        try {
          const s = JSON.parse(await env.KV.get(k.name));
          if (s) heroes.push({ name: s.name || '?', level: s.level || 1, steps: s.lifetimeSteps || 0, quests: s.questsCleared || 0 });
        } catch {}
      }
      summary.heroes = heroes;

      if (url.searchParams.get('format') === 'json') return json(summary);
      return new Response(dashboardHTML(summary), { headers: { ...CORS, 'content-type': 'text/html;charset=utf-8' } });
    }

    return new Response('Gradus worker — alive.', { headers: CORS });
  },
};

/* ── HTML dashboard with hand-rolled bar charts (no external libs) ── */
function dashboardHTML(s) {
  const esc = t => String(t).replace(/[<>&]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;' }[c]));
  const bars = (entries, color) => {
    const max = Math.max(1, ...entries.map(([, v]) => v));
    return entries.map(([k, v]) =>
      `<div class="row"><span class="lbl">${esc(k)}</span>
       <span class="bar"><i style="width:${Math.round(v / max * 100)}%;background:${color}"></i></span>
       <span class="val">${v}</span></div>`).join('');
  };
  const screens = Object.entries(s.aggregate.screen || {}).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const actions = Object.entries(s.aggregate).filter(([k, v]) => k !== 'screen' && typeof v === 'number').sort((a, b) => b[1] - a[1]);
  // level distribution from saves
  const lvlBuckets = {};
  (s.heroes || []).forEach(h => { const b = h.level >= 50 ? '50+' : `${Math.floor((h.level - 1) / 10) * 10 + 1}-${Math.floor((h.level - 1) / 10) * 10 + 10}`; lvlBuckets[b] = (lvlBuckets[b] || 0) + 1; });
  const heroRows = (s.heroes || []).sort((a, b) => b.steps - a.steps).slice(0, 25).map(h =>
    `<tr><td>${esc(h.name)}</td><td>${h.level}</td><td>${h.quests}</td><td>${h.steps.toLocaleString('en-US')}</td></tr>`).join('');
  const userRows = (s.users || []).sort((a, b) => (b.last_seen || '').localeCompare(a.last_seen || '')).slice(0, 25).map(u =>
    `<tr><td>${esc(u.uid).slice(0, 8)}…</td><td>${u.event_count}</td><td>${u.max_level_seen}</td><td>${u.last_seen ? esc(u.last_seen).slice(0, 16).replace('T', ' ') : '—'}</td></tr>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gradus Analytics</title><style>
body{background:#0c0a07;color:#d8c9a3;font-family:ui-monospace,Menlo,monospace;margin:0;padding:20px;max-width:860px;margin:auto}
h1{color:#c9a227;font-size:20px}h2{color:#c9a227;font-size:15px;border-bottom:1px solid #3a2f1c;padding-bottom:4px;margin-top:28px}
.cards{display:flex;gap:12px;flex-wrap:wrap;margin-top:14px}
.card{background:#1a1410;border:1px solid #6b5a36;border-radius:6px;padding:12px 18px;text-align:center}
.card b{display:block;font-size:26px;color:#c9a227}.card span{font-size:11px;color:#8a7b5e}
.row{display:flex;align-items:center;gap:8px;margin:4px 0;font-size:12px}
.lbl{width:130px;text-align:right;color:#8a7b5e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar{flex:1;background:#15100a;border:1px solid #3a2f1c;border-radius:3px;height:16px;overflow:hidden}
.bar i{display:block;height:100%}
.val{width:56px;font-size:12px}
table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
td,th{padding:4px 8px;border-bottom:1px solid #241a10;text-align:left}th{color:#8a7b5e;font-size:10px;text-transform:uppercase}
.foot{color:#5a4d36;font-size:10px;margin-top:30px}
</style></head><body>
<h1>⚔️ Gradus — Live Analytics</h1>
<div class="cards">
  <div class="card"><b>${s.registered_users}</b><span>registered</span></div>
  <div class="card"><b>${s.users_with_saves}</b><span>with saves</span></div>
  <div class="card"><b>${s.users_with_events}</b><span>active (events)</span></div>
  <div class="card"><b>${s.total_events}</b><span>total events</span></div>
</div>
<h2>📊 Actions</h2>${bars(actions, '#c9a227')}
<h2>🖥️ Screens visited</h2>${bars(screens, '#7a9145')}
<h2>📈 Hero levels</h2>${bars(Object.entries(lvlBuckets).sort(), '#c4502c')}
<h2>🏆 Heroes by lifetime steps</h2>
<table><tr><th>Name</th><th>Lv</th><th>Quests</th><th>Steps</th></tr>${heroRows}</table>
<h2>👣 Recent players</h2>
<table><tr><th>uid</th><th>events</th><th>max lv</th><th>last seen (UTC)</th></tr>${userRows}</table>
<p class="foot">Generated ${esc(s.generated_at)} · append &format=json for raw data</p>
</body></html>`;
}
