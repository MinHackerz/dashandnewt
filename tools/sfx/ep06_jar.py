"""SFX + score for ep06 "The Jar" — original, seeded, numpy/scipy (the cartoon-3d-short skill's kit).

Realistic kitchen foley from physical models (friction "creaks", modal glass / tin / steel / wood, a vacuum
release, a spun lid settling), all in one small-kitchen reverb, plus an original score timed to the picture
(beat times from tools/sfx/ep06_times.json, exported from the episode's timeline.ts by ep06-times.mjs).

Usage: .venv/bin/python -I tools/sfx/ep06_jar.py public/sfx
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "kit3d"))  # -I leaves the script dir off sys.path
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, fades, modal, st, pan, place, make_ir, convolve_st, norm_to, write_wav, phase
import sfx_gen as G
import instruments as I

OUT = sys.argv[1]
T = json.load(open(os.path.join(HERE, "ep06_times.json")))
R = rng(606)
rr = lambda: rng(int(R.integers(1 << 30)))

# ── materials: modal sets (freq, amp, tau) for strikes, (freq, q, gain) for friction ──
GLASS = [(1250, 1.0, 0.12), (2930, 0.6, 0.08), (5100, 0.35, 0.05), (7400, 0.2, 0.03)]
TIN = [(1900, 1.0, 0.035), (3350, 0.7, 0.025), (5200, 0.45, 0.016), (7300, 0.25, 0.01)]
STEEL = [(1050, 1.0, 0.35), (2480, 0.6, 0.22), (3920, 0.45, 0.14), (5630, 0.3, 0.09), (7700, 0.18, 0.05)]
FLOOR = [(110, 1.0, 0.05), (240, 0.6, 0.035), (520, 0.35, 0.02)]
TABLETOP = [(210, 1.0, 0.025), (480, 0.5, 0.016), (1100, 0.25, 0.008)]
TIN_RB = [(1900, 30, 1.0), (3350, 35, 0.7), (5200, 40, 0.45)]
STEEL_RB = [(1050, 25, 1.0), (1900, 30, 0.8), (3350, 35, 0.5)]
SKIN_RB = [(2300, 18, 1.0), (3400, 22, 0.6), (1600, 15, 0.5)]
CLOTH_RB = [(380, 6, 1.0), (820, 7, 0.6), (1500, 8, 0.3)]

IR = make_ir(0.32, 77, early=[(0.011, 0.5, -0.4), (0.019, 0.4, 0.5), (0.031, 0.3, -0.2)])


def scaled(modes, k=1.0, tau=1.0, amp=1.0):
    return [(f * k, a * amp, d * tau) for f, a, d in modes]


def hit(modes, dur, r, hard=1.0):
    """a strike: the material's modes plus a contact click (harder = brighter click)"""
    y = modal(dur, modes, r)
    t = tt(dur)
    return y + hard * 0.35 * hp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.0009)


def pad_to(x, dur):
    n = ns(dur)
    return np.concatenate([x, np.zeros(max(0, n - len(x)))])[:n]


def add(dst, x, t, g=1.0):
    k = ns(t)
    if k >= len(dst):
        return
    seg = x[: len(dst) - k]
    dst[k: k + len(seg)] += g * seg


def save(name, x, lufs=-16.0, wet=0.12):
    """small-kitchen room, loudness-normalised (max momentary), written stereo 24-bit"""
    x = np.concatenate([np.asarray(x, float), np.zeros(ns(0.35))])
    y = st(x) + wet * convolve_st(x, IR)
    y = norm_to(fades(y, 0.002, 0.03), lufs)
    peak = np.max(np.abs(y))
    if peak > 0.89:
        y *= 0.89 / peak
    write_wav(os.path.join(OUT, f"{name}.wav"), y, 24)


