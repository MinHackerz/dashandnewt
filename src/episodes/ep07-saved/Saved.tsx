import React from "react";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/PermanentMarker";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, num, shake, type Ease } from "../../lib/kf";
import { GROUND } from "../../rig/Stickman";
import { Toon } from "../../rig2d/Toon";
import { ChalkPath, ChalkText, ChalkTint } from "../../shared/chalk";
import { Stamp } from "../../shared/lesson";
import { FONT_STACK, HookTitle } from "../../shared/ui";
import { carAt, ghostAt, hatAt, heroAt, kidAt, knifeWobble, pigeonAt, proj, type Placed } from "./cast";
import { CAR_LEN, CartBody, Car, Crates, FarSide, Lane, LooseHat, Pigeon, Puddle, Puff, Road, Sky, SpeedLines, KnifeStand } from "./props";
import {
  ADULT_V,
  AFTER,
  CRATE,
  CUE,
  D,
  DASH_WAIT,
  DASH_YANK_X,
  DPX,
  DURATION,
  END_FADE_R,
  flight,
  GAP_M,
  HOOK,
  IMPULSE,
  KNIFE_X,
  LAND_T,
  LOOK1,
  LOOK2,
  M,
  NEWT_PUD_X,
  NEWT_AFTER_X,
  PIG,
  PIGEON_X1,
  PUD,
  PUDDLE,
  RESUME,
  SHIELD_X,
  SLOW_R,
  storyOf,
  TOSS_LAND,
  TIP_H,
  YANK,
  FLY_SPEED,
  realOf,
} from "./timeline";

loadFont();

const W = 1080;
const H = 1920;

// ─── Camera, on the REAL clock: [time, centre x, centre y (world), zoom, easing] ──
const dashX = (r: number) => heroAt(storyOf(r)).c.x;
const kidX = (r: number) => kidAt(storyOf(r)).c.x;
const KNIFE_Y = GROUND + D.knife * DPX - 0.7 * TIP_H; // crate tops / knife tip, on screen
const fl = (u: number) => {
  const f = flight(storyOf(SLOW_R.a) + u * 0.3);
  return { x: f.x, y: GROUND + f.d * DPX - f.h };
};
const SHOTS: readonly (readonly [number, number, number, number, Ease?])[] = [
  // cold open: the cart and its upturned knife
  [0, KNIFE_X + 60, KNIFE_Y - 40, 1.6],
  [CUE.cut - 0.02, KNIFE_X + 30, KNIFE_Y - 60, 1.75, "lin"],
  // cut to the two of them walking
  [CUE.cut, dashX(CUE.cut) + 120, GROUND - 300, 1.3],
  [PIG.stop - 0.3, dashX(PIG.stop - 0.3) + 120, GROUND - 300, 1.3, "lin"],
  [PIG.flap, SHIELD_X + 110, GROUND - 320, 1.15, "io"],
  [PIG.resume, SHIELD_X + 110, GROUND - 320, 1.15],
  [PUD.stop, (NEWT_PUD_X + NEWT_AFTER_X) / 2, GROUND - 330, 1.4, "io"],
  [RESUME, (NEWT_PUD_X + NEWT_AFTER_X) / 2 + 40, GROUND - 330, 1.4],
  [RESUME + 0.6, dashX(RESUME + 0.6) + 140, GROUND - 320, 1.25, "io"],
  [LOOK1.back, dashX(LOOK1.back) + 120, GROUND - 330, 1.25, "lin"],
  // Newt checks the lane: wide enough to see it
  [LOOK1.tint + 0.2, kidX(LOOK1.tint + 0.2) - 250, GROUND - 400, 1.05, "io"],
  [LOOK1.end, kidX(LOOK1.end) - 230, GROUND - 400, 1.05, "lin"],
  [YANK.alarm, DASH_YANK_X + 120, GROUND - 300, 1.2, "io"],
  [SLOW_R.a, DASH_YANK_X + 130, GROUND - 300, 1.22],
  // slow motion: Newt in the air …
  [SLOW_R.a + 0.6, fl(0.4).x, fl(0.4).y - 30, 1.6, "io"],
  [LOOK2.end - 0.2, fl(0.8).x, fl(0.8).y - 20, 1.62, "lin"],
  // … and Dash, relieved, on the same slow clock
  [LOOK2.end + 0.4, DASH_YANK_X - 10, GROUND - 400, 2.1, "io"],
  [CUE.open, DASH_YANK_X - 10, GROUND - 400, 2.2, "lin"],
  [CUE.turn + 0.2, (DASH_YANK_X + KNIFE_X) / 2, GROUND - 300, 1.3, "io"],
  // the reveal
  [CUE.reveal, (DASH_YANK_X + KNIFE_X) / 2, GROUND - 300, 1.3],
  [CUE.reveal + 0.25, KNIFE_X - 20, KNIFE_Y - 30, 1.95, "snap"],
  [CUE.womp + 0.4, KNIFE_X - 20, KNIFE_Y - 30, 2.0, "lin"],
  [CUE.walk + 0.5, KNIFE_X - 110, GROUND - 330, 1.35, "io"],
  [CUE.ghost + 1.0, KNIFE_X - 100, GROUND - 380, 1.3, "io"],
  [CUE.wave, KNIFE_X - 100, GROUND - 420, 1.3, "io"],
  [CUE.end, KNIFE_X - 100, GROUND - 560, 1.2, "io"],
];
const cam = (r: number) => {
  const tr = (i: 1 | 2 | 3) => num(r, SHOTS.map((k) => [k[0], k[i], k[4]] as const));
  return { x: tr(1), y: tr(2), z: tr(3) };
};

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

