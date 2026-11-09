"""SFX + music bed for ep05 "Spaced Out" (pure stdlib, seeded) — all original.

In vacuum nothing is heard from outside: the burst and the impact are a low "thump" felt
through the suit/ground, never a boom.

Usage: python3 tools/sfx/ep05_space.py public/sfx
"""
import math, random, struct, sys, wave, os
SR = 44100
OUT = sys.argv[1]
random.seed(505)
TAU = 2 * math.pi

def save(name, x, gain=0.85):
    pk = max(1e-9, max(abs(v) for v in x))
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(v / pk * gain * 32767)) for v in x))

def lp(x, a):
    y, p = [], 0.0
    for s in x:
        p += a * (s - p); y.append(p)
    return y

def n(s): return int(s * SR)
def noise(): return random.random() * 2 - 1
def mix(dst, src, at, vol=1.0):
    s0 = n(at)
    if len(dst) < s0 + len(src): dst.extend([0.0] * (s0 + len(src) - len(dst)))
    for i, v in enumerate(src): dst[s0 + i] += v * vol

# beep: soft countdown/console beep
save("beep", [math.sin(TAU * 880 * i / SR) * min(1, i / 200) * math.exp(-9 * i / SR) for i in range(n(0.22))], 0.5)

# rocket-roar: deep filtered rumble with crackle, swelling then steady (4 s)
rr = []
for i in range(n(4.0)):
    t = i / SR
    env = min(1, t / 0.4)
    rr.append(noise() * env)
rr = lp(lp(rr, 0.03), 0.06)
for k in range(60):
    at = random.random() * 3.8
    cr = [noise() * math.exp(-120 * j / SR) for j in range(n(0.03))]
    mix(rr, cr, at, 0.05)
save("rocket-roar", rr, 0.8)

# clunk: heavy lever thrown to MAX
ck = [(math.sin(TAU * 140 * i / SR) * math.exp(-22 * i / SR) + noise() * math.exp(-90 * i / SR) * 0.6) for i in range(n(0.35))]
save("clunk", lp(ck, 0.35), 0.8)

# warn: gentle two-tone warning (not shrill), 1 s loop
wn = [0.0] * n(1.0)
for at, f in ((0.0, 660), (0.25, 520)):
    mix(wn, [math.sin(TAU * f * j / SR) * math.sin(math.pi * j / n(0.2)) for j in range(n(0.2))], at, 0.7)
save("warn", wn, 0.45)

# thump: low, soft body-felt hit (vacuum: no boom), 0.8 s
th = [(math.sin(TAU * (55 + 40 * math.exp(-8 * i / SR)) * i / SR) * math.exp(-5 * i / SR)) for i in range(n(0.8))]
save("thump", lp(th, 0.2), 0.9)

# flare: steady hiss + sputter, muffled (heard through a glove), 3 s
fl = []
for i in range(n(3.0)):
    t = i / SR
    sp = 0.75 + 0.25 * math.sin(TAU * 7 * t) * math.sin(TAU * 1.3 * t)
    fl.append(noise() * sp * min(1, t / 0.08))
fl = lp(fl, 0.25)
save("flare", fl, 0.6)

# ghost: wobbly "wooo" — a sine glide with slow vibrato (not a voice)
gh = []
ph = 0.0
for i in range(n(1.8)):
    t = i / SR
    f = 420 + 120 * math.sin(math.pi * t / 1.8) + 18 * math.sin(TAU * 5 * t)
    ph += TAU * f / SR
    gh.append(math.sin(ph) * math.sin(math.pi * t / 1.8) ** 0.7)
save("ghost", gh, 0.45)

# bed-space: dreamy, gently bouncy loop — soft pad chords + twinkly arpeggio, 90 bpm, 4 bars
BPM = 90
beat = 60 / BPM
bar = 4 * beat
L = n(4 * bar)
bed = [0.0] * L
chords = [(220.0, 261.63, 329.63), (174.61, 220.0, 261.63), (196.0, 246.94, 293.66), (164.81, 207.65, 246.94)]  # Am F G E
for b, ch in enumerate(chords):
    t0 = b * bar
    pad = []
    for j in range(n(bar)):
        t = j / SR
        env = min(1, t / 0.6) * min(1, (bar - t) / 0.6)
        pad.append(env * sum(math.sin(TAU * f * t) + 0.3 * math.sin(TAU * f * 2.003 * t) for f in ch) / 3)
    mix(bed, lp(pad, 0.2), t0, 0.35)
    for k in range(8):
        f = ch[(k * 2) % 3] * (2 if k % 4 < 2 else 4)
        tw = [math.sin(TAU * f * j / SR) * math.exp(-7 * j / SR) * min(1, j / 100) for j in range(n(beat * 1.2))]
        mix(bed, tw, t0 + k * beat / 2, 0.16)
    bass = [math.sin(TAU * ch[0] / 2 * j / SR) * math.exp(-2.5 * j / SR) * min(1, j / 300) for j in range(n(beat * 1.8))]
    mix(bed, bass, t0, 0.45)
    mix(bed, bass, t0 + 2 * beat, 0.3)
tail = bed[L:]
bed = bed[:L]
for j, v in enumerate(tail[:L]):
    bed[j] += v
save("bed-space", bed, 0.6)
