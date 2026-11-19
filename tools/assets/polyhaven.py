"""Poly Haven (polyhaven.com): CC0 HDRIs, textures and models, free for any use incl. monetized video.

No account needed; uses the public API (https://api.polyhaven.com). Files land in blender/assets/polyhaven/<id>/
(git-ignored; re-fetch on a fresh clone). Every file is checked against the API's md5.

  python3 -I tools/assets/polyhaven.py search hdris studio        # list ids (type: hdris | textures | models)
  python3 -I tools/assets/polyhaven.py get blue_photo_studio --res 2k --dry-run   # show files + sizes
  python3 -I tools/assets/polyhaven.py get blue_photo_studio --res 2k             # download
"""
import argparse
import hashlib
import json
import os
import sys
import urllib.request

API = "https://api.polyhaven.com"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "blender", "assets", "polyhaven")
UA = {"User-Agent": "dash-and-newt-asset-fetch/1.0"}


def api(path):
    with urllib.request.urlopen(urllib.request.Request(API + path, headers=UA), timeout=30) as r:
        return json.load(r)


def pick(files, res):
    """(relative path, url, size, md5) for one asset at one resolution. HDRIs: .hdr; textures: jpg maps + .blend; models: .blend + includes."""
    out = []
    if "hdri" in files:
        f = files["hdri"].get(res) or files["hdri"][sorted(files["hdri"])[0]]
        e = f["hdr"]
        out.append((os.path.basename(e["url"]), e["url"], e["size"], e["md5"]))
        return out
    if "blend" in files:
        f = files["blend"].get(res) or files["blend"][sorted(files["blend"])[0]]
        e = f["blend"]
        out.append((os.path.basename(e["url"]), e["url"], e["size"], e["md5"]))
        for rel, inc in e.get("include", {}).items():
            out.append((rel, inc["url"], inc["size"], inc["md5"]))
        return out
    for mapname, by_res in files.items():  # textures without a .blend: every map as jpg
        f = by_res.get(res) if isinstance(by_res, dict) else None
        if f and "jpg" in f:
            e = f["jpg"]
            out.append((os.path.basename(e["url"]), e["url"], e["size"], e["md5"]))
    return out


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search"); s.add_argument("type", choices=["hdris", "textures", "models"]); s.add_argument("query", nargs="?", default="")
    g = sub.add_parser("get"); g.add_argument("id"); g.add_argument("--res", default="2k"); g.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    if a.cmd == "search":
        assets = api(f"/assets?t={a.type}")
        q = a.query.lower()
        hits = [(k, v) for k, v in assets.items() if not q or q in k or q in " ".join(v.get("tags", []) + v.get("categories", [])).lower()]
        for k, v in sorted(hits, key=lambda kv: -kv[1].get("download_count", 0))[:40]:
            print(f"{k:40s} {', '.join(v.get('categories', [])[:4])}")
        print(f"({len(hits)} matches)")
        return
    files = pick(api(f"/files/{a.id}"), a.res)
    total = sum(f[2] for f in files)
    for rel, url, size, _ in files:
        print(f"  {rel:50s} {size / 1e6:7.1f} MB  {url}")
    print(f"{a.id}: {len(files)} files, {total / 1e6:.1f} MB (CC0)")
    if a.dry_run:
        return
    dest = os.path.join(OUT, a.id)
    for rel, url, size, md5 in files:
        path = os.path.normpath(os.path.join(dest, rel))
        if not path.startswith(dest + os.sep):
            sys.exit(f"refusing unsafe path {rel}")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if os.path.exists(path) and hashlib.md5(open(path, "rb").read()).hexdigest() == md5:
            continue
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
            data = r.read()
        if hashlib.md5(data).hexdigest() != md5:
            sys.exit(f"md5 mismatch for {rel}")
        open(path, "wb").write(data)
    print(f"→ {dest}")


if __name__ == "__main__":
    main()
