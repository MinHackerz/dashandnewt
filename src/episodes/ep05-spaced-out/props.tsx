import React from "react";
import { random } from "remotion";
import { GROUND, INK } from "../../rig/Stickman";

const deg = (r: number) => (r * 180) / Math.PI;

// ─── Backgrounds ──────────────────────────────────────────────────────────
/** Deep space: seeded stars with a little parallax (drift = how far the camera has travelled). */
export const SpaceBg: React.FC<{ w: number; h: number; drift?: { x: number; y: number }; t: number }> = ({ w, h, drift = { x: 0, y: 0 }, t }) => (
  <g>
    <rect x={0} y={0} width={w} height={h} fill="#0b1026" />
    <ellipse cx={w * 0.7} cy={h * 0.35} rx={520} ry={260} fill="#3a2a6b" opacity={0.25} />
    <ellipse cx={w * 0.2} cy={h * 0.7} rx={420} ry={220} fill="#1f4a6b" opacity={0.25} />
    {[...Array(150)].map((_, i) => {
      const depth = 0.2 + 0.8 * random(`d${i}`);
      const x = ((((random(`x${i}`) * w - drift.x * depth * 0.15) % w) + w) % w);
      const y = ((((random(`y${i}`) * h - drift.y * depth * 0.15) % h) + h) % h);
      const tw = 0.6 + 0.4 * Math.sin(t * (1 + random(`t${i}`) * 3) + i);
      return <circle key={i} cx={x} cy={y} r={1 + depth * 2.6} fill="#fff" opacity={tw * (0.4 + 0.6 * depth)} />;
    })}
  </g>
);

export const GreenPlanet: React.FC<{ x: number; y: number; r: number; t: number }> = ({ x, y, r, t }) => (
  <g>
    <circle cx={x} cy={y} r={r * 1.08} fill="#8fe3c0" opacity={0.25} />
    <circle cx={x} cy={y} r={r} fill="#3d8fd1" stroke={INK} strokeWidth={10} />
    <clipPath id={`gp${Math.round(r)}`}>
      <circle cx={x} cy={y} r={r} />
    </clipPath>
    <g clipPath={`url(#gp${Math.round(r)})`}>
      <path d={`M ${x - r * 0.8} ${y - r * 0.3} q ${r * 0.3} ${-r * 0.4} ${r * 0.6} ${-r * 0.1} q ${r * 0.2} ${r * 0.3} ${-r * 0.1} ${r * 0.5} q ${-r * 0.4} ${r * 0.1} ${-r * 0.5} ${-r * 0.4} Z`} fill="#5cb85c" stroke={INK} strokeWidth={6} />
      <path d={`M ${x + r * 0.1} ${y + r * 0.2} q ${r * 0.4} ${-r * 0.2} ${r * 0.6} ${r * 0.15} q ${-r * 0.1} ${r * 0.45} ${-r * 0.45} ${r * 0.35} q ${-r * 0.25} ${-r * 0.2} ${-r * 0.15} ${-r * 0.5} Z`} fill="#6fc96f" stroke={INK} strokeWidth={6} />
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={x - r + ((t * 18 + i * r * 0.8) % (2 * r))} cy={y - r * 0.55 + i * r * 0.5} rx={r * 0.28} ry={r * 0.07} fill="#fff" opacity={0.75} />
      ))}
    </g>
  </g>
);

export const GreyPlanet: React.FC<{ x: number; y: number; r: number }> = ({ x, y, r }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="#9a958d" stroke={INK} strokeWidth={10} />
    {[
      [-0.35, -0.2, 0.22],
      [0.3, 0.25, 0.16],
      [0.1, -0.45, 0.1],
      [-0.2, 0.45, 0.12],
      [0.5, -0.15, 0.08],
    ].map(([u, v, k], i) => (
      <g key={i}>
        <circle cx={x + u * r} cy={y + v * r} r={k * r} fill="#857f76" stroke={INK} strokeWidth={5} />
        <path d={`M ${x + u * r - k * r * 0.7} ${y + v * r - k * r * 0.2} a ${k * r * 0.7} ${k * r * 0.5} 0 0 1 ${k * r * 1.4} 0`} fill="none" stroke="#b8b2a8" strokeWidth={5} />
      </g>
    ))}
  </g>
);

