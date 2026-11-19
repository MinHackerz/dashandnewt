"""Ep13 sample (3 s): the room, the shuffle, the camera push to the shoe, the first electrons.

Run inside Blender after realcast.py has built DashReal and NewtReal:
    exec(open(".../tools/blender/ep13_sample_scene.py").read()); build_sample()
The room here is a stand-in (procedural carpet, plaster wall, door); swap in BlenderKit assets when logged in.
"""
import math
import random
import bpy
import bmesh
from mathutils import Vector, Matrix, Quaternion

FPS = 30
FRAMES = 90
ROOM = "Room"


def _coll(name):
    c = bpy.data.collections.get(name)
    if not c:
        c = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(c)
    return c


def _lin(h):
    h = h.lstrip("#")
    s = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in s) + (1.0,)


def _clear(prefix):
    for o in list(bpy.data.objects):
        if o.name.startswith(prefix):
            bpy.data.objects.remove(o, do_unlink=True)


def _obj(name, me, coll, mat=None):
    o = bpy.data.objects.new(name, me)
    coll.objects.link(o)
    if mat:
        o.data.materials.append(mat)
    return o


def _box(name, size, loc, mat, coll):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    bm.to_mesh(me); bm.free()
    o = _obj(name, me, coll, mat)
    o.location = loc
    return o


def _mat(name, color, rough=0.6, **kw):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = _lin(color)
    b.inputs["Roughness"].default_value = rough
    for k, v in kw.items():
        b.inputs[k].default_value = v
    return m


