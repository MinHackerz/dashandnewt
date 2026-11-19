"""Finish a short: the Remotion composition's sound under the encoded picture, loudness-normalised for Shorts/Reels.

    python3 tools/render/finish.py <job>          # after tools/render/picture.py <job>

1. renders only the audio of the job's `composition` (Remotion; the picture there is just the encoded video, so it is
   not re-encoded: no generation loss);
2. two-pass loudnorm to -14 LUFS integrated, true peak -2 dB, headroom for AAC (the platforms' playback level);
3. muxes it with the job's `picture` (stream copy) → `final`, and a < 30 MB copy `<final>-share.mp4` for phones;
4. prints loudness and checks for drop-outs (silence ≥ 1.2 s).
"""
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cloudjob as cj  # noqa: E402

job = cj.load(sys.argv[1] if len(sys.argv) > 1 else sys.exit(__doc__))
ROOT = cj.ROOT
PIC = os.path.join(ROOT, job["picture"])
FINAL = os.path.join(ROOT, job["final"])
SHARE = FINAL.replace(".mp4", "-share.mp4")
WAV = FINAL.replace(".mp4", "-audio.wav")


def run(cmd, **kw):
    return subprocess.run(cmd, cwd=ROOT, check=True, **kw)


def ff(*a):
    return subprocess.run(["ffmpeg", "-hide_banner", *a], cwd=ROOT, capture_output=True, text=True).stderr


os.makedirs(os.path.dirname(FINAL), exist_ok=True)
run(["npx", "remotion", "render", job["composition"], os.path.relpath(WAV, ROOT), "--codec=wav", "--log=error"])
m = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", ff("-i", WAV, "-af", "loudnorm=I=-14:TP=-2.0:LRA=11:print_format=json",
                                                          "-f", "null", "-")).group(0))
ln = (f"loudnorm=I=-14:TP=-2.0:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
      f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
run(["ffmpeg", "-v", "error", "-y", "-i", PIC, "-i", WAV, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af",
     f"{ln},aresample=48000", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", FINAL])
os.remove(WAV)
run(["ffmpeg", "-v", "error", "-y", "-i", FINAL, "-c:v", "libx264", "-preset", "slow", "-b:v", "3800k", "-maxrate", "4500k",
     "-bufsize", "9000k", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", SHARE])
s = ff("-i", FINAL, "-af", "ebur128=peak=true,silencedetect=n=-45dB:d=1.2", "-f", "null", "-")
summ = s[s.rfind("Summary:"):]
I = re.search(r"I:\s+(-?[\d.]+) LUFS", summ).group(1)
peak = re.search(r"Peak:\s+(-?[\d.]+) dBFS", summ).group(1)
gaps = len(re.findall(r"silence_start", s))
mb = lambda p: os.path.getsize(p) / 2**20
print(f"final → {os.path.relpath(FINAL, ROOT)} ({mb(FINAL):.1f} MB), share copy {mb(SHARE):.1f} MB; "
      f"{I} LUFS, true peak {peak} dB, {gaps} drop-out(s)")
