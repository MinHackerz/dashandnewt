import React from "react";
import { GROUND } from "../../rig/Stickman";
import { gY, Lane, Layer, laneS, DPX } from "../../rig2d/depth";
import { TOON_INK } from "../../rig2d/Toon";
import { FONT_STACK } from "../../shared/ui";
import { BAG_X, BENCH_X, BRANCH, D, GRAVE_D, GRAVE_W, GRAVE_X, L, PIV_X, PH, plankPoint, px, RH, RS, toPx, TRUNK_X, WALL_H, WALL_X, yOf } from "./timeline";
import { DIG_X, PILE_X } from "./cast";

// Painted 2D park on a sunny afternoon, seen from the side: the playground (seesaw, an old oak, a bench)
// on the left; a low stone wall; the cemetery next door on the right (headstones, an open grave).

const INK = TOON_INK;

export const Sky: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <g>
    <defs>
      <linearGradient id="sky9" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4aa3ef" />
        <stop offset="1" stopColor="#c9efff" />
      </linearGradient>
    </defs>
    <rect width={w} height={h} fill="url(#sky9)" />
  </g>
);

/** far layers: hills, a church spire behind the cemetery, clouds (parallax via lanes) */
export const Far: React.FC<{ camX: number; t: number }> = ({ camX, t }) => {
  const top = gY(D.far);
  return (
    <g>
      <Layer s={laneS(D.far)} ground={top} ax={camX}>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i} fill="#ffffff" stroke={INK} strokeWidth={8} opacity={0.95}>
            <ellipse cx={-600 + i * 900 + ((t * 12) % 900)} cy={GROUND - 2300 - (i % 2) * 260} rx={260} ry={80} />
            <ellipse cx={-700 + i * 900 + ((t * 12) % 900)} cy={GROUND - 2270 - (i % 2) * 260} rx={160} ry={60} />
          </g>
        ))}
        <path d={`M -4000 ${GROUND} Q -2500 ${GROUND - 520} -1000 ${GROUND - 160} Q 600 ${GROUND - 620} 2200 ${GROUND - 200} Q 3600 ${GROUND - 560} 6000 ${GROUND - 120} L 6000 ${GROUND + 400} L -4000 ${GROUND + 400} Z`} fill="#9fd08a" stroke={INK} strokeWidth={10} />
        {/* the church behind the cemetery */}
        <g transform={`translate(${2900} 0)`} stroke={INK} strokeWidth={12} strokeLinejoin="round">
          <rect x={-260} y={GROUND - 520} width={520} height={520} fill="#d9cbb3" />
          <path d={`M -300 ${GROUND - 520} L 0 ${GROUND - 780} L 300 ${GROUND - 520} Z`} fill="#8a5a44" />
          <rect x={200} y={GROUND - 1150} width={190} height={1150} fill="#d9cbb3" />
          <path d={`M 180 ${GROUND - 1150} L 295 ${GROUND - 1560} L 410 ${GROUND - 1150} Z`} fill="#8a5a44" />
          <path d={`M 295 ${GROUND - 1640} l 0 -120 M 255 ${GROUND - 1720} l 80 0`} fill="none" strokeWidth={14} />
          <path d={`M -60 ${GROUND} l 0 -160 q 60 -80 120 0 l 0 160 Z`} fill="#5b3a2a" />
        </g>
      </Layer>
      {/* tree line */}
      <Layer s={laneS(-3.6)} ground={gY(-3.6)} ax={camX}>
        {[...Array(26)].map((_, i) => {
          const x = -1400 + i * 260 + (i % 3) * 40;
          if (x > 1750 && x < 3300) return null; // the cemetery gets cypresses instead
          return (
            <g key={i} stroke={INK} strokeWidth={8}>
              <rect x={x - 14} y={GROUND - 200} width={28} height={200} fill="#7a5236" />
              <circle cx={x} cy={GROUND - 300 - (i % 2) * 40} r={150 + (i % 3) * 20} fill={i % 2 ? "#5aa25a" : "#4c944f"} />
            </g>
          );
        })}
        {[1900, 2250, 2700, 3150].map((x, i) => (
          <path key={x} d={`M ${x} ${GROUND} q -90 -260 0 ${-520 - (i % 2) * 120} q 90 ${260 + (i % 2) * 60} 0 ${520 + (i % 2) * 120}`} fill="#2f6b45" stroke={INK} strokeWidth={8} />
        ))}
      </Layer>
    </g>
  );
};

