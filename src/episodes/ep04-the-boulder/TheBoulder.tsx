import React from "react";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/PermanentMarker";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, num, shake, type Ease } from "../../lib/kf";
import { GROUND, Stickman } from "../../rig/Stickman";
import { CHALK, ChalkPath, ChalkText, ChalkTint } from "../../shared/chalk";
import { ChalkNote, Stamp } from "../../shared/lesson";
import { FONT_STACK, HookTitle, Stars } from "../../shared/ui";
import { ballAt, birdAt, boulderAt, COIL_X, handOf, headTop, heroAt, hipOf, kidAt, orbitAt, plankAt, propRockAt } from "./cast";
import { G, PX_PER_M } from "./physics";
import { Ball, Bird, Boulder, Burst, Dust, Flowers, Ground, Hill, Pebble, Plank, PropRock, RopeCoil, RopeLine, Shiver, Sky, Tree, Tufts } from "./props";
import {
  B1,
  B1_FINAL,
  B1_LAND_T,
  B1_LAND_X,
  B1_LIP_T,
  BAL_LONG,
  BAL_SHORT,
  BALANCE_NOTE,
  BALL_BACK,
  BALL_R,
  BONK_T,
  CATAPULT_NOTE,
  CHARGE,
  CHARGE_HIT_X,
  D_LONG,
  D_SHORT,
  END_FADE,
  FLIGHT_T,
  HEAD_HIT,
  HIT_T,
  INTRO,
  KICK_T,
  LAUNCH,
  LAUNCH_T,
  LAUNCH_V,
  LESSON,
  LEVER,
  LIFT_MAX,
  M,
  PARK_T,
  PEBBLE_H,
  PIVOT_X,
  PLANK_L,
  PUSH,
  R,
  REBOUND_LAND_X,
  RECAP,
  ROLL_OFF,
  ROPE,
  ROPE_TAUT_T,
  SEESAW,
  SIT_X,
  SLAM_T,
  STRAP_T,
  TILT_UP,
  TIP_X,
  TRADE_NOTE,
  TRY,
  TWIST,
  UP_T,
  WEIGHT_NOTE,
} from "./timeline";

loadFont();

const W = 1080;
const H = 1920;
const m = (px: number) => (px / PX_PER_M).toFixed(2);
const RATIO_TXT = `${Math.round(D_LONG / D_SHORT)}×`;
const EDGE_KG = Math.round(M.boulder / 2);
const LIFT_CM = Math.round((LIFT_MAX / PX_PER_M) * 100);

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

const Boil: React.FC<{ t: number; id: string }> = ({ t, id }) => (
  <filter id={id} filterUnits="userSpaceOnUse" x={-3000} y={-3000} width={9000} height={7000}>
    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={Math.floor(t * 8) % 6} />
    <feDisplacementMap in="SourceGraphic" scale={4} />
  </filter>
);

// ─── Camera: [time, centre x, centre y, zoom, easing into this key] ──────
// Ground sits at 74 % of the frame height, whatever the zoom
const gy = (z: number) => GROUND - (0.74 * H - H / 2) / z;
const SHOTS: readonly (readonly [number, number, number, number, Ease?])[] = [
  [0, 520, gy(1.3), 1.3],
  [KICK_T - 0.1, 520, gy(1.3), 1.3],
  [KICK_T + 0.15, 1170, gy(0.5), 0.5, "snap"],
  [PARK_T - 0.2, 1170, gy(0.5), 0.5],
  [PARK_T - 0.03, B1, gy(1.45), 1.45, "snap"],
  [PARK_T + 1.0, B1, gy(1.45), 1.45],
  [PARK_T + 1.6, 780, gy(1.0), 1.0, "io"],
  [ROPE.grab - 0.3, 780, gy(1.0), 1.0],
  [ROPE.grab + 0.3, 900, gy(0.72), 0.72, "io"],
  [STRAP_T + 0.2, 900, gy(0.72), 0.72],
  [STRAP_T + 0.45, B1 - 40, gy(1.25), 1.25, "out"],
  [LESSON.look - 0.5, B1 - 40, gy(1.25), 1.25],
  [LESSON.look, 480, gy(0.8), 0.8, "io"],
  [TWIST.peel, 480, gy(0.8), 0.8],
  [TWIST.peel + 0.3, 460, gy(0.78), 0.78, "io"],
  [LAUNCH_T + 0.12, 460, gy(0.78), 0.78],
  [LAUNCH_T + 0.3, SIT_X + 20, gy(1.45), 1.45, "snap"],
  [BONK_T + 0.25, SIT_X + 20, gy(1.45), 1.45],
  [BONK_T + 0.6, 500, gy(0.8), 0.8, "io"],
  [SEESAW.lift - 0.3, 500, gy(0.8), 0.8],
  [SEESAW.lift + 0.2, 720, gy(0.7), 0.7, "io"],
  [SEESAW.set, 720, gy(0.7), 0.7],
  [SEESAW.set + 0.35, 880, gy(0.78), 0.78, "io"],
];
const cam = (t: number) => {
  const tr = (i: 1 | 2 | 3) => num(t, SHOTS.map((k) => [k[0], k[i], k[4]] as const));
  return { x: tr(1), y: tr(2), z: tr(3) };
};

