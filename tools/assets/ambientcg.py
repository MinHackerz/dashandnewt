"""ambientCG (ambientcg.com): 2,000+ CC0 PBR materials (fabric, wood, metal, skin detail, ground…), free for any use.

No account needed; public API. Files land in blender/assets/ambientcg/<id>/ (git-ignored).

  python3 -I tools/assets/ambientcg.py search fabric                 # list ids
  python3 -I tools/assets/ambientcg.py get Fabric086 --res 2K --dry-run
  python3 -I tools/assets/ambientcg.py get Fabric086 --res 2K
"""
import argparse
import io
import json
import os
import sys
import urllib.parse
import urllib.request
import zipfile

API = "https://ambientcg.com/api/v2/full_json"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "blender", "assets", "ambientcg")
UA = {"User-Agent": "dash-and-newt-asset-fetch/1.0"}


def api(**params):
    url = API + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return json.load(r)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search"); s.add_argument("query")
    g = sub.add_parser("get"); g.add_argument("id"); g.add_argument("--res", default="2K", choices=["1K", "2K", "4K", "8K"]); g.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    if a.cmd == "search":
        d = api(q=a.query, type="Material", limit=40, sort="Popular")
        for x in d.get("foundAssets", []):
            print(f"{x['assetId']:20s} {x.get('displayName', '')}")
        print(f"({d.get('numberOfResults')} matches)")
        return
    d = api(id=a.id, include="downloadData")
    assets = d.get("foundAssets", [])
    if not assets:
        sys.exit(f"no asset {a.id}")
    dl = [x for x in assets[0]["downloadFolders"]["default"]["downloadFiletypeCategories"]["zip"]["downloads"] if x["attribute"] == f"{a.res}-JPG"]
    if not dl:
        sys.exit(f"{a.id} has no {a.res}-JPG download")
    x = dl[0]
    print(f"  {x['fileName']}  {x['size'] / 1e6:.1f} MB  {x['downloadLink']}  (CC0)")
    if a.dry_run:
        return
    with urllib.request.urlopen(urllib.request.Request(x["downloadLink"], headers=UA), timeout=180) as r:
        data = r.read()
    dest = os.path.join(OUT, a.id)
    os.makedirs(dest, exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for m in z.infolist():
            p = os.path.normpath(os.path.join(dest, m.filename))
            if not p.startswith(dest + os.sep) or m.is_dir():
                continue  # skip folders and anything that would escape the asset folder
            with z.open(m) as src, open(p, "wb") as f:
                f.write(src.read())
    print(f"→ {dest}  ({len(os.listdir(dest))} files)")


if __name__ == "__main__":
    main()
