"""SFX + score for ep08 "Umbrella Duty" — original, seeded, numpy/scipy (the cartoon-3d-short skill's kit).

Seaside foley from simple physical models (rain on stone and on fabric, umbrellas snapping open — bigger
canopy, deeper whump — a wind gust, a balloon burner, a newspaper), a slow-motion stretch, and an original,
very pompous ceremonial march for Dash's escalating "protection" (each upgrade a step up in key), timed to
the picture from tools/sfx/ep08_times.json (REAL clock; exported from timeline.ts by ep08-times.mjs).

Usage: .venv/bin/python -I tools/sfx/ep08_umbrella.py public/sfx
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "kit3d"))
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, fades, modal, st, pan, place, make_ir, convolve_st, norm_to, write_wav, phase, smooth_noise
import sfx_gen as G
import instruments as I

OUT = sys.argv[1]
T = json.load(open(os.path.join(HERE, "ep08_times.json")))
C = T["CUE"]
SL = T["SLOW"]
DUR = C["dur"]
R = rng(808)
rr = lambda: rng(int(R.integers(1 << 30)))
OPEN_AIR = make_ir(0.3, 81, early=[(0.02, 0.2, -0.4), (0.045, 0.15, 0.5)])


def real_of(s):
    a, st_, re = SL["a"], SL["story"], SL["real"]
    return s if s <= a else (a + (s - a) * re / st_ if s <= a + st_ else s + re - st_)


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
    """piecewise-linear gain over REAL time: pts = [(t, g), ...]"""
    t = np.arange(n) / SR
    return np.interp(t, [p[0] for p in pts], [p[1] for p in pts])


# ── raindrops ──
def drop_tink():  # on a party hat (card)
    r = rr()
    out = modal(0.25, [(2900, 1.0, 0.03), (5200, 0.4, 0.015)], r)
    add(out, 0.3 * hp(r.standard_normal(ns(0.25)), 3000) * np.exp(-tt(0.25) / 0.004), 0.0)
    return out


def drop_plip():  # on skin / a shoe
    r = rr()
    t = tt(0.18)
    return np.sin(phase(900 + 1400 * np.exp(-t / 0.02))) * np.exp(-t / 0.03) * 0.8 + 0.2 * lp(r.standard_normal(len(t)), 2000) * np.exp(-t / 0.01)


def rain_bed():
    """light rain on the promenade, following the shower in REAL time; muffled in the slow-mo"""
    r = rr()
    n = ns(DUR)
    hiss = bp(colored(n, r, 0.4), 1200, 9000) * 0.5
    # individual drops (clicks) at a rate that follows the amount
    amt = env_track(n, [(0, 0), (C["rainOn"], 0), (C["rainOn"] + 0.5, 0.25), (T["RAIN"]["full"], 1.0), (C["rainOff"] - 0.5, 1.0), (C["rainOff"] + 0.6, 0.0), (DUR, 0)])
    clicks = np.zeros(n)
    k = 0
    while k < n - ns(0.02):
        k += int(SR / 120 * r.uniform(0.3, 1.7))
        if k < n - ns(0.02):
            m = ns(0.012)
            clicks[k: k + m] += hp(r.standard_normal(m), 2500) * np.exp(-np.arange(m) / (SR * 0.002)) * r.uniform(0.2, 1)
    y = (hiss + clicks * 0.6) * amt
    slow = env_track(n, [(0, 1), (C["slowA"], 1), (C["slowA"] + 0.3, 0.2), (C["slowB"] - 0.2, 0.2), (C["slowB"], 1), (DUR, 1)])
    return y * slow


def canopy_drum():
    """rain drumming on the parasol's fabric (a low, papery patter)"""
    r = rr()
    d = C["gust"] - C["u3open"] + 0.3
    n = ns(d)
    y = np.zeros(n)
    k = 0
    while k < n - ns(0.05):
        k += int(SR / 45 * r.uniform(0.3, 1.7))
        if k < n - ns(0.05):
            add(y, modal(0.05, [(r.uniform(260, 420), 1.0, 0.012), (r.uniform(700, 1100), 0.4, 0.006)], r) * r.uniform(0.3, 1), k / SR)
    return y


# ── umbrellas ──
def brolly_open(size):
    """ribs snapping out + the canopy catching air: bigger canopy = longer, deeper whump"""
    r = rr()
    d = 0.35 + 0.4 * size
    t = tt(d)
    click = modal(0.08, [(3200 / (1 + size), 1.0, 0.01), (5400 / (1 + size), 0.5, 0.006)], r)
    whump = lp(r.standard_normal(len(t)), 300 + 900 / (1 + 2 * size)) * np.exp(-t / (0.05 + 0.08 * size)) * (1.0 + 1.5 * size)
    flap = G.whoosh(d, r, peak=0.04, f_lo=200, f_hi=1600 / (1 + size), tail=0.06 + 0.1 * size) * 0.6
    out = whump + flap
    add(out, click * 0.6, 0.0)
    return out


