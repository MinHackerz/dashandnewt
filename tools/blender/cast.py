"""Dash & Newt for Blender — built from primitives to match the house 3D look (src/rig3d/Toon3D.tsx).

Run inside Blender (Blender MCP or the Python console):
    exec(open("/path/to/tools/blender/cast.py").read()); dash = build_dash()

Units are metres, Z is up, the character faces +X and stands on z = 0. Every part hangs off a small tree of
empties so it can be animated with plain rotations:
    <Name>                root (move/turn the whole character here)
      <Name>.body         hips: bob / lean
        <Name>.hip.L/R    thigh → <Name>.knee.L/R → shin → <Name>.ankle.L/R → sock/shoe
        <Name>.chest      torso, neck, scarf, shoulders
          <Name>.head     head, face, hair (and Newt's party hat)
          <Name>.shoulder.L/R → upper arm → <Name>.elbow.L/R → forearm, hand
Colours and proportions are the identity (docs/CAST.md) and must not change between episodes.
"""
import math
import bpy
from mathutils import Vector

COLL = "Cast"


# ─── helpers ───────────────────────────────────────────────────────────────
def _coll():
    c = bpy.data.collections.get(COLL)
    if not c:
        c = bpy.data.collections.new(COLL)
        bpy.context.scene.collection.children.link(c)
    return c


def hexrgb(h):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, 1.0)


def mat(name, color, rough=0.5, **kw):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = hexrgb(color)
    p.inputs["Roughness"].default_value = rough
    for k, v in kw.items():
        key = {"sss": "Subsurface Weight", "sheen": "Sheen Weight", "coat": "Coat Weight", "metal": "Metallic", "emit": "Emission Strength"}.get(k, k)
        if key == "Emission Strength":
            p.inputs["Emission Color"].default_value = hexrgb(color)
        if key in p.inputs:
            p.inputs[key].default_value = v
    m.diffuse_color = hexrgb(color)
    return m


def empty(name, parent=None, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.05
    e.empty_display_type = "SPHERE"
    _coll().objects.link(e)
    e.parent = parent
    e.location = loc
    return e


def _mesh_obj(name, mesh, material, parent, loc, rot=(0, 0, 0), scale=(1, 1, 1)):
    o = bpy.data.objects.new(name, mesh)
    _coll().objects.link(o)
    # meshes are shared between parts, so the material lives on the OBJECT's slot, not the mesh
    if len(mesh.materials) == 0:
        mesh.materials.append(None)
    o.material_slots[0].link = "OBJECT"
    o.material_slots[0].material = material
    o.parent = parent
    o.location = loc
    o.rotation_euler = rot
    o.scale = scale
    for poly in o.data.polygons:
        poly.use_smooth = True
    return o


_SPH = {}


def _sphere_mesh():
    if "sph" not in _SPH:
        import bmesh
        me = bpy.data.meshes.new("cast_sphere")
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=24, radius=1.0)
        bm.to_mesh(me)
        bm.free()
        _SPH["sph"] = me
    return _SPH["sph"]


def _cyl_mesh(r_top=1.0):
    key = f"cyl{r_top:.3f}"
    if key not in _SPH:
        import bmesh
        me = bpy.data.meshes.new(f"cast_{key}")
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=32, radius1=1.0, radius2=r_top, depth=1.0)
        bm.to_mesh(me)
        bm.free()
        _SPH[key] = me
    return _SPH[key]


def ball(name, parent, loc, radii, material, rot=(0, 0, 0)):
    r = radii if isinstance(radii, (tuple, list)) else (radii, radii, radii)
    return _mesh_obj(name, _sphere_mesh(), material, parent, loc, rot, r)


