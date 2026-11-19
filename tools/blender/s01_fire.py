"""s01 fire as a procedural volume (replaces the Mantaflow gas sim, which at a Mac-friendly resolution only gives
thin smoke). A tapering column round the pot: turbulent flame noise scrolling upward, flame colour by intensity
(deep red → orange → yellow core), dark soot above; it erupts in ~0.4 s where the spilled oil meets the burner.

    Blender -b blender/s01.blend --python tools/blender/s01_fire.py   (saves blender/s01.blend)
"""
import json
import math
import os

import bmesh
import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
C = json.load(open(os.path.join(ROOT, "tools/blender/s01_times.json")))["CUE"]
FPS = C["fps"]
F = lambda t: int(round(t * FPS)) + 1
sc = bpy.context.scene
T_ON, T_OFF = C["over"] + 0.85, C["thaw"] - 0.35
H, R = 1.9, 0.5  # column height and base radius (m)

old = bpy.data.objects.get("Sim.fire_domain")
if old:
    old.animation_data_clear()
    old.hide_render = True
    old.hide_viewport = True
for n in ("Fire.proc",):
    o = bpy.data.objects.get(n)
    if o:
        bpy.data.objects.remove(o, do_unlink=True)

me = bpy.data.meshes.new("Fire.proc")
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=R, radius2=R * 0.55, depth=H)
bm.to_mesh(me)
bm.free()
fire = bpy.data.objects.new("Fire.proc", me)
sc.collection.objects.link(fire)
fire.location = (0, 0, H / 2 + 0.01)

m = bpy.data.materials.new("fire procedural")
m.use_nodes = True
nt = m.node_tree
nt.nodes.clear()
N, L = nt.nodes.new, nt.links.new
out = N("ShaderNodeOutputMaterial")
vol = N("ShaderNodeVolumePrincipled")
vol.inputs["Color"].default_value = (0.02, 0.018, 0.016, 1)
vol.inputs["Blackbody Intensity"].default_value = 0.0
tc = N("ShaderNodeTexCoord")
mp = N("ShaderNodeMapping")
L(tc.outputs["Object"], mp.inputs["Vector"])
mp.inputs["Scale"].default_value = (2.2, 2.2, 1.1)
sep = N("ShaderNodeSeparateXYZ")
L(tc.outputs["Object"], sep.inputs[0])
# height 0 (base) → 1 (top), radius 0 (axis) → 1 (wall)
hz = N("ShaderNodeMapRange"); hz.inputs["From Min"].default_value = -1.0; hz.inputs["From Max"].default_value = 1.0
L(sep.outputs["Z"], hz.inputs["Value"])
cxy = N("ShaderNodeCombineXYZ")
L(sep.outputs["X"], cxy.inputs["X"]); L(sep.outputs["Y"], cxy.inputs["Y"])
rl = N("ShaderNodeVectorMath"); rl.operation = "LENGTH"
L(cxy.outputs["Vector"], rl.inputs[0])
# turbulence scrolling upward (mapping location keyed), evolving in W
noise = N("ShaderNodeTexNoise"); noise.noise_dimensions = "4D"
noise.inputs["Scale"].default_value = 2.6; noise.inputs["Detail"].default_value = 9.0
noise.inputs["Roughness"].default_value = 0.62; noise.inputs["Distortion"].default_value = 0.8
L(mp.outputs["Vector"], noise.inputs["Vector"])
# shape: flames hug the pot low down and taper up; strongest near the base
shape = N("ShaderNodeMath"); shape.operation = "SUBTRACT"
shape.inputs[0].default_value = 1.05
taper = N("ShaderNodeMath"); taper.operation = "MULTIPLY_ADD"
L(hz.outputs["Result"], taper.inputs[0]); taper.inputs[1].default_value = 0.35; taper.inputs[2].default_value = 0.0
radial = N("ShaderNodeMath"); radial.operation = "ADD"
L(rl.outputs["Value"], radial.inputs[0]); L(taper.outputs["Value"], radial.inputs[1])
L(radial.outputs["Value"], shape.inputs[1])
up = N("ShaderNodeMath"); up.operation = "SUBTRACT"
up.inputs[0].default_value = 1.0
L(hz.outputs["Result"], up.inputs[1])
pw = N("ShaderNodeMath"); pw.operation = "POWER"
L(up.outputs["Value"], pw.inputs[0]); pw.inputs[1].default_value = 0.8
grow = N("ShaderNodeValue"); grow.name = "Grow"  # 0 → 1 as the fire erupts (keyed)
hgate = N("ShaderNodeMath"); hgate.operation = "LESS_THAN"
L(hz.outputs["Result"], hgate.inputs[0]); L(grow.outputs[0], hgate.inputs[1])
mask = N("ShaderNodeMath"); mask.operation = "MULTIPLY"
L(shape.outputs["Value"], mask.inputs[0]); L(pw.outputs["Value"], mask.inputs[1])
mask2 = N("ShaderNodeMath"); mask2.operation = "MULTIPLY"
L(mask.outputs["Value"], mask2.inputs[0]); L(hgate.outputs["Value"], mask2.inputs[1])
# flame = (noise + shape bias) thresholded into tongues
fl_add = N("ShaderNodeMath"); fl_add.operation = "MULTIPLY_ADD"
L(mask2.outputs["Value"], fl_add.inputs[0]); fl_add.inputs[1].default_value = 0.9
L(noise.outputs["Fac"], fl_add.inputs[2])
fl = N("ShaderNodeMapRange"); fl.inputs["From Min"].default_value = 0.88; fl.inputs["From Max"].default_value = 1.22
L(fl_add.outputs["Value"], fl.inputs["Value"])
gate = N("ShaderNodeMath"); gate.operation = "MULTIPLY"
L(fl.outputs["Result"], gate.inputs[0]); L(hgate.outputs["Value"], gate.inputs[1])
ramp = N("ShaderNodeValToRGB")
cr = ramp.color_ramp
cr.elements[0].position = 0.0; cr.elements[0].color = (0, 0, 0, 1)
cr.elements[1].position = 1.0; cr.elements[1].color = (1.0, 0.52, 0.04, 1)
e = cr.elements.new(0.12); e.color = (0.35, 0.01, 0.0, 1)
e = cr.elements.new(0.45); e.color = (0.95, 0.12, 0.0, 1)
e = cr.elements.new(0.75); e.color = (1.0, 0.3, 0.0, 1)
L(gate.outputs["Value"], ramp.inputs["Fac"])
L(ramp.outputs["Color"], vol.inputs["Emission Color"])
es = N("ShaderNodeMath"); es.operation = "MULTIPLY"; es.inputs[1].default_value = 9.0
L(gate.outputs["Value"], es.inputs[0]); L(es.outputs["Value"], vol.inputs["Emission Strength"])
# soot: dark smoke above the flames
soot_h = N("ShaderNodeMapRange"); soot_h.inputs["From Min"].default_value = 0.35; soot_h.inputs["From Max"].default_value = 0.85
L(hz.outputs["Result"], soot_h.inputs["Value"])
soot_n = N("ShaderNodeMapRange"); soot_n.inputs["From Min"].default_value = 0.45; soot_n.inputs["From Max"].default_value = 0.75
L(noise.outputs["Fac"], soot_n.inputs["Value"])
soot = N("ShaderNodeMath"); soot.operation = "MULTIPLY"
L(soot_h.outputs["Result"], soot.inputs[0]); L(soot_n.outputs["Result"], soot.inputs[1])
soot2 = N("ShaderNodeMath"); soot2.operation = "MULTIPLY"
L(soot.outputs["Value"], soot2.inputs[0]); L(hgate.outputs["Value"], soot2.inputs[1])
dens = N("ShaderNodeMath"); dens.operation = "MULTIPLY_ADD"
L(soot2.outputs["Value"], dens.inputs[0]); dens.inputs[1].default_value = 7.0
L(gate.outputs["Value"], dens.inputs[2])
L(dens.outputs["Value"], vol.inputs["Density"])
L(vol.outputs["Volume"], out.inputs["Volume"])
fire.data.materials.append(m)

