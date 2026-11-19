# Ep 13 — Why Door Handles ZAP You

- **Composition:** `StaticZap` · 44.0 s · `src/episodes/ep13-static-zap/`
- **Picture:** Blender 5.2, close-up studio style (like the reference shorts: one subject fills the frame on a sky-blue backdrop, soft studio light, macro detail). Characters: MPFB/MakeHuman (CC0, `tools/blender/realcast.py`); story animation on the locked timeline: `tools/blender/ep13_shots.py`; studio look, hero props (chrome lever, carpet tufts, fingerprint ridges, skin pores/SSS) and the close-up shot list: `tools/blender/ep13_closeup.py`. Cycles, 720×1280 (like the reference), to `out/blender/ep13c/`, upscaled into `public/renders/ep13.mp4` (git-ignored).
- **Render:** `bash tools/render.sh StaticZap` → `out/static-zap.mp4` (after the Blender picture is encoded; voice fitted by `tools/audio/ep13_fit_voice.py`)
- **Voice:** ElevenLabs (user's paid plan), takes in `public/voices/ep13-eleven/`, fitted to the locked picture timing by `tools/audio/ep13_fit_voice.py` (trims pauses, ≤ 10 % faster with pitch kept; "all at once" pinned to the spark, "The spark hits the key" to the key spark) → `public/voices/ep13-final/`.
- **Format (user, 2026-11-12/13):** a narrated "how it works" short in the style of realistic 3D explainers: close-ups first (one subject per shot on a clean blue backdrop), slow motion on the key moment. Our twist: Dash & Newt and a joke, with the physics in the plainest words.
- **Logline:** Dash shuffles across a carpet to the door and gets zapped by the handle. The narrator follows the electrons: from the carpet onto his shoes, over his whole body (his hair stands up), into his fingertip, and across a 3 mm gap as a tiny bolt of lightning. Newt shows the trick: touch the metal with a key first. Dash tries it, with the key in his teeth.
- **Moral:** *Rubbing charges you up. / Touch metal with a key, not your finger.*

## Physics (checked; every frame must agree)

| Claim (narration / picture) | Fact |
|---|---|
| Rubber soles rubbing a carpet "steal" electrons | Triboelectric charging: rubber sits on the negative side of the triboelectric series relative to nylon and wool, so it gains electrons from the carpet. |
| "Rubber won't let them escape, so they spread all over him" | Rubber is an insulator, so the charge can't drain to the floor; the human body conducts, so it spreads over the whole body. Picture: a blue rim glow climbs from his feet to his head. |
| "His hair stands up: the extra electrons push each other away" | Like charges repel; each strand carries the same sign of charge. Picture: Dash's hair lifts (shape key), then frizzes after the zap. |
| "About ten thousand volts" | Walking on carpet in dry air typically charges a person to 2–35 kV; 10 kV is a typical value. Caption: ≈ 10,000 VOLTS. |
| "Metal is an easy road for electrons" | Metals are conductors; the handle and door hardware give the charge a path away. |
| "They rush into his fingertip" | Charge density and the electric field are strongest at sharp points. Picture: the last electrons gather at the tip of his index finger. |
| "Jump the last few millimeters… a tiny bolt of lightning" | Air breaks down at roughly 3 kV per mm, so ~10 kV jumps ~3 mm. Picture: the fingertip stops **3.1 mm** from the lever (measured in Blender); label "3 mm gap". The spark is the same process as lightning, much smaller. |
| After the spark the glow is gone | The spark discharges him. Picture: the glow switches off at the spark. |
| "Lots of volts, but far too little current to hurt. Just a sting." | The charge stored on a person is tiny (microcoulombs; energy of millijoules), so the current lasts nanoseconds: you feel it, it isn't dangerous. |
| "Touch the metal with a key first. The spark hits the key, not your skin." | The spark forms at the key's tip (**2.7 mm** from the lever, measured); the current then spreads into the whole hand holding the key, so no sharp sting at a nerve-rich fingertip. |
| The gag: key in his teeth | The spark still hits the key's tip (**3.5 mm**, measured), but now the current goes through his teeth: zap. |

## Beats (real time, from `timeline.ts`)

| Time | Picture | Narration |
|---|---|---|
| 0–3.3 s | Wide: Dash shuffles across the carpet toward the door; Newt watches. | "Ever touched a door handle and got ZAPPED? Here's why." |
| 3.3–10.3 s | The camera glides down to his shoe on the carpet; small electrons hop from the fibres onto the sole. Label: ELECTRONS. | "When Dash shuffles across the carpet, his rubber soles rub the fibers and steal tiny particles called electrons." |
| 10.3–17.7 s | The camera rises and pulls back; a blue glow climbs from his feet to his head; his hair lifts. | "Rubber won't let them escape, so they spread all over him. Even his hair stands up: the extra electrons push each other away." |
| 17.7–20.6 s | At the door, glowing faintly. Label: ≈ 10,000 VOLTS. | "By the door, he's carrying about ten thousand volts." |
| 20.6–24.5 s | His finger reaches for the chrome lever. | "Metal is an easy road for electrons, so they rush into his fingertip," |
| 24.5–29.1 s | Side-on close-up, slow motion: the last electrons gather at the fingertip; a branching spark jumps the 3 mm gap. Label: 3 mm gap. | "and jump the last few millimeters all at once. A tiny bolt of lightning!" |
| 29.1–32.8 s | He recoils and shakes his hand; the glow is gone; Newt facepalms. | "Lots of volts, but far too little current to hurt. Just a sting." |
| 32.8–37.5 s | Newt shuffles over and touches the lever with a key; a small spark at the key tip; he smiles. Label: SPARK HITS THE KEY. | "Newt's trick? Touch the metal with a key first. The spark hits the key, not your skin." |
| 37.5–40.6 s | Dash shuffles back with the key in his teeth, bends double… ZAP. He turns to us, hair frizzed; Newt facepalms. | "Not in your mouth, Dash." |
| 41.2–44.0 s | Moral card. | — |

## Publish brief

```yaml
hook: "Why Door Handles ZAP You ⚡ (explained in 40 seconds)"
story:
  - "Shuffling across a carpet, your shoes steal tiny particles called electrons. They have nowhere to go… until you touch metal. ⚡"
  - "We followed them: from the carpet, all over Dash (even his hair stands up), into his fingertip, and across a 3 mm gap as a tiny bolt of lightning."
  - "It's about 10,000 volts, but far too little current to hurt. The trick: touch metal with a key first. 🔑"
  - "…not with the key in your mouth, Dash. 😬"
question: "What's the worst static shock you've ever had? 👇"
keywords: [static electricity, static shock, why do i get shocked, door handle shock, static electricity explained, electrons, triboelectric effect, physics explained, science explained, how it works, 3d animation, funny animation, learn physics, everyday physics, science shorts, dash and newt]
hashtags: [physics, science]
playlists: [electricity, worst-ideas]
cover_s: 26.7
instagram:
  hook: "Why door handles ZAP you ⚡"
  story:
    - "Your shoes steal electrons from the carpet… and the door handle gets them back. ⚡"
    - "10,000 volts, tiny current: a sting, not danger. Touch metal with a key first. 🔑"
  question: "Worst static shock you've had? 👇"
  tag_friend: "Tag the friend who always gets zapped 😂"
  hashtags: [physics, science, staticelectricity, 3danimation, dashandnewt]
  alt_text: >-
    Realistic 3D animation. A young man in an orange scarf shuffles across a carpet toward a door while a boy
    in a party hat watches. A narrator explains static electricity: glowing electrons hop from the carpet onto
    his shoe, a faint blue glow spreads over his body and his hair stands up, and in a slow-motion close-up a
    tiny spark jumps 3 mm from his fingertip to the metal door handle. The boy touches the handle with a key
    and the spark hits the key. The man tries it holding the key in his teeth and gets zapped.
```
