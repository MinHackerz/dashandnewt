"""SFX for ep04 "The Boulder" (pure stdlib, seeded) — all original.

Usage: python3 tools/sfx/ep04_boulder.py public/sfx
"""
import math, random, struct, sys, wave, os
SR = 44100
OUT = sys.argv[1]
random.seed(404)
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

# rumble: heavy stone rolling on grass — low filtered noise with lumpy knocks, 2 s loopable
ru = []
for i in range(n(2.0)):
    t = i / SR
    wob = 0.6 + 0.4 * math.sin(TAU * 3.1 * t) * math.sin(TAU * 0.5 * t)
    ru.append(noise() * wob)
ru = lp(lp(ru, 0.02), 0.05)
for k in range(9):
    at = k * 0.22 + random.random() * 0.05
    knock = [math.sin(TAU * (70 + 20 * random.random()) * j / SR) * math.exp(-28 * j / SR) for j in range(n(0.15))]
    mix(ru, knock, at, 0.6)
ru = ru[: n(2.0)]
fade = n(0.03)
for j in range(fade):
    ru[j] *= j / fade; ru[-1 - j] *= j / fade
save("rumble", ru, 0.8)

# squeak: rubber ball squashed flat — a pitched "eeek" that bends down
sq = []
for i in range(n(0.38)):
    t = i / SR
    f = 1500 - 900 * t / 0.38 + 60 * math.sin(TAU * 30 * t)
    env = min(1, t / 0.02) * math.exp(-4 * t)
    sq.append((math.sin(TAU * f * t) + 0.35 * math.sin(TAU * 2 * f * t)) * env)
save("squeak", sq, 0.7)

# reinflate: rubbery rising "fwoomp" + a soft pop as the ball springs back to round
ri = []
ph = 0.0
for i in range(n(0.32)):
    t = i / SR
    f = 180 + 900 * (t / 0.32) ** 2
    ph += TAU * f / SR
    ri.append(math.sin(ph) * min(1, t / 0.03) * (0.6 + 0.4 * t / 0.32))
pop = [math.sin(TAU * (900 - 2600 * j / SR) * j / SR) * math.exp(-40 * j / SR) for j in range(n(0.1))]
mix(ri, pop, 0.3, 0.9)
save("reinflate", ri, 0.7)

# rock-thunk: shoulder into granite — dull, woody low knock with a short body
th = []
for i in range(n(0.6)):
    t = i / SR
    body = math.sin(TAU * (95 * math.exp(-3 * t) + 45) * t) * math.exp(-9 * t)
    click = noise() * math.exp(-160 * t)
    th.append(body + 0.5 * click)
th = lp(th, 0.3)
save("rock-thunk", th, 0.95)

# twang: rope snapping taut — plucked low string with a creaky fibre buzz
tw = []
for i in range(n(0.7)):
    t = i / SR
    f = 110 + 25 * math.exp(-12 * t)
    s = math.sin(TAU * f * t) + 0.5 * math.sin(TAU * 2.01 * f * t) + 0.25 * math.sin(TAU * 3.02 * f * t)
    tw.append(s * math.exp(-5 * t) + noise() * 0.15 * math.exp(-30 * t))
save("twang", tw, 0.8)

# whirl: tetherball whoosh — air pulses that speed up and rise in pitch (1.7 s)
wh = []
ph = 0.0
for i in range(n(1.7)):
    t = i / SR
    rate = 1.5 + 9 * (t / 1.7) ** 2  # laps per second climbing as the rope shortens
    ph += TAU * rate / SR
    puff = 0.5 + 0.5 * math.cos(ph)
    wh.append(noise() * puff ** 3)
wh = lp(wh, 0.18)
wh = [v * min(1, i / n(0.1)) for i, v in enumerate(wh)]
save("whirl", wh, 0.7)

