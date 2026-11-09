"""SFX + score for ep09 "Big Bounce" — original, seeded, numpy/scipy (the cartoon-3d-short skill's kit).

Park and cemetery foley from simple physical models (birds and breeze, a creaking seesaw, a plank that
thwangs when 75 kg lands on it, an apple that goes "tok" on a head, a plastic helmet knock, the
gravedigger's shovel rhythm, a dirt thump, a church bell), two slow-motion stretches, and an original,
dead-serious little march for Dash's escalating FUN (each level a step up in key), timed to the picture from
tools/sfx/ep09_times.json (REAL clock; exported from timeline.ts by ep09-times.mjs).

Usage: .venv/bin/python -I tools/sfx/ep09_bounce.py public/sfx
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "kit3d"))
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, fades, modal, st, pan, place, make_ir, convolve_st, norm_to, write_wav, phase, smooth_noise
import sfx_gen as G
import instruments as I

OUT = sys.argv[1]
T = json.load(open(os.path.join(HERE, "ep09_times.json")))
C = T["CUE"]
DUR = C["dur"]
R = rng(909)
rr = lambda: rng(int(R.integers(1 << 30)))
OPEN_AIR = make_ir(0.35, 91, early=[(0.02, 0.2, -0.4), (0.045, 0.15, 0.5)])


def save(name, x, lufs=-18.0, wet=0.06):
    x = np.asarray(x, float)
    x = np.concatenate([x, np.zeros(ns(0.25))])
    y = st(x) + wet * convolve_st(x, OPEN_AIR)
    y = norm_to(fades(y, 0.002, 0.03), lufs)
    pk = np.max(np.abs(y))
    if pk > 0.89:
        y *= 0.89 / pk
    write_wav(os.path.join(OUT, f"{name}.wav"), y, 24)


def add(dst, x, t, g=1.0):
    k = ns(t)
    if 0 <= k < len(dst):
        seg = np.asarray(x)[: len(dst) - k]
        dst[k: k + len(seg)] += g * seg


def env_track(n, pts):
    t = np.arange(n) / SR
    return np.interp(t, [p[0] for p in pts], [p[1] for p in pts])


# ── the seesaw ──
def seesaw_creak():
    r = rr()
    return G.creak(0.7, r, rate0=70, rate1=130) * 0.9


def plank_thwang():
    """75 kg lands on a wooden plank: a body thump, the plank's low ringing modes, a metal pivot clank"""
    r = rr()
    d = 1.4
    t = tt(d)
    body = lp(r.standard_normal(len(t)), 220) * np.exp(-t / 0.05) * 1.6
    ring = modal(d, [(78, 1.0, 0.35), (141, 0.6, 0.22), (233, 0.35, 0.12), (390, 0.15, 0.06)], r, glide=-0.06)
    clank = modal(0.5, [(620, 0.5, 0.08), (1630, 0.25, 0.04), (2710, 0.12, 0.02)], r)
    out = body + ring * 0.9
    add(out, clank * 0.5, 0.005)
    add(out, G.creak(0.5, r, rate0=140, rate1=60) * 0.4, 0.05)
    return out


def apple_tok():  # an apple on a head: a short hollow knock
    r = rr()
    t = tt(0.3)
    return modal(0.3, [(480, 1.0, 0.03), (1050, 0.5, 0.015), (1900, 0.2, 0.008)], r) + 0.3 * bp(r.standard_normal(len(t)), 800, 4000) * np.exp(-t / 0.004)


def helmet_knock():  # knuckles on a plastic bike helmet
    r = rr()
    t = tt(0.25)
    return modal(0.25, [(690, 1.0, 0.025), (1570, 0.45, 0.012), (2900, 0.2, 0.006)], r) + 0.25 * hp(r.standard_normal(len(t)), 2000) * np.exp(-t / 0.003)


