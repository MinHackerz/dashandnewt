"""s02 the coat: "Puffer Jacket" (sivayuce, CC-BY) is tossed in from off-screen (Newt) on a ballistic arc and lands on
Dash's head; from the moment it touches, it is cloth and drapes over his head and shoulders.

    Blender -b blender/s02.blend --python tools/blender/s02_coat.py
Saves blender/s02.blend with the cloth baked.

  coat.fly    the coat as a rigid body in flight: p(t) = p0 + v0 t + ½ g t², g = 9.81 m/s², landing at the cue "coat"
              (word "coat", 35.66 s); a quarter-turn tumble on the way
  coat.sim    a decimated proxy (~6k faces) that is cloth from the landing frame (collides with Dash: body, shirt,
              shorts, scarf, hair); at the landing frame its shape is exactly the flying coat's
  coat.drape  the full-detail coat, bound to coat.sim with Surface Deform; shown from the landing frame on
"""
import json
import math
import os

import bpy
from mathutils import Euler, Matrix, Quaternion, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
T = json.load(open(os.path.join(ROOT, "tools/blender/s02_times.json")))
C, PH = T["CUE"], T["PHYS"]
FPS = C["fps"]
NF = int(round(C["end"] * FPS))
sc = bpy.context.scene
V = Vector
G = V((0, 0, -PH["g"]))
for n in ("coat.fly", "coat.sim", "coat.drape"):  # (coat.drape: older builds)
    o = bpy.data.objects.get(n)
    if o:
        bpy.data.objects.remove(o, do_unlink=True)
CA = bpy.data.collections["A.BusStop"]

# ─── import and join the jacket at real size ─────────────────────────────
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, "blender/assets/sketchfab/ca50a464389b4ea8aa4c748bd43ec480/model.glb"))
new = [o for o in bpy.data.objects if o not in before]
meshes = [o for o in new if o.type == "MESH"]
for o in meshes:
    mw = o.matrix_world.copy()
    o.parent = None
    o.data.transform(mw)
    o.matrix_world = Matrix.Identity(4)
for o in new:
    if o.type != "MESH":
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()
coat = bpy.context.view_layer.objects.active
coat.name = "coat.fly"
for c in list(coat.users_collection):
    c.objects.unlink(coat)
CA.objects.link(coat)
pts = [v.co for v in coat.data.vertices]
lo = V([min(p[i] for p in pts) for i in range(3)])
hi = V([max(p[i] for p in pts) for i in range(3)])
H = 0.62  # a cropped puffer: collar to hem
s = H / (hi.z - lo.z)
centre = (lo + hi) / 2
coat.data.transform(Matrix.Scale(s, 4) @ Matrix.Translation(-centre))
for p in coat.data.polygons:
    p.use_smooth = True
print("COAT scale", round(s, 5), "size", [round((hi[i] - lo[i]) * s, 3) for i in range(3)])

# ─── the flight ──────────────────────────────────────────────────────────
DR = bpy.data.objects["Dash.rig"]
def _body_top():
    """top of his head as posed (the scan's head_end bone sits elsewhere)"""
    b_ = bpy.data.objects["Dash.body"]
    ev = b_.evaluated_get(bpy.context.evaluated_depsgraph_get())
    me_ = ev.to_mesh()
    z = max((ev.matrix_world @ v.co).z for v in me_.vertices)
    ev.to_mesh_clear()
    return z


