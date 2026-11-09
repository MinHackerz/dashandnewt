# Production playbook

How an episode goes from idea to a published reel. Format: **vertical 1080×1920,
30 fps, 30–45 s**, 3D cartoon look (chunky Dash & Newt in a bright 3D world), every action with a sound.

## 1. Story (before any code)

Write `content/episodes/epNN-slug.md` first (copy an existing one).

**Episode engine — brute force vs. physics.** Pick **one physics principle** per episode
(inertia, friction, leverage, centre of mass, buoyancy, momentum, pressure, pendulum…).
The Hero (dumb) attacks the problem with force and confidence and is punished by exactly
that principle; the Kid (genius) shows his "physics look" (chalk overlay) and solves it
elegantly. The end card names the principle *and* the moral, e.g. *"Inertia. / Things keep
going when you stop."* — funny, educational, shareable.

**Premise — an everyday chore (from ep06 on).** Every episode starts from a regular daily
task the viewer does too: opening a stuck jar, carrying groceries upstairs, drying laundry,
loading a box into a van. No stunt or fantasy setups — relatability is the hook. The Hero does
the chore with hard work (sweat, strain, bigger tools); the Kid does the same chore easily with
one physics trick that a viewer could **actually try at home** (hot water on the lid, a pulley,
a ramp). Pick the chore first, then the principle that makes it easy.

Structure:

1. **Setup (0–4 s):** the chore and the goal, readable without sound (a stuck lid, a stack of bags, a clock).
2. **Three escalations:** the hero works harder each time — more force, bigger tool, more sweat. Rule of three.
   The Kid's easy solve comes after the third (or runs alongside it for contrast).
3. **Twist:** the lesson backfires or the world answers back.
4. **Heart:** the kid's kindness (sharing, a hand to hold) — this is what makes it shareable.
5. **Moral card (2 lines):** short, a little ironic. e.g. *"Read the sign. / Share the cake."*

