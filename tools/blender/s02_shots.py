"""s02 shot list + animation on the word-pinned timeline (tools/blender/s02_times.json); hard cuts between shots.

    Blender -b blender/s02_set.blend --python tools/blender/s02_shots.py
Saves blender/s02.blend (Cycles on the GPU, 1080×1920 at 75 %, upscaled in the edit) rendering to out/blender/s02/.

Animated here:
  Dash      a shiver: ~9 Hz tremor on spine, arms, head and legs (small, irregular); harder from "So shivering",
            dying away once the coat lands
  thermal   thermal_k 0→1 on "body" (a quick flicker-on), cold_k 0→1 from "hands" to "cold", off at the arm cut
  arm       skin → glass (xray_k), biceps then triceps glow and bulge (biceps_k / triceps_k shape keys + glow),
            both flicker at the shiver rate on "Nobody wins" while the arm only trembles, heat_k on "effort"
  jaw       lower teeth clack ~7 Hz ("chatter"); the jaw chatters on the skull with the masseter glowing
  skin      goose_k / hair_k: bumps rise and hairs stand on "stand"
The coat toss is added by s02_coat.py.
"""
import json
import math
import os
import random

import bpy
from mathutils import Matrix, Quaternion, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
T = json.load(open(os.path.join(ROOT, "tools/blender/s02_times.json")))
C = T["CUE"]
PH = T["PHYS"]
FPS = C["fps"]
NF = int(round(C["end"] * FPS))
sc = bpy.context.scene
V = Vector
UP = V((0, 0, 1))
sc.render.fps = FPS
sc.frame_start, sc.frame_end = 1, NF


def smooth(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3 - 2 * u)


def ramp(t, t0, t1):
    return smooth((t - t0) / max(1e-6, t1 - t0))


def tt(f):
    return (f - 1) / FPS


# ─── keyable handles ──────────────────────────────────────────────────────
def value_nodes(name):
    out = []
    for m in list(bpy.data.materials) + [sc.world]:
        if m and m.node_tree:
            out += [(m.node_tree, n) for n in m.node_tree.nodes if n.name == name]
    return out


def key_value(name, fn, step=1):
    nodes = value_nodes(name)
    for f in range(1, NF + 1, step):
        v = fn(tt(f))
        for nt, n in nodes:
            n.outputs[0].default_value = v
            n.outputs[0].keyframe_insert("default_value", frame=f)


def key_shape(obj, name, fn, step=1):
    kb = obj.data.shape_keys.key_blocks[name]
    for f in range(1, NF + 1, step):
        kb.value = fn(tt(f))
        kb.keyframe_insert("value", frame=f)


def key_gn(obj, mod, sock_name, fn, step=1):
    md = obj.modifiers[mod]
    ident = [it.identifier for it in md.node_group.interface.items_tree if getattr(it, "in_out", "") == "INPUT" and it.name == sock_name][0]
    path = f'modifiers["{mod}"].properties.inputs["{ident}"]["value"]'
    for f in range(1, NF + 1, step):
        md.properties.inputs[ident]["value"] = fn(tt(f))
        obj.keyframe_insert(path, frame=f)


def tremor(t, seed, hz):
    """irregular tremor in −1…1 around `hz`: three detuned sines with seeded phases"""
    r = random.Random(seed)
    p = [r.uniform(0, 6.283) for _ in range(3)]
    return (math.sin(2 * math.pi * hz * t + p[0]) * 0.55 + math.sin(2 * math.pi * hz * 1.37 * t + p[1]) * 0.3
            + math.sin(2 * math.pi * hz * 0.61 * t + p[2]) * 0.15)


def flick(t, t0, dur=0.22):
    """a thermal camera switching on: a quick double flicker into full"""
    if t < t0:
        return 0.0
    u = (t - t0) / dur
    if u >= 1:
        return 1.0
    return 1.0 if (u > 0.15 and u < 0.3) or u > 0.55 else 0.0


# ─── 1. effects keyed on the timeline ─────────────────────────────────────
# thermal look on station A (only seen in the thermal shots)
key_value("thermal_k", lambda t: flick(t, C["body"]) if t < C["core"] else 0.0)
key_value("cold_k", lambda t: ramp(t, C["hands"] + 0.2, C["cold1"]))
# the arm
BIC0 = C["front"] + 0.35
TRI0 = C["back"] + 0.3
NOB = C["nobody"]