# ─── the room ──────────────────────────────────────────────────────────────
def carpet_material():
    m = bpy.data.materials.get("carpet") or bpy.data.materials.new("carpet")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Roughness"].default_value = 1.0
    b.inputs["Sheen Weight"].default_value = 1.0
    b.inputs["Sheen Roughness"].default_value = 0.4
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n1 = nt.nodes.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = 900; n1.inputs["Detail"].default_value = 4
    n2 = nt.nodes.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = 6
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = _lin("#6e3f2c"); ramp.color_ramp.elements[1].color = _lin("#b8734f")
    mix = nt.nodes.new("ShaderNodeMath"); mix.operation = "MULTIPLY_ADD"; mix.inputs[1].default_value = 0.7; mix.inputs[2].default_value = 0.15
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.8; bump.inputs["Distance"].default_value = 0.002
    nt.links.new(tc.outputs["Object"], n1.inputs["Vector"]); nt.links.new(tc.outputs["Object"], n2.inputs["Vector"])
    nt.links.new(n1.outputs["Fac"], mix.inputs[0]); nt.links.new(mix.outputs[0], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(n1.outputs["Fac"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    nt.links.new(n2.outputs["Fac"], b.inputs["Sheen Tint"]) if False else None
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return m


def fibre_patch(coll, mat, x0, x1, y0, y1, density=36000):
    """Real carpet pile where the camera gets close: thin tapered fibres instanced on a patch"""
    me = bpy.data.meshes.new("Room.fibres.base")
    bm = bmesh.new()
    v = [bm.verts.new((x0, y0, 0.0005)), bm.verts.new((x1, y0, 0.0005)), bm.verts.new((x1, y1, 0.0005)), bm.verts.new((x0, y1, 0.0005))]
    bm.faces.new(v)
    bm.to_mesh(me); bm.free()
    o = _obj("Room.fibres", me, coll)
    ng = bpy.data.node_groups.new("carpet_fibres", "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N = ng.nodes
    gi = N.new("NodeGroupInput"); go = N.new("NodeGroupOutput")
    dist = N.new("GeometryNodeDistributePointsOnFaces"); dist.inputs["Density"].default_value = density
    cone = N.new("GeometryNodeMeshCone"); cone.inputs["Vertices"].default_value = 5
    cone.inputs["Radius Top"].default_value = 0.0004; cone.inputs["Radius Bottom"].default_value = 0.0014; cone.inputs["Depth"].default_value = 0.013
    tr = N.new("GeometryNodeTransform"); tr.inputs["Translation"].default_value = (0, 0, 0.0065)
    inst = N.new("GeometryNodeInstanceOnPoints")
    def sock(node, name, kind, out=False):
        return [x for x in (node.outputs if out else node.inputs) if x.name == name and x.type == kind and x.enabled][0] if not out else [x for x in node.outputs if x.type == kind and x.enabled][0]
    rrot = N.new("FunctionNodeRandomValue"); rrot.data_type = "FLOAT_VECTOR"
    sock(rrot, "Min", "VECTOR").default_value = (-0.35, -0.35, 0); sock(rrot, "Max", "VECTOR").default_value = (0.35, 0.35, 6.28)
    rsc = N.new("FunctionNodeRandomValue"); rsc.data_type = "FLOAT"
    sock(rsc, "Min", "VALUE").default_value = 0.7; sock(rsc, "Max", "VALUE").default_value = 1.3
    setm = N.new("GeometryNodeSetMaterial"); setm.inputs["Material"].default_value = mat
    L = ng.links
    L.new(gi.outputs[0], dist.inputs["Mesh"])
    L.new(cone.outputs["Mesh"], tr.inputs["Geometry"])
    L.new(dist.outputs["Points"], inst.inputs["Points"])
    L.new(tr.outputs["Geometry"], inst.inputs["Instance"])
    L.new(sock(rrot, "", "VECTOR", out=True), inst.inputs["Rotation"])
    L.new(sock(rsc, "", "VALUE", out=True), inst.inputs["Scale"])
    L.new(inst.outputs["Instances"], setm.inputs["Geometry"])
    L.new(setm.outputs["Geometry"], go.inputs[0])
    mod = o.modifiers.new("fibres", "NODES")
    mod.node_group = ng
    return o


def build_room():
    _clear("Room.")
    coll = _coll(ROOM)
    carpet = carpet_material()
    me = bpy.data.meshes.new("Room.floor")
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=5.0); bm.to_mesh(me); bm.free()
    floor = _obj("Room.floor", me, coll, carpet)
    floor.location = (0.8, -1.5, 0)
    fibre_patch(coll, carpet, -0.4, 2.0, -0.55, 0.45)
    # the wall behind them: warm plaster, white skirting, a picture
    plaster = bpy.data.materials.get("plaster") or bpy.data.materials.new("plaster")
    plaster.use_nodes = True
    pb = plaster.node_tree.nodes["Principled BSDF"]
    pb.inputs["Base Color"].default_value = _lin("#efe0c4"); pb.inputs["Roughness"].default_value = 0.85
    if not [n for n in plaster.node_tree.nodes if n.type == "TEX_NOISE"]:
        nz = plaster.node_tree.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 40
        bp = plaster.node_tree.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.15
        plaster.node_tree.links.new(nz.outputs["Fac"], bp.inputs["Height"]); plaster.node_tree.links.new(bp.outputs["Normal"], pb.inputs["Normal"])
    _box("Room.wall", (8, 0.1, 3.0), (0.8, 1.0, 1.5), plaster, coll)
    _box("Room.ceiling", (8, 6, 0.1), (0.8, -2.0, 3.0), _mat("ceiling", "#f4efe6", 0.9), coll)
    _box("Room.skirting", (8, 0.03, 0.12), (0.8, 0.94, 0.06), _mat("skirting", "#f6f3ec", 0.4), coll)
    # the door (painted wood) with a chrome lever handle — the one that will ZAP him
    door = _mat("door.paint", "#2f6f7a", 0.45, **{"Coat Weight": 0.3})
    _box("Room.door.frame", (1.06, 0.06, 2.16), (2.25, 0.955, 1.08), _mat("frame", "#f6f3ec", 0.4), coll)
    _box("Room.door", (0.9, 0.05, 2.04), (2.25, 0.92, 1.02), door, coll)
    for i, z in enumerate((0.45, 1.25)):
        _box(f"Room.door.panel{i}", (0.68, 0.01, 0.6), (2.25, 0.893, z + 0.15), _mat("door.panel", "#285f69", 0.5), coll)
    chrome = _mat("chrome", "#e8e8e8", 0.12, Metallic=1.0)
    _box("Room.handle.rose", (0.07, 0.02, 0.07), (1.92, 0.885, 1.0), chrome, coll)
    _box("Room.handle.lever", (0.13, 0.025, 0.022), (1.98, 0.865, 1.0), chrome, coll)
    _box("Room.picture", (0.7, 0.03, 0.5), (0.2, 0.94, 1.7), _mat("picture.frame", "#3b2a1e", 0.5), coll)
    _box("Room.picture.art", (0.6, 0.01, 0.4), (0.2, 0.925, 1.7), _mat("picture.art", "#7fb6d9", 0.6), coll)
    return coll


# ─── lights, colour, render ────────────────────────────────────────────────
def setup_look():
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1080, 1920, 100
    sc.render.fps = FPS
    sc.frame_start, sc.frame_end = 1, FRAMES
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Punchy"
    sc.eevee.taa_render_samples = 48
    sc.eevee.use_raytracing = True
    sc.eevee.use_shadows = True
    sc.render.use_motion_blur = True
    coll = _coll(ROOM)
    for n in ("Room.window", "Room.fill", "Room.rim"):
        o = bpy.data.objects.get(n)
        if o:
            bpy.data.objects.remove(o, do_unlink=True)
    def area(name, loc, target, energy, size, color):
        ld = bpy.data.lights.new(name, "AREA"); ld.energy = energy; ld.size = size; ld.color = color
        o = bpy.data.objects.new(name, ld); coll.objects.link(o)
        o.location = loc; o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        return o
    area("Room.window", (-2.4, -1.2, 2.2), (0.6, 0.2, 0.8), 1400, 2.2, (1.0, 0.88, 0.72))  # warm window light
    area("Room.fill", (1.5, -4.0, 1.6), (0.8, 0, 1.0), 260, 3.0, (0.8, 0.88, 1.0))
    area("Room.rim", (2.8, 2.4, 2.4), (0.6, 0, 1.2), 500, 1.5, (1.0, 0.95, 0.9))
    for n in ("Light", "Sun.key", "lookdev.floor"):
        o = bpy.data.objects.get(n)
        if o:
            o.hide_render = True; o.hide_viewport = True
    w = sc.world.node_tree.nodes["Background"]
    w.inputs["Color"].default_value = (0.45, 0.4, 0.36, 1); w.inputs["Strength"].default_value = 0.35


# ─── posing (rotations given in armature space, turned into bone-local quaternions) ──
def _set(pb, axis, deg, frame=None, base=None):
    M = pb.bone.matrix_local.to_3x3()
    R = Matrix.Rotation(math.radians(deg), 3, axis)
    q = (M.inverted() @ R @ M).to_quaternion()
    if base is not None:
        q = q @ base
    pb.rotation_mode = "QUATERNION"
    pb.rotation_quaternion = q
    if frame is not None:
        pb.keyframe_insert("rotation_quaternion", frame=frame)


def _q(pb, axis, deg):
    M = pb.bone.matrix_local.to_3x3()
    return (M.inverted() @ Matrix.Rotation(math.radians(deg), 3, axis) @ M).to_quaternion()


def _aim(pb, target, parent_R=None):
    """Turn a bone so its axis points along `target` (armature space). parent_R: the armature-space
    rotation already applied to its parent chain. Returns this bone's armature-space rotation."""
    M = pb.bone.matrix_local.to_3x3()
    d0 = (M @ Vector((0, 1, 0))).normalized()
    pr = parent_R or Matrix.Identity(3)
    want = (pr.inverted() @ Vector(target)).normalized()
    R = d0.rotation_difference(want).to_matrix()
    pb.rotation_mode = "QUATERNION"
    pb.rotation_quaternion = (M.inverted() @ R @ M).to_quaternion()
    return pr @ R


def relax_arms(rig, frame=None, swing=0.0, elbow=18.0, parent_R=None):
    """Arms hanging at the sides (a touch out), swinging `swing` deg forward/back, elbows bent `elbow` deg forward.
    Armature space: +X = character's left, -Y = front, +Z = up."""
    P = rig.pose.bones
    for side, sx, sg in (("L", 1, 1), ("R", -1, -1)):
        up = Matrix.Rotation(math.radians(-swing * sg), 3, "X") @ Vector((0.16 * sx, 0.0, -1.0)).normalized()
        fore = Matrix.Rotation(math.radians(-elbow), 3, "X") @ up
        Ru = _aim(P[f"upperarm01.{side}"], up, parent_R)
        P[f"upperarm02.{side}"].rotation_mode = "QUATERNION"
        P[f"upperarm02.{side}"].rotation_quaternion = (1, 0, 0, 0)
        _aim(P[f"lowerarm01.{side}"], fore, Ru)
        if frame is not None:
            for b in (f"upperarm01.{side}", f"upperarm02.{side}", f"lowerarm01.{side}"):
                P[b].keyframe_insert("rotation_quaternion", frame=frame)


def animate_dash(rig, x0=-0.15, speed=0.32, period=24):
    """The shuffle: tiny sliding steps (feet barely leave the carpet), a little bob and arm swing"""
    rig.rotation_euler = (0, 0, math.radians(90))  # face +X, toward the door
    P = rig.pose.bones
    for f in range(1, FRAMES + 1):
        t = (f - 1) / FPS
        ph = 2 * math.pi * (f - 1) / period
        s = math.sin(ph)
        rig.location = (x0 + speed * t, 0.0, 0.004 * abs(math.cos(ph)))
        rig.keyframe_insert("location", frame=f)
        _set(P["upperleg01.L"], "X", -9 * s, f)
        _set(P["upperleg01.R"], "X", 9 * s, f)
        _set(P["lowerleg01.L"], "X", 10 + 8 * max(0, s), f)
        _set(P["lowerleg01.R"], "X", 10 + 8 * max(0, -s), f)
        _set(P["foot.L"], "X", -4 * s, f)
        _set(P["foot.R"], "X", 4 * s, f)
        _set(P["spine03"], "X", -4, f)
        _set(P["head"], "X", 6 + 1.5 * math.sin(ph * 2), f)
        relax_arms(rig, f, swing=7 * s, elbow=22)
    rig.keyframe_insert("rotation_euler", frame=1)


def pose_newt(rig, at=(1.55, 0.35, 0), face_deg=-50):
    rig.location = at
    rig.rotation_euler = (0, 0, math.radians(face_deg))  # turned to watch Dash
    P = rig.pose.bones
    for f in (1, FRAMES):
        relax_arms(rig, f, swing=0, elbow=12)
        _set(P["head"], "X", 8 + (2 if f == FRAMES else 0), f)
        _set(P["spine03"], "Y", 3, f)


# ─── the electrons: blue sparks hopping from the carpet onto the shoe ───────
def electron_material():
    m = bpy.data.materials.get("electron") or bpy.data.materials.new("electron")
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (0.25, 0.75, 1.0, 1); em.inputs["Strength"].default_value = 40
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    return m


def electrons(rig, count=36, start=42, seed=13):
    _clear("Electron.")
    coll = _coll("Electrons")
    mat = electron_material()
    me = bpy.data.meshes.new("Electron.mesh")
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0); bm.to_mesh(me); bm.free()
    rnd = random.Random(seed)
    sc = bpy.context.scene
    foot = rig.pose.bones["foot.R"]  # his right foot is the camera side (he faces +X, camera at -Y)
    # sample the shoe position through the shot first
    shoe = {}
    for f in range(start, FRAMES + 1):
        sc.frame_set(f)
        shoe[f] = rig.matrix_world @ foot.head
    for i in range(count):
        o = bpy.data.objects.new(f"Electron.{i:02d}", me)
        coll.objects.link(o)
        o.data.materials.append(mat)
        r = rnd.uniform(0.0022, 0.0035)
        o.scale = (r, r, r)
        born = rnd.randint(start, FRAMES - 12)
        hop = rnd.randint(9, 15)
        # from the carpet fibres around the shoe (camera side), onto the shoe's side
        off = Vector((rnd.uniform(-0.08, 0.2), rnd.uniform(-0.13, -0.07), 0.014 - 0.09))
        stick = Vector((rnd.uniform(-0.05, 0.17), rnd.uniform(-0.065, -0.05), rnd.uniform(-0.07, -0.02)))
        for f in range(start - 1, FRAMES + 1):
            if f < born:
                o.hide_render = True; o.keyframe_insert("hide_render", frame=f)
                o.location = shoe[max(start, f)] + off
                o.keyframe_insert("location", frame=f)
                continue
            o.hide_render = False
            o.keyframe_insert("hide_render", frame=f)
            u = min(1.0, (f - born) / hop)
            p0 = shoe[born] + off
            p1 = shoe[f] + stick
            arc = 4 * u * (1 - u) * 0.035
            o.location = p0.lerp(p1, u) + Vector((0, 0, arc))
            o.keyframe_insert("location", frame=f)


# ─── the camera: one continuous push from the room down to the shoe ────────
def camera(rig):
    sc = bpy.context.scene
    cam = bpy.data.objects["Camera"]
    sc.camera = cam
    cam.data.dof.use_dof = True
    foot = rig.pose.bones["foot.R"]
    tgt = bpy.data.objects.get("Cam.target") or bpy.data.objects.new("Cam.target", None)
    if tgt.name not in sc.collection.objects:
        sc.collection.objects.link(tgt)
    cam.data.dof.focus_object = tgt
    track = cam.constraints.get("aim") or cam.constraints.new("TRACK_TO")
    track.name = "aim"; track.target = tgt; track.track_axis = "TRACK_NEGATIVE_Z"; track.up_axis = "UP_Y"
    for f in range(1, FRAMES + 1):
        sc.frame_set(f)
        u = (f - 1) / (FRAMES - 1)
        e = u * u * (3 - 2 * u)  # smoothstep
        e2 = e * e
        torso = rig.matrix_world @ rig.pose.bones["spine03"].head
        shoe = rig.matrix_world @ foot.head + Vector((0.06, 0, -0.05))
        wide = Vector((0.75, 0.2, 0.9))  # between Dash and Newt, the door behind
        look = wide.lerp(torso, min(1.0, e * 1.6)).lerp(shoe, e2)
        start = Vector((1.55, -3.9, 1.25))
        end = shoe + Vector((0.34, -0.46, 0.08))
        cam.location = start.lerp(end, e2 * 0.7 + e * 0.3)
        cam.keyframe_insert("location", frame=f)
        tgt.location = look
        tgt.keyframe_insert("location", frame=f)
        cam.data.lens = 30 + 22 * e
        cam.data.keyframe_insert("lens", frame=f)
        cam.data.dof.aperture_fstop = 5.6 - 4.0 * e
        cam.data.dof.keyframe_insert("aperture_fstop", frame=f)


def build_sample():
    for n in ("DashReal.rig", "NewtReal.rig", "Camera", "Cam.target"):
        o = bpy.data.objects.get(n)
        if o:
            o.animation_data_clear()
            if o.type == "CAMERA":
                o.data.animation_data_clear()
    build_room()
    setup_look()
    dash = bpy.data.objects["DashReal.rig"]
    newt = bpy.data.objects["NewtReal.rig"]
    animate_dash(dash)
    pose_newt(newt)
    electrons(dash)
    camera(dash)
    bpy.context.scene.frame_set(1)
    return True
