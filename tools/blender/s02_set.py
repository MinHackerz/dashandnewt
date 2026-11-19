"""Short s02 "Why You Shiver" — the set, at real-world scale, as four stations on one blue studio backdrop.

    Blender -b --python tools/blender/s02_set.py
Builds blender/s02_set.blend:
  A (origin)   the bus stop: snow ground, falling snow, a bus-stop sign, Dash (Mixamo Ch42 from mixamo_cast.blend) in
               his tee, denim shorts and orange scarf, hugging himself; a thermal-camera look that can be keyed on.
  B (x = 10)   the see-through arm: Dash's own upper arm and forearm, skin that turns to glass, humerus, biceps, triceps.
  C (x = 20)   the jaw: Dash's head in profile, skin that turns to glass, teeth and the jaw muscle (masseter).
  D (x = 30)   the skin macro: forearm skin with hair follicles; goosebumps rise and the hairs stand up.
Animation (shiver, glows, bumps) is keyed by s02_shots.py on the word-pinned timeline.
"""
import math
import os
import re

import bmesh
import bpy
from mathutils import Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
A = os.path.join(ROOT, "blender/assets")
sc = bpy.context.scene
V = Vector
UP = V((0, 0, 1))
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)


def node(nt, kind, **kw):
    n = nt.nodes.new(kind)
    for k, v in kw.items():
        if k in n.inputs:
            n.inputs[k].default_value = v
        else:
            setattr(n, k, v)
    return n


def mat(name, color=(0.8, 0.8, 0.8), metallic=0.0, rough=0.5, **extra):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    for k, v in extra.items():
        b.inputs[k].default_value = v
    return m


