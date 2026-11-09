import React from "react";
import { random } from "remotion";
import { GROUND, INK } from "../../rig/Stickman";
import { FONT_STACK } from "../../shared/ui";
import { ballistic, particle } from "./physics";
import { SOLD_OUT_T } from "./timeline";

// ─── Landscape ────────────────────────────────────────────────────────────
export const Sky: React.FC<{ camX: number }> = ({ camX }) => (
  <g>
    <rect x={camX - 200} y={-2000} width={1500} height={GROUND + 2000} fill="#bfe6ff" />
    <circle cx={camX + 880} cy={720} r={60} fill="#ffd23f" stroke={INK} strokeWidth={6} />
    {/* far hills drift slower than the ground (parallax) */}
    {[0, 1, 2, 3, 4].map((i) => {
      const x = camX * 0.6 + ((i * 700 - camX * 0.4) % 3500 + 3500) % 3500 - 700;
      return <ellipse key={i} cx={x} cy={GROUND + 40} rx={420} ry={200} fill="#9fd08a" stroke="#7aa35a" strokeWidth={6} />;
    })}
  </g>
);

export const Ground: React.FC<{ x0: number; x1: number; color: string; edge?: string }> = ({ x0, x1, color, edge = INK }) => (
  <g>
    <rect x={x0} y={GROUND} width={x1 - x0} height={1200} fill={color} />
    <line x1={x0} y1={GROUND} x2={x1} y2={GROUND} stroke={edge} strokeWidth={9} />
  </g>
);

export const Tufts: React.FC<{ xs: number[] }> = ({ xs }) => (
  <g>
    {xs.map((x) => (
      <path key={x} d={`M ${x - 14} ${GROUND} l 6 -22 l 6 18 l 6 -26 l 6 22 l 6 -16`} fill="none" stroke="#5f8f42" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    ))}
  </g>
);

export const Tree: React.FC<{ x: number; s?: number }> = ({ x, s = 1 }) => (
  <g transform={`translate(${x} ${GROUND}) scale(${s})`} stroke={INK} strokeWidth={6}>
    <rect x={-16} y={-220} width={32} height={220} fill="#8a5a3b" />
    <circle cx={0} cy={-260} r={90} fill="#6f9a4c" />
    <circle cx={-60} cy={-210} r={55} fill="#6f9a4c" />
    <circle cx={64} cy={-214} r={58} fill="#6f9a4c" />
  </g>
);

// A fence that crosses the path, seen at an angle (rails recede into depth)
export const Fence: React.FC<{ x: number; broken?: number }> = ({ x, broken = 0 }) => (
  <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
    <rect x={x + 50} y={GROUND - 190} width={20} height={190} fill="#b98a5c" />
    {broken < 1 ? (
      <g>
        <path d={`M ${x - 20} ${GROUND - 140} L ${x + 60} ${GROUND - 165} L ${x + 60} ${GROUND - 150} L ${x - 20} ${GROUND - 124} Z`} fill="#d1a273" />
        <path d={`M ${x - 20} ${GROUND - 70} L ${x + 60} ${GROUND - 95} L ${x + 60} ${GROUND - 80} L ${x - 20} ${GROUND - 54} Z`} fill="#d1a273" />
      </g>
    ) : null}
    <rect x={x - 30} y={GROUND - 160} width={22} height={160} fill="#c99a6a" />
  </g>
);

// A fence running alongside the path (background), with a bull pasture behind
export const SideFence: React.FC<{ x0: number; x1: number; y?: number }> = ({ x0, x1, y = GROUND - 40 }) => (
  <g stroke={INK} strokeWidth={5}>
    {[...Array(Math.floor((x1 - x0) / 160) + 1)].map((_, i) => (
      <rect key={i} x={x0 + i * 160} y={y - 110} width={14} height={110} fill="#c99a6a" />
    ))}
    <rect x={x0} y={y - 96} width={x1 - x0 + 14} height={12} fill="#d1a273" />
    <rect x={x0} y={y - 52} width={x1 - x0 + 14} height={12} fill="#d1a273" />
  </g>
);

