"""s01 eruption + fire: Mantaflow simulations, baked into blender/cache/s01/ (git-ignored).

    Blender -b blender/s01.blend --python tools/blender/s01_sims.py -- [res_liquid] [res_fire]
Then saves blender/s01.blend again with the sims attached.

Physics (content/episodes/s01-frozen-turkey.md):
  * the steam formed at the floor (×1,700 its water volume) has to go somewhere: it lifts the oil. Modelled as an
    upward inflow from the pot floor that adds the oil-steam froth's extra volume (≈ 20 L over ~1.2 s, from the moment
    the narration says "shoves"), so the level climbs the 4.7 cm of headroom, crests the rim on "over" and runs down
    the outside under gravity (Mantaflow, real G and real sizes);
  * the oil that reaches the burner ignites (oil's flash point ≈ 315 °C is far below a gas flame's ~1,900 °C): a fire
    simulation starts where it lands, around the burner and up the oily outside of the pot.
"""
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
C = json.load(open(os.path.join(ROOT, "tools/blender/s01_times.json")))["CUE"]
FPS = C["fps"]
F = lambda t: int(round(t * FPS)) + 1
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
RES_L = int(argv[0]) if argv else 96
RES_F = int(argv[1]) if len(argv) > 1 else 96
CACHE = os.path.join(ROOT, "blender/cache/s01")
sc = bpy.context.scene
OIL = bpy.data.objects["Oil"]
POT = bpy.data.objects["Pot"]
OT = OIL["surface_top"] + 0.063  # oil level with the bird in
POT_BASE = POT.location.copy()
FLOOR = POT_BASE.z + 0.003
RIM = POT_BASE.z + 0.40
T0_L, T1_L = C["shoves"] - 0.4, C["fires"] + 1.0  # liquid sim span
T_PUSH0, T_PUSH1 = C["over"] - 0.45, C["over"] + 0.9  # the steam push (oil crests the rim on "over")
T_FIRE0, T_FIRE1 = C["over"] + 0.85, C["thaw"] - 0.35  # the spill reaches the flame ~0.3 s after cresting (free fall 0.5 m)

coll = bpy.data.collections.get("Sims") or bpy.data.collections.new("Sims")
if coll.name not in sc.collection.children:
    sc.collection.children.link(coll)
for o in list(coll.objects):
    bpy.data.objects.remove(o, do_unlink=True)


def mk(name, build, hidden=True):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    build(bm)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    coll.objects.link(o)
    o.hide_render = hidden
    o.display_type = "WIRE" if hidden else "TEXTURED"
    return o


def box(bm, lo, hi):
    bmesh.ops.create_cube(bm, size=1.0)
    c = (Vector(lo) + Vector(hi)) / 2
    s = Vector(hi) - Vector(lo)
    bmesh.ops.scale(bm, vec=s, verts=bm.verts)
    bmesh.ops.translate(bm, vec=c, verts=bm.verts)


def tube(bm, r_in, r_out, z0, z1, seg=64, floor=False):
    prof = [(r_in, z1), (r_out, z1), (r_out, z0), ((0.0 if floor else r_in), z0)]
    if floor:
        prof = [(r_in, z1), (r_out, z1), (r_out, z0), (0.0, z0), (0.0, z0 + 0.025), (r_in, z0 + 0.025)]
    vs = [bm.verts.new((r, 0, z)) for r, z in prof]
    for a, b in zip(vs, vs[1:] + vs[:1]):
        bm.edges.new((a, b))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], angle=math.tau, steps=seg, axis=(0, 0, 1), cent=(0, 0, 0))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)


def fluid(o, kind):
    m = o.modifiers.new("Fluid", "FLUID")
    m.fluid_type = kind
    return m


# ─── liquid: the oil eruption ──────────────────────────────────────────────
dom = mk("Sim.oil_domain", lambda bm: box(bm, (-0.46, -0.46, 0.0), (0.46, 0.46, 0.92)), hidden=False)
d = fluid(dom, "DOMAIN").domain_settings
d.domain_type = "LIQUID"
d.resolution_max = RES_L
d.use_mesh = True
d.mesh_scale = 2
d.use_spray_particles = False
d.cache_directory = os.path.join(CACHE, "oil")
d.cache_type = "ALL"
d.cache_frame_start, d.cache_frame_end = F(T0_L), F(T1_L)
d.time_scale = 1.0
d.use_adaptive_timesteps = True
d.cfl_condition = 2.0
d.timesteps_max = 8
d.flip_ratio = 0.97
for side in ("x_min", "x_max", "y_min", "y_max", "z_max"):
    pass  # domain borders stay open (liquid leaving the box disappears) except the floor
