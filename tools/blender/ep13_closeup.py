"""Ep13 in the close-up studio style (like the reference shorts): one subject fills the frame, on a clean sky-blue
backdrop, under a soft studio light, with macro detail (skin pores, fingerprint ridges, carpet tufts, polished chrome).

Run after ep13_shots.py (which animates the story on the locked timeline):
    Blender -b blender/ep13.blend --python tools/blender/ep13_closeup.py
Saves blender/ep13_closeup.blend, rendered with Cycles to out/blender/ep13c/.
"""
import bmesh
import json
import math
import os

import bpy
from mathutils import Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
T = json.load(open(os.path.join(ROOT, "tools/blender/ep13_times.json")))["CUE"]
FPS = 30
NF = int(round(T["dur"] * FPS))
sc = bpy.context.scene
DR, NR = bpy.data.objects["DashReal.rig"], bpy.data.objects["NewtReal.rig"]
HANDLE = Vector((1.98, 0.8525, 1.0))
KEY_TIP_LOCAL = Vector((0.042, 0, 0))


def smooth(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3 - 2 * u)


def vlerp(a, b, u):
    return Vector(a).lerp(Vector(b), u)


def node(nt, kind, **kw):
    n = nt.nodes.new(kind)
    for k, v in kw.items():
        if k in n.inputs:
            n.inputs[k].default_value = v
        else:
            setattr(n, k, v)
    return n


# ─── 1. the set: only what the shots need, floating on the backdrop ─────────
HIDE = ("Room.ceiling", "Room.lwall", "Room.wall", "Room.picture", "Room.skirting", "Room.window", "Room.floor", "Room.door.frame", "Room.handle")
for o in bpy.data.objects:
    if o.name.startswith(HIDE):
        o.hide_render = True
        o.hide_viewport = True
for o in bpy.data.objects:
    if o.type == "LIGHT" and not o.name.startswith("Flash."):
        o.hide_render = True

# the backdrop: a sky-blue gradient seen by the camera only; the room's HDRI still lights and reflects
w = sc.world
nt = w.node_tree
out = [n for n in nt.nodes if n.type == "OUTPUT_WORLD"][0]
env_bg = [n for n in nt.nodes if n.type == "BACKGROUND"][0]
env_bg.inputs["Strength"].default_value = 0.7
tc = node(nt, "ShaderNodeTexCoord")
sep = node(nt, "ShaderNodeSeparateXYZ")
nt.links.new(tc.outputs["Window"], sep.inputs[0])
ramp = node(nt, "ShaderNodeValToRGB")
ramp.color_ramp.elements[0].position = 0.0
ramp.color_ramp.elements[0].color = (0.50, 0.78, 0.98, 1)
ramp.color_ramp.elements[1].position = 1.0
ramp.color_ramp.elements[1].color = (0.10, 0.42, 0.88, 1)
nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"])
cam_bg = node(nt, "ShaderNodeBackground", Strength=1.0)
nt.links.new(ramp.outputs["Color"], cam_bg.inputs["Color"])
lp = node(nt, "ShaderNodeLightPath")
mix = node(nt, "ShaderNodeMixShader")
nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
nt.links.new(env_bg.outputs["Background"], mix.inputs[1])
nt.links.new(cam_bg.outputs["Background"], mix.inputs[2])
nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])

# ─── 2. hero props ─────────────────────────────────────────────────────────
def mat(name, color, metallic=0.0, rough=0.5, bump=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    if bump:
        scale, strength = bump
        n = node(m.node_tree, "ShaderNodeTexNoise", Scale=scale, Detail=6.0)
        bp = node(m.node_tree, "ShaderNodeBump", Strength=strength, Distance=0.0003)
        m.node_tree.links.new(n.outputs["Fac"], bp.inputs["Height"])
        m.node_tree.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


def box(name, size, loc, material, bevel=0.004, segs=6, subsurf=2):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    sc.collection.objects.link(o)
    o.location = loc
    o.data.materials.append(material)
    bv = o.modifiers.new("bevel", "BEVEL"); bv.width = bevel; bv.segments = segs
    if subsurf:
        ss = o.modifiers.new("smooth", "SUBSURF"); ss.levels = ss.render_levels = subsurf
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def cyl(name, r, depth, loc, rot, material, bevel=0.002):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=64, radius1=r, radius2=r, depth=depth)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    sc.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    o.data.materials.append(material)
    bv = o.modifiers.new("bevel", "BEVEL"); bv.width = bevel; bv.segments = 5
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.shade_auto_smooth() if hasattr(o.data, "shade_auto_smooth") else None
    return o


