"""Automatic quality check of s03's final frames, run while the render goes (incremental; safe to run any time):

    .venv/bin/python -I tools/render/s03_qa.py            # check new frames, print problems
    .venv/bin/python -I tools/render/s03_qa.py --summary  # plus totals per shot

Per frame (decoded with ffmpeg, 16-bit):
  broken     – the PNG does not decode, or is not 1080×1920 (a frame cut off mid-write)
  blank      – (nearly) one flat colour: a missing set, a black frame, a camera inside an object
  magenta    – Blender's missing-texture pink in more than a few pixels
  fireflies  – lone pixels far brighter than all 8 neighbours (sampling noise the denoiser missed)
Across frames, inside one shot:
  flash      – a patch that jumps on one frame and comes back on the next (flicker, popping, a light blinking)
  gap        – a frame missing from a shot whose later frames exist
Problems go to out/render_logs/s03_qa.csv; a flagged frame is re-rendered by deleting it (the render skips only
frames that exist) once the cause is fixed.
"""
import csv
import json
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "out/blender/s03")
LOGD = os.path.join(ROOT, "out/render_logs")
CACHE = os.path.join(LOGD, "s03_qa_cache.json")
REPORT = os.path.join(LOGD, "s03_qa.csv")
W, H = 1080, 1920
BLK = 40  # flash test on a 27 × 48 grid of 40 px blocks, each followed to where it moved
PLAN = json.load(open(os.path.join(ROOT, "tools/blender/s03_plan.json")))
PLAN.pop("_progress", None)


def decode(path):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb48le", "-"],
                       capture_output=True)
    if r.returncode != 0 or len(r.stdout) != W * H * 6 or r.stderr.strip():
        return None
    return np.frombuffer(r.stdout, dtype="<u2").reshape(H, W, 3).astype(np.float32) / 65535.0


