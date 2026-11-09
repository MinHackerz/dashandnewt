import React from "react";
import { random } from "remotion";
import { num } from "../../lib/kf";
import { GROUND, INK } from "../../rig/Stickman";
import { FONT_STACK } from "../../shared/ui";
import { eraAt, isRinging, SLAPS, warpProgress, WARPS, WARP_LEN } from "./timeline";

// ─── Back wall, window, calendar, plant, door ─────────────────────────────
const WALL = ["#fdf1dc", "#fdf1dc", "#ece6f2", "#e4dccd"];
const SKY = ["#bfe4ff", "#bfe4ff", "#d4dde8", "#c9b6ff"];
const CAL = [
  { top: "JUNE", big: "MON" },
  { top: "JUNE", big: "TUE" },
  { top: "YEAR", big: "2034" },
  { top: "YEAR", big: "2074" },
];

const Window: React.FC<{ t: number; era: number }> = ({ t, era }) => {
  const w = warpProgress(t);
  const flicker = w >= 0 ? (Math.sin(t * 60) > 0 ? "#1d2440" : "#ffe9a8") : SKY[era];
  const x = 450;
  const y = 610;
  return (
    <g>
      <clipPath id="win">
        <rect x={x} y={y} width={250} height={220} />
      </clipPath>
      <rect x={x} y={y} width={250} height={220} fill={flicker} />
      <g clipPath="url(#win)">
        {w < 0 && era <= 1 ? <circle cx={x + 190} cy={y + 60} r={30} fill="#ffd23f" stroke={INK} strokeWidth={5} /> : null}
        {w < 0 && era === 1 ? (
          <path d={`M ${x + 40 + ((t * 60) % 260)} ${y + 90} q 10 -10 20 0 q 10 -10 20 0`} fill="none" stroke={INK} strokeWidth={4} />
        ) : null}
        {w < 0 && era === 2
          ? [...Array(14)].map((_, i) => (
              <circle key={i} cx={x + random(`sx${i}`) * 250} cy={y + ((random(`sy${i}`) * 220 + t * 60) % 220)} r={4} fill="#fff" />
            ))
          : null}
        {w < 0 && era === 3 ? (
          <g transform={`translate(${x - 80 + ((t * 120) % 420)} ${y + 80})`}>
            <path d="M 0 0 L 70 0 Q 80 -24 50 -26 L 20 -26 Q 6 -24 0 0 Z" fill="#ff8fab" stroke={INK} strokeWidth={4} />
            <path d="M -4 6 L 12 6 M 58 6 L 74 6" stroke="#7cc8ff" strokeWidth={6} strokeLinecap="round" />
          </g>
        ) : null}
      </g>
      <rect x={x} y={y} width={250} height={220} fill="none" stroke={INK} strokeWidth={9} />
      <line x1={x + 125} y1={y} x2={x + 125} y2={y + 220} stroke={INK} strokeWidth={6} />
      <line x1={x} y1={y + 110} x2={x + 250} y2={y + 110} stroke={INK} strokeWidth={6} />
      <path d={`M ${x - 30} ${y - 20} Q ${x + 20} ${y + 120} ${x - 10} ${y + 250} L ${x - 40} ${y + 250} L ${x - 40} ${y - 20} Z`} fill="#ff9f6b" stroke={INK} strokeWidth={5} />
      <path d={`M ${x + 280} ${y - 20} Q ${x + 230} ${y + 120} ${x + 260} ${y + 250} L ${x + 290} ${y + 250} L ${x + 290} ${y - 20} Z`} fill="#ff9f6b" stroke={INK} strokeWidth={5} />
      <line x1={x - 50} y1={y - 20} x2={x + 300} y2={y - 20} stroke={INK} strokeWidth={8} strokeLinecap="round" />
    </g>
  );
};

