"""Ep13 "Why Door Handles ZAP You" — every shot, built from the shared timeline.

Run in background Blender on top of the polished sample scene (characters, room, look):
    Blender -b blender/ep13_sample.blend --python tools/blender/ep13_shots.py
It reads tools/blender/ep13_times.json (exported from src/episodes/ep13-static-zap/timeline.ts) and saves
blender/ep13.blend, ready to render. The physics shown (see the episode sheet):
  * shuffling rubber soles on carpet pull electrons onto Dash (they hop from the fibres to the sole);
  * insulated by the soles, the extra electrons spread over his whole body; like charges repel → hair lifts;
  * they crowd into the sharpest point near the metal (the fingertip) and jump ~3 mm as a spark, which
    discharges him (the electrons are gone afterwards);
  * Newt's key: the spark hits the key tip instead of skin;
  * Dash holds the key in his teeth → the spark still hits the key, and the current goes through his teeth.
"""
import json
import math
import os
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
exec(open(os.path.join(ROOT, "tools/blender/ep13_sample_scene.py")).read())  # helpers: _aim, _set, relax_arms, electron_material, _coll, _clear

TIMES = json.load(open(os.path.join(ROOT, "tools/blender/ep13_times.json")))
T = TIMES["CUE"]
FPS = 30
NF = int(round(T["dur"] * FPS))


def F(t):
    return int(round(t * FPS)) + 1


def smooth(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3 - 2 * u)


def seg(t, a, b):
    return smooth((t - a) / max(1e-6, b - a))


def lerp(a, b, u):
    return a + (b - a) * u


def vlerp(a, b, u):
    return Vector(a).lerp(Vector(b), u)


sc = bpy.context.scene
sc.frame_start, sc.frame_end = 1, NF
sc.render.fps = FPS
DASH = bpy.data.objects["DashReal.rig"]
NEWT = bpy.data.objects["NewtReal.rig"]
DBODY = bpy.data.objects["DashReal"]
NBODY = bpy.data.objects["NewtReal"]
for o in (DASH, NEWT, bpy.data.objects["Camera"]):
    o.animation_data_clear()
bpy.data.objects["Camera"].data.animation_data_clear()
for o in list(bpy.data.objects):
    if o.name.startswith(("Electron.", "Bolt.", "Flash.", "Key.", "Reach.", "Swarm.")):
        bpy.data.objects.remove(o, do_unlink=True)

# ─── the set: where things are ─────────────────────────────────────────────
HANDLE = Vector((1.98, 0.8525, 1.0))  # front face of the chrome lever
GAP = 0.003  # the spark jumps the last ~3 mm
DOOR_SPOT = Vector((1.88, 0.53, 0))  # where Dash stands to reach the handle (facing the door, +Y)
NEWT_WATCH = Vector((2.62, 0.0, 0))
NEWT_DOOR = Vector((2.1, 0.6, 0))
DASH_ASIDE = Vector((1.22, 0.02, 0))
GAG_SPOT = Vector((1.98, 0.229, 0))  # bent double, his mouth comes down to the lever


# ─── Dash: path, facing, posture over time ────────────────────────────────
def dash_place(t):
    """(location, facing deg about Z: 90 = toward the door end of the room (+X), 180 = facing the door (+Y), 0 = camera)"""
    walk_end = T["door"] - 0.9
    if t < walk_end:
        x = lerp(-0.3, 1.62, t / walk_end)
        return Vector((x, 0.05, 0)), 90.0, True
    if t < T["door"] + 0.2:
        u = seg(t, walk_end, T["door"] + 0.2)
        return vlerp((1.62, 0.05, 0), DOOR_SPOT, u), lerp(90, 180, u), u < 0.8
    if t < T["recoil"]:
        return DOOR_SPOT.copy(), 180.0, False
    if t < T["recoil"] + 0.7:  # staggers back, turning to us
        u = seg(t, T["recoil"], T["recoil"] + 0.7)
        return vlerp(DOOR_SPOT, (1.62, 0.16, 0), u), lerp(180, 125, u), False
    if t < T["newtShuffle"] + 0.4:
        return Vector((1.62, 0.16, 0)), 125.0, False
    if t < T["newtShuffle"] + 1.4:  # steps aside for Newt
        u = seg(t, T["newtShuffle"] + 0.4, T["newtShuffle"] + 1.4)
        return vlerp((1.62, 0.16, 0), DASH_ASIDE, u), lerp(125, 120, u), True
    if t < T["gagShuffle"]:
        return DASH_ASIDE.copy(), 120.0, False
    if t < T["gagZap"] - 0.15:  # shuffles back, key in his teeth, recharging
        u = seg(t, T["gagShuffle"], T["gagZap"] - 0.15)
        return vlerp(DASH_ASIDE, GAG_SPOT, u), lerp(120, 180, u), True
    if t < T["gagZap"] + 0.35:
        return GAG_SPOT.copy(), 180.0, False
    u = seg(t, T["gagZap"] + 0.35, T["gagZap"] + 1.1)  # turns to us, zapped
    return vlerp(GAG_SPOT, GAG_SPOT + Vector((-0.1, -0.2, 0)), u), lerp(180, 20, u), False


def newt_place(t):
    if t < T["newtShuffle"]:
        return NEWT_WATCH.copy(), -50.0, False
    if t < T["newtShuffle"] + 1.6:  # shuffles over (charging up too), then faces the door
        u = seg(t, T["newtShuffle"], T["newtShuffle"] + 1.6)
        return vlerp(NEWT_WATCH, NEWT_DOOR, u), lerp(-50, -180, u), True
    if t < T["keySpark"] + 0.6:
        return NEWT_DOOR.copy(), -180.0, False
    if t < T["keySpark"] + 1.4:
        u = seg(t, T["keySpark"] + 0.6, T["keySpark"] + 1.4)
        return vlerp(NEWT_DOOR, (2.85, -0.05, 0), u), lerp(-180, -40, u), True
    return Vector((2.85, -0.05, 0)), -40.0, False


