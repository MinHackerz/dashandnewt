"""SFX + score for short s02 "Why You Shiver" — original, seeded (numpy/scipy kit).

Cue times: tools/blender/s02_times.json (word-pinned to Liam's narration).
  s02-wind          cold wind over the snow (bed, loops)
  s02-shiver        Dash's shiver: a fast (~9 Hz) trembling rustle of cloth and breath
  s02-thermal-on    the thermal camera switching on: click, rising whine, two blips
  s02-xray          the skin turning to glass: a soft glassy shimmer sweep
  s02-pull          a muscle pulling: a low, stretched rubbery creak
  s02-tremble       the tug-of-war: a trembling, tense rumble at the shiver rate
  s02-heat          "turns into HEAT": a warm whoom with soft crackle
  s02-chatter       teeth clacking at 7 Hz, each click on a closing of the jaw (front teeth shot)
  s02-jaw-chatter   the same, bonier and deeper, for the skull shot
  s02-goose         goosebumps rising: tiny soft pops that rise in pitch
  s02-toss          the coat flying in: a cloth whoosh
  s02-land          the coat landing on his head: a soft padded thump
  s02-score         a light, curious winter underscore, low under the voice
Usage: .venv/bin/python -I tools/sfx/s02_shiver.py public/sfx
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
T = json.load(open(os.path.join(HERE, "..", "blender", "s02_times.json")))
C, PH = T["CUE"], T["PHYS"]
DUR = T["DUR"]
R = rng(2621)
ROOM = make_ir(0.5, 2621, early=[(0.013, 0.3, -0.3), (0.029, 0.22, 0.4)])


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


# wind: two bands of noise breathing slowly, with a faint whistle in gusts
n = ns(12.0)
t = np.arange(n) / SR
gust = 0.55 + 0.45 * smooth_noise(n, R, 0.35)
low = lp(colored(n, R, -1.6), 420) * gust
high = bp(colored(n, R, -0.6), 900, 3200) * gust ** 2 * 0.35
whistle = np.sin(2 * np.pi * np.cumsum(780 + 140 * smooth_noise(n, R, 0.5)) / SR) * np.maximum(0, gust - 0.75) * 0.25
wind = low + high + whistle
k = ns(1.0)  # crossfade the ends so it loops
wind[:k] = wind[:k] * np.linspace(0, 1, k) + wind[-k:] * np.linspace(1, 0, k)
save("s02-wind", wind[:-k], -26, wet=0.05)

# shiver: cloth rustle + shaky breath, amplitude-modulated at the shiver rate
n = ns(2.4)
t = np.arange(n) / SR
trem = 0.5 + 0.5 * np.abs(np.sin(2 * np.pi * PH["shiver_hz"] / 2 * t + R.uniform(0, 1)))
rustle = bp(colored(n, R, -0.4), 700, 5000) * trem
breath = bp(colored(n, R, -1.0), 300, 1600) * (0.4 + 0.6 * np.sin(np.pi * np.minimum(1, t / 2.4)))
save("s02-shiver", (rustle * 0.8 + breath * 0.6) * np.sin(np.pi * np.minimum(1, t / 2.4)) ** 0.5, -27, wet=0.1)

# thermal camera on: relay click, a rising whine, two digital blips
n = ns(0.9)
t = np.arange(n) / SR
clk = hp(colored(n, R, 0.0), 2500) * np.exp(-t / 0.004) * 2.2
whine = np.sin(2 * np.pi * np.cumsum(1800 + 2600 * np.minimum(1, t / 0.45)) / SR) * env(n, 0.02, 0.35) * 0.25
blips = np.zeros(n)
for tb, f in ((0.32, 1760.0), (0.44, 2349.0)):
    a = ns(tb)
    m = ns(0.07)
    blips[a:a + m] += np.sign(np.sin(2 * np.pi * f * np.arange(m) / SR)) * np.exp(-np.arange(m) / ns(0.03)) * 0.25
save("s02-thermal-on", clk + whine + lp(blips, 6000), -19, wet=0.1)

# x-ray: glassy partials sweeping up through a soft noise wash
n = ns(1.6)
t = np.arange(n) / SR
glass = sum(np.sin(2 * np.pi * f * (1 + 0.5 * t / 1.6) * t + R.uniform(0, 6)) * R.uniform(0.3, 1.0) for f in (1320, 1980, 2640, 3520))
wash = bp(colored(n, R, -0.8), 2000, 9000) * 0.6
save("s02-xray", (glass * 0.25 + wash) * np.sin(np.pi * np.minimum(1, t / 1.6)) ** 1.2, -22, wet=0.35)

# muscle pull: stretched rubber creak (resonant noise gliding up) under a low strain
n = ns(0.9)
t = np.arange(n) / SR
f0 = 90 * (1 + 0.6 * t / 0.9)
creak = np.zeros(n)
for k in range(0, n, ns(0.018)):  # stick-slip pulses
    m = ns(0.012)
    creak[k:k + m] += np.exp(-np.arange(min(m, n - k)) / ns(0.003)) * R.uniform(0.4, 1.0)
creak = bp(np.convolve(creak, np.sin(2 * np.pi * 420 * np.arange(ns(0.01)) / SR), "same"), 200, 1600)
strain = np.sin(2 * np.pi * np.cumsum(f0) / SR) * 0.6 + lp(colored(n, R, -1.5), 300) * 0.4
save("s02-pull", (creak * 0.8 + strain) * env(n, 0.08, 0.45), -20, wet=0.15)

# tug-of-war tremble: a tense low rumble pulsing at the shiver rate
n = ns(3.0)
t = np.arange(n) / SR
pulse = 0.55 + 0.45 * np.abs(np.sin(np.pi * PH["shiver_hz"] * t))
rumble = lp(colored(n, R, -1.8), 220) * pulse + np.sin(2 * np.pi * 55 * t) * pulse * 0.25
save("s02-tremble", rumble * np.sin(np.pi * np.minimum(1, t / 3.0)) ** 0.6, -21, wet=0.1)

# heat: a warm, rising whoom with a soft crackle on top
n = ns(2.0)
t = np.arange(n) / SR
whoom = lp(colored(n, R, -1.4), 700) * np.sin(np.pi * np.minimum(1, t / 2.0)) * 1.3
crk = np.zeros(n)
for k in R.integers(0, n - 400, 120):
    m = int(R.integers(40, 260))
    crk[k:k + m] += hp(colored(m, R, 0.0), 2200) * np.exp(-np.arange(m) / (m / 4)) * R.uniform(0.2, 1.0)
save("s02-heat", whoom + crk * 0.35 * np.minimum(1, t / 0.6), -19, wet=0.2)


# teeth chatter: one click per jaw closing; the jaw shuts at the zeros of |sin(π·7·t)| (s02_shots.py "clack")
def chatter(dur, hz, tone, body, lufs, name):
    n = ns(dur)
    x = np.zeros(n)
    k = 1
    while k / hz < dur - 0.05:
        a = ns(k / hz)
        m = ns(0.03)
        tk = np.arange(m) / SR
        click = hp(colored(m, R, 0.0), tone) * np.exp(-tk / 0.0025) + np.sin(2 * np.pi * body * tk) * np.exp(-tk / 0.006) * 0.5
        x[a:a + m] += click * R.uniform(0.7, 1.0)
        k += 1
    save(name, x, lufs, wet=0.08)


chatter(C["jaw"] + 0.3 - (C["teeth"] + 0.35), PH["chatter_hz"], 3500, 2600, -21, "s02-chatter")
chatter(C["goose"] - (C["jaw"] - 0.25), PH["chatter_hz"], 1800, 900, -21, "s02-jaw-chatter")

# goosebumps: tiny soft pops, rising in pitch as more bumps rise
n = ns(1.4)
x = np.zeros(n)
for i in range(46):
    tm = 1.2 * (i / 46) ** 0.8 + R.uniform(-0.02, 0.02)
    a = ns(max(0.0, tm))
    m = ns(0.04)
    f = 900 + 1500 * tm / 1.2 + R.uniform(-80, 80)
    tk = np.arange(m) / SR
    if a + m < n:
        x[a:a + m] += np.sin(2 * np.pi * f * tk) * np.exp(-tk / 0.008) * R.uniform(0.4, 1.0)
save("s02-goose", x, -24, wet=0.25)

# coat toss: a cloth whoosh (flapping fabric) over the 0.75 s flight
n = ns(0.9)
t = np.arange(n) / SR
flap = 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 7 * t))
toss = bp(colored(n, R, -0.8), 250, 3500) * flap * np.sin(np.pi * np.minimum(1, t / 0.9)) ** 1.4
save("s02-toss", toss, -21, wet=0.12)

# landing: a soft, padded thump with a cloth settle
n = ns(0.7)
t = np.arange(n) / SR
thump = np.sin(2 * np.pi * np.cumsum(110 * (1 + np.exp(-t / 0.03))) / SR) * env(n, 0.003, 0.07)
settle = bp(colored(n, R, -0.6), 300, 3000) * env(n, 0.01, 0.18) * 0.5
save("s02-land", thump * 1.2 + settle, -19, wet=0.1)

# ─── score: light, curious, wintry (music box + soft pizzicato + pad), low under the voice ──────────
MIX = np.zeros((2, ns(DUR)))
F = I.m2f
ms = rng(2622)


def note(x, tm, p=0.0, g=1.0):
    if 0 <= tm < DUR:
        x = np.asarray(x, float) * g
        place(MIX, x if x.ndim == 2 else pan(x, p), tm)


BPM = 100
B = 60 / BPM
BAR = 4 * B
CHORDS = [([57, 64, 69, 72], [76, 72, 69, 72]), ([53, 60, 65, 69], [77, 72, 69, 72]),  # Am – F
          ([48, 55, 60, 64], [76, 72, 67, 72]), ([55, 62, 67, 71], [74, 71, 67, 71])]  # C – G
tm, k = 0.0, 0
while tm < DUR - 0.5:
    voicing, mel = CHORDS[k % 4]
    note(I.pad([F(m) for m in voicing], BAR + 1.0, 0.3, ms, att=0.8, rel=1.2, warm=700), tm, 0.0, 0.3)
    for j, m in enumerate(mel):  # music-box figure on every beat
        note(I.musicbox(F(m + 12), 0.4, ms, 1.4), tm + j * B, 0.25 * (-1) ** j, 0.32)
    for j in (0, 2):  # soft pizzicato bass on 1 and 3
        note(I.pluck(F(voicing[0] - 12), 0.45, ms, 0.6, bright=0.25), tm + j * B, -0.1, 0.45)
    tm += BAR
    k += 1
# button: the music stops for the coat landing, then one warm chord under the moral card
cut = C["coat_land"] - 0.05
MIX[:, ns(cut):] *= 0.0
note(I.pad([F(m) for m in (48, 55, 60, 64, 67)], 2.8, 0.45, ms, att=0.05, rel=1.4, warm=900), C["coat_land"] + 0.35, 0.0, 0.5)
note(I.glock(F(84), 0.5, ms, 2.0), C["coat_land"] + 0.35, 0.2, 0.4)
score = MIX + 0.18 * convolve_st(MIX, ROOM)
score = norm_to(fades(score, 0.3, 1.5), -28.0, mode="integrated")
pk = np.max(np.abs(score))
if pk > 0.89:
    score *= 0.89 / pk
write_wav(os.path.join(OUT, "s02-score.wav"), score, 24)
print("s02 sfx + score written")
