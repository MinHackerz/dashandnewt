"""Dash & Newt from the user's Mixamo characters (Mixamo: free for commercial video).

  blender/assets/characters/Dash.fbx  — Mixamo "Ch42"
  blender/assets/characters/NewtKid/Black Boy.fbx — "Black Boy Rigged Ready For Ue4" by MotionStudioArts (Sketchfab,
                                         CC-BY: credit in every publish brief). A real child model on Unreal's
                                         mannequin skeleton (pelvis, spine_01…, upperarm_l…); B() maps Mixamo names.
  Earlier Newts kept for reference: Newt_Ch38.fbx — Mixamo "Ch38" (downloaded with the "Talking On Phone" animation; kept as an
                                         action, the model sheet uses the rest pose). The earlier cartoon "Boy01" is
                                         Newt_Boy01.fbx.
Both use the standard Mixamo skeleton (mixamorig:*), so Mixamo animations apply directly.

    Blender -b --python tools/blender/mixamo_cast.py -- <out_dir> [tag]
Imports both into the close-up studio look, prints what's inside, renders a model sheet, saves blender/mixamo_cast.blend.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHARS = os.path.join(ROOT, "blender/assets/characters")
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else os.path.join(ROOT, "out/castsheet")
TAG = argv[1] if len(argv) > 1 else "m"
os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene


UE = {"Head": "head", "Neck": "neck_01", "Spine2": "spine_03", "Spine1": "spine_02", "Spine": "spine_01", "Hips": "pelvis",
      "LeftArm": "upperarm_l", "RightArm": "upperarm_r", "LeftForeArm": "lowerarm_l", "RightForeArm": "lowerarm_r",
      "LeftHand": "hand_l", "RightHand": "hand_r"}


def B(rig, short):
    """pose bone by Mixamo name, whatever the prefix (mixamorig:, mixamorig1:, …) or an Unreal mannequin skeleton"""
    for pb in rig.pose.bones:
        if pb.name == short or pb.name.split(":")[-1] == short:
            return pb
    if short in UE and UE[short] in rig.pose.bones:
        return rig.pose.bones[UE[short]]
    return None


def import_char(name, x, path=None):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path or os.path.join(CHARS, f"{name}.fbx"), use_image_search=True)
    new = [o for o in bpy.data.objects if o not in before]
    rig = [o for o in new if o.type == "ARMATURE"][0]
    rig.name = f"{name}.rig"
    if rig.animation_data and rig.animation_data.action:  # keep a downloaded animation for later, model sheet at rest
        act = rig.animation_data.action
        act.name = f"{name}.{act.name}"
        act.use_fake_user = True
        print("  ACTION", act.name, act.frame_range[:])
        rig.animation_data.action = None
        for pb in rig.pose.bones:
            pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.rotation_euler = (0, 0, 0); pb.scale = (1, 1, 1)
    rig.location.x = x
    for o in new:
        if o.type == "MESH":
            o.name = f"{name}.{o.name.split(':')[-1]}"
    bpy.context.view_layer.update()
    meshes = [o for o in new if o.type == "MESH"]
    zs = [(o.matrix_world @ Vector(c)).z for o in meshes for c in o.bound_box]
    print("CHAR", name, "rig", rig.name, "height", round(max(zs) - min(zs), 3), "bones", len(rig.data.bones))
    for o in meshes:
        print("  MESH", o.name, len(o.data.vertices), [m.name for m in o.data.materials if m])
    return rig, meshes


for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
dash_rig, dash_meshes = import_char("Dash", -0.45)
NEWT_DIR = os.path.join(CHARS, "NewtKid")
newt_rig, newt_meshes = import_char("Newt", 0.45, os.path.join(NEWT_DIR, "Black Boy.fbx"))


def kid_materials(meshes, folder, prefix="Black Student"):
    """the boy's FBX doesn't link its textures: build each material from the spec/gloss maps next to it"""
    for o in meshes:
        for m in o.data.materials:
            if not m or not m.node_tree:
                continue
            part = {"Body": "Body", "Bottom": "Bottom", "Shoes": "Shoes", "Top": "Top"}.get(m.name)
            if not part:
                continue
            nt = m.node_tree
            b = [n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"][0]

            def tex(kind, noncolor):
                t = nt.nodes.new("ShaderNodeTexImage")
                t.image = bpy.data.images.load(os.path.join(folder, f"{prefix}_{part}_{kind}.png"), check_existing=True)
                if noncolor:
                    t.image.colorspace_settings.name = "Non-Color"
                return t
            nt.links.new(tex("diffuse", False).outputs["Color"], b.inputs["Base Color"])
            g = tex("gloss", True); inv = nt.nodes.new("ShaderNodeInvert")
            nt.links.new(g.outputs["Color"], inv.inputs["Color"]); nt.links.new(inv.outputs["Color"], b.inputs["Roughness"])
            sp = tex("specular", True); mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = 0.45
            nt.links.new(sp.outputs["Color"], mul.inputs[0]); nt.links.new(mul.outputs[0], b.inputs["Specular IOR Level"])
            nm = nt.nodes.new("ShaderNodeNormalMap")
            nt.links.new(tex("normal", True).outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
            if part == "Body" and "Subsurface Weight" in b.inputs:
                b.inputs["Subsurface Weight"].default_value = 0.15
                b.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
                b.inputs["Subsurface Scale"].default_value = 0.004
            m["restyled"] = True  # already correct: fix_materials leaves it alone


kid_materials(newt_meshes, NEWT_DIR)
for _o in newt_meshes:  # the boy is a light game mesh: smooth it for close-ups (after the armature)
    if _o.name.split(".")[-1] in ("Body", "Tops", "Bottoms", "Shoes"):
        _ss = _o.modifiers.new("smooth", "SUBSURF"); _ss.levels = 1; _ss.render_levels = 2
        for _p in _o.data.polygons:
            _p.use_smooth = True
_lash = bpy.data.materials.get("Eyelashes")
if _lash and _lash.node_tree:
    _t = [n for n in _lash.node_tree.nodes if n.type == "TEX_IMAGE"][0]
    _b = [n for n in _lash.node_tree.nodes if n.type == "BSDF_PRINCIPLED"][0]
    _lash.node_tree.links.new(_t.outputs["Alpha"], _b.inputs["Alpha"])
    _b.inputs["Base Color"].default_value = (0.02, 0.015, 0.012, 1)
    for _l in list(_lash.node_tree.links):
        if _l.to_socket == _b.inputs["Base Color"]:
            _lash.node_tree.links.remove(_l)
    _lash["restyled"] = True
bpy.ops.file.pack_all()  # keep the embedded textures inside the .blend

def kid_newt(rig, meshes, head_scale=1.2):
    """Make the adult Mixamo model read as a ~9-year-old, as a shape key on each mesh (rest coordinates, so it
    survives any animation): a smaller nose, a shorter, narrower lower face and chin, fuller cheeks, and a head
    that is bigger relative to the body (scaled about the top of the neck, hair and lashes included)."""
    import math as _m

    def sstep(x):
        x = max(0.0, min(1.0, x))
        return x * x * (3 - 2 * x)

    head_bone = [b for b in rig.data.bones if b.name.split(":")[-1] == "Head"][0]
    pivot = rig.matrix_world @ head_bone.head_local
    fwd = Vector((0, -1, 0)); up = Vector((0, 0, 1)); right = fwd.cross(up)
    body = [o for o in meshes if o.name.endswith("_Body")][0]
    bw = body.matrix_world
    g = body.vertex_groups[head_bone.name]
    head_pts = []
    for v in body.data.vertices:
        w = [x.weight for x in v.groups if x.group == g.index]
        if w and w[0] > 0.6:
            head_pts.append(bw @ v.co)
    mid = [p for p in head_pts if abs((p - pivot).dot(right)) < 0.012]
    nose = max(mid, key=lambda p: p.dot(fwd))
    chin = min([p for p in mid if (p - nose).dot(fwd) > -0.05], key=lambda p: p.z)
    top = max(head_pts, key=lambda p: p.z)
    centre = Vector((pivot.x, pivot.y, (top.z + chin.z) / 2))
    nz, cz = nose.z, chin.z
    print("KID landmarks nose", [round(c, 3) for c in nose], "chin z", round(cz, 3), "top z", round(top.z, 3))

    def face(p):
        q = p.copy()
        f_front = (p - nose).dot(fwd)
        # 1 smaller nose
        c = nose - fwd * 0.018
        d = (p - c).length
        if d < 0.036:
            q = c + (q - c) * (1 - 0.3 * sstep(1 - d / 0.036))
        # 2 shorter, narrower lower face (fades out toward the back of the head and down the neck)
        if p.z < nz:
            s = sstep((f_front + 0.10) / 0.05)
            if p.z < cz:
                s *= sstep(1 - (cz - p.z) / 0.05)
            depth = min(1.3, (nz - p.z) / max(1e-4, nz - cz))
            q.z = nz - (nz - q.z) * (1 - 0.22 * s)
            x = (q - pivot).dot(right)
            q -= right * x * 0.10 * s * min(1.0, depth)
        # 2b bigger eyes, softer brow ridge
        for sx in (1, -1):
            ec = nose + right * 0.032 * sx + up * 0.036 - fwd * 0.032
            d = (p - ec).length
            if d < 0.026:
                q = ec + (q - ec) * (1 + 0.16 * sstep(1 - d / 0.026))
            bc = ec + up * 0.02 + fwd * 0.004
            d = (p - bc).length
            if d < 0.03:
                q -= fwd * 0.0025 * sstep(1 - d / 0.03)
        # 3 fuller cheeks
        for sx in (1, -1):
            ck = nose + right * 0.043 * sx - fwd * 0.028 - up * 0.012
            d = (p - ck).length
            if d < 0.04:
                q += (p - centre).normalized() * 0.0045 * sstep(1 - d / 0.04)
        return q

    for o in meshes:
        gi = o.vertex_groups.get(head_bone.name)
        if gi is None:
            continue
        mw = o.matrix_world; mi = mw.inverted()
        if not o.data.shape_keys:
            o.shape_key_add(name="Basis")
        key = o.shape_key_add(name="KidNewt")
        for v in o.data.vertices:
            w = [x.weight for x in v.groups if x.group == gi.index]
            w = w[0] if w else 0.0
            if w <= 0.0:
                continue
            p = mw @ v.co
            q = face(p) if o == body or o.name.endswith("Eyelashes") else p
            q = pivot + (q - pivot) * (1 + (head_scale - 1) * w)
            key.data[v.index].co = mi @ q
        key.value = 1.0
    return True


# (kid_newt() reshaped the adult Ch38 into a kid; the real child model doesn't need it)
for img in bpy.data.images:
    print("  IMG", img.name, img.size[:], img.filepath[-60:])

from mathutils import Matrix

UP = Vector((0, 0, 1))


def fwd_of(rig):
    """the way the character faces (Mixamo rigs import rotated 90° about X, so use the Z turn only)"""
    return (Matrix.Rotation(rig.rotation_euler.z, 3, "Z") @ Vector((0, -1, 0))).normalized()


def arms_down(rig, deg=62):
    """T/A-pose → arms relaxed at the sides: rotate each upper arm in world space so it points down and a little out"""
    from mathutils import Matrix as _M
    fwd = fwd_of(rig)
    for side in ("Left", "Right"):
        pb = B(rig, f"{side}Arm")
        if not pb:
            continue
        bpy.context.view_layer.update()
        M_old = rig.matrix_world @ pb.matrix
        head = M_old.translation.copy()
        fore = B(rig, f"{side}ForeArm")  # aim by the elbow, not the bone tail (Unreal exports point bones sideways)
        tail = rig.matrix_world @ (fore.head if fore else pb.tail)
        d = (tail - head).normalized()
        out = Vector((d.x, d.y, 0)).normalized()
        t = (out * 0.22 - UP + fwd * 0.06).normalized()
        R = d.rotation_difference(t).to_matrix().to_4x4()
        M_new = _M.Translation(head) @ R @ _M.Translation(-head) @ M_old
        pb.matrix = rig.matrix_world.inverted() @ M_new
    bpy.context.view_layer.update()


PH = os.path.join(ROOT, "blender/assets/polyhaven")


def fix_materials():
    """Mixamo ships specular/glossiness maps; the FBX importer plugs glossiness straight into roughness (so matte
    turns wet-shiny). Invert it, keep the maps non-colour, and tame specular."""
    for m in bpy.data.materials:
        if not m.node_tree or m.get("restyled"):
            continue
        nt = m.node_tree
        for b in [n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"]:
            r = b.inputs["Roughness"]
            if r.is_linked and r.links[0].from_node.type == "TEX_IMAGE":
                tex = r.links[0].from_node
                tex.image.colorspace_settings.name = "Non-Color"
                inv = nt.nodes.new("ShaderNodeInvert")
                nt.links.new(tex.outputs["Color"], inv.inputs["Color"])
                nt.links.new(inv.outputs["Color"], r)
            sp = b.inputs["Specular IOR Level"]
            if sp.is_linked:
                tex = sp.links[0].from_node
                if tex.type == "TEX_IMAGE":
                    tex.image.colorspace_settings.name = "Non-Color"
                mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = 0.45
                nt.links.new(sp.links[0].from_socket, mul.inputs[0])
                nt.links.new(mul.outputs[0], sp)
            else:
                sp.default_value = 0.35
            if "hair" in m.name.lower():
                b.inputs["Roughness"].default_value = 0.42
            if m.name.lower().endswith("_body") and "Subsurface Weight" in b.inputs:
                b.inputs["Subsurface Weight"].default_value = 0.12
                b.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
                b.inputs["Subsurface Scale"].default_value = 0.005


def fabric(name, color, kind, scale=9.0, rough=0.85):
    """an everyday-clothes material from a Poly Haven fabric scan, tinted (kind: jersey | denim)"""
    m = bpy.data.materials.new(name); m.use_nodes = True; m["restyled"] = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    uv = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale, scale, scale)
    nt.links.new(uv.outputs["UV"], mp.inputs["Vector"])

    def img(path, noncolor):
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = bpy.data.images.load(path, check_existing=True)
        if noncolor:
            t.image.colorspace_settings.name = "Non-Color"
        nt.links.new(mp.outputs["Vector"], t.inputs["Vector"])
        return t
    folder = "cotton_jersey" if kind == "jersey" else "denim_fabric"
    tx = os.path.join(PH, folder, "textures")
    nor = img(os.path.join(tx, f"{folder}_nor_gl_2k.exr"), True)
    nm = nt.nodes.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 0.9
    nt.links.new(nor.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    if kind == "denim":
        dif = img(os.path.join(tx, "denim_fabric_diff_2k.jpg"), False)
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 0.55
        nt.links.new(dif.outputs["Color"], mix.inputs[6]); mix.inputs[7].default_value = color
        nt.links.new(mix.outputs[2], b.inputs["Base Color"])
        rgh = img(os.path.join(tx, "denim_fabric_rough_2k.jpg"), True)
        nt.links.new(rgh.outputs["Color"], b.inputs["Roughness"])
    else:
        b.inputs["Base Color"].default_value = color
        b.inputs["Roughness"].default_value = rough
        for k, v in (("Sheen Weight", 0.15), ("Sheen Roughness", 0.5)):
            if k in b.inputs:
                b.inputs[k].default_value = v
    b.inputs["Specular IOR Level"].default_value = 0.25
    return m


def dress(meshes, suffix, mat):
    for o in meshes:
        if o.name.endswith(suffix):
            o.data.materials.clear(); o.data.materials.append(mat)
            return o


def restyle_outfits():
    """everyday clothes for the shorts (the Mixamo outfits read as sportswear):
    Dash: plain royal-blue cotton tee + denim shorts.  Newt: grass-green cotton top + olive cotton shorts,
    plain dark socks, red sneakers."""
    dress(dash_meshes, "Shirt", fabric("Dash.tee", (0.012, 0.07, 0.42, 1), "jersey", scale=10))
    dress(dash_meshes, "Shorts", fabric("Dash.denim", (0.35, 0.5, 0.85, 1), "denim", scale=7))
    dress(newt_meshes, "Tops", fabric("Newt.top", (0.025, 0.24, 0.03, 1), "jersey", scale=10))
    dress(newt_meshes, "Bottoms", fabric("Newt.shorts", (0.24, 0.25, 0.11, 1), "jersey", scale=8, rough=0.9))
    shoe = bpy.data.materials.new("Newt.sneakers"); shoe.use_nodes = True; shoe["restyled"] = True
    sb = shoe.node_tree.nodes["Principled BSDF"]
    sb.inputs["Base Color"].default_value = (0.62, 0.04, 0.04, 1); sb.inputs["Roughness"].default_value = 0.5
    dress(newt_meshes, "Shoes", shoe)


fix_materials()
restyle_outfits()

# Newt is about nine: scale him to 1.25 m tall (Dash is ~1.8 m)
bpy.context.view_layer.update()
_nz = [(o.matrix_world @ Vector(c)).z for o in newt_meshes for c in o.bound_box]
newt_rig.scale = newt_rig.scale * (1.25 / (max(_nz) - min(_nz)))
dash_rig.rotation_euler.z += math.radians(18)
newt_rig.rotation_euler.z += math.radians(-14)
bpy.context.view_layer.update()
for r in (dash_rig, newt_rig):
    arms_down(r)


def name_print(rig, target, text, bone, anchor, facing, height, color, name):
    """the character's name printed on their clothes: a text decal that hugs the cloth (live shrinkwrap) and rides
    on a bone"""
    cu = bpy.data.curves.new(name, "FONT")
    cu.body = text
    cu.align_x, cu.align_y = "CENTER", "CENTER"
    cu.size = height
    cu.offset = height * 0.035  # a little bolder
    cu.resolution_u = 6
    tmp = bpy.data.objects.new(name + ".tmp", cu)
    sc.collection.objects.link(tmp)
    right = UP.cross(facing).normalized() if facing.dot(fwd_of(rig)) > 0 else facing.cross(UP).normalized()
    right = UP.cross(facing).normalized()
    tmp.matrix_world = Matrix((right, UP, facing)).transposed().to_4x4() @ Matrix.Identity(4)
    tmp.matrix_world.translation = anchor
    bpy.context.view_layer.update()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    W = tmp.matrix_world.copy()
    bpy.data.objects.remove(tmp, do_unlink=True)
    ob = bpy.data.objects.new(name, me)
    sc.collection.objects.link(ob)
    ob.matrix_world = W
    ink = bpy.data.materials.new(name + ".ink"); ink.use_nodes = True
    b = ink.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = color; b.inputs["Roughness"].default_value = 0.55
    ob.data.materials.append(ink)
    tr = ob.modifiers.new("tri", "TRIANGULATE")
    sub = ob.modifiers.new("dense", "SUBSURF"); sub.subdivision_type = "SIMPLE"; sub.levels = sub.render_levels = 3
    sw = ob.modifiers.new("hug", "SHRINKWRAP"); sw.target = target; sw.offset = 0.0015
    sw.wrap_method = "PROJECT"  # straight back onto the cloth along the print's own axis: letters keep their shape
    sw.use_project_z = True; sw.use_negative_direction = True; sw.use_positive_direction = False
    ob.parent = rig; ob.parent_type = "BONE"; ob.parent_bone = B(rig, bone).name
    bpy.context.view_layer.update()
    ob.matrix_world = W
    return ob


def bone_world(rig, bone):
    return rig.matrix_world @ B(rig, bone).head


bpy.context.view_layer.update()
dash_shirt = [o for o in dash_meshes if o.name.endswith("Shirt")][0]
newt_shirt = [o for o in newt_meshes if o.name.endswith("Tops")][0]
fD = fwd_of(dash_rig)
chestD = bone_world(dash_rig, "Spine2") + UP * 0.03
name_print(dash_rig, dash_shirt, "DASH", "Spine2", chestD + fD * 0.16, fD, 0.075, (1, 1, 1, 1), "Dash.name.front")
name_print(dash_rig, dash_shirt, "DASH", "Spine2", chestD - fD * 0.16, -fD, 0.11, (1, 1, 1, 1), "Dash.name.back")
fN = fwd_of(newt_rig)
chestN = bone_world(newt_rig, "Spine2") + UP * 0.02
name_print(newt_rig, newt_shirt, "NEWT", "Spine2", chestN + fN * 0.14, fN, 0.042, (1, 1, 1, 1), "Newt.name.front")
name_print(newt_rig, newt_shirt, "NEWT", "Spine2", chestN - fN * 0.14, -fN, 0.06, (1, 1, 1, 1), "Newt.name.back")


# studio (same as the episode close-ups): Poly Haven HDRI light + blue gradient backdrop
w = bpy.data.worlds.new("Studio"); sc.world = w; w.use_nodes = True
nt = w.node_tree; nt.nodes.clear()
out = nt.nodes.new("ShaderNodeOutputWorld")
env = nt.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(ROOT, "blender/assets/polyhaven/blue_photo_studio/blue_photo_studio_2k.hdr"), check_existing=True)
bg_env = nt.nodes.new("ShaderNodeBackground"); bg_env.inputs["Strength"].default_value = 0.9
nt.links.new(env.outputs["Color"], bg_env.inputs["Color"])
tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Window"], sep.inputs[0])
ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].color = (0.50, 0.78, 0.98, 1); ramp.color_ramp.elements[1].color = (0.10, 0.42, 0.88, 1)
nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"])
bg_cam = nt.nodes.new("ShaderNodeBackground"); nt.links.new(ramp.outputs["Color"], bg_cam.inputs["Color"])
lp = nt.nodes.new("ShaderNodeLightPath"); mix = nt.nodes.new("ShaderNodeMixShader")
nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"]); nt.links.new(bg_env.outputs["Background"], mix.inputs[1])
nt.links.new(bg_cam.outputs["Background"], mix.inputs[2]); nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])


def area(name, loc, look, size, energy, color):
    ld = bpy.data.lights.new(name, "AREA"); ld.size = size; ld.energy = energy; ld.color = color
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o)
    o.location = loc; o.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()


area("Key", (-1.6, -2.2, 2.4), (0, 0, 1.2), 1.6, 380, (1.0, 0.95, 0.88))
area("Rim", (1.8, 1.6, 2.2), (0, 0, 1.3), 1.0, 320, (0.82, 0.9, 1.0))
area("Fill", (2.0, -2.0, 1.2), (0, 0, 1.0), 2.0, 90, (1, 1, 1))
cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); sc.collection.objects.link(cam)
sc.camera = cam; cam_d.dof.use_dof = True
sc.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "METAL"; prefs.get_devices()
    for dv in prefs.devices:
        dv.use = True
    sc.cycles.device = "GPU"
except Exception as ex:
    print("GPU setup failed:", ex)
sc.cycles.samples = 96; sc.cycles.use_denoising = True
sc.view_settings.view_transform = "AgX"
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1080, 1920, 50


def head(rig):
    pb = B(rig, "Head")
    return rig.matrix_world @ pb.head.lerp(pb.tail, 0.5)


def shoot(name, loc, look, lens, fstop):
    cam.location = loc
    cam.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    cam_d.lens = lens; cam_d.dof.focus_distance = (Vector(look) - Vector(loc)).length; cam_d.dof.aperture_fstop = fstop
    sc.render.filepath = os.path.join(OUT, f"{TAG}_{name}.png")
    bpy.ops.render.render(write_still=True)
    print("SHOT", sc.render.filepath)


bpy.context.view_layer.update()
allz = [(o.matrix_world @ Vector(c)).z for o in dash_meshes + newt_meshes for c in o.bound_box]
H = max(allz)
shoot("full", (0.0, -4.6 * H / 1.8, H * 0.5), (0.0, 0, H * 0.47), 50, 11)
for who, rig in (("dash", dash_rig), ("newt", newt_rig)):
    h = head(rig)
    fwd = fwd_of(rig)
    side = Vector((fwd.y, -fwd.x, 0))
    shoot(f"{who}_34", h + fwd * 0.6 + side * 0.35, h, 70, 4.0)
    shoot(f"{who}_front", h + fwd * 0.7, h, 70, 4.0)
# backs, to check the back prints
for r in (dash_rig, newt_rig):
    r.rotation_euler.z += math.pi
bpy.context.view_layer.update()
shoot("back", (0.0, -4.6 * H / 1.8, H * 0.5), (0.0, 0, H * 0.47), 50, 11)
for r in (dash_rig, newt_rig):
    r.rotation_euler.z -= math.pi
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender/mixamo_cast.blend"))
print("CAST DONE")
