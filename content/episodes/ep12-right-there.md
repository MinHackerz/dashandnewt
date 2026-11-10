# Ep 12 — It's RIGHT There

- **Composition:** `RightThere` · 45.0 s · `src/episodes/ep12-right-there/`
- **Render:** `npm run render -- RightThere` → `out/right-there.mp4`
- **Status:** built and rendered, waiting for review.
- **Look:** 3D house look (`Toon3D` on a `Stage3D` beach) with a rock pool sunk into the sand. The water is drawn by `src/world3d/water.tsx`: everything below the surface is shown at its apparent depth (squashed toward the surface by 1/n), so the "broken" arm, the bent stick and the short legs are the physics itself, not drawn-on gags.
- **Camera:** `camera.ts`, re-paced after review (user, 2026-11-10: "very fast… difficult to understand"): a wide shot to open each place, ~26 shots (one every 2–3 s), each gag held in one shot (the stick goes in AND out in the same frame), slow push-ins instead of extra cuts.
- **Plain words** (user: "the most layman's terms"; "what Dash/Newt is trying to do must be understandable"): a hook caption says what Dash wants, a PLAN stamp names every attempt, one short caption per gag says what just happened, and the chalkboard uses everyday words with no jargon.
- **Acting direction:** dead serious. Dash is certain the coin is RIGHT there.
- **Logline:** A gold coin glints at the bottom of a rock pool, guarded by a crab. Dash reaches for it: his arm "snaps" at the waterline and his hand closes on water. He spears it with a stick: the stick "bends", and his jab sails past the coin onto the crab. He wades in: his legs "shrink", and the furious crab pinches his toe. Newt puts his bubble gum on the stick, holds it straight down over the coin, and lifts it out first try. He gives it to Dash, who makes a wish and flips it over his shoulder… into the pool. He sees it glint. It's RIGHT there.
- **Moral:** *Water bends light. / Things are deeper than they look.*
- **Everyday situation:** reaching for something in a pool, a pond or a sink full of water.
- **Teaches:** light bends where it leaves the water, so things under water look shallower (and, at an angle, nearer) than they are. Look straight down and reach deeper than it looks.
- **Physics (one principle):** refraction, Snell's law n_w sin θ_w = n_a sin θ_a with n = 1.33. All derived in `timeline.ts`:
  - The coin is 0.44 m down, 0.30 m out from the rim.
  - **Try 1:** lying on the rim, Dash's eye is 0.2 m up and 0.12 m out. Tracing the light from the coin to his eye (two neighbouring rays → the virtual image) puts the coin at **0.31 m** deep. His hand goes exactly there and closes 13 cm above it. The coin was out of his reach all along (0.72 m from his shoulder; his arm is 0.58 m).
  - **Try 2:** crouched 0.8 m back, eye 1.24 m up, it looks **0.25 m** deep. A straight stick along his line of sight carries on past the image and hits the bottom **0.10 m beyond the coin**, which is exactly where the crab sits.
  - **Try 3:** standing in 0.44 m of water, his shins look three-quarters as long.
  - **Newt:** looking straight down there is no sideways shift, so he only has to go deeper than it looks (×1.33).
  - The leap out of the pool is a true parabola with the shared `G`. The coin sinks at about 0.7 m/s.

## Set & plants (Chekhov rule)

- **The coin glints** in the hook, and the **crab** sits right beside it, guarding it.
- **The stick** lies on the sand by the pool from the first shot.
- **Newt is chewing bubble gum:** he blows a bubble in the hook, and a deadpan one while Dash fights the stick. It's the tool that wins.

## Beats (real time)