# animation: rise speed ~1.6 m/s in the column; flames erupt in 0.4 s, settle, die at the cut
for f in range(1, F(C["end"]) + 1):
    t = (f - 1) / FPS
    mp.inputs["Location"].default_value = (0.0, 0.0, -t * 1.7)
    mp.inputs["Location"].keyframe_insert("default_value", frame=f)
    noise.inputs["W"].default_value = t * 0.9
    noise.inputs["W"].keyframe_insert("default_value", frame=f)
    k = 0.0 if t < T_ON else min(1.0, (t - T_ON) / 0.4)
    grow.outputs[0].default_value = k * (1.0 + 0.04 * math.sin(t * 9))
    grow.outputs[0].keyframe_insert("default_value", frame=f)
for t, v in ((0, True), (T_ON - 0.05, False), (T_OFF, True)):
    fire.hide_render = v
    fire.keyframe_insert("hide_render", frame=F(t))
# warm flickering light from the fire
li = bpy.data.lights.get("Fire.light")
if li:
    li.animation_data_clear()
    for f in range(1, F(C["end"]) + 1, 2):
        t = (f - 1) / FPS
        k = 0.0 if t < T_ON or t > T_OFF else min(1.0, (t - T_ON) / 0.4) * (0.8 + 0.2 * math.sin(t * 29) * math.sin(t * 11))
        li.energy = 220 * k
        li.keyframe_insert("energy", frame=f)
looks = [l.identifier for l in bpy.types.ColorManagedViewSettings.bl_rna.properties["look"].enum_items_static] if False else []
try:
    sc.view_settings.look = "AgX - Punchy"
except TypeError:
    try:
        sc.view_settings.look = "Punchy"
    except TypeError:
        pass
print("LOOK", sc.view_settings.view_transform, sc.view_settings.look)
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
print("FIRE PROC DONE", T_ON, T_OFF)
