"""Short s03: the 18 shots, each a camera move inside its narration window (tools/blender/s03_times.json), with its
own fixed lights and its per-frame settings (thermal camera on/off or ramping, the editor's render progress, the fan,
the airflow). Builds the cameras into blender/s03_set.blend (run after the other s03 scripts):

    blender -b blender/s03_set.blend --python tools/blender/s03_shots.py

Rendering is tools/blender/s03_render.py (thermal-guarded, resumable). Every shot is rendered DISSOLVE frames past
its cut when the edit dissolves into the next shot (the three dive joins), so the dissolve has picture on both sides.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector as V

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s03_rig as rig  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
T = json.loads(open(os.path.join(ROOT, "tools/blender/s03_times.json")).read())
SH = T["SHOTS"]
FPS = T["FPS"]
DISSOLVE = 8  # frames, the dive joins
sc = bpy.context.scene
sc.render.fps = FPS
sc.frame_start, sc.frame_end = 1, T["FRAMES"]

# subjects (world), from the built sets
CHIP_B = V((9.965, 0.055, 0.005))
COLD_B = CHIP_B + V((0, 0, 0.0058))
DECK_A = V((CHIP_B.x - 10.0, CHIP_B.y, 0.0137))
C0, D0, F0 = V((20.0, 0, 0)), V((30.0, 0, 0)), V((50.0, 0, 0.0065))
DIE_C = C0 + V((0.002, 0.001, 0.0021))
FIN0 = bpy.data.objects["D.fin0"].matrix_world.translation.copy()  # the see-through fin (electrons)
LAPE = next(o for o in bpy.data.objects if o.name.startswith("E.lap.") and o.parent is None).matrix_world.translation.copy()
HOT_E = LAPE + V((-0.168, 0.055, 0.0132))  # where he touches: the deck by the exhaust slots
FAN = bpy.data.objects["B.fan.impeller"].matrix_world.translation.copy()
DIR = V((0.28, -0.55, 0.79)).normalized()  # the dive's one viewing direction


def fr(name):
    return SH[name]["f0"], SH[name]["f1"]


# ── shot list: camera (from → to), lens, f-stop, station, extras ─────────────────────────────────────────────
# "orbit" moves give the slow parallax push-ins; "dive" moves are log-distance pushes along DIR.
SHOTS = [
    # name, station, kind, args
    ("s01_typing", "E", "line", dict(c0=(40.9, -1.3, 1.25), l0=(39.95, -0.15, 0.85), c1=(40.8, -1.12, 1.24), l1=(39.97, -0.12, 0.9), lens=40, f=5.6)),
    ("s02_thermal", "E", "line", dict(c0=(39.6, -0.66, 1.24), l0=(39.97, -0.02, 0.81), c1=(39.76, -0.42, 1.06), l1=(39.97, 0.0, 0.81), lens=35, f=8), {"thermal": 1.0}),
    ("s03_diveA", "A", "dive", dict(l0=V((0, 0, 0.1)), l1=DECK_A, d0=0.8, d1=0.14, lens=(50, 50), f=(8, 11), ease_in=True), {"dissolve": True}),
    ("s04_diveB", "B", "dive", dict(l0=DECK_A + V((10, 0, 0)), l1=COLD_B, d0=0.14, d1=0.07, lens=(50, 50), f=(11, 16)), {"dissolve": True}),
    ("s05_diveC", "C", "dive", dict(l0=C0 + V((0, 0, 0.0018)), l1=DIE_C, d0=0.045, d1=0.012, lens=(50, 60), f=(22, 56)), {"dissolve": True}),
    ("s06_diveD", "D", "dive", dict(l0=D0 + V((0, -0.2, 0.35)), l1=V((D0.x + 0.1, FIN0.y + 0.4, 0.3)), d0=4.5, d1=1.6, lens=(35, 40), f=(8, 8), ease_out=True)),
    ("s07_electrons", "D", "line", dict(c0=(D0.x - 0.85, FIN0.y - 0.8, 0.28), l0=(D0.x - 0.2, FIN0.y, 0.5), c1=(D0.x - 0.5, FIN0.y - 0.77, 0.28), l1=(D0.x + 0.15, FIN0.y, 0.5), lens=40, f=8), {"fill_up": 0.9}),  # low: the floor stays a thin band
    ("s08_bump", "D", "line", dict(c0=(D0.x + 0.4, FIN0.y - 0.8, 0.3), l0=(D0.x + 1.0, FIN0.y, 0.5), c1=(D0.x + 0.48, FIN0.y - 0.77, 0.3), l1=(D0.x + 1.03, FIN0.y, 0.5), lens=40, f=8),
     {"thermal_ramp": ("s08_bump", "heat", 1.0), "fill_up": 0.9}),
    ("s09_array", "D", "dive", dict(l0=V((D0.x + 0.6, FIN0.y + 0.4, 0.3)), l1=D0 + V((0, -0.2, 0.35)), d0=1.8, d1=6.0, lens=(40, 35), f=(8, 8)), {"thermal": 1.0}),
    ("s10_die", "C", "line", dict(c0=tuple(DIE_C + DIR * 0.03 + V((0.004, 0, 0))), l0=tuple(DIE_C), c1=tuple(DIE_C + DIR * 0.024 + V((-0.002, 0, 0))), l1=tuple(DIE_C + V((-0.001, 0.0, 0))), lens=50, f=32),
     {"thermal_ramp": ("s10_die", "becomes", 1.0)}),
    ("s11_pipes", "B", "line", dict(c0=(9.975, -0.012, 0.05), l0=(9.95, 0.055, 0.011), c1=(9.92, 0.0, 0.05), l1=(9.89, 0.085, 0.011), lens=40, f=11)),
    ("s12_hotend", "F", "line", dict(c0=(49.95, -0.042, 0.036), l0=(49.975, 0.0, F0.z), c1=(49.958, -0.034, 0.03), l1=(49.977, 0.0, F0.z), lens=85, f=22)),
    ("s13_vapour", "F", "line", dict(c0=(49.99, -0.05, 0.042), l0=(49.995, 0.0, F0.z), c1=(50.02, -0.05, 0.042), l1=(50.02, 0.0, F0.z), lens=70, f=22)),
    ("s14_coldend", "F", "line", dict(c0=(50.065, -0.042, 0.032), l0=(50.025, 0.0, F0.z), c1=(50.058, -0.036, 0.028), l1=(50.026, 0.0, F0.z), lens=85, f=22)),
    ("s15_fan", "B", "line", dict(c0=tuple(FAN + V((0.07, -0.08, 0.085))), l0=tuple(FAN + V((0, 0, 0.004))), c1=tuple(FAN + V((0.055, -0.065, 0.07))), l1=tuple(FAN + V((-0.004, 0, 0.004))), lens=50, f=11),
     {"fx": ("air",), "fan": True}),
    ("s16_vents", "B", "line", dict(c0=(9.775, -0.035, 0.03), l0=(9.84, 0.05, 0.007), c1=(9.785, -0.02, 0.026), l1=(9.84, 0.05, 0.007), lens=35, f=11), {"fx": ("haze",), "fan": True}),
    ("s17_touch", "E", "line", dict(c0=(39.25, 0.25, 1.15), l0=(39.9, -0.17, 0.98), c1=(39.29, 0.22, 1.13), l1=(39.9, -0.165, 0.98), lens=32, f=8)),
    ("s18_end", "E", "line", dict(c0=(39.28, 0.42, 0.93), l0=(39.76, 0.02, 0.85), c1=(39.31, 0.39, 0.925), l1=(39.76, 0.02, 0.85), lens=45, f=8),
     {"thermal": 1.0}),
]


def ease(u):
    return u * u * (3 - 2 * u)


def build_camera(name, station, kind, a, f0, f1, fill_up=0.0):
    cd = bpy.data.cameras.new("SHOT." + name)
    cam = bpy.data.objects.new("SHOT." + name, cd)
    sc.collection.objects.link(cam)
    cd.dof.use_dof = True
    cd.clip_end = 200.0
    span = max(1, f1 - f0)
    for f in range(f0 - 2, f1 + DISSOLVE + 3):  # a few frames either side: motion blur needs them
        u = (f - f0) / span
        if kind == "line":  # a slow, eased glide (no stop at the cut: the move keeps its speed through it)
            w = ease(min(max(u, 0.0), 1.0)) * 0.6 + u * 0.4
            loc = V(a["c0"]).lerp(V(a["c1"]), w)
            look = V(a["l0"]).lerp(V(a["l1"]), w)
            lens, fs = a["lens"], a["f"]
        else:  # dive: log-distance push along DIR
            w = u
            if a.get("ease_in"):
                w = ease(u) if 0 <= u < 1 else u
            if a.get("ease_out"):
                w = 1 - (1 - min(max(u, 0), 1)) ** 2
            wc = min(max(w, 0.0), 1.0)
            look = a["l0"].lerp(a["l1"], wc)
            d = a["d0"] * (a["d1"] / a["d0"]) ** w
            loc = look + DIR * d
            lens = a["lens"][0] + (a["lens"][1] - a["lens"][0]) * wc
            fs = a["f"][0] + (a["f"][1] - a["f"][0]) * wc
        cam.location = loc
        cam.rotation_euler = (look - loc).to_track_quat("-Z", "Y").to_euler()
        cd.lens = lens
        cd.dof.focus_distance = (look - loc).length
        cd.dof.aperture_fstop = fs
        cd.clip_start = max(min((look - loc).length * 0.02, 0.01), 0.0002)
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_euler", frame=f)
        cd.keyframe_insert("lens", frame=f)
        cd.keyframe_insert("clip_start", frame=f)
        cd.dof.keyframe_insert("focus_distance", frame=f)
        cd.dof.keyframe_insert("aperture_fstop", frame=f)
    # the shot's own lights, fixed in the world, aimed from the middle of the move
    sc.frame_set((f0 + f1) // 2)
    look_mid = cam.matrix_world.translation + cam.matrix_world.to_3x3() @ V((0, 0, -cd.dof.focus_distance))
    for o in rig.shot_lights(f"SL.{name}", look_mid, cam.matrix_world.translation.copy(), energy_k=0.6, fill_up=fill_up):
        o["shot"] = name
    cam["shot"], cam["station"] = name, station
    return cam


for o in [o for o in bpy.data.objects if o.name.startswith(("SHOT.", "SL.", "DIVE.", "DL."))]:
    bpy.data.objects.remove(o, do_unlink=True)
plan = {}
for row in SHOTS:
    name, station, kind, a = row[:4]
    extra = row[4] if len(row) > 4 else {}
    f0, f1 = fr(name)
    build_camera(name, station, kind, a, f0, f1, fill_up=extra.get("fill_up", 0.0))
    plan[name] = {"station": station, "f0": f0, "f1": f1 + (DISSOLVE if extra.get("dissolve") else 0),
                  "cut": f1, "dissolve": DISSOLVE if extra.get("dissolve") else 0, "fx": list(extra.get("fx", ())),
                  "thermal": extra.get("thermal", 0.0), "fan": bool(extra.get("fan"))}
    if "thermal_ramp" in extra:  # ramps from 0 to 1 over 0.6 s starting on the word
        _, word, _v = extra["thermal_ramp"]
        words = json.loads(open(os.path.join(ROOT, "public/voices/s03/words.json")).read())["words"]
        t_w = next(w["start"] for w in words if w["text"].lower().strip(".,…") == word and T["VO_OFFSET"] + w["start"] >= SH[name]["t0"])
        fw = round((T["VO_OFFSET"] + t_w) * FPS)
        plan[name]["thermal_ramp"] = [fw - 6, fw + 12]
# the editor's render bar creeps forward through the whole video (it is a long render)
plan["_progress"] = {"from": 0.18, "to": 0.62}
# the fan: real-speed blur (≥ 17°/frame strobes not; 0.3 turn/frame = 108°: a fast blur with blades still
# hinted, as through a real camera at 1/60 s); motion steps so the shutter samples the rotation properly
rig.spin_fan(sc, start=1, spinup=1, rev_per_frame=0.3, end=T["FRAMES"] + 10)
bpy.data.objects["B.fan.impeller"].cycles.motion_steps = 7
(open(os.path.join(ROOT, "tools/blender/s03_plan.json"), "w")).write(json.dumps(plan, indent=1))
print("SHOTS built:", len(SHOTS), "cameras;", sum(p["f1"] - p["f0"] + 1 for k, p in plan.items() if not k.startswith("_")), "frames to render")
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/s03_set.blend"))
print("S03 SHOTS BUILT")