# ── TRY #1: gripping the knurled lid, the palm skidding off ─────────────
r = rr()
grip = G.creak(2.6, r, 18, 34, modes=SKIN_RB, rough=0.35, noise=0.12)
grip += 0.35 * G.creak(2.6, r, 70, 120, modes=TIN_RB, rough=0.2, noise=0.03)
for tm in (0.6, 1.3, 2.0):
    add(grip, 0.25 * hit(scaled(GLASS, tau=0.4), 0.2, r, 0.3), tm)
save("jar-grip", grip, -20)
save("jar-squeak", G.creak(0.3, rr(), 260, 420, modes=[(2100, 60, 1.0), (4200, 50, 0.3)], rough=0.05, noise=0.06, shape_pts=[(0, 0), (0.1, 1), (0.6, 0.9), (1, 0)]), -17)

# ── TRY #2: wool wrung into a rope around the lid ───────────────────────
r = rr()
scarf = G.creak(3.4, r, 30, 55, modes=CLOTH_RB, rough=0.5, noise=0.35)
scarf += 0.3 * G.creak(3.4, r, 60, 95, modes=TIN_RB, rough=0.2, noise=0.02)
save("scarf-twist", scarf, -21)

# ── TRY #3: the pipe wrench ─────────────────────────────────────────────
r = rr()
box = pad_to(G.rattle(0.6, r, 40, heavy=True), 0.6)
add(box, hit(scaled(FLOOR, k=3.6, tau=0.7), 0.3, r, 0.5), 0.0, 0.7)
save("toolbox-rattle", box, -20)
r = rr()
bite = pad_to(hit(scaled(STEEL, tau=0.45), 0.6, r, 0.8), 0.6)
for tm in (0.06, 0.1):
    add(bite, 0.4 * G.clink(r, 2600, 0.08), tm)
save("wrench-bite", bite, -18)
save("wrench-strain", G.creak(1.8, rr(), 45, 90, modes=STEEL_RB, rough=0.25, noise=0.04), -21)
r = rr()
slip = pad_to(G.creak(0.15, r, 300, 600, modes=STEEL_RB, rough=0.3, noise=0.3), 0.45)
add(slip, 0.5 * G.whoosh(0.32, r, peak=0.08, f_lo=600, f_hi=3000), 0.05)
save("wrench-slip", slip, -18)
r = rr()
t = tt(0.8)
thump = np.exp(-t / 0.08) * np.sin(phase(75 * (1 + 0.4 * np.exp(-t / 0.02))))
thump = thump + 0.8 * modal(0.8, FLOOR, r) + 0.25 * bp(r.standard_normal(len(t)), 300, 2500) * np.clip(t / 0.01, 0, 1) * np.exp(-t / 0.08)
save("body-fall", thump, -15)
r = rr()
drop = np.zeros(ns(1.0))
for tm, g in ((0.0, 1.0), (0.13, 0.45), (0.21, 0.25)):
    add(drop, g * hit(scaled(STEEL, tau=0.35), 0.6, r, 1.0), tm)
    add(drop, g * 0.6 * hit(FLOOR, 0.3, r, 0.2), tm)
save("wrench-drop", drop, -18)

# ── footsteps on the wooden floor (four takes so a walk never repeats) ──
for k in range(4):
    save(f"step-{k + 1}", lp(G.stroll_step(rr(), scuff=0.3 + 0.15 * k), 5000), -24)
knees = np.zeros(ns(0.4))
r = rr()
for tm, g in ((0.0, 1.0), (0.09, 0.8)):
    add(knees, g * lp(G.stroll_step(r, 0.1), 2500), tm)
save("knees-down", knees, -21)