| Time | Beat |
|---|---|
| **0–2.4 s** · Hook | Looking down into the pool: the coin glints, the crab beside it. Dash arrives and flops onto his belly at the rim. Newt blows a bubble. Title: *"It's RIGHT there."* Caption: *"A coin! At the bottom of the pool."* |
| **2.4–7.8 s** · PLAN #1: GRAB IT | He reaches in. Seen from across the pool and side-on at the waterline, his arm looks snapped where it enters the water. His hand closes on water 13 cm above the coin. He sees his arm and screams (non-verbal), yanks it out, checks it (fine), and opens his fist: nothing. Captions: *"Arm: totally fine." / "Coin: still down there."* |
| **8.0–14.6 s** · PLAN #2: POKE IT OUT | He picks up the stick and crouches like a spear-fisher. In: it looks bent. Out: straight. In: bent! Out: straight. Newt blows a slow bubble. Dash winds up and jabs along his line of sight. **Bonk**, on the crab. Newt's bubble pops. The crab is now very cross. Captions: *"In the water: BENT. Out: straight?!" / "Missed the coin. Hit the crab."* |
| **14.8–21.4 s** · PLAN #3: WALK IN | He steps into the pool. His legs look short; horror. The crab scuttles over and pinches his toe. He leaps out backwards and lands flat on his back on the sand, crab still attached. Stars. Newt facepalms. *Womp.* The crab lets go and plops back home. Caption: *"Legs: fine. Water: lying AGAIN."* |
| **21.6–28.6 s** · Physics look | Newt measures with his thumb. Side view in chalk: the surface; the light from the coin bending into Dash's eye (**bends here!**); the straight line his brain (and his stick) followed, to **where it LOOKS** and on to the crab (**his stick went here: crab!**); the coin, **where it REALLY is**; Newt's dashed line, **look straight down**. Board: *Water BENDS light. / So things LOOK higher than they are. / That's the bent arm, stick AND legs! / Trick: look straight down, go deeper.* |
| **28.7–34.7 s** · NEWT'S PLAN: GUM + STICK → GOT IT! FIRST TRY | Newt takes the gum out of his mouth, presses it onto the stick's tip, swings the stick upright, kneels on the rim and lowers it straight down. The stick looks shorter but not bent. It touches, he lifts, and the coin comes up stuck to the gum. Dash, shocked. Captions: *"Sticky gum on the tip will grab the coin." / "Straight down, a bit DEEPER than it looks…"* |
| **35.7–39.8 s** · The wish | Newt holds the coin out and Dash plucks it off the gum. He kisses it, shuts his eyes, makes a wish, and flips it over his shoulder… into the pool. It sinks and settles on the bottom. Captions: *"Dash makes a wish…" / "…and throws the coin back in."* |
| **40.1–42.3 s** · Again | Dash turns. It glints. His eyes narrow. He flops back onto his belly at the rim. Across the pool, Newt facepalms. Caption: *"It's RIGHT there…"* |
| **42.3–45.0 s** · Moral card | *Water bends light. / Things are deeper than they look.* |

## Sound

- **Score** (`tools/sfx/ep12_pool.py` → `score-rightthere.wav`): a sunny pizzicato beach strut that stops dead on every refraction shock (the arm, each bent-stick double take, the short legs); a snare roll into the jab; three glock notes for the chalk; a rising run as the coin comes up; a music-box wish; the strut again, slyly, as he eyes the coin.
- **Foley** (house kit): `sea-amb`, `gull`, `sand-step`, `splash-small`, `splash`, `drop-plip`, `drop-tink`, `bonk`, `clack`, `snap`, `scurry`, `pop`, `stretch`, `slurp`, `squelch`, `click`, `clink`, `tink`, `body-fall`, `twinkle`, `swish`.
- **Signatures:** `hero-blip`, `hero-scream`, `womp`; `kid-blip`, `chalk`, `chime`, `kid-win`. No voice.

## Publish brief

```yaml
# YouTube + Facebook: title hook (keyword + curiosity), story lines, comment question
hook: "The Coin Is RIGHT There… or Is It? 🪙"
story:
  - "A gold coin at the bottom of a rock pool. Dash reaches for it… and his arm looks like it SNAPS at the water. 😱"
  - "The stick bends. His jab misses. His legs shrink. And the crab has had ENOUGH. 🦀"
  - "Newt knows why: light bends when it leaves water (refraction), so things under water look shallower than they are. Look straight down, reach deeper. 🧠"
  - "Real numbers: the coin was 44 cm deep, but from where Dash lay it looked 31 cm. Water's refractive index is 1.33."
question: "Have you ever missed something in a pool because it looked closer? 👇"
keywords: [refraction, refraction of light, snell's law, why things look shallower in water, bent pencil in water, light bending, physics explained, funny physics, physics cartoon, 3d animation, funny animation, cartoon shorts, animated short, science cartoon, learn physics, physics shorts, optical illusion, dash and newt]
hashtags: [physics, refraction]       # after the channel's #shorts #funnyanimation #cartoon
playlists: [light, worst-ideas]       # "all" is always added
cover_s: 3.6                          # Dash screaming at his "snapped" arm in the water
instagram:
  hook: "The coin is RIGHT there… right? 🪙😂"
  story:
    - |-
      Reach? His arm "snaps". 😱
      Stick? It "bends".
      Wade in? His legs "shrink"… and the crab pinches. 🦀
    - "Light bends at the water (refraction), so things look shallower than they are. Newt looks straight down and reaches deeper. 🧠"
    - "Then Dash makes a wish… and throws it right back in. 😅"
  question: "Who's the Dash in your friend group? 👇"
  tag_friend: "Tag the friend who'd 100% throw it back in 😂"
  hashtags: [funnyanimation, physics, refraction, 3danimation, dashandnewt]
  alt_text: >-
    3D cartoon animation at a beach. A young man in an orange scarf lies at a rock pool and reaches for a
    gold coin on the bottom; his arm looks bent where it enters the water and he grabs only water. A stick
    looks bent too, and his jab misses the coin and bonks a crab. He wades in, his legs look short, and the
    crab pinches his toe so he leaps out onto his back. A small boy in a party hat shows in chalk how light
    bends at the surface, so the coin looks shallower than it is, then sticks his bubble gum on the stick,
    holds it straight down and lifts the coin out. The man makes a wish and flips the coin back into the pool.
```