head_top = _body_top()
LAND_T = C["coat_land"]
FLY = 0.75  # s in the air
L_F = int(round(LAND_T * FPS)) + 1
p1 = None  # set after the colliders: just above the posed head
p0 = V((2.3, -0.55, 0.95))  # Newt's toss, off-screen right, from about chest height
bpy.context.view_layer.update()
_hd = (DR.matrix_world @ [pb for pb in DR.pose.bones if pb.name.endswith(":Head")][0].head)
_qL = Euler((math.radians(90), 0, math.radians(8))).to_quaternion().to_matrix()
_under = -min((_qL @ v.co).z for v in coat.data.vertices)  # centre → lowest point of the coat, lying face-down
_head_top = head_top
p1 = V((0.0, 0.02, _head_top + 0.07 + _under))  # its underside just clears the hair as it lands
print("LAND centre z", round(p1.z, 3), "underside", round(p1.z - _under, 3), "head top", round(_head_top, 3))
v0 = (p1 - p0 - 0.5 * G * FLY * FLY) / FLY
print("TOSS v0", [round(c, 2) for c in v0], "m/s, speed", round(v0.length, 2))
# orientation: lands lying face-down across his head (front −Y → down, collar toward the camera), tumbling a
# quarter turn on the way
q_land = Euler((math.radians(90), 0, math.radians(8))).to_quaternion()
q_start = Euler((math.radians(10), math.radians(-70), math.radians(-30))).to_quaternion()
coat.rotation_mode = "QUATERNION"
for f in range(1, NF + 1):
    t = (f - 1) / FPS
    u = (t - (LAND_T - FLY)) / FLY
    if u < 0:
        coat.location, coat.rotation_quaternion = p0 + V((0, 0, -3.0)), q_start  # hidden below the snow until thrown
    elif u <= 1:
        tf = u * FLY
        coat.location = p0 + v0 * tf + 0.5 * G * tf * tf
        coat.rotation_quaternion = q_start.slerp(q_land, u * u * (3 - 2 * u))
    else:
        coat.location, coat.rotation_quaternion = p1, q_land
    coat.keyframe_insert("location", frame=f)
    coat.keyframe_insert("rotation_quaternion", frame=f)
coat["station"] = "A"

# ─── the cloth proxy (identity transform; its mesh = the coat at the landing pose) ──────────
land_M = Matrix.Translation(p1) @ q_land.to_matrix().to_4x4()
sim = coat.copy()
sim.data = coat.data.copy()
sim.animation_data_clear()
sim.name = "coat.sim"
CA.objects.link(sim)
sim.data.transform(land_M)
sim.matrix_world = Matrix.Identity(4)
sim.rotation_mode = "XYZ"
dec = sim.modifiers.new("lite", "DECIMATE")
dec.ratio = 16000 / max(1, len(sim.data.polygons))  # dense enough to keep the quilted puffs
bpy.context.view_layer.objects.active = sim
bpy.ops.object.select_all(action="DESELECT")
sim.select_set(True)
bpy.ops.object.modifier_apply(modifier="lite")
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.remove_doubles(threshold=0.003)
bpy.ops.object.mode_set(mode="OBJECT")
# drop tiny loose bits (zip pull, button) — they would fall through everything on their own
import bmesh as _bmesh
_b = _bmesh.new()
_b.from_mesh(sim.data)
_b.verts.ensure_lookup_table()
_seen, _kill = set(), []
for _v in _b.verts:
    if _v.index in _seen:
        continue
    _st, _pt = [_v], []
    _seen.add(_v.index)
    while _st:
        _x = _st.pop()
        _pt.append(_x)
        for _e in _x.link_edges:
            _y = _e.other_vert(_x)
            if _y.index not in _seen:
                _seen.add(_y.index)
                _st.append(_y)
    if len(_pt) < 150:
        _kill.extend(_pt)
_bmesh.ops.delete(_b, geom=_kill, context="VERTS")
_b.to_mesh(sim.data)
_b.free()
for p_ in sim.data.polygons:
    p_.use_smooth = True
