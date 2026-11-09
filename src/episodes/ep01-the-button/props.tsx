import React from "react";
import { random } from "remotion";
import { num, shake, step } from "../../lib/kf";
import { GROUND, INK } from "../../rig/Stickman";
import { FONT_STACK } from "../../shared/ui";


const PED = { x: 640, w: 170, top: 1120 };
export const BUTTON_TOP = { x: PED.x, y: PED.top - 22 };

export const IMPACTS = [
  [10.88, 22],
  [17.1, 30],
  [20.1, 10],
  [23.42, 22],
  [26.4, 5],
  [36.98, 22],
  [38.3, 34],
] as const;

// ─── Backdrop ─────────────────────────────────────────────────────────────
export const Backdrop: React.FC<{ t: number }> = ({ t }) => (
  <g>
    <rect x={-1200} y={-1200} width={3480} height={GROUND + 1200} fill="#fbf6ec" />
    {[
      [140, 470, 1.0, 9],
      [820, 380, 0.8, 6],
      [520, 260, 0.6, 4],
    ].map(([x, y, s, v], i) => {
      const cx = ((x + t * v + 200) % 1480) - 200;
      return (
        <g key={i} transform={`translate(${cx} ${y}) scale(${s})`} fill="#fff" stroke="#c9c1b2" strokeWidth={6}>
          <path d="M -90 20 Q -100 -20 -55 -22 Q -40 -62 5 -50 Q 40 -75 70 -38 Q 110 -36 100 8 Q 105 30 70 30 L -70 30 Q -100 30 -90 20 Z" />
        </g>
      );
    })}
    <rect x={-1200} y={GROUND} width={3480} height={1600} fill="#efe4cf" />
    {[...Array(14)].map((_, i) => (
      <line key={i} x1={40 + i * 80 + (i % 3) * 13} y1={GROUND + 60 + (i % 4) * 90} x2={70 + i * 80 + (i % 3) * 13} y2={GROUND + 60 + (i % 4) * 90} stroke="#d6c7aa" strokeWidth={6} strokeLinecap="round" />
    ))}
    {[60, 250, 830, 990].map((x) => (
      <path key={x} d={`M ${x - 14} ${GROUND} l 6 -22 l 6 18 l 6 -26 l 6 22 l 6 -16`} fill="none" stroke="#7aa35a" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    ))}
  </g>
);

export const GroundLine: React.FC = () => (
  <line x1={-1200} y1={GROUND} x2={2280} y2={GROUND} stroke={INK} strokeWidth={9} strokeLinecap="round" />
);

// ─── Trapdoor (hole drawn behind the hero, flaps in front) ───────────────
const HOLE = { x1: 385, x2: 555 };
export const holeOpen = (t: number) =>
  num(t, [
    [23.58, 0],
    [23.7, 1, "out"],
    [27.75, 1],
    [27.92, 0, "back"],
  ]);

export const Hole: React.FC<{ t: number }> = ({ t }) => {
  const o = holeOpen(t);
  if (o <= 0) return null;
  return (
    <g>
      <defs>
        <linearGradient id="pit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a332b" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
      </defs>
      <rect x={HOLE.x1} y={GROUND} width={HOLE.x2 - HOLE.x1} height={700} fill="url(#pit)" />
    </g>
  );
};

export const Flaps: React.FC<{ t: number }> = ({ t }) => {
  const o = holeOpen(t);
  const half = (HOLE.x2 - HOLE.x1) / 2;
  const a = o * 82;
  return (
    <g stroke={INK} strokeWidth={9} strokeLinecap="round">
      <line x1={HOLE.x1} y1={GROUND} x2={HOLE.x1 + Math.cos((a * Math.PI) / 180) * half} y2={GROUND + Math.sin((a * Math.PI) / 180) * half} />
      <line x1={HOLE.x2} y1={GROUND} x2={HOLE.x2 - Math.cos((a * Math.PI) / 180) * half} y2={GROUND + Math.sin((a * Math.PI) / 180) * half} />
    </g>
  );
};

