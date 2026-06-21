#!/usr/bin/env bash
# Push committed changes to GitHub (origin/main). Double-click to run.
cd "$(dirname "$0")" || exit 1

echo "================================================"
echo "  Gradus → push to GitHub"
echo "================================================"

# Clear any stale lock files left by a Cowork session (harmless if none)
rm -f .git/HEAD.lock .git/index.lock 2>/dev/null || true

# Show what will be pushed
AHEAD=$(git rev-list --count origin/main..main 2>/dev/null || echo "?")
echo ""
echo "Commits waiting to push: $AHEAD"
git log --oneline origin/main..main 2>/dev/null
echo ""

if [ "$AHEAD" = "0" ]; then
  echo "Nothing to push — origin/main is already up to date."
else
  echo "Pushing to origin/main ..."
  if git push origin main; then
    echo ""
    echo "✓ Pushed successfully."
  else
    echo ""
    echo "✗ Push failed. If it asked for a username/password, sign in to"
    echo "  GitHub once (or set up a credential helper) and run this again."
  fi
fi

echo ""
read -p "Press Enter to close..."
