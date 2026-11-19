"""Short s03 "Why Your Laptop Gets So Hot When Rendering": the set, at real-world scale, as stations on one
sky-blue studio backdrop (the reference look: one subject floating in a clean blue void, soft studio light).

    Blender -b --python tools/blender/s03_set.py
Builds blender/s03_set.blend:
  A (origin)   the laptop: "Laptop" by CG Soul Motion (Sketchfab, CC-BY) at real size (15.6": 36 cm wide), with
               premium materials (space-grey anodised aluminium, matte keycaps with backlit legends, glass screen
               showing a video editor mid-render), standing on a soft cyclorama floor.
  B (x = 10)   inside the laptop (bottom cover off): main board, the chip under a copper cold plate, two flattened copper
               heat pipes to an aluminium fin stack, a blower fan with a 41-blade impeller, battery, memory, SSD.
Stations C (chip package + die) and D (transistors) are built by s03_chip.py.
"""
import math
import os
import random

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
for c in list(bpy.data.collections):
    bpy.data.collections.remove(c)
R = random.Random(303)


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


def coll(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in sc.collection.children:
        sc.collection.children.link(c)
    return c


def mesh_obj(name, build, material=None, c=None, smooth=True):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    build(bm)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    (c or sc.collection).objects.link(o)
    if material:
        o.data.materials.append(material)
    for p in o.data.polygons:
        p.use_smooth = smooth
    return o


def box(name, size, loc, material, c, bevel=0.0, segs=3, rot=(0, 0, 0)):
    o = mesh_obj(name, lambda bm: (bmesh.ops.create_cube(bm, size=1.0), bmesh.ops.scale(bm, vec=size, verts=bm.verts)), material, c, smooth=bevel > 0)
    o.location, o.rotation_euler = loc, rot
    if bevel:
        bv = o.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments = bevel, segs
        bv.limit_method = "ANGLE"
        o.modifiers.new("wn", "WEIGHTED_NORMAL")
    return o


def brushed(m, scale=(1.0, 600.0, 1.0), strength=0.05):
    """fine brushed / bead-blasted micro-texture as a bump (anodised aluminium)"""
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = node(nt, "ShaderNodeTexCoord")
    mp = node(nt, "ShaderNodeMapping")
    mp.inputs["Scale"].default_value = scale
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    nz = node(nt, "ShaderNodeTexNoise", Scale=400.0, Detail=8.0)
    nt.links.new(mp.outputs["Vector"], nz.inputs["Vector"])
    bp = node(nt, "ShaderNodeBump", Strength=strength, Distance=0.0001)
    nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])


# ─── look: the blue studio void (camera rays only) + studio HDRI for light; a cyclorama floor ─────────
w = bpy.data.worlds.new("Studio")
sc.world = w
w.use_nodes = True
nt = w.node_tree
nt.nodes.clear()
wout = node(nt, "ShaderNodeOutputWorld")
env = node(nt, "ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(A, "polyhaven/blue_photo_studio/blue_photo_studio_2k.hdr"), check_existing=True)
bg_env = node(nt, "ShaderNodeBackground", Strength=0.7)
nt.links.new(env.outputs["Color"], bg_env.inputs["Color"])
tc = node(nt, "ShaderNodeTexCoord")
sep = node(nt, "ShaderNodeSeparateXYZ")
nt.links.new(tc.outputs["Window"], sep.inputs[0])
ramp = node(nt, "ShaderNodeValToRGB")
SKY_LO, SKY_HI = (0.52, 0.76, 0.93, 1), (0.16, 0.46, 0.82, 1)
ramp.color_ramp.elements[0].color = SKY_LO
ramp.color_ramp.elements[1].color = SKY_HI
nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"])
th_bg = node(nt, "ShaderNodeMix", data_type="RGBA")
th_k = node(nt, "ShaderNodeValue", name="thermal_k", label="thermal_k")
th_k.outputs[0].default_value = 0.0
nt.links.new(th_k.outputs[0], th_bg.inputs["Factor"])
nt.links.new(ramp.outputs["Color"], th_bg.inputs[6])
th_bg.inputs[7].default_value = (0.012, 0.004, 0.05, 1)
cam_bg = node(nt, "ShaderNodeBackground", Strength=1.0)
nt.links.new(th_bg.outputs[2], cam_bg.inputs["Color"])
lp = node(nt, "ShaderNodeLightPath")
mx = node(nt, "ShaderNodeMixShader")
nt.links.new(lp.outputs["Is Camera Ray"], mx.inputs["Fac"])
nt.links.new(bg_env.outputs["Background"], mx.inputs[1])
nt.links.new(cam_bg.outputs["Background"], mx.inputs[2])
nt.links.new(mx.outputs["Shader"], wout.inputs["Surface"])


def cyclorama(name, at, radius, c):
    """a floor that catches soft contact shadows and fades into the backdrop toward its rim (camera rays only)"""
    m = bpy.data.materials.new(name + ".mat")
    m.use_nodes = True
    t = m.node_tree
    b = t.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.62, 0.78, 0.9, 1)
    b.inputs["Roughness"].default_value = 0.85
    out = t.nodes["Material Output"]
    tw = node(t, "ShaderNodeTexCoord")
    sw = node(t, "ShaderNodeSeparateXYZ")
    t.links.new(tw.outputs["Window"], sw.inputs[0])
    rw = node(t, "ShaderNodeValToRGB")
    rw.color_ramp.elements[0].color = SKY_LO
    rw.color_ramp.elements[1].color = SKY_HI
    t.links.new(sw.outputs["Y"], rw.inputs["Fac"])
    ew = node(t, "ShaderNodeEmission")
    t.links.new(rw.outputs["Color"], ew.inputs["Color"])
    ow = node(t, "ShaderNodeSeparateXYZ")
    t.links.new(tw.outputs["Object"], ow.inputs[0])
    cxy = node(t, "ShaderNodeCombineXYZ")
    t.links.new(ow.outputs["X"], cxy.inputs["X"])
    t.links.new(ow.outputs["Y"], cxy.inputs["Y"])
    rr = node(t, "ShaderNodeVectorMath", operation="LENGTH")
    t.links.new(cxy.outputs[0], rr.inputs[0])
    fd = node(t, "ShaderNodeMapRange", interpolation_type="SMOOTHSTEP")
    t.links.new(rr.outputs["Value"], fd.inputs["Value"])
    fd.inputs["From Min"].default_value = radius * 0.25
    fd.inputs["From Max"].default_value = radius * 0.9
    cl = node(t, "ShaderNodeLightPath")
    cf = node(t, "ShaderNodeMath", operation="MULTIPLY")
    t.links.new(fd.outputs["Result"], cf.inputs[0])
    t.links.new(cl.outputs["Is Camera Ray"], cf.inputs[1])
    ms = node(t, "ShaderNodeMixShader")
    t.links.new(cf.outputs[0], ms.inputs["Fac"])
    t.links.new(b.outputs["BSDF"], ms.inputs[1])
    t.links.new(ew.outputs["Emission"], ms.inputs[2])
    t.links.new(ms.outputs["Shader"], out.inputs["Surface"])
    o = mesh_obj(name, lambda bm: bmesh.ops.create_circle(bm, cap_ends=True, segments=96, radius=radius), m, c)
    o.location = at
    return o


def shadow_clear(m):
    """clear parts (glass/plastic covers, X-ray materials) must not cast solid shadows when caustics are off
    (final renders turn them off to avoid noise): shadow rays see a transparent surface instead"""
    nt = m.node_tree
    out = [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"][0]
    src = out.inputs["Surface"].links[0].from_socket
    lp = nt.nodes.new("ShaderNodeLightPath")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(lp.outputs["Is Shadow Ray"], mx.inputs["Fac"])
    nt.links.new(src, mx.inputs[1])
    nt.links.new(tr.outputs["BSDF"], mx.inputs[2])
    nt.links.new(mx.outputs["Shader"], out.inputs["Surface"])


# ════════════════════════════ STATION A — the laptop ════════════════════════════
CA = coll("A.Laptop")
cyclorama("A.floor", V((0, 0, 0)), 1.6, CA)
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(A, "sketchfab/a14d471ffda04d38a1910b9ef87e8dff/model.glb"))
new = [o for o in bpy.data.objects if o not in before]
parts = [o for o in new if o.type == "MESH"]
for o in parts:
    mw = o.matrix_world.copy()
    o.parent = None
    o.data.transform(mw)
    o.matrix_world = Matrix.Identity(4)
    for c in list(o.users_collection):
        c.objects.unlink(o)
    CA.objects.link(o)
for o in new:
    if o.type != "MESH":
        bpy.data.objects.remove(o, do_unlink=True)
