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
      let body;
      try { body = await req.json(); } catch { return json({ error: 'invalid json' }, 400); }
      const { uid, date, steps, calories } = body;
      if (!uid || !date) return json({ error: 'uid and date required' }, 400);

      const key = `act:${uid}:${date}`;
      const prev = JSON.parse((await env.KV.get(key)) || '{"steps":0,"calories":0}');
      await env.KV.put(key, JSON.stringify({
        steps:    Math.max(prev.steps    || 0, Number(steps)    || 0),
        calories: Math.max(prev.calories || 0, Number(calories) || 0),
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

    return new Response('Gradus worker — alive.', { headers: CORS });
  },
};
