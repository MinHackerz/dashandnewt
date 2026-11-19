"""SFX + score for short s01 "Why You Should NEVER Fry a Frozen Turkey" — original, seeded (numpy/scipy kit).

Cue times: tools/blender/s01_times.json (word-pinned to Liam's narration).
  s01-sizzle-bed    the quiet hiss of oil at 350 °F (loops under the first half)
  s01-sizzle-burst  the violent spit when the icy bird touches the oil
  s01-ice           a cold crystalline shimmer for "covered in ice"
  s01-drop          a soft low "bloop" for a melt drop sinking in oil
  s01-flash         water flashing to steam on the hot floor: a thump + crackle
  s01-whoosh        the ×1,700 expansion
  s01-boilover      the roaring surge of oil-steam froth climbing the pot
  s01-fireball      the WHOOMP when the oil hits the flame, then the roar
  s01-fire-roar     sustained fire roar (looping body)
  s01-tick          fast clock ticks for the thaw time-lapse
  s01-pat           paper towel pats
  s01-valve         the gas valve click and the flame going out
  s01-score         the music bed, by situation, mixed low under the voice
Usage: .venv/bin/python -I tools/sfx/s01_turkey.py public/sfx
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "kit3d"))
import numpy as np
from dsp import SR, ns, rng, lp, hp, bp, colored, fades, pan, place, make_ir, convolve_st, norm_to, write_wav, st, smooth_noise
import instruments as I

OUT = sys.argv[1]
T = json.load(open(os.path.join(HERE, "..", "blender", "s01_times.json")))
C = T["CUE"]
DUR = T["DUR"]
R = rng(2611)
ROOM = make_ir(0.6, 2611, early=[(0.015, 0.3, -0.3), (0.033, 0.22, 0.4)])


def save(name, x, lufs=-18.0, wet=0.12):
    x = np.asarray(x, float)
    if x.ndim == 1:
        x = np.concatenate([x, np.zeros(ns(0.3))])
        y = st(x) + wet * convolve_st(x, ROOM)
    else:
        y = x
    y = norm_to(fades(y, 0.003, 0.05), lufs)
    pk = np.max(np.abs(y))
    if pk > 0.89:
        y *= 0.89 / pk
    write_wav(os.path.join(OUT, f"{name}.wav"), y, 24)


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1.0, t / max(a, 1e-4)) * np.exp(-t / d)


def crackle(n, rate, r, hi=2500):
    x = np.zeros(n)
    for k in r.integers(0, max(1, n - 300), int(rate * n / SR)):
        m = int(r.integers(20, 200))
        x[k:k + m] += hp(colored(m, r, 0.0), hi) * np.exp(-np.arange(m) / (m / 4)) * r.uniform(0.2, 1.0)
    return x


# hot-oil hiss: steady band-limited noise with tiny pops
n = ns(8.0)
bed = bp(colored(n, R, -0.5), 1800, 9000) * (0.6 + 0.4 * smooth_noise(n, R, 2.0)) + crackle(n, 25, R) * 0.5
save("s01-sizzle-bed", bed, -30, wet=0.05)

# the burst when ice meets oil: a loud spitting sizzle that decays
n = ns(3.0)
t = np.arange(n) / SR
burst = (bp(colored(n, R, -0.3), 1200, 10000) * 1.2 + crackle(n, 400, R) * 1.5) * (np.minimum(1, t / 0.03) * np.exp(-t / 1.2) + 0.15)
save("s01-sizzle-burst", burst, -17, wet=0.1)

# ice shimmer: glassy partials
n = ns(1.8)
t = np.arange(n) / SR
ice = sum(np.sin(2 * np.pi * f * t + R.uniform(0, 6)) * np.exp(-t / R.uniform(0.3, 0.9)) * R.uniform(0.3, 1) for f in (2637, 3136, 3951, 4699, 5274))
ice = ice * np.minimum(1, t / 0.01) + hp(colored(n, R, 0.0), 6000) * env(n, 0.01, 0.2) * 0.3
save("s01-ice", ice, -24, wet=0.3)

# drop "bloop": a low, damped bubble resonance (heard as if inside the oil)
n = ns(0.5)
t = np.arange(n) / SR
f = 380 * (1 + 0.8 * np.exp(-t / 0.05))
bloop = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.004, 0.08)
save("s01-drop", lp(bloop, 1800), -26, wet=0.2)

# flash to steam: deep thump + crackle
n = ns(1.2)
t = np.arange(n) / SR
thump = np.sin(2 * np.pi * np.cumsum(70 * (1 + 2.5 * np.exp(-t / 0.03))) / SR) * env(n, 0.003, 0.18)
flash = thump * 1.4 + crackle(n, 300, R) * env(n, 0.005, 0.25) * 1.2 + bp(colored(n, R, 0.0), 800, 6000) * env(n, 0.005, 0.12) * 0.6
save("s01-flash", flash, -15, wet=0.15)

# whoosh: rising filtered noise sweep
n = ns(1.6)
t = np.arange(n) / SR
sw = colored(n, R, -1.0)
out = np.zeros(n)
for i, (lo, hi) in enumerate(np.linspace([200, 600], [2500, 7000], 8)):
    a, b = i * n // 8, (i + 1) * n // 8
    out[a:b] = bp(sw, lo, hi)[a:b]
whoosh = lp(out, 8000) * np.sin(np.pi * np.minimum(1, t / 1.6)) ** 1.5
save("s01-whoosh", whoosh, -19, wet=0.2)

# boil-over surge: a roaring, gurgling boil building up
n = ns(3.5)
t = np.arange(n) / SR
gurg = np.zeros(n)
for k in R.integers(0, n - ns(0.2), 260):
    m = ns(R.uniform(0.04, 0.12))
    f0 = R.uniform(120, 420)
    tt_ = np.arange(m) / SR
    gurg[k:k + m] += np.sin(2 * np.pi * f0 * (1 + 0.6 * tt_ / tt_[-1]) * tt_) * np.exp(-tt_ / (m / SR / 3)) * R.uniform(0.3, 1)
boil = (lp(gurg, 2500) * 1.2 + bp(colored(n, R, -0.6), 300, 5000) * 0.8 + crackle(n, 300, R)) * np.minimum(1, t / 1.6) ** 1.5
save("s01-boilover", boil, -15, wet=0.12)

# fireball: WHOOMP (low burst) + sustained roar
n = ns(4.0)
t = np.arange(n) / SR
whoomp = lp(colored(n, R, -1.5), 300) * env(n, 0.02, 0.5) * 3.0 + np.sin(2 * np.pi * np.cumsum(45 * (1 + np.exp(-t / 0.1))) / SR) * env(n, 0.01, 0.6) * 1.5
roar = lp(colored(n, R, -1.0), 1200) * (0.6 + 0.4 * smooth_noise(n, R, 6.0)) * np.minimum(1, t / 0.4)
save("s01-fireball", whoomp + roar * 0.9 + crackle(n, 120, R) * 0.6, -12, wet=0.2)
n = ns(6.0)
roar = lp(colored(n, R, -1.0), 1000) * (0.6 + 0.4 * smooth_noise(n, R, 5.0)) + crackle(n, 80, R) * 0.5
save("s01-fire-roar", roar, -20, wet=0.15)

# clock ticks (time-lapse): fast, crisp
n = ns(1.6)
tick = np.zeros(n)
for k in range(0, n - ns(0.02), ns(0.067)):
    m = ns(0.012)
    tick[k:k + m] += hp(colored(m, R, 0.0), 3000) * np.exp(-np.arange(m) / (m / 5))
save("s01-tick", tick, -24, wet=0.1)

# paper towel pats
n = ns(1.4)
pat = np.zeros(n)
for k in (0.0, 0.35, 0.7, 1.0):
    m = ns(0.14)
    a = ns(k)
    pat[a:a + m] += bp(colored(m, R, -0.5), 400, 4000) * env(m, 0.005, 0.04)
save("s01-pat", pat, -24, wet=0.08)

# gas valve click + flame dying out
n = ns(1.2)
t = np.arange(n) / SR
click = hp(colored(n, R, 0.0), 2000) * np.exp(-t / 0.006) * 2
hissout = bp(colored(n, R, -0.3), 500, 4000) * np.exp(-t / 0.25) * 0.6
save("s01-valve", click + hissout, -20, wet=0.1)

# ─── score: by situation, low under the voice ──────────────────────────────
MIX = np.zeros((2, ns(DUR)))
F = I.m2f
ms = rng(2612)


def note(x, tm, p=0.0, g=1.0):
    if 0 <= tm < DUR:
        x = np.asarray(x, float) * g
        place(MIX, x if x.ndim == 2 else pan(x, p), tm)


def grid(t0, t1, step):
    k = int(np.ceil(t0 / step))
    while k * step < t1:
        yield k * step
        k += 1


# One somber, peaceful, slow underscore (60 BPM, a chord every 4 s, D minor: Dm – Bb – F – C) with a sparse, soft
# two-note figure per chord. Same instruments and pace from the first second to the last: no pulse, no percussion,
# no noise. It only ever sits under the narration; the action sounds carry the events.
BAR = 4.0
CHORDS = [  # (pad voicing, the two soft notes over it)
    ([50, 57, 62, 65], (69, 65)),   # Dm
    ([46, 53, 58, 62], (70, 65)),   # Bb
    ([53, 57, 60, 65], (69, 72)),   # F
    ([48, 55, 60, 64], (67, 64)),   # C
]
k = 0
tm = 0.0
while tm < DUR - 1.0:
    last = tm + BAR >= DUR - 1.0
    voicing, mel = CHORDS[k % 4] if not last else ([50, 57, 62, 65], (69, 74))  # come home to D minor at the end
    note(I.pad([F(m) for m in voicing], BAR + 1.6, 0.38, ms, att=1.4, rel=1.8, warm=520), tm, 0.0, 0.42)
    note(I.pluck(F(mel[0]), 0.34, ms, 3.2, bright=0.16), tm + 0.5, -0.15, 0.36)
    note(I.pluck(F(mel[1]), 0.30, ms, 3.0, bright=0.14), tm + 2.5, 0.18, 0.30)
    tm += BAR
    k += 1
score = MIX + 0.15 * convolve_st(MIX, ROOM)
score = norm_to(fades(score, 0.6, 2.2), -29.0, mode="integrated")  # low: the voice leads
pk = np.max(np.abs(score))
if pk > 0.89:
    score *= 0.89 / pk
write_wav(os.path.join(OUT, "s01-score.wav"), score, 24)
print("s01 sfx + score written")