const Boil: React.FC<{ t: number }> = ({ t }) => (
  <filter id="boil" filterUnits="userSpaceOnUse" x={-6000} y={-6000} width={16000} height={14000}>
    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={Math.floor(t * 8) % 6} />
    <feDisplacementMap in="SourceGraphic" scale={3} />
  </filter>
);

// ─── Newt's physics looks (chalk, wordless reasoning + a few words) ─────────
const Look1: React.FC<{ s: number }> = ({ s }) => {
  if (s < LOOK1.tint || s > LOOK1.end) return null;
  const nx = kidAt(s).c.x;
  const laneY = GROUND + D.car * DPX;
  const newtY = GROUND + D.newt * DPX;
  const x0 = nx - 1200;
  const x1 = nx + 500;
  const a = LOOK1.tint;
  return (
    <g>
      {/* the car's path: straight along its own lane */}
      <ChalkPath t={s} at={a + 0.05} dur={0.5} d={`M ${x0} ${laneY - 30} L ${x1} ${laneY - 30} m -40 -26 l 40 26 l -40 26`} width={10} outline />
      <ChalkPath t={s} at={a + 0.15} dur={0.3} d={`M ${x0 + 60} ${laneY - 40} l 0 -230 q 0 -40 40 -40 l 280 0 q 40 0 80 80 l 60 0 q 30 0 30 40 l 0 150 Z`} width={8} outline />
      {/* the gap, measured */}
      <ChalkPath t={s} at={a + 0.5} dur={0.3} d={`M ${nx - 150} ${laneY - 6} L ${nx - 150} ${newtY - 6} M ${nx - 170} ${laneY + 16} l 20 -22 l 20 22 M ${nx - 170} ${newtY - 28} l 20 22 l 20 -22`} width={8} color="#ffd23f" outline />
      <ChalkText t={s} at={a + 0.7} x={nx - 190} y={(laneY + newtY) / 2 + 16} size={62} anchor="end" rot={0} color="#ffd23f" outline>
        {`gap ≈ ${GAP_M.toFixed(1)} m ✓`}
      </ChalkText>
      <ChalkText t={s} at={a + 0.35} x={nx - 520} y={laneY - 330} size={62} rot={-2} outline>
        stays in its lane
      </ChalkText>
    </g>
  );
};