def biceps(t):
    k = ramp(t, BIC0, BIC0 + 0.9)
    if t > NOB:
        k *= 0.72 + 0.28 * abs(tremor(t, 11, PH["shiver_hz"]))
    return k


def triceps(t):
    k = ramp(t, TRI0, TRI0 + 0.7)
    if t > NOB:
        k *= 0.72 + 0.28 * abs(tremor(t, 12, PH["shiver_hz"]))
    return k


key_value("xray_k", lambda t: 0.88 * ramp(t, C["core"] + 0.6, C["muscles"]))
key_value("biceps_k", biceps)
key_value("triceps_k", triceps)
key_value("heat_k", lambda t: ramp(t, C["effort"] + 0.2, C["heat"] - 0.2))
arm = bpy.data.objects["B.arm"]
key_shape(arm, "biceps_k", biceps)
key_shape(arm, "triceps_k", triceps)
key_gn(bpy.data.objects["B.heat"], "beads", "heat_k", lambda t: ramp(t, C["effort"] + 0.2, C["heat"] - 0.2), step=2)
# the arm only trembles: ±0.35° about its top at the shiver rate (from "Nobody wins" on, smaller before)
arm_rot0 = arm.rotation_euler.copy()
for f in range(1, NF + 1):
    t = tt(f)
    a = math.radians(0.12 + 0.25 * ramp(t, NOB - 0.3, NOB + 0.3))
    arm.rotation_euler = (arm_rot0.x + a * tremor(t, 21, PH["shiver_hz"]), arm_rot0.y + a * tremor(t, 22, PH["shiver_hz"]), arm_rot0.z)
    arm.keyframe_insert("rotation_euler", frame=f)

# teeth: the lower arch clacks against the upper one at ~7 Hz (2.5 mm gap at most), from "chatter" to the cut
lower = [o for o in bpy.data.objects if o.get("station") == "C1" and o.get("jaw") == "lower"]
base = {o.name: o.location.copy() for o in lower}


def clack(t, t0, t1):
    if t < t0 or t > t1:
        return 0.0
    e = ramp(t, t0, t0 + 0.15)
    ph = (t - t0) * PH["chatter_hz"]
    return e * abs(math.sin(math.pi * ph)) ** 0.7  # 0 = teeth together; snaps shut


for f in range(1, NF + 1):
    t = tt(f)
    d = clack(t, C["teeth"] + 0.35, C["jaw"] + 0.3)
    for o in lower:
        o.location = base[o.name] + V((0.0002 * tremor(t, 31, 5.0), 0, -0.0025 * d))
        o.keyframe_insert("location", frame=f)
# skull: the jaw chatters about its hinge, the masseter glows as it pulls the jaw shut
mand = bpy.data.objects["C.mandible"]
closed = math.radians(mand["closed_deg"])
for f in range(1, NF + 1):
    t = tt(f)
    d = clack(t, C["jaw"] - 0.25, C["end"])
    mand.rotation_euler.x = closed + math.radians(3.0) * d  # opening = toward 0
    mand.keyframe_insert("rotation_euler", index=0, frame=f)
key_value("masseter_k", lambda t: (1.0 - 0.6 * clack(t, C["jaw"] - 0.25, C["end"])) * ramp(t, C["jaw"] - 0.25, C["jaw"] + 0.1))

# goosebumps
skin = bpy.data.objects["D.skin"]
key_gn(skin, "goose", "goose_k", lambda t: ramp(t, C["stand"] - 0.1, C["stand"] + 1.1))
key_gn(skin, "goose", "hair_k", lambda t: ramp(t, C["stand"] + 0.1, C["stand"] + 1.4))

# ─── 2. Dash shivers ─────────────────────────────────────────────────────
DR = bpy.data.objects["Dash.rig"]


def B(short):
    for pb in DR.pose.bones:
        if pb.name.split(":")[-1] == short:
            return pb


SHIVER = {  # bone: (degrees of tremor about local X, Y, Z)
    "Spine": (0.5, 0.3, 0.4), "Spine1": (0.6, 0.3, 0.5), "Spine2": (0.6, 0.4, 0.5), "Neck": (0.8, 0.5, 0.6),
    "Head": (1.0, 0.6, 0.8), "LeftShoulder": (1.2, 0.4, 1.2), "RightShoulder": (1.2, 0.4, 1.2),
    "LeftArm": (1.0, 0.8, 1.0), "RightArm": (1.0, 0.8, 1.0), "LeftForeArm": (0.8, 0.5, 0.8),
    "RightForeArm": (0.8, 0.5, 0.8), "LeftUpLeg": (0.4, 0.2, 0.4), "RightUpLeg": (0.4, 0.2, 0.4),
    "LeftLeg": (0.5, 0.2, 0.3), "RightLeg": (0.5, 0.2, 0.3),
}
base_q = {}
for n in SHIVER:
    pb = B(n)
    pb.rotation_mode = "QUATERNION"
    base_q[n] = pb.rotation_quaternion.copy()


