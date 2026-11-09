"""SFX + score for ep10 "One Flare" — original, seeded, numpy/scipy (the cartoon-3d-short skill's kit).

Foley from simple physical models: a tour helicopter's rotor chop that winds down in autorotation, a storm
(rain, lightning crack, thunder), a skid on sand, island surf/birds/palms, driftwood on sand, a gull, a
seaplane fly-by with Doppler, a ship's horn, a flare gun, the flare's climb, its parachute and hiss, a fuel
fire, the drum burst, a ship flooding and going under, oars. Plus an original score timed to the picture
from tools/sfx/ep10_times.json (exported from timeline.ts by ep10-times.mjs). No beeps, no voice.

Usage: .venv/bin/python -I tools/sfx/ep10_flare.py public/sfx
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "kit3d"))
import numpy as np
from dsp import SR, TAU, ns, tt, rng, lp, hp, bp, colored, fades, modal, st, pan, place, make_ir, convolve_st, norm_to, write_wav, phase, smooth_noise
import sfx_gen as G
import instruments as I

OUT = sys.argv[1]
T = json.load(open(os.path.join(HERE, "ep10_times.json")))
C = T["CUE"]
DUR = C["dur"]
R = rng(1010)
rr = lambda: rng(int(R.integers(1 << 30)))
OPEN_AIR = make_ir(0.35, 101, early=[(0.02, 0.2, -0.4), (0.05, 0.15, 0.5)])
FAR = make_ir(1.4, 102, early=[(0.08, 0.3, -0.3), (0.16, 0.2, 0.4)])


def save(name, x, lufs=-18.0, wet=0.06, ir=None):
    x = np.asarray(x, float)
    x = np.concatenate([x, np.zeros(ns(0.25))])
    y = st(x) + wet * convolve_st(x, ir if ir is not None else OPEN_AIR)
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


def burst_noise(d, r, lo, hi, tau):
    t = tt(d)
    return bp(r.standard_normal(len(t)), lo, hi) * np.exp(-t / tau)


# ── the flight: wind at altitude, rotor chop (blade passes), turbine; then the storm; the engine dies ──
def flight_bed():
    r = rr()
    d = C["touch"] + 0.4
    n = ns(d)
    t = np.arange(n) / SR
    # blade-pass rate: 2 blades × ~5.5 rev/s; after the strike the rotor slows (autorotation keeps it turning)
    rate = np.where(t < C["strike"], 11.0, np.maximum(4.5, 11.0 - (t - C["strike"]) * 2.2))
    ph = np.cumsum(rate) / SR
    chop = (0.5 + 0.5 * np.cos(TAU * ph)) ** 6
    whup = lp(colored(n, r, 1.0), 500) * chop * 1.6 + lp(colored(n, r, 0.4), 1800) * chop * 0.4
    turb_f = np.where(t < C["strike"], 2100.0, 2100.0 * np.exp(-(t - C["strike"]) / 0.6) + 120)
    turbine = np.sin(phase(turb_f)) * 0.03 * np.where(t < C["strike"], 1.0, np.exp(-(t - C["strike"]) / 0.5))
    turbine += bp(colored(n, r, 0.3), 1500, 4000) * 0.08 * np.where(t < C["strike"], 1.0, np.exp(-(t - C["strike"]) / 0.5))
    air = lp(colored(n, r, 1.1), 900) * (0.5 + 0.2 * smooth_noise(n, r, 0.4))
    storm = env_track(n, [(0, 0), (C["storm"] - 0.1, 0), (C["storm"] + 0.2, 1), (C["island"], 1), (d, 0.6)])
    rain = (bp(colored(n, r, 0.3), 1500, 9000) * 0.5 + lp(colored(n, r, 1.3), 600) * 0.9) * storm
    out = whup + turbine + air * (0.7 + 0.8 * storm) + rain
    # far thunder rolls in the storm
    for tm in (C["storm"] + 0.3, C["island"] - 0.2):
        add(out, thunder(rr(), far=True) * 0.6, tm)
    return out * env_track(n, [(0, 1), (d - 0.4, 1), (d, 0)])


def thunder(r, far=False):
    d = 3.5
    t = tt(d)
    rumble = lp(colored(len(t), r, 1.6), 180 if far else 260) * (1 - np.exp(-t / 0.08)) * np.exp(-t / (1.2 if far else 0.9)) * (0.6 + 0.4 * smooth_noise(len(t), r, 3.0))
    if far:
        return rumble * 1.4
    crack = hp(r.standard_normal(len(t)), 800) * np.exp(-t / 0.05) * 1.6 + bp(r.standard_normal(len(t)), 200, 3000) * np.exp(-t / 0.18)
    return crack + rumble * 2.2


def shutter():
    r = rr()
    out = np.zeros(ns(0.25))
    add(out, modal(0.06, [(3200, 1, 0.006), (5400, 0.5, 0.004)], r), 0.0)
    add(out, burst_noise(0.05, r, 2000, 8000, 0.008) * 0.6, 0.0)
    add(out, modal(0.06, [(2600, 0.8, 0.006)], r), 0.07)
    return out


def glitch():
    """an electrical fizz-pop as the autopilot dies (a spark and a hum cutting out, no beeps)"""
    r = rr()
    d = 0.7
    t = tt(d)
    hum = (np.sin(TAU * 100 * t) + 0.5 * np.sin(TAU * 200 * t) + 0.3 * np.sin(TAU * 300 * t)) * 0.12 * np.exp(-t / 0.25)
    out = hum
    for k in range(5):
        add(out, burst_noise(0.03, r, 1500, 7000, 0.006) * r.uniform(0.3, 0.8), 0.02 + k * r.uniform(0.04, 0.1))
    return out


def skid_sand():
    """skids ploughing the sand: a grainy scrape that slows with the friction stop"""
    r = rr()
    d = T["SKID_T"] + 0.3
    t = tt(d)
    v = np.clip(1 - t / T["SKID_T"], 0, 1)
    grain = G.bubbles(d, r, 900 * v + 5, 800, 5000, (0.001, 0.004), v, rise=(0, 1)) * 0.8
    scrape = bp(colored(len(t), r, 0.6), 250, 2500) * v ** 0.7
    return grain + scrape * 1.2


def hull_thump():
    r = rr()
    d = 1.0
    t = tt(d)
    thump = np.sin(phase(70 * (1 + 0.6 * np.exp(-t / 0.03)))) * np.exp(-t / 0.18) * 1.6
    metal = modal(d, [(210, 0.6, 0.25), (530, 0.4, 0.18), (1180, 0.25, 0.1), (2350, 0.12, 0.05)], r)
    sand = burst_noise(d, r, 300, 3000, 0.08) * 0.7
    return thump + metal + sand


def clonk():
    r = rr()
    d = 0.6
    return modal(d, [(330, 0.8, 0.12), (870, 0.5, 0.06), (1750, 0.2, 0.03)], r) + burst_noise(d, r, 200, 2000, 0.03) * 0.6


def door_fall():
    r = rr()
    out = np.zeros(ns(1.0))
    add(out, G.creak(0.35, r, 140, 90, scale=1.6) * 0.5, 0.0)
    add(out, hull_thump()[: ns(0.6)] * 0.45, 0.32)
    return out


def sand_step():
    r = rr()
    d = 0.3
    t = tt(d)
    return lp(r.standard_normal(len(t)), 700) * np.exp(-t / 0.05) * 1.2 + G.bubbles(d, r, 400, 1500, 5000, (0.001, 0.003), np.exp(-t / 0.05), rise=(0, 1)) * 0.4


def latch():
    r = rr()
    out = np.zeros(ns(0.4))
    add(out, modal(0.1, [(1800, 1, 0.01), (3700, 0.5, 0.006)], r), 0.0)
    add(out, modal(0.1, [(1500, 1, 0.012), (3100, 0.5, 0.006)], r), 0.12)
    add(out, G.creak(0.2, r, 200, 150, scale=2.0) * 0.2, 0.14)
    return out


def gun_down():
    r = rr()
    d = 0.3
    return modal(d, [(900, 0.8, 0.03), (2100, 0.4, 0.015)], r) + burst_noise(d, r, 800, 5000, 0.01) * 0.5


def carve():
    """a sharp shell scratching marks into the palm's bark"""
    r = rr()
    out = np.zeros(ns(1.2))
    for k in range(6):
        L = r.uniform(0.08, 0.14)
        tl = tt(L)
        s = bp(r.standard_normal(len(tl)), 1200, 5000) * np.sin(np.pi * tl / L) ** 1.5
        s += G.bubbles(L, r, 300, 1500, 4000, (0.001, 0.003), rise=(0, 1)) * 0.5
        add(out, s * r.uniform(0.6, 1), 0.05 + k * 0.17)
    return out


