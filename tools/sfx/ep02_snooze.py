"""SFX for ep02 "Five More Minutes" (pure stdlib).

Usage: python3 tools/sfx/ep02_snooze.py public/sfx
"""
import math, random, struct, sys, wave, os
SR = 44100
OUT = sys.argv[1]
random.seed(23)

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

# alarm: classic twin-bell clapper (~16 hits/s alternating bells), 1.0s loopable
al = []
for i in range(n(1.0)):
    t = i / SR
    hit = (t * 16) % 1.0
    bell = 2450 if int(t * 16) % 2 else 2900
    env = math.exp(-hit * 9)
    al.append((math.sin(2 * math.pi * bell * t) + 0.5 * math.sin(2 * math.pi * bell * 2.76 * t) + 0.3 * (random.random() * 2 - 1) * math.exp(-hit * 40)) * env)
save("alarm", al, 0.7)

# snore: inhale rumble + whistle exhale, 2.4s cycle
sn = []
for i in range(n(2.4)):
    t = i / SR
    if t < 1.3:
        u = t / 1.3
        env = math.sin(math.pi * u)
        rumble = math.sin(2 * math.pi * 55 * t) * (0.6 + 0.4 * math.sin(2 * math.pi * 28 * t))
        sn.append((rumble * 0.8 + (random.random() * 2 - 1) * 0.3) * env)
    else:
        u = (t - 1.3) / 1.1
        env = math.sin(math.pi * u) * 0.6
        f = 900 - 300 * u
        sn.append((math.sin(2 * math.pi * f * t) * 0.4 + (random.random() * 2 - 1) * 0.2) * env)
save("snore", lp(sn, 0.25), 0.8)

# stretch: rubbery rising boing-y creak, 0.45s
st, ph = [], 0.0
N = n(0.45)
for i in range(N):
    u = i / N
    f = 140 + 420 * u ** 1.4
    ph += 2 * math.pi * f / SR
    st.append((math.sin(ph) + 0.4 * math.sin(3 * ph)) * (1 - u) ** 0.3 * min(1, u * 20) * (0.7 + 0.3 * math.sin(2 * math.pi * 30 * i / SR)))
save("stretch", st, 0.6)

# warp: spinning-clock ticks accelerating + rising/falling sweep, 0.8s
wp, ph = [], 0.0
N = n(0.8)
for i in range(N):
    t = i / SR; u = i / N
    f = 200 + 1600 * math.sin(math.pi * u)
    ph += 2 * math.pi * f / SR
    tickrate = 6 + 60 * u
    tick = math.exp(-((t * tickrate) % 1.0) * 30) * (random.random() * 2 - 1)
    wp.append(math.sin(ph) * 0.4 * math.sin(math.pi * u) + tick * 0.5 + math.sin(2 * math.pi * 3 * ph / 50) * 0.0)
save("warp", wp, 0.75)

# pomf: soft flop onto the mattress
pm = []
for i in range(n(0.4)):
    t = i / SR
    pm.append((random.random() * 2 - 1) * math.exp(-12 * t) + math.sin(2 * math.pi * 70 * t) * math.exp(-10 * t))
save("pomf", lp(pm, 0.06), 0.8)

# slap: facepalm smack
sl = [(random.random() * 2 - 1) * math.exp(-60 * i / SR) + math.sin(2 * math.pi * 180 * i / SR) * math.exp(-30 * i / SR) * 0.5 for i in range(n(0.2))]
save("slap", lp(sl, 0.5), 0.8)

# tweet: two little bird chirps
tw = [0.0] * n(0.6)
for k, at in enumerate([0.0, 0.22]):
    s0 = n(at); ph = 0.0
    for i in range(n(0.14)):
        u = i / n(0.14)
        f = 3200 + 1400 * math.sin(math.pi * u)
        ph += 2 * math.pi * f / SR
        tw[s0 + i] += math.sin(ph) * math.sin(math.pi * u)
save("tweet", tw, 0.6)

# creak: slow door creak (stick-slip pulses)
cr, ph = [], 0.0
N = n(0.9)
for i in range(N):
    t = i / SR; u = i / N
    rate = 40 + 30 * math.sin(math.pi * u)
    pulse = math.exp(-((t * rate) % 1.0) * 12)
    ph += 2 * math.pi * (300 + 120 * u) / SR
    cr.append(pulse * (math.sin(ph) + 0.5 * math.sin(2.3 * ph)) * math.sin(math.pi * u))
save("creak", lp(cr, 0.3), 0.6)

# music box: gentle descending sad phrase, 2.2s
mb = [0.0] * n(2.4)
notes = [(1318.5, 0.0), (1174.7, 0.3), (987.8, 0.6), (880.0, 0.9), (987.8, 1.3), (783.99, 1.6)]
for f, at in notes:
    s0 = n(at)
    for i in range(n(0.8)):
        t = i / SR
        if s0 + i < len(mb):
            mb[s0 + i] += (math.sin(2 * math.pi * f * t) + 0.3 * math.sin(2 * math.pi * f * 2 * t) + 0.12 * math.sin(2 * math.pi * f * 3.01 * t)) * math.exp(-4.5 * t)
save("music-box", mb, 0.6)
print("ok")
