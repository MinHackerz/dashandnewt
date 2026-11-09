import React from "react";
import { random } from "remotion";
import { GROUND } from "../../rig/Stickman";
import { TOON_INK } from "../../rig2d/Toon";
import { FONT_STACK } from "../../shared/ui";
import { G } from "./physics";
import { BLOCK_H, BLADE, CRATE, D, DPX, laneS, STEP_H } from "./timeline";

// Painted 2D street, seen from the grass verge: far pavement and houses at the top, the road in
// the middle, the verge (with the sharpener's cart) at the bottom. Things further away are drawn
// higher and smaller (depth lanes, see timeline.ts); far layers also slide slower (parallax).

const INK = TOON_INK;
const gY = (d: number) => GROUND + d * DPX; // where the ground of lane d is on screen

/** Draw children in a depth layer: scaled by s about (ax, GROUND), ground moved to `ground` */
export const Layer: React.FC<{ s: number; ground: number; ax: number; children: React.ReactNode }> = ({ s, ground, ax, children }) => (
  <g transform={`translate(${ax} ${ground}) scale(${s}) translate(${-ax} ${-GROUND})`}>{children}</g>
);
export const Lane: React.FC<{ d: number; ax: number; children: React.ReactNode }> = ({ d, ax, children }) => (
  <Layer s={laneS(d)} ground={gY(d)} ax={ax}>
    {children}
  </Layer>
);

// ─── Sky (screen space) ───────────────────────────────────────────────────
export const Sky: React.FC<{ w: number; h: number; camX: number; t: number }> = ({ w, h, camX, t }) => (
  <g>
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5fa8e8" />
        <stop offset="0.6" stopColor="#a9dbfb" />
        <stop offset="1" stopColor="#e4f5ff" />
      </linearGradient>
    </defs>
    <rect width={w} height={h} fill="url(#sky)" />
    <circle cx={w * 0.8} cy={h * 0.11} r={70} fill="#fff3b0" opacity={0.6} />
    <circle cx={w * 0.8} cy={h * 0.11} r={50} fill="#ffe27a" />
    {[0, 1, 2, 3].map((i) => {
      const x = ((((i * 520 + 90 - camX * 0.04 + t * 6) % 2200) + 2200) % 2200) - 500;
      const y = 140 + (i % 2) * 150 + i * 30;
      return (
        <g key={i} fill="#ffffff" opacity={0.92}>
          <ellipse cx={x} cy={y} rx={120} ry={38} />
          <ellipse cx={x - 70} cy={y + 10} rx={70} ry={28} />
          <ellipse cx={x + 60} cy={y - 16} rx={66} ry={34} />
        </g>
      );
    })}
  </g>
);

// ─── Far side: hills, houses, trees, lamp posts (parallax layers in world space) ──
const PALETTE = ["#f2c48d", "#e9a07a", "#f6e3b4", "#b9d7c4", "#f1b8a6", "#cbd6e8"];
const ROOFS = ["#a8473a", "#5a6b7d", "#8a5a3c", "#b9603f"];
const House: React.FC<{ x: number; i: number }> = ({ x, i }) => {
  const w = 520 + 160 * random(`hw${i}`);
  const h = 900 + 400 * random(`hh${i}`);
  const wall = PALETTE[i % PALETTE.length];
  const roof = ROOFS[i % ROOFS.length];
  const y0 = GROUND - h;
  const cols = Math.max(2, Math.floor(w / 190));
  return (
    <g stroke={INK} strokeWidth={10} strokeLinejoin="round">
      <rect x={x} y={y0} width={w} height={h} fill={wall} />
      <path d={`M ${x - 40} ${y0} L ${x + w / 2} ${y0 - 300 - 80 * random(`hr${i}`)} L ${x + w + 40} ${y0} Z`} fill={roof} />
      <rect x={x + w * 0.68} y={y0 - 330} width={60} height={160} fill="#9a6d55" />
      {[0, 1].map((row) =>
        [...Array(cols)].map((_, k) => {
          const wx = x + 50 + k * ((w - 100) / cols) + 20;
          const wy = y0 + 120 + row * 330;
          if (row === 1 && k === 0) return null;
          return (
            <g key={`${row}${k}`}>
              <rect x={wx} y={wy} width={110} height={150} fill="#cfe9ff" />
              <path d={`M ${wx + 55} ${wy} L ${wx + 55} ${wy + 150} M ${wx} ${wy + 75} L ${wx + 110} ${wy + 75}`} strokeWidth={7} />
              <rect x={wx - 12} y={wy + 150} width={134} height={18} fill="#ffffff" strokeWidth={6} />
            </g>
          );
        }),
      )}
      <rect x={x + 50} y={GROUND - 300} width={130} height={300} fill="#7b4b3a" />
      <circle cx={x + 160} cy={GROUND - 150} r={9} fill="#ffd23f" strokeWidth={4} />
    </g>
  );
};
const Tree: React.FC<{ x: number; i: number }> = ({ x, i }) => {
  const h = 900 + 260 * random(`th${i}`);
  return (
    <g stroke={INK} strokeWidth={10}>
      <path d={`M ${x - 26} ${GROUND} L ${x - 16} ${GROUND - h * 0.55} L ${x + 16} ${GROUND - h * 0.55} L ${x + 26} ${GROUND} Z`} fill="#8a5a3c" />
      <circle cx={x} cy={GROUND - h * 0.72} r={230} fill="#5fae55" />
      <circle cx={x - 150} cy={GROUND - h * 0.6} r={150} fill="#58a64f" />
      <circle cx={x + 150} cy={GROUND - h * 0.62} r={160} fill="#6bbb5f" />
      <path d={`M ${x - 80} ${GROUND - h * 0.8} q 40 -40 90 -20`} fill="none" stroke="#8fd27f" strokeWidth={14} strokeLinecap="round" />
    </g>
  );
};