// ─── Newt's lesson: a chalkboard over the frozen scene, built in three steps ──
const Lesson: React.FC<{ t: number }> = ({ t }) => {
  if (t < LESSON.tint || t > LESSON.end) return null;
  const P = LESSON.parts;
  const y0 = 860;
  const x0 = 120;
  const x1 = 960;
  const piv = x1 - (x1 - x0) / 9; // same 8 : 1 split as the real plank
  const kid = 160;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <ChalkTint t={t} from={LESSON.tint} to={LESSON.end} w={W} h={H} opacity={0.94} />
      <ChalkText t={t} at={LESSON.tint + 0.1} x={W / 2} y={250} size={70} rot={0} color="#ffd23f">
        NEWT'S CHEAT CODE: THE LEVER
      </ChalkText>
      {/* 1 — the parts. On "8× stronger" the chalk kid presses his side down and the rock
          rises: his end drops a lot, the rock lifts a little (the same 8 : 1 as the real plank). */}
      <ChalkPath t={t} at={P + 0.3} d={`M ${piv - 32} ${y0 + 60} L ${piv} ${y0 + 4} L ${piv + 32} ${y0 + 60} Z`} />
      <g transform={`rotate(${-7 * ease("io", (t - (LESSON.result + 1.0)) / 0.8)} ${piv} ${y0})`}>
        <ChalkPath t={t} at={P} d={`M ${x0} ${y0} L ${x1} ${y0}`} width={11} />
        <ChalkPath t={t} at={P + 0.6} d={`M ${x1 + 70} ${y0 - 72} a 72 72 0 1 0 -144 0 a 72 72 0 1 0 144 0`} />
        <ChalkPath
          t={t}
          at={P + 0.9}
          d={`M ${kid} ${y0 - 4} l -18 -46 m 18 46 l 18 -46 m -18 0 l 0 -56 m -26 30 l 26 -16 l 26 16 m -26 -32 a 17 17 0 1 0 0.1 0 m -12 -32 l 12 -34 l 12 34`}
          width={6}
        />
      </g>
      <ChalkText t={t} at={P + 1.4} x={760} y={y0 + 130} size={54} rot={0}>PIVOT (just a pebble!)</ChalkText>
      <ChalkText t={t} at={P + 2.3} x={800} y={y0 - 240} size={66} rot={0}>LOAD</ChalkText>
      <ChalkText t={t} at={P + 2.3} x={760} y={y0 - 180} size={50} rot={0}>{`rock edge ${EDGE_KG} kg (+ Dash)`}</ChalkText>
      <ChalkPath t={t} at={P + 2.5} d={`M 900 ${y0 - 160} L 940 ${y0 - 140}`} width={6} />
      <ChalkText t={t} at={P + 3.3} x={260} y={y0 - 270} size={66} rot={0}>EFFORT</ChalkText>
      <ChalkText t={t} at={P + 3.3} x={260} y={y0 - 210} size={54} rot={0}>{`me, ${M.newt} kg`}</ChalkText>
      <ChalkPath t={t} at={P + 3.5} d={`M ${kid + 10} ${y0 - 190} L ${kid} ${y0 - 160}`} width={6} />
      {/* 2 — the rule: compare the arms */}
      <ChalkPath t={t} at={LESSON.rule} d={`M ${x0} ${y0 + 200} L ${piv - 6} ${y0 + 200} m -22 -16 l 22 16 l -22 16 M ${x0 + 22} ${y0 + 184} l -22 16 l 22 16`} width={6} />
      <ChalkText t={t} at={LESSON.rule + 0.2} x={(x0 + piv) / 2} y={y0 + 268} size={60} rot={0}>{`my side: ${m(D_LONG)} m`}</ChalkText>
      <ChalkPath t={t} at={LESSON.rule + 0.5} d={`M ${piv + 6} ${y0 + 200} L ${x1} ${y0 + 200}`} width={6} />
      <ChalkText t={t} at={LESSON.rule + 0.6} x={(piv + x1) / 2 + 10} y={y0 + 268} size={50} rot={0}>{`${m(D_SHORT)} m`}</ChalkText>
      <ChalkText t={t} at={LESSON.rule + 1.3} x={W / 2} y={1280} size={72} rot={0}>long side × tiny push</ChalkText>
      <ChalkText t={t} at={LESSON.rule + 2.1} x={W / 2} y={1365} size={72} rot={0}>= short side × HUGE lift</ChalkText>
      {/* 3 — the result */}
      <ChalkText t={t} at={LESSON.result} x={W / 2} y={1500} size={62} rot={0}>{`My side is ${RATIO_TXT} longer…`}</ChalkText>
      <ChalkText t={t} at={LESSON.result + 1.0} x={W / 2} y={1615} size={104} rot={-2} color="#ffd23f">{`→ I'm ${RATIO_TXT} stronger!`}</ChalkText>
      {/* Dash, strapped to the rock, heckles the board: "?" … then mind blown */}
      <ChalkPath t={t} at={LESSON.rule + 0.4} d="M 975 1835 m -46 0 a 46 46 0 1 0 92 0 a 46 46 0 1 0 -92 0" width={6} />
      <ChalkPath t={t} at={LESSON.rule + 0.4} d="M 936 1878 q 39 18 78 0" width={14} color="#ff8a1f" />
      {t < LESSON.result + 1.0 ? (
        <ChalkText t={t} at={LESSON.rule + 0.6} x={975} y={1758} size={90} rot={8}>?</ChalkText>
      ) : (
        <ChalkText t={t} at={LESSON.result + 1.0} x={975} y={1758} size={90} rot={-8} color="#ffd23f">!!</ChalkText>
      )}
      <ChalkText t={t} at={LESSON.rule + 0.4} x={958} y={1845} size={34} rot={0}>{t < LESSON.result + 1.0 ? "• •" : "@ @"}</ChalkText>
      <ChalkText t={t} at={LESSON.result + 2.2} x={W / 2} y={1720} size={72} rot={0}>{`${M.newt} kg × ${Math.round(D_LONG / D_SHORT)} = ${EDGE_KG} kg.`}</ChalkText>
      <ChalkText t={t} at={LESSON.result + 3.0} x={W / 2 - 60} y={1810} size={64} rot={-2} color="#ffd23f">Muscles optional.</ChalkText>
    </svg>
  );
};

