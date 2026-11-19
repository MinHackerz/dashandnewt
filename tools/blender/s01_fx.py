"""s01 effects and motion on top of blender/s01_set.blend, all on the word-pinned timeline (tools/blender/s01_times.json).

    Blender -b blender/s01_set.blend --python tools/blender/s01_fx.py
Saves blender/s01_fx.blend. What happens, and the physics behind each piece:
  * the frozen turkey hangs on a steel poultry rack + lifting hook and is lowered; once it is in, the oil rises by the
    bird's volume (12 lb ≈ 5.2 L over a 0.082 m² pot ≈ +6.3 cm);
  * the gas burner: a ring of blue premixed flames that flicker, and go out at "OFF";
  * the cutaway (shots 3–4) slices the front of pot and oil away to show inside; it plays in SLOW MOTION ×SM, so the
    first ~3 s after the bird goes in fill the explanation:
      - melt-water drops (4 mm) leave the ice and sink at their terminal speed in hot oil (6.9 cm/s, from s01_times),
      - on the hot pot floor each flashes to steam: the bubble's volume ×1,700 → diameter ×11.9,
      - the bubbles rise (≈0.4 m/s for a 5 cm bubble) and the oil level climbs as steam takes up room;
  * the eruption and the fire (shots 5–6) are fluid/fire simulations, added by s01_sims.py.
"""
import json
import math
import os
import random

import bmesh
import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TJ = json.load(open(os.path.join(ROOT, "tools/blender/s01_times.json")))
C, PH = TJ["CUE"], TJ["PHYS"]
FPS = C["fps"]
NF = int(round(C["end"] * FPS))
sc = bpy.context.scene
sc.frame_start, sc.frame_end = 1, NF
F = lambda t: int(round(t * FPS)) + 1
RND = random.Random(2611)

POT = bpy.data.objects["Pot"]
OIL = bpy.data.objects["Oil"]
TURKEY = bpy.data.objects["Turkey"]
POT_R, WALL = 0.165, 0.003
POT_BASE = POT.location.copy()
FLOOR = POT_BASE.z + WALL
OIL_TOP0 = OIL["surface_top"]
T_H, T_HALF = TURKEY["height"], TURKEY["half_w"]
AREA = math.pi * (POT_R - WALL) ** 2
T_VOL = 5.2e-3  # m³ — 12 lb bird at ~1.05 kg/L
RISE = T_VOL / AREA
SM = 4.0  # cutaway slow-motion factor (video seconds per real second)


def smooth(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3 - 2 * u)


def seg(t, a, b):
    return smooth((t - a) / max(1e-6, b - a))