export const FarSide: React.FC<{ camX: number }> = ({ camX }) => {
  const sH = laneS(D.houses);
  const items: React.ReactNode[] = [];
  for (let k = -6; k < 26; k++) {
    const x = k * 900 + 100;
    items.push(k % 3 === 2 ? <Tree key={`t${k}`} x={x + 300} i={k} /> : <House key={`h${k}`} x={x} i={k + 10} />);
  }
  const lampS = laneS(-7.9);
  return (
    <g>
      {/* distant hills */}
      <Layer s={0.16} ground={gY(D.houses) - 40} ax={camX}>
        {[...Array(14)].map((_, k) => (
          <ellipse key={k} cx={k * 2600 - 8000} cy={GROUND + 200} rx={2200} ry={1300 + 500 * random(`hl${k}`)} fill={k % 2 ? "#9dd08a" : "#8cc57a"} stroke={INK} strokeWidth={30} />
        ))}
      </Layer>
      <Layer s={sH} ground={gY(D.houses)} ax={camX}>
        {items}
      </Layer>
      {/* far pavement + kerb */}
      <rect x={camX - 4000} y={gY(D.houses)} width={8000} height={gY(D.farKerb) - gY(D.houses)} fill="#d6cfc0" />
      <Layer s={laneS(-8.5)} ground={gY(-8.5)} ax={camX}>
        {[...Array(60)].map((_, k) => (
          <line key={k} x1={k * 300 - 6000} y1={GROUND - 40} x2={k * 300 - 6000 - 60} y2={GROUND + 40} stroke="#b9b09d" strokeWidth={8} />
        ))}
      </Layer>
      <rect x={camX - 4000} y={gY(D.farKerb) - 8} width={8000} height={14} fill="#b3ab9b" stroke={INK} strokeWidth={3} />
      {/* lamp posts on the far pavement */}
      <Layer s={lampS} ground={gY(-7.9)} ax={camX}>
        {[...Array(12)].map((_, k) => {
          const x = k * 1700 - 4000;
          return (
            <g key={k} stroke={INK} strokeWidth={9}>
              <rect x={x - 14} y={GROUND - 1100} width={28} height={1100} fill="#4f5a66" />
              <path d={`M ${x} ${GROUND - 1090} q 0 -60 90 -60 l 40 0`} fill="none" stroke="#4f5a66" strokeWidth={24} />
              <path d={`M ${x} ${GROUND - 1090} q 0 -60 90 -60 l 40 0`} fill="none" strokeWidth={6} />
              <path d={`M ${x + 100} ${GROUND - 1150} l 60 0 l 20 40 l -100 0 Z`} fill="#fff6c8" />
            </g>
          );
        })}
      </Layer>
    </g>
  );
};

