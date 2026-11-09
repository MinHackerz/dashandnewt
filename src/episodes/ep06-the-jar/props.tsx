import React from "react";
import { random } from "remotion";
import { GROUND, INK } from "../../rig/Stickman";
import { FONT_STACK } from "../../shared/ui";
import { COUNTER, JAM, JAR, SHELF, TABLE, TOOLBOX } from "./timeline";

const Y = (h: number) => GROUND - h;

// ─── The kitchen ──────────────────────────────────────────────────────────
export const Kitchen: React.FC = () => (
  <g>
    {/* back wall + tiled splashback above the counter */}
    <rect x={-1200} y={-2000} width={3600} height={GROUND + 2000} fill="#fdf1dc" />
    <rect x={COUNTER.x0} y={Y(SHELF.top + 170)} width={COUNTER.x1 - COUNTER.x0} height={SHELF.top + 170 - COUNTER.top} fill="#d9eef0" />
    <g stroke="#b6d6da" strokeWidth={3}>
      {[...Array(14)].map((_, i) => (
        <line key={`v${i}`} x1={COUNTER.x0 + i * 52} y1={Y(SHELF.top + 170)} x2={COUNTER.x0 + i * 52} y2={Y(COUNTER.top)} />
      ))}
      {[...Array(7)].map((_, i) => (
        <line key={`h${i}`} x1={COUNTER.x0} y1={Y(COUNTER.top + i * 52)} x2={COUNTER.x1} y2={Y(COUNTER.top + i * 52)} />
      ))}
    </g>
    {/* window over the table */}
    <g>
      <rect x={110} y={Y(640)} width={230} height={220} fill="#bfe4ff" />
      <circle cx={290} cy={Y(590)} r={26} fill="#ffd23f" stroke={INK} strokeWidth={5} />
      <path d={`M 140 ${Y(470)} q 30 -26 60 0 q 30 -26 60 0`} fill="#fff" stroke="#9cc9e6" strokeWidth={4} />
      <rect x={110} y={Y(640)} width={230} height={220} fill="none" stroke={INK} strokeWidth={9} />
      <line x1={225} y1={Y(640)} x2={225} y2={Y(420)} stroke={INK} strokeWidth={6} />
      <line x1={110} y1={Y(530)} x2={340} y2={Y(530)} stroke={INK} strokeWidth={6} />
      <path d={`M 90 ${Y(660)} Q 130 ${Y(560)} 100 ${Y(400)} L 74 ${Y(400)} L 74 ${Y(660)} Z`} fill="#ff9f6b" stroke={INK} strokeWidth={5} />
      <path d={`M 360 ${Y(660)} Q 320 ${Y(560)} 350 ${Y(400)} L 376 ${Y(400)} L 376 ${Y(660)} Z`} fill="#ff9f6b" stroke={INK} strokeWidth={5} />
      <line x1={60} y1={Y(660)} x2={390} y2={Y(660)} stroke={INK} strokeWidth={8} strokeLinecap="round" />
    </g>
    {/* a clock, so the wall isn't empty */}
    <g transform={`translate(470 ${Y(600)})`}>
      <circle r={42} fill="#fff" stroke={INK} strokeWidth={7} />
      <line x1={0} y1={0} x2={0} y2={-26} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <line x1={0} y1={0} x2={18} y2={8} stroke={INK} strokeWidth={5} strokeLinecap="round" />
    </g>
    {/* floor */}
    <rect x={-1200} y={GROUND} width={3600} height={1500} fill="#e2c497" />
    {[...Array(9)].map((_, i) => (
      <line key={i} x1={-1200} y1={GROUND + 40 + i * 70} x2={2400} y2={GROUND + 40 + i * 70} stroke="#cfae7c" strokeWidth={4} />
    ))}
    <rect x={-1200} y={GROUND - 22} width={3600} height={22} fill="#f6e3c0" />
    <line x1={-1200} y1={GROUND} x2={2400} y2={GROUND} stroke={INK} strokeWidth={8} />
  </g>
);

