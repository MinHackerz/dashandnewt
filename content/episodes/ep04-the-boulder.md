# Ep 04 — The Boulder

- **Composition:** `TheBoulder` · 88 s · `src/episodes/ep04-the-boulder/`
- **Render:** `npm run render -- TheBoulder` → `out/the-boulder.mp4`
- **Logline:** Dash's monster kick knocks a boulder onto their football. He tries muscle three times; Newt explains the lever on a chalkboard, then lifts it with a plank, a pebble — and a very small bird.
- **Moral:** *Leverage. / A long plank beats big muscles.*
- **Teaches (for anyone, no physics background):** what a lever is (pivot, load, effort), the rule *long arm × small push = short arm × big lift*, that an 8× longer arm gives 8× the force but 8× less movement, why a seesaw throws things fast, and how a seesaw balances.
- **Physics:** leverage (F₁ × d₁ = F₂ × d₂) — plus what keeps it honest: rolling down a slope (a = 5/7 · g · sinθ), rolling resistance, a 1 m drop, momentum + restitution on the charge, a tetherball wind-up, and a seesaw launch, all with the one `G`. Every number is derived in `timeline.ts`.

## Set & plants (visible before they matter — Chekhov rule)

- A grassy **hill** on the right: a 1 m rock step, a short shelf, a 28° slope. **Boulder** (Ø 0.7 m granite ≈ 480 kg) propped on the slope by a small rock.
- A **little bird** (supporting cast, see `docs/CAST.md`) sitting on the boulder.
- A 4.2 m **plank** lying in the grass behind them, a **pebble** (12 cm) and a coil of **rope** on the ground.

## Beats

| Time | Beat |
|---|---|
| **0–8 s** · Cold open | Hook title *"Muscles vs. a 480 kg boulder"*. Dash warms up like a pro (stretches, lunge, licks a finger to test the wind, cocky look to camera). Mega kick — the ball knocks out the rock propping the boulder; it rolls down the slope and off the 1 m step with the bird **running on top like a log-roller**, and stops exactly on the ball: *squeak*. Newt blinks. |
| **8.6–11 s** · Weight note | *"This rock: 480 kg (about 7 grown-ups!)"* |
| **11–17 s** · TRY #1: PUSH IT | Feet churn and slide backwards (he loses the friction battle); deadpan look to camera; back-push moonwalk; the bird yawns. |
| **17–23 s** · TRY #2: RAM IT | Backs up out of frame… empty grass… charges in: **BONK**. 70 kg vs 480 kg — he bounces back onto his butt, stars. The rock only rocks. |
| **23–30 s** · TRY #3: ROPE IT | Rope over the rock, tied to his waist, sprint: **tetherball** orbit, faster and faster as the rope winds on, until he's strapped face-first over the rock, nose to beak with the bird. *Womp.* Scoreboard: *"Muscles: 0 · Rock: 3"*. |
| **30–44 s** · Newt's lesson | Chalkboard over the scene, built step by step and held to be read: **HOW A LEVER WORKS** → the parts (PIVOT/fulcrum, LOAD = rock edge 240 kg, EFFORT = Newt 30 kg) → the rule (*long arm 3.73 m vs 0.47 m; long arm × small push = short arm × BIG lift*) → the result (*the long arm is 8× longer → 8× more force! 30 kg × 8 = 240 kg ✓*). Dash, still strapped, looks confused, then curious. |
| **44–54 s** · The lever, for real | Newt drags the plank in, short end under the rock, over the pebble; labels appear on the real thing (PIVOT, LOAD, EFFORT, long arm). He hops onto the raised end — it **hovers**: *"Newt 30 kg vs. rock edge 240 kg… almost balanced — but not quite!"* He whistles; the bird lands on his hat: *"+ one tiny bird (30 g) = just enough to tip it!"* Down it goes, the rock's edge rises, it rolls off the ball, Dash slides off like a pancake. |
| **54–58 s** · The trade-off | Measured on the real plank: *"Newt's end went DOWN 1 m. The rock's edge went UP 13 cm. 8× the force — but 8× less movement!"* |
| **57–65 s** · Dash's twist | Dash gets an idea, puts the ball on the long end (Newt steps back), climbs the rock, cocky look, cannonballs onto the short end. The ball rockets up out of frame; crickets. Newt's chalk draws the real arc down to an **X on Dash's head**, *t ≈ 1.8 s*, counting down… **BONK.** *Womp.* |
| **66–71 s** · Why it flew | Chalk note + diagram: *"Dash pushed the SHORT end down a little… so the LONG end shot up 8× faster! And what goes up… comes down."* |
| **71–79 s** · Heart: balance | They carry the plank over and lay it across the rock: *"Heavy Dash sits CLOSE to the pivot. Light Newt sits FAR from it. 70 kg × 1.26 m = 30 kg × 2.94 m → balanced!"* They seesaw, laughing — *"…until the bird picks a side!"* — it lands on Dash's head, Newt shoots up. |
| **79–85 s** · Recap | Chalkboard: **THE LEVER** — long plank + a pivot = a superpower; the longer your side, the less muscle you need; doors, scissors, bottle openers, seesaws… you use levers every day! (Dash still prefers muscles.) |
| **85–88 s** · Moral card | *Leverage. / A long plank beats big muscles.* |

## Physics check (all derived in `timeline.ts`)

