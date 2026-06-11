#!/usr/bin/env bash
# deploy.sh — Publish Gradus to GitHub Pages in one command
#
# First time:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Every update:
#   ./deploy.sh
#
# Requirements: git (built-in on macOS)
# Optional:     gh CLI (brew install gh) for fully automated repo creation
#
# What it does:
#   1. Creates a local git repo (if not already one)
#   2. Creates the GitHub repo (via gh CLI, or gives you the manual URL)
#   3. Commits index.html
#   4. Pushes to main branch
#   5. Enables GitHub Pages (root of main branch)
#   6. Prints the live URL

set -euo pipefail

# ── Config (edit these) ──────────────────────────────────────────────────────
REPO_NAME="gradus"           # GitHub repo name (will be github.com/YOU/gradus)
COMMIT_MSG="Deploy Gradus $(date '+%Y-%m-%d %H:%M')"

# ── Helpers ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
die()  { echo -e "${RED}✗${NC} $*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "══════════════════════════════════════"
echo "  Gradus — GitHub Pages Deploy"
echo "══════════════════════════════════════"
echo ""

# ── Step 1: Check index.html exists ─────────────────────────────────────────
[[ -f "index.html" ]] || die "index.html not found in $SCRIPT_DIR"
ok "index.html found"

# ── Step 2: Init git repo if needed ─────────────────────────────────────────
if [[ ! -d ".git" ]]; then
  git init -b main
  ok "Initialised git repo"
else
  ok "Git repo already initialised"
fi

# ── Step 3: Configure git identity if blank ──────────────────────────────────
if [[ -z "$(git config user.email 2>/dev/null || true)" ]]; then
  warn "No git identity set. Enter your GitHub email:"
  read -r GIT_EMAIL
  git config user.email "$GIT_EMAIL"
  git config user.name "Gradus Player"
fi

# ── Step 4: Create .gitignore ────────────────────────────────────────────────
cat > .gitignore << 'EOF'
*.py
test-report.md
node_modules/
*.log
EOF
ok ".gitignore written"

# ── Step 5: Stage and commit ─────────────────────────────────────────────────
git add index.html .gitignore
# Only add optional files if they exist
[[ -f "game-test.js" ]]  && git add game-test.js
[[ -f "worker.js" ]]     && git add worker.js
[[ -f "DESIGN.md" ]]     && git add DESIGN.md

git diff --cached --quiet && warn "Nothing changed since last deploy" || \
  git commit -m "$COMMIT_MSG"
ok "Committed"

# ── Step 6: Create GitHub repo and push ──────────────────────────────────────
REMOTE=$(git remote get-url origin 2>/dev/null || echo "")

if [[ -z "$REMOTE" ]]; then
  # Try gh CLI first (fully automated)
  if command -v gh &>/dev/null; then
    echo ""
    echo "Creating GitHub repo via gh CLI…"
    GH_USER=$(gh api user --jq .login 2>/dev/null || echo "")
    if [[ -z "$GH_USER" ]]; then
      warn "gh not authenticated. Run: gh auth login"
      warn "Then re-run this script."
      exit 1
    fi
    # Create repo (public, no readme — we provide our own files)
    gh repo create "$REPO_NAME" --public --source=. --remote=origin \
      --description "Gradus — medieval fitness RPG" 2>/dev/null || \
      git remote add origin "https://github.com/$GH_USER/$REPO_NAME.git"
    ok "GitHub repo ready: github.com/$GH_USER/$REPO_NAME"
  else
    # Manual fallback
    echo ""
    warn "gh CLI not found. Do this manually (takes 60 seconds):"
    echo ""
    echo "  1. Go to: https://github.com/new"
    echo "  2. Repo name: $REPO_NAME"
    echo "  3. Set to Public, do NOT add README"
    echo "  4. Click Create repository"
    echo "  5. Copy the HTTPS URL (e.g. https://github.com/YOU/$REPO_NAME.git)"
    echo ""
    read -r -p "Paste the repo URL here: " REMOTE_URL
    git remote add origin "$REMOTE_URL"
    ok "Remote added"
  fi
fi

# Push
git push -u origin main --force
ok "Pushed to GitHub"

# ── Step 7: Enable GitHub Pages ──────────────────────────────────────────────
if command -v gh &>/dev/null; then
  GH_USER=$(gh api user --jq .login 2>/dev/null || echo "")
  if [[ -n "$GH_USER" ]]; then
    # Enable Pages via API
    gh api "repos/$GH_USER/$REPO_NAME/pages" \
      --method POST \
      --field source='{"branch":"main","path":"/"}' \
      --silent 2>/dev/null && ok "GitHub Pages enabled" || \
      warn "Pages may already be enabled (or needs a moment to activate)"
  fi
else
  echo ""
  warn "Enable Pages manually:"
  echo "  Repo → Settings → Pages → Source: Deploy from branch → main / (root)"
fi

# ── Step 8: Print live URL ───────────────────────────────────────────────────
GH_USER_DISPLAY=""
if command -v gh &>/dev/null; then
  GH_USER_DISPLAY=$(gh api user --jq .login 2>/dev/null || echo "YOUR_USERNAME")
else
  GH_USER_DISPLAY="YOUR_USERNAME"
fi

echo ""
echo "══════════════════════════════════════"
echo -e "${GREEN}  Live in ~60 seconds:${NC}"
echo "  https://$GH_USER_DISPLAY.github.io/$REPO_NAME"
echo ""
echo "  Share that URL with anyone — no login needed."
echo "══════════════════════════════════════"
echo ""
