"""Short s03, station E (x = 40): the man at his desk. Runs on blender/s03_set.blend after s03_set.py + s03_chip.py.

  blender -b blender/s03_set.blend --python tools/blender/s03_person.py

- the man: Renderpeople "Eric rigged 001" (8K scan textures, 88-bone rig incl. fingers and face), smoothed with
  subdivision; skin shaded as skin (subsurface scattering only where the texture is skin: a mask generated from the
  colour map), cloth as cloth (sheen on the shirt, no SSS), roughness from the scan's gloss map, its normal map
- desk: Poly Haven "metal_office_desk" (CC0); chair: "Office Chair" by thethieme (Sketchfab, CC-BY 4.0)
- the laptop: object copies of station A's laptop (same meshes and materials), standing on the desk
- the pose: seated, hands on the keyboard (IK to targets on the keys), feet planted (IK to targets on the floor);
  s03_shots.py animates the targets (touching the hot side, pulling back). Contacts are exact because the hands and
  feet are driven by targets placed ON the surfaces.
"""
import math
import os

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector as V

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
A = os.path.join(ROOT, "blender/assets")
RP = os.path.join(A, "renderpeople_free/rp_eric_rigged_001_FBX")
sc = bpy.context.scene
E0 = V((40.0, 0.0, 0.0))


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


def bbox(objs):
    pts = [o.matrix_world @ V(c) for o in objs if o.type == "MESH" for c in o.bound_box]
    return V([min(p[i] for p in pts) for i in range(3)]), V([max(p[i] for p in pts) for i in range(3)])


def move_to(objs, coll_):
    for o in objs:
        for c in list(o.users_collection):
            c.objects.unlink(o)
        coll_.objects.link(o)


# clean a previous run
old = bpy.data.collections.get("E.Person")
if old:
    for o in list(old.objects):
        bpy.data.objects.remove(o, do_unlink=True)
CE = coll("E.Person")

# ── floor: same studio void, soft contact shadows only ──
fl = bpy.data.objects.new("E.floor", bpy.data.meshes.new("E.floor"))
bm = bmesh.new()
bmesh.ops.create_circle(bm, cap_ends=True, segments=96, radius=3.0)
bm.to_mesh(fl.data)
bm.free()
CE.objects.link(fl)
fl.location = E0
fl.is_shadow_catcher = True

# ── desk (CC0) ──
src = os.path.join(A, "polyhaven/metal_office_desk")
blend = [f for f in os.listdir(src) if f.endswith(".blend")][0]
with bpy.data.libraries.load(os.path.join(src, blend)) as (s_, d_):
    d_.objects = s_.objects
desk = [o for o in d_.objects if o]
for o in desk:
    CE.objects.link(o)
bpy.context.view_layer.update()
lo, hi = bbox(desk)
off = E0 + V((0.25, 0.25, 0)) - V(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
for o in desk:
    if o.parent is None:
        o.location += off
bpy.context.view_layer.update()
dlo, dhi = bbox(desk)
DESK_TOP = dhi.z
DESK_FRONT = dlo.y
print("DESK top", round(DESK_TOP, 3), "front y", round(DESK_FRONT, 3), "x", round(dlo.x, 3), round(dhi.x, 3))

# ── chair (CC-BY) ──
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(A, "sketchfab/b8d24c146a6844788c0ba6f7b135e99e/model.glb"))
chair = [o for o in bpy.data.objects if o not in before]
move_to(chair, CE)
bpy.context.view_layer.update()
lo, hi = bbox(chair)
CHAIR_C = V((E0.x, DESK_FRONT - 0.36, 0))  # pulled in to the desk, the way people sit to type
# the chair comes as several root parts: parent them all to one pivot at the chair's centre and turn THAT (turning
# each part about its own origin scattered the backrest into the man's chest)
piv = bpy.data.objects.new("E.chair", None)
CE.objects.link(piv)
piv.location = V(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
bpy.context.view_layer.update()
for o in chair:
    if o.parent is None:
        mw = o.matrix_world.copy()
        o.parent = piv
        o.matrix_world = mw
piv.location = CHAIR_C
piv.rotation_euler.z = math.pi  # the model's front faces −Y; the seat now faces the desk
chair.append(piv)
bpy.context.view_layer.update()
# the seat surface: highest point of the chair within its seat footprint (between 0.35 and 0.6 m)
dg = bpy.context.evaluated_depsgraph_get()
hit = sc.ray_cast(dg, CHAIR_C + V((0, 0.02, 0.62)), V((0, 0, -1)))
SEAT_Z = hit[1].z if hit[0] else 0.48
print("SEAT z", round(SEAT_Z, 3), "hit", hit[4].name if hit[0] else None)

# ── the laptop on the desk: object copies of station A (shared meshes/materials) ──
LAP = E0 + V((0.0, DESK_FRONT + 0.2 - E0.y, DESK_TOP))  # front edge ~7 cm from the desk edge
lap_objs = [o for o in bpy.data.collections["A.Laptop"].objects if o.get("station") == "A" and o.name != "A.floor"]
cmap = {}
for o in lap_objs:
    c = o.copy()
    cmap[o] = c
    CE.objects.link(c)
for o, c in cmap.items():
    if o.parent in cmap:
        c.parent = cmap[o.parent]
    elif o.parent is None:
        c.matrix_world = Matrix.Translation(LAP) @ o.matrix_world
    c.name = "E.lap." + o.name[2:]

# ── the man ──
before = set(bpy.data.objects)
bpy.ops.import_scene.fbx(filepath=os.path.join(RP, "rp_eric_rigged_001_zup_a.fbx"))
man = [o for o in bpy.data.objects if o not in before]
move_to(man, CE)
arm = [o for o in man if o.type == "ARMATURE"][0]
body = [o for o in man if o.type == "MESH"][0]
arm.name, body.name = "E.rig", "E.body"
body.data.materials[0].name = "E.eric"


def skin_mask():
    """skin = where the colour map is skin-toned (r > g > b, warm, not too dark/bright); blurred a little.
    Saved next to the textures; SSS weight comes from it, so cloth never gets a waxy skin look."""
    p = os.path.join(A, "s03/eric_skin_mask.png")
    if os.path.isfile(p):
        return p
    im = bpy.data.images.load(os.path.join(A, "s03/eric_dif_2k.png"))
    w_, h_ = im.size
    px = np.array(im.pixels[:], np.float32).reshape(h_, w_, 4)[..., :3]
    r, g, b = px[..., 0], px[..., 1], px[..., 2]
    mx, mn = px.max(-1), px.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1e-4)
    m = (r > g) & (g > b * 0.95) & (r - b > 0.08) & (sat > 0.18) & (sat < 0.75) & (mx > 0.18) & (mx < 0.97)
    m = m.astype(np.float32)
    for _ in range(2):  # soften the edges (3×3 box)
        m = (m + np.roll(m, 1, 0) + np.roll(m, -1, 0) + np.roll(m, 1, 1) + np.roll(m, -1, 1)) / 5
    out = bpy.data.images.new("eric_skin_mask", w_, h_)
    out.pixels = np.dstack([m, m, m, np.ones_like(m)]).ravel()
    out.filepath_raw, out.file_format = p, "PNG"
    out.save()
    bpy.data.images.remove(im)
    print("skin mask: skin fraction", round(float(m.mean()), 3))
    return p


