import React from "react";
import { random } from "remotion";
import { GROUND } from "../../rig/Stickman";
import { gY, Layer, laneS } from "../../rig2d/depth";
import { TOON_INK } from "../../rig2d/Toon";
import { FONT_STACK } from "../../shared/ui";
import { D, SHOP } from "./timeline";

// Painted 2D seaside promenade, seen from the town side: sea and sky at the top, the promenade
// railing, the paving where they wait, the beach shop on the left (its wall makes the updraft).

const INK = TOON_INK;
const mix = (a: string, b: string, u: number) => {
  const h = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const A = h(a);
  const B = h(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, u))).toString(16).padStart(2, "0")).join("")}`;
};

// ─── Sky: grey shower → blue (sun = 0..1), the shower cloud drifting off with the wind ──
export const Sky: React.FC<{ w: number; h: number; sun: number; cloudX: number }> = ({ w, h, sun, cloudX }) => (
  <g>
    <defs>
      <linearGradient id="sky8" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={mix("#7d8a99", "#4f9be6", sun)} />
        <stop offset="1" stopColor={mix("#c9d2dc", "#c8ecff", sun)} />
      </linearGradient>
    </defs>
    <rect width={w} height={h} fill="url(#sky8)" />
    <g opacity={sun}>
      <circle cx={w * 0.78} cy={h * 0.1} r={80} fill="#fff3b0" opacity={0.6} />
      <circle cx={w * 0.78} cy={h * 0.1} r={56} fill="#ffe27a" />
    </g>
    {/* the shower cloud */}
    <g transform={`translate(${cloudX} 0)`} fill={mix("#8a94a3", "#ffffff", sun * 0.6)} stroke={INK} strokeWidth={6} opacity={1 - sun * 0.4}>
      <ellipse cx={w * 0.5} cy={170} rx={420} ry={120} />
      <ellipse cx={w * 0.25} cy={210} rx={260} ry={100} />
      <ellipse cx={w * 0.75} cy={220} rx={300} ry={95} />
      <ellipse cx={w * 0.5} cy={250} rx={470} ry={70} stroke="none" />
    </g>
  </g>
);

// ─── Sea, horizon, lighthouse (far layers) ─────────────────────────────────
export const Sea: React.FC<{ camX: number; t: number; wind: number; sun: number }> = ({ camX, t, wind, sun }) => {
  const top = gY(D.sea);
  return (
    <g>
      <rect x={camX - 5000} y={top} width={10000} height={gY(D.rail) - top + 10} fill={mix("#4f7f9e", "#2f8fc9", sun)} />
      <Layer s={laneS(D.sea) > 0 ? laneS(D.sea) : 0.2} ground={top} ax={camX}>
        {/* lighthouse far out on a headland */}
        <path d={`M ${camX + 2400} ${GROUND} l 900 -160 l 900 160 Z`} fill="#7aa36b" stroke={INK} strokeWidth={20} />
        <path d={`M ${camX + 3100} ${GROUND - 160} l 40 -700 l 120 0 l 40 700 Z`} fill="#fff" stroke={INK} strokeWidth={20} />
        <rect x={camX + 3140} y={GROUND - 600} width={120} height={80} fill="#e63946" />
        <rect x={camX + 3120} y={GROUND - 920} width={160} height={70} fill="#ffe27a" stroke={INK} strokeWidth={16} />
      </Layer>
      {/* waves: whitecaps grow with the wind */}
      {[...Array(40)].map((_, k) => {
        const row = k % 4;
        const y = top + 30 + row * ((gY(D.rail) - top - 40) / 4);
        const x = ((((k * 397) % 3000) - (t * (40 + wind * 12)) % 3000) + 3000) % 3000 + camX - 1500;
        const s = 0.5 + row * 0.25;
        return <path key={k} d={`M ${x} ${y} q ${20 * s} ${-12 * s} ${40 * s} 0`} fill="none" stroke="#e8f6ff" strokeWidth={4 + row} strokeLinecap="round" opacity={0.4 + Math.min(0.5, wind / 30)} />;
      })}
    </g>
  );
};

// ─── Promenade: railing, paving, lamp posts, bench ─────────────────────────
export const Promenade: React.FC<{ camX: number }> = ({ camX }) => {
  const rail = gY(D.rail);
  return (
    <g>
      <rect x={camX - 5000} y={rail - 6} width={10000} height={3000} fill="#e3d6bf" />
      {/* paving slabs */}
      <Layer s={laneS(-1)} ground={gY(-1)} ax={camX}>
        {[...Array(60)].map((_, k) => (
          <line key={k} x1={k * 260 - 7000} y1={GROUND - 200} x2={k * 260 - 7000 - 90} y2={GROUND + 600} stroke="#cdbd9f" strokeWidth={6} />
        ))}
      </Layer>
      {[0.6, 2.2, 4].map((d) => (
        <rect key={d} x={camX - 5000} y={gY(d)} width={10000} height={5} fill="#cdbd9f" />
      ))}
      {/* railing along the sea wall */}
      <Layer s={laneS(D.rail)} ground={rail} ax={camX}>
        <rect x={camX - 6000} y={GROUND - 190} width={12000} height={16} fill="#3f6f8f" stroke={INK} strokeWidth={5} />
        <rect x={camX - 6000} y={GROUND - 100} width={12000} height={12} fill="#3f6f8f" stroke={INK} strokeWidth={4} />
        {[...Array(80)].map((_, k) => (
          <rect key={k} x={k * 150 - 6000} y={GROUND - 190} width={14} height={190} fill="#3f6f8f" stroke={INK} strokeWidth={4} />
        ))}
      </Layer>
    </g>
  );
};

export const Bench: React.FC<{ x: number }> = ({ x }) => (
  <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
    <rect x={x - 200} y={GROUND - 220} width={400} height={26} rx={6} fill="#c98a52" />
    <rect x={x - 200} y={GROUND - 150} width={400} height={30} rx={6} fill="#c98a52" />
    {[-170, 170].map((o) => (
      <rect key={o} x={x + o - 10} y={GROUND - 150} width={20} height={150} fill="#4f5a66" />
    ))}
  </g>
);

/** The bus stop they're waiting at (why they stand still in the rain) */
export const BusStop: React.FC<{ x: number }> = ({ x }) => (
  <g stroke={INK} strokeWidth={7}>
    <rect x={x - 9} y={GROUND - 640} width={18} height={640} fill="#5b6670" />
    <circle cx={x} cy={GROUND - 690} r={64} fill="#e63946" />
    <rect x={x - 66} y={GROUND - 708} width={132} height={36} fill="#fff" strokeWidth={5} />
    <text x={x} y={GROUND - 680} textAnchor="middle" fontFamily={FONT_STACK} fontSize={30} fill="#1d3557" stroke="none">
      BUS
    </text>
  </g>
);

// ─── The beach shop (left): its wall turns the wind upward. Flag on the roof shows the wind ──
export const Shop: React.FC<{ t: number; wind: number }> = ({ t, wind }) => {
  const { x0, x1, h } = SHOP;
  const top = GROUND - h;
  const flagX = x0 + 160;
  const flap = Math.min(1, wind / 16);
  const wave = (k: number) => Math.sin(t * (6 + wind) - k) * (14 - 8 * flap);
  return (
    <g stroke={INK} strokeWidth={8} strokeLinejoin="round">
      <rect x={x0} y={top} width={x1 - x0} height={h} fill="#7ec8d8" />
      {[...Array(9)].map((_, k) => (
        <line key={k} x1={x0 + 30 + k * 95} y1={top + 10} x2={x0 + 30 + k * 95} y2={GROUND} stroke="#6bb4c4" strokeWidth={6} />
      ))}
      <path d={`M ${x0 - 40} ${top} L ${x1 + 40} ${top} L ${x1 + 10} ${top - 60} L ${x0 - 10} ${top - 60} Z`} fill="#f2f2f2" />
      <rect x={x0 + 120} y={top + 80} width={x1 - x0 - 240} height={120} rx={14} fill="#fff6e0" />
      <text x={(x0 + x1) / 2} y={top + 162} textAnchor="middle" fontFamily={FONT_STACK} fontSize={78} fill="#e63946" stroke="none">
        BEACH SHOP
      </text>
      {/* striped awning, flapping */}
      {[...Array(8)].map((_, k) => {
        const w = (x1 - x0 + 60) / 8;
        const x = x0 - 30 + k * w;
        const lift = Math.sin(t * 9 + k) * 6 * flap;
        return <path key={k} d={`M ${x} ${top + 300} L ${x + w} ${top + 300} L ${x + w} ${top + 390 + lift} Q ${x + w / 2} ${top + 420 + lift} ${x} ${top + 390 + lift} Z`} fill={k % 2 ? "#ffffff" : "#ff8a1f"} strokeWidth={6} />;
      })}
      <rect x={x0 + 90} y={GROUND - 520} width={260} height={260} fill="#cfe9ff" />
      <rect x={x1 - 330} y={GROUND - 420} width={190} height={420} fill="#b5654a" />
      {/* flag pole + flag streaming downwind (−x) */}
      <rect x={flagX - 8} y={top - 460} width={16} height={400} fill="#5b6670" />
      <path
        d={`M ${flagX} ${top - 455} Q ${flagX - 80} ${top - 455 + wave(0)} ${flagX - 160 - 40 * flap} ${top - 450 + wave(1) + (1 - flap) * 40} L ${flagX - 160 - 40 * flap} ${top - 360 + wave(1) + (1 - flap) * 60} Q ${flagX - 80} ${top - 360 + wave(0.5)} ${flagX} ${top - 370} Z`}
        fill="#e63946"
        strokeWidth={6}
      />
    </g>
  );
};

/** The umbrella stand outside the shop, with what's left in it */
export const Rack: React.FC<{ x: number; has: { small: boolean; golf: boolean; parasol: boolean } }> = ({ x, has }) => (
  <g stroke={INK} strokeWidth={6} strokeLinejoin="round">
    {has.parasol ? <ClosedBrolly x={x + 50} base={GROUND - 30} len={760} color="#ffd23f" w={46} /> : null}
    {has.golf ? <ClosedBrolly x={x} base={GROUND - 30} len={430} color="#e63946" w={34} hook /> : null}
    {has.small ? <ClosedBrolly x={x - 46} base={GROUND - 30} len={330} color="#2b3a67" w={26} hook /> : null}
    <rect x={x - 90} y={GROUND - 170} width={180} height={170} rx={10} fill="#8a5a3c" />
    <rect x={x - 80} y={GROUND - 145} width={160} height={46} rx={6} fill="#fff6e0" strokeWidth={4} />
    <text x={x} y={GROUND - 111} textAnchor="middle" fontFamily={FONT_STACK} fontSize={28} fill="#c0392b" stroke="none">
      UMBRELLAS
    </text>
  </g>
);
const ClosedBrolly: React.FC<{ x: number; base: number; len: number; color: string; w: number; hook?: boolean }> = ({ x, base, len, color, w, hook }) => (
  <g>
    <path d={`M ${x - w / 2} ${base - len * 0.25} L ${x} ${base - len} L ${x + w / 2} ${base - len * 0.25} Q ${x} ${base - len * 0.15} ${x - w / 2} ${base - len * 0.25} Z`} fill={color} />
    <line x1={x} y1={base - len * 0.2} x2={x} y2={base} strokeWidth={8} />
    {hook ? <path d={`M ${x} ${base - len * 0.2} q 0 -30 -26 -30`} fill="none" strokeWidth={8} transform={`rotate(180 ${x} ${base - len * 0.2})`} /> : null}
  </g>
);

// ─── An umbrella in use: grip at (x, y), pole tilted `tilt`° (− leans left), canopy radius r ──
export type BrollyKind = "small" | "golf" | "parasol";
const STYLE: Record<BrollyKind, { a: string; b: string; hook: boolean; ribs: number }> = {
  small: { a: "#2b3a67", b: "#2b3a67", hook: true, ribs: 6 },
  golf: { a: "#e63946", b: "#ffffff", hook: true, ribs: 8 },
  parasol: { a: "#ffd23f", b: "#ffffff", hook: false, ribs: 10 },
};
export const Brolly: React.FC<{ kind: BrollyKind; x: number; y: number; tilt: number; pole: number; r: number; open: number; inverted?: number }> = ({ kind, x, y, tilt, pole, r, open, inverted = 0 }) => {
  const st = STYLE[kind];
  const R = r * (0.12 + 0.88 * open);
  const dome = 0.42 * R * (1 - 2 * inverted);
  const n = st.ribs;
  const tipY = -pole;
  const segs = [...Array(n)].map((_, k) => {
    const a0 = -R + (2 * R * k) / n;
    const a1 = -R + (2 * R * (k + 1)) / n;
    const top = (u: number) => tipY - dome * (1 - (u / R) ** 2);
    return (
      <path
        key={k}
        d={`M ${a0} ${top(a0) + 0.1} Q ${(a0 + a1) / 2} ${top((a0 + a1) / 2) - dome * 0.08} ${a1} ${top(a1)} L ${a1} ${tipY + 4} Q ${(a0 + a1) / 2} ${tipY + 4 + R * 0.07} ${a0} ${tipY + 4} Z`}
        fill={k % 2 ? st.b : st.a}
      />
    );
  });
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt})`} stroke={INK} strokeWidth={6} strokeLinejoin="round">
      <line x1={0} y1={0} x2={0} y2={tipY - dome - 16} strokeWidth={9} />
      {st.hook ? <path d="M 0 0 q 0 26 -24 26 q -14 0 -16 -12" fill="none" strokeWidth={9} strokeLinecap="round" /> : null}
      {segs}
      <circle cx={0} cy={tipY - dome - 18} r={7} fill={INK} />
    </g>
  );
};