def log_drag():
    r = rr()
    d = 2.6
    t = tt(d)
    pull = 0.6 + 0.4 * np.abs(np.sin(np.pi * t / 0.8))
    return (bp(colored(len(t), r, 0.8), 150, 1800) * pull + G.bubbles(d, r, 200 * pull, 600, 3000, (0.001, 0.004), pull, rise=(0, 1)) * 0.3) * np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.3)


def log_down():
    r = rr()
    d = 0.7
    t = tt(d)
    wood = modal(d, [(150, 1.0, 0.09), (390, 0.6, 0.05), (820, 0.3, 0.02)], r)
    return wood + lp(r.standard_normal(len(t)), 900) * np.exp(-t / 0.06) * 0.8


def gull():
    """a herring-gull "kyow-kyow" (rough, harsh — formant-filtered sawtooth with a pitch fall), then wing flaps"""
    r = rr()
    out = np.zeros(ns(1.3))
    for k in range(2):
        L = 0.28
        tl = tt(L)
        f0 = 1100 * (1 + 0.35 * np.sin(np.pi * tl / L)) * (1 - 0.25 * tl / L)
        ph = phase(f0)
        saw = sum(np.sin(m * ph) / m for m in range(1, 12))
        v = bp(saw, 1200, 4200) + 0.3 * bp(r.standard_normal(len(tl)), 2000, 6000)
        add(out, v * np.sin(np.pi * tl / L) ** 1.2 * (1 if k == 0 else 0.8), 0.05 + k * 0.32)
    for k in range(5):
        add(out, burst_noise(0.08, r, 300, 2500, 0.03) * 0.5, 0.75 + k * 0.1)
    return out


