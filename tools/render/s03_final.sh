#!/bin/bash
# s03 final render, unattended: runs Blender's thermal-guarded, resumable render (tools/blender/s03_render.py) and
# restarts it when a frame freezes. Keeps the Mac awake while plugged in. Safe to stop (kill this script) and start
# again at any time: finished frames are skipped.
#
#   bash tools/render/s03_final.sh start     # detached: keeps running if the Claude app closes
#   bash tools/render/s03_final.sh status    # frames done, last frame, temperature state
#   bash tools/render/s03_final.sh stop
#
# A frame counts as frozen when neither the frame log nor the thermal log (which the guard writes every 30 s while it
# pauses to cool down) nor the guard's heartbeat has changed for HANG_MIN minutes. Set HANG_MIN above the slowest frame's render time.
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOGD="$ROOT/out/render_logs"
PIDF="$LOGD/s03_final.pid"
HANG_MIN="${HANG_MIN:-45}"
FRAMES_LOG="$LOGD/s03_frames.csv"
THERM_LOG="$LOGD/thermal.csv"
BEAT="$LOGD/heartbeat"  # touched every 30 s by the guard while it waits for the laptop to cool
cd "$ROOT" || exit 1
mkdir -p "$LOGD"

total() { python3 -I -c "import json;p=json.load(open('tools/blender/s03_plan.json'));print(sum(v['f1']-v['f0']+1 for k,v in p.items() if not k.startswith('_')))"; }
done_n() { find out/blender/s03 -name '*.png' 2>/dev/null | wc -l | tr -d ' '; }
mtime() { stat -f %m "$1" 2>/dev/null || echo 0; }

run() {
  echo $$ > "$PIDF"
  caffeinate -i -s -w $$ &
  while [ "$(done_n)" -lt "$(total)" ]; do
    echo "$(date '+%F %T') start blender ($(done_n)/$(total) frames done)" >> "$LOGD/s03_final.log"
    S03_KOPT=FULL blender -b blender/s03_set.blend --python tools/blender/s03_render.py -- final >> "$LOGD/s03_final_blender.log" 2>&1 &
    BP=$!
    while kill -0 $BP 2>/dev/null; do
      sleep 60
      last=$(printf '%s\n' "$(mtime "$FRAMES_LOG")" "$(mtime "$THERM_LOG")" "$(mtime "$BEAT")" | sort -n | tail -1)
      if [ $(( $(date +%s) - last )) -gt $(( HANG_MIN * 60 )) ]; then
        echo "$(date '+%F %T') frozen ${HANG_MIN} min: restarting blender" >> "$LOGD/s03_final.log"
        kill $BP; sleep 5; kill -9 $BP 2>/dev/null
      fi
    done
    sleep 5
  done
  echo "$(date '+%F %T') ALL FRAMES DONE ($(done_n))" >> "$LOGD/s03_final.log"
  rm -f "$PIDF"
}

case "$1" in
  start)
    if [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then echo "already running (pid $(cat "$PIDF"))"; exit 0; fi
    # a new session, so closing the app (or this terminal) does not take the render down with it
    python3 -I -c 'import os,sys; os.setsid(); os.execvp("bash", ["bash", sys.argv[1], "_run"])' "$0" \
      < /dev/null >> "$LOGD/s03_final.log" 2>&1 &
    sleep 2; echo "started (pid $(cat "$PIDF" 2>/dev/null))"
    bash "$ROOT/tools/render/s03_qa_watch.sh" start ;;  # the frame checker runs alongside
  _run) run ;;
  stop)
    [ -f "$PIDF" ] && kill "$(cat "$PIDF")" 2>/dev/null
    pkill -f "s03_render.py -- final"; rm -f "$PIDF"; echo stopped ;;
  status)
    echo "frames: $(done_n) / $(total)"
    tail -1 "$FRAMES_LOG"; tail -1 "$THERM_LOG"; tail -2 "$LOGD/s03_final.log" 2>/dev/null ;;
  *) echo "usage: $0 start|status|stop" ;;
esac