// ─── Rain: streaks falling at ~6 m/s, drifting with the wind; hidden under canopies ─────
export type Canopy = { x0: number; x1: number; y: number };
export const Rain: React.FC<{ t: number; amount: number; wind: number; camX: number; cover: Canopy[] }> = ({ t, amount, wind, camX, cover }) => {
  if (amount <= 0) return null;
  const n = Math.round(160 * amount);
  const vy = 6 * 240;
  const vx = -0.55 * wind * 240;
  const H = 1900;
  return (
    <g stroke="#dbe9f5" strokeWidth={4} strokeLinecap="round" opacity={0.85}>
      {[...Array(n)].map((_, i) => {
        const ph = random(`rp${i}`);
        const y = GROUND - 1700 + ((ph * H + t * vy) % H);
        const x0 = camX - 1100 + random(`rx${i}`) * 2200;
        const x = x0 + ((y - (GROUND - 1700)) / vy) * vx;
        if (y > GROUND) return null;
        if (cover.some((c) => x > c.x0 && x < c.x1 && y > c.y)) return null;
        const dx = (vx / vy) * 40;
        return <line key={i} x1={x} y1={y} x2={x - dx} y2={y - 40} />;
      })}
    </g>
  );
};

/** One scripted drop (a bead) with a splash ring when it lands */
export const Drop: React.FC<{ x: number; y: number; splash: number }> = ({ x, y, splash }) =>
  splash > 0 ? (
    splash < 1 ? (
      <g stroke="#9fd0f5" strokeWidth={4} fill="none" opacity={1 - splash}>
        <path d={`M ${x - 10 - 24 * splash} ${y - 4 - 10 * splash} l -8 -8 M ${x + 10 + 24 * splash} ${y - 4 - 10 * splash} l 8 -8 M ${x} ${y - 10 - 20 * splash} l 0 -8`} strokeLinecap="round" />
      </g>
    ) : null
  ) : (
    <path d={`M ${x} ${y - 26} Q ${x + 11} ${y - 6} ${x} ${y} Q ${x - 11} ${y - 6} ${x} ${y - 26} Z`} fill="#9fd0f5" stroke={INK} strokeWidth={3} />
  );

