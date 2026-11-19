# Short sNN — Title

- **Status:** idea | in production (date) | finished (date): final `out/slug.mp4`
- **Series:** science shorts (`sNN`): realistic Blender explainer, Liam narration (docs/SHORTS.md)
- **Composition:** `CompositionId` · NN.N s · `src/episodes/sNN-slug/`
- **Render:** `python3 tools/render/finish.py sNN` → `out/slug.mp4`
- **Moral:** *one line the viewer keeps*
- **Rules:** no on-screen text (real object prints OK); 38–60 s; quality first (docs/SHORTS.md)
- **Look:** one subject per close-up, sky-blue studio, macro, f/8–16
- **Physics:** one principle: …

## Narration (ElevenLabs, Liam, premade voice `TX3LPaxmHKxFdv7VOQHJ`, model eleven_v4)

"…"

Take used: `public/voices/sNN/liam_takeN.mp3`; word timings `public/voices/sNN/words.json` (Scribe, same take).

## Fact check

| Claim | Value used | Source |
|---|---|---|

## Physics rules for every shot

| Topic | Shown | Why it is right |
|---|---|---|

## Shots (from `tools/blender/sNN_times.json`)

| Shot | Time (s) | Set | Narration |
|---|---|---|---|

## Assets

| Role | Source | Licence / notes |
|---|---|---|

## Credits (CC BY 4.0: paste into every platform description)

- 

## Sound (`tools/sfx/sNN_slug.py`, seeded, original)

## Build and render

```bash
python3 -I tools/blender/sNN_times.py
# scene build scripts, in order
.venv-modal/bin/python tools/render/cloud.py run sNN
python3 tools/render/picture.py sNN
.venv/bin/python -I tools/sfx/sNN_slug.py public/sfx
python3 tools/render/finish.py sNN
```

## Files

| What | Where |
|---|---|

## Publish brief

```yaml
profile: explainer
hook: "…"
story:
  - "…"
question: "… 👇"
moral: "…"
keywords: []
hashtags: []
playlists: []
cover_s: 0
credits: |-
  …
instagram:
  hook: "…"
  story: ["…"]
  question: "… 👇"
  tag_friend: "…"
  hashtags: []
  alt_text: >-
    …
```