- **Boulder run:** from rest on the 28° slope, a = 5/7 · g · sinθ for 1.4 m → 3.1 m/s at the foot; rolling resistance (3 m/s²) on the shelf → 2.4 m/s at the lip; 0.45 s free fall from 1 m; then it rolls on the grass until it stops. **Where it stops is where the ball must be lying**, and the ball's rebound deceleration (≈ 2.6 m/s²) is derived from that.
- **Charge:** 70 kg at 6 m/s into 480 kg, restitution 0.6 → Dash rebounds at ≈ 2.4 m/s (short hop, then a butt-slide). The boulder would get ≈ 1.2 m/s, but it's wedged on the flattened ball, so it only rocks.
- **Tetherball:** one lap of rope winds onto the boulder's 0.35 m radius. Speed stays 6 m/s; the free length L shrinks, so ω = v / L climbs — the visible "faster and faster". Duration from L₀·φ − R·φ²/2 = v·t (1.6 s).
- **Lever:** tipping the boulder off the ball needs about half its weight (240 kg-force) at the tip; Newt (30 kg) → ratio 8 : 1 → on a 4.2 m plank the pebble sits 0.47 m from the tip. At that exact balance point Newt alone hovers it, and the 30 g bird tips it. The tip rises pebble-height (13 cm), then the boulder rolls 0.3 m off the plank.
- **Launch:** the plank stops at its max tilt (14.9°), so the ball leaves almost vertically, leaning toward the pivot. The speed that lands it on Dash's sitting head (from the rig's pose) is 9.1 m/s → 1.77 s flight, 5 m apex; that's 24 % of his 1.1 m drop × the arm ratio (the rest goes into plank flex and Dash's squash).
- **Seesaw:** balance arms from 30 · a = 70 · b on 4.2 m → 2.94 m / 1.26 m. With the bird on Dash, his end goes to the grass (33.7°) and Newt rises 2.3 m.
- **Bodies don't overlap:** the orbit uses depth lanes (behind the boulder = drawn first, smaller); Dash carries the plank in the front lane past the rock.

## Sound (all generated — `tools/sfx/ep04_boulder.py`)

A soft original music bed (`bed-lever`, marimba + plucked bass, 96 bpm) under everything, ducked during the lesson. On top, only the cues that tell the story, at natural speed and moderate volume: `kick`, `rumble`, `squeak`, `rock-thunk`, `twang` + `whirl`, `call-whistle`, `chirp3` (the bird), `reinflate`, `clack`, plus house sounds (thud, creak, crickets, boing, chalk, chime). Cast signatures used sparingly: Dash `hero-blip` ×4, `womp` ×2, `hero-scream` ×1; Newt `kid-blip`, `chalk`, `kid-win`. No voice — the on-screen text carries the lesson.

## Publish brief

Source for the platform copy. `npm run publish:prepare -- ep04-the-boulder` turns it (plus
`content/channel/publish-defaults.yaml`) into `content/publish/ep04-the-boulder.yaml` for review — see
[docs/PUBLISHING.md](../../docs/PUBLISHING.md). The moral comes from the **Moral** line above.

```yaml
# YouTube + Facebook: title hook (hook first), story lines, comment question
hook: How a 30 kg Kid Lifted a 480 kg Boulder 🪨
story:
  - Dash tried muscle — he pushed it, rammed it and tied himself to it. The 480 kg boulder didn't move an inch. 💪💀
  - Newt used a LEVER — a long plank on a small pebble. Long arm × small push = short arm × BIG lift. An 8× longer arm gives 8× more force (plus one tiny bird to tip the balance 🐦).
  - Doors, scissors, bottle openers, seesaws… you use levers every day. Now you know why they work (and why muscles are optional). 🧠
question: Where did YOU use a lever today? (Hint — scissors, a door, a bottle opener…) 👇
keywords: [lever physics, how a lever works, fulcrum, simple machines, leverage, physics explained, learn physics, science cartoon, archimedes lever, seesaw physics]
hashtags: [physics, lever]          # after the channel's #shorts #stickman #funnyanimation
playlists: [newton, worst-ideas]    # "all" is always added
cover_s: 48.6                       # the real lever, labelled PIVOT / LOAD / EFFORT, Dash strapped to the rock
instagram:
  hook: How does a 30 kg kid lift a 480 kg rock? 🪨 (physics, explained with stickmen)
  story:
    - |-
      Push: nothing.
      Ram: nothing.
      Rope: he became a tetherball. 💀
    - Then Newt grabbed a plank and a pebble — a LEVER. Long arm = small push, BIG lift. 8× longer arm → 8× more force 💡
  question: Quick quiz — name a lever you used today 👇 (scissors? a door? a bottle opener?)
  tag_friend: Tag the friend who fixes everything with force 😂
  hashtags: [stickmananimation, physicsexplained, simplemachines, funnyanimation, dashandnewt]
  alt_text: >-
    Funny 2D stickman animation that explains how a lever works. A stickman with an orange scarf tries
    to move a 480 kg boulder by pushing, ramming and roping it, and fails. A kid in a party hat explains
    on a chalkboard: pivot, load and effort, and that a long arm times a small push equals a short arm
    times a big lift. He lifts the rock with a long plank over a pebble, helped by a tiny bird. The
    stickman launches the ball onto his own head, and they end balancing on a seesaw.
```
