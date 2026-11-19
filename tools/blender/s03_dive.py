"""Short s03: the camera dive — laptop → insides → chip → transistors — as four matched camera moves, one per set,
joined by dissolves in the edit (run last; saves back into blender/s03_set.blend):

    blender -b blender/s03_set.blend --python tools/blender/s03_dive.py

The sets share coordinates by design: the inside (B, x + 10 m) is the laptop (A) with its top removed, so the chip
under the deck sits at the same x / y in both; the chip package (C, x + 20 m) is drawn at the same real size as the
one on the board. So each move ENDS exactly where the next one STARTS (same camera relative to the subject), and a
10-frame dissolve hides only the change of what is visible (deck → insides, cooler → bare chip). The last jump
(chip surface → transistors, ×10 million) is the one real scale cut: it dissolves at matching composition.
Each move pushes in at constant speed in log-distance (a zoom that feels continuous at every scale), with lights
fixed in the world for the whole move, and focus following the subject.

Segments (frames at 30 fps; each keeps moving 10 frames past its end, under the dissolve into the next):
  DIVE.A   1– 80  the laptop, pushing in to the keyboard above the chip
  DIVE.B  80–160  through the deck: the insides, pushing in to the cold plate on the chip
  DIVE.C 160–240  the chip package, pushing in to the die surface
  DIVE.D 240–330  the transistors on that die
"""
import math
import os
import sys

import bpy
from mathutils import Vector as V

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s03_rig as rig  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sc = bpy.context.scene
for o in [o for o in bpy.data.objects if o.name.startswith(("DIVE.", "DL."))]:
    bpy.data.objects.remove(o, do_unlink=True)

# subject points, read from the built sets
chip_b = V((9.965, 0.055, 0.005))  # B: the chip (substrate top) — from s03_set.py's CHIP
cold_b = chip_b + V((0, 0, 0.0058))  # top of the copper cold plate
deck_a = V((chip_b.x - 10.0, chip_b.y, 0.0137))  # A: the keyboard deck straight above it
C0 = V((20.0, 0.0, 0.0))
die_c = C0 + V((0.002, 0.001, 0.0021))  # C: a spot on the die surface (over a CPU core)
D0 = V((30.0, 0.0, 0.0))
DIR = V((0.28, -0.55, 0.79)).normalized()  # one viewing direction for the whole dive (steady, readable)


def move(name, station, f0, f1, look0, look1, d0, d1, lens0, lens1, fstop0, fstop1, dir0=DIR, dir1=DIR, ease_in=False,
         ease_out=False, overlap=10):
    """one push-in: camera at look(t) + dir(t) · d(t), d log-linear in t; keyed every frame f0 … f1 + overlap
    (the overlap keeps moving through the dissolve)"""
    cd = bpy.data.cameras.new(name)
    cam = bpy.data.objects.new(name, cd)
    sc.collection.objects.link(cam)
    cam["station"] = station
    cd.dof.use_dof = True
    cd.clip_start = max(min(d1 * 0.02, 0.01), 0.0002)
    cd.clip_end = 200.0
    f_end = f1 + overlap
    for f in range(f0, f_end + 1):
        u = (f - f0) / (f1 - f0)  # 0 … 1 over the segment, > 1 in the overlap
        w = u
        if ease_in:
            w = u * u * (3 - 2 * u) if u < 1 else u  # gentle start from rest
        if ease_out:
            w = min(u, 1.0)
            w = 1 - (1 - w) ** 2
        look = look0.lerp(look1, min(w, 1.0)) if w <= 1 else look1
        d = d0 * (d1 / d0) ** w
        dr = dir0.lerp(dir1, min(w, 1.0)).normalized()
        loc = look + dr * d
        cam.location = loc
        cam.rotation_euler = (look - loc).to_track_quat("-Z", "Y").to_euler()
        cd.lens = lens0 + (lens1 - lens0) * min(w, 1.0)
        cd.dof.focus_distance = d
        cd.dof.aperture_fstop = fstop0 + (fstop1 - fstop0) * min(w, 1.0)
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_euler", frame=f)
        cd.keyframe_insert("lens", frame=f)
        cd.dof.keyframe_insert("focus_distance", frame=f)
        cd.dof.keyframe_insert("aperture_fstop", frame=f)
    # lights fixed in the world for the whole move, placed from its start
    look0_ = look0
    start = look0_ + dir0 * d0
    for o in rig.shot_lights(f"DL.{name}", look0_.lerp(look1, 0.5), start.lerp(look1 + dir1 * d1, 0.5), energy_k=0.6):
        o["station"] = station
    return cam


# A: from the full laptop to the keyboard right above the chip (0.8 m → 0.14 m)
camA = move("DIVE.A", "A", 1, 80, V((0.0, 0.0, 0.1)), deck_a, 0.8, 0.14, 50, 50, 8, 11, ease_in=True)
# B: the same camera over the insides (deck gone), on to the cold plate (0.14 m → 0.05 m)
camB = move("DIVE.B", "B", 80, 160, deck_a + V((10, 0, 0)), cold_b, 0.14, 0.07, 50, 50, 11, 16)
# C: the bare chip package at the same size, on to the die surface (0.05 m → 0.006 m)
# (macro: a real photographer stacks focus so the whole die surface is sharp; f/22 → f/56 gives the same look)
camC = move("DIVE.C", "C", 160, 240, C0 + V((0, 0, 0.0018)), die_c, 0.045, 0.012, 50, 60, 22, 56)
# D: the transistors (scale ×10⁷): from the whole array to two transistors (6 m → 1.6 m)
_fin0 = bpy.data.objects["D.fin0"].matrix_world.translation  # the see-through front fin, where the electrons flow
camD = move("DIVE.D", "D", 240, 330, D0 + V((0, -0.2, 0.35)), V((D0.x + 0.1, _fin0.y + 0.4, D0.z + 0.3)), 4.5, 1.6, 35, 40, 8, 8, ease_out=True)
sc["dive_segments"] = "DIVE.A:1-90,DIVE.B:80-170,DIVE.C:160-250,DIVE.D:240-340"  # each dissolves into the next over its last 10
print("DIVE built:", [c.name for c in (camA, camB, camC, camD)])
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/s03_set.blend"))
print("S03 DIVE BUILT")