const Calendar: React.FC<{ era: number }> = ({ era }) => {
  const c = CAL[era];
  return (
    <g transform={`translate(70 0)${era === 3 ? " rotate(-7 245 630)" : ""}`}>
      <rect x={180} y={630} width={130} height={160} rx={6} fill="#fff" stroke={INK} strokeWidth={6} />
      <rect x={180} y={630} width={130} height={42} rx={6} fill="#e63946" stroke={INK} strokeWidth={6} />
      <text x={245} y={662} textAnchor="middle" fontFamily={FONT_STACK} fontSize={26} fill="#fff">
        {c.top}
      </text>
      <text x={245} y={752} textAnchor="middle" fontFamily={FONT_STACK} fontSize={c.big.length > 3 ? 46 : 54} fill={INK}>
        {c.big}
      </text>
      <circle cx={245} cy={622} r={6} fill={INK} />
    </g>
  );
};

const Plant: React.FC<{ era: number; t: number }> = ({ era, t }) => {
  const potX = 175;
  const sway = Math.sin(t * 1.5) * 3;
  return (
    <g>
      {era <= 1 ? (
        <g stroke={INK} strokeWidth={5} strokeLinecap="round">
          <line x1={potX} y1={GROUND - 70} x2={potX + sway} y2={GROUND - 130} />
          <ellipse cx={potX - 18 + sway} cy={GROUND - 118} rx={18} ry={9} fill="#7aa35a" />
          <ellipse cx={potX + 18 + sway} cy={GROUND - 130} rx={18} ry={9} fill="#7aa35a" />
        </g>
      ) : null}
      {era === 2 ? (
        <g>
          <path d={`M ${potX} ${GROUND - 70} C ${potX - 40} 1000, ${potX + 60} 700, ${potX - 10} 540 S 360 500, 560 520`} fill="none" stroke="#4f7a36" strokeWidth={12} strokeLinecap="round" />
          {[...Array(12)].map((_, i) => {
            const y = GROUND - 120 - i * 75;
            const x = potX + Math.sin(i * 1.3) * 34;
            return <ellipse key={i} cx={x + (i % 2 ? 26 : -26)} cy={y} rx={24} ry={11} fill="#7aa35a" stroke={INK} strokeWidth={4} transform={`rotate(${i % 2 ? 25 : -25} ${x} ${y})`} />;
          })}
        </g>
      ) : null}
      {era === 3 ? (
        <g>
          <path d={`M ${potX - 30} ${GROUND - 70} C ${potX - 40} 900, ${potX + 20} 600, ${potX - 20} 300 L ${potX + 30} 300 C ${potX + 50} 600, ${potX + 20} 900, ${potX + 30} ${GROUND - 70} Z`} fill="#8a5a3b" stroke={INK} strokeWidth={7} />
          <path d={`M ${potX} 640 Q 300 560 420 545 M ${potX} 560 Q 80 500 40 470`} fill="none" stroke="#8a5a3b" strokeWidth={18} strokeLinecap="round" />
          {[
            [110, 470],
            [230, 450],
            [350, 500],
            [440, 545],
            [60, 540],
            [270, 560],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={58} fill="#6f9a4c" stroke={INK} strokeWidth={6} />
          ))}
          {/* bird's nest with a tiny bird */}
          <path d="M 300 560 q 40 30 80 0 Z" fill="#b07d4f" stroke={INK} strokeWidth={5} />
          <circle cx={340} cy={545} r={14} fill="#5aa9e6" stroke={INK} strokeWidth={4} />
          <path d="M 352 542 l 12 4 l -12 4 Z" fill="#ffb703" stroke={INK} strokeWidth={2} />
        </g>
      ) : null}
      <path d={`M ${potX - 38} ${GROUND - 72} L ${potX + 38} ${GROUND - 72} L ${potX + 28} ${GROUND} L ${potX - 28} ${GROUND} Z`} fill="#d2693c" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
    </g>
  );
};

