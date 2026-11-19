"""s01 shot list: one camera, keyed shot by shot on the word-pinned timeline; hard cuts between shots.

    Blender -b blender/s01_fx.blend --python tools/blender/s01_shots.py
Saves blender/s01.blend (render settings: Cycles on the GPU, 1080×1920 at 67 %, upscaled in the edit).
Each shot frames ONE subject (close-up studio style); focus distance follows the subject every frame.
"""
import json
import os

import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
C = json.load(open(os.path.join(ROOT, "tools/blender/s01_times.json")))["CUE"]
FPS = C["fps"]
NF = int(round(C["end"] * FPS))
sc = bpy.context.scene
V = Vector


def smooth(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3 - 2 * u)


def lerp(a, b, u):
    return a + (b - a) * u


def vl(a, b, u):
    return V(a).lerp(V(b), u)


HERO = V((-0.107, 0.0, 0.335))
OT = bpy.data.objects["Oil"]["surface_top"]
HOV = OT + 0.10  # the bird hangs 10 cm over the oil before it goes in
SHOTS = [  # (start, name)
    (0.0, "hook"), (C["oil"], "oil"), (C["ice"], "ice"), (C["cutaway"], "cutaway"), (C["bottom"], "bottom"),
    (C["shoves"] - 0.2, "erupt"), (C["thanksgiving"], "fire"), (C["thaw"] - 0.35, "fridge"), (C["dry"] - 0.15, "dry"),
    (C["off"] - 0.35, "safe"),
]


def shot_at(t):
    name, s0, s1 = SHOTS[0][1], 0.0, C["end"]
    for k, (t0, n) in enumerate(SHOTS):
        if t >= t0:
            name, s0 = n, t0
            s1 = SHOTS[k + 1][0] if k + 1 < len(SHOTS) else C["end"]
    return name, (t - s0) / max(1e-6, s1 - s0)


def frame_for(name, u, t):
    e = smooth(u)
    if name == "hook":
        return vl((0.95, -2.0, 1.15), (0.55, -1.15, 0.98), e), vl((0, 0, 0.82), (0, 0, 0.84), e), lerp(32, 40, e), 8
    if name == "oil":
        return vl((0.13, -0.24, OT + 0.2), (0.1, -0.2, OT + 0.17), e), V((-0.04, 0.05, OT)), 40, 8
    if name == "ice":
        return vl((0.16, -0.42, HOV + 0.16), (0.11, -0.33, HOV + 0.15), e), V((0.0, -0.07, HOV + 0.14)), 85, 11
    if name == "cutaway":
        return vl((0.28, -1.08, 0.66), (0.2, -0.92, 0.6), e), vl((0, 0, 0.6), (0, 0, 0.52), e), 45, 11
    if name == "bottom":  # macro on the hero drop at the floor; pulls back on "1,700" to show the bubbles
        k = smooth((t - C["x1700"] + 0.3) / 2.2)
        near = (HERO + V((0.05, -0.28, 0.035)), HERO + V((0, 0, 0.012)), 70, 9)
        far = (V((0.18, -0.85, 0.52)), V((0, 0, 0.47)), 42, 11)
        return near[0].lerp(far[0], k), near[1].lerp(far[1], k), lerp(near[2], far[2], k), lerp(near[3], far[3], k)
    if name == "erupt":
        return vl((0.8, -1.4, 0.78), (0.7, -1.25, 0.74), e), V((0, 0, 0.58)), 35, 11
    if name == "fire":
        return vl((0.25, -0.9, 0.45), (-0.15, -2.4, 0.95), e), vl((0, 0, 0.35), (0, 0, 0.95), e), lerp(40, 26, e), 11
    if name == "fridge":
        return vl((4.38, -0.8, 0.62), (4.32, -0.68, 0.58), e), V((4.0, 0.0, 0.38)), 45, 8
    if name == "dry":
        return vl((4.1, -0.42, 0.46), (4.08, -0.36, 0.45), e), V((4.0, -0.09, 0.39)), 85, 11
    return vl((0.58, -1.15, 0.86), (0.5, -1.0, 0.82), e), V((0, 0, 0.6)), 40, 8


cam = bpy.data.objects.get("Camera") or bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera"))
if cam.name not in sc.collection.objects:
    sc.collection.objects.link(cam)
