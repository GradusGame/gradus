/* Gradus device-link + account worker (Cloudflare Workers)
   Endpoints:
     GET  /connect         -> Terra connect widget session redirect
     POST /terra-webhook   -> stores per-date {steps, calories} in KV
     GET  /activity?days=7 -> [{date, steps, calories}, …]
     POST /signup {email,password} -> {token}
     POST /login  {email,password} -> {token}
     POST /save   (Bearer token, body = save JSON) -> {ok}
     GET  /load   (Bearer token) -> save JSON
   Setup: KV binding `KV`; secrets TERRA_DEV_ID, TERRA_API_KEY. See INTEGRATION.md.
*/
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type,authorization',
};
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'content-type': 'application/json' } });

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

    if (url.pathname === '/connect') {
      const r = await fetch('https://api.tryterra.co/v2/auth/generateWidgetSession', {
        method: 'POST',
        headers: { 'dev-id': env.TERRA_DEV_ID, 'x-api-key': env.TERRA_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ reference_id: 'gradus-player', providers: 'GARMIN,OURA,STRAVA,FITBIT', language: 'en' }),
      });
      const j = await r.json();
      if (!j.url) return new Response('Terra session failed: ' + JSON.stringify(j), { status: 502, headers: CORS });
      return Response.redirect(j.url, 302);
    }

    if (url.pathname === '/terra-webhook' && req.method === 'POST') {
      let body;
      try { body = await req.json(); } catch { return new Response('bad json', { status: 400, headers: CORS }); }
      for (const d of (Array.isArray(body.data) ? body.data : [])) {
        const date = (d.metadata?.start_time || d.metadata?.end_time || '').slice(0, 10);
        if (!date) continue;
        const steps = d.distance_data?.steps ?? d.steps ?? 0;
        const calories = Math.round(d.calories_data?.total_burned_calories ?? 0);
        const prev = JSON.parse((await env.KV.get('act:' + date)) || '{"steps":0,"calories":0}');
        await env.KV.put('act:' + date, JSON.stringify({
          steps: Math.max(prev.steps, steps), calories: Math.max(prev.calories, calories),
        }), { expirationTtl: 60 * 60 * 24 * 45 });
      }
      return new Response('ok', { headers: CORS });
    }

    if (url.pathname === '/activity') {
      const days = Math.min(14, Number(url.searchParams.get('days')) || 7);
      const out = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const v = await env.KV.get('act:' + key);
        if (v) out.push({ date: key, ...JSON.parse(v) });
      }
      return json(out);
    }

    // ---- accounts ----
    if (url.pathname === '/signup' && req.method === 'POST') {
      const { email, password } = await req.json().catch(() => ({}));
      if (!email || !password || password.length < 6) return json({ error: 'Email + password (6+ chars) required.' }, 400);
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
      if (!u || u.hash !== await sha(u.salt + password)) return json({ error: 'Wrong email or password.' }, 401);
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
      return v ? new Response(v, { headers: { ...CORS, 'content-type': 'application/json' } }) : json({ error: 'No cloud save yet.' }, 404);
    }

    return new Response('Gradus worker is alive.', { headers: CORS });
  },
};
