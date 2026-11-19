"""s02 stations B, C, D (run after s02_set.py, saves back into blender/s02_set.blend):

    Blender -b blender/s02_set.blend --python tools/blender/s02_stations.py

  B (x = 10)  the see-through arm: the "Arm-01- Ecorche" sculpt (westerly, CC-BY) scaled to Dash's arm (~0.78 m
              shoulder to fingertip), a muscle shader with fibres, masks for the biceps (front of the upper arm) and
              the triceps (back), a smooth skin shell that turns to glass, and heat beads.
  C (x = 20)  the jaw: C1 "Human teeth" (Alexander Antipov, CC-BY) for the chattering macro, upper and lower arch
              split so the lower one can clack; C2 "Free Human skull" (Filip, CC-BY) in profile with the jaw muscle
              (masseter) built on it.
  D (x = 30)  the skin macro: a 6 × 10 cm patch of forearm skin, hair follicles, goosebumps and hairs (geometry nodes).
Every animated quantity is a value node / modifier input / shape key named *_k, keyed by s02_shots.py.
"""
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SF = os.path.join(ROOT, "blender/assets/sketchfab")
sc = bpy.context.scene
V = Vector
for c in ("B.Arm", "C.Jaw", "D.Skin"):
    old = bpy.data.collections.get(c)
    if old:
        for o in list(old.objects):
            bpy.data.objects.remove(o, do_unlink=True)


def coll(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in sc.collection.children:
        sc.collection.children.link(c)
    return c


def node(nt, kind, **kw):
    n = nt.nodes.new(kind)
    for k, v in kw.items():
        if k in n.inputs:
            n.inputs[k].default_value = v
        else:
            setattr(n, k, v)
    return n


def value(nt, name, v=0.0):
    n = node(nt, "ShaderNodeValue", name=name, label=name)
    n.outputs[0].default_value = v
    return n


def import_glb(uid, c):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SF, uid, "model.glb"))
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        for cc in o.users_collection:
            cc.objects.unlink(o)
        c.objects.link(o)
    bpy.context.view_layer.update()
    meshes = [o for o in new if o.type == "MESH"]
    # bake the importer's parent transforms into the meshes, then drop the empties
    for o in meshes:
        mw = o.matrix_world.copy()
        o.parent = None
        o.data.transform(mw)
        o.matrix_world = Matrix.Identity(4)
    for o in new:
        if o.type != "MESH":
            bpy.data.objects.remove(o, do_unlink=True)
    return meshes


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    return o


def bounds(o):
    pts = [o.matrix_world @ v.co for v in o.data.vertices]
    return V([min(p[i] for p in pts) for i in range(3)]), V([max(p[i] for p in pts) for i in range(3)])


def place(o, scale, anchor_local, at):
    """scale the mesh data about anchor_local (a point in its own coordinates) and put that point at `at`"""
    o.data.transform(Matrix.Translation(-anchor_local))
    o.data.transform(Matrix.Scale(scale, 4))
    o.location = at


