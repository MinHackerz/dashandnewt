# Short — Why You Should NEVER Fry a Frozen Turkey

- **Status:** finished 2026-11-14 (final picture + calm sound mix). Not a Dash & Newt episode: a standalone narrated explainer.
- **Composition:** `FrozenTurkey` · 38.3 s · `src/episodes/s01-frozen-turkey/`
- **Render:** `bash tools/render.sh FrozenTurkey` → `out/frozen-turkey.mp4` (after the Blender frames are encoded into `public/renders/s01.mp4`)
- **Moral:** *Thaw it completely. Pat it dry. / Flame off before it goes in.*
- **Look:** realistic close-up studio style (docs: memory "realistic close-up style"); narration by ElevenLabs **Liam**.
- **Target:** US Thanksgiving, 2026-11-26.

## Assets

Downloaded with `tools/assets/sketchfab.py` into `blender/assets/sketchfab/<uid>/` (git-ignored). Real-world sizes to
set on import (as downloaded the scales are arbitrary):

| Role | Model | As imported | Set to |
|---|---|---|---|
| Turkey (raw bird, frosted in Blender) | `82c92a43…` whole raw chicken scan, 1.37 M faces | 1.0 m long | ~0.40 m long (a 12–14 lb turkey) |
| Gas supply | `d0fd95ad…` propane tank | 2.0 m tall | 0.46 m (20 lb tank) |
| Aftermath | `5676b179…` fire extinguisher | 2.0 m tall | ~0.5 m |
| Safe thawing | `35793d48…` refrigerator (door open) | 73.6 m tall (cm units) | 1.8 m |
| Oil thermometer | `ec924e5d…` meat thermometer (no textures: steel + black handle in Blender) | 0.31 m | as is |

Built in Blender (nothing suitable to download): fryer stockpot, ring burner stand, oil, ice, water droplets, steam,
eruption. Hands: Dash's realistic arms (`tools/blender/mixamo_cast.py`).
From the user (pending): JangaFX free fire/explosion VDBs → `blender/assets/inbox/jangafx/`; Mixamo "Putting Down",
"Startled", "Walking Backwards" → `blender/assets/inbox/mixamo/`.

## Credits (CC-BY 4.0 — paste into every platform description)

On screen in the final video:

- "whole raw chicken 3d model" by grodan — https://sketchfab.com/3d-models/whole-raw-chicken-3d-model-82c92a43fe0e4320bbbeba86dc0858a0
- "Propane Tank" by Oliver Triplett — https://sketchfab.com/3d-models/propane-tank-d0fd95adb402424c84ef6f715d529363
- "Fire Extinguisher" by Loïc — https://sketchfab.com/3d-models/fire-extinguisher-5676b179b3b744c0aaae53a3dcea2300
- "Meat thermometer" by FractDesign — https://sketchfab.com/3d-models/meat-thermometer-ec924e5d71634c60801b247beb5f4f76
- "Paper Towel Roll" by HippoStance — https://sketchfab.com/3d-models/paper-towel-roll-e10eb527561048b6bc1786c8c44cd0f5
- "Wall Clock" by FelipeMSX — https://sketchfab.com/3d-models/wall-clock-2e964ac0242e4b1789adfd9549c653dc
- "Autumn Leaves" by RBG_illustrations — https://sketchfab.com/3d-models/autumn-leaves-2ba028253c9241a38d4ab6d7bc63fb72
- 3D models licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Textures and lighting: Poly Haven (CC0).

Downloaded but not shown (no credit needed): "Refrigerator" by Francesco Coldesina (hidden: the thaw is a studio
time-lapse) and "Wooden Fence #free" by Abandoned Scans (the scan carries graffiti, so it was left out).

## Narration (ElevenLabs, Liam — premade voice `TX3LPaxmHKxFdv7VOQHJ`, model eleven_v4)

"This is what happens when you drop a frozen turkey into hot oil. The oil is about 350 degrees... and the turkey is
covered in ice. As the ice melts, the water sinks, because water is heavier than oil... and at the bottom, it
instantly boils! Steam takes up about 1,700 times more space than water. So the steam shoves the oil up and over the
pot... right onto the flame. Thanksgiving is already the worst day of the year for home cooking fires. So thaw it
completely, pat it dry, and turn the flame OFF before it goes in."

File `public/voices/s01/liam_full.mp3`; word timings `public/voices/s01/words.json` (ElevenLabs Scribe). Every cue in
`tools/blender/s01_times.json` is pinned to a word (`tools/blender/s01_times.py`).

## Fact check (sources)

| Claim | Value used | Source |
|---|---|---|
| Frying temperature | 350 °F (175 °C) | NPR 2023 "Frying turkeys can explode"; Scientific American "Why frozen turkeys explode when deep-fried" |
| Melt water sinks | water 1.00 g/mL vs oil ≈ 0.91 g/mL | Scientific American; Big Think "What happens when you deep fry a frozen turkey" |
| Water flashes to steam on the hot floor | boils at 100 °C ≪ 175 °C | same |
| Steam volume | ≈ 1,700× the liquid (Big Think: ≈1,600×) → narration says "about" | Scientific American; Univ. of Richmond explainer |
| "Thanksgiving is the worst day of the year for home cooking fires" | NFPA: peak day for U.S. home cooking fires (e.g. 1,160 in 2021, ~3× the daily average) | NFPA |
| Safe way: thaw fully, pat dry, flame off while lowering | | NPR; CPSC; USFA turkey-fryer guidance |
| Fridge thawing | ~1 day per 4–5 lb | USDA thawing guidance |

