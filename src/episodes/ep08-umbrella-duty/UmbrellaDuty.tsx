import React from "react";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/PermanentMarker";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, num, type Ease } from "../../lib/kf";
import { POSES } from "../../rig/library";
import { FACES } from "../../rig/library";
import { GROUND, solve, toWorld } from "../../rig/Stickman";
import type { CharState } from "../../rig/types";
import { Lane } from "../../rig2d/depth";
import { Toon, TOON_INK } from "../../rig2d/Toon";
import { ChalkPath, ChalkText, ChalkTint } from "../../shared/chalk";
import { WRITE } from "../../lib/read";
import { Stamp } from "../../shared/lesson";
import { FONT_STACK, HookTitle } from "../../shared/ui";
import { brollyAt, canopyOf, dropsAt, heroAt, kidAt, RADIUS } from "./cast";
import { Balloon, Bench, Bollard, Brolly, BusStop, Drop, Lace, Leaves, Promenade, Rack, Rain, Sea, Shop, Sky, TieCloseUp, WindLines, type BrollyKind, type Canopy } from "./props";
import {
  BALLOON,
  BROLLY,
  BUS_X,
  CAP,
  CLIMB,
  CUE,
  D,
  DASH_X,
  DURATION,
  END_FADE_R,
  GUST,
  LACE,
  BOLLARD_X,
  DASH_TIE_X,
  DASH_REACH,
  FOOT_H,
  GRIEF,
  JUMP_H,
  LIFT_T,
  RUN,
  RUN_X,
  SEE,
  STAND,
  TIE_WALK,
  TIE1,
  TIE2,
  TILT,
  LACE_INSERT,
  LOOK1,
  LOOK1_LINES,
  LOOK2,
  LOOK2_LINES,
  MIN_TO_BALLOON,
  NEWT_SCALE,
  NEWT_X,
  RACK_X,
  RAIN,
  RAIN_OFF,
  SHOP,
  SLOW_R,
  storyOf,
  SUN,
  U1,
  U2,
  U3,
  windAt,
  BALLOON_ALT,
  realOf,
  flyAt,
} from "./timeline";

loadFont();

const W = 1080;
const H = 1920;
const INK = TOON_INK;