const DOOR = { x1: 860, x2: 990, top: 900 };
const doorOpen = (t: number) =>
  Math.max(
    num(t, [
      [7.85, 0],
      [7.95, 1, "out"],
      [8.5, 1],
      [8.6, 0, "in"],
    ]),
    num(t, [
      [15.15, 0],
      [15.25, 1, "out"],
      [15.8, 1],
      [15.9, 0, "in"],
    ]),
    num(t, [
      [19.55, 0],
      [19.7, 1, "out"],
      [20.8, 1],
      [21.0, 0, "in"],
    ]),
    num(t, [
      [28.9, 0],
      [29.1, 1, "out"],
    ]),
  );

export const DoorFrame: React.FC<{ t: number }> = ({ t }) => {
  const o = doorOpen(t);
  const sunny = t > 28.9;
  return (
    <g>
      <rect x={DOOR.x1} y={DOOR.top} width={DOOR.x2 - DOOR.x1} height={GROUND - DOOR.top} fill={sunny ? "#fff3b0" : "#4a3f35"} stroke={INK} strokeWidth={8} />
      {sunny ? <path d={`M ${DOOR.x1} ${GROUND} L ${DOOR.x1 - 260 * o} ${GROUND + 200} L ${DOOR.x2} ${GROUND + 200} L ${DOOR.x2} ${GROUND} Z`} fill="#fff3b0" opacity={0.6 * o} /> : null}
      {/* door panel swings open (narrows toward the hinge on the right) */}
      <rect x={DOOR.x1 + (DOOR.x2 - DOOR.x1) * o * 0.85} y={DOOR.top} width={(DOOR.x2 - DOOR.x1) * (1 - o * 0.85)} height={GROUND - DOOR.top} fill="#b07d4f" stroke={INK} strokeWidth={7} />
      {o < 0.5 ? <circle cx={DOOR.x1 + 22} cy={1150} r={9} fill="#ffd23f" stroke={INK} strokeWidth={4} /> : null}
    </g>
  );
};

const Cobwebs: React.FC<{ era: number }> = ({ era }) => {
  if (era < 2) return null;
  const web = (x: number, y: number, s: number, flip = 1) => (
    <g transform={`translate(${x} ${y}) scale(${flip * s} ${s})`} stroke="#8d8d8d" strokeWidth={2.5} fill="none">
      <path d="M 0 0 L 90 0 M 0 0 L 0 90 M 0 0 L 70 50 M 0 0 L 50 70" />
      <path d="M 30 0 Q 26 18 21 15 Q 18 26 0 30 M 60 0 Q 52 30 42 30 Q 30 44 0 60" />
    </g>
  );
  return (
    <g>
      {web(450, 590, era === 3 ? 1.4 : 1)}
      {web(700, 590, era === 3 ? 1.4 : 1, -1)}
      {web(860, 900, 1.1)}
      {era === 3 ? web(250, 630, 1.2) : null}
    </g>
  );
};

export const Backdrop: React.FC<{ t: number }> = ({ t }) => {
  const era = eraAt(t);
  return (
    <g>
      <rect x={-800} y={-800} width={2700} height={GROUND + 800} fill={WALL[era]} />
      {[...Array(16)].map((_, i) => (
        <line key={i} x1={-200 + i * 90} y1={-800} x2={-200 + i * 90} y2={GROUND} stroke="#000" strokeOpacity={0.03} strokeWidth={30} />
      ))}
      <rect x={-800} y={GROUND} width={2700} height={900} fill="#d9b38c" />
      {[...Array(8)].map((_, i) => (
        <line key={i} x1={-800} y1={GROUND + 60 + i * 70} x2={1900} y2={GROUND + 60 + i * 70} stroke="#b88d63" strokeWidth={5} />
      ))}
      <Window t={t} era={era} />
      <Calendar era={era} />
      <Plant era={era} t={t} />
      <DoorFrame t={t} />
      <Cobwebs era={era} />
      <line x1={-800} y1={GROUND} x2={1900} y2={GROUND} stroke={INK} strokeWidth={9} />
      {era === 3
        ? [...Array(18)].map((_, i) => (
            <circle key={i} cx={(random(`dx${i}`) * 900 + t * 8 * (i % 3)) % 1000} cy={500 + ((random(`dy${i}`) * 800 + t * 20) % 800)} r={3} fill="#a89880" opacity={0.6} />
          ))
        : null}
    </g>
  );
};