def glow_mix(m, mask_attr, k_name, color, strength):
    """light a muscle up on cue: add `mask × k × strength` of emission on top of the muscle's own shading, broken up
    by its fibres (node "fibre_f"), so an active muscle reads as glowing muscle, not as a flat painted patch"""
    nt = m.node_tree
    out = [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"][0]
    src = out.inputs["Surface"].links[0].from_socket
    msk = node(nt, "ShaderNodeAttribute", attribute_name=mask_attr)
    k = value(nt, k_name)
    mul = node(nt, "ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(msk.outputs["Fac"], mul.inputs[0])
    nt.links.new(k.outputs[0], mul.inputs[1])
    ff = nt.nodes.get("fibre_f")
    em = node(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = color
    st_ = node(nt, "ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(mul.outputs[0], st_.inputs[0])
    st_.inputs[1].default_value = strength
    if ff:  # 45 % of the glow follows the fibres
        fm = node(nt, "ShaderNodeMath", operation="MULTIPLY_ADD")
        nt.links.new(ff.outputs[0], fm.inputs[0])
        fm.inputs[1].default_value = 0.9
        fm.inputs[2].default_value = 0.55
        st2 = node(nt, "ShaderNodeMath", operation="MULTIPLY")
        nt.links.new(st_.outputs[0], st2.inputs[0])
        nt.links.new(fm.outputs[0], st2.inputs[1])
        nt.links.new(st2.outputs[0], em.inputs["Strength"])
    else:
        nt.links.new(st_.outputs[0], em.inputs["Strength"])
    add = node(nt, "ShaderNodeAddShader")
    nt.links.new(src, add.inputs[0])
    nt.links.new(em.outputs["Emission"], add.inputs[1])
    nt.links.new(add.outputs["Shader"], out.inputs["Surface"])


def fibre_frames(o):
    """per muscle piece (loose part): its own long axis by PCA. Writes point attributes
         fib   (vector)  the point in the piece's own frame: x, y across the fibres, z along them (m)
         pend  (float)   0 at the middle of the piece, 1 at its ends (tendons sit at the ends)
         plen  (float)   the piece's length (m), so only long muscles get tendon ends
         pid   (float)   a random number per piece (slight colour differences between muscles)"""
    import numpy as np
    me = o.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    n = len(bm.verts)
    co = np.array([v.co[:] for v in bm.verts])
    fib = np.zeros((n, 3))
    pend = np.zeros(n)
    plen = np.zeros(n)
    pid = np.zeros(n)
    seen = np.zeros(n, bool)
    rnd = np.random.default_rng(5)
    for v in bm.verts:
        if seen[v.index]:
            continue
        stack, idx = [v], []
        seen[v.index] = True
        while stack:
            x = stack.pop()
            idx.append(x.index)
            for e in x.link_edges:
                y = e.other_vert(x)
                if not seen[y.index]:
                    seen[y.index] = True
                    stack.append(y)
        P = co[idx]
        c = P.mean(axis=0)
        if len(idx) >= 4:
            w, U = np.linalg.eigh(np.cov((P - c).T))
            e1, e2, e3 = U[:, 2], U[:, 1], U[:, 0]
        else:
            e1, e2, e3 = np.array([0, 0, 1.0]), np.array([1.0, 0, 0]), np.array([0, 1.0, 0])
        a = (P - c) @ e1
        half = max(1e-6, np.abs(a).max())
        fib[idx] = np.stack([(P - c) @ e2, (P - c) @ e3, a], axis=1)
        pend[idx] = np.abs(a) / half
        plen[idx] = 2 * half
        pid[idx] = rnd.random()
    bm.free()
    for nm in ("fib", "pend", "plen", "pid"):
        if nm in me.attributes:
            me.attributes.remove(me.attributes[nm])
    me.attributes.new("fib", "FLOAT_VECTOR", "POINT").data.foreach_set("vector", fib.ravel())
    me.attributes.new("pend", "FLOAT", "POINT").data.foreach_set("value", pend)
    me.attributes.new("plen", "FLOAT", "POINT").data.foreach_set("value", plen)
    me.attributes.new("pid", "FLOAT", "POINT").data.foreach_set("value", pid)


def muscle_material(name, uv=False, fine=2600.0, bundle=420.0):
    """anatomical skeletal muscle: deep red with fine fibres and coarser bundles running along each muscle's own axis
    (attribute "fib", or the UV v direction for a sheet muscle), the muscles a little different in tone, shadowed where
    they meet (ambient occlusion), pale, glossy tendons at the ends of long muscles, a wet clear coat, a touch of
    subsurface light"""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    mp = node(nt, "ShaderNodeMapping")
    if uv:
        tc = node(nt, "ShaderNodeTexCoord")
        nt.links.new(tc.outputs["UV"], mp.inputs["Vector"])
        mp.inputs["Scale"].default_value = (0.04, 0.0012, 0.04)  # UV: u across the sheet (≈4 cm), v along the fibres
    else:
        fa = node(nt, "ShaderNodeAttribute", attribute_name="fib")
        nt.links.new(fa.outputs["Vector"], mp.inputs["Vector"])
        mp.inputs["Scale"].default_value = (1.0, 1.0, 0.035)  # long along the fibres
    fn = node(nt, "ShaderNodeTexNoise", Scale=fine, Detail=5.0, Roughness=0.55)
    bn = node(nt, "ShaderNodeTexNoise", Scale=bundle, Detail=2.0, Roughness=0.5)
    nt.links.new(mp.outputs["Vector"], fn.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], bn.inputs["Vector"])
    f1 = node(nt, "ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(fn.outputs["Fac"], f1.inputs[0])
    f1.inputs[1].default_value = 0.55
    f2 = node(nt, "ShaderNodeMath", operation="MULTIPLY_ADD", name="fibre_f", label="fibre_f")
    nt.links.new(bn.outputs["Fac"], f2.inputs[0])
    f2.inputs[1].default_value = 0.45
    nt.links.new(f1.outputs[0], f2.inputs[2])
    ramp = node(nt, "ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.3
    ramp.color_ramp.elements[0].color = (0.045, 0.002, 0.003, 1)
    ramp.color_ramp.elements[1].position = 0.7
    ramp.color_ramp.elements[1].color = (0.28, 0.018, 0.018, 1)
    e = ramp.color_ramp.elements.new(0.52)
    e.color = (0.14, 0.007, 0.009, 1)
    nt.links.new(f2.outputs[0], ramp.inputs["Fac"])
    col = ramp.outputs["Color"]
    if not uv:  # each muscle a little lighter or darker
        pa = node(nt, "ShaderNodeAttribute", attribute_name="pid")
        pv = node(nt, "ShaderNodeMapRange")
        nt.links.new(pa.outputs["Fac"], pv.inputs["Value"])
        pv.inputs["To Min"].default_value = 0.82
        pv.inputs["To Max"].default_value = 1.12
        tint = node(nt, "ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
        tint.inputs["Factor"].default_value = 1.0
        nt.links.new(col, tint.inputs[6])
        cv = node(nt, "ShaderNodeCombineColor")
        for ch in ("Red", "Green", "Blue"):
            nt.links.new(pv.outputs["Result"], cv.inputs[ch])
        nt.links.new(cv.outputs["Color"], tint.inputs[7])
        col = tint.outputs[2]
    # tendon ends: pale, smooth and shinier (only on pieces longer than 6 cm); plus the hand ("tendon" attribute)
    if not uv:
        pe = node(nt, "ShaderNodeAttribute", attribute_name="pend")
        pl = node(nt, "ShaderNodeAttribute", attribute_name="plen")
        te = node(nt, "ShaderNodeMapRange", interpolation_type="SMOOTHSTEP")
        nt.links.new(pe.outputs["Fac"], te.inputs["Value"])
        te.inputs["From Min"].default_value = 0.88
        te.inputs["From Max"].default_value = 0.98
        lg = node(nt, "ShaderNodeMath", operation="GREATER_THAN")
        nt.links.new(pl.outputs["Fac"], lg.inputs[0])
        lg.inputs[1].default_value = 0.06
        tm = node(nt, "ShaderNodeMath", operation="MULTIPLY")
        nt.links.new(te.outputs["Result"], tm.inputs[0])
        nt.links.new(lg.outputs[0], tm.inputs[1])
        hand = node(nt, "ShaderNodeAttribute", attribute_name="tendon")
        tmax = node(nt, "ShaderNodeMath", operation="MAXIMUM")
        nt.links.new(tm.outputs[0], tmax.inputs[0])
        nt.links.new(hand.outputs["Fac"], tmax.inputs[1])
        tcol = node(nt, "ShaderNodeMix", data_type="RGBA")
        nt.links.new(tmax.outputs[0], tcol.inputs["Factor"])
        nt.links.new(col, tcol.inputs[6])
        tcol.inputs[7].default_value = (0.58, 0.5, 0.42, 1)
        col = tcol.outputs[2]
        rmix = node(nt, "ShaderNodeMapRange")
        nt.links.new(tmax.outputs[0], rmix.inputs["Value"])
        rmix.inputs["To Min"].default_value = 0.36
        rmix.inputs["To Max"].default_value = 0.22
        nt.links.new(rmix.outputs["Result"], b.inputs["Roughness"])
    else:
        b.inputs["Roughness"].default_value = 0.36
    # where muscles meet: ambient occlusion darkens the crevices
    ao = node(nt, "ShaderNodeAmbientOcclusion", samples=8, only_local=True)
    ao.inputs["Distance"].default_value = 0.008
    aom = node(nt, "ShaderNodeMapRange")
    nt.links.new(ao.outputs["AO"], aom.inputs["Value"])
    aom.inputs["To Min"].default_value = 0.3
    aom.inputs["To Max"].default_value = 1.0
    shade = node(nt, "ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
    shade.inputs["Factor"].default_value = 1.0
    nt.links.new(col, shade.inputs[6])
    acv = node(nt, "ShaderNodeCombineColor")
    for ch in ("Red", "Green", "Blue"):
        nt.links.new(aom.outputs["Result"], acv.inputs[ch])
    nt.links.new(acv.outputs["Color"], shade.inputs[7])
    nt.links.new(shade.outputs[2], b.inputs["Base Color"])
    b.inputs["Subsurface Weight"].default_value = 0.08
    b.inputs["Subsurface Radius"].default_value = (1.0, 0.12, 0.08)
    b.inputs["Subsurface Scale"].default_value = 0.002
    b.inputs["Coat Weight"].default_value = 0.35
    b.inputs["Coat Roughness"].default_value = 0.12
    b.inputs["Specular IOR Level"].default_value = 0.5
    bump = node(nt, "ShaderNodeBump", Strength=0.3, Distance=0.00025)
    nt.links.new(f2.outputs[0], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


def glass_skin(name, tone=(0.42, 0.2, 0.12), k_name="xray_k"):
    """skin that turns to an X-ray glass shell: xray_k 0 = opaque skin, 1 = a clear shell with a blue rim"""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    out = nt.nodes["Material Output"]
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*tone, 1)
    b.inputs["Roughness"].default_value = 0.42
    b.inputs["Subsurface Weight"].default_value = 0.5
    b.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
    b.inputs["Subsurface Scale"].default_value = 0.006
    pore = node(nt, "ShaderNodeTexVoronoi", Scale=1800.0)
    pb = node(nt, "ShaderNodeBump", Strength=0.15, Distance=0.0002, invert=True)
    nt.links.new(pore.outputs["Distance"], pb.inputs["Height"])
    nt.links.new(pb.outputs["Normal"], b.inputs["Normal"])
    # X-ray state: a clear membrane. Mostly transparent, a faint glossy reflection at grazing angles and a thin cool
    # rim, so the muscles under it keep their full colour (no milky veil)
    fr = node(nt, "ShaderNodeLayerWeight", Blend=0.08)
    pw = node(nt, "ShaderNodeMath", operation="POWER")
    nt.links.new(fr.outputs["Facing"], pw.inputs[0])
    pw.inputs[1].default_value = 3.0
    rim_em = node(nt, "ShaderNodeEmission", Strength=0.35)
    rim_em.inputs["Color"].default_value = (0.55, 0.85, 1.0, 1)
    gl = node(nt, "ShaderNodeBsdfGlossy")
    gl.inputs["Roughness"].default_value = 0.12
    tr = node(nt, "ShaderNodeBsdfTransparent")
    fres = node(nt, "ShaderNodeFresnel")
    fres.inputs["IOR"].default_value = 1.35
    membrane = node(nt, "ShaderNodeMixShader")
    nt.links.new(fres.outputs["Fac"], membrane.inputs["Fac"])
    nt.links.new(tr.outputs["BSDF"], membrane.inputs[1])
    nt.links.new(gl.outputs["BSDF"], membrane.inputs[2])
    rim = node(nt, "ShaderNodeAddShader")
    rs = node(nt, "ShaderNodeMixShader")
    nt.links.new(pw.outputs[0], rs.inputs["Fac"])
    tr0 = node(nt, "ShaderNodeBsdfTransparent")
    nt.links.new(tr0.outputs["BSDF"], rs.inputs[1])
    nt.links.new(rim_em.outputs["Emission"], rs.inputs[2])
    nt.links.new(membrane.outputs["Shader"], rim.inputs[0])
    nt.links.new(rs.outputs["Shader"], rim.inputs[1])
    k = value(nt, k_name)
    mx = node(nt, "ShaderNodeMixShader")
    nt.links.new(k.outputs[0], mx.inputs["Fac"])
    nt.links.new(b.outputs["BSDF"], mx.inputs[1])
    nt.links.new(rim.outputs["Shader"], mx.inputs[2])
    nt.links.new(mx.outputs["Shader"], out.inputs["Surface"])
    return m


# ════════════════════════════ STATION B — the see-through arm ════════════════════════════
CB = coll("B.Arm")
B0 = V((10.0, 0.0, 0.0))
parts = import_glb("d7315decb9274e0e87ab819e631a0ae0", CB)
arm = join(parts, "B.arm")
lo, hi = bounds(arm)
ARM_LEN = 0.78  # Dash: shoulder top to fingertip
s = ARM_LEN / (hi.z - lo.z)
top = V(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, hi.z))
place(arm, s, top, B0 + V((0, 0, 1.45)))
bpy.ops.object.select_all(action="DESELECT")
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.shade_smooth()
bpy.context.view_layer.update()
lo, hi = bounds(arm)
L0 = hi.z - lo.z
# the sculpt is 2,525 separate pieces (muscles, tendons, hand bones). Classify each by its centre, in the model's own
# units (arm hanging along −Z from z = 0.39 at the shoulder top; the front of the arm is −Y):
#   shoulder girdle (pectoral sheet, clavicle, teres, scapula pieces): centre medial (x > −0.25) and high (z > −0.8)
#   biceps (long + short head): front (y < −0.12), big, centred on the upper arm (−1.3 < z < −0.4)
#   triceps (long + lateral head): back/outer (y > −0.03, x < −0.45), big, centred on the upper arm
_bm = bmesh.new()
_bm.from_mesh(arm.data)
_bm.verts.ensure_lookup_table()
_seen, _parts = set(), []
for _v in _bm.verts:
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
    _parts.append(_pt)


def _orig(co):
    return co / s + top  # back to the model's own units


_kill, _bi, _tri = [], set(), set()
_cents = [(sum((_orig(q.co) for q in _pt), V()) / len(_pt), _pt) for _pt in _parts]
# the deltoid: the biggest piece centred on the shoulder; it is kept as the arm's rounded top
_delt = max([(len(pt), id(pt)) for c, pt in _cents if c.z > -0.45 and c.x < -0.25])[1]
for c, _pt in _cents:
    n = len(_pt)
    if (c.x > -0.25 and c.z > -0.8) or (c.z > -0.45 and id(_pt) != _delt):
        _kill.extend(_pt)
    elif n > 1000 and c.y < -0.12 and -1.3 < c.z < -0.4:
        _bi.update(q.index for q in _pt)
    elif n > 1000 and ((c.y > 0.0 and c.x < -0.3) or (c.y > -0.03 and c.x < -0.45)) and -1.2 < c.z < -0.2:
        _tri.update(q.index for q in _pt)
_bi_co = {q.co.to_tuple(6) for q in _bm.verts if q.index in _bi}
_tri_co = {q.co.to_tuple(6) for q in _bm.verts if q.index in _tri}
bmesh.ops.delete(_bm, geom=list(set(_kill)), context="VERTS")
_bm.to_mesh(arm.data)
_bm.free()
print("ARM parts", len(_parts), "removed", len(set(_kill)), "biceps verts", len(_bi_co), "triceps verts", len(_tri_co))
L = L0
# landmarks along the arm (fractions of shoulder-top → fingertip for an adult arm)
Z_SHOULDER = hi.z - 0.06 * L
Z_ELBOW = hi.z - 0.42 * L
Z_WRIST = hi.z - 0.76 * L
mw = arm.matrix_world
cx = sum((mw @ v.co).x for v in arm.data.vertices) / len(arm.data.vertices)
# the arm's front: in the sculpt the palm/biceps side faces −Y (checked on the preview renders)
band = [mw @ v.co for v in arm.data.vertices if Z_ELBOW + 0.03 < (mw @ v.co).z < Z_SHOULDER - 0.03]
cy = sum(p.y for p in band) / len(band)
cxu = sum(p.x for p in band) / len(band)


def sstep(e0, e1, x):
    u = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return u * u * (3 - 2 * u)


me = arm.data
for nm in ("biceps", "triceps", "tendon", "upper"):
    if nm in me.attributes:
        me.attributes.remove(me.attributes[nm])
A_bi = me.attributes.new("biceps", "FLOAT", "POINT")
A_tri = me.attributes.new("triceps", "FLOAT", "POINT")
A_ten = me.attributes.new("tendon", "FLOAT", "POINT")
from mathutils.kdtree import KDTree


def _kd(cos):
    kd = KDTree(len(cos))
    for i_, c_ in enumerate(cos):
        kd.insert(V(c_), i_)
    kd.balance()
    return kd


_kbi, _ktri = _kd(_bi_co), _kd(_tri_co)
for i, v in enumerate(me.vertices):
    p = mw @ v.co
    # the muscle itself, plus anything lying on it within a few millimetres (fascia, small pieces poking through),
    # so the glow reads as one smooth muscle
    A_bi.data[i].value = sstep(0.007, 0.003, _kbi.find(v.co)[2])
    A_tri.data[i].value = sstep(0.007, 0.003, _ktri.find(v.co)[2])
    A_ten.data[i].value = sstep(Z_WRIST + 0.02, Z_WRIST - 0.03, p.z) * 0.85
fibre_frames(arm)
musc = muscle_material("B.muscle")
arm.data.materials.clear()
arm.data.materials.append(musc)
glow_mix(musc, "biceps", "biceps_k", (1.0, 0.1, 0.015, 1), 1.0)
glow_mix(musc, "triceps", "triceps_k", (1.0, 0.1, 0.015, 1), 1.0)
glow_mix(musc, "upper_heat", "heat_k", (1.0, 0.32, 0.03, 1), 0.7)
A_heat = me.attributes.new("upper_heat", "FLOAT", "POINT")
for i in range(len(me.vertices)):
    A_heat.data[i].value = min(1.0, A_bi.data[i].value + A_tri.data[i].value)
# contraction: the masked muscle bulges 3–4 mm along its normal (shape keys "biceps_k" / "triceps_k")
arm.shape_key_add(name="Basis")
for nm, attr, mm in (("biceps_k", A_bi, 0.0045), ("triceps_k", A_tri, 0.0035)):
    kb = arm.shape_key_add(name=nm)
    for i, v in enumerate(me.vertices):
        w = attr.data[i].value
        if w > 0:
            kb.data[i].co = v.co + v.normal * mm * w
# skin shell: the same arm pushed out 5 mm and smoothed into one envelope
# skin: a smooth tube fitted around the muscles, slice by slice (every 5 mm along the arm, 72 directions). Each
# direction takes the furthest muscle point, the radii are smoothed round and along the arm, then pushed out 5 mm;
# the top closes over the deltoid in a dome, the bottom tapers off at the wrist.
SL, ND = 0.005, 72
z_top = max(v.co.z for v in me.vertices)
z_wr = Z_WRIST - arm.location.z
nsl = int((z_top - z_wr) / SL) + 1
rad = [[0.0] * ND for _ in range(nsl)]
cen = [[V(), 0] for _ in range(nsl)]
for v in me.vertices:
    k = int((z_top - v.co.z) / SL)
    if 0 <= k < nsl:
        cen[k][0] += v.co
        cen[k][1] += 1
cen = [c / n if n else None for c, n in cen]
for k in range(nsl):  # fill empty slices
    if cen[k] is None:
        cen[k] = next(cen[j] for j in list(range(k, nsl)) + list(range(k, -1, -1)) if cen[j] is not None)
# smooth the axis
cen = [sum(cen[max(0, k - 6):k + 7], V()) / len(cen[max(0, k - 6):k + 7]) for k in range(nsl)]
for v in me.vertices:
    k = int((z_top - v.co.z) / SL)
    if 0 <= k < nsl:
        d = V((v.co.x - cen[k].x, v.co.y - cen[k].y))
        a_ = int((math.atan2(d.y, d.x) + math.pi) / (2 * math.pi) * ND) % ND
        rad[k][a_] = max(rad[k][a_], d.length)
for _ in range(3):  # fill gaps round each slice
    for k in range(nsl):
        for a_ in range(ND):
            if rad[k][a_] == 0.0:
                rad[k][a_] = max(rad[k][(a_ - 1) % ND], rad[k][(a_ + 1) % ND])
for _ in range(6):  # smooth round and along (keeping the envelope: never below the measured radius)
    new = [[0.0] * ND for _ in range(nsl)]
    for k in range(nsl):
        for a_ in range(ND):
            nb = [rad[k][(a_ + d) % ND] for d in (-2, -1, 0, 1, 2)] + [rad[max(0, k - 1)][a_], rad[min(nsl - 1, k + 1)][a_]]
            new[k][a_] = max(rad[k][a_], sum(nb) / len(nb))
    rad = new
OUT = 0.005
skme = bpy.data.meshes.new("B.skin")
_b = bmesh.new()
rings = []
for k in range(nsl):
    zc = z_top - k * SL
    taper = 1.0 if k > 4 else 0.55 + 0.45 * math.sin(k / 4 * math.pi / 2)  # dome over the top
    ring = []
    for a_ in range(ND):
        th = (a_ + 0.5) / ND * 2 * math.pi - math.pi
        r = (rad[k][a_] + OUT) * taper
        ring.append(_b.verts.new((cen[k].x + r * math.cos(th), cen[k].y + r * math.sin(th), zc + (0.012 if k == 0 else 0.0))))
    rings.append(ring)
for k in range(nsl - 1):
    for a_ in range(ND):
        _b.faces.new((rings[k][a_], rings[k][(a_ + 1) % ND], rings[k + 1][(a_ + 1) % ND], rings[k + 1][a_]))
_b.faces.new(rings[0][::-1])
_b.faces.new(rings[-1])
bmesh.ops.recalc_face_normals(_b, faces=_b.faces[:])
_b.to_mesh(skme)
_b.free()
skin = bpy.data.objects.new("B.skin", skme)
CB.objects.link(skin)
skin.location = arm.location
for p_ in skme.polygons:
    p_.use_smooth = True
sk_m = glass_skin("B.skin")
skin.data.materials.append(sk_m)
ssub = skin.modifiers.new("smooth", "SUBSURF")
ssub.levels = ssub.render_levels = 2
for o in (arm, skin):
    o["station"] = "B"
print("ARM length", round(L, 3), "elbow z", round(Z_ELBOW, 3), "front y", round(cy, 4))


# heat beads: points on the upper-arm muscles drift outward and up, glow and fade (geometry nodes, keyed heat_k)
def heat_beads(src, name, mask, count, seed):
    o = bpy.data.objects.new(name, bpy.data.meshes.new(name))
    CB.objects.link(o)
    o["station"] = "B"
    mod = o.modifiers.new("beads", "NODES")
    tree = bpy.data.node_groups.new(name + ".gn", "GeometryNodeTree")
    tree.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    tree.interface.new_socket("heat_k", in_out="INPUT", socket_type="NodeSocketFloat")
    mod.node_group = tree
    N, Lk = tree.nodes, tree.links
    gin = N.new("NodeGroupInput")
    gout = N.new("NodeGroupOutput")
    obj = N.new("GeometryNodeObjectInfo")
    obj.inputs["Object"].default_value = src
    obj.transform_space = "RELATIVE"
    named = N.new("GeometryNodeInputNamedAttribute")
    named.data_type = "FLOAT"
    named.inputs["Name"].default_value = mask
    dist = N.new("GeometryNodeDistributePointsOnFaces")
    dist.inputs["Density"].default_value = count
    dist.inputs["Seed"].default_value = seed
    Lk.new(obj.outputs["Geometry"], dist.inputs["Mesh"])
    gt = N.new("CompareNode") if False else N.new("FunctionNodeCompare")
    gt.data_type = "FLOAT"
    gt.operation = "GREATER_THAN"
    Lk.new(named.outputs[0], gt.inputs[0])
    gt.inputs[1].default_value = 0.5
    Lk.new(gt.outputs[0], dist.inputs["Selection"])
    t = N.new("GeometryNodeInputSceneTime")
    rnd = N.new("FunctionNodeRandomValue")
    rnd.data_type = "FLOAT"
    rsock = [x for x in rnd.outputs if x.type == "VALUE"][0]
    rnd.inputs["Seed"].default_value = seed
    # age = fract(time * 0.8 + random)
    ag = N.new("ShaderNodeMath"); ag.operation = "MULTIPLY_ADD"
    Lk.new(t.outputs["Seconds"], ag.inputs[0]); ag.inputs[1].default_value = 0.8; Lk.new(rsock, ag.inputs[2])
    fr = N.new("ShaderNodeMath"); fr.operation = "FRACT"
    Lk.new(ag.outputs[0], fr.inputs[0])
    # offset = normal * age * 3 cm + up * age * 2 cm
    nrm = N.new("GeometryNodeInputNormal")
    sc1 = N.new("ShaderNodeVectorMath"); sc1.operation = "SCALE"
    Lk.new(nrm.outputs[0], sc1.inputs[0])
    m3 = N.new("ShaderNodeMath"); m3.operation = "MULTIPLY"
    Lk.new(fr.outputs[0], m3.inputs[0]); m3.inputs[1].default_value = 0.03
    Lk.new(m3.outputs[0], sc1.inputs["Scale"])
    upv = N.new("ShaderNodeVectorMath"); upv.operation = "SCALE"
    upv.inputs[0].default_value = (0, 0, 1)
    m2 = N.new("ShaderNodeMath"); m2.operation = "MULTIPLY"
    Lk.new(fr.outputs[0], m2.inputs[0]); m2.inputs[1].default_value = 0.02
    Lk.new(m2.outputs[0], upv.inputs["Scale"])
    addv = N.new("ShaderNodeVectorMath"); addv.operation = "ADD"
    Lk.new(sc1.outputs[0], addv.inputs[0]); Lk.new(upv.outputs[0], addv.inputs[1])
    setp = N.new("GeometryNodeSetPosition")
    Lk.new(dist.outputs["Points"], setp.inputs["Geometry"])
    Lk.new(addv.outputs[0], setp.inputs["Offset"])
    # size = heat_k * 1.6 mm * sin(pi * age)
    sn = N.new("ShaderNodeMath"); sn.operation = "MULTIPLY"
    Lk.new(fr.outputs[0], sn.inputs[0]); sn.inputs[1].default_value = math.pi
    sn2 = N.new("ShaderNodeMath"); sn2.operation = "SINE"
    Lk.new(sn.outputs[0], sn2.inputs[0])
    sz = N.new("ShaderNodeMath"); sz.operation = "MULTIPLY"
    Lk.new(sn2.outputs[0], sz.inputs[0]); Lk.new(gin.outputs["heat_k"], sz.inputs[1])
    sz2 = N.new("ShaderNodeMath"); sz2.operation = "MULTIPLY"
    Lk.new(sz.outputs[0], sz2.inputs[0]); sz2.inputs[1].default_value = 0.0016
    ico = N.new("GeometryNodeMeshIcoSphere")
    ico.inputs["Radius"].default_value = 1.0
    ico.inputs["Subdivisions"].default_value = 2
    inst = N.new("GeometryNodeInstanceOnPoints")
    Lk.new(setp.outputs["Geometry"], inst.inputs["Points"])
    Lk.new(ico.outputs["Mesh"], inst.inputs["Instance"])
    Lk.new(sz2.outputs[0], inst.inputs["Scale"])
    real = N.new("GeometryNodeRealizeInstances")
    Lk.new(inst.outputs["Instances"], real.inputs["Geometry"])
    bm_ = bpy.data.materials.get("B.heatbead") or bpy.data.materials.new("B.heatbead")
    bm_.use_nodes = True
    bb = bm_.node_tree.nodes["Principled BSDF"]
    bb.inputs["Emission Color"].default_value = (1.0, 0.45, 0.06, 1)
    bb.inputs["Emission Strength"].default_value = 5.0
    bb.inputs["Base Color"].default_value = (1.0, 0.5, 0.1, 1)
    setm = N.new("GeometryNodeSetMaterial")
    setm.inputs["Material"].default_value = bm_
    Lk.new(real.outputs["Geometry"], setm.inputs["Geometry"])
    Lk.new(setm.outputs["Geometry"], gout.inputs["Geometry"])
    o.data.materials.append(bm_)
    return o


def top_fade(m, z0=-0.21, z1=-0.14):
    """material m fades to fully transparent between local z0 and z1 (the arm's top is at local z = 0)"""
    nt = m.node_tree
    out = [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"][0]
    src = out.inputs["Surface"].links[0].from_socket
    tc_ = node(nt, "ShaderNodeTexCoord")
    sp_ = node(nt, "ShaderNodeSeparateXYZ")
    nt.links.new(tc_.outputs["Object"], sp_.inputs[0])
    mr = node(nt, "ShaderNodeMapRange", interpolation_type="SMOOTHSTEP")
    mr.inputs["From Min"].default_value = z0
    mr.inputs["From Max"].default_value = z1
    nt.links.new(sp_.outputs["Z"], mr.inputs["Value"])
    tr_ = node(nt, "ShaderNodeBsdfTransparent")
    mx_ = node(nt, "ShaderNodeMixShader")
    nt.links.new(mr.outputs["Result"], mx_.inputs["Fac"])
    nt.links.new(src, mx_.inputs[1])
    nt.links.new(tr_.outputs["BSDF"], mx_.inputs[2])
    nt.links.new(mx_.outputs["Shader"], out.inputs["Surface"])


hb = heat_beads(arm, "B.heat", "upper_heat", 40000.0, 3)
for o in (skin, hb):
    o.parent = arm
    o.location = (0, 0, 0)
    o.matrix_parent_inverse = Matrix.Identity(4)
arm.rotation_euler = (0, math.radians(-18), math.radians(-12))  # hanging at an angle, like a relaxed arm away from the body

# ════════════════════════════ STATION C — the jaw ════════════════════════════
CC = coll("C.Jaw")
C0 = V((20.0, 0.0, 0.0))
# C1: the teeth, front macro. Real arch width ≈ 5.5 cm.
tparts = import_glb("c4c569f0e08948e2a572007a7a5726f2", CC)
gums = [o for o in tparts if o.name.startswith("Gums")][0]
teeth = [o for o in tparts if o.name.startswith("Teeth")][0]
tlo, thi = bounds(teeth)
ts = 0.055 / (thi.x - tlo.x)
mid_z = (tlo.z + thi.z) / 2
anchor = V(((tlo.x + thi.x) / 2, tlo.y, mid_z))


def split_by_parts(o, keep_upper, name):
    """keep only the loose parts whose centre is above (or below) the bite plane"""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bm.verts.ensure_lookup_table()
    seen, kill = set(), []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack, part = [v], []
        seen.add(v.index)
        while stack:
            x = stack.pop()
            part.append(x)
            for e in x.link_edges:
                y = e.other_vert(x)
                if y.index not in seen:
                    seen.add(y.index)
                    stack.append(y)
        cz = sum((o.matrix_world @ p.co).z for p in part) / len(part)
        if (cz >= mid_z) != keep_upper:
            kill.extend(part)
    bmesh.ops.delete(bm, geom=kill, context="VERTS")
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in o.data.materials:
        me.materials.append(m)
    n = bpy.data.objects.new(name, me)
    CC.objects.link(n)
    n.matrix_world = o.matrix_world
    return n


pieces = {}
for src_o, tag in ((teeth, "teeth"), (gums, "gums")):
    for up in (True, False):
        pieces[(tag, up)] = split_by_parts(src_o, up, f"C.{tag}.{'upper' if up else 'lower'}")
for o in tparts:
    bpy.data.objects.remove(o, do_unlink=True)
for (tag, up), o in pieces.items():
    place(o, ts, anchor, C0 + V((0, 0, 1.0)))
    o["station"] = "C1"
    o["jaw"] = "lower" if not up else "upper"
    for p in o.data.polygons:
        p.use_smooth = True
# tooth enamel: a little translucent and glossy
for m in {mm for o in pieces.values() for mm in o.data.materials if mm}:
    b = [n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"][0]
    if "Teeth" in m.name:
        b.inputs["Subsurface Weight"].default_value = 0.25
        b.inputs["Subsurface Scale"].default_value = 0.002
        b.inputs["Roughness"].default_value = 0.22
        b.inputs["Coat Weight"].default_value = 0.4
    else:
        b.inputs["Subsurface Weight"].default_value = 0.4
        b.inputs["Subsurface Scale"].default_value = 0.003
        b.inputs["Coat Weight"].default_value = 0.6
        b.inputs["Coat Roughness"].default_value = 0.1
print("TEETH scale", round(ts, 5), "bite z", 1.0)

# C2: the skull in profile (x = 22), jaw closed, with the masseter
C2 = V((22.0, 0.0, 0.0))
sparts = import_glb("444884ba91f24d51bc34bb44779ef689", CC)
mand = [o for o in sparts if o.name.startswith("Mball")][0]
cran = [o for o in sparts if o.name.startswith("Sphere")][0]
mand.name, cran.name = "C.mandible", "C.cranium"
clo, chi = bounds(cran)
ss_ = 0.21 / (chi.y - clo.y)  # skull length front-to-back ≈ 21 cm (glabella → back of the head is ~19–20; with the teeth ~21)
skull_anchor = V(((clo.x + chi.x) / 2, (clo.y + chi.y) / 2, clo.z))
# the jaw hinge (condyles): the highest points of the mandible
mlo, mhi = bounds(mand)
cond = [mand.matrix_world @ v.co for v in mand.data.vertices if (mand.matrix_world @ v.co).z > mhi.z - 2.0]
hinge = sum(cond, V()) / len(cond)
for o in (cran, mand):
    place(o, ss_, skull_anchor, C2 + V((0, 0, 1.0)))
    o["station"] = "C2"
    for p in o.data.polygons:
        p.use_smooth = True
hinge_w = C2 + V((0, 0, 1.0)) + (hinge - skull_anchor) * ss_
# the sculpt has the mouth wide open: close it about the hinge (pivot = hinge), rotating about X
bpy.context.view_layer.update()
mand.data.transform(Matrix.Translation(-(hinge_w - mand.location)))
mand.location = hinge_w
mand.rotation_mode = "XYZ"
cran.rotation_mode = "XYZ"
mand["open_deg"] = 0.0
bone = bpy.data.materials.new("C.bone")
bone.use_nodes = True
bb = bone.node_tree.nodes["Principled BSDF"]
bb.inputs["Base Color"].default_value = (0.34, 0.27, 0.17, 1)  # linear ≈ sRGB ivory (0.62, 0.56, 0.45)
bb.inputs["Roughness"].default_value = 0.6
bb.inputs["Subsurface Weight"].default_value = 0.08
bb.inputs["Subsurface Radius"].default_value = (0.6, 0.5, 0.4)
bb.inputs["Subsurface Scale"].default_value = 0.003
bn = node(bone.node_tree, "ShaderNodeTexNoise", Scale=400.0, Detail=8.0)
bbp = node(bone.node_tree, "ShaderNodeBump", Strength=0.2, Distance=0.0003)
bone.node_tree.links.new(bn.outputs["Fac"], bbp.inputs["Height"])
bone.node_tree.links.new(bbp.outputs["Normal"], bb.inputs["Normal"])
for o in (cran, mand):
    o.data.materials.clear()
    o.data.materials.append(bone)

# close the jaw: rotate about the hinge (local X) until the lower teeth just touch the upper ones
from mathutils.bvhtree import BVHTree
bpy.context.view_layer.update()
cran_bvh = BVHTree.FromPolygons([cran.matrix_world @ v.co for v in cran.data.vertices], [tuple(p.vertices) for p in cran.data.polygons])
mlocal = [v.co.copy() for v in mand.data.vertices]
front_pts = sorted(mlocal, key=lambda c: c.y)[: max(200, len(mlocal) // 15)]  # the front of the jaw: incisors and chin
closed = 0.0
for step in range(0, 1400):
    a_ = -math.radians(step * 0.05)
    R = Matrix.Rotation(a_, 4, "X")
    dmin = min(cran_bvh.find_nearest(mand.location + (R @ c))[3] for c in front_pts[::4])
    if dmin < 0.0006:
        closed = -step * 0.05
        break
mand["closed_deg"] = closed
mand.rotation_euler.x = math.radians(closed)
print("JAW closed at", closed, "deg")

# the masseter on the camera side (−X): from the underside of the cheekbone arch to the angle of the jaw
bpy.context.view_layer.update()
cw = [cran.matrix_world @ v.co for v in cran.data.vertices]
mw_ = [mand.matrix_world @ v.co for v in mand.data.vertices]
cxs = sum(p.x for p in cw) / len(cw)
arch_band = [p for p in cw if p.x < cxs - 0.045 and hinge_w.y - 0.055 < p.y < hinge_w.y - 0.012 and hinge_w.z - 0.012 < p.z < hinge_w.z + 0.02]
arch = min(arch_band, key=lambda p: p.z + 0.3 * (p.x - cxs))
ang_band = [p for p in mw_ if p.x < cxs - 0.03 and p.y > hinge_w.y - 0.03]
angle_pt = min(ang_band, key=lambda p: p.z - 0.4 * p.y)
print("MASSETER from", [round(c, 3) for c in arch], "to", [round(c, 3) for c in angle_pt])


def spindle(bm, a, b, width, thick, out_dir, n=28, m=20):
    """a flat muscle belly from a to b: widest in the middle, lying on the bone with its face toward out_dir"""
    axis = (b - a)
    Lm = axis.length
    d = axis.normalized()
    side = d.cross(out_dir).normalized()
    nrm = side.cross(d).normalized()
    rows = []
    for i in range(n + 1):
        t = i / n
        prof = math.sin(math.pi * (0.08 + 0.84 * t)) ** 0.7
        c = a + d * Lm * t
        row = []
        for j in range(m):
            u = 2 * math.pi * j / m
            row.append(bm.verts.new(c + side * math.cos(u) * width / 2 * prof + nrm * (math.sin(u) * 0.5 + 0.5) * thick * prof))
        rows.append(row)
    for i in range(n):
        for j in range(m):
            bm.faces.new((rows[i][j], rows[i + 1][j], rows[i + 1][(j + 1) % m], rows[i][(j + 1) % m]))


mass_m = muscle_material("C.masseter", uv=True, fine=2600.0, bundle=420.0)
# four corners: front and back of the cheekbone arch; front and back of the jaw's lower border
arch_f = min([p for p in cw if p.x < cxs - 0.04 and abs(p.y - (hinge_w.y - 0.048)) < 0.006 and hinge_w.z - 0.02 < p.z < hinge_w.z + 0.01], key=lambda p: p.x)
arch_b = min([p for p in cw if p.x < cxs - 0.04 and abs(p.y - (hinge_w.y - 0.018)) < 0.006 and hinge_w.z - 0.02 < p.z < hinge_w.z + 0.01], key=lambda p: p.x)
jaw_b = angle_pt
jaw_f = min([p for p in mw_ if p.x < cxs - 0.02 and abs(p.y - (angle_pt.y - 0.026)) < 0.004], key=lambda p: p.z)
print("MASSETER corners", [[round(c, 3) for c in q] for q in (arch_f, arch_b, jaw_b, jaw_f)])
mme = bpy.data.meshes.new("C.masseter")
_b = bmesh.new()
uvl = _b.loops.layers.uv.new("UVMap")
NU, NV = 24, 36
grid = {}
for i in range(NU + 1):
    u = i / NU
    for j in range(NV + 1):
        v = j / NV
        top = arch_f.lerp(arch_b, u)
        bot = jaw_f.lerp(jaw_b, u)
        # the belly narrows a little toward the jaw angle and bulges outward in the middle
        grid[i, j] = _b.verts.new(top.lerp(bot, v) + V((-0.01, 0, 0)))
for i in range(NU):
    for j in range(NV):
        uc, vc = (i + 0.5) / NU * 2 - 1, (j + 0.5) / NV * 2 - 1
        if abs(uc) ** 3 + abs(vc) ** 4 > 1.0:  # rounded (superellipse) outline, not a rectangle
            continue
        f = _b.faces.new((grid[i, j], grid[i + 1, j], grid[i + 1, j + 1], grid[i, j + 1]))
        for lp, (ii, jj) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
            lp[uvl].uv = (ii / NU, jj / NV)
_b.verts.ensure_lookup_table()
bmesh.ops.delete(_b, geom=[v for v in _b.verts if not v.link_faces], context="VERTS")
_b.to_mesh(mme)
_b.free()
mass = bpy.data.objects.new("C.masseter", mme)
CC.objects.link(mass)
mass.data.materials.append(mass_m)
for p_ in mass.data.polygons:
    p_.use_smooth = True
mass["station"] = "C2"
# lay the sheet on the bone: cast each vertex sideways onto the skull/jaw surface (keeps its outline; the
# shrinkwrap pulled the arch end down onto the jaw and squeezed it)
bpy.context.view_layer.update()
_tris = []
_pts = []
for ob in (cran, mand):
    off = len(_pts)
    _pts += [ob.matrix_world @ v.co for v in ob.data.vertices]
    _tris += [tuple(off + i for i in p.vertices) for p in ob.data.polygons]
_bvh = BVHTree.FromPolygons(_pts, _tris)
for v in mme.vertices:
    hit = _bvh.ray_cast(V((cxs - 0.2, v.co.y, v.co.z)), V((1, 0, 0)))
    if hit[0] is not None:
        v.co.x = hit[0].x - 0.0015
# even out the bumps the bone gives it (teeth, ridges): average the sideways depth only, never moving inward
_nb = {v.index: set() for v in mme.vertices}
for e in mme.edges:
    a_, b_ = e.vertices
    _nb[a_].add(b_)
    _nb[b_].add(a_)
_x0 = {v.index: v.co.x for v in mme.vertices}
for _ in range(40):
    nx = {i: sum(mme.vertices[j].co.x for j in nbs) / len(nbs) if nbs else mme.vertices[i].co.x for i, nbs in _nb.items()}
    for i, x in nx.items():
        mme.vertices[i].co.x = min(x, _x0[i])  # −X is outward: stay on or outside the bone
bel = mass.vertex_groups.new(name="belly")
_uv = mme.uv_layers["UVMap"].data
_w = {}
for lp in mme.loops:
    u_, v_ = _uv[lp.index].uv
    _w[lp.vertex_index] = max(0.0, 1 - (abs(2 * u_ - 1) ** 2 + abs(2 * v_ - 1) ** 2) / 1.6)
for vi, w in _w.items():
    bel.add([vi], w, "REPLACE")
bulge = mass.modifiers.new("bulge", "DISPLACE")
bulge.vertex_group = "belly"
bulge.strength = 0.007
bulge.mid_level = 0.0
bulge.direction = "NORMAL"
sol = mass.modifiers.new("belly", "SOLIDIFY")
sol.thickness = 0.0025
sol.offset = -1.0
# glow on cue (masseter_k), whole muscle
ma = mme.attributes.new("whole", "FLOAT", "POINT")
for i in range(len(mme.vertices)):
    ma.data[i].value = 1.0
glow_mix(mass_m, "whole", "masseter_k", (1.0, 0.1, 0.015, 1), 0.9)
# the lower half follows the jaw (hook), so the muscle stretches as the jaw chatters
vg = mass.vertex_groups.new(name="jaw")
zmid = (arch_f.z + jaw_f.z) / 2
for v in mme.vertices:
    w = max(0.0, min(1.0, (zmid + 0.012 - v.co.z) / 0.03))
    if w > 0:
        vg.add([v.index], w, "REPLACE")
hk = mass.modifiers.new("jaw", "HOOK")
hk.object = mand
hk.vertex_group = "jaw"
bpy.context.view_layer.update()
hk.matrix_inverse = mand.matrix_world.inverted()
ss2 = mass.modifiers.new("smooth", "SUBSURF")
ss2.levels = ss2.render_levels = 2
print("SKULL scale", round(ss_, 5), "hinge", [round(c, 3) for c in hinge_w])

# ════════════════════════════ STATION D — goosebumps ════════════════════════════
CD = coll("D.Skin")
D0 = V((30.0, 0.0, 1.0))


def skin_patch():
    me = bpy.data.meshes.new("D.skin")
    o = bpy.data.objects.new("D.skin", me)
    CD.objects.link(o)
    o.location = D0
    o["station"] = "D"
    mod = o.modifiers.new("goose", "NODES")
    tree = bpy.data.node_groups.new("D.goose", "GeometryNodeTree")
    tree.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    tree.interface.new_socket("goose_k", in_out="INPUT", socket_type="NodeSocketFloat")
    tree.interface.new_socket("hair_k", in_out="INPUT", socket_type="NodeSocketFloat")
    mod.node_group = tree
    N, Lk = tree.nodes, tree.links
    gin, gout = N.new("NodeGroupInput"), N.new("NodeGroupOutput")
    grid = N.new("GeometryNodeMeshGrid")
    grid.inputs["Size X"].default_value = 0.06
    grid.inputs["Size Y"].default_value = 0.10
    grid.inputs["Vertices X"].default_value = 600
    grid.inputs["Vertices Y"].default_value = 1000
    # follicles: ~ 20 per cm² on a forearm, jittered
    pts = N.new("GeometryNodeDistributePointsOnFaces")
    pts.distribute_method = "POISSON"
    pts.inputs["Distance Min"].default_value = 0.0019
    pts.inputs["Density Max"].default_value = 250000.0
    pts.inputs["Seed"].default_value = 11
    Lk.new(grid.outputs["Mesh"], pts.inputs["Mesh"])
    # bump height at each skin vertex: goose_k × 0.5 mm × smooth falloff within 0.9 mm of the nearest follicle
    prox = N.new("GeometryNodeProximity")
    prox.target_element = "POINTS"
    Lk.new(pts.outputs["Points"], prox.inputs[0])
    r = N.new("ShaderNodeMapRange")
    r.interpolation_type = "SMOOTHERSTEP"
    Lk.new(prox.outputs["Distance"], r.inputs["Value"])
    r.inputs["From Min"].default_value = 0.0009
    r.inputs["From Max"].default_value = 0.0
    h = N.new("ShaderNodeMath"); h.operation = "MULTIPLY"
    Lk.new(r.outputs["Result"], h.inputs[0]); Lk.new(gin.outputs["goose_k"], h.inputs[1])
    h2 = N.new("ShaderNodeMath"); h2.operation = "MULTIPLY"
    Lk.new(h.outputs[0], h2.inputs[0]); h2.inputs[1].default_value = 0.0005
    # gentle skin undulation everywhere
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 40.0
    nm = N.new("ShaderNodeMath"); nm.operation = "MULTIPLY_ADD"
    Lk.new(nz.outputs["Fac"], nm.inputs[0]); nm.inputs[1].default_value = 0.0006; Lk.new(h2.outputs[0], nm.inputs[2])
    comb = N.new("ShaderNodeCombineXYZ")
    Lk.new(nm.outputs[0], comb.inputs["Z"])
    setp = N.new("GeometryNodeSetPosition")
    Lk.new(grid.outputs["Mesh"], setp.inputs["Geometry"])
    Lk.new(comb.outputs[0], setp.inputs["Offset"])
    # hairs: on the follicles, raised to the bump top; lying flat (≈ 75° from the normal, pointing toward +Y)
    # → standing (≈ 20°) as hair_k goes 0 → 1
    rz = N.new("ShaderNodeCombineXYZ")
    hz = N.new("ShaderNodeMath"); hz.operation = "MULTIPLY"
    Lk.new(gin.outputs["goose_k"], hz.inputs[0]); hz.inputs[1].default_value = 0.0005
    Lk.new(hz.outputs[0], rz.inputs["Z"])
    hp = N.new("GeometryNodeSetPosition")
    Lk.new(pts.outputs["Points"], hp.inputs["Geometry"])
    Lk.new(rz.outputs[0], hp.inputs["Offset"])
    tilt = N.new("ShaderNodeMapRange")
    Lk.new(gin.outputs["hair_k"], tilt.inputs["Value"])
    tilt.inputs["To Min"].default_value = math.radians(-76)
    tilt.inputs["To Max"].default_value = math.radians(-22)
    jit, jito = None, None
    jit = N.new("FunctionNodeRandomValue"); jit.data_type = "FLOAT"
    for s_ in jit.inputs:
        if s_.type == "VALUE" and s_.name == "Min":
            s_.default_value = -0.2
        if s_.type == "VALUE" and s_.name == "Max":
            s_.default_value = 0.2
    jito = [x for x in jit.outputs if x.type == "VALUE"][0]
    tx = N.new("ShaderNodeMath"); tx.operation = "ADD"
    Lk.new(tilt.outputs["Result"], tx.inputs[0]); Lk.new(jito, tx.inputs[1])
    jz = N.new("FunctionNodeRandomValue"); jz.data_type = "FLOAT"
    for s_ in jz.inputs:
        if s_.type == "VALUE" and s_.name == "Max":
            s_.default_value = 0.6
        if s_.type == "VALUE" and s_.name == "Min":
            s_.default_value = -0.6
    jz.inputs["Seed"].default_value = 5
    rot = N.new("ShaderNodeCombineXYZ")
    Lk.new(tx.outputs[0], rot.inputs["X"])
    Lk.new([x for x in jz.outputs if x.type == "VALUE"][0], rot.inputs["Z"])
    hair = N.new("GeometryNodeMeshCone")
    hair.inputs["Vertices"].default_value = 6
    hair.inputs["Radius Top"].default_value = 0.000008
    hair.inputs["Radius Bottom"].default_value = 0.000045
    hair.inputs["Depth"].default_value = 0.007
    hair.fill_type = "NONE"
    tr = N.new("GeometryNodeTransform")
    Lk.new(hair.outputs["Mesh"], tr.inputs["Geometry"])
    tr.inputs["Translation"].default_value = (0, 0, 0.0035)  # root at the follicle
    lenr = N.new("FunctionNodeRandomValue"); lenr.data_type = "FLOAT"
    for s_ in lenr.inputs:
        if s_.type == "VALUE" and s_.name == "Min":
            s_.default_value = 0.6
        if s_.type == "VALUE" and s_.name == "Max":
            s_.default_value = 1.3
    lenr.inputs["Seed"].default_value = 9
    inst = N.new("GeometryNodeInstanceOnPoints")
    Lk.new(hp.outputs["Geometry"], inst.inputs["Points"])
    Lk.new(tr.outputs["Geometry"], inst.inputs["Instance"])
    Lk.new(rot.outputs[0], inst.inputs["Rotation"])
    Lk.new([x for x in lenr.outputs if x.type == "VALUE"][0], inst.inputs["Scale"])
    hm = bpy.data.materials.new("D.hair")
    hm.use_nodes = True
    hb_ = hm.node_tree.nodes["Principled BSDF"]
    hb_.inputs["Base Color"].default_value = (0.09, 0.05, 0.03, 1)
    hb_.inputs["Roughness"].default_value = 0.35
    seth = N.new("GeometryNodeSetMaterial")
    seth.inputs["Material"].default_value = hm
    real = N.new("GeometryNodeRealizeInstances")
    Lk.new(inst.outputs["Instances"], real.inputs["Geometry"])
    Lk.new(real.outputs["Geometry"], seth.inputs["Geometry"])
    sk = bpy.data.materials.new("D.skinmat")
    sk.use_nodes = True
    nt = sk.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.46, 0.25, 0.16, 1)  # linear: light-tan forearm skin
    b.inputs["Roughness"].default_value = 0.45
    b.inputs["Subsurface Weight"].default_value = 0.7
    b.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
    b.inputs["Subsurface Scale"].default_value = 0.002
    b.inputs["Coat Weight"].default_value = 0.2
    b.inputs["Coat Roughness"].default_value = 0.3
    pore = node(nt, "ShaderNodeTexVoronoi", Scale=900.0)
    cell = node(nt, "ShaderNodeTexVoronoi", Scale=180.0, feature="DISTANCE_TO_EDGE")
    p1 = node(nt, "ShaderNodeBump", Strength=0.25, Distance=0.00015, invert=True)
    nt.links.new(pore.outputs["Distance"], p1.inputs["Height"])
    p2 = node(nt, "ShaderNodeBump", Strength=0.35, Distance=0.0001)
    nt.links.new(cell.outputs["Distance"], p2.inputs["Height"])
    nt.links.new(p1.outputs["Normal"], p2.inputs["Normal"])
    nt.links.new(p2.outputs["Normal"], b.inputs["Normal"])
    sets = N.new("GeometryNodeSetMaterial")
    sets.inputs["Material"].default_value = sk
    Lk.new(setp.outputs["Geometry"], sets.inputs["Geometry"])
    shade = N.new("GeometryNodeSetShadeSmooth")
    Lk.new(sets.outputs["Geometry"], shade.inputs["Geometry"])
    j = N.new("GeometryNodeJoinGeometry")
    Lk.new(shade.outputs["Geometry"], j.inputs[0])
    Lk.new(seth.outputs["Geometry"], j.inputs[0])
    Lk.new(j.outputs[0], gout.inputs["Geometry"])
    o.data.materials.append(sk)
    o.data.materials.append(hm)
    return o


skin_patch()

bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/s02_set.blend"))
print("STATIONS BUILT")