def shiver_amp(t):
    a = 1.0 + 0.6 * ramp(t, C["so"], C["so"] + 0.5)  # harder: "So shivering keeps you warm…"
    return a * (1.0 - ramp(t, C["coat_land"] + 0.3, C["coat_land"] + 1.3))  # the coat stops it


for f in range(1, NF + 1):
    t = tt(f)
    amp = shiver_amp(t)
    for k, (n, (ax, ay, az)) in enumerate(SHIVER.items()):
        e = V((ax * tremor(t, 100 + 3 * k, PH["shiver_hz"]), ay * tremor(t, 101 + 3 * k, PH["shiver_hz"]),
               az * tremor(t, 102 + 3 * k, PH["shiver_hz"]))) * math.radians(1) * amp
        q = Quaternion((1, 0, 0), e.x) @ Quaternion((0, 1, 0), e.y) @ Quaternion((0, 0, 1), e.z)
        pb = B(n)
        pb.rotation_quaternion = base_q[n] @ q
        pb.keyframe_insert("rotation_quaternion", frame=f)
    # breathing: a quick, shallow breath (cold) lifts the chest ~0.7° at ~0.5 Hz
    br = math.radians(0.7) * math.sin(2 * math.pi * 0.5 * t)
    pb = B("Spine2")
    pb.rotation_quaternion = pb.rotation_quaternion @ Quaternion((1, 0, 0), br)
    pb.keyframe_insert("rotation_quaternion", frame=f)

# ─── 3. cameras ──────────────────────────────────────────────────────────
mw = arm.matrix_world.copy()
arm_pts = [arm.matrix_world @ v.co for v in arm.data.vertices]
arm.rotation_euler = arm_rot0
bpy.context.view_layer.update()
AW = arm.matrix_world.copy()


def arm_at(frac):
    """world point on the arm's axis `frac` of the way from shoulder (0) to fingertip (1), with the base tilt"""
    zs = [v.co.z for v in arm.data.vertices]
    top, bot = max(zs), min(zs)
    z = top + (bot - top) * frac
    band = [v.co for v in arm.data.vertices if abs(v.co.z - z) < 0.01]
    c = sum(band, V()) / len(band)
    return AW @ c


A_UPPER, A_ELBOW, A_FORE = arm_at(0.22), arm_at(0.43), arm_at(0.6)
ARM_FWD = (AW.to_3x3() @ V((0, -1, 0))).normalized()  # the sculpt's front (biceps side) is −Y
ARM_SIDE = (AW.to_3x3() @ V((1, 0, 0))).normalized()
HEAD = V((0, 0.0, 1.62))
TEETH = V((20.0, 0.0, 1.0))
SKULL = V((22.0, 0.0, 1.06))
SKIN = V((30.0, -0.005, 1.0))
SHOTS = [  # (start, name)
    (0.0, "hook"), (C["body"], "therm_med"), (C["hands"] - 0.05, "therm_face"), (C["core"], "arm_in"),
    (C["front"], "biceps"), (C["back"], "triceps"), (C["nobody"], "both"), (C["effort"], "heat"),
    (C["teeth"], "teeth"), (C["jaw"] - 0.3, "skull"), (C["goose"], "skin_wide"), (C["stand"] - 0.45, "goose"),
    (C["so"], "back_wide"), (C["honestly"] - 0.2, "coat"),
]


def shot_at(t):
    name, s0, s1 = SHOTS[0][1], 0.0, C["end"]
    for k, (t0, n) in enumerate(SHOTS):
        if t >= t0:
            name, s0 = n, t0
            s1 = SHOTS[k + 1][0] if k + 1 < len(SHOTS) else C["end"]
    return name, (t - s0) / max(1e-6, s1 - s0)


def vl(a, b, u):
    return V(a).lerp(V(b), u)