def tex(nt, path, colour=True):
    n = nt.nodes.new("ShaderNodeTexImage")
    n.image = bpy.data.images.load(path, check_existing=True)
    if not colour:
        n.image.colorspace_settings.name = "Non-Color"
    n.interpolation = "Cubic"
    return n


m = body.data.materials[0]
nt = m.node_tree
nt.nodes.clear()
out = node(nt, "ShaderNodeOutputMaterial")
b = node(nt, "ShaderNodeBsdfPrincipled")
nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
dif = tex(nt, os.path.join(RP, "tex/rp_eric_rigged_001_dif.jpg"))
glo = tex(nt, os.path.join(RP, "tex/rp_eric_rigged_001_gloss.jpg"), False)
nor = tex(nt, os.path.join(RP, "tex/rp_eric_rigged_001_norm.jpg"), False)
shirt = tex(nt, os.path.join(RP, "tex/rp_eric_rigged_001_mask01.jpg"), False)
skin = tex(nt, skin_mask(), False)
nt.links.new(dif.outputs["Color"], b.inputs["Base Color"])
# roughness: the scan's gloss, inverted and compressed into a believable range (skin 0.42–0.6, cloth 0.6–0.85)
inv = node(nt, "ShaderNodeMapRange")
nt.links.new(glo.outputs["Color"], inv.inputs["Value"])
inv.inputs["To Min"].default_value, inv.inputs["To Max"].default_value = 0.85, 0.42
# the eyes are the glossiest parts of the scan (gloss ≈ 1): give them a wet tear film — a clear coat, nearly
# mirror-smooth, so they catch a bright catchlight like real eyes
wet = node(nt, "ShaderNodeMapRange")
nt.links.new(glo.outputs["Color"], wet.inputs["Value"])
wet.inputs["From Min"].default_value, wet.inputs["From Max"].default_value = 0.86, 0.95
wmix = node(nt, "ShaderNodeMix", data_type="FLOAT")
nt.links.new(wet.outputs["Result"], wmix.inputs["Factor"])
nt.links.new(inv.outputs["Result"], wmix.inputs[2])
wmix.inputs[3].default_value = 0.06
nt.links.new(wmix.outputs[0], b.inputs["Roughness"])
nt.links.new(wet.outputs["Result"], b.inputs["Coat Weight"])
b.inputs["Coat Roughness"].default_value = 0.015
b.inputs["Coat IOR"].default_value = 1.376  # the cornea
nm = node(nt, "ShaderNodeNormalMap", Strength=1.0)
nt.links.new(nor.outputs["Color"], nm.inputs["Color"])
# skin micro-detail on top of the scan normals: fine pores, only on skin
pore = node(nt, "ShaderNodeTexVoronoi", Scale=2600.0, feature="F1")
tco = node(nt, "ShaderNodeTexCoord")
nt.links.new(tco.outputs["Object"], pore.inputs["Vector"])
pm = node(nt, "ShaderNodeMath", operation="MULTIPLY")
nt.links.new(pore.outputs["Distance"], pm.inputs[0])
nt.links.new(skin.outputs["Color"], pm.inputs[1])
bp = node(nt, "ShaderNodeBump", Strength=0.08, Distance=0.0002)
nt.links.new(pm.outputs[0], bp.inputs["Height"])
nt.links.new(nm.outputs["Normal"], bp.inputs["Normal"])
nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
# subsurface: skin only
nt.links.new(skin.outputs["Color"], b.inputs["Subsurface Weight"])
b.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
b.inputs["Subsurface Scale"].default_value = 0.004  # 4 mm mean free path scale: real skin
if "Subsurface Method" in b.inputs:
    pass
b.subsurface_method = "RANDOM_WALK_SKIN" if hasattr(b, "subsurface_method") else None
# mask01 marks the wool waistcoat/trouser fabric: a soft sheen there, tinted by the cloth's own colour (a white
# sheen turned the black waistcoat grey); none on skin
shm = node(nt, "ShaderNodeMath", operation="MULTIPLY")
nt.links.new(shirt.outputs["Color"], shm.inputs[0])
shm.inputs[1].default_value = 0.35
nt.links.new(shm.outputs[0], b.inputs["Sheen Weight"])
nt.links.new(dif.outputs["Color"], b.inputs["Sheen Tint"])
b.inputs["Sheen Roughness"].default_value = 0.5
b.inputs["Specular IOR Level"].default_value = 0.45
# smoothing: the scan is a light mesh; subdivide after the armature so joints bend smoothly
body.modifiers.new("subd", "SUBSURF").levels = 1
body.modifiers["subd"].render_levels = 2
for p in body.data.polygons:
    p.use_smooth = True