// ─── Earth launch ─────────────────────────────────────────────────────────
export const LaunchTower: React.FC<{ x: number; lights: number }> = ({ x, lights }) => (
  <g stroke={INK} strokeWidth={7}>
    <rect x={x} y={GROUND - 1150} width={70} height={1150} fill="#c9d3dc" />
    {[...Array(12)].map((_, i) => (
      <path key={i} d={`M ${x} ${GROUND - 1150 + i * 96} l 70 96 M ${x + 70} ${GROUND - 1150 + i * 96} l -70 96`} strokeWidth={4} />
    ))}
    {[0, 1, 2].map((i) => (
      <circle key={i} cx={x + 35} cy={GROUND - 1250 + i * 70 - 0} r={24} fill={i < lights ? "#3ddc84" : "#4a4a4a"} />
    ))}
  </g>
);

// ─── The rocket (vertical). `window` children are drawn inside the round window ──
export const ROCKET_W = 560;
export const ROCKET_H = 1180;
export const WINDOW = { dy: -880, r: 250 }; // window centre above the rocket's base
export const Rocket: React.FC<{ x: number; base: number; flame: number; t: number; heat?: number; gauge?: number; lever?: number; children?: React.ReactNode }> = ({
  x,
  base,
  flame,
  t,
  heat = 0,
  gauge = 0.3,
  lever = 0,
  children,
}) => {
  const w = ROCKET_W / 2;
  const top = base - ROCKET_H;
  const wy = base + WINDOW.dy;
  const fl = flame * (1 + 0.15 * Math.sin(t * 40));
  return (
    <g>
      {/* flame */}
      {flame > 0 ? (
        <g>
          <path d={`M ${x - 150} ${base} Q ${x} ${base + 520 * fl} ${x + 150} ${base} Z`} fill="#ffd23f" stroke={INK} strokeWidth={7} />
          <path d={`M ${x - 80} ${base} Q ${x} ${base + 320 * fl} ${x + 80} ${base} Z`} fill="#ff8a1f" />
        </g>
      ) : null}
      {/* fins */}
      <path d={`M ${x - w} ${base - 280} L ${x - w - 150} ${base + 30} L ${x - w} ${base - 20} Z`} fill="#e63946" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      <path d={`M ${x + w} ${base - 280} L ${x + w + 150} ${base + 30} L ${x + w} ${base - 20} Z`} fill="#e63946" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      {/* body */}
      <path
        d={`M ${x - w} ${base} L ${x - w} ${top + 360} Q ${x - w} ${top + 60} ${x} ${top} Q ${x + w} ${top + 60} ${x + w} ${top + 360} L ${x + w} ${base} Z`}
        fill={heat > 0 ? `rgb(${245},${245 - 120 * heat},${245 - 170 * heat})` : "#f5f5f5"}
        stroke={INK}
        strokeWidth={9}
      />
      <path d={`M ${x - w * 0.62} ${top + 150} Q ${x} ${top - 6} ${x + w * 0.62} ${top + 150}`} fill="#e63946" stroke={INK} strokeWidth={8} />
      <rect x={x - w} y={base - 90} width={ROCKET_W} height={40} fill="#e63946" stroke={INK} strokeWidth={6} />
      {/* rivets popping once it overheats */}
      {[...Array(10)].map((_, i) => {
        const yy = base - 200 - i * 50;
        const popped = heat > 0.4 + i * 0.05;
        return popped ? (
          <g key={i} stroke={INK} strokeWidth={4}>
            <line x1={x - w + 4} y1={yy} x2={x - w - 10 - ((t * 60 + i * 9) % 30)} y2={yy - 12} />
            <line x1={x + w - 4} y1={yy + 20} x2={x + w + 10 + ((t * 70 + i * 7) % 30)} y2={yy + 8} />
          </g>
        ) : (
          <g key={i} fill={INK}>
            <circle cx={x - w + 18} cy={yy} r={5} />
            <circle cx={x + w - 18} cy={yy + 20} r={5} />
          </g>
        );
      })}
      {/* window with the crew inside */}
      <circle cx={x} cy={wy} r={WINDOW.r + 26} fill="#c9d3dc" stroke={INK} strokeWidth={9} />
      <clipPath id="rocketWindow">
        <circle cx={x} cy={wy} r={WINDOW.r} />
      </clipPath>
      <circle cx={x} cy={wy} r={WINDOW.r} fill="#2b3a55" />
      <g clipPath="url(#rocketWindow)">
        {children}
        {/* control panel: throttle lever + gauge */}
        <rect x={x - WINDOW.r} y={wy + 120} width={WINDOW.r * 2} height={200} fill="#5a6b80" stroke={INK} strokeWidth={6} />
        <g transform={`translate(${x - 90} ${wy + 190})`}>
          <path d="M -60 0 A 60 60 0 0 1 60 0" fill="#fff" stroke={INK} strokeWidth={6} />
          <path d="M 30 -52 A 60 60 0 0 1 60 0" fill="none" stroke="#e63946" strokeWidth={14} />
          <line x1={0} y1={0} x2={-56 * Math.cos(Math.PI * gauge)} y2={-56 * Math.sin(Math.PI * gauge)} stroke={INK} strokeWidth={6} strokeLinecap="round" />
        </g>
        <g transform={`translate(${x + 120} ${wy + 200}) rotate(${-40 + 80 * lever})`}>
          <line x1={0} y1={0} x2={0} y2={-110} stroke={INK} strokeWidth={14} strokeLinecap="round" />
          <circle cx={0} cy={-110} r={22} fill="#e63946" stroke={INK} strokeWidth={6} />
        </g>
      </g>
      <path d={`M ${x - WINDOW.r * 0.6} ${wy - WINDOW.r * 0.55} q ${WINDOW.r * 0.3} ${-WINDOW.r * 0.3} ${WINDOW.r * 0.7} ${-WINDOW.r * 0.3}`} fill="none" stroke="#fff" strokeWidth={12} strokeLinecap="round" opacity={0.6} />
    </g>
  );
};