pts = [v.co for o in parts for v in o.data.vertices]
lo = V([min(p[i] for p in pts) for i in range(3)])
hi = V([max(p[i] for p in pts) for i in range(3)])
LAP_W = 0.36  # a 15.6-inch laptop is ~36 cm wide
s = LAP_W / (hi.x - lo.x)
anchor = V(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
for o in parts:
    o.data.transform(Matrix.Scale(s, 4) @ Matrix.Translation(-anchor))
print("LAPTOP scale", round(s, 4), "size", [round((hi[i] - lo[i]) * s, 3) for i in range(3)])

# premium materials by part (from the model's own material names: blinn1SG body/lid/keys, lambert2SG legends,
# phongE1SG the screen panel)
alu = mat("lap.aluminium", (0.36, 0.37, 0.39), metallic=1.0, rough=0.3, **{"Anisotropic": 0.35})
brushed(alu)
keys = mat("lap.keycap", (0.018, 0.018, 0.02), rough=0.55, **{"Specular IOR Level": 0.35})
legend = mat("lap.legend", (0.9, 0.92, 0.95), rough=0.4, **{"Emission Color": (0.78, 0.88, 1.0, 1), "Emission Strength": 1.1})
for o in parts:
    names = [m.name for m in o.data.materials if m]
    z0 = min(v.co.z for v in o.data.vertices)
    zh = max(v.co.z for v in o.data.vertices) - z0
    o.data.materials.clear()
    if any("lambert2" in n for n in names):
        o.data.materials.append(legend)
        o.name = "A.legends"
    elif any("phongE1" in n for n in names):
        o.name = "A.screen.panel"
        o.data.materials.append(keys)
    elif len(o.data.polygons) > 4500 and zh < 0.02:
        o.data.materials.append(keys)
        o.name = "A.keys"
    else:
        o.data.materials.append(alu)
        o.name = "A.body"
    for p in o.data.polygons:
        p.use_smooth = True
    if o.name.startswith(("A.body", "A.keys")):
        o.modifiers.new("wn", "WEIGHTED_NORMAL")

# glass trackpad: one buttonless etched-glass pad (silver-backed, glossy coat) over the model's old recess and
# click buttons, centred under the main key block like a laptop with a number pad; a thin dark gap rings it
TP_X0, TP_X1, TP_Y0, TP_Y1 = -0.0935, -0.0005, -0.118, -0.0505  # measured from the deck: recess + buttons
TP_TOP = 0.0144  # flush with the keycap tops' base plane, 0.7 mm proud of the deck (0.0137)
tp_glass = mat("lap.trackpad", (0.2, 0.205, 0.215), rough=0.55, **{"Coat Weight": 1.0, "Coat Roughness": 0.14, "Coat IOR": 1.52, "Specular IOR Level": 0.5})
_tt = tp_glass.node_tree  # etched-glass micro texture: a fine noise in the coat roughness
_tn = node(_tt, "ShaderNodeTexNoise", Scale=900.0, Detail=2.0)
_tr = node(_tt, "ShaderNodeMapRange")
_tr.inputs["To Min"].default_value, _tr.inputs["To Max"].default_value = 0.11, 0.18
_tt.links.new(_tn.outputs["Fac"], _tr.inputs["Value"])
_tt.links.new(_tr.outputs["Result"], _tt.nodes["Principled BSDF"].inputs["Coat Roughness"])
# the model's old recess floor and click buttons sit under the pad (the buttons rise 0.06 mm above it): cut them out
import bmesh as _bm
for _o in [o for o in CA.objects if o.name.startswith("A.body") and o.type == "MESH"]:
    _b = _bm.new()
    _b.from_mesh(_o.data)
    _dead = [f for f in _b.faces if (lambda c: TP_X0 < c.x < TP_X1 and TP_Y0 < c.y < TP_Y1 and c.z > 0.012)(f.calc_center_median())]
    _bm.ops.delete(_b, geom=_dead, context="FACES")
    _b.to_mesh(_o.data)
    _b.free()
tp_gap = mat("lap.trackpad.gap", (0.01, 0.01, 0.012), rough=0.8)
_tpc = V(((TP_X0 + TP_X1) / 2, (TP_Y0 + TP_Y1) / 2, 0))
box("A.trackpad.gap", (TP_X1 - TP_X0 + 0.0016, TP_Y1 - TP_Y0 + 0.0016, 0.0016), _tpc + V((0, 0, 0.0131)), tp_gap, CA, bevel=0.0012)
box("A.trackpad", (TP_X1 - TP_X0, TP_Y1 - TP_Y0, 0.0018), _tpc + V((0, 0, TP_TOP - 0.0009)), tp_glass, CA, bevel=0.0009, segs=4)


# the screen: a glossy glass panel showing a video editor mid-render (built as emissive geometry just in front)
panel = [o for o in parts if o.name.startswith("A.screen.panel")][0]
pp = [v.co for v in panel.data.vertices]
sx0, sx1 = min(p.x for p in pp), max(p.x for p in pp)
sz0, sz1 = min(p.z for p in pp), max(p.z for p in pp)
sy = min(p.y for p in pp) - 0.0004  # just in front of the panel (the screen faces −Y)
SW, SH = sx1 - sx0, sz1 - sz0
print("SCREEN", round(SW, 3), "x", round(SH, 3))


def screen_rect(name, x0, z0, x1, z1, color, strength=1.0, dy=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    t = m.node_tree
    t.nodes.clear()
    out_ = t.nodes.new("ShaderNodeOutputMaterial")
    em = t.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*color, 1)
    em.inputs["Strength"].default_value = strength
    t.links.new(em.outputs["Emission"], out_.inputs["Surface"])

    def build(bm):
        for x, z in ((x0, z0), (x1, z0), (x1, z1), (x0, z1)):
            bm.verts.new((sx0 + x * SW, sy - dy, sz0 + z * SH))
        bm.faces.new(bm.verts[:])
    return mesh_obj(name, build, m, CA, smooth=False)


NO_SCREEN_TEXT = True  # the user's rule for these shorts: no words anywhere in the picture (the UI reads without them)


def screen_text(txt, x, z, size, color=(0.78, 0.8, 0.86), align="LEFT", strength=1.2, dy=0.0003):
    if NO_SCREEN_TEXT:
        return None
    cu = bpy.data.curves.new("A.ui.label", "FONT")
    cu.body = txt
    cu.align_x, cu.align_y = align, "CENTER"
    cu.size = size * SH
    to = bpy.data.objects.new("A.ui.label", cu)
    CA.objects.link(to)
    to.location = (sx0 + x * SW, sy - dy, sz0 + z * SH)
    to.rotation_euler = (math.radians(90), 0, 0)
    tm = bpy.data.materials.new("A.ui.labelmat")
    tm.use_nodes = True
    t = tm.node_tree
    t.nodes.clear()
    o_ = t.nodes.new("ShaderNodeOutputMaterial")
    e_ = t.nodes.new("ShaderNodeEmission")
    e_.inputs["Color"].default_value = (*color, 1)
    e_.inputs["Strength"].default_value = strength
    t.links.new(e_.outputs["Emission"], o_.inputs["Surface"])
    cu.materials.append(tm)
    return to


screen_rect("A.ui.bg", 0, 0, 1, 1, (0.028, 0.03, 0.036), 1.0)
screen_rect("A.ui.topbar", 0, 0.955, 1, 1, (0.06, 0.064, 0.075), 1.0, 0.0001)
screen_rect("A.ui.media", 0.01, 0.38, 0.2, 0.94, (0.045, 0.048, 0.057), 1.0, 0.0001)
for r_ in range(4):  # media bin thumbnails
    for c_ in range(2):
        screen_rect(f"A.ui.thumb{r_}{c_}", 0.02 + c_ * 0.09, 0.82 - r_ * 0.11, 0.1 + c_ * 0.09, 0.91 - r_ * 0.11, (0.18 + 0.05 * c_, 0.24, 0.32 + 0.03 * r_), 0.6, 0.0002)
screen_rect("A.ui.inspector", 0.8, 0.38, 0.99, 0.94, (0.045, 0.048, 0.057), 1.0, 0.0001)
for r_ in range(9):
    screen_rect(f"A.ui.prop{r_}", 0.815, 0.88 - r_ * 0.055, 0.97 - 0.05 * (r_ % 3), 0.895 - r_ * 0.055, (0.16, 0.17, 0.2), 0.8, 0.0002)
screen_rect("A.ui.viewer", 0.21, 0.38, 0.79, 0.94, (0.0, 0.0, 0.0), 1.0, 0.0001)
screen_rect("A.ui.timeline", 0.01, 0.02, 0.99, 0.36, (0.038, 0.04, 0.048), 1.0, 0.0001)
_cols = [(0.2, 0.3, 0.52), (0.22, 0.4, 0.32), (0.5, 0.38, 0.22), (0.36, 0.3, 0.48), (0.24, 0.34, 0.42), (0.42, 0.28, 0.3)]
_rr = random.Random(5)
# the editor shows a frame of our previous short; kept as stable copies in blender/assets/s03 (not out/, which is
# scratch and may be cleaned)
EDIT_THUMB = os.path.join(A, "s03/editor_thumb.png")
EDIT_PREVIEW = os.path.join(A, "s03/editor_preview.png")
assert os.path.isfile(EDIT_THUMB) and os.path.isfile(EDIT_PREVIEW), "missing blender/assets/s03/editor_*.png"
_thumb = None
if True:
    _thumb = bpy.data.materials.new("A.ui.thumb")
    _thumb.use_nodes = True
    _t = _thumb.node_tree
    _t.nodes.clear()
    _o = _t.nodes.new("ShaderNodeOutputMaterial")
    _e = _t.nodes.new("ShaderNodeEmission")
    _im = _t.nodes.new("ShaderNodeTexImage")
    _im.image = bpy.data.images.load(EDIT_THUMB, check_existing=True)
    _t.links.new(_im.outputs["Color"], _e.inputs["Color"])
    _e.inputs["Strength"].default_value = 0.8
    _t.links.new(_e.outputs["Emission"], _o.inputs["Surface"])


def waveform(name, x0, x1, zc, half, seed):
    """an audio clip's waveform: thin vertical bars (emissive), loud and quiet passages"""
    rr_ = random.Random(seed)
    m = bpy.data.materials.get("A.ui.wave") or bpy.data.materials.new("A.ui.wave")
    m.use_nodes = True
    t = m.node_tree
    t.nodes.clear()
    o_ = t.nodes.new("ShaderNodeOutputMaterial")
    e_ = t.nodes.new("ShaderNodeEmission")
    e_.inputs["Color"].default_value = (0.55, 0.9, 0.7, 1)
    e_.inputs["Strength"].default_value = 0.9
    t.links.new(e_.outputs["Emission"], o_.inputs["Surface"])

    def build(bm):
        n = int((x1 - x0) / 0.0025)
        env = 0.5
        for i in range(n):
            env = max(0.15, min(1.0, env + rr_.uniform(-0.18, 0.18)))
            h = half * env * rr_.uniform(0.35, 1.0)
            xa = x0 + i * 0.0025
            vs = [bm.verts.new((sx0 + xx * SW, sy - 0.0004, sz0 + zz * SH)) for xx, zz in ((xa, zc - h), (xa + 0.0013, zc - h), (xa + 0.0013, zc + h), (xa, zc + h))]
            bm.faces.new(vs)
    return mesh_obj(name, build, m, CA, smooth=False)


for k in range(6):  # tracks of clips: bottom three audio (waveforms), top three video (thumbnails)
    x = 0.08
    z0_, z1_ = 0.045 + k * 0.05, 0.083 + k * 0.05
    while x < 0.96:
        wdt = _rr.uniform(0.05, 0.16)
        x1 = min(0.96, x + wdt)
        screen_rect(f"A.ui.clip{k}_{x:.2f}", x, z0_, x1, z1_, _cols[k], 0.5, 0.0002)
        if k < 3:
            waveform(f"A.ui.wave{k}_{x:.2f}", x + 0.004, x1 - 0.004, (z0_ + z1_) / 2, (z1_ - z0_) * 0.4, int(x * 1000) + k)
        elif _thumb is not None and x1 - x > 0.03:
            th = screen_rect(f"A.ui.th{k}_{x:.2f}", x + 0.002, z0_ + 0.003, x + 0.022, z1_ - 0.003, (1, 1, 1), 1.0, 0.0003)
            th.data.materials.clear()
            th.data.materials.append(_thumb)
            uvl = th.data.uv_layers.new(name="UVMap")
            for lp_, uv in zip(th.data.loops, ((0.3, 0.35), (0.7, 0.35), (0.7, 0.65), (0.3, 0.65))):
                uvl.data[lp_.index].uv = uv
        x = x1 + _rr.uniform(0.004, 0.02)
for k, lab in enumerate(("A1", "A2", "A3", "V1", "V2", "V3")):  # track headers
    screen_text(lab, 0.02, 0.064 + k * 0.05, 0.02, (0.6, 0.62, 0.68))
screen_text("File   Edit   Clip   Sequence   Effects   Export   Window   Help", 0.02, 0.977, 0.019, (0.72, 0.74, 0.8))
screen_text("Media", 0.02, 0.925, 0.018, (0.6, 0.62, 0.68))
screen_text("Inspector", 0.81, 0.925, 0.018, (0.6, 0.62, 0.68))
screen_text("00:00:12:08", 0.5, 0.372, 0.022, (0.95, 0.96, 1.0), align="CENTER")
screen_rect("A.ui.playhead", 0.47, 0.03, 0.473, 0.35, (1.0, 0.25, 0.2), 1.5, 0.0003)
# the render progress panel: a frame + a bar that s03_shots.py animates (progress_k scales its width)
screen_rect("A.ui.dialog", 0.3, 0.52, 0.7, 0.68, (0.11, 0.115, 0.135), 1.0, 0.0002)
screen_rect("A.ui.bar.bg", 0.33, 0.56, 0.67, 0.585, (0.2, 0.21, 0.24), 1.0, 0.0003)
bar = screen_rect("A.ui.bar", 0.0, 0.0, 1.0, 1.0, (0.2, 0.55, 1.0), 2.0, 0.0004)
# the bar's mesh spans the full screen-space unit; scale it into the slot about its left edge
bar.data.transform(Matrix.Translation(V((-sx0, -sy + 0.0004, -sz0))))
bar.data.transform(Matrix.Diagonal((0.34 * SW / SW, 1, 0.025 * SH / SH, 1)))
bar.location = (sx0 + 0.33 * SW, sy - 0.0004, sz0 + 0.56 * SH)
bar.scale = (SW, 1, SH)
bar["progress_k"] = 0.12
bar["slot_w"] = SW  # s03_rig.progress(): bar.scale.x = slot_w × progress (0..1), grows from its left edge
for txt, x, z, size, col in () if NO_SCREEN_TEXT else (("Rendering…  12%", 0.5, 0.635, 0.032, (0.92, 0.94, 1.0)), ("Exporting: my_video.mp4", 0.5, 0.6, 0.022, (0.6, 0.64, 0.72))):
    cu = bpy.data.curves.new("A.ui.text", "FONT")
    cu.body = txt
    cu.align_x, cu.align_y = "CENTER", "CENTER"
    cu.size = size * SH
    to = bpy.data.objects.new("A.ui.text", cu)
    CA.objects.link(to)
    to.location = (sx0 + x * SW, sy - 0.0005, sz0 + z * SH)
    to.rotation_euler = (math.radians(90), 0, 0)
    tm = bpy.data.materials.new("A.ui.textmat")
    tm.use_nodes = True
    t = tm.node_tree
    t.nodes.clear()
    o_ = t.nodes.new("ShaderNodeOutputMaterial")
    e_ = t.nodes.new("ShaderNodeEmission")
    e_.inputs["Color"].default_value = (*col, 1)
    e_.inputs["Strength"].default_value = 1.4
    t.links.new(e_.outputs["Emission"], o_.inputs["Surface"])
    cu.materials.append(tm)
    if txt.startswith("Rendering"):
        to.name = "A.ui.percent"
# the preview in the viewer: a frame from our own previous short, if rendered (a nod to "rendering a video")
if True:
    vm = bpy.data.materials.new("A.ui.preview")
    vm.use_nodes = True
    t = vm.node_tree
    t.nodes.clear()
    o_ = t.nodes.new("ShaderNodeOutputMaterial")
    e_ = t.nodes.new("ShaderNodeEmission")
    im = t.nodes.new("ShaderNodeTexImage")
    im.image = bpy.data.images.load(EDIT_PREVIEW, check_existing=True)
    t.links.new(im.outputs["Color"], e_.inputs["Color"])
    e_.inputs["Strength"].default_value = 0.9
    t.links.new(e_.outputs["Emission"], o_.inputs["Surface"])
    pv = screen_rect("A.ui.previewimg", 0.42, 0.39, 0.58, 0.89, (1, 1, 1), 1.0, 0.0001)
    pv.data.materials.clear()
    pv.data.materials.append(vm)
    me = pv.data
    uvl = me.uv_layers.new(name="UVMap")
    for lp_, uv in zip(me.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        uvl.data[lp_.index].uv = uv
# a glass sheet over the whole display (reflections)
glass = mat("lap.glass", (0.0, 0.0, 0.0), rough=0.03, **{"Transmission Weight": 1.0, "IOR": 1.5, "Alpha": 1.0})
gl = screen_rect("A.ui.glass", -0.01, -0.01, 1.01, 1.01, (0, 0, 0), 0.0, 0.0012)
gl.data.materials.clear()
gl.data.materials.append(mat("lap.screenglass", (0.0, 0.0, 0.0), rough=0.02, **{"Coat Weight": 1.0, "Coat Roughness": 0.01, "Alpha": 0.0}))
gl.data.materials[0].node_tree.nodes["Principled BSDF"].inputs["Alpha"].default_value = 0.08
for o in CA.objects:
    o["station"] = "A"

# ════════════════════════════ STATION B — inside the laptop ════════════════════════════
CB = coll("B.Inside")
B0 = V((10.0, 0.0, 0.0))
_bf = cyclorama("B.floor", B0, 1.6, CB)
_bf.is_shadow_catcher = True  # the inside floats in the same blue void as the reference: only its soft contact shadow shows
# measurements of a thin 15" laptop's insides (m)
BW, BD = 0.345, 0.235  # bottom tray inside
pcb = mat("pcb", (0.012, 0.03, 0.022), rough=0.35, **{"Coat Weight": 0.6, "Coat Roughness": 0.15})
_t = pcb.node_tree
_b = _t.nodes["Principled BSDF"]
# copper traces under the solder mask, the way routed boards look: the board is divided into rectangular routing
# zones (Chebyshev Voronoi = straight-edged cells); each zone carries straight parallel traces in ONE direction
# (or is a plain ground pour). Traces are only slightly lighter and raised: the mask is an even, glossy green.
_tc = node(_t, "ShaderNodeTexCoord")
_zone = node(_t, "ShaderNodeTexVoronoi", Scale=28.0, distance="CHEBYCHEV", feature="F1", Randomness=0.85)
_t.links.new(_tc.outputs["Object"], _zone.inputs["Vector"])
_zs = node(_t, "ShaderNodeSeparateColor")
_t.links.new(_zone.outputs["Color"], _zs.inputs["Color"])
_tr = []
for d, scl, lo_, hi_ in (("X", 1100.0, 0.0, 0.4), ("Y", 1000.0, 0.4, 0.75)):
    wv = node(_t, "ShaderNodeTexWave", wave_type="BANDS", bands_direction=d, Scale=scl, Distortion=0.0, Detail=0.0)
    _t.links.new(_tc.outputs["Object"], wv.inputs["Vector"])
    th = node(_t, "ShaderNodeMath", operation="GREATER_THAN")
    _t.links.new(wv.outputs["Fac"], th.inputs[0])
    th.inputs[1].default_value = 0.82
    g1 = node(_t, "ShaderNodeMath", operation="GREATER_THAN")
    _t.links.new(_zs.outputs[0], g1.inputs[0])
    g1.inputs[1].default_value = lo_
    l1 = node(_t, "ShaderNodeMath", operation="LESS_THAN")
    _t.links.new(_zs.outputs[0], l1.inputs[0])
    l1.inputs[1].default_value = hi_
    zm = node(_t, "ShaderNodeMath", operation="MULTIPLY")
    _t.links.new(g1.outputs[0], zm.inputs[0])
    _t.links.new(l1.outputs[0], zm.inputs[1])
    ml = node(_t, "ShaderNodeMath", operation="MULTIPLY")
    _t.links.new(th.outputs[0], ml.inputs[0])
    _t.links.new(zm.outputs[0], ml.inputs[1])
    _tr.append(ml)
tsum = node(_t, "ShaderNodeMath", operation="MAXIMUM")
_t.links.new(_tr[0].outputs[0], tsum.inputs[0])
_t.links.new(_tr[1].outputs[0], tsum.inputs[1])
tcol = node(_t, "ShaderNodeMix", data_type="RGBA")
_t.links.new(tsum.outputs[0], tcol.inputs["Factor"])
tcol.inputs[6].default_value = (0.014, 0.034, 0.024, 1)
tcol.inputs[7].default_value = (0.022, 0.05, 0.034, 1)
_t.links.new(tcol.outputs[2], _b.inputs["Base Color"])
tbump = node(_t, "ShaderNodeBump", Strength=0.2, Distance=0.00003)
_t.links.new(tsum.outputs[0], tbump.inputs["Height"])
_t.links.new(tbump.outputs["Normal"], _b.inputs["Normal"])
copper = mat("copper", (0.95, 0.6, 0.45), metallic=1.0, rough=0.28)
brushed(copper, scale=(1.0, 200.0, 1.0), strength=0.04)
_ct = copper.node_tree
_cb = _ct.nodes["Principled BSDF"]
_ctc = node(_ct, "ShaderNodeTexCoord")
_cn = node(_ct, "ShaderNodeTexNoise", Scale=60.0, Detail=6.0, Roughness=0.6)
_ct.links.new(_ctc.outputs["Object"], _cn.inputs["Vector"])
_cr = node(_ct, "ShaderNodeValToRGB")
_cr.color_ramp.elements[0].position = 0.35
_cr.color_ramp.elements[0].color = (0.95, 0.6, 0.45, 1)
_cr.color_ramp.elements[1].position = 0.75
_cr.color_ramp.elements[1].color = (0.7, 0.36, 0.22, 1)
_ct.links.new(_cn.outputs["Fac"], _cr.inputs["Fac"])
_ct.links.new(_cr.outputs["Color"], _cb.inputs["Base Color"])
_crr = node(_ct, "ShaderNodeMapRange")
_ct.links.new(_cn.outputs["Fac"], _crr.inputs["Value"])
_crr.inputs["To Min"].default_value, _crr.inputs["To Max"].default_value = 0.22, 0.42
_ct.links.new(_crr.outputs["Result"], _cb.inputs["Roughness"])
alu_fin = mat("alu.fin", (0.82, 0.83, 0.85), metallic=1.0, rough=0.3)
black_plastic = mat("plastic.black", (0.015, 0.015, 0.016), rough=0.45)
tray = mat("tray.alu", (0.1, 0.105, 0.11), metallic=1.0, rough=0.4)
brushed(tray)
gold = mat("gold", (1.0, 0.76, 0.33), metallic=1.0, rough=0.25)
silicon = mat("silicon.back", (0.55, 0.57, 0.6), metallic=1.0, rough=0.12)
substrate = mat("substrate", (0.05, 0.06, 0.035), rough=0.4, **{"Coat Weight": 0.4})
battery_m = mat("battery", (0.04, 0.04, 0.045), rough=0.55)
label_m = mat("label", (0.85, 0.85, 0.82), rough=0.6)
# the bottom tray (open)
box("B.tray.floor", (BW + 0.012, BD + 0.012, 0.0015), B0 + V((0, 0, 0.00075)), tray, CB, bevel=0.002)
for nm, sz, off in (("front", (BW + 0.012, 0.006, 0.014), V((0, -(BD + 0.006) / 2, 0.007))), ("back", (BW + 0.012, 0.006, 0.014), V((0, (BD + 0.006) / 2, 0.007)))):
    box(f"B.tray.{nm}", sz, B0 + off, tray, CB, bevel=0.0015)
# the side walls carry the same openings as the laptop's outside (measured on the model): exhaust slots and
# Ethernet / HDMI / 2× USB-A on the left; an SD slot and a USB-A on the right. (y0, y1, z0, z1) in m.
VENTS = [(0.018, 0.020), (0.024, 0.026), (0.030, 0.032), (0.036, 0.038), (0.043, 0.045), (0.049, 0.051), (0.055, 0.057), (0.060, 0.062), (0.066, 0.068), (0.072, 0.074), (0.077, 0.079)]
OPEN_L = [(a, b, 0.0035, 0.0075) for a, b in VENTS] + [(-0.022, -0.007, 0.0025, 0.0105), (-0.046, -0.029, 0.0042, 0.0088), (-0.072, -0.054, 0.0040, 0.0090), (-0.096, -0.078, 0.0040, 0.0090)]
OPEN_R = [(-0.091, -0.063, 0.0085, 0.0107), (-0.056, -0.042, 0.0040, 0.0090)]


def wall_with_openings(name, xc, openings, y0=-BD / 2, y1=BD / 2, z0=0.0, z1=0.014, t=0.006):
    """a side wall as ONE solid with its openings cut by a boolean, then every edge rounded (0.25 mm, like machined
    aluminium): exhaust slots get fully rounded ends (stadium slots), port openings small corner radii"""
    cut_c = bpy.data.collections.get(name + ".cutters") or bpy.data.collections.new(name + ".cutters")
    if cut_c.name not in sc.collection.children:
        sc.collection.children.link(cut_c)
    for o_ in list(cut_c.objects):
        bpy.data.objects.remove(o_, do_unlink=True)
    w = box(name, (t, y1 - y0, z1 - z0), B0 + V((xc, (y0 + y1) / 2, (z0 + z1) / 2)), tray, CB)
    for k_, (a_, b_, c0, c1) in enumerate(openings):
        wy, hz = b_ - a_, c1 - c0
        r_ = min(wy, hz) * 0.49 if min(wy, hz) < 0.003 else 0.0006  # slots: round ends; ports: 0.6 mm corners
        cu_ = box(f"{name}.cut{k_}", (t + 0.004, wy, hz), B0 + V((xc, (a_ + b_) / 2, (c0 + c1) / 2)), None, cut_c, bevel=r_, segs=6)
        cu_.hide_render = True
        cu_.display_type = "BOUNDS"
    bo_ = w.modifiers.new("openings", "BOOLEAN")
    bo_.operation, bo_.solver, bo_.operand_type = "DIFFERENCE", "EXACT", "COLLECTION"
    bo_.collection = cut_c
    bv_ = w.modifiers.new("round", "BEVEL")
    bv_.width, bv_.segments, bv_.limit_method = 0.00025, 3, "ANGLE"
    bv_.angle_limit = math.radians(30)
    bv_.harden_normals = True
    w.modifiers.new("wn", "WEIGHTED_NORMAL")
    for p_ in w.data.polygons:
        p_.use_smooth = True
    return w


wall_with_openings("B.tray.left", -(BW + 0.006) / 2, OPEN_L)
wall_with_openings("B.tray.right", (BW + 0.006) / 2, OPEN_R)
# battery along the front, main board along the back
battery_m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.008, 0.008, 0.009, 1)
battery_m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.42
for k_, dx_ in enumerate((-0.0565, 0.0565)):  # two cells in a soft black wrap
    box(f"B.battery.cell{k_}", (0.11, 0.085, 0.006), B0 + V((dx_, -0.065, 0.0045)), battery_m, CB, bevel=0.0025, segs=4)
box("B.battery.frame", (0.226, 0.004, 0.003), B0 + V((0, -0.0215, 0.003)), battery_m, CB, bevel=0.0008)
box("B.battery.label", (0.096, 0.034, 0.0002), B0 + V((0.0565, -0.065, 0.0076)), label_m, CB)
BOARD_Z = 0.004
board = box("B.board", (0.255, 0.11, 0.0012), B0 + V((0.0375, 0.05, BOARD_Z)), pcb, CB, bevel=0.0006)
# the chip (SoC) under a copper cold plate; memory packages beside it; an SSD
CHIP = B0 + V((-0.035, 0.055, BOARD_Z + 0.0006))
box("B.chip.substrate", (0.04, 0.04, 0.0012), CHIP + V((0, 0, 0.0006)), substrate, CB, bevel=0.0004)
box("B.chip.die", (0.016, 0.012, 0.0008), CHIP + V((0, 0, 0.0016)), silicon, CB, bevel=0.0002)
cold = box("B.coldplate", (0.05, 0.046, 0.0025), CHIP + V((0, 0, 0.0033)), copper, CB, bevel=0.0008)
for k, dx in enumerate((-0.03, 0.03)):
    box(f"B.ram{k}", (0.012, 0.014, 0.0011), CHIP + V((dx + (0.0 if k else 0.0), -0.018, 0.0006)), black_plastic, CB, bevel=0.0003)
box("B.ssd", (0.08, 0.022, 0.0025), B0 + V((0.05, 0.015, BOARD_Z + 0.0018)), black_plastic, CB, bevel=0.0006)
box("B.ssd.label", (0.06, 0.018, 0.0002), B0 + V((0.05, 0.015, BOARD_Z + 0.0032)), label_m, CB)
# small surface-mount parts scattered on the board (capacitors, resistors): instanced, seeded


def smd_parts(seed):
    """surface-mount parts the way boards really look: tidy rows of 0402/0603 capacitors (tan ceramic) and resistors
    (black), each with bright tinned end caps, in clusters around the chip and along the power stages"""
    rr = random.Random(seed)
    body_c = mat("smd.cap", (0.2, 0.14, 0.08), rough=0.5)
    body_r = mat("smd.res", (0.02, 0.02, 0.022), rough=0.4)
    tin = mat("smd.tin", (0.68, 0.68, 0.7), metallic=1.0, rough=0.38)
    me = bpy.data.meshes.new("B.smd")
    bm = bmesh.new()

    def part(x, y, along_x, size, kind):
        L, Wd, H = size
        cap = L * 0.22
        for k, (cx, ln, mi) in enumerate(((0.0, L - 2 * cap, 0 if kind == "c" else 1), (-(L - cap) / 2, cap, 2), ((L - cap) / 2, cap, 2))):
            ret = bmesh.ops.create_cube(bm, size=1.0)
            vs = ret["verts"]
            bmesh.ops.scale(bm, vec=(ln, Wd, H * (1.0 if k == 0 else 1.04)), verts=vs)
            bmesh.ops.translate(bm, vec=(cx, 0, H / 2), verts=vs)
            if not along_x:
                bmesh.ops.rotate(bm, verts=vs, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "Z"))
            bmesh.ops.translate(bm, vec=(x, y, 0), verts=vs)
            for f in {f for v in vs for f in v.link_faces}:
                f.material_index = mi

    # clusters: (centre x, centre y, rows, cols, pitch, orientation)
    clusters = [(-0.035, 0.09, 2, 14, 0.0016, True), (-0.035, 0.02, 2, 14, 0.0016, True), (-0.07, 0.055, 12, 2, 0.0016, False),
                (0.0, 0.055, 12, 2, 0.0016, False), (0.03, 0.065, 3, 6, 0.0022, True), (0.1, 0.035, 3, 6, 0.0022, True),
                (0.06, 0.1, 2, 8, 0.002, True), (0.14, 0.055, 6, 2, 0.002, False), (-0.08, 0.012, 3, 6, 0.002, True)]
    for cx, cy, nr, nc, pitch, ax in clusters:
        for i in range(nr):
            for j in range(nc):
                if rr.random() < 0.12:
                    continue
                kind = "c" if rr.random() < 0.65 else "r"
                size = rr.choice(((0.001, 0.0005, 0.0005), (0.0016, 0.0008, 0.0006)))
                x = cx + (j - (nc - 1) / 2) * pitch * (1.6 if ax else 1.0)
                y = cy + (i - (nr - 1) / 2) * pitch * (1.0 if ax else 1.6)
                part(x, y, ax, size, kind)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new("B.smd", me)
    CB.objects.link(o)
    o.location = B0 + V((0, 0, BOARD_Z + 0.0006))
    for m_ in (body_c, body_r, tin):
        o.data.materials.append(m_)
    bv_ = o.modifiers.new("round", "BEVEL")  # real chip capacitors/resistors have softly rounded ends
    bv_.width, bv_.segments, bv_.limit_method = 0.00004, 2, "ANGLE"
    o.modifiers.new("wn", "WEIGHTED_NORMAL")
    for p_ in o.data.polygons:
        p_.use_smooth = True
    return o