def brolly_drop():
    r = rr()
    out = modal(0.3, [(620, 1.0, 0.04), (1450, 0.6, 0.025), (2900, 0.3, 0.015)], r)
    add(out, G.rattle(0.2, r, density=25.0) * 0.4, 0.0)
    return out


def rack_rattle():
    return G.rattle(0.35, rr(), density=35.0)


def parasol_drag():
    r = rr()
    d = 0.8
    out = bp(r.standard_normal(ns(d)), 300, 2500) * np.exp(-tt(d) / 0.4) * 0.3
    add(out, G.creak(d, r, rate0=60, rate1=90, scale=0.8) * 0.5, 0.0)
    return out


# ── the shoelace ──
def lace_tie():
    r = rr()
    d = C["gust"] - C["tie1"]
    n = ns(d)
    y = np.zeros(n)
    tm = 0.0
    while tm < d - 0.2:
        m = ns(0.12)
        add(y, bp(r.standard_normal(m), 1500, 7000) * np.hanning(m) * r.uniform(0.3, 0.8), tm)
        tm += r.uniform(0.18, 0.4)
    return y


def lace_tug():
    r = rr()
    t = tt(0.3)
    return np.sin(phase(500 + 900 * t / 0.3)) * np.exp(-t / 0.1) * 0.4 + bp(r.standard_normal(len(t)), 2000, 6000) * np.exp(-t / 0.05) * 0.4


# ── the gust and the slow-mo ──
def gust():
    r = rr()
    d = 3.2
    t = tt(d)
    roar = lp(colored(len(t), r, 1.2), 900) * np.minimum(1, t / 0.35) * np.exp(-np.maximum(0, t - 1.2) / 1.2)
    w = G.whoosh(1.5, r, peak=0.35, f_lo=250, f_hi=2400, tail=0.6) * 1.3
    flag = np.zeros(len(t))
    for k in range(int(2.2 * 14)):
        m = ns(0.03)
        add(flag, bp(r.standard_normal(m), 600, 3000) * np.hanning(m) * np.exp(-k / 30), 0.3 + k / 14)
    out = roar * 1.4 + flag * 0.8
    add(out, w, 0.2)
    return out


def slowmo_up():
    """time slows: a sweep down into a low airy drone, a slow heartbeat, a rising swell as he goes up, snap back"""
    r = rr()
    d = C["slowB"] - C["slowA"] + 0.4
    t = tt(d)
    drone = lp(colored(len(t), r, 1.5), 300) * 1.0 * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.3)
    rise = np.sin(phase(110 + 220 * (t / d) ** 2)) * 0.25 * np.minimum(1, t / 1.0) * np.minimum(1, (d - t) / 0.4)
    out = drone + rise
    ts = tt(0.6)
    add(out, np.sin(phase(1000 * np.exp(-ts * 5) + 60)) * np.exp(-ts / 0.25) * 0.35, 0.0)
    hb = lambda: lp(np.sin(phase(np.full(ns(0.22), 50.0))) * np.exp(-tt(0.22) / 0.06), 200)
    for k in range(int((d - 0.8) / 1.0) + 1):
        add(out, hb() * 0.8, 0.5 + k * 1.0)
        add(out, hb() * 0.5, 0.78 + k * 1.0)
    add(out, G.whoosh(0.5, r, peak=0.45, f_lo=200, f_hi=2600, tail=0.05) * 0.8, d - 0.6)
    return out


# ── 1 km up ──
def burner():
    r = rr()
    d = 1.2
    t = tt(d)
    return lp(colored(len(t), r, 0.8), 2500) * np.minimum(1, t / 0.05) * np.exp(-np.maximum(0, t - 0.8) / 0.15)


def paper():
    r = rr()
    y = np.zeros(ns(0.45))
    for k in range(6):
        m = ns(0.05)
        add(y, bp(r.standard_normal(m), 1500, 8000) * np.hanning(m) * r.uniform(0.4, 1), k * 0.06)
    return y


