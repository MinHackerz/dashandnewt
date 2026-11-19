"""SFX + score for ep13 "Why Door Handles ZAP You" — original, seeded, numpy/scipy (the skill's sound kit).

Cue times come from tools/blender/ep13_times.json (exported from src/episodes/ep13-static-zap/timeline.ts).
  carpet-scuff     soft sneaker-on-pile scuffs (one per shuffle step)
  static-crackle   the tiny dry crackle of charge on clothes and hair
  spark-zap        the big one: a sharp crack with a bright buzz tail (slowed down for the slow-motion)
  spark-small      the key's quick snap
  score-zap        a light, curious pizzicato/glock bed under the narration; it ducks to silence for the zap
Usage: .venv/bin/python -I tools/sfx/ep13_zap.py public/sfx
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "kit3d"))
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, fades, pan, place, make_ir, convolve_st, norm_to, write_wav, st
import instruments as I

OUT = sys.argv[1]
T = json.load(open(os.path.join(HERE, "..", "blender", "ep13_times.json")))
C = T["CUE"]
DUR = C["dur"]
R = rng(1313)
ROOM = make_ir(0.4, 1313, early=[(0.012, 0.3, -0.3), (0.029, 0.2, 0.4)])


def save(name, x, lufs=-18.0, wet=0.12):
    x = np.asarray(x, float)
    x = np.concatenate([x, np.zeros(ns(0.3))])
    y = st(x) + wet * convolve_st(x, ROOM)
    y = norm_to(fades(y, 0.002, 0.03), lufs)
    peak = np.max(np.abs(y))
    if peak > 0.89:
        y *= 0.89 / peak
    write_wav(os.path.join(OUT, f"{name}.wav"), y, 24)


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1.0, t / max(a, 1e-4)) * np.exp(-t / d)


# carpet scuff: band-limited noise with a soft attack, a little fibre "tick"
n = ns(0.32)
scuff = bp(colored(n, R, slope=-1.0), 900, 4200) * env(n, 0.03, 0.09)
ticks = np.zeros(n)
for k in R.integers(0, n - 200, 40):
    ticks[k] += R.uniform(-1, 1) * 0.6
scuff = scuff + hp(ticks, 3000) * env(n, 0.005, 0.12)
save("carpet-scuff", scuff, -24)

# static crackle: sparse sharp clicks, dry
n = ns(1.6)
cr = np.zeros(n)
pos = np.sort(R.integers(0, n - 400, 70))
for k in pos:
    m = R.integers(30, 160)
    cr[k:k + m] += hp(colored(m, R, 0.0), 2500) * np.exp(-np.arange(m) / (m / 4)) * R.uniform(0.3, 1.0)
cr *= np.minimum(1.0, np.arange(n) / ns(0.2)) * np.minimum(1.0, (n - np.arange(n)) / ns(0.3))
save("static-crackle", cr, -26, wet=0.05)

# the big spark, in slow motion: a crack, then a long bright electric buzz that sputters out
n = ns(1.6)
t = np.arange(n) / SR
crack = hp(colored(n, R, 0.5), 1200) * np.exp(-t / 0.012) * 3.0
hum_f = 120.0
buzz = np.sign(np.sin(2 * np.pi * hum_f * t)) * 0.25 + np.sin(2 * np.pi * hum_f * 3 * t) * 0.2
buzz = bp(buzz + colored(n, R, 0.0) * 0.6, 300, 6000)
sput = (np.abs(np.sin(2 * np.pi * 7.0 * t + R.uniform(0, 6))) ** 3) * np.exp(-t / 0.55)
zap = crack + buzz * sput * 0.9
save("spark-zap", zap, -14, wet=0.18)

# the small snap (the key)
n = ns(0.4)
t = np.arange(n) / SR
snap = hp(colored(n, R, 0.3), 1800) * np.exp(-t / 0.008) * 2.5 + bp(colored(n, R, 0.0), 1500, 7000) * np.exp(-t / 0.05) * 0.4
save("spark-small", snap, -16, wet=0.1)

# score: curious, light; quiet under the voice, silent across the big zap
Q = 60 / 100
MIX = np.zeros((2, ns(DUR)))
F = I.m2f
ms = rng(1314)


def note(x, tm, p=0.0, g=1.0):
    if 0 <= tm < DUR:
        x = np.asarray(x, float) * g
        place(MIX, x if x.ndim == 2 else pan(x, p), tm)


def grid(t0, t1, step):
    k = int(np.ceil(t0 / step))
    while k * step < t1:
        yield k * step
        k += 1


BASS = [45, 52, 48, 50]
for i, tm in enumerate(grid(0.2, C["spark"] - 1.6, Q)):
    note(I.pluck(F(BASS[(i // 2) % 4]), 0.5, ms, 0.4, bright=0.6), tm, -0.2, 0.55)
    if i % 2 == 1:
        note(I.glock(F(76 + (i * 3) % 7), 0.25, ms, 0.9), tm, 0.3, 0.25)
# tension builds into the reach
note(I.pad([F(57), F(60), F(64)], C["spark"] - C["reach"], 0.3, ms, att=1.5, rel=0.05, trem=lambda t_: 1 + 0.25 * np.sin(2 * np.pi * 7.0 * t_)), C["reach"], 0.0, 0.45)
# after the zap: the pluck again, a little sly for Newt's trick and the gag
for i, tm in enumerate(grid(C["recoil"] + 0.4, C["gagZap"] - 0.1, Q)):
    note(I.pluck(F(BASS[(i // 2) % 4] + 2), 0.5, ms, 0.4, bright=0.7), tm, -0.2, 0.5)
for k, mid in enumerate((76, 79, 83)):
    note(I.glock(F(mid), 0.35, ms, 1.4), C["keySpark"] + 0.25 + k * 0.1, 0.3, 0.35)
e0 = C["card"]
note(I.pad([F(57), F(61), F(64), F(69)], DUR - e0 - 0.2, 0.4, ms, att=0.3, rel=1.2), e0 + 0.1, 0.0, 0.5)
for k, mid in enumerate((76, 81, 85)):
    note(I.glock(F(mid), 0.4, ms, 1.6), e0 + 0.15 + k * 0.09, 0.25, 0.4)
score = MIX + 0.12 * convolve_st(MIX, ROOM)
score = norm_to(fades(score, 0.01, 0.4), -27.0, mode="integrated")
pk = np.max(np.abs(score))
if pk > 0.89:
    score *= 0.89 / pk
write_wav(os.path.join(OUT, "score-zap.wav"), score, 24)
print("ep13 sfx + score written")