export const Saguaro: React.FC<{ x: number; h: number; s?: number; fade?: boolean }> = ({ x, h, s = 1, fade }) => (
  <g transform={`translate(${x} ${GROUND}) scale(${s})`} stroke={INK} strokeWidth={6} opacity={fade ? 0.55 : 1}>
    <rect x={-22} y={-h} width={44} height={h} rx={22} fill="#5c9a4a" />
    <path d={`M -22 ${-h * 0.45} L -52 ${-h * 0.45} L -52 ${-h * 0.75}`} fill="none" strokeWidth={30} stroke="#5c9a4a" strokeLinecap="round" />
    <path d={`M -22 ${-h * 0.45} L -52 ${-h * 0.45} L -52 ${-h * 0.75}`} fill="none" strokeWidth={0} />
    <path d={`M 22 ${-h * 0.6} L 50 ${-h * 0.6} L 50 ${-h * 0.85}`} fill="none" strokeWidth={30} stroke="#5c9a4a" strokeLinecap="round" />
    {[0.2, 0.4, 0.6, 0.8].map((k) => (
      <g key={k} stroke={INK} strokeWidth={2.5}>
        <line x1={-22} y1={-h * k} x2={-32} y2={-h * k - 6} />
        <line x1={22} y1={-h * k + 10} x2={32} y2={-h * k + 4} />
      </g>
    ))}
  </g>
);

export const Barrel: React.FC<{ x: number; h: number }> = ({ x, h }) => (
  <g transform={`translate(${x} ${GROUND})`} stroke={INK} strokeWidth={6}>
    <ellipse cx={0} cy={-h / 2} rx={40} ry={h / 2} fill="#6aa857" />
    {[-24, -8, 8, 24].map((o) => (
      <line key={o} x1={o} y1={-h + 6} x2={o * 1.4} y2={-h - 12} strokeWidth={3} />
    ))}
    <circle cx={0} cy={-h - 2} r={7} fill="#ff6fa5" strokeWidth={3} />
  </g>
);

// ─── River: the current flows right→left (against the hero) ──────────────
export const RiverBack: React.FC<{ x0: number; x1: number; surface: number; t: number }> = ({ x0, x1, surface, t }) => (
  <g>
    <rect x={x0} y={GROUND} width={x1 - x0} height={900} fill="#7d5b3c" />
    <rect x={x0} y={surface} width={x1 - x0} height={900} fill="#3d8fd1" />
  </g>
);

export const RiverFront: React.FC<{ x0: number; x1: number; surface: number; t: number }> = ({ x0, x1, surface, t }) => {
  const flow = (t * 110) % 80; // ripples drift left at the current's speed
  const pts: string[] = [];
  for (let x = x0; x <= x1; x += 10) pts.push(`${x},${surface + Math.sin((x + flow * 4) / 26) * 5}`);
  return (
    <g>
      <rect x={x0} y={surface + 8} width={x1 - x0} height={900} fill="#4aa3df" opacity={0.86} />
      <polyline points={pts.join(" ")} fill="none" stroke="#e8f6ff" strokeWidth={6} />
      {[...Array(Math.ceil((x1 - x0) / 80) + 1)].map((_, i) => {
        const x = x1 - ((i * 80 + flow) % (x1 - x0 + 80));
        return <path key={i} d={`M ${x} ${surface + 40 + (i % 3) * 30} l -28 0`} stroke="#bfe6ff" strokeWidth={5} strokeLinecap="round" />;
      })}
      <line x1={x0} y1={GROUND} x2={x0} y2={surface + 900} stroke={INK} strokeWidth={8} />
      <line x1={x1} y1={GROUND} x2={x1} y2={surface + 900} stroke={INK} strokeWidth={8} />
    </g>
  );
};

