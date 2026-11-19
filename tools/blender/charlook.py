"""Upgrades for the realistic Dash & Newt (run after realcast.py has built them; used by charsheet.py and episode
builds). Replaces MakeHuman's card hair with real strand hair (Blender hair curves + the bundled procedural hair node
groups), warms the skin and wets the eyes.

    exec(open(".../tools/blender/charlook.py").read()); upgrade_characters()
"""
import math
import random

import bpy
from mathutils import Matrix, Vector

HAIR_ASSETS = "/Applications/Blender.app/Contents/Resources/5.2/datafiles/assets/nodes/procedural_hair_node_assets.blend"
HAIR_GROUPS = ["Duplicate Hair Curves", "Clump Hair Curves", "Hair Curves Noise", "Frizz Hair Curves", "Set Hair Curve Profile"]


def _hair_groups():
    missing = [g for g in HAIR_GROUPS if g not in bpy.data.node_groups]
    if missing:
        with bpy.data.libraries.load(HAIR_ASSETS, link=False) as (src, dst):
            dst.node_groups = [g for g in src.node_groups if g in missing]
    return {g: bpy.data.node_groups[g] for g in HAIR_GROUPS}


def _set_inputs(mod, **values):
    """set a geometry-nodes modifier's inputs by interface name. The modifier gets its own copy of the group and the
    values go in as that copy's defaults (works whether or not modifier inputs are ID properties)."""
    mod.node_group = mod.node_group.copy()
    items = {i.name: i for i in mod.node_group.interface.items_tree if getattr(i, "in_out", "") == "INPUT"}
    for k, v in values.items():
        if k in items:
            items[k].default_value = v
        else:
            print("hair: no input", k, "on", mod.node_group.name, "have", list(items))


def _rest(rig):
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    bpy.context.view_layer.update()


class HeadFrame:
    """the head's verts in world space (rig at rest) with a frame: right, forward, up; normalised coordinates"""

    def __init__(self, rig, body):
        g = body.vertex_groups["head"]
        mw = body.matrix_world
        # MPFB keeps the character's shape (age, height, proportions) in shape keys: mix them onto the basis
        co = [v.co.copy() for v in body.data.vertices]
        sk = body.data.shape_keys
        if sk:
            basis = sk.reference_key
            for kb in sk.key_blocks:
                if kb == basis or kb.mute or kb.value == 0.0:
                    continue
                rel = kb.relative_key
                for i, d in enumerate(kb.data):
                    co[i] += (d.co - rel.data[i].co) * kb.value
        idx = []
        for v in body.data.vertices:
            w = [x.weight for x in v.groups if x.group == g.index]
            if w and w[0] > 0.5:
                idx.append(v.index)
        ws = [mw @ co[i] for i in idx]
        c0 = sum(ws, Vector()) / len(ws)
        self.pts = [(p, (p - c0).normalized()) for p in ws]  # radial normals are good enough on a scalp
        self.fwd = (rig.matrix_world.to_3x3() @ Vector((0, -1, 0))).normalized()
        self.fwd.z = 0
        self.fwd.normalize()
        self.up = Vector((0, 0, 1))
        self.right = self.fwd.cross(self.up).normalized()
        ps = [p for p, _ in self.pts]
        self.hmin, self.hmax = min(p.z for p in ps), max(p.z for p in ps)
        top = [p for p in ps if p.z > self.hmin + 0.6 * (self.hmax - self.hmin)]
        self.c = sum(top, Vector()) / len(top)
        self.c.z = self.hmin + 0.62 * (self.hmax - self.hmin)  # skull centre, about eyebrow-to-crown middle
        fs = [(p - self.c).dot(self.fwd) for p in ps]
        self.fmin, self.fmax = min(fs), max(fs)

    def norm(self, p):
        d = p - self.c
        return (d.dot(self.right), d.dot(self.fwd), (p.z - self.hmin) / (self.hmax - self.hmin))

    def radius_at(self, direction):
        """distance from the skull centre to the scalp along a direction (max over nearby verts)"""
        best = 0.0
        for p, _ in self.pts:
            d = p - self.c
            if d.length > 1e-6 and d.normalized().dot(direction) > 0.985:
                best = max(best, d.length)
        return best or 0.09