# chirp3: the Bird's signature — three tiny rising chirps
ch = [0.0] * n(0.5)
for k, base in enumerate((3200, 3600, 4200)):
    c = []
    for j in range(n(0.09)):
        t = j / SR
        f = base + 2200 * t / 0.09
        c.append(math.sin(TAU * f * t) * math.sin(math.pi * t / 0.09))
    mix(ch, c, k * 0.13, 0.8)
save("chirp3", ch, 0.6)

# call-whistle: Newt's two-note "come here" whistle (rise, then fall)
cw = [0.0] * n(0.8)
for at, f0, f1, d in ((0.0, 1500, 2300, 0.22), (0.3, 2300, 1700, 0.35)):
    ph = 0.0
    w = []
    for j in range(n(d)):
        t = j / SR
        f = f0 + (f1 - f0) * t / d + 25 * math.sin(TAU * 6 * t)
        ph += TAU * f / SR
        w.append((math.sin(ph) + 0.08 * noise()) * math.sin(math.pi * t / d))
    mix(cw, w, at, 0.8)
save("call-whistle", cw, 0.55)

# kick: boot on a football — rubbery thump + leather slap
kk = []
for i in range(n(0.3)):
    t = i / SR
    kk.append(math.sin(TAU * (160 * math.exp(-18 * t) + 70) * t) * math.exp(-14 * t) + noise() * 0.6 * math.exp(-90 * t))
save("kick", lp(kk, 0.4), 0.9)

# clack: stone/wood knock (prop rock knocked out, plank on the pebble)
cl = []
for i in range(n(0.25)):
    t = i / SR
    cl.append((math.sin(TAU * 820 * t) + 0.6 * math.sin(TAU * 1370 * t)) * math.exp(-38 * t) + noise() * 0.5 * math.exp(-200 * t))
save("clack", cl, 0.75)

# bed-lever: soft, original music bed — 4 bars at 96 bpm (10 s, loops seamlessly).
# Marimba-like arpeggios over C – Am – F – G with a round plucked bass; gentle, unhurried.
BPM = 96
beat = 60 / BPM
bar = 4 * beat
bed = [0.0] * n(4 * bar)

def mallet(f, d, vol):
    out = []
    for j in range(n(d)):
        t = j / SR
        env = math.exp(-5.5 * t) * min(1, t / 0.004)
        out.append(vol * env * (math.sin(TAU * f * t) + 0.22 * math.sin(TAU * 3.93 * f * t) * math.exp(-14 * t)))
    return out

def pluck_bass(f, d, vol):
    out = []
    for j in range(n(d)):
        t = j / SR
        env = math.exp(-3.2 * t) * min(1, t / 0.01)
        out.append(vol * env * (math.sin(TAU * f * t) + 0.3 * math.sin(TAU * 2 * f * t)))
    return out

chords = [  # (bass, arpeggio notes)
    (65.41, (261.63, 329.63, 392.00, 523.25)),   # C
    (55.00, (220.00, 261.63, 329.63, 440.00)),   # Am
    (43.65, (174.61, 220.00, 261.63, 349.23)),   # F
    (49.00, (196.00, 246.94, 293.66, 392.00)),   # G
]
pattern = (0, 1, 2, 3, 2, 1, 2, 3)  # eighth notes
for b, (bass, notes) in enumerate(chords):
    t0 = b * bar
    mix(bed, pluck_bass(bass, beat * 1.9, 0.55), t0)
    mix(bed, pluck_bass(bass * 1.5, beat * 1.9, 0.3), t0 + 2 * beat)
    for k, idx in enumerate(pattern):
        mix(bed, mallet(notes[idx], beat * 1.2, 0.32 if k % 2 == 0 else 0.22), t0 + k * beat / 2)
L = n(4 * bar)
tail = bed[L:]
bed = bed[:L]
for j, v in enumerate(tail[:L]):  # wrap the ringing tail to the start so the loop is seamless
    bed[j] += v
bed = lp(bed, 0.35)
save("bed-lever", bed, 0.6)
