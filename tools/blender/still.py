"""Review stills from any scene with a free camera, without touching its shot cameras.

    Blender -b <file.blend> --python tools/blender/still.py -- <out.png> loc=x,y,z look=x,y,z [lens=50] [f=8] [frame=1] [pct=40] [spp=32]
"""
import sys

import bpy
from mathutils import Vector

a = sys.argv[sys.argv.index("--") + 1:]
out = a[0]
kv = dict(x.split("=", 1) for x in a[1:])
vec = lambda s: Vector([float(v) for v in s.split(",")])
sc = bpy.context.scene
sc.frame_set(int(kv.get("frame", 1)))
cd = bpy.data.cameras.new("ReviewCam")
cam = bpy.data.objects.new("ReviewCam", cd)
sc.collection.objects.link(cam)
loc, look = vec(kv["loc"]), vec(kv["look"])
cam.location = loc
cam.rotation_euler = (look - loc).to_track_quat("-Z", "Y").to_euler()
cd.lens = float(kv.get("lens", 50))
cd.dof.use_dof = True
cd.dof.focus_distance = (look - loc).length
cd.dof.aperture_fstop = float(kv.get("f", 8))
sc.camera = cam
sc.render.resolution_percentage = int(kv.get("pct", 40))
if sc.render.engine == "CYCLES":
    sc.cycles.samples = int(kv.get("spp", 32))
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print("STILL", out)