/** One flying chunk of the burst rocket (drifts at constant velocity and spins: no air to slow it). */
export const Chunk: React.FC<{ x: number; y: number; rot: number; kind: 0 | 1 | 2 | 3 }> = ({ x, y, rot, kind }) => {
  const shapes = [
    <path key="n" d="M -120 60 Q -110 -40 0 -110 Q 110 -40 120 60 Z" fill="#e63946" />,
    <path key="l" d="M -40 -200 L 60 -170 L 40 220 L -60 200 Z" fill="#f5f5f5" />,
    <path key="r" d="M -60 -170 L 40 -200 L 60 200 L -40 220 Z" fill="#f5f5f5" />,
    <path key="f" d="M -40 -80 L 40 -40 L 70 90 L -30 40 Z" fill="#e63946" />,
  ];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} stroke={INK} strokeWidth={8} strokeLinejoin="round">
      {shapes[kind]}
    </g>
  );
};

export const Flash: React.FC<{ x: number; y: number; t: number; at: number }> = ({ x, y, t, at }) => {
  const d = t - at;
  if (d < 0 || d > 0.6) return null;
  const k = d / 0.6;
  return (
    <g opacity={1 - k}>
      <circle cx={x} cy={y} r={200 + 900 * k} fill="#fff6c9" />
      <circle cx={x} cy={y} r={120 + 500 * k} fill="#ffd23f" />
    </g>
  );
};

// ─── Small floating things ────────────────────────────────────────────────
export const Wrench: React.FC<{ x: number; y: number; rot: number }> = ({ x, y, rot }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`} stroke={INK} strokeWidth={5} strokeLinejoin="round">
    <rect x={-8} y={-50} width={16} height={100} rx={6} fill="#9aa5b1" />
    <path d="M -22 -50 L -22 -78 L -8 -68 L 8 -68 L 22 -78 L 22 -50 Z" fill="#9aa5b1" />
  </g>
);

export const Sandwich: React.FC<{ x: number; y: number; rot: number }> = ({ x, y, rot }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`} stroke={INK} strokeWidth={4} strokeLinejoin="round">
    <path d="M -24 -6 L 24 -6 L 26 8 L -26 8 Z" fill="#f2c27b" />
    <path d="M -25 1 L 25 1" stroke="#6fbf4a" strokeWidth={6} />
    <path d="M -22 -14 Q 0 -24 22 -14 L 24 -6 L -24 -6 Z" fill="#f2c27b" />
  </g>
);

