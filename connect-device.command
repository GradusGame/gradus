#!/usr/bin/env bash
# connect-device.command
# Double-click to deploy the Gradus backend worker and link your fitness devices.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo ""
echo "══════════════════════════════════════════"
echo "  Gradus — Device Integration Setup"
echo "  (Garmin + Oura via Terra + Cloudflare)"
echo "══════════════════════════════════════════"
echo ""

# ── 1. Wrangler already installed (done in previous run) ────────────────────
echo "✓ Wrangler: $(wrangler --version 2>/dev/null | head -1)"

# ── 2. Cloudflare API Token ───────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════"
echo "  Cloudflare API Token"
echo ""
echo "  1. Open: https://dash.cloudflare.com/profile/api-tokens"
echo "  2. Click 'Create Token'"
echo "  3. Use template: 'Edit Cloudflare Workers'"
echo "  4. Click 'Continue to summary' → 'Create Token'"
echo "  5. Copy the token and paste it below"
echo "══════════════════════════════════════════"
echo ""
read -p "  Paste your Cloudflare API Token: " CF_TOKEN
export CLOUDFLARE_API_TOKEN="$CF_TOKEN"
echo "✓ Cloudflare token set"

# ── 3. Create KV namespace ────────────────────────────────────────────────────
echo ""
echo "Setting up KV storage..."

RAW_KV=$(wrangler kv namespace create GRADUS_KV 2>&1) || true
KV_ID=$(echo "$RAW_KV" | grep -oE '"id": "[a-f0-9]+"' | grep -oE '[a-f0-9]{32,}' | head -1)

if [ -z "$KV_ID" ]; then
  echo "  Namespace may already exist — looking it up..."
  KV_ID=$(wrangler kv namespace list 2>/dev/null | python3 -c "
import sys, json
try:
    ns = json.load(sys.stdin)
    for n in ns:
        if 'GRADUS_KV' in n.get('title',''):
            print(n['id']); break
except: pass
" 2>/dev/null)
fi

if [ -z "$KV_ID" ]; then
  echo "ERROR: Could not create or find KV namespace."
  read -p "Press Enter to close..."
  exit 1
fi
echo "✓ KV namespace ID: $KV_ID"

# ── 4. Inject KV section into wrangler.toml ──────────────────────────────────
python3 - "$KV_ID" << 'PYEOF'
import sys
kv_id = sys.argv[1]
with open('wrangler.toml', 'r') as f:
    t = f.read()
marker = '# (section injected here after wrangler kv namespace create)'
kv_block = f'[[kv_namespaces]]\nbinding = "KV"\nid      = "{kv_id}"'
# Replace marker if present, else append
if marker in t:
    t = t.replace(marker, kv_block)
elif '[[kv_namespaces]]' not in t:
    t += '\n' + kv_block + '\n'
with open('wrangler.toml', 'w') as f:
    f.write(t)
print(f"  wrangler.toml: KV id = {kv_id}")
PYEOF
echo "✓ wrangler.toml updated"

# ── 5. Terra API credentials ──────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════"
echo "  Terra API Keys"
echo "  Get from: https://dashboard.tryterra.co"
echo "  (Sign up free → API Keys section)"
echo "══════════════════════════════════════════"
echo ""
read -p "  Paste your Terra Dev ID : " TERRA_DEV
read -p "  Paste your Terra API Key: " TERRA_KEY
echo ""
printf '%s' "$TERRA_DEV" | wrangler secret put TERRA_DEV_ID
printf '%s' "$TERRA_KEY" | wrangler secret put TERRA_API_KEY
echo "✓ Terra secrets stored"

# ── 6. Deploy worker ──────────────────────────────────────────────────────────
echo ""
echo "Deploying worker to Cloudflare..."
DEPLOY_OUT=$(wrangler deploy 2>&1)
echo "$DEPLOY_OUT"
WORKER_URL=$(echo "$DEPLOY_OUT" | grep -oE 'https://[a-zA-Z0-9._-]+\.workers\.dev' | head -1)

if [ -z "$WORKER_URL" ]; then
  read -p "Paste worker URL from output above: " WORKER_URL
fi
echo "✓ Worker live: $WORKER_URL"

# ── 7. Pre-fill worker URL in the game ───────────────────────────────────────
python3 - "$WORKER_URL" << 'PYEOF'
import sys
url = sys.argv[1]
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()
old = 'placeholder="https://your-worker.workers.dev"'
new = f'placeholder="{url}" value="{url}"'
if old in html:
    html = html.replace(old, new, 1)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("  index.html: worker URL pre-filled")
else:
    print(f"  Note: manually enter this URL in the game Sync screen:\n  {url}")
PYEOF

# ── 8. Push to GitHub ─────────────────────────────────────────────────────────
echo ""
echo "Pushing updates to GitHub..."
git add worker.js wrangler.toml index.html 2>/dev/null || true
git diff --cached --quiet && echo "  (nothing new to commit)" || \
  git commit -m "Deploy device worker + pre-fill URL"
git push origin main --force 2>/dev/null || true
echo "✓ GitHub updated"

# ── 9. Done ───────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════"
echo "  ✅ Setup complete!"
echo ""
echo "  Worker URL: $WORKER_URL"
echo ""
echo "  LAST STEP — set Terra webhook:"
echo "  1. Go to https://dashboard.tryterra.co"
echo "  2. Customise → Webhook URL → paste:"
echo "     $WORKER_URL/terra-webhook"
echo ""
echo "  In the game (Sync screen):"
echo "  • Worker URL is pre-filled — click Save URL"
echo "  • Click Connect device → link Garmin + Oura"
echo "  • Click Pull from device to sync steps"
echo "══════════════════════════════════════════"
echo ""
read -p "Press Enter to close..."