for o in list(bpy.data.objects):
    if o.name.startswith("Hero."):
        bpy.data.objects.remove(o, do_unlink=True)
chrome = mat("hero.chrome", (0.93, 0.93, 0.95), metallic=1.0, rough=0.07, bump=(900.0, 0.02))
# the lever: front face exactly where the physics put it (y = 0.8525), pivoting on a round rose at x = 1.92
box("Hero.lever", (0.135, 0.024, 0.022), (1.983, 0.8645, 1.0), chrome, bevel=0.0075, segs=8)
cyl("Hero.neck", 0.0085, 0.03, (1.922, 0.879, 1.0), (math.radians(90), 0, 0), chrome)
cyl("Hero.rose", 0.031, 0.011, (1.922, 0.8895, 1.0), (math.radians(90), 0, 0), chrome, bevel=0.003)
# the door: semi-gloss white paint with a fine orange-peel texture, bevelled edges
door_paint = mat("hero.doorpaint", (0.90, 0.90, 0.88), rough=0.32, bump=(320.0, 0.04))
for n in ("Room.door", "Room.door.panel0", "Room.door.panel1"):
    o = bpy.data.objects[n]
    o.data.materials.clear(); o.data.materials.append(door_paint)
    if "bevel" not in o.modifiers:
        bv = o.modifiers.new("bevel", "BEVEL"); bv.width = 0.004; bv.segments = 4

# ─── 3. carpet: dense twisted tufts instead of single cones ──────────────────
tuft = bpy.data.meshes.new("Hero.tuft")
bm = bmesh.new()
import random
rnd = random.Random(13)
for i in range(7):
    a = 2 * math.pi * i / 7 + rnd.uniform(-0.3, 0.3)
    lean = math.radians(rnd.uniform(4, 16))
    h = rnd.uniform(0.010, 0.0135)
    geo = bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=0.00042, radius2=0.00018, depth=h)
    vs = geo["verts"]
    bmesh.ops.translate(bm, verts=vs, vec=(0, 0, h / 2))
    bmesh.ops.rotate(bm, verts=vs, cent=(0, 0, 0), matrix=Matrix.Rotation(lean, 3, Vector((math.cos(a + 1.57), math.sin(a + 1.57), 0))))
    bmesh.ops.translate(bm, verts=vs, vec=(0.0006 * math.cos(a), 0.0006 * math.sin(a), 0))
bm.to_mesh(tuft)
bm.free()
tuft_obj = bpy.data.objects.new("Hero.tuft", tuft)
sc.collection.objects.link(tuft_obj)
tuft_obj.hide_render = True
tuft_obj.hide_viewport = True
for p in tuft.polygons:
    p.use_smooth = True
fib = bpy.data.objects["Room.fibres"]
ng = fib.modifiers["fibres"].node_group
dist = [n for n in ng.nodes if n.bl_idname == "GeometryNodeDistributePointsOnFaces"][0]
dist.inputs["Density"].default_value = 26000.0
cone = [n for n in ng.nodes if n.bl_idname == "GeometryNodeMeshCone"][0]
oi = ng.nodes.new("GeometryNodeObjectInfo")
oi.inputs["Object"].default_value = tuft_obj
inst = [n for n in ng.nodes if n.bl_idname == "GeometryNodeInstanceOnPoints"][0]
for lk in list(ng.links):
    if lk.to_node == inst and lk.to_socket.name == "Instance":
        ng.links.remove(lk)
