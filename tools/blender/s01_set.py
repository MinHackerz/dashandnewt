"""Short s01 "Why You Should NEVER Fry a Frozen Turkey" — the set, at real-world scale.

    Blender -b --python tools/blender/s01_set.py
Builds blender/s01_set.blend: close-up studio look (sky-blue backdrop seen by the camera only, Poly Haven studio HDRI
for light and reflections), a concrete patio slab, an outdoor ring burner on a steel stand, a 30-quart aluminium
fryer pot with peanut oil at 350 °F, the frozen turkey (raw-bird scan scaled to a 12–14 lb turkey, frosted), the
propane tank on its hose, a deep-fry thermometer clipped to the pot, the fire extinguisher (for the aftermath) and the
fridge (for the safe-thaw ending), each placed at its real size. Effects are added by s01_fx.py; shots by s01_shots.py.

Physics the set must respect (content/episodes/s01-frozen-turkey.md):
  oil 175 °C (350 °F), density ≈ 0.91 g/mL; water 1.00 g/mL → melt water sinks; water boils at 100 °C, so at the hot
  pot floor it flashes to steam, ~1,700× its volume.
"""
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
A = os.path.join(ROOT, "blender/assets")
SF = os.path.join(A, "sketchfab")
sc = bpy.context.scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
for c in list(bpy.data.collections):
    bpy.data.collections.remove(c)

# ─── real dimensions (m) ───────────────────────────────────────────────────
POT_R, POT_H, WALL = 0.165, 0.40, 0.003  # 30-quart turkey-fryer stockpot: ~33 cm across, 40 cm tall
STAND_H = 0.32  # burner stand height; pot floor sits on the grate
OIL_LEVEL = 0.29  # oil depth with the bird OUT: set (as the water test does) so the bird ends up just covered
TURKEY_LEN = 0.30  # a 12 lb bird standing upright on the fryer's poultry rack
TANK_H, EXT_H, FRIDGE_H, THERMO_L = 0.46, 0.50, 1.80, 0.30
POT_BASE = Vector((0, 0, STAND_H))
OIL_TOP = POT_BASE.z + OIL_LEVEL


def coll(name):
    c = bpy.data.collections.new(name)
    sc.collection.children.link(c)
    return c


def link(o, c):
    for cc in o.users_collection:
        cc.objects.unlink(o)
    c.objects.link(o)
    return o


def node(nt, kind, **kw):
    n = nt.nodes.new(kind)
    for k, v in kw.items():
        if k in n.inputs:
            n.inputs[k].default_value = v
        else:
            setattr(n, k, v)
    return n


def mat(name, color=(0.8, 0.8, 0.8), metallic=0.0, rough=0.5, **extra):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    for k, v in extra.items():
        b.inputs[k].default_value = v
    return m


def smooth(o, level=2, autosmooth=True):
    for p in o.data.polygons:
        p.use_smooth = True
    if level:
        s = o.modifiers.new("smooth", "SUBSURF")
        s.levels, s.render_levels = 1, level
    return o


def mesh_obj(name, build, c, material=None):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    build(bm)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    c.objects.link(o)
    if material:
        o.data.materials.append(material)
    return o


def import_glb(uid, name, c):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SF, uid, "model.glb"))
    new = [o for o in bpy.data.objects if o not in before]
    root = bpy.data.objects.new(name, None)
    c.objects.link(root)
    for o in new:
        link(o, c)
        if o.parent is None:
            o.parent = root
    bpy.context.view_layer.update()
    return root, [o for o in new if o.type == "MESH"]


def fit(root, meshes, size, axis="z", ground=0.0, at=(0, 0)):
    """scale an imported model so its extent along `axis` (or 'max') is `size` m, stand it on `ground`, centred at"""
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    ext = hi - lo
    cur = max(ext) if axis == "max" else ext["xyz".index(axis)]
    s = size / cur
    root.scale = root.scale * s
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    root.location += Vector((at[0] - (lo.x + hi.x) / 2, at[1] - (lo.y + hi.y) / 2, ground - lo.z))
    bpy.context.view_layer.update()
    return hi - lo


