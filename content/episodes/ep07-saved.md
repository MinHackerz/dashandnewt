# Ep 07 — Saved!

- **Composition:** `Saved` · 35.0 s · `src/episodes/ep07-saved/`
- **Render:** `npm run render -- Saved` → `out/saved.mp4`
- **Status:** built and rendered, waiting for review.
- **Look:** first **2D cartoon** episode (user, 2026-11-06: no 3D, no stickmen):
  - Dash and Newt are full 2D cartoon characters (`src/rig2d/Toon.tsx`: clothes, skin, hair, shoes). They use the same poses, faces and extras as the rig, so they look the same in every episode. Model sheet: the `CastSheet` still.
  - The street is painted in SVG: houses, trees and lamp posts behind, a two-lane road, and a grass verge with a knife-sharpener's cart. Depth works by lanes: further back = higher on screen, smaller, and slower parallax.
- **Acting direction (user):** everyone plays it **dead serious**.
  - Dash is a solemn, professional bodyguard: bodyguard captions in red ("THREAT DETECTED", "WATER HAZARD", "THREAT LEVEL: MAXIMUM").
  - Newt is calm and polite.
  - Nobody winks at the camera. The comedy is the gap between how serious they are and what's actually happening.
- **Anatomy (user):** elbows and knees only flex, never bend backwards (`rig2d/ik.ts → anatomical`). Hands that hold something are placed on it with 2-bone IK (`reach`): Dash and Newt holding hands, Dash taking the hat, the ghost patting his head and tugging his hand. When Newt's arm is pulled, his body follows it off his feet.
- **Logline:** Dash walks Newt down the road like an over-keen bodyguard. A car comes up behind them, safely in its own lane (Newt checked), and Dash "saves" Newt with one huge yank. The car passes; Dash closes his eyes in relief. Newt, who weighs 25 kg, flies sideways onto the knife-sharpener's cart. Ghost Newt pats Dash's head and shows him how gently he should have pulled.
- **Moral:** *F = ma. / Small friend — gentle pull.*
- **Everyday situation:** walking along a road with a friend when a car comes up behind you.
- **Teaches:** the same pull moves a light body much more than a heavy one (a = F/m). The pull that throws Newt would only make a grown-up take a step. Pull someone out of danger firmly, but don't heave.
- **Physics (one principle):** Newton's 2nd law / impulse (J = F·Δt = m·Δv). Everything is derived in `timeline.ts` with the shared `G`:
  - Newt's flight is a true parabola from the release point to the knife. He keeps his forward walking speed (inertia) while the yank throws him sideways toward the kerb.
  - The puddle flick sends him 0.6 m up when 0.1 m would do.
  - The car's sound has a real Doppler shift.

## Set & plants (Chekhov rule)

- **Cold open on the cart.** The knife-sharpener's cart is on the verge with a *KNIVES SHARPENED* sign, a grindstone, a big chef's knife standing point-up in a block on its front step (it glints), and two stacked tomato crates in front. They walk toward it for the whole episode.
- **Newt is light.** The puddle flick plants it.
- **The car is heard before it's seen:** an engine hum grows 2.5 s before it arrives.

## Beats (real time)

| Time | Beat |
|---|---|
| **0–2.4 s** · Hook | Close on the cart's upturned knife, which glints. Title: *"When your friend is a little TOO protective…"* |
| **2.4–4.2 s** · The walk | Dash walks on the kerb side with a grave bodyguard face; Newt walks half a step ahead, further out. A serious secret-agent pizzicato plays. |
| **4.2–7.9 s** · OVER-PROTECT #1 | A pigeon flaps up. **THREAT DETECTED.** Dash throws himself in front of Newt, arms wide, to a brass stab. The music freezes with him. The pigeon lands 2 m away and pecks. Dash nods gravely: **THREAT NEUTRALISED**. He waits for Newt to go ahead again. |
| **7.9–10.8 s** · OVER-PROTECT #2 | **WATER HAZARD.** Newt holds Dash's hand (IK) and Dash flicks him over a small puddle. Newt goes way too high and lands neatly, deadpan. Dash studies his own hand. |
| **10.8–13.5 s** · The car | A hum grows behind them. Newt glances back. **Physics look #1:** chalk shows the car's path along its own lane and *"gap ≈ 1.4 m ✓"*. Newt walks on, calm. |
| **13.5–14.2 s** · THE YANK | Dash glances back: **THREAT LEVEL: MAXIMUM**, with a snare roll. He grabs Newt's hand and heaves it in to his chest. Newt's arm straightens and his body follows it off the ground. |
| **14.2–19.6 s** · Slow motion (×16) | Time stretches into a low drone and a slow heartbeat. **Physics look #2:** chalk traces Newt's own trajectory ending in a red X on the knife tip, with *"a = F ÷ m"*, *"m = 25 kg … tiny → a = HUGE"* and *"(same pull on Dash, 70 kg: one step)"*. Newt facepalms in mid-air: *"…oh."* The car slides past behind. Dash shuts his eyes and puts a hand on his heart to a warm swell, while Newt tumbles past in front of him (nearer lane). |
| **19.8 s** · THUNK | The music cuts to silence. Off-screen behind the crates: a blade, wood and squashed tomatoes. The knife's handle wobbles with a twang, and one tomato rolls away across the grass. |
| **20.8–23.7 s** · The reveal | Dash opens his eyes and looks down at the crates. Newt's party hat is on the knife tip, still turning, and two little sneakers stick straight up behind the crates, motionless. *Womp.* |
| **23.7–25.4 s** · The hat | Dash walks over and lifts the hat off the knife tip (IK), then holds it to his chest. |
| **25.4–30.8 s** · Heart | Ghost Newt rises from behind the crates with his party hat and a halo, and a music-box version of the walking theme plays. He floats to Dash and pats his head twice. Then he takes Dash's hand and gives it a tiny, gentle tug: *this much*. He waves and floats up. |
| **30.8–35 s** · Moral card | *F = ma. / Small friend — gentle pull.* |