// ─── The road and the verge ───────────────────────────────────────────────
export const Road: React.FC<{ camX: number }> = ({ camX }) => {
  const x0 = camX - 4000;
  const top = gY(D.farKerb);
  const kerb = gY(D.kerb);
  return (
    <g>
      <defs>
        <linearGradient id="asphalt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b6f7c" />
          <stop offset="1" stopColor="#575b67" />
        </linearGradient>
        <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fcb6b" />
          <stop offset="1" stopColor="#6fb352" />
        </linearGradient>
      </defs>
      <rect x={x0} y={top} width={8000} height={kerb - top} fill="url(#asphalt)" />
      {/* tar patches and grit */}
      <Layer s={laneS(-3)} ground={gY(-3)} ax={camX}>
        {[...Array(70)].map((_, k) => (
          <ellipse key={k} cx={k * 260 - 8000 + 120 * random(`gx${k}`)} cy={GROUND - 300 + 600 * random(`gy${k}`)} rx={40 + 50 * random(`gr${k}`)} ry={8} fill="#4f535e" opacity={0.5} />
        ))}
      </Layer>
      {/* edge lines and the dashed centre line */}
      <rect x={x0} y={gY(-7.05) - 4} width={8000} height={7} fill="#f4f1e6" />
      <rect x={x0} y={gY(0.38) - 5} width={8000} height={10} fill="#f4f1e6" />
      <Layer s={laneS(D.centre)} ground={gY(D.centre)} ax={camX}>
        {[...Array(40)].map((_, k) => (
          <rect key={k} x={k * 1440 - 20000} y={GROUND - 9} width={720} height={18} fill="#f4f1e6" />
        ))}
      </Layer>
      {/* kerb stones */}
      <rect x={x0} y={kerb - 6} width={8000} height={22} fill="#d9d4c7" stroke={INK} strokeWidth={4} />
      <Layer s={laneS(D.kerb)} ground={kerb} ax={camX}>
        {[...Array(80)].map((_, k) => (
          <line key={k} x1={k * 240 - 9000} y1={GROUND - 6} x2={k * 240 - 9000} y2={GROUND + 14} stroke="#b3ab9b" strokeWidth={4} />
        ))}
      </Layer>
      {/* grass verge, running down out of the frame */}
      <rect x={x0} y={kerb + 16} width={8000} height={3000} fill="url(#grass)" />
      <Layer s={laneS(2.6)} ground={gY(2.6)} ax={camX}>
        {[...Array(120)].map((_, k) => {
          const x = k * 170 - 10000 + 80 * random(`fx${k}`);
          const y = GROUND - 120 + 260 * random(`fy${k}`);
          return (
            <g key={k}>
              <path d={`M ${x} ${y} l -10 -30 M ${x} ${y} l 4 -36 M ${x} ${y} l 16 -28`} stroke="#5d9e44" strokeWidth={6} strokeLinecap="round" />
              {k % 5 === 0 ? <circle cx={x + 4} cy={y - 40} r={9} fill={k % 10 ? "#fff" : "#ffd23f"} stroke={INK} strokeWidth={3} /> : null}
            </g>
          );
        })}
      </Layer>
    </g>
  );
};

// ─── The knife-sharpener's cart (body behind, step + knife block in front) ─
export const CartBody: React.FC<{ x: number }> = ({ x }) => {
  const w = 380;
  const top = GROUND - 0.55 * 240 - 210;
  return (
    <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
      {/* handles */}
      <path d={`M ${x + w / 2} ${top + 120} L ${x + w / 2 + 230} ${top + 190}`} stroke="#8a5a3c" strokeWidth={22} strokeLinecap="round" />
      <path d={`M ${x + w / 2} ${top + 120} L ${x + w / 2 + 230} ${top + 190}`} fill="none" strokeWidth={5} />
      {/* sign on a pole */}
      <rect x={x - 8} y={top - 420} width={16} height={420} fill="#8a5a3c" />
      <g transform={`rotate(-3 ${x} ${top - 380})`}>
        <rect x={x - 170} y={top - 470} width={340} height={110} rx={12} fill="#fff6e0" />
        <text x={x} y={top - 428} textAnchor="middle" fontFamily={FONT_STACK} fontSize={40} fill="#c0392b" stroke="none">
          KNIVES
        </text>
        <text x={x} y={top - 384} textAnchor="middle" fontFamily={FONT_STACK} fontSize={36} fill={INK} stroke="none">
          SHARPENED
        </text>
      </g>
      {/* grindstone on its frame */}
      <path d={`M ${x + 60} ${top} L ${x + 90} ${top - 160} L ${x + 120} ${top}`} fill="none" stroke="#5b6670" strokeWidth={12} />
      <circle cx={x + 90} cy={top - 150} r={70} fill="#a7a39a" />
      <circle cx={x + 90} cy={top - 150} r={14} fill="#5b6670" />
      {/* the box */}
      <rect x={x - w / 2} y={top} width={w} height={210} rx={10} fill="#c98a52" />
      {[1, 2, 3].map((k) => (
        <line key={k} x1={x - w / 2 + 10} y1={top + k * 52} x2={x + w / 2 - 10} y2={top + k * 52} stroke="#9a6438" strokeWidth={5} />
      ))}
      {/* wheel */}
      <circle cx={x - 40} cy={GROUND - 120} r={120} fill="#f2d6a2" />
      <circle cx={x - 40} cy={GROUND - 120} r={92} fill="none" strokeWidth={5} />
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const a = (k * Math.PI) / 3;
        return <line key={k} x1={x - 40} y1={GROUND - 120} x2={x - 40 + Math.cos(a) * 92} y2={GROUND - 120 + Math.sin(a) * 92} strokeWidth={6} />;
      })}
      <circle cx={x - 40} cy={GROUND - 120} r={16} fill="#5b6670" />
    </g>
  );
};