// Hero can only be seen above ground, or inside the pit while it's open
export const HeroClip: React.FC = () => (
  <clipPath id="heroClip">
    <rect x={-1200} y={-3000} width={3480} height={3000 + GROUND} />
    <rect x={HOLE.x1 + 4} y={GROUND - 10} width={HOLE.x2 - HOLE.x1 - 8} height={900} />
  </clipPath>
);

// ─── Pedestal + buttons ───────────────────────────────────────────────────
const PRESSES = [10.86, 23.4, 32.0, 36.98];

export const Pedestal: React.FC<{ t: number }> = ({ t }) => {
  const big = num(t, [
    [20.0, 1],
    [20.3, 2.35, "back"],
    [27.95, 2.35],
    [28.25, 1, "back"],
  ]);
  let press = 0;
  for (const p of PRESSES) {
    const d = t - p;
    if (d >= 0 && d < 0.3) press = Math.max(press, 1 - d / 0.3);
  }
  const small = num(t, [
    [15.15, 0],
    [15.32, 1, "back"],
    [19.9, 1],
    [20.1, 0, "in"],
  ]);
  const smallPress = t > 15.62 && t < 15.85 ? 6 : 0;
  const rx = 54 * big;
  const ry = 42 * big * (1 - press * 0.45);
  const baseY = PED.top - 14;
  return (
    <g>
      {/* little "really don't" button pokes out of the side */}
      {small > 0 ? (
        <g transform={`translate(${PED.x - PED.w / 2 - 22 * small + smallPress} 1188)`}>
          <rect x={-2} y={-14} width={26} height={28} rx={6} fill="#e63946" stroke={INK} strokeWidth={5} />
        </g>
      ) : null}
      <rect x={PED.x - PED.w / 2} y={PED.top} width={PED.w} height={GROUND - PED.top} fill="#d8d0bf" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      <line x1={PED.x - PED.w / 2 + 20} y1={PED.top + 70} x2={PED.x + PED.w / 2 - 20} y2={PED.top + 70} stroke="#b5ab97" strokeWidth={5} />
      <rect x={PED.x - PED.w / 2 - 16} y={PED.top - 16} width={PED.w + 32} height={22} rx={6} fill="#c4baa5" stroke={INK} strokeWidth={8} />
      <path
        d={`M ${PED.x - rx} ${baseY} A ${rx} ${ry} 0 0 1 ${PED.x + rx} ${baseY} Z`}
        fill="#e63946"
        stroke={INK}
        strokeWidth={8}
        strokeLinejoin="round"
      />
      <path d={`M ${PED.x - rx * 0.55} ${baseY - ry * 0.55} Q ${PED.x - rx * 0.2} ${baseY - ry * 0.85} ${PED.x + rx * 0.05} ${baseY - ry * 0.85}`} fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round" opacity={0.75} />
    </g>
  );
};

// ─── Hanging sign that flips to a new message ─────────────────────────────
type SignText = { l1: string; l2: string; size: number; c1: string };
const SIGNS: readonly (readonly [number, SignText])[] = [
  [0, { l1: "DO NOT", l2: "PRESS", size: 116, c1: "#e63946" }],
  [13.0, { l1: "THANK", l2: "YOU :)", size: 116, c1: INK }],
  [15.0, { l1: "ALSO DON'T PRESS", l2: "THE SMALL ONE", size: 62, c1: "#e63946" }],
  [20.0, { l1: "LAST.", l2: "WARNING.", size: 112, c1: "#e63946" }],
  [28.2, { l1: "FREE CAKE!", l2: "JUST PRESS", size: 90, c1: "#2a9d55" }],
  [34.8, { l1: "SOLD OUT!", l2: "BACK TOMORROW", size: 62, c1: "#e63946" }],
];
const FLIP = 0.14;

// ─── The machine: a crane over the stage, wired to the pedestal ───────────
// Every press sends a spark up the cable, so each consequence is visibly
// caused by the button: the anvil hangs on the hook from the very first frame.
export const ARM_Y = 450;
const POLE_X = 925;
export const HOOK_X = 470;
export const CAKE_ROPE_X = 860;
const HANG_Y = 592; // anvil base while hanging on the hook