## Physics check (derived in `timeline.ts`)

| Quantity | Value |
|---|---|
| Masses | Dash 70 kg, Newt 25 kg |
| Newt's flight | Launch 2.5 m/s up from 1.05 m; lands with his hips at 0.85 m behind the crates after **0.60 s**. Forward walking speed is kept (inertia); the knife is placed where he lands. |
| Launch speed | **≈ 4.0 m/s** |
| Impulse | **J ≈ 99 N·s** (≈ 550 N for 0.18 s) |
| Same impulse on Dash | **1.4 m/s**: one step. That's the chalk aside. |
| Car | 40 km/h in its own lane, **1.4 m** from Newt's shoulder. It never needed to brake. |
| Puddle flick | 0.6 m apex, 0.7 s in the air |

- **Slow motion:** 0.34 s of story stretched over 5.4 s (`storyOf` / `realOf`). Physics runs on the story clock; sound and captions run on the real clock.
- **No overlaps:** Newt walks half a step ahead, one lane further out. While flying he is in a nearer lane than Dash.

## Sound (all generated: `tools/sfx/ep07_saved.py`, numpy + `kit3d`; times from `ep07_times.json` via `node tools/sfx/ep07-times.mjs`)

- **Street and objects:** street ambience (wind, distant birds, far traffic), which ducks in the slow-mo; knife `knife-shing`; pigeon `pigeon-flap` and `pigeon-coo`.
- **The car:** `car-approach` and `car-away`, with the true Doppler shift of a car passing at 11 m/s, 2 m away.
- **The yank and slow-mo:** `arm-yank` and `slowmo` (pitch-drop sweep, low drone, slowed heartbeat, snap-back whoosh).
- **Landing and after:** `blade-thunk` (blade, wood, crate rattle), `knife-twang`, `tomato-squelch`, `hat-pluck`, `pat`.
- **Footsteps** are timed from the walks.
- **Cast signatures:** Dash `hero-blip`, `womp`; Newt `kid-blip`, `chalk`, `chime`; the ghost uses ep05's `ghost`. No voice.
- **Score `score-saved`** (96 bpm, E minor):
  - A dead-serious secret-agent walk (pizz bass, vibes riff, brushes) that freezes during the pigeon stance.
  - A brass stab for the lunge, a glock hop over the puddle, and a tremolo pad under the car.
  - A snare roll and tuba for MAXIMUM, three "thinking" glock notes, and a warm swell for the relief.
  - **Hard silence** from the THUNK to the ghost, then the riff as a music box, and E major at last on the moral card.
- **Mix:** −20.8 LUFS integrated, LRA 7.4 LU.

## Publish brief

```yaml
# YouTube + Facebook: title hook (keyword + curiosity), story lines, comment question
hook: "Overprotective Friend vs. Newton's 2nd Law 🚗"
story:
  - "An overprotective friend “saves” his buddy from a passing car… and Newton's Second Law of Motion (F = ma) does the rest. 🚗💨"
  - "Dash is a dead-serious bodyguard. Pigeon? THREAT. Puddle? HAZARD. A car that's staying in its own lane? THREAT LEVEL: MAXIMUM. 🕶️"
  - "One mighty yank later the car drives past safely… but Newt only weighs 25 kg. Same force + tiny mass = HUGE acceleration (a = F ÷ m). 👻"
  - "🧠 The real physics: the pull that launched Newt at about 4 m/s would only move a 70 kg adult about 1.4 m/s (one step). Pull a friend out of danger firmly… but don't heave."
question: "Be honest: who's the Dash in your friend group? 👇"
keywords: [newton's second law, f=ma, newton's second law of motion, force mass acceleration, physics explained, funny physics, physics cartoon, dark humor animation, dark humor cartoon, overprotective friend, funny animation, 2d animation, cartoon shorts, animated short, science cartoon, learn physics, physics shorts, slow motion, dash and newt]
hashtags: [physics, darkhumor]       # after the channel's #shorts #funnyanimation #cartoon
playlists: [newton, worst-ideas]     # "all" is always added
cover_s: 15.6                        # mid-air in slow-mo: the chalk arc ending in a red X on the knife
instagram:
  hook: "Overprotective friend vs. Newton's 2nd Law 🕶️🚗"
  story:
    - |-
      Pigeon? Threat neutralised.
      Puddle? Hazard cleared.
      A car in its own lane? THREAT LEVEL: MAXIMUM. 🚨
    - "One mighty yank later the car passes safely… but Newt weighs 25 kg. F = ma: same pull, tiny mass, HUGE acceleration. 👻"
    - "Physics tip: pull a friend out of danger firmly, never heave. 🧠"
  question: "Who's your over-protective friend? 👇"
  tag_friend: "Tag the friend who would 100% do this 😂"
  hashtags: [funnyanimation, darkhumor, physics, newtonslaws, dashandnewt]
  alt_text: >-
    2D cartoon animation. A serious young man in an orange scarf walks a small boy in a party hat
    down a road like a bodyguard, shielding him from a pigeon and lifting him over a puddle. When a
    car approaches in its own lane, he yanks the boy toward the kerb so hard that the light boy
    flies, in slow motion with a chalk trajectory and the formula a = F ÷ m, onto a
    knife-sharpener's cart beside tomato crates. Only his party hat on the knife and his sneakers
    are shown; his friendly ghost pats the man's head and gently shows how softly to pull.
```