/** In the air: his own trajectory, and where it ends */
const Look2Arc: React.FC<{ t: number }> = ({ t }) => {
  if (t < LOOK2.tint || t > LOOK2.end) return null;
  const pts = [...Array(24)].map((_, i) => {
    const f = flight(YANK_REL + (i / 23) * (LAND_T - YANK_REL));
    return `${f.x},${GROUND + f.d * DPX - f.h}`;
  });
  const tip = proj({ x: KNIFE_X, y: GROUND - TIP_H }, D.knife, KNIFE_X);
  return (
    <g>
      <ChalkPath t={t} at={LOOK2.arc} dur={0.8} d={`M ${pts.join(" L ")}`} width={9} color="#ffd23f" outline />
      <ChalkPath t={t} at={LOOK2.arc + 0.7} dur={0.25} d={`M ${tip.x - 34} ${tip.y - 34} L ${tip.x + 34} ${tip.y + 34} M ${tip.x + 34} ${tip.y - 34} L ${tip.x - 34} ${tip.y + 34}`} width={11} color="#ff5a4a" outline />
    </g>
  );
};
const YANK_REL = YANK.release;

const Look2Text: React.FC<{ t: number }> = ({ t }) => {
  if (t < LOOK2.tint || t > LOOK2.end) return null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <ChalkTint t={t} from={LOOK2.tint} to={LOOK2.end} w={W} h={H} opacity={0.42} />
      <ChalkText t={t} at={LOOK2.f} x={W / 2} y={230} size={96} rot={-2} color="#ffd23f" outline>
        a = F ÷ m
      </ChalkText>
      <ChalkText t={t} at={LOOK2.m} x={W / 2} y={320} size={54} rot={0} outline>
        {`m = ${M.newt} kg … tiny → a = HUGE`}
      </ChalkText>
      <ChalkText t={t} at={LOOK2.m + 0.35} x={W / 2} y={390} size={44} rot={0} outline>
        {`(same pull on Dash, ${M.dash} kg: one step)`}
      </ChalkText>
      <ChalkText t={t} at={LOOK2.oh} x={250} y={1240} size={84} rot={-6} outline>
        …oh.
      </ChalkText>
    </svg>
  );
};

// ─── The world ────────────────────────────────────────────────────────────
type Item = { d: number; key: string; node: React.ReactNode };
const placed = (p: Placed, who: "dash" | "newt", key: string): Item => ({
  d: p.d,
  key,
  node: (
    <Lane d={p.d} ax={p.ax}>
      <Toon who={who} c={p.c} />
    </Lane>
  ),
});

