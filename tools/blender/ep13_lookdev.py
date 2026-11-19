"""Look-dev polish for the realistic Blender shorts: light, colour, materials, renderer.

    exec(open(".../tools/blender/ep13_lookdev.py").read()); polish(engine="CYCLES")

The target is the reference look: a hard warm key (sun through a window) with deep, clean shadows; a soft
interior bounce from a real HDRI (Blender's bundled Poly Haven "interior", CC0); saturated colour; shallow
focus in close-ups; and a contrasty grade.
"""
import math
import bpy
import bmesh
from mathutils import Vector

HDRI = "/Applications/Blender.app/Contents/Resources/5.2/datafiles/studiolights/world/interior.exr"


def _lin(h):
    h = h.lstrip("#")
    s = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in s) + (1.0,)


def _room():
    c = bpy.data.collections.get("Room")
    return c


def _box(name, size, loc, mat=None):
    o = bpy.data.objects.get(name)
    if o:
        bpy.data.objects.remove(o, do_unlink=True)
    me = bpy.data.meshes.new(name)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bmesh.ops.scale(bm, vec=size, verts=bm.verts); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); _room().objects.link(o)
    if mat:
        o.data.materials.append(mat)
    o.location = loc
    return o


def lighting():
    sc = bpy.context.scene
    # the world: a real interior HDRI for bounce and reflections, kept low so the sun dominates
    w = sc.world
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(HDRI, check_existing=True)
    mapping = nt.nodes.new("ShaderNodeMapping"); tc = nt.nodes.new("ShaderNodeTexCoord")
    mapping.inputs["Rotation"].default_value = (0, 0, math.radians(140))
    nt.links.new(tc.outputs["Generated"], mapping.inputs["Vector"]); nt.links.new(mapping.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], bg.inputs["Color"]); nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    bg.inputs["Strength"].default_value = 0.55
    # the key: hard, warm sun streaming in through a window on the left (front-left, high)
    for n in ("Room.window", "Room.fill", "Room.rim", "Key.sun"):
        o = bpy.data.objects.get(n)
        if o:
            bpy.data.objects.remove(o, do_unlink=True)
    sd = bpy.data.lights.new("Key.sun", "SUN")
    sd.energy = 7.5; sd.color = (1.0, 0.84, 0.66); sd.angle = math.radians(1.2)
    sun = bpy.data.objects.new("Key.sun", sd); _room().objects.link(sun)
    sun.rotation_euler = (Vector((0, 0, 0)) - Vector((-3.2, -2.0, 2.6))).to_track_quat("-Z", "Y").to_euler()
    # a window wall on the left with two panes: the sun only gets in through the glass
    frame = bpy.data.materials.get("frame")
    wall = bpy.data.materials.get("plaster")
    X = -1.6
    _box("Room.lwall.low", (0.1, 6, 0.9), (X, -1.0, 0.45), wall)
    _box("Room.lwall.high", (0.1, 6, 0.8), (X, -1.0, 2.6), wall)
    _box("Room.lwall.back", (0.1, 1.8, 1.3), (X, 1.1, 1.55), wall)
    _box("Room.lwall.front", (0.1, 2.4, 1.3), (X, -2.8, 1.55), wall)
    _box("Room.window.mullion", (0.08, 0.06, 1.3), (X, -0.55, 1.55), frame)
    _box("Room.window.transom", (0.08, 1.8, 0.06), (X, -0.55, 1.6), frame)
    # a soft cool bounce from the room, low and opposite the sun, so the shadow side isn't dead
    fd = bpy.data.lights.new("Room.fill", "AREA"); fd.energy = 140; fd.size = 3.0; fd.color = (0.72, 0.82, 1.0)
    fill = bpy.data.objects.new("Room.fill", fd); _room().objects.link(fill)
    fill.location = (2.8, -3.2, 1.2); fill.rotation_euler = (Vector((0.6, 0, 0.9)) - fill.location).to_track_quat("-Z", "Y").to_euler()


