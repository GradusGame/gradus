# Gradus — Device Integration Guide (Terra)

Connect your Garmin and Oura (and later Strava/Fitbit) so steps and calories flow into Gradus automatically. Three free accounts are needed, all one-time setup, roughly 45 minutes total.

## Step 1 — Host the game (GitHub Pages, free)

1. Create a GitHub account if needed, then a new public repository (e.g. `gradus`).
2. Upload `index.html` to it.
3. Repository Settings → Pages → Source: `main` branch → Save.
4. Your game is now at `https://<username>.github.io/gradus/` and playable anywhere, including your phone. Saves stay per-browser.

## Step 2 — Terra account (free dev tier)

1. Sign up at https://tryterra.co (dashboard at dashboard.tryterra.co).
2. In the dashboard, note your **Dev ID** and generate an **API key**.
3. Verify the free tier limits during signup; the dev plan has historically covered personal use comfortably.

## Step 3 — Cloudflare Worker (free)

1. Sign up at https://dash.cloudflare.com → Workers & Pages → Create Worker.
2. Replace the default code with the contents of `worker.js` from this folder. Deploy.
3. In the Worker settings:
   - **Variables → Secrets**: add `TERRA_DEV_ID` and `TERRA_API_KEY` from Step 2.
   - **Bindings → KV Namespace**: create a namespace (any name) and bind it as `KV`.
4. Note your worker URL: `https://<name>.<account>.workers.dev`.
5. Back in the Terra dashboard, set the **webhook/destination URL** to `https://<worker-url>/terra-webhook`.

## Step 4 — Connect inside the game

1. Open Gradus → Ambulare Report.
2. Paste your worker URL into the Device Link field and Save.
3. Click **🔗 Connect device**: Terra's widget opens; authorize **Garmin Connect** and **Oura** with your normal logins.
4. From then on, Terra pushes your daily totals to the worker. Click **⬇️ Pull from device** any time: the last 7 days flow into the game through the normal rules (daily caps, streak bonus, one report per day).

## Notes

- Terra webhook payload fields vary slightly per provider. If a pull shows zeros, check the worker logs (Cloudflare dashboard → Worker → Logs) and we'll adjust the field mapping in `worker.js`.
- Apple Health and Samsung Health have no web APIs; they come later via Terra's mobile SDK once Gradus has a mobile wrapper, or via an iOS Shortcut that posts HealthKit steps to the worker.
- The worker stores only daily step/calorie totals, nothing else, and data expires after 45 days.
