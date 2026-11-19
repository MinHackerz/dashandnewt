"""SFX + score for short s03 "Why Your Laptop Gets So Hot When Rendering" — original, seeded (numpy/scipy kit).

Cue times: tools/blender/s03_times.json (shots pinned to Liam's narration) and tools/blender/s03_keystrikes.json (the
frames Eric's keys bottom out). Every file is placed at 0 s on the video clock and runs the full length, so the edit
just lays them under the picture (one <Audio> each).
  s03-typing      laptop keys: a soft scissor-switch tick for each of Eric's keystrokes (only while he types)
  s03-fan         the laptop's fan: an airy hum under the room shots, rising inside the laptop (fan shot loudest)
  s03-dive        the dive: a soft rising whoosh into each set, a low air-pressure "thump" on the scale cut
  s03-micro       inside the chip: a faint high crackle of switching (electrons), swelling into the heat
  s03-thermal     the thermal camera switching on: a soft click and a warm, rising hum (and on each heat ramp)
  s03-vapour      inside the heat pipe: a faint hiss of vapour, with tiny droplet ticks at the cold end
  s03-touch       his fingertips on the hot deck: a soft skin tap; the quick pull back: a small cloth whoosh
  s03-score       minimal, warm, curious: a soft pad and a sparse plucked pulse, very low under the voice
Usage: .venv/bin/python -I tools/sfx/s03_laptop.py public/sfx
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
T = json.load(open(os.path.join(HERE, "..", "blender", "s03_times.json")))
KS = json.load(open(os.path.join(HERE, "..", "blender", "s03_keystrikes.json")))
SH, FPS, DUR = T["SHOTS"], T["FPS"], T["DUR"]
N = ns(DUR + 0.5)
R = rng(3031)
ROOM = make_ir(0.35, 3031, early=[(0.011, 0.3, -0.3), (0.023, 0.22, 0.4)])


def t0(s):
    return SH[s]["t0"]


def t1(s):
    return SH[s]["t1"]


def track():
    return np.zeros((2, N))


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1.0, t / max(a, 1e-4)) * np.exp(-t / d)


def gate(x, spans, fade=0.25):
    """keep a full-length mono/stereo track only inside [(a, b, gain)], with soft edges"""
    g = np.zeros(x.shape[-1])
    tt_ = np.arange(x.shape[-1]) / SR
    for a, b, v in spans:
        up = np.clip((tt_ - a) / fade, 0, 1)
        dn = np.clip((b - tt_) / fade, 0, 1)
        g = np.maximum(g, v * np.minimum(up, dn))
    return x * g


def save(name, x, lufs, wet=0.1):
    y = x if x.ndim == 2 else st(x)
    if wet:
        y = y + wet * convolve_st(y.mean(0), ROOM)[:, : y.shape[1]]
    y = norm_to(fades(y, 0.003, 0.2), lufs)
    pk = np.max(np.abs(y))
    if pk > 0.89:
        y *= 0.89 / pk
    write_wav(os.path.join(OUT, f"{name}.wav"), y, 24)
    print("wrote", name, round(y.shape[1] / SR, 2), "s")


# typing: each strike is a short plastic tick (two resonances) + a faint bottom-out thud; only audible in the
# shots where we see him type (the room shots before the dive)
typing = np.zeros(N)
for f, side, finger in KS:
    tm = (f - 1) / FPS
    if tm > t1("s02_thermal") + 0.2:
        continue
    n = ns(0.06)
    t = np.arange(n) / SR
    tick = bp(R.standard_normal(n), 2200 + R.uniform(-300, 300), 6000) * np.exp(-t / 0.004)
    body = np.sin(2 * np.pi * (520 + R.uniform(-40, 40)) * t) * np.exp(-t / 0.012) * 0.35
    thud = lp(R.standard_normal(n), 300) * np.exp(-t / 0.01) * 0.5
    k = ns(tm)
    if k + n < N:
        typing[k:k + n] += (tick + body + thud) * R.uniform(0.6, 1.0) * (0.85 if finger == "pinky" else 1.0)
save("s03-typing", pan(typing, -0.05), -30, wet=0.15)

# fan: broadband airy noise with a soft blade tone; quiet in the room, louder inside, loudest on the fan shot
n = N
t = np.arange(n) / SR
air = bp(colored(n, R, -0.9), 180, 5000) * (0.85 + 0.15 * smooth_noise(n, R, 0.7))
blade = np.sin(2 * np.pi * 1400 * t + 2 * smooth_noise(n, R, 2.0)) * 0.03  # ~41 blades × ~34 rev/s
fan = air + blade
spans = [(0.0, t1("s02_thermal"), 0.35), (t0("s04_diveB"), t1("s04_diveB"), 0.6), (t0("s11_pipes"), t1("s11_pipes"), 0.6),
         (t0("s15_fan"), t1("s16_vents"), 1.0), (t0("s17_touch"), DUR, 0.4)]
save("s03-fan", gate(fan, spans, 0.3), -27, wet=0.0)

# the dive: a rising whoosh into each new scale (A→B→C→D) and a low thump on the scale cut into the transistors
dive = track()
for s in ("s03_diveA", "s04_diveB", "s05_diveC", "s06_diveD"):
    n = ns(1.2)
    t = np.arange(n) / SR
    sweep = bp(colored(n, R, -0.6), 300, 7000) * np.sin(np.pi * np.minimum(1, t / 1.2)) ** 2
    sweep = sweep * (0.4 + 0.6 * t / 1.2)
    place(dive, pan(sweep, 0.0), t0(s) - 0.7, 0.8)
n = ns(0.9)
t = np.arange(n) / SR
thump = np.sin(2 * np.pi * np.cumsum(70 * (1 + 0.6 * np.exp(-t / 0.05))) / SR) * env(n, 0.004, 0.18)
place(dive, pan(thump, 0.0), t0("s06_diveD") - 0.02, 1.0)
save("s03-dive", dive, -24, wet=0.2)

# micro: inside the chip, a faint crackle of switching (sparse random ticks), denser and warmer into the heat
micro = np.zeros(N)
a, b = t0("s06_diveD"), t1("s09_array")
tm = a
while tm < b:
    rate = 60 + 140 * np.clip((tm - t0("s08_bump")) / 4.0, 0, 1)
    tm += R.exponential(1.0 / rate)
    n = ns(0.01)
    tk = np.arange(n) / SR
    k = ns(tm)
    if k + n < N:
        micro[k:k + n] += np.sin(2 * np.pi * R.uniform(3500, 7500) * tk) * np.exp(-tk / 0.0015) * R.uniform(0.2, 1.0)
save("s03-micro", gate(pan(micro, 0.1), [(a, b, 1.0)], 0.4), -33, wet=0.25)

# thermal camera: on → a soft click and a warm rising hum; the same hum swells under each heat ramp
therm = track()


def hum(dur):
    n = ns(dur)
    t = np.arange(n) / SR
    y = sum(np.sin(2 * np.pi * f * t) / k for k, f in enumerate((110, 220, 330.5), 1))
    y = lp(y + 0.2 * bp(colored(n, R, -0.5), 150, 900), 900)
    return y * np.sin(np.pi * np.minimum(1, t / dur)) ** 1.5


n = ns(0.05)
tk = np.arange(n) / SR
click = bp(R.standard_normal(n), 1500, 6000) * np.exp(-tk / 0.004)
place(therm, pan(click, 0.0), t0("s02_thermal"), 0.6)
place(therm, pan(hum(1.6), 0.0), t0("s02_thermal") + 0.02, 0.8)
place(therm, pan(hum(1.8), 0.0), t0("s08_bump") + 3.4, 0.7)  # "…into heat"
place(therm, pan(hum(1.8), 0.0), t0("s10_die") + 2.0, 0.7)  # "…becomes heat"
place(therm, pan(click, 0.0), t0("s18_end"), 0.5)
place(therm, pan(hum(1.6), 0.0), t0("s18_end") + 0.02, 0.6)
save("s03-thermal", therm, -27, wet=0.15)

# vapour: inside the pipe, a faint hiss that flows (left → right with the vapour), droplet ticks at the cold end
n = N
vap = hp(colored(n, R, -0.3), 2500) * (0.7 + 0.3 * smooth_noise(n, R, 3.0))
vapour = gate(vap, [(t0("s12_hotend"), t1("s14_coldend"), 1.0)], 0.5)
drops = np.zeros(N)
tm = t0("s14_coldend")
while tm < t1("s14_coldend"):
    tm += R.uniform(0.15, 0.45)
    n_ = ns(0.04)
    tk = np.arange(n_) / SR
    f_ = R.uniform(1800, 2600)
    k = ns(tm)
    if k + n_ < N:
        drops[k:k + n_] += np.sin(2 * np.pi * np.cumsum(f_ * (1 + 0.5 * tk / 0.04)) / SR) * np.exp(-tk / 0.008) * 0.4
save("s03-vapour", np.stack([vapour * 0.8 + drops * 0.6, vapour * 0.9 + drops * 0.5]), -31, wet=0.2)

# touch: fingertips on the hot deck (soft skin tap), then the quick pull back (a small cloth whoosh)
touch = track()
TO = T["TOUCH"]
n = ns(0.12)
t = np.arange(n) / SR
tap = lp(R.standard_normal(n), 900) * np.exp(-t / 0.012) + 0.3 * np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.02)
place(touch, pan(tap, -0.2), (TO["contact"] - 1) / FPS, 0.9)
n = ns(0.45)
t = np.arange(n) / SR
whoosh = bp(colored(n, R, -0.7), 300, 3500) * np.sin(np.pi * np.minimum(1, t / 0.45)) ** 1.5
place(touch, pan(whoosh, -0.3), (TO["lift"] - 1) / FPS, 0.7)
save("s03-touch", touch, -26, wet=0.1)

# score: minimal and warm — a soft pad on a slow progression and a sparse plucked pulse; it thins out under the
# densest narration and resolves on a warm chord at the end
MIX = np.zeros((2, ns(DUR + 2.0)))
F = I.m2f
ms = rng(3032)
BPM = 92
B = 60 / BPM
BAR = 4 * B
CH = [[50, 57, 62, 66, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [45, 52, 57, 61, 64]]  # D – Bm – G – A
tm, k = 0.0, 0
while tm < DUR - BAR * 0.5:
    v = CH[k % 4]
    MIX_part = I.pad([F(m) for m in v[1:]], BAR + 0.8, 0.26, ms, att=1.2, rel=1.6, warm=650)
    place(MIX, MIX_part, tm, 0.32)
    place(MIX, pan(I.pluck(F(v[0] - 12), 0.35, ms, 1.2, bright=0.2), -0.1), tm, 0.5)  # soft bass on 1
    if tm > t0("s03_diveA") - 0.1:  # the pulse starts when we go inside: gentle 8th-note plucks on chord tones
        for j in range(8):
            if ms.uniform() < 0.62:
                place(MIX, pan(I.pluck(F(v[1 + (j * 3) % 4] + 12), 0.22, ms, 0.5, bright=0.35), 0.3 * (-1) ** j), tm + j * B / 2, 0.28)
    tm += BAR
    k += 1
end = DUR - 2.4
MIX[:, ns(end):] *= np.linspace(1, 0, MIX.shape[1] - ns(end)) ** 2
place(MIX, I.pad([F(m) for m in (50, 57, 62, 66, 69, 74)], 2.2, 0.32, ms, att=0.3, rel=1.4, warm=800), end + 0.1, 0.45)
place(MIX, pan(I.glock(F(81), 0.35, ms, 2.0), 0.2), end + 0.15, 0.3)
score = MIX[:, :N] + 0.2 * convolve_st(MIX[:, :N].mean(0), ROOM)[:, :N]
score = norm_to(fades(score, 0.5, 1.2), -30.0, mode="integrated")
pk = np.max(np.abs(score))
if pk > 0.89:
    score *= 0.89 / pk
write_wav(os.path.join(OUT, "s03-score.wav"), score, 24)
print("s03 sfx + score written")
