"""s01 — rebuild of the "about 350 degrees" shot so the hot OIL is the subject.

    Blender -b blender/s01.blend --python tools/blender/s01_oilshot.py
Saves blender/s01_oilshot.blend; render ONLY frames F0..F1 from it (the other shots keep their frames from s01.blend).

Why: in the first cut the camera looked into the pot while the poultry rack's steel base plate (24 cm) hung 6.5 cm
over the oil, so the frame showed the plate and not the oil. Here the bird + rack are lifted out of frame for this
shot only (the cut hides it: the shot before ends on the wide, the shot after is a macro on the bird's ice), the
camera looks down over the rim at the oil surface, and a deep-fry dial on the clipped thermometer reads 350 °F.
Physics kept honest: clean oil at 350 °F does not bubble (bubbles need water), so the heat shows as the slow
convection shimmer on the surface and the dial, not as bubbles.
"""
import json
import math
import os

import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
T = json.load(open(os.path.join(ROOT, "tools/blender/s01_times.json")))
C = T["CUE"]
FPS = C["fps"]
V = Vector
sc = bpy.context.scene
F0 = int(math.ceil(C["oil"] * FPS - 1e-6)) + 1   # first frame of the shot (t = (f-1)/FPS >= C.oil)
F1 = int(math.ceil(C["ice"] * FPS - 1e-6))       # last frame before the ice shot
PAD = 3                                          # keys either side, so motion blur never sees the jump
OT = bpy.data.objects["Oil"]["surface_top"]
POT_TOP = 0.72
LIFT = 0.9


def smooth(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3 - 2 * u)


# 1 ── lift the bird and its rack out of the frame for this shot only
for name in ("Turkey", "Rack"):
    o = bpy.data.objects[name]
    for f in range(F0 - PAD, F1 + PAD + 1):
        sc.frame_set(f)
        o.location.z += LIFT
        o.keyframe_insert("location", frame=f)

# 2 ── camera: over the rim, looking down ~45° at the oil; slow push-in, punch on "350"
cam = sc.camera
LOOK = V((-0.035, 0.03, OT + 0.06))


def frame_oil(t):
    e = smooth((t - C["oil"]) / (C["ice"] - C["oil"]))
    loc = V((0.20, -0.40, 1.06)).lerp(V((0.16, -0.33, 0.98)), e)
    d = t - C["f350"]
    z = 0.18 * (smooth((d + 0.12) / 0.12) if d < 0 else math.exp(-d / 0.45)) if -0.12 < d < 1.4 else 0.0
    return loc, LOOK, 34 * (1 + z), 9


for f in range(F0 - PAD, F1 + PAD + 1):
    t = (f - 1) / FPS
    loc, look, lens, fst = frame_oil(t)
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

# 3 ── lights: the key from the left side (so the oil is not hidden under its mirror image), a small warm
#     glint light at the back whose reflection breaks up on the shimmer
key, rim = bpy.data.objects["Studio.key"], bpy.data.objects["Studio.rim"]
for f in range(F0 - PAD, F1 + PAD + 1):
    for o, loc, size, en in ((key, V((-1.15, -0.35, 1.5)), 0.9, 120.0), (rim, V((-0.25, 1.0, 1.25)), 0.16, 14.0)):
        o.location = loc
        o.rotation_quaternion = (LOOK - loc).to_track_quat("-Z", "Y")
        o.data.size = size
        o.data.energy = en
        o.keyframe_insert("location", frame=f)
        o.keyframe_insert("rotation_quaternion", frame=f)
        o.data.keyframe_insert("size", frame=f)
        o.data.keyframe_insert("energy", frame=f)

# 4 ── the oil, seen from above (this file only): golden-amber through its full 29 cm depth, and the convection
#     shimmer as a slowly drifting bump on the surface (the mesh ripple is switched off: on the fan-shaped top cap
#     it broke the highlight into a white star)
oil_ob = bpy.data.objects["Oil"]
rip = oil_ob.modifiers.get("ripple")
if rip:
    rip.show_render = False
    rip.show_viewport = False
om = bpy.data.materials["peanut oil 350F"]
nt = om.node_tree
for n in nt.nodes:
    if n.bl_idname == "ShaderNodeVolumeAbsorption":
        n.inputs["Color"].default_value = (0.97, 0.66, 0.16, 1)
        n.inputs["Density"].default_value = 3.5
bsdf = nt.nodes["Principled BSDF"]
tc = nt.nodes.new("ShaderNodeTexCoord")
noise = nt.nodes.new("ShaderNodeTexNoise")
noise.noise_dimensions = "4D"
noise.inputs["Scale"].default_value = 16.0
noise.inputs["Detail"].default_value = 2.0
noise.inputs["Roughness"].default_value = 0.45
bump = nt.nodes.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = 0.22
bump.inputs["Distance"].default_value = 0.004
nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
for f, w in ((F0 - PAD, 0.0), (F1 + PAD, 0.55)):
    noise.inputs["W"].default_value = w
    noise.inputs["W"].keyframe_insert("default_value", frame=f)