smd_parts(11)


def printed(name, text, loc, size, color=(0.85, 0.85, 0.85), rot_z=0.0, c=None):
    """laser-etched / printed text on a part (no brand names)"""
    cu = bpy.data.curves.new(name, "FONT")
    cu.body = text
    cu.align_x, cu.align_y = "CENTER", "CENTER"
    cu.size = size
    o = bpy.data.objects.new(name, cu)
    (c or CB).objects.link(o)
    o.location = loc
    o.rotation_euler = (0, 0, rot_z)
    cu.materials.append(mat(name + ".ink", color, rough=0.6))
    return o


# more of a real board: power-stage chokes, MOSFETs, controller chips, connectors, a ribbon cable to the battery
ferrite = mat("choke", (0.14, 0.14, 0.15), metallic=0.4, rough=0.55)
ic = mat("ic.black", (0.012, 0.012, 0.014), rough=0.55)
conn = mat("connector", (0.82, 0.78, 0.68), rough=0.5)
fpc = mat("fpc", (0.75, 0.42, 0.08), rough=0.35, **{"Coat Weight": 0.5})
for k in range(5):  # chokes in a row beside the chip (the power supply that feeds it)
    box(f"B.choke{k}", (0.0055, 0.0055, 0.003), B0 + V((0.003 + k * 0.0072, 0.092, BOARD_Z + 0.0021)), ferrite, CB, bevel=0.0006)
    box(f"B.mosfet{k}", (0.004, 0.004, 0.0008), B0 + V((0.003 + k * 0.0072, 0.082, BOARD_Z + 0.001)), ic, CB, bevel=0.0002)
