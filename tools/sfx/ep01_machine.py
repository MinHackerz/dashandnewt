"""Machine SFX for ep01: electric zap along the cable, hook release clank, anvil clink.

Usage: python3 tools/sfx/ep01_machine.py public/sfx
"""
import math, random, struct, sys, wave, os
SR = 44100
OUT = sys.argv[1]
random.seed(11)

def save(name, x, gain=0.85):
    pk = max(1e-9, max(abs(v) for v in x))
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(v / pk * gain * 32767)) for v in x))

# zap: buzzy rising saw with crackle, 0.6s
z, ph = [], 0.0
N = int(0.6 * SR)
for i in range(N):
    t = i / SR; u = i / N
    f = 180 + 900 * u ** 1.5
    ph += 2 * math.pi * f / SR
    saw = 2 * ((ph / (2 * math.pi)) % 1) - 1
    crackle = (random.random() * 2 - 1) * (0.6 if random.random() < 0.08 else 0.1)
    env = min(1, t / 0.02) * (1 - u) ** 0.4
    z.append((saw * 0.6 * (0.6 + 0.4 * math.sin(2 * math.pi * 60 * t)) + crackle) * env)
save("zap", z, 0.6)

# clank: hook release, bright metal hit
c = []
N = int(0.7 * SR)
for i in range(N):
    t = i / SR
    m = sum(math.sin(2 * math.pi * f * t) * math.exp(-d * t) for f, d in [(880, 9), (1567, 12), (2350, 16), (3320, 22)])
    n = (random.random() * 2 - 1) * math.exp(-80 * t)
    c.append(m * 0.5 + n)
save("clank", c, 0.8)

# clink: tiny chain rattle (three light taps)
k = [0.0] * int(0.6 * SR)
for j, at in enumerate([0.0, 0.12, 0.22]):
    s0 = int(at * SR)
    for i in range(int(0.25 * SR)):
        t = i / SR
        k[s0 + i] += (math.sin(2 * math.pi * 2600 * t) + 0.6 * math.sin(2 * math.pi * 3900 * t)) * math.exp(-30 * t) * (1 - j * 0.25)
save("clink", k, 0.6)
print("ok")
