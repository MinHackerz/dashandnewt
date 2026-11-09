# Ep 08 — Umbrella Duty

- **Composition:** `UmbrellaDuty` · 53.5 s · `src/episodes/ep08-umbrella-duty/`
- **Render:** `npm run render -- UmbrellaDuty` → `out/umbrella-duty.mp4`
- **Status:** approved by the user (2026-11-06); ready to publish.
- **Look:** 2D cartoon cast (`src/rig2d/Toon.tsx`) on a painted seaside promenade:
  - The beach shop on the left, with a flag on its roof.
  - An umbrella stand outside it.
  - The bus stop where Dash and Newt are waiting.
  - The sea, a railing and a lighthouse behind them.
- **Acting:** dead serious throughout. Dash is a ceremonial-guard-level rain protector, captioned in red. Newt is calm and polite. Nobody winks at the camera.
- **Clarity (user):** every gag-critical event reads without sound:
  - Close-ups on the raindrops.
  - A close-up bubble on the untied shoelace.
  - A "Hold this." caption.
  - Wind you can always see: the flag, slanted rain, leaves, wind streaks.
  - The lift-off in 4.4× slow motion, with the camera following him up the shop wall.
  - A time/height card for the balloon.
- **Readable chalk (user):** chalk lines are written on at 0.055 s per character (`ChalkText write`), then held until readable (`src/lib/read.ts → readTime`). The timeline is built around those durations.
- **Logline:** One raindrop lands on Newt's party hat, and Dash escalates: an umbrella, then a golf umbrella, then a 2.4 m beach parasol. He hands the parasol to Newt to tie his shoelace. A gust climbs the shop wall and Newt goes up with it. Dash finishes a perfect double knot and turns to an empty spot. Eight minutes later, 1 km up, Newt rises politely past a hot-air balloon whose passenger lowers his newspaper, nods, and raises it again.
- **Moral:** *Air resistance. / Bigger umbrella, bigger push.*
- **Everyday situation:** a rain shower while you wait for the bus, and a friend who holds an umbrella over you.
- **Teaches:** wind pushes on whatever you hold up to it, F = ½ρv²·C·A, so the push grows with the area. A small umbrella in a gust is fine; a beach parasol pushes about 580 N upward, which is more than a 25 kg kid's weight. Wind that hits a wall is forced upward.
- **Physics (one principle: drag):** Newt's flight is **simulated**, not keyframed, in `timeline.ts`:
  - The drag on the parasol uses relative wind, F = K|w − v|(w − v), plus gravity, ground contact and shoe friction (μ = 0.6).
  - The wind is a 6 m/s breeze that rises to a 16 m/s gust. It is deflected 40° up the shop wall, then carried by the shower cloud's updraft (11 m/s, within the real 5–15 m/s range).

## Set & plants (Chekhov rule)

- **The umbrella stand** holds a small umbrella, a golf umbrella and a tall folded beach parasol, all visible from the first wide shot.
- **The shop wall and roof flag:** the wind direction is always visible, and the wall is what turns the wind upward. Newt's first physics look shows exactly that.
- **The shower cloud** blows away with the gust. Then the sun comes out.
- **Dash's untied shoelace** dangles from frame 1, then gets a close-up.

## Beats (real time) — revised 2026-11-06 (user: natural lace-tying shown in close-up; Dash runs, jumps and just misses; grief; the balloon; a slow fade; dynamic camera on every key moment)