def check_frame(img):
    problems = []
    lum = img @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    if lum.std() < 0.01:
        problems.append(f"blank (std {lum.std():.4f})")
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    mag = int(((r > 0.8) & (b > 0.8) & (g < 0.2)).sum())
    if mag > 20:
        problems.append(f"magenta ({mag} px)")
    # fireflies: brighter than 4 × the median of the 8 neighbours and clearly bright
    p = np.pad(lum, 1, mode="edge")
    nb = np.stack([p[1 + dy:H + 1 + dy, 1 + dx:W + 1 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx])
    ff = int(((lum - nb.max(axis=0)) > 0.2).sum())  # a lone pixel well above all 8 neighbours (real detail is wider)
    if ff > 25:
        problems.append(f"fireflies ({ff} px)")
    return problems, small(lum)


SMALL = os.path.join(LOGD, "s03_qa_small")  # 135 × 240 luminance per frame (8 × 8 px each) for the flash test
P, BS, R = 8, 5, 20  # 8 px per small pixel; 5 × 5 small px = one 40 px block; search ±20 small px = ±160 px


def small(lum):
    return lum.reshape(H // P, P, W // P, P).mean(axis=(1, 3)).astype(np.float32)


def tracked_diff(B, A):
    """Per 40 px block of B: its brightness difference to the same patch in A, found where it moved.

    The match looks for the shape (mean removed), with a light pull towards equal brightness and towards
    small moves, so a patch that really brightened still finds itself instead of a brighter neighbour."""
    h, w = B.shape
    Ap = np.pad(A, R, constant_values=-10.0)
    best = np.full((h // BS, w // BS), 1e9, dtype=np.float32)
    diff = np.zeros_like(best)
    for dy in range(-R, R + 1):
        for dx in range(-R, R + 1):
            d = (B - Ap[R + dy:R + dy + h, R + dx:R + dx + w]).reshape(h // BS, BS, w // BS, BS)
            md = d.mean(axis=(1, 3))
            cost = np.abs(d - md[:, None, :, None]).mean(axis=(1, 3)) + 0.1 * np.abs(md) + 0.0005 * (dx * dx + dy * dy) ** 0.5
            m = cost < best
            best[m] = cost[m]
            diff[m] = md[m]
    return diff


def flash_spike(A, B, C):
    """How much each block of frame B is brighter (or darker) than where it came from AND where it goes.

    Following each patch is needed for the dive: there a key crosses a 40 px block within one frame, so a
    fixed block goes light-dark-light although nothing flickers. A flicker or pop differs from both
    neighbour frames in the same direction. The outer ring is skipped: in fast moves new content enters
    there from outside the frame."""
    da, dc = tracked_diff(B, A), tracked_diff(B, C)
    s = np.where(np.sign(da) == np.sign(dc), np.minimum(np.abs(da), np.abs(dc)), 0.0)
    return s[1:-1, 1:-1]


def main():
    import fcntl
    os.makedirs(LOGD, exist_ok=True)
    lock = open(os.path.join(LOGD, "s03_qa.lock"), "w")
    fcntl.flock(lock, fcntl.LOCK_EX)  # one checker at a time (the 10-minute watch and a manual run)
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    new_rows = []
    for shot, p in PLAN.items():
        d = os.path.join(OUT, shot)
        if not os.path.isdir(d):
            continue
        have = sorted(int(f[:-4]) for f in os.listdir(d) if f.endswith(".png"))
        for f in have:
            key = f"{shot}/{f:04d}"
            path = os.path.join(d, f"{f:04d}.png")
            mt = os.path.getmtime(path)
            if key in cache and cache[key]["mtime"] == mt:
                continue
            if mt > __import__("time").time() - 5:
                continue  # still being written
            img = decode(path)
            if img is None:
                cache[key] = {"mtime": mt, "problems": ["broken (does not decode at 1080×1920)"], "small": False}
            else:
                probs, sm = check_frame(img)
                os.makedirs(SMALL, exist_ok=True)
                np.save(os.path.join(SMALL, key.replace("/", "_") + ".npy"), sm)
                cache[key] = {"mtime": mt, "problems": probs, "small": True}
            for pr in cache[key]["problems"]:
                new_rows.append((shot, f, pr))
        # flashes: a block that leaves the line between its neighbours on one frame (motion moves smoothly)
        ramp = p.get("thermal_ramp")
        for f in have:
            k0, k1, k2 = f"{shot}/{f - 1:04d}", f"{shot}/{f:04d}", f"{shot}/{f + 1:04d}"
            if not all(k in cache and cache[k].get("small") for k in (k0, k1, k2)) or cache[k1].get("flash_done"):
                continue
            if ramp and ramp[0] - 1 <= f <= ramp[1] + 1:
                cache[k1]["flash_done"] = True
                continue  # the thermal view switching on is meant to change the picture
            a, b, c = (np.load(os.path.join(SMALL, k.replace("/", "_") + ".npy")) for k in (k0, k1, k2))
            spike = flash_spike(a, b, c)
            # a planted +6 % flash over 120 px scores 0.055+ in all 9 of its blocks; real motion in the fastest
            # dive frames (edges uncovering a dark gap) reaches 0.04–0.08 in 1–2 lone blocks
            if (spike > 0.04).sum() >= 3 or spike.max() > 0.1:
                y, x = np.unravel_index(spike.argmax(), spike.shape)
                y, x = y + 1, x + 1
                pr = f"flash ({spike.max():.3f} in {(spike > 0.04).sum()} blocks, at x {x * BLK}–{(x + 1) * BLK}, y {y * BLK}–{(y + 1) * BLK})"
                cache[k1]["problems"] = cache[k1]["problems"] + [pr]
                new_rows.append((shot, f, pr))
            cache[k1]["flash_done"] = True
        if have:
            missing = sorted(set(range(p["f0"], have[-1] + 1)) - set(have))
            for f in missing:
                key = f"{shot}/{f:04d}/gap"
                if key not in cache:
                    cache[key] = {"mtime": 0, "problems": ["gap"]}
                    new_rows.append((shot, f, "gap"))
    json.dump(cache, open(CACHE, "w"))
    if new_rows:
        new = not os.path.exists(REPORT)
        with open(REPORT, "a", newline="") as fh:
            w = csv.writer(fh)
            if new:
                w.writerow(["shot", "frame", "problem"])
            w.writerows(new_rows)
    for shot, f, pr in new_rows:
        print(f"QA PROBLEM {shot} frame {f}: {pr}", flush=True)
    checked = [k for k in cache if not k.endswith("/gap")]
    if "--summary" in sys.argv:
        for shot, p in PLAN.items():
            ks = [k for k in checked if k.startswith(shot + "/")]
            bad = [k for k in ks if cache[k]["problems"]]
            if ks:
                print(f"{shot}: {len(ks)}/{p['f1'] - p['f0'] + 1} checked, {len(bad)} flagged")
    print(f"QA checked {len(checked)} frames, {len(new_rows)} new problems", flush=True)


if __name__ == "__main__":
    main()