type Pt = readonly [number, number];
const CABLE: readonly Pt[] = [
  [726, 1366],
  [POLE_X - 12, 1366],
  [POLE_X - 12, ARM_Y + 18],
  [HOOK_X, ARM_Y + 18],
];
const TO_CAKE: readonly Pt[] = [...CABLE.slice(0, 3), [CAKE_ROPE_X, ARM_Y + 18]];
const TO_TRAPDOOR: readonly Pt[] = [
  [555, 1366],
  [400, 1366],
];

const SPARKS: readonly { at: number; dur: number; path: readonly Pt[] }[] = [
  { at: 10.95, dur: 0.6, path: CABLE },
  { at: 15.7, dur: 0.55, path: CABLE },
  { at: 23.44, dur: 0.14, path: TO_TRAPDOOR },
  { at: 32.05, dur: 0.4, path: TO_CAKE },
  { at: 37.05, dur: 0.5, path: CABLE },
];

const pointAlong = (path: readonly Pt[], u: number): Pt => {
  const segs = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  let d = u * segs.reduce((a, b) => a + b, 0);
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i]) {
      const k = d / segs[i];
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * k, path[i][1] + (path[i + 1][1] - path[i][1]) * k];
    }
    d -= segs[i];
  }
  return path[path.length - 1];
};

export const Crane: React.FC = () => (
  <g>
    <rect x={POLE_X - 6} y={ARM_Y - 20} width={26} height={GROUND - ARM_Y + 20} fill="#a7b0ba" stroke={INK} strokeWidth={7} />
    <rect x={POLE_X - 24} y={GROUND - 22} width={62} height={22} rx={4} fill="#8c96a1" stroke={INK} strokeWidth={7} />
    <rect x={300} y={ARM_Y - 20} width={POLE_X - 280} height={30} fill="#a7b0ba" stroke={INK} strokeWidth={7} />
    <path
      d={[...Array(16)].map((_, i) => `M ${310 + i * 40} ${ARM_Y + 8} L ${330 + i * 40} ${ARM_Y - 18}`).join(" ")}
      stroke="#6f7b87"
      strokeWidth={4}
    />
    <polyline points={CABLE.map((p) => p.join(",")).join(" ")} fill="none" stroke="#3d4650" strokeWidth={5} strokeLinejoin="round" />
    <polyline points={TO_TRAPDOOR.map((p) => p.join(",")).join(" ")} fill="none" stroke="#3d4650" strokeWidth={5} />
  </g>
);

export const Sparks: React.FC<{ t: number }> = ({ t }) => (
  <g>
    {SPARKS.map((s, i) => {
      const u = (t - s.at) / s.dur;
      if (u < 0 || u > 1.25) return null;
      if (u > 1) {
        // arrival flash
        const [fx, fy] = s.path[s.path.length - 1];
        const k = (u - 1) / 0.25;
        return <circle key={i} cx={fx} cy={fy} r={20 + k * 40} fill="#ffe066" opacity={0.8 * (1 - k)} />;
      }
      const trail = [0.09, 0.06, 0.03, 0].map((b) => pointAlong(s.path, Math.max(0, u - b)));
      return (
        <g key={i}>
          {trail.map(([x, y], j) => (
            <circle key={j} cx={x} cy={y} r={9 + j * 5} fill={j === 3 ? "#fffbe6" : "#ffd23f"} opacity={0.35 + j * 0.2} />
          ))}
          <circle cx={trail[3][0]} cy={trail[3][1]} r={34} fill="#ffe066" opacity={0.4} />
        </g>
      );
    })}
  </g>
);

