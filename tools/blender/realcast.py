"""Dash & Newt as realistic humans in Blender, built with MPFB2 (MakeHuman for Blender; CC0 assets).

Run inside Blender (Blender MCP):
    exec(open(".../tools/blender/realcast.py").read()); dash = build_real("dash")

Identity stays locked (docs/CAST.md) even in the realistic look:
  Dash — young man, spiky brown hair, royal-blue tee, jeans, white sneakers, ORANGE SCARF, always.
  Newt — about ten years old, brown hair, grass-green tee with a red apple, olive shorts, red sneakers,
         striped PARTY HAT + rosy cheeks, always.
Each character gets MakeHuman's "default" rig (body + face bones) and face units for expressions.
"""
import math
import os
import importlib
import bpy
from mathutils import Vector

_S = "bl_ext.blender_org.mpfb.services"
HS = importlib.import_module(f"{_S}.humanservice").HumanService
TS = importlib.import_module(f"{_S}.targetservice").TargetService
DATA = os.path.expanduser("~/Library/Application Support/Blender/5.2/extensions/.user/blender_org/mpfb/data")


def P(*parts):
    return os.path.join(DATA, *parts)


def hexrgb(h):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb) + (1.0,)


SPEC = {
    "dash": dict(
        macro=dict(gender=1.0, age=0.5, muscle=0.62, weight=0.55, proportions=0.65, height=0.58, race=dict(caucasian=0.7, asian=0.15, african=0.15)),
        skin=("skins", "young_caucasian_male", "young_caucasian_male.mhmat"),
        hair=("hair", "cortu_short_messy_hair", "cortu_short_messy_hair.mhclo"),
        hair_tint="#5a3420",
        clothes=[("clothes", "male_casualsuit04", "male_casualsuit04.mhclo"), ("clothes", "shoes05", "shoes05.mhclo")],
        eyes="brown",
    ),
    "newt": dict(
        macro=dict(gender=1.0, age=0.1875, muscle=0.5, weight=0.55, proportions=0.5, height=0.5, race=dict(caucasian=0.7, asian=0.15, african=0.15)),
        skin=("skins", "young_caucasian_male", "young_caucasian_male.mhmat"),
        hair=("hair", "short02", "short02.mhclo"),
        hair_tint="#6b3c1c",
        clothes=[("clothes", "male_casualsuit06", "male_casualsuit06.mhclo"), ("clothes", "shoes06", "shoes06.mhclo")],
        eyes="brown",
    ),
}


def _named(obj, name):
    obj.name = name
    return obj


def build_real(who="dash", name=None, location=(0, 0, 0)):
    spec = SPEC[who]
    name = name or f"{who.capitalize()}Real"
    macro = TS.get_default_macro_info_dict()
    macro.update({k: v for k, v in spec["macro"].items() if k != "race"})
    macro["race"] = spec["macro"]["race"]
    body = HS.create_human(macro_detail_dict=macro)
    body.name = name
    # the skeleton FIRST, so every asset added after it is rigged and deforms with the body
    rig = HS.add_builtin_rig(body, "default") or body.parent
    rig.name = f"{name}.rig"
    HS.set_character_skin(P(*spec["skin"]), body, skin_type="ENHANCED_SSS")
    for kind, rel in (("Eyes", ("eyes", "high-poly", "high-poly.mhclo")), ("Eyebrows", ("eyebrows", "eyebrow001", "eyebrow001.mhclo")), ("Eyelashes", ("eyelashes", "eyelashes01", "eyelashes01.mhclo")), ("Teeth", ("teeth", "teeth_base", "teeth_base.mhclo")), ("Tongue", ("tongue", "tongue01", "tongue01.mhclo"))):
        path = P(*rel)
        if os.path.exists(path):
            HS.add_mhclo_asset(path, body, asset_type=kind, subdiv_levels=1)
    HS.add_mhclo_asset(P(*spec["hair"]), body, asset_type="Hair", subdiv_levels=1)
    for rel in spec["clothes"]:
        HS.add_mhclo_asset(P(*rel), body, asset_type="Clothes", subdiv_levels=1)
    rig.location = location
    return body, rig