export const Grass: React.FC<{ camX: number }> = ({ camX }) => {
  const top = gY(-3.6);
  return (
    <g>
      <rect x={camX - 6000} y={top} width={12000} height={4000} fill="#7cc66b" />
      {[-3, -2, -1, 0.6, 1.6, 2.8, 4.2].map((d, i) => (
        <rect key={d} x={camX - 6000} y={gY(d)} width={12000} height={(laneS(d) * DPX) / 2} fill={i % 2 ? "#74bd63" : "#86cf74"} opacity={0.7} />
      ))}
      {/* the cemetery's grass is a little darker beyond the wall */}
      <rect x={WALL_X} y={top} width={6000} height={4000} fill="#6aae5c" opacity={0.6} />
    </g>
  );
};

// ─── Playground decor ────────────────────────────────────────────────────────
export const Slide: React.FC<{ x: number }> = ({ x }) => (
  <g stroke={INK} strokeWidth={9} strokeLinejoin="round">
    <rect x={x - 10} y={GROUND - 520} width={20} height={520} fill="#e63946" />
    <rect x={x + 120} y={GROUND - 520} width={20} height={520} fill="#e63946" />
    {[0, 1, 2, 3, 4].map((k) => (
      <rect key={k} x={x - 10} y={GROUND - 100 - k * 95} width={150} height={14} fill="#ffd23f" />
    ))}
    <rect x={x - 20} y={GROUND - 540} width={180} height={30} fill="#3a86c8" />
    <path d={`M ${x + 160} ${GROUND - 525} Q ${x + 420} ${GROUND - 480} ${x + 560} ${GROUND - 40} L ${x + 620} ${GROUND - 40} Q ${x + 470} ${GROUND - 540} ${x + 160} ${GROUND - 555} Z`} fill="#ffd23f" />
  </g>
);

export const Swings: React.FC<{ x: number; t: number }> = ({ x, t }) => (
  <g stroke={INK} strokeWidth={9} strokeLinejoin="round" fill="none">
    <path d={`M ${x - 260} ${GROUND} L ${x - 180} ${GROUND - 560} L ${x + 180} ${GROUND - 560} L ${x + 260} ${GROUND}`} stroke="#3a86c8" strokeWidth={22} />
    {[-80, 80].map((o, i) => {
      const a = Math.sin(t * 1.6 + i) * (i ? 4 : 2);
      return (
        <g key={o} transform={`rotate(${a} ${x + o} ${GROUND - 560})`}>
          <path d={`M ${x + o - 40} ${GROUND - 560} L ${x + o - 40} ${GROUND - 160} M ${x + o + 40} ${GROUND - 560} L ${x + o + 40} ${GROUND - 160}`} strokeWidth={6} />
          <rect x={x + o - 50} y={GROUND - 170} width={100} height={20} fill="#e63946" />
        </g>
      );
    })}
  </g>
);

export const Bench: React.FC = () => {
  const x = BENCH_X;
  return (
    <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
      <rect x={x - 180} y={GROUND - 220} width={360} height={24} rx={6} fill="#c98a52" />
      <rect x={x - 180} y={GROUND - px(0.45)} width={360} height={28} rx={6} fill="#c98a52" />
      {[-150, 150].map((o) => (
        <rect key={o} x={x + o - 10} y={GROUND - px(0.45)} width={20} height={px(0.45)} fill="#4f5a66" />
      ))}
    </g>
  );
};

