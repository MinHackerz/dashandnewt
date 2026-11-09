"""SFX + score for ep07 "Saved!" — original, seeded, numpy/scipy (the cartoon-3d-short skill's kit).

Outdoor street foley from simple physical models (a car engine with a real Doppler shift, wing flaps, a
steel blade ringing, wooden crates, tomatoes), a slow-motion "time stretch", a street ambience, and an
original score timed to the picture (REAL-clock cue times from tools/sfx/ep07_times.json, exported from
the episode's timeline.ts by ep07-times.mjs). The characters play it dead serious, so the music does too:
a straight-faced secret-agent walk for the bodyguard, a warm swell for his relief, then nothing.

Usage: .venv/bin/python -I tools/sfx/ep07_saved.py public/sfx
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "kit3d"))  # -I leaves the script dir off sys.path
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, fades, modal, st, pan, place, make_ir, convolve_st, norm_to, write_wav, phase, smooth_noise
import sfx_gen as G
import instruments as I

OUT = sys.argv[1]
T = json.load(open(os.path.join(HERE, "ep07_times.json")))
C = T["CUE"]
DUR = C["dur"]
R = rng(707)
rr = lambda: rng(int(R.integers(1 << 30)))

STREET = make_ir(0.35, 71, early=[(0.018, 0.25, -0.5), (0.041, 0.18, 0.4)])  # houses across the road
STEEL = [(1320, 1.0, 0.5), (2870, 0.6, 0.35), (4410, 0.45, 0.22), (6150, 0.3, 0.12)]
WOOD = [(140, 1.0, 0.06), (310, 0.6, 0.04), (690, 0.35, 0.02), (1250, 0.2, 0.012)]


def save(name, x, lufs=-18.0, wet=0.08):
    x = np.asarray(x, float)
    if x.ndim == 1:
        x = np.concatenate([x, np.zeros(ns(0.25))])
        y = st(x) + wet * convolve_st(x, STREET)
    else:
        y = x
    y = norm_to(fades(y, 0.002, 0.03), lufs)
    peak = np.max(np.abs(y))
    if peak > 0.89:
        y *= 0.89 / peak
    write_wav(os.path.join(OUT, f"{name}.wav"), y, 24)


def add(dst, x, t, g=1.0):
    k = ns(t)
    if k >= len(dst) or k < 0:
        return
    seg = np.asarray(x)[: len(dst) - k]
    dst[k: k + len(seg)] += g * seg


# ── the knife glint: a tiny steel "shing" (a blade catching the light, cartoon convention) ──
def knife_shing():
    r = rr()
    d = 1.4
    t = tt(d)
    scrape = bp(r.standard_normal(len(t)), 3000, 9000) * np.exp(-t / 0.05) * 0.4
    ring = modal(d, [(f * 1.6, a, tau) for f, a, tau in STEEL], r)
    return scrape + 0.7 * ring


# ── the pigeon ──
def pigeon_flap():
    r = rr()
    d = 0.9
    x = np.zeros(ns(d))
    rate = 11.0
    k = 0
    while k / rate < 0.75:
        tm = k / rate
        n = ns(0.07)
        nz = bp(r.standard_normal(n), 400, 3200) * np.hanning(n) * np.exp(-tm * 2.2)
        add(x, nz, tm)
        k += 1
    return x


def pigeon_coo():
    r = rr()
    out = np.zeros(ns(1.2))
    for k, (t0, d, f0, f1) in enumerate(((0.0, 0.32, 330, 410), (0.42, 0.55, 300, 360))):
        t = tt(d)
        f = f0 + (f1 - f0) * np.sin(np.pi * t / d)
        voice = np.sin(phase(f)) + 0.35 * np.sin(2 * phase(f)) + 0.12 * np.sin(3 * phase(f))
        env = np.sin(np.pi * t / d) ** 0.8 * (1 + 0.35 * np.sin(2 * np.pi * 28 * t))  # throaty flutter
        add(out, lp(voice * env, 1400) + 0.04 * lp(r.standard_normal(len(t)), 800) * env, t0)
    return out


# ── the car: engine harmonics + tyre roar, pitch from the true Doppler shift of a source passing
#    a listener 2 m away at 11 m/s (c = 343 m/s), level ~ 1/distance ──
V, C_AIR, LANE = 11.0, 343.0, 2.0


def engine(dur, x_of_t, r):
    """x_of_t: the car's position along the road relative to the listener (m), per sample"""
    t = tt(dur)
    x = x_of_t(t)
    dist = np.sqrt(x ** 2 + LANE ** 2)
    v_rad = V * (-x) / dist  # speed toward the listener
    dop = C_AIR / (C_AIR - v_rad)
    rpm = 32.0  # firing frequency (Hz)
    f = rpm * dop
    ph = phase(f)
    eng = sum(a * np.sin(k * ph + k) for k, a in ((1, 1.0), (2, 0.7), (3, 0.45), (4, 0.3), (6, 0.18), (8, 0.1)))
    eng = lp(eng, 900)
    tyre = lp(colored(len(t), r, 1.0), 1800) * 0.9
    gain = 1.0 / np.maximum(dist, 1.2)
    return (eng * 0.6 + tyre) * gain, dist