/** Leaves and litter blown along by the gust */
export const Leaves: React.FC<{ t: number; from: number; wind: number; camX: number }> = ({ t, from, wind, camX }) => {
  const d = t - from;
  if (d < 0 || d > 4) return null;
  return (
    <g stroke={INK} strokeWidth={3}>
      {[...Array(14)].map((_, i) => {
        const x = camX + 700 - d * wind * 200 * (0.7 + 0.5 * random(`lv${i}`)) - 120 * i;
        const y = GROUND - 60 - 500 * random(`ly${i}`) - d * 140 * random(`lu${i}`) + Math.sin(t * 9 + i) * 20;
        return <ellipse key={i} cx={x} cy={y} rx={16} ry={8} fill={i % 3 ? "#d98c3a" : "#8fbf4a"} transform={`rotate(${t * 400 + i * 40} ${x} ${y})`} />;
      })}
    </g>
  );
};

/** Wind streaks (they read as WIND without sound) */
export const WindLines: React.FC<{ t: number; wind: number; camX: number; top: number }> = ({ t, wind, camX, top }) => {
  const k = Math.max(0, (wind - 6) / 10);
  if (k <= 0.02) return null;
  return (
    <g stroke="#ffffff" strokeLinecap="round" opacity={0.7 * k}>
      {[...Array(12)].map((_, i) => {
        const y = top + 120 + i * 95 + 30 * Math.sin(i * 2.3);
        const x = camX + 800 - (((t * 2200 + i * 310) % 2200));
        return <path key={i} d={`M ${x} ${y} q -120 -12 -260 0`} fill="none" strokeWidth={7} />;
      })}
    </g>
  );
};