// Labels on the real plank and rock once it's set up (outlined: they sit on the bright sky)
const SceneLabels: React.FC<{ t: number }> = ({ t }) => {
  if (t < LEVER.labels || t > LEVER.labelsOff) return null;
  const a = LEVER.labels;
  const longEnd = { x: PIVOT_X - D_LONG * Math.cos(TILT_UP), h: PEBBLE_H + D_LONG * Math.sin(TILT_UP) };
  const mid = { x: (PIVOT_X + longEnd.x) / 2, h: (PEBBLE_H + longEnd.h) / 2 };
  const lbl = (x: number, h: number, text: string, at: number, rise: number) => (
    <g>
      <ChalkText t={t} at={at} x={x} y={GROUND - h - rise - 24} size={96} rot={0} outline>{text}</ChalkText>
      <ChalkPath t={t} at={at + 0.15} d={`M ${x} ${GROUND - h - rise} L ${x} ${GROUND - h - 10} m -18 -22 l 18 22 l 18 -22`} width={8} outline />
    </g>
  );
  return (
    <g>
      {lbl(PIVOT_X, PEBBLE_H, "PIVOT", a, 230)}
      {lbl(B1, 2 * R + BALL_R, "LOAD", a + 0.8, 230)}
      {lbl(longEnd.x + 20, longEnd.h + 40, "EFFORT", a + 1.6, 200)}
      <ChalkText t={t} at={a + 2.2} x={mid.x} y={GROUND - mid.h - 44} size={80} rot={-((TILT_UP * 180) / Math.PI)} outline>
        long arm
      </ChalkText>
    </g>
  );
};

// The trade-off, measured on the real plank: the long end went down ~1 m, the tip came up ~13 cm
const TradeMarks: React.FC<{ t: number }> = ({ t }) => {
  if (t < TRADE_NOTE.t0 || t > TRADE_NOTE.t1) return null;
  const a = TRADE_NOTE.t0;
  const longX = PIVOT_X - D_LONG * Math.cos(TILT_UP) - 60;
  const longH = PEBBLE_H + D_LONG * Math.sin(TILT_UP);
  return (
    <g>
      <ChalkPath t={t} at={a} d={`M ${longX} ${GROUND - longH} L ${longX} ${GROUND - 6} m -20 -26 l 20 26 l 20 -26`} width={10} outline />
      <ChalkText t={t} at={a + 0.2} x={longX + 30} y={GROUND - longH - 30} size={90} rot={0} outline>{`${Math.round(longH / PX_PER_M)} m`}</ChalkText>
      <ChalkPath t={t} at={a + 1.2} d={`M ${TIP_X + 40} ${GROUND - 4} L ${TIP_X + 40} ${GROUND - LIFT_MAX - 40} m -16 20 l 16 -20 l 16 20`} width={10} outline />
      <ChalkText t={t} at={a + 1.3} x={TIP_X + 40} y={GROUND - LIFT_MAX - 70} size={90} rot={0} outline>{`${LIFT_CM} cm`}</ChalkText>
    </g>
  );
};

// Newt's prediction of the ball: the real trajectory, dashed, with an X on Dash's head
const ArcSketch: React.FC<{ t: number }> = ({ t }) => {
  if (t < LAUNCH_T + 0.35 || t > BONK_T + 0.15) return null;
  const pts: string[] = [];
  for (let k = 0; k <= 40; k++) {
    const tau = (FLIGHT_T * k) / 40;
    const x = LAUNCH.x0 + LAUNCH_V * Math.sin(LAUNCH.ang) * tau;
    const h = LAUNCH.h0 + LAUNCH_V * Math.cos(LAUNCH.ang) * tau - 0.5 * G * tau * tau;
    pts.push(`${k ? "L" : "M"} ${x} ${GROUND - h}`);
  }
  const head = { x: HEAD_HIT.x, y: GROUND - HEAD_HIT.h + BALL_R };
  const at = LAUNCH_T + 0.4;
  const count = Math.ceil(BONK_T - t);
  return (
    <g>
      <ChalkPath t={t} at={at} dur={0.5} d={pts.join(" ")} dash width={8} outline />
      <ChalkPath t={t} at={at + 0.4} d={`M ${head.x - 22} ${head.y - 46} l 44 44 m 0 -44 l -44 44`} width={9} outline />
      <ChalkText t={t} at={at + 0.55} x={head.x + 150} y={head.y - 230} size={64} rot={-6} outline>{`t ≈ ${FLIGHT_T.toFixed(1)} s`}</ChalkText>
      {t > BONK_T - 1.5 && t < BONK_T && count >= 1 && count <= 3 ? (
        <ChalkText t={t} at={BONK_T - count - 0.01} x={head.x - 150} y={head.y - 160} size={130} rot={4} outline>{String(count)}</ChalkText>
      ) : null}
    </g>
  );
};

