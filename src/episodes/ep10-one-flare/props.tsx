import React from "react";
import { GROUND } from "../../rig/Stickman";
import { TOON_INK } from "../../rig2d/Toon";
import { FONT_STACK } from "../../shared/ui";
import { groundY, HZ, proj, PX_PER_M, sOf, Z } from "./timeline";

// Painted 2D island set for ep10: a beach that looks out to sea (true perspective: the sea runs
// back to the horizon), palms, a flat rock, the wreck; plus the flight, the ship, the seaplane and
// the overhead island. Ink outlines everywhere, flat colour, a little shading.

const INK = TOON_INK;
const px = (m: number) => m * PX_PER_M;
export const mix = (a: string, b: string, u: number) => {
  const h = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const A = h(a);
  const B = h(b);
  const k = Math.max(0, Math.min(1, u));
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join("")}`;
};

// ─── Sky (screen space): day → dusk → night by `light` (1 day, 0 night), `dusk` warms it ──
export const Sky: React.FC<{ w: number; h: number; light: number; dusk?: number; storm?: number; sunX?: number; sunY?: number }> = ({ w, h, light, dusk = 0, storm = 0, sunX = 0.75, sunY = 0.14 }) => {
  const top = mix(mix(mix("#0d1636", "#3d8fe0", light), "#3b2a5e", dusk * 0.6), "#1d2330", storm);
  const bot = mix(mix(mix("#27325e", "#bfe9ff", light), "#ff9a5c", dusk), "#3c4452", storm);
  return (
    <g>
      <defs>
        <linearGradient id="sky10" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bot} />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill="url(#sky10)" />
      {/* stars at night */}
      <g opacity={Math.max(0, 1 - light * 1.6) * (1 - storm)}>
        {[...Array(46)].map((_, k) => (
          <circle key={k} cx={(k * 211) % w} cy={(k * 137) % (h * 0.6)} r={2 + (k % 3)} fill="#fff8d0" />
        ))}
      </g>
      <g opacity={(1 - storm) * Math.min(1, light * 2)}>
        <circle cx={w * sunX} cy={h * sunY} r={95} fill={mix("#fff3b0", "#ffb36b", dusk)} opacity={0.5} />
        <circle cx={w * sunX} cy={h * sunY} r={64} fill={mix("#ffe27a", "#ff7b3a", dusk)} stroke={INK} strokeWidth={5} />
      </g>
    </g>
  );
};

// ─── The sea, in perspective: horizon → shoreline, waves at real distances, the reef surf ──
export const Sea: React.FC<{ camX: number; t: number; light: number; dusk?: number }> = ({ camX, t, light, dusk = 0 }) => {
  const shore = groundY(Z.shore);
  const deep = mix(mix("#10294a", "#1f78b8", light), "#7a4f6a", dusk * 0.5);
  const near = mix(mix("#14385c", "#33a7d6", light), "#d0806a", dusk * 0.5);
  const rows = [12, 15, 19, 25, 34, 48, 70, 110, 180];
  return (
    <g>
      <defs>
        <linearGradient id="sea10" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={deep} />
          <stop offset="1" stopColor={near} />
        </linearGradient>
      </defs>
      <rect x={camX - 9000} y={HZ} width={18000} height={shore - HZ + 30} fill="url(#sea10)" />
      <line x1={camX - 9000} y1={HZ} x2={camX + 9000} y2={HZ} stroke={mix("#8fb9d8", "#e8f6ff", light)} strokeWidth={3} />
      {rows.map((Zr, r) =>
        [...Array(14)].map((_, k) => {
          const s = sOf(Zr);
          const xl = ((k * 997 + r * 431 + t * 60 * s) % 5000) - 2500;
          const p = proj(1100 + xl / s, Zr);
          const L = 110 * s * 4;
          return <path key={`${r}-${k}`} d={`M ${p.x} ${p.y} q ${L / 2} ${-L * 0.18} ${L} 0`} fill="none" stroke="#e8f6ff" strokeWidth={Math.max(1.5, 9 * s)} strokeLinecap="round" opacity={0.55 * (0.4 + light * 0.6)} />;
        }),
      )}
      {/* the reef: a line of white surf ~270 m out */}
      {[...Array(30)].map((_, k) => {
        const p = proj(1100 + (k - 15) * 900, Z.reef);
        const wob = Math.sin(t * 3 + k) * 2;
        return <ellipse key={k} cx={p.x + wob} cy={p.y} rx={13} ry={2.4} fill="#ffffff" opacity={0.7 * (0.4 + 0.6 * light)} />;
      })}
      {/* shore foam sliding up and back */}
      <path
        d={`M ${camX - 9000} ${shore + 6 + Math.sin(t * 1.4) * 6} ${[...Array(60)].map((_, k) => `Q ${camX - 9000 + k * 300 + 150} ${shore + 18 + Math.sin(t * 1.4) * 6} ${camX - 9000 + (k + 1) * 300} ${shore + 6 + Math.sin(t * 1.4 + k) * 6}`).join(" ")}`}
        fill="none"
        stroke="#ffffff"
        strokeWidth={9}
        strokeLinecap="round"
        opacity={0.85}
      />
    </g>
  );
};

/** the island's own coast curling out to sea on the left (it's a "?" from above), with palms */
export const Headland: React.FC<{ light: number }> = ({ light }) => {
  const a = proj(-2600, 60);
  const b = proj(-600, 140);
  const g = mix("#204d2a", "#4ea04a", light);
  return (
    <g stroke={INK} strokeWidth={4} strokeLinejoin="round">
      <path d={`M ${a.x - 2400} ${groundY(30)} Q ${a.x - 300} ${a.y - 260} ${a.x + 180} ${a.y - 40} Q ${b.x - 120} ${b.y - 90} ${b.x + 160} ${b.y} L ${a.x - 2400} ${b.y + 120} Z`} fill={g} />
      <path d={`M ${a.x - 2400} ${groundY(30) + 4} Q ${a.x - 300} ${a.y - 30} ${b.x + 160} ${b.y + 2}`} fill="none" stroke="#f2d59b" strokeWidth={6} />
      {[0, 1, 2].map((k) => {
        const x = a.x - 500 + k * 220;
        const y = a.y - 120 - k * 30;
        return (
          <g key={k}>
            <path d={`M ${x} ${y + 120} q 6 -60 -4 -120`} fill="none" stroke="#6b4a2b" strokeWidth={7} />
            <path d={`M ${x - 4} ${y} q 30 -20 56 6 M ${x - 4} ${y} q -30 -20 -56 6 M ${x - 4} ${y} q 10 -36 40 -30`} fill="none" stroke={g} strokeWidth={10} strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
};

// ─── Sand ────────────────────────────────────────────────────────────────
export const Sand: React.FC<{ camX: number; light: number; dusk?: number }> = ({ camX, light, dusk = 0 }) => {
  const shore = groundY(Z.shore);
  const sand = mix(mix("#5b5070", "#f2d59b", light), "#e7a57a", dusk * 0.5);
  const wet = mix(mix("#4a425e", "#d9b878", light), "#c98b68", dusk * 0.5);
  return (
    <g>
      <rect x={camX - 9000} y={shore} width={18000} height={4000} fill={sand} />
      <rect x={camX - 9000} y={shore} width={18000} height={groundY(7) - shore} fill={wet} />
      {/* ripples */}
      {[...Array(40)].map((_, k) => {
        const Zr = 0.5 + (k % 8) * 0.9;
        const p = proj(-1500 + ((k * 677) % 5200), Zr);
        return <path key={k} d={`M ${p.x} ${p.y} q ${30 * p.s} ${-6 * p.s} ${60 * p.s} 0`} stroke={mix(sand, "#000000", 0.12)} strokeWidth={4 * p.s} fill="none" />;
      })}
    </g>
  );
};

// ─── Palm (lane space): trunk curves, fronds stream with the offshore wind (+x) ──
export const Palm: React.FC<{ x: number; h: number; t: number; light: number; marks?: number; scratched?: boolean; day1?: boolean; bend?: number }> = ({ x, h, t, light, marks = 0, scratched, day1, bend = 1 }) => {
  const H = px(h);
  const top = { x: x + 70 * bend, y: GROUND - H };
  const green = mix("#1f4a26", "#3f9a45", light);
  const g2 = mix("#173a1e", "#2f7d37", light);
  const gust = Math.sin(t * 2.3) * 6;
  const frond = (ang: number, len: number, k: number) => {
    const a = ((ang + gust * 0.6) * Math.PI) / 180;
    const ex = top.x + Math.cos(a) * len;
    const ey = top.y + Math.sin(a) * len * 0.6 + len * 0.35;
    const cx = top.x + Math.cos(a) * len * 0.5;
    const cy = top.y + Math.sin(a) * len * 0.5 - 50;
    return <path key={k} d={`M ${top.x} ${top.y} Q ${cx} ${cy} ${ex} ${ey}`} fill="none" stroke={k % 2 ? g2 : green} strokeWidth={30} strokeLinecap="round" />;
  };
  return (
    <g stroke={INK} strokeLinejoin="round">
      <path d={`M ${x - 26} ${GROUND} Q ${x - 10} ${GROUND - H * 0.5} ${top.x - 16} ${top.y} L ${top.x + 16} ${top.y} Q ${x + 30} ${GROUND - H * 0.5} ${x + 30} ${GROUND} Z`} fill={mix("#4a3420", "#9c6b3c", light)} strokeWidth={6} />
      {[...Array(12)].map((_, k) => {
        const u = (k + 0.5) / 12;
        const yy = GROUND - H * u;
        const xx = x + 2 + (top.x - x) * u * u;
        return <path key={k} d={`M ${xx - 24 + 6 * u} ${yy} q 24 10 ${44 - 12 * u} 0`} fill="none" stroke={mix("#3a2818", "#7d532c", light)} strokeWidth={4} />;
      })}
      {/* tally marks carved into the trunk at ~1 m */}
      {marks > 0 || day1 ? (
        <g transform={`translate(${x + 2} ${GROUND - px(1.05)})`} stroke="#fff3d6" strokeWidth={6} strokeLinecap="round">
          {[...Array(Math.min(5, marks))].map((_, k) => (k < 4 ? <line key={k} x1={-24 + k * 12} y1={-26} x2={-24 + k * 12} y2={26} /> : <line key={k} x1={-32} y1={20} x2={20} y2={-20} />))}
          {scratched ? <path d="M -36 -10 l 64 -4 M -36 6 l 64 -6 M -36 18 l 64 2" stroke={INK} strokeWidth={5} /> : null}
          {day1 ? (
            <text x={-4} y={78} textAnchor="middle" fontFamily={FONT_STACK} fontSize={38} fill="#fff3d6" stroke="none">
              DAY 1
            </text>
          ) : null}
        </g>
      ) : null}
      {[200, 160, 120, 20, -20, -60, 80].map((a, k) => frond(a, 230 - (k % 3) * 25, k))}
      <circle cx={top.x - 14} cy={top.y + 22} r={18} fill="#6b4a2b" strokeWidth={4} />
      <circle cx={top.x + 14} cy={top.y + 26} r={18} fill="#7a5532" strokeWidth={4} />
    </g>
  );
};

// ─── The flat rock (lane space). The flare gun sits on top while `gun` ──
export const Rock: React.FC<{ x: number; h: number; w: number; light: number; gun: boolean }> = ({ x, h, w, light, gun }) => {
  const H = px(h);
  const W = px(w);
  return (
    <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
      <path d={`M ${x - W / 2} ${GROUND} Q ${x - W / 2 - 20} ${GROUND - H * 0.6} ${x - W / 2 + 40} ${GROUND - H} L ${x + W / 2 - 30} ${GROUND - H - 6} Q ${x + W / 2 + 20} ${GROUND - H * 0.5} ${x + W / 2} ${GROUND} Z`} fill={mix("#3d3f4c", "#8d8e99", light)} />
      <path d={`M ${x - W / 2 + 50} ${GROUND - H + 10} L ${x + W / 2 - 40} ${GROUND - H + 4}`} stroke={mix("#555766", "#b3b4bd", light)} strokeWidth={10} strokeLinecap="round" />
      {gun ? <FlareGun x={x + 20} y={GROUND - H - 10} rot={0} s={1} /> : null}
    </g>
  );
};

/** an orange flare pistol; (x, y) = the grip; rot = barrel angle (0 = barrel pointing right) */
export const FlareGun: React.FC<{ x: number; y: number; rot: number; s: number }> = ({ x, y, rot, s }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} stroke={INK} strokeWidth={5} strokeLinejoin="round">
    <path d="M -14 -10 L 62 -10 L 62 12 L 10 12 L 4 34 L -16 34 L -12 10 Z" fill="#ff7a1a" />
    <rect x={38} y={-16} width={34} height={30} rx={8} fill="#ff9a3c" />
    <circle cx={72} cy={-1} r={7} fill="#222" />
  </g>
);

/** the orange EMERGENCY KIT box (lane space) */
export const Kit: React.FC<{ x: number; open: number }> = ({ x, open }) => (
  <g stroke={INK} strokeWidth={6} strokeLinejoin="round">
    <rect x={x - 70} y={GROUND - 70} width={140} height={70} rx={8} fill="#ff7a1a" />
    <g transform={`rotate(${-100 * open} ${x - 70} ${GROUND - 70})`}>
      <rect x={x - 74} y={GROUND - 86} width={148} height={18} rx={6} fill="#ff9a3c" />
    </g>
    <rect x={x - 18} y={GROUND - 52} width={36} height={36} fill="#fff" strokeWidth={4} />
    <path d={`M ${x} ${GROUND - 46} v 24 M ${x - 12} ${GROUND - 34} h 24`} stroke="#e63946" strokeWidth={7} />
  </g>
);

// ─── The wreck (lane space): the tour helicopter, nose right, on its skids ──
export const Heli: React.FC<{ x: number; y: number; rotor: number; blur: number; tilt?: number; s?: number; dead?: boolean; fin?: boolean; door?: number; screen?: string; smoke?: number; t?: number }> = ({ x, y, rotor, blur, tilt = 0, s = 1, dead, fin = true, door = 0, smoke = 0, t = 0 }) => {
  const body = "#ffd23f";
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${s})`} stroke={INK} strokeWidth={7} strokeLinejoin="round">
      {/* smoke from the engine, blown out to sea (+x) */}
      {smoke > 0
        ? [...Array(7)].map((_, k) => {
            const u = ((t * 0.5 + k / 7) % 1) * smoke;
            return <circle key={k} cx={-120 + u * 520} cy={-250 - u * 300} r={26 + u * 70} fill="#5a5a5a" opacity={0.55 * (1 - u)} stroke="none" />;
          })
        : null}
      {/* skids */}
      <path d="M -230 -8 L 160 -8 Q 196 -8 204 -30 M -150 -8 L -130 -60 M 80 -8 L 60 -60" fill="none" strokeWidth={9} />
      {/* tail boom + fin */}
      <path d="M -170 -150 L -520 -170 L -520 -130 L -170 -100 Z" fill={body} />
      {fin ? <path d="M -520 -170 L -560 -270 L -500 -270 L -480 -150 Z" fill="#e63946" /> : null}
      <circle cx={-520} cy={-150} r={30} fill="#888" />
      {/* cabin bubble */}
      <path d="M -220 -60 Q -250 -220 -60 -250 Q 160 -250 200 -110 Q 210 -60 160 -60 Z" fill={body} />
      <path d="M -40 -232 Q 140 -232 176 -110 L 30 -110 Z" fill="#bfe6ff" />
      {dead ? <path d="M 60 -200 l 40 30 l -10 30 l 40 20 M 120 -224 l -10 40" fill="none" strokeWidth={5} /> : null}
      {/* the door */}
      <g transform={`rotate(${door * 82} -150 -60)`}>
        <path d="M -150 -60 L -150 -200 L -30 -210 L -30 -60 Z" fill={mix(body, "#f0b81f", 0.6)} />
        <rect x={-130} y={-190} width={80} height={70} rx={10} fill="#bfe6ff" />
      </g>
      <text x={-90} y={-82} textAnchor="middle" fontFamily={FONT_STACK} fontSize={24} fill="#1d3557" stroke="none">
        SKY TOURS
      </text>
      {/* mast + rotor */}
      <rect x={-20} y={-290} width={24} height={44} fill="#666" />
      {blur > 0.5 ? (
        <ellipse cx={-8} cy={-292} rx={420} ry={14} fill="#cfd8e3" opacity={0.6} strokeWidth={4} />
      ) : (
        <g>
          {[0, 1].map((k) => {
            const a = rotor + k * Math.PI;
            const L = 420 * Math.cos(a);
            return <path key={k} d={`M -8 -292 L ${-8 + L} ${-292 + (dead ? 30 * Math.abs(Math.cos(a)) : 0)}`} strokeWidth={14} stroke="#3a3a3a" strokeLinecap="round" />;
          })}
        </g>
      )}
      <circle cx={-8} cy={-292} r={14} fill="#333" />
    </g>
  );
};