/** The untied shoelace on Dash's front sneaker (dangling, or a neat double bow) */
export const Lace: React.FC<{ x: number; y: number; s: number; tied: boolean; t: number }> = ({ x, y, s, tied, t }) =>
  tied ? (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={3} fill="#ffffff">
      <ellipse cx={-10} cy={-6} rx={11} ry={6} transform="rotate(-20 -10 -6)" />
      <ellipse cx={10} cy={-6} rx={11} ry={6} transform="rotate(20 10 -6)" />
    </g>
  ) : (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round">
      <path d={`M 0 0 q 14 ${18 + Math.sin(t * 4) * 3} 36 ${22 + Math.sin(t * 4) * 4}`} />
      <path d={`M 0 0 q 14 ${18 + Math.sin(t * 4) * 3} 36 ${22 + Math.sin(t * 4) * 4}`} stroke="#ffffff" strokeWidth={4} />
      <path d={`M -4 0 q -6 22 -26 30`} />
      <path d={`M -4 0 q -6 22 -26 30`} stroke="#ffffff" strokeWidth={4} />
    </g>
  );

// ─── The hot-air balloon, 1 km up (screen-space scene) ─────────────────────
export const Balloon: React.FC<{ x: number; y: number; t: number; paper: number; nod: number }> = ({ x, y, t, paper, nod }) => {
  const sway = Math.sin(t * 1.1) * 2;
  return (
    <g transform={`translate(${x} ${y}) rotate(${sway})`} stroke={INK} strokeWidth={8} strokeLinejoin="round">
      {/* envelope (mostly above the frame) */}
      <path d="M -520 -760 Q -560 -1500 0 -1560 Q 560 -1500 520 -760 Q 380 -520 150 -330 L -150 -330 Q -380 -520 -520 -760 Z" fill="#ff8a1f" />
      {[-360, -170, 0, 170, 360].map((o, k) => (
        <path key={o} d={`M ${o * 0.45} -330 Q ${o * 1.4} -800 ${o * 0.6} -1540`} fill="none" stroke={k % 2 ? "#ffd23f" : "#e63946"} strokeWidth={36} />
      ))}
      <path d="M -150 -330 L -120 -40 M 150 -330 L 120 -40" strokeWidth={6} />
      {/* the passenger: flat cap, moustache, reading the paper */}
      <g transform={`translate(10 ${-70 + nod * 6})`}>
        <circle cx={0} cy={-50} r={52} fill="#f1c08f" />
        <path d="M -56 -70 Q -40 -120 30 -112 Q 70 -104 66 -78 Z" fill="#5b6670" />
        <path d="M -22 -28 q 22 14 44 0" fill="#6b4a2c" strokeWidth={5} />
        <circle cx={-18} cy={-56} r={6} fill={INK} stroke="none" />
        <circle cx={18} cy={-56} r={6} fill={INK} stroke="none" />
      </g>
      {/* the newspaper: up (1) hides his face, down (0) shows it */}
      <g transform={`translate(0 ${-150 + 210 * (1 - paper)})`}>
        <rect x={-120} y={-80} width={240} height={170} rx={6} fill="#f4f1e6" />
        <text x={0} y={-30} textAnchor="middle" fontFamily={FONT_STACK} fontSize={34} fill={INK} stroke="none">
          WEATHER
        </text>
        <text x={0} y={10} textAnchor="middle" fontFamily={FONT_STACK} fontSize={24} fill={INK} stroke="none">
          light showers,
        </text>
        <text x={0} y={40} textAnchor="middle" fontFamily={FONT_STACK} fontSize={24} fill={INK} stroke="none">
          gusty
        </text>
        <rect x={-136} y={-10} width={28} height={40} rx={12} fill="#f1c08f" />
        <rect x={108} y={-10} width={28} height={40} rx={12} fill="#f1c08f" />
      </g>
      {/* basket */}
      <path d="M -150 -40 L 150 -40 L 130 160 L -130 160 Z" fill="#c98a52" />
      {[0, 1, 2, 3].map((k) => (
        <line key={k} x1={-145 + k * 3} y1={10 + k * 45} x2={145 - k * 3} y2={10 + k * 45} stroke="#9a6438" strokeWidth={6} />
      ))}
      <rect x={-160} y={-56} width={320} height={26} rx={10} fill="#8a5a3c" />
    </g>
  );
};