def shuffle_legs(rig, t, moving, period=0.75, amp=1.0):
    P = rig.pose.bones
    ph = 2 * math.pi * t / period
    s = math.sin(ph) * (amp if moving else 0.0)
    _set(P["upperleg01.L"], "X", -9 * s)
    _set(P["upperleg01.R"], "X", 9 * s)
    _set(P["lowerleg01.L"], "X", 6 + 8 * max(0, s))
    _set(P["lowerleg01.R"], "X", 6 + 8 * max(0, -s))
    _set(P["foot.L"], "X", -4 * s)
    _set(P["foot.R"], "X", 4 * s)
    return s


def bend(rig, spine_deg, knee_deg=0.0, head_deg=0.0):
    P = rig.pose.bones
    for b in ("spine05", "spine04", "spine03", "spine02", "spine01"):
        _set(P[b], "X", spine_deg / 5)
    if knee_deg:
        for side in ("L", "R"):
            _set(P[f"upperleg01.{side}"], "X", -knee_deg * 0.6)
            _set(P[f"lowerleg01.{side}"], "X", knee_deg)
            _set(P[f"foot.{side}"], "X", -knee_deg * 0.4)
    _set(P["head"], "X", head_deg)


def curl_fingers(rig, side, amount, keep_index=True):
    P = rig.pose.bones
    for fi in (1, 2, 3, 4, 5):
        if keep_index and fi == 2:
            continue
        for k in (1, 2, 3):
            n = f"finger{fi}-{k}.{side}"
            if n in P:
                _set(P[n], "X", -amount * (0.9 if fi == 1 else 1.0) * (0.6 if k == 1 else 1.0))


def key_fingers(rig, t_frame):
    for bn in rig.pose.bones:
        if bn.name.startswith(("finger", "upperleg", "lowerleg", "foot", "spine", "head", "upperarm", "lowerarm", "neck", "jaw", "wrist")):
            bn.keyframe_insert("rotation_quaternion", frame=t_frame)


# IK targets for the reaching hands (the constraint's influence is keyed on/off)
def ik(rig, bone, name, chain=4):
    tgt = bpy.data.objects.new(name, None)
    sc.collection.objects.link(tgt)
    c = rig.pose.bones[bone].constraints.get("reach") or rig.pose.bones[bone].constraints.new("IK")
    c.name = "reach"
    c.target = tgt
    c.chain_count = chain
    c.use_tail = True
    c.influence = 0.0
    return tgt, c


dash_tgt, dash_ik = ik(DASH, "finger2-3.R", "Reach.dash", chain=6)
newt_tgt, newt_ik = ik(NEWT, "wrist.L", "Reach.newt", chain=5)


def reset_pose(rig):
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"
        pb.rotation_quaternion = (1, 0, 0, 0)


# ─── pass 1: characters ────────────────────────────────────────────────────
STEP = 2
GAG_LEAN = 38.5  # crouch: forward lean at the waist (spread over the spine)
GAG_KNEE = 123.0  # crouch depth (bend() keeps the feet flat)
GAG_HEAD = 34.5  # head lifted so his face stays level and the key points at the lever


def ankle_z(rig):
    bpy.context.view_layer.update()
    return min((rig.matrix_world @ rig.pose.bones[f"foot.{s}"].head).z for s in "LR")


reset_pose(DASH); DASH.location = (0, 0, 0); DASH.rotation_euler = (0, 0, 0)
ANKLE_Z = ankle_z(DASH)  # standing


def ground(rig, f):
    """keep the feet on the floor when a crouch lowers the hips"""
    rig.location.z -= ankle_z(rig) - ANKLE_Z
    rig.keyframe_insert("location", frame=f)
for f in list(range(1, NF + 1, STEP)) + [NF]:
    t = (f - 1) / FPS
    # Dash
    loc, face, moving = dash_place(t)
    DASH.location = loc
    DASH.rotation_euler = (0, 0, math.radians(face))
    DASH.keyframe_insert("location", frame=f)
    DASH.keyframe_insert("rotation_euler", frame=f)
    reset_pose(DASH)
    shuffle_legs(DASH, t, moving)
    relax_arms(DASH, None, swing=6 * math.sin(2 * math.pi * t / 0.75) if moving else 0, elbow=20)
    _set(DASH.pose.bones["spine03"], "X", -3)
    _set(DASH.pose.bones["head"], "X", 6)
    # reach: index finger out, the rest curled; IK drives the arm to the handle
    reach_on = T["reach"] - 0.3 <= t < T["recoil"] + 0.15
    if T["reach"] - 0.3 <= t < T["recoil"] + 0.15:
        curl_fingers(DASH, "R", 70)
    if T["recoil"] <= t < T["recoil"] + 1.2:  # ow: leans back, shakes the hand
        u = seg(t, T["recoil"], T["recoil"] + 0.25) * (1 - seg(t, T["recoil"] + 0.8, T["recoil"] + 1.2))
        bend(DASH, -14 * u, 0, -12 * u)
    # the gag: he crouches, face level, and brings the key in his teeth to the lever; ZAP jolts him upright
    gag_u, zapped = 0.0, False
    if T["gagShuffle"] + 0.5 <= t < T["gagZap"]:
        gag_u = smooth(seg(t, T["gagShuffle"] + 0.5, T["gagZap"] - 0.2))
    elif T["gagZap"] <= t < T["gagZap"] + 0.6:
        gag_u, zapped = 1 - seg(t, T["gagZap"], T["gagZap"] + 0.3), True
    if gag_u > 0 or zapped:
        bend(DASH, GAG_LEAN * gag_u - (10 * (1 - gag_u) if zapped else 0), GAG_KNEE * gag_u, -GAG_HEAD * gag_u + (8 * (1 - gag_u) if zapped else 0))
        relax_arms(DASH, None, swing=20 * gag_u, elbow=35 * gag_u + 10, parent_R=Matrix.Rotation(math.radians(GAG_LEAN * gag_u), 3, "X"))
        ground(DASH, f)
    dash_ik.influence = 1.0 if reach_on and t >= T["reach"] else (seg(t, T["reach"] - 0.3, T["reach"]) if reach_on else 0.0)
    dash_ik.keyframe_insert("influence", frame=f)
    key_fingers(DASH, f)
    # Newt
    nloc, nface, nmov = newt_place(t)
    NEWT.location = nloc
    NEWT.rotation_euler = (0, 0, math.radians(nface))
    NEWT.keyframe_insert("location", frame=f)
    NEWT.keyframe_insert("rotation_euler", frame=f)
    reset_pose(NEWT)
    shuffle_legs(NEWT, t, nmov, period=0.6)
    relax_arms(NEWT, None, swing=0, elbow=14)
    _set(NEWT.pose.bones["head"], "X", 6)
    # facepalms: right hand to the forehead
    for fp in (T["facepalm"], T["gagZap"] + 0.6):
        if fp <= t < fp + 1.6:
            u = seg(t, fp, fp + 0.25) * (1 - seg(t, fp + 1.3, fp + 1.6))
            P = NEWT.pose.bones
            up = vlerp((-0.16, 0, -1.0), (-0.25, -0.75, 0.55), u).normalized()
            fore = vlerp((-0.16, -0.3, -1.0), (0.55, -0.35, 0.55), u).normalized()
            Ru = _aim(P["upperarm01.R"], up)
            _aim(P["lowerarm01.R"], fore, Ru)
            _set(P["head"], "X", 6 + 14 * u)
    newt_reach = T["newtShuffle"] + 1.2 <= t < T["keySpark"] + 0.5
    newt_ik.influence = seg(t, T["newtShuffle"] + 1.2, T["newtShuffle"] + 1.8) if newt_reach else 0.0
    newt_ik.keyframe_insert("influence", frame=f)
    if newt_reach:
        curl_fingers(NEWT, "L", 80, keep_index=False)
    key_fingers(NEWT, f)