// ─── Camera, on the REAL clock: [time, centre x, centre y (world), zoom, roll°, easing] ──
// Big moments get a punch-in, a dutch-angle roll, a low angle or a zoom-out reveal.
const fl = (s: number) => {
  const f = flyAt(s);
  return { x: f.x, y: GROUND - f.h };
};
const MID = (DASH_X + NEWT_X) / 2;
const R = realOf;
const SHOTS: readonly (readonly [number, number, number, number, number, Ease?])[] = [
  [0, 1150, GROUND - 720, 0.62, 0],
  [1.9, 1220, GROUND - 640, 0.7, 0, "lin"],
  [2.6, MID, GROUND - 430, 1.25, 0, "io"],
  // drop 1: punch in on his hat, tilted…
  [2.85, NEWT_X - 30, GROUND - 380, 2.1, -4, "snap"],
  [3.45, NEWT_X - 30, GROUND - 380, 2.15, -4, "lin"],
  // …and pull back out to see Dash react
  [3.8, MID - 40, GROUND - 470, 1.2, 0, "io"],
  [U1.drip - 0.5, MID - 20, GROUND - 470, 1.2, 0],
  [U1.drip - 0.2, NEWT_X - 40, GROUND - 420, 1.9, 5, "snap"],
  [U1.drip + 0.55, NEWT_X - 40, GROUND - 420, 1.95, 5, "lin"],
  [U2.toss, MID - 40, GROUND - 480, 1.15, 0, "io"],
  [U2.side - 0.55, MID - 20, GROUND - 480, 1.15, 0],
  // the sideways drop: a low angle down at his shoe
  [U2.side - 0.3, NEWT_X + 60, GROUND - 200, 1.75, -6, "snap"],
  [U2.side + 0.45, NEWT_X + 60, GROUND - 200, 1.8, -6, "lin"],
  // Newt's look: wide, so the shop wall and its roof are in frame
  [LOOK1.tint + 0.25, 1060, GROUND - 760, 0.66, 0, "io"],
  [LOOK1.end, 1080, GROUND - 760, 0.67, 0, "lin"],
  // the parasol: in close on the struggle, then a zoom-out reveal of how BIG it is
  [U3.grab, 1330, GROUND - 560, 1.05, 3, "io"],
  [U3.open - 0.05, 1420, GROUND - 520, 1.12, 3, "lin"],
  [U3.open + 0.35, 1470, GROUND - 790, 0.7, -3, "snap"],
  [U3.nod + 0.3, 1470, GROUND - 720, 0.76, -2, "lin"],
  [LACE.notice + 0.2, 1500, GROUND - 520, 1.05, 0, "io"],
  [TIE_WALK.b, 1640, GROUND - 520, 0.98, 0, "io"],
  [LOOK2.tint, 1460, GROUND - 640, 0.86, 0, "io"],
  [GUST - 0.05, 1450, GROUND - 640, 0.88, 0, "lin"],
  // THE GUST: whip toward the shop, dutch angle, low; Newt skids to the wall and lifts
  [GUST + 0.3, 1330, GROUND - 600, 0.98, -7, "snap"],
  [LIFT_T + 0.3, 1160, GROUND - 640, 1.05, -5, "io"],
  [TIE2.a - 0.02, 1150, GROUND - 760, 0.98, -3, "lin"],
  // back from the knot close-up: Dash stands, turns to the empty spot…
  [TIE2.b + 0.02, DASH_TIE_X + 30, GROUND - 420, 1.3, 0],
  [STAND.empty + 0.25, (DASH_TIE_X + NEWT_X) / 2, GROUND - 440, 1.15, 0, "io"],
  // …looks up: zoom out and tilt to reveal Newt floating by the shop wall
  [SEE + 0.35, (RUN_X + DASH_TIE_X) / 2 - 40, GROUND - 680, 0.7, 4, "snap"],
  [RUN.b, RUN_X + 40, GROUND - 650, 0.82, 2, "io"],
  // the near-miss, in slow motion: low and tight on fingertips vs. shoe sole
  [SLOW_R.a + 0.35, RUN_X - 10, GROUND - DASH_REACH - JUMP_H - 60, 2.3, -6, "io"],
  [SLOW_R.b - 0.25, RUN_X - 10, GROUND - DASH_REACH - JUMP_H - 90, 2.4, -6, "lin"],
  // zoom out: he lands; Newt keeps rising
  [SLOW_R.b + 0.45, RUN_X - 20, GROUND - 640, 0.85, 0, "io"],
  [R(GRIEF) + 0.4, RUN_X - 30, GROUND - 640, 0.88, 0, "lin"],
  // crane up after Newt, leaving Dash (hands on his head) at the bottom of the frame
  [R(TILT.a), RUN_X - 30, GROUND - 760, 0.8, 0, "io"],
  [R(TILT.b), fl(TILT.b).x, fl(TILT.b).y + 260, 0.62, 0, "io"],
];
const cam = (r: number) => {
  const tr = (i: 1 | 2 | 3 | 4) => num(r, SHOTS.map((k) => [k[0], k[i], k[5]] as const));
  return { x: tr(1), y: tr(2), z: tr(3), roll: tr(4) };
};

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

// ─── Newt's physics looks ───────────────────────────────────────────────────
/** 1: the wind hits the shop's wall and is forced UP over the roof (drawn in the shop's own lane) */
const SHOP_AX = (SHOP.x0 + SHOP.x1) / 2;
const Look1: React.FC<{ s: number }> = ({ s }) => {
  if (s < LOOK1.tint || s > LOOK1.end) return null;
  const wall = SHOP.x1;
  const roof = GROUND - SHOP.h;
  return (
    <Lane d={D.shop} ax={SHOP_AX}>
      {[0, 1, 2].map((k) => {
        const y = GROUND - 160 - k * 250;
        const gap = 50 + k * 70; // inner streams hug the wall, outer ones turn wider
        const top = roof - 160 - k * 110;
        return (
          <ChalkPath
            key={k}
            t={s}
            at={LOOK1.wind + k * 0.15}
            dur={0.7}
            d={`M ${wall + 1100} ${y} L ${wall + gap + 140} ${y} Q ${wall + gap} ${y} ${wall + gap} ${y - 140} L ${wall + gap} ${roof + 40} Q ${wall + gap} ${top} ${wall - 220} ${top - 30} m 46 -32 l -46 32 l 50 26`}
            width={16}
            color={k === 1 ? "#ffd23f" : undefined}
            outline
          />
        );
      })}
    </Lane>
  );
};
const Look1Text: React.FC<{ s: number }> = ({ s }) => {
  if (s < LOOK1.tint || s > LOOK1.end) return null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <ChalkText t={s} at={LOOK1.wall} x={W / 2} y={1560} size={80} rot={-2} outline write={WRITE}>
        {LOOK1_LINES[0]}
      </ChalkText>
      <ChalkText t={s} at={LOOK1.up} x={W / 2} y={1680} size={92} rot={-3} color="#ffd23f" outline write={WRITE}>
        {LOOK1_LINES[1]}
      </ChalkText>
    </svg>
  );
};

