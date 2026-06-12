#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
echo "Removing stale git lock files..."
rm -f .git/HEAD.lock .git/index.lock 2>/dev/null || true
echo "Pushing to GitHub..."
git add worker.js index.html
git diff --cached --quiet && echo "(nothing new)" || git commit -m "feat: durability, FAQ/lore, XP rebalance, gender sprites, analytics, UI polish"
git push origin main --force
echo "✓ Done"
read -p "Press Enter to close..."
