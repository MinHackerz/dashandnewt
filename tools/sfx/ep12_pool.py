"""Score for ep12 "It's RIGHT There" — original, seeded, numpy/scipy (the cartoon-3d-short skill's kit).

A sunny, straight-faced beach strut (marimba-ish plucks, vibes, brushes) timed to the picture from
tools/sfx/ep12_times.json (exported from the episode's timeline.ts by ep12-times.mjs). It stops dead on
every refraction shock (the "broken" arm, each bent-stick double take, the short legs), a snare roll
under the stick jab, three glock notes for Newt's chalk, a rising run when the gum brings the coin up,
a music-box wish, and the strut again — slyly — as Dash eyes the coin one more time.

Usage: .venv/bin/python -I tools/sfx/ep12_pool.py public/sfx
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "kit3d"))  # -I leaves the script dir off sys.path
import numpy as np
from dsp import ns, rng, fades, pan, place, make_ir, convolve_st, norm_to, write_wav
import instruments as I

OUT = sys.argv[1]
C = json.load(open(os.path.join(HERE, "ep12_times.json")))["CUE"]
DUR = C["dur"]
Q = 60 / 112
MIX = np.zeros((2, ns(DUR)))
F = I.m2f
ms = rng(1212)


def note(x, tm, p=0.0, g=1.0):
    if 0 <= tm < DUR:
        x = np.asarray(x, float) * g
        place(MIX, x if x.ndim == 2 else pan(x, p), tm)


def grid(t0, t1, step):
    k = int(np.ceil(t0 / step))
    while k * step < t1:
        yield k * step
        k += 1


BASS = [50, 57, 54, 57, 52, 59, 57, 55]  # D major, sunny
RIFF = [(0, 74), (0.5, 78), (1.0, 81), (2.0, 83), (2.5, 81), (3.0, 78)]


def strut(t0, t1, vel=1.0, up=0, holes=()):
    for i, tm in enumerate(grid(t0, t1, Q)):
        if any(a <= tm < b for a, b in holes):
            continue
        note(I.pluck(F(BASS[i % 8] + up), 0.75, ms, 0.45, bright=0.7), tm, -0.2, 0.8 * vel)
        note(I.brush(0.28, ms, 0.18), tm + Q / 2, 0.3, 0.38 * vel)
    for bar in grid(t0, t1 - 2 * Q, 4 * Q):
        for d, mid in RIFF:
            tm = bar + d * Q
            if tm < t1 and not any(a <= tm < b for a, b in holes):
                note(I.vibes(F(mid + up), 0.42, ms, 0.6, damp=0.25), tm, 0.25, 0.45 * vel)


def shock(tm, low=38):
    """a refraction shock: the music stops, a flat tuba and a high glock 'ting'"""
    note(I.brass(F(low), 0.5, 0.7, ms, kind="tuba", fall=2.5), tm, 0.0, 0.6)
    note(I.glock(F(low + 50), 0.45, ms, 1.0), tm + 0.02, 0.3, 0.4)


# hook + try 1: the strut, stopping dead on his "broken" arm
note(I.glock(F(93), 0.5, ms, 1.4), C["glint"], 0.3, 0.5)
strut(0.0, C["horror"] - 0.05)
shock(C["horror"])
for k, mid in enumerate((62, 61, 60)):  # sad descending pizz while he checks his arm
    note(I.pluck(F(mid), 0.6, ms, 0.5), C["horror"] + 0.9 + k * 0.45, -0.1, 0.6)
note(I.brass(F(36), 0.6, 0.6, ms, kind="tuba", fall=3.0), C["fist"] + 0.1, 0.0, 0.6)

# try 2: strut again, a hole at every bent-stick double take, a snare roll into the jab
holes = [(C["dip1"] - 0.05, C["out1"]), (C["dip2"] - 0.05, C["out2"])]
strut(C["grab"] - 0.3, C["jab"] - 0.6, 1.0, 0, holes)
shock(C["dip1"])
shock(C["dip2"], 40)
for tm, v in I.snare_roll(C["dip3"] + 0.1, C["hit"] - 0.02, 0.2, 0.85, ms):
    note(I.snare(v, ms, 0.25, buzz=True), tm, 0.1, 0.45)
note(I.brass(F(38), 0.45, 0.9, ms, kind="tuba", fall=4.0), C["hit"], 0.0, 0.8)
note(I.cymbal(0.4, ms, 1.0), C["hit"], 0.2, 0.3)

# try 3: tiptoe into the pool, a shock on the short legs, a timpani hit on the landing
for k, tm in enumerate(grid(C["step"] - 0.6, C["legs"], Q / 2)):
    note(I.pluck(F(62 - (k % 4) * 2), 0.5, ms, 0.25, bright=0.8), tm, 0.1, 0.5)
shock(C["legs"] + 0.05, 35)
note(I.pad([F(50), F(53), F(56)], C["pinch"] - C["legs"] - 0.2, 0.35, ms, att=0.4, rel=0.1, trem=lambda t_: 1 + 0.4 * np.sin(2 * np.pi * 8.0 * t_)), C["legs"] + 0.4, 0.0, 0.45)
note(I.brass(F(52), 0.3, 0.9, ms, kind="horn"), C["pinch"], 0.1, 0.6)
note(I.timpani(F(38), 0.8, ms, 1.4), C["land"], 0.0, 0.6)

# Newt thinks: three glock notes over a soft pad
note(I.pad([F(50), F(57), F(66)], C["lookEnd"] - C["look"], 0.3, ms, att=0.8, rel=0.6, warm=1200), C["look"], 0.0, 0.5)
for k, (dt, mid) in enumerate(((0.6, 81), (1.8, 78), (2.4, 86))):
    note(I.glock(F(mid), 0.4, ms, 1.8), C["look"] + dt, 0.2, 0.45)

# the gum trick: a light pizz walk, then a rising run as the coin comes up
for k, tm in enumerate(grid(C["lookEnd"] + 0.2, C["touch"], Q)):
    note(I.pluck(F(BASS[k % 8] + 12), 0.5, ms, 0.35), tm, -0.1, 0.45)
for k, mid in enumerate((74, 78, 81, 86, 90)):
    note(I.glock(F(mid), 0.4, ms, 1.2), C["touch"] + 0.4 + k * 0.12, 0.25, 0.45)
note(I.pad([F(62), F(66), F(69), F(74)], 1.5, 0.4, ms, att=0.15, rel=0.9, warm=1800), C["show"], 0.0, 0.5)

# the wish: music box
for k, (d, mid) in enumerate(RIFF):
    note(I.musicbox(F(mid + 12), 0.5, ms, 1.4), C["take"] + 0.4 + d * Q * 0.9, 0.2, 0.5)
note(I.pad([F(50), F(57), F(62), F(66)], C["settle"] - C["take"], 0.3, ms, att=0.8, rel=0.6), C["take"] + 0.3, 0.0, 0.4)
# … and the strut, slyly, as he eyes the coin again
strut(C["narrow"] - 0.1, C["end"], 0.85)

# the moral card
e0 = C["end"]
note(I.pad([F(50), F(54), F(57), F(62)], DUR - e0 - 0.3, 0.4, ms, att=0.3, rel=1.4), e0 + 0.35, 0.0, 0.55)
for k, mid in enumerate((74, 78, 81)):
    note(I.glock(F(mid), 0.4, ms, 1.6), e0 + 0.4 + k * 0.08, 0.25, 0.45)

room = make_ir(0.45, 1207, early=[(0.02, 0.2, -0.4), (0.037, 0.15, 0.5)])
score = MIX + 0.14 * convolve_st(MIX, room)
score = norm_to(fades(score, 0.01, 0.5), -24.0, mode="integrated")
peak = np.max(np.abs(score))
if peak > 0.89:
    score *= 0.89 / peak
write_wav(os.path.join(OUT, "score-rightthere.wav"), score, 24)
print("ep12 score written")
