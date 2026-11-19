"""Shared helpers for the s03 Blender build scripts (copied from s03_chip.py so new scripts import one place).
mat / box / mesh_obj / coll / node / value, the thermal-camera shader (thermal_mix, iron palette) and shadow_clear."""
import math

import bmesh
import bpy
from mathutils import Vector

V = Vector
sc = bpy.context.scene


def node(nt, kind, **kw):
    n = nt.nodes.new(kind)
    for k, v in kw.items():
        if k in n.inputs:
            n.inputs[k].default_value = v
        else:
            setattr(n, k, v)
    return n


def mat(name, color=(0.8, 0.8, 0.8), metallic=0.0, rough=0.5, **extra):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    for k, v in extra.items():
        b.inputs[k].default_value = v
    return m


def coll(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in sc.collection.children:
        sc.collection.children.link(c)
    return c


def mesh_obj(name, build, material=None, c=None, smooth=True):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    build(bm)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    (c or sc.collection).objects.link(o)
    if material:
        o.data.materials.append(material)
    for p in o.data.polygons:
        p.use_smooth = smooth
    return o


def box(name, size, loc, material, c, bevel=0.0, segs=3):
    o = mesh_obj(name, lambda bm: (bmesh.ops.create_cube(bm, size=1.0), bmesh.ops.scale(bm, vec=size, verts=bm.verts)), material, c, smooth=bevel > 0)
    o.location = loc
    if bevel:
        bv = o.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments = bevel, segs
        bv.limit_method = "ANGLE"
        o.modifiers.new("wn", "WEIGHTED_NORMAL")
    return o


def value(nt, name, v=0.0):
    n = node(nt, "ShaderNodeValue", name=name, label=name)
    n.outputs[0].default_value = v
    return n


IRON = [(0.0, (0.01, 0.0, 0.04)), (0.22, (0.10, 0.0, 0.40)), (0.45, (0.62, 0.03, 0.42)), (0.66, (1.0, 0.30, 0.02)),
        (0.84, (1.0, 0.78, 0.10)), (1.0, (1.0, 0.98, 0.75))]


def thermal_mix(m, temp=None, temp_const=0.4, k_name="thermal_k"):
    """thermal camera: the surface → a flat iron-palette false colour of its temperature (0 cold … 1 hot) as
    thermal_k goes 0 → 1. A real chip peaks near 100 °C: nothing glows to the eye; heat is SHOWN this way."""
    nt = m.node_tree
    out = [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"][0]
    src = out.inputs["Surface"].links[0].from_socket
    k = value(nt, k_name)
    if temp is None:
        cv = value(nt, "temp_const", temp_const)
        temp = cv.outputs[0]
    # surfaces seen edge-on read a little cooler on a thermal camera (lower apparent emissivity): gives form
    lw = node(nt, "ShaderNodeLayerWeight", Blend=0.5)
    shp = node(nt, "ShaderNodeMapRange")
    nt.links.new(lw.outputs["Facing"], shp.inputs["Value"])
    shp.inputs["To Min"].default_value = 1.0
    shp.inputs["To Max"].default_value = 0.78
    tm = node(nt, "ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(temp, tm.inputs[0])
    nt.links.new(shp.outputs["Result"], tm.inputs[1])
    nz = node(nt, "ShaderNodeTexNoise", Scale=40.0, Detail=2.0)
    nzm = node(nt, "ShaderNodeMath", operation="MULTIPLY_ADD")
    nt.links.new(nz.outputs["Fac"], nzm.inputs[0])
    nzm.inputs[1].default_value = 0.04
    nt.links.new(tm.outputs[0], nzm.inputs[2])
    r = node(nt, "ShaderNodeValToRGB")
    els = r.color_ramp.elements
    els[0].position, els[0].color = IRON[0][0], (*IRON[0][1], 1)
    els[1].position, els[1].color = IRON[-1][0], (*IRON[-1][1], 1)
    for pos, col in IRON[1:-1]:
        e = els.new(pos)
        e.color = (*col, 1)
    nt.links.new(nzm.outputs[0], r.inputs["Fac"])
    em = node(nt, "ShaderNodeEmission", Strength=0.72)  # below the tone-mapper's highlight roll-off: keeps the palette saturated
    nt.links.new(r.outputs["Color"], em.inputs["Color"])
    mx_ = node(nt, "ShaderNodeMixShader")
    nt.links.new(k.outputs[0], mx_.inputs["Fac"])
    nt.links.new(src, mx_.inputs[1])
    nt.links.new(em.outputs["Emission"], mx_.inputs[2])
    nt.links.new(mx_.outputs["Shader"], out.inputs["Surface"])


def shadow_clear(m):
    """clear parts (glass/plastic covers, X-ray materials) must not cast solid shadows when caustics are off
    (final renders turn them off to avoid noise): shadow rays see a transparent surface instead"""
    nt = m.node_tree
    out = [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"][0]
    src = out.inputs["Surface"].links[0].from_socket
    lp = nt.nodes.new("ShaderNodeLightPath")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(lp.outputs["Is Shadow Ray"], mx.inputs["Fac"])
    nt.links.new(src, mx.inputs[1])
    nt.links.new(tr.outputs["BSDF"], mx.inputs[2])
    nt.links.new(mx.outputs["Shader"], out.inputs["Surface"])
