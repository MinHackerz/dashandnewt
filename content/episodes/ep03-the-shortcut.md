# Ep 03 — The Shortcut

- **Composition:** `TheShortcut` · 38 s · `src/episodes/ep03-the-shortcut/`
- **Render:** `npm run render -- TheShortcut` → `out/the-shortcut.mp4`
- **Logline:** Race to the ice-cream truck — the kid takes the path, the hero takes "a shortcut".
- **Moral:** *The shortcut / is usually the long way.*
- **Physics:** all motion uses `physics.ts` (one gravity, ballistic arcs, friction, momentum, inertia, buoyancy, Doppler).

## Beats

| Time | Beat |
|---|---|
| 0–4 s | Fork. Map sign: path ~10 min vs "2 min?!" straight line through 🌵🌊🐂. Kid takes the path; hero points at the fence. |
| 4–27.4 s | **Split screen** (top: THE PATH, bottom: THE SHORTCUT, race bar between). |
| 4–8 s | Climbs the fence; scarf snags a nail, stretches thinner, snaps him back onto his butt. |
| 9–13 s | Steps over a barrel cactus, startled by a saguaro, sits on the barrel. Jumps straight up → lands on the same cactus. Jumps forward over the saguaro. |
| 14–20 s | Three-step run-up → jump falls short → splash. Bobs, current drags him back, fish slap. Climbs out, dog-shake. |
| 21–25 s | Tiptoes past the sleeping bull; one last drop from the soaked scarf lands on its nose. Bull charges, headbutts him. |
| 25–27 s | He flies in a parabola, spinning; bull can't brake and smashes the fence. He rolls to a stop at the kid's feet — kid already has the last cone, **SOLD OUT**. |
| 27–35 s | Hands-and-knees → kneel → stand. Kid offers the cone; the arm stops, the soft scoop keeps going (inertia) → splat. Deadpan *womp*. Truck leaves (Doppler). Bull licks up the ice cream; both laugh. |
| 35–38 s | Moral card. |

## Publish brief

Source for the platform copy. `npm run publish:prepare -- ep03-the-shortcut` turns it (plus
`content/channel/publish-defaults.yaml`) into `content/publish/ep03-the-shortcut.yaml` for review — see
[docs/PUBLISHING.md](../../docs/PUBLISHING.md). The moral comes from the **Moral** line above.

```yaml
# YouTube + Facebook: title hook (hook first), story lines, comment question
hook: He Took a SHORTCUT to the Ice Cream Truck 🍦 (Physics Said No)
story:
  - 'Newt took the path. Dash took a "shortcut": a fence, a cactus field, a river and one very angry bull. 🐂💀'
  - Every jump, splash and tumble follows real physics — gravity, momentum, friction and inertia (yes, even the ice cream).
question: Path or shortcut? Comment PATH 🟢 or SHORTCUT 🔴 👇
keywords: [shortcut, funny physics, physics comedy, ice cream truck, bull, inertia, momentum]
hashtags: [physics, icecream]       # after the channel's #shorts #stickman #funnyanimation
playlists: [newton, worst-ideas]    # "all" is always added
cover_s: 25.8                       # Dash mid-air after the headbutt
instagram:
  hook: Stickman takes a SHORTCUT to the ice cream truck 🍦 (it did not go well 😭)
  story:
    - |-
      The path: 10 minutes.
      The shortcut: a fence, a cactus field, a river and one very angry bull. 🐂💀
    - Every fall, splash and bounce follows real physics — watch till the end for the ending nobody saw coming 🍦➡️👅
  question: Be honest — path or shortcut? 👇 Comment PATH 🟢 or SHORTCUT 🔴
  tag_friend: Tag the friend who ALWAYS says "I know a shortcut" 😂
  hashtags: [stickmananimation, funnyphysics, icecreamtruck, funnyanimation, dashandnewt]
  alt_text: >-
    Funny 2D stickman animation in split screen: a kid walks the safe path to an ice cream truck while a
    stickman with an orange scarf takes a shortcut, gets snagged on a fence, poked by cactus, falls in a
    river and is launched by a bull. The kid gets the last ice cream; the scoop falls and the bull licks it up.
```
