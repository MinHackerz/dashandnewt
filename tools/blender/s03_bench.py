"""Time one s03 frame with chosen render settings (nothing is saved). Used to pick GPU/CPU and kernel settings and
to estimate the final render's length:

    S03_DEVICE=GPU RES=100 blender -b blender/s03_set.blend --python tools/blender/s03_bench.py -- <OFF|INTERSECT|FULL> <shot> <frame> <samples>
"""
import json
import os
import sys
import time

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import s03_rig as rig  # noqa: E402

opt, shot, frame, spp = sys.argv[sys.argv.index("--") + 1:][:4]
frame, spp = int(frame), int(spp)
dev = os.environ.get("S03_DEVICE", "GPU")
sc = bpy.context.scene
p = bpy.context.preferences.addons["cycles"].preferences
p.compute_device_type = "METAL"
p.get_devices()
for d in p.devices:
    d.use = d.type != "CPU"  # GPU only: a CPU+GPU split makes the GPU wait for slow CPU tiles
p.kernel_optimization_level = opt
p.metalrt = os.environ.get("METALRT", "AUTO")  # Apple hardware ray tracing: OFF, ON or AUTO
sc.render.engine = "CYCLES"
sc.cycles.device = dev
sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
rig.final_quality(sc, samples=spp, threshold=0.006)
sc.render.resolution_percentage = int(os.environ.get("RES", "100"))
plan = json.load(open(os.path.join(ROOT, "tools/blender/s03_plan.json")))[shot]
sc.frame_set(frame)
rig.isolate(plan["station"], fx=tuple(plan["fx"]))
sc.camera = bpy.data.objects["SHOT." + shot]
for o in bpy.data.objects:
    if o.name.startswith("SL."):
        o.hide_render = o.get("shot") != shot
# BISECT="hair,mb,man,vol,laptop": hide/turn off parts, to find what a render stalls on
for part in [x for x in os.environ.get("BISECT", "").split(",") if x]:
    for o in bpy.data.objects:
        if (part == "hair" and o.type == "CURVES") or (part == "man" and o.name.startswith(("E.body", "E.hair", "E.cloth", "E.rig"))) \
                or (part == "laptop" and o.name.startswith(("E.lap", "A."))) or (part == "desk" and o.name.startswith(("E.desk", "E.chair"))):
            o.hide_render = True
        if part == "vol" and o.type == "MESH" and any(m and m.node_tree and any(n.type.startswith("VOLUME") or n.type == "PRINCIPLED_VOLUME" for n in m.node_tree.nodes) for m in o.data.materials):
            o.hide_render = True
    if part == "mb":
        sc.render.use_motion_blur = False
    if part == "dn":
        sc.cycles.use_denoising = False
    if part == "world":
        sc.world = None
t = time.time()
bpy.ops.render.render(write_still=False)
print("BENCH", dev, opt, shot, frame, spp, f"{sc.render.resolution_percentage}%", round(time.time() - t, 1), flush=True)