# where the hands go (keyed on the targets): Dash's fingertip to 3 mm from the lever, slowly at the end
for f in range(1, NF + 1):
    t = (f - 1) / FPS
    start = HANDLE + Vector((-0.04, -0.33, -0.02))
    near = HANDLE + Vector((-0.012, -0.03, 0))
    gap = HANDLE + Vector((-0.012, -GAP, 0))
    u1 = seg(t, T["reach"], T["spark"] - 1.4)  # most of the way in
    u2 = (t - (T["spark"] - 1.4)) / 1.4  # slow motion: the last 3 cm over 1.4 s, straight to the gap
    p = vlerp(start, near, u1) if t < T["spark"] - 1.4 else vlerp(near, gap, max(0, min(1, u2)))
    dash_tgt.location = p
    dash_tgt.keyframe_insert("location", frame=f)
    k0 = HANDLE + Vector((0.06, -0.3, 0.02))
    k1 = HANDLE + Vector((0.035, -0.06, 0.0))  # wrist; the key's tip reaches the lever
    newt_tgt.location = vlerp(k0, k1, seg(t, T["newtShuffle"] + 1.6, T["keySpark"] - 0.05))
    newt_tgt.keyframe_insert("location", frame=f)


def correct(target, tip_fn, goal, t0, t1, passes=10, damp=0.6):
    """Shift a hand target's keys in [t0, t1] by (part of) the miss at t1, until the tool's tip lands within
    2 mm of `goal` (IK isn't linear, so small damped steps converge where one big step overshoots)"""
    for _ in range(passes):
        sc.frame_set(F(t1))
        miss = (goal - tip_fn()) * damp
        if miss.length < 0.002 * damp:
            break
        fc_frames = range(F(t0), F(t1) + 30)
        for f in fc_frames:
            sc.frame_set(f)
            w = smooth((f - F(t0)) / max(1, F(t1) - F(t0)))
            target.location = target.location + miss * w
            target.keyframe_insert("location", frame=f)


# ─── faces: ARKit face units on the basemesh, the jaw bone for an open mouth ─
FS = __import__("importlib").import_module("bl_ext.blender_org.mpfb.services.faceservice").FaceService
UNITS = ["eyeWideLeft", "eyeWideRight", "browInnerUp", "browOuterUpLeft", "browOuterUpRight", "browDownLeft", "browDownRight", "mouthSmileLeft", "mouthSmileRight", "eyeSquintLeft", "eyeSquintRight", "mouthStretchLeft", "mouthStretchRight", "mouthFrownLeft", "mouthFrownRight", "eyeBlinkLeft", "eyeBlinkRight", "cheekSquintLeft", "cheekSquintRight", "mouthPressLeft", "mouthPressRight"]
for body in (DBODY, NBODY):
    FS.set_expression(body, {u: 0.0 for u in UNITS})


def face_key(body, f, d):
    keys = body.data.shape_keys.key_blocks
    for u in UNITS:
        kb = keys.get(f"!ex-{u}")
        if kb:
            kb.value = d.get(u, 0.0)
            kb.keyframe_insert("value", frame=f)


def sym(name, v):
    return {f"{name}Left": v, f"{name}Right": v}


SMUG = {**sym("mouthSmile", 0.55), **sym("cheekSquint", 0.3)}
SHOCK = {**sym("eyeWide", 1.0), "browInnerUp": 1.0, **sym("browOuterUp", 0.8)}
OUCH = {**sym("eyeSquint", 0.9), **sym("mouthStretch", 0.8), **sym("browDown", 0.7), **sym("cheekSquint", 0.6)}
DAZED = {**sym("eyeWide", 0.5), **sym("mouthFrown", 0.4), "browInnerUp": 0.5}
CALM = {**sym("mouthSmile", 0.25)}
FLAT = {**sym("mouthPress", 0.5), **sym("browDown", 0.3)}
CLOSED = {**sym("eyeBlink", 1.0), **sym("mouthFrown", 0.3)}
dash_faces = [(0, SMUG), (T["spark"] - 0.1, SMUG), (T["spark"] + 0.05, SHOCK), (T["recoil"], OUCH), (T["recoil"] + 1.4, DAZED), (T["gagShuffle"], SMUG), (T["gagZap"], SMUG), (T["gagZap"] + 0.05, SHOCK), (T["gagZap"] + 0.9, {**SHOCK, **sym("mouthStretch", 0.6)})]
newt_faces = [(0, CALM), (T["spark"] + 0.1, {**sym("eyeWide", 0.6)}), (T["facepalm"], CLOSED), (T["facepalm"] + 1.6, CALM), (T["keySpark"] + 0.2, {**sym("mouthSmile", 0.6), **sym("cheekSquint", 0.3)}), (T["gagZap"] + 0.6, CLOSED), (T["gagZap"] + 2.2, FLAT)]
for body, faces in ((DBODY, dash_faces), (NBODY, newt_faces)):
    for t0, d in faces:
        face_key(body, F(t0), d)
