# Cast bible

Every episode uses the same characters. A viewer scrolling past should know who
is who **from the silhouette alone**, so these identity rules never change.

**The cast is locked: exactly these two leads, every episode — Dash & Newt** (also the channel name, see `content/channel/youtube-channel.md`). The comedy engine is
*brute force vs. physics*: the Hero ignores how the world works and pays for it; the Kid
understands it and wins — then is kind about it.

## Look (from ep11): 3D cartoon characters in a 3D world

**This is the house look for every new episode.** Chunky, big-headed, soft-lit 3D characters in a bright,
saturated 3D world with a blurred background — like a modern animated feature, no ink outlines.
Characters: `src/rig3d/Toon3D.tsx`. World, light and camera: `src/world3d/` (`Stage3D`, sets `beach` / `park` /
`street` / `studio`). Check the `CastSheet3D`, `LookBeach`, `LookPark` and `LookStreet` stills in the Studio
(folder *Look3D*) after touching any of them.

- **Dash:** royal-blue tee, dark navy jeans, chunky white sneakers with a dark sole and orange stripe, spiky brown hair, big brown eyes, thick brows, and the orange scarf (ring, knot and a short end on the chest).
- **Newt:** much bigger head for his body, grass-green tee with a red apple (Newton's), olive shorts, white socks, red sneakers with white soles, brown fringe, the striped party hat + pink cheeks.
- **Ghost Newt:** `extras.ghost` gives a see-through white figure with a glowing halo.
- **Proportions:** head ≈ a quarter of Dash's height and a third of Newt's; big hands and shoes. Faces carry the shot: frame them large.
- **Turn:** `<Toon3D turn={35}>` swings the body toward the camera (3/4 view). Use 40–50 for hero poses, 0–15 for fast side-on action.

## Earlier look (ep07–ep10): 2D cartoon characters

Drawn by `src/rig2d/Toon.tsx`; check `CastSheet` in the Studio. Same identity colours:
- **Dash:** blue tee, dark jeans, white sneakers with orange trim, spiky brown hair, and the orange scarf (a ring plus a knot end on his chest).
- **Newt:** green tee with a red apple (Newton's), khaki shorts, red sneakers, and the party hat + blush.
- **Ghost Newt:** `extras.ghost` gives a see-through white figure with a halo.
- **Acting:** the characters play every situation **dead serious** (no winks at the camera). The audience finds it funny, the characters never do.
- **Anatomy:** joints only flex the way real ones do, and hands that hold something are placed on it with IK.

## Dash — the Hero ("the dumb one")

| | |
|---|---|
| Look | Full-size stickman (`scale: 1`). **Orange scarf, always** (`extras.scarf`), even in bed, even soaked. |
| Role | **Plays dumb.** Confident, impulsive, brute force first, never reads the sign, learns the wrong lesson. Lovable, never mean. Physics always wins against him — fairly, and visibly. |
| Signature moves | Smug point, rubbing hands, cocky look to camera before a bad decision, sheepish grin when caught, deadpan stare after it goes wrong. |
| Sound signature (no voice) | `hero-blip` (low bassoon blip; pitch it 0.8–1.15× for uh-oh / hmm / heh) for every reaction, `womp` for deadpan defeat, `hero-scream` (non-verbal cartoon "aaah") when launched or falling. Same files, every episode. |
| Scarf physics | Streams behind with speed; hangs straight and darker when `wet`; can snag (`scarfTails: false` + a stretched band drawn in world space). |

## Newt — the Kid ("the physics genius", named after Isaac Newton)

| | |
|---|---|
| Look | Small (`scale: 0.72`). **Red party hat + pink cheeks, always** (`partyHat`, `blush`). The look never changes; the brains show through behaviour. |
| Role | **The intelligent one who knows physics well.** Calm, observant, reads the sign, predicts what will happen, solves problems with physics (levers, friction, momentum, buoyancy, centre of mass…) instead of force. Kind: shares, helps the Hero up. |
| Signature moves | The **"physics look"**: a beat of stillness, eyes narrow, then a chalk-sketch overlay appears (trajectory arc, force arrows, a short formula like `F = ma`, `μ`, `½mv²`) — the audience sees the reasoning without a word. Plus foot-tap, shrug, **facepalm** (the family gesture), sharing / offering. |
| Sound signature (no voice) | `kid-blip` (bright marimba blip; 0.72× adult, 0.85× teen, 1–1.2× child) for every reaction, `chalk` + `chime` when the physics overlay appears, `kid-win` (rising chime) when he wins or laughs. Same files, every episode and every age. |
| Age variants | Teen `scale 0.9` + headphones + phone; adult `scale 1.0` + tie; tiny next-gen kid `scale 0.55` + party hat. |

## No-voice rule

Reels are monetized, so they speak through **acting, signs, on-screen text, diagrams and sound
design** — minimal or no voice. If a vocal sound is truly needed it must be non-verbal
(a grunt/gasp/laugh) and come from a commercially licensed source (never OmniVoice, never
meme clips). See `docs/PLAYBOOK.md → Sound`.

## Recurring supporting cast

| Character | Notes |
|---|---|
| **The Bull** (ep03) | Brown, cream horns, gold nose ring. Reacts to movement and noise, not colour. Heavy: keeps its momentum, can't stop on a dime. Licks up dropped ice cream. |
| **The Alarm Clock** (ep02) | Twin bells. Comes alive (legs, angry eyebrows) when abused too often. |
| **The Machine** (ep01) | Pedestal + crane + cable. A press sends a visible spark along the cable — every consequence has a visible cause. |
| **Ghost Dash** (ep05) | Cartoon "death" gag only: a little white ghost with Dash's orange scarf and a halo floats up and waves bye. Never graphic; Dash is back, whole, next episode. |
| **The Sprout** (ep05) | A tiny alien plant with eyes on the green planet: proof of life. Waves hello; facepalms at Dash like Newt. |
| **The Bird** (ep04) | Tiny, round, one colour accent. Utterly unbothered by Dash; only moves when Newt whistles, and in the end chooses Dash's head. Signature: a three-note chirp. ~30 g — light enough to matter only at a perfect balance point. |

## Identity rules (checklist for every new episode)

- [ ] Hero has the orange scarf in every shot.
- [ ] Kid has the party hat in every shot (any age).
- [ ] Hero plays dumb (brute force, ignores the rule); Kid is the one who understands the physics.
- [ ] The Kid gets at least one "physics look" moment with a chalk-sketch overlay.
- [ ] No spoken voice; each character keeps his own non-verbal sound signature.
- [ ] Back limbs are grey (`BACK_INK`) so overlapping arms/legs stay readable.
- [ ] Each beat has its own facial expression (`src/rig/library.ts → FACES`).
