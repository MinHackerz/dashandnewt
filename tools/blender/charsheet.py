"""Model sheet for the realistic Dash & Newt: builds both characters from scratch (realcast.py, plus the upgrades in
charlook.py when present), puts them in the close-up studio look and renders review stills.

    Blender -b --python tools/blender/charsheet.py -- <out_dir> [tag]

Stills: full body of both, Dash head 3/4 + front, Newt head 3/4 + front. Saves blender/charsheet.blend.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else os.path.join(ROOT, "out/charsheet")
TAG = argv[1] if len(argv) > 1 else "v"
os.makedirs(OUT, exist_ok=True)

# empty scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
sc = bpy.context.scene

exec(open(os.path.join(ROOT, "tools/blender/realcast.py")).read())
dash_rig = build_dash(location=(-0.45, 0, 0))
newt_rig = build_newt(location=(0.45, 0, 0))
LOOK = os.path.join(ROOT, "tools/blender/charlook.py")
if os.path.exists(LOOK):
    exec(open(LOOK).read())
    upgrade_characters()  # noqa: F821  (defined in charlook.py)


def rig_named(prefix):
    return [o for o in bpy.data.objects if o.type == "ARMATURE" and o.name.startswith(prefix)][0]


DR, NR = rig_named("DashReal"), rig_named("NewtReal")


exec(open(os.path.join(ROOT, "tools/blender/ep13_sample_scene.py")).read().split("def build_sample")[0])  # helpers: relax_arms


for r in (DR, NR):
    relax_arms(r, None, swing=0, elbow=14)  # noqa: F821
DR.rotation_euler = (0, 0, math.radians(18))
NR.rotation_euler = (0, 0, math.radians(-14))

# studio: Poly Haven blue photo studio HDRI for light + reflections, sky-blue gradient seen by the camera
w = bpy.data.worlds.new("Studio") if not sc.world else sc.world
sc.world = w
w.use_nodes = True
nt = w.node_tree
nt.nodes.clear()
out = nt.nodes.new("ShaderNodeOutputWorld")
hdr = os.path.join(ROOT, "blender/assets/polyhaven/blue_photo_studio/blue_photo_studio_2k.hdr")
env = nt.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(hdr, check_existing=True)
bg_env = nt.nodes.new("ShaderNodeBackground"); bg_env.inputs["Strength"].default_value = 0.9
nt.links.new(env.outputs["Color"], bg_env.inputs["Color"])
tc = nt.nodes.new("ShaderNodeTexCoord")
sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Window"], sep.inputs[0])
ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].color = (0.50, 0.78, 0.98, 1)
ramp.color_ramp.elements[1].color = (0.10, 0.42, 0.88, 1)
nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"])
bg_cam = nt.nodes.new("ShaderNodeBackground"); nt.links.new(ramp.outputs["Color"], bg_cam.inputs["Color"])
lp = nt.nodes.new("ShaderNodeLightPath")
mix = nt.nodes.new("ShaderNodeMixShader")
nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
nt.links.new(bg_env.outputs["Background"], mix.inputs[1])
nt.links.new(bg_cam.outputs["Background"], mix.inputs[2])
nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])


def area(name, loc, look, size, energy, color):
    ld = bpy.data.lights.new(name, "AREA"); ld.size = size; ld.energy = energy; ld.color = color
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o


area("Key", (-1.6, -2.2, 2.4), (0, 0, 1.2), 1.6, 380, (1.0, 0.95, 0.88))
area("Rim", (1.8, 1.6, 2.2), (0, 0, 1.3), 1.0, 320, (0.82, 0.9, 1.0))
area("Fill", (2.0, -2.0, 1.2), (0, 0, 1.0), 2.0, 90, (1, 1, 1))

cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); sc.collection.objects.link(cam)
sc.camera = cam
cam_d.dof.use_dof = True

sc.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "METAL"; prefs.get_devices()
    for dv in prefs.devices:
        dv.use = True
    sc.cycles.device = "GPU"
except Exception as ex:
    print("GPU setup failed:", ex)
sc.cycles.samples = 96
sc.cycles.use_denoising = True
sc.view_settings.view_transform = "AgX"
sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
sc.render.resolution_percentage = 50


def head_center(rig):
    pb = rig.pose.bones["head"]
    return rig.matrix_world @ pb.head.lerp(pb.tail, 0.45)


def shoot(name, loc, look, lens, fstop):
    cam.location = loc
    cam.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    cam_d.lens = lens
    cam_d.dof.focus_distance = (Vector(look) - Vector(loc)).length
    cam_d.dof.aperture_fstop = fstop
    sc.render.filepath = os.path.join(OUT, f"{TAG}_{name}.png")
    bpy.ops.render.render(write_still=True)
    print("SHOT", sc.render.filepath)


bpy.context.view_layer.update()
shoot("full", (0.0, -4.6, 1.0), (0.0, 0, 0.85), 50, 11)
for who, rig in (("dash", DR), ("newt", NR)):
    h = head_center(rig)
    fwd = (rig.matrix_world.to_3x3() @ Vector((0, -1, 0))).normalized()
    side = Vector((fwd.y, -fwd.x, 0))
    shoot(f"{who}_34", h + fwd * 0.55 + side * 0.32 + Vector((0, 0, 0.02)), h, 70, 4.0)
    shoot(f"{who}_front", h + fwd * 0.62 + Vector((0, 0, 0.0)), h, 70, 4.0)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/charsheet.blend"))
print("CHARSHEET DONE")