export const Bridge: React.FC<{ x0: number; x1: number }> = ({ x0, x1 }) => (
  <g stroke={INK} strokeWidth={6}>
    <rect x={x0 - 20} y={GROUND - 6} width={x1 - x0 + 40} height={30} fill="#b98a5c" />
    {[...Array(Math.floor((x1 - x0) / 100) + 1)].map((_, i) => (
      <rect key={i} x={x0 + i * 100} y={GROUND - 110} width={12} height={110} fill="#c99a6a" />
    ))}
    <rect x={x0} y={GROUND - 110} width={x1 - x0 + 12} height={12} fill="#d1a273" />
  </g>
);

// ─── Fish (ballistic leap out of the water) ───────────────────────────────
export const Fish: React.FC<{ t: number; t0: number; t1: number; x0: number; x1: number; surface: number }> = ({ t, t0, t1, x0, x1, surface }) => {
  if (t < t0 || t > t1) return null;
  const u = (t - t0) / (t1 - t0);
  const x = x0 + (x1 - x0) * u;
  const h = ballistic(t, t0, t1, 0, 0);
  const hNext = ballistic(t + 0.01, t0, t1, 0, 0);
  const ang = (Math.atan2(-(hNext - h), (x1 - x0) / (t1 - t0) * 0.01) * 180) / Math.PI; // nose follows velocity
  return (
    <g transform={`translate(${x} ${surface - h}) rotate(${ang}) scale(${x1 < x0 ? -1 : 1} 1)`} stroke={INK} strokeWidth={5}>
      <ellipse cx={0} cy={0} rx={40} ry={18} fill="#ff9f43" />
      <path d="M -36 0 L -62 -18 L -62 18 Z" fill="#ff9f43" strokeLinejoin="round" />
      <circle cx={22} cy={-4} r={4} fill={INK} stroke="none" />
    </g>
  );
};

// ─── The bull ─────────────────────────────────────────────────────────────
export type BullState = {
  nose: number; // world x of the nose
  facing: 1 | -1;
  stand: number; // 0 lying .. 1 standing
  run: number; // leg-cycle phase (radians); 0 = still
  eyes: "closed" | "open" | "angry" | "dazed" | "happy";
  headDown: number; // 0..1 (charging / licking)
  tongue: number; // 0..1
  paw: number; // front-hoof scrape phase
};