def _scalp_roots(hf, n, rnd, front_hairline=0.80, side_low=0.58, nape_low=0.40):
    roots = []
    for p, nrm in hf.pts:
        x, f, h = hf.norm(p)
        fn = (f - hf.fmin) / (hf.fmax - hf.fmin)  # 0 back … 1 face
        if fn > 0.72 and h < front_hairline:
            continue  # face and forehead
        low = nape_low if fn < 0.3 else side_low
        if h < low:
            continue
        if abs(x) > 0.062 and h < 0.66 and fn > 0.45:
            continue  # in front of the ears
        roots.append((p, nrm, h, fn))
    out = []
    for i in range(n):
        p, nrm, h, fn = roots[rnd.randrange(len(roots))]
        t1 = nrm.orthogonal().normalized()
        t2 = nrm.cross(t1)
        out.append((p + t1 * rnd.uniform(-0.005, 0.005) + t2 * rnd.uniform(-0.005, 0.005), nrm, h, fn))
    return out


def _strand_spiky(hf, p, nrm, h, fn, rnd, K=7):
    """Dash: short-sided, longer on top, swept up and forward into spikes"""
    top = max(0.0, (h - 0.7) / 0.3)
    L = (0.010 + 0.034 * top ** 1.2) * rnd.uniform(0.85, 1.15)
    d = (nrm * 0.75 + hf.up * (0.25 + 0.6 * top) + hf.fwd * (0.15 + 0.35 * top * fn)).normalized()
    if top < 0.2:  # sides/back: lie close to the head, pointing back-down a little
        d = (nrm * 0.35 + (-hf.fwd) * 0.3 + hf.up * 0.25).normalized()
    pts = []
    pos = p + nrm * 0.0015
    for k in range(K):
        pts.append(pos.copy())
        bend = hf.fwd * 0.12 * (k / K) * top
        pos = pos + (d + bend).normalized() * (L / (K - 1))
    return pts


def _strand_mop(hf, p, nrm, h, fn, rnd, K=9):
    """Newt: a soft mop from the crown, lying on the head, fringe falling over the forehead"""
    crown = hf.c - hf.fwd * 0.045 + hf.up * 0.06
    pts = []
    pos = p + nrm * 0.0015
    L = rnd.uniform(0.035, 0.055)
    step = L / (K - 1)
    for k in range(K):
        pts.append(pos.copy())
        d0 = pos - crown
        n = (pos - hf.c).normalized()
        tang = d0 - n * d0.dot(n)
        if tang.length < 1e-5:
            tang = hf.fwd.copy()
        tang.normalize()
        g = -hf.up * (0.35 + 0.5 * k / K)
        d = (tang + g * (0.6 if fn > 0.6 else 0.9)).normalized()
        pos = pos + d * step
        # stay on a shell just outside the scalp while above the hairline; below it, fall free
        r = (pos - hf.c).length
        r0 = hf.radius_at((pos - hf.c).normalized()) + 0.004 + 0.0025 * k / K
        if (pos.z - hf.hmin) / (hf.hmax - hf.hmin) > 0.62 and r < r0:
            pos = hf.c + (pos - hf.c).normalized() * r0
        if fn > 0.6 and (pos.z - hf.hmin) / (hf.hmax - hf.hmin) < 0.8:
            pts.append(pos.copy())
            break  # the fringe stops above the eyebrows
    return pts


def _hair_material(name, melanin, redness, rough=0.32):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    h = nt.nodes.new("ShaderNodeBsdfHairPrincipled")
    try:
        h.parametrization = "MELANIN"
    except Exception:
        pass
    for k, v in (("Melanin", melanin), ("Melanin Redness", redness), ("Roughness", rough), ("Radial Roughness", 0.35), ("Coat", 0.0), ("Random Roughness", 0.2), ("Random Color", 0.15)):
        if k in h.inputs:
            h.inputs[k].default_value = v
    nt.links.new(h.outputs[0], out.inputs["Surface"])
    return m


