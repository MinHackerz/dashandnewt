#!/usr/bin/env bash
# Renders a composition to out/<id>.mp4 and limits audio peaks so stacked
# SFX never clip on phones, then drafts the publish metadata (docs/PUBLISHING.md).
#   bash tools/render.sh TheShortcut            # full quality
#   bash tools/render.sh TheShortcut --draft    # 40% size, for quick review
set -euo pipefail
cd "$(dirname "$0")/.."
ID="${1:?usage: tools/render.sh <CompositionId> [--draft]}"
mkdir -p out
SLUG=$(echo "$ID" | sed -E 's/([a-z0-9])([A-Z])/\1-\2/g' | tr '[:upper:]' '[:lower:]')
if [ "${2:-}" = "--draft" ]; then
  npx remotion render "$ID" "out/$SLUG-draft.mp4" --scale=0.4 --concurrency=8
  exit 0
fi
RAW="out/$SLUG-raw.mp4"
npx remotion render "$ID" "$RAW" --concurrency=8
ffmpeg -v error -y -i "$RAW" -c:v copy -af "alimiter=limit=0.85:level=false" -c:a aac -b:a 192k \
  -movflags +faststart "out/$SLUG.mp4"
rm "$RAW"
echo "→ out/$SLUG.mp4 ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "out/$SLUG.mp4")s)"
# Draft content/publish/<episode>.yaml for review (never overwrites; flags a stale approval).
node tools/publish/cli.mjs prepare "$ID" --if-missing || echo "  (no publish draft made — see docs/PUBLISHING.md)"