/** A cast-iron mooring bollard on the promenade (Dash rests his foot on it to tie his lace) */
export const Bollard: React.FC<{ x: number; h: number }> = ({ x, h }) => (
  <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
    <path d={`M ${x - 46} ${GROUND} L ${x - 38} ${GROUND - h + 30} Q ${x - 60} ${GROUND - h + 18} ${x - 54} ${GROUND - h} L ${x + 54} ${GROUND - h} Q ${x + 60} ${GROUND - h + 18} ${x + 38} ${GROUND - h + 30} L ${x + 46} ${GROUND} Z`} fill="#3f4a56" />
    <path d={`M ${x - 30} ${GROUND - h + 50} L ${x - 30} ${GROUND - 20}`} stroke="#5d6b78" strokeWidth={8} />
  </g>
);

// ─── Close-up: Dash's hands tying his lace on the bollard, step by step (no cheating: you can follow it) ──
// Phase "bow" (u 0→1): pick up the ends → cross them → tuck + pull (half knot) → two loops ("bunny ears")
// → cross the loops → pull tight into a bow. Phase "double" (u 0→1): the loops cross again → pull → a
// final proud tug, which jiggles the shoe.
type K = { u: number; l: [number, number]; r: [number, number]; knot: number; loops: number; cross: number; spread: number };
const BOW: K[] = [
  { u: 0.0, l: [380, 1230], r: [700, 1240], knot: 0, loops: 0, cross: 0, spread: 0 },
  { u: 0.14, l: [410, 960], r: [670, 960], knot: 0, loops: 0, cross: 0, spread: 0 },
  { u: 0.3, l: [650, 930], r: [430, 930], knot: 0, loops: 0, cross: 0, spread: 0 },
  { u: 0.46, l: [300, 1010], r: [780, 1010], knot: 1, loops: 0, cross: 0, spread: 0 },
  { u: 0.62, l: [430, 960], r: [650, 960], knot: 1, loops: 1, cross: 0, spread: 0 },
  { u: 0.78, l: [600, 950], r: [480, 950], knot: 1, loops: 1, cross: 1, spread: 0 },
  { u: 0.92, l: [330, 1000], r: [750, 1000], knot: 1.3, loops: 1, cross: 0, spread: 1 },
  { u: 1.0, l: [300, 900], r: [780, 900], knot: 1.3, loops: 1, cross: 0, spread: 1 },
];
const DOUBLE: K[] = [
  { u: 0.0, l: [300, 900], r: [780, 900], knot: 1.3, loops: 1, cross: 0, spread: 1 },
  { u: 0.2, l: [455, 990], r: [625, 990], knot: 1.3, loops: 1, cross: 0, spread: 1 },
  { u: 0.45, l: [600, 960], r: [480, 960], knot: 1.3, loops: 1, cross: 1, spread: 1 },
  { u: 0.7, l: [320, 1000], r: [760, 1000], knot: 1.7, loops: 1, cross: 0, spread: 1 },
  { u: 0.82, l: [280, 1010], r: [800, 1010], knot: 1.8, loops: 1, cross: 0, spread: 1 },
  { u: 1.0, l: [300, 880], r: [780, 880], knot: 1.8, loops: 1, cross: 0, spread: 1 },
];
const sampleK = (ks: K[], u: number): K => {
  if (u <= ks[0].u) return ks[0];
  for (let i = 1; i < ks.length; i++) {
    if (u <= ks[i].u) {
      const a = ks[i - 1];
      const b = ks[i];
      const f = (u - a.u) / (b.u - a.u);
      const e = f * f * (3 - 2 * f);
      const L = (p: number, q: number) => p + (q - p) * e;
      return { u, l: [L(a.l[0], b.l[0]), L(a.l[1], b.l[1])], r: [L(a.r[0], b.r[0]), L(a.r[1], b.r[1])], knot: L(a.knot, b.knot), loops: L(a.loops, b.loops), cross: L(a.cross, b.cross), spread: L(a.spread, b.spread) };
    }
  }
  return ks[ks.length - 1];
};
const SKIN = "#f1c08f";
const Hand: React.FC<{ x: number; y: number; side: 1 | -1 }> = ({ x, y, side }) => {
  // forearm from off-frame (top corners), a pinching hand at (x, y)
  const ax = side === -1 ? -200 : 1280;
  const ay = 380;
  return (
    <g stroke={INK} strokeLinejoin="round" strokeLinecap="round">
      <line x1={ax} y1={ay} x2={x} y2={y - 40} strokeWidth={74} />
      <line x1={ax} y1={ay} x2={x} y2={y - 40} strokeWidth={60} stroke={SKIN} />
      <ellipse cx={x} cy={y - 26} rx={46} ry={40} fill={SKIN} strokeWidth={8} />
      <path d={`M ${x - side * 34} ${y - 4} q ${side * 30} ${18} ${side * 56} ${-4}`} fill={SKIN} strokeWidth={8} />
      <path d={`M ${x + side * 6} ${y - 52} q ${side * 26} -6 ${side * 34} 14`} fill="none" strokeWidth={6} />
    </g>
  );
};
export const TieCloseUp: React.FC<{ phase: "bow" | "double"; u: number; t: number; fade: number }> = ({ phase, u, t, fade }) => {
  const k0 = sampleK(phase === "bow" ? BOW : DOUBLE, Math.max(0, Math.min(1, u)));
  const KX = 540;
  const KY = 1020;
  // spread the action out so the loops are big and easy to follow
  const big = (p: [number, number]): [number, number] => [KX + (p[0] - 540) * 1.4, KY + (p[1] - 1000) * 1.3];
  const k = { ...k0, l: big(k0.l), r: big(k0.r) };
  const AL = { x: 500, y: 1050 };
  const AR = { x: 580, y: 1050 };
  const jig = phase === "double" && u > 0.7 && u < 0.9 ? Math.sin(t * 60) * 6 : 0;
  const rope = (d: string, key: string) => (
    <g key={key}>
      <path d={d} fill="none" stroke={INK} strokeWidth={40} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#ffffff" strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
  const strands: React.ReactNode[] = [];
  if (k.loops < 0.5) {
    // loose ends, from the eyelets to the hands (they cross when the hands swap sides)
    const from = k.knot > 0.5 ? { x: KX, y: KY } : null;
    const a = from ?? AL;
    const b = from ?? AR;
    strands.push(rope(`M ${a.x} ${a.y} Q ${(a.x + k.l[0]) / 2} ${Math.max(a.y, k.l[1]) + 60} ${k.l[0]} ${k.l[1]}`, "l"));
    strands.push(rope(`M ${b.x} ${b.y} Q ${(b.x + k.r[0]) / 2} ${Math.max(b.y, k.r[1]) + 60} ${k.r[0]} ${k.r[1]}`, "r"));
  } else {
    // two loops ("bunny ears") from the knot to the hands, plus their two short tails
    const loop = (h: [number, number], key: string) => {
      const dx = h[0] - KX;
      const dy = h[1] - KY;
      const nx = -dy * 0.35;
      const ny = dx * 0.35;
      return rope(`M ${KX} ${KY} Q ${KX + dx * 0.6 + nx} ${KY + dy * 0.6 + ny} ${h[0]} ${h[1]} Q ${KX + dx * 0.6 - nx} ${KY + dy * 0.6 - ny} ${KX} ${KY}`, key);
    };
    strands.push(loop(k.l, "ll"), loop(k.r, "lr"));
    strands.push(rope(`M ${KX} ${KY} q -40 70 -110 ${90 + 10 * Math.sin(t * 3)}`, "tl"), rope(`M ${KX} ${KY} q 40 70 110 ${96 + 10 * Math.sin(t * 3 + 1)}`, "tr"));
  }
  const handsOff = phase === "double" && u > 0.9;
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: fade }}>
      <rect width={1080} height={1920} fill="#d9c8a6" />
      {[...Array(9)].map((_, i) => (
        <line key={i} x1={i * 160 - 200} y1={1920} x2={i * 160 + 260} y2={1260} stroke="#c4b18c" strokeWidth={8} />
      ))}
      {/* the bollard top, and the shoe resting on it */}
      <path d="M 160 1330 Q 120 1290 150 1260 L 930 1260 Q 960 1290 920 1330 L 900 1920 L 180 1920 Z" fill="#3f4a56" stroke={INK} strokeWidth={10} />
      <g transform={`translate(${jig} 0)`}>
        <rect x={110} y={480} width={330} height={560} fill="#2f3e5c" stroke={INK} strokeWidth={10} />
        <g transform="translate(250 1330) scale(12.5)" stroke={INK} strokeWidth={0.9} strokeLinejoin="round">
          <path d="M -16 4 L 38 4 Q 50 4 47 -7 Q 42 -20 22 -21 L 8 -27 Q -16 -30 -16 -10 Z" fill="#fbfbf7" />
          <path d="M -16 4 L 38 4 Q 50 4 48 -3 L -16 -3 Z" fill="#ff8a1f" />
          <path d="M 20 -24 L 20 -19 M 26 -24 L 26 -19 M 32 -22 L 32 -17" stroke={INK} strokeWidth={0.7} />
        </g>
        {strands}
        <circle cx={KX} cy={KY} r={24 * k.knot} fill="#ffffff" stroke={INK} strokeWidth={6} opacity={k.knot > 0.1 ? 1 : 0} />
        {!handsOff ? (
          <>
            <Hand x={k.l[0]} y={k.l[1]} side={-1} />
            <Hand x={k.r[0]} y={k.r[1]} side={1} />
          </>
        ) : null}
      </g>
    </svg>
  );
};
