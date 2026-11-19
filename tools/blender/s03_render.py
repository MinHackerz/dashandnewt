"""Render s03's shots, frame by frame, resumable, with the laptop's temperature watched before every frame
(tools/render/thermal_guard.py: pauses when macOS reports serious/critical thermal state or the battery reaches 42 °C,
rests after frames while "fair", never renders on battery power; every check logged to out/render_logs/thermal.csv).

    blender -b blender/s03_set.blend --python tools/blender/s03_render.py -- final [shot ...]
    blender -b blender/s03_set.blend --python tools/blender/s03_render.py -- preview [shot ...]     # 33 %, quick
    blender -b blender/s03_set.blend --python tools/blender/s03_render.py -- check [shot ...]       # first/mid/last
    blender -b blender/s03_set.blend --python tools/blender/s03_render.py -- time [shot ...]        # one final-quality frame per shot

final → out/blender/s03/<shot>/<frame>.png (1080×1920, 16-bit PNG); frames that exist are skipped (safe to stop/restart).
"""
import json
import os
import sys
import time

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, "tools/render"))
import s03_rig as rig  # noqa: E402

CLOUD = bool(os.environ.get("S03_CLOUD"))  # set by tools/render/s03_modal.py: Linux + NVIDIA (OptiX), no Mac thermal guard
if CLOUD:
    class tg:  # noqa: N801  stand-in for thermal_guard on a datacentre GPU
        before_frame = after_frame = staticmethod(lambda *a: None)
        state = staticmethod(lambda: "cloud")
        battery_c = staticmethod(lambda: "")
else:
    import thermal_guard as tg  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["check"]
mode, only = args[0], args[1:]
PLAN = json.loads(open(os.path.join(ROOT, "tools/blender/s03_plan.json")).read())
PROG = PLAN.pop("_progress")
FR = json.loads(open(os.path.join(ROOT, "tools/blender/s03_times.json")).read())["FRAMES"]
sc = bpy.context.scene
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = os.environ.get("S03_COMPUTE", "OPTIX") if CLOUD else "METAL"  # CUDA on GPUs without RT cores
# scene-specialised Metal kernels ("FULL") deadlock in the shader compiler on this machine (two renders froze for
# hours in ShaderCache::get_best_pipeline with every MTLCompilerService idle); the generic kernels never do
prefs.kernel_optimization_level = os.environ.get("S03_KOPT", "OFF")
# Apple's hardware ray tracing (MetalRT) hangs forever on motion-blurred hair curves (Eric's hair + the 180° shutter):
# found by bisecting 2026-11-18; with it off, the same frame renders in seconds. Software BVH on the GPU instead.
prefs.metalrt = "OFF"
prefs.get_devices()
for d in prefs.devices:
    d.use = d.type != "CPU"  # GPU only: a CPU+GPU split makes the GPU wait for slow CPU tiles
sc.render.engine = "CYCLES"
sc.cycles.device = os.environ.get("S03_DEVICE", "GPU")  # S03_DEVICE=CPU: fallback while the GPU kernels misbehave
sc.view_settings.view_transform = "AgX"
sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
if mode in ("final", "time"):
    rig.final_quality(sc, samples=384, threshold=0.006)
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "16"
    sc.render.image_settings.compression = 15
    out_dir = os.path.join(ROOT, "out/blender/s03" if mode == "final" else "out/blender/s03_time")
else:
    rig.final_quality(sc, samples=48, threshold=0.05)
    sc.render.resolution_percentage = 33
    out_dir = os.path.join(ROOT, f"out/blender/s03_{mode}")
THERMAL_NODES = [n for m in list(bpy.data.materials) + [sc.world] if m and m.node_tree
                 for n in m.node_tree.nodes if n.label == "thermal_k" or n.name == "thermal_k"]
BARS = [o for o in bpy.data.objects if o.name.endswith("ui.bar") and "slot_w" in o]


def thermal_at(p, f):
    if "thermal_ramp" in p:
        a, b = p["thermal_ramp"]
        return min(1.0, max(0.0, (f - a) / (b - a)))
    return p["thermal"]


def setup(name, p, f):
    sc.frame_set(f)
    rig.isolate(p["station"], fx=tuple(p["fx"]))
    for o in bpy.data.objects:
        if o.name.startswith("SL."):
            o.hide_render = o.get("shot") != name
    sc.camera = bpy.data.objects["SHOT." + name]
    v = thermal_at(p, f)
    for n in THERMAL_NODES:
        n.outputs[0].default_value = v
    prog = PROG["from"] + (PROG["to"] - PROG["from"]) * (f - 1) / max(1, FR - 1)
    for b in BARS:
        b.scale.x = b["slot_w"] * prog


shots = [s for s in PLAN if not only or s in only]
# S03_FRAMES="a-b": render only that frame range (the cloud splits shots across GPUs); S03_OUT: output root
_fr = os.environ.get("S03_FRAMES")
FRANGE = tuple(int(x) for x in _fr.split("-")) if _fr else None
if os.environ.get("S03_OUT") and mode == "final":
    out_dir = os.environ["S03_OUT"]
os.makedirs(os.path.join(ROOT, "out/render_logs"), exist_ok=True)
tlog = open(os.path.join(ROOT, "out/render_logs/s03_frames.csv"), "a")
for name in shots:
    p = PLAN[name]
    frames = list(range(p["f0"], p["f1"] + 1))
    if mode == "check":
        frames = sorted({p["f0"], (p["f0"] + p["f1"]) // 2, p["f1"]})
    elif mode == "time":  # one final-quality mid frame per shot, to measure render time
        frames = [(p["f0"] + p["f1"]) // 2]
    elif mode == "preview":
        frames = frames[::3]
    if FRANGE:
        frames = [f for f in frames if FRANGE[0] <= f <= FRANGE[1]]
    d = os.path.join(out_dir, name)
    os.makedirs(d, exist_ok=True)
    for f in frames:
        path = os.path.join(d, f"{f:04d}.png")
        if os.path.exists(path):
            continue
        tok = tg.before_frame(f"s03 {name} f{f}") if mode in ("final", "time") else None
        setup(name, p, f)
        t0 = time.time()
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        dt = time.time() - t0
        tlog.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')},{mode},{name},{f},{dt:.1f},{tg.state()},{tg.battery_c()}\n")
        tlog.flush()
        print(f"FRAME {name} {f} {dt:.1f}s", flush=True)
        if mode in ("final", "time"):
            tg.after_frame(tok)
    print("SHOT DONE", name, flush=True)
print("RENDER DONE", mode)
