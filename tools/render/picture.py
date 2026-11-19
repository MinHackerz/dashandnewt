"""Assemble a short's picture from its rendered frames (Mac or cloud, same settings) into the edit's video.

    python3 tools/render/picture.py <job>          # e.g. s03 → tools/render/jobs/s03.json

Reads the job's plan (shot → f0/f1, optional `cut` and `dissolve`), its times file (FRAMES, FPS), its frames in
`local_out/<shot>/<frame>.png` and writes `picture` (H.264, CRF 12, yuv420p, BT.709). Timeline frame t shows the shot
whose f0..cut holds it. A shot with `dissolve` D was rendered D frames past its cut; over those frames it fades out
under the next shot (linear, 16-bit). Every other cut is hard. Missing frames stop the build: never encode a hole.
"""
import json
import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cloudjob as cj  # noqa: E402

job = cj.load(sys.argv[1] if len(sys.argv) > 1 else sys.exit(__doc__))
ROOT = cj.ROOT
plan = job["_plan"]
times = json.load(open(os.path.join(ROOT, job["times"])))
FR, FPS = times["FRAMES"], times["FPS"]
SRC = os.path.join(ROOT, job["local_out"])
WORK = SRC.rstrip("/") + "_timeline"
OUT = os.path.join(ROOT, job["picture"])
names = list(plan)


def src(shot, f):
    return os.path.join(SRC, shot, f"{f:04d}.png")


missing = cj.missing(job)
if missing:
    sys.exit(f"{len(missing)} frames missing, e.g. {missing[:5]}: render them first (tools/render/cloud.py run {job['name']})")

shutil.rmtree(WORK, ignore_errors=True)
os.makedirs(WORK)
blends = 0
for t in range(1, FR + 1):
    cur = next(s for s in names if plan[s]["f0"] <= t <= plan[s].get("cut", plan[s]["f1"]))
    dst = os.path.join(WORK, f"{t:04d}.png")
    i = names.index(cur)
    prev = names[i - 1] if i else None
    d = plan[prev].get("dissolve", 0) if prev else 0
    k = t - plan[prev].get("cut", plan[prev]["f1"]) if prev else 0
    if prev and d and 1 <= k <= d and os.path.exists(src(prev, t)):
        a = k / (d + 1)  # weight of the incoming shot
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src(prev, t), "-i", src(cur, t), "-filter_complex",
                        f"[0:v]format=rgb48le[a];[1:v]format=rgb48le[b];[a][b]blend=all_expr='A*{1 - a:.5f}+B*{a:.5f}',format=rgb48le",
                        "-frames:v", "1", dst], check=True)
        blends += 1
    else:
        os.symlink(src(cur, t), dst)
print(f"{FR} timeline frames, {blends} dissolve frames")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-start_number", "1", "-i", os.path.join(WORK, "%04d.png"),
                "-c:v", "libx264", "-preset", "slow", "-crf", "12", "-pix_fmt", "yuv420p", "-color_primaries", "bt709",
                "-color_trc", "bt709", "-colorspace", "bt709", "-movflags", "+faststart", OUT], check=True)
shutil.rmtree(WORK)
dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", OUT],
                     capture_output=True, text=True).stdout.strip()
print(f"picture → {os.path.relpath(OUT, ROOT)} ({dur} s)")