def mesh_obj(name, build, material=None, coll=None):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    build(bm)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    (coll or sc.collection).objects.link(o)
    if material:
        o.data.materials.append(material)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def coll(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in sc.collection.children:
        sc.collection.children.link(c)
    return c


# ─── look: blue backdrop (camera rays only) + Poly Haven studio HDRI for light ─────
w = bpy.data.worlds.new("Studio")
sc.world = w
w.use_nodes = True
nt = w.node_tree
nt.nodes.clear()
wout = node(nt, "ShaderNodeOutputWorld")
env = node(nt, "ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(A, "polyhaven/blue_photo_studio/blue_photo_studio_2k.hdr"), check_existing=True)
bg_env = node(nt, "ShaderNodeBackground", Strength=0.8)
nt.links.new(env.outputs["Color"], bg_env.inputs["Color"])
tc = node(nt, "ShaderNodeTexCoord")
sep = node(nt, "ShaderNodeSeparateXYZ")
nt.links.new(tc.outputs["Window"], sep.inputs[0])
ramp = node(nt, "ShaderNodeValToRGB")
ramp.color_ramp.elements[0].color = (0.50, 0.78, 0.98, 1)
ramp.color_ramp.elements[1].color = (0.10, 0.42, 0.88, 1)
nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"])
# thermal: the backdrop goes cold (deep indigo) — keyed through the value node "thermal_k"
th_bg = node(nt, "ShaderNodeMix", data_type="RGBA")
th_k = node(nt, "ShaderNodeValue", name="thermal_k", label="thermal_k")
th_k.outputs[0].default_value = 0.0
nt.links.new(th_k.outputs[0], th_bg.inputs["Factor"])
nt.links.new(ramp.outputs["Color"], th_bg.inputs[6])
th_bg.inputs[7].default_value = (0.012, 0.004, 0.05, 1)
cam_bg = node(nt, "ShaderNodeBackground", Strength=1.0)
nt.links.new(th_bg.outputs[2], cam_bg.inputs["Color"])
lp = node(nt, "ShaderNodeLightPath")
mix = node(nt, "ShaderNodeMixShader")
nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
nt.links.new(bg_env.outputs["Background"], mix.inputs[1])
nt.links.new(cam_bg.outputs["Background"], mix.inputs[2])
nt.links.new(mix.outputs["Shader"], wout.inputs["Surface"])

# ─── thermal camera: every material on station A can blend to an iron-palette emission ─────
IRON = [(0.0, (0.01, 0.0, 0.04)), (0.22, (0.10, 0.0, 0.40)), (0.45, (0.62, 0.03, 0.42)), (0.66, (1.0, 0.30, 0.02)),
        (0.84, (1.0, 0.78, 0.10)), (1.0, (1.0, 0.98, 0.75))]


def thermal_inject(m, temp_attr=None, temp_const=0.3):
    """m's surface → mix(original, thermal emission) by the value node thermal_k. Temperature comes from the colour
    attribute `temp_attr` (0 cold … 1 warm) or a constant; the value node cold_k (0→1) cools what's cold (extremities)
    further, so the hands and nose fade to blue on cue."""
    if m.get("thermal"):
        return
    m["thermal"] = True
    nt = m.node_tree
    out = [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL" and n.is_active_output][0]
    src = out.inputs["Surface"].links[0].from_socket if out.inputs["Surface"].is_linked else None
    k = node(nt, "ShaderNodeValue", name="thermal_k", label="thermal_k")
    k.outputs[0].default_value = 0.0
    ck = node(nt, "ShaderNodeValue", name="cold_k", label="cold_k")
    ck.outputs[0].default_value = 0.0
    if temp_attr:
        at = node(nt, "ShaderNodeVertexColor", layer_name=temp_attr)
        tsock = node(nt, "ShaderNodeSeparateColor")
        nt.links.new(at.outputs["Color"], tsock.inputs["Color"])
        tval = tsock.outputs["Red"]
    else:
        cv = node(nt, "ShaderNodeValue")
        cv.outputs[0].default_value = temp_const
        tval = cv.outputs[0]
    # cooled = t - cold_k * 0.35 * (1 - t)  (the colder a part already is, the more it drops)
    inv = node(nt, "ShaderNodeMath", operation="SUBTRACT")
    inv.inputs[0].default_value = 1.0
    nt.links.new(tval, inv.inputs[1])
    drop = node(nt, "ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(inv.outputs[0], drop.inputs[0])
    nt.links.new(ck.outputs[0], drop.inputs[1])
    drop2 = node(nt, "ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(drop.outputs[0], drop2.inputs[0])
    drop2.inputs[1].default_value = 0.55
    cooled = node(nt, "ShaderNodeMath", operation="SUBTRACT", use_clamp=True)
    nt.links.new(tval, cooled.inputs[0])
    nt.links.new(drop2.outputs[0], cooled.inputs[1])
    # a little sensor noise
    nz = node(nt, "ShaderNodeTexNoise", Scale=60.0, Detail=2.0)
    nzm = node(nt, "ShaderNodeMath", operation="MULTIPLY_ADD")
    nt.links.new(nz.outputs["Fac"], nzm.inputs[0])
    nzm.inputs[1].default_value = 0.05
    nt.links.new(cooled.outputs[0], nzm.inputs[2])
    r = node(nt, "ShaderNodeValToRGB")
    els = r.color_ramp.elements
    els[0].position, els[0].color = IRON[0][0], (*IRON[0][1], 1)
    els[1].position, els[1].color = IRON[-1][0], (*IRON[-1][1], 1)
    for pos, col in IRON[1:-1]:
        e = els.new(pos)
        e.color = (*col, 1)
    nt.links.new(nzm.outputs[0], r.inputs["Fac"])
    em = node(nt, "ShaderNodeEmission", Strength=1.0)
    nt.links.new(r.outputs["Color"], em.inputs["Color"])
    mx = node(nt, "ShaderNodeMixShader")
    nt.links.new(k.outputs[0], mx.inputs["Fac"])
    if src:
        nt.links.new(src, mx.inputs[1])
    nt.links.new(em.outputs["Emission"], mx.inputs[2])
    nt.links.new(mx.outputs["Shader"], out.inputs["Surface"])


# ════════════════════════════ STATION A — the bus stop ════════════════════════════
CA = coll("A.BusStop")

# snow ground: Poly Haven "snow_02" (CC0) scan on a grid disc, gently lumpy
SNOW = os.path.join(A, "polyhaven/snow_02/textures")
snow = bpy.data.materials.new("snow")
snow.use_nodes = True
snt = snow.node_tree
sb = snt.nodes["Principled BSDF"]
stc = node(snt, "ShaderNodeTexCoord")
smp = node(snt, "ShaderNodeMapping")
smp.inputs["Scale"].default_value = (0.8, 0.8, 0.8)
snt.links.new(stc.outputs["Object"], smp.inputs["Vector"])


def stex(fn, noncolor):
    t = node(snt, "ShaderNodeTexImage")
    t.image = bpy.data.images.load(os.path.join(SNOW, fn), check_existing=True)
    if noncolor:
        t.image.colorspace_settings.name = "Non-Color"
    snt.links.new(smp.outputs["Vector"], t.inputs["Vector"])
    return t


snt.links.new(stex("snow_02_diff_2k.jpg", False).outputs["Color"], sb.inputs["Base Color"])
snt.links.new(stex("snow_02_rough_2k.jpg", True).outputs["Color"], sb.inputs["Roughness"])
snm = node(snt, "ShaderNodeNormalMap", Strength=1.0)
snt.links.new(stex("snow_02_nor_gl_2k.exr", True).outputs["Color"], snm.inputs["Color"])
snt.links.new(snm.outputs["Normal"], sb.inputs["Normal"])
sb.inputs["Subsurface Weight"].default_value = 0.5
sb.inputs["Subsurface Scale"].default_value = 0.02
sb.inputs["Subsurface Radius"].default_value = (0.8, 0.9, 1.0)


def ground(bm):
    bmesh.ops.create_grid(bm, x_segments=160, y_segments=160, size=3.2)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.xy.length > 3.2], context="VERTS")


g = mesh_obj("A.snow", ground, snow, CA)
dsp = g.modifiers.new("lumps", "DISPLACE")
tx = bpy.data.textures.new("snowlumps", "CLOUDS")
tx.noise_scale = 0.6
dsp.texture = tx
dsp.texture_coords = "GLOBAL"
dsp.strength = 0.05
dsp.mid_level = 0.5
# cyclorama: toward its rim the snow fades into the backdrop (camera rays only), so there is no horizon edge
_bsdf_out = snt.nodes["Material Output"].inputs["Surface"].links[0].from_socket
_tw = node(snt, "ShaderNodeTexCoord")
_sw = node(snt, "ShaderNodeSeparateXYZ")
snt.links.new(_tw.outputs["Window"], _sw.inputs[0])
_rw = node(snt, "ShaderNodeValToRGB")
_rw.color_ramp.elements[0].color = (0.50, 0.78, 0.98, 1)
_rw.color_ramp.elements[1].color = (0.10, 0.42, 0.88, 1)
snt.links.new(_sw.outputs["Y"], _rw.inputs["Fac"])
_ew = node(snt, "ShaderNodeEmission")
snt.links.new(_rw.outputs["Color"], _ew.inputs["Color"])
_ow = node(snt, "ShaderNodeSeparateXYZ")
snt.links.new(_tw.outputs["Object"], _ow.inputs[0])
_cxy = node(snt, "ShaderNodeCombineXYZ")
snt.links.new(_ow.outputs["X"], _cxy.inputs["X"])
snt.links.new(_ow.outputs["Y"], _cxy.inputs["Y"])
_rr = node(snt, "ShaderNodeVectorMath", operation="LENGTH")
snt.links.new(_cxy.outputs[0], _rr.inputs[0])
_fd = node(snt, "ShaderNodeMapRange", interpolation_type="SMOOTHSTEP")
snt.links.new(_rr.outputs["Value"], _fd.inputs["Value"])
_fd.inputs["From Min"].default_value = 1.7
_fd.inputs["From Max"].default_value = 3.0
_lp = node(snt, "ShaderNodeLightPath")
_cf = node(snt, "ShaderNodeMath", operation="MULTIPLY")
snt.links.new(_fd.outputs["Result"], _cf.inputs[0])
snt.links.new(_lp.outputs["Is Camera Ray"], _cf.inputs[1])
_mw = node(snt, "ShaderNodeMixShader")
snt.links.new(_cf.outputs[0], _mw.inputs["Fac"])
snt.links.new(_bsdf_out, _mw.inputs[1])
snt.links.new(_ew.outputs["Emission"], _mw.inputs[2])
snt.links.new(_mw.outputs["Shader"], snt.nodes["Material Output"].inputs["Surface"])
thermal_inject(snow, temp_const=0.12)

# bus-stop sign: a steel pole with a red-and-white plate
steel = mat("sign.steel", (0.62, 0.64, 0.66), metallic=1.0, rough=0.35)
_sn = node(steel.node_tree, "ShaderNodeTexNoise", Scale=60.0, Detail=6.0)
_sr = node(steel.node_tree, "ShaderNodeMapRange")
steel.node_tree.links.new(_sn.outputs["Fac"], _sr.inputs["Value"])
_sr.inputs["To Min"].default_value, _sr.inputs["To Max"].default_value = 0.22, 0.55
steel.node_tree.links.new(_sr.outputs["Result"], steel.node_tree.nodes["Principled BSDF"].inputs["Roughness"])
thermal_inject(steel, temp_const=0.08)


def pole(bm):
    bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=0.03, radius2=0.03, depth=2.6)
    bmesh.ops.translate(bm, vec=(0, 0, 1.3), verts=bm.verts)


pl = mesh_obj("A.pole", pole, steel, CA)
pl.location = (-0.85, 0.55, 0)
plate_m = mat("sign.plate", (0.19, 0.004, 0.005), rough=0.35, **{"Coat Weight": 0.35})
thermal_inject(plate_m, temp_const=0.1)


def plate(bm):
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(0.42, 0.02, 0.56), verts=bm.verts)


pt = mesh_obj("A.plate", plate, plate_m, CA)
pt.location = (-0.85, 0.53, 2.25)
bv = pt.modifiers.new("bevel", "BEVEL")
bv.width, bv.segments = 0.02, 4
ink = mat("sign.ink", (0.97, 0.97, 0.97), rough=0.3)
thermal_inject(ink, temp_const=0.1)
for txt, z, size in (("BUS", 2.4, 0.11), ("STOP", 2.085, 0.1)):
    cu = bpy.data.curves.new("A.sign." + txt, "FONT")
    cu.body = txt
    cu.align_x, cu.align_y = "CENTER", "CENTER"
    cu.size = size
    cu.extrude = 0.003
    cu.offset = size * 0.04
    to = bpy.data.objects.new("A.sign." + txt, cu)
    CA.objects.link(to)
    to.data.materials.append(ink)
    to.location = (-0.85, 0.515, z)
    to.rotation_euler = (math.radians(90), 0, 0)
for o in (pl, pt):
    for p in o.data.polygons:
        p.use_smooth = True


def boxo(name, size, loc, material, bevel=0.003):
    o = mesh_obj(name, lambda bm: (bmesh.ops.create_cube(bm, size=1.0), bmesh.ops.scale(bm, vec=size, verts=bm.verts)), material, CA)
    o.location = loc
    bv_ = o.modifiers.new("bevel", "BEVEL")
    bv_.width, bv_.segments = bevel, 3
    return o


# white border: a slightly larger white plate behind the red one
boxo("A.plate.border", (0.45, 0.012, 0.59), (-0.85, 0.538, 2.25), ink, 0.012)
# bus pictogram (white): body, windows cut as red panes, wheels
boxo("A.bus.body", (0.17, 0.006, 0.085), (-0.85, 0.515, 2.245), ink, 0.012)
for k in range(4):
    boxo(f"A.bus.win{k}", (0.03, 0.004, 0.028), (-0.85 - 0.0585 + k * 0.039, 0.511, 2.262), plate_m, 0.003)
for k, dx in enumerate((-0.05, 0.05)):
    wh = mesh_obj(f"A.bus.wheel{k}", lambda bm: bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.016, radius2=0.016, depth=0.006), ink, CA)
    wh.location = (-0.85 + dx, 0.512, 2.2)
    wh.rotation_euler = (math.radians(90), 0, 0)