# ─── look: backdrop + studio HDRI ──────────────────────────────────────────
w = bpy.data.worlds.new("Studio")
sc.world = w
w.use_nodes = True
nt = w.node_tree
nt.nodes.clear()
out = node(nt, "ShaderNodeOutputWorld")
env = node(nt, "ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(A, "polyhaven/blue_photo_studio/blue_photo_studio_2k.hdr"), check_existing=True)
bg_env = node(nt, "ShaderNodeBackground", Strength=0.8)
nt.links.new(env.outputs["Color"], bg_env.inputs["Color"])
tc = node(nt, "ShaderNodeTexCoord")
sep = node(nt, "ShaderNodeSeparateXYZ")
nt.links.new(tc.outputs["Window"], sep.inputs[0])
ramp = node(nt, "ShaderNodeValToRGB")
ramp.color_ramp.elements[0].color = (0.50, 0.78, 0.98, 1)
ramp.color_ramp.elements[1].color = (0.10, 0.42, 0.88, 1)
nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"])
bg_cam = node(nt, "ShaderNodeBackground", Strength=1.0)
nt.links.new(ramp.outputs["Color"], bg_cam.inputs["Color"])
lp = node(nt, "ShaderNodeLightPath")
mix = node(nt, "ShaderNodeMixShader")
nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
nt.links.new(bg_env.outputs["Background"], mix.inputs[1])
nt.links.new(bg_cam.outputs["Background"], mix.inputs[2])
nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])

# ─── the fryer rig ─────────────────────────────────────────────────────────
RIG = coll("Fryer")
alu = mat("brushed aluminium", (0.80, 0.81, 0.82), metallic=1.0, rough=0.28)
# brushed streaks running around the pot
alu_nt = alu.node_tree
gc = node(alu_nt, "ShaderNodeTexCoord")
mp = node(alu_nt, "ShaderNodeMapping")
mp.inputs["Scale"].default_value = (1.0, 1.0, 900.0)
alu_nt.links.new(gc.outputs["Object"], mp.inputs["Vector"])
nz = node(alu_nt, "ShaderNodeTexNoise", Scale=4.0, Detail=8.0)
alu_nt.links.new(mp.outputs["Vector"], nz.inputs["Vector"])
bp = node(alu_nt, "ShaderNodeBump", Strength=0.08, Distance=0.0002)
alu_nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
alu_nt.links.new(bp.outputs["Normal"], alu_nt.nodes["Principled BSDF"].inputs["Normal"])
steel = mat("black steel", (0.04, 0.04, 0.045), metallic=0.9, rough=0.45)
cast = mat("cast iron", (0.05, 0.045, 0.04), metallic=0.7, rough=0.7)


def pot(bm):
    """open stockpot: lathe a profile (outer wall, rolled rim, inner wall, floor)"""
    prof = [(0.0, 0.0), (POT_R - 0.01, 0.0), (POT_R, 0.01), (POT_R, POT_H - 0.006), (POT_R + 0.004, POT_H),
            (POT_R - WALL, POT_H), (POT_R - WALL, 0.012), (POT_R - WALL - 0.01, WALL), (0.0, WALL)]
    verts = [bm.verts.new((r, 0, z)) for r, z in prof]
    for a, b in zip(verts, verts[1:]):
        bm.edges.new((a, b))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], angle=math.tau, steps=96, axis=(0, 0, 1), cent=(0, 0, 0))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)


POT = smooth(mesh_obj("Pot", pot, RIG, alu), level=1)
POT.location = POT_BASE
# two riveted side handles
for s in (1, -1):
    h = mesh_obj(f"Pot.handle{'R' if s > 0 else 'L'}", lambda bm: bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.008, radius2=0.008, depth=0.09), RIG, alu)
    h.location = POT_BASE + Vector((s * (POT_R + 0.03), 0, POT_H - 0.05))
    h.rotation_euler = (0, 0, 0)
    h.rotation_euler = (math.radians(90), 0, 0)
    smooth(h, level=1)


