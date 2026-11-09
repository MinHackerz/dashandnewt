"""House sound kit: original, commercially safe replacements for every stock/meme
sound, plus the characters' non-verbal sound signatures (pure stdlib, seeded).

Usage: python3 tools/sfx/house.py public/sfx
"""
import math, random, struct, sys, wave, os

SR = 44100
OUT = sys.argv[1]
random.seed(1717)
TAU = 2 * math.pi


def save(name, x, gain=0.85):
    pk = max(1e-9, max(abs(v) for v in x))
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(v / pk * gain * 32767)) for v in x))


def n(s):
    return int(s * SR)


def noise():
    return random.random() * 2 - 1


def mix(dst, src, at, vol=1.0):
    s0 = n(at)
    if len(dst) < s0 + len(src):
        dst.extend([0.0] * (s0 + len(src) - len(dst)))
    for i, v in enumerate(src):
        dst[s0 + i] += v * vol
    return dst


def lp(x, a):
    y, p = [], 0.0
    for s in x:
        p += a * (s - p); y.append(p)
    return y


def hp(x, a):
    lo = lp(x, a)
    return [s - l for s, l in zip(x, lo)]


def bandpass(x, f0, q):
    w0 = TAU * f0 / SR
    alpha = math.sin(w0) / (2 * q)
    b0, b2 = alpha, -alpha
    a0, a1, a2 = 1 + alpha, -2 * math.cos(w0), 1 - alpha
    y, x1, x2, y1, y2 = [], 0.0, 0.0, 0.0, 0.0
    for s in x:
        v = (b0 * s + b2 * x2 - a1 * y1 - a2 * y2) / a0
        x2, x1, y2, y1 = x1, s, y1, v
        y.append(v)
    return y


def room(x, taps=((0.031, 0.35), (0.047, 0.28), (0.071, 0.2), (0.113, 0.14), (0.167, 0.09))):
    # cheap early-reflection "room" so hits don't sound dry
    out = list(x) + [0.0] * n(0.2)
    for d, g in taps:
        k = n(d)
        for i, v in enumerate(x):
            out[i + k] += v * g
    return out


def saw(ph):
    return 2 * ((ph / TAU) % 1.0) - 1


# ── click: a real button press (down + up) ─────────────────────────────────
def click():
    x = [0.0] * n(0.14)
    for at, g in ((0.0, 1.0), (0.05, 0.55)):
        burst = [(noise() * math.exp(-900 * i / SR) + math.sin(TAU * 3100 * i / SR) * math.exp(-260 * i / SR) * 0.6) for i in range(n(0.04))]
        mix(x, burst, at, g)
    return hp(x, 0.2)


# ── chime: bright bell "ding" (inharmonic partials) ───────────────────────
def chime():
    out = []
    for i in range(n(1.6)):
        t = i / SR
        out.append(sum(a * math.sin(TAU * 1568 * r * t) * math.exp(-d * t) for r, a, d in ((1, 1, 2.6), (2.76, 0.45, 4.5), (5.4, 0.25, 7), (8.93, 0.12, 11))) * min(1, t / 0.002))
    return out


# ── swish: air movement (filtered noise sweeping up then down) ────────────
def swish():
    N = n(0.36)
    src = [noise() for _ in range(N)]
    out, lo, lo2 = [], 0.0, 0.0
    for i, s in enumerate(src):
        u = i / N
        a = 0.03 + 0.35 * math.sin(math.pi * u)
        lo += a * (s - lo)
        lo2 += 0.02 * (lo - lo2)
        out.append((lo - lo2) * math.sin(math.pi * u) ** 1.5)
    return out


# ── snap: a whip-crack ─────────────────────────────────────────────────────
def snap():
    out = []
    ph = 0.0
    for i in range(n(0.2)):
        t = i / SR
        ph += TAU * (900 + 5000 * t / 0.2) / SR
        out.append(noise() * math.exp(-160 * t) + math.sin(ph) * math.exp(-40 * t) * 0.25)
    return hp(out, 0.15)


# ── flip: paper page flip (crinkly, fluttering) ───────────────────────────
def flip():
    out = []
    for i in range(n(0.45)):
        t = i / SR
        flutter = 0.45 + 0.55 * abs(math.sin(TAU * 38 * t + 3 * math.sin(TAU * 7 * t)))
        env = math.sin(math.pi * min(1, t / 0.45)) ** 0.7
        out.append(noise() * flutter * env)
    return hp(lp(out, 0.5), 0.08)


# ── boom: deep cinematic hit with a room tail ─────────────────────────────
def boom():
    out = []
    ph = 0.0
    for i in range(n(1.5)):
        t = i / SR
        ph += TAU * (38 + 90 * math.exp(-9 * t)) / SR
        out.append(math.sin(ph) * math.exp(-2.6 * t) * 1.2 + noise() * math.exp(-35 * t) * 0.5 + math.sin(ph * 2) * math.exp(-6 * t) * 0.3)
    return room(lp(out, 0.25))