# jaw: open on the shock and the ouch (the teeth follow the bone)
JAW = DASH.pose.bones["jaw"]
for t0, deg in ((0, 0), (T["spark"], 0), (T["spark"] + 0.1, 11), (T["recoil"] + 0.6, 8), (T["recoil"] + 1.5, 2), (T["gagZap"], 2), (T["gagZap"] + 0.08, 9)):
    _set(JAW, "X", deg, F(t0))


# ─── Dash's hair: shape keys "stand" (charged strands repel) and "frazzle" (after the zap) ─
hair = bpy.data.objects["DashReal.cortu_short_messy_hair"]
if not hair.data.shape_keys:
    hair.shape_key_add(name="Basis")
hb = DASH.data.bones["head"]
hc = hb.head_local + (hb.tail_local - hb.head_local) * 0.45
rnd = random.Random(7)
for kname, out, lift, noise in (("stand", 0.045, 0.09, 0.0), ("frazzle", 0.06, 0.11, 0.03)):
    kb = hair.data.shape_keys.key_blocks.get(kname) or hair.shape_key_add(name=kname)
    for i, v in enumerate(hair.data.vertices):
        d = (v.co - hc)
        n = d.normalized()
        up = max(0.0, n.z)
        j = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.3, 1))) * noise
        kb.data[i].co = v.co + n * out * (0.3 + up) + Vector((0, 0, lift * up)) + j * up
kb_s = hair.data.shape_keys.key_blocks["stand"]
kb_f = hair.data.shape_keys.key_blocks["frazzle"]
for t0, s, z in ((0, 0, 0), (T["climb"] + 1.0, 0, 0), (T["hair"] + 0.6, 1, 0), (T["spark"], 1, 0), (T["spark"] + 0.15, 0, 1), (T["gagShuffle"], 0, 0.7), (T["gagZap"], 0.6, 0.7), (T["gagZap"] + 0.1, 0, 1.4)):
    kb_s.value = s; kb_s.keyframe_insert("value", frame=F(t0))
    kb_f.value = min(1.0, z); kb_f.keyframe_insert("value", frame=F(t0))


# ─── the key (a small steel house key) ────────────────────────────────────
def make_key(name):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cylinder(bm, cap_ends=True, segments=24, radius1=0.011, radius2=0.011, depth=0.003) if hasattr(bmesh.ops, "create_cylinder") else bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.011, radius2=0.011, depth=0.003)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, "X"))
    blade = bmesh.new()
    bmesh.ops.create_cube(blade, size=1.0)
    bmesh.ops.scale(blade, vec=(0.032, 0.0025, 0.007), verts=blade.verts)
    bmesh.ops.translate(blade, vec=(0.026, 0, 0), verts=blade.verts)
    tmp = bpy.data.meshes.new(name + ".b"); blade.to_mesh(tmp); blade.free()
    bm.from_mesh(tmp); bpy.data.meshes.remove(tmp)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    sc.collection.objects.link(o)
    steel = bpy.data.materials.get("key.steel") or bpy.data.materials.new("key.steel")
    steel.use_nodes = True
    b = steel.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.82, 0.74, 0.5, 1); b.inputs["Metallic"].default_value = 1.0; b.inputs["Roughness"].default_value = 0.25
    o.data.materials.append(steel)
    return o


KEY_TIP_LOCAL = Vector((0.042, 0, 0))


def attach(o, rig, bone, loc, rot):
    o.parent = rig; o.parent_type = "BONE"; o.parent_bone = bone
    o.location = loc; o.rotation_euler = rot


newt_key = make_key("Key.newt")
attach(newt_key, NEWT, "wrist.L", (0.0, 0.07, 0.01), (0, 0, math.radians(90)))
newt_key.hide_render = True; newt_key.keyframe_insert("hide_render", frame=1)
newt_key.hide_render = False; newt_key.keyframe_insert("hide_render", frame=F(T["newtShuffle"]))
newt_key.hide_render = True; newt_key.keyframe_insert("hide_render", frame=F(T["keySpark"] + 1.5))
dash_key = make_key("Key.dash")
dash_key.scale = (1.4, 1.4, 1.4)  # a full-size house key, so it reads between his teeth
# between his front teeth, blade pointing forward. Bone-parented objects sit at the bone TAIL in bone space;
# his front teeth are at (0, -0.0172, 0.1076) from the head bone's head (measured), and the bone is 0.16 m long.
attach(dash_key, DASH, "head", (0.0, -0.0172 - DASH.pose.bones["head"].length, 0.1076 + 0.002), (0, math.radians(-90), 0))
dash_key.hide_render = True; dash_key.keyframe_insert("hide_render", frame=1)
dash_key.hide_render = False; dash_key.keyframe_insert("hide_render", frame=F(T["gagShuffle"]))


# ─── electrons ─────────────────────────────────────────────────────────────
EMAT = electron_material()
[n for n in EMAT.node_tree.nodes if n.type == "EMISSION"][0].inputs["Strength"].default_value = 5.0
coll = _coll("Electrons")