/** 2: the parasol's area, and the numbers */
const Look2Ring: React.FC<{ s: number }> = ({ s }) => {
  if (s < LOOK2.tint || s > LOOK2.end) return null;
  const c = canopyOf(brollyAt(s, "parasol"));
  return <ChalkPath t={s} at={LOOK2.ring} dur={0.5} d={`M ${c.top.x - c.r - 30} ${c.top.y + 40} a ${c.r + 30} ${c.r * 0.55 + 20} 0 1 0 ${2 * (c.r + 30)} 0 a ${c.r + 30} ${c.r * 0.55 + 20} 0 1 0 ${-2 * (c.r + 30)} 0`} width={10} color="#ffd23f" outline />;
};
const Look2Text: React.FC<{ s: number }> = ({ s }) => {
  if (s < LOOK2.tint || s > LOOK2.end) return null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <ChalkTint t={s} from={LOOK2.tint} to={LOOK2.end} w={W} h={H} opacity={0.45} />
      <ChalkText t={s} at={LOOK2.f} x={W / 2} y={230} size={100} rot={-2} color="#ffd23f" outline write={WRITE}>
        {LOOK2_LINES[0]}
      </ChalkText>
      <ChalkText t={s} at={LOOK2.f + 0.95} x={W / 2} y={330} size={56} rot={0} outline write={WRITE}>
        (A = the parasol's area: 4.5 m²)
      </ChalkText>
      <ChalkText t={s} at={LOOK2.num} x={W / 2} y={1560} size={66} rot={0} outline write={WRITE}>
        {LOOK2_LINES[1]}
      </ChalkText>
      <ChalkText t={s} at={LOOK2.oh} x={W / 2 + 200} y={1690} size={96} rot={-6} color="#ffd23f" outline write={0.09}>
        {LOOK2_LINES[2]}
      </ChalkText>
    </svg>
  );
};

/** Close-up bubble: Dash's untied shoelace (the reason he hands the parasol over) */
const LaceInsert: React.FC<{ t: number }> = ({ t }) => {
  if (t < LACE_INSERT.t0 || t > LACE_INSERT.t1) return null;
  const sc = Math.max(0, Math.min(ease("back", (t - LACE_INSERT.t0) / 0.22), (LACE_INSERT.t1 - t) / 0.12));
  const cx = W / 2;
  const cy = 560;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <g transform={`translate(${cx} ${cy}) scale(${sc})`} stroke={INK} strokeWidth={8} strokeLinejoin="round">
        <circle r={230} fill="#e3d6bf" />
        <g transform="translate(-40 40) scale(4.2)">
          <path d="M -16 4 L 38 4 Q 50 4 47 -7 Q 42 -20 22 -21 L 8 -27 Q -16 -30 -16 -10 Z" fill="#fbfbf7" strokeWidth={2} />
          <path d="M -16 4 L 38 4 Q 50 4 48 -3 L -16 -3 Z" fill="#ff8a1f" strokeWidth={2} />
          <rect x={-14} y={-46} width={20} height={20} fill="#2f3e5c" strokeWidth={2} />
        </g>
        <Lace x={-10} y={-60} s={3.2} tied={false} t={t} />
      </g>
      <text x={cx} y={cy - 255} textAnchor="middle" fontFamily={FONT_STACK} fontSize={62} fill="#fff" stroke={INK} strokeWidth={14} paintOrder="stroke" opacity={sc}>
        shoelace: UNTIED
      </text>
    </svg>
  );
};

