# Ep 11 — Wrong Door

- **Composition:** `WrongDoor` · 39.0 s · `src/episodes/ep11-wrong-door/`
- **Render:** `npm run render -- WrongDoor` → `out/wrong-door.mp4`
- **Status:** built and rendered, waiting for review.
- **Look:** first episode in the **3D house look** (user, 2026-11-10): `Toon3D` Dash & Newt on a `Stage3D` street, with the shop built in `props.tsx`. Chalk, stamps and cards are 2D overlays projected through the same camera.
- **Camera** (re-paced 2026-11-10 after "too fast to follow"): `camera.ts` has 19 shots instead of 32: a wide shot first, each gag held in one shot, slow push-ins and orbits instead of extra cuts. The beats got longer holds; motions stay at real speed.
- **Plain words:** PLAN stamps name every attempt (PLAN #1: PUSH IT … NEWT'S PLAN: ONE FINGER … PLAN #4: WALK IN PROUDLY); captions say what Dash wants ("Dash wants ice cream. The door says PUSH.") and what just happened ("He's pushing right next to the hinges…", "Door: 1. Dash: 0.", "The door closes by itself. He didn't read that sign."); the chalkboard reads *Doors turn on their hinges. / Push NEAR the hinge: super hard. / Push FAR from the hinge: super easy. / That's why handles are on the far edge!*; chalk labels read "Dash pushed here" / "Newt pushes here".
- **Acting direction:** everyone plays it **dead serious**. Dash is certain the door is the problem.
- **Logline:** An ice-cream shop door says PUSH. Dash pushes it right next to the hinge: one hand, two hands, a run-up. It doesn't move. Newt pushes the handle edge with one finger and it swings wide open. Dash, too proud to hurry, charges with his eyes shut and meets the door as its closer latches it.
- **Moral:** *Push far from the hinge. / That's why handles are on the edge.*
- **Everyday situation:** a heavy door that won't open.
- **Teaches:** how hard a push turns something depends on how far from the pivot you push. That's why door handles are on the far edge.
- **Physics (one principle):** torque, τ = F × r. Everything is derived in `timeline.ts`:
  - The door is a 60 kg slab, 1.1 m wide: I = ⅓mw² = 24.2 kg·m². It needs 45 N·m to break free and its closer pulls back with 8 N·m.
  - Dash: 400 N × 0.08 m = 32 N·m, then 520 N × 0.08 m = 41.6 N·m. Both under 45: it stays shut.
  - Newt: 50 N × 1.0 m = 50 N·m. Over 45: it opens. A tenth of the force, twelve times the distance.
  - The swing is integrated from those torques: 0.76 s under the finger, 1.86 s to the stopper at 100°, then 3.25 s for the closer to shut it. Dash's last run is timed back from that latch.
  - His bounce off the door is a true parabola with the shared `G`, then a constant-friction slide.

## Set & plants (Chekhov rule)

- **Cold open on the door:** a yellow **PUSH** plate and, under it, **THIS DOOR CLOSES ITSELF**, with the closer's box and arm above. Dash never reads the second sign.
- **The hinges are big and brass** on the far edge; the pull bar is on the edge nearest the camera. The whole width of the door, hinge to handle, is always in view.
- **Newt watches from the right foreground**, beside the wall, so he never covers the door or Dash.

## Beats (real time; times are from the first cut — the re-paced version runs ~10% longer per beat, see `timeline.ts`)

| Time | Beat |
|---|---|
| **0–2.3 s** · Hook | Tight on the PUSH plate, pulling out as they walk up. Title: *"It says PUSH. How hard can it be?"* |
| **2.5–4.9 s** · TRY #1: PUSH | Dash puts one big hand on the door, right beside the hinge. Snap zoom to the hand. A tiny creak. Close-ups: Dash confused, Newt curious. |
| **5.3–8.4 s** · TRY #2: PUSH HARDER | Both hands, whole body, face going red, the camera trembling with him. The door flexes a hair. Insert: Newt's foot tapping. Dash gives up, panting. |
| **8.9–12.4 s** · TRY #3: RUN-UP | He backs up (the camera tracks him), sets, and charges shoulder-first to a snare roll. **Bonk.** He leaves the door on a parabola and lands flat on his back. Stars. Newt facepalms. *Womp.* |
| **13.3–19.7 s** · Physics look | Newt's eyes narrow. The camera orbits the door while chalk marks the **hinge**, Dash's **tiny** distance in red and the **BIG distance** to the handle in yellow. Board: *turning force = push × distance / BIG push × tiny distance ✗ / tiny push × BIG distance ✓*. |
| **19.6–22.8 s** · ONE FINGER | Newt walks to the handle edge. Snap zoom to his fingertip. One push: the door swings all the way to its stopper while the camera flies back. Dash, on the floor, lifts his head. |
| **23.0–26.0 s** · TRY #4: WITH PRIDE | Newt steps aside and offers the open door. Dash stands, hands on hips, eyes shut, in a low hero shot. Behind him the closer is quietly swinging the door shut. Insert: the door closing. He charges, eyes still shut. |
| **26.05 s** · SLAM | The latch clicks and Dash arrives. Silence. He is flat on the door, arms up. Newt facepalms. |
| **27.0–27.6 s** | He peels off and timbers onto his back. Stars. *Womp.* |
| **28.1–32.2 s** · Heart | Newt walks back in and opens it again with one finger. Dash, still on his back, raises a thumbs-up. Newt returns it. |
| **36.1–39.0 s** · Moral card | *Push far from the hinge. / That's why handles are on the edge.* |

## Sound

- **Score** (`tools/sfx/ep11_door.py` → `score-door.wav`): a confident pizzicato strut that stops dead every time the door wins; a snare roll for the run-up; three glock notes for the chalk; a rising run when the finger opens it; the strut again, a tone higher, under Dash's pride; nothing at all on the slam; a music box to the card.
- **Foley** is the house kit: `creak`, `latch`, `thud`, `bonk`, `body-fall`, `pat`, `squeak`, `stretch`, `click`, `clunk`, `swish`, steps.
- **Signatures:** `hero-blip`, `womp`; `kid-blip`, `chalk`, `chime`, `kid-win`. No voice.

## Publish brief

```yaml
# YouTube + Facebook: title hook (keyword + curiosity), story lines, comment question
hook: "He Pushed the WRONG Side of the Door 🚪"
story:
  - "It says PUSH. So Dash pushes… right next to the hinge. One hand. Two hands. A full run-up. The door does not care. 🚪"
  - "Then Newt opens it with ONE finger. Same door. The trick is torque: turning force = push × distance from the hinge. 🧠"
  - "Dash: 520 N × 0.08 m = 41.6 N·m (not enough). Newt: 50 N × 1 m = 50 N·m (opens). A tenth of the force, twelve times the distance."
  - "That's why door handles are on the far edge… and why you should always read the second sign. 😅"
question: "Have you ever pushed a PULL door in front of people? 👇"
keywords: [torque, torque explained, turning force, moment of a force, lever arm, why door handles are on the edge, physics explained, funny physics, physics cartoon, 3d animation, funny animation, cartoon shorts, animated short, science cartoon, learn physics, physics shorts, push door fail, dash and newt]
hashtags: [physics, torque]          # after the channel's #shorts #funnyanimation #cartoon
playlists: [forces, worst-ideas]     # "all" is always added
cover_s: 26.3                        # Dash flat against the shut door, Newt mid-facepalm
instagram:
  hook: "He pushed the WRONG side of the door 🚪😂"
  story:
    - |-
      One hand? Nope.
      Two hands? Nope.
      A full run-up? …ouch. 💫
    - "Then Newt opens it with ONE finger. Torque = push × distance from the hinge. 🧠"
    - "Physics tip: push far from the hinge. And read the second sign. 😅"
  question: "Who's pushed a pull door in public? 👇"
  tag_friend: "Tag the friend who fights doors 😂"
  hashtags: [funnyanimation, physics, torque, 3danimation, dashandnewt]
  alt_text: >-
    3D cartoon animation. A confident young man in an orange scarf tries to open an ice-cream shop
    door marked PUSH by pushing right beside its hinges: with one hand, with both hands, then with a
    running shoulder charge that bounces him onto his back. A small boy in a party hat studies the
    door; chalk drawings mark the hinge, a tiny distance and a big distance, with the rule turning
    force = push × distance. The boy pushes the handle edge with one finger and the door swings open.
    The man proudly charges with his eyes shut as the self-closing door latches, hits it flat, and
    falls on his back. The boy opens it again with one finger and they trade a thumbs-up.
```