print("SIM dropped loose verts", len(_kill))
cl = sim.modifiers.new("cloth", "CLOTH")
cs = cl.settings
cs.quality = 15
cs.mass = 0.15  # kg per vertex group of a padded jacket ≈ 0.9 kg total
cs.air_damping = 1.5
cs.tension_stiffness = 25
cs.compression_stiffness = 25
cs.shear_stiffness = 15
cs.bending_stiffness = 2.0  # padded: holds some shape
cs.use_internal_springs = False
cl.collision_settings.distance_min = 0.008
cl.collision_settings.collision_quality = 4
cl.collision_settings.use_self_collision = False  # the jacket's overlapping parts (pockets, lining) explode with it
cl.collision_settings.self_distance_min = 0.005
cl.point_cache.frame_start = L_F
cl.point_cache.frame_end = NF
print("SIM faces", len(sim.data.polygons), "cloth frames", L_F, "→", NF)
# collisions: a smooth, closed stand-in for Dash's head (with hair), neck + scarf and shoulders/chest/arms, riding
# on his bones like the scarf does (thin hair cards and the open Mixamo meshes make poor colliders)
import bmesh


def B(short):
    for pb in DR.pose.bones:
        if pb.name.split(":")[-1] == short:
            return pb


def collider(name, centre, radii, bone):
    for o in [o for o in bpy.data.objects if o.name == name]:
        bpy.data.objects.remove(o, do_unlink=True)
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=20, radius=1.0)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    CA.objects.link(o)
    # static at his posed position: by the time the coat lands his shiver has died down to a millimetre or two
    o.data.transform(Matrix.Translation(centre) @ Matrix.Diagonal((*radii, 1.0)))
    o.modifiers.new("collide", "COLLISION")
    o.collision.thickness_outer = 0.01
    o.collision.cloth_friction = 60.0  # skin, hair and knit grip a padded jacket
    o.hide_render = True
    o.display_type = "WIRE"
    return o


bpy.context.view_layer.update()
hd = (DR.matrix_world @ B("Head").head).lerp(DR.matrix_world @ B("Head").tail, 0.45)
sh_l, sh_r = DR.matrix_world @ B("LeftArm").head, DR.matrix_world @ B("RightArm").head
chest = DR.matrix_world @ B("Spine2").head
collider("coat.hit.head", hd + V((0, 0.005, 0.01)), (0.095, 0.115, 0.13), "Head")
collider("coat.hit.neck", (DR.matrix_world @ B("Neck").head) + V((0, 0, 0.02)), (0.11, 0.11, 0.07), "Neck")
collider("coat.hit.torso", chest + V((0, -0.02, 0.0)), (0.25, 0.17, 0.2), "Spine2")
for side, sp in (("L", sh_l), ("R", sh_r)):
    collider(f"coat.hit.shoulder{side}", sp + V((0, 0, -0.01)), (0.09, 0.09, 0.08), "Spine2")
# the snow ground (flat stand-in at z = 0)
gnd = [o for o in bpy.data.objects if o.name == "coat.hit.ground"]
for o in gnd:
    bpy.data.objects.remove(o, do_unlink=True)
gme = bpy.data.meshes.new("coat.hit.ground")
_g = bmesh.new()
bmesh.ops.create_grid(_g, x_segments=4, y_segments=4, size=2.5)
_g.to_mesh(gme)
_g.free()
g_o = bpy.data.objects.new("coat.hit.ground", gme)
CA.objects.link(g_o)
g_o.location.z = 0.01
g_o.modifiers.new("collide", "COLLISION")
g_o.collision.cloth_friction = 80.0
g_o.collision.thickness_outer = 0.01
g_o.hide_render = True
print("HEAD top (posed)", round(hd.z + 0.01 + 0.13, 3))

# after landing the cloth itself is the coat on screen, subdivided smooth
ssd = sim.modifiers.new("smooth", "SUBSURF")
ssd.levels, ssd.render_levels = 0, 1
sim["station"] = "A"
for f, fly_vis in ((1, True), (L_F, False)):
    coat.hide_render = not fly_vis
    sim.hide_render = fly_vis
    coat.keyframe_insert("hide_render", frame=f)
    sim.keyframe_insert("hide_render", frame=f)

# ─── bake ────────────────────────────────────────────────────────────────
with bpy.context.temp_override(scene=sc, point_cache=cl.point_cache):
    bpy.ops.ptcache.bake(bake=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/s02.blend"))
print("COAT BAKED")