| Time | Beat |
|---|---|
| **0–2.6 s** | Wide establishing shot; they wait at the bus stop. Title. |
| **3.0–8.4 s** | **The drops:** a drop on Newt's hat (punch-in, tilted, then zoom out); the small umbrella's rim drips on him; the wind blows a drop sideways onto his shoe (low angle). **RAIN DETECTED**, then **UPGRADE: GOLF UMBRELLA**. |
| **8.5–14 s** | **Newt's look #1**, written on slowly: the wind hits the wall and is pushed UP. |
| **14.6–17.2 s** | **MAXIMUM PROTECTION:** Dash drags the parasol out; it opens, shown with a zoom-out reveal and a dutch angle. **PROTECTED ✓** |
| **17.2–19.2 s** | Close-up: *shoelace UNTIED*. **"Hold this."** Dash walks to a mooring bollard and puts his foot up on it (a natural stance, his hands on the shoe). |
| **19.2–22.2 s** | **Lace close-up** (**LACE PROTOCOL**): his hands pick up the ends, cross them, tuck and pull, make two loops, cross the loops and pull them into a bow. |
| **22.3–31 s** | **Newt's look #2**, written on slowly: *F = ½ρv²·C·A* (A = 4.5 m²), then *push UP ≈ 580 N > me: 275 N*, then *…oh.* Dash keeps tying in the background. |
| **31.3–33.4 s** | **The squall:** whip pan and dutch angle. The flag snaps and leaves fly. Newt skids to the shop wall and lifts off as the air turns up the wall. |
| **33.4–35.5 s** | **Lace close-up #2:** the loops cross again and are pulled hard. **DOUBLE KNOT: SECURED ✓** |
| **35.5–36.7 s** | Dash puts his foot down, turns to where Newt was: empty. |
| **36.7–37.8 s** | He looks up. A zoom-out and tilt reveal Newt floating up beside the shop wall. A brass alarm; Dash sprints. |
| **37.8–40.5 s** | **The jump, in slow motion** (a low angle, tight on his fingertips against Newt's shoe sole). He misses by 12 cm and lands. |
| **40.5–44.6 s** | **Grief:** both hands on his head. Newt politely waves goodbye with his free hand. The camera cranes up after Newt and leaves Dash at the bottom of the frame. |
| **44.6–50.1 s** | **"7 minutes later… 1 km up":** Newt rises past the hot-air balloon, notices it, and the passenger lowers his newspaper. They nod. He raises it again. A **slow fade to black.** |
| **50.1–53.5 s** | Moral card: *Air resistance. / Bigger umbrella, bigger push.* |

### The near-miss is derived, not staged
- The wind field near the shop is a stagnation flow: the wind slows toward the wall and turns up along it (KU = 0.58 of the wind speed); above the roof the cloud's updraft takes over.
- In it, Newt skids, lifts off and climbs the wall slowly (≈ 0.46 m/s), then at 2.2 m/s above the roof.
- Dash's best reach is his fingertips standing (1.85 m) plus his jump (0.45 m). `MISS_T` is the first moment Newt's soles are 12 cm beyond that. The run, the look-up, the stand-up and the knot close-up are all counted back from it.
- The jump is a true parabola that peaks exactly at `MISS_T`.

## Physics check (derived in `timeline.ts`)

| | |
|---|---|
| Canopy areas | Small 0.79 m², golf 1.77 m², parasol **4.52 m²** (C ≈ 1.2–1.3) |
| The gust on the parasol | 16 m/s → **≈ 900 N**; deflected 40° up the wall → **≈ 580 N up** |
| Newt + parasol | 28 kg → **275 N** down |
| The breeze before the gust | 6 m/s → only 81 N up, so he holds on fine |
| The same gust on the golf umbrella | 325 N in total, nowhere near enough to lift him |
| Simulated flight | Lifts off **0.25 s** into the gust after a short skid; climbs steadily at **2.2 m/s** in the updraft |
| Balloon height | 1 km at 2.2 m/s → **≈ 8 min**, which is the card's number |
| Balloon scene | The balloon and Newt drift with the same wind, so their sideways speeds match and only his climb moves him (relative motion). |
| Drops | Fall under the one `G`; the drip comes off the small umbrella's actual rim. |
| No overlaps | Dash steps back 0.5 m before kneeling. While flying, Newt is in his own depth lane, behind Dash. |

## Sound (all generated: `tools/sfx/ep08_umbrella.py`, numpy + `kit3d`; times via `node tools/sfx/ep08-times.mjs`)

- **Beds:** seaside ambience (surf, gulls, wind that swells with the gust and goes nearly silent 1 km up), and rain that follows the shower (muffled in the slow-mo).
- **Drops:** `drop-tink` on the hat, `drop-plip` on the head and shoe.
- **Umbrellas:** stand rattles; three umbrella opens (the bigger the canopy, the deeper the whump); umbrella drops; parasol drag; rain drumming on the canopy.
- **Laces:** tying rustles and the final tug.
- **Gust and slow-mo:** the `gust` (roar, whoosh, flag flutter); `slowmo-up` (sweep down, drone, slow heartbeat, a rising swell, snap back).
- **Balloon:** the burner, the newspaper.
- **Cast signatures** as always (`hero-blip`, `womp`, `kid-blip`, `chalk`, `chime`). No voice.
- **Score `score-umbrella`:**
  - A deadpan ceremonial march that steps up a key with each upgrade (snare, tuba, horn fanfares, cymbal on the parasol).
  - Thinking glock under Newt's looks, and a careful pizzicato for the lace-tying.
  - Hard silence through the gust (the sound effects carry it) and the empty spot.
  - A sad vibes line for the little umbrella, a music-box waltz 1 km up, and a major chord on the card.
- **Mix:** −22 LUFS integrated.

## Publish brief

```yaml
hook: "Never Hand a Kid a Beach Umbrella 🌂💨"
story:
  - "One raindrop. Dash's response: umbrella → golf umbrella → a 2.4 m BEACH PARASOL. Maximum protection. ☂️"
  - "Then he asks Newt to “hold this” while he ties his shoe… and a gust hits the shop wall and goes UP. 🌬️"
  - "🧠 The real physics: air resistance F = ½ρv²·C·A grows with AREA. The gust pushes a 4.5 m² parasol up with ~580 N, more than a 25 kg kid weighs (275 N). Bigger umbrella, bigger push."
question: "What's the most over-the-top thing a friend ever did to “protect” you? 👇"
keywords: [air resistance, drag force, physics explained, funny physics, umbrella fail, windy day umbrella, beach umbrella flying, wind gust, physics cartoon, funny animation, 2d animation, cartoon shorts, animated short, science cartoon, learn physics, overprotective friend, dark humor animation, dash and newt]
hashtags: [physics, umbrella]      # after the channel's #shorts #funnyanimation #cartoon
playlists: [newton, worst-ideas]
cover_s: 38.6                      # slow-mo near-miss: Dash's fingertips just under Newt's shoe
instagram:
  hook: "Never hand a kid a beach umbrella on a windy day 🌂💨"
  story:
    - |-
      One raindrop.
      Umbrella → golf umbrella → BEACH PARASOL.
      Maximum protection. ☂️
    - "“Hold this.” A gust hits the shop wall, goes UP… and so does Newt. Dash jumps — misses by a hair. 🎈"
    - "Physics: drag grows with area. A 4.5 m² parasol in a 58 km/h gust pushes up ~580 N, more than a kid weighs. 🧠"
  question: "Who's your overprotective friend? 👇"
  tag_friend: "Tag the friend who'd 100% hand you the parasol 😂"
  hashtags: [funnyanimation, physics, airresistance, cartoonanimation, dashandnewt]
  alt_text: >-
    2D cartoon animation at a rainy seaside bus stop. A very serious young man in an orange scarf
    protects a small boy in a party hat from raindrops with an umbrella, then a golf umbrella, then a
    huge striped beach parasol. He hands the parasol to the boy to tie his shoelace; chalk notes show
    air resistance, F = ½ρv²·C·A, and an upward push of 580 N against the boy's 275 N weight. A gust
    lifts the boy over the beach shop roof in slow motion. Later, 1 km up, the boy floats past a
    hot-air balloon whose passenger lowers his newspaper, nods politely and raises it again.
```
