"""Short s03, the remaining builds (run after s03_set.py, s03_chip.py, s03_person.py; saves back):

    blender -b blender/s03_set.blend --python tools/blender/s03_extra.py

  F (x = 50)  heat-pipe cut-away, real size: the same flattened copper pipe as inside the laptop (8 × 2.5 mm, 0.3 mm
              wall), cut open along its length (everything above the pipe's mid-plane removed). Inside: a 0.4 mm
              sintered-copper wick (powder grains ~0.1 mm) lining the wall; water fills the wick. At the hot end it
              sits on the copper cold plate over the chip; at the cold end it passes through aluminium fins.
              Animated (scene time): vapour leaves the wick at the hot end and streams to the cold end, where it
              condenses (fades) — water creeps back through the wick 10× slower. Water vapour is invisible in reality,
              so it is drawn as faint steam puffs (a visualisation; the narration calls it vapour).
  airflow (in B): air drawn into the blower's face, spun out through the scroll, pushed between the fins and out of
              the left-side slots. Air is invisible too: thin faint streaks, same convention.
  thermal (A, E): the laptop and the man through a thermal camera (thermal_k), temperatures as measured on laptops
              under load: deck above the chip ~45 °C, left vent edge ~50 °C, palm rests ~33 °C, skin ~34 °C,
              clothes ~30 °C, desk ~23 °C (warm streak where the exhaust blows). Hot AIR does not show on a thermal
              camera (air is nearly transparent in the long-wave infrared), so no plume is drawn there.
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector as V

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from s03_lib import box, coll, mat, mesh_obj, node, shadow_clear, thermal_mix, value  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sc = bpy.context.scene


def wipe(cname):
    c = bpy.data.collections.get(cname)
    if c:
        for o in list(c.objects):
            bpy.data.objects.remove(o, do_unlink=True)
    return coll(cname)


def flow(name, c, count, seed, start, axis, length, speed, spread_fn, radius, material, fade=0.12, jitter=(0, 0, 0),
         squash=1.0, subdiv=2, stretch=1.0):
    """GN particle stream driven by scene time: each point travels start → start + axis × length at its own speed
    (0.7–1.3 × `speed`, m/s), wrapping around; `spread_fn(N, rnd)` returns the (u, v) socket offsets across the
    stream; radius fades in/out over `fade` of the path; optional smooth jitter (m, per axis)."""
    me = bpy.data.meshes.new(name)
    o = bpy.data.objects.new(name, me)
    c.objects.link(o)
    tree = bpy.data.node_groups.new(name + ".gn", "GeometryNodeTree")
    tree.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    mod = o.modifiers.new("flow", "NODES")
    mod.node_group = tree
    N, Lk = tree.nodes, tree.links
    gout = N.new("NodeGroupOutput")

    def rnd(lo, hi, sd):
        r = N.new("FunctionNodeRandomValue")
        r.data_type = "FLOAT"
        for s_ in r.inputs:
            if s_.type == "VALUE" and s_.name == "Min":
                s_.default_value = lo
            if s_.type == "VALUE" and s_.name == "Max":
                s_.default_value = hi
        r.inputs["Seed"].default_value = sd
        return [x for x in r.outputs if x.type == "VALUE"][0]

    def math_(op, a, b=None, c_=None):
        m_ = N.new("ShaderNodeMath")
        m_.operation = op
        for i, x in enumerate((a, b, c_)):
            if x is None:
                continue
            if isinstance(x, (int, float)):
                m_.inputs[i].default_value = x
            else:
                Lk.new(x, m_.inputs[i])
        return m_.outputs[0]

    t = N.new("GeometryNodeInputSceneTime").outputs["Seconds"]
    sp = math_("MULTIPLY", t, rnd(0.7 * speed, 1.3 * speed, seed + 1))
    fr = math_("FRACT", math_("ADD", math_("DIVIDE", sp, length), rnd(0, 1, seed)))
    along = math_("MULTIPLY", fr, length)
    pos = N.new("ShaderNodeVectorMath")
    pos.operation = "SCALE"
    pos.inputs[0].default_value = tuple(V(axis).normalized())
    Lk.new(along, pos.inputs["Scale"])
    base = N.new("ShaderNodeVectorMath")
    base.operation = "ADD"
    Lk.new(pos.outputs[0], base.inputs[0])
    base.inputs[1].default_value = tuple(start)
    offs = spread_fn(N, Lk, rnd, math_, fr, seed)
    p2 = N.new("ShaderNodeVectorMath")
    p2.operation = "ADD"
    Lk.new(base.outputs[0], p2.inputs[0])
    Lk.new(offs, p2.inputs[1])
    final = p2.outputs[0]
    if any(jitter):
        jv = N.new("ShaderNodeCombineXYZ")
        Lk.new(rnd(0, 500, seed + 9), jv.inputs["X"])
        Lk.new(math_("MULTIPLY", t, 3.0), jv.inputs["Y"])
        nz = N.new("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 1.0
        Lk.new(jv.outputs[0], nz.inputs["Vector"])
        cen = N.new("ShaderNodeVectorMath")
        cen.operation = "SUBTRACT"
        Lk.new(nz.outputs["Color"], cen.inputs[0])
        cen.inputs[1].default_value = (0.5, 0.5, 0.5)
        amp = N.new("ShaderNodeVectorMath")
        amp.operation = "MULTIPLY"
        Lk.new(cen.outputs[0], amp.inputs[0])
        amp.inputs[1].default_value = tuple(jitter)
        p3 = N.new("ShaderNodeVectorMath")
        p3.operation = "ADD"
        Lk.new(final, p3.inputs[0])
        Lk.new(amp.outputs[0], p3.inputs[1])
        final = p3.outputs[0]
    pts = N.new("GeometryNodePoints")
    pts.inputs["Count"].default_value = count
    Lk.new(final, pts.inputs["Position"])
    f_in = math_("MINIMUM", math_("DIVIDE", fr, fade), 1.0)
    f_out = math_("MINIMUM", math_("DIVIDE", math_("SUBTRACT", 1.0, fr), fade), 1.0)
    rad = math_("MULTIPLY", math_("MULTIPLY", f_in, f_out), rnd(0.7 * radius, 1.3 * radius, seed + 3))
    Lk.new(rad, pts.inputs["Radius"])
    ico = N.new("GeometryNodeMeshIcoSphere")
    ico.inputs["Radius"].default_value = 1.0
    ico.inputs["Subdivisions"].default_value = subdiv
    inst = N.new("GeometryNodeInstanceOnPoints")
    Lk.new(pts.outputs["Points"], inst.inputs["Points"])
    Lk.new(ico.outputs["Mesh"], inst.inputs["Instance"])
    sv = N.new("ShaderNodeCombineXYZ")
    rr_ = N.new("GeometryNodeInputRadius")
    Lk.new(math_("MULTIPLY", rr_.outputs["Radius"], stretch), sv.inputs["X"])  # streaks along the flow (+X paths)
    Lk.new(rr_.outputs["Radius"], sv.inputs["Y"])
    Lk.new(math_("MULTIPLY", rr_.outputs["Radius"], squash), sv.inputs["Z"])
    Lk.new(sv.outputs[0], inst.inputs["Scale"])
    real = N.new("GeometryNodeRealizeInstances")
    Lk.new(inst.outputs["Instances"], real.inputs["Geometry"])
    setm = N.new("GeometryNodeSetMaterial")
    setm.inputs["Material"].default_value = material
    Lk.new(real.outputs["Geometry"], setm.inputs["Geometry"])
    Lk.new(setm.outputs["Geometry"], gout.inputs["Geometry"])
    o.data.materials.append(material)
    return o


def box_offset(du, dv):
    """spread across a rectangular cross-section: du along Y, dv along Z (half-widths, m)"""
    def fn(N, Lk, rnd, math_, fr, seed):
        cv = N.new("ShaderNodeCombineXYZ")
        Lk.new(rnd(-du, du, seed + 5), cv.inputs["Y"])
        Lk.new(rnd(-dv, dv, seed + 6), cv.inputs["Z"])
        return cv.outputs[0]
    return fn


# ════════════════════════════ STATION F — the heat pipe, cut open ════════════════════════════
CF = wipe("F.HeatPipe")
for m_ in list(bpy.data.materials):  # fresh shader chains every run (thermal_mix must not stack up)
    if m_.name.startswith(("F.", "B.air")):
        bpy.data.materials.remove(m_)
W, T, WALL, WICK = 0.008, 0.0025, 0.0003, 0.0004  # the laptop's flattened pipe
L = 0.07
SUB_T, DIE_T, PASTE, CP_T, SOLD = 0.0012, 0.0008, 0.0001, 0.003, 0.0001
F0 = V((50.0, 0.0, SUB_T + DIE_T + PASTE + CP_T + SOLD + T / 2))  # the pipe axis; the chip substrate sits on the floor
NA = 48


def stadium(w, t, u):
    c, s = math.cos(u), math.sin(u)
    return V((0.0, math.copysign(abs(c) ** 0.4, c) * w / 2, math.copysign(abs(s) ** 0.4, s) * t / 2))


def u_profile(w_out, t_out, w_in, t_in):
    outer = [stadium(w_out, t_out, math.pi + math.pi * i / NA) for i in range(NA + 1)]
    inner = [stadium(w_in, t_in, math.pi + math.pi * i / NA) for i in range(NA + 1)][::-1]
    return outer + inner


def sweep(name, loop, x0, x1, material, c):
    def build(bm):
        a = [bm.verts.new(V((x0, p.y, p.z))) for p in loop]
        b = [bm.verts.new(V((x1, p.y, p.z))) for p in loop]
        n = len(loop)
        for i in range(n):
            bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
        bm.faces.new(a[::-1])
        bm.faces.new(b)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = mesh_obj(name, build, material, c, smooth=True)
    es = o.modifiers.new("crisp", "EDGE_SPLIT")
    es.split_angle = math.radians(40)
    o.location = F0
    return o


copper = mat("F.copper", (0.95, 0.6, 0.45), metallic=1.0, rough=0.24)
cut_cu = mat("F.copper.cut", (0.98, 0.66, 0.5), metallic=1.0, rough=0.16)  # freshly cut faces: brighter
wick_m = mat("F.wick", (0.42, 0.19, 0.09), metallic=0.9, rough=0.72)  # sintered powder: deeper, matte copper
grain_m = mat("F.grain", (0.62, 0.3, 0.16), metallic=1.0, rough=0.5)
alu = mat("F.alu", (0.82, 0.83, 0.85), metallic=1.0, rough=0.3)
solder = mat("F.solder", (0.72, 0.72, 0.74), metallic=1.0, rough=0.32)
paste = mat("F.paste", (0.55, 0.56, 0.58), rough=0.75)
si = mat("F.die", (0.32, 0.34, 0.42), metallic=0.85, rough=0.14)
subst = mat("F.substrate", (0.01, 0.025, 0.016), rough=0.3, **{"Coat Weight": 0.7, "Coat Roughness": 0.08})
water = mat("F.water", (1.0, 1.0, 1.0), rough=0.02, **{"Transmission Weight": 1.0, "IOR": 1.333})
shadow_clear(water)

# the wall (copper U), with its cut faces in the brighter cut-copper material
wall = sweep("F.wall", u_profile(W, T, W - 2 * WALL, T - 2 * WALL), -L / 2, L / 2, copper, CF)
wall.data.materials.append(cut_cu)
for p in wall.data.polygons:
    if abs(p.normal.z) > 0.95 and p.center.z > -1e-6:  # the faces on the cut plane
        p.material_index = 1
# the wick (sintered copper powder) lining the wall; water saturates it, wetter toward the cold end (a gloss film)
WI_W, WI_T = W - 2 * (WALL + WICK), T - 2 * (WALL + WICK)
wick = sweep("F.wick", u_profile(W - 2 * WALL, T - 2 * WALL, WI_W, WI_T), -L / 2, L / 2, wick_m, CF)
_wt = wick_m.node_tree
_wb = _wt.nodes["Principled BSDF"]
_tc = node(_wt, "ShaderNodeTexCoord")
_sx = node(_wt, "ShaderNodeSeparateXYZ")
_wt.links.new(_tc.outputs["Object"], _sx.inputs[0])
_wet = node(_wt, "ShaderNodeMapRange")
_wt.links.new(_sx.outputs["X"], _wet.inputs["Value"])
_wet.inputs["From Min"].default_value, _wet.inputs["From Max"].default_value = -L / 2, L / 2
_wet.inputs["To Min"].default_value, _wet.inputs["To Max"].default_value = 0.05, 0.4  # a thin water film, not a glaze
_wt.links.new(_wet.outputs["Result"], _wb.inputs["Coat Weight"])
_wb.inputs["Coat Roughness"].default_value = 0.04
_wb.inputs["Coat IOR"].default_value = 1.333
# powder grains on the wick's exposed face: ~0.1 mm copper spheres, densely packed (GN, seeded)
gs = mesh_obj("F.wick.grains", lambda bm: None, None, CF)
gs.location = F0


def grain_tree():
    tree = bpy.data.node_groups.new("F.grains.gn", "GeometryNodeTree")
    tree.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N, Lk = tree.nodes, tree.links
    out = N.new("NodeGroupOutput")
    # the exposed inner surface of the wick, as a sheet
    surf = N.new("GeometryNodeObjectInfo")
    sheet = mesh_obj("F.wick.face", lambda bm: None, None, CF)
    me = sheet.data
    bm = bmesh.new()
    inner = [stadium(WI_W, WI_T, math.pi + math.pi * i / NA) for i in range(NA + 1)]
    a = [bm.verts.new(V((-L / 2, p.y, p.z))) for p in inner]
    b = [bm.verts.new(V((L / 2, p.y, p.z))) for p in inner]
    for i in range(NA):
        bm.faces.new((a[i], b[i], b[i + 1], a[i + 1]))
    bm.to_mesh(me)
    bm.free()
    sheet.hide_render = True
    sheet.hide_viewport = True
    surf.inputs["Object"].default_value = sheet
    dist = N.new("GeometryNodeDistributePointsOnFaces")
    dist.distribute_method = "POISSON"
    dist.inputs["Distance Min"].default_value = 0.000085
    dist.inputs["Density Max"].default_value = 1.4e8
    dist.inputs["Seed"].default_value = 3
    Lk.new(surf.outputs["Geometry"], dist.inputs["Mesh"])
    ico = N.new("GeometryNodeMeshIcoSphere")
    ico.inputs["Radius"].default_value = 1.0
    ico.inputs["Subdivisions"].default_value = 1
    rv = N.new("FunctionNodeRandomValue")
    rv.data_type = "FLOAT"
    [s_ for s_ in rv.inputs if s_.type == "VALUE" and s_.name == "Min"][0].default_value = 0.000038
    [s_ for s_ in rv.inputs if s_.type == "VALUE" and s_.name == "Max"][0].default_value = 0.000058
    inst = N.new("GeometryNodeInstanceOnPoints")
    Lk.new(dist.outputs["Points"], inst.inputs["Points"])
    Lk.new(ico.outputs["Mesh"], inst.inputs["Instance"])
    Lk.new([x for x in rv.outputs if x.type == "VALUE"][0], inst.inputs["Scale"])
    real = N.new("GeometryNodeRealizeInstances")
    Lk.new(inst.outputs["Instances"], real.inputs["Geometry"])
    sm = N.new("GeometryNodeSetMaterial")
    sm.inputs["Material"].default_value = grain_m
    Lk.new(real.outputs["Geometry"], sm.inputs["Geometry"])
    Lk.new(sm.outputs["Geometry"], out.inputs["Geometry"])
    return tree


gm = gs.modifiers.new("grains", "NODES")
gm.node_group = grain_tree()
gs.data.materials.append(grain_m)
# the hot end sits on the cold plate over the chip: solder, copper plate, thermal paste, die, substrate (all below
# the cut plane, so all whole)
EV0, EV1 = -L / 2, -L / 2 + 0.022
z = F0.z - T / 2
box("F.solder", (EV1 - EV0, 0.0095, SOLD), V((F0.x + (EV0 + EV1) / 2, 0, z - SOLD / 2)), solder, CF)
z -= SOLD
box("F.coldplate", (EV1 - EV0 + 0.002, 0.016, CP_T), V((F0.x + (EV0 + EV1) / 2, 0, z - CP_T / 2)), copper, CF, bevel=0.0004)
z -= CP_T
box("F.paste", (0.014, 0.011, PASTE), V((F0.x + (EV0 + EV1) / 2, 0, z - PASTE / 2)), paste, CF)
z -= PASTE
box("F.die", (0.014, 0.011, DIE_T), V((F0.x + (EV0 + EV1) / 2, 0, z - DIE_T / 2)), si, CF, bevel=0.0001)
z -= DIE_T
box("F.substrate", (0.03, 0.03, SUB_T), V((F0.x + (EV0 + EV1) / 2, 0, z - SUB_T / 2)), subst, CF, bevel=0.0003)
# the cold end runs through aluminium fins (cut at the same plane: each fin has the pipe's notch)
FN0, FN1, FP, FT = L / 2 - 0.024, L / 2 - 0.002, 0.0011, 0.00015


def fin_build(bm):
    outline = [V((0, -0.009, 0)), V((0, -0.009, -F0.z)), V((0, 0.009, -F0.z)), V((0, 0.009, 0))]  # down to the floor: the cut-away rests on it
    outline += [stadium(W, T, 2 * math.pi - math.pi * i / NA) for i in range(NA + 1)][1:-1]
    a = [bm.verts.new(p + V((-FT / 2, 0, 0))) for p in outline]
    b = [bm.verts.new(p + V((FT / 2, 0, 0))) for p in outline]
    n = len(outline)
    for i in range(n):
        bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bm.faces.new(a[::-1])
    bm.faces.new(b)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)


k = 0
x = FN0
while x <= FN1:
    fo = mesh_obj(f"F.fin{k:02d}", fin_build, alu, CF, smooth=False)
    fo.location = F0 + V((x, 0, 0))
    k += 1
    x += FP
print("HEAT PIPE: fins", k)
# vapour: leaves the wick at the hot end, streams through the core, condenses at the cold end (faint steam puffs)
steam = bpy.data.materials.new("F.vapour")
steam.use_nodes = True
_st = steam.node_tree
_st.nodes.clear()
_so = _st.nodes.new("ShaderNodeOutputMaterial")
_sv = _st.nodes.new("ShaderNodeVolumePrincipled")
_sv.inputs["Color"].default_value = (0.95, 0.97, 1.0, 1)
_sv.inputs["Density"].default_value = 70.0  # the faintest trace of wisps: the shimmer below carries the flow
_st.links.new(_sv.outputs["Volume"], _so.inputs["Volume"])
vap = flow("F.vapour", CF, 150, 31, F0 + V((-L / 2 + 0.004, 0, -0.0001)), (1, 0, 0), L - 0.008, 0.028,
           box_offset(WI_W / 2 - 0.0009, 0.00025), 0.0006, steam, fade=0.2, jitter=(0.002, 0.0006, 0.00015), subdiv=2,
           squash=0.45, stretch=4.0)  # few, distinct streaks: you can follow each one from the hot end to the cold end
# the vapour itself, as hot vapour really looks: a shimmer that bends the wick seen through it, drifting from the hot
# end to the cold end at the vapour's speed (a thin refracting sheet, its rippled face scrolled along +X by scene time)
haze_m = bpy.data.materials.new("F.vapour.haze")
haze_m.use_nodes = True
_ht = haze_m.node_tree
_ht.nodes.clear()
_ho = _ht.nodes.new("ShaderNodeOutputMaterial")
_hg = _ht.nodes.new("ShaderNodeBsdfGlass")
_hg.inputs["Roughness"].default_value = 0.0
_hg.inputs["IOR"].default_value = 1.04
_htc = _ht.nodes.new("ShaderNodeTexCoord")
_htime = _ht.nodes.new("ShaderNodeValue")
_htime.label = "time"
_fc = _htime.outputs[0].driver_add("default_value")
_fc.driver.expression = "frame / 30"
_hshift = _ht.nodes.new("ShaderNodeVectorMath")
_hshift.operation = "MULTIPLY_ADD"
_ht.links.new(_htime.outputs[0], _hshift.inputs[1])  # vector × (−speed, 0, 0) + coordinates
_hshift.inputs[0].default_value = (-0.028, 0, -0.004)
_ht.links.new(_htc.outputs["Object"], _hshift.inputs[2])
_hn = _ht.nodes.new("ShaderNodeTexNoise")
_hn.noise_dimensions = "4D"
_hn.inputs["Scale"].default_value = 900.0  # ripples ~1 mm across
_hn.inputs["Detail"].default_value = 3.0
_ht.links.new(_hshift.outputs[0], _hn.inputs["Vector"])
_ht.links.new(_htime.outputs[0], _hn.inputs["W"])  # and they churn a little as they go
_hb = _ht.nodes.new("ShaderNodeBump")
_hb.inputs["Strength"].default_value = 0.35
_hb.inputs["Distance"].default_value = 0.00008
_ht.links.new(_hn.outputs["Fac"], _hb.inputs["Height"])
_ht.links.new(_hb.outputs["Normal"], _hg.inputs["Normal"])
_ht.links.new(_hg.outputs["BSDF"], _ho.inputs["Surface"])
shadow_clear(haze_m)
box("F.vapour.haze", (L - 0.008, WI_W - 0.0004, 0.0003), F0 + V((0, 0, -0.00025)), haze_m, CF)
bpy.data.objects["F.vapour.haze"].visible_glossy = False  # the sheet must not mirror the studio: only bend the view

# the returning water: tiny beads creeping back through the wick floor (10× slower), visible as glints
ret = flow("F.water.return", CF, 160, 41, F0 + V((L / 2 - 0.004, 0, -WI_T / 2 + 0.00004)), (-1, 0, 0), L - 0.008, 0.0028,
           box_offset(WI_W / 2 - 0.0012, 0.0), 0.00014, water, fade=0.1, jitter=(0.001, 0.0003, 0.0), squash=0.45, subdiv=2)
_fl = mesh_obj("F.floor", lambda bm: bmesh.ops.create_circle(bm, cap_ends=True, segments=96, radius=1.5), None, CF)
_fl.location = V((F0.x, 0, 0))
_fl.is_shadow_catcher = True
for o in CF.objects:
    o["station"] = "F"
# thermal: a heat pipe is nearly isothermal (a few °C end to end): chip hottest, the pipe uniformly hot, fins cooler
for m_, t_ in ((si, 0.95), (subst, 0.7), (paste, 0.9), (copper, 0.8), (cut_cu, 0.79), (wick_m, 0.79), (grain_m, 0.79),
               (solder, 0.83), (alu, 0.6)):
    thermal_mix(m_, temp_const=t_)
print("STATION F built")



# ════════════════════════════ AIRFLOW inside the laptop (station B) ════════════════════════════
def flow_curves(name, c, paths, count, seed, speed, radius, material, fade=0.1, jitter=0.0006):
    """particles riding along a set of polyline paths (one curves object, sampled by factor + curve index),
    driven by scene time; speed in path-lengths per second"""
    cu = bpy.data.curves.new(name + ".paths", "CURVE")
    cu.dimensions = "3D"
    for pts in paths:
        sp = cu.splines.new("POLY")
        sp.points.add(len(pts) - 1)
        for i, p_ in enumerate(pts):
            sp.points[i].co = (*p_, 1)
    po = bpy.data.objects.new(name + ".paths", cu)
    c.objects.link(po)
    po.hide_render = True
    me = bpy.data.meshes.new(name)
    o = bpy.data.objects.new(name, me)
    c.objects.link(o)
    tree = bpy.data.node_groups.new(name + ".gn", "GeometryNodeTree")
    tree.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    mod = o.modifiers.new("flow", "NODES")
    mod.node_group = tree
    N, Lk = tree.nodes, tree.links
    gout = N.new("NodeGroupOutput")

    def rnd(lo, hi, sd, kind="FLOAT"):
        r = N.new("FunctionNodeRandomValue")
        r.data_type = kind
        for s_ in r.inputs:
            if s_.name == "Min" and s_.enabled and s_.type in ("VALUE", "INT"):
                s_.default_value = lo
            if s_.name == "Max" and s_.enabled and s_.type in ("VALUE", "INT"):
                s_.default_value = hi
        r.inputs["Seed"].default_value = sd
        return [x for x in r.outputs if x.enabled][0]

    def math_(op, a, b=None):
        m_ = N.new("ShaderNodeMath")
        m_.operation = op
        for i, x in enumerate((a, b)):
            if x is None:
                continue
            if isinstance(x, (int, float)):
                m_.inputs[i].default_value = x
            else:
                Lk.new(x, m_.inputs[i])
        return m_.outputs[0]

    oi = N.new("GeometryNodeObjectInfo")
    oi.inputs["Object"].default_value = po
    oi.transform_space = "RELATIVE"
    t = N.new("GeometryNodeInputSceneTime").outputs["Seconds"]
    fr = math_("FRACT", math_("ADD", math_("MULTIPLY", t, rnd(0.75 * speed, 1.25 * speed, seed + 1)), rnd(0, 1, seed)))
    smp = N.new("GeometryNodeSampleCurve")
    smp.mode = "FACTOR"
    smp.use_all_curves = False
    Lk.new(oi.outputs["Geometry"], smp.inputs["Curves"])
    Lk.new(fr, smp.inputs["Factor"])
    Lk.new(rnd(0, len(paths) - 1, seed + 2, "INT"), smp.inputs["Curve Index"])
    jv = N.new("ShaderNodeCombineXYZ")
    Lk.new(rnd(0, 500, seed + 9), jv.inputs["X"])
    Lk.new(math_("MULTIPLY", t, 4.0), jv.inputs["Y"])
    nz = N.new("ShaderNodeTexNoise")
    Lk.new(jv.outputs[0], nz.inputs["Vector"])
    cen = N.new("ShaderNodeVectorMath")
    cen.operation = "SUBTRACT"
    Lk.new(nz.outputs["Color"], cen.inputs[0])
    cen.inputs[1].default_value = (0.5, 0.5, 0.5)
    amp = N.new("ShaderNodeVectorMath")
    amp.operation = "SCALE"
    Lk.new(cen.outputs[0], amp.inputs[0])
    amp.inputs["Scale"].default_value = jitter
    pos = N.new("ShaderNodeVectorMath")
    pos.operation = "ADD"
    Lk.new(smp.outputs["Position"], pos.inputs[0])
    Lk.new(amp.outputs[0], pos.inputs[1])
    pts_ = N.new("GeometryNodePoints")
    pts_.inputs["Count"].default_value = count
    Lk.new(pos.outputs[0], pts_.inputs["Position"])
    f_in = math_("MINIMUM", math_("DIVIDE", fr, fade), 1.0)
    f_out = math_("MINIMUM", math_("DIVIDE", math_("SUBTRACT", 1.0, fr), fade), 1.0)
    Lk.new(math_("MULTIPLY", math_("MULTIPLY", f_in, f_out), rnd(0.7 * radius, 1.3 * radius, seed + 3)), pts_.inputs["Radius"])
    ico = N.new("GeometryNodeMeshIcoSphere")
    ico.inputs["Radius"].default_value = 1.0
    ico.inputs["Subdivisions"].default_value = 2
    inst = N.new("GeometryNodeInstanceOnPoints")
    Lk.new(pts_.outputs["Points"], inst.inputs["Points"])
    Lk.new(ico.outputs["Mesh"], inst.inputs["Instance"])
    Lk.new(N.new("GeometryNodeInputRadius").outputs["Radius"], inst.inputs["Scale"])
    real = N.new("GeometryNodeRealizeInstances")
    Lk.new(inst.outputs["Instances"], real.inputs["Geometry"])
    sm = N.new("GeometryNodeSetMaterial")
    sm.inputs["Material"].default_value = material
    Lk.new(real.outputs["Geometry"], sm.inputs["Geometry"])
    Lk.new(sm.outputs["Geometry"], gout.inputs["Geometry"])
    o.data.materials.append(material)
    return o


CB = bpy.data.collections["B.Inside"]
for o in [o for o in CB.objects if o.name.startswith("B.air")]:
    bpy.data.objects.remove(o, do_unlink=True)
fan = bpy.data.objects["B.fan.impeller"]
FC = fan.matrix_world.translation.copy()  # axle, at the impeller's base
fins = bpy.data.objects.get("B.finstack")
flo, fhi = (V([min((fins.matrix_world @ V(cn))[i] for cn in fins.bound_box) for i in range(3)]),
            V([max((fins.matrix_world @ V(cn))[i] for cn in fins.bound_box) for i in range(3)]))
WALL_X = flo.x - 0.0015  # the outside face of the left wall
print("AIR: fan", [round(v, 4) for v in FC], "fins x", round(flo.x, 4), round(fhi.x, 4), "y", round(flo.y, 4), round(fhi.y, 4))
import random as _r
rr = _r.Random(77)
paths = []
NP = 48
for k in range(NP):
    # in: drawn down into the fan's face (the intake) from above
    a0 = rr.uniform(0, 2 * math.pi)
    r0 = rr.uniform(0.004, 0.011)
    zt = FC.z + rr.uniform(0.002, 0.0055)  # inside the blades' height
    pts = [FC + V((r0 * math.cos(a0), r0 * math.sin(a0), 0.03)), FC + V((r0 * 1.05 * math.cos(a0), r0 * 1.05 * math.sin(a0), 0.012))]
    # spun counter-clockwise (the impeller's direction) and thrown outward through the blades
    turns = rr.uniform(0.35, 0.8)
    yk = rr.uniform(flo.y + 0.002, fhi.y - 0.002)  # where this streak crosses the fins
    a_end = math.pi / 2 + math.asin(max(-0.95, min(0.95, (yk - FC.y) / 0.026))) * 0.0  # leaves the impeller tangentially
    a_start = a0
    while a_start > a_end - 2 * math.pi * turns:
        a_start -= 2 * math.pi
    a_start = a_end - 2 * math.pi * turns
    for i in range(1, 13):
        u = i / 12
        a = a_start + (a_end - a_start) * u
        r = r0 + (0.025 - r0) * u ** 0.8
        pts.append(V((FC.x + r * math.cos(a), FC.y + r * math.sin(a), zt)))
    # out of the scroll's mouth toward −X, fanning across the fin stack's width, through the fins and the side slots
    last = pts[-1]
    pts.append(V((last.x - 0.008, (last.y + yk) / 2, zt)))
    pts.append(V((fhi.x + 0.001, yk, zt)))
    pts.append(V((flo.x - 0.001, yk, zt)))
    pts.append(V((WALL_X - 0.006, yk + rr.uniform(-0.002, 0.002), zt + 0.001)))
    pts.append(V((WALL_X - 0.03, yk + rr.uniform(-0.006, 0.006), zt + rr.uniform(0.002, 0.006))))
    paths.append(pts)
air = bpy.data.materials.get("B.air.mat") or bpy.data.materials.new("B.air.mat")
air.use_nodes = True
_at = air.node_tree
_at.nodes.clear()
_ao = _at.nodes.new("ShaderNodeOutputMaterial")
_av = _at.nodes.new("ShaderNodeVolumePrincipled")
_av.inputs["Color"].default_value = (0.92, 0.96, 1.0, 1)
_av.inputs["Density"].default_value = 35.0  # barely there: dense streaks read as snow; the blades' blur carries the motion
_at.links.new(_av.outputs["Volume"], _ao.inputs["Volume"])
airo = flow_curves("B.air", CB, paths, 700, 51, 0.55, 0.0009, air, fade=0.08, jitter=0.0012)
for o in CB.objects:
    if o.name.startswith("B.air"):
        o["station"] = "B"
        o["fx"] = "air"  # shown only when a shot asks for it: rig.isolate("B", fx=("air",))
print("AIRFLOW built:", NP, "paths")


def shimmer_mat(name, drift, scale, strength, ior=1.03):
    """hot air as a camera actually sees it: a ripple that bends what is behind it, drifting with the flow
    (a thin refracting slab; its rippled faces scroll by `drift` m/s of scene time and churn as they go)"""
    m_ = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m_.use_nodes = True
    t_ = m_.node_tree
    t_.nodes.clear()
    o_ = t_.nodes.new("ShaderNodeOutputMaterial")
    g_ = t_.nodes.new("ShaderNodeBsdfGlass")
    g_.inputs["Roughness"].default_value = 0.0
    g_.inputs["IOR"].default_value = ior
    tc_ = t_.nodes.new("ShaderNodeTexCoord")
    tm_ = t_.nodes.new("ShaderNodeValue")
    tm_.label = "time"
    d_ = tm_.outputs[0].driver_add("default_value")
    d_.driver.expression = "frame / 30"
    sh_ = t_.nodes.new("ShaderNodeVectorMath")
    sh_.operation = "MULTIPLY_ADD"
    sh_.inputs[0].default_value = tuple(-v for v in drift)
    t_.links.new(tm_.outputs[0], sh_.inputs[1])
    t_.links.new(tc_.outputs["Object"], sh_.inputs[2])
    n_ = t_.nodes.new("ShaderNodeTexNoise")
    n_.noise_dimensions = "4D"
    n_.inputs["Scale"].default_value = scale
    n_.inputs["Detail"].default_value = 3.0
    t_.links.new(sh_.outputs[0], n_.inputs["Vector"])
    t_.links.new(tm_.outputs[0], n_.inputs["W"])
    bp_ = t_.nodes.new("ShaderNodeBump")
    bp_.inputs["Strength"].default_value = strength
    bp_.inputs["Distance"].default_value = 0.0001
    t_.links.new(n_.outputs["Fac"], bp_.inputs["Height"])
    t_.links.new(bp_.outputs["Normal"], g_.inputs["Normal"])
    t_.links.new(g_.outputs["BSDF"], o_.inputs["Surface"])
    shadow_clear(m_)
    return m_


# the exhaust leaving the side slots: a shimmer just outside the wall, carried outward and rising as it cools
vh = box("B.vent.haze", (0.006, (fhi.y - flo.y) + 0.008, 0.012), V((WALL_X - 0.006, (flo.y + fhi.y) / 2, (flo.z + fhi.z) / 2 + 0.002)),
         shimmer_mat("B.vent.haze.mat", (-0.05, 0.0, 0.03), 500.0, 0.3), CB)
vh.visible_glossy = False
vh["station"] = "B"
vh["fx"] = "haze"  # only in the vents shot
print("VENT HAZE built")


# ════════════════════════════ THERMAL view of the laptop (A) and the man (E) ════════════════════════════
def tv(celsius):
    """°C → position on the iron palette, the same scale in every thermal shot: 20 °C → 0.1 … 55 °C → 0.95"""
    return 0.1 + (celsius - 20.0) / 35.0 * 0.85


def field(m, coord, base_c, blobs):
    """temperature socket: base + Σ amp·exp(−|p − c|² / 2σ²); blobs [(centre (x, y, z), σ m, +°C)] in the material's
    `coord` space ("Object" or "World")"""
    nt = m.node_tree
    tc = node(nt, "ShaderNodeTexCoord")
    src = tc.outputs["Object"] if coord == "Object" else node(nt, "ShaderNodeNewGeometry").outputs["Position"]
    acc = None
    for cen, sig, amp in blobs:
        d = node(nt, "ShaderNodeVectorMath", operation="DISTANCE")
        nt.links.new(src, d.inputs[0])
        d.inputs[1].default_value = tuple(cen)
        sq = node(nt, "ShaderNodeMath", operation="POWER")
        nt.links.new(d.outputs["Value"], sq.inputs[0])
        sq.inputs[1].default_value = 2.0
        ex = node(nt, "ShaderNodeMath", operation="MULTIPLY")
        nt.links.new(sq.outputs[0], ex.inputs[0])
        ex.inputs[1].default_value = -1.0 / (2 * sig * sig)
        e = node(nt, "ShaderNodeMath", operation="EXPONENT")
        nt.links.new(ex.outputs[0], e.inputs[0])
        a = node(nt, "ShaderNodeMath", operation="MULTIPLY")
        nt.links.new(e.outputs[0], a.inputs[0])
        a.inputs[1].default_value = amp / 35.0 * 0.85
        if acc is None:
            acc = a.outputs[0]
        else:
            ad = node(nt, "ShaderNodeMath", operation="ADD")
            nt.links.new(acc, ad.inputs[0])
            nt.links.new(a.outputs[0], ad.inputs[1])
            acc = ad.outputs[0]
    b = node(nt, "ShaderNodeMath", operation="ADD")
    nt.links.new(acc, b.inputs[0])
    b.inputs[1].default_value = tv(base_c)
    return b.outputs[0]


def thermal_once(m, **kw):
    if m is None or m.get("thermal_done") or not m.use_nodes:
        return
    out = [n for n in m.node_tree.nodes if n.type == "OUTPUT_MATERIAL"]
    if not out or not out[0].inputs["Surface"].links:
        return
    thermal_mix(m, **kw)
    m["thermal_done"] = True


# laptop under a long render (laptop coordinates: the chip sits under x −0.035, y 0.055; the only exhaust is the slot
# row on the left side, x −0.18, y 0.018…0.079): keyboard deck above the chip ~45 °C, the left edge by the slots
# ~50 °C, palm rests ~31 °C, the display ~35 °C everywhere (a thermal camera does not see what is ON a screen)
# the field is in each object's own coordinates; parts built as boxes (trackpad, its gap) carry their own location,
# so bake those transforms into their meshes (the man's copies share the meshes: they get just the laptop offset)
_lap_root = next((o for o in bpy.data.objects if o.name.startswith("E.lap.") and o.parent is None), None)
_LOFF = _lap_root.matrix_world.translation.copy() if _lap_root else V((0, 0, 0))
for o in [o for o in bpy.data.objects if o.get("station") == "A" and o.type == "MESH" and o.parent is None
          and not o.name.startswith(("A.ui", "A.floor"))]:
    if o.matrix_world != Matrix.Identity(4) and o.data.users <= 2:
        M_ = o.matrix_world.copy()
        o.data.transform(M_)
        o.matrix_world = Matrix.Identity(4)
        for c_ in bpy.data.objects:
            if c_ is not o and c_.data is o.data:
                c_.matrix_world = Matrix.Translation(_LOFF)
        print("THERMAL: baked transform of", o.name)
LAP_BLOBS = [((-0.035, 0.055, 0.012), 0.065, 14.0), ((-0.18, 0.048, 0.008), 0.032, 19.0), ((0.0, 0.07, 0.012), 0.11, 4.0)]
lap_mats = set()
for o in bpy.data.objects:
    if o.get("station") in ("A", "E") and o.type in ("MESH", "FONT", "CURVE") and o.name.startswith(("A.", "E.lap.")):
        for m_ in o.data.materials:
            if m_ and not m_.name.endswith("floor.mat"):
                lap_mats.add(m_)
for m_ in lap_mats:
    if m_.name.startswith("A.ui") or "screenglass" in m_.name:
        thermal_once(m_, temp_const=tv(35))
    else:
        thermal_once(m_, temp=field(m_, "Object", 31.0, LAP_BLOBS))
# the man: skin ~34 °C (the face a little warmer), clothes ~30 °C, hair ~28 °C; desk ~23 °C, warmer under the laptop
# and in a streak where the exhaust blows across it (the AIR itself stays invisible on a thermal camera)
body = bpy.data.objects.get("E.body")
if body:
    em = body.data.materials[0]
    skin = [n for n in em.node_tree.nodes if n.type == "TEX_IMAGE" and n.image and "skin_mask" in n.image.name][0]
    sk = node(em.node_tree, "ShaderNodeMath", operation="MULTIPLY_ADD")
    em.node_tree.links.new(skin.outputs["Color"], sk.inputs[0])
    sk.inputs[1].default_value = tv(34.5) - tv(30.0)
    sk.inputs[2].default_value = tv(30.0)
    thermal_once(em, temp=sk.outputs[0])
hair = bpy.data.objects.get("E.hair")
if hair:
    thermal_once(hair.data.materials[0], temp_const=tv(28.5))
lap_obj = next((o for o in bpy.data.objects if o.name.startswith("E.lap.") and o.parent is None), None)
LAPW = lap_obj.matrix_world.translation.copy() if lap_obj else V((40, 0, 0.79))
for o in bpy.data.objects:
    if o.get("station") == "E" and o.type == "MESH" and not o.name.startswith(("E.lap.", "E.body", "E.floor")):
        for m_ in o.data.materials:
            if not m_:
                continue
            if "desk" in m_.name:
                thermal_once(m_, temp=field(m_, "World", 23.0, [(LAPW + V((0, 0.0, 0)), 0.11, 6.0), (LAPW + V((-0.26, 0.05, 0)), 0.06, 7.0)]))
            else:
                thermal_once(m_, temp_const=tv(24.0))  # the chair (the seat under him is hidden by his body)
_af = bpy.data.materials.get("A.floor.mat")
if _af:
    thermal_once(_af, temp_const=tv(22.0))  # the studio floor at room temperature
print("THERMAL: laptop materials", len(lap_mats), "laptop at", [round(v, 3) for v in LAPW])
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/s03_set.blend"))
print("S03 EXTRA BUILT")