def children_of(body):
    return [o for o in bpy.data.objects if o.parent in (body, body.parent) and o is not body]


# ─── outfit edits (textures are copied into blender/textures; the asset packs stay untouched) ──
TEX_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "blender/textures")


def _diffuse_node(obj):
    m = obj.active_material
    return [n for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image and "diffuse" in n.image.name.lower()][0]


def recolor_outfit(obj, out_name, top_rows=0.42, top_color=None, bottom_color=None, apple=None):
    """Re-dye a MakeHuman casual suit atlas: the tee (top `top_rows` of the image) and the trousers below.
    Logos on the tee are painted out first (anything not near-neutral fabric). Optional apple decal
    at `apple` = (x, y) in top-down texture fractions."""
    import numpy as np
    node = _diffuse_node(obj)
    src = node.image
    w, h = src.size
    px = np.array(src.pixels[:], dtype=np.float32).reshape(h, w, 4)
    img = px[::-1].copy()  # top-down
    split = int(h * top_rows)
    tee = img[:split, :, :3]
    lum = tee.mean(axis=2, keepdims=True)
    sat = tee.max(axis=2, keepdims=True) - tee.min(axis=2, keepdims=True)
    fabric = (sat < 0.08) & (lum > 0.55)
    base = np.median(tee[fabric[..., 0]], axis=0) if fabric.any() else np.array([0.85, 0.85, 0.85])
    logo = ~fabric & (lum > 0.08)
    tee = np.where(logo, base, tee)
    if top_color is not None:
        shade = tee.mean(axis=2, keepdims=True) / max(1e-3, float(np.mean(base)))
        tee = np.clip(shade * np.array(top_color)[None, None, :3], 0, 1)
    img[:split, :, :3] = tee
    if bottom_color is not None:
        bot = img[split:, :, :3]
        blum = bot.mean(axis=2, keepdims=True)
        tint = np.clip(blum / 0.45 * np.array(bottom_color)[None, None, :3], 0, 1)
        isfab = (bot.max(axis=2, keepdims=True) - bot.min(axis=2, keepdims=True)) > 0.04
        img[split:, :, :3] = np.where(isfab, tint, bot)
    if apple is not None:
        cy, cx = int(apple[1] * h), int(apple[0] * w)
        r = int(0.028 * w)
        yy, xx = np.mgrid[0:h, 0:w]
        body = (((xx - cx - r * 0.35) / (r * 0.95)) ** 2 + ((yy - cy) / r) ** 2 < 1) | (((xx - cx + r * 0.35) / (r * 0.95)) ** 2 + ((yy - cy) / r) ** 2 < 1)
        stem = (abs(xx - cx) < r * 0.09) & (yy > cy - r * 1.35) & (yy < cy - r * 0.8)
        leaf = (((xx - cx - r * 0.45) / (r * 0.42)) ** 2 + ((yy - cy + r * 1.1) / (r * 0.2)) ** 2) < 1
        img[body] = (0.82, 0.08, 0.06, 1.0)
        hl = (((xx - cx + r * 0.35) / (r * 0.3)) ** 2 + ((yy - cy + r * 0.35) / (r * 0.3)) ** 2) < 1
        img[hl & body] = (0.98, 0.55, 0.5, 1.0)
        img[stem] = (0.35, 0.2, 0.08, 1.0)
        img[leaf] = (0.18, 0.55, 0.15, 1.0)
    out = bpy.data.images.new(out_name, w, h, alpha=True)
    out.pixels = img[::-1].ravel()
    os.makedirs(TEX_DIR, exist_ok=True)
    out.filepath_raw = os.path.join(TEX_DIR, out_name + ".png")
    out.file_format = "PNG"
    out.save()
    out.colorspace_settings.name = src.colorspace_settings.name
    node.image = out
    return out