def coat(obj, density, seed, on_keys, reveal_keys, radius=0.0035):
    """Electrons riding on a (deforming) surface: shown below `reveal` height (m), all off when on=0."""
    ng = bpy.data.node_groups.new(f"coat.{obj.name}", "GeometryNodeTree")
    I = ng.interface
    I.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    s_on = I.new_socket("On", in_out="INPUT", socket_type="NodeSocketFloat")
    s_rev = I.new_socket("Reveal", in_out="INPUT", socket_type="NodeSocketFloat")
    I.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N, L = ng.nodes, ng.links
    gi = N.new("NodeGroupInput"); go = N.new("NodeGroupOutput")
    dist = N.new("GeometryNodeDistributePointsOnFaces"); dist.inputs["Density"].default_value = density; dist.inputs["Seed"].default_value = seed
    pos = N.new("GeometryNodeInputPosition")
    sep = N.new("ShaderNodeSeparateXYZ")
    lt = N.new("FunctionNodeCompare"); lt.data_type = "FLOAT"; lt.operation = "GREATER_THAN"
    gate = N.new("ShaderNodeMath"); gate.operation = "LESS_THAN"; gate.inputs[1].default_value = 0.5
    orr = N.new("FunctionNodeBooleanMath"); orr.operation = "OR"
    dele = N.new("GeometryNodeDeleteGeometry"); dele.domain = "POINT"
    setp = N.new("GeometryNodeSetPosition")
    sc_n = N.new("ShaderNodeVectorMath"); sc_n.operation = "SCALE"; sc_n.inputs[3].default_value = 0.006
    ico = N.new("GeometryNodeMeshIcoSphere"); ico.inputs["Radius"].default_value = radius; ico.inputs["Subdivisions"].default_value = 1
    inst = N.new("GeometryNodeInstanceOnPoints")
    rnd_s = N.new("FunctionNodeRandomValue"); rnd_s.data_type = "FLOAT"
    [x for x in rnd_s.inputs if x.name == "Min" and x.type == "VALUE"][0].default_value = 0.6
    [x for x in rnd_s.inputs if x.name == "Max" and x.type == "VALUE"][0].default_value = 1.4
    setm = N.new("GeometryNodeSetMaterial"); setm.inputs["Material"].default_value = EMAT
    join = N.new("GeometryNodeJoinGeometry")
    L.new(gi.outputs[0], dist.inputs["Mesh"])
    L.new(dist.outputs["Points"], setp.inputs["Geometry"])
    L.new(dist.outputs["Normal"], sc_n.inputs[0])
    L.new(sc_n.outputs["Vector"], setp.inputs["Offset"])
    L.new(pos.outputs["Position"], sep.inputs["Vector"])
    L.new(sep.outputs["Z"], lt.inputs[0])
    L.new(gi.outputs[s_rev.identifier], lt.inputs[1])
    L.new(gi.outputs[s_on.identifier], gate.inputs[0])
    L.new(lt.outputs["Result"], orr.inputs[0])
    L.new(gate.outputs["Value"], orr.inputs[1])
    L.new(setp.outputs["Geometry"], dele.inputs["Geometry"])
    L.new(orr.outputs["Boolean"], dele.inputs["Selection"])
    L.new(dele.outputs["Geometry"], inst.inputs["Points"])
    L.new(ico.outputs["Mesh"], inst.inputs["Instance"])
    L.new([x for x in rnd_s.outputs if x.type == "VALUE" and x.enabled][0], inst.inputs["Scale"])
    L.new(inst.outputs["Instances"], setm.inputs["Geometry"])
    L.new(gi.outputs[0], join.inputs["Geometry"])
    L.new(setm.outputs["Geometry"], join.inputs["Geometry"])
    L.new(join.outputs["Geometry"], go.inputs[0])
    m = obj.modifiers.new("electrons", "NODES")
    m.node_group = ng
    # Blender 5: node-modifier inputs live at modifier.properties.inputs.<Socket_N>.value
    for sock, keys in ((s_on, on_keys), (s_rev, reveal_keys)):
        slot = getattr(m.properties.inputs, sock.identifier)
        for t0, v in keys:
            slot.value = float(v)
            obj.keyframe_insert(f'modifiers["electrons"].properties.inputs.{sock.identifier}.value', frame=F(t0))


d_on = [(0, 0), (T["climb"] - 0.05, 0), (T["climb"], 1), (T["spark"] + 0.12, 1), (T["spark"] + 0.2, 0), (T["gagShuffle"], 0), (T["gagShuffle"] + 0.05, 1), (T["gagZap"] + 0.05, 1), (T["gagZap"] + 0.12, 0)]
d_rev = [(0, 0), (T["climb"], 0.0), (T["hair"] + 1.2, 1.95), (T["gagShuffle"], 0.0), (T["gagShuffle"] + 1.0, 1.95)]
def charge_glow(objs, keys_on, keys_rev):
    """A faint electric-blue glow on the surface, brightest at the silhouette (facing ratio), shown below a
    height that rises as the charge spreads. Driven by object custom properties 'charge' (0..1) and
    'charge_h' (m), keyed per object; every material on the object gets the same emission layer."""
    done = set()
    for o in objs:
        for slot in o.material_slots:
            m = slot.material
            if not m or m.name in done or not m.node_tree:
                continue
            done.add(m.name)
            nt = m.node_tree
            outn = [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"][0]
            surf = outn.inputs["Surface"].links[0].from_socket if outn.inputs["Surface"].is_linked else None
            if surf is None:
                continue
            a_c = nt.nodes.new("ShaderNodeAttribute"); a_c.attribute_type = "OBJECT"; a_c.attribute_name = "charge"
            a_h = nt.nodes.new("ShaderNodeAttribute"); a_h.attribute_type = "OBJECT"; a_h.attribute_name = "charge_h"
            geo = nt.nodes.new("ShaderNodeNewGeometry")
            tc = nt.nodes.new("ShaderNodeTexCoord")
            sep = nt.nodes.new("ShaderNodeSeparateXYZ")
            below = nt.nodes.new("ShaderNodeMath"); below.operation = "LESS_THAN"
            lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.12
            nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 40
            m1 = nt.nodes.new("ShaderNodeMath"); m1.operation = "MULTIPLY"
            m2 = nt.nodes.new("ShaderNodeMath"); m2.operation = "MULTIPLY"
            m3 = nt.nodes.new("ShaderNodeMath"); m3.operation = "MULTIPLY"; m3.inputs[1].default_value = 2.6
            pw = nt.nodes.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 2.2
            m4 = nt.nodes.new("ShaderNodeMath"); m4.operation = "MULTIPLY"
            em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (0.2, 0.55, 1.0, 1)
            add = nt.nodes.new("ShaderNodeAddShader")
            L = nt.links
            L.new(tc.outputs["Object"], sep.inputs["Vector"])
            L.new(sep.outputs["Z"], below.inputs[0]); L.new(a_h.outputs["Fac"], below.inputs[1])
            L.new(lw.outputs["Facing"], pw.inputs[0]); L.new(pw.outputs[0], m1.inputs[0]); L.new(nz.outputs["Fac"], m1.inputs[1])
            L.new(m1.outputs[0], m2.inputs[0]); L.new(below.outputs[0], m2.inputs[1])
            L.new(m2.outputs[0], m4.inputs[0]); L.new(a_c.outputs["Fac"], m4.inputs[1])
            L.new(m4.outputs[0], m3.inputs[0])
            L.new(m3.outputs[0], em.inputs["Strength"])
            L.new(surf, add.inputs[0]); L.new(em.outputs[0], add.inputs[1])
            L.new(add.outputs[0], outn.inputs["Surface"])
    for o in objs:
        o["charge"] = 0.0; o["charge_h"] = 0.0
        for t0, v in keys_on:
            o["charge"] = float(v); o.keyframe_insert('["charge"]', frame=F(t0))
        for t0, v in keys_rev:
            o["charge_h"] = float(v); o.keyframe_insert('["charge_h"]', frame=F(t0))


dash_parts = [o for o in bpy.data.objects if o.name.startswith("DashReal") and o.type == "MESH" and not o.name.startswith("DashReal.scarf")]
newt_parts = [o for o in bpy.data.objects if o.name.startswith("NewtReal") and o.type == "MESH" and o.name not in ("NewtReal.hat", "NewtReal.pompom")]
d_on = [(0, 0), (T["climb"] - 0.05, 0), (T["climb"] + 0.6, 0.55), (T["door"], 0.75), (T["spark"] - 0.4, 1.0), (T["spark"] + 0.06, 1.0), (T["spark"] + 0.25, 0), (T["gagShuffle"], 0), (T["gagShuffle"] + 0.6, 0.8), (T["gagZap"], 0.8), (T["gagZap"] + 0.15, 0)]
d_rev = [(0, 0), (T["climb"], 0.0), (T["hair"] + 1.2, 2.0), (T["gagShuffle"], 0.0), (T["gagShuffle"] + 1.0, 2.0)]
charge_glow(dash_parts, d_on, d_rev)
n_on = [(0, 0), (T["newtShuffle"], 0), (T["newtShuffle"] + 0.6, 0.7), (T["keySpark"], 0.7), (T["keySpark"] + 0.15, 0)]
n_rev = [(0, 0), (T["newtShuffle"], 0.0), (T["newtShuffle"] + 1.6, 1.6)]
charge_glow(newt_parts, n_on, n_rev)


# the first electrons: hopping from the carpet fibres onto the shoe (camera side) while he shuffles
me = bpy.data.meshes.new("Electron.mesh")
bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0); bm.to_mesh(me); bm.free()
rr = random.Random(13)
foot = DASH.pose.bones["foot.R"]
f0, f1 = F(T["macro"]), F(T["climb"] + 0.4)
shoe = {}
for f in range(f0, f1 + 1):
    sc.frame_set(f)
    shoe[f] = DASH.matrix_world @ foot.head