export const Bolt: React.FC<{ x: number; y: number; rot: number }> = ({ x, y, rot }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`} stroke={INK} strokeWidth={4}>
    <rect x={-6} y={-20} width={12} height={34} fill="#9aa5b1" />
    <rect x={-14} y={-26} width={28} height={10} fill="#9aa5b1" />
  </g>
);

/**
 * The emergency flare: a red tube that is really a tiny rocket. Unlit it blinks; lit, hot gas
 * shoots out of the `dir` end (radians, screen) — and pushes whoever holds it the other way.
 */
export const Flare: React.FC<{ x: number; y: number; dir: number; lit: number; t: number; blink?: boolean }> = ({ x, y, dir, lit, t, blink }) => {
  const on = blink && Math.floor(t * 2.5) % 2 === 0;
  const plume = lit * (1 + 0.2 * Math.sin(t * 50));
  return (
    <g transform={`translate(${x} ${y}) rotate(${deg(dir)})`}>
      {lit > 0 ? (
        <g>
          <circle cx={0} cy={0} r={260 * lit} fill="#ff6b3d" opacity={0.18} />
          <circle cx={0} cy={0} r={130 * lit} fill="#ffb37a" opacity={0.3} />
          <path d={`M 34 -18 Q ${34 + 260 * plume} 0 34 18 Z`} fill="#ffd23f" stroke={INK} strokeWidth={5} />
          <path d={`M 34 -10 Q ${34 + 150 * plume} 0 34 10 Z`} fill="#fff6c9" />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const u = (t * 3 + i / 6) % 1;
            return <circle key={i} cx={40 + u * 300 * lit} cy={Math.sin(i * 7 + t * 9) * 30 * u} r={6 * (1 - u)} fill="#ffd23f" />;
          })}
        </g>
      ) : null}
      <rect x={-36} y={-13} width={72} height={26} rx={6} fill="#e63946" stroke={INK} strokeWidth={5} />
      <rect x={20} y={-15} width={16} height={30} rx={4} fill="#4a4a4a" stroke={INK} strokeWidth={4} />
      {on ? <circle cx={-26} cy={0} r={34} fill="#ff4d4d" opacity={0.45} /> : null}
      <circle cx={-26} cy={0} r={8} fill={on || lit > 0 ? "#fff6c9" : "#8a2a2a"} stroke={INK} strokeWidth={3} />
    </g>
  );
};

export const Meteor: React.FC<{ x: number; y: number; s: number; rot: number }> = ({ x, y, s, rot }) => (
  <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`} stroke={INK} strokeWidth={9} strokeLinejoin="round">
    <path d="M -150 -30 L -100 -120 L 10 -150 L 120 -100 L 160 10 L 110 120 L -10 150 L -120 100 Z" fill="#7d6a58" />
    <circle cx={-40} cy={-40} r={34} fill="#6a594a" strokeWidth={6} />
    <circle cx={60} cy={40} r={24} fill="#6a594a" strokeWidth={6} />
    <circle cx={-60} cy={70} r={16} fill="#6a594a" strokeWidth={5} />
  </g>
);

