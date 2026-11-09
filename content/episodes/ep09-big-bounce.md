# Ep 09 — Big Bounce

- **Composition:** `BigBounce` · ~89.6 s · `src/episodes/ep09-big-bounce/`
- **Render:** `npm run render -- BigBounce` → `out/big-bounce.mp4`
- **Status:** first full cut (2026-11-07), for the user's review.
- **Look:** 2D toon cast on a painted park: playground on the left (seesaw, an old oak with three long branches over Dash's end, a bench with a bike helmet, Newt's paper bag of apples), a low stone wall, and the cemetery next door (headstones, a church, an open grave shown in cutaway, the gravedigger).
- **Acting:** completely deadpan. Dash is a ceremonial "Fun Officer" (red military captions, salutes, a FUN METER dial). Newt is calm, polite and quietly scientific. The gravedigger (new supporting cast, `who: "digger"` in `Toon`) is unimpressed.
- **Logline:** Newt sits alone on a seesaw. Dash (75 kg) volunteers as the other end and Newt is stuck at the top. To make it "more fun", Dash drops onto his end from higher and higher branches of the oak. Newt turns it into an experiment: an apple on his seat is launched each time — test 1 lands in Dash's lap (he eats it in one bite), test 2 bonks Dash's head (he nods: progress). Before the top branch Dash buckles a helmet on Newt (SAFETY FIRST ✓). Newt's chalk look draws test 3: *me* — the parabola goes over the wall and ends in the open grave. He goes from worried to disappointed ("…oh."), lets go to climb off at exactly the moment Dash steps off (split screen), and lands at the bottom of a real six-foot grave: a zoom shows him dead (X eyes, cracked helmet; cartoon, never graphic). Dash, still proud, walks to the wall, looks over and sees his friend dead: horror, then grief (hands on his head, tears). His friend's ghost rises; Dash's grief turns to hope: AGAIN? The ghost looks at the seesaw, at Dash, and lies back down into his body, hands folded; Dash's face falls. The gravedigger shrugs and tosses a big white funeral bouquet onto the boy's chest; Dash bows his head, hand on his heart.
- **Moral card:** *Energy is conserved. / Kids are not.*
- **One principle:** conservation of energy and its transfer through a seesaw.

## Beats (real time)

| Time | Beat |
|---|---|
| 0–3 s | Pan from the cemetery (sign, gravedigger, open grave) to the playground. Hook title. |
| 3–5.4 s | Newt alone pushes off twice (the plank barely moves), sighs. |
| 5.4–9 s | **FRIEND REQUIRED / FRIEND DEPLOYING**: Dash salutes at the gate and marches over. |
| 9–14 s | He pulls his end down and sits: Newt stuck 1.8 m up. **SEESAW: OPERATIONAL ✓**, knee bounces, chalk *75 kg vs 25 kg*. |
| 14–15 s | He lets go: **BONK** (repeats after every round). |
| 15–21 s | **FUN LEVEL 1**: low branch. Newt places apple 1. Impact; apple flies into Dash's lap; Newt thumbs-up; Dash eats the apple whole, frowns: not enough. |
| 22–30 s | **FUN LEVEL 2**: middle branch; slow-motion impact; apple 2 bonks his head; he nods. |
| 30–35 s | He looks up the oak: **FUN LEVEL: MAXIMUM**; BONK 3. |
| 36–39 s | Cut: the helmet. **SAFETY FIRST ✓**, two knocks. |
| 39–44 s | Cuts: up the trunk; out along the top branch; thumb-measure; salute. |
| 44–54 s | **Newt's look:** *75 kg falls 6.5 m* · test 1 · test 2 · **test 3: me** (camera follows the chalk arc over the wall) · *7.6 m… there.* (church bell) · close on Newt: **worried** (wide eyes, sweat, gulp) → ***…oh.*** (**disappointed**: shoulders drop, head down) |
| 54–55 s | Split screen: Newt lets go of the handles / Dash's boot leaves the branch. |
| 55–60 s | Slow motion: the fall, the impact, Newt (resigned) flies through his own chalk arc, over Dash, over the wall, down into the grave. The gravedigger freezes. |
| 60–63 s | **The death:** he hits the floor 1.8 m down (11.6 m/s) and crumples; **zoom**: X eyes, cracked helmet; one bell toll. |
| 63–67 s | **FUN: MAXIMUM ✓**; Dash turns to the empty seat; walks to the wall. |
| 67–72 s | He looks over: **horror** (close-up), then **grief** — hands on his head, tears, sobs, a sad vibes line. |
| 72–78 s | The ghost (halo) rises; Dash's grief turns to hope: **AGAIN?** The ghost looks at the seesaw, at Dash, lies back down into his body, a tiny "no thanks" nod; Dash's face falls. |
| 78–86 s | Gravedigger and Dash look at each other; shrug; he **tosses a big white lily bouquet** (purple ribbon) — close-up as it lands on Newt's chest; pull back: Dash, hand on his heart, head bowed. Bell. Fade. |
| 86–89.6 s | Moral card. |

