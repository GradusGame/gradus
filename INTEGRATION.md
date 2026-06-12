# Gradus — Device Sync (push-based, current as of V1.19)

Steps and calories flow into Gradus through a tiny Cloudflare Worker. Any device that reaches Apple Health (Garmin, Oura, Apple Watch) works via an iPhone Shortcut. No third-party aggregator, no API keys.

## How it works

```
Garmin / Oura / Watch → Apple Health → iPhone Shortcut → POST /push → Worker KV → game pulls /activity
```

The game identifies you by a per-save `syncId` (uid), generated automatically.

## Worker endpoints (`worker.js`)

- `POST /push  {uid, date, steps, calories}` — called by the Shortcut (open endpoint, keyed by uid)
- `GET  /activity?uid=…&days=…` — the game pulls recent days through the normal crediting rules (caps, streak, one report per day)
- `POST /signup` / `POST /login` / `POST /save` / `GET /load` — optional cloud accounts and saves

## One-time setup

1. **Worker**: `wrangler deploy` from this folder (config in `wrangler.toml`, KV binding `KV`). The helper scripts `SETUP.command` / `resume-deploy.command` automate this.
2. **iPhone Shortcut**: create a Shortcut that reads today's steps + active calories from Health and POSTs them to `https://<worker>/push` with your uid. `connect-device.command` walks through it; run it once on the Mac and follow the steps on the phone. Schedule the Shortcut as a daily automation (e.g., every evening).
3. **In game**: Realm Sync screen → device link URL is your worker; Pull from device fetches the last 2 days.

## Notes

- Garmin/Oura sync into Apple Health automatically when their phone apps are installed; the Shortcut reads the merged totals.
- Android: any app that can POST JSON on a schedule (e.g., Tasker/MacroDroid) can hit `/push` the same way.
- Historical note: V1.10 used the Terra aggregator; it was replaced by this push model (simpler, free, no entity approvals).
