# Ep 02 — Five More Minutes

- **Composition:** `FiveMoreMinutes` · 34.5 s · `src/episodes/ep02-five-more-minutes/`
- **Render:** `npm run render -- FiveMoreMinutes` → `out/five-more-minutes.mp4`
- **Logline:** Every snooze jumps his life forward — a day, eight years, forty years.
- **Moral:** *Don't hit snooze / on the people you love.*

## Beats

| Time | Beat |
|---|---|
| 0–3.6 s | Asleep (Zzz). Alarm → rubber arm slaps snooze. *"just 5 more minutes…"* |
| 3.6–8.8 s | Warp → "5 MINUTES ~~LATER~~ **1 DAY**". Kid with backpack taps foot, points at clock. Hero waves him off, snoozes. **Facepalm #1.** |
| 8.8–16 s | Warp → **8 YEARS**. Cobwebs, snow, plant to the ceiling. Teen with headphones pops gum. The clock starts dodging his slaps. **Facepalm #2.** |
| 16–24 s | Warp → **40 YEARS**. Bones creak, wizard beard pools on the floor. Grown-up kid (tie) brings a tiny kid (party hat). **Facepalm #3.** Music-box regret, a tear. |
| 24–28 s | He reaches for snooze again — the clock sprouts legs and runs; he chases it, beard flying. The tiny kid catches it. |
| 28–34.5 s | Tiny kid takes his hand; they walk out into the sunlight. Moral card. |

## Publish brief

Source for the platform copy. `npm run publish:prepare -- ep02-five-more-minutes` turns it (plus
`content/channel/publish-defaults.yaml`) into `content/publish/ep02-five-more-minutes.yaml` for review — see
[docs/PUBLISHING.md](../../docs/PUBLISHING.md). The moral comes from the **Moral** line above.

```yaml
# YouTube + Facebook: title hook (hook first), story lines, comment question
hook: '"5 More Minutes"… Turned Into 40 Years 😴⏰'
story:
  - Dash hit snooze for 5 more minutes. Then 1 day passed. Then 8 years. Then 40. 💀
  - Newt grew up waiting — and still came back to take his hand. 🥹
question: How many times did you snooze today? 👇
keywords: [snooze button, five more minutes, alarm clock, relatable, time skip, funny cartoon]
hashtags: [snooze, relatable]       # after the channel's #shorts #stickman #funnyanimation
playlists: [worst-ideas]            # "all" is always added
cover_s: 18.7                       # 40-years beard reveal
instagram:
  hook: 'POV: you hit snooze "just 5 more minutes" ⏰😴 (wait for it…)'
  story:
    - 5 minutes became 1 day. Then 8 years. Then 40. 💀
    - A funny stickman animation about the snooze button stealing your whole life — and the one person who still waits for you 🥹
  question: Be honest — how many times did you snooze today? 👇
  tag_friend: Tag the friend who snoozes 10 alarms ⏰
  hashtags: [stickmananimation, funnyanimation, snoozebutton, relatable, dashandnewt]
  alt_text: >-
    Funny 2D stickman animation: a stickman with an orange scarf keeps hitting snooze, and every snooze
    jumps his life forward — one day, eight years, forty years — while a kid grows up waiting. Old and
    bearded, he chases the runaway alarm clock until a tiny kid in a party hat takes his hand and they
    walk out into the sunlight.
```
