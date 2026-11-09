# Ep 06 — The Jar

- **Composition:** `TheJar` · 46.6 s · `src/episodes/ep06-the-jar/`
- **Render:** `npm run render -- TheJar` → `out/the-jar.mp4`
- **Status:** built and rendered — awaiting review.
- **Look:** first fully 3D episode. Dash, Newt and every prop are three.js models (`src/rig3d/Stickman3D.tsx`, driven by the same poses/faces/scripts as the 2D rig; `Props3D.tsx`), in a 3D kitchen set (`Kitchen3D.tsx`): toon shading, ink outlines, real shadows, depth of field, a garden through the window. The camera always faces the action plane (lens shift instead of tilt), so chalk and cartoon effects drawn on that plane stay lined up.
- **Logline:** Dash wants a pickle sandwich, but the jar won't open. He twists it bare-handed, with his scarf for grip, then with a pipe wrench, and ends up on the floor. Newt sees that the air is holding the lid down, slips a spoon under the edge — *pfft* — and opens it with two fingers. Dash learns the wrong lesson: a bigger spoon.
- **Moral:** *Air pressure. / Don't fight the air — let it in.*
- **Everyday chore:** opening a stuck jar. **Try-at-home trick:** slide a spoon tip under the lid edge and lever gently until you hear *pfft*; then it twists off easily.
- **Teaches (for anyone, no physics background):** a sealed jar has less air inside than outside, so the outside air presses the lid down (about 20 kg on a normal jar). That push is what your hand is fighting, not the lid itself. Let air in and the push is gone. The dimple button on the lid shows it: pulled in = sealed, popped up = air got in.
- **Physics (one principle):** air pressure, F = P × A. Kept honest with the episode's one `G`: the wrench slip and fall, and the jam lid's ballistic flight back down onto Dash's head.

## Set & plants (visible before they matter — Chekhov rule)

- A **kitchen counter** at about 0.9 m: a plate with two slices of bread, a **pickle jar** (7 cm metal lid with a **dimpled vacuum button**, pulled in), a **teaspoon** in a mug.
- A **shelf** above the counter with a **jam jar** (same kind of lid, also dimpled).
- A **toolbox** on the floor, open, with a **pipe wrench** and a **crowbar** sticking out.
- Newt at the kitchen table on the left, colouring, watching from the start.

## Beats

| Time | Beat |
|---|---|
| **0–4 s** · Setup | Hook text *"Opening a jar: hard mode vs. physics mode"*. Dash slaps two slices of bread on the plate, rubs his hands, cocky look to camera, grabs the pickle jar. Quick insert: the lid's dimple button, pulled in. |
| **4–9 s** · TRY #1: BARE HANDS | He twists. Face goes red, cheeks puff, steam puffs from his ears, the jar shakes. His palm slips off the lid with a *squeak*. He shakes out his stinging hand. Newt looks up from colouring. |
| **9–15 s** · TRY #2: SCARF GRIP | He wraps his orange scarf around the lid for grip, clamps the jar between his knees and twists with his whole body. The scarf wrings into a tight rope, creaking. Nothing. Sweat drops fly. He unwraps it, panting. |
| **15–21 s** · TRY #3: PIPE WRENCH | He pulls the pipe wrench from the toolbox, bites it onto the lid, stands on the jar's base on the floor and heaves on the handle with both arms. The wrench slips off the lid and he spins round and lands on his butt (*thud*). The jar sits there, still shut. *Womp.* Scoreboard: *"Dash 0 · Jar 3"*. |
| **21–28 s** · Newt's physics look | Newt walks over and picks up the jar. Stillness, eyes narrow, *chalk* + *chime*: the overlay draws many little **air arrows pressing on the lid** from outside, *"AIR pushes down ≈ 20 kg"*. Inside the jar: *"less air inside"*. An arrow points to the dimple: *"button pulled IN = sealed"*. Then a short formula: *F = P × A*. |
| **28–33 s** · The trick | Newt takes the teaspoon from the mug, slides its tip under the lid edge and gives a tiny lever. ***Pfft*** (hiss): chalk arrows show air rushing in, and the outside arrows fade (*"air in → push gone"*). The dimple button **pops up** with a *tok*. Newt twists the lid off with two fingers, *kid-win*, and offers Dash a pickle. |
| **33–39 s** · Dash's wrong lesson | Dash's eyes light up. Cocky look to camera. He grabs the **crowbar** from the toolbox, takes the jam jar down from the shelf, sets it on the counter, jams the crowbar under its lid and heaves: ***PFFT-PANG!*** The lid rockets straight up, spinning like a coin, while he stands proud, hands on hips. It falls back and lands flat on his head (*bonk*), with a wobbling coin-spin rattle. Deadpan stare. *Womp.* |
| **39–43 s** · Heart | Dash sinks to his knees, the jam lid still on his head. Newt walks over with the open pickle jar; Dash takes a pickle and crunches it. Newt hands him the little teaspoon like a medal; Dash holds it up proudly, Newt laughs. |
| **43–46 s** · Moral card | *Air pressure. / Don't fight the air — let it in.* |

## Physics check (to derive in `timeline.ts`)