ng.links.new(oi.outputs["Geometry"], inst.inputs["Instance"])
carpet = bpy.data.materials["carpet"]
cn = carpet.node_tree
cb = cn.nodes["Principled BSDF"]
base = tuple(cb.inputs["Base Color"].default_value)
info = node(cn, "ShaderNodeObjectInfo")
jit = node(cn, "ShaderNodeMapRange")
jit.inputs["To Min"].default_value = 0.78
jit.inputs["To Max"].default_value = 1.12
cn.links.new(info.outputs["Random"], jit.inputs["Value"])
mulc = node(cn, "ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
mulc.inputs["Factor"].default_value = 1.0
base = (0.60, 0.19, 0.11, 1.0)  # deep terracotta wool
mulc.inputs[6].default_value = base
cn.links.new(jit.outputs["Result"], mulc.inputs[7])
cn.links.new(mulc.outputs[2], cb.inputs["Base Color"])
cb.inputs["Roughness"].default_value = 0.8
for k, v in (("Sheen Weight", 0.6), ("Sheen Roughness", 0.4)):
    if k in cb.inputs:
        cb.inputs[k].default_value = v
# the carpet backing, so the fibres stand on something
backing = box("Hero.backing", (2.4, 1.0, 0.002), (0.8, -0.05, 0.0), mat("hero.backing", tuple(c * 0.55 for c in base[:3]), rough=0.9), bevel=0.0, subsurf=0)
backing.modifiers.clear()

# ─── 4. skin: subsurface light, pores, fingerprint ridges on Dash's index finger ─
for o in list(bpy.data.objects):
    if o.name.startswith("Print."):
        bpy.data.objects.remove(o, do_unlink=True)
pad = bpy.data.objects.new("Print.dash", None)
sc.collection.objects.link(pad)
pad.parent = DR; pad.parent_type = "BONE"; pad.parent_bone = "finger2-3.R"
pad.location = (0, -0.009, 0)  # just behind the fingertip, on the pad


def upgrade_skin(m, fingerprint=None):
    """MPFB skin is a node group with pores and SSS built in: turn those up for macro, add fingerprint ridges."""
    g = [n for n in m.node_tree.nodes if n.bl_idname == "ShaderNodeGroup"][0]
    for k, v in (("Pore strength", 0.32), ("Pore scale", 2600.0), ("SSS strength", 0.45), ("SSS radius scale", 0.12), ("Roughness", 0.42)):
        if k in g.inputs and not g.inputs[k].is_linked:
            g.inputs[k].default_value = v
    if not fingerprint:
        return
    t = g.node_tree
    if any(n.name == "Fingerprint.bump" for n in t.nodes):
        return
    b = [n for n in t.nodes if n.type == "BSDF_PRINCIPLED"][0]
    prev = b.inputs["Normal"].links[0].from_socket if b.inputs["Normal"].is_linked else None
    pc = node(t, "ShaderNodeTexCoord")
    pc.object = fingerprint
    wave = node(t, "ShaderNodeTexWave", wave_type="RINGS", Scale=700.0, Distortion=3.0, Detail=2.0)
    t.links.new(pc.outputs["Object"], wave.inputs["Vector"])
    ln = node(t, "ShaderNodeVectorMath", operation="LENGTH")
    t.links.new(pc.outputs["Object"], ln.inputs[0])
    mr = node(t, "ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = 0.006
    mr.inputs["From Max"].default_value = 0.011
    mr.inputs["To Min"].default_value = 1.0
    mr.inputs["To Max"].default_value = 0.0
    t.links.new(ln.outputs["Value"], mr.inputs["Value"])
    mm = node(t, "ShaderNodeMath", operation="MULTIPLY")
    t.links.new(wave.outputs["Fac"], mm.inputs[0])
    t.links.new(mr.outputs["Result"], mm.inputs[1])
    fp = node(t, "ShaderNodeBump", Strength=0.35, Distance=0.00025)
    fp.name = "Fingerprint.bump"
    t.links.new(mm.outputs["Value"], fp.inputs["Height"])
    if prev:
        t.links.new(prev, fp.inputs["Normal"])
    t.links.new(fp.outputs["Normal"], b.inputs["Normal"])


upgrade_skin(bpy.data.materials["DashReal.body"], fingerprint=pad)
upgrade_skin(bpy.data.materials["NewtReal.body"])

# ─── 5. the camera: one subject per shot, studio softbox + rim that travel with it ─
cam = bpy.data.objects["Camera"]
cam.animation_data_clear(); cam.data.animation_data_clear()
cam.rotation_mode = "QUATERNION"
cam.data.dof.use_dof = True
cam.data.dof.focus_object = None
for o in list(bpy.data.objects):
    if o.name.startswith("Studio."):
        bpy.data.objects.remove(o, do_unlink=True)


def area(name, size, color):
    ld = bpy.data.lights.new(name, "AREA"); ld.size = size; ld.color = color
    if hasattr(ld, "shape"):
        ld.shape = "DISK"
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o)
    o.rotation_mode = "QUATERNION"
    return o


key = area("Studio.key", 1.0, (1.0, 0.95, 0.88))
rim = area("Studio.rim", 0.6, (0.82, 0.9, 1.0))


def P(rig, bone, tail=False):
    pb = rig.pose.bones[bone]
    return rig.matrix_world @ (pb.tail if tail else pb.head)


def dkey_tip():
    return bpy.data.objects["Key.dash"].matrix_world @ KEY_TIP_LOCAL


def nkey_tip():
    return bpy.data.objects["Key.newt"].matrix_world @ KEY_TIP_LOCAL


SHOTS = [
    (0.0, "hook"), (3.1, "shoe"), (10.15, "arm"), (13.6, "hair"), (16.85, "volts"), (22.6, "tip"),
    (T["spark"] - 1.5, "gap"), (T["recoil"], "recoil"), (T["newtShuffle"], "newt"), (T["keySpark"] - 0.9, "keyclose"),
    (T["gagShuffle"] - 0.1, "gag"),
]


def shot_at(t):
    name, start, end = SHOTS[0][1], 0.0, T["dur"]
    for k, (t0, n) in enumerate(SHOTS):
        if t >= t0:
            name, start = n, t0
            end = SHOTS[k + 1][0] if k + 1 < len(SHOTS) else T["dur"]
    return name, (t - start) / max(1e-6, end - start)


SHOES = bpy.data.objects["DashReal.shoes05"]


def right_shoe():
    """centre of his right sneaker (the half of the shoes mesh on his right side), from the deformed mesh"""
    e = SHOES.evaluated_get(bpy.context.evaluated_depsgraph_get())
    right = DR.matrix_world.to_3x3() @ Vector((-1, 0, 0))
    vs = [e.matrix_world @ v.co for v in e.data.vertices]
    c = sum(vs, Vector()) / len(vs)
    side = [v for v in vs if (v - c).dot(right) > 0]
    return sum(side, Vector()) / len(side)


# pass 1: the raw subject points (tracked bones), per frame
raw = []
for f in range(1, NF + 1):
    t = (f - 1) / FPS
    sc.frame_set(f)
    name, u = shot_at(t)
    pts = {
        "shoe": right_shoe() if 3.0 <= t < 10.2 else Vector(),
        "arm": P(DR, "lowerarm01.R").lerp(P(DR, "wrist.R"), 0.6),
        "hair": P(DR, "head", tail=True) + Vector((0, 0, -0.02)),
        "tip": P(DR, "finger2-3.R", tail=True),
        "wristD": P(DR, "wrist.R"),
        "wristN": P(NR, "wrist.L"),
        "nkey": nkey_tip(),
        "face": P(DR, "head") + Vector((0, 0, 0.08)),
        "teeth": dkey_tip(),
    }
    raw.append((t, name, u, pts))


def smoothed(i, k, win=7):
    name = raw[i][1]
    acc, n = Vector(), 0
    for j in range(max(0, i - win), min(len(raw), i + win + 1)):
        if raw[j][1] == name:
            acc += raw[j][3][k]; n += 1
    return acc / n


for i, (t, name, u, pts) in enumerate(raw):
    f = i + 1
    e = smooth(u)
    if name == "hook":  # the chrome lever, hero macro, slow push-in
        look = HANDLE + Vector((-0.015, 0, 0))
        loc = look + vlerp((0.13, -0.33, 0.07), (0.07, -0.21, 0.035), e)
        lens, fst = 65, 7.0
    elif name == "shoe":  # sneaker on the carpet tufts; electrons hop to the rubber
        look = smoothed(i, "shoe", 10) + Vector((0, 0, 0.01))
        loc = look + vlerp((0.10, -0.36, 0.03), (0.07, -0.29, 0.02), e)
        lens, fst = 45, 14.0
    elif name == "arm":  # skin macro: the charge glow climbing his forearm
        look = smoothed(i, "arm", 10).lerp(smoothed(i, "wristD", 10), 0.5)
        loc = look + vlerp((0.06, -0.50, 0.06), (0.04, -0.42, 0.05), e)
        lens, fst = 50, 8.0
    elif name == "hair":  # hair against the sky, lifting
        look = smoothed(i, "hair", 10) + Vector((0, 0, -0.06))
        loc = look + vlerp((0.80, -0.62, -0.05), (0.66, -0.50, -0.04), e)
        lens, fst = 50, 6.0
    elif name == "volts":  # over his right shoulder: his hand, the lever
        look = smoothed(i, "wristD", 8).lerp(HANDLE, 0.5)
        loc = look + vlerp((0.62, -0.30, 0.14), (0.52, -0.22, 0.1), e)
        lens, fst = 40, 6.0
    elif name == "tip":  # the finger closes in on the lever
        look = HANDLE + Vector((-0.02, -0.07, 0.0))  # a still frame on the lever; the finger slides in
        loc = look + vlerp((-0.31, -0.085, 0.065), (-0.26, -0.07, 0.05), e)  # the gap shot's side, pulled back
        lens, fst = 50, 12.0
    elif name == "gap":  # the last 3 mm and the spark, slow motion
        gapc = pts["tip"].lerp(HANDLE + Vector((-0.012, 0, 0)), 0.5)
        look = gapc
        loc = gapc + vlerp((-0.2, -0.015, 0.025), (-0.15, -0.012, 0.018), e)
        lens, fst = 90, 10.0
    elif name == "recoil":  # the hand snaps back and shakes
        look = smoothed(i, "wristD", 6)
        loc = look + vlerp((0.22, -0.55, 0.12), (0.18, -0.48, 0.1), e)
        lens, fst = 50, 7.0
    elif name == "newt":  # Newt's hand brings the key
        look = smoothed(i, "wristN", 8).lerp(HANDLE, 0.5) + Vector((0, 0, 0.12))
        loc = look + vlerp((-0.62, -0.52, 0.16), (-0.5, -0.42, 0.12), e)
        lens, fst = 40, 6.0
    elif name == "keyclose":  # the spark hits the key, not skin
        gk = pts["nkey"].lerp(HANDLE + Vector((0.01, 0, 0)), 0.5)
        look = gk
        loc = gk + vlerp((-0.15, -0.09, 0.09), (-0.11, -0.07, 0.065), e)
        lens, fst = 85, 11.0
    else:  # the gag, side-on: the key between his teeth, then teeth to the lever
        face = smoothed(i, "face", 6)
        k = smooth((t - (T["gagShuffle"] + 0.4)) / max(1e-6, (T["gagZap"] - 0.3) - (T["gagShuffle"] + 0.4)))
        look = face.lerp(pts["teeth"].lerp(HANDLE, 0.4), k)
        loc = look + vlerp((0.95, -0.28, 0.06), (0.62, -0.14, 0.03), e)
        lens, fst = 50, 8.0
    cam.location = loc
    cam.rotation_quaternion = (look - loc).to_track_quat("-Z", "Y")
    cam.data.lens = lens
    d = (look - loc).length
    cam.data.dof.focus_distance = d
    cam.data.dof.aperture_fstop = fst
    for prop, obj in (("location", cam), ("rotation_quaternion", cam)):
        obj.keyframe_insert(prop, frame=f)
    cam.data.keyframe_insert("lens", frame=f)
    cam.data.dof.keyframe_insert("focus_distance", frame=f)
    cam.data.dof.keyframe_insert("aperture_fstop", frame=f)
    # softbox: up-left of the camera; rim: behind and above the subject
    R = cam.rotation_quaternion.to_matrix()
    right, up = R @ Vector((1, 0, 0)), R @ Vector((0, 1, 0))
    fwd = (look - loc).normalized()
    s = max(d, 0.15)
    key.location = look - fwd * s * 1.1 - right * s * 0.9 + up * s * 0.8
    key.rotation_quaternion = (look - key.location).to_track_quat("-Z", "Y")
    key.data.size = 0.9 * s
    key.data.energy = 95 * s * s
    rim.location = look + fwd * s * 0.9 + right * s * 0.6 + up * s * 0.9
    rim.rotation_quaternion = (look - rim.location).to_track_quat("-Z", "Y")
    rim.data.size = 0.5 * s
    rim.data.energy = 140 * s * s
    for o in (key, rim):
        o.keyframe_insert("location", frame=f)
        o.keyframe_insert("rotation_quaternion", frame=f)
        o.data.keyframe_insert("size", frame=f)
        o.data.keyframe_insert("energy", frame=f)

# ─── 6. render: Cycles on the GPU ──────────────────────────────────────────
sc.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for dv in prefs.devices:
        dv.use = True
    sc.cycles.device = "GPU"
except Exception as ex:
    print("GPU setup failed:", ex)
sc.cycles.samples = 48
sc.cycles.use_adaptive_sampling = True
sc.cycles.adaptive_threshold = 0.03
sc.cycles.use_denoising = True
sc.cycles.denoiser = "OPENIMAGEDENOISE"
sc.cycles.max_bounces = 8
sc.cycles.transparent_max_bounces = 16
sc.render.use_motion_blur = True
sc.render.motion_blur_shutter = 0.4
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Punchy" if "AgX - Punchy" in [x.name for x in []] else sc.view_settings.look
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1080, 1920, 67  # 720p like the reference, upscaled in the edit
sc.render.filepath = os.path.join(ROOT, "out/blender/ep13c/f_")
sc.render.image_settings.file_format = "PNG"
sc.frame_start, sc.frame_end = 1, NF
sc.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/ep13_closeup.blend"))
print("CLOSEUP BUILT", NF, "frames")