def coll(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in sc.collection.children:
        sc.collection.children.link(c)
    return c


def mat(name, color, rough=0.3, metallic=0.0, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metallic
    for k, v in kw.items():
        b.inputs[k].default_value = v
    return m


FX = coll("FX")

# ─── the turkey's path (bottom of the bird, z) ─────────────────────────────
HOVER = OIL_TOP0 + 0.10
SUNK = FLOOR + 0.035  # sits on the rack's base plate, 3.5 cm off the pot floor
IN_START, IN_END = C["touch"] - 0.25, C["touch"] + 1.6 * SM / 2  # lowered in over ~0.8 s real time


def turkey_bottom(t):
    if t < C["lower_end"]:
        return HOVER + 0.38 * (1 - seg(t, 0.0, C["lower_end"]))
    if t < IN_START:
        return HOVER - (HOVER - (OIL_TOP0 + 0.005)) * seg(t, C["cutaway"], IN_START)
    if t < C["thaw"] - 0.2:
        return (OIL_TOP0 + 0.005) - ((OIL_TOP0 + 0.005) - SUNK) * seg(t, IN_START, IN_END)
    return SUNK


def submerged(t):
    """fraction of the bird below the oil (by height) — the displaced volume follows it"""
    zb = turkey_bottom(t)
    top = OIL_TOP0 + RISE * 0.0
    return max(0.0, min(1.0, (top - zb) / T_H))


# rack: a steel post through the bird, a base plate, and the lifting hook on top
steel = mat("rack steel", (0.75, 0.76, 0.78), rough=0.25, metallic=1.0)
for o in list(bpy.data.objects):
    if o.name.startswith(("Rack.", "Flame.", "Drop.", "Bubble.", "Cut.")):
        bpy.data.objects.remove(o, do_unlink=True)


def mk(name, build, material, parent=None, loc=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    build(bm)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    FX.objects.link(o)
    o.data.materials.append(material)
    o.location = loc
    if parent:
        o.parent = parent
    for p in o.data.polygons:
        p.use_smooth = True
    return o


rack = bpy.data.objects.new("Rack", None)
FX.objects.link(rack)
post_h = T_H + 0.16
mk("Rack.post", lambda bm: bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.006, radius2=0.006, depth=post_h), steel, rack, (0, 0, post_h / 2 - 0.035))
mk("Rack.plate", lambda bm: bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=0.12, radius2=0.12, depth=0.004), steel, rack, (0, 0, -0.035))
hook = bpy.data.curves.new("Rack.hook", "CURVE")
hook.dimensions = "3D"; hook.bevel_depth = 0.004; hook.bevel_resolution = 4
sp = hook.splines.new("BEZIER"); sp.bezier_points.add(2)
for b, p in zip(sp.bezier_points, [(0, 0, post_h - 0.035), (0, 0, post_h + 0.05), (0.04, 0, post_h + 0.07)]):
    b.co = p; b.handle_left_type = b.handle_right_type = "AUTO"
ho = bpy.data.objects.new("Rack.hook", hook); FX.objects.link(ho); ho.parent = rack; ho.data.materials.append(steel)

# the safe ending: thawing in the fridge (lying on a tray, rack off), then lowered slowly with the flame OFF
UP_ROT = TURKEY.rotation_euler.copy()
UP_LOC = TURKEY.location.copy()
TURKEY.rotation_euler = (0, 0, 0)
TURKEY.location = (0, 0, 0)
bpy.context.view_layer.update()
tms = [o for o in TURKEY.children_recursive if o.type == "MESH"]
pts = [o.matrix_world @ Vector(c) for o in tms for c in o.bound_box]
lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
SHELF = Vector((4.0, 0.0, 0.30))  # the thaw time-lapse: the bird on a steel tray, in the studio
FRIDGE_LOC = SHELF - Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z - 0.012))
TURKEY.rotation_euler = UP_ROT
TURKEY.location = UP_LOC
tray = mk("Rack.tray", lambda bm: bmesh.ops.create_cube(bm, size=1.0), mat("tray", (0.9, 0.9, 0.92), rough=0.3, metallic=1.0),
          loc=(SHELF.x, SHELF.y, SHELF.z + 0.004))
tray.scale = (hi.x - lo.x + 0.05, hi.y - lo.y + 0.05, 0.012)
FRIDGE_IN, FRIDGE_OUT = C["thaw"] - 0.35, C["off"] - 0.35
ENTER = C["goes_in"] - 0.1


def turkey_pose(t):
    """(location, upright?) of the bird's root"""
    if t < FRIDGE_IN:
        return UP_LOC + Vector((0, 0, turkey_bottom(t))), True
    if t < FRIDGE_OUT:
        return FRIDGE_LOC.copy(), False
    # back over the pot, the flame already off; lowered slowly from "goes in"
    z = HOVER - (HOVER - (OIL_TOP0 + 0.005)) * seg(t, ENTER, ENTER + 1.0)
    z -= ((OIL_TOP0 + 0.005) - (OIL_TOP0 - 0.1)) * seg(t, ENTER + 1.0, C["end"] + 0.6)
    return UP_LOC + Vector((0, 0, z)), True


for f in range(1, NF + 1):
    t = (f - 1) / FPS
    loc, up = turkey_pose(t)
    TURKEY.location = loc
    TURKEY.rotation_euler = UP_ROT if up else (0, 0, 0)
    TURKEY.keyframe_insert("location", frame=f)
    TURKEY.keyframe_insert("rotation_euler", frame=f)
    rack.location = (loc - UP_LOC) if up else Vector((0, 0, -5))
    rack.keyframe_insert("location", frame=f)
    zb = (loc - UP_LOC).z
    # oil rises with the displaced volume (and later with the steam, handled by the sims)
    k = max(0.0, min(1.0, (OIL_TOP0 - zb) / T_H)) if up else 0.0
    OIL.scale.z = ((OIL_TOP0 - FLOOR) + RISE * k) / (OIL_TOP0 - FLOOR)
    OIL.location.z = FLOOR + (OIL_TOP0 - FLOOR) * OIL.scale.z / 2
    OIL.keyframe_insert("scale", index=2, frame=f)
    OIL.keyframe_insert("location", index=2, frame=f)
for m in {sl.material for o in tms for sl in o.material_slots if sl.material}:
    fn = m.node_tree.nodes.get("Frost")
    if not fn:
        continue
    for t, v in ((0, 1.0), (FRIDGE_IN + 0.3, 1.0), (C["dry"] - 0.15, 0.0)):
        fn.outputs[0].default_value = v
        fn.outputs[0].keyframe_insert("default_value", frame=F(t))