def cut_shorts(body, clothes, rig, above_knee=0.05):
    """Trousers → shorts: drop everything below the knee, and let the body's legs show there again."""
    import bmesh
    knee_z = (rig.matrix_world @ rig.pose.bones["lowerleg01.L"].head).z + above_knee
    bm = bmesh.new()
    bm.from_mesh(clothes.data)
    kill = [v for v in bm.verts if (clothes.matrix_world @ v.co).z < knee_z]
    bmesh.ops.delete(bm, geom=kill, context="VERTS")
    bm.to_mesh(clothes.data)
    bm.free()
    shown = 0
    for vg in body.vertex_groups:
        if vg.name.lower().startswith("delete"):
            idx = [v.index for v in body.data.vertices if (body.matrix_world @ v.co).z < knee_z - 0.01]
            vg.remove(idx)
            shown += len(idx)
    return knee_z, shown


def add_party_hat(rig, name, head_bone="head"):
    """Striped red/yellow cone with a pompom, tilted a little back, riding on the head bone."""
    import bmesh
    from mathutils import Matrix
    hb = rig.pose.bones[head_bone]
    top = rig.matrix_world @ hb.tail
    m = bpy.data.materials.get("partyhat") or bpy.data.materials.new("partyhat")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    if not [n for n in nt.nodes if n.type == "TEX_WAVE"]:
        tc = nt.nodes.new("ShaderNodeTexCoord")
        wave = nt.nodes.new("ShaderNodeTexWave"); wave.bands_direction = "Z"; wave.inputs["Scale"].default_value = 3.0
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.interpolation = "CONSTANT"
        ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[0].color = (0.95, 0.12, 0.2, 1)
        ramp.color_ramp.elements[1].position = 0.62; ramp.color_ramp.elements[1].color = (1.0, 0.75, 0.05, 1)
        nt.links.new(tc.outputs["Generated"], wave.inputs["Vector"])
        nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
        nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.35
        b.inputs["Coat Weight"].default_value = 0.4
    pm = bpy.data.materials.get("pompom") or bpy.data.materials.new("pompom")
    pm.use_nodes = True
    pm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (1.0, 0.75, 0.05, 1)
    pm.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 1.0
    pm.node_tree.nodes["Principled BSDF"].inputs["Sheen Weight"].default_value = 1.0
    coll = rig.users_collection[0]

    def mk(objname, build, loc, mat, scale=(1, 1, 1), rot=(0, 0, 0)):
        me = bpy.data.meshes.new(objname); bm = bmesh.new(); build(bm); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(objname, me); coll.objects.link(o); o.data.materials.append(mat)
        for p in o.data.polygons: p.use_smooth = True
        o.parent = rig; o.parent_type = "BONE"; o.parent_bone = head_bone
        bpy.context.view_layer.update()
        o.matrix_world = Matrix.LocRotScale(loc, Vector(rot).to_track_quat("Z", "Y") if False else None, Vector(scale))
        return o
    base = top + Vector((0, 0.01, -0.035))
    hat = mk(f"{name}.hat", lambda bm: bmesh.ops.create_cone(bm, cap_ends=True, segments=40, radius1=0.075, radius2=0.004, depth=0.2), base + Vector((0, 0, 0.1)), m)
    hat.rotation_mode = "XYZ"
    ball = mk(f"{name}.pompom", lambda bm: bmesh.ops.create_icosphere(bm, subdivisions=3, radius=0.022), base + Vector((0, 0, 0.205)), pm)
    return hat, ball


def build_newt(location=(0, 0, 0)):
    body, rig = build_real("newt", location=(0, 0, 0))
    suit = bpy.data.objects[f"{body.name}.male_casualsuit06"]
    recolor_outfit(suit, "newt_suit_diffuse", top_rows=0.42, top_color=hexrgb("#3fb04a"), bottom_color=hexrgb("#6b7440"), apple=(0.58, 0.19))
    knee_z, shown = cut_shorts(body, suit, rig, above_knee=0.05)
    for vg in body.vertex_groups:
        if vg.name.lower().startswith("delete"):
            vg.remove([v.index for v in body.data.vertices if (body.matrix_world @ v.co).z < knee_z + 0.04])
    tint_hair(bpy.data.objects[f"{body.name}.short02"], (0.24, 0.12, 0.05, 1.0), amount=0.7)
    shoes = bpy.data.objects[f"{body.name}.shoes06"]
    sm = shoes.active_material
    for n in sm.node_tree.nodes:
        if n.type == "BSDF_PRINCIPLED":
            mix = sm.node_tree.nodes.new("ShaderNodeHueSaturation")
            tex = [x for x in sm.node_tree.nodes if x.type == "TEX_IMAGE"][0]
            mix.inputs["Hue"].default_value = 0.84  # blue → red
            mix.inputs["Saturation"].default_value = 1.4
            sm.node_tree.links.new(tex.outputs["Color"], mix.inputs["Color"])
            sm.node_tree.links.new(mix.outputs["Color"], n.inputs["Base Color"])
            break
    add_party_hat(rig, body.name)
    rig.location = location
    return body, rig, knee_z, shown