// After the BONK: why the ball flew (a little push on the short end → a fast long end)
const CatapultSketch: React.FC<{ t: number }> = ({ t }) => {
  const a = CATAPULT_NOTE.t0;
  if (t < a || t > CATAPULT_NOTE.t1) return null;
  const op = Math.min(1, (t - a) / 0.25, (CATAPULT_NOTE.t1 - t) / 0.25);
  const piv = { x: 760, y: 900 };
  const ang = 0.26;
  const L = 520;
  const S = 70;
  const lx = piv.x - L * Math.cos(ang);
  const ly = piv.y - L * Math.sin(ang);
  const sx = piv.x + S * Math.cos(ang);
  const sy = piv.y + S * Math.sin(ang);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, opacity: op }}>
      <rect x={70} y={560} width={940} height={450} rx={34} fill="#2f4a3c" stroke="#1b1b1b" strokeWidth={8} />
      <ChalkPath t={t} at={a + 0.1} d={`M ${lx} ${ly} L ${sx} ${sy}`} width={10} />
      <ChalkPath t={t} at={a + 0.1} d={`M ${piv.x - 26} ${piv.y + 50} L ${piv.x} ${piv.y + 6} L ${piv.x + 26} ${piv.y + 50} Z`} />
      <ChalkPath t={t} at={a + 0.5} d={`M ${sx + 20} ${sy - 70} L ${sx + 20} ${sy - 18} m -12 -16 l 12 16 l 12 -16`} width={6} />
      <ChalkText t={t} at={a + 0.5} x={sx + 20} y={sy - 86} size={40} rot={0}>a little</ChalkText>
      <ChalkPath t={t} at={a + 1.7} d={`M ${lx + 30} ${ly - 20} Q ${lx + 10} ${ly - 200} ${lx + 60} ${ly - 290} m -6 30 l 6 -30 l 26 18`} width={8} color="#ffd23f" />
      <ChalkText t={t} at={a + 1.8} x={lx + 210} y={ly - 220} size={56} rot={0} color="#ffd23f">{`${RATIO_TXT} faster!`}</ChalkText>
      <ChalkPath t={t} at={a + 3.1} d={`M ${lx + 70} ${ly - 300} Q ${(lx + piv.x) / 2 + 60} ${560 + 20} ${piv.x + 40} ${piv.y - 120}`} width={6} dash />
      <ChalkPath t={t} at={a + 3.3} d={`M ${piv.x + 40} ${piv.y - 110} m -18 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0`} width={5} />
    </svg>
  );
};

// Recap chalkboard before the moral
const Recap: React.FC<{ t: number }> = ({ t }) => {
  if (t < RECAP.t0 || t > END_FADE + 0.4) return null;
  const a = RECAP.t0;
  const op = Math.min(1, (t - a) / 0.35);
  const y0 = 820;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, opacity: op }}>
      <rect x={0} y={0} width={W} height={H} fill="#2f4a3c" />
      <ChalkText t={t} at={a + 0.15} x={W / 2} y={380} size={110} rot={-2} color="#ffd23f">THE LEVER</ChalkText>
      <ChalkPath t={t} at={a + 0.4} d={`M 160 ${y0} L 920 ${y0}`} width={10} />
      <ChalkPath t={t} at={a + 0.5} d={`M 806 ${y0 + 56} L 836 ${y0 + 4} L 866 ${y0 + 56} Z`} />
      <ChalkPath t={t} at={a + 0.6} d={`M 990 ${y0 - 62} a 62 62 0 1 0 -124 0 a 62 62 0 1 0 124 0`} />
      <ChalkPath t={t} at={a + 0.7} d={`M 200 ${y0 - 170} L 200 ${y0 - 40} m -16 -20 l 16 20 l 16 -20`} width={7} />
      <ChalkText t={t} at={a + 0.7} x={200} y={y0 - 190} size={44} rot={0}>small push</ChalkText>
      <ChalkPath t={t} at={a + 0.9} d={`M 928 ${y0 - 150} L 928 ${y0 - 230} m -16 20 l 16 -20 l 16 20`} width={7} color="#ffd23f" />
      <ChalkText t={t} at={a + 0.9} x={928} y={y0 - 250} size={44} rot={0} color="#ffd23f">big lift</ChalkText>
      <ChalkText t={t} at={a + 1.3} x={W / 2} y={1080} size={56} rot={0}>long plank + a pivot = a superpower</ChalkText>
      <ChalkText t={t} at={a + 2.1} x={W / 2} y={1200} size={60} rot={0}>The LONGER your side,</ChalkText>
      <ChalkText t={t} at={a + 2.1} x={W / 2} y={1275} size={60} rot={0}>the LESS muscle you need.</ChalkText>
      <ChalkText t={t} at={a + 3.8} x={W / 2} y={1740} size={50} rot={0} color={CHALK}>(Dash still prefers muscles.)</ChalkText>
      <ChalkText t={t} at={a + 2.7} x={W / 2} y={1530} size={54} rot={-1} color="#ffd23f">Doors, scissors, bottle openers, seesaws…</ChalkText>
      <ChalkText t={t} at={a + 3.2} x={W / 2} y={1605} size={54} rot={-1} color="#ffd23f">you use levers every day!</ChalkText>
    </svg>
  );
};