def limb(name, parent, length, r0, r1, material, down=True):
    """A tapered capsule hanging from the parent's origin along -Z (length), radius r0 → r1"""
    o = _mesh_obj(name, _cyl_mesh(r1 / r0), material, parent, (0, 0, -length / 2 if down else length / 2), (0, 0, 0) if down else (math.pi, 0, 0), (r0, r0, length))
    o.rotation_euler = (math.pi, 0, 0) if down else (0, 0, 0)  # wide end at the parent joint
    ball(name + ".cap0", parent, (0, 0, 0), r0, material)
    ball(name + ".cap1", parent, (0, 0, -length if down else length), r1, material)
    return o


def cone(name, parent, base, direction, length, radius, material):
    d = Vector(direction).normalized()
    o = _mesh_obj(name, _cyl_mesh(0.02), material, parent, Vector(base) + d * (length / 2), (0, 0, 0), (radius, radius, length))
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    return o


# ─── the characters ────────────────────────────────────────────────────────
LOOK = {
    "dash": dict(skin="#f2b88a", shirt="#2e6ee6", pants="#161d36", sock="#f4f3ee", trim="#ff8a1f", hair="#4a2b18", iris="#4d2f1c", shorts=False, s=1.0, head=1.0),
    "newt": dict(skin="#f6c69c", shirt="#3fb04a", pants="#5e6838", sock="#ffffff", trim="#e3343a", hair="#5b3417", iris="#5a3a1e", shorts=True, s=0.72, head=1.18),
}