# ── seaside ambience: waves, gulls, wind that rises with the gust and drops after ──
def sea_amb():
    r = rr()
    n = ns(DUR)
    t = np.arange(n) / SR
    surf = lp(colored(n, r, 1.4), 900) * (0.55 + 0.45 * np.sin(2 * np.pi * t / 6.5) ** 2)
    wind_g = env_track(n, [(0, 0.5), (C["gust"] - 0.2, 0.6), (C["gust"] + 0.4, 1.4), (C["slowA"] + 0.3, 0.4), (C["slowB"], 1.2), (C["slowB"] + 2.5, 0.35), (C["balloon"], 0.35), (C["balloon"] + 0.2, 0.15), (DUR, 0.15)])
    wind = lp(colored(n, r, 1.1), 700) * (0.7 + 0.3 * smooth_noise(n, r, 0.3)) * wind_g
    amb = surf * 0.8 + wind * 0.6
    for k in range(6):
        tm = r.uniform(0.5, C["balloon"] - 1)
        dd = 0.35
        tc = tt(dd)
        gull = np.sin(phase(1500 + 700 * np.sin(np.pi * tc / dd))) * np.sin(np.pi * tc / dd) ** 1.5
        add(amb, lp(gull, 3500) * 0.12, tm)
        add(amb, lp(gull, 3500) * 0.08, tm + 0.45)
    # high up, almost silent: only the wind's whisper
    hi = env_track(n, [(0, 1), (C["balloon"] - 0.05, 1), (C["balloon"] + 0.1, 0.25), (DUR, 0.25)])
    return amb * hi


# ── score: a dead-serious ceremonial march (96 bpm) ──
Q = 60 / 96
MIXB = np.zeros((2, ns(DUR)))
F = I.m2f
ms = rng(2208)


def note(x, tm, p=0.0, g=1.0):
    if 0 <= tm < DUR:
        x = np.asarray(x, float) * g
        place(MIXB, x if x.ndim == 2 else pan(x, p), tm)


def grid(t0, t1, step):
    k = int(np.ceil(t0 / step))
    while k * step < t1:
        yield k * step
        k += 1


# A — waiting at the bus stop: calm vibes over a soft pad
note(I.pad([F(60), F(64), F(67)], C["drop1"] + 0.1, 0.3, ms, att=0.8, rel=0.3), 0.0, 0.0, 0.5)
for k, mid in enumerate((72, 76, 79, 76, 74)):
    note(I.vibes(F(mid), 0.4, ms, 1.0), 0.4 + k * Q, 0.2, 0.45)