# fresh snow resting on top of the sign and the pole cap, and a small drift at the foot
capm = mat("snowcap", (0.92, 0.95, 1.0), rough=0.6, **{"Subsurface Weight": 0.7, "Subsurface Scale": 0.01})
thermal_inject(capm, temp_const=0.1)
cap = mesh_obj("A.sign.snow", lambda bm: bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=12, radius=1.0), capm, CA)
cap.location, cap.scale = (-0.85, 0.538, 2.548), (0.235, 0.022, 0.022)
pc_ = mesh_obj("A.pole.snow", lambda bm: bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=1.0), capm, CA)
pc_.location, pc_.scale = (-0.85, 0.55, 2.6), (0.034, 0.034, 0.014)
grey = mat("sign.bracket", (0.25, 0.26, 0.27), metallic=1.0, rough=0.45)
thermal_inject(grey, temp_const=0.08)
for k, z in enumerate((2.1, 2.42)):
    br = mesh_obj(f"A.bracket{k}", lambda bm: bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.036, radius2=0.036, depth=0.025), grey, CA)
    br.location = (-0.85, 0.55, z)
for o in [o for o in CA.objects if o.name.startswith(("A.bus.", "A.plate.border", "A.sign.snow", "A.pole.", "A.bracket"))]:
    for p_ in o.data.polygons:
        p_.use_smooth = True

# falling snow: flakes fall at ~1 m/s (snowflake terminal speed) and sway; geometry nodes, keyed by scene time
flake = mat("flake", (0.9, 0.93, 0.97), rough=0.45, **{"Subsurface Weight": 0.6, "Subsurface Scale": 0.002})
thermal_inject(flake, temp_const=0.18)



def rv(N, dtype, lo, hi, seed):
    """Random Value node; sets the Min/Max sockets of the right type whatever their index"""
    n = N.new("FunctionNodeRandomValue")
    n.data_type = dtype
    want = {"FLOAT": "VALUE", "FLOAT_VECTOR": "VECTOR", "INT": "INT"}[dtype]
    for s_ in n.inputs:
        if s_.type == want and s_.name in ("Min", "Max"):
            s_.default_value = lo if s_.name == "Min" else hi
    n.inputs["Seed"].default_value = seed
    out = [s_ for s_ in n.outputs if s_.type == want][0]
    return n, out


def snowfall(name, box_min, box_max, count, seed, flake_r):
    me = bpy.data.meshes.new(name)
    o = bpy.data.objects.new(name, me)
    CA.objects.link(o)
    gn = o.modifiers.new("fall", "NODES")
    tree = bpy.data.node_groups.new(name + ".gn", "GeometryNodeTree")
    tree.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    gn.node_group = tree
    N = tree.nodes
    L = tree.links
    out = N.new("NodeGroupOutput")
    pts = N.new("GeometryNodePoints")
    pts.inputs["Count"].default_value = count
    size = V(box_max) - V(box_min)
    rx, rxo = rv(N, "FLOAT_VECTOR", box_min, box_max, seed)
    t = N.new("GeometryNodeInputSceneTime")
    # z = zmin + mod(z0 - zmin - v t, H)
    sepn = N.new("ShaderNodeSeparateXYZ")
    L.new(rxo, sepn.inputs[0])
    spd, spdo = rv(N, "FLOAT", 0.8, 1.2, seed + 1)
    vt = N.new("ShaderNodeMath"); vt.operation = "MULTIPLY"
    L.new(t.outputs["Seconds"], vt.inputs[0]); L.new(spdo, vt.inputs[1])
    z1 = N.new("ShaderNodeMath"); z1.operation = "SUBTRACT"
    L.new(sepn.outputs["Z"], z1.inputs[0]); L.new(vt.outputs[0], z1.inputs[1])
    z2 = N.new("ShaderNodeMath"); z2.operation = "SUBTRACT"
    L.new(z1.outputs[0], z2.inputs[0]); z2.inputs[1].default_value = box_min[2]
    zm = N.new("ShaderNodeMath"); zm.operation = "FLOORED_MODULO"
    L.new(z2.outputs[0], zm.inputs[0]); zm.inputs[1].default_value = size.z
    z3 = N.new("ShaderNodeMath"); z3.operation = "ADD"
    L.new(zm.outputs[0], z3.inputs[0]); z3.inputs[1].default_value = box_min[2]
    # sway in x: 4 cm at ~0.6 Hz, random phase
    ph, pho = rv(N, "FLOAT", 0.0, 6.28, seed + 2)
    w1 = N.new("ShaderNodeMath"); w1.operation = "MULTIPLY_ADD"
    L.new(t.outputs["Seconds"], w1.inputs[0]); w1.inputs[1].default_value = 3.8; L.new(pho, w1.inputs[2])
    sn_ = N.new("ShaderNodeMath"); sn_.operation = "SINE"
    L.new(w1.outputs[0], sn_.inputs[0])
    xs = N.new("ShaderNodeMath"); xs.operation = "MULTIPLY_ADD"
    L.new(sn_.outputs[0], xs.inputs[0]); xs.inputs[1].default_value = 0.04; L.new(sepn.outputs["X"], xs.inputs[2])
    comb = N.new("ShaderNodeCombineXYZ")
    L.new(xs.outputs[0], comb.inputs["X"]); L.new(sepn.outputs["Y"], comb.inputs["Y"]); L.new(z3.outputs[0], comb.inputs["Z"])
    L.new(comb.outputs[0], pts.inputs["Position"])
    rr, rro = rv(N, "FLOAT", flake_r * 0.5, flake_r * 1.3, seed + 3)
    L.new(rro, pts.inputs["Radius"])
    ico = N.new("GeometryNodeMeshIcoSphere")
    ico.inputs["Radius"].default_value = 1.0
    ico.inputs["Subdivisions"].default_value = 1
    inst = N.new("GeometryNodeInstanceOnPoints")
    L.new(pts.outputs["Points"], inst.inputs["Points"])
    L.new(ico.outputs["Mesh"], inst.inputs["Instance"])
    rad = N.new("GeometryNodeInputRadius")
    L.new(rad.outputs["Radius"], inst.inputs["Scale"])
    sm = N.new("GeometryNodeSetMaterial")
    sm.inputs["Material"].default_value = flake
    real = N.new("GeometryNodeRealizeInstances")
    L.new(inst.outputs["Instances"], real.inputs["Geometry"])
    L.new(real.outputs["Geometry"], sm.inputs["Geometry"])
    L.new(sm.outputs["Geometry"], out.inputs["Geometry"])
    o.data.materials.append(flake)
    return o


snowfall("A.snowfall", (-2.5, -2.5, 0.0), (2.5, 2.5, 3.2), 5200, 7, 0.0026)

# The man at the bus stop: "Nathan Animated 003" by Renderpeople (Sketchfab, CC-BY), a photogrammetry scan of a real
# person in a plain T-shirt and jeans: the most believable "no coat in the snow". (The objects keep the internal
# "Dash." prefix the later scripts use.) The rig's bones are renamed to the Mixamo names the posing code speaks.
NATHAN = os.path.join(A, "sketchfab/143a2b1ea5eb4385ae90a73657aca3bc/model.glb")
_before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=NATHAN)
_new = [o for o in bpy.data.objects if o not in _before]
DR = [o for o in _new if o.type == "ARMATURE"][0]
BODY = max([o for o in _new if o.type == "MESH"], key=lambda o: len(o.data.vertices))
_mw = DR.matrix_world.copy()
DR.parent = None
DR.matrix_world = _mw
for o in _new:
    if o not in (DR, BODY):
        bpy.data.objects.remove(o, do_unlink=True)
