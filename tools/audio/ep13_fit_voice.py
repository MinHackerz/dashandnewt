"""Fit the ElevenLabs narration for ep13 to the already-rendered Blender picture.

The picture's timing is fixed (tools/blender/ep13_times.json, CUE). The narration is longer than the slots it was
written for, so this script, without touching the words:
  1. trims silence at both ends of every line,
  2. shortens long pauses inside a line to PAUSE seconds,
  3. packs the lines into three chains between the picture's sync points, speeding each chain up uniformly
     (pitch kept, ffmpeg atempo) only as much as it needs:
       chain A  hook … tip + "and jump the last few millimeters"   ends where "all at once" meets the SPARK
       chain B  "all at once …" + zap + "Newt's trick? … first."     ends where "The spark hits the key" meets KEY SPARK
       chain C  "The spark hits the key, not your skin." (natural pace), then "Not in your mouth, Dash." after the teeth ZAP
Writes public/voices/ep13-final/<line>.wav and manifest.json ({at, seconds, file, text}) for the Remotion edit.

Run:  .venv/bin/python -I tools/audio/ep13_fit_voice.py
"""

import json
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public/voices/ep13-eleven"
OUT = ROOT / "public/voices/ep13-final"
CUE = json.loads((ROOT / "tools/blender/ep13_times.json").read_text())["CUE"]
TEXT = {k: v["text"] for k, v in json.loads((ROOT / "tools/blender/ep13_times.json").read_text())["LINES"].items()}
SR = 48000
PAUSE = 0.2  # longest pause kept inside a line (s)
GAP = 0.12  # silence between lines in a chain (s)
ORDER = ["hook", "rub", "spread", "volts", "tip", "jump", "zap", "key", "mouth"]


def decode(name: str) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(SRC / f"{name}.mp3"), "-ar", str(SR), "-ac", "1", "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def quiet_runs(x: np.ndarray, thresh_db=-40.0, hop=0.01):
    """(start, end) sample ranges quieter than thresh_db, from 10 ms RMS windows."""
    n = int(SR * hop)
    frames = len(x) // n
    rms = np.sqrt(np.mean(x[: frames * n].reshape(frames, n) ** 2, axis=1) + 1e-12)
    q = 20 * np.log10(rms) < thresh_db
    runs, i = [], 0
    while i < frames:
        if q[i]:
            j = i
            while j < frames and q[j]:
                j += 1
            runs.append((i * n, j * n))
            i = j
        else:
            i += 1
    return runs, frames * n


def clean(x: np.ndarray):
    """Trim ends (keep 40 ms) and shorten inner pauses to PAUSE. Returns audio and where speech resumes after each inner pause ≥ 0.15 s."""
    runs, total = quiet_runs(x)
    start = runs[0][1] if runs and runs[0][0] == 0 else 0
    end = runs[-1][0] if runs and runs[-1][1] >= total else len(x)
    pad = int(0.04 * SR)
    x = x[max(0, start - pad): min(len(x), end + pad)]
    runs, _ = quiet_runs(x)
    out, cur, pause_ends = [], 0, []
    for a, b in runs:
        if a == 0 or b >= len(x) - SR * 0.05 or (b - a) < SR * 0.15:
            continue
        if (b - a) < SR * (PAUSE + 0.05):  # short breath: keep as is, but remember where speech resumes
            pause_ends.append((sum(len(s) for s in out) + b - cur) / SR)
            continue
        keep = int(PAUSE * SR / 2)
        out.append(x[cur: a + keep])
        cur = b - keep
        pause_ends.append(sum(len(s) for s in out) / SR + PAUSE / 2)
    out.append(x[cur:])
    y = np.concatenate(out)
    # 8 ms fades so no cut clicks
    f = int(0.008 * SR)
    y[:f] *= np.linspace(0, 1, f)
    y[-f:] *= np.linspace(1, 0, f)
    return y, pause_ends


def tempo(y: np.ndarray, r: float) -> np.ndarray:
    if abs(r - 1) < 1e-3:
        return y
    p = subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", f"atempo={r:.5f}", "-f", "f32le", "-"],
        input=y.astype(np.float32).tobytes(), capture_output=True, check=True,
    )
    return np.frombuffer(p.stdout, dtype=np.float32).copy()


def write(name: str, y: np.ndarray) -> float:
    pcm = (np.clip(y, -1, 1) * 32767).astype("<i2")
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return len(y) / SR


OUT.mkdir(parents=True, exist_ok=True)
lines = {k: clean(decode(k)) for k in ORDER}
dur = {k: len(v[0]) / SR for k, v in lines.items()}
# the sync words sit right after a pause: "all at once" after jump's 2nd pause, "The spark" after key's 2nd
jump_split = lines["jump"][1][1]
key_split = lines["key"][1][1]

# chain A: 0.12 s … spark
a0, a1 = 0.12, CUE["spark"] - 0.05
speechA = sum(dur[k] for k in ["hook", "rub", "spread", "volts", "tip"]) + jump_split
rA = max(1.0, speechA / (a1 - a0 - 4 * GAP - 0.04))
# chain B: spark … key spark
speechB = (dur["jump"] - jump_split) + dur["zap"] + key_split
rB = max(1.0, speechB / (CUE["keySpark"] - CUE["spark"] - 0.05 - 2 * GAP))
# chain B is pinned at both ends, chain A at its end; place lines
rate = {k: rA for k in ["hook", "rub", "spread", "volts", "tip"]}
rate.update({"zap": rB, "key": rB, "mouth": 1.0})
# jump is split across chains A and B; use the faster of the two for the whole line
rate["jump"] = max(rA, rB)

at = {}
t = a0
for k in ["hook", "rub", "spread", "volts"]:
    at[k] = t
    t += dur[k] / rate[k] + GAP
at["tip"] = t
# jump starts so that "all at once" lands on the spark; tip ends right before it
at["jump"] = CUE["spark"] - 0.05 - jump_split / rate["jump"]
# key starts so that "The spark" lands on the key spark; zap sits in between
at["key"] = CUE["keySpark"] - key_split / rate["key"]
at["zap"] = at["key"] - GAP - dur["zap"] / rate["zap"]
# mouth after the teeth zap, sped up only if it would run far into the moral card
mouth_end = CUE["card"] + 0.6
at["mouth"] = CUE["gagZap"] + 0.4
rate["mouth"] = max(1.0, dur["mouth"] / (mouth_end - at["mouth"]))

manifest = {}
for k in ORDER:
    secs = write(k, tempo(lines[k][0], rate[k]))
    manifest[k] = {"file": f"voices/ep13-final/{k}.wav", "at": round(at[k], 3), "seconds": round(secs, 3), "rate": round(rate[k], 3), "text": TEXT[k]}
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=1))

prev_end = 0.0
for k in ORDER:
    m = manifest[k]
    print(f"{k:7s} at {m['at']:6.2f}  len {m['seconds']:5.2f}  end {m['at'] + m['seconds']:6.2f}  speed x{m['rate']:.3f}  gap-before {m['at'] - prev_end:+.2f}")
    prev_end = m["at"] + m["seconds"]
print(f"'all at once' at {at['jump'] + jump_split / rate['jump']:.2f} (spark {CUE['spark']:.2f}); 'The spark' at {at['key'] + key_split / rate['key']:.2f} (key spark {CUE['keySpark']:.2f})")