for k, (pos, sz, txt) in enumerate(((V((0.085, 0.09, 0)), (0.009, 0.009, 0.0009), "EC 2K6"), (V((0.04, 0.045, 0)), (0.007, 0.007, 0.0009), "PMIC"),
                                     (V((0.14, 0.028, 0)), (0.006, 0.006, 0.0009), "AUD"), (V((-0.075, 0.025, 0)), (0.005, 0.005, 0.0008), "I/O"))):
    box(f"B.ic{k}", sz, B0 + pos + V((0, 0, BOARD_Z + 0.0006 + sz[2] / 2)), ic, CB, bevel=0.0002)
    printed(f"B.ic{k}.mark", txt, B0 + pos + V((0, 0, BOARD_Z + 0.0006 + sz[2] + 0.00005)), sz[0] * 0.18, (0.55, 0.55, 0.55))
box("B.conn.batt", (0.02, 0.005, 0.0025), B0 + V((0.0, -0.0, BOARD_Z + 0.0018)), conn, CB, bevel=0.0003)
box("B.fpc", (0.016, 0.03, 0.00015), B0 + V((0.0, -0.017, 0.0076)), fpc, CB)
grille = mat("speaker.grille", (0.02, 0.02, 0.022), rough=0.5)
_gt = grille.node_tree
_gv = node(_gt, "ShaderNodeTexVoronoi", Scale=1800.0, feature="F1")
_gtc = node(_gt, "ShaderNodeTexCoord")
_gt.links.new(_gtc.outputs["Object"], _gv.inputs["Vector"])
_gb = node(_gt, "ShaderNodeBump", Strength=0.8, Distance=0.0002)
_gt.links.new(_gv.outputs["Distance"], _gb.inputs["Height"])
_gt.links.new(_gb.outputs["Normal"], _gt.nodes["Principled BSDF"].inputs["Normal"])
for k, sx_ in enumerate((-0.126, 0.126)):  # speakers in the front corners, between the battery and the port boards
    box(f"B.speaker{k}", (0.018, 0.045, 0.008), B0 + V((sx_, -0.078, 0.0055)), grille, CB, bevel=0.002)
