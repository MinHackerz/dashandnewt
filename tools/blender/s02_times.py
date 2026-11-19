"""s02 timeline: every cue is pinned to a spoken word (Liam's narration, word timings from ElevenLabs Scribe), and the
body's motion in between comes from real numbers. Writes tools/blender/s02_times.json for Blender, the sound generator
and the Remotion edit.

    python3 -I tools/blender/s02_times.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W = [w for w in json.load(open(os.path.join(ROOT, "public/voices/s02/words.json")))["words"] if not w["text"].startswith("[")]
VO = 0.4  # the voice starts 0.4 s into the video
FPS = 30


def at(word, n=1, end=False):
    """time in the video of the n-th occurrence of a spoken word (punctuation ignored)"""
    k = 0
    for w in W:
        if w["text"].strip(".,!?:").lower() == word.lower():
            k += 1
            if k == n:
                return round(VO + (w["end"] if end else w["start"]), 3)
    raise KeyError(word)


# ─── physiology (checked: content/episodes/s02-shiver.md) ───────────────────
SHIVER_HZ = 9.0  # visible shivering tremor ≈ 8–12 Hz; small amplitude
CHATTER_HZ = 7.0  # teeth chattering: a few clacks a second, slower than the limb tremor
HEAT_X = 5  # shivering can raise heat output to about 4–5× resting (National Academies, cold-stress chapter)
CORE_F, HAND_F = 98.6, 77  # thermal look: core ≈ 37 °C, cold fingers/nose ≈ 25 °C in the wind

CUE = {
    "fps": FPS,
    # 1 hook: wide, Dash at the bus stop in a tee and shorts, shivering
    "hook": 0.0,
    # 2 thermal: one job, keep your insides warm; hands and nose go cold first
    "body": at("body") - 0.25,
    "insides": at("insides"),
    "hands": at("hands") - 0.2,
    "cold1": at("cold", 2),
    # 3 into the arm: the core loses heat → the muscles start a tug-of-war
    "core": at("core") - 0.45,
    "muscles": at("muscles"),
    "tug": at("tug-of-war"),
    "front": at("muscle") - 0.2,
    "pulls1": at("pulls", 1),
    "back": at("back", 1) - 0.25,
    "pulls2": at("pulls", 2),
    "nobody": at("nobody") - 0.2,
    "barely": at("barely"),
    "effort": at("and", 3) - 0.1,
    "heat": at("heat", 2),
    # 4 the jaw
    "teeth": at("that's") - 0.15,
    "chatter": at("chatter"),
    "jaw": at("jaw"),
    # 5 goosebumps
    "goose": at("goosebumps") - 0.25,
    "tiny": at("tiny"),
    "stand": at("stand"),
    "fur": at("fur"),
    # 6 the button: a coat flies in from off-screen (Newt) and lands on Dash
    "so": at("so", 2) - 0.3,
    "honestly": at("honestly"),
    "coat_land": at("coat", 2),
    "end": round(VO + W[-1]["end"] + 3.4, 3),  # hold the coat gag, then the moral card
}
CUE = {k: (round(v, 3) if isinstance(v, float) else v) for k, v in CUE.items()}
PHYS = {"shiver_hz": SHIVER_HZ, "chatter_hz": CHATTER_HZ, "heat_x": HEAT_X, "core_f": CORE_F, "hand_f": HAND_F, "g": 9.81}
json.dump({"CUE": CUE, "PHYS": PHYS, "VO_OFFSET": VO, "DUR": CUE["end"]}, open(os.path.join(ROOT, "tools/blender/s02_times.json"), "w"), indent=1)
print(json.dumps(CUE, indent=0))