// ─── Bed (frame behind the sleeper, blanket in front) ─────────────────────
const MATTRESS_Y = 1150;

export const BedBack: React.FC = () => (
  <g stroke={INK} strokeWidth={8} strokeLinejoin="round">
    <rect x={612} y={990} width={34} height={GROUND - 990} rx={14} fill="#a86b42" />
    <rect x={218} y={1080} width={30} height={GROUND - 1080} rx={12} fill="#a86b42" />
    <rect x={240} y={MATTRESS_Y + 50} width={380} height={40} fill="#a86b42" />
    <rect x={240} y={MATTRESS_Y} width={380} height={55} rx={10} fill="#fffaf0" />
    <ellipse cx={575} cy={MATTRESS_Y - 12} rx={46} ry={26} fill="#fff" />
  </g>
);

export const Blanket: React.FC<{ t: number; heroInBed: boolean; sitting: number }> = ({ t, heroInBed, sitting }) => {
  const era = eraAt(t);
  // lying: covers up to the shoulders; sitting: up to the waist; empty: flat
  const edge = heroInBed ? 530 - sitting * 125 : 600;
  const bump = heroInBed ? 40 - sitting * 15 : 6;
  const top = MATTRESS_Y - 18;
  const breath = heroInBed && sitting < 0.5 ? Math.sin(t * 3.2) * 4 : 0;
  const d = `M 232 ${MATTRESS_Y + 60} L 232 ${top} Q ${(232 + edge) / 2} ${top - bump - breath} ${edge} ${top + 2} Q ${edge + 14} ${top + 30} ${edge - 4} ${MATTRESS_Y + 60} Z`;
  return (
    <g>
      <path d={d} fill={era === 3 ? "#8aa0b8" : "#5b8fd6"} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      <path d={`M 260 ${top + 20} L ${edge - 20} ${top + 20}`} stroke="#fff" strokeOpacity={0.6} strokeWidth={8} strokeDasharray="18 16" />
    </g>
  );
};

export const Nightstand: React.FC = () => (
  <g stroke={INK} strokeWidth={8} strokeLinejoin="round">
    <rect x={662} y={1200} width={140} height={GROUND - 1200} fill="#c08a5c" />
    <rect x={652} y={1190} width={160} height={20} rx={5} fill="#a86b42" />
    <rect x={680} y={1240} width={104} height={50} rx={6} fill="#d39a69" />
    <circle cx={732} cy={1265} r={6} fill={INK} />
  </g>
);

// ─── The alarm clock: rings, dodges, sprouts legs, runs ───────────────────
export type ClockState = { x: number; y: number; ring: boolean; squash: number; legs: number; run: number; rot: number };

export const clockAt = (t: number): ClockState => {
  let x = num(t, [
    [13.4, 730],
    [13.55, 795, "out"],
    [13.95, 795],
    [14.1, 690, "out"],
    [14.4, 690],
    [14.55, 730, "out"],
  ]);
  let y = 1192;
  // dodge hops
  for (const [a, b] of [
    [13.4, 13.55],
    [13.95, 14.1],
    [14.4, 14.55],
  ]) {
    if (t > a && t < b) y -= Math.sin(((t - a) / (b - a)) * Math.PI) * 40;
  }
  let run = 0;
  if (t >= 24.35) {
    // hops off the nightstand, races left, comes back right toward the tiny kid
    x = num(t, [
      [24.35, 730],
      [24.6, 640, "out"],
      [25.4, -140, "in"],
      [26.7, -160],
      [27.35, 700, "out"],
    ]);
    const hop = t < 24.6 ? Math.sin(((t - 24.35) / 0.25) * Math.PI) * 80 : 0;
    y = num(t, [
      [24.35, 1192],
      [24.6, GROUND - 30, "in"],
    ]) - hop;
    run = t > 24.6 && t < 27.35 ? 1 : 0;
  }
  let squash = 0;
  for (const s of SLAPS) {
    const d = t - s;
    if (d >= 0 && d < 0.25) squash = Math.max(squash, 1 - d / 0.25);
  }
  const legs = num(t, [
    [24.05, 0],
    [24.2, 1, "back"],
  ]);
  return { x, y, ring: isRinging(t), squash, legs, run, rot: t > 25.4 && t < 26.7 ? 0 : 0 };
};