shield = mat("shield.can", (0.78, 0.79, 0.8), metallic=1.0, rough=0.35)
box("B.wifi.pcb", (0.022, 0.03, 0.0008), B0 + V((0.12, 0.07, BOARD_Z + 0.001)), pcb, CB)
box("B.wifi.shield", (0.018, 0.02, 0.0012), B0 + V((0.12, 0.068, BOARD_Z + 0.0021)), shield, CB, bevel=0.0003)
cable_m = mat("antenna.cable", (0.06, 0.06, 0.065), rough=0.45)


def cable(name, pts, r, m_):
    """a thin round cable along a polyline (smoothed)"""
    path = []
    for k in range(len(pts) - 1):
        path += [V(pts[k]).lerp(V(pts[k + 1]), i / 16) for i in range(16)]
    path.append(V(pts[-1]))
    for _ in range(6):
        path = [path[0]] + [(path[i - 1] + 2 * path[i] + path[i + 1]) / 4 for i in range(1, len(path) - 1)] + [path[-1]]
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    sp = cu.splines.new("POLY")
    sp.points.add(len(path) - 1)
    for i, p_ in enumerate(path):
        sp.points[i].co = (*p_, 1)
    cu.bevel_depth = r
    cu.bevel_resolution = 4
    o = bpy.data.objects.new(name, cu)
    CB.objects.link(o)
    cu.materials.append(m_)
    return o