def ring_burner(bm):
    geo = bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=0.075, radius2=0.06, depth=0.035)
    bmesh.ops.translate(bm, verts=geo["verts"], vec=(0, 0, 0.0175))


BURNER = smooth(mesh_obj("Burner", ring_burner, RIG, cast), level=1)
BURNER.location = (0, 0, STAND_H - 0.12)
# stand: three legs + a square grate the pot sits on
for k in range(3):
    a = math.radians(90 + 120 * k)
    leg = mesh_obj(f"Stand.leg{k}", lambda bm: bmesh.ops.create_cube(bm, size=1.0), RIG, steel)
    leg.scale = (0.022, 0.022, STAND_H)
    leg.location = (0.21 * math.cos(a), 0.21 * math.sin(a), STAND_H / 2)
    leg.rotation_euler = (0, 0, a)
ring = mesh_obj("Stand.ring", lambda bm: bmesh.ops.create_circle(bm, cap_ends=False, segments=64, radius=0.21), RIG, steel)
ring.location = (0, 0, STAND_H - 0.012)
sk = ring.modifiers.new("tube", "SKIN")
for v in ring.data.skin_vertices[0].data:
    v.radius = (0.008, 0.008)
for k in range(4):  # grate bars under the pot
    bar = mesh_obj(f"Stand.bar{k}", lambda bm: bmesh.ops.create_cube(bm, size=1.0), RIG, steel)
    bar.scale = (0.42, 0.012, 0.012)
    bar.location = (0, -0.11 + k * 0.073, STAND_H - 0.006)

# the oil: peanut oil, amber and clear, filling the pot to OIL_LEVEL
oil = bpy.data.materials.new("peanut oil 350F")
oil.use_nodes = True
ob = oil.node_tree.nodes["Principled BSDF"]
ob.inputs["Base Color"].default_value = (1.0, 0.72, 0.28, 1)
ob.inputs["Roughness"].default_value = 0.02
ob.inputs["IOR"].default_value = 1.47
ob.inputs["Transmission Weight"].default_value = 1.0
vol = node(oil.node_tree, "ShaderNodeVolumeAbsorption", Density=9.0)
vol.inputs["Color"].default_value = (0.95, 0.55, 0.12, 1)
oil.node_tree.links.new(vol.outputs["Volume"], oil.node_tree.nodes["Material Output"].inputs["Volume"])
OIL = mesh_obj("Oil", lambda bm: bmesh.ops.create_cone(bm, cap_ends=True, segments=96, radius1=POT_R - WALL - 0.0005, radius2=POT_R - WALL - 0.0005, depth=OIL_LEVEL - WALL), RIG, oil)
OIL.location = POT_BASE + Vector((0, 0, WALL + (OIL_LEVEL - WALL) / 2))
smooth(OIL, level=0)
# shimmering surface: a fine, slowly moving ripple
disp_tex = bpy.data.textures.new("oil ripple", "CLOUDS")
disp_tex.noise_scale = 0.012
OIL["surface_top"] = OIL_TOP

