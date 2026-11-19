"""s01 — fixes for the cutaway shots (frames CUT0..CUT1), rendered from their own file.

    Blender -b blender/s01.blend --python tools/blender/s01_cutfix.py
Saves blender/s01_cutfix.blend; render ONLY frames CUT0..CUT1 from it.

1. The bird looked white once it was under the oil: the cutaway sliced pot AND oil at the pot's middle (y < 0), so the
   front half of the bird stood in air in front of the oil. Now the pot is still opened at its middle, but the oil is
   only sliced near its front wall, so the bird sits INSIDE the oil and is seen through it. On top of that the skin
   below the oil line gets a thin wet oil film (amber tint + gloss), following the real oil level frame by frame.
2. The last frames before the eruption shot showed the raw fluid-simulation mesh (it starts 0.4 s before "shoves",
   the camera cuts 0.2 s before it): every visibility switch that happens in that gap is held back to the cut.
"""
import json
import math
import os

import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
C = json.load(open(os.path.join(ROOT, "tools/blender/s01_times.json")))["CUE"]
FPS = C["fps"]
sc = bpy.context.scene


def first_frame(t):
    return int(math.ceil(t * FPS - 1e-6)) + 1


CUT0 = first_frame(C["cutaway"])
CUT1 = first_frame(C["shoves"] - 0.2) - 1
OIL_FRONT = -0.118  # the oil is sliced here; the pot's inner wall is at r = 0.16

# 1a ── the oil gets its own cutter, close to the front wall
src = bpy.data.objects["Cut.box"]
cut_oil = src.copy()
cut_oil.data = src.data
cut_oil.name = "Cut.oil"
for c in src.users_collection:
    c.objects.link(cut_oil)
cut_oil.location.y = OIL_FRONT - cut_oil.scale.y / 2
oil = bpy.data.objects["Oil"]
oil.modifiers["cutaway"].object = cut_oil
# the flat cut face mirrored the studio as a hard-edged white panel across the bird: calm the oil's reflections
for n in bpy.data.materials["peanut oil 350F"].node_tree.nodes:
    if n.bl_idname == "ShaderNodeBsdfPrincipled":
        n.inputs["Specular IOR Level"].default_value = 0.15

# 2 ── hold every render-visibility switch that happens between the last clean frame and the cut
GAP0 = first_frame(C["shoves"] - 0.4) - 1  # last frame before the simulation takes over
held = []


def state():
    st = {}
    for o in bpy.data.objects:
        st[(o.name, None)] = o.hide_render
        for m in o.modifiers:
            st[(o.name, m.name)] = m.show_render
    return st


sc.frame_set(GAP0)
before = state()
sc.frame_set(CUT1)
after = state()
for (on, mn), v in before.items():
    if after.get((on, mn)) != v and on.startswith(("Oil", "Sim.")):  # drops/bubbles keep their own timing
        o = bpy.data.objects[on]
        tgt, prop = (o, "hide_render") if mn is None else (o.modifiers[mn], "show_render")
        for f in range(GAP0, CUT1 + 1):
            setattr(tgt, prop, v)
            tgt.keyframe_insert(prop, frame=f)
        if mn is not None:
            for f in range(GAP0, CUT1 + 1):
                tgt.show_viewport = v
                tgt.keyframe_insert("show_viewport", frame=f)
        held.append((on, mn, v))

# 1b ── wet oil film on the skin below the oil line (level read from the animated oil, frame by frame)
top_local = max(v.co.z for v in oil.data.vertices)
level = {}
for f in range(CUT0 - 2, CUT1 + 3):
    sc.frame_set(f)
    level[f] = (oil.matrix_world @ Vector((0, 0, top_local))).z

turkey = bpy.data.objects["Turkey"]
mats = {m for o in turkey.children_recursive if o.type == "MESH" for m in o.data.materials if m and m.node_tree}
AMBER = (1.0, 0.63, 0.24, 1.0)
for m in mats:
    nt = m.node_tree
    bsdf = next((n for n in nt.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled"), None)
    if not bsdf:
        continue
    lvl = nt.nodes.new("ShaderNodeValue"); lvl.name = "OilLevel"; lvl.label = "oil level (world z)"
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    sub = nt.nodes.new("ShaderNodeMath"); sub.operation = "SUBTRACT"
    ramp = nt.nodes.new("ShaderNodeMapRange")  # 0 just above the oil line → 1 a centimetre below it
    ramp.inputs["From Min"].default_value = -0.004
    ramp.inputs["From Max"].default_value = 0.012
    nt.links.new(geo.outputs["Position"], sep.inputs[0])
    nt.links.new(lvl.outputs[0], sub.inputs[0]); nt.links.new(sep.outputs["Z"], sub.inputs[1])
    nt.links.new(sub.outputs[0], ramp.inputs["Value"])
    wet = ramp.outputs["Result"]
    # base colour × amber where wet
    bc = bsdf.inputs["Base Color"]
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
    mix.inputs["B"].default_value = AMBER
    if bc.is_linked:
        nt.links.new(bc.links[0].from_socket, mix.inputs["A"])
    else:
        mix.inputs["A"].default_value = bc.default_value
    nt.links.new(wet, mix.inputs["Factor"])
    nt.links.new(mix.outputs["Result"], bc)
    # glossier where wet
    rg = bsdf.inputs["Roughness"]
    mr = nt.nodes.new("ShaderNodeMix"); mr.data_type = "FLOAT"
    mr.inputs["B"].default_value = 0.12
    if rg.is_linked:
        nt.links.new(rg.links[0].from_socket, mr.inputs["A"])
    else:
        mr.inputs["A"].default_value = rg.default_value
    nt.links.new(wet, mr.inputs["Factor"])
    nt.links.new(mr.outputs["Result"], rg)
    for f, z in level.items():
        lvl.outputs[0].default_value = z
        lvl.outputs[0].keyframe_insert("default_value", frame=f)

sc.frame_start, sc.frame_end = CUT0, CUT1
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/s01_cutfix.blend"))
print("CUTFIX BUILT frames", CUT0, CUT1, "gap from", GAP0, "held", held, "mats", len(mats),
      "level", round(level[CUT0], 3), round(max(level.values()), 3))
