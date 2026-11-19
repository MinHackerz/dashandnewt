# Short s03 — Why Your Laptop Gets So HOT When Rendering

Everything this short needs, in one place: the rules, script, facts, shots, assets, credits, sound, the build and render commands, and the publish copy. Every code file it uses is listed under [Files](#files).

- **Status:** finished 2026-11-20. The final is `out/hot-laptop.mp4` (51.9 s, 1080×1920, 30 fps) plus a phone copy `out/hot-laptop-share.mp4`. Not yet published.
- **Series:** science shorts (`sNN`): realistic Blender explainers narrated by Liam. Not a Dash & Newt episode.
- **Composition:** `HotLaptop` · 51.9 s · `src/episodes/s03-hot-laptop/`. Audio only; the picture is the encoded Blender render.
- **Render:** `python3 tools/render/finish.py s03` → `out/hot-laptop.mp4`.
- **Moral:** *Never block the vents.*
- **Rules (user, 2026-11-17):**
  - No subtitles, captions, labels or titles in the picture; the narration carries the words.
  - Printed text that real objects carry (key letters, battery and SSD labels, chip markings) stays.
  - Length 38–60 s. Take 3–7 days if that is what quality needs.
- **Look** (the reference style, user, 2026-11-16):
  - One subject in a clean sky-blue studio void with a soft floor shadow, and soft studio light.
  - Macro close-ups, f/8–16.
  - A gentle bloom only on the brightest things.
- **Physics:** one principle, Joule heating: current through a material turns electrical energy into heat.

## Narration (ElevenLabs, Liam, premade voice `TX3LPaxmHKxFdv7VOQHJ`, model eleven_v4)

"Your laptop is rendering a video… and it's getting hot. Through a thermal camera, the heat comes from one spot. Right
above the chip. So let's go inside. Under this copper plate is the chip. And on it, billions of tiny switches called
transistors. Every time one switches, electrons are pushed through the silicon. They bump into its atoms, and every bump
turns a little electricity into heat. A render flips these switches billions of times a second. So almost all the power
the chip uses… becomes heat. To carry it away, this copper pipe holds a little water. The chip turns it into vapour, the
vapour rushes to the cold end, turns back into water, and soaks back through. Then a fan blows air through thin metal
fins, and out the side vents. That's why this side gets so hot. So never block the vents."

**Take 2** (`public/voices/s03/liam_take2.mp3`) is the one used. Its word timings are in `public/voices/s03/words.json` (ElevenLabs Scribe); its pauses match the timings to within 0.02 s, while take 1 is 0.15–0.3 s off. The narration starts 0.25 s in (`VO_OFFSET`).

## Fact check

| Claim | Basis |
|---|---|
| Billions of transistors on a laptop chip | Current laptop chips carry tens of billions (e.g. Apple's M3: 25 billion, Apple, Oct 2023). |
| Switching billions of times a second | Clock speeds of 3–5 GHz, i.e. billions of cycles a second. |
| Electrons bumping into atoms makes heat | Joule heating: carriers scatter off the lattice (phonons), turning electrical energy into heat. |
| Almost all the power becomes heat | Light, sound and stored data take a negligible share of a CPU's power; the rest leaves as heat. |
| Heat pipe = copper pipe with a little water | A sealed copper pipe with water at low pressure: it evaporates at the hot end, condenses at the cold end, and the wick returns the liquid (latent heat). |
| Fan through fins, out the side vents | A blower fan pushes air through the fin stack at the exhaust vents. |

## Physics rules for every shot (user, 2026-11-17: "nothing illogical in terms of physics")

| Topic | Shown | Why it is right |
|---|---|---|
| How hot | Heat only ever appears through a **thermal camera** (iron false-colour palette; the narration says "thermal camera", no on-screen label). Nothing glows to the eye. | Laptop chips run up to ~100 °C under load; metal only starts to glow visibly at ~500 °C. A glowing chip would be false. |
| Where the heat is made | In the thermal view the silicon fins (the channels) are hottest, the gates next, wiring and oxide cooler. On the die, the CPU cores and GPU are hot, caches cooler, edges coolest; hotspots spread smoothly. | Heat is produced where current flows and electrons scatter (the channels); it spreads by conduction. |
| Electrons | Flow inside the silicon fin's channel, from source to drain, only where the gate is on; the front fin is shown see-through (X-ray), the gates over it cut away (a cut-away; no label). | Electrons travel through the channel in the semiconductor, not over its surface. |
| Fan | A blower (centrifugal) fan: air drawn in through its face, thrown outward by the spinning impeller, out through the scroll's opening into the fin stack and out through the slots in the LEFT side of the case (the only exhaust on this laptop's outside). Impeller spins the same way the scroll widens (counter-clockwise from above). | That is how laptop blowers move air; spinning the wrong way would barely push air. |
| Heat pipe | Sealed copper pipe: liquid evaporates at the chip end, vapour flows to the fins, condenses (giving up heat), liquid returns through the wick. | Standard heat-pipe operation (latent heat). |
| Heat pipe cut-away (F) | Flattened copper pipe cut open: 0.4 mm sintered-copper wick (0.1 mm grains), vapour streaks hot → cold end, water beads creeping back through the wick 10× slower; in the thermal view the pipe is nearly one temperature end to end. | A heat pipe is almost isothermal; vapour is invisible in reality, so it is drawn as faint steam (a visualisation). |
| Airflow (B) | Faint streaks: drawn into the fan's face, spun with the blades, through the fins, out of the left slots. | Air is invisible; streaks are the standard visualisation. Hot air is NOT drawn in thermal shots (air is nearly transparent in long-wave IR). |
| Fin stack | 55 thin aluminium fins at ~1.1 mm pitch right behind the left-side exhaust slots, the heat pipes passing through every fin, in the fan's outlet. | Fins only cool when air is blown through them. |
| Energy | "Almost all the power a laptop draws ends up as heat." | The energy leaving as light (screen), sound and stored data is tiny compared with the heat. |

Numbers to verify with sources before the narration is written: typical laptop chip power under full load, transistor
count of a current laptop chip, clock frequency, maximum chip temperature, heat-pipe working fluid (water) and pressure.

## Assets

| Role | Source | Notes |
|---|---|---|
| Laptop (exterior) | Sketchfab `a14d471f…` "Laptop" by CG Soul Motion (CC-BY) | 15.6" at real size; all materials made in Blender; screen UI built in Blender (generic editor, no words, no brands); old trackpad + buttons replaced by one glass pad |
| The man | Renderpeople "Eric rigged 001" (free rigged person, 8K textures; `blender/assets/renderpeople_free/`) | Renderpeople licence: commercial use in renders allowed; the model itself is not redistributed |
| Insides, chip, transistors | built in Blender | board, components, cold plate, heat pipes, fin stack, blower fan, battery, speakers, Wi-Fi card, cables, package, die (generated floorplan + heat map), FinFET array, electrons |
| Studio light | Poly Haven `blue_photo_studio` (CC0) | |


## Shots (real time, from `tools/blender/s03_times.json`; every boundary is pinned to a word)

| Shot | Time (s) | Set | Thermal | Narration |
|---|---|---|---|---|
| s01_typing | 0.00–4.09 | E |  | Your laptop is rendering a video… and it's getting hot. |
| s02_thermal | 4.09–9.01 | E | yes | Through a thermal camera, the heat comes from one spot. Right above the chip. |
| s03_diveA | 9.01–10.57 | A |  | So let's go inside. |
| s04_diveB | 10.57–12.81 | B |  | Under this copper plate is the chip. |
| s05_diveC | 12.81–14.25 | C |  | And on it, billions of |
| s06_diveD | 14.25–16.57 | D |  | tiny switches called transistors. |
| s07_electrons | 16.57–20.57 | D |  | Every time one switches, electrons are pushed through the silicon. |
| s08_bump | 20.57–25.45 | D | yes | They bump into its atoms, and every bump turns a little electricity into heat. |
| s09_array | 25.45–28.89 | D | yes | A render flips these switches billions of times a second. |
| s10_die | 28.89–32.57 | C | yes | So almost all the power the chip uses… becomes heat. |
| s11_pipes | 32.57–33.69 | B |  | To carry it away, |
| s12_hotend | 33.69–37.61 | F |  | this copper pipe holds a little water. The chip turns it into vapour, |
| s13_vapour | 37.61–39.65 | F |  | the vapour rushes to the cold end, |
| s14_coldend | 39.65–42.41 | F |  | turns back into water, and soaks back through. |
| s15_fan | 42.41–45.37 | B |  | Then a fan blows air through thin metal fins, |
| s16_vents | 45.37–46.81 | B |  | and out the side vents. |
| s17_touch | 46.81–49.21 | E |  | That's why this side gets so hot. |
| s18_end | 49.21–51.89 | E | yes | So never block the vents. |

Sets:
- A: laptop exterior.
- B: insides.
- C: chip.
- D: transistors.
- E: the man at his desk.
- F: heat-pipe cut-away.

The dive joins (A→B→C→D) dissolve over 8 frames. Every other cut is hard.

## Credits (CC BY 4.0: paste into every platform description)

- "Laptop" by CG Soul Motion: https://sketchfab.com/3d-models/laptop-a14d471ffda04d38a1910b9ef87e8dff (modified and re-textured)
- 3D person: Renderpeople (renderpeople.com). Their licence allows use in renders; the model itself is never redistributed or committed.
- Studio lighting: Poly Haven (CC0).

## Sound (`tools/sfx/s03_laptop.py`, seeded, original)

Every layer is placed on the video clock inside its own file:
- typing ticks on Eric's keystrikes (`s03_keystrikes.json`);
- the fan hum;
- the dive whooshes;
- the switching crackle;
- the thermal-camera click and hum;
- the heat-pipe hiss;
- the touch.

The score is a soft pad with a sparse pulse.

Mix levels in `HotLaptop.tsx`: voice ≈ −25 LUFS, score ≈ −41, fan ≈ −39, action sounds −33 to −38. The master is −14 LUFS with true peak −2 dB (done by `finish.py`).

## Build and render

```bash
python3 -I tools/blender/s03_times.py                      # shot times from the narration's word timings
bash tools/blender/s03_build_all.sh                        # set → chip → person → extra → dive → blender/s03_set.blend
blender -b blender/s03_set.blend --python tools/blender/s03_shots.py   # 18 cameras, lights, per-frame settings
.venv-modal/bin/python tools/render/cloud.py run s03      # render missing frames on free cloud GPUs (docs/CLOUD_RENDER.md)
python3 tools/render/picture.py s03                       # frames → public/renders/s03.mp4 (dissolves, CRF 12)
.venv/bin/python -I tools/sfx/s03_laptop.py public/sfx    # sounds + score
python3 tools/render/finish.py s03                        # sound mix → out/hot-laptop.mp4 (+ -share copy)
```

Render settings (`tools/blender/s03_rig.py` → `final_quality`, used by `s03_render.py final`):
- 1080×1920;
- Cycles at 384 samples, adaptive threshold 0.006 (minimum 128);
- OpenImageDenoise at high quality, with albedo and normal passes;
- 12 bounces, 32 transparency bounces, no caustics;
- AgX view transform;
- 16-bit PNG output.

How it actually rendered (2026-11-20):
- 1,231 frames on the Mac (M5 GPU, about 130 s a frame);
- 326 frames on Modal (L40S, 21 s a frame, about $4 of free credit);
- the test frame matched across the two at PSNR 58 dB.

Mac-only helpers are kept for reference: `tools/render/s03_final.sh` (a thermal-guarded local render) and `s03_qa.py` / `s03_qa_watch.sh` (frame QA).

## Files

| What | Where |
|---|---|
| This sheet (everything about the short) | `content/episodes/s03-hot-laptop.md` |
| Publish copy (generated from the brief below, reviewed before posting) | `content/publish/s03-hot-laptop.yaml` |
| Narration takes, word timings | `public/voices/s03/` |
| Shot times, plan, keystrikes | `tools/blender/s03_times.py`, `s03_times.json`, `s03_plan.json`, `s03_keystrikes.json` |
| Scene build | `tools/blender/s03_set.py`, `s03_chip.py`, `s03_person.py`, `s03_extra.py`, `s03_dive.py`, `s03_shots.py`, `s03_lib.py`, `s03_rig.py`, `s03_build_all.sh` |
| Frame renderer | `tools/blender/s03_render.py` (Mac or cloud: `S03_CLOUD`, `S03_FRAMES`, `S03_OUT`, `S03_COMPUTE`) |
| Cloud render job | `tools/render/jobs/s03.json` |
| Sound | `tools/sfx/s03_laptop.py` → `public/sfx/s03-*.wav` (git-ignored, rebuilt) |
| Edit (audio) | `src/episodes/s03-hot-laptop/HotLaptop.tsx`, registered in `src/Root.tsx` |
| Outputs (git-ignored) | `blender/s03_set.blend`, `out/blender/s03/`, `public/renders/s03.mp4`, `out/hot-laptop.mp4` |

## Publish brief

```yaml
profile: explainer
hook: "Why Your Laptop Gets So HOT (Inside the Chip) 🔥💻"
story:
  - "Why does your laptop get so hot when it renders a video or plays a game? Through a thermal camera, all the heat comes from one spot: right above the chip. 🔥"
  - "Inside that chip are billions of tiny switches called transistors. Every time one switches, electrons are pushed through the silicon, bump into its atoms, and each bump turns a little electricity into heat. A heavy job flips these switches billions of times a second, so almost all the power the chip uses ends up as heat."
  - "To get rid of it, a sealed copper heat pipe holds a little water. The hot chip turns it into vapour, the vapour rushes to the cold end, turns back into water, and soaks back through the wick to do it again. 💧 Then a fan blows air through thin metal fins and out the side vents."
  - "That's why one side of your laptop gets so hot, and why you should never block the vents. 🚫"
question: "Does your laptop get hot on your lap? 👇"
moral: "Never block the vents."
keywords: [why laptop gets hot, laptop overheating, laptop heat, how laptops cool down, heat pipe, how heat pipes work, laptop fan, laptop cooling, cpu heat, why cpu gets hot, transistors, how transistors work, how a cpu works, inside a laptop, inside a computer chip, thermal camera, joule heating, rendering, laptop vents, physics explained, tech explained, computer science, electronics, satisfying science, how things work]
hashtags: [laptop, science, physics, technology]
playlists: []
cover_s: 5.5
credits: |-
  3D model credit (CC BY 4.0, https://creativecommons.org/licenses/by/4.0/), via Sketchfab:
  "Laptop" by CG Soul Motion: https://sketchfab.com/3d-models/laptop-a14d471ffda04d38a1910b9ef87e8dff
  The model was modified and re-textured for this video.
  3D person: Renderpeople (renderpeople.com). Studio lighting: Poly Haven (CC0).
instagram:
  hook: "Why your laptop gets so HOT 🔥💻"
  story:
    - "Billions of tiny switches flip billions of times a second, and every flip turns a little electricity into heat."
    - "A copper heat pipe full of water carries it to the fins, and the fan blows it out the side vents. 💧"
  question: "Does your laptop get hot on your lap? 👇"
  tag_friend: "Send this to the friend who games on their bed 🛏️"
  hashtags: [laptop, science, technology, howthingswork, 3danimation]
  alt_text: >-
    Realistic 3D animation with a narrator. A man types on a laptop at a desk; a thermal-camera view shows the
    heat gathered above the chip. The camera dives inside the laptop, past the copper cooling plate, onto the chip and
    down to rows of tiny transistors where glowing electrons flow through the silicon and the thermal view turns hot.
    A cut-open copper heat pipe shows vapour rushing to the cold end and water creeping back through the wick, then
    a blower fan pushes air through thin metal fins and out of the side vents. The man touches the hot side of the
    laptop and pulls his hand back.
```