export const Bull: React.FC<{ b: BullState; t: number }> = ({ b, t }) => {
  const lyingDrop = (1 - b.stand) * 115;
  const bodyY = -190 + lyingDrop;
  const headY = -175 + lyingDrop * 1.05 + b.headDown * 55;
  const legLen = 112 * b.stand + 14;
  const legs = [-282, -252, -150, -120].map((lx, i) => {
    const front = i >= 2;
    const swing = b.run ? Math.sin(b.run + (i % 2 ? Math.PI : 0) + (front ? 0.6 : 0)) * 26 : 0;
    const pawing = front && i === 3 ? Math.max(0, Math.sin(b.paw)) * 30 : 0;
    return { lx, swing: swing - pawing * 0.6, lift: pawing };
  });
  return (
    <g transform={`translate(${b.nose} ${GROUND}) scale(${b.facing} 1)`} stroke={INK} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round">
      {/* tail */}
      <path d={`M -325 ${bodyY - 20} q -30 30 -20 ${80 + Math.sin(t * 4) * 10}`} fill="none" />
      <circle cx={-345} cy={bodyY + 64 + Math.sin(t * 4) * 10} r={10} fill={INK} />
      {/* legs */}
      {legs.map((l, i) => (
        <g key={i}>
          <line x1={l.lx} y1={bodyY + 40} x2={l.lx + l.swing} y2={bodyY + 40 + legLen - l.lift} stroke={i % 2 ? "#4a2d1b" : INK} strokeWidth={16} />
          {b.stand > 0.5 ? <rect x={l.lx + l.swing - 11} y={bodyY + 40 + legLen - l.lift - 6} width={22} height={14} rx={3} fill="#2b2b2b" /> : null}
        </g>
      ))}
      <ellipse cx={-200} cy={bodyY} rx={128} ry={74} fill="#7a4a2e" />
      <path d={`M -240 ${bodyY - 40} q 30 20 70 -6`} stroke="#5d3720" strokeWidth={6} fill="none" />
      {/* head */}
      <g transform={`rotate(${b.headDown * 22} -95 ${headY})`}>
        <path d={`M -70 ${headY - 52} q -26 -36 -4 -64`} fill="none" stroke="#f4e6c4" strokeWidth={14} />
        <path d={`M -70 ${headY - 52} q -26 -36 -4 -64`} fill="none" strokeWidth={3} />
        <ellipse cx={-62} cy={headY} rx={56} ry={50} fill="#7a4a2e" />
        <ellipse cx={-118} cy={headY - 22} rx={22} ry={12} fill="#7a4a2e" transform={`rotate(-20 -118 ${headY - 22})`} />
        <ellipse cx={-10} cy={headY + 18} rx={32} ry={26} fill="#e8a7a0" />
        <circle cx={-2} cy={headY + 14} r={4} fill={INK} stroke="none" />
        <circle cx={-18} cy={headY + 16} r={4} fill={INK} stroke="none" />
        <circle cx={-10} cy={headY + 40} r={9} fill="none" stroke="#c9a227" strokeWidth={5} />
        {b.tongue > 0 ? <path d={`M -14 ${headY + 40} q 10 ${30 * b.tongue} 24 ${10 * b.tongue}`} fill="#ff7a8a" strokeWidth={4} /> : null}
        {/* eye */}
        {b.eyes === "closed" ? <path d={`M -64 ${headY - 14} q 10 8 20 0`} fill="none" strokeWidth={4} /> : null}
        {b.eyes === "happy" ? <path d={`M -64 ${headY - 10} q 10 -10 20 0`} fill="none" strokeWidth={4} /> : null}
        {b.eyes === "open" ? <circle cx={-54} cy={headY - 14} r={8} fill={INK} stroke="none" /> : null}
        {b.eyes === "angry" ? (
          <g>
            <circle cx={-54} cy={headY - 12} r={8} fill="#e02424" stroke="none" />
            <line x1={-70} y1={headY - 34} x2={-40} y2={headY - 22} strokeWidth={6} />
          </g>
        ) : null}
        {b.eyes === "dazed" ? (
          <g strokeWidth={4}>
            <line x1={-62} y1={headY - 22} x2={-46} y2={headY - 6} />
            <line x1={-46} y1={headY - 22} x2={-62} y2={headY - 6} />
          </g>
        ) : null}
      </g>
    </g>
  );
};

// Steam puffs from the nostrils when snorting
export const Snort: React.FC<{ t: number; at: number; x: number; y: number; dir: number }> = ({ t, at, x, y, dir }) => {
  const d = t - at;
  if (d < 0 || d > 0.7) return null;
  return (
    <g fill="#ffffff" stroke="#9aa5b1" strokeWidth={4} opacity={1 - d / 0.7}>
      {[0, 1].map((i) => (
        <circle key={i} cx={x + dir * (20 + d * 160)} cy={y + (i ? 14 : -6) - d * 30} r={12 + d * 40} />
      ))}
    </g>
  );
};

