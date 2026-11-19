"""Shared helpers for the free cloud renderers (Modal → Kaggle → Colab; see tools/render/cloud.py).

A job is tools/render/jobs/<name>.json: the .blend, the render script and its args, the shot plan (name → f0/f1), the
files and folders the render needs, and the env names the script reads for "cloud mode", the frame range, the output
folder and the GPU API (OPTIX/CUDA). Each runner renders whole contiguous runs of the frames the Mac does not have yet,
into the same <shot>/<frame>.png layout, at the job's own (final) settings: the cloud never lowers quality.
"""
import csv
import datetime as dt
import json
import os
import shutil
import subprocess
import sys
import tarfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BLENDER = "blender-5.2.3-linux-x64"
BLENDER_URL = f"https://download.blender.org/release/Blender5.2/{BLENDER}.tar.xz"
LEDGER = os.path.join(ROOT, "out/render_logs/cloud_ledger.csv")
LEDGER_COLS = ["date", "provider", "job", "gpu", "frames", "gpu_hours", "usd"]


def load(name):
    j = json.load(open(os.path.join(ROOT, "tools/render/jobs", f"{name}.json")))
    j["_plan"] = {k: v for k, v in json.load(open(os.path.join(ROOT, j["plan"]))).items() if not k.startswith("_")}
    return j


def missing(job, shots=None):
    """(shot, frame) pairs with no PNG on the Mac yet, in plan order"""
    out = []
    for s, p in job["_plan"].items():
        if shots and s not in shots:
            continue
        for f in range(p["f0"], p["f1"] + 1):
            if not os.path.exists(os.path.join(ROOT, job["local_out"], s, f"{f:04d}.png")):
                out.append((s, f))
    return out


def runs(frames, parts):
    """split frames into ~`parts` near-equal chunks, each cut into contiguous single-shot (shot, f0, f1) runs"""
    n = max(1, -(-len(frames) // max(1, parts)))
    jobs = []
    for i in range(0, len(frames), n):
        cur = None
        for s, f in frames[i:i + n]:
            if cur and cur[0] == s and cur[2] == f - 1:
                cur[2] = f
            else:
                if cur:
                    jobs.append(tuple(cur))
                cur = [s, f, f]
        if cur:
            jobs.append(tuple(cur))
    return jobs


def blender_cmd(job, root, shot):
    return ["blender", "-b", os.path.join(root, job["blend"]), "--python", os.path.join(root, job["script"]),
            "--", *job["args"], shot]


def blender_env(job, f0, f1, out_dir, compute="OPTIX"):
    env = dict(job.get("env", {}))
    env[job["frames_env"]] = f"{f0}-{f1}"
    env[job["out_env"]] = out_dir
    env[job["compute_env"]] = compute
    return env


def bundle(job, dest_tar):
    """the job's files as one .tar (paths relative to the project root), for Kaggle datasets and Colab via Drive"""
    with tarfile.open(dest_tar, "w") as t:
        for f in job["files"]:
            t.add(os.path.join(ROOT, f), arcname=f)
        for d in job["dirs"]:
            t.add(os.path.join(ROOT, d), arcname=d, filter=lambda ti: None if "__pycache__" in ti.name else ti)
    return dest_tar


def collect(src_dir, job):
    """copy <shot>/<frame>.png from a download folder into the job's output, never overwriting a Mac frame"""
    n = 0
    for s in os.listdir(src_dir):
        sd = os.path.join(src_dir, s)
        if not os.path.isdir(sd) or s not in job["_plan"]:
            continue
        os.makedirs(os.path.join(ROOT, job["local_out"], s), exist_ok=True)
        for f in os.listdir(sd):
            dst = os.path.join(ROOT, job["local_out"], s, f)
            if f.endswith(".png") and not os.path.exists(dst):
                shutil.copy2(os.path.join(sd, f), dst)
                n += 1
    return n


def ledger_add(provider, job, gpu, frames, gpu_hours, usd=0.0):
    new = not os.path.exists(LEDGER)
    os.makedirs(os.path.dirname(LEDGER), exist_ok=True)
    with open(LEDGER, "a", newline="") as fh:
        w = csv.writer(fh)
        if new:
            w.writerow(LEDGER_COLS)
        w.writerow([dt.datetime.now().isoformat(timespec="seconds"), provider, job, gpu, frames, f"{gpu_hours:.3f}", f"{usd:.2f}"])


def ledger_hours(provider, since):
    if not os.path.exists(LEDGER):
        return 0.0
    return sum(float(r["gpu_hours"]) for r in csv.DictReader(open(LEDGER))
               if r["provider"] == provider and dt.datetime.fromisoformat(r["date"]) >= since)


def sh(cmd, **kw):
    print("$", " ".join(cmd), file=sys.stderr, flush=True)
    return subprocess.run(cmd, check=True, **kw)