# ── jars, lids, spoon ───────────────────────────────────────────────────
r = rr()
jd = pad_to(0.6 * hit(scaled(GLASS, tau=0.5), 0.45, r, 0.6), 0.5)
add(jd, hit(TABLETOP, 0.3, r, 0.3), 0.0)
save("jar-down", jd, -20)
r = rr()
jl = 0.3 * bp(r.standard_normal(ns(0.35)), 800, 3000) * np.exp(-tt(0.35) / 0.06)
add(jl, 0.3 * hit(scaled(GLASS, k=1.15, tau=0.25), 0.25, r, 0.2), 0.08)
save("jar-lift", jl, -24)
r = rr()
sp = pad_to(G.clink(r, 3200, 0.3, 0.8), 0.4)
add(sp, 0.5 * hit(TABLETOP, 0.2, r, 0.2), 0.0)
save("spoon-clink", sp, -22)
r = rr()
# the vacuum lets go: a lid-flex tick, a sharp rush of air in, the jar's air cavity going "thup"
tv = tt(0.6)
air = hp(colored(len(tv), r, 0.3), 1500) * np.clip(tv / 0.003, 0, 1) * np.exp(-tv / 0.09)
air = bp(air, 2000, 9000)
pf = air + 0.5 * modal(0.6, [(330, 0.6, 0.05), (660, 0.2, 0.03)], r)
add(pf, 0.4 * hit(scaled(TIN, tau=0.4), 0.15, r, 0.6), 0.0)
save("vacuum-pfft", pf, -16)
save("button-pop", hit([(3100, 1.0, 0.02), (4900, 0.6, 0.015), (7200, 0.3, 0.01)], 0.25, rr(), 1.2), -18)
r = rr()
un = np.zeros(ns(0.6))
for i, tm in enumerate(np.cumsum([0.0, 0.09, 0.08, 0.07, 0.06, 0.05, 0.045])):
    add(un, (0.8 - 0.07 * i) * G.clink(r, r.uniform(3500, 4500), 0.05, 0.6), tm)
un += 0.08 * bp(r.standard_normal(len(un)), 2000, 5000) * np.exp(-tt(0.6) / 0.3)
save("lid-unscrew", un, -21)
r = rr()
ld = pad_to(hit(scaled(TIN, tau=1.4), 0.5, r, 0.7), 0.6)
add(ld, 0.6 * hit(TABLETOP, 0.3, r, 0.2), 0.0)
add(ld, 0.3 * hit(scaled(TIN, tau=0.8), 0.3, r, 0.4), 0.05)
save("lid-down", ld, -20)

# ── the crowbar flicks the jam lid off; the lid spins up and lands on his head ──
r = rr()
pry = np.zeros(ns(1.3))
add(pry, 0.6 * G.creak(0.2, r, 150, 350, modes=STEEL_RB, rough=0.3, noise=0.15), 0.0)
add(pry, 0.8 * pf[: ns(0.3)], 0.2)
add(pry, hit(scaled(TIN, tau=1.2), 0.2, r, 1.3), 0.2)
ring = modal(1.0, scaled(TIN, tau=12.0, amp=0.5), r) * (1 + 0.6 * np.sin(2 * np.pi * 7 * tt(1.0)))
add(pry, ring, 0.25)
save("crowbar-pry", pry, -15)
r = rr()
wh = G.whoosh(1.0, r, peak=0.35, f_lo=500, f_hi=1800)
wh = wh * (1 + 0.5 * np.sin(2 * np.pi * 7 * np.arange(len(wh)) / SR))
save("lid-whoosh", wh, -24)
r = rr()
tb = tt(0.9)
bk = np.exp(-tb / 0.05) * np.sin(phase(160 * (1 - 0.25 * (1 - np.exp(-tb / 0.03)))))
add(bk, 0.7 * hit(scaled(TIN, tau=4.0), 0.4, r, 0.8), 0.0)
# then it settles like a spun coin: wobble ticks getting faster and softer
t_w, rate = 0.12, 12.0
while t_w < 0.75 and 1.0 / rate > 0.008:  # the ticks converge (geometric), so stop when they blur together
    add(bk, 0.25 * (1 - t_w) * G.clink(r, r.uniform(1800, 2600), 0.04, 0.5), t_w)
    t_w += 1.0 / rate
    rate *= 1.18