/** a driftwood log (lane space), lying from (x0) to (x1) at height 0 */
export const Log: React.FC<{ x0: number; y0: number; x1: number; y1: number; w?: number }> = ({ x0, y0, x1, y1, w = 26 }) => (
  <g>
    <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={INK} strokeWidth={w + 12} strokeLinecap="round" />
    <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#a77a4b" strokeWidth={w} strokeLinecap="round" />
    <line x1={x0 + (x1 - x0) * 0.2} y1={y0 + (y1 - y0) * 0.2 - w * 0.15} x2={x0 + (x1 - x0) * 0.7} y2={y0 + (y1 - y0) * 0.7 - w * 0.15} stroke="#c99a68" strokeWidth={w * 0.25} strokeLinecap="round" />
  </g>
);

// ─── HELP letters as stroke lists, in metres: letter 3 m wide × 5 m tall ──
const LET: Record<string, [number, number, number, number][]> = {
  H: [
    [0, 0, 0, 5],
    [3, 0, 3, 5],
    [0, 2.5, 3, 2.5],
  ],
  E: [
    [0, 0, 0, 5],
    [0, 0, 3, 0],
    [0, 2.5, 2.4, 2.5],
    [0, 5, 3, 5],
  ],
  L: [
    [0, 0, 0, 5],
    [0, 5, 3, 5],
  ],
  P: [
    [0, 0, 0, 5],
    [0, 0, 2.6, 0],
    [2.6, 0, 3, 1.2],
    [3, 1.2, 2.6, 2.5],
    [0, 2.5, 2.6, 2.5],
  ],
};
export const HELP_W = 4 * 3 + 3 * 1.2; // m
/** strokes of the sign in metres (x along the beach, y toward the sea), `n` letters laid */
export const helpStrokes = (n: number) => {
  const out: [number, number, number, number][] = [];
  "HELP".split("").forEach((ch, i) => {
    if (i >= n) return;
    LET[ch].forEach(([a, b, c, d]) => out.push([i * 4.2 + a, 5 - b, i * 4.2 + c, 5 - d]));
  });
  return out;
};