const World: React.FC<{ t: number; s: number; camX: number }> = ({ t, s, camX }) => {
  const hero = heroAt(s);
  const kid = kidAt(s);
  const ghost = ghostAt(s);
  const car = carAt(s);
  const pg = pigeonAt(s);
  const hat = hatAt(s);
  const landed = s >= LAND_T;
  const squish = landed ? Math.min(1, (s - LAND_T) / 0.08) : 0;
  const drip = landed ? Math.min(1, Math.max(0, (s - LAND_T - 0.1) / 2.5)) : 0;
  const glint = Math.max(0, 1 - Math.abs(s - HOOK.glint) / 0.25);
  const carNear = Math.max(0, 1 - Math.abs(car.x - CAR_LEN / 2 - hero.c.x) / 1400);
  const items: Item[] = [
    {
      d: D.car,
      key: "car",
      node: (
        <Lane d={D.car} ax={car.x}>
          <SpeedLines x={car.x} t={s} k={carNear} />
          <Car x={car.x} t={s} rollX={car.x} />
        </Lane>
      ),
    },
    { d: D.newt - 0.02, key: "puddle", node: <Lane d={D.newt} ax={PUDDLE.x}><Puddle x={PUDDLE.x} r={PUDDLE.r} t={s} /></Lane> },
    { d: pg.d, key: "pigeon", node: <Lane d={pg.d} ax={pg.x}><Pigeon x={pg.x} h={pg.h} t={s} flying={pg.flying} peck={pg.peck} facing={pg.facing} /></Lane> },
    placed(kid, "newt", "newt"),
    placed(hero, "dash", "dash"),
    { d: D.cart, key: "cart", node: <Lane d={D.cart} ax={KNIFE_X + 170}><CartBody x={KNIFE_X + 170} /></Lane> },
    { d: D.knife + 0.01, key: "knife", node: <Lane d={D.knife} ax={KNIFE_X}><KnifeStand x={KNIFE_X} wobble={knifeWobble(s)} glint={glint} /></Lane> },
    {
      d: D.crate,
      key: "crates",
      node: (
        <Lane d={D.crate} ax={KNIFE_X - 40}>
          <Crates x={KNIFE_X - 40} squish={squish} t={s} drip={drip} />
          <Puff x={KNIFE_X - 40} y={GROUND - 2 * CRATE.h - 20} t={s} at={LAND_T} size={0.9} />
        </Lane>
      ),
    },
  ];
  if (hat.on !== "head")
    items.push({
      d: hat.d + 0.02,
      key: "hat",
      node: (
        <Lane d={hat.d} ax={hat.x}>
          <LooseHat x={hat.x} y={hat.y} spin={hat.spin} />
        </Lane>
      ),
    });
  if (ghost) items.push(placed(ghost, "newt", "ghost"));
  // Newt drawn in front of Dash once he's swung to the near side
  items.sort((a, b) => a.d - b.d);
  return (
    <g>
      <FarSide camX={camX} />
      <Road camX={camX} />
      {items.map((it) => (
        <g key={it.key}>{it.node}</g>
      ))}
      <Look1 s={s} />
      <Look2Arc t={t} />
    </g>
  );
};

