"""Pick a free cloud GPU for a render job and run it (user rule, 2026-11-20: every render goes to the cloud, free tiers
only). Order: Modal (until this month's $30 free credit is nearly used) → Kaggle (≈30 free GPU-hours a week) → Colab
(free T4, run by hand in the browser). Quality never changes between providers: every runner uses the job's own final
settings. The Mac renders only if all three are out, and only after telling the user.

    .venv-modal/bin/python tools/render/cloud.py status            # free quota left on each provider
    .venv-modal/bin/python tools/render/cloud.py plan <job>        # missing frames and what each provider would take
    .venv-modal/bin/python tools/render/cloud.py run <job>         # render the missing frames on the free provider(s)

Spend: Modal's real metered cost (`modal billing summary`); Kaggle and Colab hours from out/render_logs/cloud_ledger.csv.
"""
import argparse
import datetime as dt
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cloudjob as cj  # noqa: E402

BIN = os.path.join(cj.ROOT, ".venv-modal/bin")
MODAL_FREE_USD = 30.0
MODAL_MARGIN_USD = 1.5  # keep clear of the free line: billing lags by a few minutes
MODAL_L40S_USD_H = 1.95
MODAL_STARTUP_H = 0.05  # per container: image pull, scene load, kernel load
KAGGLE_WEEK_H = float(os.environ.get("KAGGLE_WEEK_H", "30"))
KAGGLE_SESSION_H = 11.0


def modal_spent():
    if not os.path.exists(os.path.expanduser("~/.modal.toml")):
        return None
    r = subprocess.run([f"{BIN}/modal", "billing", "summary", "--json"], capture_output=True, text=True)
    return float(json.loads(r.stdout)["metered_cost"]) if r.returncode == 0 else None


def kaggle_user():
    r = subprocess.run([f"{BIN}/kaggle", "config", "view"], capture_output=True, text=True)
    for line in r.stdout.splitlines():
        if line.strip().startswith("- username:") and line.split(":", 1)[1].strip() not in ("", "None"):
            return line.split(":", 1)[1].strip()
    return None


def kaggle_week_start():
    now = dt.datetime.now(dt.timezone.utc)
    sat = now - dt.timedelta(days=(now.weekday() - 5) % 7)  # quota week starts Saturday 00:00 UTC
    return sat.replace(hour=0, minute=0, second=0, microsecond=0).astimezone().replace(tzinfo=None)


def drive_ready():
    import glob
    return bool(glob.glob(os.path.expanduser("~/Library/CloudStorage/GoogleDrive-*/My Drive")))


def status():
    spent = modal_spent()
    kuser = kaggle_user()
    kused = cj.ledger_hours("kaggle", kaggle_week_start())
    s = {
        "modal": {"logged_in": spent is not None, "spent_this_month_usd": spent,
                  "free_left_usd": None if spent is None else round(MODAL_FREE_USD - spent, 2)},
        "kaggle": {"logged_in": bool(kuser), "used_this_week_h": round(kused, 2),
                   "left_this_week_h": round(KAGGLE_WEEK_H - kused, 2)},
        "colab": {"drive_for_desktop": drive_ready(),
                  "used_today_h": round(cj.ledger_hours("colab", dt.datetime.now() - dt.timedelta(days=1)), 2)},
    }
    return s


def plan(job, frames):
    spf = job.get("sec_per_frame", {})
    l40s, t4 = spf.get("L40S", 25), spf.get("T4", 110)
    n = len(frames)
    gpus = min(6, max(1, n // 20))
    usd = (n * l40s / 3600 + gpus * MODAL_STARTUP_H) * MODAL_L40S_USD_H
    return {"frames": n, "modal_usd": round(usd, 2), "modal_gpus": gpus, "modal_wall_h": round(n * l40s / 3600 / gpus, 2),
            "kaggle_h": round(n * t4 / 7200, 2), "colab_h": round(n * t4 / 3600, 2), "usd_per_frame": l40s / 3600 * MODAL_L40S_USD_H}


def run(name):
    job = cj.load(name)
    frames = cj.missing(job)
    if not frames:
        return print(f"{name}: every frame is rendered")
    st, p = status(), plan(job, frames)
    print(json.dumps({"status": st, "plan": p}, indent=1))
    env = dict(os.environ, RENDER_JOB=name)

    left = (st["modal"]["free_left_usd"] or 0) - MODAL_MARGIN_USD
    if st["modal"]["logged_in"] and left > 0.5:
        fit = len(frames) if p["modal_usd"] <= left else int(left / (p["usd_per_frame"] * 1.15))
        if fit:
            print(f"→ Modal: {fit} of {len(frames)} frames (≈${min(p['modal_usd'], left):.2f} of ${left + MODAL_MARGIN_USD:.2f} free left)")
            subprocess.run([f"{BIN}/modal", "run", "tools/render/modal_render.py::main", "--gpus", str(p["modal_gpus"]),
                            "--limit", str(fit)], cwd=cj.ROOT, env=env, check=True)
            frames = cj.missing(job)
            if not frames:
                return print("done on Modal")

    while frames and st["kaggle"]["logged_in"] and st["kaggle"]["left_this_week_h"] > 0.5:
        hours = min(KAGGLE_SESSION_H, st["kaggle"]["left_this_week_h"] - 0.5)
        print(f"→ Kaggle: up to {hours:.1f} h on T4×2 for {len(frames)} frames")
        subprocess.run([f"{BIN}/python", "tools/render/kaggle_render.py", name, "--hours", f"{hours:.2f}"], cwd=cj.ROOT, check=True)
        frames, st = cj.missing(job), status()
    if not frames:
        return print("done")

    if st["colab"]["drive_for_desktop"]:
        subprocess.run([f"{BIN}/python", "tools/render/colab_render.py", "prepare", name], cwd=cj.ROOT, check=True)
        print("→ Colab: open render-jobs/colab_render.ipynb (Drive) in Colab with a T4 and Run all, "
              f"then `colab_render.py collect {name}`")
    else:
        print(f"{len(frames)} frames left and no free provider available: ask the user before rendering on the Mac")
    sys.exit(2)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["status", "plan", "run"])
    ap.add_argument("job", nargs="?")
    a = ap.parse_args()
    if a.cmd == "status":
        print(json.dumps(status(), indent=1))
    elif a.cmd == "plan":
        j = cj.load(a.job)
        print(json.dumps(plan(j, cj.missing(j)), indent=1))
    else:
        run(a.job)