/** Newt's paper bag of apples (he brought snacks; he will use them for science) */
export const AppleBag: React.FC<{ left: number }> = ({ left }) => (
  <g stroke={INK} strokeWidth={6} strokeLinejoin="round">
    <path d={`M ${BAG_X - 55} ${GROUND} L ${BAG_X - 48} ${GROUND - 120} L ${BAG_X + 48} ${GROUND - 120} L ${BAG_X + 55} ${GROUND} Z`} fill="#d7b07a" />
    {[...Array(Math.max(0, left))].map((_, i) => (
      <Apple key={i} x={BAG_X - 22 + i * 26} y={GROUND - 128 - (i % 2) * 8} s={0.85} />
    ))}
    <path d={`M ${BAG_X - 48} ${GROUND - 120} l 10 18 l 12 -14 l 12 16 l 12 -16 l 12 16 l 12 -14 l 12 18 l 10 -16`} fill="none" strokeWidth={5} />
  </g>
);

export const Apple: React.FC<{ x: number; y: number; s?: number; rot?: number }> = ({ x, y, s = 1, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} stroke={INK} strokeWidth={4.5}>
    <path d="M 0 -12 Q -20 -24 -18 2 Q -14 18 0 16 Q 14 18 18 2 Q 20 -24 0 -12 Z" fill="#e63946" />
    <path d="M 0 -12 q 2 -9 7 -11" fill="none" strokeWidth={4} />
    <ellipse cx={9} cy={-20} rx={6} ry={3.5} fill="#3f8f3f" strokeWidth={3} />
    <ellipse cx={-7} cy={-3} rx={3} ry={5} fill="#ff8a8a" stroke="none" />
  </g>
);

/** The bike helmet while it is carried / lying on the bench */
export const Helmet: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s * 0.72 * 1.2})`} stroke={INK} strokeWidth={5.5} strokeLinejoin="round">
    <path d="M -54 2 Q -60 -62 0 -66 Q 60 -62 54 2 Q 30 -10 0 -10 Q -30 -10 -54 2 Z" fill="#2a9d8f" />
    <path d="M -30 -44 L -18 -14 M 0 -56 L 0 -14 M 30 -44 L 18 -14" stroke="#1d6f66" strokeWidth={6} strokeLinecap="round" fill="none" />
  </g>
);

// ─── The seesaw: an A-frame with the pivot, the plank (φ: Dash's end up = +), seats and handles ──
export const Seesaw: React.FC<{ phi: number }> = ({ phi }) => {
  const piv = toPx({ x: 0, y: PH });
  const end = (r: number) => toPx(plankPoint(phi, r, 0));
  const a = end(-L);
  const b = end(L);
  const deg = (-phi * 180) / Math.PI;
  const handle = (side: -1 | 1) => {
    const base = toPx(plankPoint(phi, side * RH, 0.05));
    const top = toPx(plankPoint(phi, side * RH, 0.4));
    return (
      <g>
        <path d={`M ${base.x} ${base.y} L ${top.x} ${top.y}`} stroke={INK} strokeWidth={22} strokeLinecap="round" />
        <path d={`M ${base.x} ${base.y} L ${top.x} ${top.y}`} stroke="#ffd23f" strokeWidth={10} strokeLinecap="round" />
        <path d={`M ${top.x - 26} ${top.y} L ${top.x + 26} ${top.y}`} transform={`rotate(${deg} ${top.x} ${top.y})`} stroke={INK} strokeWidth={22} strokeLinecap="round" />
        <path d={`M ${top.x - 26} ${top.y} L ${top.x + 26} ${top.y}`} transform={`rotate(${deg} ${top.x} ${top.y})`} stroke="#3a86c8" strokeWidth={10} strokeLinecap="round" />
      </g>
    );
  };
  const seat = (side: -1 | 1) => {
    const c = toPx(plankPoint(phi, side * RS, 0.05));
    return <rect x={c.x - 50} y={c.y - 14} width={100} height={22} rx={10} fill="#e63946" stroke={INK} strokeWidth={6} transform={`rotate(${deg} ${c.x} ${c.y})`} />;
  };
  return (
    <g strokeLinejoin="round">
      {/* far leg of the A-frame */}
      <path d={`M ${piv.x - 90} ${GROUND} L ${piv.x} ${piv.y} L ${piv.x + 90} ${GROUND}`} fill="none" stroke="#2c5f86" strokeWidth={26} />
      <path d={`M ${piv.x - 90} ${GROUND} L ${piv.x} ${piv.y} L ${piv.x + 90} ${GROUND}`} fill="none" stroke={INK} strokeWidth={6} opacity={0.5} />
      {/* the plank */}
      <path d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`} stroke={INK} strokeWidth={40} strokeLinecap="round" />
      <path d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`} stroke="#3fae6a" strokeWidth={26} strokeLinecap="round" />
      <path d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`} stroke="#5cc884" strokeWidth={8} strokeLinecap="round" transform="translate(0 -6)" />
      {seat(-1)}
      {seat(1)}
      {handle(-1)}
      {handle(1)}
      {/* near leg + pivot bolt */}
      <path d={`M ${piv.x - 110} ${GROUND + 6} L ${piv.x} ${piv.y + 6} L ${piv.x + 110} ${GROUND + 6}`} fill="none" stroke={INK} strokeWidth={30} />
      <path d={`M ${piv.x - 110} ${GROUND + 6} L ${piv.x} ${piv.y + 6} L ${piv.x + 110} ${GROUND + 6}`} fill="none" stroke="#3a86c8" strokeWidth={18} />
      <circle cx={piv.x} cy={piv.y} r={16} fill="#ffd23f" stroke={INK} strokeWidth={6} />
    </g>
  );
};