// ─── The world ────────────────────────────────────────────────────────────
const World: React.FC<{ t: number; camX: number }> = ({ t, camX }) => {
  const hero = heroAt(t);
  const kid = kidAt(t);
  const b = boulderAt(t);
  const ball = ballAt(t);
  const plank = plankAt(t);
  const bird = birdAt(t);
  const rock = propRockAt(t);
  const orbiting = t >= ROPE_TAUT_T && t < STRAP_T;
  const behind = orbiting && orbitAt(t).z < 0;
  const ballOnPlank = t >= TWIST.place && t < LAUNCH_T + 0.1;

  // the rope: thrown over the rock, then from its middle to Dash's waist
  const equator = { x: b.x, y: GROUND - b.h };
  const hip = hipOf(hero);
  let rope: React.ReactNode = null;
  if (t >= ROPE.loop && t < ROPE.loop + 0.3) {
    const u = (t - ROPE.loop) / 0.3;
    const hand = handOf(hero);
    rope = <RopeLine a={hand} b={{ x: hand.x + (equator.x - hand.x) * u, y: hand.y + (equator.y - hand.y) * u - Math.sin(Math.PI * u) * 120 }} slack={30} />;
  } else if (t >= ROPE.loop + 0.3 && t < ROLL_OFF.t0 + 0.3) {
    const slack = t < ROPE_TAUT_T ? 70 : 0;
    rope = <RopeLine a={equator} b={hip} slack={slack} />;
  }
  const plankEl = (
    <g transform={`translate(0 ${-40 * plank.lane})`} opacity={1 - 0.3 * plank.lane}>
      <Plank x={plank.x} h={plank.h} angle={plank.angle} len={PLANK_L} />
    </g>
  );

  return (
    <g>
      <Sky camX={camX} />
      <Ground />
      <Tree x={-520} s={1.1} />
      <Tree x={-330} s={0.8} />
      <Hill />
      <Tufts xs={[-300, -120, 260, 520, 700, 1180, 1340]} />
      <Flowers xs={[-220, 90, 610, 1260, 1420]} />
      <PropRock x={rock.x} h={rock.h} rot={rock.rot} />
      {plank.lane > 0.5 ? plankEl : null}
      {t < ROPE.grab ? <RopeCoil x={COIL_X} /> : null}
      {t > ROLL_OFF.t0 + 0.3 ? <RopeCoil x={B1_FINAL - 150} /> : null}
      {t < SEESAW.lift ? <Pebble x={PIVOT_X} /> : null}
      {behind ? <Stickman c={hero} /> : null}
      {behind ? rope : null}
      {!ballOnPlank ? <Ball x={ball.x} h={ball.h} rot={ball.rot} squash={ball.squash} /> : null}
      <Boulder x={b.x} h={b.h} rot={b.rot} bands={b.bands} />
      {t > LEVER.hang && t < LEVER.tip ? <Shiver x={b.x} y={GROUND - b.h} r={R} t={t} /> : null}
      {plank.lane <= 0.5 ? plankEl : null}
      {ballOnPlank ? <Ball x={ball.x} h={ball.h} rot={ball.rot} /> : null}
      <Stickman c={kid} />
      {!behind ? rope : null}
      {!behind ? <Stickman c={hero} /> : null}
      <Bird b={bird} t={t} />

      {/* stars, dust, impacts */}
      {t > CHARGE.bonk + 0.35 && t < CHARGE.up - 0.4 ? <Stars t={t} x={headTop(hero).x} y={headTop(hero).y - 10} /> : null}
      {t > BONK_T && t < UP_T - 0.7 ? <Stars t={t} x={headTop(hero).x} y={headTop(hero).y - 10} /> : null}
      <Dust t={t} at={B1_LAND_T} x={B1_LAND_X} seed="land" big={1.4} />
      <Dust t={t} at={PARK_T} x={B1} seed="park" />
      <Dust t={t} at={BALL_BACK.t1} x={BALL_BACK.x1} seed="ballLand" big={0.6} />
      <Dust t={t} at={KICK_T} x={hero.x + 60} seed="kick" big={0.7} dir={1} />
      <Dust t={t} at={CHARGE.go} x={hero.x} seed="charge0" big={1.6} dir={-1} />
      {[0.15, 0.3, 0.45].map((k) => (
        <Dust key={k} t={t} at={CHARGE.go + k} x={heroAt(CHARGE.go + k).x} seed={`run${k}`} dir={-1} />
      ))}
      <Burst t={t} at={CHARGE.bonk} x={CHARGE_HIT_X + 80} y={GROUND - 250} />
      <Dust t={t} at={CHARGE.bonk + 0.32} x={REBOUND_LAND_X} seed="butt" />
      <Burst t={t} at={STRAP_T} x={B1 - R} y={GROUND - 170} size={0.7} />
      <Dust t={t} at={ROLL_OFF.t0 + 0.3} x={B1 - 140} seed="pancake" />
      <Dust t={t} at={SLAM_T} x={SIT_X} seed="slam" />
      <Burst t={t} at={BONK_T} x={HEAD_HIT.x} y={GROUND - HEAD_HIT.h + BALL_R} size={0.6} />
      <Dust t={t} at={HIT_T} x={propRockAt(HIT_T).x} y={GROUND - propRockAt(HIT_T).h} seed="hit" big={0.6} />
      <Dust t={t} at={B1_LIP_T} x={1500} y={GROUND - 240} seed="lip" big={0.6} dir={-1} />

      <SceneLabels t={t} />
      <TradeMarks t={t} />
      <ArcSketch t={t} />
    </g>
  );
};