def frame_for(name, u, t):
    """(camera location, look-at, lens mm, f-stop, light mode)"""
    e = smooth(u)
    if name == "hook":
        return vl((1.2, -4.4, 1.35), (0.85, -3.5, 1.28), e), vl((0, 0, 1.0), (0, 0, 1.05), e), 35, 11, "studio"
    if name == "therm_med":
        return vl((0.4, -1.75, 1.42), (0.32, -1.45, 1.44), e), V((0, 0, 1.32)), 50, 11, "studio"
    if name == "therm_face":
        return vl((0.2, -0.95, 1.5), (0.16, -0.8, 1.5), e), V((0, -0.05, 1.45)), 50, 11, "studio"
    if name == "arm_in":  # from a 3/4 front view, push in as the skin turns to glass
        look = A_UPPER.lerp(A_ELBOW, 0.5)
        d0 = (ARM_FWD * 0.8 + ARM_SIDE * 0.5).normalized()
        d1 = (ARM_FWD * 0.9 + ARM_SIDE * 0.3).normalized()
        return look + d0.lerp(d1, e).normalized() * (0.72 - 0.16 * e) + UP * 0.02, look - UP * 0.04, 50, 8, "studio"
    if name == "biceps":  # the front of the upper arm, shoulder to elbow in frame
        look = A_UPPER.lerp(A_ELBOW, 0.55)
        return look + (ARM_FWD + ARM_SIDE * 0.35).normalized() * (0.5 - 0.05 * e) - UP * 0.04, look - UP * 0.02, 50, 8, "studio"
    if name == "triceps":  # orbit round to the back of the arm
        look = A_UPPER.lerp(A_ELBOW, 0.45)
        look = A_UPPER.lerp(A_ELBOW, 0.55)
        a = math.radians(-70 + 45 * e)
        d = (-ARM_FWD * math.cos(a) + ARM_SIDE * math.sin(a)).normalized()
        return look + d * 0.5 - UP * 0.04, look - UP * 0.02, 50, 8, "studio"
    if name == "both":  # side on: front and back muscles both in view, the forearm barely moving
        look = A_UPPER.lerp(A_FORE, 0.5)
        return look + ARM_SIDE * (0.66 - 0.06 * e) + ARM_FWD * 0.15, look - UP * 0.03, 50, 8, "studio"
    if name == "heat":
        look = A_UPPER.lerp(A_FORE, 0.45)
        return look + (ARM_SIDE + ARM_FWD * 0.4).normalized() * (0.6 + 0.1 * e), look - UP * 0.04, 50, 8, "studio"
    if name == "teeth":
        return vl((20.008, -0.16, 0.998), (20.004, -0.145, 0.998), e), TEETH, 100, 11, "studio"
    if name == "skull":  # profile from the masseter side (−X), drifting slightly forward
        return vl((21.38, 0.04, 1.08), (21.42, 0.0, 1.07), e), SKULL + V((0, -0.01, -0.01)), 50, 8, "studio"
    if name == "skin_wide":
        return vl((30.0, -0.11, 1.05), (30.0, -0.095, 1.046), e), SKIN, 90, 16, "graze"
    if name == "goose":
        return vl((30.0, -0.075, 1.04), (30.0, -0.066, 1.037), e), SKIN, 90, 16, "graze"
    if name == "back_wide":
        return vl((0.7, -2.9, 1.3), (0.6, -2.6, 1.32), e), V((0, 0, 1.15)), 35, 11, "studio"
    # coat: frame Dash with room on screen-right for the coat to fly in
    return vl((0.75, -3.0, 1.45), (0.6, -2.7, 1.47), e), V((0.15, 0, 1.3)), 35, 11, "studio"


cam = bpy.data.objects.get("Camera") or bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera"))
if cam.name not in sc.collection.objects:
    sc.collection.objects.link(cam)
sc.camera = cam
cam.animation_data_clear()
cam.data.animation_data_clear()
cam.rotation_mode = "QUATERNION"
cam.data.dof.use_dof = True
cam.data.clip_start = 0.002
cam.data.clip_end = 100


def area(name, color):
    o = bpy.data.objects.get(name)
    if o:
        bpy.data.objects.remove(o, do_unlink=True)
    ld = bpy.data.lights.new(name, "AREA")
    ld.color = color
    ld.shape = "DISK"
    o = bpy.data.objects.new(name, ld)
    sc.collection.objects.link(o)
    o.rotation_mode = "QUATERNION"
    return o