// ─── The old oak (its three long branches reach out over Dash's end) ─────────
export const OakBack: React.FC<{ t: number }> = ({ t }) => {
  const x = TRUNK_X;
  const top = yOf(10.5);
  return (
    <g stroke={INK} strokeWidth={10} strokeLinejoin="round">
      {/* canopy behind the trunk */}
      {[
        [x - 300, yOf(9.6), 380],
        [x + 200, yOf(9.9), 420],
        [x - 650, yOf(8.9), 300],
        [x + 520, yOf(8.6), 300],
        [x - 40, yOf(11.2), 360],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx + Math.sin(t * 0.8 + i) * 4} cy={cy} r={r} fill={i % 2 ? "#4f9a4c" : "#5aa856"} />
      ))}
      <path d={`M ${x - 70} ${GROUND} Q ${x - 50} ${yOf(4)} ${x - 46} ${top} L ${x + 46} ${top} Q ${x + 50} ${yOf(4)} ${x + 90} ${GROUND} Z`} fill="#8a5a3c" />
      <path d={`M ${x - 20} ${yOf(1)} q 10 -80 -4 -160 M ${x + 26} ${yOf(3)} q -8 -90 6 -170 M ${x - 10} ${yOf(6.2)} q 12 -90 -2 -180`} fill="none" stroke="#6b432c" strokeWidth={8} />
    </g>
  );
};
/** the branches (drawn after the trunk); each top is exactly BRANCH[k] m up, Dash walks on it */
export const OakBranches: React.FC = () => {
  const x = TRUNK_X;
  return (
    <g stroke={INK} strokeWidth={10} strokeLinejoin="round">
      {BRANCH.map((h, k) => {
        const y = yOf(h);
        const tip = 1180 - k * 40;
        const th = 46 - k * 6;
        return (
          <g key={k}>
            <path d={`M ${x + 10} ${y + th + 30} Q ${(x + tip) / 2} ${y + th + 8} ${tip} ${y + th * 0.6} L ${tip - 20} ${y + 4} Q ${(x + tip) / 2} ${y - 4} ${x + 10} ${y - 30} Z`} fill="#8a5a3c" />
            {/* leaf tufts at the tip */}
            <circle cx={tip - 30} cy={y - 40} r={60} fill="#5aa856" />
            <circle cx={tip + 30} cy={y - 10} r={46} fill="#4f9a4c" />
          </g>
        );
      })}
    </g>
  );
};

