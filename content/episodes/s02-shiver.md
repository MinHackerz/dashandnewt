# Short s02 — Why You Shiver: Your Muscles Fight Each Other

- **Status:** in production (2026-11-15). Standalone narrated explainer like s01. The man at the bus stop is a photogrammetry scan (Renderpeople "Nathan", T-shirt and jeans), chosen over Dash at the user's request because a real person in just a T-shirt sells "cold" instantly.
- **Composition:** `Shiver` · 39.4 s · `src/episodes/s02-shiver/`
- **Render:** `bash tools/render.sh Shiver` → `out/shiver.mp4` (after the Blender frames are encoded into `public/renders/s02.mp4`)
- **Moral:** *Shivering = muscles fighting for heat. / A coat wins.*
- **Look (revised 2026-11-15 after review):** muscles are anatomical (fibres along each muscle's own axis, white tendon ends, shadowed seams, wet coat; an active muscle glows red-orange with its fibres still showing), the skin turns into a clear membrane, Dash's skin has subsurface light, pores and a cold flush on nose/ears/fingers, film look AgX Medium High Contrast.
- **Look:** realistic close-up studio style (sky-blue backdrop, soft studio light, macro detail). Human shots are kept
  short; most screen time is the thermal view, the see-through arm, the jaw and the skin macro.
- **Target:** the first cold snaps of November 2026; publish by Nov 20.
- **Physics:** one principle, energy conversion: muscles pulling against each other move nothing, so their energy
  becomes heat.

## Narration (ElevenLabs, Liam — premade voice `TX3LPaxmHKxFdv7VOQHJ` "Energetic, Social Media Creator", model eleven_v4)

"[excited] Ever wonder why you SHIVER when it's cold? [curious] Your body has one job: keep your insides warm. Your
hands and nose? It lets those go cold first. [dramatically] But when your core starts losing heat... your muscles
start a tug-of-war! The muscle on the front of your arm pulls... and the one on the back pulls right back. Nobody wins,
so your arm barely moves... and all that effort turns into HEAT. [excited] That's why your teeth chatter — your jaw is
doing it too! And goosebumps? Tiny muscles stand your hairs up, to fluff a fur coat we don't have anymore. [laughs] So
shivering keeps you warm... but honestly? Just wear a coat."

Take 1 of 2 (user's pick), 35.8 s: `public/voices/s02/liam_take1.mp3`; word timings `public/voices/s02/words.json`
(ElevenLabs Scribe). Every cue in `tools/blender/s02_times.json` is pinned to a word (`tools/blender/s02_times.py`).

## Fact check (sources)

| Claim (narration / picture) | Fact | Source |
|---|---|---|
| The body protects the core; hands and nose go cold first | Cold skin → hypothalamus narrows the blood vessels of the extremities (vasoconstriction), keeping warm blood at the core; nose, fingers and toes get less blood. | AccuWeather "5 ways your body combats cold" (Cleveland Clinic physician quoted); The Healthy "12 things that happen to your body when it's freezing" |
| When the core keeps losing heat, shivering starts | Shivering is the next defence when vasoconstriction isn't enough. | same |
| Front and back muscles pull at once, so the arm barely moves | Shivering is involuntary contraction with agonist and antagonist activity balancing out, so no external work is done. Picture: biceps and triceps glow together; the forearm only trembles. | Zubieta *New Human Physiology* ch. 21; Maloney, *Acta Physiologica* 2026 ("the muscle … performs no external work") |
| All that effort turns into heat | Because shivering does no mechanical work, most of the chemical energy is released as heat in the muscle; heat output rises to ~4–5× resting. | Lee et al., *Diabetes & Metabolism Journal* 2017 (skeletal-muscle thermogenesis review); National Academies, *Nutritional Needs in Cold and High-Altitude Environments*, ch. 9 |
| Teeth chatter: the jaw muscles shiver too | Chattering is shivering of the jaw muscles (masseter, temporalis), knocking the teeth together. | Colgate "Why are your teeth chattering?"; ScienceABC |
| Goosebumps: tiny muscles stand the hairs up, to fluff a fur coat we no longer have | The arrector pili muscle at each hair contracts and lifts it; in furry mammals that traps insulating air, in humans the hair is too sparse to help (a vestigial reflex). | Live Science "Why do we get goosebumps?"; Wikipedia "Goose bumps" |

No body-temperature number is spoken (98.6 °F is a rounded average). The thermal view is labelled only WARM / COLD.

## Beats and shots (real time, from `s02_times.json`; a cut every ~2–3 s, wide first)

| Time | Shot | Picture | Narration |
|---|---|---|---|
| 0–3.0 | wide | Snowy bus stop on the blue studio backdrop, snow falling. Dash in his tee, denim shorts and orange scarf, arms hugged tight, shivering (≈9 Hz tremor). Title: WHY YOU SHIVER. | "Ever wonder why you shiver when it's cold?" |
| 3.0–6.2 | medium, thermal | The picture flips to a thermal camera: chest orange-red, arms cooler. | "Your body has one job: keep your insides warm." |
| 6.2–9.3 | close, thermal | Push in on face and hands: nose, fingers and ears fade to blue. Labels WARM / COLD. | "Your hands and nose? It lets those go cold first." |
| 9.3–13.5 | arm, studio | Isolated upper arm on the blue backdrop (close-up style); the skin turns see-through: bone, biceps (front), triceps (back). | "But when your core starts losing heat… your muscles start a tug-of-war!" |
| 13.5–16.0 | biceps | The biceps lights up red and bulges. Arrow FRONT PULLS. | "The muscle on the front of your arm pulls…" |
| 16.0–17.8 | triceps | Orbit to the back: the triceps lights up and bulges. Arrow BACK PULLS. | "…and the one on the back pulls right back." |
| 17.8–20.6 | both | Both glow together, flickering; the forearm only trembles. Label NOBODY WINS. | "Nobody wins, so your arm barely moves…" |
| 20.6–23.0 | heat | Heat beads stream off both muscles; the arm goes orange. | "…and all that effort turns into HEAT." |
| 23.0–26.4 | jaw | Side view of Dash's lower face; the skin turns see-through; the jaw muscle glows and the teeth clack (≈7 Hz). | "That's why your teeth chatter — your jaw is doing it too!" |
| 26.4–28.3 | skin macro | Forearm skin macro: smooth, hairs lying flat. | "And goosebumps?" |
| 28.3–31.9 | skin macro | Bumps rise and the hairs stand up (raking light, so every bump casts a shadow). | "Tiny muscles stand your hairs up, to fluff a fur coat we don't have anymore." |
| 31.9–34.4 | wide | Back at the bus stop, Dash shivering harder. | "So shivering keeps you warm…" |
| 34.2–39.4 | wide | A puffer jacket flies in from off-screen right (Newt, with his kid-blip) on a ballistic arc (0.75 s, g = 9.81) and lands on Dash's head; it is cloth from the moment it touches and drapes over his head, sleeves dangling. His shiver dies away. Moral card from 37.0 s, with the CC-BY credits in small print. | "…but honestly? Just wear a coat." |

## Assets

- **The man:** Renderpeople "Nathan" (Sketchfab `143a2b1e…`, CC-BY): rig bones renamed to Mixamo names, scan seams welded and subdivided, skin mask from the texture (skin gets subsurface light, pores, a cold flush; the scan's near-black finger texture is replaced by his hand tone). Pose: forearms crossed tight, hands tucked into the armpits (two-bone IK); shiver procedural.
- **Built in Blender (procedural):** snow ground, falling snow, bus-stop sign, thermal shader, the see-through arm
  (skin shell from Dash's own arm, humerus, biceps, triceps), heat beads, teeth and jaw muscle, goosebump skin macro
  with standing hairs.
- **Downloaded** (2026-11-15, `tools/assets/sketchfab.py` / `polyhaven.py`, into `blender/assets/`, git-ignored):

| Role | Model | Notes |
|---|---|---|
| See-through arm | `d7315dec…` "Arm-01- Ecorche" | 2,525 separate pieces: the shoulder-girdle pieces are dropped, the biceps and triceps are picked out by piece; muscle shader, fitted skin and glow made in Blender |
| Teeth | `c4c569f0…` "Human teeth" | teeth + gums, textured |
| Jaw bone | `444884ba…` "Free Human skull" | untextured; bone shader in Blender |
| Coat | `ca50a464…` "Puffer Jacket" | textured |
| Snow ground / light | Poly Haven `snow_02` (2k) + `snowy_park_01` HDRI | CC0 |

## Credits (CC-BY 4.0 — paste into every platform description)

- "Nathan Animated 003 - Walking 3D Man" by Renderpeople — https://sketchfab.com/3d-models/nathan-animated-003-walking-3d-man-143a2b1ea5eb4385ae90a73657aca3bc
- "Arm-01- Ecorche" by westerly — https://sketchfab.com/3d-models/arm-01-ecorche-d7315decb9274e0e87ab819e631a0ae0
- "Human teeth" by Alexander Antipov — https://sketchfab.com/3d-models/human-teeth-c4c569f0e08948e2a572007a7a5726f2
- "Free Human skull" by Filip — https://sketchfab.com/3d-models/free-human-skull-444884ba91f24d51bc34bb44779ef689
- "Puffer Jacket" by sivayuce — https://sketchfab.com/3d-models/puffer-jacket-ca50a464389b4ea8aa4c748bd43ec480
- 3D models licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Textures and lighting: Poly Haven (CC0).

## Labels (Remotion, pointing at the real 3D spots)

`tools/blender/s02_anchors.py` projects the nose tip, a hand, the chest, the biceps and triceps bellies and the
masseter through the shot camera for every frame (`tools/blender/s02_anchors.json`); the labels' leader lines end on
them. Stamps: THERMAL CAMERA, X-RAY VIEW, ZOOM: FOREARM SKIN. Labels: WARM / COLD / COLD, FRONT MUSCLE: PULL!,
BACK MUSCLE: PULL!, NOBODY WINS, = HEAT, JAW MUSCLE.

## Sound (`tools/sfx/s02_shiver.py`, seeded, original)

Wind bed, Dash's shiver rustle, thermal-camera switch-on, x-ray shimmer, two muscle pulls, the tug-of-war tremble,
heat whoom, teeth and jaw chatter (one click per jaw closing, 7 Hz, matched to the animation), goosebump pops, coat
whoosh and landing, Newt's kid-blip (toss) and Dash's hero-blip (under the coat); a light music-box/pizzicato winter
underscore that stops for the landing and resolves under the moral card.

## Build

```
python3 -I tools/blender/s02_times.py
Blender -b --python tools/blender/s02_set.py                              # station A → blender/s02_set.blend
Blender -b blender/s02_set.blend --python tools/blender/s02_stations.py   # stations B, C, D
Blender -b blender/s02_set.blend --python tools/blender/s02_shots.py      # animation + 14 shots → blender/s02.blend
Blender -b blender/s02.blend --python tools/blender/s02_coat.py           # coat toss + cloth bake
Blender -b blender/s02.blend --python tools/blender/s02_anchors.py        # label anchors
Blender -b blender/s02.blend --python tools/blender/render_paced.py -- 0.15 1 1181 <cut frames>   # → out/blender/s02/
.venv/bin/python -I tools/sfx/s02_shiver.py public/sfx
SKIP_TAIL=1 bash tools/blender/s02_finish.sh                              # encode, final reel
```
Cut frames (no motion blur across a cut): 90,91,184,185,280,281,406,407,481,482,534,535,618,619,691,692,742,743,792,793,837,838,959,960,1025,1026.
Render: Cycles (Metal), 1080×1920 at 75 %, 96 samples adaptive + denoise, motion blur 0.4; ~25 s a frame on the M5.

## Publish brief

```yaml
profile: explainer
hook: "Why You SHIVER: Your Muscles Fight Each Other 🥶"
story:
  - "Your body has one job in the cold: keep your insides warm. Your hands and nose? It lets those go cold first. 🧤"
  - "When your core keeps losing heat, the muscles on the front and back of your arm pull at the same time. Nobody wins, so your arm barely moves, and all that effort turns into heat. 🔥"
  - "Your jaw does it too: that's why your teeth chatter. And goosebumps? Tiny muscles stand your hairs up to fluff a fur coat we don't have anymore."
  - "So shivering keeps you warm… but honestly? Just wear a coat. 🧥"
question: "Do your teeth chatter when you're cold? 👇"
keywords: [why do we shiver, shivering, why do you shiver when cold, teeth chattering, why do my teeth chatter, goosebumps, why do we get goosebumps, body heat, thermoregulation, muscles, cold weather, winter, science explained, how it works, 3d animation, science shorts, human body]
hashtags: [science, winter]
playlists: []
cover_s: 19.0
credits: |-
  3D model credits (CC BY 4.0, https://creativecommons.org/licenses/by/4.0/), via Sketchfab:
  "Nathan Animated 003 - Walking 3D Man" by Renderpeople: https://sketchfab.com/3d-models/nathan-animated-003-walking-3d-man-143a2b1ea5eb4385ae90a73657aca3bc
  "Arm-01- Ecorche" by westerly: https://sketchfab.com/3d-models/arm-01-ecorche-d7315decb9274e0e87ab819e631a0ae0
  "Human teeth" by Alexander Antipov: https://sketchfab.com/3d-models/human-teeth-c4c569f0e08948e2a572007a7a5726f2
  "Free Human skull" by Filip: https://sketchfab.com/3d-models/free-human-skull-444884ba91f24d51bc34bb44779ef689
  "Puffer Jacket" by sivayuce: https://sketchfab.com/3d-models/puffer-jacket-ca50a464389b4ea8aa4c748bd43ec480
  Textures and lighting: Poly Haven (CC0).
instagram:
  hook: "Why you SHIVER 🥶"
  story:
    - "Your arm muscles play tug-of-war against each other. Nobody wins, and all that effort becomes heat. 🔥"
    - "Teeth chattering? Same thing, in your jaw. Goosebumps? Fluffing fur you don't have. 🧥"
  question: "Teeth chatterer or goosebump person? 👇"
  tag_friend: "Tag the friend who's always cold 🥶"
  hashtags: [science, winter, humanbody, 3danimation, didyouknow]
  alt_text: >-
    Realistic 3D animation with a narrator. A young man in a T-shirt, shorts and an orange scarf shivers at a snowy
    bus stop with his arms crossed. A thermal-camera view shows his chest warm and his nose and hands cold. His arm
    turns see-through: the biceps and then the triceps light up and pull at the same time while the arm only
    trembles, and glowing heat rises from the muscles. Close-ups show teeth chattering and a skull whose jaw muscle
    glows as the jaw chatters, then a macro of forearm skin where goosebumps rise and the hairs stand up. At the end
    a puffy jacket is tossed in and lands on his head.
```

Credits (paste under the story in every description): see **Credits** above.