Physics computed (s01_times.py): a 4 mm melt drop sinks at its terminal speed ≈ 6.9 cm/s (Re ≈ 100, Schiller–Naumann
drag, oil μ ≈ 2.5 mPa·s at 175 °C) → 2.9 s to the floor; steam bubble diameter × (1,700)^(1/3) ≈ 11.9; bird volume
5.2 L → oil rises 6.3 cm. The cutaway is shown at SLOW MOTION ×4 (labelled), so ~3 s of real time fill the explanation.

## Build

```
python3 -I tools/blender/s01_times.py
Blender -b --python tools/blender/s01_set.py
Blender -b blender/s01_set.blend --python tools/blender/s01_fx.py
Blender -b blender/s01_fx.blend --python tools/blender/s01_shots.py
Blender -b blender/s01.blend --python tools/blender/s01_sims.py -- 112 96   # bakes the eruption + fire
Blender -b blender/s01.blend --python tools/blender/s01_extras.py
Blender -b blender/s01.blend --python tools/blender/s01_shots.py
Blender -b blender/s01.blend -a                                              # → out/blender/s01/
.venv/bin/python -I tools/sfx/s01_turkey.py public/sfx
bash tools/render.sh FrozenTurkey
```

## Publish brief

Generated with `node tools/publish/cli.mjs prepare content/publish/s01-frozen-turkey.yaml` (the yaml-path form, since
`publish:prepare` only lists `epNN-` sheets), then edited by hand: the channel defaults are Dash & Newt copy (title
suffix, footer, cartoon tags, Comedy, the all-episodes playlist), and the CC-BY credits above are added to every
description. A `--force` regenerate loses those edits.

```yaml
profile: explainer
hook: "Why You Should NEVER Fry a Frozen Turkey 🦃🔥"
story:
  - "A frozen turkey is covered in ice. Frying oil is about 350°F (175°C). Put them together and it goes wrong within seconds. 🧊"
  - "The ice melts, and water is heavier than oil, so it sinks to the bottom of the pot. Down there it instantly boils, and steam takes up about 1,700 times more space than the water it came from."
  - "That steam shoves the oil up and over the rim, right onto the burner flame. 🔥"
  - "The safe way: thaw it completely (about a day in the fridge for every 4 to 5 lb), pat it dry, and turn the flame OFF before the turkey goes in."
question: "Have you ever seen a turkey fryer go wrong? 👇"
keywords: [frozen turkey, deep fried turkey, turkey fryer fire, never fry a frozen turkey, why frozen turkeys explode, thanksgiving safety, thanksgiving, turkey fryer, how to deep fry a turkey safely, steam explosion, cooking safety, science explained, physics explained, how it works, 3d animation, science shorts]
hashtags: [thanksgiving, science]
playlists: []
cover_s: 27.5
credits: |-
  3D model credits (CC BY 4.0, https://creativecommons.org/licenses/by/4.0/), via Sketchfab:
  "whole raw chicken 3d model" by grodan: https://sketchfab.com/3d-models/whole-raw-chicken-3d-model-82c92a43fe0e4320bbbeba86dc0858a0
  "Propane Tank" by Oliver Triplett: https://sketchfab.com/3d-models/propane-tank-d0fd95adb402424c84ef6f715d529363
  "Fire Extinguisher" by Loïc: https://sketchfab.com/3d-models/fire-extinguisher-5676b179b3b744c0aaae53a3dcea2300
  "Meat thermometer" by FractDesign: https://sketchfab.com/3d-models/meat-thermometer-ec924e5d71634c60801b247beb5f4f76
  "Paper Towel Roll" by HippoStance: https://sketchfab.com/3d-models/paper-towel-roll-e10eb527561048b6bc1786c8c44cd0f5
  "Wall Clock" by FelipeMSX: https://sketchfab.com/3d-models/wall-clock-2e964ac0242e4b1789adfd9549c653dc
  "Autumn Leaves" by RBG_illustrations: https://sketchfab.com/3d-models/autumn-leaves-2ba028253c9241a38d4ab6d7bc63fb72
  The models were resized and re-textured for this video.
instagram:
  hook: "Never fry a FROZEN turkey 🦃🔥"
  story:
    - "Ice melts, the water sinks under the oil, and at the bottom it flashes into steam: about 1,700 times more space. The oil has nowhere to go but up and over, onto the flame."
    - "Thaw it completely, pat it dry, flame OFF before it goes in."
  question: "Ever seen a turkey fryer go wrong? 👇"
  tag_friend: "Send this to whoever is frying the turkey this year 🦃"
  hashtags: [thanksgiving, turkey, science, cookingsafety, 3danimation]
  alt_text: >-
    Realistic 3D animation with a narrator. A frozen, frost-covered turkey on a rack is lowered toward a pot of
    hot oil on an outdoor gas burner; a dial reads 350 degrees Fahrenheit. A slow-motion cutaway of the pot shows
    melted ice sinking as water drops through the oil and flashing into steam bubbles at the bottom. The oil
    boils over the rim onto the burner and catches fire. The ending shows the safe way: the turkey thawing on a
    tray while a clock spins, its skin patted dry, then lowered into the pot with the burner off.
```

