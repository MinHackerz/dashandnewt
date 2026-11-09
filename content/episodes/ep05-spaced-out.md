# Ep 05 — Spaced Out

- **Composition:** `SpacedOut` · 60.5 s · `src/episodes/ep05-spaced-out/`
- **Render:** `npm run render -- SpacedOut` → `out/spaced-out.mp4`
- **Logline:** Dash maxes the rocket's throttle and it bursts. Stranded between two planets, Dash tries to swim through space; Newt throws a wrench, grabs a floating flare and rides it to the green planet. Dash gets a meteor.
- **Moral:** *Every push / pushes back.*
- **Physics (one principle):** Newton's 3rd law — action and reaction / conservation of momentum. Also shown honestly: no air = no swimming and no sound; things keep drifting (1st law); thrust > gravity to land; inelastic collision; dust in vacuum flies in clean parabolas.
- **Text on screen:** only the hook, "(no air = no sound)" and the moral. Newt's two physics looks are wordless chalk arrows.

## Beats

| Time | Beat |
|---|---|
| **0–6 s** · Launch | Hook *"Space has no air. Dash has no plan."* Countdown lights, ignition, liftoff (both squashed by the g-force), sky fades to black. |
| **6–10.8 s** · The throttle | Cruising. Dash eyes the throttle; Newt shakes his head; cocky look to camera; Dash shoves it to MAX. Gauge into the red, hull glows, rivets pop, rocket shakes, Newt facepalms. |
| **10.8–14.4 s** · The burst | The rocket bursts — **in total silence** *(no air = no sound)*, just a thump felt through the suits. Chunks fly off; Dash and Newt drift apart in opposite directions (Newt, lighter, faster). |
| **14.4–21 s** · Stranded | Between the green planet and the grey one. Dash **swims** — arms windmilling — and goes exactly nowhere. Then **runs** in space. Nowhere. Newt watches, deadpan. |
| **21–27.6 s** · Newt's push | A blinking emergency flare floats out of reach. Newt's physics look: two chalk arrows (wrench one way, Newt the other). He **throws a wrench away from the flare** and drifts straight to it. Dash copies — throws his **sandwich toward** the flare — and drifts back a sad 1 cm/s. |
| **27.6–32.5 s** · The flare | Newt lights it (it's a little rocket), points the flame **away** from the green planet — chalk arrows again — and shoots off toward it. Dash, jealous. |
| **32.5–37.7 s** · Landing | On the green planet: Newt comes down with the flame pointed **at** the planet to brake, touches down softly, cheers. A little alien sprout waves. |
| **37.7–45.5 s** · Dash's meteor | Dash floats, bored. A slow space rock drifts in. He swim-panics (still nowhere), covers his eyes — **splat** — stuck to its face, and the pair carries on, slower, toward the grey planet. |
| **45.5–53.9 s** · The grey planet | Quiet surface; a shadow grows… they arrive from a long fall almost straight down: flash, crater — **silent** — then a deadpan *womp*. Moon dust arcs and lands (no air to hold it up). A little ghost with an orange scarf and a halo rises, waves bye. |
| **53.9–57.3 s** · Green planet | Newt looks up: the tiny ghost drifts across the sky, waving. Newt facepalms. So does the sprout. |
| **57.3–60.5 s** · Moral card | *Every push / pushes back.* |

## Physics check (derived in `timeline.ts`)

- **Masses (with suits):** Dash 90 kg, Newt 40 kg, wrench 3 kg, sandwich 0.3 kg, flare 0.5 kg, rock 400 kg.
- **Burst:** equal and opposite momentum → Newt 0.12 m/s one way, Dash 0.053 m/s the other. Nothing slows them down afterwards.
- **Wrench:** thrown so that Newt's new velocity carries him to the flare in 3 s → wrench leaves at 5.7 m/s, Newt at 0.4 m/s (3 × 5.7 ≈ 40 × 0.4).
- **Sandwich:** 0.3 kg at 4 m/s toward the flare → Dash recoils 1.3 cm/s the other way.
- **Flare:** a 300 N thruster on 40.5 kg → 7.4 m/s². Landing: brake with the flame pointed at the planet: 7.4 − 3.7 (planet g) = 3.7 m/s² net; from 6 m/s that stops him in 4.9 m / 1.6 s — soft touchdown.
- **Meteor:** 400 kg at 2 m/s sticks to 90 kg Dash → 1.63 m/s together. They fall 150 m on the grey planet (g 1.6 m/s²): gravity adds only downward speed → they arrive at ≈ 22 m/s, almost straight down.
- **Moon dust:** each grain is a parabola with g = 1.6 m/s² (no air → no billowing).

## Sound (all generated — `tools/sfx/ep05_space.py`)

A dreamy original music bed (`bed-space`); **real silence** at the burst and the impact (music drops out), with only a low `thump` felt through suits/ground. `beep` countdown, `rocket-roar`, `clunk` throttle, soft `warn`, muffled `flare`, `ghost` (a sine "wooo", not a voice). Cast signatures sparingly: Dash `hero-blip`, `womp` ×2, `hero-scream`; Newt `kid-blip`, `chalk`, `kid-win`.

## Publish brief

Source for the platform copy. `npm run publish:prepare -- ep05-spaced-out` turns it (plus
`content/channel/publish-defaults.yaml`) into `content/publish/ep05-spaced-out.yaml` for review — see
[docs/PUBLISHING.md](../../docs/PUBLISHING.md). The moral comes from the **Moral** line above.

```yaml
# YouTube + Facebook: title hook (hook first), story lines, comment question
hook: Stranded in Space — Only One Knew Physics 🚀
story:
  - Dash maxed the throttle. The rocket burst — in total silence (no air = no sound). Now they're floating between two planets. 🚀💥
  - Dash tries to swim. In space. Newt throws a wrench the OTHER way, drifts to an emergency flare and rides it to the green planet. Every push pushes back — that's Newton's 3rd law, and it's how every rocket works.
  - Dash throws a sandwich. 🥪 It does not go well.
question: Which way would YOU throw the wrench? 👇
keywords: [newtons third law, action and reaction, space physics, how rockets work, conservation of momentum, no sound in space, astronaut cartoon, funny space animation, physics explained, science cartoon]
hashtags: [space, physics]          # after the channel's #shorts #stickman #funnyanimation
playlists: [newton, worst-ideas]    # "all" is always added
cover_s: 17.0                       # Dash "swimming" in space between the two planets, going nowhere
instagram:
  hook: Stranded in space with ONE emergency flare 🚀 (only one of them knew physics)
  story:
    - |-
      Dash: swims. In space. 🏊
      Newt: throws a wrench the other way, grabs the flare, flies home. 🔥
    - Every push pushes back — that's how rockets (and wrenches) work 💡
  question: Be honest — would you have thrown the sandwich? 🥪👇
  tag_friend: Tag the friend who'd try to swim in space 😂
  hashtags: [stickmananimation, spacephysics, newtonslaws, funnyanimation, dashandnewt]
  alt_text: >-
    Funny 2D stickman space animation about Newton's third law. A stickman with an orange scarf
    maxes a rocket's throttle and it bursts silently in space. He tries to swim and run in space
    and goes nowhere, while a kid in a party hat throws a wrench the opposite way to drift to an
    emergency flare, then uses its flame like a rocket to fly to a green planet and land softly.
    The stickman is hit by a slow meteor that carries him down to a grey airless planet; a little
    ghost with his orange scarf floats up and waves.
```