# ── forearm skinning rebuilt for a smooth twist ──
# Real forearms twist gradually from elbow to wrist (the radius turns around the ulna). The scan's weights split the
# forearm unevenly between the forearm, twist and hand bones, so turning the palm down tore the cuff into a bell.
# Every forearm vertex (between elbow and wrist) now blends lowerarm → twist linearly with its distance along the
# forearm; only vertices past the wrist follow the hand. Weights of other bones (e.g. the upper arm at the elbow)
# are kept; the three forearm/hand weights are redistributed within their original total.
for s_ in "lr":
    g_lo, g_tw, g_ha = (body.vertex_groups[n_] for n_ in (f"lowerarm_{s_}", f"lowerarm_twist_{s_}", f"hand_{s_}"))
    ids = {g_lo.index, g_tw.index, g_ha.index}
    el = arm.data.bones[f"lowerarm_{s_}"].head_local
    wr = arm.data.bones[f"hand_{s_}"].head_local
    ax = wr - el
    L2 = ax.length_squared
    Minv = arm.matrix_world.inverted() @ body.matrix_world
    n_moved = 0
    for v in body.data.vertices:
        tot = sum(g.weight for g in v.groups if g.group in ids)
        if tot <= 0:
            continue
        t_ = (Minv @ v.co - el).dot(ax) / L2  # 0 at the elbow … 1 at the wrist
        if t_ >= 1.04:  # the hand itself
            continue
        t_ = min(max(t_, 0.0), 1.0)
        for g_ in (g_lo, g_tw, g_ha):
            g_.remove([v.index])
        g_lo.add([v.index], tot * (1 - t_), "REPLACE")
        g_tw.add([v.index], tot * t_, "REPLACE")
        n_moved += 1
    print("FOREARM", s_, "re-weighted vertices:", n_moved)

# ── tailoring: a buttoned cuff fits the wrist ──
# The scan's cuff is a loose tube ~2–3 cm wider than the wrist; twisted palm-down it flares open. Shirt-fabric
# vertices near the wrist are pulled toward the forearm axis so the cuff sits 3 mm over the skin, easing back to
# the original sleeve width further up the forearm.
_dimg = bpy.data.images.load(os.path.join(A, "s03/eric_dif_2k.png"), check_existing=True)
_iw, _ih = _dimg.size
_px = np.array(_dimg.pixels[:], np.float32).reshape(_ih, _iw, 4)[..., :3]
uvl_ = body.data.uv_layers.active.data
vcol = np.zeros((len(body.data.vertices), 3), np.float32)
for poly in body.data.polygons:
    for li, vi in zip(poly.loop_indices, poly.vertices):
        u, v = uvl_[li].uv
        vcol[vi] = _px[min(_ih - 1, max(0, int(v * _ih))), min(_iw - 1, max(0, int(u * _iw)))]
is_shirt = (vcol.min(1) > 0.62) & ((vcol.max(1) - vcol.min(1)) < 0.12)
is_skin = (vcol[:, 0] > vcol[:, 2] + 0.08) & (vcol.max(1) > 0.25) & ~is_shirt
M_ = arm.matrix_world.inverted() @ body.matrix_world  # mesh → armature space (cm)
Mi_ = M_.inverted()
for s_ in "lr":
    el = arm.data.bones[f"lowerarm_{s_}"].head_local
    wr = arm.data.bones[f"hand_{s_}"].head_local
    ax = (wr - el)
    Lf = ax.length
    axn = ax.normalized()
    pts = {}
    for v in body.data.vertices:
        p = M_ @ v.co
        t_ = (p - el).dot(axn) / Lf
        if 0.55 < t_ < 1.08:
            radial = (p - el) - axn * (p - el).dot(axn)
            if radial.length < 6.0:  # within 6 cm of the forearm axis: this arm, not the torso
                pts[v.index] = (t_, radial)
    skin_r = [r.length for i, (t_, r) in pts.items() if is_skin[i] and t_ > 0.85]
    wrist_r = (np.percentile(skin_r, 90) if skin_r else 3.0) + 0.3  # cuff sits 3 mm over the wrist skin
    n_t = 0
    for i, (t_, radial) in pts.items():
        if not is_shirt[i]:
            continue
        r = radial.length
        k = min(1.0, max(0.0, (t_ - 0.6) / 0.3))  # 0 up the forearm … 1 at the cuff
        target = r + (min(r, wrist_r) - r) * k
        if target < r:
            p = M_ @ body.data.vertices[i].co
            body.data.vertices[i].co = Mi_ @ (p - radial + radial.normalized() * target)
            n_t += 1
    print("CUFF", s_, "wrist radius", round(wrist_r, 2), "cm; tailored vertices", n_t)

# ── seat him ──
# place the rig so the hips sit on the seat, facing the desk (+Y)
arm.location = V((CHAIR_C.x, CHAIR_C.y + 0.04, 0))
arm.rotation_euler.z = math.pi  # the rig faces −Y; turn him to face the desk (+Y). His left side is now −X
bpy.context.view_layer.update()
pb = arm.pose.bones
hip_w = arm.matrix_world @ pb["hip"].head
print("HIP world z (standing)", round(hip_w.z, 3))
for o in man:
    o["station"] = "E"
for o in CE.objects:
    o["station"] = "E"
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/s03_set.blend"))
print("S03 PERSON BUILT")


# ════════════════ POSE: seated at the desk, typing ════════════════
# all targets are empties in station E (s03_shots.py animates them); IK keeps hands and feet exactly on them
def empty(name, loc, size=0.03):
    e = bpy.data.objects.get(name) or bpy.data.objects.new(name, None)
    if e.name not in CE.objects:
        CE.objects.link(e)
    e.empty_display_size = size
    e.location = loc
    e["station"] = "E"
    return e


AW = arm.matrix_world
AWI = AW.inverted()
rest = {bn.name: (AW @ bn.head_local, AW @ bn.tail_local) for bn in arm.data.bones}


def world_head(n):
    return arm.matrix_world @ pb[n].head


