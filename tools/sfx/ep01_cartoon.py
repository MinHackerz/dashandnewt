"""Cartoon SFX for ep01 "The Button" (pure stdlib, 44.1k mono 16-bit).

Usage: python3 tools/sfx/ep01_cartoon.py public/sfx
"""
import math, random, struct, sys, wave, os

SR = 44100
OUT = sys.argv[1]
random.seed(7)


def save(name, samples, gain=0.9):
    peak = max(1e-9, max(abs(s) for s in samples))
    k = gain / peak
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s * k)) * 32767)) for s in samples))


def n(sec):
    return int(sec * SR)


def env_adsr(i, total, a=0.005, r=0.05):
    t = i / SR
    T = total / SR
    if t < a:
        return t / a
    if t > T - r:
        return max(0.0, (T - t) / r)
    return 1.0


def sweep(f0, f1, dur, wave_fn=math.sin, vib=0.0, vibrate=6.0, curve=1.0):
    out, ph = [], 0.0
    N = n(dur)
    for i in range(N):
        p = (i / N) ** curve
        f = f0 * (f1 / f0) ** p
        f *= 1 + vib * math.sin(2 * math.pi * vibrate * i / SR)
        ph += 2 * math.pi * f / SR
        out.append(wave_fn(ph) * env_adsr(i, N, 0.01, 0.06))
    return out


def saw(ph):
    x = (ph / (2 * math.pi)) % 1.0
    return 2 * x - 1


def tri(ph):
    x = (ph / (2 * math.pi)) % 1.0
    return 4 * abs(x - 0.5) - 1


def mix(dst, src, at=0, vol=1.0):
    start = n(at)
    need = start + len(src)
    if len(dst) < need:
        dst.extend([0.0] * (need - len(dst)))
    for i, s in enumerate(src):
        dst[start + i] += s * vol
    return dst


def lowpass(x, a):
    y, prev = [], 0.0
    for s in x:
        prev += a * (s - prev)
        y.append(prev)
    return y


# --- slide whistle up (tension reach) ---
save("slide-up", sweep(300, 1400, 1.9, math.sin, vib=0.012, curve=0.8))

# --- falling whistle (anvil incoming) ---
save("fall-whistle", sweep(2200, 500, 1.0, math.sin, vib=0.004, curve=1.3), gain=0.7)

# --- long falling whistle fading (trapdoor fall) ---
fw = sweep(1800, 250, 2.0, math.sin, vib=0.006)
fw = [s * (1 - i / len(fw)) ** 1.5 for i, s in enumerate(fw)]
save("long-fall", fw, gain=0.7)

# --- boing (spring) ---
b, ph = [], 0.0
N = n(0.9)
for i in range(N):
    t = i / SR
    f = 180 + 140 * math.sin(2 * math.pi * 11 * t) * math.exp(-3 * t) + 60 * math.exp(-6 * t)
    ph += 2 * math.pi * f / SR
    b.append((math.sin(ph) + 0.3 * math.sin(2 * ph)) * math.exp(-3.2 * t))
save("boing", b)

# --- bonk (anvil on head: metallic clang + thud) ---
bk = []
N = n(1.2)
for i in range(N):
    t = i / SR
    metal = sum(math.sin(2 * math.pi * f * t) * math.exp(-d * t) for f, d in [(523, 5), (1187, 7), (1977, 9), (2830, 12), (3610, 15)])
    thud = math.sin(2 * math.pi * (90 * math.exp(-8 * t) + 45) * t) * math.exp(-9 * t) * 3
    noise = (random.random() * 2 - 1) * math.exp(-40 * t) * 2
    bk.append(metal * 0.5 + thud + noise)
save("bonk", bk)

# --- thud (button slam / landing) ---
th = []
N = n(0.6)
for i in range(N):
    t = i / SR
    th.append(math.sin(2 * math.pi * (120 * math.exp(-14 * t) + 40) * t) * math.exp(-8 * t) + (random.random() * 2 - 1) * math.exp(-60 * t) * 0.6)
save("thud", th)

# --- distant thud (bottom of pit, filtered & quiet) ---
save("distant-thud", lowpass(th, 0.08), gain=0.35)

# --- crickets ---
cr = [0.0] * n(2.2)
for chirp in range(6):
    at = 0.12 + chirp * 0.34
    for pulse in range(3):
        burst = [math.sin(2 * math.pi * 4400 * i / SR) * math.sin(math.pi * i / n(0.025)) for i in range(n(0.025))]
        mix(cr, burst, at + pulse * 0.035, 1.0)
save("crickets", cr, gain=0.5)