for k, (dx, col) in enumerate(((0.004, cable_m), (-0.004, mat("antenna.cable.w", (0.6, 0.6, 0.62), rough=0.45)))):
    cable(f"B.antenna{k}", [B0 + V((0.12 + dx, 0.08, BOARD_Z + 0.003)), B0 + V((0.12 + dx, 0.1, BOARD_Z + 0.004)), B0 + V((0.12 + (0.02 if k else -0.03), 0.112, 0.006)), B0 + V((0.16 if k else -0.1, 0.112, 0.006))], 0.0007, col)
box("B.trackpad.fpc", (0.012, 0.05, 0.00015), B0 + V((-0.05, -0.04, 0.0078)), fpc, CB)
# labels with real-looking print (generic, no brands)
printed("B.battery.text1", "Li-ion  11.55V  4500mAh  52Wh", B0 + V((0.0565, -0.058, 0.0078)), 0.004, (0.08, 0.08, 0.08))
printed("B.battery.text2", "CAUTION: DO NOT PUNCTURE OR HEAT", B0 + V((0.0565, -0.072, 0.0078)), 0.003, (0.08, 0.08, 0.08))
printed("B.ssd.text", "NVMe SSD  1TB", B0 + V((0.05, 0.015, BOARD_Z + 0.00335)), 0.004, (0.1, 0.1, 0.1))
# cooling, matched to the outside: the only exhaust is the row of slots on the LEFT side (y 18–79 mm), so the fin
# stack sits right behind those slots, the blower sits beside it blowing out to the left (−X), and the two heat pipes
# run from the chip around the back of the fan into the fin stack (they pass through every fin, as real ones do)
FIN_C = B0 + V((-BW / 2 + 0.0105, 0.0485, 0.0075))  # fin stack centre, 1 mm off the left wall
FAN_C = B0 + V((-BW / 2 + 0.0195 + 0.0298, 0.0485, 0.0053))  # blower centre: its scroll just touches the fins


def heat_pipe(name, pts, w=0.008, t=0.0025, n_per=24):
    """a flattened copper heat pipe along a polyline (rounded rectangle cross-section, smooth bends)"""
    from mathutils.geometry import interpolate_bezier
    path = []
    for k in range(len(pts) - 1):
        a_, b_ = V(pts[k]), V(pts[k + 1])
        seg = [a_.lerp(b_, i / n_per) for i in range(n_per)]
        path += seg
    path.append(V(pts[-1]))
    # smooth the corners (a few passes of neighbour averaging, ends fixed)
    for _ in range(12):
        path = [path[0]] + [(path[i - 1] + path[i] * 2 + path[i + 1]) / 4 for i in range(1, len(path) - 1)] + [path[-1]]

    def build(bm):
        rings = []
        ns = 16
        for i, c in enumerate(path):
            d = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
            side = d.cross(UP).normalized()
            ring = []
            for j in range(ns):
                u = 2 * math.pi * j / ns
                cu, su = math.cos(u), math.sin(u)
                ring.append(bm.verts.new(c + side * (math.copysign(abs(cu) ** 0.4, cu) * w / 2) + UP * (math.copysign(abs(su) ** 0.4, su) * t / 2)))
            rings.append(ring)
        for i in range(len(rings) - 1):
            for j in range(ns):
                bm.faces.new((rings[i][j], rings[i + 1][j], rings[i + 1][(j + 1) % ns], rings[i][(j + 1) % ns]))
        bm.faces.new(rings[0][::-1])
        bm.faces.new(rings[-1])
    o = mesh_obj(name, build, copper, CB)
    o.modifiers.new("smooth", "SUBSURF").levels = 1
    return o


PZ = CHIP.z + 0.0058
_px1, _px2 = FIN_C.x + 0.0045, FIN_C.x - 0.0045  # where each pipe runs down through the fin stack
heat_pipe("B.heatpipe1", [CHIP + V((0.02, -0.006, 0.0058)), CHIP + V((-0.02, -0.006, 0.0058)), V((CHIP.x - 0.036, CHIP.y - 0.006, PZ)),
                          V((CHIP.x - 0.044, B0.y + 0.083, PZ)), V((_px1 + 0.012, B0.y + 0.083, PZ)), V((_px1, B0.y + 0.072, PZ)), V((_px1, B0.y + 0.018, PZ))])
heat_pipe("B.heatpipe2", [CHIP + V((0.02, 0.008, 0.0058)), CHIP + V((-0.02, 0.008, 0.0058)), V((CHIP.x - 0.03, CHIP.y + 0.008, PZ)),
                          V((CHIP.x - 0.036, B0.y + 0.093, PZ)), V((_px2 + 0.014, B0.y + 0.093, PZ)), V((_px2, B0.y + 0.08, PZ)), V((_px2, B0.y + 0.022, PZ))])
solder = mat("solder", (0.72, 0.72, 0.74), metallic=1.0, rough=0.32)
box("B.solder.cold", (0.044, 0.028, 0.0005), CHIP + V((0.0, 0.001, 0.0047)), solder, CB, bevel=0.0002)
# fin stack: 55 aluminium fins, 0.15 mm thick at 1.1 mm pitch across the 61 mm slot row, 9 mm tall, 18 mm deep;
# each fin is a plate facing the slots, so the fan's air runs between them and straight out of the side
fins = []
NF = 55
for k in range(NF):
    y = FIN_C.y - (NF - 1) * 0.0011 / 2 + k * 0.0011
    fins.append(box(f"B.fin{k:02d}", (0.018, 0.00015, 0.009), V((FIN_C.x, y, FIN_C.z + 0.0005)), alu_fin, CB))
bpy.ops.object.select_all(action="DESELECT")
for f in fins:
    f.select_set(True)
bpy.context.view_layer.objects.active = fins[0]
bpy.ops.object.join()
fins[0].name = "B.finstack"
# blower fan: housing (scroll) + impeller with 41 thin curved blades; the top cover is clear so we see it spin


def impeller(bm, r_in=0.008, r_out=0.022, h=0.0055, nb=41, thick=0.00035):
    for k in range(nb):
        a0 = 2 * math.pi * k / nb
        prof = []
        for i in range(8):
            t = i / 7
            r = r_in + (r_out - r_in) * t
            a = a0 + 0.55 * t  # backward-curved
            prof.append(V((r * math.cos(a), r * math.sin(a), 0)))
        side = []
        for i, p in enumerate(prof):
            d = (prof[min(i + 1, 7)] - prof[max(i - 1, 0)]).normalized()
            n = d.cross(UP).normalized() * thick / 2
            side.append((p + n, p - n))
        lo_ = [bm.verts.new(a + V((0, 0, 0))) for a, _ in side] + [bm.verts.new(b + V((0, 0, 0))) for _, b in side][::-1]
        hi_ = [bm.verts.new(v.co + V((0, 0, h))) for v in lo_]
        n_ = len(lo_)
        for i in range(n_):
            bm.faces.new((lo_[i], lo_[(i + 1) % n_], hi_[(i + 1) % n_], hi_[i]))
        bm.faces.new(lo_[::-1])
        bm.faces.new(hi_)
    hub = bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=r_in + 0.0004, radius2=r_in + 0.0004, depth=h)
    bmesh.ops.translate(bm, vec=(0, 0, h / 2), verts=hub["verts"])
    ring = bmesh.ops.create_cone(bm, cap_ends=False, segments=96, radius1=r_out, radius2=r_out, depth=0.0006)
    bmesh.ops.translate(bm, vec=(0, 0, 0.0003), verts=ring["verts"])