export const Counter: React.FC = () => {
  const { x0, x1, top } = COUNTER;
  const doors = Math.floor((x1 - x0) / 170);
  return (
    <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
      <rect x={x0} y={Y(top - 18)} width={x1 - x0} height={top - 18} fill="#a8d5c2" />
      {[...Array(doors)].map((_, i) => {
        const dx = x0 + 14 + i * 170;
        return (
          <g key={i}>
            <rect x={dx} y={Y(top - 34)} width={150} height={top - 62} rx={8} fill="#b9e0cf" strokeWidth={5} />
            <circle cx={dx + 130} cy={Y(top - 80)} r={7} fill="#ffd23f" strokeWidth={4} />
          </g>
        );
      })}
      <rect x={x0 - 14} y={Y(top)} width={x1 - x0 + 28} height={20} rx={4} fill="#f4d9a6" />
    </g>
  );
};

export const Shelf: React.FC = () => (
  <g stroke={INK} strokeWidth={6} strokeLinejoin="round">
    <rect x={SHELF.x0} y={Y(SHELF.top)} width={SHELF.x1 - SHELF.x0} height={16} rx={3} fill="#d9a66b" />
    {[SHELF.x0 + 26, SHELF.x1 - 26].map((x) => (
      <path key={x} d={`M ${x} ${Y(SHELF.top) + 16} l 0 34 l -22 -34 Z`} fill="#c08a52" strokeWidth={5} />
    ))}
  </g>
);

export const Table: React.FC<{ t: number }> = ({ t }) => {
  const { x0, x1, top } = TABLE;
  // Newt's drawing grows while he colours
  const scribble = Math.min(1, t / 6);
  return (
    <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
      {[x0 + 26, x1 - 26].map((x) => (
        <rect key={x} x={x - 8} y={Y(top - 10)} width={16} height={top - 10} fill="#c08a52" strokeWidth={5} />
      ))}
      <rect x={x0} y={Y(top)} width={x1 - x0} height={18} rx={4} fill="#d9a66b" />
      {/* colouring paper with a crayon sun on it */}
      <path d={`M 180 ${Y(top) + 1} L 290 ${Y(top) + 1} L 296 ${Y(top) - 5} L 186 ${Y(top) - 5} Z`} fill="#fff" strokeWidth={4} />
      <path d={`M 200 ${Y(top) - 3} l ${70 * scribble} 0`} stroke="#ff8a1f" strokeWidth={4} strokeLinecap="round" />
    </g>
  );
};

export const Toolbox: React.FC<{ wrench: boolean; crowbar: boolean; crowbarX: number }> = ({ wrench, crowbar, crowbarX }) => {
  const { x0, x1, h } = TOOLBOX;
  return (
    <g stroke={INK} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round">
      {/* handles sticking out of the open box (drawn first: the box front covers their ends) */}
      {crowbar ? <path d={`M ${crowbarX - 6} ${Y(h - 10)} L ${crowbarX} ${Y(h + 66)} q 2 14 14 12`} fill="none" stroke="#5b6670" strokeWidth={10} /> : null}
      {wrench ? (
        <g>
          <path d={`M ${x0 + 14} ${Y(h - 10)} L ${x0 + 6} ${Y(h + 52)}`} stroke="#c0392b" strokeWidth={14} />
          <rect x={x0 - 6} y={Y(h + 72)} width={26} height={22} rx={4} fill="#9aa5ae" strokeWidth={5} />
        </g>
      ) : null}
      <path d={`M ${x0} ${Y(h)} L ${x0 + 20} ${Y(h + 30)} L ${x1 - 20} ${Y(h + 30)} L ${x1} ${Y(h)}`} fill="#ff6b4a" strokeWidth={5} />
      <rect x={x0} y={Y(h)} width={x1 - x0} height={h} rx={6} fill="#e63946" />
      <rect x={(x0 + x1) / 2 - 16} y={Y(h) + 18} width={32} height={14} rx={3} fill="#9aa5ae" strokeWidth={4} />
    </g>
  );
};