/** "HOLD THIS." — his only line, on screen */
const SaysBubble: React.FC<{ t: number; from: number; to: number; text: string }> = ({ t, from, to, text }) => {
  if (t < from || t > to) return null;
  const sc = Math.max(0, Math.min(ease("back", (t - from) / 0.2), (to - t) / 0.12));
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 300 }}>
      <div style={{ fontFamily: FONT_STACK, fontSize: 80, color: INK, background: "#fff", border: `8px solid ${INK}`, borderRadius: 40, padding: "10px 46px", scale: String(sc) }}>{text}</div>
    </AbsoluteFill>
  );
};

// ─── The promenade ──────────────────────────────────────────────────────────
type Item = { d: number; key: string; node: React.ReactNode };
const BrollyNode: React.FC<{ kind: BrollyKind; s: number }> = ({ kind, s }) => {
  const b = brollyAt(s, kind);
  return <Brolly kind={kind} x={b.x} y={b.y} tilt={b.tilt} pole={BROLLY[kind].pole} r={RADIUS[kind]} open={b.open} />;
};

const World: React.FC<{ t: number; s: number; camX: number }> = ({ t, s, camX }) => {
  const hero = heroAt(s);
  const kid = kidAt(s);
  const wind = windAt(s);
  const rainAmt = s < RAIN.on ? 0 : s < RAIN_OFF ? Math.min(1, 0.25 + (s - RAIN.on) / (RAIN.full - RAIN.on)) : Math.max(0, 1 - (s - RAIN_OFF) / 0.6);
  const kinds = ["small", "golf", "parasol"] as const;
  const states = kinds.map((k) => brollyAt(s, k));
  const laneOf = (by: string) => (by === "dash" ? D.dash : by === "newt" || by === "fly" ? D.newt : by === "rack" ? D.rack : 0.9);
  const cover: Canopy[] = states
    .filter((b) => b.open > 0.5 && (b.by === "dash" || b.by === "newt"))
    .map((b) => {
      const c = canopyOf(b);
      return { x0: c.top.x - c.r, x1: c.top.x + c.r, y: c.top.y + laneOf(b.by) * 72 };
    });
  const j = solve(hero.c.pose);
  const foot = toWorld(hero.c, j.aFoot);
  const items: Item[] = [
    { d: D.bench, key: "bench", node: <Lane d={D.bench} ax={700}><Bench x={700} /></Lane> },
    { d: D.shop, key: "shop", node: <Lane d={D.shop} ax={(SHOP.x0 + SHOP.x1) / 2}><Shop t={s} wind={wind} /></Lane> },
    { d: -0.4, key: "bus", node: <Lane d={-0.4} ax={BUS_X}><BusStop x={BUS_X} /></Lane> },
    { d: D.dash - 0.01, key: "bollard", node: <Lane d={D.dash} ax={BOLLARD_X}><Bollard x={BOLLARD_X} h={FOOT_H - 4} /></Lane> },
    { d: D.rack, key: "rack", node: <Lane d={D.rack} ax={RACK_X}><Rack x={RACK_X} has={{ small: states[0].by === "rack", golf: states[1].by === "rack", parasol: states[2].by === "rack" }} /></Lane> },
    { d: D.newt, key: "newt", node: <Lane d={D.newt} ax={kid.ax}><Toon who="newt" c={kid.c} /></Lane> },
    {
      d: D.dash,
      key: "dash",
      node: (
        <Lane d={D.dash} ax={hero.ax}>
          <Toon who="dash" c={hero.c} />
          <Lace x={foot.x + 8} y={foot.y - 14} s={1} tied={s >= TIE2.b - 0.5} t={s} />
        </Lane>
      ),
    },
  ];
  states.forEach((b, i) => {
    if (b.by === "rack") return;
    const d = laneOf(b.by);
    items.push({ d: d + 0.01, key: `b${i}`, node: <Lane d={d} ax={b.x}><BrollyNode kind={kinds[i]} s={s} /></Lane> });
  });
  items.sort((a, b) => a.d - b.d);
  return (
    <g>
      <Sea camX={camX} t={s} wind={wind} sun={ease("io", (s - SUN) / 1.5)} />
      <Promenade camX={camX} />
      {items.map((it) => (
        <g key={it.key}>{it.node}</g>
      ))}
      <Rain t={s} amount={rainAmt} wind={wind} camX={camX} cover={cover} />
      {dropsAt(s).map((d, i) => (
        <Drop key={i} {...d} />
      ))}
      <Leaves t={s} from={GUST - 0.05} wind={wind} camX={camX} />
      <WindLines t={s} wind={wind} camX={camX} top={GROUND - 1300} />
      <Look1 s={s} />
      <Look2Ring s={s} />
    </g>
  );
};