for i in range(26):
    o = bpy.data.objects.new(f"Electron.hop{i:02d}", me); coll.objects.link(o); o.data.materials.append(EMAT)
    r = rr.uniform(0.0014, 0.0022); o.scale = (r, r, r)
    born = rr.randint(F(T["macro"] + 0.6), F(T["climb"] - 0.6))
    hop = rr.randint(9, 15)
    side = DASH.matrix_world.to_3x3() @ Vector((0, 0, 1))
    off = Vector((rr.uniform(-0.08, 0.2), rr.uniform(-0.13, -0.07), 0.014 - 0.09))
    stick = Vector((rr.uniform(-0.05, 0.17), rr.uniform(-0.065, -0.05), rr.uniform(-0.07, -0.02)))
    for f in range(f0, f1 + 1):
        vis = born <= f < f1 - 2
        o.hide_render = not vis; o.keyframe_insert("hide_render", frame=f)
        if not vis:
            continue
        u = min(1.0, (f - born) / hop)
        o.location = (shoe[born] + off).lerp(shoe[f] + stick, u) + Vector((0, 0, 4 * u * (1 - u) * 0.035))
        o.keyframe_insert("location", frame=f)


# the swarm: in the last seconds before the spark the charge crowds into his fingertip
tip_bone = DASH.pose.bones["finger2-3.R"]
arm_bones = ["wrist.R", "finger2-1.R", "finger2-2.R", "finger3-1.R"]
s0, s1 = F(T["spark"] - 1.6), F(T["spark"] + 0.12)
tips, arm = {}, {}
for f in range(s0, s1 + 1):
    sc.frame_set(f)
    tips[f] = DASH.matrix_world @ tip_bone.tail
    arm[f] = [DASH.matrix_world @ DASH.pose.bones[b].head for b in arm_bones]
for i in range(24):
    o = bpy.data.objects.new(f"Electron.swarm{i:02d}", me); coll.objects.link(o); o.data.materials.append(EMAT)
    r = rr.uniform(0.0008, 0.0013); o.scale = (r, r, r)
    which = rr.randrange(len(arm_bones))
    jit = Vector((rr.uniform(-0.01, 0.01), rr.uniform(-0.01, 0.01), rr.uniform(-0.01, 0.01)))
    start = rr.randint(s0, s0 + int((s1 - s0) * 0.6))
    for f in range(s0, s1 + 1):
        vis = f >= start and f < s1
        o.hide_render = not vis; o.keyframe_insert("hide_render", frame=f)
        if not vis:
            continue
        u = smooth((f - start) / max(1, (s1 - 4 - start)))
        a = arm[f][which] + jit
        b = tips[f] + Vector((rr.uniform(-0.002, 0.002), rr.uniform(-0.002, 0.002), rr.uniform(-0.002, 0.002)))
        o.location = a.lerp(b, u)
        o.keyframe_insert("location", frame=f)


# ─── sparks: a branching bolt across the gap, a flash of light ────────────
BMAT = bpy.data.materials.get("bolt") or bpy.data.materials.new("bolt")
BMAT.use_nodes = True
nt = BMAT.node_tree; nt.nodes.clear()
em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (0.75, 0.88, 1.0, 1); em.inputs["Strength"].default_value = 140
outn = nt.nodes.new("ShaderNodeOutputMaterial"); nt.links.new(em.outputs[0], outn.inputs[0])