d.use_collision_border_bottom = True
oil_m = bpy.data.materials["peanut oil 350F"]
dom.data.materials.append(oil_m)
# the oil starts as the pot's contents with the bird in
src = mk("Sim.oil_start", lambda bm: tube(bm, 0.0, 0.158, FLOOR + 0.004, OT, floor=False))
fs = fluid(src, "FLOW").flow_settings
fs.flow_type = "LIQUID"; fs.flow_behavior = "GEOMETRY"; fs.flow_source = "MESH"
# the steam push: an upward inflow off the floor, around the rack plate
push = mk("Sim.steam_push", lambda bm: tube(bm, 0.125, 0.155, FLOOR + 0.004, FLOOR + 0.03))
ps = fluid(push, "FLOW").flow_settings
ps.flow_type = "LIQUID"; ps.flow_behavior = "INFLOW"; ps.flow_source = "MESH"
ps.use_initial_velocity = True
ps.velocity_coord = (0.0, 0.0, 2.4)
for t, on in ((T0_L, False), (T_PUSH0, True), (T_PUSH1, False)):
    ps.use_inflow = on
    ps.keyframe_insert("use_inflow", frame=F(t))
# obstacles: a thick proxy of the pot (the real wall is 3 mm, thinner than a cell), the bird, burner, stand, patio
pot_c = mk("Sim.pot_proxy", lambda bm: tube(bm, 0.160, 0.19, POT_BASE.z - 0.03, RIM, floor=True))
fluid(pot_c, "EFFECTOR").effector_settings.use_effector = True
bird = mk("Sim.bird_proxy", lambda bm: bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=16, radius=1.0))
bird.scale = (0.105, 0.075, 0.14)
bird.location = (0, 0, FLOOR + 0.035 + 0.15)
fluid(bird, "EFFECTOR")
ground = mk("Sim.ground", lambda bm: box(bm, (-0.6, -0.6, -0.02), (0.6, 0.6, 0.0)))
fluid(ground, "EFFECTOR")
burner = mk("Sim.burner_proxy", lambda bm: tube(bm, 0.0, 0.08, 0.2, 0.235, floor=False))
fluid(burner, "EFFECTOR")

# ─── fire: where the oil lands ─────────────────────────────────────────────
fdom = mk("Sim.fire_domain", lambda bm: box(bm, (-0.8, -0.8, 0.0), (0.8, 0.8, 2.3)), hidden=False)
g = fluid(fdom, "DOMAIN").domain_settings
g.domain_type = "GAS"
g.resolution_max = RES_F
g.use_noise = False
g.cache_directory = os.path.join(CACHE, "fire")
g.cache_type = "ALL"
g.cache_frame_start, g.cache_frame_end = F(T_FIRE0 - 0.1), F(T_FIRE1)
g.use_adaptive_timesteps = True
g.vorticity = 0.25
g.burning_rate = 0.65
g.flame_smoke = 0.5
g.flame_vorticity = 0.7
g.flame_ignition = 1.25
g.flame_max_temp = 4.0
g.alpha = 1.2  # buoyancy from density
g.beta = 2.2  # buoyancy from heat
g.dissolve_speed = 25
g.use_dissolve_smoke = True
for side in ("use_collision_border_bottom",):
    setattr(g, side, True)