// ─── Sign (hangs from the crane arm) ─────────────────────────────────────
export const Sign: React.FC<{ t: number }> = ({ t }) => {
  let flip = 1;
  for (const [at] of SIGNS) {
    const d = Math.abs(t - at);
    if (at > 0 && d < FLIP) flip = Math.min(flip, d / FLIP);
  }
  const s = step(t, SIGNS);
  const sh = shake(t, IMPACTS);
  const swing = sh.x * 0.12 + Math.sin(t * 1.6) * 0.6;
  const cx = 610;
  const cy = 740;
  return (
    <g transform={`rotate(${swing} ${cx} ${ARM_Y})`}>
      <line x1={cx - 210} y1={ARM_Y + 10} x2={cx - 210} y2={cy - 125} stroke={INK} strokeWidth={6} />
      <line x1={cx + 210} y1={ARM_Y + 10} x2={cx + 210} y2={cy - 125} stroke={INK} strokeWidth={6} />
      <g transform={`translate(${cx} ${cy}) scale(1 ${Math.max(0.02, flip)})`}>
        <rect x={-290} y={-130} width={580} height={260} rx={22} fill="#f3d39a" stroke={INK} strokeWidth={9} />
        <path d="M -260 -70 L 250 -76 M -250 60 L 255 66" stroke="#dcb676" strokeWidth={5} />
        <text x={0} y={-12} textAnchor="middle" fontFamily={FONT_STACK} fontSize={s.size} fill={s.c1}>
          {s.l1}
        </text>
        <text x={0} y={s.size * 0.95 - 4} textAnchor="middle" fontFamily={FONT_STACK} fontSize={s.size} fill={INK}>
          {s.l2}
        </text>
      </g>
    </g>
  );
};

// ─── The anvil: one object, hanging → dropped → bounced back → dropped ────
const AnvilShape: React.FC = () => (
  <g stroke={INK} strokeWidth={8} strokeLinejoin="round">
    <circle cx={0} cy={-122} r={11} fill="none" strokeWidth={6} />
    <path d="M -70 0 L 70 0 L 52 -26 L 30 -30 L 30 -62 L 80 -78 L 110 -78 L 110 -112 L -80 -112 Q -130 -112 -150 -88 Q -110 -84 -40 -70 L -30 -62 L -30 -30 L -52 -26 Z" fill="#4b5059" />
    <text x={0} y={-82} textAnchor="middle" fontFamily={FONT_STACK} fontSize={26} fill="#fff" stroke="none">
      100 KG
    </text>
  </g>
);

const ANVIL_REST = GROUND - 72;

const anvilY = (t: number) =>
  num(t, [
    [0, HANG_Y],
    [16.35, HANG_Y],
    [17.1, ANVIL_REST, "in"],
    [18.4, ANVIL_REST],
    [18.85, HANG_Y, "out"],
    [37.6, HANG_Y],
    [38.3, ANVIL_REST, "in"],
  ]);

const hookOpen = (t: number) =>
  Math.max(
    num(t, [
      [16.28, 0],
      [16.35, 1, "out"],
      [18.78, 1],
      [18.86, 0, "back"],
    ]),
    num(t, [
      [37.53, 0],
      [37.6, 1, "out"],
    ]),
  );

export const Hook: React.FC<{ t: number }> = ({ t }) => {
  const o = hookOpen(t);
  const y = ARM_Y + 30;
  return (
    <g stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round">
      <line x1={HOOK_X} y1={ARM_Y + 10} x2={HOOK_X} y2={y} />
      <path d={`M ${HOOK_X} ${y} q ${-16 - o * 10} ${10 - o * 6} ${-6 - o * 18} ${22 - o * 10}`} />
      <path d={`M ${HOOK_X} ${y} q ${16 + o * 10} ${10 - o * 6} ${6 + o * 18} ${22 - o * 10}`} />
    </g>
  );
};

export const Anvil: React.FC<{ t: number }> = ({ t }) => {
  const y = anvilY(t);
  const hanging = y <= HANG_Y + 0.5;
  // ominous wobble when the first spark arrives and nothing happens
  const jiggle = t > 11.55 && t < 12.6 ? Math.sin((t - 11.55) * 28) * 7 * Math.exp(-(t - 11.55) * 3) : 0;
  const sway = hanging ? Math.sin(t * 1.3) * 1.5 + jiggle : 0;
  const spin = num(t, [
    [18.4, 0],
    [18.85, 360, "out"],
  ]);
  const fall = Math.max(0, Math.min(1, (y - HANG_Y) / (ANVIL_REST - HANG_Y)));
  const falling = !hanging && y < ANVIL_REST - 0.5 && !(t > 18.4 && t < 18.86);
  return (
    <g>
      {falling ? (
        <ellipse cx={HOOK_X} cy={GROUND + 4} rx={30 + fall * 90} ry={6 + fall * 10} fill="#000" opacity={0.15 + fall * 0.25} />
      ) : null}
      <g transform={`rotate(${sway} ${HOOK_X} ${ARM_Y + 30})`}>
        <g transform={`translate(${HOOK_X} ${y}) rotate(${spin} 0 -60)`}>
          <AnvilShape />
        </g>
      </g>
    </g>
  );
};