export const Plate: React.FC<{ x: number }> = ({ x }) => (
  <g stroke={INK} strokeWidth={5} strokeLinejoin="round">
    <ellipse cx={x} cy={Y(COUNTER.top) - 4} rx={62} ry={10} fill="#fff" />
    <path d={`M ${x - 44} ${Y(COUNTER.top) - 10} L ${x + 44} ${Y(COUNTER.top) - 10} L ${x + 40} ${Y(COUNTER.top) - 26} Q ${x} ${Y(COUNTER.top) - 36} ${x - 40} ${Y(COUNTER.top) - 26} Z`} fill="#f2c27b" />
    <path d={`M ${x - 40} ${Y(COUNTER.top) - 18} L ${x + 40} ${Y(COUNTER.top) - 18}`} stroke="#d9a35a" strokeWidth={3} />
  </g>
);

// ─── Jars ─────────────────────────────────────────────────────────────────
export type JarState = {
  x: number; // centre
  h: number; // bottom, px above ground
  rot: number; // tilt (deg) around the bottom centre
  lid: { on: boolean; x: number; h: number; rot: number }; // world position (bottom centre) once it's off
  button: number; // 0 = pulled in (sealed) … 1 = popped up
  turn: number; // how far the lid has been twisted (ridges slide)
  pickles: number; // pickles left
};

const Pickle: React.FC<{ x: number; y: number; rot: number; s?: number }> = ({ x, y, rot, s = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <rect x={-9} y={-24} width={18} height={48} rx={9} fill="#6a9f3a" stroke="#2f5a1c" strokeWidth={3} />
    {[-12, 0, 12].map((k) => (
      <circle key={k} cx={k % 2 ? 4 : -3} cy={k} r={2} fill="#9cc76a" />
    ))}
  </g>
);

/** A lid seen from the side: knurled band, and a top line with the safety button in the middle */
const Lid: React.FC<{ w: number; h: number; button: number; turn: number; color: string }> = ({ w, h, button, turn, color }) => {
  const dome = -5 + 12 * button; // dips in while sealed, domes up when air gets in
  return (
    <g stroke={INK} strokeLinejoin="round">
      <path d={`M ${-w / 2} 0 L ${-w / 2} ${-h} L ${-12} ${-h} Q 0 ${-h - dome} 12 ${-h} L ${w / 2} ${-h} L ${w / 2} 0 Z`} fill={color} strokeWidth={5} />
      <g stroke="#7a5a1c" strokeWidth={2.5} opacity={0.7}>
        {[...Array(9)].map((_, i) => {
          const u = ((i / 9 + turn) % 1 + 1) % 1;
          const x = -w / 2 + 6 + u * (w - 12);
          return <line key={i} x1={x} y1={-3} x2={x} y2={-h + 3} />;
        })}
      </g>
    </g>
  );
};

/** The pickle lid away from its jar (in Newt's hand, then set down on the table) */
export const PickleLid: React.FC<{ j: JarState }> = ({ j }) =>
  j.lid.on ? null : (
    <g transform={`translate(${j.lid.x} ${Y(j.lid.h)}) rotate(${j.lid.rot})`}>
      <Lid w={JAR.lidW} h={JAR.lidH} button={j.button} turn={j.turn} color="#e8b54a" />
    </g>
  );

export const PickleJar: React.FC<{ j: JarState }> = ({ j }) => {
  const { w, h, lidW, lidH } = JAR;
  const lid = (
    <g transform={`translate(0 ${-h})`}>
      <Lid w={lidW} h={lidH} button={j.button} turn={j.turn} color="#e8b54a" />
    </g>
  );
  return (
    <g transform={`translate(${j.x} ${Y(j.h)}) rotate(${j.rot})`}>
      {/* glass, brine and pickles */}
      <path d={`M ${-w / 2 + 6} 0 L ${w / 2 - 6} 0 Q ${w / 2} 0 ${w / 2} -10 L ${w / 2} ${-h + 16} Q ${w / 2} ${-h + 6} ${w / 2 - 8} ${-h + 2} L ${-w / 2 + 8} ${-h + 2} Q ${-w / 2} ${-h + 6} ${-w / 2} ${-h + 16} L ${-w / 2} -10 Q ${-w / 2} 0 ${-w / 2 + 6} 0 Z`} fill="#e5f3d8" stroke={INK} strokeWidth={6} />
      <rect x={-w / 2 + 5} y={-h + 20} width={w - 10} height={h - 25} rx={5} fill="#c9e3a0" opacity={0.8} />
      {[...Array(5)].map((_, i) => (i < j.pickles ? <Pickle key={i} x={-22 + i * 11} y={-h / 2 + (i % 2) * 10} rot={-14 + i * 8} s={0.92} /> : null))}
      <rect x={-w / 2 + 2} y={-h / 2 - 12} width={w - 4} height={26} fill="#fff" stroke={INK} strokeWidth={3} />
      <text x={0} y={-h / 2 + 7} textAnchor="middle" fontFamily={FONT_STACK} fontSize={17} fill="#3f7a24">
        PICKLES
      </text>
      <path d={`M ${w / 2 - 14} ${-h + 22} L ${w / 2 - 14} -14`} stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.75} />
      {/* rim */}
      <rect x={-w / 2 + 4} y={-h - 6} width={w - 8} height={10} rx={3} fill="#e5f3d8" stroke={INK} strokeWidth={4} />
      {j.lid.on ? lid : null}
    </g>
  );
};