def set_world_rot(n, axis, deg):
    """rotate pose bone n about a WORLD axis through its head (keeps children attached)"""
    bone = pb[n]
    M = bone.matrix.copy()  # armature space
    ax = (AWI.to_3x3() @ V(axis)).normalized()
    R = Matrix.Translation(M.translation) @ Matrix.Rotation(math.radians(deg), 4, ax) @ Matrix.Translation(-M.translation)
    bone.matrix = R @ M
    bpy.context.view_layer.update()


# Posing is FK by exact aim: every bone is turned so it points along a chosen WORLD direction (parents first), and
# arms/legs use an analytic two-bone solve so wrists and ankles land exactly on their targets. Deterministic,
# measurable, no IK-solver flips.
CHILD = {"upperleg_l": "lowerleg_l", "upperleg_r": "lowerleg_r", "lowerleg_l": "foot_l", "lowerleg_r": "foot_r",
         "upperarm_l": "lowerarm_l", "upperarm_r": "lowerarm_r", "lowerarm_l": "hand_l", "lowerarm_r": "hand_r",
         "spine_01": "spine_02", "spine_02": "spine_03", "spine_03": "neck", "neck": "head", "head": "head_end", "hand_l": "middle_01_l",
         "hand_r": "middle_01_r", "foot_l": "ball_l", "foot_r": "ball_r"}
for s_ in "lr":
    for f_ in ("index", "middle", "ring", "pinky", "thumb"):
        CHILD[f"{f_}_01_{s_}"], CHILD[f"{f_}_02_{s_}"], CHILD[f"{f_}_03_{s_}"] = f"{f_}_02_{s_}", f"{f_}_03_{s_}", f"{f_}_end_{s_}"


def aim(n, d):
    """turn pose bone n (about its head) so the segment to its child JOINT points along world direction d
    (this rig's bones are unconnected: a bone's tail is not where the next joint is)"""
    bone = pb[n]
    h = arm.matrix_world @ bone.head
    t = arm.matrix_world @ (pb[CHILD[n]].head if n in CHILD else bone.tail)
    q = (t - h).normalized().rotation_difference(V(d).normalized())
    M = bone.matrix.copy()
    W = AW @ M
    R = Matrix.Translation(h) @ q.to_matrix().to_4x4() @ Matrix.Translation(-h)
    bone.matrix = AWI @ R @ W
    bpy.context.view_layer.update()


def roll_to(n, across_from, across_to, want):
    """spin bone n about its own axis so the vector (across_to head − across_from head) lines up with `want`
    (projected perpendicular to the bone) — sets which way a hand's palm faces"""
    bone = pb[n]
    h = arm.matrix_world @ bone.head
    t = arm.matrix_world @ (pb[CHILD[n]].head if n in CHILD else bone.tail)  # spin about the joint-to-joint line
    ax = (t - h).normalized()
    cur = (arm.matrix_world @ pb[across_to].head) - (arm.matrix_world @ pb[across_from].head)
    cur = (cur - ax * cur.dot(ax)).normalized()
    w = V(want)
    w = (w - ax * w.dot(ax)).normalized()
    ang = math.atan2(ax.dot(cur.cross(w)), cur.dot(w))
    R = Matrix.Translation(h) @ Matrix.Rotation(ang, 4, ax) @ Matrix.Translation(-h)
    bone.matrix = AWI @ R @ AW @ bone.matrix
    bpy.context.view_layer.update()


def spin_about(n, root, axis, ang):
    """rotate pose bone n by ang about the world line through root along axis"""
    bone = pb[n]
    Rm = Matrix.Translation(root) @ Matrix.Rotation(ang, 4, axis) @ Matrix.Translation(-root)
    bone.matrix = AWI @ Rm @ AW @ bone.matrix
    bpy.context.view_layer.update()


def pronate(s, want):
    """palm-down through the forearm the way anatomy does it: the twist grows from elbow to wrist — 30 % on the
    forearm bone, 65 % reached at the twist bone, 100 % at the hand — so the skin and the cuff twist smoothly
    instead of wringing at one joint"""
    el = arm.matrix_world @ pb[f"lowerarm_{s}"].head
    wr = arm.matrix_world @ pb[f"hand_{s}"].head
    ax = (wr - el).normalized()
    cur = (arm.matrix_world @ pb[f"index_01_{s}"].head) - (arm.matrix_world @ pb[f"pinky_01_{s}"].head)
    cur = (cur - ax * cur.dot(ax)).normalized()
    w = V(want)
    w = (w - ax * w.dot(ax)).normalized()
    th = math.atan2(ax.dot(cur.cross(w)), cur.dot(w))
    spin_about(f"lowerarm_{s}", el, ax, 0.40 * th)  # forearm near the elbow: 40 %
    spin_about(f"lowerarm_twist_{s}", el, ax, 0.45 * th)  # twist zone: 85 %
    spin_about(f"hand_{s}", el, ax, 0.60 * th)  # hand: 100 % (only 15 % more than the cuff zone: no bunching)
    return math.degrees(th)


def blen(n):
    """segment length joint → next joint (rest pose)"""
    bn = arm.data.bones[n]
    nxt = arm.data.bones[CHILD[n]] if n in CHILD else None
    return ((AW @ (nxt.head_local if nxt else bn.tail_local)) - (AW @ bn.head_local)).length


def two_bone(upper, lower, target, pole_dir):
    """aim upper and lower so lower's TAIL lands on target; the joint bends toward pole_dir"""
    a, b_ = blen(upper), blen(lower)
    root = arm.matrix_world @ pb[upper].head
    d = target - root
    L = min(d.length, (a + b_) * 0.999)
    dn = d.normalized()
    x = (a * a - b_ * b_ + L * L) / (2 * L)
    hgt = math.sqrt(max(a * a - x * x, 0.0))
    pv = V(pole_dir) - dn * V(pole_dir).dot(dn)
    joint = root + dn * x + pv.normalized() * hgt
    aim(upper, joint - root)
    aim(lower, target - (arm.matrix_world @ pb[lower].head))