const EndCard: React.FC<{ t: number }> = ({ t }) => {
  if (t < END_FADE_R) return null;
  const dark = Math.min(1, (t - END_FADE_R) / 0.3);
  const l1 = ease("back", (t - (END_FADE_R + 0.4)) / 0.25);
  const l2 = ease("back", (t - (END_FADE_R + 1.1)) / 0.25);
  const line: React.CSSProperties = { fontFamily: FONT_STACK, fontSize: 104, color: "#fff", textAlign: "center", lineHeight: 1.15, padding: "0 70px" };
  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(17,17,17,${dark})`, justifyContent: "center", alignItems: "center", gap: 30 }}>
      <div style={{ ...line, scale: String(Math.max(0, l1)), opacity: t > END_FADE_R + 0.4 ? 1 : 0 }}>F = ma.</div>
      <div style={{ ...line, color: "#ffd23f", scale: String(Math.max(0, l2)), opacity: t > END_FADE_R + 1.1 ? 1 : 0 }}>Small friend — gentle pull.</div>
    </AbsoluteFill>
  );
};

const Scene: React.FC = () => {
  const t = useT();
  const s = storyOf(t);
  const c = cam(t);
  const shk = shake(t, [[CUE.land, 5]]);
  const slow = t > SLOW_R.a && t < SLOW_R.b ? Math.min(1, (t - SLOW_R.a) / 0.25, (SLOW_R.b - t) / 0.2) : 0;
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <Boil t={t} />
          <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.55" stopColor="#0b1830" stopOpacity={0} />
            <stop offset="1" stopColor="#0b1830" stopOpacity={0.55} />
          </radialGradient>
        </defs>
        <Sky w={W} h={H} camX={c.x} t={t} />
        <g transform={`translate(${W / 2 + shk.x} ${H / 2 + shk.y}) scale(${c.z}) translate(${-c.x} ${-c.y})`}>
          <g filter="url(#boil)">
            <World t={t} s={s} camX={c.x} />
          </g>
        </g>
        {slow > 0 ? <rect width={W} height={H} fill="url(#vig)" opacity={slow} /> : null}
        <ChalkTint t={s} from={LOOK1.tint} to={LOOK1.end} w={W} h={H} opacity={0.22} />
      </svg>
      <Look2Text t={t} />
      <Stamp t={t} from={PIG.flap + 0.05} to={PIG.flap + 1.5} text="THREAT DETECTED" />
      <Stamp t={t} from={PIG.nod} to={PIG.nod + 1.1} text="THREAT NEUTRALISED" color="#2a9d8f" />
      <Stamp t={t} from={PUD.stop - 0.3} to={PUD.toss + 0.1} text="WATER HAZARD" color="#3a86c8" />
      <Stamp t={t} from={YANK.alarm} to={SLOW_R.a + 0.2} text="THREAT LEVEL: MAXIMUM" />
      <EndCard t={t} />
    </>
  );
};

const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

// Footsteps: one per half stride actually walked (rig stride 250 px, scaled), on the story clock.
const stepTimes = (xAt: (s: number) => number, segs: readonly (readonly [number, number])[], half: number) => {
  const out: number[] = [];
  for (const [a, b] of segs) {
    let last = xAt(a);
    let acc = half * 0.6;
    for (let s = a; s <= b; s += 1 / 120) {
      const x = xAt(s);
      acc += Math.abs(x - last);
      last = x;
      if (acc >= half) {
        out.push(realOf(s));
        acc -= half;
      }
    }
  }
  return out;
};
const DASH_STEPS = stepTimes((s) => heroAt(s).c.x, [[0, PIG.stop], [PIG.resume + DASH_WAIT, PUD.stop], [PUD.toss + 0.15, TOSS_LAND + 0.3], [RESUME, YANK.reach], [AFTER.walk, AFTER.reach]], 125);
const NEWT_STEPS = stepTimes((s) => kidAt(s).c.x, [[0, PIG.stop], [PIG.resume, PUD.stop], [RESUME, YANK.grab]], 125 * 0.72);

// Sound: original street ambience + score; one named node per cue; the slow-mo stretches the world.
export const Saved: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  return (
    <AbsoluteFill style={{ backgroundColor: "#a9dbfb" }}>
      <Scene />
      <HookTitle text="When your friend is a little TOO protective…" from={0.15} to={CUE.cut - 0.05} top={1500} />

      <Audio name="Score" src={sfx("score-saved")} durationInFrames={durationInFrames} volume={1.0} />
      <Audio name="Street ambience" src={sfx("street-amb")} durationInFrames={durationInFrames} volume={0.9} />

      {/* cold open */}
      <Audio name="Knife glint" src={sfx("knife-shing")} from={f(CUE.glint - 0.05)} volume={0.7} />

      {DASH_STEPS.map((s, i) => (
        <Audio key={`ds${i}`} name={`Dash step ${i + 1}`} src={sfx(`step-${(i % 4) + 1}`)} from={f(s)} volume={0.55} />
      ))}
      {NEWT_STEPS.map((s, i) => (
        <Audio key={`ns${i}`} name={`Newt step ${i + 1}`} src={sfx(`step-${((i + 2) % 4) + 1}`)} from={f(s)} volume={0.32} playbackRate={1.2} />
      ))}

      {/* the pigeon */}
      <Audio name="Pigeon flaps up" src={sfx("pigeon-flap")} from={f(CUE.pigFlap)} volume={0.8} />
      <Audio name="Hero: hup (shield)" src={sfx("hero-blip")} from={f(CUE.pigJump)} volume={0.2} playbackRate={0.9} />
      <Audio name="Dash lands in his stance" src={sfx("step-2")} from={f(PIG.guard)} volume={0.8} playbackRate={0.85} />
      <Audio name="Pigeon coo" src={sfx("pigeon-coo")} from={f(CUE.pigLand + 0.5)} volume={0.6} />
      <Audio name="Stamp: threat detected" src={sfx("pop")} from={f(PIG.flap + 0.05)} volume={0.15} />
      <Audio name="Stamp: neutralised" src={sfx("pop")} from={f(PIG.nod)} volume={0.15} playbackRate={1.2} />

      {/* the puddle */}
      <Audio name="Stamp: water hazard" src={sfx("pop")} from={f(PUD.stop - 0.3)} volume={0.15} playbackRate={0.9} />
      <Audio name="Newt flicked up" src={sfx("whoosh-small")} from={f(CUE.pudToss)} volume={0.7} />
      <Audio name="Kid: blip (up)" src={sfx("kid-blip")} from={f(CUE.pudToss + 0.12)} volume={0.2} playbackRate={1.2} />
      <Audio name="Newt lands neatly" src={sfx("step-3")} from={f(CUE.tossLand)} volume={0.6} playbackRate={1.25} />

      {/* the car, and the yank */}
      <Audio name="Car approaching" src={sfx("car-approach")} from={f(CUE.carHum)} durationInFrames={f(CUE.slowA - CUE.carHum)} volume={0.9} />
      <Audio name="Kid: chalk (lane)" src={sfx("chalk")} from={f(CUE.look1)} volume={0.25} />
      <Audio name="Kid: chime (gap ok)" src={sfx("chime")} from={f(CUE.look1 + 0.7)} volume={0.18} />
      <Audio name="Hero: uh-oh" src={sfx("hero-blip")} from={f(CUE.alarm)} volume={0.22} playbackRate={0.8} />
      <Audio name="Stamp: maximum" src={sfx("pop")} from={f(CUE.alarm)} volume={0.15} playbackRate={0.8} />
      <Audio name="Arm yank" src={sfx("arm-yank")} from={f(CUE.pull - 0.03)} volume={0.9} />

      {/* slow motion */}
      <Audio name="Time slows" src={sfx("slowmo")} from={f(CUE.slowA)} durationInFrames={f(CUE.slowB - CUE.slowA + 0.3)} volume={0.9} />
      <Audio name="Kid: chalk (trajectory)" src={sfx("chalk")} from={f(CUE.look2)} volume={0.25} />
      <Audio name="Kid: chime (a = F/m)" src={sfx("chime")} from={f(LOOK2.f)} volume={0.18} />
      <Audio name="Kid: facepalm" src={sfx("slap")} from={f(CUE.palm)} volume={0.25} playbackRate={1.2} />
      <Audio name="Kid: oh" src={sfx("kid-blip")} from={f(CUE.oh)} volume={0.2} playbackRate={0.85} />
      <Audio name="Hero: relieved" src={sfx("hero-blip")} from={f(CUE.heart)} volume={0.18} playbackRate={0.7} />
      <Audio name="Car driving away" src={sfx("car-away")} from={f(CUE.slowB)} volume={0.8} />

      {/* the THUNK (off-screen, behind him) */}
      <Audio name="Thunk" src={sfx("blade-thunk")} from={f(CUE.land)} volume={1.0} />
      <Audio name="Knife twang" src={sfx("knife-twang")} from={f(CUE.land + 0.04)} volume={0.75} />
      <Audio name="Tomatoes squelch" src={sfx("tomato-squelch")} from={f(CUE.land + 0.03)} volume={0.6} />
      <Audio name="Hero: womp" src={sfx("womp")} from={f(CUE.womp)} volume={0.32} />
      <Audio name="Hat lifted off the knife" src={sfx("hat-pluck")} from={f(CUE.hat)} volume={0.6} />

      {/* the ghost */}
      <Audio name="Ghost: wooo" src={sfx("ghost")} from={f(CUE.ghost + 0.2)} volume={0.32} playbackRate={1.25} />
      <Audio name="Pat 1" src={sfx("pat")} from={f(CUE.pat + 0.12)} volume={0.55} />
      <Audio name="Pat 2" src={sfx("pat")} from={f(CUE.pat + 0.47)} volume={0.5} playbackRate={1.05} />
      <Audio name="Kid: blip (wave)" src={sfx("kid-blip")} from={f(CUE.wave)} volume={0.15} playbackRate={1.1} />

      <Audio name="Moral 1" src={sfx("chime")} from={f(END_FADE_R + 0.4)} volume={0.25} />
      <Audio name="Moral 2" src={sfx("chime")} from={f(END_FADE_R + 1.1)} volume={0.25} playbackRate={1.25} />
    </AbsoluteFill>
  );
};

export { DURATION, IMPULSE, ADULT_V, FLY_SPEED, PIGEON_X1 };