def paint_out_box(obj, out_name, dst, src):
    """Cover a rectangle of a texture (top-down pixel box x0, x1, y0, y1) with a feathered patch from `src`"""
    import numpy as np
    node = _diffuse_node(obj)
    img = node.image
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    box = lambda b: (slice(h - b[3], h - b[2]), slice(b[0], b[1]))
    patch = px[box(src)].copy()
    fh, fw = patch.shape[:2]
    yy, xx = np.mgrid[0:fh, 0:fw]
    a = np.clip(np.minimum.reduce([xx, fw - 1 - xx, yy, fh - 1 - yy]).astype(np.float32) / 18.0, 0, 1)[..., None]
    px[box(dst)] = px[box(dst)] * (1 - a) + patch * a
    out = bpy.data.images.new(out_name, w, h, alpha=True)
    out.pixels = px.ravel()
    os.makedirs(TEX_DIR, exist_ok=True)
    out.filepath_raw = os.path.join(TEX_DIR, out_name + ".png"); out.file_format = "PNG"; out.save()
    out.colorspace_settings.name = img.colorspace_settings.name
    node.image = out


def tint_hair(obj, rgb, amount=0.88, alpha_boost=1.9):
    """Dye a MakeHuman hair card material (keeps the strand texture) and thicken its alpha"""
    m = obj.active_material
    nt = m.node_tree
    b = [n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"][0]
    tex = [n for n in nt.nodes if n.type == "TEX_IMAGE" and n.image and "norm" not in n.image.name.lower()][0]
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MIX"
    mix.inputs["Factor"].default_value = amount
    mix.inputs[7].default_value = rgb
    nt.links.new(tex.outputs["Color"], mix.inputs[6]); nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.use_clamp = True; mul.inputs[1].default_value = alpha_boost
    nt.links.new(tex.outputs["Alpha"], mul.inputs[0]); nt.links.new(mul.outputs[0], b.inputs["Alpha"])
    b.inputs["Roughness"].default_value = 0.62
    b.inputs["Specular IOR Level"].default_value = 0.25


def knit_material(name="Dash.scarf.knit", rgb=(1.0, 0.26, 0.0, 1)):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = rgb; b.inputs["Roughness"].default_value = 0.95
    b.inputs["Sheen Weight"].default_value = 0.25; b.inputs["Sheen Tint"].default_value = (1.0, 0.45, 0.1, 1)
    tc = nt.nodes.new("ShaderNodeTexCoord"); wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = "BANDS"; wave.bands_direction = "X"; wave.inputs["Scale"].default_value = 60; wave.inputs["Distortion"].default_value = 3
    noise = nt.nodes.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 220
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.6; bump.inputs["Distance"].default_value = 0.004
    add = nt.nodes.new("ShaderNodeMath"); add.operation = "ADD"
    nt.links.new(tc.outputs["Object"], wave.inputs["Vector"]); nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
    nt.links.new(wave.outputs["Fac"], add.inputs[0]); nt.links.new(noise.outputs["Fac"], add.inputs[1])
    nt.links.new(add.outputs[0], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return m


def add_scarf(rig, name):
    """Dash's orange knit scarf: a thick wrap round the base of the neck, a knot and two short tails,
    riding on the top spine bone. Built with the rig at rest (character at the origin, facing -Y)."""
    import bmesh
    from mathutils import Matrix
    m = knit_material()
    coll = rig.users_collection[0]
    neck = rig.matrix_world @ rig.pose.bones["neck01"].head

    def place(o, loc, scale=(1, 1, 1)):
        coll.objects.link(o); o.data.materials.append(m)
        for p in o.data.polygons: p.use_smooth = True
        o.parent = rig; o.parent_type = "BONE"; o.parent_bone = "spine01"
        bpy.context.view_layer.update()
        o.matrix_world = Matrix.LocRotScale(Vector(loc), None, Vector(scale))
        return o
    me = bpy.data.meshes.new(f"{name}.scarf"); bm = bmesh.new()
    R, r, nu, nv = 0.098, 0.04, 64, 18
    rows = []
    for i in range(nu):
        u = 2 * math.pi * i / nu
        drop = 0.035 * max(0.0, -math.sin(u)) ** 2
        puff = 1.0 + 0.12 * math.sin(u * 5.0)
        row = []
        for j in range(nv):
            v = 2 * math.pi * j / nv
            rr = r * puff
            row.append(bm.verts.new(((R + rr * math.cos(v)) * math.cos(u), (R + rr * math.cos(v)) * math.sin(u) * 1.1, rr * 0.8 * math.sin(v) - drop)))
        rows.append(row)
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((rows[i][j], rows[(i + 1) % nu][j], rows[(i + 1) % nu][(j + 1) % nv], rows[i][(j + 1) % nv]))
    bm.to_mesh(me); bm.free()
    ring = place(bpy.data.objects.new(f"{name}.scarf", me), neck + Vector((0, 0.004, -0.034)))
    s = ring.modifiers.new("smooth", "SUBSURF"); s.levels = 1; s.render_levels = 2

    def tail(tname, top, bottom, width, phase):
        me = bpy.data.meshes.new(tname); bm = bmesh.new()
        n = 12
        for i in range(n + 1):
            t = i / n
            c = top.lerp(bottom, t) + Vector((0.01 * math.sin(t * 5 + phase), -0.02 * math.sin(t * math.pi), 0))
            w = width * (1 + 0.1 * math.sin(t * 7 + phase))
            for k in (-1, 1):
                for d in (-1, 1):
                    bm.verts.new(c + Vector((k * w / 2, d * 0.013, 0)))
        bm.verts.ensure_lookup_table()
        for i in range(n):
            a = i * 4; b = a + 4
            for (p, q) in ((0, 1), (1, 3), (3, 2), (2, 0)):
                bm.faces.new((bm.verts[a + p], bm.verts[a + q], bm.verts[b + q], bm.verts[b + p]))
        bm.faces.new([bm.verts[0], bm.verts[1], bm.verts[3], bm.verts[2]])
        bm.faces.new([bm.verts[n * 4 + 2], bm.verts[n * 4 + 3], bm.verts[n * 4 + 1], bm.verts[n * 4]])
        bm.to_mesh(me); bm.free()
        o = place(bpy.data.objects.new(tname, me), (0, 0, 0))
        sub = o.modifiers.new("smooth", "SUBSURF"); sub.levels = 2; sub.render_levels = 2
    k = neck + Vector((0.05, -0.114, -0.092))
    tail(f"{name}.scarf.tail1", k + Vector((0, 0, -0.01)), k + Vector((0.025, -0.022, -0.19)), 0.085, 0.0)
    tail(f"{name}.scarf.tail2", k + Vector((0.012, 0.006, -0.02)), k + Vector((0.06, -0.014, -0.14)), 0.075, 1.7)
    kme = bpy.data.meshes.new(f"{name}.scarf.knot"); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=14, radius=1.0); bm.to_mesh(kme); bm.free()
    place(bpy.data.objects.new(f"{name}.scarf.knot", kme), k, (0.05, 0.035, 0.045))


def build_dash(location=(0, 0, 0)):
    body, rig = build_real("dash", location=(0, 0, 0))
    paint_out_box(bpy.data.objects[f"{body.name}.male_casualsuit04"], "dash_suit_diffuse", (1010, 1290, 210, 470), (1010, 1290, 470, 730))
    tint_hair(bpy.data.objects[f"{body.name}.cortu_short_messy_hair"], (0.2, 0.095, 0.04, 1.0))
    add_scarf(rig, body.name)
    rig.location = location
    return body, rig