# real ice: tiny crystals grown over the skin (geometry nodes), shrinking away during the thaw time-lapse
ice_m = mat("ice crystals", (0.93, 0.97, 1.0), rough=0.06, **{"Transmission Weight": 0.35, "IOR": 1.31, "Coat Weight": 1.0})
ng = bpy.data.node_groups.new("frost crystals", "GeometryNodeTree")
ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
N = ng.nodes
gi, go = N.new("NodeGroupInput"), N.new("NodeGroupOutput")
dist = N.new("GeometryNodeDistributePointsOnFaces"); dist.inputs["Density"].default_value = 45000.0
ico = N.new("GeometryNodeMeshIcoSphere"); ico.inputs["Radius"].default_value = 0.0014; ico.inputs["Subdivisions"].default_value = 1
inst = N.new("GeometryNodeInstanceOnPoints")
rs = N.new("FunctionNodeRandomValue"); rs.data_type = "FLOAT_VECTOR"
rs.inputs["Min"].default_value = (0.6, 0.6, 0.2); rs.inputs["Max"].default_value = (2.0, 2.0, 0.7)
rr = N.new("FunctionNodeRandomValue"); rr.data_type = "FLOAT_VECTOR"
rr.inputs["Min"].default_value = (0, 0, 0); rr.inputs["Max"].default_value = (6.28, 6.28, 6.28)
sm = N.new("ShaderNodeVectorMath"); sm.operation = "SCALE"
setm = N.new("GeometryNodeSetMaterial"); setm.inputs["Material"].default_value = ice_m
join = N.new("GeometryNodeJoinGeometry")
L = ng.links.new
L(gi.outputs["Geometry"], dist.inputs["Mesh"]); L(dist.outputs["Points"], inst.inputs["Points"])
L(ico.outputs["Mesh"], inst.inputs["Instance"]); L(rr.outputs["Value"], inst.inputs["Rotation"])
amt_n = N.new("ShaderNodeValue"); amt_n.name = "Amount"  # keyed below: 1 frozen → 0 thawed (one node, all scan parts)
L(rs.outputs["Value"], sm.inputs[0]); L(amt_n.outputs[0], sm.inputs["Scale"]); L(sm.outputs["Vector"], inst.inputs["Scale"])
L(inst.outputs["Instances"], setm.inputs["Geometry"])
L(gi.outputs["Geometry"], join.inputs["Geometry"]); L(setm.outputs["Geometry"], join.inputs["Geometry"])
L(join.outputs["Geometry"], go.inputs["Geometry"])
for o in tms:
    md = o.modifiers.new("frost crystals", "NODES"); md.node_group = ng
for t, v in ((0, 1.0), (FRIDGE_IN + 0.3, 1.0), (C["dry"] - 0.15, 0.0)):
    amt_n.outputs[0].default_value = v
    amt_n.outputs[0].keyframe_insert("default_value", frame=F(t))
tray.hide_render = True; tray.keyframe_insert("hide_render", frame=1)
tray.hide_render = False; tray.keyframe_insert("hide_render", frame=F(FRIDGE_IN))
tray.hide_render = True; tray.keyframe_insert("hide_render", frame=F(FRIDGE_OUT))
print("OIL rise when the bird is in: %.3f m (to %.3f, pot rim at %.3f)" % (RISE, OIL_TOP0 + RISE, POT_BASE.z + 0.40))

# surface shimmer: a slow ripple displacement on the oil's top (hot oil is never perfectly still)
OIL.modifiers.clear()
rm = OIL.modifiers.new("dense", "SUBSURF"); rm.subdivision_type = "SIMPLE"; rm.levels = 2; rm.render_levels = 4
vg = OIL.vertex_groups.new(name="top")
vg.add([v.index for v in OIL.data.vertices if v.co.z > 0], 1.0, "REPLACE")
tex = bpy.data.textures.get("oil ripple") or bpy.data.textures.new("oil ripple", "CLOUDS")
tex.noise_scale = 0.03
dm = OIL.modifiers.new("ripple", "DISPLACE"); dm.texture = tex; dm.strength = 0.0025; dm.vertex_group = "top"
dm.texture_coords = "GLOBAL"
drv_obj = bpy.data.objects.new("Cut.ripple_driver", None); FX.objects.link(drv_obj)
dm.texture_coords = "OBJECT"; dm.texture_coords_object = drv_obj
drv_obj.location = (0, 0, 0); drv_obj.keyframe_insert("location", frame=1)
drv_obj.location = (0.4, 0.25, 0); drv_obj.keyframe_insert("location", frame=NF)

