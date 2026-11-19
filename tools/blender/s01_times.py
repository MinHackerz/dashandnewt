"""s01 timeline: every cue is pinned to a spoken word (Liam's narration, word timings from ElevenLabs Scribe), and the
physical events in between come from real numbers. Writes tools/blender/s01_times.json for Blender, the sound
generator and the Remotion edit.

    python3 -I tools/blender/s01_times.py
"""
import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W = [w for w in json.load(open(os.path.join(ROOT, "public/voices/s01/words.json")))["words"] if not w["text"].startswith("[")]
VO = 0.4  # the voice starts 0.4 s into the video
FPS = 30


def at(word, n=1, end=False):
    """time in the video of the n-th occurrence of a spoken word (punctuation ignored)"""
    k = 0
    for w in W:
        if w["text"].strip(".,!?").lower() == word.lower():
            k += 1
            if k == n:
                return round(VO + (w["end"] if end else w["start"]), 3)
    raise KeyError(word)


# ─── physics (SI) ──────────────────────────────────────────────────────────
G = 9.81
RHO_OIL, RHO_WATER = 910.0, 1000.0  # peanut oil at ~175 °C ≈ 0.91 g/mL; water 1.00 g/mL
MU_OIL = 0.0025  # dynamic viscosity of frying oil at 175 °C ≈ 2–3 mPa·s
DROP_D = 0.004  # a melt-water drop ~4 mm across
OIL_DEPTH = 0.20
STEAM_RATIO = 1700  # volume of steam at 100 °C / volume of liquid water (≈1,600–1,700)


def terminal_velocity(d, drho, rho_f, mu):
    """sphere settling speed with the Schiller–Naumann drag (valid well past Stokes): iterate v = sqrt(4 g d Δρ / (3 ρ Cd))"""
    v = 0.05
    for _ in range(60):
        re = max(1e-6, rho_f * v * d / mu)
        cd = 24 / re * (1 + 0.15 * re ** 0.687)
        v = math.sqrt(4 * G * d * drho / (3 * rho_f * cd))
    return v, rho_f * v * d / mu


V_DROP, RE_DROP = terminal_velocity(DROP_D, RHO_WATER - RHO_OIL, RHO_OIL, MU_OIL)
SINK_TIME = OIL_DEPTH / V_DROP
BUBBLE_GROWTH = STEAM_RATIO ** (1 / 3)  # diameter grows ×12 when the volume grows ×1,700

CUE = {
    "fps": FPS,
    # 1 hook — the frozen bird is lowered on its hook toward the oil
    "hook": 0.0,
    "lower_end": at("oil", 1, end=True),
    # 2 the oil (350 °F) … then the ice
    "oil": at("oil", 2) - 0.15,
    "f350": at("350"),
    "ice": at("turkey", 2) - 0.1,
    # 3 cutaway: the turkey goes in, ice melts, the water sinks
    "cutaway": at("as") - 0.1,
    "touch": at("melts"),
    "sinks": at("sinks"),
    "heavier": at("heavier"),
    # 4 the bottom: water flashes to steam, ×1,700
    "bottom": at("bottom") - 0.2,
    "boils": at("boils"),
    "x1700": at("1,700"),
    # 5 the eruption: up and over the pot, onto the flame
    "shoves": at("shoves"),
    "over": at("over"),
    "flame": at("flame"),
    # 6 aftermath
    "thanksgiving": at("thanksgiving") - 0.1,
    "fires": at("fires"),
    # 7 the safe way
    "thaw": at("thaw"),
    "dry": at("pat"),
    "off": at("off"),
    "goes_in": at("goes"),
    "end": round(VO + W[-1]["end"] + 1.6, 3),
}
PHYS = {
    "rho_oil": RHO_OIL, "rho_water": RHO_WATER, "mu_oil": MU_OIL, "drop_d": DROP_D, "oil_depth": OIL_DEPTH,
    "v_drop": round(V_DROP, 4), "re_drop": round(RE_DROP, 1), "sink_time": round(SINK_TIME, 3),
    "steam_ratio": STEAM_RATIO, "bubble_growth": round(BUBBLE_GROWTH, 2), "oil_temp_c": 175, "oil_temp_f": 350,
}
json.dump({"CUE": CUE, "PHYS": PHYS, "VO_OFFSET": VO, "DUR": CUE["end"]}, open(os.path.join(ROOT, "tools/blender/s01_times.json"), "w"), indent=1)
print(json.dumps(CUE, indent=0))
print(PHYS)
