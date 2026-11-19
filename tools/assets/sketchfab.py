"""Sketchfab (sketchfab.com): search and download ready-made 3D models for the episodes.

Only licences that are safe for monetized video are allowed:
  CC0 (no credit) and CC-BY (credit line in the publish copy). NonCommercial, NoDerivs, ShareAlike, Editorial and
  store ("Standard") licences are refused.
Searching needs no account. Downloading needs YOUR Sketchfab API token (sketchfab.com → Settings → Password & API),
stored by you in a private file — never pasted into chat or committed:
    mkdir -p ~/.config/sketchfab && pbpaste > ~/.config/sketchfab/token && chmod 600 ~/.config/sketchfab/token
(or the SKETCHFAB_API_TOKEN environment variable). This script reads it only to authorise the download request.

  python3 -I tools/assets/sketchfab.py search "door handle" [--rigged] [--max-faces 200000]
  python3 -I tools/assets/sketchfab.py info <uid>
  python3 -I tools/assets/sketchfab.py get <uid>            # → blender/assets/sketchfab/<uid>/ (+ CREDIT.txt)
Files land in blender/assets/sketchfab/ (git-ignored).
"""
import argparse
import io
import json
import os
import sys
import urllib.parse
import urllib.request
import zipfile

API = "https://api.sketchfab.com/v3"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "blender", "assets", "sketchfab")
UA = {"User-Agent": "dash-and-newt-asset-fetch/1.0"}
ALLOWED = {"cc0": "CC0 (public domain)", "by": "CC-BY 4.0"}


def get_json(url, token=None):
    h = dict(UA)
    if token:
        h["Authorization"] = f"Token {token}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=40) as r:
        return json.load(r)


def token():
    t = os.environ.get("SKETCHFAB_API_TOKEN", "").strip()
    p = os.path.expanduser("~/.config/sketchfab/token")
    if not t and os.path.exists(p):
        t = open(p).read().strip()
    if not t:
        sys.exit("No Sketchfab API token. Put yours in ~/.config/sketchfab/token (see the top of this script).")
    return t


LICENSE_UIDS = {"7c23a1ba438d4306920229c12afcb5f9": "cc0", "322a749bcfa841b29dff1e8a1bb74b0b": "by"}


def lic(m):
    """licence slug; search results only carry the licence uid + label"""
    L = m.get("license") or {}
    return (L.get("slug") or LICENSE_UIDS.get(L.get("uid", ""), "") or "").lower()


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search"); s.add_argument("query"); s.add_argument("--rigged", action="store_true")
    s.add_argument("--max-faces", type=int, default=0); s.add_argument("--count", type=int, default=24)
    i = sub.add_parser("info"); i.add_argument("uid")
    g = sub.add_parser("get"); g.add_argument("uid")
    a = ap.parse_args()

    if a.cmd == "search":
        rows = []
        for license_slug in ALLOWED:
            q = {"type": "models", "q": a.query, "downloadable": "true", "count": a.count, "license": license_slug}
            if a.rigged:
                q["rigged"] = "true"
            if a.max_faces:
                q["max_face_count"] = a.max_faces
            for m in get_json(f"{API}/search?{urllib.parse.urlencode(q)}").get("results", []):
                if lic(m) in ALLOWED:
                    rows.append(m)
        seen = set()
        for m in sorted(rows, key=lambda m: -m.get("likeCount", 0)):
            if m["uid"] in seen:
                continue
            seen.add(m["uid"])
            print(f"{m['uid']}  {m['name'][:50]:50s}  {ALLOWED[lic(m)]:18s}  {m.get('faceCount', 0):>8} faces  ♥{m.get('likeCount', 0):<5} by {m['user']['username']}")
        print(f"({len(seen)} downloadable, commercial-safe)")
        return

    m = get_json(f"{API}/models/{a.uid}")
    slug = lic(m)
    print(f"{m['name']}  |  {(m.get('license') or {}).get('label')}  |  by {m['user']['displayName']} ({m['user']['username']})  |  {m.get('faceCount')} faces  |  {m['viewerUrl']}")
    if a.cmd == "info":
        return
    if slug not in ALLOWED:
        sys.exit(f"refused: licence '{slug}' is not safe for monetized video (allowed: CC0, CC-BY)")
    links = get_json(f"{API}/models/{a.uid}/download", token())
    fmt = "glb" if "glb" in links else ("gltf" if "gltf" in links else ("source" if "source" in links else None))
    if not fmt:
        sys.exit(f"no downloadable format offered: {list(links)}")
    url, size = links[fmt]["url"], links[fmt].get("size", 0)
    print(f"  downloading {fmt} ({size / 1e6:.1f} MB)")
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r:
        data = r.read()
    dest = os.path.join(OUT, a.uid)
    os.makedirs(dest, exist_ok=True)
    if fmt == "glb":
        open(os.path.join(dest, "model.glb"), "wb").write(data)
    else:  # gltf / source arrive zipped: extract safely inside the asset folder
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            for zi in z.infolist():
                p = os.path.normpath(os.path.join(dest, zi.filename))
                if zi.is_dir() or not p.startswith(dest + os.sep):
                    continue
                os.makedirs(os.path.dirname(p), exist_ok=True)
                with z.open(zi) as src, open(p, "wb") as f:
                    f.write(src.read())
    credit = f'"{m["name"]}" by {m["user"]["displayName"]} ({m["viewerUrl"]}), {ALLOWED[slug]}'
    open(os.path.join(dest, "CREDIT.txt"), "w").write(credit + "\n" + json.dumps({"uid": a.uid, "license": slug, "author": m["user"]["username"]}) + "\n")
    print(f"→ {dest}\n  credit: {credit}")


if __name__ == "__main__":
    main()
