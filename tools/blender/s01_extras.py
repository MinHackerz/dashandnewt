"""s01 extras, added on top of the baked scene (so the fluid/fire caches stay valid):
backyard dressing (wooden deck, fence, autumn leaves), and the thaw time-lapse props (wall clock whose hands spin,
paper towels for "pat it dry").

    Blender -b blender/s01.blend --python tools/blender/s01_extras.py   (saves blender/s01.blend)
"""
import json
import math
import os
import random

import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
A = os.path.join(ROOT, "blender/assets")
SF = os.path.join(A, "sketchfab")
C = json.load(open(os.path.join(ROOT, "tools/blender/s01_times.json")))["CUE"]
FPS = C["fps"]
F = lambda t: int(round(t * FPS)) + 1
sc = bpy.context.scene
R = random.Random(1126)
coll = bpy.data.collections.get("Extras") or bpy.data.collections.new("Extras")
if coll.name not in sc.collection.children:
    sc.collection.children.link(coll)
for o in list(coll.objects):
    bpy.data.objects.remove(o, do_unlink=True)


def import_glb(uid, name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SF, uid, "model.glb"))
    new = [o for o in bpy.data.objects if o not in before]
    root = bpy.data.objects.new(name, None)
    coll.objects.link(root)
    for o in new:
        for c in o.users_collection:
            c.objects.unlink(o)
        coll.objects.link(o)
        if o.parent is None:
            o.parent = root
    bpy.context.view_layer.update()
    return root, [o for o in new if o.type == "MESH"]


def bbox(ms):
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in ms for c in o.bound_box]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])


def fit(root, ms, size, axis="z", ground=0.0, at=(0, 0)):
    lo, hi = bbox(ms)
    ext = hi - lo
    cur = max(ext) if axis == "max" else ext["xyz".index(axis)]
    root.scale = root.scale * (size / cur)
    lo, hi = bbox(ms)
    root.location += Vector((at[0] - (lo.x + hi.x) / 2, at[1] - (lo.y + hi.y) / 2, ground - lo.z))
    bpy.context.view_layer.update()


# ─── deck: Poly Haven wood_floor_deck on the slab under the fryer ──────────
slab = bpy.data.objects["Patio"]
slab.scale = (2.6, 2.0, 0.04)
slab.location = (0, 0.35, -0.02)
deck = bpy.data.materials.new("wooden deck")
deck.use_nodes = True
nt = deck.node_tree
b = nt.nodes["Principled BSDF"]
tc = nt.nodes.new("ShaderNodeTexCoord")
mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1.3, 1.3, 1.3)
nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
TX = os.path.join(A, "polyhaven/wood_floor_deck/textures")


def tex(fn, noncolor):
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = bpy.data.images.load(os.path.join(TX, fn), check_existing=True)
    if noncolor:
        t.image.colorspace_settings.name = "Non-Color"
    t.projection = "BOX"; t.projection_blend = 0.2
    nt.links.new(mp.outputs["Vector"], t.inputs["Vector"])
    return t


files = os.listdir(TX)
pick = lambda key: [f for f in files if key in f][0]
nt.links.new(tex(pick("diff"), False).outputs["Color"], b.inputs["Base Color"])
nt.links.new(tex(pick("rough"), True).outputs["Color"], b.inputs["Roughness"])
nm = nt.nodes.new("ShaderNodeNormalMap")
nt.links.new(tex(pick("nor_gl"), True).outputs["Color"], nm.inputs["Color"])
nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
slab.data.materials.clear(); slab.data.materials.append(deck)

# ─── fence behind (out of focus in the wides; reads "backyard") ────────────
# (the downloaded fence scan carries graffiti, incl. a cannabis leaf: not used — the blue backdrop stays clean)

# ─── autumn leaves scattered on the deck (clear of the stand) ──────────────
lr, lm = import_glb("2ba028253c9241a38d4ab6d7bc63fb72", "Leaves.src")
lr.hide_render = True
for o in lm:
    o.hide_render = True
srcs = lm
lo, hi = bbox(srcs)
leaf_size = max((o.dimensions.x for o in srcs)) or 1.0
for i in range(70):
    s = R.choice(srcs)
    o = s.copy()
    o.parent = None
    coll.objects.link(o)
    o.hide_render = False
    while True:
        x, y = R.uniform(-1.2, 1.2), R.uniform(-0.6, 1.2)
        if math.hypot(x, y) > 0.34 and math.hypot(x - 0.55, y - 0.15) > 0.3 and math.hypot(x + 0.55, y + 0.1) > 0.2:
            break
    k = R.uniform(0.045, 0.08) / max(1e-6, max(s.dimensions))
    o.matrix_world = s.matrix_world.copy()
    o.scale = s.matrix_world.to_scale() * k
    o.location = (x, y, 0.004)
    o.rotation_euler = (0, 0, R.uniform(0, math.tau))

# ─── thaw time-lapse props ─────────────────────────────────────────────────
TRAY = Vector((4.0, 0.0, 0.30))
tw, twm = import_glb("e10eb527561048b6bc1786c8c44cd0f5", "PaperTowels")
fit(tw, twm, 0.28, ground=TRAY.z, at=(TRAY.x + 0.26, TRAY.y + 0.12))
ck, ckm = import_glb("2e964ac0242e4b1789adfd9549c653dc", "Clock")
ck.rotation_euler = (0, 0, 0)
fit(ck, ckm, 0.30, axis="max", ground=TRAY.z + 0.25, at=(TRAY.x - 0.05, TRAY.y + 0.42))
lo, hi = bbox([o for o in ckm if o.name.startswith("Clock")])
centre = (lo + hi) / 2
face_n = Vector((0, -1, 0))  # the clock faces the camera (-y)
for name, turns in (("Minutes", 24), ("Hours", 2)):  # a full day of thawing in ~1.4 s
    hand = [o for o in ckm if o.name.startswith(name)]
    if not hand:
        continue
    piv = bpy.data.objects.new(f"Clock.{name}.pivot", None)
    coll.objects.link(piv)
    piv.location = centre
    W = hand[0].matrix_world.copy()
    hand[0].parent = piv
    hand[0].matrix_world = W
    t0, t1 = C["thaw"] - 0.2, C["dry"] - 0.15
    piv.rotation_euler = (0, 0, 0); piv.keyframe_insert("rotation_euler", frame=F(t0))
    piv.rotation_euler = (0, -turns * math.tau, 0); piv.keyframe_insert("rotation_euler", frame=F(t1))
for o in [tw, ck] + twm + ckm:
    o.hide_render = True; o.keyframe_insert("hide_render", frame=1)
    o.hide_render = False; o.keyframe_insert("hide_render", frame=F(C["thaw"] - 0.35))
    o.hide_render = True; o.keyframe_insert("hide_render", frame=F(C["off"] - 0.35))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/s01.blend"))
print("EXTRAS DONE")