save("lid-bonk", bk, -15)
r = rr()
cb = pad_to(hit(scaled(STEEL, k=1.3, tau=0.3), 0.5, r, 0.9), 0.8)
add(cb, 0.4 * hit(scaled(STEEL, k=1.3, tau=0.2), 0.4, r, 0.6), 0.1)
add(cb, 0.5 * hit(TABLETOP, 0.3, r, 0.2), 0.0)
save("crowbar-drop", cb, -21)

# ── a pickle crunch ─────────────────────────────────────────────────────
r = rr()
cr = np.zeros(ns(0.45))
for i, tm in enumerate((0.0, 0.025, 0.05, 0.085, 0.12)):
    burst = hp(r.standard_normal(ns(0.02)), 1500) * np.exp(-tt(0.02) / r.uniform(0.002, 0.004))
    add(cr, (1 - 0.12 * i) * burst, tm)
add(cr, 0.4 * bp(r.standard_normal(ns(0.25)), 500, 2500) * (0.6 + 0.4 * np.sin(2 * np.pi * 30 * tt(0.25))) * np.exp(-tt(0.25) / 0.08), 0.02)
add(cr, 0.5 * np.exp(-tt(0.2) / 0.04) * np.sin(2 * np.pi * 90 * tt(0.2)), 0.0)
save("pickle-crunch", cr, -18)

# ═══════════════ the score: original, light and comic, timed to the picture ═══════════════
DUR = T["DURATION"] + 1.0
BPM = 104
Q = 60 / BPM
MIXB = np.zeros((2, ns(DUR)))
F = I.m2f
ms = rng(2106)


def note(x, t, p=0.0, g=1.0):
    if t < DUR:
        x = np.asarray(x, float) * g
        place(MIXB, x if x.ndim == 2 else pan(x, p), t)  # some instruments (pad) are already stereo


def grid(t0, t1, step):
    k = int(np.ceil(t0 / step))
    while k * step < t1:
        yield k * step
        k += 1


# A — cold open: a cheeky pizzicato walk with a vibes motif (C major)
MOTIF = [(0, 72), (0.5, 76), (1, 79), (1.5, 76), (2, 74), (2.5, 71), (3, 72)]
BASS = [48, 55, 52, 55]
for i, tm in enumerate(grid(0.2, T["TRY"][0], Q)):
    note(I.pluck(F(BASS[i % 4]), 0.7, ms, 0.5), tm, -0.2, 0.8)
for d, mid in MOTIF:
    note(I.vibes(F(mid), 0.55, ms, 1.0), 0.4 + d * Q, 0.25, 0.7)

# B — the three tries: the same ostinato, a semitone higher each try, brushes on the off-beats.
# It stops dead when he lands on the floor (comic silence through the womp).
OST = [60, 63, 67, 63]
tries = [(T["TRY"][0], T["TRY"][1] - 0.1, 0), (T["TRY"][1], T["TRY"][2] - 0.1, 1), (T["TRY"][2], T["SIT_T"], 2)]
for a, b, up in tries:
    for i, tm in enumerate(grid(a, b, Q / 2)):
        note(I.pluck(F(OST[i % 4] + up), 0.55 + 0.1 * up, ms, 0.35, bright=0.6), tm, -0.3, 0.6)
        if i % 2 == 1:
            note(I.brush(0.35, ms, 0.2), tm, 0.3, 0.5)
    for tm in grid(a, b, Q * 2):
        note(I.pluck(F(36 + up), 0.8, ms, 0.8), tm, 0.0, 0.8)

