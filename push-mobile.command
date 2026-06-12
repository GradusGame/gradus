#!/usr/bin/env bash
cd "$(dirname "$0")"
git push origin main --force
echo "✅ Pushed!"
read -p "Press Enter to close..."