// ─── Surfaces ─────────────────────────────────────────────────────────────
export const GreenSurface: React.FC<{ camX: number }> = ({ camX }) => (
  <g>
    <rect x={-3000} y={-4000} width={9000} height={GROUND + 4000} fill="#9fd8e8" />
    <circle cx={camX * 0.8 + 850} cy={300} r={60} fill="#fff6c9" stroke={INK} strokeWidth={6} />
    <circle cx={camX * 0.8 + 250} cy={460} r={30} fill="#e9dcff" stroke={INK} strokeWidth={5} />
    {[0, 1, 2].map((i) => (
      <ellipse key={i} cx={camX * 0.6 + i * 520 - 200} cy={GROUND + 30} rx={420} ry={210} fill="#7fd09a" stroke="#5aa874" strokeWidth={6} />
    ))}
    <rect x={-3000} y={GROUND} width={9000} height={2500} fill="#6cc46c" />
    <line x1={-3000} y1={GROUND} x2={6000} y2={GROUND} stroke={INK} strokeWidth={9} />
    {[120, 300, 760, 960].map((x, i) => (
      <g key={x} transform={`translate(${x} ${GROUND})`} stroke={INK} strokeWidth={5}>
        <line x1={0} y1={0} x2={0} y2={-70 - i * 8} stroke="#3f8f3f" strokeWidth={6} />
        <path d={`M 0 ${-70 - i * 8} m -18 0 a 18 18 0 1 1 36 0 a 18 18 0 1 1 -36 0`} fill={["#ff7ab6", "#ffd23f", "#b48cff", "#ff9f5a"][i]} />
        <path d={`M -6 ${-74 - i * 8} q 6 -10 12 0`} fill="none" strokeWidth={3} />
      </g>
    ))}
  </g>
);

/** A little alien sprout: proof there's life here. It waves; later it facepalms. */
export const Sprout: React.FC<{ x: number; t: number; wave: number; facepalm: number }> = ({ x, t, wave, facepalm }) => {
  const arm = facepalm > 0 ? -150 * facepalm : -40 - 50 * wave * (0.5 + 0.5 * Math.sin(t * 9));
  return (
    <g transform={`translate(${x} ${GROUND})`} stroke={INK} strokeWidth={5} strokeLinejoin="round">
      <path d="M 0 0 Q -6 -60 0 -110" fill="none" stroke="#3f8f3f" strokeWidth={8} />
      <ellipse cx={0} cy={-150} rx={46} ry={52} fill="#9be37a" />
      <circle cx={-14} cy={-158} r={9} fill="#fff" />
      <circle cx={14} cy={-158} r={9} fill="#fff" />
      <circle cx={-13} cy={-156} r={4} fill={INK} />
      <circle cx={15} cy={-156} r={4} fill={INK} />
      <path d="M -10 -132 q 10 8 20 0" fill="none" strokeWidth={4} />
      <path d="M 0 -202 q 10 -30 30 -24" fill="none" stroke="#3f8f3f" strokeWidth={5} />
      <g transform={`translate(30 -80) rotate(${arm})`}>
        <path d="M 0 0 L 60 0" stroke="#3f8f3f" strokeWidth={7} strokeLinecap="round" />
        <ellipse cx={66} cy={0} rx={14} ry={9} fill="#9be37a" />
      </g>
    </g>
  );
};

export const GreySurface: React.FC<{ camX: number; t: number }> = ({ camX, t }) => (
  <g>
    <rect x={-3000} y={-4000} width={9000} height={GROUND + 4000} fill="#0b1026" />
    {[...Array(60)].map((_, i) => (
      <circle key={i} cx={(random(`gx${i}`) * 2400 - 600) + camX * 0.9} cy={random(`gy${i}`) * 1200 - 200} r={1.5 + random(`gr${i}`) * 2} fill="#fff" opacity={0.5 + 0.5 * Math.sin(t * 2 + i)} />
    ))}
    {/* the green planet, far away in the black sky */}
    <GreenPlanet x={camX * 0.9 + 230} y={260} r={90} t={t} />
    <rect x={-3000} y={GROUND} width={9000} height={2500} fill="#9a958d" />
    <line x1={-3000} y1={GROUND} x2={6000} y2={GROUND} stroke={INK} strokeWidth={9} />
    {[-80, 380, 1150].map((x) => (
      <ellipse key={x} cx={x} cy={GROUND + 60} rx={110} ry={26} fill="#857f76" stroke={INK} strokeWidth={5} />
    ))}
  </g>
);