# B — the march: snare, tuba on 1 and 3, brass fanfare per upgrade, a key step up each time
MARCH = [(C["capRain"], C["u2toss"] - 0.1, 0), (C["u2toss"], C["look1"] - 0.1, 2), (C["u3toss"], C["lace"] - 0.15, 4)]
FAN = [0, 4, 7, 12]
for a, b, up in MARCH:
    note(I.brass(F(48 + up), 0.5, 0.9, ms, kind="tuba"), a, 0.0, 0.8)
    for k, iv in enumerate(FAN):
        note(I.brass(F(60 + up + iv), 0.22 if k < 3 else 0.6, 0.75, ms, kind="horn"), a + 0.05 + k * 0.14, 0.15, 0.55)
    for i, tm in enumerate(grid(a + 0.7, b, Q / 2)):
        note(I.snare(0.35 + 0.15 * (i % 4 == 0), ms, 0.22), tm, 0.15, 0.45)
        if i % 4 == 0:
            note(I.brass(F(36 + up + (0 if (i // 4) % 2 == 0 else 7)), Q * 0.8, 0.7, ms, kind="tuba"), tm, -0.1, 0.6)
# the parasol opens: cymbal + a held tonic chord; "PROTECTED ✓" resolves it
note(I.cymbal(0.7, ms, 2.4), C["u3open"], 0.0, 0.5)
note(I.pad([F(52), F(56), F(59), F(64)], C["lace"] - C["u3open"], 0.45, ms, att=0.1, rel=0.2), C["u3open"], 0.0, 0.5)
for k, mid in enumerate((76, 80, 83, 88)):
    note(I.glock(F(mid), 0.45, ms, 1.4), C["protected"] + k * 0.09, 0.25, 0.45)

# C — Newt's two looks: three "thinking" glock notes over a held pad
for a, b in ((C["look1"], T["LOOK1"]["end"]), (C["look2"], T["LOOK2"]["end"])):
    note(I.pad([F(57), F(60), F(64)], b - a, 0.3, ms, att=0.5, rel=0.4), a, 0.0, 0.45)
    for k, mid in enumerate((79, 76, 72)):
        note(I.glock(F(mid), 0.35, ms, 1.6), a + 0.3 + k * 0.6, 0.2, 0.4)

# D — tying the lace: a careful little staccato pizz (he's concentrating); the gust cuts it dead
TIE = [64, 67, 64, 69]
for a_, b_ in ((C["tie1"], C["look2"] - 0.05), (T["LOOK2"]["end"], C["gust"] - 0.05), (C["tie2"], C["knot"] - 0.05)):
    for i, tm in enumerate(grid(a_, b_, Q / 2)):
        note(I.pluck(F(TIE[i % 4]), 0.38, ms, 0.25), tm, -0.2, 0.5)

# E — the knot: a tiny proud fanfare ("SECURED ✓")… then nothing at the empty spot
for k, mid in enumerate((67, 72)):
    note(I.brass(F(mid), 0.25 if k == 0 else 0.6, 0.6, ms, kind="horn"), C["knot"] + 0.05 + k * 0.18, 0.1, 0.5)

# E2 — he sees Newt: a low brass alarm + a fast snare run while he sprints and jumps
note(I.brass(F(38), 0.6, 0.85, ms, kind="tuba"), C["see"] + 0.05, 0.0, 0.8)
for tm, v in I.snare_roll(C["run"], C["jump"] + 0.05, 0.35, 0.8, ms):
    note(I.snare(v, ms, 0.2, buzz=True), tm, 0.1, 0.45)

# F — grief: a slow, sad vibes line under Dash with his hands on his head, rising with the crane-up
h0 = C["grief"]
note(I.pad([F(57), F(60), F(64)], C["balloon"] - h0, 0.35, ms, att=1.0, rel=0.3), h0, 0.0, 0.45)
for k, mid in enumerate((76, 74, 72, 69, 72, 76)):
    note(I.vibes(F(mid), 0.4, ms, 1.6), h0 + 0.4 + k * 0.6, 0.2, 0.5)

# G — 1 km up: an airy music-box waltz; two polite notes for the nod; the paper goes up on a low "hmph"
b0 = C["balloon"]
note(I.pad([F(60), F(67), F(72)], C["end"] - b0, 0.3, ms, att=0.8, rel=0.6), b0, 0.0, 0.4)
WALTZ = [72, 76, 79, 77, 74, 71, 72]
for k, mid in enumerate(WALTZ):
    note(I.musicbox(F(mid), 0.45, ms, 1.4), b0 + 0.6 + k * 0.42, 0.2, 0.5)
for k, mid in enumerate((79, 84)):
    note(I.glock(F(mid), 0.4, ms, 1.2), C["nod"] + k * 0.18, 0.25, 0.45)
note(I.brass(F(41), 0.4, 0.6, ms, kind="tuba"), C["raise"] + 0.05, 0.0, 0.5)

# H — the moral card
e0 = C["end"]
note(I.pad([F(48), F(52), F(55), F(60), F(64)], DUR - e0 - 0.3, 0.45, ms, att=0.3, rel=1.4), e0 + 0.35, 0.0, 0.55)
for k, mid in enumerate((84, 88, 91)):
    note(I.glock(F(mid), 0.4, ms, 1.6), e0 + 0.4 + k * 0.08, 0.25, 0.45)

music_ir = make_ir(0.9, 5, early=[(0.013, 0.4, -0.3), (0.023, 0.3, 0.4)])
score = MIXB + 0.16 * convolve_st(MIXB, music_ir)
# hard silence: the gust and slow-mo (sfx carry it), and the empty spot until the womp
for a, b in ((C["gust"] - 0.02, C["tie2"]), (C["knot"] + 0.9, C["see"]), (C["jump"] + 0.1, C["grief"] - 0.05)):
    score[:, ns(a): ns(b)] = 0.0
score = norm_to(fades(score, 0.01, 0.5), -24.0, mode="integrated")
pk = np.max(np.abs(score))
if pk > 0.89:
    score *= 0.89 / pk
write_wav(os.path.join(OUT, "score-umbrella.wav"), score, 24)

save("drop-tink", drop_tink(), -22)
save("drop-plip", drop_plip(), -22)
save("rack-rattle", rack_rattle(), -22)
save("brolly-open-small", brolly_open(0.0), -20)
save("brolly-open-golf", brolly_open(0.5), -19)
save("brolly-open-parasol", brolly_open(1.2), -16)
save("brolly-drop", brolly_drop(), -22)
save("parasol-drag", parasol_drag(), -21)
save("canopy-drum", canopy_drum(), -26, wet=0.0)
save("lace-tie", lace_tie(), -26, wet=0.0)
save("lace-tug", lace_tug(), -22)
save("gust", gust(), -15)
save("slowmo-up", slowmo_up(), -20, wet=0.0)
save("burner", burner(), -22)
save("paper", paper(), -22)
amb = sea_amb()
write_wav(os.path.join(OUT, "sea-amb.wav"), norm_to(np.stack([amb, np.roll(amb, ns(0.013))]), -33.0, mode="integrated"), 24)
rb = rain_bed()
write_wav(os.path.join(OUT, "rain-bed.wav"), norm_to(np.stack([rb, np.roll(rb, ns(0.009))]), -34.0, mode="integrated"), 24)
print("ep08 sfx + score written")
