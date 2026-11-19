"""s02 label anchors: where the labels in the edit point, projected from the real 3D points through the shot camera
for every frame → tools/blender/s02_anchors.json  {name: [[frame, x_px, y_px], …]} in 1080×1920 video pixels.

    Blender -b blender/s02.blend --python tools/blender/s02_anchors.py
"""
import json
import os

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sc = bpy.context.scene
cam = sc.camera
DR = bpy.data.objects["Dash.rig"]
arm = bpy.data.objects["B.arm"]
mass = bpy.data.objects["C.masseter"]


def bone(short, tail=False):
    pb = [p for p in DR.pose.bones if p.name.split(":")[-1] == short][0]  # (the rig's bones carry Mixamo names)
    return DR.matrix_world @ (pb.tail if tail else pb.head)


def centroid(o, attr):
    """the muscle's belly: the middle 30 % of its length (its tendons run on up into the shoulder)"""
    me = o.data
    a = me.attributes[attr]
    pts = [v.co for i, v in enumerate(me.vertices) if a.data[i].value > 0.5]
    z0, z1 = min(p.z for p in pts), max(p.z for p in pts)
    mid = [p for p in pts if z0 + 0.35 * (z1 - z0) < p.z < z0 + 0.65 * (z1 - z0)]
    return sum(mid, Vector()) / len(mid)


BI, TRI = centroid(arm, "biceps"), centroid(arm, "triceps")
MASS = sum((v.co for v in mass.data.vertices), Vector()) / len(mass.data.vertices)
fwd = Vector((0, -1, 0))
POINTS = {
    "nose": lambda: bone("Head").lerp(bone("Head", True), 0.42) + fwd * 0.105,
    "hand": lambda: bone("LeftForeArm").lerp(bone("LeftHand"), 0.8),  # the visible wrist (hands are tucked in)
    "chest": lambda: bone("Spine2") + fwd * 0.12 + Vector((0, 0, -0.08)),
    "biceps": lambda: arm.matrix_world @ BI,
    "triceps": lambda: arm.matrix_world @ TRI,
    "jaw": lambda: mass.matrix_world @ MASS,
}
out = {k: [] for k in POINTS}
for f in range(sc.frame_start, sc.frame_end + 1):
    sc.frame_set(f)
    for k, fn in POINTS.items():
        p = world_to_camera_view(sc, cam, fn())
        if p.z > 0 and -0.2 < p.x < 1.2 and -0.2 < p.y < 1.2:
            out[k].append([f, round(p.x * 1080, 1), round((1 - p.y) * 1920, 1)])
json.dump(out, open(os.path.join(ROOT, "tools/blender/s02_anchors.json"), "w"))
print("ANCHORS", {k: len(v) for k, v in out.items()})