# 1) hips onto the seat (pelvis joint ≈ 9 cm above the cushion), a touch back from the seat centre
hb = pb["hip"]
M = hb.matrix.copy()
M.translation = AWI @ V((CHAIR_C.x, CHAIR_C.y + 0.03, SEAT_Z + 0.09))
hb.matrix = M
bpy.context.view_layer.update()
# 2) spine: upright with a gentle forward lean toward the laptop; head bowed ~20° to the screen
for n_, d_ in (("spine_01", (0, 0.06, 1)), ("spine_02", (0, 0.12, 1)), ("spine_03", (0, 0.14, 1)), ("neck", (0, 0.28, 1)), ("head", (0, 0.22, 1))):
    aim(n_, d_)
# 3) legs: thighs along the seat, shins down to ankles planted on the floor, feet flat and forward
for s, sx in (("l", -1), ("r", 1)):
    hipj = arm.matrix_world @ pb[f"upperleg_{s}"].head
    ankle = V((hipj.x + sx * 0.05, CHAIR_C.y + 0.43, 0.085))
    two_bone(f"upperleg_{s}", f"lowerleg_{s}", ankle, (0, 1, 0.4))
    aim(f"foot_{s}", (sx * 0.12, 1, -0.55))
    aim(f"ball_{s}", (sx * 0.1, 1, 0.0))
# 4) arms and fingers: every fingertip on ITS key. Key centres measured on the laptop model (station A, metres,
# relative to the laptop origin): home row y −0.0019, key tops z 0.0143, pitch 17.5 mm; space bar x −0.086…0.000,
# y −0.0388. Touch typing: left pinky A, ring S, middle D, index F; right index J, middle K, ring L, pinky ;;
# thumbs on the space bar.
KEY_Y, KEY_Z = -0.0019, 0.0143
KEYX = {"A": -0.121, "S": -0.103, "D": -0.085, "F": -0.068, "J": -0.015, "K": 0.003, "L": 0.020, ";": 0.038}
SPACE_Y = -0.0388
HOME = {"l": {"pinky": "A", "ring": "S", "middle": "D", "index": "F"},
        "r": {"index": "J", "middle": "K", "ring": "L", "pinky": ";"}}


def key_top(x, y=KEY_Y):
    """world point where a fingertip pad touches a key: key centre, just behind the middle, on the cap"""
    return V((LAP.x + x, LAP.y + y - 0.002, LAP.z + KEY_Z + 0.0055))


def seg_lengths(f, s):
    names = [f"{f}_01_{s}", f"{f}_02_{s}", f"{f}_03_{s}", f"{f}_end_{s}"]
    pts = [AW @ arm.data.bones[n].head_local for n in names]
    return [(pts[i + 1] - pts[i]).length for i in range(3)]


def solve_finger(f, s, target, ratio=(1.0, 0.75), beta_rng=(-22, 60), phi_rng=(0, 105)):
    # β is measured from the HORIZONTAL (world), not from the hand: the hand itself slopes up ~6° to the knuckles,
    # so β −22° is only ~16° of extension at the knuckle joint (normal for a relaxed typing curl)
    """bend a 3-joint finger in the vertical plane through its knuckle and the target so the tip lands on it:
    MCP = β, PIP = φ, DIP = 0.75 φ (the joints of a real finger flex together). Returns the miss in mm."""
    l1, l2, l3 = seg_lengths(f, s)
    p0 = arm.matrix_world @ pb[f"{f}_01_{s}"].head
    d = target - p0
    dh = V((d.x, d.y, 0))
    ef = dh.normalized()
    X, Y = dh.length, -d.z
    bb_ = np.radians(np.linspace(*beta_rng, 141))[:, None]
    ff_ = np.radians(np.linspace(*phi_rng, 141))[None, :]
    t1, t2 = bb_, bb_ + ratio[0] * ff_
    t3 = t2 + ratio[1] * ff_
    tx = l1 * np.cos(t1) + l2 * np.cos(t2) + l3 * np.cos(t3)
    ty = l1 * np.sin(t1) + l2 * np.sin(t2) + l3 * np.sin(t3)
    err = np.hypot(tx - X, ty - Y)
    # among poses that land (within 0.5 mm of the best), take the most relaxed one (least total bend)
    ok = err <= err.min() + 0.0005
    relax = np.where(ok, np.abs(np.degrees(bb_)) + np.degrees(ff_) * 1.75, 1e9)
    i, j = np.unravel_index(np.argmin(relax), relax.shape)
    th = [float(t1[i, 0]), float(t2[i, j]), float(t3[i, j])]
    for k_, t_ in enumerate(th):
        aim(f"{f}_0{k_ + 1}_{s}", ef * math.cos(t_) + V((0, 0, -1)) * math.sin(t_))
    tip = arm.matrix_world @ pb[f"{f}_end_{s}"].head
    print(f"  FINGER {s}.{f}: reach {round((l1 + l2 + l3) * 1000)} mm, to target X {round(X * 1000)} Y {round(Y * 1000)} mm,"
          f" MCP {round(math.degrees(th[0]))}° PIP {round(math.degrees(th[1] - th[0]))}°, miss {round((tip - target).length * 1000, 1)} mm")
    return (tip - target).length * 1000