// ─── The cemetery wall: a low stone wall running away from the camera between the two plots ──
const WALL_D0 = 1.6;
const WALL_D1 = -4.5;
export const WALL_SPLIT = 0.3;
export const Wall: React.FC<{ part: "back" | "front" }> = ({ part }) => {
  // drawn as lane slices from far to near; each slice: a stone block of height WALL_H
  const slices: React.ReactNode[] = [];
  const n = 24;
  for (let i = 0; i < n; i++) {
    const d0 = WALL_D1 + ((WALL_D0 - WALL_D1) * i) / n;
    const d1 = WALL_D1 + ((WALL_D0 - WALL_D1) * (i + 1)) / n;
    if ((part === "back") !== d0 < WALL_SPLIT) continue;
    const sk = (d: number) => d * 26; // a little skew so you see the wall's left face
    const P = (d: number, h: number, dx: number) => ({ x: WALL_X + dx * laneS(d) + sk(d), y: gY(d) - px(h) * laneS(d) });
    const w = 46;
    const a = P(d0, WALL_H, -w);
    const b = P(d1, WALL_H, -w);
    const c = P(d1, 0, -w);
    const e = P(d0, 0, -w);
    const a2 = P(d0, WALL_H, w);
    const b2 = P(d1, WALL_H, w);
    slices.push(
      <g key={i} stroke={INK} strokeWidth={5} strokeLinejoin="round">
        <path d={`M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y} L ${e.x} ${e.y} Z`} fill={i % 2 ? "#a7a49b" : "#b4b1a7"} />
        <path d={`M ${a.x} ${a.y} L ${b.x} ${b.y} L ${b2.x} ${b2.y} L ${a2.x} ${a2.y} Z`} fill="#cfccc2" />
      </g>,
    );
  }
  if (part === "front") {
    // the end of the wall nearest the camera, with a plaque
    const d = WALL_D0;
    const s = laneS(d);
    const x0 = WALL_X - 46 * s + d * 26;
    const x1 = WALL_X + 46 * s + d * 26;
    const top = gY(d) - px(WALL_H) * s;
    slices.push(
      <g key="end" stroke={INK} strokeWidth={6} strokeLinejoin="round">
        <rect x={x0} y={top} width={x1 - x0} height={gY(d) - top} fill="#bdbab0" />
      </g>,
    );
  }
  return <g>{slices}</g>;
};
/** the sign on the cemetery side (readable in the opening shot) */
export const Sign: React.FC = () => {
  const x = GRAVE_X + 620;
  return (
    <Lane d={0.9} ax={x}>
      <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
        <rect x={x - 10} y={GROUND - 330} width={20} height={330} fill="#6b4a33" />
        <rect x={x - 190} y={GROUND - 440} width={380} height={170} rx={14} fill="#f6efe0" />
        <text x={x} y={GROUND - 380} textAnchor="middle" fontFamily={FONT_STACK} fontSize={52} fill="#22181c" stroke="none">
          CEMETERY
        </text>
        <text x={x} y={GROUND - 318} textAnchor="middle" fontFamily={FONT_STACK} fontSize={34} fill="#8a5a44" stroke="none">
          please play quietly
        </text>
      </g>
    </Lane>
  );
};