def car_approach():
    r = rr()
    d = C["slowA"] - C["carHum"]
    # nose passes the listener (Dash) at the slow-mo start; it starts ~d*V metres back
    y, _ = engine(d, lambda t: -(d - t) * V - 1.0, r)
    return y


def car_away():
    r = rr()
    d = 3.0
    y, _ = engine(d, lambda t: 6.0 + t * V, r)
    gust = G.whoosh(1.0, r, peak=0.08, f_lo=250, f_hi=1500, tail=0.4) * 0.6
    out = y.copy()
    add(out, gust, 0.0)
    return out


# ── the yank, the slow motion ──
def arm_yank():
    r = rr()
    w = G.whoosh(0.45, r, peak=0.12, f_lo=500, f_hi=3000, tail=0.15)
    cloth = bp(r.standard_normal(ns(0.09)), 600, 4000) * np.exp(-tt(0.09) / 0.02)
    out = w.copy()
    add(out, cloth * 1.4, 0.0)
    return out


def slowmo():
    """time slows: the world's sound drops two octaves into a low drone; a slow heartbeat; then it snaps back"""
    r = rr()
    d = C["slowB"] - C["slowA"] + 0.3
    t = tt(d)
    # the car's roar, smeared and pitched way down
    drone = lp(colored(len(t), r, 1.6), 260) * 1.2
    f = 32 * 0.28 * (1 + 0.02 * np.sin(2 * np.pi * 0.3 * t))
    drone += 0.5 * lp(np.sin(phase(f)) + 0.5 * np.sin(2 * phase(f)), 300)
    env = np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.3)
    drone *= env
    # the drop at the start: a falling sweep
    sweep_d = 0.6
    ts = tt(sweep_d)
    sweep = np.sin(phase(900 * np.exp(-ts * 5) + 60)) * np.exp(-ts / 0.25) * 0.35
    add(drone, sweep, 0.0)
    # heartbeat, slowed
    hb = lambda: lp(np.sin(phase(np.full(ns(0.22), 48.0))) * np.exp(-tt(0.22) / 0.06), 200)
    for k in range(int((d - 0.8) / 1.1) + 1):
        add(drone, hb() * 0.9, 0.5 + k * 1.1)
        add(drone, hb() * 0.6, 0.5 + k * 1.1 + 0.28)
    # snap back: a rising whoosh into normal time
    up = G.whoosh(0.5, r, peak=0.45, f_lo=200, f_hi=2600, tail=0.05) * 0.8
    add(drone, up, d - 0.6)
    return drone


# ── the THUNK: off-screen, behind him — wooden crates, a blade, tomatoes (non-graphic) ──
def blade_thunk():
    r = rr()
    d = 0.9
    t = tt(d)
    shhk = bp(r.standard_normal(len(t)), 2500, 8000) * np.exp(-t / 0.035) * 0.5
    thunk = modal(d, WOOD, r) * 1.6 + lp(r.standard_normal(len(t)), 400) * np.exp(-t / 0.03) * 0.8
    crate = G.rattle(0.35, r, density=40.0) * 0.35
    out = shhk.copy()
    add(out, thunk, 0.012)
    add(out, crate, 0.03)
    return out


def knife_twang():
    r = rr()
    d = 1.6
    t = tt(d)
    wob = 1 + 0.6 * np.sin(2 * np.pi * 6.7 * t) * np.exp(-t * 2.5)  # the blade wobbling in its block
    ring = modal(d, [(f * 0.55, a, tau * 1.8) for f, a, tau in STEEL], r, glide=0.02)
    boing = np.sin(phase(220 * (1 + 0.04 * np.sin(2 * np.pi * 6.7 * t)))) * np.exp(-t / 0.45) * 0.5
    return (ring * 0.6 + boing) * wob


