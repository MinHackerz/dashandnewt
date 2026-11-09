import React from "react";
import { random } from "remotion";
import { GROUND, INK } from "../../rig/Stickman";
import { BALL_R, hillH, LEDGE_H, LEDGE_X, PEBBLE_H, R, SHELF_END, SLOPE_TOP } from "./timeline";

const deg = (r: number) => (r * 180) / Math.PI;

// ─── Landscape ────────────────────────────────────────────────────────────
export const Sky: React.FC<{ camX: number }> = ({ camX }) => (
  <g>
    <rect x={-3000} y={-3000} width={9000} height={GROUND + 3000} fill="#bfe6ff" />
    <circle cx={camX * 0.85 + 880} cy={260} r={70} fill="#ffd23f" stroke={INK} strokeWidth={6} />
    {[
      [-200, 120, 1],
      [700, 40, 0.8],
      [1500, 180, 1.1],
      [2300, 60, 0.9],
    ].map(([x, y, s]) => (
      <g key={x} transform={`translate(${x + camX * 0.7} ${y}) scale(${s})`} fill="#fff" stroke="#9cc9e6" strokeWidth={5}>
        <ellipse cx={0} cy={0} rx={110} ry={44} />
        <ellipse cx={-70} cy={14} rx={70} ry={34} />
        <ellipse cx={80} cy={12} rx={76} ry={36} />
      </g>
    ))}
    {/* far hills drift slower than the ground (parallax) */}
    {[0, 1, 2, 3, 4, 5].map((i) => {
      const x = camX * 0.6 + (((i * 700 - camX * 0.4) % 4200) + 4200) % 4200 - 1400;
      return <ellipse key={i} cx={x} cy={GROUND + 40} rx={430} ry={210} fill="#9fd08a" stroke="#7aa35a" strokeWidth={6} />;
    })}
  </g>
);

export const Ground: React.FC = () => (
  <g>
    <rect x={-3000} y={GROUND} width={9000} height={2500} fill="#8cc56f" />
    <line x1={-3000} y1={GROUND} x2={LEDGE_X} y2={GROUND} stroke={INK} strokeWidth={9} />
  </g>
);

