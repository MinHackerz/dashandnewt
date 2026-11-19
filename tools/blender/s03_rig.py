"""s03 animation rig: the parts of "Why your laptop gets so hot" that only matter once things MOVE.

Import from a shot script running inside blender/s03_set.blend:
    import sys; sys.path.insert(0, "tools/blender"); import s03_rig as rig
    rig.final_quality(sc)                       # flicker-free settings for the final frames
    rig.spin_fan(sc, start=40, spinup=30, rev_per_frame=0.05)
    rig.progress(sc, [(1, 0.12), (300, 0.64)])  # the editor's render bar, keyed per frame
    rig.shot_lights("A1", look=(0, 0, 0.1), cam=(0.42, -0.62, 0.36))

Why each exists (what looks fake otherwise):
- fan: a real blower turns ~5,000 rpm = 2.8 turns per frame at 30 fps. 41 blades sampled at 30 fps strobe or
  appear to run backwards. We key a readable speed and render with motion blur, so the blades smear the way they
  do through a real camera's shutter.
- progress: the bar is keyed on frames (no frame-change handlers — those do not run reliably in a final render).
- lights: fixed in the world for the whole shot. Lights that follow a moving camera make reflections slide over
  metal and copper, which reads as CG.
- quality: enough samples that the denoiser has little to invent, a fixed noise seed, and denoising guided by
  albedo + normal, so fine detail (keys, waveforms, fins) does not shimmer or boil between frames.
"""
import math

import bpy
from mathutils import Vector as V


def final_quality(sc, samples=768, threshold=0.004):
    c = sc.cycles
    c.samples = samples
    c.use_adaptive_sampling = True
    c.adaptive_threshold = threshold
    c.adaptive_min_samples = 128
    c.use_animated_seed = False  # the same noise pattern each frame: no grain crawl
    c.seed = 303
    c.use_denoising = True
    c.denoiser = "OPENIMAGEDENOISE"
    c.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    if hasattr(c, "denoising_prefilter"):
        c.denoising_prefilter = "ACCURATE"
    if hasattr(c, "denoising_quality"):
        c.denoising_quality = "HIGH"
    c.transparent_max_bounces = 32
    c.max_bounces = 12
    c.glossy_bounces = 6
    c.transmission_bounces = 12
    c.caustics_reflective = False
    c.caustics_refractive = False
    c.blur_glossy = 0.5  # tames fireflies on copper/aluminium without visible softening
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.5  # 180° shutter, like a film camera
    sc.render.film_transparent = False
    sc.render.fps = 30


def spin_fan(sc, start, spinup=30, rev_per_frame=0.05, end=None, name="B.fan.impeller"):
    """spin-up ease then constant speed. rev_per_frame 0.05 = 18°/frame: readable, and with a 180° shutter each
    blade smears 9° (about one blade gap), so the 41 blades blur smoothly instead of strobing."""
    # wagon-wheel guard: with 41 blades (8.8° apart) a turn of more than half a gap per frame but less than a full
    # smear looks like it runs BACKWARDS. Allowed: slow-motion (≤ 4°/frame, blades crisp) or real speed (≥ 17°/frame,
    # the 180° shutter smears ≥ one gap: a solid blurred disc, exactly what a camera sees).
    deg = rev_per_frame * 360.0
    if not (deg <= 4.0 or deg >= 17.0):
        raise ValueError(f"fan speed {deg:.1f}°/frame strobes: use ≤ 4 (slow-motion) or ≥ 17 (real-speed blur)")
    imp = bpy.data.objects[name]
    end = end or sc.frame_end
    imp.animation_data_clear()
    ang, w = 0.0, 0.0
    for f in range(start, end + 1):
        w = rev_per_frame * min(1.0, (f - start) / max(1, spinup)) ** 2 * (3 - 2 * min(1.0, (f - start) / max(1, spinup)))
        ang += w * 2 * math.pi
        imp.rotation_euler.z = ang  # CCW: the direction the scroll housing widens
        imp.keyframe_insert("rotation_euler", index=2, frame=f)
    for fc in _fcurves(imp):
        for k in fc.keyframe_points:
            k.interpolation = "LINEAR"


def progress(sc, keys, name="A.ui.bar"):
    """keys: [(frame, 0..1), ...]; the bar grows from its left edge"""
    bar = bpy.data.objects[name]
    w = bar["slot_w"]
    bar.animation_data_clear()
    for f, p in keys:
        bar.scale.x = w * max(0.0005, min(1.0, p))
        bar.keyframe_insert("scale", index=0, frame=f)
    for fc in _fcurves(bar):
        for k in fc.keyframe_points:
            k.interpolation = "LINEAR"


def shot_lights(tag, look, cam, size_k=1.0, energy_k=1.0, fill_up=0.0):
    """soft studio light for one shot, fixed in the world: a big key above-left of the camera, a rim behind, a
    weak fill (fill_up lifts it: low cameras facing flat metal would see it mirrored back like a flash). Placed
    from the shot's START camera and never moved."""
    look, cam = V(look), V(cam)
    fwd = (look - cam).normalized()
    right = fwd.cross(V((0, 0, 1))).normalized()
    up = right.cross(fwd)
    s = max((look - cam).length, 0.08)
    out = []
    for nm, pos, size, en in ((f"{tag}.key", look - fwd * s * 1.1 - right * s * 0.8 + up * s * 1.2, 1.4 * s, 90 * s * s),
                              (f"{tag}.rim", look + fwd * s * 0.9 + right * s * 0.6 + up * s * 0.9, 0.6 * s, 110 * s * s),
                              (f"{tag}.fill", look - fwd * s * 0.9 + right * s * 1.0 + up * s * fill_up, 1.2 * s, 30 * s * s)):
        ld = bpy.data.lights.get(nm) or bpy.data.lights.new(nm, "AREA")
        ld.size, ld.energy = size * size_k, en * energy_k
        o = bpy.data.objects.get(nm) or bpy.data.objects.new(nm, ld)
        if o.name not in bpy.context.scene.collection.objects:
            bpy.context.scene.collection.objects.link(o)
        o.location = pos
        o.rotation_euler = (look - pos).to_track_quat("-Z", "Y").to_euler()
        o.visible_camera = False  # light the subject; never appear in frame as a white panel (reflections stay)
        out.append(o)
    return out


def _fcurves(o):
    ad = o.animation_data
    if not ad or not ad.action:
        return []
    act = ad.action
    if hasattr(act, "fcurves") and len(act.fcurves):
        return list(act.fcurves)
    out = []  # Blender 5 layered actions
    for layer in getattr(act, "layers", []):
        for strip in layer.strips:
            for bag in strip.channelbags:
                out += list(bag.fcurves)
    return out


def isolate(station, fx=()):
    """render only one set: the sets share one blue void 10 m apart, so a wide or side-on camera would otherwise
    catch another set floating in the background. station: "A" … "F". Effects objects (o["fx"], e.g. "air") stay
    hidden unless named in `fx`: the airflow streaks only belong in the airflow shot."""
    for o in bpy.data.objects:
        st = o.get("station")
        if st is not None:
            o.hide_render = st != station or (o.get("fx") is not None and o["fx"] not in fx)