def tomato_squelch():
    r = rr()
    out = np.zeros(ns(0.6))
    for k in range(4):
        n = ns(0.12)
        add(out, lp(r.standard_normal(n), 1200) * np.exp(-tt(0.12) / 0.03) * (1 - 0.2 * k), 0.02 + k * 0.07)
    add(out, G.bubbles(0.4, r, 18, f_lo=300, f_hi=1200) * 0.4, 0.05)
    return out


def hat_pluck():
    r = rr()
    d = 0.4
    t = tt(d)
    squeak = np.sin(phase(1400 + 900 * t / d)) * np.exp(-t / 0.05) * 0.3
    rustle = bp(r.standard_normal(len(t)), 1500, 6000) * np.exp(-t / 0.08) * 0.4
    return squeak + rustle


def pat():
    r = rr()
    d = 0.2
    t = tt(d)
    return lp(r.standard_normal(len(t)), 700) * np.exp(-t / 0.018) + 0.4 * np.sin(phase(np.full(len(t), 160.0))) * np.exp(-t / 0.03)


def whoosh_small():
    return G.whoosh(0.5, rr(), peak=0.15, f_lo=500, f_hi=2600, tail=0.2) * 0.8


# ── street ambience: soft wind, distant birds, far-off traffic; muffled in the slow-mo ──
def street_amb():
    r = rr()
    n = ns(DUR)
    t = np.arange(n) / SR
    wind = lp(colored(n, r, 1.2), 700) * (0.6 + 0.4 * smooth_noise(n, r, 0.2))
    far = lp(colored(n, r, 1.8), 220) * 0.8
    amb = wind * 0.5 + far
    for k in range(int(DUR * 0.9)):
        tm = r.uniform(0.3, DUR - 0.5)
        f0 = r.uniform(2600, 4200)
        dd = r.uniform(0.06, 0.14)
        tc = tt(dd)
        chirp = np.sin(phase(f0 + 1200 * np.sin(np.pi * tc / dd) * r.choice([-1, 1]))) * np.sin(np.pi * tc / dd) ** 2
        for rep in range(int(r.integers(1, 4))):
            add(amb, chirp * 0.06, tm + rep * dd * 1.4)
    # duck under the slow-mo (time stretched: the world goes quiet), back after
    g = np.ones(n)
    a, b = C["slowA"], C["slowB"]
    g = np.where((t > a) & (t < b), 0.25, g)
    g = np.convolve(g, np.ones(ns(0.15)) / ns(0.15), mode="same")
    return amb * g


# ── score: 96 bpm, a dead-serious secret-agent walk ──
Q = 60 / 96
MIXB = np.zeros((2, ns(DUR)))
F = I.m2f
ms = rng(2107)


def note(x, tm, p=0.0, g=1.0):
    if 0 <= tm < DUR:
        x = np.asarray(x, float) * g
        place(MIXB, x if x.ndim == 2 else pan(x, p), tm)


def grid(t0, t1, step):
    k = int(np.ceil(t0 / step))
    while k * step < t1:
        yield k * step
        k += 1


# A — cold open: a low held note and a glock "ting" on the glint
note(I.pad([F(40), F(47)], C["cut"] - 0.1, 0.4, ms, att=0.4, rel=0.4, warm=500), 0.0, 0.0, 0.6)
note(I.glock(F(88), 0.5, ms, 1.4), C["glint"], 0.3, 0.5)

# B — the bodyguard walk (E minor, walking pizz bass, muted vibes riff, brushes), cut → alarm
BASS = [40, 47, 43, 45, 40, 47, 43, 38]
RIFF = [(0, 64), (0.75, 67), (1.5, 71), (2.0, 70), (2.5, 67)]
b0, b1 = C["cut"], C["alarm"]
for i, tm in enumerate(grid(b0, b1, Q)):
    if C["pigFlap"] - 0.05 < tm < C["pigNod"] - 0.2:
        continue  # the music freezes with him in his stance
    note(I.pluck(F(BASS[i % 8]), 0.75, ms, 0.5), tm, -0.2, 0.8)
    note(I.brush(0.3, ms, 0.2), tm + Q / 2, 0.3, 0.45)
for bar in grid(b0, b1, 4 * Q):
    if C["pigFlap"] - 0.05 < bar < C["pigNod"] - 0.2 or bar > C["carHum"]:
        continue
    for d, mid in RIFF:
        note(I.vibes(F(mid), 0.45, ms, 0.6, damp=0.25), bar + d * Q, 0.25, 0.55)
# the pigeon: a grave brass stab on the lunge, a two-note "all clear" on the nod
note(I.brass(F(40), 0.7, 0.85, ms, kind="tuba"), C["pigJump"], 0.0, 0.8)
note(I.brass(F(52), 0.7, 0.7, ms, kind="horn"), C["pigJump"], 0.1, 0.5)
for k, mid in enumerate((59, 64)):
    note(I.vibes(F(mid), 0.5, ms, 1.2), C["pigNod"] + k * 0.25, 0.2, 0.6)