def leaf_rustle():
    r = rr()
    d = 0.9
    t = tt(d)
    e = np.minimum(1, t / 0.05) * np.exp(-t / 0.4)
    return bp(colored(len(t), r, 0.2), 1500, 8000) * e * (0.5 + 0.5 * np.abs(smooth_noise(len(t), r, 14)))


def isle_crickets():
    r = rr()
    d = 1.3
    return G.crickets(d, r, 4) * np.minimum(1, tt(d) / 0.2) * np.minimum(1, (d - tt(d)) / 0.3)


# ── the seaplane: a radial-engine buzz that swells and falls in pitch as it passes (Doppler) ──
def plane_by():
    r = rr()
    d = 4.2
    t = tt(d)
    tc = 1.8  # closest approach
    v, dist0, c = 60.0, 300.0, 343.0
    x = v * (t - tc)
    rad = -v * x / np.sqrt(x * x + dist0 * dist0)  # radial velocity (−: approaching)
    dop = c / (c + rad)
    f = 95.0 * dop
    ph = phase(f)
    buzz = sum((1.0 / k) * np.sin(k * ph + r.uniform(0, TAU)) for k in range(1, 18))
    buzz = lp(buzz, 1800) + 0.4 * lp(colored(len(t), r, 0.5), 1200) * (0.6 + 0.4 * np.sin(ph) ** 2)
    level = 1.0 / (1 + (x / 120.0) ** 2) ** 0.5
    return buzz * level