# ─── downloaded props at real size ─────────────────────────────────────────
PROPS = coll("Props")
turkey, tm = import_glb("82c92a43fe0e4320bbbeba86dc0858a0", "Turkey", PROPS)
turkey.rotation_euler = (math.radians(90), 0, 0)  # long axis upright, as it sits on a fryer rack
bpy.context.view_layer.update()
fit(turkey, tm, TURKEY_LEN, axis="z", ground=0.0, at=(0, 0))
# re-centre on the root so s01_fx can move the bird by its root (bottom of the bird at the root's origin)
bpy.context.view_layer.update()
pts = [o.matrix_world @ Vector(c) for o in tm for c in o.bound_box]
lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
print("TURKEY footprint m", round(hi.x - lo.x, 3), round(hi.y - lo.y, 3), "height", round(hi.z - lo.z, 3))
turkey["height"] = hi.z - lo.z
turkey["half_w"] = max(hi.x - lo.x, hi.y - lo.y) / 2
tank, km = import_glb("d0fd95adb402424c84ef6f715d529363", "PropaneTank", PROPS)
fit(tank, km, TANK_H, ground=0.0, at=(0.55, 0.15))
ext, em = import_glb("5676b179b3b744c0aaae53a3dcea2300", "Extinguisher", PROPS)
fit(ext, em, EXT_H, ground=0.0, at=(-0.55, -0.1))
fridge, fm = import_glb("35793d480f784aa5ab3549eca2160e65", "Fridge", PROPS)
fit(fridge, fm, FRIDGE_H, ground=0.0, at=(4.0, 0.0))  # kept in the file; not shown (the thaw is a studio time-lapse)
for o in [fridge] + fm:
    o.hide_render = True
thermo, hm = import_glb("ec924e5d71634c60801b247beb5f4f76", "Thermometer", PROPS)
fit(thermo, hm, THERMO_L, axis="max", ground=0.0, at=(0, 0))
thermo.rotation_euler = (0, math.radians(-90 + 12), 0)  # probe down into the oil, leaning on the rim
bpy.context.view_layer.update()
thermo.location = POT_BASE + Vector((-POT_R + 0.03, 0.06, POT_H - 0.12))
thermo_steel = mat("thermometer steel", (0.85, 0.85, 0.87), metallic=1.0, rough=0.2)
for o in hm:
    o.data.materials.clear()
    o.data.materials.append(thermo_steel)

# frost on the turkey: white crystalline coat on top of the scan's own skin texture
for m in {m for o in tm for m in o.data.materials if m and m.node_tree}:  # the 12 scan parts share one material
    if True:
        nt2 = m.node_tree
        b = [n for n in nt2.nodes if n.type == "BSDF_PRINCIPLED"][0]
        src = b.inputs["Base Color"].links[0].from_socket if b.inputs["Base Color"].is_linked else None
        tco = node(nt2, "ShaderNodeTexCoord")
        fr = node(nt2, "ShaderNodeTexVoronoi", Scale=320.0)
        nt2.links.new(tco.outputs["Object"], fr.inputs["Vector"])
        mr = node(nt2, "ShaderNodeMapRange")
        mr.inputs["From Min"].default_value = 0.0; mr.inputs["From Max"].default_value = 0.35
        mr.inputs["To Min"].default_value = 0.75; mr.inputs["To Max"].default_value = 0.2
        nt2.links.new(fr.outputs["Distance"], mr.inputs["Value"])
        frost = node(nt2, "ShaderNodeValue")
        frost.name = "Frost"; frost.label = "Frost (1 frozen → 0 thawed)"
        frost.outputs[0].default_value = 1.0
        # patches: frost collects in a broken, blotchy layer, not an even coat
        patch = node(nt2, "ShaderNodeTexNoise", Scale=5.0, Detail=4.0, Roughness=0.5)
        nt2.links.new(tco.outputs["Object"], patch.inputs["Vector"])
        pr = node(nt2, "ShaderNodeMapRange")
        pr.inputs["From Min"].default_value = 0.3; pr.inputs["From Max"].default_value = 0.7
        pr.inputs["To Min"].default_value = 0.45; pr.inputs["To Max"].default_value = 1.0
        nt2.links.new(patch.outputs["Fac"], pr.inputs["Value"])
        pm = node(nt2, "ShaderNodeMath", operation="MULTIPLY")
        nt2.links.new(mr.outputs["Result"], pm.inputs[0]); nt2.links.new(pr.outputs["Result"], pm.inputs[1])
        amt = node(nt2, "ShaderNodeMath", operation="MULTIPLY")
        nt2.links.new(pm.outputs[0], amt.inputs[0]); nt2.links.new(frost.outputs[0], amt.inputs[1])
        mixc = node(nt2, "ShaderNodeMix", data_type="RGBA")
        nt2.links.new(amt.outputs[0], mixc.inputs["Factor"])
        if src:  # raw poultry skin: paler and less saturated than the scan's orange cast
            hs = node(nt2, "ShaderNodeHueSaturation")
            hs.inputs["Saturation"].default_value = 1.25; hs.inputs["Value"].default_value = 0.78
            nt2.links.new(src, hs.inputs["Color"])
            nt2.links.new(hs.outputs["Color"], mixc.inputs[6])
        else:
            mixc.inputs[6].default_value = b.inputs["Base Color"].default_value
        mixc.inputs[7].default_value = (0.86, 0.92, 1.0, 1)
        nt2.links.new(mixc.outputs[2], b.inputs["Base Color"])
        rmix = node(nt2, "ShaderNodeMapRange")
        nt2.links.new(amt.outputs[0], rmix.inputs["Value"])
        rmix.inputs["To Min"].default_value = 0.45; rmix.inputs["To Max"].default_value = 0.18
        nt2.links.new(rmix.outputs["Result"], b.inputs["Roughness"])
        bump = node(nt2, "ShaderNodeBump", Strength=0.4, Distance=0.0006)
        nt2.links.new(fr.outputs["Distance"], bump.inputs["Height"])
        if b.inputs["Normal"].is_linked:
            nt2.links.new(b.inputs["Normal"].links[0].from_socket, bump.inputs["Normal"])
        nt2.links.new(bump.outputs["Normal"], b.inputs["Normal"])
        if "Coat Weight" in b.inputs:
            nt2.links.new(amt.outputs[0], b.inputs["Coat Weight"])

