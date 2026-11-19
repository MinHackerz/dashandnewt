#!/usr/bin/env bash
# s02 finishing pass, run after the main Blender render (frames 1–1145) is done:
#   1. (unless SKIP_TAIL=1) re-renders the coat shot's tail 1071–1181 from the current blender/s02.blend (the ending was lengthened and the
#      cloth re-baked after the main render started, so the whole draped part comes from one bake)
#   2. encodes out/blender/s02/f_####.png → public/renders/s02.mp4 (75 % frames upscaled to 1080×1920, Lanczos)
#   3. renders the final reel with tools/render.sh (narration, captions, labels, sound, audio limiter)
set -euo pipefail
cd "$(dirname "$0")/../.."
if [ "${SKIP_TAIL:-0}" != "1" ]; then
  for f in $(seq 1071 1181); do rm -f "out/blender/s02/f_$(printf %04d "$f").png"; done
  blender -b blender/s02.blend --python tools/blender/render_paced.py -- 0.15 1071 1181 "-" > out/blender/s02_tail.log 2>&1
fi
n=$(ls out/blender/s02/f_*.png | wc -l | tr -d ' ')
[ "$n" -ge 1181 ] || { echo "only $n frames rendered"; exit 1; }
ffmpeg -v error -y -framerate 30 -start_number 1 -i out/blender/s02/f_%04d.png \
  -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p public/renders/s02.mp4
echo "picture → public/renders/s02.mp4 ($(ffprobe -v error -show_entries format=duration -of csv=p=0 public/renders/s02.mp4)s)"
bash tools/render.sh Shiver