def radio():
    """a short burst of radio static as the pilot calls it in (filtered hiss + squelch tail, no tones)"""
    r = rr()
    d = 0.9
    t = tt(d)
    s = bp(r.standard_normal(len(t)), 600, 3200) * (0.5 + 0.5 * (smooth_noise(len(t), r, 25) > 0)) * np.minimum(1, t / 0.02)
    s *= np.where(t < 0.7, 1.0, np.exp(-(t - 0.7) / 0.03))
    return s * 0.7


def ship_horn():
    """a big ship's horn far away: a low, rich, slightly detuned blast with a breathy start"""
    r = rr()
    d = 2.4
    t = tt(d)
    e = np.minimum(1, t / 0.15) * np.minimum(1, (2.0 - t) / 0.25).clip(0, 1)
    y = np.zeros(len(t))
    for det in (0.0, 0.6, -0.5):
        ph = phase(np.full(len(t), 92.0 + det))
        y += sum((1.0 / k ** 0.9) * np.sin(k * ph) for k in range(1, 22))
    y = lp(y, 1400) + bp(r.standard_normal(len(t)), 300, 1500) * 0.15 * np.exp(-t / 0.1)
    return y * e


def davit():
    r = rr()
    return G.creak(1.4, r, 60, 110, scale=0.7, shape_pts=[(0, 0), (0.1, 1), (0.8, 0.8), (1, 0)])


# ── the flare ──
def flare_shot():
    r = rr()
    d = 1.0
    t = tt(d)
    crack = hp(r.standard_normal(len(t)), 600) * np.exp(-t / 0.012) * 2.0
    boom = np.sin(phase(80 * (1 + 1.2 * np.exp(-t / 0.02)))) * np.exp(-t / 0.12) * 1.6
    hiss = bp(r.standard_normal(len(t)), 2000, 8000) * np.minimum(1, t / 0.02) * np.exp(-t / 0.25) * 0.4
    return crack + boom + hiss


def flare_whoosh():
    r = rr()
    d = 1.6
    return G.whoosh(d, r, peak=0.15, f_lo=500, f_hi=3500, tail=1.0) * 1.2


def slowmo_flare():
    r = rr()
    d = C["slowB"] - C["slowA"] + 0.3
    t = tt(d)
    drone = lp(colored(len(t), r, 1.5), 260) * np.minimum(1, t / 0.15) * np.minimum(1, (d - t) / 0.2)
    sweep = np.sin(phase(900 * np.exp(-t * 6) + 55)) * np.exp(-t / 0.3) * 0.35
    hb = lp(np.sin(phase(np.full(ns(0.22), 50.0))) * np.exp(-tt(0.22) / 0.06), 200)
    out = drone + sweep
    add(out, hb * 0.8, 0.35)
    add(out, G.whoosh(0.4, r, peak=0.3, f_lo=300, f_hi=2600, tail=0.05) * 0.7, d - 0.45)
    return out


def chute_pop():
    r = rr()
    d = 0.6
    t = tt(d)
    snap = bp(r.standard_normal(len(t)), 300, 3000) * np.exp(-t / 0.03) * 1.2
    flap = bp(r.standard_normal(len(t)), 200, 1500) * np.exp(-t / 0.2) * (0.5 + 0.5 * np.abs(np.sin(TAU * 9 * t))) * 0.5
    return snap + flap


def flare_hiss():
    """the burning flare hanging on its chute: a soft sizzle with crackles (kept low and warm)"""
    r = rr()
    d = C["tink"] - C["pop"]
    t = tt(d)
    s = lp(bp(colored(len(t), r, 0.6), 800, 5000), 4000) * (0.7 + 0.3 * smooth_noise(len(t), r, 6))
    crk = G.bubbles(d, r, 25, 1500, 4500, (0.001, 0.003), rise=(0, 1)) * 0.6
    return (s + crk) * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.2)


def tink():
    r = rr()
    return modal(0.6, [(1650, 1, 0.2), (3900, 0.5, 0.08), (6100, 0.2, 0.03)], r)