// Cake comes down gently on its own rope: the machine is kind to the kid
export const cakeLowerY = (t: number) =>
  num(t, [
    [32.45, ARM_Y + 200],
    [32.85, GROUND, "io"],
  ]);

export const CakeRope: React.FC<{ t: number }> = ({ t }) => {
  if (t < 32.45 || t > 33.15) return null;
  const bottom =
    t < 32.85
      ? cakeLowerY(t) - 165
      : num(t, [
          [32.85, GROUND - 165],
          [33.15, ARM_Y + 20, "in"],
        ]);
  return <line x1={CAKE_ROPE_X} y1={ARM_Y + 10} x2={CAKE_ROPE_X} y2={bottom} stroke={INK} strokeWidth={5} />;
};

// ─── Cake, slice, confetti ────────────────────────────────────────────────
export const CakeShape: React.FC<{ s?: number }> = ({ s = 1 }) => (
  <g transform={`scale(${s})`} stroke={INK} strokeWidth={6} strokeLinejoin="round">
    <rect x={-80} y={-60} width={160} height={60} rx={10} fill="#ffb3c6" />
    <rect x={-58} y={-108} width={116} height={50} rx={10} fill="#fff1f5" />
    <path d="M -80 -44 q 13 14 26 0 q 13 14 26 0 q 13 14 26 0 q 13 14 26 0 q 13 14 26 0 q 13 14 28 0" fill="none" stroke="#e05780" strokeWidth={6} />
    <line x1={0} y1={-108} x2={0} y2={-140} strokeWidth={8} stroke="#5aa9e6" />
    <path d="M 0 -160 Q 9 -148 0 -142 Q -9 -148 0 -160 Z" fill="#ffb703" />
    <circle cx={-30} cy={-84} r={6} fill="#e63946" />
    <circle cx={26} cy={-88} r={6} fill="#e63946" />
  </g>
);

export const SliceShape: React.FC = () => (
  <g stroke={INK} strokeWidth={5} strokeLinejoin="round">
    <ellipse cx={0} cy={0} rx={46} ry={10} fill="#fff" />
    <path d="M -30 -4 L 30 -4 L 30 -40 L -30 -26 Z" fill="#ffb3c6" />
    <path d="M -30 -26 L 30 -40" stroke="#e05780" strokeWidth={6} />
    <circle cx={12} cy={-44} r={6} fill="#e63946" />
  </g>
);

export const Confetti: React.FC<{ t: number; at: number; x: number; y: number }> = ({ t, at, x, y }) => {
  const d = t - at;
  if (d < 0 || d > 2.4) return null;
  const colors = ["#e63946", "#ffb703", "#2a9d55", "#5aa9e6", "#ff8a1f", "#b56cf0"];
  return (
    <g>
      {[...Array(70)].map((_, i) => {
        const a = -Math.PI / 2 + (random(`a${i}`) - 0.5) * 2.4;
        const v = 700 + random(`v${i}`) * 900;
        const px = x + Math.cos(a) * v * d * 0.8;
        const py = y + Math.sin(a) * v * d + 900 * d * d;
        const r = d * 600 * (random(`r${i}`) - 0.5);
        return (
          <rect key={i} x={px - 7} y={py - 4} width={14} height={8} rx={2} fill={colors[i % colors.length]} transform={`rotate(${r} ${px} ${py})`} opacity={d > 1.8 ? (2.4 - d) / 0.6 : 1} />
        );
      })}
    </g>
  );
};
