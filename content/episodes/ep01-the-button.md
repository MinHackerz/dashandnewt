# Ep 01 — The Button

- **Composition:** `TheButton` · 45 s · `src/episodes/ep01-the-button/`
- **Render:** `npm run render -- TheButton` → `out/the-button.mp4`
- **Logline:** A stickman can't resist a DO NOT PRESS button — and learns exactly the wrong lesson.
- **Moral:** *Read the sign. / Share the cake.*

## Beats

| Time | Beat |
|---|---|
| 0–4 s | Hero walks in, sees the sign **DO NOT PRESS**. A crane with a 100 kg anvil hangs overhead, wired to the pedestal. |
| 4–13 s | Tempted, sweats, pulls back, whistles away… sprints back and smashes it. Spark climbs the cable, the anvil wobbles — nothing. Sign: **THANK YOU :)** — deadpan *womp*. |
| 15–19 s | "Also don't press the small one." Jabs it instantly. Spark → hook opens → anvil flattens him; it boings back onto the hook. |
| 20–27 s | Giant button, **LAST. WARNING.** He looks up at the anvil, puts on a helmet… spark goes to the trapdoor instead. |
| 28–34 s | **FREE CAKE! JUST PRESS** — he proudly refuses ("character development"). The kid presses; a cake is lowered gently. |
| 35–39 s | Rage stare (twitching eye, vein). Smashes it without reading **SOLD OUT** — watches the spark climb, resigned. Anvil. Sad trombone. |
| 39–45 s | Kid returns and leaves him a slice; a hand from under the anvil grabs it — thumbs up. Moral card. |

## Publish brief

Source for the platform copy. `npm run publish:prepare -- ep01-the-button` turns it (plus
`content/channel/publish-defaults.yaml`) into `content/publish/ep01-the-button.yaml` for review — see
[docs/PUBLISHING.md](../../docs/PUBLISHING.md). The moral comes from the **Moral** line above.

```yaml
# YouTube + Facebook: title hook (hook first), story lines, comment question
hook: He Pressed the DO NOT PRESS Button 3 Times 🔴
story:
  - Dash saw the sign. Dash read the sign. Dash pressed it anyway. Three times. 🤦‍♂️
  - A crane, a 100 kg anvil, a trapdoor and one free cake — and Newt is the only one who reads the sign.
question: Would you have pressed it? Comment YES or NO 👇
keywords: [do not press button, anvil, stick figure animation, comedy shorts, physics comedy, funny cartoon]
hashtags: [donotpress, animation]   # after the channel's #shorts #stickman #funnyanimation
playlists: [worst-ideas]            # "all" is always added
cover_s: 3.3                        # zoomed DO NOT PRESS sign
instagram:
  hook: Stickman vs. the DO NOT PRESS button 🔴 (wait for the ending 😭)
  story:
    - He saw the sign. He read the sign. He pressed it anyway. Three times. 🤦‍♂️
    - A short funny stickman animation about curiosity, bad decisions, and the one button you SHOULD have pressed 🎂
  question: Be honest — would you have pressed it? 👇 Comment YES or NO
  tag_friend: Tag a friend who'd press it 🔴
  hashtags: [stickmananimation, funnyanimation, donotpressthebutton, 2danimation, dashandnewt]
  alt_text: >-
    Funny 2D stickman animation: a stickman with an orange scarf keeps pressing a DO NOT PRESS button
    under a crane holding a 100 kg anvil. The anvil flattens him, a trapdoor drops him, and a kid in a
    party hat presses the one button that lowers a free cake — then leaves him a slice.
```