// ─── 8 minutes later, 1 km up ───────────────────────────────────────────────
const SCB = 200; // px per metre in this shot
const BalloonScene: React.FC<{ s: number; t: number }> = ({ s, t }) => {
  const B = BALLOON;
  const v = CLIMB * SCB;
  const gripY = 1080 + v * (B.nod - s); // he meets the passenger's eye at the nod
  const gripX = 330;
  const k = SCB / 240; // scale from the street's px/m to this shot's
  const hl = solve(POSES.hangKid).aHand;
  const nod = Math.max(0, Math.sin(Math.PI * Math.max(0, Math.min(1, (s - B.nod) / 0.5))));
  const c: CharState = {
    x: 0,
    lift: 0,
    facing: 1,
    scale: NEWT_SCALE,
    sx: 1,
    sy: 1,
    pose: { ...POSES.hangKid, head: POSES.hangKid.head + 18 * nod },
    faceX: 0.6,
    lookY: 0.2,
    expr: s > B.see && s < B.lower ? FACES.kidCurious : s >= B.lower && s < B.raise + 0.6 ? FACES.kidHappy : FACES.kidDeadpan,
    blink: 0,
    aHand: "fist",
    bHand: "fist",
    extras: { partyHat: true, blush: true },
    t: s,
    speed: 0,
  };
  // put his hands on the grip (in this shot's scale)
  c.x = -c.facing * NEWT_SCALE * hl.x;
  c.lift = NEWT_SCALE * hl.y;
  const paper = s < B.lower ? 1 : s < B.lower + 0.3 ? 1 - ease("io", (s - B.lower) / 0.3) : s < B.raise ? 0 : ease("io", (s - B.raise) / 0.3);
  const card = Math.max(0, Math.min(1, (s - B.card) / 0.25, (B.rise + 0.4 - s) / 0.3));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="hi" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f7fd6" />
          <stop offset="1" stopColor="#bfe6ff" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#hi)" />
      {/* clouds and the coast far below; everything drifts with the same wind, so nothing slides sideways */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i} fill="#ffffff" stroke={INK} strokeWidth={5} opacity={0.95}>
          <ellipse cx={120 + i * 300} cy={1700 + (i % 2) * 60 + Math.sin(t * 0.6 + i) * 4} rx={190} ry={60} />
          <ellipse cx={60 + i * 300} cy={1730 + (i % 2) * 60} rx={120} ry={46} />
        </g>
      ))}
      <Balloon x={760} y={1250} t={s} paper={paper} nod={nod} />
      <g transform={`translate(${gripX} ${gripY})`}>
        <Brolly kind="parasol" x={0} y={0} tilt={0} pole={BROLLY.parasol.pole * k} r={RADIUS.parasol * k} open={1} />
        <g transform={`scale(${k}) translate(0 ${-GROUND})`}>
          <Toon who="newt" c={c} />
        </g>
      </g>
      <g opacity={card}>
        <text x={W / 2} y={300} textAnchor="middle" fontFamily={FONT_STACK} fontSize={92} fill="#fff" stroke={INK} strokeWidth={18} paintOrder="stroke">
          {`${Math.round(MIN_TO_BALLOON)} minutes later…`}
        </text>
        <text x={W / 2} y={400} textAnchor="middle" fontFamily={FONT_STACK} fontSize={64} fill="#ffd23f" stroke={INK} strokeWidth={14} paintOrder="stroke">
          {`${BALLOON_ALT / 1000} km up`}
        </text>
      </g>
      <rect width={W} height={H} fill="#111111" opacity={ease("io", (s - B.fade) / (B.end - B.fade))} />
    </svg>
  );
};