for o in (DR, BODY):
    for c in list(o.users_collection):
        c.objects.unlink(o)
    CA.objects.link(o)
DR.name, BODY.name = "Dash.rig", "Dash.body"
DR.animation_data_clear()
for pb in DR.pose.bones:
    pb.location, pb.rotation_quaternion, pb.scale = (0, 0, 0), (1, 0, 0, 0), (1, 1, 1)
_SIDE = {"l": "Left", "r": "Right"}
_PART = {"shoulder": "Shoulder", "upperarm": "Arm", "lowerarm": "ForeArm", "hand": "Hand", "upperleg": "UpLeg",
         "lowerleg": "Leg", "foot": "Foot", "ball": "ToeBase", "foot_end": "Toe_End"}
_TRUNK = {"hip": "Hips", "spine_01": "Spine", "spine_02": "Spine1", "spine_03": "Spine2", "neck": "Neck", "head": "Head",
          "head_end": "HeadTop_End"}
for bone in DR.data.bones:
    base = re.sub(r"_\d+$", "", bone.name.replace("rp_nathan_animated_003_walking_", ""))
    new = None
    if base in _TRUNK:
        new = _TRUNK[base]
    else:
        m_ = re.match(r"^(thumb|index|middle|ring|pinky)_(0[1-3]|end)_([lr])$", base)
        if m_:
            new = f"{_SIDE[m_.group(3)]}Hand{m_.group(1).capitalize()}{4 if m_.group(2) == 'end' else int(m_.group(2))}"
        else:
            m_ = re.match(r"^(shoulder|upperarm|lowerarm|hand|upperleg|lowerleg|foot_end|foot|ball)_([lr])$", base)
            if m_:
                new = f"{_SIDE[m_.group(2)]}{_PART[m_.group(1)]}"
    if new:
        bone.name = "mixamorig:" + new  # renames the matching vertex groups too
bpy.context.view_layer.update()
# real size: 1.80 m, feet on the snow, centred, facing −Y
_pts = [BODY.matrix_world @ v.co for v in BODY.data.vertices]
_h = max(p.z for p in _pts) - min(p.z for p in _pts)
DR.matrix_world = Matrix.Scale(1.80 / _h, 4) @ DR.matrix_world
bpy.context.view_layer.update()
_pts = [BODY.matrix_world @ v.co for v in BODY.data.vertices]
DR.matrix_world = Matrix.Translation(-V((sum(p.x for p in _pts) / len(_pts), sum(p.y for p in _pts) / len(_pts), min(p.z for p in _pts)))) @ DR.matrix_world
bpy.context.view_layer.update()
DASH = [BODY]
# close the scan's pinholes (they render as black specks): fill every small boundary loop
_bm = bmesh.new()
_bm.from_mesh(BODY.data)
# weld the vertices the export split along UV seams (they open into cracks once subdivided and deformed)
_nv = len(_bm.verts)
bmesh.ops.remove_doubles(_bm, verts=_bm.verts[:], dist=0.01)  # mesh units are cm: 0.1 mm
print("SCAN welded", _nv - len(_bm.verts), "duplicate vertices")
_bnd = [e for e in _bm.edges if e.is_boundary]
_res = bmesh.ops.holes_fill(_bm, edges=_bnd, sides=16)
_bm.to_mesh(BODY.data)
_bm.free()
print("SCAN holes filled", len(_res["faces"]), "boundary edges were", len(_bnd))
# the scan is a light game mesh: subdivide it after the rig deforms it (smooth bent fingers, softer silhouette)
_sub = BODY.modifiers.new("smooth", "SUBSURF")
_sub.levels, _sub.render_levels = 1, 2
_sub.uv_smooth = "NONE"  # keep UV islands from shrinking into the texture's black margins (black specks at seams)
_sub.boundary_smooth = "PRESERVE_CORNERS"
for _p in BODY.data.polygons:
    _p.use_smooth = True
print("CHARACTER Nathan, bones renamed:", sum(1 for b_ in DR.data.bones if b_.name.startswith("mixamorig:")), "height", round(_h, 1))


def B(short):
    for pb in DR.pose.bones:
        if pb.name.split(":")[-1] == short:
            return pb
    raise KeyError(short)


def rest_pose():
    for pb in DR.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.rotation_euler = (0, 0, 0)
        pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()


rest_pose()


def W(pb, tail=False):
    return DR.matrix_world @ (pb.tail if tail else pb.head)


def fwd():
    """the way Dash faces: from the spine toward the toes, flattened"""
    f = (W(B("LeftToeBase")) + W(B("RightToeBase"))) / 2 - (W(B("LeftFoot")) + W(B("RightFoot"))) / 2
    f.z = 0
    return f.normalized()


FWD = fwd()
_ang = math.atan2(FWD.y, FWD.x) - math.atan2(-1.0, 0.0)
if abs(_ang) > 1e-3:
    DR.matrix_world = Matrix.Rotation(-_ang, 4, "Z") @ DR.matrix_world
    bpy.context.view_layer.update()
    FWD = fwd()
print("DASH faces", [round(c, 3) for c in FWD], "left arm at", [round(c, 3) for c in W(B("LeftArm"))])


def aim(pb, target_dir, child=None):
    """rotate pose bone pb (in world space, about its head) so the direction head→child-head points along target_dir"""
    bpy.context.view_layer.update()
    M_old = DR.matrix_world @ pb.matrix
    head = M_old.translation.copy()
    tip = W(child) if child else W(pb, tail=True)
    d = (tip - head).normalized()
    R = d.rotation_difference(V(target_dir).normalized()).to_matrix().to_4x4()
    M_new = Matrix.Translation(head) @ R @ Matrix.Translation(-head) @ M_old
    pb.matrix = DR.matrix_world.inverted() @ M_new
    bpy.context.view_layer.update()


def turn(pb, axis, deg):
    """rotate a pose bone about a world axis through its head"""
    bpy.context.view_layer.update()
    M_old = DR.matrix_world @ pb.matrix
    head = M_old.translation.copy()
    R = Matrix.Rotation(math.radians(deg), 4, V(axis).normalized())
    pb.matrix = DR.matrix_world.inverted() @ (Matrix.Translation(head) @ R @ Matrix.Translation(-head) @ M_old)
    bpy.context.view_layer.update()


RIGHT = FWD.cross(UP).normalized()  # Dash's right-hand side, as seen by him


def two_bone_ik(s, T, pole):
    """put the wrist of arm `s` at T: upper arm and forearm lengths fixed, the elbow bending toward `pole`"""
    S = W(B(f"{s}Arm"))
    L1 = (W(B(f"{s}ForeArm")) - S).length
    L2 = (W(B(f"{s}Hand")) - W(B(f"{s}ForeArm"))).length
    dv = T - S
    d = max(1e-4, min(dv.length, L1 + L2 - 1e-4))
    u = dv.normalized()
    a = (L1 * L1 - L2 * L2 + d * d) / (2 * d)
    hgt = math.sqrt(max(0.0, L1 * L1 - a * a))
    pp = (pole - u * pole.dot(u)).normalized()
    E = S + u * a + pp * hgt
    aim(B(f"{s}Arm"), E - S, B(f"{s}ForeArm"))
    aim(B(f"{s}ForeArm"), T - W(B(f"{s}ForeArm")), B(f"{s}Hand"))


