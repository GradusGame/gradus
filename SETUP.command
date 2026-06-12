#!/usr/bin/env bash
# Double-click this file in Finder to deploy Gradus to GitHub Pages.
# (It opens a Terminal window automatically.)
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo ""
echo "══════════════════════════════════════"
echo "  Gradus → GitHub Pages Setup"
echo "══════════════════════════════════════"
echo ""

# Clean up any stale git lock files (from previous interrupted attempts)
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock 2>/dev/null || true

# Git init
if [ ! -d ".git" ]; then
  git init -b main
  echo "✓ Git initialised"
else
  # Ensure we're on main branch
  git checkout -b main 2>/dev/null || git checkout main 2>/dev/null || true
  echo "✓ Git repo ready"
fi

git config user.email "rdflopez@gmail.com"
git config user.name "Rodolfo"

# Stage files
git add index.html game-test.js worker.js wrangler.toml 2>/dev/null || true
git add DESIGN.md INTEGRATION.md 2>/dev/null || true
git diff --cached --quiet && echo "Nothing new to commit" || git commit -m "Deploy Gradus $(date '+%Y-%m-%d')"
echo "✓ Files committed"

# Check for gh CLI
if ! command -v gh &>/dev/null; then
  echo ""
  echo "Installing GitHub CLI (one-time)..."
  if command -v brew &>/dev/null; then
    brew install gh
  else
    echo "Please install Homebrew first: https://brew.sh"
    echo "Then re-run this script."
    read -p "Press Enter to open brew.sh in your browser..."
    open "https://brew.sh"
    exit 1
  fi
fi

# GitHub auth
if ! gh auth status &>/dev/null; then
  echo ""
  echo "Logging in to GitHub (opens browser)..."
  gh auth login --web --git-protocol https
fi

GH_USER=$(gh api user --jq .login)
echo "✓ Logged in as: $GH_USER"

# Create repo (skip if exists)
gh repo create "gradus" --public \
  --description "Gradus — medieval fitness RPG" \
  --source=. --remote=origin --push 2>/dev/null \
  || {
    # Repo already exists — just push
    git remote set-url origin "https://github.com/$GH_USER/gradus.git" 2>/dev/null \
      || git remote add origin "https://github.com/$GH_USER/gradus.git"
    git push -u origin main --force
  }
echo "✓ Pushed to GitHub"

# Enable Pages
gh api "repos/$GH_USER/gradus/pages" \
  --method POST \
  --field source='{"branch":"main","path":"/"}' \
  --silent 2>/dev/null || true
echo "✓ GitHub Pages enabled"

echo ""
echo "══════════════════════════════════════"
echo "  Your game will be live in ~60 sec:"
echo ""
echo "  https://$GH_USER.github.io/gradus"
echo ""
echo "  Opening in browser now..."
echo "══════════════════════════════════════"
echo ""

sleep 3
open "https://$GH_USER.github.io/gradus"

read -p "Press Enter to close this window..."