/** The front step with the knife block: a big chef's knife standing point-up (wobble = degrees) */
export const KnifeStand: React.FC<{ x: number; wobble: number; glint?: number }> = ({ x, wobble, glint = 0 }) => {
  const step = GROUND - STEP_H;
  const blockTop = step - BLOCK_H;
  return (
    <g stroke={INK} strokeWidth={6} strokeLinejoin="round">
      {/* step plank on two legs */}
      <rect x={x - 70} y={step} width={18} height={STEP_H} fill="#9a6438" />
      <rect x={x + 52} y={step} width={18} height={STEP_H} fill="#9a6438" />
      <rect x={x - 110} y={step - 6} width={220} height={26} rx={4} fill="#c98a52" />
      {/* block */}
      <rect x={x - 46} y={blockTop} width={92} height={BLOCK_H - 6} rx={8} fill="#8a5a3c" />
      <rect x={x - 24} y={blockTop - 4} width={48} height={10} fill="#5a3a24" />
      {/* the knife: handle in the block, blade up */}
      <g transform={`rotate(${wobble} ${x} ${blockTop})`}>
        <path d={`M ${x - 13} ${blockTop + 2} L ${x - 15} ${blockTop - BLADE * 0.75} Q ${x - 10} ${blockTop - BLADE + 12} ${x} ${blockTop - BLADE} L ${x + 14} ${blockTop + 2} Z`} fill="#dfe6ec" />
        <path d={`M ${x + 8} ${blockTop - 6} L ${x + 6} ${blockTop - BLADE * 0.8}`} stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
        <rect x={x - 17} y={blockTop - 4} width={34} height={12} rx={3} fill="#22181c" />
      </g>
      {glint > 0 ? (
        <g transform={`translate(${x} ${blockTop - BLADE + 6}) scale(${glint}) rotate(${glint * 90})`} stroke="none">
          <path d="M 0 -60 L 10 -10 L 60 0 L 10 10 L 0 60 L -10 10 L -60 0 L -10 -10 Z" fill="#ffffff" />
          <circle r={12} fill="#fff8c8" />
        </g>
      ) : null}
    </g>
  );
};

/** Two stacked tomato crates; `squish` 0..1 after Newt comes down on them (tomato juice, not gore) */
export const Crates: React.FC<{ x: number; squish: number; t: number; drip: number }> = ({ x, squish, t, drip }) => {
  const w = CRATE.w * 2;
  const h = CRATE.h;
  return (
    <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
      {[0, 1].map((k) => {
        const y = GROUND - (k + 1) * h;
        return (
          <g key={k}>
            <rect x={x - w / 2} y={y} width={w} height={h} fill="#e0b071" />
            {[0.33, 0.66].map((f) => (
              <line key={f} x1={x - w / 2} y1={y + h * f} x2={x + w / 2} y2={y + h * f} stroke="#b07f45" strokeWidth={5} />
            ))}
            <rect x={x - 70} y={y + h * 0.3} width={140} height={44} rx={6} fill="#fff6e0" strokeWidth={4} />
            <text x={x} y={y + h * 0.3 + 33} textAnchor="middle" fontFamily={FONT_STACK} fontSize={30} fill="#c0392b" stroke="none">
              TOMATOES
            </text>
          </g>
        );
      })}
      {/* tomatoes heaped on top: flattened where he came down */}
      {[...Array(7)].map((_, k) => {
        const cx = x - w / 2 + 30 + k * ((w - 60) / 6);
        const flat = squish * (k >= 1 && k <= 4 ? 1 : 0);
        return <ellipse key={k} cx={cx} cy={GROUND - 2 * h - 22 + flat * 12} rx={30 + flat * 10} ry={26 - flat * 14} fill="#e8412c" />;
      })}
      {/* one tomato knocked off the heap rolls away across the grass (a true parabola, then rolling) */}
      {drip > 0
        ? (() => {
            const tau = drip * 2.5; // s since it was knocked off
            const drop = 2 * h; // from the heap down to the grass
            const tFall = Math.sqrt((2 * drop) / G);
            const tf = Math.min(tau, tFall);
            const roll = Math.max(0, tau - tFall);
            const fx = x + w / 2 + 20 + 160 * tf + (110 / 0.9) * (1 - Math.exp(-0.9 * roll)); // rolls out and slows (friction)
            const fy = GROUND - drop - 26 + 0.5 * G * tf * tf;
            return <ellipse cx={fx} cy={fy} rx={28} ry={25} fill="#e8412c" transform={`rotate(${(fx - x) * 1.6} ${fx} ${fy})`} />;
          })()
        : null}
    </g>
  );
};

