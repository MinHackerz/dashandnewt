#!/usr/bin/env bash
# Rebuilds the whole SFX library from our own seeded generators — every sound in
# public/sfx is original (no stock or meme clips), so it is safe for monetized reels.
# Uses the project venv when it exists (numpy/scipy generators, ep06+); stdlib generators run either way.
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT="${1:-public/sfx}"
PY=python3
[ -x .venv/bin/python ] && PY=.venv/bin/python
mkdir -p "$OUT"
for script in tools/sfx/*.py; do
  echo "synth: $script"
  "$PY" -I "$script" "$OUT" >/dev/null
done
echo "SFX library ready in $OUT ($(ls "$OUT" | wc -l | tr -d ' ') files)"