MISS = {}
for s, sx in (("l", -1), ("r", 1)):
    keys_x = [KEYX[k] for k in HOME[s].values()]
    kx = sum(keys_x) / 4
    # wrist ~11 cm behind the home row, hands slightly angled in (wrists a little wider than the fingertips),
    # floating 3 cm above the palm rest
    # (measured: wrist → knuckles ≈ 10 cm in this scan, and in real typing the knuckles sit ~5 cm behind and
    # ~2.5 cm above the fingertips)
    wrist = V((LAP.x + kx + sx * 0.012, LAP.y + KEY_Y - 0.152, DESK_TOP + 0.047))  # relaxed, floating over the palm rest
    two_bone(f"upperarm_{s}", f"lowerarm_{s}", wrist, (sx * 0.6, -0.6, -1))
    print("PRONATION", s, round(pronate(s, (-sx, 0, 0.36)), 1), "deg")  # thumb side ~20° up, as relaxed hands rest
    knuckles = V((LAP.x + kx, LAP.y + KEY_Y - 0.053, DESK_TOP + KEY_Z + 0.042))  # a gentle arch: fingers curve, not claw
    aim(f"hand_{s}", knuckles - (arm.matrix_world @ pb[f"hand_{s}"].head))
    roll_to(f"hand_{s}", f"pinky_01_{s}", f"index_01_{s}", (-sx, 0, 0.36))  # residual only
    # where on its 15 mm-deep key each fingertip lands (real hands: the long middle finger reaches the far half,
    # the short pinky the near half)
    FY = {"index": 0.002, "middle": 0.0055, "ring": 0.004, "pinky": -0.002}
    for f_, key in HOME[s].items():
        MISS[f"{s}.{f_}→{key}"] = round(solve_finger(f_, s, key_top(KEYX[key], KEY_Y + FY[f_])), 1)
    # thumb on the space bar, just in from its index finger
    tx_ = KEYX["F"] + 0.022 if s == "l" else KEYX["J"] - 0.022  # inward of the index finger, on the near half of the space bar
    MISS[f"{s}.thumb→space"] = round(solve_finger("thumb", s, key_top(tx_, SPACE_Y - 0.004), ratio=(0.6, 0.4), beta_rng=(-30, 70), phi_rng=(0, 70)), 1)
print("FINGERTIP MISS (mm)", MISS)
for p_ in pb:  # no solver constraints left: the pose is exact FK
    for c_ in list(p_.constraints):
        p_.constraints.remove(c_)
bpy.context.view_layer.update()
hw = arm.matrix_world @ pb["hip"].head
print("POSE hip", [round(v, 3) for v in hw], "wrist_l", [round(v, 3) for v in arm.matrix_world @ pb["hand_l"].head],
      "ankle_l", [round(v, 3) for v in arm.matrix_world @ pb["foot_l"].head])


# ════════════════ HAIR: real strands on the scalp ════════════════
# The scan's hair is a sculpted shell (reads as clay up close). We keep it as the dark base and grow ~80k tapered
# strands on it: where the colour map is hair, on the head bone, above the brows. Short at the back and sides,
# longer on top, combed back with a slight sweep to his right, lifting off the scalp and lying down like real cut
# hair. Strands are built once on the posed head and parented to the head bone (they follow every head move).
def grow_hair(n_strands=80000, seed=7):
    rng = np.random.default_rng(seed)
    sub = body.modifiers["subd"]
    sub.show_viewport = False  # evaluate on the original topology (face ↔ UV ↔ weight)
    bpy.context.view_layer.update()
    dg_ = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg_)
    me = ev.to_mesh()
    Mw = body.matrix_world
    co = np.array([tuple(Mw @ v.co) for v in me.vertices], np.float32)
    hv = np.zeros(len(me.vertices), np.float32)
    gi = body.vertex_groups["head"].index
    for v in body.data.vertices:
        for g in v.groups:
            if g.group == gi:
                hv[v.index] = g.weight
    im = bpy.data.images.load(os.path.join(A, "s03/eric_dif_2k.png"), check_existing=True)
    iw, ih = im.size
    px = np.array(im.pixels[:], np.float32).reshape(ih, iw, 4)[..., :3]
    uvl = me.uv_layers.active.data
    head_j = arm.matrix_world @ pb["head"].head
    up = ((arm.matrix_world @ pb["head_end"].head) - head_j).normalized()
    eyes = ((arm.matrix_world @ pb["eye_l"].head) + (arm.matrix_world @ pb["eye_r"].head)) / 2
    fwd = (eyes - head_j)
    fwd = (fwd - up * fwd.dot(up)).normalized()
    right = fwd.cross(up).normalized()
    brow_h = (eyes - head_j).dot(up) + 0.028
    tris = []
    for poly in me.polygons:
        vs = list(poly.vertices)
        if hv[vs].mean() < 0.6:
            continue
        c = co[vs].mean(0)
        if V(c - np.array(head_j)).dot(up) < brow_h - 0.07:  # nothing below the ears' middle
            continue
        u, v = np.mean([uvl[li].uv[:] for li in poly.loop_indices], 0)
        col = px[min(ih - 1, max(0, int(v * ih))), min(iw - 1, max(0, int(u * iw)))]
        val, sat = col.max(), (col.max() - col.min()) / max(col.max(), 1e-4)
        rel_h = V(c - np.array(head_j)).dot(up)
        front = V(c - np.array(head_j)).normalized().dot(fwd)
        if val > 0.36 or (front > 0.55 and rel_h < brow_h + 0.02):  # skin, or the forehead/brow band
            continue
        for k in range(1, len(vs) - 1):
            tris.append((vs[0], vs[k], vs[k + 1]))
    tris = np.array(tris)
    a_, b_, c_ = co[tris[:, 0]], co[tris[:, 1]], co[tris[:, 2]]
    nrm = np.cross(b_ - a_, c_ - a_)
    area = np.linalg.norm(nrm, axis=1) * 0.5
    nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
    pick = rng.choice(len(tris), n_strands, p=area / area.sum())
    r1, r2 = rng.random(n_strands), rng.random(n_strands)
    s1 = np.sqrt(r1)
    root = a_[pick] * (1 - s1)[:, None] + b_[pick] * (s1 * (1 - r2))[:, None] + c_[pick] * (s1 * r2)[:, None]
    n = nrm[pick]
    # make every normal point out of the head
    out_dir = root - np.array(head_j)
    n *= np.sign(np.sum(n * out_dir, 1))[:, None]
    U, F, Rt = np.array(up), np.array(fwd), np.array(right)
    hlev = np.clip(((root - np.array(head_j)) @ U - (brow_h - 0.01)) / 0.08, 0, 1)  # 0 at the sides … 1 on top
    front = np.clip(n @ F, 0, 1)  # the hairline at the front never falls forward onto the forehead
    comb = -F[None, :] + Rt[None, :] * 0.18 * hlev[:, None] - U[None, :] * (0.85 * (1 - hlev) * (1 - front))[:, None]
    comb += rng.normal(0, 0.05, comb.shape)
    tang = comb - n * np.sum(comb * n, 1)[:, None]
    tang /= np.maximum(np.linalg.norm(tang, axis=1, keepdims=True), 1e-9)
    L = (0.011 + 0.032 * hlev ** 1.3) * rng.uniform(0.8, 1.15, n_strands)
    K = 7
    t = np.linspace(0, 1, K)
    lift = 0.03 * np.sin(np.pi * np.clip(t * 0.9, 0, 1))  # combed hair lies close to the scalp
    pos = root[:, None, :] + tang[:, None, :] * (L[:, None, None] * t[None, :, None]) + n[:, None, :] * (L[:, None, None] * lift[None, :, None] + 0.0004)
    # bend each strand around the skull (radius ≈ 8.5 cm): a straight strand would leave the curved scalp by
    # L²/2R at its tip and stick up; this keeps combed hair lying on the head
    pos -= n[:, None, :] * ((L[:, None] * t[None, :]) ** 2 / (2 * 0.07))[:, :, None]
    pos += rng.normal(0, 1, (n_strands, K, 3)).astype(np.float32) * (0.00018 * t[None, :, None] ** 1.5)  # a few loose tips
    cv = bpy.data.hair_curves.new("E.hair")
    cv.add_curves([K] * n_strands)
    cv.position_data.foreach_set("vector", pos.astype(np.float32).ravel())
    rad = cv.attributes.get("radius") or cv.attributes.new("radius", "FLOAT", "POINT")
    rad.data.foreach_set("value", np.tile(np.linspace(0.00005, 0.000018, K), n_strands).astype(np.float32))
    ho = bpy.data.objects.new("E.hair", cv)
    CE.objects.link(ho)
    ho["station"] = "E"
    hm = bpy.data.materials.new("E.hair.mat")
    hm.use_nodes = True
    nt_ = hm.node_tree
    nt_.nodes.clear()
    o_ = nt_.nodes.new("ShaderNodeOutputMaterial")
    hb_ = nt_.nodes.new("ShaderNodeBsdfHairPrincipled")
    hb_.parametrization = "MELANIN"
    hb_.inputs["Melanin"].default_value = 0.9  # dark brown, matching the scan
    hb_.inputs["Melanin Redness"].default_value = 0.32
    hb_.inputs["Roughness"].default_value = 0.34
    hb_.inputs["Radial Roughness"].default_value = 0.4
    hb_.inputs["Random Color"].default_value = 0.12
    hb_.inputs["Random Roughness"].default_value = 0.15
    nt_.links.new(hb_.outputs["BSDF"], o_.inputs["Surface"])
    cv.materials.append(hm)
    # follow the head
    ho.parent = arm
    ho.parent_type = "BONE"
    ho.parent_bone = "head"
    bpy.context.view_layer.update()
    ho.matrix_world = Matrix.Identity(4)
    ev.to_mesh_clear()
    sub.show_viewport = True
    sc.cycles_curves.shape = "RIBBONS"  # camera-facing rounded ribbons: same look at hair scale, ~20× faster than 3D tubes
    print("HAIR", n_strands, "strands on", len(tris), "scalp triangles; length top", round(float(L[hlev > 0.8].mean()), 3), "sides", round(float(L[hlev < 0.2].mean()), 3))