def bolt_curve(name, a, b, seed, thick):
    rnd = random.Random(seed)
    cd = bpy.data.curves.new(name, "CURVE"); cd.dimensions = "3D"; cd.bevel_depth = thick; cd.bevel_resolution = 2
    def zig(p0, p1, n, amp):
        pts = [p0]
        axis = (p1 - p0)
        side = axis.orthogonal().normalized()
        side2 = axis.cross(side).normalized()
        for k in range(1, n):
            u = k / n
            pts.append(p0.lerp(p1, u) + side * rnd.uniform(-amp, amp) + side2 * rnd.uniform(-amp, amp))
        pts.append(p1)
        return pts
    main = zig(a, b, 9, (b - a).length * 0.22)
    for pts in [main] + [zig(main[k], main[k] + (b - a).normalized().cross(Vector((0, 0, 1))) * (b - a).length * rnd.uniform(-0.5, 0.5) + (b - a) * 0.3, 4, (b - a).length * 0.12) for k in (3, 5)]:
        sp = cd.splines.new("POLY"); sp.points.add(len(pts) - 1)
        for k, p in enumerate(pts):
            sp.points[k].co = (p.x, p.y, p.z, 1)
    o = bpy.data.objects.new(name, cd); sc.collection.objects.link(o); o.data.materials.append(BMAT)
    return o


def spark(name, a_fn, b, t0, t1, thick, energy):
    """Three bolt variants flickering between t0 and t1, plus a point light flash at the gap"""
    sc.frame_set(F(t0))
    a = a_fn()
    variants = [bolt_curve(f"Bolt.{name}.{k}", a, b, 100 + k * 17 + len(name), thick) for k in range(3)]
    for k, o in enumerate(variants):
        o.hide_render = True; o.keyframe_insert("hide_render", frame=1)
        for f in range(F(t0), F(t1) + 1):
            o.hide_render = (f % 3) != k
            o.keyframe_insert("hide_render", frame=f)
        o.hide_render = True; o.keyframe_insert("hide_render", frame=F(t1) + 1)
    ld = bpy.data.lights.new(f"Flash.{name}", "POINT"); ld.color = (0.65, 0.82, 1.0); ld.shadow_soft_size = 0.002
    L = bpy.data.objects.new(f"Flash.{name}", ld); sc.collection.objects.link(L)
    L.location = a.lerp(b, 0.5)
    for t, e in ((0, 0), (t0 - 0.02, 0), (t0, energy), (t1, energy * 0.6), (t1 + 0.1, 0)):
        ld.energy = e; ld.keyframe_insert("energy", frame=max(1, F(t)))


tip_now = lambda: DASH.matrix_world @ DASH.pose.bones["finger2-3.R"].tail
correct(newt_tgt, lambda: newt_key.matrix_world @ KEY_TIP_LOCAL, HANDLE + Vector((0.01, -0.004, 0)), T["newtShuffle"] + 1.6, T["keySpark"])
sc.frame_set(F(T["keySpark"]))
print("NEWT KEY", [round(c, 4) for c in newt_key.matrix_world @ KEY_TIP_LOCAL])
GAG_GOAL = HANDLE + Vector((-0.005 * 0, -0.0035, 0.0))
for _ in range(6):  # slide his crouch spot (x, y) until the key tip is right in front of the lever
    sc.frame_set(F(T["gagZap"]))
    miss = GAG_GOAL - dash_key.matrix_world @ KEY_TIP_LOCAL
    miss.z = 0
    if miss.length < 0.001:
        break
    fcs = [fc for fc in DASH.animation_data.action.fcurves if fc.data_path == "location" and fc.array_index in (0, 1)] if hasattr(DASH.animation_data.action, "fcurves") else []
    if not fcs:
        for layer in DASH.animation_data.action.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    fcs += [fc for fc in cb.fcurves if fc.data_path == "location" and fc.array_index in (0, 1)]
    for fc in fcs:
        for kp in fc.keyframe_points:
            tt = (kp.co.x - 1) / FPS
            if tt < T["gagShuffle"]:
                continue
            w = smooth(seg(tt, T["gagShuffle"], T["gagZap"] - 0.15))
            d = miss.x if fc.array_index == 0 else miss.y
            kp.co.y += d * w; kp.handle_left.y += d * w; kp.handle_right.y += d * w
        fc.update()
sc.frame_set(F(T["gagZap"]))
_gk = dash_key.matrix_world @ KEY_TIP_LOCAL
print("GAG KEY height miss (m):", round(_gk.z - HANDLE.z, 3))
_tb = bpy.data.objects["DashReal.teeth_base"]
print("KEY ORIGIN vs TEETH:", [round(c, 3) for c in dash_key.matrix_world.translation], [round(c, 3) for c in _tb.matrix_world.translation])
print("GAG KEY", [round(c, 3) for c in _gk])
spark("main", tip_now, HANDLE + Vector((-0.012, 0, 0)), T["spark"], T["spark"] + 1.25, 0.00035, 0.8)
newt_tip = lambda: newt_key.matrix_world @ KEY_TIP_LOCAL
spark("key", newt_tip, HANDLE + Vector((0.01, 0, 0)), T["keySpark"], T["keySpark"] + 0.25, 0.0004, 0.5)
dash_tip = lambda: dash_key.matrix_world @ KEY_TIP_LOCAL
spark("teeth", dash_tip, HANDLE + Vector((0, 0, 0)), T["gagZap"], T["gagZap"] + 0.3, 0.0005, 1.2)


# ─── the camera: a shot list baked frame by frame ──────────────────────────
cam = bpy.data.objects["Camera"]
for c in list(cam.constraints):
    cam.constraints.remove(c)
cam.data.dof.use_dof = True
cam.rotation_mode = "QUATERNION"


