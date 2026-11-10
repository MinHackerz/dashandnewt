"""Score for ep11 "Wrong Door" — original, seeded, numpy/scipy (the cartoon-3d-short skill's kit).

A straight-faced comedy score timed to the picture (REAL-clock cue times from tools/sfx/ep11_times.json,
exported from the episode's timeline.ts by ep11-times.mjs): a confident pizzicato strut for Dash that stops
dead every time the door wins, a snare roll for the run-up, three "thinking" notes for Newt's chalk, a
rising run when one finger opens it, the strut again (prouder) while the door quietly closes, silence on
the slam, then a small music box to the moral card. The foley is the house kit's (creak, latch, thud...).

Usage: .venv/bin/python -I tools/sfx/ep11_door.py public/sfx
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "kit3d"))  # -I leaves the script dir off sys.path
import numpy as np
from dsp import ns, rng, fades, pan, place, make_ir, convolve_st, norm_to, write_wav
import instruments as I

OUT = sys.argv[1]
C = json.load(open(os.path.join(HERE, "ep11_times.json")))["CUE"]
DUR = C["dur"]
Q = 60 / 104
MIX = np.zeros((2, ns(DUR)))
F = I.m2f
ms = rng(1111)


def note(x, tm, p=0.0, g=1.0):
    if 0 <= tm < DUR:
        x = np.asarray(x, float) * g
        place(MIX, x if x.ndim == 2 else pan(x, p), tm)


def grid(t0, t1, step):
    k = int(np.ceil(t0 / step))
    while k * step < t1:
        yield k * step
        k += 1


BASS = [48, 55, 52, 55, 50, 57, 55, 53]  # C major strut
RIFF = [(0, 72), (0.5, 76), (1.0, 79), (1.5, 76), (2.5, 74), (3.0, 72)]


def strut(t0, t1, vel=1.0, up=0):
    for i, tm in enumerate(grid(t0, t1, Q)):
        note(I.pluck(F(BASS[i % 8] + up), 0.75, ms, 0.5), tm, -0.2, 0.8 * vel)
        note(I.brush(0.3, ms, 0.2), tm + Q / 2, 0.3, 0.4 * vel)
    for bar in grid(t0, t1 - 2 * Q, 4 * Q):
        for d, mid in RIFF:
            if bar + d * Q < t1:
                note(I.vibes(F(mid + up), 0.45, ms, 0.6, damp=0.25), bar + d * Q, 0.25, 0.5 * vel)


def fail(tm, low=36):
    """the door wins: a flat tuba note and a dry woodblock-ish pluck"""
    note(I.brass(F(low), 0.55, 0.7, ms, kind="tuba", fall=3.0), tm, 0.0, 0.7)
    note(I.pluck(F(low + 24), 0.5, ms, 0.3, bright=0.9), tm, 0.2, 0.4)


# A — walking up, try 1 and try 2: the strut, cut dead each time the door wins
strut(0.0, C["try1"] + 0.9)
fail(C["try1"] + 1.0)
strut(C["give1"], C["try2"] + 0.2)
# straining: a tremolo pad that climbs, then gives up
note(I.pad([F(48), F(52), F(55)], C["give2"] - C["try2"], 0.4, ms, att=0.8, rel=0.1, trem=lambda t_: 1 + 0.35 * np.sin(2 * np.pi * 7.0 * t_)), C["try2"], 0.0, 0.5)
for k, tm in enumerate(grid(C["try2"] + 0.6, C["give2"] - 0.2, Q)):
    note(I.pluck(F(48 + k), 0.7, ms, 0.4), tm, -0.2, 0.7)
fail(C["give2"], 34)

# B — try 3: tiptoe pizz while he backs up, a snare roll for the run, a brass hit on the door, then nothing
for k, tm in enumerate(grid(C["back"], C["set"], Q / 2)):
    note(I.pluck(F(60 - (k % 4) * 2), 0.5, ms, 0.25, bright=0.8), tm, 0.1, 0.5)
for tm, v in I.snare_roll(C["set"] + 0.2, C["hit"] - 0.02, 0.2, 0.85, ms):
    note(I.snare(v, ms, 0.25, buzz=True), tm, 0.1, 0.5)
note(I.brass(F(41), C["hit"] - C["run"], 0.8, ms, kind="tuba"), C["run"], 0.0, 0.6)
note(I.brass(F(36), 0.5, 0.95, ms, kind="tuba", fall=5.0), C["hit"], 0.0, 0.9)
note(I.cymbal(0.5, ms, 1.2), C["hit"], 0.2, 0.35)
note(I.timpani(F(36), 0.8, ms, 1.4), C["land"], 0.0, 0.6)

# C — Newt thinks: three glock notes over a soft pad, one per chalk mark
note(I.pad([F(48), F(55), F(64)], C["lookEnd"] - C["look"], 0.3, ms, att=0.8, rel=0.6, warm=1200), C["look"], 0.0, 0.5)
for k, (dt, mid) in enumerate(((0.5, 79), (1.3, 76), (2.6, 84))):
    note(I.glock(F(mid), 0.4, ms, 1.8), C["look"] + dt, 0.2, 0.45)

# D — one finger: a rising glock run as the door swings, a bright chord when it's open
for k, mid in enumerate((72, 76, 79, 84, 88)):
    note(I.glock(F(mid), 0.4, ms, 1.2), C["push"] + 0.1 + k * 0.13, 0.25, 0.45)
note(I.pad([F(60), F(64), F(67), F(72)], 1.4, 0.4, ms, att=0.15, rel=0.9, warm=1800), C["push"] + 0.8, 0.0, 0.5)

# E — pride: the strut again, a tone higher and louder, while the door closes behind his shut eyes
strut(C["proud"], C["slam"] - 0.05, 1.1, up=2)
note(I.brass(F(50), 0.5, 0.7, ms, kind="horn"), C["go"], 0.1, 0.5)
# … and nothing at all on the slam (the cut is the joke); one sad tuba when he has slid down
fail(C["fall"] + 0.35, 33)

# F — heart: the riff as a slow music box from the second finger push to the moral card
g0 = C["push2"]
note(I.pad([F(48), F(55), F(60), F(64)], C["end"] - g0 + 0.4, 0.3, ms, att=1.0, rel=0.8), g0, 0.0, 0.45)
for d, mid in RIFF:
    note(I.musicbox(F(mid + 12), 0.5, ms, 1.4), g0 + 0.3 + d * Q * 1.25, 0.2, 0.5)
e0 = C["end"]
note(I.pad([F(48), F(52), F(55), F(60)], DUR - e0 - 0.3, 0.4, ms, att=0.3, rel=1.4), e0 + 0.35, 0.0, 0.55)
for k, mid in enumerate((72, 76, 79)):
    note(I.glock(F(mid), 0.4, ms, 1.6), e0 + 0.4 + k * 0.08, 0.25, 0.45)

room = make_ir(0.5, 1107, early=[(0.02, 0.2, -0.4), (0.037, 0.15, 0.5)])
score = MIX + 0.16 * convolve_st(MIX, room)
score = norm_to(fades(score, 0.01, 0.5), -24.0, mode="integrated")
peak = np.max(np.abs(score))
if peak > 0.89:
    score *= 0.89 / peak
write_wav(os.path.join(OUT, "score-door.wav"), score, 24)
print("ep11 score written")