# --- innocent whistle melody ---
mel = []
notes = [(988, 0.18), (1175, 0.18), (1319, 0.18), (1175, 0.30), (988, 0.40)]
for f, d in notes:
    mel += sweep(f * 0.98, f, d, math.sin, vib=0.015, vibrate=7)
save("whistle", mel, gain=0.55)

# --- pop (button appears / helmet on) ---
save("pop", [math.sin(2 * math.pi * (900 - 2400 * (i / SR)) * i / SR) * math.exp(-35 * i / SR) for i in range(n(0.12))], gain=0.8)

# --- twinkle stars (dazed) ---
tw = []
for k, f in enumerate([2093, 2637, 3136, 2637, 2093, 2637, 3136, 3520]):
    tone = [math.sin(2 * math.pi * f * i / SR) * math.exp(-9 * i / SR) for i in range(n(0.35))]
    mix(tw, tone, k * 0.13, 0.7)
save("twinkle", tw, gain=0.45)

# --- trapdoor creak/clack ---
tc = []
N = n(0.35)
for i in range(N):
    t = i / SR
    tc.append(saw(2 * math.pi * (70 + 40 * t) * t) * 0.4 * math.exp(-4 * t) + (random.random() * 2 - 1) * math.exp(-50 * t))
save("trapdoor", lowpass(tc, 0.25), gain=0.8)

# --- sad trombone: wah wah wah waaah ---
st = []
for f, d, v in [(293.7, 0.45, 0), (277.2, 0.45, 0), (261.6, 0.45, 0), (246.9, 1.4, 0.03)]:
    seg, ph = [], 0.0
    N = n(d)
    for i in range(N):
        t = i / SR
        ff = f * (1 + v * math.sin(2 * math.pi * 5.5 * t) * min(1, t / 0.3))
        ph += 2 * math.pi * ff / SR
        wah = 0.35 + 0.65 * math.sin(math.pi * min(1, t / (d * 0.9)))
        seg.append(saw(ph) * env_adsr(i, N, 0.03, 0.12) * wah)
    st += lowpass(seg, 0.12)
save("sad-trombone", st, gain=0.8)

# --- party horn + confetti pop ---
ph_ = sweep(520, 560, 0.55, saw)
ph_ = lowpass(ph_, 0.2)
conf = [(random.random() * 2 - 1) * math.exp(-25 * i / SR) for i in range(n(0.3))]
party = mix(list(conf), ph_, 0.03, 0.8)
save("party-horn", party, gain=0.8)

# --- quick footsteps (scurry) ---
fs = []
for k in range(8):
    step = [(random.random() * 2 - 1) * math.exp(-70 * i / SR) for i in range(n(0.06))]
    mix(fs, lowpass(step, 0.3), k * 0.07, 1.0)
save("scurry", fs, gain=0.6)

# --- sneaky pizzicato music loop (4 bars, 132bpm swing) ---
bpm = 132
beat = 60 / bpm
bass = [110, 0, 164.8, 0, 130.8, 0, 164.8, 0, 98, 0, 146.8, 0, 123.5, 0, 146.8, 0]
lead = [440, 0, 0, 523.3, 0, 493.9, 0, 0, 392, 0, 0, 466.2, 0, 440, 0, 0,
        440, 0, 0, 523.3, 0, 587.3, 0, 523.3, 493.9, 0, 440, 0, 415.3, 0, 0, 0]


def pluck(f, d, bright=0.5):
    out, ph = [], 0.0
    for i in range(n(d)):
        t = i / SR
        ph += 2 * math.pi * f / SR
        out.append((tri(ph) + bright * math.sin(2 * ph)) * math.exp(-11 * t))
    return out


music = [0.0] * n(beat * 16)
for bar in range(2):
    for k, f in enumerate(bass):
        if f:
            mix(music, pluck(f, beat * 0.5, 0.3), bar * beat * 8 + k * beat * 0.5, 0.9)
for k, f in enumerate(lead):
    if f:
        mix(music, pluck(f, beat * 0.45, 0.6), k * beat * 0.5, 0.45)
# brushed hat on offbeats
for k in range(32):
    if k % 2 == 1:
        hat = [(random.random() * 2 - 1) * math.exp(-90 * i / SR) for i in range(n(0.04))]
        mix(music, hat, k * beat * 0.5, 0.12)
music = music[: n(beat * 16)]
save("sneaky-loop", music, gain=0.7)

# --- happy fanfare (cake) ---
fan = []
for k, (f, d) in enumerate([(523.3, 0.12), (659.3, 0.12), (784, 0.12), (1046.5, 0.5)]):
    seg = sweep(f, f, d, saw)
    fan += lowpass(seg, 0.25)
save("fanfare", fan, gain=0.6)

print("ok")