export type JamState = { x: number; h: number; rot: number; lid: { x: number; h: number; rot: number; spin: number; on: boolean } };

export const JamJar: React.FC<{ j: JamState }> = ({ j }) => {
  const { w, h } = JAM;
  return (
    <g>
      <g transform={`translate(${j.x} ${Y(j.h)}) rotate(${j.rot})`}>
        <rect x={-w / 2} y={-h} width={w} height={h} rx={10} fill="#f6d3dc" stroke={INK} strokeWidth={6} />
        <rect x={-w / 2 + 5} y={-h + 14} width={w - 10} height={h - 19} rx={6} fill="#c2185b" opacity={0.85} />
        <rect x={-w / 2 + 2} y={-h / 2 - 10} width={w - 4} height={22} fill="#fff" stroke={INK} strokeWidth={3} />
        <text x={0} y={-h / 2 + 7} textAnchor="middle" fontFamily={FONT_STACK} fontSize={16} fill="#c2185b">
          JAM
        </text>
      </g>
      <JamLid l={j.lid} />
    </g>
  );
};

/** The jam lid on its own (on the jar, flying, or sitting on Dash's head). `spin` squashes it
 *  like a coin seen edge-on while it tumbles. */
export const JamLid: React.FC<{ l: JamState["lid"] }> = ({ l }) => {
  const { lidW, lidH } = JAM;
  const sx = Math.max(0.18, Math.abs(Math.cos(l.spin)));
  return (
    <g transform={`translate(${l.x} ${Y(l.h)}) rotate(${l.rot}) scale(${sx} 1)`}>
      <rect x={-lidW / 2} y={-lidH / 2} width={lidW} height={lidH} rx={4} fill="#e63946" stroke={INK} strokeWidth={5} />
      <g stroke="#fff" strokeWidth={3} opacity={0.7}>
        {[-20, -7, 6, 19].map((k) => (
          <line key={k} x1={k} y1={-lidH / 2 + 3} x2={k} y2={lidH / 2 - 3} />
        ))}
      </g>
    </g>
  );
};

/** A dark wrap of orange scarf around the pickle lid (TRY #2) */
export const ScarfWrap: React.FC<{ x: number; y: number; twist: number }> = ({ x, y, twist }) => (
  <g transform={`translate(${x} ${y})`} stroke={INK} strokeWidth={5} strokeLinejoin="round">
    <rect x={-50} y={-30} width={100} height={30} rx={10} fill="#ff8a1f" />
    {[...Array(4)].map((_, i) => {
      const u = ((i / 4 + twist) % 1 + 1) % 1;
      return <path key={i} d={`M ${-44 + u * 88} -28 l 10 26`} stroke="#c8641a" strokeWidth={4} fill="none" />;
    })}
  </g>
);

// ─── Tools ────────────────────────────────────────────────────────────────
/** Pipe wrench: jaw at (x, y), handle running out along `ang` (deg, 0 = +x) */
export const Wrench: React.FC<{ x: number; y: number; ang: number; len?: number }> = ({ x, y, ang, len = 150 }) => (
  <g transform={`translate(${x} ${y}) rotate(${ang})`} stroke={INK} strokeLinejoin="round" strokeLinecap="round">
    <path d={`M 10 0 L ${len} 0`} stroke={INK} strokeWidth={22} />
    <path d={`M 10 0 L ${len} 0`} stroke="#c0392b" strokeWidth={13} />
    <rect x={-16} y={-20} width={34} height={40} rx={5} fill="#9aa5ae" strokeWidth={5} />
    <path d="M -16 -8 L -30 -8 M -16 8 L -30 8" stroke={INK} strokeWidth={7} />
  </g>
);