def dirt_thump():  # a small person lands, seated, on the soft floor of a grave
    r = rr()
    d = 1.0
    t = tt(d)
    thud = lp(r.standard_normal(len(t)), 160) * np.exp(-t / 0.06) * 1.8
    spray = bp(colored(len(t), r, 0.6), 600, 5000) * np.exp(-t / 0.18) * 0.5
    return thud + spray


def church_bell():
    r = rr()
    f = 262.0
    d = 4.0
    return modal(d, [(f * 0.5, 0.6, 3.5), (f, 1.0, 2.6), (f * 1.19, 0.5, 1.6), (f * 1.5, 0.35, 1.2), (f * 2.0, 0.3, 0.9), (f * 2.51, 0.18, 0.6), (f * 3.0, 0.1, 0.4)], r)


def slowmo(d, beats=True):
    """time slows: a sweep down into a low airy drone, a slow heartbeat, a rising swell, snap back"""
    r = rr()
    t = tt(d)
    drone = lp(colored(len(t), r, 1.5), 300) * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.3)
    rise = np.sin(phase(100 + 260 * (t / d) ** 2)) * 0.22 * np.minimum(1, t / 1.0) * np.minimum(1, (d - t) / 0.4)
    out = drone + rise
    ts = tt(0.6)
    add(out, np.sin(phase(1000 * np.exp(-ts * 5) + 60)) * np.exp(-ts / 0.25) * 0.35, 0.0)
    if beats:
        hb = lambda: lp(np.sin(phase(np.full(ns(0.22), 50.0))) * np.exp(-tt(0.22) / 0.06), 200)
        for k in range(int((d - 0.8) / 0.9) + 1):
            add(out, hb() * 0.8, 0.5 + k * 0.9)
            add(out, hb() * 0.5, 0.75 + k * 0.9)
    add(out, G.whoosh(0.5, r, peak=0.45, f_lo=200, f_hi=2600, tail=0.05) * 0.8, max(0, d - 0.6))
    return out


# ── beds ──
def park_amb():
    r = rr()
    n = ns(DUR)
    mono = lambda x: (x.mean(axis=0) if np.ndim(x) == 2 else x)[:n]
    birds = mono(G.bird_chirps(DUR, r, density=0.35))
    breeze = mono(G.breeze(DUR, r, level=0.8))
    amb = np.zeros(n)
    amb[: len(birds)] += birds * 0.5
    amb[: len(breeze)] += breeze * 0.6
    # everything holds its breath in the slow motion; near-silence at the grave at the end
    g = env_track(n, [(0, 1), (C["slow2a"], 1), (C["slow2a"] + 0.2, 0.25), (C["slow2b"], 0.25), (C["slow2b"] + 0.3, 1), (C["slow3a"], 1), (C["slow3a"] + 0.2, 0.15), (C["slow3b"], 0.15), (C["slow3b"] + 0.5, 0.8), (C["fadeA"], 0.8), (DUR, 0.2)])
    return amb * g


def dig_bed():
    """the gravedigger, every 2.2 s: the blade scrapes into the soil, then the dirt flies onto the pile"""
    r = rr()
    out = np.zeros(ns(DUR))
    last = -1
    for e in T["DIG_EVENTS"]:
        if e["t"] - last < 0.05 and e["kind"] == 0:
            continue
        last = e["t"]
        if e["kind"] == 0:
            m = ns(0.35)
            scr = bp(r.standard_normal(m), 1200, 5000) * np.hanning(m) * 0.35
            scr += G.stick_slip(0.35, 60, r)[:m] * 0.25 if hasattr(G, "stick_slip") else 0
            add(out, scr, e["t"])
        else:
            m = ns(0.5)
            hiss = bp(colored(m, r, 0.5), 500, 4000) * np.exp(-np.arange(m) / SR / 0.15) * 0.3
            add(out, hiss, e["t"])
            add(out, lp(r.standard_normal(ns(0.2)), 200) * np.exp(-tt(0.2) / 0.04) * 0.5, e["t"] + 0.45)
    return out


