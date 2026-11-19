# Science shorts playbook (sNN)

Realistic Blender explainers narrated by Liam (ElevenLabs), 38–60 s, vertical 1080×1920 at 30 fps. They run alongside the Dash & Newt cartoons (epNN, see PLAYBOOK.md). s03 "Why your laptop gets so hot" is the reference: **copy its files when you start a new one.**

## House rules (from the user)

- **No subtitles, captions, labels or titles on screen.** The narration carries the words. Printed text that real objects carry is fine.
- **Quality never drops.** Take up to 7 days per short if needed. Every visual must be physically and scientifically correct: write a physics-rules table before building.
- **Pacing:** a wide shot first, then a cut every 2–3 s, one idea per shot, plain language.
- **Look:** one subject per close-up on a clean sky-blue studio backdrop, macro detail at f/8–16, soft light, and bloom only on the brightest things.
- **Sound:** Liam's narration, a soft somber or curious score far under the voice, and only sounds caused by what's on screen. Never stock or meme audio, never non-commercial TTS.
- **Assets:** CC0 or CC-BY only (`tools/assets/`, see ASSETS.md). Credit every CC-BY model on every platform.
- **Rendering:** free cloud GPUs only (CLOUD_RENDER.md): Modal → Kaggle → Colab. The Mac renders only after asking the user.

## One short = one sheet + one set of files

Every short gets its own files, all named after its id `sNN-slug`. The sheet holds everything else.

| File | Role |
|---|---|
| `content/episodes/sNN-slug.md` | **The sheet.** Status, rules, narration, fact check, physics rules, shots, assets, credits, sound, build and render commands, a file map, and the Publish brief. Start from `content/episodes/_short-template.md`. |
| `content/publish/sNN-slug.yaml` | Publish copy, generated from the brief: `node tools/publish/cli.mjs prepare sNN`. |
| `public/voices/sNN/` | Narration takes, plus `words.json` (ElevenLabs Scribe word timings). Note in the sheet **which take** the timings belong to. |
| `tools/blender/sNN_*.py` | Scene build, `sNN_times.py` (shots pinned to words), `sNN_plan.json` (shot → set, frames, cut, dissolve), and `sNN_render.py` (cloud-ready; copy s03's). |
| `tools/render/jobs/sNN.json` | Cloud render job: files to ship, plan, times, picture, composition and final paths. Start from `tools/render/jobs/_template.json`. |
| `tools/sfx/sNN_slug.py` | Seeded sound and score generator. Each cue is placed on the video clock inside its file. |
| `src/episodes/sNN-slug/Comp.tsx` | Audio-only Remotion layer: the encoded picture plus one named `<Audio>` per sound. Register it in `src/Root.tsx`. |

## Pipeline

1. **Idea and facts.** Pick one principle. Write the narration (about 120–150 words for 50 s) and verify every number, with sources in the sheet.
2. **Narration.** Generate Liam (premade voice `TX3LPaxmHKxFdv7VOQHJ`, model eleven_v4) and save the takes to `public/voices/sNN/`. Transcribe the chosen take with Scribe into `words.json`.
3. **Timing.** `sNN_times.py` pins every shot boundary to a word and writes `sNN_times.json` (FPS, FRAMES, DUR, VO_OFFSET, SHOTS).
4. **Assets and build.** Download models (`tools/assets/`) and build the sets and cameras with the `tools/blender/sNN_*.py` scripts. Check stills of every shot before rendering.
5. **Render.** Run `.venv-modal/bin/python tools/render/cloud.py run sNN`. Check `cloud.py plan sNN` first for the cost; Modal's free $30 a month covers about 15 L40S-hours.
6. **Picture.** Run `python3 tools/render/picture.py sNN`, which builds `public/renders/sNN.mp4` with the dissolves at CRF 12.
7. **Sound.** Run `.venv/bin/python -I tools/sfx/sNN_slug.py public/sfx`. Then set levels in the composition: score about 15 LU under the voice, beds about 14 LU under, action sounds about 8–12 LU under.
8. **Finish.** Run `python3 tools/render/finish.py sNN`, which produces `out/<final>.mp4` at −14 LUFS with true peak −2 dB, plus a phone-sized copy.
9. **Review.** Tile stills of every shot, check the seams between Mac and cloud frames, check the narration sync against `words.json`, and listen for anything noisy.
10. **Publish.** Write the brief with `profile: explainer` and `credits:`, then run `node tools/publish/cli.mjs prepare sNN`. The user approves; never run `publish:approve` yourself.