def strand_hair(rig, body, style, n_guides, melanin, redness, seed=7):
    _rest(rig)
    hf = HeadFrame(rig, body)
    rnd = random.Random(seed)
    roots = _scalp_roots(hf, n_guides, rnd)
    shape = _strand_spiky if style == "spiky" else _strand_mop
    strands = [shape(hf, p, nrm, h, fn, rnd) for p, nrm, h, fn in roots]
    strands = [s for s in strands if len(s) >= 2]
    name = f"{body.name}.strands"
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    cv = bpy.data.hair_curves.new(name)
    cv.add_curves([len(s) for s in strands])
    flat = [c for s in strands for p in s for c in p]
    cv.position_data.foreach_set("vector", flat)
    ob = bpy.data.objects.new(name, cv)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(_hair_material(f"{name}.mat", melanin, redness))
    G = _hair_groups()
    m = ob.modifiers.new("duplicate", "NODES"); m.node_group = G["Duplicate Hair Curves"]
    _set_inputs(m, **{"Amount": 10, "Viewport Amount": 0.1, "Radius": 0.003 if style == "spiky" else 0.004, "Seed": seed})
    m = ob.modifiers.new("clump", "NODES"); m.node_group = G["Clump Hair Curves"]
    _set_inputs(m, **{"Factor": 0.75 if style == "spiky" else 0.35, "Shape": 0.5, "Distance Threshold": 0.006 if style == "spiky" else 0.004, "Seed": seed})
    m = ob.modifiers.new("noise", "NODES"); m.node_group = G["Hair Curves Noise"]
    _set_inputs(m, **{"Factor": 0.25, "Scale": 300.0, "Distance": 0.0015, "Seed": seed})
    m = ob.modifiers.new("frizz", "NODES"); m.node_group = G["Frizz Hair Curves"]
    _set_inputs(m, **{"Factor": 0.15, "Distance": 0.001, "Seed": seed})
    m = ob.modifiers.new("profile", "NODES"); m.node_group = G["Set Hair Curve Profile"]
    _set_inputs(m, **{"Replace Radius": True, "Radius": 0.000045, "Shape": 0.4})
    # ride on the head bone, keeping the world placement
    W = ob.matrix_world.copy()
    ob.parent = rig
    ob.parent_type = "BONE"
    ob.parent_bone = "head"
    bpy.context.view_layer.update()
    ob.matrix_world = W
    print("HAIR", name, len(strands), "guides")
    return ob


def warm_skin(body, tint, strength):
    """MPFB skin group: mix a little warm colour in, more SSS, softer sheen"""
    for slot in body.material_slots:
        m = slot.material
        if not m or not m.node_tree:
            continue
        for g in [n for n in m.node_tree.nodes if n.bl_idname == "ShaderNodeGroup"]:
            for k, v in (("colorMixIn", tint), ("colorMixInStrength", strength), ("SSS strength", 0.4), ("Roughness", 0.43), ("Pore strength", 0.3)):
                if k in g.inputs and not g.inputs[k].is_linked:
                    g.inputs[k].default_value = v


def wet_eyes(prefix):
    for o in bpy.data.objects:
        if o.name.startswith(prefix) and ("eye" in o.name.lower() and "brow" not in o.name.lower() and "lash" not in o.name.lower()):
            for slot in o.material_slots:
                m = slot.material
                if m and m.node_tree:
                    for n in m.node_tree.nodes:
                        if n.type == "BSDF_PRINCIPLED":
                            n.inputs["Roughness"].default_value = 0.04
                            if "Coat Weight" in n.inputs:
                                n.inputs["Coat Weight"].default_value = 1.0
                                n.inputs["Coat Roughness"].default_value = 0.0


def upgrade_characters():
    for pre, style, guides, mel, red, tint, strength in (
        ("DashReal", "spiky", 6000, 0.78, 0.35, (0.80, 0.50, 0.36, 1), 0.28),
        ("NewtReal", "mop", 6000, 0.66, 0.5, (0.92, 0.56, 0.45, 1), 0.3),
    ):
        rig = [o for o in bpy.data.objects if o.type == "ARMATURE" and o.name.startswith(pre)][0]
        body = bpy.data.objects[pre]
        for o in bpy.data.objects:  # MakeHuman's card / helmet hair off
            if o.name.startswith(pre) and o.parent == rig and ("hair" in o.name.lower() or o.name.endswith("short02")):
                o.hide_render = True
                o.hide_viewport = True
        strand_hair(rig, body, style, guides, mel, red)
        warm_skin(body, tint, strength)
        wet_eyes(pre)