export const Clock: React.FC<{ c: ClockState; t: number; facing?: 1 | -1 }> = ({ c, t, facing = 1 }) => {
  const era = eraAt(t);
  const shake = c.ring ? Math.sin(t * 90) * 7 : 0;
  const hop = c.ring && !c.run ? Math.abs(Math.sin(t * 30)) * 8 : 0;
  const w = warpProgress(t);
  const spin = w >= 0 ? w * 3600 : 0;
  const legLen = 10 + c.legs * 34;
  const stride = c.run ? Math.sin(t * 40) * 26 : 0;
  const rim = era === 3 ? "#b5651d" : era === 2 ? "#9aa5b1" : "#e63946";
  const dir = c.run ? (num(t, [[25.4, -1], [26.7, 1]]) < 0 ? -1 : 1) : facing;
  return (
    <g transform={`translate(${c.x} ${c.y - hop}) rotate(${shake}) scale(${1 + c.squash * 0.25} ${1 - c.squash * 0.35})`}>
      {/* legs */}
      <g stroke={INK} strokeWidth={c.legs > 0.5 ? 7 : 6} strokeLinecap="round">
        <line x1={-16} y1={-12} x2={-16 - 6 + stride * c.legs} y2={-12 + legLen} />
        <line x1={16} y1={-12} x2={16 + 6 - stride * c.legs} y2={-12 + legLen} />
        {c.legs > 0.5 ? (
          <>
            <line x1={-16 - 6 + stride} y1={-12 + legLen} x2={-16 - 6 + stride + 12 * dir} y2={-12 + legLen} />
            <line x1={16 + 6 - stride} y1={-12 + legLen} x2={16 + 6 - stride + 12 * dir} y2={-12 + legLen} />
          </>
        ) : null}
      </g>
      <g transform={`translate(0 ${-(legLen - 10)})`}>
        {/* bells + hammer */}
        <g fill={rim} stroke={INK} strokeWidth={5}>
          <path d="M -40 -40 A 18 18 0 0 1 -14 -62 Z" transform={c.ring ? `rotate(${Math.sin(t * 80) * 12} -26 -50)` : undefined} />
          <path d="M 40 -40 A 18 18 0 0 0 14 -62 Z" transform={c.ring ? `rotate(${-Math.sin(t * 80) * 12} 26 -50)` : undefined} />
        </g>
        <line x1={0} y1={-46} x2={0} y2={-66} stroke={INK} strokeWidth={5} />
        <circle cx={0} cy={-68} r={6} fill={INK} />
        <circle cx={0} cy={-12} r={38} fill={rim} stroke={INK} strokeWidth={6} />
        <circle cx={0} cy={-12} r={28} fill="#fffaf0" stroke={INK} strokeWidth={3} />
        <line x1={0} y1={-12} x2={Math.sin(((spin + 210) * Math.PI) / 180) * 14} y2={-12 - Math.cos(((spin + 210) * Math.PI) / 180) * 14} stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <line x1={0} y1={-12} x2={Math.sin(((spin * 12) * Math.PI) / 180) * 22} y2={-12 - Math.cos(((spin * 12) * Math.PI) / 180) * 22} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
        {era >= 2 ? <path d="M -38 -30 L -18 -48 M -38 -30 L -30 -50 M -38 -30 L -14 -36" stroke="#8d8d8d" strokeWidth={2} /> : null}
        {/* ring lines */}
        {c.ring ? (
          <g stroke={INK} strokeWidth={5} strokeLinecap="round" opacity={0.85}>
            <path d="M -62 -70 l -14 -10 M -66 -46 l -18 0 M 62 -70 l 14 -10 M 66 -46 l 18 0" />
          </g>
        ) : null}
        {/* angry little face once it's alive */}
        {c.legs > 0.5 ? (
          <g>
            <path d="M -14 -26 l 9 4 M 14 -26 l -9 4" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
            <circle cx={-9} cy={-17} r={3.5} fill={INK} />
            <circle cx={9} cy={-17} r={3.5} fill={INK} />
          </g>
        ) : null}
      </g>
    </g>
  );
};