if nt.animation_data and nt.animation_data.action:
    try:
        from bpy_extras import anim_utils
        cb = anim_utils.action_get_channelbag_for_slot(nt.animation_data.action, nt.animation_data.action_slot)
        for fc in cb.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"
    except Exception as ex:
        print("W interpolation left as is:", ex)

# melt drops and steam bubbles belong to later shots; with the bird lifted they would hang in mid-air
for o in bpy.data.objects:
    if o.name.startswith(("Drop.", "Bubble.")):
        o.animation_data_clear()
        o.hide_render = True

# 5 ── deep-fry dial on the thermometer: white face, ticks every 50 °F from 100 to 400, red needle at 350 °F
col = bpy.data.collections.get("OilShot") or bpy.data.collections.new("OilShot")
if col.name not in sc.collection.children:
    sc.collection.children.link(col)


def mat(name, color, rough=0.4, metallic=0.0, emit=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metallic
    if emit:
        b.inputs["Emission Color"].default_value = (*color, 1)
        b.inputs["Emission Strength"].default_value = emit
    return m


M_STEEL = mat("dial steel", (0.82, 0.82, 0.84), 0.22, 1.0)
M_FACE = mat("dial face", (0.96, 0.95, 0.9), 0.5)
M_INK = mat("dial ink", (0.03, 0.03, 0.03), 0.6)
M_RED = mat("dial needle", (0.85, 0.05, 0.03), 0.4, emit=0.4)

DIAL_R = 0.046
root = bpy.data.objects.new("Dial", None)
col.objects.link(root)


def add(name, mesh_op, material, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    mesh_op()
    o = bpy.context.active_object
    o.name = name
    for c in list(o.users_collection):
        c.objects.unlink(o)
    col.objects.link(o)
    o.parent = root
    o.location, o.rotation_euler, o.scale = loc, rot, scale
    o.data.materials.append(material)
    return o


# dial local frame: face in the XY plane, facing +Z; "up" on the face is +Y
add("Dial.body", lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=DIAL_R, depth=0.012), M_STEEL, loc=(0, 0, -0.006))
add("Dial.face", lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=DIAL_R * 0.9, depth=0.001), M_FACE, loc=(0, 0, 0.0006))
A0, A1 = math.radians(225), math.radians(-45)  # 100 °F at lower-left, 400 °F at lower-right, clockwise


def ang(temp_f):
    return A0 + (A1 - A0) * (temp_f - 100) / 300.0


for tf in range(100, 401, 25):
    a = ang(tf)
    big = tf % 50 == 0
    r = DIAL_R * (0.74 if big else 0.78)
    add(f"Dial.tick{tf}", lambda: bpy.ops.mesh.primitive_cube_add(size=1), M_INK, loc=(math.cos(a) * r, math.sin(a) * r, 0.0013),
        rot=(0, 0, a), scale=(DIAL_R * (0.16 if big else 0.08), 0.0011 if big else 0.0007, 0.0004))
for tf in (100, 200, 300, 350, 400):
    a = ang(tf)
    r = DIAL_R * 0.5
    cu = bpy.data.curves.new(f"Dial.num{tf}", "FONT")
    cu.body = str(tf)
    cu.align_x, cu.align_y = "CENTER", "CENTER"
    cu.size = DIAL_R * (0.3 if tf == 350 else 0.2)
    cu.extrude = 0.0002
    o = bpy.data.objects.new(f"Dial.num{tf}", cu)
    col.objects.link(o)
    o.parent = root
    o.location = (math.cos(a) * r, math.sin(a) * r, 0.0013)
    o.data.materials.append(M_RED if tf == 350 else M_INK)
an = ang(T["PHYS"]["oil_temp_f"])
add("Dial.needle", lambda: bpy.ops.mesh.primitive_cube_add(size=1), M_RED, loc=(math.cos(an) * DIAL_R * 0.36, math.sin(an) * DIAL_R * 0.36, 0.0022),
    rot=(0, 0, an), scale=(DIAL_R * 0.78, 0.0016, 0.0006))
add("Dial.hub", lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.0035, depth=0.003), M_STEEL, loc=(0, 0, 0.0025))
# stem from the dial down into the oil
add("Dial.stem", lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.0022, depth=0.26), M_STEEL, loc=(0, -DIAL_R - 0.125, -0.008), rot=(math.radians(90), 0, 0))

# place it on the back-left rim, the face turned to the camera; hide the downloaded thermometer in this file
DIAL_AT = V((-0.10, 0.135, POT_TOP + 0.085))
cam_mid = frame_oil((C["oil"] + C["ice"]) / 2)[0]
root.location = DIAL_AT
root.rotation_mode = "QUATERNION"
root.rotation_quaternion = (cam_mid - DIAL_AT).to_track_quat("Z", "Y")
th = bpy.data.objects.get("Thermometer")
if th:
    for o in [th, *th.children_recursive]:
        o.hide_render = True
        o.hide_viewport = True

sc.frame_start, sc.frame_end = F0, F1
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/s01_oilshot.blend"))
print("OILSHOT BUILT frames", F0, F1, "oil top", round(OT, 3))