grow_hair()


# ════════════════ ANIMATION: typing, then touching the hot side ════════════════
# Frames 1–96: he types (each finger lifts ~5 mm and strikes its key, the key travels 1.5 mm; hands stay put).
# 100–160: the left hand leaves the keys, his head turns to it, the index and middle fingertips land on the deck by
# the left-side exhaust (the laptop's hottest outside spot, ~50 °C), stay 0.4 s, then the hand withdraws — a quick
# but not violent pull-back (50 °C is uncomfortable, not a burn) — and settles. Every pose is solved with the same
# exact joint aiming as the rest pose, so fingertips land ON their targets (contact is checked and printed).
arm.animation_data_clear()
import json as _json
TIMES = _json.loads(open(os.path.join(ROOT, "tools/blender/s03_times.json")).read())
TOUCH = TIMES["TOUCH"]  # video frames, pinned to the narration ("That's why THIS SIDE gets so HOT")
NFRAMES = TIMES["FRAMES"]
TYPE_END = TOUCH["reach"] - 6
TYPING = {p_.name: p_.matrix_basis.copy() for p_ in pb}
ARM_L = ["shoulder_l", "upperarm_l", "upperarm_twist_l", "lowerarm_l", "lowerarm_twist_l", "hand_l"] + \
    [f"{f}_0{k}_l" for f in ("thumb", "index", "middle", "ring", "pinky") for k in (1, 2, 3)]
HEAD = ["neck", "head"]


def restore(names=None):
    for n_, M_ in TYPING.items():
        if names is None or n_ in names:
            pb[n_].matrix_basis = M_
    bpy.context.view_layer.update()


def key(names, f):
    for n_ in names:
        pb[n_].keyframe_insert("rotation_quaternion", frame=f, group=n_)
        pb[n_].keyframe_insert("location", frame=f, group=n_)


ALL = [p_.name for p_ in pb]
restore()
key(ALL, 1)
# typing: a seeded stream of strikes, alternating hands, ~7 keys/s (a normal typing pace)
import random as _rnd
rng_t = _rnd.Random(11)
fingers_seq = [(s_, f_) for s_ in "lr" for f_ in ("index", "middle", "ring", "pinky")]
last_key = {}
STRIKES = []
f = 4
while f <= TYPE_END - 8:
    s_, f_ = rng_t.choice(fingers_seq[:4] if f % 8 < 4 else fingers_seq[4:])
    if f_ == "pinky" and rng_t.random() < 0.6:
        f_ = "index"
    if last_key.get((s_, f_), -99) > f - 6:
        f += 2
        continue
    names = [f"{f_}_0{k}_{s_}" for k in (1, 2, 3)]
    tgt = key_top(KEYX[HOME[s_][f_]], KEY_Y + {"index": 0.002, "middle": 0.0055, "ring": 0.004, "pinky": -0.002}[f_])
    for df, dz in ((0, 0.0), (2, 0.005), (4, -0.0015), (6, 0.0)):
        restore(names)
        solve_finger(f_, s_, tgt + V((0, 0, dz)))
        key(names, f + df)
    last_key[(s_, f_)] = f
    STRIKES.append([f + 4, s_, f_])  # the frame the key bottoms out (for the typing sound)
    f += rng_t.choice((4, 4, 5, 6))