# ─── burner flames ─────────────────────────────────────────────────────────
flame_m = bpy.data.materials.new("gas flame")
flame_m.use_nodes = True
nt = flame_m.node_tree
nt.nodes.clear()
out = nt.nodes.new("ShaderNodeOutputMaterial")
em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (0.25, 0.45, 1.0, 1)
gm = nt.nodes.new("ShaderNodeSeparateXYZ"); tc = nt.nodes.new("ShaderNodeTexCoord")
nt.links.new(tc.outputs["Generated"], gm.inputs[0])
fade = nt.nodes.new("ShaderNodeMapRange"); fade.inputs["From Min"].default_value = 0.0; fade.inputs["From Max"].default_value = 1.0
fade.inputs["To Min"].default_value = 30.0; fade.inputs["To Max"].default_value = 0.0
nt.links.new(gm.outputs["Z"], fade.inputs["Value"])
nt.links.new(fade.outputs["Result"], em.inputs["Strength"])
tr = nt.nodes.new("ShaderNodeBsdfTransparent")
mx = nt.nodes.new("ShaderNodeMixShader")
al = nt.nodes.new("ShaderNodeMapRange"); al.inputs["From Min"].default_value = 0.0; al.inputs["From Max"].default_value = 1.0
al.inputs["To Min"].default_value = 0.85; al.inputs["To Max"].default_value = 0.05
nt.links.new(gm.outputs["Z"], al.inputs["Value"])
nt.links.new(al.outputs["Result"], mx.inputs["Fac"])
nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2])
nt.links.new(mx.outputs[0], out.inputs["Surface"])
burner = bpy.data.objects["Burner"]
FLAME_Z = burner.location.z + 0.035
flames = []
for k in range(28):
    a = math.tau * k / 28
    fo = mk(f"Flame.{k:02d}", lambda bm: bmesh.ops.create_cone(bm, cap_ends=False, segments=10, radius1=0.006, radius2=0.0005, depth=0.04), flame_m,
            loc=(0.055 * math.cos(a), 0.055 * math.sin(a), FLAME_Z + 0.02))
    fo.rotation_euler = (math.radians(14) * math.sin(a), -math.radians(14) * math.cos(a), 0)
    flames.append((fo, RND.uniform(0, 6.28)))
light_d = bpy.data.lights.new("Flame.light", "POINT"); light_d.color = (0.35, 0.5, 1.0); light_d.shadow_soft_size = 0.05
fl = bpy.data.objects.new("Flame.light", light_d); FX.objects.link(fl); fl.location = (0, 0, FLAME_Z + 0.03)
for f in range(1, NF + 1, 2):
    t = (f - 1) / FPS
    on = 1.0 - seg(t, C["off"] - 0.05, C["off"] + 0.25)
    # the safe-fry ending: the flame stays off as the thawed bird goes in
    for fo, ph in flames:
        s = on * (1.0 + 0.18 * math.sin(2 * math.pi * 9.0 * t + ph) + 0.1 * math.sin(2 * math.pi * 23.0 * t + ph * 2))
        fo.scale = (max(1e-3, on), max(1e-3, on), max(1e-3, s))
        fo.keyframe_insert("scale", frame=f)
    light_d.energy = 6.0 * on
    light_d.keyframe_insert("energy", frame=f)

# ─── cutaway: slice the front of pot + oil away during shots 3–4 ───────────
CUT_ON, CUT_OFF = C["cutaway"], C["shoves"] - 0.2
cutter = bpy.data.objects.new("Cut.box", bpy.data.meshes.new("Cut.box"))
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.to_mesh(cutter.data); bm.free()
FX.objects.link(cutter)
cutter.scale = (1.0, 0.4, 1.2)
cutter.location = (0, -0.2 - 0.0, POT_BASE.z + 0.4)  # removes y < 0 (the half facing the camera)
cutter.hide_render = True; cutter.display_type = "WIRE"
cut_face = mat("cut face", (0.85, 0.86, 0.88), rough=0.35, metallic=1.0)
for o in (POT, OIL):
    bo = o.modifiers.new("cutaway", "BOOLEAN"); bo.object = cutter; bo.operation = "DIFFERENCE"; bo.solver = "EXACT"
    for f, v in ((1, False), (F(CUT_ON), True), (F(CUT_OFF), False)):
        bo.show_render = v; bo.show_viewport = v
        bo.keyframe_insert("show_render", frame=f); bo.keyframe_insert("show_viewport", frame=f)
