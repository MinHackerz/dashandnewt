"""Dash's skin without the Mixamo "Ch42" tattoos (the see-through arm is clean skin, so his own arms must be too).

    Blender -b blender/mixamo_cast.blend --python tools/blender/s02_skin_clean.py
Reads the body's diffuse texture, finds the ink on skin areas (darker or off-colour against the local skin tone),
fills it with the surrounding skin tone (ink-free local average plus a little of the skin's own fine grain), and
writes blender/textures/dash_skin_clean.png, which s02_set.py uses.
"""
import os

import bpy
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "blender/textures/dash_skin_clean.png")
m = bpy.data.materials["Ch42_Body"]
img = [n.image for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image
       and any(l.to_socket.name == "Base Color" for o in n.outputs for l in o.links)]
if not img:  # the diffuse may feed a colour node first
    img = [n.image for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image and n.image.colorspace_settings.name == "sRGB"]
img = img[0]
w, h = img.size
px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
rgb = px[..., :3].copy()


def box(a, r):
    """box blur of radius r along both axes (cumulative sums), edge-clamped"""
    out = a
    for ax in (0, 1):
        p = np.pad(out, [(r + 1, r)] + [(0, 0)] * (out.ndim - 1) if ax == 0 else [(0, 0), (r + 1, r)] + [(0, 0)] * (out.ndim - 2), mode="edge")
        c = np.cumsum(p, axis=ax, dtype=np.float64)
        if ax == 0:
            out = (c[2 * r + 1:] - c[:-2 * r - 1]) / (2 * r + 1)
        else:
            out = (c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)
    return out.astype(np.float32)


def blur(a, r, passes=3):
    for _ in range(passes):
        a = box(a, r)
    return a


R = 24
B = blur(rgb, R)
lum, lumB = rgb.mean(-1), B.mean(-1)
r_, g_, b_ = B[..., 0], B[..., 1], B[..., 2]
# never touch the face/head island (top-right of the atlas: eyes, brows, lips must keep their detail)
yy, xx = np.mgrid[0:h, 0:w]
td = (h - 1 - yy) / h  # Blender rows run bottom-up; td = top-down fraction
face = (xx / w > 0.5) & (td < 0.315)
eyes = (xx / w > 0.29) & (xx / w < 0.52) & (td > 0.2) & (td < 0.33)
hands = (xx / w > 0.53) & (td > 0.3) & (td < 0.48)
skin = ~face & ~eyes & (r_ > g_) & (g_ > b_ * 0.95) & (r_ - b_ > 0.06) & (r_ - b_ < 0.5) & (r_ > 0.3) & (r_ < 0.97) & (g_ / np.maximum(r_, 1e-3) > 0.58)
ink = skin & ((lum < lumB * 0.86) | (np.abs(rgb - B).max(-1) > 0.11))
# a second pass with an ink-free local average, so heavy tattoos don't drag the reference tone down
clean = (~ink).astype(np.float32)[..., None]
for _ in range(2):
    B = blur(rgb * clean, R) / np.maximum(blur(clean, R), 1e-3)
    lumB = B.mean(-1)
    strict = (lum < lumB * 0.94) | (np.abs(rgb - B).max(-1) > 0.055)
    strong = (lum < lumB * 0.8) | (np.abs(rgb - B).max(-1) > 0.12)  # hands: only real ink, keep knuckles and nails
    ink = skin & np.where(hands, strong, strict)
    clean = (~ink).astype(np.float32)[..., None]
mask = blur(ink.astype(np.float32), 6, 1) > 0.02  # grow to catch the anti-aliased edges of the lines
soft = np.clip(blur(mask.astype(np.float32), 2, 2) * 1.6, 0, 1)[..., None]
# fill: the ink-free local skin tone (pores come from the skin shader's own micro-bump)
fill = B
rgb = rgb * (1 - soft) + fill * soft
px[..., :3] = np.clip(rgb, 0, 1)
print("SKIN px", int(skin.sum()), "INK px", int(mask.sum()), f"({100 * mask.sum() / max(1, skin.sum()):.1f} % of skin)")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
outimg = bpy.data.images.new("dash_skin_clean", w, h, alpha=True)
outimg.pixels = px.ravel()
outimg.filepath_raw = OUT
outimg.file_format = "PNG"
outimg.save()
print("WROTE", OUT)