- **Seal force:** a 7 cm lid has an area of 38.5 cm². Air at 101 kPa on a jar sealed at half vacuum gives ≈ 195 N ≈ **20 kg-force** (full vacuum would be ≈ 40 kg). With seal friction μ ≈ 0.4 at the 3.5 cm rim, that's ≈ 2.7 N·m of twist, about what an adult can just about manage, which is why it feels stuck. After the *pfft* the pressure difference is zero, so only the light thread friction is left: two fingers.
- **The button:** it's pulled in while the inside pressure is lower; it springs up the moment air gets in. That's the visible cause of the *tok*, timed 2–3 frames after the hiss starts.
- **Wrench slip:** the wrench's grip on the smooth lid lets go; Dash's backward heave carries on with nothing resisting it (he falls back, inertia), spinning on one foot from the off-centre pull. Falls under `G` from standing: `dropTime`.
- **Jam lid launch:** the crowbar's sudden pry gives the 15 g lid ≈ 5.4 m/s upward (apex 1.5 m above the jar). Dash straightens up during the flight, so his head top is ≈ 0.75 m above where the lid started. Up 0.55 s + down 0.39 s = **0.94 s (28 frames)**, with ≈ 0.3 m/s sideways drift to land centred on his head. Derive the launch speed from those heights, not by hand.
- **Wrench slip, derived:** free fall from the heave pose's hip height (`dropTime`) while carrying 1.2 m/s backwards, so he lands clear of the jar on the floor.
- **Bodies don't overlap:** Newt picks the jar up beyond Dash's feet; Newt works the table from its right end; in the heart beat they stand an arm's length apart (his reach + hers meet at the jar).

## Sound (all generated — `tools/sfx/ep06_jar.py`, numpy + the skill's kit in `tools/sfx/kit3d/`)

Realistic kitchen foley from physical models, in one small-kitchen reverb, loudness-staged (impacts −15, handling −20, footsteps −24 LUFS momentary): skin gripping the knurled lid (`jar-grip`) and skidding off (`jar-squeak`), wool wrung tight (`scarf-twist`), the toolbox rattle, the wrench biting, grinding and slipping, Dash landing on the floor, the wrench clattering, glass jars set down and picked up, the spoon, the vacuum letting go (`vacuum-pfft`), the button snapping up, the lid unscrewing, the crowbar prising the jam lid off and the lid ringing as it spins up (`lid-whoosh`), landing on his head and settling like a spun coin (`lid-bonk`), knees on the floor, a pickle crunch. Footsteps are timed from each walk (one per half stride travelled). Cast signatures: Dash `hero-blip`, `womp`; Newt `kid-blip`, `chalk`, `kid-win`. No voice.

Original score (`score-jar`, 104 bpm, pizzicato / vibes / glockenspiel / brushes / pad), timed from `tools/sfx/ep06_times.json` (exported from `timeline.ts` by `node tools/sfx/ep06-times.mjs`): a cheeky opening motif, the same ostinato a semitone higher for each try that stops dead when he hits the floor, a tiptoe for Newt, a held "thinking" pad under the chalkboard, a glockenspiel flourish on the button pop, sneaky minor pizzicato for the wrong lesson with a dead stop for the pop and the bonk, and the motif again, warm, for the heart. Mix: −20.5 LUFS, LRA 6.8 LU, no gaps.

## Publish brief

Source for the platform copy. `npm run publish:prepare -- ep06-the-jar` turns it (plus
`content/channel/publish-defaults.yaml`) into `content/publish/ep06-the-jar.yaml` for review — see
[docs/PUBLISHING.md](../../docs/PUBLISHING.md). The moral comes from the **Moral** line above.

```yaml
# YouTube + Facebook: title hook (hook first), story lines, comment question
hook: This Jar Wouldn't Open… Until Physics 🫙
story:
  - Dash tried bare hands, his scarf and a pipe wrench. The jar won. 💪💀
  - Newt knew the secret — the AIR is pressing the lid down (about 20 kg!). One spoon under the edge, pfft, air gets in… and it opens with two fingers. 🥄
  - "Try it at home: slide a spoon under the lid edge and lever gently until you hear the pfft. 🧠"
question: Be honest — how do YOU open a stuck jar? 👇
keywords: [how to open a stuck jar, jar hack, air pressure, vacuum seal, kitchen hacks, physics explained, learn physics, science cartoon, life hacks, stickman animation]
hashtags: [physics, lifehack]       # after the channel's #shorts #stickman #funnyanimation
playlists: [newton, worst-ideas]    # "all" is always added
cover_s: 30.0                       # the pfft: air arrows rushing in, the button popping up
instagram:
  hook: Can't open a jar? It's not the lid — it's the AIR 🫙
  story:
    - |-
      Bare hands: nothing.
      Scarf grip: nothing.
      Pipe wrench: on the floor. 💀
    - Newt slipped a spoon under the lid, pfft, air in, and it opened with two fingers. The air was pushing it down with ~20 kg 💡
  question: Have you tried the spoon trick? 👇
  tag_friend: Tag the friend who always hands you the jar 😂
  hashtags: [stickmananimation, physicsexplained, kitchenhacks, funnyanimation, dashandnewt]
  alt_text: >-
    Funny 2D stickman animation about opening a stuck jar. A stickman with an orange scarf twists a
    pickle jar with bare hands, with his scarf for grip and with a pipe wrench, and falls over. A kid
    in a party hat shows with chalk arrows that air presses the lid down, slips a teaspoon under the
    edge so air hisses in, the lid's button pops up, and he opens it with two fingers. The stickman
    pries a jam jar with a crowbar and the lid lands on his head; they share the pickles.
```
