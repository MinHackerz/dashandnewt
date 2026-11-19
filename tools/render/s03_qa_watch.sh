#!/bin/bash
# Runs the s03 frame quality check (tools/render/s03_qa.py) every 10 minutes while the final render runs, detached
# like the render itself; stops after the last frame is checked. Problems: out/render_logs/s03_qa.csv.
#   bash tools/render/s03_qa_watch.sh start | stop
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOGD="$ROOT/out/render_logs"
PIDF="$LOGD/s03_qa_watch.pid"
cd "$ROOT" || exit 1
case "$1" in
  start)
    if [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then echo "already running"; exit 0; fi
    python3 -I -c 'import os,sys; os.setsid(); os.execvp("bash", ["bash", sys.argv[1], "_run"])' "$0" \
      < /dev/null >> "$LOGD/s03_qa_watch.log" 2>&1 &
    sleep 1; echo "started (pid $(cat "$PIDF" 2>/dev/null))" ;;
  _run)
    echo $$ > "$PIDF"
    while true; do
      .venv/bin/python -I tools/render/s03_qa.py | sed "s/^/$(date '+%F %T') /"
      if grep -q "ALL FRAMES DONE" "$LOGD/s03_final.log" 2>/dev/null; then
        sleep 30; .venv/bin/python -I tools/render/s03_qa.py --summary | sed "s/^/$(date '+%F %T') FINAL /"; break
      fi
      sleep 600
    done
    rm -f "$PIDF" ;;
  stop) [ -f "$PIDF" ] && kill "$(cat "$PIDF")"; rm -f "$PIDF"; echo stopped ;;
esac