// The hill: a 1 m rock step, a short shelf, then the slope up to the plateau.
export const Hill: React.FC = () => {
  const top = (h: number) => GROUND - h;
  const d = `M ${LEDGE_X} ${GROUND + 2} L ${LEDGE_X} ${top(LEDGE_H)} L ${SHELF_END} ${top(LEDGE_H)} L ${SLOPE_TOP.x} ${top(SLOPE_TOP.h)} L 4200 ${top(SLOPE_TOP.h)} L 4200 ${GROUND + 2} Z`;
  return (
    <g>
      <path d={d} fill="#93c96f" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
      {/* exposed rock face of the step */}
      <rect x={LEDGE_X} y={top(LEDGE_H) + 18} width={60} height={LEDGE_H - 18} fill="#b8b0a2" />
      <path d={`M ${LEDGE_X} ${top(LEDGE_H) + 18} L ${LEDGE_X + 60} ${top(LEDGE_H) + 18}`} stroke="#7d7466" strokeWidth={5} />
      {[0.35, 0.65].map((k) => (
        <path key={k} d={`M ${LEDGE_X + 8} ${top(LEDGE_H * k)} l 20 -8 l 18 6`} fill="none" stroke="#7d7466" strokeWidth={4} strokeLinecap="round" />
      ))}
      <line x1={LEDGE_X} y1={GROUND + 2} x2={LEDGE_X} y2={top(LEDGE_H)} stroke={INK} strokeWidth={9} strokeLinecap="round" />
      {[1720, 1880, 2050, 2190, 2400, 2700].map((x) => {
        const y = top(hillH(x));
        return <path key={x} d={`M ${x - 14} ${y} l 6 -20 l 6 16 l 6 -24 l 6 20`} fill="none" stroke="#5f8f42" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </g>
  );
};

export const Tufts: React.FC<{ xs: number[] }> = ({ xs }) => (
  <g>
    {xs.map((x) => (
      <path key={x} d={`M ${x - 14} ${GROUND} l 6 -22 l 6 18 l 6 -26 l 6 22 l 6 -16`} fill="none" stroke="#5f8f42" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    ))}
  </g>
);

export const Flowers: React.FC<{ xs: number[] }> = ({ xs }) => (
  <g stroke={INK} strokeWidth={3}>
    {xs.map((x, i) => (
      <g key={x} transform={`translate(${x} ${GROUND - 26})`}>
        <line x1={0} y1={0} x2={0} y2={26} stroke="#5f8f42" strokeWidth={4} />
        <circle r={9} fill={i % 2 ? "#ffd23f" : "#ff9fb0"} />
        <circle r={3.5} fill="#fff" />
      </g>
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

// ─── The boulder: granite, spots + a crack so its rolling is visible ──────
export const Boulder: React.FC<{ x: number; h: number; rot: number; bands?: number }> = ({ x, h, rot, bands = 0 }) => (
  <g transform={`translate(${x} ${GROUND - h})`}>
    <g transform={`rotate(${rot})`}>
      <path
        d={`M ${R} 0 C ${R} ${R * 0.6} ${R * 0.55} ${R * 1.02} 0 ${R} C ${-R * 0.6} ${R} ${-R * 1.02} ${R * 0.55} ${-R} 0 C ${-R * 0.98} ${-R * 0.6} ${-R * 0.55} ${-R * 1.03} 0 ${-R} C ${R * 0.6} ${-R} ${R * 1.01} ${-R * 0.55} ${R} 0 Z`}
        fill="#a9a29a"
        stroke={INK}
        strokeWidth={8}
      />
      <path d={`M ${-R * 0.5} ${-R * 0.75} q ${R * 0.4} ${-R * 0.2} ${R * 0.85} ${R * 0.05}`} fill="none" stroke="#d3cdc5" strokeWidth={7} strokeLinecap="round" />
      {[
        [-0.35, 0.3, 9],
        [0.4, -0.2, 7],
        [0.15, 0.55, 6],
        [-0.55, -0.15, 5],
        [0.55, 0.35, 5],
      ].map(([u, v, r], i) => (
        <circle key={i} cx={u * R} cy={v * R} r={r} fill="#7f786f" />
      ))}
      <path d={`M ${R * 0.2} ${-R * 0.1} l ${R * 0.22} ${R * 0.12} l ${R * 0.05} ${R * 0.24}`} fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    </g>
    {/* rope turns wound round its middle (drawn unrotated: the rope slides as it winds) */}
    {[...Array(Math.min(4, Math.ceil(bands)))].map((_, i) => {
      const w = Math.min(1, bands - i);
      const y = -6 + i * 12;
      const half = Math.sqrt(R * R - y * y) - 2;
      return <path key={i} d={`M ${-half} ${y} Q 0 ${y + 10} ${-half + 2 * half * w} ${y}`} fill="none" stroke="#c99a5a" strokeWidth={8} strokeLinecap="round" />;
    })}
  </g>
);

// Prop rock that kept boulder #1 from rolling
export const PropRock: React.FC<{ x: number; h: number; rot: number }> = ({ x, h, rot }) => (
  <g transform={`translate(${x} ${GROUND - h}) rotate(${rot})`}>
    <path d="M -22 8 L -18 -10 L -2 -18 L 16 -12 L 22 6 L 6 14 Z" fill="#8d867d" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
  </g>
);

export const Pebble: React.FC<{ x: number }> = ({ x }) => (
  <g transform={`translate(${x} ${GROUND})`}>
    <path d={`M -26 0 C -26 ${-PEBBLE_H * 0.9} -10 ${-PEBBLE_H} 0 ${-PEBBLE_H} C 14 ${-PEBBLE_H} 26 ${-PEBBLE_H * 0.7} 26 0 Z`} fill="#9a938a" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
  </g>
);

// ─── Football: squashes under load, spins with distance rolled ───────────
export const Ball: React.FC<{ x: number; h: number; rot: number; squash?: number; held?: boolean }> = ({ x, h, rot, squash = 1 }) => {
  const ry = BALL_R * squash;
  const rx = BALL_R * (1 + (1 - squash) * 0.8);
  return (
    <g transform={`translate(${x} ${GROUND - h + (BALL_R - ry)})`}>
      <g transform={`scale(${rx / BALL_R} ${ry / BALL_R}) rotate(${rot})`}>
        <circle r={BALL_R} fill="#fff" stroke={INK} strokeWidth={5} />
        <path d={`M 0 -8 L 7.6 -2.5 L 4.7 6.5 L -4.7 6.5 L -7.6 -2.5 Z`} fill={INK} />
        {[0, 72, 144, 216, 288].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <line x1={0} y1={-8} x2={0} y2={-BALL_R + 2} stroke={INK} strokeWidth={3} />
            <path d={`M -6 ${-BALL_R + 1} L 6 ${-BALL_R + 1}`} stroke={INK} strokeWidth={6} />
          </g>
        ))}
      </g>
    </g>
  );
};

// ─── Plank: a 4.2 m fence board. Drawn from its left end at `angle` (rad, + = left end up)
export const Plank: React.FC<{ x: number; h: number; angle: number; len: number }> = ({ x, h, angle, len }) => (
  <g transform={`translate(${x} ${GROUND - h}) rotate(${deg(angle)})`}>
    <rect x={0} y={-16} width={len} height={16} rx={4} fill="#d1a273" stroke={INK} strokeWidth={6} />
    {[0.22, 0.5, 0.78].map((k) => (
      <path key={k} d={`M ${len * k} -12 q 14 4 28 0`} fill="none" stroke="#a87a4e" strokeWidth={3} />
    ))}
  </g>
);

// ─── Rope: coil on the grass, or a line between two points ────────────────
export const RopeCoil: React.FC<{ x: number }> = ({ x }) => (
  <g transform={`translate(${x} ${GROUND - 10})`} fill="none" stroke="#c99a5a" strokeWidth={8}>
    <ellipse rx={40} ry={11} />
    <ellipse rx={32} ry={8} cy={-6} />
    <ellipse rx={24} ry={6} cy={-11} />
  </g>
);

export const RopeLine: React.FC<{ a: { x: number; y: number }; b: { x: number; y: number }; slack?: number }> = ({ a, b, slack = 0 }) => (
  <path
    d={`M ${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${(a.y + b.y) / 2 + slack} ${b.x} ${b.y}`}
    fill="none"
    stroke="#c99a5a"
    strokeWidth={8}
    strokeLinecap="round"
  />
);

// ─── The Bird (supporting cast): tiny, round, unbothered ─────────────────
export type BirdState = { x: number; y: number; facing: 1 | -1; flap: number; run: number; yawn: number; look: number };

export const Bird: React.FC<{ b: BirdState; t: number }> = ({ b, t }) => {
  const wing = b.flap > 0 ? Math.sin(t * 60) * 50 * b.flap : 0;
  const legSwing = b.run > 0 ? Math.sin(t * 45) * 9 * b.run : 0;
  return (
    <g transform={`translate(${b.x} ${b.y}) scale(${b.facing} 1)`}>
      {/* legs */}
      <g stroke="#e8902a" strokeWidth={3.5} strokeLinecap="round">
        <line x1={-4} y1={8} x2={-4 + legSwing} y2={20} />
        <line x1={5} y1={8} x2={5 - legSwing} y2={20} />
      </g>
      <ellipse cx={0} cy={-2} rx={17} ry={14} fill="#5aa9e6" stroke={INK} strokeWidth={4} />
      <ellipse cx={3} cy={3} rx={9} ry={7} fill="#e9f5ff" />
      {/* wing */}
      <path d="M -6 -4 q -14 -2 -16 8 q 10 4 16 -8" fill="#3d8fd1" stroke={INK} strokeWidth={3} transform={`rotate(${-wing} -6 -4)`} />
      {/* head */}
      <g transform={`translate(${8} ${-14}) rotate(${b.look * 20})`}>
        <circle r={10} fill="#5aa9e6" stroke={INK} strokeWidth={4} />
        <circle cx={3} cy={-2} r={2.6} fill={INK} />
        {b.yawn > 0 ? (
          <ellipse cx={11} cy={3} rx={5} ry={5 * b.yawn} fill="#ff9fb0" stroke={INK} strokeWidth={2.5} />
        ) : (
          <path d="M 8 0 L 17 3 L 8 6 Z" fill="#ffb347" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        )}
      </g>
      <path d="M -16 -4 l -9 -4 l 2 8 Z" fill="#3d8fd1" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
    </g>
  );
};

// ─── Effects ──────────────────────────────────────────────────────────────
export const Dust: React.FC<{ t: number; at: number; x: number; y?: number; dir?: number; seed: string; big?: number }> = ({ t, at, x, y = GROUND, dir = 0, seed, big = 1 }) => {
  const d = t - at;
  if (d < 0 || d > 0.7) return null;
  return (
    <g fill="#e9dcc3" stroke="#c2b08f" strokeWidth={3} opacity={1 - d / 0.7}>
      {[...Array(7)].map((_, i) => {
        const ang = Math.PI * (0.15 + 0.7 * random(`${seed}${i}`));
        const sp = (150 + 160 * random(`${seed}s${i}`)) * big;
        return <circle key={i} cx={x + Math.cos(ang) * sp * d * (dir || (i % 2 ? 1 : -1))} cy={y - 8 - Math.sin(ang) * sp * d * 0.5} r={(10 + d * 34) * big} />;
      })}
    </g>
  );
};

/** Cartoon impact burst (no text) */
export const Burst: React.FC<{ t: number; at: number; x: number; y: number; size?: number; color?: string }> = ({ t, at, x, y, size = 1, color = "#ffd23f" }) => {
  const d = t - at;
  if (d < 0 || d > 0.3) return null;
  const s = size * (0.6 + d * 2.5);
  const pts = [...Array(16)].map((_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 ? 26 : 60;
    return `${Math.cos(a) * r},${Math.sin(a) * r}`;
  });
  return <polygon points={pts.join(" ")} transform={`translate(${x} ${y}) scale(${s})`} fill={color} stroke={INK} strokeWidth={5} opacity={1 - d / 0.3} />;
};

/** Little motion lines around something squeaking/trembling */
export const Shiver: React.FC<{ x: number; y: number; r: number; t: number }> = ({ x, y, r, t }) => (
  <g stroke={INK} strokeWidth={4} strokeLinecap="round" opacity={0.7}>
    {[-1, 1].map((s) => (
      <g key={s} transform={`translate(${x + s * (r + 16 + Math.sin(t * 40) * 3)} ${y})`}>
        <line x1={0} y1={-14} x2={s * 8} y2={-4} />
        <line x1={0} y1={6} x2={s * 8} y2={16} />
      </g>
    ))}
  </g>
);
