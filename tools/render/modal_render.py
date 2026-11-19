"""Render a job's missing frames on Modal (NVIDIA L40S, OptiX), several GPUs at once. Normally started by
tools/render/cloud.py, which checks the month's free $30 first.

    RENDER_JOB=s03 .venv-modal/bin/modal run tools/render/modal_render.py::main --gpus 6
    RENDER_JOB=s03 .venv-modal/bin/modal run tools/render/modal_render.py::test --shot s14_coldend --frame 1191

The project is mounted at the same absolute path as on the Mac (some .blend files reference textures by absolute path).
Frames land in a Modal volume as <shot>/<frame>.png, then `main` downloads and files them into the job's output.
"""
import os
import subprocess
import sys
import tempfile
import time

import modal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cloudjob as cj  # noqa: E402

NAME = os.environ.get("RENDER_JOB", "s03")
JOB = cj.load(NAME)
ROOT = cj.ROOT
OUT = "/frames"
GPU = "L40S"

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("wget", "xz-utils", "libxrender1", "libxi6", "libxkbcommon0", "libsm6", "libgl1",
                 "libxxf86vm1", "libxfixes3", "libegl1", "libx11-6", "libxext6", "libgomp1")
    .run_commands(f"wget -q {cj.BLENDER_URL} -O /tmp/b.tar.xz", "tar -xJf /tmp/b.tar.xz -C /opt && rm /tmp/b.tar.xz",
                  f"ln -s /opt/{cj.BLENDER}/blender /usr/local/bin/blender")
    .env({"RENDER_JOB": NAME})
)
for f in ["tools/render/cloudjob.py", f"tools/render/jobs/{NAME}.json", JOB["plan"], *JOB["files"]]:
    image = image.add_local_file(os.path.join(ROOT, f), f"{ROOT}/{f}")
for d in JOB["dirs"]:
    image = image.add_local_dir(os.path.join(ROOT, d), f"{ROOT}/{d}", ignore=["__pycache__", "*.pyc"])

app = modal.App(f"render-{NAME}", image=image)
vol = modal.Volume.from_name(JOB.get("modal_volume", f"render-{NAME}"), create_if_missing=True)


@app.function(gpu=GPU, volumes={OUT: vol}, timeout=6 * 3600, cpu=8, memory=32768, max_containers=8)
def render(shot: str, f0: int, f1: int) -> str:
    env = dict(os.environ, **cj.blender_env(JOB, f0, f1, OUT, "OPTIX"))
    p = subprocess.Popen(cj.blender_cmd(JOB, ROOT, shot), env=env, cwd=ROOT, stdout=subprocess.PIPE,
                         stderr=subprocess.STDOUT, text=True)
    tail = []
    for line in p.stdout:
        if line.startswith(("FRAME", "SHOT DONE", "RENDER DONE")) or "Traceback" in line:
            print(f"[{shot} {f0}-{f1}] {line.rstrip()}", flush=True)
            if line.startswith("FRAME"):
                vol.commit()
        tail = (tail + [line])[-30:]
    p.wait()
    vol.commit()
    if p.returncode:
        raise RuntimeError(f"blender exited {p.returncode}:\n" + "".join(tail))
    return f"{shot} {f0}-{f1} ok"


def fetch():
    with tempfile.TemporaryDirectory() as tmp:
        cj.sh([os.path.join(ROOT, ".venv-modal/bin/modal"), "volume", "get",
               JOB.get("modal_volume", f"render-{NAME}"), "/", tmp, "--force"], stdout=subprocess.DEVNULL)
        n = cj.collect(tmp, JOB)
    print(f"filed {n} new frames into {JOB['local_out']}")
    return n


@app.local_entrypoint()
def test(shot: str = "", frame: int = 0):
    print(render.remote(shot, frame, frame))
    fetch()


@app.local_entrypoint()
def main(shots: str = "", gpus: int = 6, limit: int = 0):
    frames = cj.missing(JOB, shots.split(",") if shots else None)
    frames = frames[:limit] if limit else frames  # cloud.py caps a job to what the month's free credit covers
    jobs = cj.runs(frames, gpus)
    print(f"{NAME}: {len(frames)} frames in {len(jobs)} runs on up to {gpus}× {GPU}: {jobs}", flush=True)
    if not jobs:
        return
    t0 = time.time()
    for r in render.starmap(jobs, return_exceptions=True):
        print(r, flush=True)
    wall = (time.time() - t0) / 3600
    cj.ledger_add("modal", NAME, GPU, len(frames), wall * min(gpus, len(jobs)))
    fetch()