# C — Newt tiptoes over: light staccato pizz with a glock tick (walk → chalkboard)
for i, tm in enumerate(grid(T["LOOK"]["walk"], T["LOOK"]["tint"] - 0.1, Q / 2)):
    if i % 2 == 0:
        note(I.pluck(F([67, 69, 71, 72][(i // 2) % 4]), 0.45, ms, 0.3), tm, -0.2, 0.55)
    if i % 4 == 2:
        note(I.glock(F(84), 0.35, ms, 0.8), tm, 0.35, 0.4)

# D — the chalkboard: a soft held pad with a glock "thinking" arpeggio
b0, b1 = T["LOOK"]["tint"], T["LOOK"]["end"]
note(I.pad([F(57), F(60), F(64)], (b1 - b0) / 2, 0.45, ms, att=0.8, rel=0.9), b0, 0.0, 0.6)
note(I.pad([F(53), F(57), F(60), F(64)], (b1 - b0) / 2, 0.45, ms, att=0.6, rel=1.2), b0 + (b1 - b0) / 2, 0.0, 0.6)
for i, tm in enumerate(grid(b0 + 0.3, b1, Q)):
    note(I.glock(F([76, 79, 84, 79][i % 4]), 0.28, ms, 1.2), tm, 0.2, 0.35)

# E — the trick: hush, then a glock flourish on the button pop and a warm vibes chord on the win
for k, mid in enumerate((79, 83, 86, 91)):
    note(I.glock(F(mid), 0.5, ms, 1.4), T["TRICK"]["tok"] + 0.06 + k * 0.07, 0.3, 0.6)
for mid in (60, 64, 67, 72):
    note(I.vibes(F(mid), 0.5, ms, 2.0), T["TRICK"]["win"], -0.1, 0.55)

# F — the wrong lesson: sneaky minor pizz, gathering pace; dead stop for the pop and the bonk
s0, s1 = T["TWIST"]["idea"] + 0.2, T["TWIST"]["launch"] - 0.05
SNEAK = [57, 60, 64, 63, 62, 60]
for i, tm in enumerate(grid(s0, s1, Q / 2)):
    note(I.pluck(F(SNEAK[i % 6]), 0.5 + 0.3 * (tm - s0) / (s1 - s0), ms, 0.3, bright=0.7), tm, -0.25, 0.6)
    if i % 4 == 0:
        note(I.pluck(F(45), 0.8, ms, 0.6), tm, 0.0, 0.7)

# G — the heart: the opening motif again, slower and warm, over a pad
h0 = T["HEART"]["walk"]
note(I.pad([F(48), F(55), F(64), F(67)], T["END_FADE"] - h0 + 0.5, 0.4, ms, att=1.0, rel=1.0), h0, 0.0, 0.55)
for d, mid in MOTIF:
    note(I.vibes(F(mid), 0.5, ms, 1.6), h0 + 0.3 + d * Q * 1.4, 0.2, 0.65)

# H — the moral card: a final chord and a sparkle on each line
e0 = T["END_FADE"]
note(I.pad([F(48), F(52), F(55), F(60), F(64)], DUR - e0 - 0.3, 0.45, ms, att=0.3, rel=1.5), e0 + 0.35, 0.0, 0.6)
for k, mid in enumerate((84, 88, 91)):
    note(I.glock(F(mid), 0.45, ms, 1.6), e0 + 0.4 + k * 0.08, 0.25, 0.5)
for k, mid in enumerate((88, 91, 96)):
    note(I.glock(F(mid), 0.45, ms, 1.6), e0 + 1.1 + k * 0.08, -0.25, 0.5)

music_ir = make_ir(1.1, 3, early=[(0.013, 0.4, -0.3), (0.023, 0.3, 0.4)])
score = MIXB + 0.18 * convolve_st(MIXB, music_ir)
score = norm_to(fades(score, 0.01, 0.5), -24.0, mode="integrated")
peak = np.max(np.abs(score))
if peak > 0.89:
    score *= 0.89 / peak
write_wav(os.path.join(OUT, "score-jar.wav"), score, 24)