// ─── Ice-cream truck ──────────────────────────────────────────────────────
export const Truck: React.FC<{ x: number; t: number; wheelTurn: number }> = ({ x, t, wheelTurn }) => {
  const sold = t >= SOLD_OUT_T;
  const flip = Math.abs(t - SOLD_OUT_T) < 0.12 ? Math.abs(t - SOLD_OUT_T) / 0.12 : 1;
  return (
    <g transform={`translate(${x} ${GROUND})`} stroke={INK} strokeWidth={7} strokeLinejoin="round">
      <rect x={0} y={-330} width={420} height={270} rx={18} fill="#fffaf0" />
      <path d="M 420 -250 L 500 -250 Q 540 -250 545 -200 L 545 -60 L 420 -60 Z" fill="#fffaf0" />
      <path d="M 432 -238 L 492 -238 Q 520 -236 522 -200 L 432 -200 Z" fill="#bfe6ff" />
      <rect x={0} y={-130} width={545} height={22} fill="#ff8fab" strokeWidth={0} />
      <rect x={70} y={-280} width={190} height={110} rx={8} fill="#3a3a3a" />
      <path d="M 60 -290 L 270 -290 L 285 -260 L 45 -260 Z" fill="#ff8fab" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={60 + i * 42} y={-290} width={21} height={30} fill="#fff" strokeWidth={0} />
      ))}
      {/* roof cone */}
      <path d="M 210 -330 L 240 -420 L 270 -330 Z" fill="#e8b46a" />
      <circle cx={240} cy={-430} r={30} fill="#ffc6dc" />
      {/* menu board */}
      <g transform={`translate(340 -200) scale(1 ${flip})`}>
        <rect x={-60} y={-40} width={120} height={80} rx={8} fill={sold ? "#e63946" : "#ffd23f"} />
        <text x={0} y={-6} textAnchor="middle" fontFamily={FONT_STACK} fontSize={sold ? 26 : 24} fill={sold ? "#fff" : INK} stroke="none">
          {sold ? "SOLD" : "LAST"}
        </text>
        <text x={0} y={26} textAnchor="middle" fontFamily={FONT_STACK} fontSize={sold ? 26 : 24} fill={sold ? "#fff" : INK} stroke="none">
          {sold ? "OUT" : "ONE!"}
        </text>
      </g>
      {[100, 450].map((wx) => (
        <g key={wx} transform={`translate(${wx} -42) rotate(${wheelTurn})`}>
          <circle r={44} fill="#2b2b2b" />
          <circle r={18} fill="#c9c9c9" />
          <line x1={-18} y1={0} x2={18} y2={0} strokeWidth={5} />
        </g>
      ))}
    </g>
  );
};

// ─── Intro sign with a little map ─────────────────────────────────────────
export const MapSign: React.FC<{ x: number }> = ({ x }) => (
  <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
    <rect x={x - 12} y={GROUND - 330} width={24} height={330} fill="#b98a5c" />
    <rect x={x - 170} y={GROUND - 560} width={340} height={250} rx={14} fill="#fff6dc" />
    {/* start + ice cream */}
    <circle cx={x - 130} cy={GROUND - 350} r={12} fill="#2a9d55" />
    <g transform={`translate(${x + 130} ${GROUND - 520})`}>
      <path d="M -12 0 L 12 0 L 0 30 Z" fill="#e8b46a" strokeWidth={4} />
      <circle cx={0} cy={-8} r={13} fill="#ffc6dc" strokeWidth={4} />
    </g>
    {/* the long, safe path */}
    <path
      d={`M ${x - 130} ${GROUND - 350} C ${x - 160} ${GROUND - 470}, ${x - 40} ${GROUND - 560}, ${x - 30} ${GROUND - 450} S ${x + 120} ${GROUND - 380}, ${x + 150} ${GROUND - 460} S ${x + 140} ${GROUND - 520}, ${x + 130} ${GROUND - 500}`}
      fill="none"
      stroke="#2a9d55"
      strokeWidth={6}
      strokeDasharray="4 12"
    />
    <text x={x - 70} y={GROUND - 520} fontFamily={FONT_STACK} fontSize={26} fill="#2a9d55" stroke="none">
      path · 10 min
    </text>
    {/* the "shortcut" */}
    <line x1={x - 130} y1={GROUND - 350} x2={x + 130} y2={GROUND - 500} stroke="#e63946" strokeWidth={6} strokeDasharray="14 10" />
    <text x={x - 20} y={GROUND - 365} fontFamily={FONT_STACK} fontSize={26} fill="#e63946" stroke="none">
      2 min?!
    </text>
    {/* what's on the straight line */}
    <g strokeWidth={3}>
      <rect x={x - 70} y={GROUND - 400} width={12} height={24} rx={6} fill="#5c9a4a" />
      <path d={`M ${x - 10} ${GROUND - 430} q 10 -10 20 0 q 10 -10 20 0`} fill="none" stroke="#3d8fd1" strokeWidth={5} />
      <ellipse cx={x + 66} cy={GROUND - 468} rx={16} ry={10} fill="#7a4a2e" />
    </g>
  </g>
);