# ── fire, the burst, the sinking ──
def fire_roar():
    r = rr()
    d = C["sinkB"] - C["fire"] + 0.5
    n = ns(d)
    t = np.arange(n) / SR
    grow = env_track(n, [(0, 0.15), (C["burst"] - C["fire"], 0.6), (C["burst"] - C["fire"] + 0.2, 1.0), (C["sinkB"] - C["fire"] - 0.6, 0.9), (d, 0)])
    roar = lp(colored(n, r, 1.3), 700) * (0.7 + 0.3 * smooth_noise(n, r, 4)) * grow
    crackle = G.bubbles(d, r, 60 * grow + 5, 900, 5000, (0.001, 0.004), grow, rise=(0, 2)) * 0.9
    return roar * 1.2 + crackle


def burst_boom():
    r = rr()
    d = 3.0
    t = tt(d)
    boom = np.sin(phase(48 * (1 + 1.5 * np.exp(-t / 0.04)))) * np.exp(-t / 0.5) * 2.2
    blast = lp(colored(len(t), r, 0.8), 2500) * np.exp(-t / 0.25) * 1.6
    rumble = lp(colored(len(t), r, 1.8), 160) * (1 - np.exp(-t / 0.05)) * np.exp(-t / 1.1) * 1.6
    debris = np.zeros(len(t))
    for k in range(10):
        add(debris, modal(0.3, [(r.uniform(400, 1600), 0.5, 0.05)], r) * r.uniform(0.2, 0.6), 0.6 + r.uniform(0, 1.4))
    return boom + blast + rumble + debris


def sink():
    """hull groans, water pouring in, the horn's dying groan, then the big gulp and the bubbles"""
    r = rr()
    d = C["sinkB"] - C["sinkA"] + 1.8
    n = ns(d)
    t = np.arange(n) / SR
    groan = np.zeros(n)
    add(groan, G.creak(1.6, r, 30, 18, scale=0.35) * 0.9, 0.2)
    add(groan, G.creak(1.4, r, 26, 14, scale=0.3) * 0.9, 1.6)
    pour = lp(colored(n, r, 0.9), 1500) * env_track(n, [(0, 0.3), (1.0, 1.0), (d - 1.8, 1.0), (d - 1.4, 0.2), (d, 0)])
    hf = 92 * np.clip(1 - t / (d - 1.6), 0.55, 1)
    horn = lp(sum((1.0 / k) * np.sin(k * phase(hf)) for k in range(1, 14)), 900) * env_track(n, [(0, 0), (0.8, 0), (1.0, 0.5), (d - 2.0, 0.4), (d - 1.6, 0)])
    gulp_t = d - 1.6
    out = groan + pour * 0.8 + horn * 0.6
    tg = tt(1.6)
    gulp = np.sin(phase(60 * (1 + 0.8 * np.exp(-tg / 0.08)))) * np.exp(-tg / 0.3) * 1.4 + G.bubbles(1.6, r, 300 * np.exp(-tg / 0.4) + 10, 120, 1500, (0.01, 0.05), np.exp(-tg / 0.6)) * 1.2
    add(out, gulp, gulp_t)
    return out


def splash_small():
    r = rr()
    d = 0.9
    t = tt(d)
    return burst_noise(d, r, 400, 6000, 0.06) * 1.0 + G.bubbles(d, r, 300 * np.exp(-t / 0.2) + 5, 300, 2500, (0.004, 0.02), np.exp(-t / 0.3)) * 0.8


def oars():
    r = rr()
    d = 6.0
    out = np.zeros(ns(d))
    k = 0
    while 0.2 + k * 0.85 < d - 0.6:
        tm = 0.2 + k * 0.85
        add(out, splash_small()[: ns(0.5)] * 0.4 * np.exp(-k / 6), tm)
        add(out, G.creak(0.15, r, 160, 120, scale=1.3) * 0.15 * np.exp(-k / 6), tm + 0.3)
        k += 1
    return out


def ring_bump():
    r = rr()
    d = 0.6
    t = tt(d)
    return lp(r.standard_normal(len(t)), 500) * np.exp(-t / 0.04) + np.sin(phase(np.full(len(t), 140.0))) * np.exp(-t / 0.06) * 0.6 + G.bubbles(d, r, 60, 300, 1200, (0.005, 0.02), np.exp(-t / 0.2)) * 0.5