for fc in (POT.animation_data.action.fcurves if POT.animation_data and hasattr(POT.animation_data.action, "fcurves") else []):
    for kp in fc.keyframe_points:
        kp.interpolation = "CONSTANT"

# ─── melt drops and steam bubbles (cutaway, slow motion ×SM) ───────────────
water = mat("melt water", (0.55, 0.8, 1.0), rough=0.02, **{"Transmission Weight": 1.0, "IOR": 1.333})
wb = water.node_tree.nodes["Principled BSDF"]
wb.inputs["Emission Color"].default_value = (0.2, 0.55, 1.0, 1); wb.inputs["Emission Strength"].default_value = 0.6
steam_m = mat("steam bubble", (1, 1, 1), rough=0.0, **{"Transmission Weight": 1.0, "IOR": 1.0 / 1.47})
V_DROP = PH["v_drop"] / SM  # video-time speeds in the slow-motion cutaway
V_BUB = 0.40 / SM
GROW = PH["bubble_growth"]
D0 = PH["drop_d"]
FLASH = 0.12 * SM  # a drop flashes to full size within ~0.12 s
OIL_TOP_IN = OIL_TOP0 + RISE
drops = []
# the hero drop lands exactly on "boils"; the others land before and after it, as melting carries on
fall_h = OIL_TOP_IN - 0.06 - FLOOR
hero_release = C["boils"] - fall_h / V_DROP
releases = sorted([hero_release] + [RND.uniform(C["touch"] + 0.4, C["shoves"] - fall_h / V_DROP - 0.5) for _ in range(46)])
for i, t0 in enumerate(releases):
    hero = abs(t0 - hero_release) < 1e-9
    # drops are shown in the plane of the cut (the cutaway's section), just behind the cut face, beside the bird
    x = (RND.choice((-1, 1)) * T_HALF * RND.uniform(0.62, 0.98)) if not hero else -T_HALF * 0.8
    y = RND.uniform(0.004, 0.022) if not hero else 0.006
    z0 = OIL_TOP_IN - RND.uniform(0.03, 0.14) if not hero else OIL_TOP_IN - 0.06
    d = D0 * (RND.uniform(0.7, 1.3) if not hero else 1.3)
    t_land = t0 + (z0 - FLOOR - d / 2) / V_DROP
    o = mk(f"Drop.{i:02d}", lambda bm: bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=0.5), water, loc=(x, y, z0))
    o.scale = (d, d, d * 0.85)
    o.hide_render = True; o.keyframe_insert("hide_render", frame=1)
    o.hide_render = False; o.keyframe_insert("hide_render", frame=F(t0))
    o.keyframe_insert("location", frame=F(t0))
    o.location.z = FLOOR + d / 2; o.keyframe_insert("location", frame=F(t_land))
    for fc in getattr(o.animation_data.action, "fcurves", []):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    # flash: the drop becomes a steam bubble, ×1,700 volume
    D = d * GROW
    yb = max(y, D * 0.5 + 0.003)  # keep the grown bubble behind the cut face
    b = mk(f"Bubble.{i:02d}", lambda bm: bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=0.5), steam_m, loc=(x, yb, FLOOR + d / 2))
    b.hide_render = True; b.keyframe_insert("hide_render", frame=1)
    b.hide_render = False; b.keyframe_insert("hide_render", frame=F(t_land))
    o.hide_render = True; o.keyframe_insert("hide_render", frame=F(t_land) + 1)
    D = d * GROW
    b.scale = (d, d, d); b.keyframe_insert("scale", frame=F(t_land))
    b.scale = (D, D, D * 0.8); b.keyframe_insert("scale", frame=F(t_land + FLASH))
    b.location.z = FLOOR + D * 0.4; b.keyframe_insert("location", frame=F(t_land + FLASH))
    t_top = t_land + FLASH + (OIL_TOP_IN - (FLOOR + D * 0.4)) / V_BUB
    b.location.z = OIL_TOP_IN; b.location.x = x * 0.7; b.keyframe_insert("location", frame=F(t_top))
    b.hide_render = True; b.keyframe_insert("hide_render", frame=F(t_top) + 1)
    drops.append((t0, t_land, hero))
print("DROPS", len(drops), "first lands %.2f, hero lands %.2f (boils %.2f), last lands %.2f" % (min(d[1] for d in drops), [d[1] for d in drops if d[2]][0], C["boils"], max(d[1] for d in drops)))
print("SLOWMO", SM, "drop speed on screen %.4f m/s, real %.4f m/s" % (V_DROP, PH["v_drop"]))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/s01_fx.blend"))
print("FX BUILT", NF, "frames")