# patio slab under the fryer
pad = mat("patio concrete", (0.55, 0.53, 0.5), rough=0.85)
pn = pad.node_tree
cn = node(pn, "ShaderNodeTexNoise", Scale=40.0, Detail=12.0)
cb = node(pn, "ShaderNodeBump", Strength=0.25, Distance=0.002)
pn.links.new(cn.outputs["Fac"], cb.inputs["Height"]); pn.links.new(cb.outputs["Normal"], pn.nodes["Principled BSDF"].inputs["Normal"])
slab = mesh_obj("Patio", lambda bm: bmesh.ops.create_cube(bm, size=1.0), RIG, pad)
slab.scale = (1.6, 1.2, 0.04)
slab.location = (0, 0.1, -0.02)

# propane hose: tank valve → burner
hose_pts = [Vector((0.52, 0.13, TANK_H - 0.03)), Vector((0.42, 0.05, 0.08)), Vector((0.2, 0.0, 0.05)), Vector((0.06, 0.0, STAND_H - 0.12))]
cu = bpy.data.curves.new("Hose", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.006; cu.bevel_resolution = 4
sp = cu.splines.new("BEZIER"); sp.bezier_points.add(len(hose_pts) - 1)
for bpt, p in zip(sp.bezier_points, hose_pts):
    bpt.co = p; bpt.handle_left_type = bpt.handle_right_type = "AUTO"
hose = bpy.data.objects.new("Hose", cu); RIG.objects.link(hose)
hose.data.materials.append(mat("rubber hose", (0.02, 0.02, 0.02), rough=0.6))

# ─── render defaults (Cycles, GPU) ─────────────────────────────────────────
sc.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "METAL"; prefs.get_devices()
    for dv in prefs.devices:
        dv.use = True
    sc.cycles.device = "GPU"
except Exception as ex:
    print("GPU setup failed:", ex)
sc.cycles.samples = 64
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 10
sc.cycles.transmission_bounces = 10
sc.view_settings.view_transform = "AgX"
sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
sc.render.fps = 30
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/s01_set.blend"))
print("SET BUILT", {k: round(v, 3) for k, v in dict(oil_top=OIL_TOP, pot_top=POT_BASE.z + POT_H).items()})