def grip_hand(s, sh_o, el_o, along_dir, palm_to):
    """the hand lies on the other arm: pointing `along_dir` (round its outside), rolled so the palm faces `palm_to`
    (into the arm), the four fingers curl round it joint by joint and the thumb rests on its front. Every rotation is
    about a world axis measured on the posed hand, its sign checked so the fingertips move toward the arm."""
    hand = B(f"{s}Hand")
    axis_pt = lambda p: sh_o + (el_o - sh_o) * max(0.0, min(1.0, (p - sh_o).dot(el_o - sh_o) / (el_o - sh_o).length_squared))
    aim(hand, along_dir, B(f"{s}HandMiddle1"))

    def palm_normal():
        a = W(B(f"{s}HandMiddle1")) - W(hand)
        across = W(B(f"{s}HandPinky1")) - W(B(f"{s}HandIndex1"))
        n = a.cross(across).normalized()
        thumb = W(B(f"{s}HandThumb2")) - W(hand)
        return n if n.dot(thumb) > 0 else -n  # the palm is on the thumb's side

    along = (W(B(f"{s}HandMiddle1")) - W(hand)).normalized()
    want = (palm_to - along * palm_to.dot(along)).normalized()
    best, best_a = -2, 0
    for a10 in range(-180, 181, 5):
        sc_ = (Matrix.Rotation(math.radians(a10), 3, along) @ palm_normal()).dot(want)
        if sc_ > best:
            best, best_a = sc_, a10
    turn(hand, along, best_a)
    across = (W(B(f"{s}HandPinky1")) - W(B(f"{s}HandIndex1"))).normalized()
    for fng in ("Index", "Middle", "Ring", "Pinky"):
        for j, deg in ((1, 30), (2, 42), (3, 28)):
            pb = B(f"{s}Hand{fng}{j}")
            tip = B(f"{s}Hand{fng}3")
            target = axis_pt(W(tip, tail=True))
            turn(pb, across, deg)
            plus = (W(tip, tail=True) - target).length
            turn(pb, across, -2 * deg)
            if plus < (W(tip, tail=True) - target).length:
                turn(pb, across, 2 * deg)
    for j, deg in ((1, 10), (2, 15)):
        pb = B(f"{s}HandThumb{j}")
        target = axis_pt(W(B(f"{s}HandThumb3"), tail=True))
        turn(pb, along, deg)
        plus = (W(B(f"{s}HandThumb3"), tail=True) - target).length
        turn(pb, along, -2 * deg)
        if plus < (W(B(f"{s}HandThumb3"), tail=True) - target).length:
            turn(pb, along, 2 * deg)


def hug_pose():
    """cold pose: shoulders up, a slight hunch, chin tucked, arms crossed over the chest with each hand gripping the
    front of the opposite upper arm (the left forearm on top). Elbows and hands are placed from the measured chest, so
    the forearms run just in front of the shirt instead of through it."""
    for s in ("LeftShoulder", "RightShoulder"):
        side = 1 if s.startswith("Right") else -1
        turn(B(s), FWD, -9 * side)  # shrug
    turn(B("Spine1"), RIGHT, -4)
    turn(B("Spine2"), RIGHT, -4)
    turn(B("Neck"), RIGHT, -6)
    turn(B("Head"), RIGHT, -5)
    # chest front, measured on the posed shirt (the Mixamo body has no torso under it)
    dg = bpy.context.evaluated_depsgraph_get()
    shirt = BODY
    ev = shirt.evaluated_get(dg)
    me = ev.to_mesh()
    sp = W(B("Spine2"))
    band = [ev.matrix_world @ v.co for v in me.vertices]
    ev.to_mesh_clear()
    cf = max((p - sp).dot(FWD) for p in band if 1.2 < p.z < 1.32 and abs((p - sp).dot(RIGHT)) < 0.08)
    print("CHEST front", round(cf, 3))
    # the freezing self-hug: elbows tucked in front of the lower ribs, forearms crossed tight against the chest (the
    # left on top), each hand pushed in under the opposite arm, into the armpit (fingers hidden, just the back of the
    # hand showing). Targets are fixed in the body frame; wrists by two-bone IK with the elbow pulled to its target.
    E = {"Right": V((sp.x, sp.y, 1.2)) + RIGHT * 0.07 + FWD * (cf + 0.035),
         "Left": V((sp.x, sp.y, 1.235)) - RIGHT * 0.07 + FWD * (cf + 0.07)}
    S = {k: W(B(f"{k}Arm")) for k in ("Right", "Left")}
    for s, side in (("Right", 1), ("Left", -1)):
        o_ = "Left" if s == "Right" else "Right"
        out_o = -RIGHT * side  # toward the other arm's side
        pit = S[o_] - UP * 0.13 - out_o * 0.07 + FWD * 0.0  # the other armpit, just inside its upper arm
        T = pit + FWD * (cf * 1.12) + UP * (0.0 if s == "Right" else 0.025)  # wrist at the front of it
        two_bone_ik(s, T, (E[s] - S[s]).normalized())
        hand = B(f"{s}Hand")
        aim(hand, (-FWD * 0.95 + out_o * 0.12 - UP * 0.12).normalized(), B(f"{s}HandMiddle1"))
        # palm against the ribs (facing the body's middle), fingers only gently bent
        along = (W(B(f"{s}HandMiddle1")) - W(hand)).normalized()

        def palm_n():
            a_ = W(B(f"{s}HandMiddle1")) - W(hand)
            ac = W(B(f"{s}HandPinky1")) - W(B(f"{s}HandIndex1"))
            n_ = a_.cross(ac).normalized()
            return n_ if n_.dot(W(B(f"{s}HandThumb2")) - W(hand)) > 0 else -n_

        want = -out_o
        want = (want - along * want.dot(along)).normalized()
        best = max(range(-180, 181, 5), key=lambda a10: (Matrix.Rotation(math.radians(a10), 3, along) @ palm_n()).dot(want))
        turn(hand, along, best)
        across = (W(B(f"{s}HandPinky1")) - W(B(f"{s}HandIndex1"))).normalized()
        for fng in ("Index", "Middle", "Ring", "Pinky"):
            for j, deg in ((1, 30), (2, 38), (3, 26)):
                pb = B(f"{s}Hand{fng}{j}")
                tipb = B(f"{s}Hand{fng}3")
                before = W(tipb, tail=True)
                turn(pb, across, deg)
                if (W(tipb, tail=True) - before).dot(want) < 0:  # bend toward the palm
                    turn(pb, across, -2 * deg)
        bpy.context.view_layer.update()
    turn(B("LeftUpLeg"), FWD, 2.5)
    turn(B("RightUpLeg"), FWD, -2.5)


hug_pose()
DR["hug_pose"] = {pb.name: list(pb.rotation_quaternion) for pb in DR.pose.bones}

# orange knit scarf around the neck (Dash's identity: always the orange scarf)