# ── island ambience: surf in sets, birds by day, palm rustle in the offshore wind, quieter at night ──
def island_amb():
    r = rr()
    d = DUR - C["touch"]
    n = ns(d)
    t = np.arange(n) / SR
    surf = lp(colored(n, r, 1.4), 900) * (0.45 + 0.55 * np.sin(2 * np.pi * t / 7.0) ** 4)
    wash = bp(colored(n, r, 0.5), 1500, 6000) * 0.25 * np.sin(2 * np.pi * t / 7.0 + 0.6) ** 6
    wind = lp(colored(n, r, 1.1), 800) * (0.6 + 0.4 * smooth_noise(n, r, 0.3)) * 0.5
    rust = bp(colored(n, r, 0.3), 2000, 7000) * (0.5 + 0.5 * smooth_noise(n, r, 0.8)) * 0.12
    birds = G.bird_chirps(d, r, 0.4, "blackbird") * 0.12
    rel = lambda x: x - C["touch"]
    day = env_track(n, [(0, 1), (rel(C["night1"]), 1), (rel(C["night1"]) + 0.25, 0.1), (rel(C["night1"]) + 0.7, 1), (rel(C["night2"]), 1), (rel(C["night2"]) + 0.25, 0.1), (rel(C["night2"]) + 0.7, 1), (rel(C["fade"]) - 1.5, 1), (d, 0.2)])
    return surf + wash + wind + rust + birds * day


# ═══════════════════════════════ score ═══════════════════════════════
MIXB = np.zeros((2, ns(DUR)))
F = I.m2f
ms = rng(1012)


def note(x, tm, p=0.0, g=1.0):
    if 0 <= tm < DUR:
        x = np.asarray(x, float) * g
        place(MIXB, x if x.ndim == 2 else pan(x, p), tm)


def grid(t0, t1, step):
    k = int(np.ceil(t0 / step))
    while k * step < t1:
        yield k * step
        k += 1