def build_character(who="dash", name=None, socks=True):
    L = LOOK[who]
    name = name or who.capitalize()
    s = L["s"]
    M = {
        "skin": mat(f"{name}.skin", L["skin"], 0.5, sss=0.12, sheen=0.2),
        "shirt": mat(f"{name}.shirt", L["shirt"], 0.85, sheen=0.4),
        "pants": mat(f"{name}.pants", L["pants"], 0.85, sheen=0.3),
        "sock": mat(f"{name}.sock", L["sock"], 0.95, sheen=0.6),
        "trim": mat(f"{name}.trim", L["trim"], 0.7),
        "hair": mat(f"{name}.hair", L["hair"], 0.55, coat=0.2, sheen=0.3),
        "white": mat("eye.white", "#ffffff", 0.12, coat=1.0),
        "iris": mat(f"{name}.iris", L["iris"], 0.2, coat=1.0),
        "pupil": mat("eye.pupil", "#0d0a09", 0.1, coat=1.0),
        "shine": mat("eye.shine", "#ffffff", 0.05, emit=2.0),
        "brow": mat(f"{name}.brow", "#3a2213", 0.7),
        "mouth": mat("mouth", "#5a1820", 0.6),
        "teeth": mat("teeth", "#fffdf7", 0.25, coat=0.5),
        "tongue": mat("tongue", "#ff6f7d", 0.45),
        "scarf": mat("scarf", "#ff8a1f", 0.92, sheen=0.5),
        "blush": mat("blush", "#ff8a9a", 0.8),
    }
    root = empty(name, None)
    root.empty_display_size = 0.2
    root.empty_display_type = "ARROWS"
    root.scale = (s, s, s)
    hipH = 0.72
    body = empty(f"{name}.body", root, (0, 0, hipH))
    # legs
    for side, y in (("L", 0.1), ("R", -0.1)):
        hip = empty(f"{name}.hip.{side}", body, (0, y, 0))
        if L["shorts"]:
            limb(f"{name}.thigh.{side}", hip, 0.3, 0.11, 0.1, M["pants"])
        else:
            limb(f"{name}.thigh.{side}", hip, 0.34, 0.095, 0.088, M["pants"])
        knee = empty(f"{name}.knee.{side}", hip, (0, 0, -0.34))
        if L["shorts"]:
            limb(f"{name}.shin.{side}", knee, 0.22, 0.055, 0.05, M["skin"])
            limb(f"{name}.sockup.{side}", knee, 0.32, 0.058, 0.058, M["sock"]).location.z -= 0.0
        else:
            limb(f"{name}.shin.{side}", knee, 0.3, 0.088, 0.084, M["pants"])
        ankle = empty(f"{name}.ankle.{side}", knee, (0, 0, -0.32))
        # chunky sock-foot (or sneaker) with a coloured stripe
        ball(f"{name}.foot.{side}", ankle, (0.06, 0, -0.025), (0.14, 0.075, 0.065), M["sock"])
        ball(f"{name}.stripe.{side}", ankle, (0.0, 0, 0.03), (0.075, 0.078, 0.022), M["trim"])
    # torso
    ball(f"{name}.pelvis", body, (0, 0, 0.03), (0.15, 0.19, 0.14), M["pants"])
    chest = empty(f"{name}.chest", body, (0, 0, 0.12))
    ball(f"{name}.belly", chest, (0.01, 0, 0.03), (0.17, 0.2, 0.16), M["shirt"])
    ball(f"{name}.ribs", chest, (0, 0, 0.2), (0.165, 0.245, 0.17), M["shirt"])
    limb(f"{name}.neck", chest, 0.12, 0.06, 0.058, M["skin"], down=False).location.z += 0.3
    # head
    head = empty(f"{name}.head", chest, (0.02, 0, 0.64 * L["head"] if who == "newt" else 0.64))
    hs = L["head"]
    head.scale = (hs, hs, hs)
    ball(f"{name}.skull", head, (0, 0, 0), (0.27, 0.28, 0.27), M["skin"])
    ball(f"{name}.jaw", head, (0.06, 0, -0.1), (0.22, 0.24, 0.18), M["skin"])
    for side, y in (("L", 1), ("R", -1)):
        ball(f"{name}.ear.{side}", head, (-0.01, y * 0.27, -0.01), (0.05, 0.03, 0.07), M["skin"])
        ey = y * 0.1
        ball(f"{name}.eye.{side}", head, (0.215, ey, 0.03), (0.06, 0.065, 0.075), M["white"])
        ball(f"{name}.iris.{side}", head, (0.27, ey * 0.95, 0.025), (0.012, 0.042, 0.045), M["iris"])
        ball(f"{name}.pupil.{side}", head, (0.279, ey * 0.95, 0.025), (0.006, 0.024, 0.026), M["pupil"])
        ball(f"{name}.shine.{side}", head, (0.283, ey * 0.95 + 0.014, 0.045), 0.009, M["shine"])
        brow = ball(f"{name}.brow.{side}", head, (0.255, y * 0.1, 0.125), (0.02, 0.065, 0.017), M["brow"])
        brow.rotation_euler = (y * 0.25, 0, 0)  # inner ends down: determined
    ball(f"{name}.nose", head, (0.28, 0, -0.04), (0.04, 0.035, 0.035), M["skin"])
    ball(f"{name}.mouth", head, (0.245, 0, -0.13), (0.03, 0.095, 0.048), M["mouth"])
    ball(f"{name}.teeth", head, (0.262, 0, -0.105), (0.02, 0.078, 0.017), M["teeth"])
    ball(f"{name}.tongue", head, (0.258, 0, -0.155), (0.018, 0.05, 0.02), M["tongue"])
    if who == "newt":
        for y in (1, -1):
            ball(f"{name}.blush.{'L' if y > 0 else 'R'}", head, (0.21, y * 0.17, -0.07), (0.02, 0.05, 0.03), M["blush"])
    # hair: a cap plus spikes [azimuth from the face (deg), elevation (deg), length, radius]
    ball(f"{name}.haircap", head, (-0.03, 0, 0.07), (0.28, 0.29, 0.25), M["hair"])
    spikes = [
        (-30, 30, 0.13, 0.055), (5, 34, 0.15, 0.06), (38, 28, 0.12, 0.05),
        (-60, 62, 0.17, 0.065), (-8, 72, 0.19, 0.07), (50, 64, 0.17, 0.065),
        (-120, 52, 0.17, 0.068), (180, 55, 0.18, 0.07), (120, 50, 0.16, 0.066),
        (-95, 22, 0.12, 0.055), (95, 22, 0.12, 0.055), (-150, 18, 0.13, 0.06), (150, 18, 0.13, 0.06),
    ] if who == "dash" else [(-34, 30, 0.1, 0.055), (0, 36, 0.11, 0.06), (34, 30, 0.1, 0.055), (-90, 18, 0.09, 0.05), (90, 18, 0.09, 0.05), (180, 12, 0.09, 0.055)]
    for i, (az, el, ln, r) in enumerate(spikes):
        a, e = math.radians(az), math.radians(el)
        d = Vector((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e)))
        base = Vector((-0.03, 0, 0.07)) + Vector((d.x * 0.28, d.y * 0.29, d.z * 0.25)) * 0.82
        cone(f"{name}.spike{i}", head, base, (d + Vector((0, 0, 0.35))).normalized(), ln, r, M["hair"])
    if who == "newt":
        hat = mat("hat", "#ff4d6d", 0.45, coat=0.3)
        cone(f"{name}.hat", head, (0, 0, 0.24), (0, 0, 1), 0.34, 0.12, hat)
        ball(f"{name}.pompom", head, (0, 0, 0.6), 0.04, mat("pompom", "#ffd23f", 0.95, sheen=1.0))
    # scarf (Dash)
    if who == "dash":
        ring = bpy.data.meshes.get("scarf_ring")
        if not ring:
            import bmesh
            ring = bpy.data.meshes.new("scarf_ring")
            bm = bmesh.new()
            # a torus by sweeping a circle
            R, r, nu, nv = 1.0, 0.42, 40, 16
            verts = []
            for i in range(nu):
                u = 2 * math.pi * i / nu
                row = []
                for j in range(nv):
                    v = 2 * math.pi * j / nv
                    row.append(bm.verts.new(((R + r * math.cos(v)) * math.cos(u), (R + r * math.cos(v)) * math.sin(u), r * math.sin(v))))
                verts.append(row)
            for i in range(nu):
                for j in range(nv):
                    bm.faces.new((verts[i][j], verts[(i + 1) % nu][j], verts[(i + 1) % nu][(j + 1) % nv], verts[i][(j + 1) % nv]))
            bm.to_mesh(ring)
            bm.free()
        _mesh_obj(f"{name}.scarf", ring, M["scarf"], chest, (0.0, 0, 0.36), (0, 0.1, 0), (0.135, 0.135, 0.12))
        ball(f"{name}.scarfknot", chest, (0.13, 0.07, 0.31), (0.06, 0.055, 0.055), M["scarf"])
        tail = limb(f"{name}.scarftail", empty(f"{name}.scarftail.pivot", chest, (0.15, 0.08, 0.29)), 0.2, 0.045, 0.055, M["scarf"])
        tail.parent.rotation_euler = (0, -0.25, 0.1)
    # arms
    for side, y in (("L", 1), ("R", -1)):
        sh = empty(f"{name}.shoulder.{side}", chest, (0, y * 0.25, 0.27))
        ball(f"{name}.sleevecap.{side}", sh, (0, 0, 0), 0.085, M["shirt"])
        limb(f"{name}.sleeve.{side}", sh, 0.13, 0.082, 0.078, M["shirt"])
        limb(f"{name}.upper.{side}", sh, 0.28, 0.06, 0.056, M["skin"])
        el = empty(f"{name}.elbow.{side}", sh, (0, 0, -0.28))
        limb(f"{name}.fore.{side}", el, 0.24, 0.056, 0.05, M["skin"])
        ball(f"{name}.fist.{side}", el, (0.01, 0, -0.29), (0.07, 0.062, 0.072), M["skin"])
        ball(f"{name}.thumb.{side}", el, (0.05, y * 0.03, -0.27), (0.03, 0.025, 0.035), M["skin"])
    return root


def part(name, piece):
    return bpy.data.objects.get(f"{name}.{piece}")