def colours():
    pl = bpy.data.materials["plaster"].node_tree.nodes["Principled BSDF"]
    pl.inputs["Base Color"].default_value = _lin("#8fbde3")  # sky-blue walls, like the reference's backdrop
    d = bpy.data.materials["door.paint"].node_tree.nodes["Principled BSDF"]
    d.inputs["Base Color"].default_value = _lin("#f2efe8")
    p = bpy.data.materials.get("door.panel")
    if p:
        p.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = _lin("#e8e4dc")
    # carpet: deep terracotta wool with lighter tips
    cm = bpy.data.materials["carpet"].node_tree
    ramp = [n for n in cm.nodes if n.type == "VALTORGB"][0]
    ramp.color_ramp.elements[0].color = _lin("#5a2416"); ramp.color_ramp.elements[1].color = _lin("#c0603a")
    fl = bpy.data.objects.get("Room.fibres")
    if fl:
        ng = fl.modifiers["fibres"].node_group
        dist = [n for n in ng.nodes if n.bl_idname == "GeometryNodeDistributePointsOnFaces"][0]
        dist.inputs["Density"].default_value = 70000


def skin_detail():
    """Pores and a little oily sheen: a fine bump plus roughness variation on every skin material"""
    for m in bpy.data.materials:
        if not m.node_tree or "skin" not in m.name.lower():
            continue
        nt = m.node_tree
        bs = [n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"]
        if not bs or [n for n in nt.nodes if n.name == "pores"]:
            continue
        b = bs[0]
        tc = nt.nodes.new("ShaderNodeTexCoord")
        nz = nt.nodes.new("ShaderNodeTexNoise"); nz.name = "pores"; nz.inputs["Scale"].default_value = 900; nz.inputs["Detail"].default_value = 8
        bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.12; bump.inputs["Distance"].default_value = 0.0006
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"]); nt.links.new(nz.outputs["Fac"], bump.inputs["Height"])
        prev = b.inputs["Normal"].links[0].from_socket if b.inputs["Normal"].is_linked else None
        if prev:
            nt.links.new(prev, bump.inputs["Normal"])
        nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
        rg = nt.nodes.new("ShaderNodeMapRange"); rg.inputs["To Min"].default_value = 0.38; rg.inputs["To Max"].default_value = 0.55
        nt.links.new(nz.outputs["Fac"], rg.inputs["Value"])
        if not b.inputs["Roughness"].is_linked:
            nt.links.new(rg.outputs["Result"], b.inputs["Roughness"])


def grade():
    sc = bpy.context.scene
    vs = sc.view_settings
    vs.view_transform = "AgX"
    looks = [i.identifier for i in vs.bl_rna.properties["look"].enum_items]
    for want in ("AgX - Medium High Contrast", "AgX - High Contrast", "AgX - Punchy"):
        if want in looks:
            vs.look = want
            break
    vs.exposure = 0.15
    ng = sc.compositing_node_group
    N = ng.nodes
    gl = [n for n in N if n.bl_idname == "CompositorNodeGlare"][0]
    out = [n for n in N if n.bl_idname == "NodeGroupOutput"][0]
    hs = [n for n in N if n.name == "grade.sat"]
    hs = hs[0] if hs else N.new("CompositorNodeHueSat")
    hs.name = "grade.sat"
    for k, v in (("Saturation", 1.18), ("Value", 1.0), ("Hue", 0.5)):
        try:
            hs.inputs[k].default_value = v
        except Exception:
            pass
    ng.links.new(gl.outputs["Image"], hs.inputs["Image"])
    ng.links.new(hs.outputs["Image"], out.inputs[0])
    return vs.look


def renderer(engine="CYCLES", samples=96):
    sc = bpy.context.scene
    if engine == "CYCLES":
        sc.render.engine = "CYCLES"
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        sc.cycles.device = "GPU"
        sc.cycles.samples = samples
        sc.cycles.use_denoising = True
        sc.cycles.denoiser = "OPENIMAGEDENOISE"
        sc.cycles.use_adaptive_sampling = True
        sc.cycles.adaptive_threshold = 0.02
        sc.cycles.max_bounces = 8
        sc.cycles.transparent_max_bounces = 16  # hair cards
        sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False
        sc.render.use_motion_blur = True
    else:
        sc.render.engine = "BLENDER_EEVEE"
        sc.eevee.taa_render_samples = 64


def polish(engine="CYCLES"):
    lighting()
    colours()
    skin_detail()
    look = grade()
    renderer(engine)
    return look