const Scene: React.FC = () => {
  const t = useT();
  const c = cam(t);
  const s = shake(t, [
    [B1_LAND_T, 10],
    [PARK_T, 4],
    [CHARGE.bonk, 12],
    [STRAP_T, 7],
    [SLAM_T, 8],
    [BONK_T, 6],
    [SEESAW.tipped + 0.3, 4],
  ]);
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <Boil t={t} id="boil" />
        </defs>
        <g transform={`translate(${W / 2 + s.x} ${H / 2 + s.y}) scale(${c.z}) translate(${-c.x} ${-c.y})`}>
          <g filter="url(#boil)">
            <World t={t} camX={c.x - W / 2} />
          </g>
        </g>
      </svg>
      <Notes t={t} />
      <Lesson t={t} />
      <CatapultSketch t={t} />
      <Recap t={t} />
      <EndCard t={t} />
    </>
  );
};

// Plain-language captions: what just happened, and why
const Notes: React.FC<{ t: number }> = ({ t }) => (
  <>
    <ChalkNote t={t} from={WEIGHT_NOTE.t0} to={WEIGHT_NOTE.t1} lines={[`This rock: ${M.boulder} kg`, "(7 grown-ups. Or one big ego.)"]} />
    <Stamp t={t} from={TRY[0]} to={TRY[0] + 2.0} text="TRY #1: PUSH IT" />
    <Stamp t={t} from={TRY[1]} to={TRY[1] + 2.0} text="TRY #2: RAM IT" />
    <Stamp t={t} from={TRY[2]} to={TRY[2] + 2.0} text="TRY #3: ROPE IT" />
    <ChalkNote t={t} from={STRAP_T + 0.8} to={LESSON.look - 0.2} lines={["Muscles: 0", "Rock: 3"]} highlight={[1]} />
    <ChalkNote t={t} from={LEVER.hang + 0.3} to={LEVER.birdOn - 0.1} lines={[`Newt ${M.newt} kg vs. rock edge ${EDGE_KG} kg…`, "so close. SO close."]} gap={1.3} size={56} />
    <ChalkNote t={t} from={LEVER.birdOn} to={LEVER.down} lines={["+ one tiny bird (30 g)…", "MVP of the day."]} highlight={[1]} gap={0.6} />
    <ChalkNote
      t={t}
      from={TRADE_NOTE.t0}
      to={TRADE_NOTE.t1}
      lines={["My end went DOWN 1 m.", `The rock went UP ${LIFT_CM} cm.`, `${RATIO_TXT} stronger… but ${RATIO_TXT} slower. Fair trade!`]}
      highlight={[2]}
      gap={1.1}
      size={56}
    />
    <ChalkNote
      t={t}
      from={CATAPULT_NOTE.t0}
      to={CATAPULT_NOTE.t1}
      lines={["Dash pushed the SHORT end a little…", `…the LONG end flew up ${RATIO_TXT} faster…`, "…and gravity sent it right back."]}
      highlight={[1]}
      gap={1.5}
      size={54}
    />
    <ChalkNote
      t={t}
      from={BALANCE_NOTE.t0}
      to={BALANCE_NOTE.t1}
      lines={["Heavy Dash sits CLOSE.", "Tiny Newt sits FAR.", `${M.dash} kg × ${m(BAL_SHORT)} m = ${M.newt} kg × ${m(BAL_LONG)} m`, "Perfectly balanced!"]}
      highlight={[3]}
      gap={1.2}
      size={54}
    />
    <ChalkNote t={t} from={SEESAW.tipped + 0.2} to={RECAP.t0} lines={["…until the bird picks a side."]} />
  </>
);