# ── dun-dun: dramatic brass sting ending on a timpani roll ────────────────
def dun_dun():
    out = [0.0] * n(1.8)
    for f, at, d in ((146.8, 0.0, 0.2), (146.8, 0.24, 0.2), (155.6, 0.48, 1.1)):
        seg, ph = [], 0.0
        N = n(d)
        for i in range(N):
            t = i / SR
            vib = 1 + 0.006 * math.sin(TAU * 5.5 * t) * min(1, t / 0.3)
            ph += TAU * f * vib / SR
            env = min(1, t / 0.02) * (math.exp(-1.5 * t) if d > 0.5 else 1) * min(1, (d - t) / 0.04)
            seg.append((saw(ph) + 0.5 * saw(ph * 1.5) + 0.35 * saw(ph * 2)) * env)
        mix(out, lp(seg, 0.08), at, 1.0)
    timp = []
    for i in range(n(1.2)):
        t = i / SR
        roll = 0.6 + 0.4 * abs(math.sin(TAU * 11 * t))
        timp.append((math.sin(TAU * 98 * t) + noise() * 0.3) * roll * math.exp(-2.2 * t))
    mix(out, lp(timp, 0.2), 0.48, 0.8)
    return room(out)


# ── scratch: vinyl scratch (a tone/noise "record" dragged back and forth) ─
def scratch():
    rec = []
    for i in range(n(2.0)):
        t = i / SR
        rec.append(0.6 * saw(TAU * 220 * t) * (0.5 + 0.5 * math.sin(TAU * 3 * t)) + 0.4 * noise())
    out, pos = [], n(1.0)
    for i in range(n(0.75)):
        t = i / SR
        rate = 4.5 * math.sin(TAU * 2.6 * t) * math.exp(-1.5 * t)
        pos += rate
        k = int(pos) % len(rec)
        out.append(rec[k] * min(1, abs(rate)) * min(1, t / 0.01))
    return bandpass(out, 1400, 0.9)


# ── joint-crack: creaky old bones (sharp crackles + small knock) ──────────
def joint_crack():
    out = [0.0] * n(0.6)
    for at in (0.0, 0.07, 0.11, 0.2):
        pop = [noise() * math.exp(-1400 * i / SR) for i in range(n(0.02))]
        mix(out, pop, at, 1.0 - at * 2)
    knock = [math.sin(TAU * 180 * i / SR) * math.exp(-40 * i / SR) for i in range(n(0.2))]
    mix(out, knock, 0.0, 0.5)
    return hp(out, 0.12)


# ── womp: the Hero's deadpan defeat (low bassoon falling "waahh") ─────────
def womp():
    out, ph = [], 0.0
    N = n(0.9)
    for i in range(N):
        t = i / SR
        u = i / N
        f = 196 * (130.8 / 196) ** u
        ph += TAU * f * (1 + 0.01 * math.sin(TAU * 6 * t)) / SR
        out.append((saw(ph) * 0.7 + math.sin(ph) * 0.5) * min(1, t / 0.03) * (1 - u) ** 0.6)
    wah = []
    lo = 0.0
    for i, s in enumerate(out):
        u = i / len(out)
        a = 0.02 + 0.1 * math.sin(math.pi * min(1, u * 1.4))
        lo += a * (s - lo)
        wah.append(lo)
    return wah


# ── hero-scream: non-verbal cartoon yell ("aaaah", formant synthesis) ─────
def hero_scream():
    N = n(1.7)
    src, ph = [], 0.0
    for i in range(N):
        t = i / SR
        u = i / N
        f = 520 * (190 / 520) ** (u ** 0.8) * (1 + 0.035 * math.sin(TAU * 7 * t))
        ph += TAU * f / SR
        src.append(saw(ph) + 0.08 * noise())
    voice = [a + b * 0.7 + c * 0.35 for a, b, c in zip(bandpass(src, 800, 5), bandpass(src, 1180, 6), bandpass(src, 2900, 8))]
    return [v * min(1, (i / SR) / 0.05) * (1 - i / N) ** 0.9 for i, v in enumerate(voice)]


# ── kid-win: the Kid's happy chime (marimba arpeggio + sparkle) ───────────
def marimba(f, d=0.45):
    return [(math.sin(TAU * f * i / SR) + 0.25 * math.sin(TAU * f * 3.93 * i / SR) * math.exp(-30 * i / SR)) * math.exp(-7 * i / SR) for i in range(n(d))]


def kid_win():
    out = [0.0] * n(1.3)
    for k, f in enumerate((1046.5, 1318.5, 1568.0, 2093.0)):
        mix(out, marimba(f), k * 0.08, 0.9)
    for k in range(10):
        f = 3000 + random.random() * 2500
        mix(out, [math.sin(TAU * f * i / SR) * math.exp(-25 * i / SR) for i in range(n(0.15))], 0.3 + k * 0.06, 0.18)
    return out


# ── character blips (non-verbal "talk") and the Kid's chalk ───────────────
def hero_blip():
    out, ph = [], 0.0
    for i in range(n(0.22)):
        t = i / SR
        ph += TAU * (150 + 60 * math.sin(math.pi * t / 0.22)) / SR
        out.append((saw(ph) * 0.6 + math.sin(ph)) * math.sin(math.pi * t / 0.22))
    return lp(out, 0.15)


def kid_blip():
    return marimba(880 * 1.5, 0.25)


def chalk():
    out = []
    for i in range(n(0.7)):
        t = i / SR
        stroke = abs(math.sin(TAU * 4.3 * t)) ** 0.5
        out.append(noise() * stroke * (0.6 + 0.4 * math.sin(TAU * 1700 * t)))
    return bandpass(out, 3200, 1.2)


KIT = {
    "click": click, "chime": chime, "swish": swish, "snap": snap, "flip": flip,
    "boom": boom, "dun-dun": dun_dun, "scratch": scratch, "joint-crack": joint_crack,
    "womp": womp, "hero-scream": hero_scream, "kid-win": kid_win,
    "hero-blip": hero_blip, "kid-blip": kid_blip, "chalk": chalk,
}
for name, make in KIT.items():
    save(name, make())
print("ok")