def aim(loc, look):
    return (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y")


def body(rig, bone, head=False):
    pb = rig.pose.bones[bone]
    return rig.matrix_world @ (pb.tail if head else pb.head)


SHOTS = [
    (0.0, "wide"), (T["macro"] - 0.6, "down"), (T["climb"], "climb"), (T["door"] - 0.2, "door"),
    (T["reach"], "hand"), (T["spark"] - 1.5, "macro"), (T["recoil"] + 0.05, "room"), (T["newtShuffle"] + 0.1, "newt"),
    (T["keySpark"] - 0.9, "keyclose"), (T["gagShuffle"] - 0.1, "gag"), (T["gagZap"] + 0.45, "face"),
]


def shot_at(t):
    name, start, end = SHOTS[0][1], 0.0, T["dur"]
    for k, (t0, n) in enumerate(SHOTS):
        if t >= t0:
            name, start = n, t0
            end = SHOTS[k + 1][0] if k + 1 < len(SHOTS) else T["dur"]
    return name, (t - start) / max(1e-6, end - start), start, end


for f in range(1, NF + 1):
    t = (f - 1) / FPS
    sc.frame_set(f)
    name, u, s0, s1 = shot_at(t)
    e = smooth(u)
    shoe = body(DASH, "foot.R") + Vector((0.06, 0, -0.05))
    chest = body(DASH, "spine03")
    head = body(DASH, "head", head=False) + Vector((0, 0, 0.08))
    if name == "wide":
        loc, look, lens, fst = vlerp((1.75, -4.3, 1.3), (1.6, -3.9, 1.2), e), vlerp((1.25, 0.2, 0.9), (1.0, 0.15, 0.85), e), 30, 5.6
    elif name == "down":
        loc = vlerp((1.6, -3.9, 1.2), shoe + Vector((0.34, -0.46, 0.08)), smooth(min(1, u * 1.6)))
        look = vlerp((1.0, 0.15, 0.85), shoe, smooth(min(1, u * 1.6)))
        lens, fst = lerp(30, 52, smooth(min(1, u * 1.6))), lerp(5.6, 1.8, smooth(min(1, u * 1.6)))
    elif name == "climb":  # rise up his body as the charge spreads
        h = lerp(0.1, 1.35, e)
        look = vlerp(shoe, chest + Vector((0, 0, 0.15)), e)
        loc = Vector((chest.x + lerp(0.34, 1.25, e), chest.y + lerp(-0.46, -2.3, e), h))
        lens, fst = lerp(52, 38, e), lerp(1.8, 4.0, e)
    elif name == "door":
        loc, look, lens, fst = vlerp((2.75, -0.75, 1.45), (2.6, -0.55, 1.35), e), vlerp((1.9, 0.5, 1.2), (1.95, 0.7, 1.05), e), 38, 2.8
    elif name == "hand":
        tip = body(DASH, "finger2-3.R", head=True)
        mid = tip.lerp(HANDLE, 0.5)
        loc, look, lens, fst = mid + vlerp((0.5, -0.62, 0.12), (0.3, -0.38, 0.06), e), mid, lerp(45, 60, e), lerp(5.6, 4.0, e)
    elif name == "macro":  # the last 3 cm and the spark, in slow motion
        tip = body(DASH, "finger2-3.R", head=True)
        gapc = tip.lerp(HANDLE + Vector((-0.012, 0, 0)), 0.5)
        loc, look, lens, fst = gapc + vlerp((-0.2, -0.015, 0.025), (-0.15, -0.012, 0.018), e), gapc, 90, 6.3
    elif name == "room":
        loc, look, lens, fst = vlerp((1.0, -3.2, 1.35), (1.1, -2.9, 1.3), e), vlerp((2.0, 0.3, 1.0), (2.0, 0.3, 1.0), e), 32, 4.0
    elif name == "newt":
        nc = body(NEWT, "spine03")
        loc, look, lens, fst = Vector((nc.x + 0.9, nc.y - 1.7, 1.05)), nc + Vector((0, 0, 0.1)), 40, 2.8
    elif name == "keyclose":
        kt = newt_key.matrix_world @ KEY_TIP_LOCAL
        gk = kt.lerp(HANDLE + Vector((0.01, 0, 0)), 0.5)
        loc, look, lens, fst = gk + vlerp((-0.22, -0.03, 0.03), (-0.16, -0.02, 0.02), e), gk, 85, 6.3
    elif name == "gag":  # side-on profile so the key in his teeth reads: tracks his face, then frames face + lever
        face = body(DASH, "head") + Vector((0, 0, 0.08))
        k = smooth(seg(t, T["gagShuffle"] + 0.4, T["gagZap"] - 0.3))
        look = face.lerp(face.lerp(HANDLE, 0.45), k)
        loc = look + vlerp((1.25, -0.3, 0.1), (0.95, -0.12, 0.05), e)
        lens, fst = 42, 3.2
    else:  # his face, zapped, frazzled
        hd = body(DASH, "head") + Vector((0, 0, 0.06))
        loc, look, lens, fst = hd + vlerp((0.25, -1.1, 0.0), (0.18, -0.85, 0.0), e), hd, 50, 2.2
    cam.location = loc
    cam.rotation_quaternion = aim(loc, look)
    cam.keyframe_insert("location", frame=f)
    cam.keyframe_insert("rotation_quaternion", frame=f)
    cam.data.lens = lens; cam.data.keyframe_insert("lens", frame=f)
    cam.data.dof.focus_distance = (Vector(look) - Vector(loc)).length
    cam.data.dof.keyframe_insert("focus_distance", frame=f)
    cam.data.dof.aperture_fstop = fst
    cam.data.dof.keyframe_insert("aperture_fstop", frame=f)
cam.data.dof.focus_object = None
# hard cuts: constant interpolation on the camera
if cam.animation_data and cam.animation_data.action:
    for fc in getattr(cam.animation_data.action, "fcurves", []):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"

# ─── polish: rim light, quality, bloom ─────────────────────────────────────
for n in ("Rim.back",):
    o = bpy.data.objects.get(n)
    if o:
        bpy.data.objects.remove(o, do_unlink=True)
rd = bpy.data.lights.new("Rim.back", "AREA"); rd.energy = 420; rd.size = 1.2; rd.color = (1.0, 0.93, 0.85)
rim = bpy.data.objects.new("Rim.back", rd); sc.collection.objects.link(rim)
rim.location = (3.4, 0.75, 2.5)
rim.rotation_euler = (Vector((1.9, 0.3, 1.2)) - rim.location).to_track_quat("-Z", "Y").to_euler()
sc.eevee.taa_render_samples = 128
sc.eevee.use_shadow_jitter_viewport = True
gl = [n for n in sc.compositing_node_group.nodes if n.bl_idname == "CompositorNodeGlare"][0]
for k, v in (("Threshold", 1.0), ("Strength", 0.85), ("Size", 0.7)):
    try:
        gl.inputs[k].default_value = v
    except Exception:
        pass

sc.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/ep13.blend"))
print("EP13 BUILT", NF, "frames")