/** Crater + rubble mound; `k` grows 0→1 at impact. A scarf tail pokes out (cartoon, non-graphic). */
export const Crater: React.FC<{ x: number; k: number; scarf: boolean }> = ({ x, k, scarf }) => (
  <g transform={`translate(${x} ${GROUND})`} stroke={INK} strokeWidth={8} strokeLinejoin="round">
    <ellipse cx={0} cy={18} rx={380 * k} ry={70 * k} fill="#5f5a53" />
    <path d={`M ${-420 * k} 10 Q ${-300 * k} ${-90 * k} ${-180 * k} -10 M ${180 * k} -10 Q ${300 * k} ${-90 * k} ${420 * k} 10`} fill="#857f76" />
    <path d={`M ${-150 * k} 20 L ${-90 * k} ${-60 * k} L ${-10 * k} ${-90 * k} L ${90 * k} ${-70 * k} L ${160 * k} 20 Z`} fill="#7d6a58" />
    {scarf ? (
      <g stroke={INK} strokeLinecap="round" fill="none">
        <path d="M 40 -70 q 30 -40 70 -30 q 20 6 40 -6" strokeWidth={24} />
        <path d="M 40 -70 q 30 -40 70 -30 q 20 6 40 -6" stroke="#ff8a1f" strokeWidth={14} />
      </g>
    ) : null}
  </g>
);

/** Cartoon ghost with Dash's orange scarf: floats, sways, waves bye. */
export const Ghost: React.FC<{ x: number; y: number; t: number; wave: number; s?: number; opacity?: number }> = ({ x, y, t, wave, s = 1, opacity = 0.92 }) => {
  const sway = Math.sin(t * 2.2) * 10;
  const arm = -60 - 60 * wave * (0.5 + 0.5 * Math.sin(t * 10));
  return (
    <g transform={`translate(${x + sway} ${y}) scale(${s})`} opacity={opacity} stroke={INK} strokeWidth={6} strokeLinejoin="round">
      <path d={`M -90 60 L -90 -40 Q -90 -150 0 -150 Q 90 -150 90 -40 L 90 60 q -15 ${20 + Math.sin(t * 6) * 8} -30 0 q -15 -20 -30 0 q -15 20 -30 0 q -15 -20 -30 0 q -15 20 -30 0 q -15 -20 -30 0 Z`} fill="#f7fbff" />
      <ellipse cx={-28} cy={-60} rx={11} ry={16} fill={INK} />
      <ellipse cx={28} cy={-60} rx={11} ry={16} fill={INK} />
      <path d="M -18 -22 q 18 14 36 0" fill="none" strokeWidth={5} />
      {/* the scarf: that's how you know it's Dash */}
      <path d="M -70 0 Q 0 22 70 0" fill="none" stroke={INK} strokeWidth={26} strokeLinecap="round" />
      <path d="M -70 0 Q 0 22 70 0" fill="none" stroke="#ff8a1f" strokeWidth={16} strokeLinecap="round" />
      <path d="M 50 8 q 30 30 60 20" fill="none" stroke={INK} strokeWidth={24} strokeLinecap="round" />
      <path d="M 50 8 q 30 30 60 20" fill="none" stroke="#ff8a1f" strokeWidth={14} strokeLinecap="round" />
      <g transform={`translate(-88 -10) rotate(${arm})`}>
        <path d="M 0 0 q -30 -10 -60 0" fill="#f7fbff" />
      </g>
      <ellipse cx={0} cy={-185} rx={44} ry={10} fill="none" stroke="#ffd23f" strokeWidth={7} />
    </g>
  );
};

/** Moon dust in a vacuum: no air to billow — every grain flies a clean parabola and lands. */
export const VacuumDust: React.FC<{ x: number; t: number; at: number; g: number; n?: number; seed: string }> = ({ x, t, at, g, n = 40, seed }) => {
  const d = t - at;
  if (d < 0) return null;
  return (
    <g fill="#b8b2a8" stroke={INK} strokeWidth={3}>
      {[...Array(n)].map((_, i) => {
        const ang = Math.PI * (0.08 + 0.84 * random(`${seed}a${i}`));
        const v = 500 + 900 * random(`${seed}v${i}`);
        const vx = Math.cos(ang) * v;
        const vy = Math.sin(ang) * v;
        const tLand = (2 * vy) / g;
        const tau = Math.min(d, tLand);
        const px = x + vx * tau;
        const py = GROUND - (vy * tau - 0.5 * g * tau * tau);
        return <circle key={i} cx={px} cy={py} r={6 + 8 * random(`${seed}r${i}`)} />;
      })}
    </g>
  );
};