# the puddle: a little glock hop over it
for k, mid in enumerate((76, 79, 83, 88)):
    note(I.glock(F(mid), 0.4, ms, 1.0), C["pudToss"] + k * 0.12, 0.3, 0.45)
# the car approaching: a held tremolo pad rising under the walk
c0 = C["carHum"]
note(I.pad([F(52), F(55), F(59)], C["alarm"] - c0, 0.35, ms, att=1.2, rel=0.2, trem=lambda tt_: 1 + 0.3 * np.sin(2 * np.pi * 6.0 * tt_)), c0, 0.0, 0.5)
# THREAT LEVEL: MAXIMUM — a snare roll and brass, cut dead at the slow-mo
for tm, v in I.snare_roll(C["alarm"], C["slowA"] - 0.05, 0.25, 0.8, ms):
    note(I.snare(v, ms, 0.25, buzz=True), tm, 0.1, 0.5)
note(I.brass(F(40), C["slowA"] - C["alarm"], 0.8, ms, kind="tuba"), C["alarm"], 0.0, 0.7)

# C — in the slow-mo: three "thinking" glock notes for Newt's chalk, then a warm swell for Dash's relief
for k, mid in enumerate((79, 76, 72)):
    note(I.glock(F(mid), 0.35, ms, 1.8), C["look2"] + 0.3 + k * 0.7, 0.2, 0.4)
h0 = C["heart"] - 0.3
note(I.pad([F(48), F(55), F(64), F(67), F(72)], C["land"] - h0, 0.5, ms, att=1.2, rel=0.05, warm=1400), h0, 0.0, 0.7)
for k, mid in enumerate((72, 76, 79, 84)):
    note(I.vibes(F(mid), 0.45, ms, 1.6), h0 + 0.4 + k * 0.35, -0.2, 0.5)
# … and nothing at all from the THUNK through the reveal (the cut is the joke)

# D — the ghost: the walk's riff as a slow music box, over a soft pad, to the end card
g0 = C["ghost"]
note(I.pad([F(52), F(59), F(64)], C["end"] - g0 + 0.4, 0.3, ms, att=1.5, rel=0.8), g0, 0.0, 0.45)
for rep in range(3):
    for d, mid in RIFF:
        note(I.musicbox(F(mid + 12), 0.5, ms, 1.4), g0 + 0.4 + rep * 4 * Q * 1.3 + d * Q * 1.3, 0.2, 0.5)
# E — the moral card: a major chord at last
e0 = C["end"]
note(I.pad([F(52), F(56), F(59), F(64)], DUR - e0 - 0.3, 0.4, ms, att=0.3, rel=1.4), e0 + 0.35, 0.0, 0.55)
for k, mid in enumerate((76, 80, 83)):
    note(I.glock(F(mid), 0.4, ms, 1.6), e0 + 0.4 + k * 0.08, 0.25, 0.45)

music_ir = make_ir(0.9, 4, early=[(0.013, 0.4, -0.3), (0.023, 0.3, 0.4)])
score = MIXB + 0.16 * convolve_st(MIXB, music_ir)
# hard silence from the THUNK to the ghost (no reverb tail leaking through)
a, b = ns(C["land"]), ns(C["ghost"])
score[:, a:b] = 0.0
score = norm_to(fades(score, 0.01, 0.5), -24.0, mode="integrated")
peak = np.max(np.abs(score))
if peak > 0.89:
    score *= 0.89 / peak
write_wav(os.path.join(OUT, "score-saved.wav"), score, 24)

save("knife-shing", knife_shing(), -22)
save("pigeon-flap", pigeon_flap(), -20)
save("pigeon-coo", pigeon_coo(), -24)
save("whoosh-small", whoosh_small(), -22)
save("car-approach", car_approach(), -17)
save("car-away", car_away(), -18)
save("arm-yank", arm_yank(), -18)
save("slowmo", slowmo(), -20, wet=0.0)
save("blade-thunk", blade_thunk(), -14)
save("knife-twang", knife_twang(), -20)
save("tomato-squelch", tomato_squelch(), -22)
save("hat-pluck", hat_pluck(), -24)
save("pat", pat(), -24)
amb = street_amb()
write_wav(os.path.join(OUT, "street-amb.wav"), norm_to(np.stack([amb, np.roll(amb, ns(0.011))]), -34.0, mode="integrated"), 24)
print("ep07 sfx + score written")