# ── score: a dead-serious little march (104 bpm) ──
Q = 60 / 104
MIXB = np.zeros((2, ns(DUR)))
F = I.m2f
ms = rng(2309)


def note(x, tm, p=0.0, g=1.0):
    if 0 <= tm < DUR:
        x = np.asarray(x, float) * g
        place(MIXB, x if x.ndim == 2 else pan(x, p), tm)


def grid(t0, t1, step):
    k = int(np.ceil(t0 / step))
    while k * step < t1:
        yield k * step
        k += 1


# A — Newt alone on the seesaw: a lonely music box
for k, mid in enumerate((76, 72, 74, 67, 72)):
    note(I.musicbox(F(mid), 0.45, ms, 1.6), 0.5 + k * 0.85, 0.2, 0.5)
note(I.pad([F(60), F(64), F(67)], C["gate"] - 0.3, 0.3, ms, att=1.0, rel=0.4), 0.0, 0.0, 0.4)

# B — FRIEND DEPLOYING: snare + tuba march from the gate to the seat; a fanfare on OPERATIONAL
note(I.brass(F(48), 0.4, 0.8, ms, kind="tuba"), C["gate"], 0.0, 0.7)
for i, tm in enumerate(grid(C["march"], C["sit"], Q / 2)):
    note(I.snare(0.32 + 0.15 * (i % 4 == 0), ms, 0.2), tm, 0.15, 0.45)
    if i % 4 == 0:
        note(I.brass(F(36 + (0 if (i // 4) % 2 == 0 else 7)), Q * 0.8, 0.7, ms, kind="tuba"), tm, -0.1, 0.6)
for k, iv in enumerate((0, 4, 7, 12)):
    note(I.brass(F(60 + iv), 0.2 if k < 3 else 0.6, 0.7, ms, kind="horn"), C["oper"] + k * 0.13, 0.15, 0.5)

# C — the three FUN levels: a fanfare each, a key higher; snare runs while he climbs
for (lvl, up) in (("fun1", 0), ("fun2", 2), ("funmax", 5)):
    a = C[lvl]
    note(I.brass(F(48 + up), 0.5, 0.9, ms, kind="tuba"), a, 0.0, 0.8)
    for k, iv in enumerate((0, 4, 7, 12)):
        note(I.brass(F(60 + up + iv), 0.22 if k < 3 else 0.7, 0.8, ms, kind="horn"), a + 0.05 + k * 0.14, 0.15, 0.55)
    if lvl == "funmax":
        note(I.cymbal(0.7, ms, 2.4), a + 0.47, 0.0, 0.5)
for a_, b_ in ((C["climb1"], C["step1"]), (C["climb2"], C["step2"])):
    for i, tm in enumerate(grid(a_, b_ - 0.4, Q / 2)):
        note(I.snare(0.25 + 0.1 * (i % 4 == 0), ms, 0.18), tm, 0.15, 0.35)
    for tm, v in I.snare_roll(b_ - 0.45, b_, 0.3, 0.8, ms):
        note(I.snare(v, ms, 0.2, buzz=True), tm, 0.1, 0.4)
# the chomp: a tuba "hmph"; SAFETY FIRST: two proud horn notes
note(I.brass(F(41), 0.35, 0.6, ms, kind="tuba"), C["bite"] + 0.1, 0.0, 0.55)
for k, mid in enumerate((67, 72)):
    note(I.brass(F(mid), 0.25 if k == 0 else 0.6, 0.6, ms, kind="horn"), C["click"] + 0.05 + k * 0.18, 0.1, 0.5)
# the top branch: a held, ceremonial chord; snare roll into the look
note(I.pad([F(53), F(57), F(60), F(65)], C["look"] - C["top"], 0.4, ms, att=0.4, rel=0.3), C["top"], 0.0, 0.45)

# D — Newt's look: thinking glock over a pad; a low note on "there"; nothing on "…oh."
a = C["look"]
note(I.pad([F(57), F(60), F(64)], C["lookEnd"] - a, 0.3, ms, att=0.5, rel=0.4), a, 0.0, 0.45)
for k, mid in enumerate((79, 76, 72, 79, 76, 72)):
    note(I.glock(F(mid), 0.35, ms, 1.6), a + 0.3 + k * 0.7, 0.2, 0.4)
note(I.brass(F(36), 0.9, 0.6, ms, kind="soft"), C["there"], 0.0, 0.6)

# E — after: a deadpan funeral pad and a music-box lullaby under the lily; a major chord on the card
p0 = C["peek"]
note(I.pad([F(48), F(55), F(60), F(63)], C["end"] - p0, 0.35, ms, att=1.2, rel=0.6), p0, 0.0, 0.4)
# Dash's grief: a slow, sad vibes line; hope at the ghost (two bright glock notes); the lullaby when it lies down
g0 = C["griefA"]
for k, mid in enumerate((76, 74, 72, 69, 71, 67)):
    note(I.vibes(F(mid), 0.45, ms, 1.8), g0 + 0.3 + k * 0.62, 0.2, 0.55)
for k, mid in enumerate((79, 84)):
    note(I.glock(F(mid), 0.4, ms, 1.2), C["notice"] + 0.3 + k * 0.16, 0.25, 0.45)
for k, mid in enumerate((72, 71, 72, 67, 68, 67, 65, 67, 64, 65, 64, 60)):
    note(I.musicbox(F(mid), 0.42, ms, 1.5), C["lieA"] + 0.2 + k * 0.55, 0.2, 0.45)
e0 = C["end"]
note(I.pad([F(48), F(52), F(55), F(60), F(64)], DUR - e0 - 0.3, 0.45, ms, att=0.3, rel=1.4), e0 + 0.35, 0.0, 0.55)
for k, mid in enumerate((84, 88, 91)):
    note(I.glock(F(mid), 0.4, ms, 1.6), e0 + 0.4 + k * 0.08, 0.25, 0.45)

music_ir = make_ir(0.9, 5, early=[(0.013, 0.4, -0.3), (0.023, 0.3, 0.4)])
score = MIXB + 0.16 * convolve_st(MIXB, music_ir)
# hard silence where the picture does the talking: the slow motions, the landing, the empty seat
for a_, b_ in ((C["slow2a"], C["a2hit"] + 0.4), (C["split"], C["proud"] - 0.05), (C["turn"], C["peek"] - 0.1), (C["see"], C["griefA"])):
    score[:, ns(a_): ns(b_)] = 0.0
score = norm_to(fades(score, 0.01, 0.5), -24.0, mode="integrated")
pk = np.max(np.abs(score))
if pk > 0.89:
    score *= 0.89 / pk
write_wav(os.path.join(OUT, "score-bounce.wav"), score, 24)

save("seesaw-creak", seesaw_creak(), -22)
save("plank-thwang", plank_thwang(), -15)
save("apple-tok", apple_tok(), -20)
save("helmet-knock", helmet_knock(), -21)
save("dirt-thump", dirt_thump(), -16)
save("church-bell", church_bell(), -20, wet=0.2)
save("slowmo-bounce", slowmo(C["slow2b"] - C["slow2a"] + 0.3, beats=False), -21, wet=0.0)
save("slowmo-drop", slowmo(C["slow3b"] - C["slow3a"] + 0.4), -20, wet=0.0)
amb = park_amb()
write_wav(os.path.join(OUT, "park-amb.wav"), norm_to(np.stack([amb, np.roll(amb, ns(0.013))]), -33.0, mode="integrated"), 24)
dg = dig_bed()
write_wav(os.path.join(OUT, "dig-bed.wav"), norm_to(np.stack([dg, np.roll(dg, ns(0.006))]), -34.0, mode="integrated"), 24)
print("ep09 sfx + score written")