// ─── Particles ────────────────────────────────────────────────────────────
// Water splash: droplets thrown up, pulled down by gravity until they hit the surface
export const Splash: React.FC<{ t: number; at: number; x: number; y: number; n?: number; power?: number; seed: string; fill?: string; stroke?: string }> = ({ t, at, x, y, n = 26, power = 1, seed, fill = "#bfe6ff", stroke = "#3d8fd1" }) => {
  const d = t - at;
  if (d < 0 || d > 1.2) return null;
  return (
    <g fill={fill} stroke={stroke} strokeWidth={3}>
      {[...Array(n)].map((_, i) => {
        const vx = (random(`${seed}x${i}`) - 0.5) * 700 * power;
        const vy = -(500 + random(`${seed}y${i}`) * 700) * power;
        const p = particle(d, x, y, vx, vy);
        if (p.y > y + 4 && d > 0.05) return null;
        return <circle key={i} cx={p.x} cy={p.y} r={5 + random(`${seed}r${i}`) * 6} />;
      })}
      <ellipse cx={x} cy={y} rx={30 + d * 220} ry={6 + d * 18} fill="none" stroke="#e8f6ff" strokeWidth={5} opacity={1 - d / 1.2} />
    </g>
  );
};

export const Dust: React.FC<{ t: number; at: number; x: number; dir?: number; seed: string; color?: string }> = ({ t, at, x, dir = 0, seed, color = "#e9dcc3" }) => {
  const d = t - at;
  if (d < 0 || d > 0.6) return null;
  return (
    <g fill={color} stroke="#c2b08f" strokeWidth={3} opacity={1 - d / 0.6}>
      {[...Array(6)].map((_, i) => {
        const ang = Math.PI * (0.15 + 0.7 * random(`${seed}${i}`));
        const sp = 150 + 150 * random(`${seed}s${i}`);
        return <circle key={i} cx={x + Math.cos(ang) * sp * d * (dir || (i % 2 ? 1 : -1))} cy={GROUND - 8 - Math.sin(ang) * sp * d * 0.5} r={10 + d * 30} />;
      })}
    </g>
  );
};

// Fence planks knocked loose: each flies on its own parabola and spins
export const Planks: React.FC<{ t: number; at: number; x: number; v: number }> = ({ t, at, x, v }) => {
  const d = t - at;
  if (d < 0) return null;
  return (
    <g>
      {[0, 1, 2].map((i) => {
        const vx = v * (0.6 + 0.25 * i);
        const vy = -(380 + i * 160);
        const y0 = GROUND - 150 + i * 50;
        // they come to rest on the ground
        const tLand = (-vy + Math.sqrt(vy * vy + 2 * 2350 * (GROUND - 8 - y0))) / 2350;
        const tau = Math.min(d, tLand);
        const p = particle(tau, x, y0, vx, vy);
        const spin = tau * (420 + i * 200);
        return <rect key={i} x={p.x - 40} y={p.y - 8} width={80} height={16} fill="#d1a273" stroke={INK} strokeWidth={5} transform={`rotate(${spin} ${p.x} ${p.y})`} />;
      })}
    </g>
  );
};
