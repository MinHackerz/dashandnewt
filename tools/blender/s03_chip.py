"""s03 stations C and D (run after s03_set.py; saves back into blender/s03_set.blend):

    Blender -b blender/s03_set.blend --python tools/blender/s03_chip.py

  C (x = 20)  the chip, macro: a 35 mm package (organic substrate, land-side capacitors, gold edge pads) carrying a
              15 × 12 mm silicon die. The die shows its circuitry the way die shots do: blocks of cores, cache arrays
              and wiring under an iridescent thin-film finish.
  D (x = 30)  the transistors, scaled up ~10 million ×: a FinFET array as in modern chips. Silicon fins run along X,
              metal gates cross them along Y and wrap their tops and sides, raised source/drain crystals sit between
              the gates, tungsten contacts rise from them to copper wires above. Electrons (blue) flow along the fins
              under the gates; the gates glow with heat (electrons_k, heat_k value nodes; s03_shots keys them).
Station D's scale: 1 m in the scene ≈ 100 nm (fin pitch 30 nm → 0.3 m... see FIN_PITCH); proportions follow a
current FinFET node (fin pitch ~30 nm, fin width ~7 nm, fin height ~50 nm, gate pitch ~50 nm).
"""
import math
import os
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sc = bpy.context.scene
V = Vector
for cn in ("C.Chip", "D.Transistors"):
    old = bpy.data.collections.get(cn)
    if old:
        for o in list(old.objects):
            bpy.data.objects.remove(o, do_unlink=True)
# materials of earlier builds would keep their old shader chains (and duplicate *_k nodes): start them fresh
for m_ in list(bpy.data.materials):
    if m_.name.split(".")[0] in ("C", "D") and m_.users == 0:
        bpy.data.materials.remove(m_)
for m_ in list(bpy.data.materials):
    if m_.name.startswith(("C.", "D.")):
        bpy.data.materials.remove(m_)


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


def box(name, size, loc, material, c, bevel=0.0, segs=3):
    o = mesh_obj(name, lambda bm: (bmesh.ops.create_cube(bm, size=1.0), bmesh.ops.scale(bm, vec=size, verts=bm.verts)), material, c, smooth=bevel > 0)
    o.location = loc
    if bevel:
        bv = o.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments = bevel, segs
        bv.limit_method = "ANGLE"
        o.modifiers.new("wn", "WEIGHTED_NORMAL")
    return o


def value(nt, name, v=0.0):
    n = node(nt, "ShaderNodeValue", name=name, label=name)
    n.outputs[0].default_value = v
    return n