export const Headstones: React.FC = () => (
  <g>
    {[
      [WALL_X + 420, -2.6, 0],
      [WALL_X + 820, -2.9, 1],
      [WALL_X + 1250, -2.4, 2],
      [WALL_X + 300, -1.6, 1],
      [DIG_X + 120, D.stone, 0],
      [WALL_X + 1100, -1.5, 2],
    ].map(([x, d, k], i) => (
      <Lane key={i} d={d} ax={x}>
        <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
          {k === 0 ? <path d={`M ${x - 60} ${GROUND} L ${x - 60} ${GROUND - 200} Q ${x} ${GROUND - 270} ${x + 60} ${GROUND - 200} L ${x + 60} ${GROUND} Z`} fill="#b9b6ad" /> : null}
          {k === 1 ? <path d={`M ${x - 14} ${GROUND} L ${x - 14} ${GROUND - 170} L ${x - 60} ${GROUND - 170} L ${x - 60} ${GROUND - 200} L ${x - 14} ${GROUND - 200} L ${x - 14} ${GROUND - 250} L ${x + 14} ${GROUND - 250} L ${x + 14} ${GROUND - 200} L ${x + 60} ${GROUND - 200} L ${x + 60} ${GROUND - 170} L ${x + 14} ${GROUND - 170} L ${x + 14} ${GROUND} Z`} fill="#a9a69d" /> : null}
          {k === 2 ? <rect x={x - 70} y={GROUND - 150} width={140} height={150} rx={10} fill="#c3c0b6" /> : null}
          <path d={`M ${x - 30} ${GROUND - (k === 2 ? 110 : 150)} l 60 0 M ${x - 22} ${GROUND - (k === 2 ? 80 : 120)} l 44 0`} fill="none" stroke="#7f7c74" strokeWidth={6} />
        </g>
      </Lane>
    ))}
  </g>
);
/** the wreath with lilies on the headstone behind the gravedigger */
export const Wreath: React.FC<{ lilies: number }> = ({ lilies }) => {
  const x = DIG_X + 120;
  return (
    <Lane d={D.stone} ax={x}>
      <g stroke={INK} strokeWidth={5}>
        <circle cx={x} cy={GROUND - 150} r={46} fill="none" stroke="#2f6b45" strokeWidth={22} />
        <circle cx={x} cy={GROUND - 150} r={46} fill="none" stroke={INK} strokeWidth={4} />
        {[...Array(lilies)].map((_, i) => (
          <Lily key={i} x={x - 30 + i * 30} y={GROUND - 190 + (i % 2) * 10} rot={-20 + i * 20} />
        ))}
      </g>
    </Lane>
  );
};
export const Lily: React.FC<{ x: number; y: number; rot?: number; s?: number }> = ({ x, y, rot = 0, s = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} stroke={INK} strokeWidth={4} strokeLinejoin="round">
    <path d="M 0 0 L 0 60" stroke="#3f8f3f" strokeWidth={6} />
    <path d="M 0 0 L -16 -26 L -4 -10 L 0 -32 L 4 -10 L 16 -26 Z" fill="#ffffff" />
    <circle cx={0} cy={-6} r={4} fill="#ffd23f" />
  </g>
);

/** A funeral bouquet: three big white lilies, leaves, a purple ribbon (stems point down at rot 0) */
export const Bouquet: React.FC<{ x: number; y: number; rot?: number; s?: number }> = ({ x, y, rot = 0, s = 1 }) => {
  const bloom = (bx: number, by: number, a: number) => (
    <g transform={`translate(${bx} ${by}) rotate(${a})`}>
      {[0, 60, 120, 180, 240, 300].map((k) => (
        <path key={k} transform={`rotate(${k})`} d="M 0 0 Q -11 -16 0 -34 Q 11 -16 0 0 Z" fill="#ffffff" stroke={INK} strokeWidth={3.5} />
      ))}
      <circle r={7} fill="#ffd9e3" stroke={INK} strokeWidth={3} />
      {[0, 120, 240].map((k) => (
        <path key={k} transform={`rotate(${k + 30})`} d="M 0 0 L 0 -16" stroke="#e8891f" strokeWidth={3} strokeLinecap="round" />
      ))}
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} strokeLinejoin="round">
      <path d="M -6 -10 L -14 70 M 0 -14 L 0 72 M 6 -10 L 14 70" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <path d="M -6 -10 L -14 70 M 0 -14 L 0 72 M 6 -10 L 14 70" stroke="#3f8f3f" strokeWidth={4.5} strokeLinecap="round" />
      <path d="M 0 20 Q -40 0 -44 -24 Q -18 -4 0 6 Z M 0 20 Q 40 0 44 -24 Q 18 -4 0 6 Z" fill="#4c944f" stroke={INK} strokeWidth={3.5} />
      {bloom(-28, -30, -25)}
      {bloom(28, -30, 25)}
      {bloom(0, -52, 0)}
      <path d="M -16 34 L 16 34 L 12 46 L -12 46 Z" fill="#8e5bd1" stroke={INK} strokeWidth={3.5} />
      <path d="M 0 46 L -14 70 M 0 46 L 14 70" stroke="#8e5bd1" strokeWidth={7} strokeLinecap="round" />
    </g>
  );
};