// ─── The car: a small hatchback, side view, nose at x (driving right) ──────
export const CAR_LEN = 3.9 * 240;
export const Car: React.FC<{ x: number; t: number; rollX: number }> = ({ x, rollX }) => {
  const L = CAR_LEN;
  const x0 = x - L;
  const wheelR = 78;
  const wheels = [x0 + 190, x - 170];
  const ang = (rollX / wheelR) * (180 / Math.PI);
  return (
    <g stroke={INK} strokeWidth={9} strokeLinejoin="round">
      <path
        d={`M ${x0 + 20} ${GROUND - 70} L ${x0 + 10} ${GROUND - 210} Q ${x0 + 20} ${GROUND - 300} ${x0 + 120} ${GROUND - 330} L ${x0 + 260} ${GROUND - 470} Q ${x0 + 330} ${GROUND - 520} ${x0 + 450} ${GROUND - 520} L ${x - 380} ${GROUND - 520} Q ${x - 300} ${GROUND - 515} ${x - 220} ${GROUND - 360} L ${x - 60} ${GROUND - 320} Q ${x} ${GROUND - 300} ${x} ${GROUND - 220} L ${x - 10} ${GROUND - 70} Z`}
        fill="#2bb3a3"
      />
      <path d={`M ${x0 + 140} ${GROUND - 340} L ${x0 + 280} ${GROUND - 480} L ${x0 + 470} ${GROUND - 480} L ${x0 + 470} ${GROUND - 340} Z`} fill="#bfe6ff" />
      <path d={`M ${x0 + 510} ${GROUND - 340} L ${x0 + 510} ${GROUND - 480} L ${x - 390} ${GROUND - 480} Q ${x - 320} ${GROUND - 470} ${x - 250} ${GROUND - 350} Z`} fill="#bfe6ff" />
      {/* the driver: hands at ten and two, eyes on the road */}
      <circle cx={x - 390} cy={GROUND - 420} r={34} fill="#e8b58a" strokeWidth={6} />
      <path d={`M ${x - 418} ${GROUND - 440} q 28 -30 60 -4`} fill="#4a2f1d" strokeWidth={5} />
      <line x1={x0 + 30} y1={GROUND - 240} x2={x - 30} y2={GROUND - 240} stroke="#1f8c7f" strokeWidth={8} />
      <rect x={x0 + 500} y={GROUND - 300} width={70} height={14} rx={6} fill="#e8f4f2" strokeWidth={4} />
      <path d={`M ${x - 40} ${GROUND - 300} q 34 6 36 50 l -30 0 Z`} fill="#fff6c8" strokeWidth={5} />
      <rect x={x0 + 6} y={GROUND - 290} width={24} height={50} rx={6} fill="#e63946" strokeWidth={5} />
      {wheels.map((wx) => (
        <g key={wx} transform={`translate(${wx} ${GROUND - wheelR})`}>
          <circle r={wheelR} fill="#2b2b33" />
          <g transform={`rotate(${ang})`}>
            <circle r={wheelR * 0.5} fill="#c9d3dc" strokeWidth={6} />
            {[0, 72, 144, 216, 288].map((a) => (
              <line key={a} x1={0} y1={0} x2={Math.cos((a * Math.PI) / 180) * wheelR * 0.45} y2={Math.sin((a * Math.PI) / 180) * wheelR * 0.45} strokeWidth={5} />
            ))}
          </g>
        </g>
      ))}
    </g>
  );
};

