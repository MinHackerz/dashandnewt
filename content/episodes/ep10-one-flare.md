# Ep 10 — One Flare

- **Composition:** `OneFlare` · 98.8 s · `src/episodes/ep10-one-flare/`
- **Render:** `bash tools/render.sh OneFlare` → `out/one-flare.mp4`
- **Status:** sheet approved by the user (2026-11-09); first full cut rendered for review. Beat times below are the plan; the exact times live in `timeline.ts` (the readable chalk and the flare's float pushed the cut to ~99 s).
- **Story source:** written by the user (an adventure, not the everyday-chore format; their explicit request).
- **Look:** ep08's pipeline. The 2D toon cast (`src/rig2d/Toon.tsx`) on painted backgrounds, with `Lane`/`Layer` depth lanes, a `SHOTS` camera table (centre, zoom, roll), slow motion through a story↔real clock map, and slow-written chalk (`ChalkText write` + `readTime`).
- **Camera (user):** fast, punchy explainer-short pacing, used only as a pacing reference. Every critical moment gets a punch-in, a zoom-out reveal, a whip pan, a dutch roll, a follow camera or slow motion. Hard cuts on the story clock skip dead time. Our own cast, sets and shots throughout.
- **Acting:** deadpan setup. Dash is a very serious tourist, then a very serious castaway with red "operation" captions. Newt is calm and methodical. The consequences get real emotion (memory rule from ep09): Dash's pride turns to horror, then sheepish guilt. Newt's worry turns to disappointment, then kindness.
- **Logline:** Dash and Newt take a self-flying helicopter tour to a mysterious island. A storm's lightning knocks out the autopilot and they crash-land on the beach. Over five days Dash shouts HELP from the beach, a palm top and a leaf megaphone. Every shout fades into the surf. Newt quietly lays driftwood into 5 m letters: **HELP**. A seaplane sees the sign, rocks its wings and radios a ship. The ship stops at the reef and starts lowering a lifeboat for them. Dash grabs their one flare and fires it **up into the sky**, though in his excitement he tilts it toward the ship "so they see it". It climbs, pops a little parachute at the top and hangs there burning. Then the offshore wind carries it, slowly drifting down, all the way out until it lands on the fuel drums on deck. The fire spreads, a drum bursts and blows a hole at the waterline, and the burning ship floods and **sinks**. The crew row away in the lifeboat, away from the man with the gun. A life ring marked *MV HOPE* washes up at Dash's feet. Newt carves "DAY 1" again and hands Dash half a coconut.
- **Moral:** *Shouts fade. Signs carry. / What goes UP comes DOWN — check the wind.*
- **One principle: a signal has to reach the receiver.**
  - Sound spreads out and fades fast: about −6 dB every time the distance doubles (the inverse-square law).
  - A big, high-contrast sign, or a light fired high, carries by line of sight.
  - The flare's flight follows `physics.ts`: ballistic with the one `G` on the way up, then a parachute descent carried by the wind. That isn't a second principle, just the motion rule.

## Set & plants (Chekhov rule)

- **The tour helicopter:** a cute, pilotless "SKY TOURS · AUTOPILOT" bubble helicopter. It has a dash screen with a smiley, a brochure reading *MYSTERY ISLAND TOUR*, and an orange **EMERGENCY KIT** box under the seat. There's no pilot, so nobody else is stranded.
- **The island:** seen from above it is shaped like a **?**, which is its mystery. It has a beach, three palms (the near one carries the day tally), a flat rock, the wreck in the sand, a reef line of white surf about 300 m out, and the horizon.
- **The kit:** a flare gun and exactly **ONE parachute flare** (close-up; the round's label shows a little parachute). Newt sets it on the flat rock in shot from Day 1, so it's visible in every later beach shot.
- **Driftwood** lies along the tideline, and Newt hauls it.
- **The offshore wind (island → sea)** is always visible: Dash's scarf and the palm fronds stream toward the sea, and the smoke from the wreck drifts out over the water. His HELP bubbles drift seaward too.
- **The ship:** an old coastal freighter, *MV HOPE*. Its deck carries rows of red drums stencilled **FUEL · NO FLAMES** (close-up as it arrives). A lifeboat hangs on davits, and life rings marked *MV HOPE* hang on the rail.
- **Dash's stubble** grows a little each day (a small `beard` value; Toon learns to draw stubble, the only rig addition).

## Beats (real time, target ≈ 70 s)

| Time | Beat |
|---|---|
| **0–3.0 s** | **Hook** *"They had ONE flare."* The helicopter cruises over a sunny Atlantic. Cut inside: Dash at the window with a tourist camera, Newt reading the brochure, the screen showing **AUTOPILOT 😊**. A zoom-out reveal shows a black storm wall dead ahead. |
| **3.0–7.5 s** | **The storm:** rain and dark. A lightning bolt hits the rotor mast (white flash frame). The screen glitches to **AUTOPILOT ☹ ERROR**, a dutch roll, the engine dies. The rotor keeps turning in **autorotation** and the craft spirals down. A whip pan shows the **?-shaped island** below. Dash: `hero-scream`. Newt holds the brochure, deadpan. |
| **7.5–10.5 s** | **Crash-landing:** a low angle as the skids hit the beach and slide, kicking up sand (friction stop, derived). It stops short of a palm. One beat of silence. The tail fin drops off, *clonk*. The door falls open and they climb out dazed, with stars, Dash's hair smoking. Stamp **STRANDED**. |
| **10.5–15.5 s** | **The kit:** Newt opens the EMERGENCY KIT. A close-up insert shows the flare gun and **1 FLARE**. **Newt's look #1** (written slowly): *fire it UP ↑ when a ship is near*. He sets the gun on the flat rock. Dash eyes it (the plant). Newt cuts a tally mark in the palm: **DAY 1**. |
| **15.5–21 s** | **Shout #1, from the beach.** Dash cups his hands. A **HELP!** bubble flies out over the sea, shrinking as it goes, with dB tags **100 → 80 → 60 → 40 dB**. It fades out in the surf with a tiny *plip*. Meanwhile Newt drags the first driftwood and lays the **H** (seen from the side as a flat shape on the sand). The sun arcs over and night tints in: **DAY 2**. |
| **21–26 s** | **Shout #2, from the top of a palm** (he shins up it; low angle). The bubble shrinks over the sea and a **gull snaps it up** and flies off. Newt lays the **E**. **DAY 3**. Dash's stubble is growing. |
| **26–31 s** | **Shout #3: MAXIMUM VOLUME.** He rolls a palm leaf into a megaphone, climbs the flat rock (next to the flare gun) and gives it everything (strain, vein, sweat). The bigger bubble still dies at sea (*…50 dB*). Newt lays **L** and **P**. **DAY 5**. Dash is hoarse and droops. |
| **31–40 s** | **Newt's look #2 (the principle),** written slowly, wide on the sea and the sign: *shout: 100 dB* → chalk rings spreading wider and thinner → *−6 dB each time the distance doubles* → *1 km out: 40 dB < waves: 60 dB*. Then on the sign: *letters 5 m tall — seen from the sky ✓*. Dash, voiceless, taps his throat. |
| **40–45 s** | **Aerial zoom-out:** from the sign up to the whole ?-shaped island. A seaplane's shadow crosses it, then the plane itself. A punch-in on the pilot with binoculars; a whip pan to the sign. **The plane rocks its wings** with the caption *wing rock = message received ✓* (a real search-and-rescue signal). Dash leaps and cheers; Newt gives a calm thumbs-up. Radio rings go from the plane to the horizon and the plane flies off. |
| **45–50 s** | **The ship:** on the horizon the **mast appears first, then the hull** (the Earth's curve, real). A time cut, and it stops at the reef about 300 m out. A punch-in shows the HOPE, its **FUEL · NO FLAMES** drums, the crew waving, the lifeboat starting to lower. Stamp **RESCUE INBOUND ✓**. |
| **50–53 s** | **Dash's moment:** ecstatic, he grabs the flare gun off the rock. Newt points **UP**, and Dash nods very seriously and raises the barrel to the sky. Then, wanting the ship to see it, he leans it **a little toward the ship** (a low angle on the barrel: up, but tilted at the sea). Stamp **SIGNAL: MAXIMUM**. |
| **53–56 s** | **BANG, straight into the sky.** Slow motion on the launch (smoke ring, recoil). A **follow camera** rides the flare up past the palms to the top of its climb. **Pop:** a little parachute opens and the flare hangs there, burning bright. Everyone looks up. Dash: proud. Crew: wave. |
| **56–58 s** | **Newt's look #3** (quick): chalk wind arrows blow toward the sea, and a dashed chalk path drifts the hanging flare down and out… right onto the fuel drums. Newt is worried (sweat, gulp), then disappointed: ***…oh.*** |
| **58–61 s** | **The drift, on the way DOWN:** a slow, horrible float. Time cuts follow it sinking and drifting out over the reef, with the wind in the parachute. The crew stop waving and start pointing; Dash keeps smiling. A punch-in as it settles **onto the fuel drums**, still burning. A beat of silence, a tiny *tink*. |
| **61–64 s** | **Fire, then the burst:** flames spread from drum to drum along the deck while the crew (count them: all five) scramble into the lifeboat and **row hard the other way**, away from the man still holding the gun. One drum **bursts**: a fireball, a camera shake and a hull plate blown open at the waterline. Black smoke rises. Cartoon-safe: nobody is hurt. |
| **64–67 s** | **The ship drowns:** water pours in through the hole. The burning ship lists, its bow rises, and it slides under stern-first, the horn groaning on the way down. Last the mast tip goes under, then bubbles and a wisp of steam. A whip pan back to the beach: one life ring, *MV HOPE*, washes up and bumps Dash's foot. |
| **67–69 s** | **The realisation:** Dash lowers the gun. A close-up runs pride → confusion → **horror** (hands on head) → sheepish glance at Newt. |
| **69–72 s** | **Heart:** Newt, disappointed but kind, walks to the palm, scratches out the five tally marks and carves a fresh **DAY 1**. He sits beside Dash and hands him half a coconut. A wide shot at dusk: the two of them on the beach, smoke drifting off the empty sea, HELP still on the sand. A slow fade. |
| **72–75.5 s** | **Moral card:** *Shouts fade. Signs carry. / What goes UP comes DOWN — check the wind.* |

## Physics check (all derived in `timeline.ts`)

| | |
|---|---|
| **Autorotation** | With the engine dead the rotor keeps turning from the up-flow and the craft sinks at about 7 m/s (a normal autorotation rate). The flare-out at the end cuts the touchdown to a slow forward slide. |
| **Skid stop** | Touchdown at 8 m/s on sand with μ ≈ 0.6 → slides v²/2μg ≈ **5.4 m** in **1.4 s** (`decelerate`). The palm it stops short of sits 5.8 m from the touchdown point. |
| **The shout** | A very loud shout is ≈ 100 dB at 1 m. L = 100 − 20·log₁₀(r): **80 dB at 10 m, 60 dB at 100 m, 40 dB at 1 km**. Beach surf is ≈ 60 dB, so past ~100 m the shout is buried. The bubble's size on screen tracks L. |
| **Megaphone** | A cone gives about +10 dB forward (focusing, not more power) → 50 dB at 1 km. Still under the surf. |
| **The sign** | Ground-to-air letters should be at least 3 m tall, so Newt's are 5 m, with strokes ≈ 0.4 m. From the plane at 300 m a letter spans ≈ 1° (a fingertip at arm's length), far above the eye's ~1 arcminute limit. |
| **Wing rock** | The real ground-to-air acknowledgement: rocking the wings in daylight means *message received*. |
| **Over the horizon** | Horizon distance ≈ 3.57·√h km: Dash's eyes at 1.6 m see ≈ 4.5 km. The HOPE's 30 m mast top is visible from ≈ 24 km, so the mast shows first. |
| **The flare** | A parachute flare round: v₀ = 55 m/s. At the top of its climb a small parachute opens and it hangs there burning for 40 s, descending at about 5 m/s and drifting with the wind. Fired straight **UP** it climbs to **≈ 154 m**, visible from ≈ 44 km (Newt's plan). |
| **Dash's shot** | He fires it UP but tilted **10°** toward the ship (the tilt is solved in `timeline.ts`). **Going up** (ballistic, one `G`) it climbs for 5.5 s to **152 m**, already 53 m out to sea. **Coming down** on the parachute it falls at 5 m/s for 29 s while the **8 m/s offshore wind** carries it another **233 m**. Total: **286 m** (the drums), landing on the ship 35 s after the shot, inside the 40 s burn, so it lands still burning (a flare burns at ~1500 °C, hot enough to light spilled fuel). The tilt is derived in `timeline.ts` from the ship's distance and the wind. |
| **Why it sinks** | A ship floats while the water it pushes aside weighs as much as it does (buoyancy). The burst opens a ≈ 2 m² hole at the waterline; water floods in at Q = C·A·√(2gh) ≈ 5 m³/s, and once the flooded hull outweighs the water it can still displace, it goes down. A real freighter takes minutes, so a time cut keeps the camera on the moment it slips under. |
| **No overlaps** | Dash on lane 0.5, Newt on lane 0. The sign letters lie on the sand in a near lane, drawn flattened (perspective). The rock and palm sit on their own lanes. |
| **Time** | Hard cuts on the story clock for the day jumps, the ship's approach and the flare's mid-flight. Slow motion on the lightning strike and the launch, and time cuts through the flare's 33 s float, all in one story↔real map. |

## Sound (all generated: `tools/sfx/ep10_flare.py`, numpy + `kit3d` via `.venv`; times via `node tools/sfx/ep10-times.mjs`)

- **Beds** (rendered as one-shots the length of the reel; no `<Audio loop>`):
  - Bright ocean wind at altitude, then the storm (heavy rain, wind, thunder rolls).
  - Island surf, birds and palm rustle that follow the day/night cycle, with soft crickets at night.
- **Helicopter:** rotor chop (amplitude-modulated noise + turbine whine) that winds down in autorotation; the lightning crack and thunder; the screen glitch as a short crackle (no beeps).
- **The crash:** skid hiss on sand, hull thump, the tail fin's clonk, the door creak and fall, then silence.
- **Island:** the kit latch; wood knocks and drags as the sticks go down; knife scratches on the palm; climbing the palm; the leaf megaphone rustle; the gull's squawk and wing flaps.
- **Rescue:** a seaplane fly-by with Doppler (louder as it nears, pitch dropping as it passes); a radio crackle burst; the ship's deep horn (rich and detuned, not a beep); the lifeboat davit creak.
- **The shot:** the flare gun's pop, the climbing whoosh, the parachute's *pop-flap*, the flare's steady hiss as it drifts, then the *tink* on the drums.
- **The ship's end:** fire catching and roaring, the drum burst (a deep boom with distance delay), hull groans and the horn's dying groan as it floods, water rushing in, the big gulp and bubbles as it goes under, the hiss of steam. The crew's oars. The life ring's soft bump on the sand.
- **Cast signatures:** `hero-scream` (the fall, and each shout, getting smaller), `hero-blip`, `womp`, `kid-blip`, `chalk` + `chime` on each look, `kid-win` on the wing rock. No voice.
- **Score `score-flare`** (original, timed from `timeline.ts`):
  - A sunny marimba/ukulele-style tour tune, then storm drums.
  - A deadpan little "castaway days" ostinato that steps up each day.
  - Thinking glock under Newt's looks; a heroic swell on the wing rock and the ship.
  - **Hard silence** from Newt's "…oh." to the *tink*, apart from the wind and the flare's hiss.
  - A grand, tragic brass line as the ship goes down, falling into a sad trombone-ish slide on Dash's realisation.
  - A warm, small ending on the coconut.
- **Mix:** ≈ −22 LUFS integrated; the render limiter does the rest.

## Publish brief

```yaml
hook: "They Had ONE Flare… and Dash Had It 🏝️🔥"
story:
  - "Their helicopter tour crashes on a mystery island. Dash shouts HELP for five days. Newt quietly builds a 5 m HELP sign out of driftwood. 🪵"
  - "A plane sees the sign, rocks its wings and sends a ship. Rescue is 300 m away. Dash fires their ONE flare up into the sky… and the wind brings it down right on the ship's fuel. 🚢🔥"
  - "🧠 Real physics: a shout loses ~6 dB every time the distance doubles — 100 dB at 1 m is only 40 dB at 1 km, quieter than the waves. A big sign (or a flare fired UP to ~150 m) carries by line of sight. And what goes up on a parachute comes down wherever the wind takes it."
question: "Shout or build the sign — what would YOU do first? 👇"
keywords: [inverse square law, parachute flare, wind drift, sound and distance, decibels explained, signal for help, stranded on an island, flare gun fail, projectile motion, funny physics, physics cartoon, funny animation, 2d animation, cartoon shorts, animated short, science cartoon, learn physics, survival tips, dash and newt]
hashtags: [physics, stranded]      # after the channel's #shorts #funnyanimation #cartoon
playlists: [newton, worst-ideas]
cover_s: 74.5                      # the parachute flare drifting down toward the fuel drums on the ship
instagram:
  hook: "They had ONE flare. Dash had the flare gun. 🏝️🔥"
  story:
    - |-
      Helicopter tour → storm → mystery island.
      Dash shouts HELP for 5 days.
      Newt builds a 5 m HELP sign.
    - "A plane sees the sign and sends a ship. Dash fires their only flare into the sky… and the wind drops it on the ship. Its cargo: fuel. 🔥🚢"
    - "Physics: sound fades ~6 dB every time the distance doubles. A shout is quieter than the waves 1 km out — a big sign isn't. 🧠"
  question: "Shout or sign — what's your first move? 👇"
  tag_friend: "Tag the friend who'd 100% tilt it “so they can see it” 😂"
  hashtags: [funnyanimation, physics, survival, cartoonanimation, dashandnewt]
  alt_text: >-
    2D cartoon animation. A serious young man in an orange scarf and a small boy in a party hat crash a
    self-flying tour helicopter on a question-mark-shaped island in a storm. For five days the man shouts
    HELP from the beach, a palm tree and a leaf megaphone while chalk notes show his shout fading below the
    sound of the waves; the boy lays driftwood into giant HELP letters. A seaplane sees the sign, rocks its
    wings and sends a ship. The man fires their only flare into the sky; it hangs on a parachute and the wind carries it down onto the fuel drums on deck,
    the ship catches fire, bursts and sinks while the crew row away in a lifeboat. The boy carves
    "DAY 1" on a palm again and shares a coconut with his friend.
```