/** The open grave, in cutaway so we can see in: back wall, floor, the cut earth in front */
export const GraveBack: React.FC = () => {
  const x0 = GRAVE_X - px(GRAVE_W / 2);
  const x1 = GRAVE_X + px(GRAVE_W / 2);
  const floor = GROUND + px(GRAVE_D);
  return (
    <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
      {/* the cut earth (cross-section) around the pit */}
      <rect x={x0 - 140} y={GROUND - 4} width={x1 - x0 + 280} height={floor - GROUND + 120} fill="#8a5a3c" />
      {[0.25, 0.55, 0.85].map((k) => (
        <path key={k} d={`M ${x0 - 140} ${GROUND + (floor - GROUND + 110) * k} q 80 -12 160 0 t 160 0 t 160 0 t 160 0 t 160 0 t 160 0 t 160 0`} fill="none" stroke="#6f4630" strokeWidth={6} />
      ))}
      {/* the pit */}
      <path d={`M ${x0} ${GROUND - 4} L ${x0 + 14} ${floor} L ${x1 - 14} ${floor} L ${x1} ${GROUND - 4} Z`} fill="#4a2f22" />
      <path d={`M ${x0 + 14} ${floor} L ${x1 - 14} ${floor}`} stroke="#2e1d15" strokeWidth={10} />
      {/* grass lips */}
      <path d={`M ${x0 - 150} ${GROUND - 6} L ${x0} ${GROUND - 6} M ${x1} ${GROUND - 6} L ${x1 + 150} ${GROUND - 6}`} stroke="#5aa856" strokeWidth={16} strokeLinecap="round" />
    </g>
  );
};
export const DirtPile: React.FC<{ grow: number }> = ({ grow }) => (
  <Lane d={-0.55} ax={PILE_X}>
    <path d={`M ${PILE_X - 230} ${GROUND} Q ${PILE_X - 60} ${GROUND - 200 - grow * 30} ${PILE_X + 60} ${GROUND - 210 - grow * 30} Q ${PILE_X + 200} ${GROUND - 120} ${PILE_X + 260} ${GROUND} Z`} fill="#8a5a3c" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
  </Lane>
);
export const Dirt: React.FC<{ x: number; y: number; r: number }> = ({ x, y, r }) => <circle cx={x} cy={y} r={r} fill="#7a4e33" stroke={INK} strokeWidth={4} />;
export const ShovelProp: React.FC<{ grip: { x: number; y: number }; blade: { x: number; y: number }; full: number }> = ({ grip, blade, full }) => {
  const a = Math.atan2(blade.y - grip.y, blade.x - grip.x);
  const deg = (a * 180) / Math.PI;
  return (
    <g strokeLinejoin="round">
      <path d={`M ${grip.x} ${grip.y} L ${blade.x} ${blade.y}`} stroke={INK} strokeWidth={20} strokeLinecap="round" />
      <path d={`M ${grip.x} ${grip.y} L ${blade.x} ${blade.y}`} stroke="#b07a4a" strokeWidth={9} strokeLinecap="round" />
      <g transform={`translate(${blade.x} ${blade.y}) rotate(${deg - 90})`} stroke={INK} strokeWidth={6}>
        <path d="M -30 -6 L 30 -6 L 26 50 Q 0 70 -26 50 Z" fill="#8f9aa3" />
        {full > 0 ? <ellipse cx={0} cy={18} rx={34 * full} ry={22 * full} fill="#7a4e33" /> : null}
      </g>
    </g>
  );
};

export { PIV_X, WALL_X, GRAVE_X, DIG_X };