sc.camera = cam
cam.animation_data_clear(); cam.data.animation_data_clear()
cam.rotation_mode = "QUATERNION"
cam.data.dof.use_dof = True
cam.data.sensor_fit = "AUTO"
import math

# engagement: punch-in zooms on the key words, and a handheld shake when it erupts and burns
PUNCH = [(C["f350"], 0.22), (C["ice"] + 1.0, 0.18), (C["boils"], 0.25), (C["over"], 0.3), (C["flame"], 0.35), (C["fires"], 0.15), (C["off"], 0.2)]


def punch(t):
    z = 0.0
    for t0, a in PUNCH:
        d = t - t0
        if -0.12 < d < 1.0:
            z += a * (smooth((d + 0.12) / 0.12) if d < 0 else math.exp(-d / 0.35))
    return z


def shake(t):
    amp = 0.0
    if t > C["over"] - 0.1:
        amp = 0.004
    if t > C["flame"] - 0.05:
        amp = 0.010 * math.exp(-(t - C["flame"]) / 2.0) + 0.003
    if t > C["thaw"] - 0.35:
        amp = 0.0
    return V((math.sin(t * 23.1) * math.sin(t * 7.3), math.sin(t * 19.7 + 1.0) * math.sin(t * 5.1), math.sin(t * 17.3 + 2.0) * math.sin(t * 6.7))) * amp


for f in range(1, NF + 1):
    t = (f - 1) / FPS
    name, u = shot_at(t)
    loc, look, lens, fst = frame_for(name, u, t)
    lens *= 1.0 + punch(t)
    loc = loc + shake(t)
    cam.location = loc
    cam.rotation_quaternion = (look - loc).to_track_quat("-Z", "Y")
    cam.data.lens = lens
    cam.data.dof.focus_distance = (look - loc).length
    cam.data.dof.aperture_fstop = fst
    cam.keyframe_insert("location", frame=f)
    cam.keyframe_insert("rotation_quaternion", frame=f)
    cam.data.keyframe_insert("lens", frame=f)
    cam.data.dof.keyframe_insert("focus_distance", frame=f)
    cam.data.dof.keyframe_insert("aperture_fstop", frame=f)

# studio key + rim that follow the shot's subject
for n in ("Studio.key", "Studio.rim"):
    o = bpy.data.objects.get(n)
    if o:
        bpy.data.objects.remove(o, do_unlink=True)


def area(name, color):
    ld = bpy.data.lights.new(name, "AREA"); ld.color = color
    if hasattr(ld, "shape"):
        ld.shape = "DISK"
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); o.rotation_mode = "QUATERNION"
    return o


key, rim = area("Studio.key", (1.0, 0.95, 0.88)), area("Studio.rim", (0.82, 0.9, 1.0))
for f in range(1, NF + 1, 2):
    t = (f - 1) / FPS
    name, u = shot_at(t)
    loc, look, lens, fst = frame_for(name, u, t)
    R = (look - loc).to_track_quat("-Z", "Y").to_matrix()
    right, up = R @ V((1, 0, 0)), R @ V((0, 1, 0))
    fwd = (look - loc).normalized()
    s = max((look - loc).length, 0.3)
    key.location = look - fwd * s * 1.0 - right * s * 0.9 + up * s * 0.9
    rim.location = look + fwd * s * 0.8 + right * s * 0.7 + up * s * 0.9
    for o, size, en in ((key, 0.9 * s, 110 * s * s), (rim, 0.5 * s, 150 * s * s)):
        o.rotation_quaternion = (look - o.location).to_track_quat("-Z", "Y")
        o.data.size = size; o.data.energy = en
        o.keyframe_insert("location", frame=f); o.keyframe_insert("rotation_quaternion", frame=f)
        o.data.keyframe_insert("size", frame=f); o.data.keyframe_insert("energy", frame=f)

sc.render.resolution_percentage = 67
sc.cycles.samples = 64
sc.cycles.use_adaptive_sampling = True
sc.cycles.adaptive_threshold = 0.03
sc.render.use_motion_blur = True
sc.render.motion_blur_shutter = 0.4
sc.render.filepath = os.path.join(ROOT, "out/blender/s01/f_")
sc.render.image_settings.file_format = "PNG"
sc.frame_start, sc.frame_end = 1, NF
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/s01.blend"))
print("SHOTS BUILT", [(round(t, 2), n) for t, n in SHOTS])