/** the sign seen from the beach: logs flat on the sand (true perspective), drawn in world space */
export const SignSide: React.FC<{ n: number; x0: number; Z0: number }> = ({ n, x0, Z0 }) => (
  <g>
    {helpStrokes(n).map(([a, b, c, d], k) => {
      const p = proj(x0 + px(a), Z0 + b);
      const q = proj(x0 + px(c), Z0 + d);
      return <Log key={k} x0={p.x} y0={p.y} x1={q.x} y1={q.y} w={Math.max(5, 90 * ((p.s + q.s) / 2))} />;
    })}
  </g>
);

// ─── A speech bubble (screen-ish, scaled) ─────────────────────────────────
export const Bubble: React.FC<{ x: number; y: number; s: number; text: string; alpha: number; tail?: number }> = ({ x, y, s, text, alpha, tail = -1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={alpha}>
    <path d={`M -150 -70 Q -170 -70 -170 -46 L -170 46 Q -170 70 -146 70 L ${-60 * tail} 70 L ${-120 * tail} 120 L ${-20 * tail} 70 L 146 70 Q 170 70 170 46 L 170 -46 Q 170 -70 146 -70 Z`} fill="#fff" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
    <text x={0} y={30} textAnchor="middle" fontFamily={FONT_STACK} fontSize={88} fill="#e63946">
      {text}
    </text>
  </g>
);

/** a gull (world space), wings flapping; `beak` = something in its beak */
export const Gull: React.FC<{ x: number; y: number; s: number; t: number; facing?: number; beak?: boolean }> = ({ x, y, s, t, facing = 1, beak }) => {
  const f = Math.sin(t * 14) * 22;
  return (
    <g transform={`translate(${x} ${y}) scale(${s * facing} ${s})`} stroke={INK} strokeWidth={5} strokeLinejoin="round">
      <path d={`M -10 0 Q -60 ${-30 - f} -110 ${-10 - f * 1.4}`} fill="none" strokeWidth={14} stroke="#ffffff" />
      <path d={`M -10 0 Q -60 ${-30 - f} -110 ${-10 - f * 1.4}`} fill="none" strokeWidth={4} />
      <ellipse cx={0} cy={0} rx={46} ry={22} fill="#fff" />
      <circle cx={40} cy={-14} r={18} fill="#fff" />
      <path d="M 54 -14 L 82 -8 L 54 -4 Z" fill="#ffb02e" />
      <circle cx={46} cy={-18} r={3.5} fill={INK} />
      <path d={`M 10 0 Q 60 ${-30 - f} 110 ${-10 - f * 1.4}`} fill="none" strokeWidth={14} stroke="#e8eef4" />
      {beak ? <rect x={74} y={-22} width={34} height={22} rx={6} fill="#fff" strokeWidth={3} /> : null}
    </g>
  );
};

// ─── The seaplane, seen from below-front (world space); `roll` rocks the wings ──
export const Seaplane: React.FC<{ x: number; y: number; s: number; roll: number; t: number }> = ({ x, y, s, roll, t }) => (
  <g transform={`translate(${x} ${y}) rotate(${roll}) scale(${s})`} stroke={INK} strokeWidth={6} strokeLinejoin="round">
    <path d="M -420 -10 L 420 -10 L 400 16 L -400 16 Z" fill="#e63946" />
    <path d="M -420 -10 L -380 -10 L -380 16 L -400 16 Z M 380 -10 L 420 -10 L 400 16 L 380 16 Z" fill="#ffffff" />
    <circle cx={0} cy={18} r={52} fill="#f4f4f4" />
    <circle cx={0} cy={10} r={30} fill="#bfe6ff" />
    {/* floats */}
    <path d="M -150 30 L -130 110 M 150 30 L 130 110" fill="none" strokeWidth={7} />
    <ellipse cx={-130} cy={120} rx={44} ry={18} fill="#f4f4f4" />
    <ellipse cx={130} cy={120} rx={44} ry={18} fill="#f4f4f4" />
    {/* the propeller disc */}
    <ellipse cx={0} cy={18} rx={78} ry={78} fill="#ffffff" opacity={0.25} strokeWidth={3} />
    <line x1={-78 * Math.cos(t * 40)} y1={18 - 78 * Math.sin(t * 40)} x2={78 * Math.cos(t * 40)} y2={18 + 78 * Math.sin(t * 40)} strokeWidth={6} />
    <path d="M -60 -12 L 0 -70 L 60 -12" fill="#e63946" />
  </g>
);

// ─── MV HOPE, in its own metres (x: −25 stern … +25 bow, y up from the waterline) ──
export type ShipState = {
  t: number;
  crew: "deck" | "wave" | "point" | "boat" | "row";
  boat: number; // 0 on the davits … 1 in the water
  row: number; // 0 … 1 rowing away (metres scaled inside)
  fire: number; // 0 … 1 how many drums are burning
  burst: number; // seconds since the drum burst (−1 = not yet)
  sink: number; // 0 … 1
  flareOn: boolean;
};
const DRUMS: [number, number][] = [...Array(14)].map((_, k) => [-7 + (k % 7) * 2.1, k < 7 ? 0 : 1.15]);
export const Ship: React.FC<{ x: number; y: number; ppm: number; st: ShipState; light: number; dusk?: number }> = ({ x, y, ppm, st, light, dusk = 0 }) => {
  const id = "shipclip10";
  // sinking: stern first, the bow rises, then all of it slides under
  const ang = -38 * Math.min(1, st.sink * 1.6);
  const down = Math.max(0, st.sink - 0.25) * 34;
  const tone = (c: string) => mix(mix(c, "#1a1a2e", 1 - light), "#ff9a5c", dusk * 0.2);
  const flames = (cx: number, cy: number, k: number, size: number) => {
    const f = 0.8 + 0.25 * Math.sin(st.t * 17 + k * 2.1);
    return (
      <g key={`f${k}`} transform={`translate(${cx} ${cy}) scale(${size * f} ${-size * f})`}>
        <path d="M -0.7 0 Q -0.9 1.2 -0.2 2 Q -0.1 1.2 0.2 1.6 Q 0.3 2.4 0.9 2.8 Q 1 1.4 0.7 0 Z" fill="#ff7a1a" />
        <path d="M -0.35 0 Q -0.45 0.8 0 1.3 Q 0.2 0.8 0.4 0 Z" fill="#ffd23f" />
      </g>
    );
  };
  const nFire = Math.round(st.fire * DRUMS.length);
  return (
    <g transform={`translate(${x} ${y}) scale(${ppm} ${-ppm})`}>
      <defs>
        <clipPath id={id}>
          <rect x={-200} y={-0.15} width={400} height={200} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <g transform={`translate(0 ${-down}) rotate(${-ang} 0 0)`} strokeLinejoin="round">
          {/* hull */}
          <path d="M -25 6 L 25 6 L 23 2 Q 20 -4 14 -4 L -22 -4 Q -25 -2 -25 6 Z" fill={tone("#2b2d3a")} stroke={INK} strokeWidth={0.35} />
          <path d="M -24.6 -1.5 L 21.5 -1.5 Q 19 -4 14 -4 L -22 -4 Q -24 -3 -24.6 -1.5 Z" fill={tone("#b83a2c")} stroke={INK} strokeWidth={0.25} />
          <text x={15} y={-2.4} fontFamily={FONT_STACK} fontSize={2.1} fill="#ffffff" transform="scale(1 -1)">
            MV HOPE
          </text>
          {/* the hole the burst opened (at the waterline) */}
          {st.burst >= 0 ? <path d="M -2 -0.6 L 0.4 0.9 L 2.2 -0.2 L 1 -1.6 Z" fill="#111" stroke="#ff7a1a" strokeWidth={0.25} /> : null}
          {/* rail + life rings */}
          <line x1={-25} y1={7} x2={23} y2={7} stroke={INK} strokeWidth={0.25} />
          {[-12, 8].map((rx) => (
            <circle key={rx} cx={rx} cy={4.5} r={0.7} fill="none" stroke="#ff7a1a" strokeWidth={0.35} />
          ))}
          {/* superstructure, funnel, mast */}
          <rect x={-22} y={6} width={10} height={6} fill={tone("#f4f4f4")} stroke={INK} strokeWidth={0.3} />
          <rect x={-21} y={12} width={7} height={3} fill={tone("#f4f4f4")} stroke={INK} strokeWidth={0.3} />
          {[-20.4, -18.4, -16.4].map((wx) => (
            <rect key={wx} x={wx} y={12.8} width={1.4} height={1.2} fill="#9ad3ff" stroke={INK} strokeWidth={0.15} />
          ))}
          <rect x={-19} y={15} width={3} height={4} fill={tone("#e63946")} stroke={INK} strokeWidth={0.3} />
          <line x1={10} y1={6} x2={10} y2={30} stroke={INK} strokeWidth={0.45} />
          <line x1={10} y1={24} x2={14} y2={24} stroke={INK} strokeWidth={0.3} />
          {/* the fuel drums on deck */}
          {DRUMS.map(([dx, dy], k) => (
            <g key={k}>
              <rect x={dx - 0.75 + (dy ? 0.6 : 0)} y={6 + dy} width={1.5} height={1.15} rx={0.15} fill={tone(k < nFire ? "#7a2a1e" : "#d6362a")} stroke={INK} strokeWidth={0.18} />
            </g>
          ))}
          <text x={-1} y={-9.9} textAnchor="middle" fontFamily={FONT_STACK} fontSize={1.05} fill="#ffffff" stroke={INK} strokeWidth={0.18} paintOrder="stroke" transform="scale(1 -1)">
            FUEL · NO FLAMES
          </text>
          {/* the lifeboat on its davits until lowered */}
          {st.boat <= 0 ? <Lifeboat x={-17} y={9} crew={0} /> : null}
          {/* crew on deck (not once they're in the boat) */}
          {st.crew !== "boat" && st.crew !== "row"
            ? [-11, -9.6, 14, 15.6, 17].map((cx, k) => <Sailor key={k} x={cx} y={6} t={st.t} k={k} mode={st.crew} />)
            : null}
          {/* fire */}
          {st.fire > 0 ? DRUMS.slice(0, nFire).map(([dx, dy], k) => flames(dx + (dy ? 0.6 : 0), 7.2 + dy, k, 1.2 + st.fire * 0.8)) : null}
          {st.fire > 0.5 ? [-4, 0, 4, 8].map((fx, k) => flames(fx, 8, 20 + k, 2.6 + st.sink * 2)) : null}
          {st.flareOn ? <circle cx={-0.5} cy={7.6} r={0.9} fill="#ff5ca8" opacity={0.9} /> : null}
        </g>
      </g>
      {/* the lifeboat in the water, rowing away from the island (smaller as it goes) */}
      {st.boat > 0 ? (
        <g transform={`translate(${-17 - 22 * st.row} ${9 * (1 - st.boat) + 0.4 * Math.sin(st.t * 3)}) scale(${1 - 0.35 * st.row})`}>
          <Lifeboat x={0} y={0} crew={st.crew === "boat" || st.crew === "row" ? 5 : 0} t={st.t} rowing={st.crew === "row"} />
        </g>
      ) : null}
      {/* the burst: a fireball and black smoke */}
      {st.burst >= 0 && st.burst < 1.2 ? (
        <g transform={`translate(0 6)`}>
          <circle r={4 + st.burst * 14} fill="#ffd23f" opacity={Math.max(0, 1 - st.burst * 1.1)} />
          <circle r={2 + st.burst * 10} fill="#ff7a1a" opacity={Math.max(0, 1 - st.burst * 0.9)} />
        </g>
      ) : null}
      {st.fire > 0
        ? [...Array(9)].map((_, k) => {
            const u = (st.t * 0.25 + k / 9) % 1;
            return <circle key={k} cx={-1 + u * 26} cy={10 + u * 40 - down * 0.3} r={2 + u * 7} fill="#2b2b2b" opacity={0.55 * (1 - u) * Math.min(1, st.fire * 2) * (1 - st.sink * 0.6)} />;
          })
        : null}
      {/* bubbles and steam where it went down */}
      {st.sink > 0.85
        ? [...Array(10)].map((_, k) => {
            const u = (st.t * 0.9 + k / 10) % 1;
            return <circle key={k} cx={-6 + k * 1.4} cy={u * 4} r={0.3 + u * 0.5} fill="#ffffff" opacity={0.8 * (1 - u)} stroke={INK} strokeWidth={0.08} />;
          })
        : null}
    </g>
  );
};

const Sailor: React.FC<{ x: number; y: number; t: number; k: number; mode: ShipState["crew"] }> = ({ x, y, t, k, mode }) => {
  const wave = mode === "wave" ? Math.sin(t * 9 + k) * 30 : 0;
  const armA = mode === "wave" ? 150 + wave : mode === "point" ? 115 : 20;
  const a = (armA * Math.PI) / 180;
  return (
    <g transform={`translate(${x} ${y})`} stroke={INK} strokeWidth={0.12} strokeLinejoin="round">
      <rect x={-0.28} y={0} width={0.56} height={0.9} fill="#1d3557" />
      <rect x={-0.32} y={0.9} width={0.64} height={0.7} rx={0.15} fill="#f4f4f4" />
      <circle cx={0} cy={1.95} r={0.3} fill="#f1c08f" />
      <rect x={-0.32} y={2.15} width={0.64} height={0.16} fill="#1d3557" />
      <line x1={0.2} y1={1.45} x2={0.2 + Math.sin(a) * 0.75} y2={1.45 - Math.cos(a) * 0.75} strokeWidth={0.18} stroke="#f4f4f4" />
    </g>
  );
};

export const Lifeboat: React.FC<{ x: number; y: number; crew: number; t?: number; rowing?: boolean }> = ({ x, y, crew, t = 0, rowing }) => (
  <g transform={`translate(${x} ${y})`} stroke={INK} strokeWidth={0.2} strokeLinejoin="round">
    {[...Array(crew)].map((_, k) => (
      <g key={k} transform={`translate(${-2.2 + k * 1.1} 0.9)`}>
        <circle cx={0} cy={0.6} r={0.3} fill="#f1c08f" />
        <rect x={-0.3} y={-0.2} width={0.6} height={0.6} fill="#f4f4f4" />
        {rowing ? <line x1={0} y1={0} x2={0.9 * Math.cos(t * 7 + k)} y2={-0.9} stroke="#8b5a2b" strokeWidth={0.16} /> : null}
      </g>
    ))}
    <path d="M -3.2 1 L 3.2 1 Q 3 -0.6 2 -0.8 L -2.4 -0.8 Q -3.2 -0.4 -3.2 1 Z" fill="#ff7a1a" />
  </g>
);

/** the flare: a hot pink-white star, a smoke trail, a little parachute after the pop */
export const Flare: React.FC<{ x: number; y: number; s: number; chute: number; t: number; trail: { x: number; y: number }[] }> = ({ x, y, s, chute, t, trail }) => {
  const r = 20 * s;
  return (
    <g>
      {trail.length > 1 ? <polyline points={trail.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#d9d4dc" strokeWidth={Math.max(3, 16 * s)} strokeLinecap="round" opacity={0.6} /> : null}
      <circle cx={x} cy={y} r={r * 4.5} fill="#ff5ca8" opacity={0.18 + 0.05 * Math.sin(t * 30)} />
      <circle cx={x} cy={y} r={r * 2.2} fill="#ff8fc4" opacity={0.45} />
      <circle cx={x} cy={y} r={r} fill="#fff4fb" stroke="#ff2e88" strokeWidth={Math.max(2, 5 * s)} />
      {chute > 0 ? (
        <g transform={`translate(${x} ${y}) scale(${s * 2.2 * chute})`} stroke={INK} strokeWidth={4} strokeLinejoin="round">
          <path d="M 0 -18 L -60 -110 M 0 -18 L 0 -118 M 0 -18 L 60 -110" fill="none" strokeWidth={3} />
          <path d="M -70 -108 Q 0 -190 70 -108 Q 35 -122 0 -112 Q -35 -122 -70 -108 Z" fill="#ffffff" />
          <path d="M -24 -118 Q 0 -150 24 -118" fill="none" stroke="#ff7a1a" strokeWidth={6} />
        </g>
      ) : null}
    </g>
  );
};

// ─── Overhead (top-down) views ─────────────────────────────────────────────
/** the island from above: a "?" — hook-shaped main island and a round islet as the dot */
export const ISLAND_HOOK = "M 380 980 Q 330 860 420 800 Q 560 720 600 600 Q 640 460 540 380 Q 420 300 300 380 Q 240 430 250 500 Q 180 520 160 460 Q 140 300 300 230 Q 470 160 640 260 Q 790 360 760 560 Q 730 740 560 840 Q 500 880 520 990 Q 470 1010 380 980 Z";
export const IslandTop: React.FC<{ t: number; showSign: number }> = ({ t, showSign }) => (
  <g stroke={INK} strokeLinejoin="round">
    <path d={ISLAND_HOOK} fill="#f2d59b" strokeWidth={6} transform="translate(-6 8)" opacity={0.6} />
    <path d={ISLAND_HOOK} fill="#f2d59b" strokeWidth={6} />
    <path d={ISLAND_HOOK} fill="#3f9a45" strokeWidth={0} transform="translate(470 640) scale(0.82) translate(-470 -640)" />
    <circle cx={470} cy={1180} r={92} fill="#f2d59b" strokeWidth={6} />
    <circle cx={470} cy={1180} r={64} fill="#3f9a45" strokeWidth={0} />
    {/* palm crowns */}
    {[...Array(26)].map((_, k) => {
      const a = (k / 26) * Math.PI * 2;
      const r = 120 + (k % 4) * 30;
      const cx = 470 + Math.cos(a) * r * 1.1;
      const cy = 560 + Math.sin(a) * r * 1.4;
      return <circle key={k} cx={cx} cy={cy} r={20} fill="#2f7d37" strokeWidth={3} />;
    })}
    {/* the HELP sign on the bottom beach of the hook, readable from the sky */}
    <g transform="translate(395 930) scale(1.6)" opacity={showSign}>
      {helpStrokes(4).map(([a, b, c, d], k) => (
        <line key={k} x1={a * 4} y1={-b * 4} x2={c * 4} y2={-d * 4} stroke="#6b4a2b" strokeWidth={3.6} strokeLinecap="round" />
      ))}
    </g>
    {/* surf around it */}
    <path d={ISLAND_HOOK} fill="none" stroke="#ffffff" strokeWidth={4} opacity={0.6 + 0.3 * Math.sin(t * 2)} transform="translate(470 640) scale(1.04) translate(-470 -640)" />
  </g>
);

/** the sign close-up from above: sand, the sea at the top, logs laid so far */
export const SignTop: React.FC<{ w: number; h: number; n: number; place: number; t: number; who: { x: number; y: number }; dash?: { x: number; y: number } }> = ({ w, h, n, place, t, who, dash }) => {
  const S = 62; // px per metre
  const ox = (w - HELP_W * S) / 2;
  const oy = h * 0.32;
  const strokes = helpStrokes(n);
  const fresh = helpStrokes(n).length - helpStrokes(Math.max(0, n - 1)).length;
  return (
    <g>
      <rect width={w} height={h} fill="#f2d59b" />
      <rect width={w} height={h * 0.18} fill="#33a7d6" />
      <path d={`M 0 ${h * 0.18} ${[...Array(12)].map((_, k) => `Q ${k * 100 + 50} ${h * 0.18 + 26 + Math.sin(t * 2 + k) * 6} ${(k + 1) * 100} ${h * 0.18}`).join(" ")}`} fill="none" stroke="#fff" strokeWidth={14} />
      <rect y={h * 0.18} width={w} height={60} fill="#d9b878" opacity={0.6} />
      {strokes.map(([a, b, c, d], k) => {
        const isNew = k >= strokes.length - fresh;
        const u = isNew ? Math.max(0, Math.min(1, place * fresh - (k - (strokes.length - fresh)))) : 1;
        if (u <= 0) return null;
        const x0 = ox + a * S;
        const y0 = oy + (5 - b) * S;
        const x1 = ox + c * S;
        const y1 = oy + (5 - d) * S;
        const dx = (1 - u) * 120;
        return <Log key={k} x0={x0 + dx} y0={y0 + dx * 0.3} x1={x1 + dx} y1={y1 + dx * 0.3} w={22} />;
      })}
      <TopNewt x={who.x} y={who.y} t={t} s={1.8} />
      {dash ? <TopDash x={dash.x} y={dash.y} t={t} s={1.6} /> : null}
    </g>
  );
};

/** Newt from above: party hat (a red circle with the yellow pom-pom), green shoulders */
export const TopNewt: React.FC<{ x: number; y: number; t: number; s?: number }> = ({ x, y, t, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={5}>
    <ellipse cx={0} cy={8} rx={46} ry={26} fill="#5cb860" />
    <circle cx={0} cy={0} r={26} fill="#7a4321" />
    <circle cx={0} cy={0} r={18} fill="#ff4d6d" />
    <circle cx={2} cy={-2} r={7} fill="#ffd23f" />
    <ellipse cx={-50} cy={14 + Math.sin(t * 8) * 4} rx={10} ry={10} fill="#f7d2ad" />
    <ellipse cx={50} cy={14 - Math.sin(t * 8) * 4} rx={10} ry={10} fill="#f7d2ad" />
  </g>
);
export const TopDash: React.FC<{ x: number; y: number; t: number; s?: number }> = ({ x, y, t, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={5}>
    <ellipse cx={0} cy={8} rx={62} ry={30} fill="#3b7dd8" />
    <ellipse cx={0} cy={4} rx={40} ry={22} fill="#ff8a1f" />
    <path d="M -26 -6 L -20 -30 L -6 -14 L 2 -36 L 10 -14 L 24 -30 L 26 -6 Q 0 14 -26 -6 Z" fill="#4a2f1d" />
    <path d={`M 30 10 l ${50 + Math.sin(t * 3) * 6} 24`} stroke="#ff8a1f" strokeWidth={14} strokeLinecap="round" />
  </g>
);

// ─── The flight: open sea below, the storm wall ahead ───────────────────────
export const StormWall: React.FC<{ x: number; t: number; flash: number }> = ({ x, t, flash }) => (
  <g stroke={INK} strokeWidth={6}>
    {[0, 1, 2, 3, 4].map((k) => (
      <ellipse key={k} cx={x + k * 260} cy={300 + (k % 2) * 160 + Math.sin(t + k) * 10} rx={340} ry={260} fill={mix("#2c3140", "#cfd6ff", flash * 0.6)} />
    ))}
    <rect x={x - 100} y={400} width={1800} height={1600} fill={mix("#2c3140", "#cfd6ff", flash * 0.6)} stroke="none" />
    {[...Array(30)].map((_, k) => (
      <line key={k} x1={x - 60 + k * 60} y1={700} x2={x - 120 + k * 60} y2={1500} stroke="#7d8798" strokeWidth={4} opacity={0.6} />
    ))}
  </g>
);

export const Bolt: React.FC<{ x0: number; y0: number; x1: number; y1: number; seed: number }> = ({ x0, y0, x1, y1, seed }) => {
  const pts = [...Array(9)].map((_, k) => {
    const u = k / 8;
    const j = k === 0 || k === 8 ? 0 : (((seed * 31 + k * 57) % 100) / 100 - 0.5) * 120;
    return `${x0 + (x1 - x0) * u + j},${y0 + (y1 - y0) * u}`;
  });
  return (
    <g>
      <polyline points={pts.join(" ")} fill="none" stroke="#fffbd0" strokeWidth={34} opacity={0.4} strokeLinejoin="bevel" />
      <polyline points={pts.join(" ")} fill="none" stroke="#ffffff" strokeWidth={12} strokeLinejoin="bevel" />
    </g>
  );
};

export const OpenSea: React.FC<{ w: number; y: number; t: number; dark: number }> = ({ w, y, t, dark }) => (
  <g>
    <rect x={-2000} y={y} width={w + 4000} height={3000} fill={mix("#2f8fc9", "#1b2a3a", dark)} />
    {[...Array(60)].map((_, k) => {
      const row = Math.floor(k / 10);
      const xx = ((k * 181 + t * 140) % (w + 400)) - 200;
      const yy = y + 40 + row * 70 + row * row * 10;
      return <path key={k} d={`M ${xx} ${yy} q 30 -14 60 0`} fill="none" stroke="#e8f6ff" strokeWidth={4 + row} opacity={0.5} />;
    })}
  </g>
);

export { GROUND };