pv = bpy.data.materials.new("fire volume")
pv.use_nodes = True
pn = pv.node_tree
pn.nodes.clear()
outn = pn.nodes.new("ShaderNodeOutputMaterial")
vol = pn.nodes.new("ShaderNodeVolumePrincipled")
vol.inputs["Color"].default_value = (0.03, 0.028, 0.026, 1)  # soot: dark
vol.inputs["Absorption Color"].default_value = (0.0, 0.0, 0.0, 1)
fa = pn.nodes.new("ShaderNodeAttribute"); fa.attribute_name = "flame"
da = pn.nodes.new("ShaderNodeAttribute"); da.attribute_name = "density"
ramp = pn.nodes.new("ShaderNodeValToRGB")  # flame colour by reaction strength: deep red → orange → yellow-white core
cr = ramp.color_ramp
cr.elements[0].position = 0.0; cr.elements[0].color = (0.0, 0.0, 0.0, 1)
cr.elements[1].position = 1.0; cr.elements[1].color = (1.0, 0.6, 0.12, 1)
e = cr.elements.new(0.2); e.color = (0.75, 0.06, 0.0, 1)
e = cr.elements.new(0.5); e.color = (1.0, 0.28, 0.01, 1)
pn.links.new(fa.outputs["Fac"], ramp.inputs["Fac"])
pn.links.new(ramp.outputs["Color"], vol.inputs["Emission Color"])
es = pn.nodes.new("ShaderNodeMath"); es.operation = "MULTIPLY"; es.inputs[1].default_value = 25.0
pn.links.new(fa.outputs["Fac"], es.inputs[0]); pn.links.new(es.outputs[0], vol.inputs["Emission Strength"])
dm = pn.nodes.new("ShaderNodeMath"); dm.operation = "MULTIPLY"; dm.inputs[1].default_value = 2.5
pn.links.new(da.outputs["Fac"], dm.inputs[0]); pn.links.new(dm.outputs[0], vol.inputs["Density"])
vol.inputs["Blackbody Intensity"].default_value = 0.0
pn.links.new(vol.outputs["Volume"], outn.inputs["Volume"])
fdom.data.materials.append(pv)
# burning spill: a puddle ring on the patio round the stand + the oily outside of the pot
puddle = mk("Sim.fire_puddle", lambda bm: tube(bm, 0.12, 0.42, 0.0, 0.03, seg=48))
pot_out = mk("Sim.fire_potside", lambda bm: tube(bm, 0.186, 0.2, POT_BASE.z + 0.02, RIM, seg=48))
for o, fuel in ((puddle, 3.0), (pot_out, 2.2)):
    fl = fluid(o, "FLOW").flow_settings
    fl.flow_type = "BOTH"; fl.flow_behavior = "INFLOW"; fl.flow_source = "MESH"
    fl.fuel_amount = fuel
    fl.smoke_color = (0.12, 0.11, 0.1)
    fl.temperature = 3.0
    fl.surface_distance = 1.0
    for t, on in ((0, False), (T_FIRE0, True), (T_FIRE1 - 0.3, False)):
        fl.use_inflow = on
        fl.keyframe_insert("use_inflow", frame=F(t))

# the static oil hides while the simulated oil takes over; the fire lights the scene
for o, t_on, t_off in ((dom, T0_L, T1_L), (fdom, T_FIRE0, T_FIRE1)):
    o.hide_render = True; o.keyframe_insert("hide_render", frame=1)
    o.hide_render = False; o.keyframe_insert("hide_render", frame=F(t_on))
    o.hide_render = True; o.keyframe_insert("hide_render", frame=F(t_off))
OIL.hide_render = False; OIL.keyframe_insert("hide_render", frame=1)
OIL.hide_render = True; OIL.keyframe_insert("hide_render", frame=F(T0_L))
OIL.hide_render = False; OIL.keyframe_insert("hide_render", frame=F(T1_L))
fl_d = bpy.data.lights.new("Fire.light", "POINT"); fl_d.color = (1.0, 0.55, 0.2); fl_d.shadow_soft_size = 0.3
fl_o = bpy.data.objects.new("Fire.light", fl_d); coll.objects.link(fl_o); fl_o.location = (0.0, -0.25, 0.75)
for f in range(1, F(C["end"]) + 1, 2):
    t = (f - 1) / FPS
    k = 0.0 if t < T_FIRE0 or t > T_FIRE1 else min(1.0, (t - T_FIRE0) / 0.4) * (0.75 + 0.25 * math.sin(t * 31) * math.sin(t * 13))
    fl_d.energy = 250 * k
    fl_d.keyframe_insert("energy", frame=f)


def bake(domain):
    bpy.context.view_layer.objects.active = domain
    for o in bpy.context.view_layer.objects:
        o.select_set(o == domain)
    with bpy.context.temp_override(active_object=domain, object=domain, selected_objects=[domain]):
        bpy.ops.fluid.free_all()
        bpy.ops.fluid.bake_all()


import time
for name, domain in (("oil", dom), ("fire", fdom)):
    t0 = time.time()
    bake(domain)
    print(f"BAKED {name} res={(RES_L if name == 'oil' else RES_F)} in {time.time() - t0:.0f} s")
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/s01.blend"))
print("SIMS DONE", dict(push=(T_PUSH0, T_PUSH1), fire=(T_FIRE0, T_FIRE1), oil_level=round(OT, 3), rim=round(RIM, 3)))
