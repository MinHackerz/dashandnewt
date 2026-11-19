# Free 3D assets: where they come from and how they get in

Reels are monetized, so every asset must allow commercial use in video. Allowed: **CC0**, **CC-BY** (credit line in
the description), Mixamo, Fab Standard Licence. Never: **NC / non-commercial**, "editorial", or anything with no
licence shown. Downloaded files live under `blender/assets/` (git-ignored: re-fetch on a fresh clone) and are never
redistributed.

## Fetched by Claude (no account, CC0)

| Source | What | Command |
|---|---|---|
| Poly Haven | studio HDRIs, scanned textures, props | `python3 -I tools/assets/polyhaven.py search hdris studio` · `get <id> --res 2k` |
| ambientCG | 2,000+ PBR materials | `python3 -I tools/assets/ambientcg.py search fabric` · `get <id> --res 2K` |

Add `--dry-run` to see files and sizes first. Claude asks before each download.

## Downloaded by you in Brave → drop folder

Save into `blender/assets/inbox/<source>/` (Finder: the project folder → blender → assets → inbox). Claude sorts,
checks the licence, imports and credits them.

### Mixamo (mixamo.com, signed in with Adobe) → `inbox/mixamo/`
1. **Animations** tab → search the name Claude gives you (e.g. `Reaching Out`).
2. Press **Download** with: **Format** FBX Binary (.fbx) · **Skin** Without Skin · **Frames per second** 30 ·
   **Keyframe reduction** none. (Tick **In Place** for walks, so the character doesn't drift.)
3. Free, usable in commercial video. No credit needed.

### Sketchfab (sketchfab.com) → fetched by Claude with your API token
`python3 -I tools/assets/sketchfab.py search "door handle" [--rigged]` lists only downloadable **CC0 / CC-BY** models;
`get <uid>` downloads the .glb into `blender/assets/sketchfab/<uid>/` with a `CREDIT.txt` (CC-BY credits go in the
publish copy). Other licences (NonCommercial, NoDerivs, ShareAlike, Editorial, Standard) are refused.
One-time setup (you, not Claude): sketchfab.com → Settings → **Password & API** → copy your API token, then in Terminal
`mkdir -p ~/.config/sketchfab && pbpaste > ~/.config/sketchfab/token && chmod 600 ~/.config/sketchfab/token`.
Never paste the token into chat or the repo.

### Smithsonian 3D (3d.si.edu, no account) → `inbox/smithsonian/`
1. Open a model → **Download** (choose the **.glb**, medium/high quality).
2. Only items marked **CC0** ("Open Access").

### Fab (fab.com, Epic account) → `inbox/fab/`
1. Filter **Free**; prefer formats **.blend / .glb / .fbx**. Claim the item, then download.
2. Fab Standard Licence: fine in our videos; files are never shared.

### Meshy (meshy.ai, free account) → `inbox/meshy/`
AI-generated props and creatures when nothing suitable exists on Sketchfab, Poly Haven or Fab. The free plan has no API
(the Meshy MCP server needs Pro), so you generate in the browser and Claude takes over from the drop folder.
1. Claude gives you a prompt (or a reference image) for each model. **Image to 3D** from one clean subject on a plain
   background gives the most detail; **Text to 3D** is fine for simple props.
2. Generate with textures on, pick the best of the variants, then **Download** as **.glb** (mesh and textures in one
   file). Name it after the role, e.g. `fryer-basket.glb`.
3. Budget: 100 free credits a month (one model ≈ 5–20 credits).
4. Licence: free-plan models are **CC BY 4.0**. Commercial use is fine with a credit line in every platform description:
   `Model created with Meshy (meshy.ai) – CC BY 4.0`. Claude writes a `CREDIT.txt` next to each imported model and puts the
   prompt in the episode sheet so the model can be re-made.
5. Meshy meshes are dense and their scale is arbitrary: Claude sets real-world size on import, and decimates or remeshes
   them before close-ups.

## Voice and sound effects: ElevenLabs
Paid plan (Starter or above) = commercial use of generated voice and sound effects. Voice takes go in
`public/voices/<episode>-eleven/` and are fitted to the picture by a `tools/audio/` script. Sound effects come from a
seeded generator in `tools/sfx/` or from ElevenLabs (keep the generation prompt in the episode sheet so it can be
re-made). With the ElevenLabs connector connected, Claude generates both directly.