## Physics (all derived in `timeline.ts`)

- Seesaw: plank half-length 1.8 m, tips ±30°, seats at 1.62 m, plank 16 kg. Dash 75 kg, Newt 25 kg, one g.
- Impact: angular momentum about the pivot is conserved (Dash lands on the raised seat), then the plank swings under gravity, φ'' = (m_L − m_R)·g·r·cos φ / I, until his end hits the grass; the release (BONK) is the same equation with only Newt.
- Dash's body drops 1.0 / 2.2 / 6.5 m (the branch heights are derived from that) → Newt's seat leaves at **4.7 / 5.6 / 7.9 m/s**.
- Apples: launched from the seat when the plank stops (rigid rotation velocity), ballistic; collisions with the plank (then rolling, a = 5/7·g·sin θ), Dash's head (bounce, e = 0.45) and the grass. Newt's apple spot is the one where test 2 hits Dash's head.
- Newt: ballistic from his seat at 7.9 m/s, apex **4.1 m**, clears the wall by **1.7 m**, lands on the floor of a real **1.8 m** (six-foot) grave **7.6 m** away at **11.6 m/s**, 1.77 s in the air. **The grave is placed where he lands.**
- The gravedigger's 2.2 s shovel cycle is phased so the shovel is up and full when Newt lands.
- Time: two slow-motion pieces (2× on round 2; 2.5× on the fall and 1.7× on the flight) and three hard cuts (helmet, trunk, top branch), in one story↔real time map.

## Sound (generated: `tools/sfx/ep09_bounce.py`; times via `node tools/sfx/ep09-times.mjs`)

Park ambience (birds, breeze; dips in slow motion), the gravedigger's shovel bed (scrape/toss on his cycle, stops dead when Newt lands), seesaw creaks, `bonk`, plank thwang, apple "tok", the chomp, helmet click/knocks, church bell, dirt thump, two slow-motion stretches, and an original deadpan march (a fanfare a key higher at each FUN level), thinking glock under the look, hard silence from the split screen to the landing, a music-box lullaby for the lily. No voice.

## Publish brief

```yaml
hook: "Never Let Your Big Friend Help on the Seesaw 😇⚰️"
story:
  - "Newt's alone on the seesaw. Dash (75 kg) volunteers as the other end. FUN LEVEL 1 → 2 → MAXIMUM. 🎢"
  - "Newt runs tests with apples. Test 1: Dash's lap. Test 2: Dash's head. Then Dash climbs to the top branch… test 3: Newt. 🍎"
  - "🧠 Real physics: a 75 kg drop of 6.5 m launches a 25 kg kid at ~8 m/s, 4 m up and 7.3 m away. Newt calculated exactly where he'd land. He was right."
question: "Who was the 'heavy friend' on your seesaw? 👇"
keywords: [conservation of energy, seesaw physics, energy transfer, funny physics, physics cartoon, dark humor animation, playground fail, funny animation, 2d animation, cartoon shorts, dash and newt]
hashtags: [physics, seesaw]
playlists: [newton, worst-ideas]
cover_s: 58.6  # Newt mid-flight over Dash (slow motion)
```