Q = 60 / 112
# A — the sunny tour: a bouncy plucked tune with vibes over a soft pad (C major)
note(I.pad([F(60), F(64), F(67)], C["storm"] + 0.1, 0.28, ms, att=0.4, rel=0.3), 0.0, 0.0, 0.5)
TUNE = [72, 76, 79, 76, 77, 74, 71, 74, 72]
for i, tm in enumerate(grid(0.1, C["storm"] - 0.05, Q / 2)):
    note(I.pluck(F(TUNE[i % len(TUNE)]), 0.45, ms, 0.5, 0.6), tm, 0.2, 0.5)
    if i % 2 == 0:
        note(I.pluck(F(48 + (0 if (i // 4) % 2 == 0 else 7)), 0.5, ms, 0.6, 0.3), tm, -0.2, 0.5)
# the storm wall reveal: a low brass stab
note(I.brass(F(41), 0.7, 0.8, ms, kind="stab"), C["storm"] - 0.85, 0.0, 0.5)
# B — the storm: timpani rolls and low brass; the strike: cymbal + stab; the spiral: a falling brass line
for i, tm in enumerate(grid(C["storm"], C["touch"] - 0.1, 0.11)):
    note(I.timpani(F(38), 0.25 + 0.25 * ((tm - C["storm"]) / (C["touch"] - C["storm"])), ms, 0.4), tm, 0.0, 0.35)
note(I.cymbal(0.8, ms, 2.0), C["strike"], 0.0, 0.5)
note(I.brass(F(37), 0.9, 0.9, ms, kind="stab"), C["strike"] + 0.02, 0.0, 0.6)
for k, mid in enumerate((62, 61, 60, 59, 58)):
    note(I.brass(F(mid), 0.32, 0.7, ms, kind="horn"), C["error"] + 0.8 + k * 0.32, 0.1, 0.45)

# C — the kit / Newt's look #1: thinking glock over a pad
for a, b in ((C["look1"], T["LOOK1"]["end"]), (C["look2"], T["LOOK2"]["end"]), (C["look3"], C["oh"])):
    note(I.pad([F(57), F(60), F(64)], b - a, 0.28, ms, att=0.5, rel=0.4), a, 0.0, 0.42)
    for k, mid in enumerate((79, 76, 72)):
        note(I.glock(F(mid), 0.35, ms, 1.6), a + 0.3 + k * 0.6, 0.2, 0.4)

# D — castaway days: a deadpan pluck-bass + glock ostinato that steps up a key each day
DAYS = [(C["tally1"], C["night1"], 0), (C["night1"] + 0.75, C["night2"], 2), (C["night2"] + 0.75, C["look2"], 4)]
OST = [0, 7, 4, 7]
for a, b, up in DAYS:
    for i, tm in enumerate(grid(a, b - 0.05, Q)):
        note(I.pluck(F(43 + up + OST[i % 4]), 0.5, ms, 0.7, 0.25), tm, -0.15, 0.55)
        if i % 2 == 1:
            note(I.glock(F(79 + up), 0.22, ms, 0.6), tm, 0.25, 0.3)
# the nights: a held music-box note each
for a in (C["night1"], C["night2"]):
    note(I.musicbox(F(84), 0.4, ms, 1.2), a + 0.1, 0.2, 0.4)
# MAXIMUM VOLUME: a pompous little brass hit
note(I.brass(F(55), 0.4, 0.9, ms, kind="stab"), C["mega"] + 0.1, 0.0, 0.55)

# E — DAY 5 / the sign line / the island from above: warm pad rising into the plane
e0 = C["over3"]
note(I.pad([F(53), F(57), F(60), F(65)], C["rock"] - e0 + 0.3, 0.32, ms, att=1.0, rel=0.5), e0, 0.0, 0.45)
# F — the wing rock: a heroic horn fanfare, then hope under the horizon and the reef
FAN = [60, 64, 67, 72]
for k, mid in enumerate(FAN):
    note(I.brass(F(mid), 0.22 if k < 3 else 0.9, 0.8, ms, kind="horn"), C["rock"] + 0.3 + k * 0.15, 0.15, 0.55)
note(I.cymbal(0.5, ms, 2.0), C["rock"] + 0.75, 0.0, 0.4)
h0 = C["horizon"]
note(I.pad([F(48), F(55), F(60), F(64)], C["grab"] - h0, 0.35, ms, att=0.8, rel=0.3), h0, 0.0, 0.45)
for k, mid in enumerate((67, 72, 76, 79)):
    note(I.vibes(F(mid), 0.4, ms, 1.4), C["reef"] + 0.9 + k * 0.22, 0.2, 0.45)
# G — SIGNAL: MAXIMUM — a snare roll building to the BANG
for tm, v in I.snare_roll(C["grab"] + 0.3, C["bang"] - 0.02, 0.2, 0.85, ms):
    note(I.snare(v, ms, 0.2, buzz=True), tm, 0.1, 0.45)
note(I.brass(F(43), 0.5, 0.95, ms, kind="stab"), C["bang"], 0.0, 0.6)
# the parachute hangs: an innocent little music-box phrase (before Newt does the maths)
for k, mid in enumerate((84, 88, 91, 88)):
    note(I.musicbox(F(mid), 0.4, ms, 1.0), C["pop"] + 0.15 + k * 0.2, 0.2, 0.4)

# H — the ship goes down: a grand, tragic brass line (minor), falling into a sad slide on the realisation
note(I.timpani(F(36), 0.9, ms, 2.4), C["burst"], 0.0, 0.6)
note(I.brass(F(45), 1.2, 0.9, ms, kind="stab"), C["burst"] + 0.02, 0.0, 0.55)
LINE = [(57, 0.7), (60, 0.5), (64, 0.9), (62, 0.5), (60, 0.5), (59, 1.2)]
tm = C["sinkA"] - 0.2
for mid, du in LINE:
    note(I.brass(F(mid), du * 0.95, 0.75, ms, kind="horn"), tm, 0.1, 0.5)
    note(I.brass(F(mid - 24), du * 0.95, 0.7, ms, kind="tuba"), tm, -0.1, 0.45)
    tm += du * 0.62
note(I.brass(F(47), 1.1, 0.8, ms, kind="tuba", fall=-5.0), C["horror"] - 0.05, 0.0, 0.6)

# I — heart: a small, warm vibes melody over a pad as Newt carves DAY 1 and shares the coconut
k0 = C["scratch"]
note(I.pad([F(53), F(57), F(60), F(64)], C["end"] - k0, 0.3, ms, att=1.0, rel=0.8), k0, 0.0, 0.45)
for k, mid in enumerate((72, 74, 76, 72, 69, 72, 77, 76)):
    note(I.vibes(F(mid), 0.38, ms, 1.4), k0 + 0.3 + k * 0.6, 0.2, 0.45)
# J — the moral card
e0 = C["end"]
note(I.pad([F(48), F(52), F(55), F(60), F(64)], DUR - e0 - 0.3, 0.45, ms, att=0.3, rel=1.4), e0 + 0.35, 0.0, 0.55)
for k, mid in enumerate((84, 88, 91)):
    note(I.glock(F(mid), 0.4, ms, 1.6), e0 + 0.4 + k * 0.08, 0.25, 0.45)

music_ir = make_ir(0.9, 6, early=[(0.013, 0.4, -0.3), (0.023, 0.3, 0.4)])
score = MIXB + 0.16 * convolve_st(MIXB, music_ir)
# hard silence: the crash (sfx carry it), and from Newt's "…oh." to the tink
for a, b in ((C["touch"] - 0.02, C["tally1"]), (C["oh"] + 0.05, C["tink"] + 0.4)):
    score[:, ns(a): ns(b)] *= 0.0
score = norm_to(fades(score, 0.01, 0.5), -24.0, mode="integrated")
pk = np.max(np.abs(score))
if pk > 0.89:
    score *= 0.89 / pk
write_wav(os.path.join(OUT, "score-flare.wav"), score, 24)

fb = flight_bed()
write_wav(os.path.join(OUT, "flight-bed.wav"), norm_to(np.stack([fb, np.roll(fb, ns(0.011))]), -26.0, mode="integrated"), 24)
ia = island_amb()
write_wav(os.path.join(OUT, "island-amb.wav"), norm_to(np.stack([ia, np.roll(ia, ns(0.013))]), -33.0, mode="integrated"), 24)
save("shutter", shutter(), -24)
save("thunder-crack", thunder(rr()), -15)
save("glitch", glitch(), -26)
save("skid-sand", skid_sand(), -18)
save("hull-thump", hull_thump(), -17)
save("clonk", clonk(), -22)
save("door-fall", door_fall(), -21)
save("sand-step", sand_step(), -24)
save("latch", latch(), -23)
save("gun-down", gun_down(), -23)
save("carve", carve(), -24)
save("log-drag", log_drag(), -26)
save("log-down", log_down(), -21)
save("gull", gull(), -22)
save("leaf-rustle", leaf_rustle(), -24)
save("isle-crickets", isle_crickets(), -28, wet=0.0)
save("plane-by", plane_by(), -18, wet=0.1)
save("radio", radio(), -26)
save("ship-horn", ship_horn(), -22, wet=0.4, ir=FAR)
save("davit", davit(), -26, wet=0.2, ir=FAR)
save("flare-shot", flare_shot(), -14)
save("flare-whoosh", flare_whoosh(), -20)
save("slowmo-flare", slowmo_flare(), -20, wet=0.0)
save("chute-pop", chute_pop(), -22)
save("flare-hiss", flare_hiss(), -30, wet=0.0)
save("tink", tink(), -24, wet=0.3, ir=FAR)
save("fire-roar", fire_roar(), -22, wet=0.2, ir=FAR)
save("burst-boom", burst_boom(), -14, wet=0.35, ir=FAR)
save("sink", sink(), -19, wet=0.3, ir=FAR)
save("splash-small", splash_small(), -24, wet=0.2, ir=FAR)
save("oars", oars(), -28, wet=0.2, ir=FAR)
save("ring-bump", ring_bump(), -24)
print("ep10 sfx + score written")
