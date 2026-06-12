#!/usr/bin/env bash
cd "$(dirname "$0")"

echo ""
echo "Enabling GitHub Pages for GradusGame/gradus..."

GH_USER=$(gh api user --jq .login 2>/dev/null)
if [ -z "$GH_USER" ]; then
  echo "Not logged in to gh CLI. Run SETUP.command first."
  exit 1
fi

echo "Logged in as: $GH_USER"

# Enable Pages using raw JSON body
echo '{"source":{"branch":"main","path":"/"}}' | gh api "repos/$GH_USER/gradus/pages" \
  --method POST \
  --input - 2>&1 && echo "✓ Pages enabled!" || echo "Trying update instead..."

# If already exists, update it
echo '{"source":{"branch":"main","path":"/"}}' | gh api "repos/$GH_USER/gradus/pages" \
  --method PUT \
  --input - 2>&1 || true

echo ""
echo "Waiting 10 seconds for Pages to activate..."
sleep 10
echo ""
echo "Your game is live at:"
echo "  https://$GH_USER.github.io/gradus"
echo ""

open "https://$GH_USER.github.io/gradus"

read -p "Press Enter to close..."