// ─── Floating Zzz while asleep ────────────────────────────────────────────
export const Zzz: React.FC<{ t: number; x: number; y: number; on: boolean }> = ({ t, x, y, on }) => {
  if (!on) return null;
  return (
    <g>
      {[0, 1, 2].map((i) => {
        const u = ((t * 0.7 + i / 3) % 1 + 1) % 1;
        return (
          <text
            key={i}
            x={x + 20 + u * 70 + Math.sin(u * 8) * 10}
            y={y - 40 - u * 170}
            fontFamily={FONT_STACK}
            fontSize={34 + u * 34}
            fill={INK}
            opacity={u < 0.15 ? u / 0.15 : 1 - u}
          >
            Z
          </text>
        );
      })}
    </g>
  );
};

// ─── Calendar pages flying off during a warp ──────────────────────────────
export const FlyingPages: React.FC<{ t: number }> = ({ t }) => (
  <g>
    {WARPS.map((w, k) => {
      const d = t - w.at;
      if (d < 0 || d > WARP_LEN + 0.6) return null;
      return [...Array(9)].map((_, i) => {
        const s = d - i * 0.06;
        if (s < 0) return null;
        const vx = (random(`px${k}${i}`) - 0.3) * 900;
        const vy = -300 - random(`py${k}${i}`) * 500;
        const x = 315 + vx * s;
        const y = 720 + vy * s + 900 * s * s;
        return <rect key={`${k}-${i}`} x={x - 30} y={y - 36} width={60} height={72} fill="#fff" stroke={INK} strokeWidth={4} transform={`rotate(${s * 700 * (i % 2 ? 1 : -1)} ${x} ${y})`} />;
      });
    })}
  </g>
);

// ─── Old-man beard pooling onto the floor (while sitting in bed) ──────────
export const BeardPile: React.FC<{ on: boolean; t: number }> = ({ on, t }) => {
  if (!on) return null;
  const grow = Math.min(1, (t - 17.9) / 0.5);
  if (grow <= 0) return null;
  // a thin stream from the chin over the blanket, coiling up on the floor
  const end = 1120 + (GROUND - 1120) * grow;
  return (
    <g opacity={Math.min(1, grow * 2)}>
      <path
        d={`M 380 1090 Q 372 ${(1090 + end) / 2} 382 ${end - 10} L 400 ${end - 10} Q 408 ${(1090 + end) / 2} 402 1090 Z`}
        fill="#e9e9e9"
        stroke={INK}
        strokeWidth={4.5}
        strokeLinejoin="round"
      />
      {grow >= 1 ? (
        <g fill="#e9e9e9" stroke={INK} strokeWidth={4.5}>
          <ellipse cx={420} cy={GROUND - 12} rx={62} ry={16} />
          <ellipse cx={414} cy={GROUND - 26} rx={42} ry={12} />
          <path d="M 392 1376 q 22 -8 50 0" fill="none" stroke="#b8b8b8" strokeWidth={3} />
        </g>
      ) : null}
    </g>
  );
};