def emission_add(m, color, k_name, strength, mask=None):
    """add k × strength of an emission colour on top of m (optionally × a mask socket)"""
    nt = m.node_tree
    out = [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"][0]
    src = out.inputs["Surface"].links[0].from_socket
    k = value(nt, k_name)
    st = node(nt, "ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(k.outputs[0], st.inputs[0])
    st.inputs[1].default_value = strength
    if mask is not None:
        st2 = node(nt, "ShaderNodeMath", operation="MULTIPLY")
        nt.links.new(st.outputs[0], st2.inputs[0])
        nt.links.new(mask, st2.inputs[1])
        st = st2
    em = node(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = color
    nt.links.new(st.outputs[0], em.inputs["Strength"])
    add = node(nt, "ShaderNodeAddShader")
    nt.links.new(src, add.inputs[0])
    nt.links.new(em.outputs["Emission"], add.inputs[1])
    nt.links.new(add.outputs["Shader"], out.inputs["Surface"])


def hot_metal(m, k_name, kelvin=1150.0, strength=1.6, mask=None):
    """heating: base colour → near black and a blackbody glow (red-orange) rises with k (× optional mask)"""
    nt = m.node_tree
    b = [n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"][0]
    k = value(nt, k_name)
    kk = k.outputs[0]
    if mask is not None:
        km = node(nt, "ShaderNodeMath", operation="MULTIPLY")
        nt.links.new(kk, km.inputs[0])
        nt.links.new(mask, km.inputs[1])
        kk = km.outputs[0]
    base = b.inputs["Base Color"]
    src = base.links[0].from_socket if base.is_linked else None
    dk = node(nt, "ShaderNodeMix", data_type="RGBA")
    nt.links.new(kk, dk.inputs["Factor"])
    if src:
        nt.links.new(src, dk.inputs[6])
    else:
        dk.inputs[6].default_value = base.default_value[:]
    dk.inputs[7].default_value = (0.06, 0.012, 0.006, 1)
    nt.links.new(dk.outputs[2], base)
    bb = node(nt, "ShaderNodeBlackbody")
    bb.inputs["Temperature"].default_value = kelvin
    nt.links.new(bb.outputs["Color"], b.inputs["Emission Color"])
    es = node(nt, "ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(kk, es.inputs[0])
    es.inputs[1].default_value = strength
    nt.links.new(es.outputs[0], b.inputs["Emission Strength"])


IRON = [(0.0, (0.01, 0.0, 0.04)), (0.22, (0.10, 0.0, 0.40)), (0.45, (0.62, 0.03, 0.42)), (0.66, (1.0, 0.30, 0.02)),
        (0.84, (1.0, 0.78, 0.10)), (1.0, (1.0, 0.98, 0.75))]


def thermal_mix(m, temp=None, temp_const=0.4, k_name="thermal_k"):
    """thermal camera: the surface → a flat iron-palette false colour of its temperature (0 cold … 1 hot) as
    thermal_k goes 0 → 1. A real chip peaks near 100 °C: nothing glows to the eye; heat is SHOWN this way."""
    nt = m.node_tree
    out = [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"][0]
    src = out.inputs["Surface"].links[0].from_socket
    k = value(nt, k_name)
    if temp is None:
        cv = value(nt, "temp_const", temp_const)
        temp = cv.outputs[0]
    # surfaces seen edge-on read a little cooler on a thermal camera (lower apparent emissivity): gives form
    lw = node(nt, "ShaderNodeLayerWeight", Blend=0.5)
    shp = node(nt, "ShaderNodeMapRange")
    nt.links.new(lw.outputs["Facing"], shp.inputs["Value"])
    shp.inputs["To Min"].default_value = 1.0
    shp.inputs["To Max"].default_value = 0.78
    tm = node(nt, "ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(temp, tm.inputs[0])
    nt.links.new(shp.outputs["Result"], tm.inputs[1])
    nz = node(nt, "ShaderNodeTexNoise", Scale=40.0, Detail=2.0)
    nzm = node(nt, "ShaderNodeMath", operation="MULTIPLY_ADD")
    nt.links.new(nz.outputs["Fac"], nzm.inputs[0])
    nzm.inputs[1].default_value = 0.04
    nt.links.new(tm.outputs[0], nzm.inputs[2])
    r = node(nt, "ShaderNodeValToRGB")
    els = r.color_ramp.elements
    els[0].position, els[0].color = IRON[0][0], (*IRON[0][1], 1)
    els[1].position, els[1].color = IRON[-1][0], (*IRON[-1][1], 1)
    for pos, col in IRON[1:-1]:
        e = els.new(pos)
        e.color = (*col, 1)
    nt.links.new(nzm.outputs[0], r.inputs["Fac"])
    em = node(nt, "ShaderNodeEmission", Strength=0.72)  # below the tone-mapper's highlight roll-off: keeps the palette saturated
    nt.links.new(r.outputs["Color"], em.inputs["Color"])
    mx_ = node(nt, "ShaderNodeMixShader")
    nt.links.new(k.outputs[0], mx_.inputs["Fac"])
    nt.links.new(src, mx_.inputs[1])
    nt.links.new(em.outputs["Emission"], mx_.inputs[2])
    nt.links.new(mx_.outputs["Shader"], out.inputs["Surface"])


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


# ════════════════════════════ STATION C — the chip ════════════════════════════
CC = coll("C.Chip")
C0 = V((20.0, 0.0, 0.0))
sub = mat("C.substrate", (0.008, 0.02, 0.013), rough=0.3, **{"Coat Weight": 0.7, "Coat Roughness": 0.08})
_t = sub.node_tree
_b = _t.nodes["Principled BSDF"]
_tc = node(_t, "ShaderNodeTexCoord")
_wv = node(_t, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="DIAGONAL", Scale=2600.0, Distortion=0.0)
_t.links.new(_tc.outputs["Object"], _wv.inputs["Vector"])
_mk = node(_t, "ShaderNodeTexVoronoi", Scale=900.0)
_t.links.new(_tc.outputs["Object"], _mk.inputs["Vector"])
_th = node(_t, "ShaderNodeMath", operation="GREATER_THAN")
_t.links.new(_wv.outputs["Fac"], _th.inputs[0])
_th.inputs[1].default_value = 0.92
_mm = node(_t, "ShaderNodeMath", operation="MULTIPLY")
_t.links.new(_th.outputs[0], _mm.inputs[0])
_t.links.new(_mk.outputs["Distance"], _mm.inputs[1])
_cm = node(_t, "ShaderNodeMix", data_type="RGBA")
_t.links.new(_mm.outputs[0], _cm.inputs["Factor"])
_cm.inputs[6].default_value = (0.008, 0.02, 0.013, 1)
_cm.inputs[7].default_value = (0.12, 0.08, 0.03, 1)
_t.links.new(_cm.outputs[2], _b.inputs["Base Color"])
gold = mat("C.gold", (1.0, 0.76, 0.33), metallic=1.0, rough=0.22)
capm = mat("C.cap", (0.11, 0.075, 0.042), rough=0.55)  # MLCC: brown ceramic body
tin = mat("C.tin", (0.68, 0.68, 0.7), metallic=1.0, rough=0.38)  # matte tinned end caps
PK, PT = 0.035, 0.0012
box("C.substrate", (PK, PK, PT), C0 + V((0, 0, PT / 2)), sub, CC, bevel=0.0003)
# gold pads along the edges and the land-side capacitors around the die
pads = bpy.data.meshes.new("C.pads")
bm = bmesh.new()
for side in range(4):
    for k in range(28):
        t = -PK / 2 + 0.0025 + k * (PK - 0.005) / 27
        ret = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=(0.0006, 0.0012, 0.00004), verts=ret["verts"])
        x, y = (t, PK / 2 - 0.0012) if side == 0 else (t, -PK / 2 + 0.0012) if side == 1 else (PK / 2 - 0.0012, t) if side == 2 else (-PK / 2 + 0.0012, t)
        if side >= 2:
            bmesh.ops.rotate(bm, verts=ret["verts"], cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "Z"))
        bmesh.ops.translate(bm, vec=(x, y, PT + 0.00002), verts=ret["verts"])
bm.to_mesh(pads)
bm.free()
po = bpy.data.objects.new("C.pads", pads)
CC.objects.link(po)
po.location = C0
po.data.materials.append(gold)
rr = random.Random(7)
# land-side capacitors: tidy rows along each side of the die (0402 parts: tan body, tinned ends)
for side in range(4):
    for row in range(2):
        for k in range(9 if side < 2 else 7):
            t = (k - (8 if side < 2 else 6) / 2) * 0.0016
            off = 0.0095 + row * 0.0013 if side < 2 else 0.0115 + row * 0.0013
            x, y, rot = (t, off * (1 if side == 0 else -1), 0.0) if side < 2 else (off * (1 if side == 2 else -1), t, math.pi / 2)
            for j, (dx, ln, m_) in enumerate(((0, 0.0006, capm), (-0.0004, 0.0002, tin), (0.0004, 0.0002, tin))):
                cx_, cy_ = (x + dx, y) if rot == 0 else (x, y + dx)
                cb = box(f"C.cap{side}{row}{k}_{j}", (ln, 0.0005, 0.00048), C0 + V((cx_, cy_, PT + 0.00024)), m_, CC, bevel=0.00005, segs=3)  # rounded, as real 0402 parts
                cb.rotation_euler.z = rot
# the die: polished silicon showing its floorplan under a thin-film sheen
DW, DH, DT = 0.015, 0.012, 0.00078
die = box("C.die", (DW, DH, DT), C0 + V((0, 0, PT + DT / 2 + 0.00006)), None, CC, bevel=0.00008)
dm = bpy.data.materials.new("C.die.mat")
dm.use_nodes = True
nt = dm.node_tree
b = nt.nodes["Principled BSDF"]
tc = node(nt, "ShaderNodeTexCoord")
mp = node(nt, "ShaderNodeMapping")
mp.inputs["Scale"].default_value = (1.0 / DW, 1.0 / DH, 1.0)
mp.inputs["Location"].default_value = (0.5, 0.5, 0)
nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
# floorplan: a generated die-shot image (recursive rectangular blocks: CPU cores, cache arrays, a GPU of identical
# tiles, memory controllers, an I/O ring), written to blender/textures/die_floorplan.png
import numpy as np
IW, IH = 2400, 1920
img = np.zeros((IH, IW, 3), np.float32)
rng = np.random.default_rng(12)
# a planned floorplan like a real laptop SoC die shot: identical CPU cores (mirrored in two rows) each with its own
# L2, a shared L3 strip between the rows, a GPU of identical compute units around a shared cache, an AI block of
# identical MAC tiles, a system cache, media/display logic, memory interfaces (PHY) down both edges, an I/O ring.
# Texture at several scales: standard-cell rows in logic, sub-arrays with decoder strips in SRAM, a faint power grid.
PAL = {"logic": (0.42, 0.40, 0.33), "fpu": (0.39, 0.36, 0.30), "front": (0.37, 0.39, 0.33), "l2": (0.31, 0.30, 0.40),
       "l3": (0.30, 0.29, 0.39), "gpu": (0.33, 0.39, 0.37), "npu": (0.37, 0.34, 0.40), "media": (0.40, 0.38, 0.34),
       "slc": (0.29, 0.30, 0.38), "phy": (0.46, 0.45, 0.41), "misc": (0.38, 0.37, 0.35)}
HEATK = {"logic": 1.0, "fpu": 1.0, "front": 0.9, "l2": 0.6, "l3": 0.5, "gpu": 0.85, "npu": 0.65, "media": 0.45,
         "slc": 0.4, "phy": 0.32, "misc": 0.4}
heat = np.full((IH, IW), 0.25, np.float32)


def logic_tex(h_, w_, seed):
    r_ = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h_, 0:w_]
    row = yy // 8
    nrow = h_ // 8 + 1
    width = r_.integers(5, 13, nrow)[row]
    off = r_.integers(0, 40, nrow)[row]
    cell = (xx + off) // width
    lum = r_.uniform(0.82, 1.1, (nrow, w_ // 4 + 40))[row, np.clip(cell, 0, w_ // 4 + 39)]
    gap = ((xx + off) % width == 0) | (yy % 8 == 0)
    return lum * np.where(gap, 0.86, 1.0) * r_.uniform(0.95, 1.05, nrow)[row]


def sram_tex(h_, w_, seed):
    r_ = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h_, 0:w_]
    fine = 0.94 + 0.06 * (((xx // 2) + (yy // 2)) % 2)
    sub = ((xx % 56) < 4) | ((yy % 72) < 5)  # decoder / sense-amp strips between sub-arrays
    return fine * np.where(sub, 1.18, 1.0) * r_.uniform(0.97, 1.03)


def put(x0, y0, x1, y1, kind, seed, tex=None):
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    h_, w_ = y1 - y0, x1 - x0
    if tex is None:
        tex = sram_tex(h_, w_, seed) if kind in ("l2", "l3", "slc") else logic_tex(h_, w_, seed)
    img[y0:y1, x0:x1] = np.array(PAL[kind])[None, None, :] * tex[..., None]
    heat[y0:y1, x0:x1] = HEATK[kind]


def core(x0, y0, x1, y1, mirror_x, l2_top, seed=101):
    """one CPU core: front end, integer logic, a vector/FP unit, and its L2 — the same seed every time, so all
    cores are identical (mirrored), exactly as on real dies"""
    w_, h_ = x1 - x0, y1 - y0
    l2h = int(h_ * 0.3)
    ly0, ly1 = (y0 + l2h + 6, y1) if l2_top else (y0, y1 - l2h - 6)
    if l2_top:
        put(x0, y0, x1, y0 + l2h, "l2", seed)
    else:
        put(x0, y1 - l2h, x1, y1, "l2", seed)
    a = int((ly1 - ly0) * 0.45)
    fx = int(w_ * 0.55)
    blocks = [(0, 0, w_, a - 4, "front"), (0, a, fx - 4, ly1 - ly0, "logic"), (fx, a, w_, ly1 - ly0, "fpu")]
    for bx0, by0, bx1, by1, kind in blocks:
        if mirror_x:
            bx0, bx1 = w_ - bx1, w_ - bx0
        put(x0 + bx0, ly0 + by0, x0 + bx1, ly0 + by1, kind, seed + {"front": 1, "logic": 2, "fpu": 3}[kind])  # fixed seeds: deterministic


img[:] = (0.44, 0.43, 0.4)  # the metal between blocks
RING = 70
put(RING, RING, 200, IH - RING, "phy", 1, tex=(0.85 + 0.25 * ((np.mgrid[0:IH - 2 * RING, 0:130][0] % 36) < 26)))
put(IW - 200, RING, IW - RING, IH - RING, "phy", 1, tex=(0.85 + 0.25 * ((np.mgrid[0:IH - 2 * RING, 0:130][0] % 36) < 26)))
# CPU complex: 2 rows × 4 cores with the shared L3 between
CX0, CX1, CY0, CY1 = 212, 1250, 80, 1300
cw = (CX1 - CX0) / 4
for i in range(4):
    core(CX0 + i * cw + 5, CY0, CX0 + (i + 1) * cw - 5, 640, i % 2 == 1, False)
    core(CX0 + i * cw + 5, 760, CX0 + (i + 1) * cw - 5, CY1, i % 2 == 1, True)
put(CX0 + 5, 650, CX1 - 5, 750, "l3", 7)
# GPU: 2 columns × 4 identical compute units around a shared cache column
put(1705, 80, 1750, 1300, "l2", 9)
cu_tex = None
for col_, (gx0, gx1) in enumerate(((1262, 1698), (1757, 2193))):
    for r in range(4):
        gy0, gy1 = 80 + r * 307, 80 + (r + 1) * 307 - 7
        if cu_tex is None:
            t_ = logic_tex(gy1 - gy0, gx1 - gx0, 55)
            yy, xx = np.mgrid[0:gy1 - gy0, 0:gx1 - gx0]
            t_ = t_ * np.where(((xx % 109) < 5) | ((yy % 100) < 5), 0.8, 1.0)  # 4 × 3 SIMD tiles per unit
            t_ = t_ * np.where((yy > (gy1 - gy0) * 0.82), 1.12, 1.0)  # its local cache strip
            cu_tex = t_
        put(gx0, gy0, gx1, gy1, "gpu", 0, tex=cu_tex if col_ == 0 else cu_tex[:, ::-1])
# bottom strip: AI block of identical MAC tiles, media engine, display/misc, system cache
yy, xx = np.mgrid[0:530, 0:590]
put(212, 1312, 802, 1842, "npu", 0, tex=logic_tex(530, 590, 77) * np.where(((xx % 74) < 5) | ((yy % 66) < 5), 0.78, 1.0))
put(810, 1312, 1250, 1842, "media", 81)
put(1262, 1312, 1700, 1842, "misc", 83)
put(1710, 1312, 2192, 1842, "slc", 85)
# faint power grid over the whole core area (top metal straps)
pg = np.zeros((IH, IW), bool)
pg[:, ::48] = True
pg[::64, :] = True
pg[:, 1::48] = True
inner = np.zeros((IH, IW), bool)
inner[RING:IH - RING, 205:IW - 205] = True
img[pg & inner] *= 1.04
for k in range(0, IW, 40):  # I/O pads around the edge
    img[12:52, k + 8:k + 30] = (0.72, 0.68, 0.55)
    img[IH - 52:IH - 12, k + 8:k + 30] = (0.72, 0.68, 0.55)
for k in range(0, IH, 40):
    img[k + 8:k + 30, 12:52] = (0.72, 0.68, 0.55)
    img[k + 8:k + 30, IW - 52:IW - 12] = (0.72, 0.68, 0.55)
HEAT = {"core": 1.0, "gpu": 0.88, "misc": 0.55, "cache": 0.42, "io": 0.3}
cols_ = img.reshape(-1, 3)
fp = os.path.join(ROOT, "blender/textures/die_floorplan.png")
os.makedirs(os.path.dirname(fp), exist_ok=True)
im_ = bpy.data.images.new("die_floorplan", IW, IH, alpha=True)
rgba = np.concatenate([np.clip(img, 0, 1), np.ones((IH, IW, 1), np.float32)], axis=2)[::-1]
im_.pixels = rgba.ravel()
im_.filepath_raw = fp
im_.file_format = "PNG"
im_.save()
def _blur(a, r, n=3):
    for _ in range(n):
        for ax in (0, 1):
            pad = [(r + 1, r) if i == ax else (0, 0) for i in range(2)]
            c = np.cumsum(np.pad(a, pad, mode="edge"), axis=ax, dtype=np.float64)
            a = ((c[2 * r + 1:] - c[:-2 * r - 1]) if ax == 0 else (c[:, 2 * r + 1:] - c[:, :-2 * r - 1])) / (2 * r + 1)
            a = a.astype(np.float32)
    return a


hm = np.clip(_blur(heat, 55) * 0.9 + 0.08, 0, 1)  # heat spreads ~1 mm in silicon: smooth, but each block still reads
hi_ = bpy.data.images.new("die_heat", IW, IH, alpha=True)
hi_.pixels = np.dstack([hm, hm, hm, np.ones_like(hm)])[::-1].ravel()
hi_.filepath_raw = os.path.join(ROOT, "blender/textures/die_heat.png")
hi_.file_format = "PNG"
hi_.save()
hi_.colorspace_settings.name = "Non-Color"
texn = node(nt, "ShaderNodeTexImage")
texn.image = im_
uvd = node(nt, "ShaderNodeTexCoord")
mpd = node(nt, "ShaderNodeMapping")
mpd.inputs["Scale"].default_value = (1.0 / DW, 1.0 / DH, 1.0)
mpd.inputs["Location"].default_value = (0.5, 0.5, 0)
nt.links.new(uvd.outputs["Object"], mpd.inputs["Vector"])
nt.links.new(mpd.outputs["Vector"], texn.inputs["Vector"])
nt.links.new(texn.outputs["Color"], b.inputs["Base Color"])
sepc = node(nt, "ShaderNodeSeparateColor")
nt.links.new(texn.outputs["Color"], sepc.inputs["Color"])
bump = node(nt, "ShaderNodeBump", Strength=0.15, Distance=0.000005)
nt.links.new(sepc.outputs["Blue"], bump.inputs["Height"])
nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
b.inputs["Metallic"].default_value = 0.85
b.inputs["Roughness"].default_value = 0.12
if "Thin Film Thickness" in b.inputs:
    b.inputs["Thin Film Thickness"].default_value = 280.0  # a subtler bronze-violet sheen, as on die photos
    b.inputs["Thin Film IOR"].default_value = 1.45
# micro-detail for macro shots (the 2.4k floorplan resolves ~6 µm; a real die shows finer structure): the top
# metal layers' routing — thin parallel wires, ~4 µm pitch along X on one layer and ~6 µm along Y on the next — as a
# faint lighter pattern with a matching micro-bump, plus a fine cell-row grain. Procedural, so it stays crisp at
# any zoom (path-traced samples average it to a smooth tone when it is far smaller than a pixel: no shimmer).
_mc = node(nt, "ShaderNodeTexCoord")
_mw = []
for d_, period, th_ in (("X", 4e-6, 0.86), ("Y", 6e-6, 0.88)):
    wv = node(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction=d_, Scale=0.3183 / period, Distortion=0.0, Detail=0.0)
    nt.links.new(_mc.outputs["Object"], wv.inputs["Vector"])
    g_ = node(nt, "ShaderNodeMath", operation="GREATER_THAN")
    nt.links.new(wv.outputs["Fac"], g_.inputs[0])
    g_.inputs[1].default_value = th_
    _mw.append(g_)
_mm = node(nt, "ShaderNodeMath", operation="MAXIMUM")
nt.links.new(_mw[0].outputs[0], _mm.inputs[0])
nt.links.new(_mw[1].outputs[0], _mm.inputs[1])
_grain = node(nt, "ShaderNodeTexNoise", Scale=180000.0, Detail=2.0)
nt.links.new(_mc.outputs["Object"], _grain.inputs["Vector"])
_lift = node(nt, "ShaderNodeMath", operation="MULTIPLY_ADD")
nt.links.new(_mm.outputs[0], _lift.inputs[0])
_lift.inputs[1].default_value = 0.16
nt.links.new(_grain.outputs["Fac"], _lift.inputs[2])
_lf = node(nt, "ShaderNodeMapRange")
nt.links.new(_lift.outputs[0], _lf.inputs["Value"])
_lf.inputs["From Min"].default_value, _lf.inputs["From Max"].default_value = 0.3, 0.86
_lf.inputs["To Min"].default_value, _lf.inputs["To Max"].default_value = 0.9, 1.14
_cm2 = node(nt, "ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
_cm2.inputs["Factor"].default_value = 1.0
nt.links.new(texn.outputs["Color"], _cm2.inputs[6])
_cv = node(nt, "ShaderNodeCombineColor")
for i_ in range(3):
    nt.links.new(_lf.outputs["Result"], _cv.inputs[i_])
nt.links.new(_cv.outputs[0], _cm2.inputs[7])
nt.links.new(_cm2.outputs[2], b.inputs["Base Color"])
_mb = node(nt, "ShaderNodeBump", Strength=0.35, Distance=0.0000004)
nt.links.new(_mm.outputs[0], _mb.inputs["Height"])
nt.links.new(bump.outputs["Normal"], _mb.inputs["Normal"])
nt.links.new(_mb.outputs["Normal"], b.inputs["Normal"])
die.data.materials.append(dm)
# the die heats up on cue (heat_k): a hot orange glow strongest over the busy blocks
heatn = node(nt, "ShaderNodeTexImage")
heatn.image = hi_
nt.links.new(mpd.outputs["Vector"], heatn.inputs["Vector"])
thermal_mix(dm, heatn.outputs["Color"])
for _m, _t in ((sub, 0.33), (gold, 0.3), (capm, 0.36), (tin, 0.34)):
    thermal_mix(_m, temp_const=_t)
for o in CC.objects:
    o["station"] = "C"
print("CHIP built")

# ════════════════════════════ STATION D — the transistors ════════════════════════════
CD = coll("D.Transistors")
D0 = V((30.0, 0.0, 0.0))
S = 0.01  # 1 nm → 1 cm in the scene
FIN_PITCH, FIN_W, FIN_H = 30 * S, 7 * S, 50 * S
GATE_PITCH, GATE_L, GATE_H = 50 * S, 16 * S, 70 * S
NFIN, NGATE = 10, 15  # a patch of a much larger array: it fills the frame from the dive's first view
LEN = (NGATE + 1) * GATE_PITCH
si = mat("D.silicon", (0.62, 0.66, 0.72), metallic=0.6, rough=0.22)
sub_m = mat("D.substrate", (0.06, 0.08, 0.13), metallic=0.3, rough=0.35)
oxide = mat("D.oxide", (0.035, 0.05, 0.1), rough=0.62)  # matte deposited oxide: a glossy one mirrored the array like a pool of water
gate_m = mat("D.gate", (0.78, 0.6, 0.3), metallic=1.0, rough=0.22)
hik = mat("D.highk", (0.55, 0.35, 0.85), rough=0.15, **{"Transmission Weight": 0.6, "IOR": 1.9})
sd = mat("D.sourcedrain", (0.08, 0.42, 0.42), metallic=0.25, rough=0.28)
tung = mat("D.tungsten", (0.42, 0.42, 0.45), metallic=1.0, rough=0.42)  # dull grey metal, not a mirror
cu = mat("D.copper", (0.95, 0.6, 0.45), metallic=1.0, rough=0.22)
W_ = NFIN * FIN_PITCH + FIN_PITCH
spacer = mat("D.spacer", (0.86, 0.92, 0.97), rough=0.05, **{"Transmission Weight": 1.0, "IOR": 1.6})  # silicon nitride (a clear dielectric): gate spacers and caps; the gold gate shows through


def grain(m, scale=60.0, rough_add=0.08, bump=0.15):
    """surface grain at the ~1–2 nm scale (deposited films are never mirror-perfect): a little roughness variation
    and a faint bump, so the materials read as real films instead of plastic"""
    nt = m.node_tree
    b_ = nt.nodes["Principled BSDF"]
    tc_ = node(nt, "ShaderNodeTexCoord")
    nz_ = node(nt, "ShaderNodeTexNoise", Scale=scale, Detail=4.0, Roughness=0.6)
    nt.links.new(tc_.outputs["Object"], nz_.inputs["Vector"])
    r0 = b_.inputs["Roughness"].default_value
    rr_ = node(nt, "ShaderNodeMapRange")
    nt.links.new(nz_.outputs["Fac"], rr_.inputs["Value"])
    rr_.inputs["To Min"].default_value, rr_.inputs["To Max"].default_value = max(0.0, r0 - rough_add), r0 + rough_add
    nt.links.new(rr_.outputs["Result"], b_.inputs["Roughness"])
    bp_ = node(nt, "ShaderNodeBump", Strength=bump, Distance=0.002)
    nt.links.new(nz_.outputs["Fac"], bp_.inputs["Height"])
    nt.links.new(bp_.outputs["Normal"], b_.inputs["Normal"])


for _m in (si, sub_m, oxide, sd):
    grain(_m)
grain(spacer, rough_add=0.03, bump=0.03)
for _m in (gate_m, tung, cu):  # metals: finer, gentler grain (a polished film)
    grain(_m, scale=90.0, rough_add=0.04, bump=0.04)
# substrate and trench oxide run far past the array (a patch of a chip has no edges in view)
box("D.substrate", (60.0, 60.0, 30 * S), D0 + V((0, 0, -15 * S)), sub_m, CD)
box("D.sti", (60.0, 60.0, 18 * S), D0 + V((0, 0, 9 * S)), oxide, CD)  # shallow-trench oxide around the fin bases
fy = [(-(NFIN - 1) / 2 + i) * FIN_PITCH for i in range(NFIN)]
gx = [(-(NGATE - 1) / 2 + j) * GATE_PITCH for j in range(NGATE)]
si_xray = mat("D.silicon.xray", (0.62, 0.7, 0.8), metallic=0.0, rough=0.1, **{"Transmission Weight": 1.0, "IOR": 1.05})  # no clear coat: it mirrored the studio lamps as stacks of glowing discs
shadow_clear(si_xray)
shadow_clear(hik)
shadow_clear(spacer)


def fin_profile(bm_, wb=12 * S, wt=7 * S, h=FIN_H, n=10):
    """a real fin's cross-section: tapered walls (12 nm at the base → 7 nm) and a rounded top"""
    r_ = wt / 2
    pts = [V((0, -wb / 2, 0)), V((0, -wt / 2, h - r_))]
    for k_ in range(1, n):
        a_ = math.pi - math.pi * k_ / n
        pts.append(V((0, r_ * math.cos(a_), h - r_ + r_ * math.sin(a_))))
    pts += [V((0, wt / 2, h - r_)), V((0, wb / 2, 0))]
    return pts


def fin_build(bm_):
    prof = fin_profile(bm_)
    a_ = [bm_.verts.new(p + V((-LEN / 2, 0, 0))) for p in prof]
    b_ = [bm_.verts.new(p + V((LEN / 2, 0, 0))) for p in prof]
    n_ = len(prof)
    for k_ in range(n_):
        bm_.faces.new((a_[k_], a_[(k_ + 1) % n_], b_[(k_ + 1) % n_], b_[k_]))
    bm_.faces.new(a_[::-1])
    bm_.faces.new(b_)
    bmesh.ops.recalc_face_normals(bm_, faces=bm_.faces)


for i, y in enumerate(fy):
    fo_ = mesh_obj(f"D.fin{i}", fin_build, si_xray if i == 0 else si, CD, smooth=True)
    fo_.location = D0 + V((0, y, 0))
    es_ = fo_.modifiers.new("crisp", "EDGE_SPLIT")
    es_.split_angle = math.radians(35)
GY0 = fy[1] - FIN_PITCH / 2  # the gates stop between fin 0 and fin 1 (a cut-away)
GY1 = W_ / 2 - FIN_PITCH * 0.3
GYC, GYL = (GY0 + GY1) / 2, GY1 - GY0
SP_T, CAP_T = 4 * S, 6 * S  # nitride spacer thickness, gate cap height
G_TOP = 9 * S + GATE_H
for j, x in enumerate(gx):
    # gate: high-k liner + metal wrapping the fins (one solid over the row, cut away in front of fin 1), nitride
    # spacers on both sides and a nitride cap on top — the layers every real FinFET gate has
    box(f"D.gate{j}.hik", (GATE_L + 1.2 * S, GYL + 1.2 * S, 3 * S), D0 + V((x, GYC, 9 * S + 1.5 * S)), hik, CD, bevel=0.003)
    g = box(f"D.gate{j}", (GATE_L, GYL, GATE_H), D0 + V((x, GYC, GATE_H / 2 + 9 * S)), gate_m, CD, bevel=0.006)
    g["gate"] = j
    for sx_ in (-1, 1):
        box(f"D.gate{j}.spacer{sx_}", (SP_T, GYL, GATE_H + CAP_T - 2 * S), D0 + V((x + sx_ * (GATE_L + SP_T) / 2, GYC, 9 * S + (GATE_H + CAP_T - 2 * S) / 2)), spacer, CD, bevel=0.004)
    box(f"D.gate{j}.cap", (GATE_L + 2 * SP_T, GYL, CAP_T), D0 + V((x, GYC, G_TOP + CAP_T / 2)), spacer, CD, bevel=0.005)
# raised source/drain crystals between the spacers (diamond cross-section, grown on the fin) + tungsten contacts
SD_L = GATE_PITCH - GATE_L - 2 * SP_T - 1 * S
for j in range(NGATE + 1):
    x = (-(NGATE) / 2 + j) * GATE_PITCH
    for i, y in enumerate(fy):
        if i == 0:
            continue  # the front fin stays bare
        def diamond(bm, w=FIN_PITCH * 0.78, h=FIN_H * 0.55, L=SD_L):
            vs = []
            for dx in (-L / 2, L / 2):
                vs.append([bm.verts.new((dx, 0, 0)), bm.verts.new((dx, w / 2, h * 0.55)), bm.verts.new((dx, 0, h)), bm.verts.new((dx, -w / 2, h * 0.55))])
            a_, b_ = vs
            for k in range(4):
                bm.faces.new((a_[k], a_[(k + 1) % 4], b_[(k + 1) % 4], b_[k]))
            bm.faces.new(a_[::-1])
            bm.faces.new(b_)
        dm_ = mesh_obj(f"D.sd{j}_{i}", diamond, sd, CD)
        dm_.location = D0 + V((x, y, FIN_H * 0.62))
        bv = dm_.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments = 0.004, 3
    # trench contact: a metal bar across the source/drain of one transistor's fins (fins 1–3 or 3–5), from inside
    # the crystals up to the top of the gate caps — as in real FinFET cross-sections
    f0, f1 = (1, 3) if j % 2 == 0 else (3, 5)
    cy0, cy1 = fy[f0] - FIN_W, fy[f1] + FIN_W
    C_Z0, C_Z1 = 35 * S, G_TOP + CAP_T
    box(f"D.contact{j}", (SD_L - 3 * S, cy1 - cy0, C_Z1 - C_Z0), D0 + V((x, (cy0 + cy1) / 2, (C_Z0 + C_Z1) / 2)), tung, CD, bevel=0.003)
    wk = j % 3  # a square via from the contact up to one copper line, where that line passes overhead
    wy = fy[2] + wk * FIN_PITCH * 1.2
    W_Z0 = FIN_H + 68 * S - 7 * S
    if -0.095 * LEN < x < 0.455 * LEN and cy0 < wy < cy1:
        box(f"D.via{j}", (8 * S, 8 * S, W_Z0 - C_Z1), D0 + V((x, wy, (C_Z1 + W_Z0) / 2)), tung, CD, bevel=0.002)
# a copper wiring layer above (partly cut away so we can see down): lines along X
for k in range(3):
    y = fy[2] + k * FIN_PITCH * 1.2
    box(f"D.wire{k}", (LEN * 0.55, 12 * S, 14 * S), D0 + V((LEN * 0.18, y, FIN_H + 68 * S)), cu, CD, bevel=0.004)


# electrons: glowing particles flowing along each fin (source → drain, +X), at the fin's top, under the gates
def electrons(name, count, seed):
    me = bpy.data.meshes.new(name)
    o = bpy.data.objects.new(name, me)
    CD.objects.link(o)
    o.location = D0
    mod = o.modifiers.new("flow", "NODES")
    tree = bpy.data.node_groups.new(name + ".gn", "GeometryNodeTree")
    tree.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    tree.interface.new_socket("electrons_k", in_out="INPUT", socket_type="NodeSocketFloat")
    tree.interface.new_socket("speed", in_out="INPUT", socket_type="NodeSocketFloat")
    mod.node_group = tree
    N, Lk = tree.nodes, tree.links
    gin, gout = N.new("NodeGroupInput"), N.new("NodeGroupOutput")
    pts = N.new("GeometryNodePoints")
    pts.inputs["Count"].default_value = count

    def rnd(lo, hi, sd_):
        r = N.new("FunctionNodeRandomValue")
        r.data_type = "FLOAT"
        for s_ in r.inputs:
            if s_.type == "VALUE" and s_.name == "Min":
                s_.default_value = lo
            if s_.type == "VALUE" and s_.name == "Max":
                s_.default_value = hi
        r.inputs["Seed"].default_value = sd_
        return [x for x in r.outputs if x.type == "VALUE"][0]
    t = N.new("GeometryNodeInputSceneTime")
    # x = -L/2 + fract(r0 + t * speed / L) * L
    sp0 = N.new("ShaderNodeMath"); sp0.operation = "MULTIPLY"
    Lk.new(t.outputs["Seconds"], sp0.inputs[0]); Lk.new(gin.outputs["speed"], sp0.inputs[1])
    sp = N.new("ShaderNodeMath"); sp.operation = "MULTIPLY"  # each electron drifts at its own speed (0.6–1.4×)
    Lk.new(sp0.outputs[0], sp.inputs[0]); Lk.new(rnd(0.6, 1.4, seed + 7), sp.inputs[1])
    dv = N.new("ShaderNodeMath"); dv.operation = "DIVIDE"
    Lk.new(sp.outputs[0], dv.inputs[0]); dv.inputs[1].default_value = LEN
    ad = N.new("ShaderNodeMath"); ad.operation = "ADD"
    Lk.new(dv.outputs[0], ad.inputs[0]); Lk.new(rnd(0, 1, seed), ad.inputs[1])
    fr = N.new("ShaderNodeMath"); fr.operation = "FRACT"
    Lk.new(ad.outputs[0], fr.inputs[0])
    xx = N.new("ShaderNodeMath"); xx.operation = "MULTIPLY_ADD"
    Lk.new(fr.outputs[0], xx.inputs[0]); xx.inputs[1].default_value = LEN; xx.inputs[2].default_value = -LEN / 2
    # which fin: integer 0..NFIN-1
    fi = N.new("ShaderNodeMath"); fi.operation = "MULTIPLY"
    Lk.new(rnd(0, 1, seed + 1), fi.inputs[0]); fi.inputs[1].default_value = 0.0  # all in the front (X-ray) fin
    yy = N.new("ShaderNodeMath"); yy.operation = "MULTIPLY_ADD"
    Lk.new(fi.outputs[0], yy.inputs[0]); yy.inputs[1].default_value = FIN_PITCH; yy.inputs[2].default_value = fy[0]
    jy = N.new("ShaderNodeMath"); jy.operation = "ADD"
    Lk.new(yy.outputs[0], jy.inputs[0]); Lk.new(rnd(-FIN_W * 0.28, FIN_W * 0.28, seed + 2), jy.inputs[1])
    zz = rnd(FIN_H * 0.55, FIN_H * 0.94, seed + 3)
    comb = N.new("ShaderNodeCombineXYZ")
    Lk.new(xx.outputs[0], comb.inputs["X"]); Lk.new(jy.outputs[0], comb.inputs["Y"]); Lk.new(zz, comb.inputs["Z"])
    # thermal jitter: a smooth random wander (noise in time, a different stream per electron), ±3 nm
    jv = N.new("ShaderNodeCombineXYZ")
    Lk.new(rnd(0, 500, seed + 9), jv.inputs["X"])
    tj = N.new("ShaderNodeMath"); tj.operation = "MULTIPLY"
    Lk.new(t.outputs["Seconds"], tj.inputs[0]); tj.inputs[1].default_value = 4.0
    Lk.new(tj.outputs[0], jv.inputs["Y"])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 1.0; nz.inputs["Detail"].default_value = 1.0
    Lk.new(jv.outputs[0], nz.inputs["Vector"])
    cen = N.new("ShaderNodeVectorMath"); cen.operation = "SUBTRACT"
    Lk.new(nz.outputs["Color"], cen.inputs[0]); cen.inputs[1].default_value = (0.5, 0.5, 0.5)
    amp = N.new("ShaderNodeVectorMath"); amp.operation = "MULTIPLY"
    Lk.new(cen.outputs[0], amp.inputs[0]); amp.inputs[1].default_value = (12 * S, FIN_W * 0.5, 10 * S)
    jp = N.new("ShaderNodeVectorMath"); jp.operation = "ADD"
    Lk.new(comb.outputs[0], jp.inputs[0]); Lk.new(amp.outputs[0], jp.inputs[1])
    Lk.new(jp.outputs[0], pts.inputs["Position"])
    rad = N.new("ShaderNodeMath"); rad.operation = "MULTIPLY"
    Lk.new(gin.outputs["electrons_k"], rad.inputs[0]); rad.inputs[1].default_value = 1.1 * S
    Lk.new(rad.outputs[0], pts.inputs["Radius"])
    ico = N.new("GeometryNodeMeshIcoSphere")
    ico.inputs["Radius"].default_value = 1.0
    ico.inputs["Subdivisions"].default_value = 4  # perfectly round up close
    inst = N.new("GeometryNodeInstanceOnPoints")
    Lk.new(pts.outputs["Points"], inst.inputs["Points"])
    Lk.new(ico.outputs["Mesh"], inst.inputs["Instance"])
    rr_ = N.new("GeometryNodeInputRadius")
    Lk.new(rr_.outputs["Radius"], inst.inputs["Scale"])
    real = N.new("GeometryNodeRealizeInstances")
    Lk.new(inst.outputs["Instances"], real.inputs["Geometry"])
    em = bpy.data.materials.new(name + ".mat")
    em.use_nodes = True
    eb = em.node_tree.nodes["Principled BSDF"]
    eb.inputs["Base Color"].default_value = (0.05, 0.35, 1.0, 1)
    eb.inputs["Emission Color"].default_value = (0.08, 0.45, 1.0, 1)
    eb.inputs["Emission Strength"].default_value = 3.0
    setm = N.new("GeometryNodeSetMaterial")
    setm.inputs["Material"].default_value = em
    Lk.new(real.outputs["Geometry"], setm.inputs["Geometry"])
    Lk.new(setm.outputs["Geometry"], gout.inputs["Geometry"])
    o.data.materials.append(em)
    mod.properties.inputs[[it.identifier for it in tree.interface.items_tree if getattr(it, "in_out", "") == "INPUT" and it.name == "electrons_k"][0]]["value"] = 1.0
    mod.properties.inputs[[it.identifier for it in tree.interface.items_tree if getattr(it, "in_out", "") == "INPUT" and it.name == "speed"][0]]["value"] = 0.35
    return o


electrons("D.electrons", 90, 21)  # sparse enough to follow individual electrons
# heat: every gate glows hot when heat_k rises (the switching losses), strongest at its base where the channel is
def temp_field(m, bias):
    """T(p): hottest in the channel layer (fin tops, z ≈ 40 nm) right under each gate, falling off smoothly with
    distance up through the contacts and wires and down into the substrate; + a small per-material bias
    (how well the material conducts heat away)"""
    nt = m.node_tree
    ps = node(nt, "ShaderNodeNewGeometry")
    sep = node(nt, "ShaderNodeSeparateXYZ")
    nt.links.new(ps.outputs["Position"], sep.inputs[0])
    dz = node(nt, "ShaderNodeMath", operation="SUBTRACT")
    nt.links.new(sep.outputs["Z"], dz.inputs[0])
    dz.inputs[1].default_value = D0.z + 40 * S
    sq = node(nt, "ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(dz.outputs[0], sq.inputs[0])
    nt.links.new(dz.outputs[0], sq.inputs[1])
    ex = node(nt, "ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(sq.outputs[0], ex.inputs[0])
    ex.inputs[1].default_value = -1.0 / (2 * (38 * S) ** 2)
    ez = node(nt, "ShaderNodeMath", operation="EXPONENT")
    nt.links.new(ex.outputs[0], ez.inputs[0])
    gxm = node(nt, "ShaderNodeMath", operation="SUBTRACT")  # along the fin: peaks under the gates
    nt.links.new(sep.outputs["X"], gxm.inputs[0])
    gxm.inputs[1].default_value = D0.x + gx[0]
    ph = node(nt, "ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(gxm.outputs[0], ph.inputs[0])
    ph.inputs[1].default_value = 2 * math.pi / GATE_PITCH
    cs = node(nt, "ShaderNodeMath", operation="COSINE")
    nt.links.new(ph.outputs[0], cs.inputs[0])
    md = node(nt, "ShaderNodeMath", operation="MULTIPLY_ADD")
    nt.links.new(cs.outputs[0], md.inputs[0])
    md.inputs[1].default_value = 0.12
    md.inputs[2].default_value = 0.88
    f = node(nt, "ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(ez.outputs[0], f.inputs[0])
    nt.links.new(md.outputs[0], f.inputs[1])
    t_ = node(nt, "ShaderNodeMath", operation="MULTIPLY_ADD")
    nt.links.new(f.outputs[0], t_.inputs[0])
    t_.inputs[1].default_value = 0.62
    t_.inputs[2].default_value = 0.26 + bias
    return t_.outputs[0]


for _m, _b in ((si, 0.04), (si_xray, 0.05), (gate_m, 0.0), (hik, 0.02), (sd, 0.0), (tung, -0.03), (cu, -0.06), (oxide, 0.0), (sub_m, -0.02), (spacer, -0.01)):
    thermal_mix(_m, temp=temp_field(_m, _b))
for o in CD.objects:
    o["station"] = "D"
print("TRANSISTORS built:", NFIN, "fins ×", NGATE, "gates")

bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/s03_set.blend"))
print("S03 CHIP BUILT")