/** Crowbar: claw tip at (x, y), straight bar running out along `ang` */
export const Crowbar: React.FC<{ x: number; y: number; ang: number; len?: number }> = ({ x, y, ang, len = 130 }) => (
  <g transform={`translate(${x} ${y}) rotate(${ang})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d={`M 0 0 q 6 -10 18 -8 L ${len} -8`} stroke={INK} strokeWidth={17} />
    <path d={`M 0 0 q 6 -10 18 -8 L ${len} -8`} stroke="#5b6670" strokeWidth={9} />
  </g>
);

/** Teaspoon: bowl at (x, y), handle along `ang` */
export const Spoon: React.FC<{ x: number; y: number; ang: number }> = ({ x, y, ang }) => (
  <g transform={`translate(${x} ${y}) rotate(${ang})`} stroke={INK} strokeLinecap="round">
    <line x1={8} y1={0} x2={48} y2={0} strokeWidth={9} />
    <line x1={8} y1={0} x2={48} y2={0} stroke="#cfd8dc" strokeWidth={4} />
    <ellipse cx={0} cy={0} rx={10} ry={6} fill="#cfd8dc" strokeWidth={4} />
  </g>
);

export const HeldPickle: React.FC<{ x: number; y: number; bite: number }> = ({ x, y, bite }) =>
  bite >= 1 ? null : (
    <g transform={`translate(${x} ${y})`}>
      <clipPath id="bite">
        <rect x={-14} y={-28 + 52 * bite} width={28} height={60} />
      </clipPath>
      <g clipPath="url(#bite)">
        <Pickle x={0} y={0} rot={-10} />
      </g>
    </g>
  );

// ─── Effects ──────────────────────────────────────────────────────────────
/** Steam puffing from both ears while he strains */
export const EarSteam: React.FC<{ t: number; x: number; y: number; on: number }> = ({ t, x, y, on }) => {
  if (on <= 0) return null;
  return (
    <g fill="#fff" stroke="#9aa5ae" strokeWidth={3} opacity={on}>
      {[0, 1, 2].map((k) => {
        const u = ((t * 1.8 + k / 3) % 1 + 1) % 1;
        return [-1, 1].map((s) => <circle key={`${k}${s}`} cx={x + s * (58 + u * 50)} cy={y - 10 - u * 46} r={8 + u * 16} opacity={1 - u} />);
      })}
    </g>
  );
};

/** Sweat drops flung off a head: free particles under gravity */
export const SweatFling: React.FC<{ t: number; from: number; to: number; x: number; y: number; g: number }> = ({ t, from, to, x, y, g }) => {
  if (t < from || t > to + 0.6) return null;
  return (
    <g fill="#7cc8ff" stroke={INK} strokeWidth={2.5}>
      {[...Array(8)].map((_, i) => {
        const t0 = from + ((to - from) * i) / 8;
        const tau = t - t0;
        if (tau < 0 || tau > 0.6) return null;
        const vx = (random(`sw${i}`) - 0.5) * 520;
        const vy = -300 - random(`swy${i}`) * 260;
        return <ellipse key={i} cx={x + vx * tau} cy={y + vy * tau + 0.5 * g * tau * tau} rx={6} ry={9} />;
      })}
    </g>
  );
};

/** "Pfft": little white air curls rushing into the gap under a lid edge */
export const Pfft: React.FC<{ t: number; at: number; x: number; y: number; dir: number; dur?: number }> = ({ t, at, x, y, dir, dur = 0.5 }) => {
  const d = t - at;
  if (d < 0 || d > dur) return null;
  const u = d / dur;
  return (
    <g fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={1 - u * 0.8}>
      {[0, 1, 2].map((k) => {
        const r = 40 + k * 22 - u * 30;
        return <path key={k} d={`M ${x + dir * r} ${y - 14 - k * 10} q ${-dir * 14} -12 ${-dir * (r - 4)} 8`} />;
      })}
    </g>
  );
};

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