key, rim = area("Studio.key", (1.0, 0.95, 0.88)), area("Studio.rim", (0.82, 0.9, 1.0))
CUTS = set()
prev = None
for f in range(1, NF + 1):
    t = tt(f)
    name, u = shot_at(t)
    if name != prev and prev is not None:
        CUTS.update({f - 1, f})
    prev = name
    loc, look, lens, fst, mode = frame_for(name, u, t)
    cam.location = loc
    cam.rotation_quaternion = (look - loc).to_track_quat("-Z", "Y")
    cam.data.lens = lens
    cam.data.dof.focus_distance = (look - loc).length
    cam.data.dof.aperture_fstop = fst
    for p in ("location", "rotation_quaternion"):
        cam.keyframe_insert(p, frame=f)
    cam.data.keyframe_insert("lens", frame=f)
    cam.data.dof.keyframe_insert("focus_distance", frame=f)
    cam.data.dof.keyframe_insert("aperture_fstop", frame=f)
    R = (look - loc).to_track_quat("-Z", "Y").to_matrix()
    right, up = R @ V((1, 0, 0)), R @ V((0, 1, 0))
    fwd = (look - loc).normalized()
    s = max((look - loc).length, 0.06)
    if mode == "graze":  # macro: a low raking key so every goosebump casts a shadow, a faint fill
        key.location, rim.location = look + V((0.14, 0.04, 0.035)), look + V((-0.1, -0.08, 0.12))
        lights = ((key, 0.03, 2.2), (rim, 0.08, 0.6))
    else:
        key.location = look - fwd * s - right * s * 0.9 + up * s * 0.9
        rim.location = look + fwd * s * 0.8 + right * s * 0.7 + up * s * 0.9
        lights = ((key, 0.9 * s, 110 * s * s), (rim, 0.5 * s, 150 * s * s))
    for o, size, en in lights:
        o.rotation_quaternion = (look - o.location).to_track_quat("-Z", "Y")
        o.data.size = size
        o.data.energy = en
        o.keyframe_insert("location", frame=f)
        o.keyframe_insert("rotation_quaternion", frame=f)
        o.data.keyframe_insert("size", frame=f)
        o.data.keyframe_insert("energy", frame=f)

STATION = {"hook": "A", "therm_med": "A", "therm_face": "A", "arm_in": "B", "biceps": "B", "triceps": "B", "both": "B",
           "heat": "B", "teeth": "C1", "skull": "C2", "skin_wide": "D", "goose": "D", "back_wide": "A", "coat": "A"}


def station_of(o):
    if o.get("station"):
        return o["station"]
    if any(c.name == "A.BusStop" for c in o.users_collection) or o.name.startswith("Dash."):
        return "A"
    return None


tagged = [(o, station_of(o)) for o in bpy.data.objects if o.type in ("MESH", "CURVE", "FONT") and station_of(o)]
prev_st = None
for f in range(1, NF + 1):
    st = STATION[shot_at(tt(f))[0]]
    if st != prev_st:
        for o, s_ in tagged:
            o.hide_render = s_ != st
            o.keyframe_insert("hide_render", frame=f)
        prev_st = st

# hard cuts: constant interpolation everywhere on the camera and lights (every frame is keyed)
for ob in (cam, cam.data, key, rim, key.data, rim.data):
    ad = ob.animation_data
    if ad and ad.action:
        for fc in getattr(ad.action, "fcurves", []):
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"

# ─── 4. render settings ──────────────────────────────────────────────────
sc.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "METAL"
prefs.get_devices()
for dv in prefs.devices:
    dv.use = True
sc.cycles.device = "GPU"
sc.cycles.samples = 96
sc.cycles.use_adaptive_sampling = True
sc.cycles.adaptive_threshold = 0.02
sc.cycles.use_denoising = True
sc.cycles.transparent_max_bounces = 64  # the glass skin + the fading arm stack many transparent layers
sc.cycles.max_bounces = 16
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Medium High Contrast"  # premium contrast; plain AgX read flat and pale
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1080, 1920, 75
sc.render.use_motion_blur = True
sc.render.motion_blur_shutter = 0.4
sc.render.filepath = os.path.join(ROOT, "out/blender/s02/f_")
sc.render.image_settings.file_format = "PNG"
sc["cuts"] = sorted(CUTS)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/s02.blend"))
print("SHOTS BUILT", [(round(t, 2), n) for t, n in SHOTS])
print("CUTS", ",".join(str(c) for c in sorted(CUTS)))