Hard rules:
- **Every effect has a visible cause.** No anvil from nowhere: show the crane, the cable, the spark. Plant it early (Chekhov's anvil).
- **Physics is real.** One gravity for everything (`G` in `ep03-the-shortcut/physics.ts`):
  parabolic jumps (`ballistic`), free fall (`dropTime`), friction stops (`decelerate`), rolling angle = distance / radius,
  momentum on impacts, inertia (things keep moving when the thing carrying them stops).
- **Bodies never overlap.** If two things need the same spot, one moves out of the way first (or use a depth lane: raised + smaller = behind).
- **Character consistency** — see `docs/CAST.md`.

## 2. Build

```
src/episodes/epNN-slug/
  timeline.ts   # all beat times + derived physics events (no magic numbers in JSX)
  cast.ts       # character Scripts (keyframe tracks) + tweak() physics overrides
  props.tsx     # episode-specific set pieces
  Episode.tsx   # world, camera, overlays, end card, <Audio> cues (one named node per cue)
```

**Look (ep11 on): 3D.** The picture is one `<Stage3D>` (`src/world3d/Stage3D.tsx`) with the cast and props inside:

```tsx
<Stage3D cam={{ x: 540, y: 1120, zoom: 2, yaw: -8, pitch: -3, fov: 42, dof: 18 }} set="beach">
  <Toon3D who="newt" c={newt} turn={45} />
  <Toon3D who="dash" c={dash} turn={45} />
  {/* episode props: three.js meshes on the action plane (z = 0), metres = px / 240 */}
</Stage3D>
```

- **Sets:** `beach`, `park`, `street`, `studio`. A new place is a new set in `src/world3d/sets.tsx` built from
  `kit.tsx` (ground, clouds, palms, round trees, bushes, rocks, buildings, lamp posts). Procedural and seeded only.
- **Camera:** `cam.x / cam.y` are the usual world px, so timelines and physics don't change. Frame faces big
  (zoom 1.8–2.4 for two-shots), low hero angles (`pitch` −3 to −8), background blur `dof` 14–20.
- **Colour:** saturated sky blue, warm ground, the cast's blue / green / orange / red pop against it. No ink outlines.
- **Overlays** (chalk "physics look", hook title, moral card) stay 2D on top of the stage.
- Stills and renders of 3D need `--gl=angle`.

Register it in `src/Root.tsx` (1080×1920, 30 fps).

**Shared building blocks**

| Module | What it gives you |
|---|---|
| `src/rig/Stickman.tsx` | The rig: `solve()` joints, `toWorld()`, face, hands, scarf, hats, props on the body. |
| `src/rig/library.ts` | `POSES`, `FACES`, gaits (`walk`, `run`, `skip`, `tiptoe`, `*Legs`), `breathe`, `blinkAt`. Add poses here, not in episodes. |
| `src/rig/script.ts` | `Script` + `build(script, t)` → a `CharState` for frame time `t`. |
| `src/lib/kf.ts` | `num` / `step` keyframe tracks, easing names, `shake`. |
| `src/shared/ui.tsx` | `FONT_STACK` (Permanent Marker), dizzy `Stars`. |

**Acting:** pose-to-pose with anticipation (wind-up), overshoot (`back` easing),
squash on landings (`sy`), secondary motion (scarf, sway, tremble in `tweak`).
Give every beat a new expression; blinks and breathing are automatic.

**Camera:** world `GROUND = 1380`. Base zoom ~1.4–1.55 so characters fill the frame.
Snap punch-ins for reveals (0.12 s, `snap`), slow push for emotion. Shake only on impacts.
Captions go at the bottom (`paddingTop: 1520`, white-stroked marker text); keep the top for stamps/titles.

## 3. Sound — monetization-safe

The reels are monetized, so **every sound must be ours or commercially licensed**:

- **Default: generated.** Write a `tools/sfx/epNN_*.py` (stdlib only, seeded) — rerunnable with
  `npm run sfx`. Original synthesized audio has no licence risk.
- **No stock or meme clips** (TV/game stingers, viral voice clips). The old Remotion-library sounds were
  replaced by originals in `tools/sfx/house.py` and deleted.
- **Character sounds are fixed** — use the signatures in `docs/CAST.md`, never a one-off sound for a character.
- **Minimal or no voice.** Characters communicate through acting, signs, on-screen text and the
  Kid's chalk diagrams. Their non-verbal sound signatures are in `docs/CAST.md`.
- **Never post OmniVoice output** (CC-BY-NC weights). If a voice is ever unavoidable, it must
  be non-verbal and from a commercially licensed source (the old voice pipeline was removed).
- No copyrighted music. Use our generated loops, or tracks from a library whose licence explicitly
  covers monetized social video.
- One `<Audio name="…">` per cue, timed from `timeline.ts` constants. Loudness is limited at render time.
- Physical audio logic too: louder when closer, lower pitch when moving away (Doppler), quieter far away.

## 4. Review loop (never skip)

1. `npx tsc --noEmit`
2. Contact sheet of stills at every beat:
   ```bash
   for f in 30 90 150; do npx remotion still MyEpisode /tmp/s/f$f.png --frame=$f --scale=0.35; done
   ffmpeg -pattern_type glob -i '/tmp/s/f*.png' -vf tile=8x4 -frames:v 1 sheet.png
   ```
   Check: story readable without sound? Bodies overlapping? Faces matching the beat? Character identity intact?
3. Draft: `npm run render -- MyEpisode --draft`

## 5. Render & publish

1. **Publish brief.** In the episode sheet, fill in `## Publish brief` (copy ep03's). It holds the
   YouTube/Facebook hook and story lines and the comment question. Its `instagram:` part holds the
   keyword hook line, 2–3 story lines, the question CTA, tag-a-friend and **5 specific hashtags**,
   plus alt text. `cover_s` is the cover-frame timestamp. The moral comes from the **Moral** line.
2. **Render:**
   ```bash
   npm run render -- TheShortcut     # → out/the-shortcut.mp4 (audio peak-limited, faststart)
   ```
   This also drafts `content/publish/ep03-the-shortcut.yaml` (status `draft`). Use
   `npm run publish:prepare -- ep03 --force` to regenerate it after changing the brief.
3. **Review** the draft and watch the final file. Then approve it yourself:
   `npm run publish:approve -- ep03`. This shows everything, asks you to confirm, and fingerprints
   the video and the text.
4. **Publish:** run `npm run publish -- ep03 --dry-run`, then `npm run publish -- ep03`. Post IDs
   and URLs are written back into the publish file. Re-runs skip what's already posted.
   Then pick the Shorts cover in the YouTube app and paste the Instagram alt text in the app.

Setup, tokens and troubleshooting: [PUBLISHING.md](PUBLISHING.md).