def knit_material(name="Dash.scarf.knit", rgb=(0.78, 0.1, 0.0, 1)):
    """chunky orange knit: stockinette "V" stitches from the UVs (u = metres along the scarf, v = round its
    cross-section), darker in the grooves between stitches, a soft wool fuzz (sheen) and fine fibre noise"""
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Roughness"].default_value = 0.9
    b.inputs["Sheen Weight"].default_value = 0.22
    b.inputs["Sheen Roughness"].default_value = 0.6
    b.inputs["Sheen Tint"].default_value = (1.0, 0.4, 0.1, 1)
    b.inputs["Subsurface Weight"].default_value = 0.15
    b.inputs["Subsurface Radius"].default_value = (1.0, 0.4, 0.2)
    b.inputs["Subsurface Scale"].default_value = 0.004
    tc = node(nt, "ShaderNodeTexCoord")
    sp = node(nt, "ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["UV"], sp.inputs[0])
    # x: stitch columns across the scarf (≈ 7 mm wide); y: rows along it (≈ 5.5 mm)
    cx = node(nt, "ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(sp.outputs["Y"], cx.inputs[0])
    cx.inputs[1].default_value = 26.0
    fx = node(nt, "ShaderNodeMath", operation="FRACT")
    nt.links.new(cx.outputs[0], fx.inputs[0])
    tri = node(nt, "ShaderNodeMath", operation="SUBTRACT")
    nt.links.new(fx.outputs[0], tri.inputs[0])
    tri.inputs[1].default_value = 0.5
    tri2 = node(nt, "ShaderNodeMath", operation="ABSOLUTE")
    nt.links.new(tri.outputs[0], tri2.inputs[0])
    ry = node(nt, "ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(sp.outputs["X"], ry.inputs[0])
    ry.inputs[1].default_value = 180.0
    vsh = node(nt, "ShaderNodeMath", operation="MULTIPLY_ADD")  # the V: rows shift up toward each column's edges
    nt.links.new(tri2.outputs[0], vsh.inputs[0])
    vsh.inputs[1].default_value = 1.1
    nt.links.new(ry.outputs[0], vsh.inputs[2])
    fy = node(nt, "ShaderNodeMath", operation="FRACT")
    nt.links.new(vsh.outputs[0], fy.inputs[0])
    sy = node(nt, "ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(fy.outputs[0], sy.inputs[0])
    sy.inputs[1].default_value = math.pi
    sn = node(nt, "ShaderNodeMath", operation="SINE")
    nt.links.new(sy.outputs[0], sn.inputs[0])
    edge = node(nt, "ShaderNodeMath", operation="MULTIPLY")  # dips at the column edges
    nt.links.new(tri2.outputs[0], edge.inputs[0])
    edge.inputs[1].default_value = 2.0
    edge2 = node(nt, "ShaderNodeMath", operation="POWER")
    nt.links.new(edge.outputs[0], edge2.inputs[0])
    edge2.inputs[1].default_value = 4.0
    inv = node(nt, "ShaderNodeMath", operation="SUBTRACT")
    inv.inputs[0].default_value = 1.0
    nt.links.new(edge2.outputs[0], inv.inputs[1])
    h = node(nt, "ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(sn.outputs[0], h.inputs[0])
    nt.links.new(inv.outputs[0], h.inputs[1])
    fuzz = node(nt, "ShaderNodeTexNoise", Scale=900.0, Detail=6.0)
    nt.links.new(tc.outputs["Object"], fuzz.inputs["Vector"])
    hf = node(nt, "ShaderNodeMath", operation="MULTIPLY_ADD")
    nt.links.new(fuzz.outputs["Fac"], hf.inputs[0])
    hf.inputs[1].default_value = 0.25
    nt.links.new(h.outputs[0], hf.inputs[2])
    bump = node(nt, "ShaderNodeBump", Strength=0.9, Distance=0.0025)
    nt.links.new(hf.outputs[0], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    shade = node(nt, "ShaderNodeMapRange")
    nt.links.new(h.outputs[0], shade.inputs["Value"])
    shade.inputs["To Min"].default_value = 0.45
    shade.inputs["To Max"].default_value = 1.0
    col = node(nt, "ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
    col.inputs["Factor"].default_value = 1.0
    col.inputs[6].default_value = rgb
    cc = node(nt, "ShaderNodeCombineColor")
    for ch in ("Red", "Green", "Blue"):
        nt.links.new(shade.outputs["Result"], cc.inputs[ch])
    nt.links.new(cc.outputs["Color"], col.inputs[7])
    nt.links.new(col.outputs[2], b.inputs["Base Color"])
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return m


def neck_ring():
    """radius and centre of the neck just above the shoulders, measured on the posed body"""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = BODY.evaluated_get(dg)
    me = ev.to_mesh()
    nb = W(B("Neck"))
    pts = [ev.matrix_world @ v.co for v in me.vertices]
    ev.to_mesh_clear()
    band = [p for p in pts if abs(p.z - (nb.z + 0.01)) < 0.015 and (V((p.x, p.y, 0)) - V((nb.x, nb.y, 0))).length < 0.13]
    c = sum(band, V()) / len(band)
    r = sum((V((p.x - c.x, p.y - c.y, 0))).length for p in band) / len(band)
    return c, r


def build_scarf():  # not used in s02 since the stand-in character is not Dash
    NC, NR = neck_ring()
    print("NECK centre", [round(x, 3) for x in NC], "radius", round(NR, 3))
    knit = knit_material()


    def band_loop(bm, cx, cy, rx, ry, z0, sag, height, thick, nu=96, nv=20, wobble=0.0, phase=0.0):
        """a soft knitted band around the neck: an elliptical loop (rx, ry) whose front sags by `sag`, with a rounded
        rectangular cross-section (height × thick). Built in world space around the neck centre."""
        rows = []
        for i in range(nu):
            u = 2 * math.pi * i / nu
            # direction from the neck centre; FWD is −Y, so the front is at sin(u) = −1
            dx, dy = math.cos(u), math.sin(u)
            front = max(0.0, -dy)
            zc = z0 - sag * front ** 1.6 + wobble * math.sin(3 * u + phase)
            puff = 1.0 + 0.06 * math.sin(7 * u + phase)
            row = []
            for j in range(nv):
                v = 2 * math.pi * j / nv
                # rounded rectangle (superellipse) cross-section: out = radial, up = z
                cu, sv = math.cos(v), math.sin(v)
                e = 0.5
                ro = math.copysign(abs(cu) ** e, cu) * thick / 2 * puff
                hz = math.copysign(abs(sv) ** e, sv) * height / 2
                R = 1.0 + ro / max(rx, ry)
                row.append(bm.verts.new((cx + dx * rx * R, cy + dy * ry * R, zc + hz)))
            rows.append(row)
        uvl = bm.loops.layers.uv.get("UVMap") or bm.loops.layers.uv.new("UVMap")
        circ = math.pi * (rx + ry)
        for i in range(nu):
            for j in range(nv):
                f = bm.faces.new((rows[i][j], rows[(i + 1) % nu][j], rows[(i + 1) % nu][(j + 1) % nv], rows[i][(j + 1) % nv]))
                for lp, (ii, jj) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                    lp[uvl].uv = (ii / nu * circ, jj / nv)


    # two wraps: a snug one on the neck and a looser one resting on the collar, sagging at the front
    scarf = mesh_obj("Dash.scarf", lambda bm: (band_loop(bm, NC.x, NC.y, NR + 0.018, NR + 0.022, NC.z + 0.008, 0.014, 0.07, 0.018, wobble=0.003, phase=0.4),
                                               band_loop(bm, NC.x, NC.y + 0.006, NR + 0.042, NR + 0.05, NC.z - 0.04, 0.05, 0.078, 0.02, wobble=0.006, phase=1.9)), knit, CA)
    sub = scarf.modifiers.new("smooth", "SUBSURF")
    sub.levels, sub.render_levels = 1, 2
    # a soft, uneven drape
    lump_tx = bpy.data.textures.new("knit_lumps", "CLOUDS")
    lump_tx.noise_scale = 0.05
    lump = scarf.modifiers.new("lumps", "DISPLACE")
    lump.texture = lump_tx
    lump.texture_coords = "GLOBAL"
    lump.strength = 0.006


    def scarf_tail(bm, pts, width, thick=0.022, nseg=24):
        """a flat knitted tail along a polyline of points (world), hanging over the back"""
        path = [V(p) for p in pts]
        for i in range(nseg + 1):
            t = i / nseg
            k = min(int(t * (len(path) - 1)), len(path) - 2)
            f = t * (len(path) - 1) - k
            c = path[k].lerp(path[k + 1], f)
            d = (path[k + 1] - path[k]).normalized()
            side = d.cross(UP).normalized() if abs(d.dot(UP)) < 0.99 else RIGHT
            nrm = side.cross(d).normalized()
            w = width * (1.0 + 0.08 * math.sin(t * 9.0))
            for a_, b_ in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                bm.verts.new(c + side * a_ * w / 2 + nrm * b_ * thick / 2)
        bm.verts.ensure_lookup_table()
        uvl = bm.loops.layers.uv.get("UVMap") or bm.loops.layers.uv.new("UVMap")
        plen = sum((path[k + 1] - path[k]).length for k in range(len(path) - 1))
        for i in range(nseg):
            a0, a1 = i * 4, i * 4 + 4
            for q in range(4):
                f = bm.faces.new((bm.verts[a0 + q], bm.verts[a0 + (q + 1) % 4], bm.verts[a1 + (q + 1) % 4], bm.verts[a1 + q]))
                for lp, (ii, qq) in zip(f.loops, ((i, q), (i, q + 1), (i + 1, q + 1), (i + 1, q))):
                    lp[uvl].uv = (ii / nseg * plen, qq / 4)
        bm.faces.new([bm.verts[q] for q in range(4)][::-1])
        bm.faces.new([bm.verts[nseg * 4 + q] for q in range(4)])


    # the tails are tossed back over his left shoulder and hang down his back, clear of the crossed arms
    back = -FWD
    L_ = -RIGHT  # his left
    t0 = NC + back * (NR + 0.03) + L_ * 0.03 + V((0, 0, -0.02))
    tails = []
    for name, offs, length, width in (("Dash.scarf.tail1", 0.0, 0.34, 0.085), ("Dash.scarf.tail2", 0.05, 0.27, 0.078)):
        pts = [t0 + L_ * offs, t0 + L_ * (offs + 0.01) + back * 0.05 + V((0, 0, -0.08)),
               t0 + L_ * (offs + 0.02) + back * 0.085 + V((0, 0, -length * 0.6)), t0 + L_ * (offs + 0.03) + back * 0.09 + V((0, 0, -length))]
        tl = mesh_obj(name, lambda bm, pts=pts, width=width: scarf_tail(bm, pts, width), knit, CA)
        s2 = tl.modifiers.new("smooth", "SUBSURF")
        s2.levels = s2.render_levels = 2
        tails.append(tl)
    _f0 = NC + FWD * (NR + 0.05) + RIGHT * 0.035 + V((0, 0, -0.035))
    _fpts = [_f0, _f0 + FWD * 0.04 + V((0, 0, -0.04)), _f0 + FWD * 0.085 + RIGHT * 0.01 + V((0, 0, -0.085)), _f0 + FWD * 0.1 + RIGHT * 0.015 + V((0, 0, -0.12))]
    tl = mesh_obj("Dash.scarf.tail0", lambda bm, pts=_fpts: scarf_tail(bm, pts, 0.08, thick=0.016), knit, CA)
    _s0 = tl.modifiers.new("smooth", "SUBSURF")
    _s0.levels = _s0.render_levels = 2
    tails.append(tl)
    # a small knot where the wraps cross, at the back-left of the neck
    kn = mesh_obj("Dash.scarf.knot", lambda bm: bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=14, radius=1.0), knit, CA)
    kn.location = t0 + V((0, 0, 0.01))
    kn.scale = (0.05, 0.035, 0.04)


    def bind_to_bone(o, bone):
        """o was built where it sits on the POSED body: move its mesh to the rest pose and let an Armature modifier carry
        it with `bone`, exactly like the body meshes (bone-parenting on this scaled Mixamo rig misplaces it)"""
        bpy.context.view_layer.update()
        pb = B(bone)
        D = (DR.matrix_world @ pb.matrix) @ (DR.matrix_world @ pb.bone.matrix_local).inverted()
        o.data.transform(D.inverted() @ o.matrix_world)
        o.matrix_world = Matrix.Identity(4)
        o.parent = DR
        o.matrix_parent_inverse = DR.matrix_world.inverted()
        vg = o.vertex_groups.new(name=pb.name)
        vg.add(range(len(o.data.vertices)), 1.0, "REPLACE")
        am = o.modifiers.new("rig", "ARMATURE")
        am.object = DR
        o.modifiers.move(len(o.modifiers) - 1, 0)


    for o in [scarf, kn] + tails:
        bind_to_bone(o, "Spine2")
    thermal_inject(knit, temp_const=0.42)


# Dash's temperature map for the thermal view (colour attribute "temp", 0 cold … 1 warm), from bone weights:
# the core is warm, the limbs cool toward the hands and feet, and the nose and ears are the coldest part of the head.
TEMP = {"Hips": 0.92, "Spine": 0.96, "Spine1": 0.98, "Spine2": 0.97, "Neck": 0.9, "Head": 0.78, "LeftShoulder": 0.85,
        "RightShoulder": 0.85, "LeftArm": 0.62, "RightArm": 0.62, "LeftForeArm": 0.42, "RightForeArm": 0.42,
        "LeftHand": 0.2, "RightHand": 0.2, "LeftUpLeg": 0.6, "RightUpLeg": 0.6, "LeftLeg": 0.38, "RightLeg": 0.38,
        "LeftFoot": 0.18, "RightFoot": 0.18}
head_c = (W(B("Head")) + W(B("Head"), tail=True)) / 2


def head_landmarks(o):
    """nose tip (furthest forward head vertex near the midline) and the two ear rims (furthest out sideways)"""
    hg = {g.index for g in o.vertex_groups if g.name.split(":")[-1].startswith("Head")}
    dg = bpy.context.evaluated_depsgraph_get()
    ev = o.evaluated_get(dg)
    em = ev.to_mesh()
    pts = [ev.matrix_world @ ve.co for v, ve in zip(o.data.vertices, em.vertices) if any(gr.group in hg and gr.weight > 0.6 for gr in v.groups)]
    ev.to_mesh_clear()
    c = sum(pts, V()) / len(pts)
    eyes = [DR.matrix_world @ pb.head for pb in DR.pose.bones if re.search(r"_eye_[lr]_\d+$", pb.name)]
    ez = sum(e.z for e in eyes) / len(eyes) if eyes else c.z
    # the nose tip: the most forward point near the midline, 1.5–5 cm below the eyes (not the lips or the chin)
    nose = max([p for p in pts if abs((p - c).dot(RIGHT)) < 0.012 and ez - 0.05 < p.z < ez - 0.015], key=lambda p: (p - c).dot(FWD))
    band = [p for p in pts if abs(p.z - (nose.z + 0.01)) < 0.03]
    ear_r = max(band, key=lambda p: (p - c).dot(RIGHT))
    ear_l = min(band, key=lambda p: (p - c).dot(RIGHT))
    return nose, ear_l, ear_r


def temp_map(o, clothes=1.0):
    me = o.data
    names = {g.index: g.name.split(":")[-1] for g in o.vertex_groups}
    if "temp" in me.color_attributes:
        me.color_attributes.remove(me.color_attributes["temp"])
    ca = me.color_attributes.new("temp", "FLOAT_COLOR", "POINT")
    dg = bpy.context.evaluated_depsgraph_get()
    ev = o.evaluated_get(dg)
    em = ev.to_mesh()
    for v, ve in zip(me.vertices, em.vertices):
        tot, acc = 0.0, 0.0
        for gr in v.groups:
            nm = names.get(gr.group, "")
            key = next((k for k in TEMP if nm == k), None)
            if key is None and re.search(r"_(jaw|mouth|eye|eyelid|eyebrow)(_end)?(_[lr])?_\d+$", nm):
                key = "Head"  # the face's own bones count as head
            if key is None and nm.startswith(("LeftHand", "RightHand")):
                key = "LeftHand"
            if key is None and nm.startswith(("LeftToe", "RightToe")):
                key = "LeftFoot"
            if key and gr.weight > 0:
                acc += TEMP[key] * gr.weight
                tot += gr.weight
        t = acc / tot if tot else 0.6
        p = ev.matrix_world @ ve.co
        if tot and any(names.get(gr.group, "").startswith("Head") for gr in v.groups):
            # the nose tip and the ear rims are the coldest skin on the head
            dn = (p - NOSE).length
            de = min((p - EAR_L).length, (p - EAR_R).length)
            t -= 0.55 * max(0.0, 1.0 - dn / 0.028) + 0.4 * max(0.0, 1.0 - de / 0.03)
        t = max(0.02, min(1.0, t * clothes))
        ca.data[v.index].color = (t, t, t, 1)
    ev.to_mesh_clear()


def skin_mask(o):
    """per-vertex "skin" (0/1) from the scan's colour texture: skin is warm (r > g > b) and moderately saturated;
    the grey T-shirt, the blue jeans, the black shoes and the hair are not"""
    import numpy as np
    m = o.active_material
    img = [n.image for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image][0]
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    me = o.data
    uv = me.uv_layers.active.data
    acc = np.zeros(len(me.vertices))
    cnt = np.zeros(len(me.vertices))
    for lp in me.loops:
        u, v = uv[lp.index].uv
        r, g, b, _ = px[min(h - 1, max(0, int(v * h))), min(w - 1, max(0, int(u * w)))]
        sat = max(r, g, b) - min(r, g, b)
        sk = 1.0 if (r > g > b and 0.07 < r - b < 0.5 and sat > 0.06 and r > 0.18) else 0.0
        acc[lp.vertex_index] += sk
        cnt[lp.vertex_index] += 1
    val = acc / np.maximum(cnt, 1)
    # the scan's fingers are near-black in its texture: give them the hand's own skin tone. Tone = median texture
    # colour on the back of the hands (hand-bone weighted skin vertices, not the fingers)
    gid = {g.index: g.name.split(":")[-1] for g in o.vertex_groups}
    fing = np.zeros(len(me.vertices))
    handw = np.zeros(len(me.vertices))
    for v in me.vertices:
        for gr in v.groups:
            n_ = gid.get(gr.group, "")
            if re.match(r"^(Left|Right)Hand(Thumb|Index|Middle|Ring|Pinky)[1-4]$", n_):
                fing[v.index] += gr.weight
            elif n_ in ("LeftHand", "RightHand"):
                handw[v.index] += gr.weight
    cols = []
    for lp in me.loops:
        if handw[lp.vertex_index] > 0.8 and val[lp.vertex_index] > 0.5:
            u, v = uv[lp.index].uv
            cols.append(px[min(h - 1, int(v * h)), min(w - 1, int(u * w)), :3])
    tone = np.median(np.array(cols), axis=0) if cols else np.array([0.6, 0.42, 0.33])
    for nm in ("fing",):
        if nm in me.attributes:
            me.attributes.remove(me.attributes[nm])
    me.attributes.new("fing", "FLOAT", "POINT").data.foreach_set("value", np.clip(fing * 1.2, 0, 1).astype(np.float32))
    o["finger_tone"] = [float(c) for c in tone]
    print("FINGER tone", [round(float(c), 3) for c in tone], "finger verts", int((fing > 0.5).sum()))
    if "skin" in me.attributes:
        me.attributes.remove(me.attributes["skin"])
    me.attributes.new("skin", "FLOAT", "POINT").data.foreach_set("value", val.astype(np.float32))
    return val


def premium_skin(m):
    """scan → close-up skin, only where the "skin" mask is: subsurface scattering, a slight richness, a soft sheen,
    fine pores, and a cold flush (nose, ears, fingers a little red where "temp" is low). Cloth stays matte."""
    nt = m.node_tree
    b = [n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"][0]
    src = b.inputs["Base Color"].links[0].from_socket
    # fingers: the scan's texture is near-black there, so they take the hand's skin tone (with a little shading)
    fa = node(nt, "ShaderNodeAttribute", attribute_name="fing")
    fmix = node(nt, "ShaderNodeMix", data_type="RGBA")
    nt.links.new(fa.outputs["Fac"], fmix.inputs["Factor"])
    nt.links.new(src, fmix.inputs[6])
    fmix.inputs[7].default_value = (*BODY["finger_tone"], 1.0)
    src = fmix.outputs[2]
    sk = node(nt, "ShaderNodeAttribute", attribute_name="skin")
    skf = node(nt, "ShaderNodeMath", operation="MAXIMUM")  # fingers count as skin
    nt.links.new(sk.outputs[0], skf.inputs[0])
    nt.links.new(fa.outputs["Fac"], skf.inputs[1])
    sk = skf
    hsv = node(nt, "ShaderNodeHueSaturation")
    hsv.inputs["Saturation"].default_value = 1.12
    nt.links.new(src, hsv.inputs["Color"])
    nt.links.new(sk.outputs[0], hsv.inputs["Fac"])
    tmp = node(nt, "ShaderNodeVertexColor", layer_name="temp")
    sep_ = node(nt, "ShaderNodeSeparateColor")
    nt.links.new(tmp.outputs["Color"], sep_.inputs["Color"])
    fl = node(nt, "ShaderNodeMapRange")
    nt.links.new(sep_.outputs["Red"], fl.inputs["Value"])
    fl.inputs["From Min"].default_value = 0.2
    fl.inputs["From Max"].default_value = 0.65
    fl.inputs["To Min"].default_value = 0.32
    fl.inputs["To Max"].default_value = 0.0
    flm = node(nt, "ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(fl.outputs["Result"], flm.inputs[0])
    nt.links.new(sk.outputs[0], flm.inputs[1])
    flush = node(nt, "ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
    nt.links.new(flm.outputs[0], flush.inputs["Factor"])
    nt.links.new(hsv.outputs["Color"], flush.inputs[6])
    flush.inputs[7].default_value = (1.0, 0.45, 0.42, 1)
    nt.links.new(flush.outputs[2], b.inputs["Base Color"])
    for name, lo, hi in (("Subsurface Weight", 0.0, 0.4), ("Roughness", 0.82, 0.48), ("Sheen Weight", 0.15, 0.1)):
        mr = node(nt, "ShaderNodeMapRange")
        nt.links.new(sk.outputs[0], mr.inputs["Value"])
        mr.inputs["To Min"].default_value = lo
        mr.inputs["To Max"].default_value = hi
        nt.links.new(mr.outputs["Result"], b.inputs[name])
    b.inputs["Subsurface Radius"].default_value = (1.0, 0.38, 0.22)
    b.inputs["Subsurface Scale"].default_value = 0.006
    b.inputs["Specular IOR Level"].default_value = 0.45
    # fine surface detail: pores on skin, a soft weave on cloth
    tc_ = node(nt, "ShaderNodeTexCoord")
    pore = node(nt, "ShaderNodeTexVoronoi", Scale=1400.0)
    nt.links.new(tc_.outputs["UV"], pore.inputs["Vector"])
    weave = node(nt, "ShaderNodeTexNoise", Scale=2600.0, Detail=3.0)
    nt.links.new(tc_.outputs["UV"], weave.inputs["Vector"])
    hm = node(nt, "ShaderNodeMix", data_type="FLOAT")
    nt.links.new(sk.outputs[0], hm.inputs["Factor"])
    nt.links.new(weave.outputs["Fac"], hm.inputs[2])
    nt.links.new(pore.outputs["Distance"], hm.inputs[3])
    pb = node(nt, "ShaderNodeBump", Strength=0.08, Distance=0.0002, invert=True)
    nt.links.new(hm.outputs[0], pb.inputs["Height"])
    nt.links.new(pb.outputs["Normal"], b.inputs["Normal"])


NOSE, EAR_L, EAR_R = head_landmarks(BODY)
print("NOSE", [round(c, 3) for c in NOSE])
_skin = skin_mask(BODY)
print("SKIN verts", int((_skin > 0.5).sum()), "of", len(_skin))
temp_map(BODY)
# cloth reads a little cooler than skin on the thermal camera
_ca = BODY.data.color_attributes["temp"]
for i in range(len(BODY.data.vertices)):
    if _skin[i] < 0.5:
        c_ = _ca.data[i].color
        t_ = c_[0] * 0.82
        _ca.data[i].color = (t_, t_, t_, 1)
premium_skin(BODY.active_material)
thermal_inject(BODY.active_material, temp_attr="temp")

bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/s02_set.blend"))
print("SET A BUILT")