imp = mesh_obj("B.fan.impeller", impeller, black_plastic, CB)
imp.location = FAN_C + V((0, 0, -0.0028))  # the origin is the axle, so spinning it is a plain Z rotation
imp.modifiers.new("wn", "WEIGHTED_NORMAL")  # flat blade faces and hub top stay flat under smooth shading
hub_label = mat("fan.label", (0.035, 0.035, 0.038), rough=0.45)  # a black spec label, as on real laptop blowers (a pale one read as a glowing disc)
lab = mesh_obj("B.fan.hublabel", lambda bm: bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=0.0078, radius2=0.0078, depth=0.0002), hub_label, CB, smooth=False)  # flat: smooth-shading a disc makes it read as a dark dome
lab.parent = imp  # parented in the impeller's own space: on the hub top, spins with it
lab.location = (0, 0, 0.0056)
for k_, (txt_, dy_) in enumerate((("DC 5V  0.50A", 0.0018), ("BLOWER  12V3", -0.0016))):  # its fine print (no brand)
    pt_ = printed(f"B.fan.hublabel.t{k_}", txt_, V((0, 0, 0)), 0.0011, (0.62, 0.62, 0.6))
    pt_.parent = imp
    pt_.location = (0, dy_, 0.00572)


def scroll(bm, r=0.0235, wall=0.0012, h=0.0075, gap=0.004):
    """the blower housing: a spiral wall that opens toward the fin stack (+Y), on a base plate"""
    n = 120
    outer, inner = [], []
    for i in range(n + 1):
        t = i / n
        a = math.radians(110) + t * math.radians(320)
        rr_ = r + gap * t
        outer.append(V((math.cos(a) * (rr_ + wall), math.sin(a) * (rr_ + wall), 0)))
        inner.append(V((math.cos(a) * rr_, math.sin(a) * rr_, 0)))
    vs = []
    for o_, i_ in zip(outer, inner):
        vs.append((bm.verts.new(o_), bm.verts.new(i_), bm.verts.new(o_ + V((0, 0, h))), bm.verts.new(i_ + V((0, 0, h)))))
    for k in range(len(vs) - 1):
        a_, b_ = vs[k], vs[k + 1]
        bm.faces.new((a_[0], b_[0], b_[2], a_[2]))
        bm.faces.new((a_[1], a_[3], b_[3], b_[1]))
        bm.faces.new((a_[2], b_[2], b_[3], a_[3]))
        bm.faces.new((a_[0], a_[1], b_[1], b_[0]))
    base = bmesh.ops.create_circle(bm, cap_ends=True, segments=96, radius=r + gap + wall)
    bmesh.ops.translate(bm, vec=(0, 0, -0.0004), verts=base["verts"])


hs = mesh_obj("B.fan.housing", scroll, black_plastic, CB)
hs.location = FAN_C + V((0, 0, -0.0034))
hs.rotation_euler = (0, 0, math.radians(90))  # the scroll's outlet faces the fin stack (−X); air spins CCW
hs.modifiers.new("wn", "WEIGHTED_NORMAL")
clear = mat("fan.cover", (0.9, 0.9, 0.95), rough=0.05, **{"Transmission Weight": 1.0, "IOR": 1.45})
shadow_clear(clear)
cov = mesh_obj("B.fan.cover", lambda bm: bmesh.ops.create_circle(bm, cap_ends=True, segments=96, radius=0.0285), clear, CB)
cov.location = FAN_C + V((0, 0, 0.0043))
# screws: a few small dark-steel screws on the board and the fan
screw = mat("screw", (0.3, 0.31, 0.33), metallic=1.0, rough=0.35)
for k, p in enumerate([CHIP + V((-0.03, -0.028, 0.0006)), CHIP + V((0.03, 0.028, 0.0006)), CHIP + V((-0.03, 0.028, 0.0006)), CHIP + V((0.03, -0.028, 0.0006)), FAN_C + V((0.012, -0.026, 0.001)), FAN_C + V((0.012, 0.026, 0.001))]):
    sw_ = mesh_obj(f"B.screw{k}", lambda bm: bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.0022, radius2=0.0018, depth=0.0012), screw, CB)
    sw_.location = p
# ─── more of a real laptop's insides ─────────────────────────────────────────
steel = mat("steel.dark", (0.22, 0.23, 0.25), metallic=1.0, rough=0.38)
port_m = mat("port.metal", (0.7, 0.71, 0.73), metallic=1.0, rough=0.22)
kapton = mat("kapton", (0.36, 0.12, 0.0), rough=0.12, **{"Coat Weight": 0.5, "Coat Roughness": 0.05, "Alpha": 0.82})
mylar = mat("mylar.black", (0.01, 0.01, 0.012), rough=0.3, **{"Coat Weight": 0.6})
pad_m = mat("thermal.pad", (0.35, 0.36, 0.38), rough=0.8)
silk = mat("silkscreen", (0.85, 0.86, 0.84), rough=0.6)
IN_X, IN_Y = BW / 2, BD / 2  # inner half-sizes of the tray
# I/O: a port behind every opening of the outside. Each is a steel shell from the wall inward with a dark mouth and
# its real insides (USB-A: blue tongue with contacts; HDMI: black tongue; Ethernet: a jack with 8 gold pins; SD: a
# slot reader), on a small port board linked to the main board by a flat cable
contact = mat("contact.gold", (1.0, 0.78, 0.36), metallic=1.0, rough=0.3)
usb_blue = mat("usb.blue", (0.04, 0.16, 0.7), rough=0.4)
hole_m = mat("port.hole", (0.004, 0.004, 0.005), rough=0.9)


def port(name, side, y0, y1, z0, z1, depth, kind):
    """side −1 = left wall, +1 = right wall; the opening spans y0..y1, z0..z1; the shell reaches depth into the case"""
    yc, zc, w, h = (y0 + y1) / 2, (z0 + z1) / 2, y1 - y0, z1 - z0
    xw = side * IN_X  # inner face of the wall
    xc = xw - side * depth / 2
    box(f"{name}.shell", (depth, w + 0.0008, h + 0.0008), B0 + V((xc, yc, zc)), port_m, CB, bevel=0.0004)
    box(f"{name}.mouth", (depth * 0.96, w - 0.0002, h - 0.0002), B0 + V((xc + side * depth * 0.02, yc, zc)), hole_m, CB, bevel=0.0003)
    if kind == "usb":
        box(f"{name}.tongue", (depth * 0.8, w * 0.84, 0.0016), B0 + V((xc + side * depth * 0.1, yc, zc + h * 0.12)), usb_blue, CB, bevel=0.0002)
        for j in range(4):
            box(f"{name}.pin{j}", (depth * 0.5, 0.0012, 0.0002), B0 + V((xc, yc - 0.0036 + j * 0.0024, zc + h * 0.12 - 0.0009)), contact, CB)
    elif kind == "hdmi":
        box(f"{name}.tongue", (depth * 0.8, w * 0.72, 0.0012), B0 + V((xc + side * depth * 0.1, yc, zc)), black_plastic, CB, bevel=0.0002)
    elif kind == "eth":
        for j in range(8):
            box(f"{name}.pin{j}", (depth * 0.6, 0.0004, 0.0003), B0 + V((xc, yc - 0.0042 + j * 0.0012, z1 - 0.0012)), contact, CB)
    elif kind == "sd":
        box(f"{name}.spring", (depth * 0.7, w * 0.9, 0.0003), B0 + V((xc, yc, z0 + 0.0004)), contact, CB)
    for j, dy in enumerate((-(w / 2 + 0.0012), w / 2 + 0.0012)):  # solder legs into the port board
        box(f"{name}.leg{j}", (0.002, 0.0012, 0.0012), B0 + V((xc, yc + dy, BOARD_Z + 0.0006)), port_m, CB)


