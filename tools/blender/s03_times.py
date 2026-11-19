"""s03 timing: every shot boundary is pinned to a word of the narration (Liam take 2, ElevenLabs; word timings from
ElevenLabs Scribe in public/voices/s03/words.json). Writes tools/blender/s03_times.json, read by s03_person.py
(the touch), s03_shots.py (cameras, frame ranges) and the edit.

    python3 -I tools/blender/s03_times.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FPS = 30
VO = 0.25  # the voice starts a quarter second in
TAIL = 1.0  # hold after the last word
WORDS = json.loads((ROOT / "public/voices/s03/words.json").read_text())["words"]
W = [w for w in WORDS if w.get("type", "word") == "word"]


def at(word, n=1):
    """start time (s, video clock) of the n-th occurrence of `word` (case and punctuation ignored)"""
    k = 0
    for w in W:
        if w["text"].lower().strip(".,?!…") == word.lower():
            k += 1
            if k == n:
                return round(VO + w["start"], 3)
    raise KeyError(word)


END = round(VO + W[-1]["end"] + TAIL, 3)
# (shot, starts at, what the narration says over it)
CUTS = [
    ("s01_typing", 0.0, "Your laptop is rendering a video… and it's getting hot."),
    ("s02_thermal", at("through"), "Through a thermal camera, the heat comes from one spot. Right above the chip."),
    ("s03_diveA", at("so"), "So let's go inside."),
    ("s04_diveB", at("under"), "Under this copper plate is the chip."),
    ("s05_diveC", at("and", 2), "And on it, billions of"),
    ("s06_diveD", at("tiny"), "tiny switches called transistors."),
    ("s07_electrons", at("every"), "Every time one switches, electrons are pushed through the silicon."),
    ("s08_bump", at("they"), "They bump into its atoms, and every bump turns a little electricity into heat."),
    ("s09_array", at("a", 4), "A render flips these switches billions of times a second."),
    ("s10_die", at("so", 2), "So almost all the power the chip uses… becomes heat."),
    ("s11_pipes", at("to", 1), "To carry it away,"),
    ("s12_hotend", at("this", 2), "this copper pipe holds a little water. The chip turns it into vapour,"),
    ("s13_vapour", at("the", 8), "the vapour rushes to the cold end,"),
    ("s14_coldend", at("turns", 3), "turns back into water, and soaks back through."),
    ("s15_fan", at("then"), "Then a fan blows air through thin metal fins,"),
    ("s16_vents", at("and", 5), "and out the side vents."),
    ("s17_touch", at("that's"), "That's why this side gets so hot."),
    ("s18_end", at("so", 4), "So never block the vents."),
]
for (a, ta, _), (b, tb, _) in zip(CUTS, CUTS[1:]):
    assert tb > ta + 0.9, f"{b} starts {tb - ta:.2f} s after {a}: too short"
SHOTS = {}
for k, (name, t0, text) in enumerate(CUTS):
    t1 = CUTS[k + 1][1] if k + 1 < len(CUTS) else END
    SHOTS[name] = {"t0": t0, "t1": t1, "f0": round(t0 * FPS) + 1, "f1": round(t1 * FPS), "text": text}
# Eric's touch, in video frames: reach on "That's", fingers land on "this side", lift after "so hot"
TOUCH = {"reach": round(at("that's") * FPS), "contact": round(at("side", 2) * FPS) - 4, "lift": round(at("hot", 2) * FPS) + 8}
out = {"FPS": FPS, "VO_OFFSET": VO, "DUR": END, "FRAMES": round(END * FPS), "SHOTS": SHOTS, "TOUCH": TOUCH}
(ROOT / "tools/blender/s03_times.json").write_text(json.dumps(out, indent=1))
for n, s in SHOTS.items():
    print(f"{n:15s} {s['t0']:6.2f}–{s['t1']:6.2f} s  ({s['t1'] - s['t0']:.2f} s)  frames {s['f0']}–{s['f1']}")
print("TOUCH", TOUCH, "TOTAL", END, "s", out["FRAMES"], "frames")
