# Cloud rendering (free tiers only)

Every Blender render runs on free cloud GPUs, never on the fanless Mac and never on paid usage (user rule, 2026-11-20):

| Order | Provider | Free allowance | GPU | Runner |
|---|---|---|---|---|
| 1 | Modal | $30 credit a month (≈ 15 L40S-hours) | L40S, up to 8 at once | `tools/render/modal_render.py` |
| 2 | Kaggle Notebooks | ≈ 30 GPU-hours a week (resets Saturday 00:00 UTC), 12 h a session | T4 × 2 | `tools/render/kaggle_render.py` |
| 3 | Google Colab | one T4 when available, a few hours, tab must stay open | T4 | `tools/render/colab_render.py` |

One s03 frame (1080×1920, 384 spp, OIDN): Mac M5 Air ≈ 130 s, L40S 21 s. The T4 time is still an estimate until the first Kaggle or Colab run measures it. The cloud frame matched the Mac's at PSNR 58 dB.

## Use

```bash
.venv-modal/bin/python tools/render/cloud.py status        # free quota left everywhere
.venv-modal/bin/python tools/render/cloud.py plan s03      # missing frames, cost/time per provider
.venv-modal/bin/python tools/render/cloud.py run s03       # Modal until $28.50 is spent → Kaggle → Colab
```

**Jobs:** a job is `tools/render/jobs/<name>.json`. It names:
- the .blend, the render script and its arguments;
- the shot plan (shot → `f0`/`f1`);
- the files and folders the render needs;
- the environment variables the script reads for cloud mode, the frame range, the output folder and the GPU API (OptiX or CUDA).

**Render scripts:** the script must skip frames that already exist and write `<out>/<shot>/<frame>.png` (see `tools/blender/s03_render.py`).

**Where frames go:** only frames missing on the Mac are sent out, and the ones that come back are filed into the job's `local_out`.

**Ledger:** spend and hours go to `out/render_logs/cloud_ledger.csv`. For Modal, the real metered cost comes from `modal billing summary`.

## One-time logins (the user does these; the scripts never read the tokens)

**Modal**

```bash
.venv-modal/bin/modal setup
```

**Kaggle**
1. Sign up at kaggle.com and verify your phone number (Settings → Phone verification). GPUs and internet access in notebooks need it.
2. Go to Settings → API → **Create New Token**.
3. Move the downloaded `kaggle.json` to `~/.kaggle/kaggle.json` and run `chmod 600 ~/.kaggle/kaggle.json`. If Kaggle shows a new-style API token instead, save it as `~/.kaggle/access_token`.
4. Check it with `.venv-modal/bin/kaggle config view`, which should show your username.

**Colab**
1. Install **Google Drive for desktop** and sign in, so `~/Library/CloudStorage/GoogleDrive-…/My Drive` exists.
2. To render, `colab_render.py prepare <job>` puts the files and `render-jobs/colab_render.ipynb` in Drive.
3. Open that notebook in Colab, pick Runtime → T4 GPU, then Run all, and keep the tab open.
4. Run `colab_render.py collect <job>` to bring the frames back.
