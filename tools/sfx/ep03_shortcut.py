"""SFX for ep03 "The Shortcut" (pure stdlib).

Usage: python3 tools/sfx/ep03_shortcut.py public/sfx
"""
import math, random, struct, sys, wave, os
SR = 44100
OUT = sys.argv[1]
random.seed(41)

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

# jingle: an original music-box/glockenspiel tune, 4 bars @ 150 bpm, loopable
beat = 60 / 150
mel = [(659.3,1),(784,1),(880,1),(784,1),(659.3,1),(587.3,1),(523.3,2),
       (587.3,1),(659.3,1),(784,1),(659.3,1),(587.3,2),(523.3,2)]
jg = [0.0] * n(beat * 16)
pos = 0.0
for f, d in mel:
    tone = [(math.sin(2*math.pi*f*i/SR) + 0.4*math.sin(2*math.pi*f*2.01*i/SR) + 0.15*math.sin(2*math.pi*f*3.98*i/SR)) * math.exp(-5*i/SR) for i in range(n(beat*d*0.95))]
    mix(jg, tone, pos * beat, 0.8)
    pos += d
for k, f in enumerate([130.8, 196, 174.6, 196, 130.8, 196, 146.8, 196]):
    tone = [math.sin(2*math.pi*f*i/SR) * math.exp(-6*i/SR) for i in range(n(beat*1.9))]
    mix(jg, tone, k * beat * 2, 0.5)
save("jingle", jg[: n(beat * 16)], 0.7)

# needle: tiny sharp prick + high "tink"
nd = [(noise() * math.exp(-300*i/SR) + math.sin(2*math.pi*3400*i/SR) * math.exp(-25*i/SR)) for i in range(n(0.25))]
save("needle", nd, 0.8)

# splash: big body entering water
sp = []
for i in range(n(1.1)):
    t = i / SR
    body = noise() * (math.exp(-6*t) + 0.3*math.exp(-1.5*t))
    plop = math.sin(2*math.pi*(140*math.exp(-6*t)+60)*t) * math.exp(-10*t)
    sp.append(body * 0.8 + plop)
sp = lp(sp, 0.35)
for k in range(10):
    at = 0.15 + random.random() * 0.8
    f = 600 + random.random() * 900
    bub = [math.sin(2*math.pi*(f + 1500*i/SR)*i/SR) * math.exp(-40*i/SR) for i in range(n(0.08))]
    mix(sp, bub, at, 0.25)
save("splash", sp, 0.85)

# swim: rhythmic splishes, 0.6s loop
sw = [0.0] * n(0.6)
for at in (0.0, 0.3):
    b = lp([noise() * math.exp(-18*i/SR) for i in range(n(0.2))], 0.4)
    mix(sw, b, at, 1.0)
save("swim", sw, 0.6)

# squelch: wet step
sq = []
for i in range(n(0.3)):
    t = i / SR
    sq.append(noise() * math.exp(-14*t) * (0.6 + 0.4*math.sin(2*math.pi*35*t)) + math.sin(2*math.pi*(220 - 300*t)*t) * math.exp(-12*t) * 0.6)
save("squelch", lp(sq, 0.2), 0.7)

# spray: shaking water off
spr = []
for i in range(n(0.7)):
    t = i / SR
    spr.append(noise() * math.sin(math.pi * t / 0.7) * (0.6 + 0.4 * math.sin(2*math.pi*22*t)))
save("spray", lp(spr, 0.5), 0.6)

# plink: a single drop
pl = []
for i in range(n(0.35)):
    t = i / SR
    f = 1200 + 900 * math.exp(-30*t)
    pl.append(math.sin(2*math.pi*f*t) * math.exp(-14*t))
save("plink", pl, 0.7)

# snort: bull blowing air out of its nose
sn = []
for i in range(n(0.55)):
    t = i / SR
    env = min(1, t/0.03) * math.exp(-5*t)
    sn.append((noise() * 0.8 + math.sin(2*math.pi*90*t) * 0.6) * env * (0.7 + 0.3*math.sin(2*math.pi*30*t)))
save("snort", lp(sn, 0.15), 0.85)

# gallop: accelerating hoof beats with rumble, 0.8s
ga = [0.0] * n(0.85)
tt, gap = 0.0, 0.16
while tt < 0.8:
    for j, off in enumerate((0, 0.035)):
        hit = [(math.sin(2*math.pi*(110 - 40*i/SR)*i/SR) + noise()*0.4) * math.exp(-35*i/SR) for i in range(n(0.08))]
        mix(ga, hit, tt + off, 0.9 - j*0.3)
    tt += gap; gap = max(0.07, gap * 0.85)
save("gallop", lp(ga, 0.3), 0.9)

# crack: wooden fence planks splintering
cr = []
for i in range(n(0.7)):
    t = i / SR
    crack = noise() * (math.exp(-25*t) + (0.5*math.exp(-60*(t-0.08)) if t > 0.08 else 0) + (0.4*math.exp(-60*(t-0.17)) if t > 0.17 else 0))
    thunk = math.sin(2*math.pi*180*t) * math.exp(-15*t) * 0.7
    cr.append(crack + thunk)
save("crack", lp(cr, 0.55), 0.9)

# splat: soft wet blob hitting the ground
sl = []
for i in range(n(0.4)):
    t = i / SR
    sl.append(noise() * math.exp(-20*t) * 0.6 + math.sin(2*math.pi*(160 - 200*t)*t) * math.exp(-14*t))
save("splat", lp(sl, 0.25), 0.85)

# engine: truck starts and pulls away (rising rumble that fades)
en, ph = [], 0.0
N = n(3.2)
for i in range(N):
    t = i / SR; u = i / N
    f = 38 + 50 * min(1, t / 1.5)
    ph += 2*math.pi*f/SR
    saw = 2*((ph/(2*math.pi)) % 1) - 1
    en.append((saw * 0.7 + noise()*0.2) * min(1, t/0.2) * (1 - u) ** 1.2)
save("engine", lp(en, 0.12), 0.8)

# clop: a walking hoof rhythm, 1.1s loop
cl = [0.0] * n(1.1)
for k, at in enumerate([0.0, 0.27, 0.55, 0.82]):
    hit = [(math.sin(2*math.pi*(700 - 400*i/SR)*i/SR) + noise()*0.3) * math.exp(-45*i/SR) for i in range(n(0.07))]
    mix(cl, hit, at, 1.0 if k % 2 == 0 else 0.7)
save("clop", cl, 0.6)

# slurp: three wet licks
su = [0.0] * n(0.85)
for at in (0.0, 0.28, 0.56):
    lick = []
    for i in range(n(0.22)):
        t = i / SR
        f = 300 + 700 * (t / 0.22)
        lick.append((math.sin(2*math.pi*f*t) * 0.5 + noise()*0.5) * math.sin(math.pi * t / 0.22))
    mix(su, lp(lick, 0.3), at, 1.0)
save("slurp", su, 0.7)
print("ok")