box("B.ioL.board", (0.026, 0.094, 0.0012), B0 + V((-IN_X + 0.014, -0.051, BOARD_Z)), pcb, CB, bevel=0.0005)
port("B.eth", -1, -0.022, -0.007, 0.0025, 0.0105, 0.018, "eth")
port("B.hdmi", -1, -0.046, -0.029, 0.0042, 0.0088, 0.014, "hdmi")
port("B.usbL1", -1, -0.072, -0.054, 0.0040, 0.0090, 0.014, "usb")
port("B.usbL2", -1, -0.096, -0.078, 0.0040, 0.0090, 0.014, "usb")
box("B.ioR.board", (0.026, 0.064, 0.0012), B0 + V((IN_X - 0.014, -0.066, BOARD_Z)), pcb, CB, bevel=0.0005)
port("B.sd", 1, -0.091, -0.063, 0.0085, 0.0107, 0.026, "sd")
port("B.usbR", 1, -0.056, -0.042, 0.0040, 0.0090, 0.014, "usb")
cable("B.iocableL", [B0 + V((-IN_X + 0.022, -0.006, BOARD_Z + 0.0012)), B0 + V((-0.13, 0.0, 0.0065)), B0 + V((-0.1, 0.004, 0.0065)), B0 + V((-0.082, 0.004, BOARD_Z + 0.0014))], 0.0011, mylar)
cable("B.iocableR", [B0 + V((IN_X - 0.022, -0.036, BOARD_Z + 0.0012)), B0 + V((0.14, -0.02, 0.0075)), B0 + V((0.135, -0.004, BOARD_Z + 0.0014))], 0.0011, mylar)
# hinges in the back corners (steel brackets, three screws each) and the display cable to the left hinge
for k, sx in enumerate((-1, 1)):
    hx = sx * (IN_X - 0.03)
    box(f"B.hinge{k}", (0.04, 0.016, 0.004), B0 + V((hx, IN_Y - 0.009, 0.0035)), steel, CB, bevel=0.001)
    box(f"B.hinge{k}.barrel", (0.036, 0.007, 0.007), B0 + V((hx, IN_Y + 0.002, 0.006)), steel, CB, bevel=0.003, segs=6)
    for j in range(3):
        sc_ = mesh_obj(f"B.hinge{k}.screw{j}", lambda bm: bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.0021, radius2=0.0017, depth=0.0012), screw, CB)
        sc_.location = B0 + V((hx - 0.013 + j * 0.013, IN_Y - 0.009, 0.006))
edp = [B0 + V((0.11, 0.098, BOARD_Z + 0.0015)), B0 + V((0.115, 0.108, 0.006)), B0 + V((IN_X - 0.04, IN_Y - 0.004, 0.007)), B0 + V((IN_X - 0.02, IN_Y + 0.004, 0.008))]
for k in range(2):  # the display cable: two thin black lines, taped down
    cable(f"B.edp{k}", [p_ + V((0.0, 0.0, 0.0008 * k)) + V((0.0016 * k, 0, 0)) for p_ in edp], 0.0011, mylar)
box("B.edp.tape", (0.012, 0.016, 0.0002), B0 + V((IN_X - 0.05, IN_Y - 0.006, 0.0082)), kapton, CB)
box("B.edp.conn", (0.014, 0.006, 0.0018), B0 + V((0.11, 0.098, BOARD_Z + 0.0015)), port_m, CB, bevel=0.0003)
# screw bosses around the tray (where the bottom cover screws in)
for k, (bx, by) in enumerate(((-IN_X + 0.006, -IN_Y + 0.006), (IN_X - 0.006, -IN_Y + 0.006), (-0.06, -IN_Y + 0.004), (0.06, -IN_Y + 0.004),
                               (-IN_X + 0.006, 0.011), (IN_X - 0.006, 0.03), (0.0, IN_Y - 0.004), (-0.05, IN_Y - 0.004))):
    bo = mesh_obj(f"B.boss{k}", lambda bm: bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=0.0032, radius2=0.0028, depth=0.006), tray, CB)
    bo.location = B0 + V((bx, by, 0.0045))
    sc_ = mesh_obj(f"B.boss{k}.insert", lambda bm: bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.0015, radius2=0.0015, depth=0.0002), port_m, CB)
    sc_.location = B0 + V((bx, by, 0.0076))
# speaker wires (twisted red/black pairs) to small connectors on the board
for k, sx in enumerate((-0.126, 0.126)):
    for j, col in enumerate(((0.55, 0.03, 0.02), (0.02, 0.02, 0.02))):
        pts_ = []
        a0 = B0 + V((sx, -0.054, 0.008))
        a1 = B0 + V((sx * 0.85, -0.03, 0.009))
        a2 = B0 + V((sx * 0.62 + (0.01 if sx < 0 else -0.01), 0.002, BOARD_Z + 0.002))
        for i in range(25):
            t = i / 24
            pbase = a0.lerp(a1, min(1, t * 2)) if t < 0.5 else a1.lerp(a2, (t - 0.5) * 2)
            ang = t * 18 * math.pi + j * math.pi
            pts_.append(pbase + V((math.cos(ang) * 0.0006, math.sin(ang) * 0.0006, 0)))
        cable(f"B.spkwire{k}{j}", pts_, 0.00045, mat(f"wire{j}", col, rough=0.4))
    box(f"B.spkconn{k}", (0.004, 0.003, 0.0018), B0 + V((sx * 0.62 + (0.01 if sx < 0 else -0.01), 0.002, BOARD_Z + 0.0015)), conn, CB, bevel=0.0002)
# Kapton tape over the battery connector and the trackpad flex; a thermal pad on the SSD; mylar under the board edge
box("B.tape.batt", (0.024, 0.012, 0.0002), B0 + V((0.0, -0.004, BOARD_Z + 0.0032)), kapton, CB)
box("B.tape.fpc", (0.016, 0.01, 0.0002), B0 + V((-0.05, -0.02, 0.008)), kapton, CB)
box("B.ssd.pad", (0.05, 0.02, 0.0008), B0 + V((0.045, 0.015, BOARD_Z + 0.0037)), pad_m, CB, bevel=0.0003)
box("B.mylar", (0.24, 0.006, 0.0002), B0 + V((0.0375, -0.007, 0.0035)), mylar, CB)
# extra LPDDR memory packages around the chip (soldered memory, as in thin laptops)
for k, (dx, dy) in enumerate(((-0.03, 0.02), (0.03, 0.02))):
    box(f"B.ram{k + 2}", (0.012, 0.014, 0.0011), CHIP + V((dx, dy, 0.0006)), black_plastic, CB, bevel=0.0003)
for k in range(4):
    dx, dy = ((-0.03, -0.018), (0.03, -0.018), (-0.03, 0.02), (0.03, 0.02))[k]
    printed(f"B.ram{k}.mark", "LPDDR5X", CHIP + V((dx, dy, 0.00125)), 0.0016, (0.5, 0.5, 0.5))
# silkscreen: component labels and outlines in white ink on the board, and gold-ringed mounting holes
rr2 = random.Random(9)
for k in range(46):
    x = rr2.uniform(-0.085, 0.16)
    y = rr2.uniform(0.0, 0.105)
    if abs(x + 0.035) < 0.035 and abs(y - 0.055) < 0.035:
        continue
    printed(f"B.silk{k}", rr2.choice(["C", "R", "L", "U", "Q", "J"]) + str(rr2.randint(10, 899)), B0 + V((x, y, BOARD_Z + 0.00062)), 0.0011, (0.82, 0.83, 0.8), rot_z=rr2.choice((0, math.pi / 2)))
for k, (hx, hy) in enumerate(((-0.085, 0.0), (-0.085, 0.1), (0.16, 0.1), (0.16, 0.0))):
    ring = mesh_obj(f"B.mhole{k}", lambda bm: bmesh.ops.create_circle(bm, cap_ends=True, segments=32, radius=0.0028), gold, CB)
    ring.location = B0 + V((hx, hy, BOARD_Z + 0.00062))
    hole = mesh_obj(f"B.mhole{k}.screw", lambda bm: bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.0019, radius2=0.0016, depth=0.001), screw, CB)
    hole.location = B0 + V((hx, hy, BOARD_Z + 0.0011))
for o in CB.objects:
    o["station"] = "B"
print("INSIDE built: fins", NF, "chip at", [round(c, 3) for c in CHIP], "fan at", [round(c, 3) for c in FAN_C])

# finishing: a soft bloom on only the brightest parts (hot metal, glowing electrons, the screen) — the polish premium
# renders have. Compositor node group (Blender 5): Render Layers → Glare (Bloom) → output.
ng = bpy.data.node_groups.new("s03.comp", "CompositorNodeTree")
ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
sc.compositing_node_group = ng
rl = ng.nodes.new("CompositorNodeRLayers")
gl_ = ng.nodes.new("CompositorNodeGlare")
gl_.inputs["Type"].default_value = "Bloom"
gl_.inputs["Quality"].default_value = "High"
gl_.inputs["Threshold"].default_value = 1.6
gl_.inputs["Smoothness"].default_value = 0.3
gl_.inputs["Strength"].default_value = 0.22
gl_.inputs["Size"].default_value = 0.45
go = ng.nodes.new("NodeGroupOutput")
ng.links.new(rl.outputs["Image"], gl_.inputs["Image"])
ng.links.new(gl_.outputs["Image"], go.inputs[0])

bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/s03_set.blend"))
print("S03 SET BUILT")