const EndCard: React.FC<{ t: number }> = ({ t }) => {
  if (t < END_FADE) return null;
  const dark = Math.min(1, (t - END_FADE) / 0.3);
  const l1 = ease("back", (t - (END_FADE + 0.4)) / 0.25);
  const l2 = ease("back", (t - (END_FADE + 1.1)) / 0.25);
  const line: React.CSSProperties = { fontFamily: FONT_STACK, fontSize: 96, color: "#fff", textAlign: "center", lineHeight: 1.15, padding: "0 70px" };
  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(17,17,17,${dark})`, justifyContent: "center", alignItems: "center", gap: 30 }}>
      <div style={{ ...line, scale: String(Math.max(0, l1)), opacity: t > END_FADE + 0.4 ? 1 : 0 }}>Leverage.</div>
      <div style={{ ...line, color: "#ffd23f", scale: String(Math.max(0, l2)), opacity: t > END_FADE + 1.1 ? 1 : 0 }}>A long plank beats big muscles.</div>
    </AbsoluteFill>
  );
};

const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

// Sound: a soft original music bed under everything, and only the cues that tell the story —
// at natural speed and moderate volume. Character signatures are used sparingly.
export const TheBoulder: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  const lessonDuck = (fr: number) => {
    const t = fr / fps;
    return t > LESSON.tint && t < LESSON.end ? 0.6 : 1;
  };
  return (
    <AbsoluteFill style={{ backgroundColor: "#bfe6ff" }}>
      <Scene />
      <HookTitle text="Muscles vs. a 480 kg boulder" to={INTRO.windUp - 0.3} />

      <Audio name="Music bed" src={sfx("bed-lever")} loop durationInFrames={durationInFrames} volume={(fr) => 0.22 * lessonDuck(fr) * Math.min(1, fr / f(1.0), (durationInFrames - fr) / f(1.5))} />

      {/* Cold open */}
      <Audio name="Stretch" src={sfx("swish")} from={f(INTRO.stretch)} volume={0.2} playbackRate={0.8} />
      <Audio name="Stretch crack" src={sfx("joint-crack")} from={f(INTRO.side + 0.2)} volume={0.3} />
      <Audio name="Hero: heh (cocky look)" src={sfx("hero-blip")} from={f(INTRO.cocky + 0.05)} volume={0.45} />
      <Audio name="Kick" src={sfx("kick")} from={f(KICK_T)} volume={0.8} />
      <Audio name="Rock knocked out" src={sfx("clack")} from={f(HIT_T)} volume={0.5} />
      <Audio name="Boulder rumble" src={sfx("rumble")} from={f(HIT_T + 0.1)} durationInFrames={f(PARK_T - HIT_T - 0.1)} loop volume={(fr) => 0.25 + 0.25 * Math.min(1, fr / f(1.2))} />
      <Audio name="Boulder lands" src={sfx("thud")} from={f(B1_LAND_T)} playbackRate={0.7} volume={0.75} />
      <Audio name="Ball squeak" src={sfx("squeak")} from={f(PARK_T - 0.05)} volume={0.55} />
      <Audio name="Kid: hmm (blink)" src={sfx("kid-blip")} from={f(PARK_T + 0.6)} volume={0.3} playbackRate={0.9} />

      {/* TRY #1 — push */}
      <Audio name="Stamp 1" src={sfx("pop")} from={f(TRY[0])} volume={0.3} />
      <Audio name="Feet slipping" src={sfx("scurry")} from={f(PUSH.t0 + 0.1)} durationInFrames={f(PUSH.slip - PUSH.t0 - 0.2)} loop volume={0.2} playbackRate={0.85} />
      <Audio name="Hero: uh (deadpan)" src={sfx("hero-blip")} from={f(PUSH.look + 0.1)} volume={0.4} playbackRate={0.85} />
      <Audio name="Moonwalk" src={sfx("scurry")} from={f(PUSH.back + 0.1)} durationInFrames={f(1.6)} volume={0.15} playbackRate={0.8} />
      <Audio name="Bird: yawn" src={sfx("chirp3")} from={f(PUSH.yawn)} volume={0.25} playbackRate={0.7} />

      {/* TRY #2 — ram it */}
      <Audio name="Stamp 2" src={sfx("pop")} from={f(TRY[1])} volume={0.3} />
      <Audio name="Charge" src={sfx("scurry")} from={f(CHARGE.go)} durationInFrames={f(CHARGE.bonk - CHARGE.go)} volume={0.35} />
      <Audio name="BONK" src={sfx("rock-thunk")} from={f(CHARGE.bonk)} volume={0.85} />
      <Audio name="Lands on butt" src={sfx("thud")} from={f(CHARGE.bonk + 0.32)} volume={0.45} />
      <Audio name="Dazed" src={sfx("twinkle")} from={f(CHARGE.bonk + 0.5)} volume={0.25} />

      {/* TRY #3 — rope it */}
      <Audio name="Stamp 3" src={sfx("pop")} from={f(TRY[2])} volume={0.3} />
      <Audio name="Throw loop" src={sfx("swish")} from={f(ROPE.loop - 0.1)} volume={0.35} />
      <Audio name="Rope taut" src={sfx("twang")} from={f(ROPE_TAUT_T)} volume={0.55} />
      <Audio name="Tetherball whirl" src={sfx("whirl")} from={f(ROPE_TAUT_T + 0.05)} durationInFrames={f(STRAP_T - ROPE_TAUT_T)} volume={0.35} />
      <Audio name="Hero: scream (tetherball)" src={sfx("hero-scream")} from={f(ROPE_TAUT_T + 0.3)} durationInFrames={f(STRAP_T - ROPE_TAUT_T - 0.3)} volume={0.4} />
      <Audio name="Strapped" src={sfx("thud")} from={f(STRAP_T)} volume={0.6} />
      <Audio name="Hero: womp 1" src={sfx("womp")} from={f(STRAP_T + 0.6)} volume={0.6} />

      {/* Newt's lesson */}
      <Audio name="Kid: chalk (parts)" src={sfx("chalk")} from={f(LESSON.parts)} volume={0.35} />
      <Audio name="Kid: chalk (rule)" src={sfx("chalk")} from={f(LESSON.rule)} volume={0.3} />
      <Audio name="Kid: idea chime (result)" src={sfx("chime")} from={f(LESSON.result + 1.0)} volume={0.35} />

      {/* The lever */}
      <Audio name="Plank drag" src={sfx("creak")} from={f(LEVER.drag + 0.6)} durationInFrames={f(LEVER.placed - LEVER.drag - 0.6)} volume={0.25} />
      <Audio name="Plank on pebble" src={sfx("clack")} from={f(LEVER.placed - 0.05)} volume={0.35} />
      <Audio name="Kid: hop" src={sfx("kid-blip")} from={f(LEVER.jump)} volume={0.3} />
      <Audio name="Kid: whistle" src={sfx("call-whistle")} from={f(LEVER.whistle)} volume={0.45} />
      <Audio name="Bird: flies over" src={sfx("chirp3")} from={f(LEVER.birdGo)} volume={0.35} />
      <Audio name="Lever gives" src={sfx("creak")} from={f(LEVER.tip)} durationInFrames={f(LEVER.down - LEVER.tip)} volume={0.4} />
      <Audio name="Ball re-inflates" src={sfx("reinflate")} from={f(LEVER.tip + 0.4)} volume={0.45} />
      <Audio name="Boulder rolls off" src={sfx("rumble")} from={f(ROLL_OFF.t0)} durationInFrames={f(ROLL_OFF.T + 0.2)} volume={0.35} />
      <Audio name="Pancake" src={sfx("pomf")} from={f(ROLL_OFF.t0 + 0.28)} volume={0.45} />
      <Audio name="Kid: win" src={sfx("kid-win")} from={f(LEVER.down + 0.15)} volume={0.45} />

      {/* Dash's twist */}
      <Audio name="Idea ding" src={sfx("chime")} from={f(TWIST.idea)} volume={0.3} />
      <Audio name="Ball placed" src={sfx("plink")} from={f(TWIST.place)} volume={0.3} />
      <Audio name="Hero: heh (on top)" src={sfx("hero-blip")} from={f(TWIST.cocky + 0.05)} volume={0.45} />
      <Audio name="Cannonball slam" src={sfx("thud")} from={f(SLAM_T)} volume={0.65} />
      <Audio name="Ball rockets up" src={sfx("slide-up")} from={f(LAUNCH_T)} durationInFrames={f(1.0)} playbackRate={1.2} volume={0.35} />
      <Audio name="Awkward silence" src={sfx("crickets")} from={f(LAUNCH_T + 0.6)} durationInFrames={f(0.9)} volume={0.2} />
      <Audio name="Ball coming down" src={sfx("fall-whistle")} from={f(BONK_T - 0.95)} durationInFrames={f(0.95)} volume={0.4} />
      <Audio name="Head bonk" src={sfx("boing")} from={f(BONK_T)} volume={0.6} />
      <Audio name="Hero: womp 2" src={sfx("womp")} from={f(BONK_T + 0.6)} volume={0.6} />
      <Audio name="Kid: chalk (catapult)" src={sfx("chalk")} from={f(CATAPULT_NOTE.t0 + 0.1)} volume={0.3} />

      {/* Balance + ending */}
      <Audio name="Plank on boulder" src={sfx("clack")} from={f(SEESAW.set)} volume={0.35} />
      <Audio name="Seesaw creak" src={sfx("creak")} from={f(SEESAW.rock)} durationInFrames={f(SEESAW.bird - SEESAW.rock)} loop volume={0.12} playbackRate={0.85} />
      <Audio name="Kid: giggle" src={sfx("kid-win")} from={f(SEESAW.rock + 0.5)} volume={0.35} />
      <Audio name="Bird: hops over" src={sfx("chirp3")} from={f(SEESAW.bird)} volume={0.35} />
      <Audio name="Seesaw tips" src={sfx("thud")} from={f(SEESAW.tipped + 0.3)} volume={0.35} playbackRate={1.2} />
      <Audio name="Hero: laugh" src={sfx("hero-blip")} from={f(SEESAW.tipped + 0.6)} volume={0.35} playbackRate={1.1} />
      <Audio name="Kid: whee" src={sfx("kid-win")} from={f(SEESAW.tipped + 0.4)} volume={0.45} />
      <Audio name="Kid: chalk (recap)" src={sfx("chalk")} from={f(RECAP.t0 + 0.3)} volume={0.3} />
      <Audio name="Moral 1" src={sfx("chime")} from={f(END_FADE + 0.4)} volume={0.35} />
      <Audio name="Moral 2" src={sfx("chime")} from={f(END_FADE + 1.1)} volume={0.35} playbackRate={1.25} />
    </AbsoluteFill>
  );
};