restore()
key(ALL, TYPE_END)  # all back on the home row
open(os.path.join(ROOT, "tools/blender/s03_keystrikes.json"), "w").write(_json.dumps(STRIKES))


def pose_left(wrist, knuckles, tips, tilt=0.36, curl=None):
    """left hand: two-bone arm to `wrist`, palm toward `knuckles`, forearm turned to `tilt`; fingers in `tips` solved
    onto their targets, the others curled by `curl` (MCP, PIP degrees)"""
    restore(ARM_L)
    two_bone("upperarm_l", "lowerarm_l", wrist, (-0.6, -0.6, -1))
    pronate("l", (1, 0, tilt))
    aim("hand_l", knuckles - (arm.matrix_world @ pb["hand_l"].head))
    roll_to("hand_l", "pinky_01_l", "index_01_l", (1, 0, tilt))
    hd = ((arm.matrix_world @ pb["middle_01_l"].head) - (arm.matrix_world @ pb["hand_l"].head)).normalized()
    miss = {}
    for f_ in ("index", "middle", "ring", "pinky"):
        if f_ in tips:
            miss[f_] = round(solve_finger(f_, "l", tips[f_]), 1)
        else:
            mcp, pip = curl or (25, 45)
            a1 = math.radians(mcp)
            down = V((0, 0, -1))
            side = hd.cross(down).normalized()
            for k_, ang in ((1, a1), (2, a1 + math.radians(pip)), (3, a1 + math.radians(pip * 1.75))):
                aim(f"{f_}_0{k_}_l", hd * math.cos(ang) + down * math.sin(ang))
    aim("thumb_01_l", (0.45, 0.7, -0.3))
    aim("thumb_02_l", (0.3, 1, -0.3))
    aim("thumb_03_l", (0.2, 1, -0.4))
    return miss


def look(dirv):
    restore(HEAD)
    aim("neck", V((0, 0.28, 1)) + V(dirv) * 0.25)
    aim("head", V((0, 0.22, 1)) + V(dirv))


HOT = V((LAP.x - 0.168, LAP.y + 0.055, LAP.z + 0.0132))  # the deck by the exhaust slots (raycast: top at +13.2 mm)
PAD = V((0, 0, 0.0055))  # fingertip joint sits ~5.5 mm above the surface its pad touches
tips_touch = {"index": HOT + V((0.004, 0.012, 0)) + PAD, "middle": HOT + V((-0.002, -0.006, 0)) + PAD}
_r, _c, _l = TOUCH["reach"], TOUCH["contact"], TOUCH["lift"]
key_poses = [
    (_r, None, (0, 0, 0)),
    (_r + int((_c - _r) * 0.55), dict(wrist=HOT + V((0.035, -0.13, 0.075)), knuckles=HOT + V((0.005, -0.04, 0.05)), tips={}, curl=(15, 30)), (-0.35, 0, -0.25)),
    (_c, dict(wrist=HOT + V((0.03, -0.12, 0.05)), knuckles=HOT + V((0.0, -0.05, 0.03)), tips=tips_touch, curl=(30, 60)), (-0.45, 0, -0.35)),
    (_l, dict(wrist=HOT + V((0.03, -0.12, 0.05)), knuckles=HOT + V((0.0, -0.05, 0.03)), tips=tips_touch, curl=(30, 60)), (-0.45, 0, -0.35)),
    # withdrawal: back toward his chest and up, fingers curling (the hand leaves the heat)
    (_l + 4, dict(wrist=HOT + V((0.06, -0.3, 0.08)), knuckles=HOT + V((0.06, -0.22, 0.065)), tips={}, curl=(25, 45)), (-0.4, 0, -0.3)),
    (_l + 8, dict(wrist=HOT + V((0.08, -0.38, 0.1)), knuckles=HOT + V((0.08, -0.3, 0.085)), tips={}, curl=(30, 50)), (-0.35, 0, -0.28)),
    # settles, resting on the desk to the left of the laptop, still looking at it
    (_l + 32, dict(wrist=HOT + V((-0.05, -0.27, 0.012)), knuckles=HOT + V((-0.06, -0.18, 0.004)), tips={}, curl=(20, 35)), (-0.3, 0, -0.25)),
]
for fr_, P, gaze in key_poses:
    restore()
    if P:
        miss = pose_left(P["wrist"], P["knuckles"], P["tips"], curl=P["curl"])
        if miss:
            print("TOUCH frame", fr_, "fingertip miss (mm)", miss)
    look(gaze)
    key(ARM_L + HEAD, fr_)
# contact check: pad heights over the deck while touching
for fr_ in (_c, (_c + _l) // 2, _l):
    sc.frame_set(fr_)
    tips_z = [((arm.matrix_world @ pb[f"{f_}_end_l"].head).z - HOT.z) * 1000 for f_ in ("index", "middle")]
    print("CONTACT frame", fr_, "fingertip joint above deck (mm)", [round(z_, 1) for z_ in tips_z])
# breathing: ~15 breaths/min, the chest rises ~1° on each breath
for fr_ in range(1, NFRAMES + 31, 30):
    for d_, ang in ((0, 0.0), (15, 1.0)):
        restore(["spine_02", "spine_03"])
        if ang:
            spin_about("spine_03", arm.matrix_world @ pb["spine_03"].head, V((1, 0, 0)), math.radians(-ang))
        key(["spine_03"], fr_ + d_)
sc.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/s03_set.blend"))
print("S03 POSE SET")