const EndCard: React.FC<{ t: number }> = ({ t }) => {
  if (t < END_FADE_R) return null;
  const dark = Math.min(1, (t - END_FADE_R) / 0.3);
  const l1 = ease("back", (t - (END_FADE_R + 0.4)) / 0.25);
  const l2 = ease("back", (t - (END_FADE_R + 1.1)) / 0.25);
  const line: React.CSSProperties = { fontFamily: FONT_STACK, fontSize: 100, color: "#fff", textAlign: "center", lineHeight: 1.15, padding: "0 70px" };
  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(17,17,17,${dark})`, justifyContent: "center", alignItems: "center", gap: 30 }}>
      <div style={{ ...line, scale: String(Math.max(0, l1)), opacity: t > END_FADE_R + 0.4 ? 1 : 0 }}>Air resistance.</div>
      <div style={{ ...line, color: "#ffd23f", scale: String(Math.max(0, l2)), opacity: t > END_FADE_R + 1.1 ? 1 : 0 }}>Bigger umbrella, bigger push.</div>
    </AbsoluteFill>
  );
};

const Scene: React.FC = () => {
  const t = useT();
  const s = storyOf(t);
  if (s >= BALLOON.start) {
    return (
      <>
        <BalloonScene s={s} t={t} />
        <EndCard t={t} />
      </>
    );
  }
  // the focused close-ups of his hands tying the lace
  const cu = (w: { a: number; b: number }) => (s >= w.a && s < w.b ? Math.min(1, (s - w.a) / 0.12, (w.b - s) / 0.12) : 0);
  const cu1 = cu(TIE1);
  const cu2 = cu(TIE2);
  const c = cam(t);
  const sun = ease("io", (s - SUN) / 1.5);
  const slow = t > SLOW_R.a && t < SLOW_R.b ? Math.min(1, (t - SLOW_R.a) / 0.25, (SLOW_R.b - t) / 0.2) : 0;
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="vig8" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.55" stopColor="#0b1830" stopOpacity={0} />
            <stop offset="1" stopColor="#0b1830" stopOpacity={0.5} />
          </radialGradient>
        </defs>
        <Sky w={W} h={H} sun={sun} cloudX={s < GUST ? 0 : -(s - GUST) * 700} />
        <g transform={`translate(${W / 2} ${H / 2}) rotate(${c.roll}) scale(${c.z * (1 + Math.abs(c.roll) * 0.006)}) translate(${-c.x} ${-c.y})`}>
          <World t={t} s={s} camX={c.x} />
        </g>
        {slow > 0 ? <rect width={W} height={H} fill="url(#vig8)" opacity={slow} /> : null}
        <ChalkTint t={s} from={LOOK1.tint} to={LOOK1.end} w={W} h={H} opacity={0.25} />
      </svg>
      {cu1 > 0 ? <TieCloseUp phase="bow" u={(s - TIE1.a) / (TIE1.b - TIE1.a)} t={s} fade={cu1} /> : null}
      {cu2 > 0 ? <TieCloseUp phase="double" u={(s - TIE2.a) / (TIE2.b - TIE2.a)} t={s} fade={cu2} /> : null}
      <Look1Text s={s} />
      <Look2Text s={s} />
      <LaceInsert t={s} />
      <Stamp t={t} from={CAP.rain} to={CAP.rain + 1.3} text="RAIN DETECTED" />
      <Stamp t={t} from={CAP.golf} to={CAP.golf + 1.4} text="UPGRADE: GOLF UMBRELLA" color="#3a86c8" />
      <Stamp t={t} from={CAP.max} to={CAP.max + 1.5} text="MAXIMUM PROTECTION" />
      <Stamp t={t} from={U3.nod} to={U3.nod + 0.5} text="PROTECTED ✓" color="#2a9d8f" />
      <SaysBubble t={t} from={LACE.hand - 0.05} to={TIE_WALK.a + 0.35} text="Hold this." />
      <Stamp t={t} from={TIE1.a + 0.1} to={TIE1.a + 1.4} text="LACE PROTOCOL" color="#3a86c8" top={160} />
      <Stamp t={t} from={TIE2.b - 0.45} to={TIE2.b} text="DOUBLE KNOT: SECURED ✓" color="#2a9d8f" top={160} />
    </>
  );
};

const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

// Sound: original seaside ambience + score; one named node per cue; the slow-mo stretches the world.
export const UmbrellaDuty: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const f = (x: number) => Math.round(x * fps);
  return (
    <AbsoluteFill style={{ backgroundColor: "#c9d2dc" }}>
      <Scene />
      <HookTitle text="When your friend takes rain VERY seriously" from={0.15} to={2.5} top={1480} />

      <Audio name="Score" src={sfx("score-umbrella")} durationInFrames={durationInFrames} volume={1.0} />
      <Audio name="Seaside ambience" src={sfx("sea-amb")} durationInFrames={durationInFrames} volume={0.9} />
      <Audio name="Rain" src={sfx("rain-bed")} durationInFrames={durationInFrames} volume={0.9} />

      <Audio name="Drop on the hat" src={sfx("drop-tink")} from={f(CUE.drop1)} volume={0.8} />
      <Audio name="Hero: alert" src={sfx("hero-blip")} from={f(CUE.drop1 + 0.12)} volume={0.2} playbackRate={0.9} />
      <Audio name="Stamp: rain" src={sfx("pop")} from={f(CUE.capRain)} volume={0.15} />
      <Audio name="Small umbrella out of the stand" src={sfx("rack-rattle")} from={f(CUE.u1grab)} volume={0.6} />
      <Audio name="Small umbrella opens" src={sfx("brolly-open-small")} from={f(CUE.u1open)} volume={0.8} />
      <Audio name="Drip off the rim" src={sfx("drop-plip")} from={f(CUE.drip)} volume={0.8} />
      <Audio name="Kid: blink" src={sfx("kid-blip")} from={f(CUE.drip + 0.1)} volume={0.15} playbackRate={0.9} />

      <Audio name="Stamp: golf" src={sfx("pop")} from={f(CAP.golf)} volume={0.15} playbackRate={1.1} />
      <Audio name="Small umbrella dropped" src={sfx("brolly-drop")} from={f(CUE.u2toss + 0.35)} volume={0.6} />
      <Audio name="Golf umbrella out" src={sfx("rack-rattle")} from={f(CUE.u2grab)} volume={0.6} playbackRate={0.9} />
      <Audio name="Golf umbrella opens" src={sfx("brolly-open-golf")} from={f(CUE.u2open)} volume={0.85} />
      <Audio name="Drop on the shoe" src={sfx("drop-plip")} from={f(CUE.side)} volume={0.7} playbackRate={0.85} />
      <Audio name="Hero: grr" src={sfx("hero-blip")} from={f(CUE.side + 0.15)} volume={0.2} playbackRate={0.8} />

      <Audio name="Kid: chalk (wind)" src={sfx("chalk")} from={f(CUE.look1)} volume={0.25} />
      <Audio name="Kid: chime (goes up)" src={sfx("chime")} from={f(LOOK1.up)} volume={0.18} />

      <Audio name="Stamp: maximum" src={sfx("pop")} from={f(CAP.max)} volume={0.15} playbackRate={0.85} />
      <Audio name="Golf umbrella dropped" src={sfx("brolly-drop")} from={f(CUE.u3toss + 0.35)} volume={0.6} playbackRate={0.9} />
      <Audio name="Parasol dragged out" src={sfx("parasol-drag")} from={f(CUE.u3grab)} volume={0.8} />
      <Audio name="Parasol opens (FWOOMP)" src={sfx("brolly-open-parasol")} from={f(CUE.u3open)} volume={1.0} />
      <Audio name="Rain drums on the parasol" src={sfx("canopy-drum")} from={f(CUE.u3open + 0.2)} durationInFrames={f(CUE.gust - CUE.u3open)} volume={0.6} />
      <Audio name="Stamp: protected" src={sfx("chime")} from={f(CUE.protected)} volume={0.18} />
      <Audio name="Hero: hm (shoelace)" src={sfx("hero-blip")} from={f(CUE.lace)} volume={0.2} playbackRate={0.85} />
      {[0, 1, 2].map((i) => (
        <Audio key={`wb${i}`} name={`Dash step to the bollard ${i + 1}`} src={sfx(`step-${(i % 4) + 1}`)} from={f(CUE.walk + 0.15 + i * ((CUE.footUp - CUE.walk) / 3))} volume={0.55} />
      ))}
      <Audio name="Foot up on the bollard" src={sfx("step-2")} from={f(CUE.footUp + 0.3)} volume={0.7} playbackRate={0.8} />
      <Audio name="Tying the lace (close-up)" src={sfx("lace-tie")} from={f(CUE.tie1)} durationInFrames={f(CUE.gust - CUE.tie1)} volume={0.75} />
      <Audio name="Stamp: lace protocol" src={sfx("pop")} from={f(TIE1.a + 0.1)} volume={0.12} />

      <Audio name="Kid: chalk (drag)" src={sfx("chalk")} from={f(CUE.look2)} volume={0.25} />
      <Audio name="Kid: chime (F)" src={sfx("chime")} from={f(LOOK2.f)} volume={0.18} />
      <Audio name="Kid: oh" src={sfx("kid-blip")} from={f(CUE.oh)} volume={0.2} playbackRate={0.85} />

      <Audio name="The gust" src={sfx("gust")} from={f(CUE.gust - 0.3)} volume={1.0} />
      <Audio name="Newt skids" src={sfx("parasol-drag")} from={f(CUE.gust + 0.1)} volume={0.5} playbackRate={1.3} />
      <Audio name="Kid: up we go (deadpan)" src={sfx("kid-blip")} from={f(CUE.lift + 0.3)} volume={0.15} playbackRate={0.7} />
      <Audio name="Tying (double knot)" src={sfx("lace-tie")} from={f(CUE.tie2)} durationInFrames={f(CUE.knot - CUE.tie2)} volume={0.75} />
      <Audio name="Knot pulled tight" src={sfx("lace-tug")} from={f(CUE.knot)} volume={0.85} />
      <Audio name="Stamp: secured" src={sfx("chime")} from={f(CUE.knot + 0.05)} volume={0.18} />
      <Audio name="Foot down" src={sfx("step-3")} from={f(CUE.stand + 0.2)} volume={0.6} />
      <Audio name="Hero: huh? (empty spot)" src={sfx("hero-blip")} from={f(CUE.empty + 0.2)} volume={0.2} playbackRate={1.2} />
      <Audio name="Hero: !!! (sees him)" src={sfx("hero-blip")} from={f(CUE.see + 0.05)} volume={0.24} playbackRate={0.75} />
      {[0, 1, 2, 3].map((i) => (
        <Audio key={`rs${i}`} name={`Dash running step ${i + 1}`} src={sfx(`step-${((i + 1) % 4) + 1}`)} from={f(CUE.run + 0.08 + i * ((CUE.jump - CUE.run) / 4))} volume={0.75} playbackRate={1.1} />
      ))}
      <Audio name="The jump" src={sfx("whoosh-small")} from={f(CUE.jump)} volume={0.7} />
      <Audio name="Time slows (near-miss)" src={sfx("slowmo-up")} from={f(CUE.slowA)} durationInFrames={f(CUE.slowB - CUE.slowA + 0.4)} volume={0.85} />
      <Audio name="Lands" src={sfx("knees-down")} from={f(CUE.land)} volume={0.7} />
      <Audio name="Hero: womp" src={sfx("womp")} from={f(CUE.grief)} volume={0.32} />
      <Audio name="Kid: bye (wave)" src={sfx("kid-blip")} from={f(CUE.grief + 1.0)} volume={0.16} playbackRate={1.15} />

      <Audio name="Balloon burner" src={sfx("burner")} from={f(CUE.balloon + 0.2)} volume={0.6} />
      <Audio name="Kid: oh, a balloon" src={sfx("kid-blip")} from={f(CUE.bsee)} volume={0.18} playbackRate={1.2} />
      <Audio name="Newspaper lowered" src={sfx("paper")} from={f(CUE.lower)} volume={0.7} />
      <Audio name="Kid: polite blip" src={sfx("kid-blip")} from={f(CUE.nod)} volume={0.18} playbackRate={1.1} />
      <Audio name="Newspaper raised" src={sfx("paper")} from={f(CUE.raise)} volume={0.7} playbackRate={1.1} />

      <Audio name="Moral 1" src={sfx("chime")} from={f(CUE.end + 0.4)} volume={0.25} />
      <Audio name="Moral 2" src={sfx("chime")} from={f(CUE.end + 1.1)} volume={0.25} playbackRate={1.25} />
    </AbsoluteFill>
  );
};

export { DURATION };
