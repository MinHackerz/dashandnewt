"""Keep long renders from overheating this laptop (stdlib only; works inside Blender's Python).

Signals, read without admin rights:
  - macOS thermal state (tools/render/thermal_state, from ProcessInfo.thermalState): 0 nominal, 1 fair, 2 serious,
    3 critical — the OS's own measure of how hot the chip and enclosure are.
  - battery temperature (ioreg AppleSmartBattery "Temperature", centi-°C) — the part most harmed by sustained heat.
  - power source: renders only run on the charger.

Policy (checked before every frame):
  - critical (3), or battery ≥ 45 °C            → stop rendering until state is nominal AND battery ≤ 37 °C
  - serious (2), or battery ≥ 42 °C             → same pause (cool down fully before continuing)
  - fair (1), or battery ≥ 39 °C                → keep going, but rest 45 s after each frame
  - on battery power                             → pause until the charger is back
Every check is appended to out/render_logs/thermal.csv (time, label, state, battery °C, action).

    import thermal_guard as tg
    tg.before_frame("s03 shot 03 frame 120")   # blocks while too hot
"""
import csv
import os
import re
import subprocess
import time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROBE = os.path.join(ROOT, "tools/render/thermal_state")
LOG = os.path.join(ROOT, "out/render_logs/thermal.csv")
NAMES = {0: "nominal", 1: "fair", 2: "serious", 3: "critical", -1: "unknown"}
FAIR_REST_S = int(os.environ.get("FAIR_REST_S", "45"))  # FAIR_REST_S=0: full speed while "fair"; serious/critical still pause
POLL_S = 30


def state():
    try:
        if not os.path.exists(PROBE):  # built on first use (git-ignored binary)
            subprocess.run(["swiftc", "-O", "-o", PROBE, PROBE.replace("thermal_state", "thermal.swift")],
                           check=True, capture_output=True, timeout=300)
        return int(subprocess.run([PROBE], capture_output=True, text=True, timeout=10).stdout.strip())
    except Exception:
        return -1


def battery_c():
    try:
        # read as bytes: some devices put non-UTF-8 bytes in their properties, which made a text read fail
        out = subprocess.run(["ioreg", "-l", "-w0"], capture_output=True, timeout=20).stdout.decode("utf-8", "replace")
        m = re.search(r'"Temperature"=(\d+)', out)  # the battery gauge's reading, centi-°C
        return int(m.group(1)) / 100.0 if m else None
    except Exception:
        return None


def on_charger():
    try:
        return "AC Power" in subprocess.run(["pmset", "-g", "batt"], capture_output=True, text=True, timeout=10).stdout
    except Exception:
        return True


def log(label, st, bt, action):
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    new = not os.path.exists(LOG)
    with open(LOG, "a", newline="") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["time", "label", "thermal_state", "battery_c", "action"])
        w.writerow([time.strftime("%Y-%m-%d %H:%M:%S"), label, NAMES.get(st, st), bt, action])


def _beat():
    try:
        with open(os.path.join(os.path.dirname(LOG), "heartbeat"), "w") as f:
            f.write(time.strftime("%Y-%m-%d %H:%M:%S"))
    except OSError:
        pass


def before_frame(label=""):
    """block until it is safe to render the next frame; returns seconds spent waiting"""
    waited = 0.0
    while True:
        st, bt, ac = state(), battery_c(), on_charger()
        b = bt if bt is not None else 0.0
        if not ac:
            log(label, st, bt, "paused: on battery")
            print(f"[thermal] on battery power: paused ({label})", flush=True)
        elif st >= 2 or b >= 42.0:
            log(label, st, bt, "paused: cooling down")
            print(f"[thermal] {NAMES.get(st)} / battery {bt} °C: cooling down ({label})", flush=True)
            while True:  # cool down fully: nominal and battery ≤ 37 °C
                time.sleep(POLL_S)
                waited += POLL_S
                _beat()  # tells the render watchdog this is a cool-down, not a frozen frame
                st, bt = state(), battery_c()
                if st == 0 and (bt is None or bt <= 37.0):
                    break
            log(label, st, bt, f"resumed after {int(waited)} s")
            continue
        elif st == 1 or b >= 39.0:
            log(label, st, bt, f"render, then rest {FAIR_REST_S} s")
            return -FAIR_REST_S  # caller rests after the frame
        else:
            log(label, st, bt, "render")
            return waited
        time.sleep(POLL_S)
        waited += POLL_S


def after_frame(token):
    if token is not None and token < 0:
        time.sleep(-token)
