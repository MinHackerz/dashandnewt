"""Render an animation one frame at a time, gently: rests between frames and pauses whenever macOS reports heat.

    Blender -b <file.blend> --python tools/blender/render_paced.py -- [rest_ratio] [first] [last] [noblur] [only]
  rest_ratio  seconds of rest per second of rendering (default 0.3; 0 = no rest)
  noblur      comma list of frames rendered without motion blur: the frame either side of a hard cut, where the
              centred shutter would smear the camera jump across the picture ("-" = none)
  only        comma list: render just these frames (within first..last)
Resumable: frames whose PNG already exists are skipped. Progress → <output dir>/_progress.txt.
Heat check: `pmset -g therm` (no password). Any recorded thermal or performance warning level other than 0 pauses
the job, re-checking every 60 s until it clears.
"""
import os
import re
import subprocess
import sys
import time

import bpy

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
REST = float(argv[0]) if argv else 0.3
sc = bpy.context.scene
first = int(argv[1]) if len(argv) > 1 else sc.frame_start
last = int(argv[2]) if len(argv) > 2 else sc.frame_end
NOBLUR = {int(x) for x in argv[3].split(",") if x.strip().isdigit()} if len(argv) > 3 else set()
ONLY = {int(x) for x in argv[4].split(",") if x.strip().isdigit()} if len(argv) > 4 else None
BLUR = sc.render.use_motion_blur
base = bpy.path.abspath(sc.render.filepath)
outdir = os.path.dirname(base)
os.makedirs(outdir, exist_ok=True)
log = open(os.path.join(outdir, "_progress.txt"), "a")


def hot():
    try:
        out = subprocess.run(["pmset", "-g", "therm"], capture_output=True, text=True, timeout=10).stdout
    except Exception:
        return False
    levels = [int(x) for x in re.findall(r"(?:Thermal|Performance) warning level[^0-9]*(\d+)", out)]
    return any(l > 0 for l in levels)


def say(msg):
    line = time.strftime("%H:%M:%S ") + msg
    print(line, flush=True)
    log.write(line + "\n")
    log.flush()


done_t, n_done = 0.0, 0
for f in range(first, last + 1):
    path = f"{base}{f:04d}.png"
    if (ONLY is not None and f not in ONLY) or (os.path.exists(path) and os.path.getsize(path) > 0):
        continue
    waited = 0
    while hot():
        if waited == 0:
            say(f"frame {f}: Mac reports heat, pausing")
        time.sleep(60)
        waited += 60
    t0 = time.time()
    sc.frame_set(f)
    sc.render.use_motion_blur = BLUR and f not in NOBLUR
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    dt = time.time() - t0
    done_t += dt
    n_done += 1
    left = sum(1 for k in range(f + 1, last + 1) if not os.path.exists(f"{base}{k:04d}.png"))
    eta = left * (done_t / n_done) * (1 + REST) / 3600
    say(f"frame {f} rendered in {dt:.1f} s · {left} left · ~{eta:.1f} h to go")
    if REST > 0:
        time.sleep(dt * REST)
sc.render.filepath = base
say("ALL FRAMES DONE")