/** Speed lines and road grit behind a fast car */
export const SpeedLines: React.FC<{ x: number; t: number; k: number }> = ({ x, t, k }) =>
  k <= 0 ? null : (
    <g stroke="#ffffff" strokeLinecap="round" opacity={0.75 * k}>
      {[...Array(6)].map((_, i) => {
        const y = GROUND - 60 - i * 80;
        const len = 220 + 160 * random(`sl${i}`);
        const off = ((t * 900 + i * 130) % 300) - 150;
        return <line key={i} x1={x - CAR_LEN - 60 - off} y1={y} x2={x - CAR_LEN - 60 - off - len} y2={y} strokeWidth={8} />;
      })}
    </g>
  );

// ─── The pigeon ───────────────────────────────────────────────────────────
export const Pigeon: React.FC<{ x: number; h: number; t: number; flying: boolean; peck: boolean; facing: 1 | -1 }> = ({ x, h, t, flying, peck, facing }) => {
  const flap = flying ? Math.sin(t * 40) : 0;
  return (
    <g transform={`translate(${x} ${GROUND - h}) scale(${facing} 1)`} stroke={INK} strokeWidth={5} strokeLinejoin="round">
      {!flying ? (
        <path d="M -6 -6 L -10 0 M 6 -6 L 4 0" strokeWidth={4} stroke="#e07a5f" />
      ) : null}
      <ellipse cx={0} cy={-30} rx={38} ry={24} fill="#9aa5b1" />
      <path d={`M -30 -34 L -58 -40 L -52 -24 Z`} fill="#6f7a86" />
      <g transform={`translate(${peck ? 30 : 26} ${peck ? -30 : -52}) rotate(${peck ? 40 : 0})`}>
        <circle r={17} fill="#8c97a3" />
        <circle cx={6} cy={-4} r={3.5} fill={INK} stroke="none" />
        <path d="M 15 -2 L 27 2 L 15 6 Z" fill="#f2b33d" strokeWidth={3} />
      </g>
      <path d={`M -10 -40 Q 0 ${-70 - 50 * flap} 30 ${-40 - 60 * flap}`} fill="#7d8894" />
    </g>
  );
};

export const Puddle: React.FC<{ x: number; r: number; t: number }> = ({ x, r, t }) => (
  <g>
    <ellipse cx={x} cy={GROUND - 4} rx={r} ry={20} fill="#7fb6e0" stroke="#4f8cbd" strokeWidth={5} />
    <ellipse cx={x - r * 0.3} cy={GROUND - 9} rx={r * 0.35} ry={5} fill="#d6ecff" opacity={0.8 + 0.2 * Math.sin(t * 3)} />
  </g>
);

/** Newt's party hat on its own (speared on the knife, or held) — `spin` turns it like a top */
export const LooseHat: React.FC<{ x: number; y: number; spin: number; s?: number }> = ({ x, y, spin, s = 0.72 * 1.2 }) => {
  const k = Math.cos(spin);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={5.5} strokeLinejoin="round">
      <g transform={`scale(${0.35 + 0.65 * Math.abs(k)} 1)`}>
        <path d="M -27 0 L 0 -72 L 27 0 Z" fill="#ff4d6d" />
        <path d="M -16 -26 L 16 -32 M -7 -50 L 9 -53" stroke="#ffd23f" strokeWidth={6} strokeLinecap="round" />
        <circle cx={0} cy={-76} r={10} fill="#ffd23f" />
        <path d="M -27 0 Q 0 8 27 0" fill="none" />
      </g>
    </g>
  );
};

/** A puff of dust (off-screen-ish impacts, landings) */
export const Puff: React.FC<{ x: number; y: number; t: number; at: number; size?: number }> = ({ x, y, t, at, size = 1 }) => {
  const d = t - at;
  if (d < 0 || d > 0.7) return null;
  return (
    <g fill="#efe6d2" stroke={INK} strokeWidth={4} opacity={1 - d / 0.7}>
      {[...Array(6)].map((_, i) => {
        const a = Math.PI * (1.05 + (i / 5) * 0.9);
        const r = (20 + d * 160) * size;
        return <circle key={i} cx={x + Math.cos(a) * r * 1.4} cy={y + Math.sin(a) * r * 0.6} r={(16 + d * 30) * size} />;
      })}
    </g>
  );
};
