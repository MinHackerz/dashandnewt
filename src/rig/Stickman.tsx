import React from "react";
import type { CharState, Expr, Hand, Pose } from "./types";

export const INK = "#1b1b1b";
export const BACK_INK = "#5a5a5a"; // far-side limbs, so overlapping limbs stay readable
export const STROKE = 13;

const L = { thigh: 82, shin: 80, torso: 150, neck: 16, head: 46, upper: 72, fore: 68 };
export const HEAD_R = L.head;
// Big-head cartoon proportions: faces read at phone size and every expression lands harder.
// The whole head group (face, hats, helmet, bandage, beard) scales together.
export const HEAD_SCALE = 1.2;

type P = { x: number; y: number };
const rad = (d: number) => (d * Math.PI) / 180;
export const along = (p: P, ang: number, len: number): P => ({
  x: p.x + Math.sin(rad(ang)) * len,
  y: p.y + Math.cos(rad(ang)) * len,
});

export type Joints = {
  hip: P;
  neck: P;
  shoulder: P;
  head: P;
  headAng: number;
  aEl: P;
  aHand: P;
  aForeAng: number;
  bEl: P;
  bHand: P;
  bForeAng: number;
  aKnee: P;
  aFoot: P;
  aShin: number;
  bKnee: P;
  bFoot: P;
  bShin: number;
};

// Local space: origin on the ground under the hips, y down, facing +x.
export const solve = (p: Pose, aLen = 1): Joints => {
  const footDrop = (h: number, k: number) =>
    Math.cos(rad(h)) * L.thigh + Math.cos(rad(h - k)) * L.shin;
  // Lowest foot always touches the ground
  const hipH = Math.max(footDrop(p.aH, p.aK), footDrop(p.bH, p.bK));
  const hip = { x: 0, y: -hipH };
  const up = (o: P, ang: number, len: number): P => ({
    x: o.x + Math.sin(rad(ang)) * len,
    y: o.y - Math.cos(rad(ang)) * len,
  });
  const neck = up(hip, p.lean, L.torso);
  const shoulder = up(hip, p.lean, L.torso * 0.88);
  const headAng = p.lean + p.head;
  const head = up(neck, headAng, L.neck + L.head * HEAD_SCALE);
  const aEl = along(shoulder, p.aS, L.upper * aLen);
  const aHand = along(aEl, p.aS + p.aE, L.fore * aLen);
  const bEl = along(shoulder, p.bS, L.upper);
  const bHand = along(bEl, p.bS + p.bE, L.fore);
  const aKnee = along(hip, p.aH, L.thigh);
  const aFoot = along(aKnee, p.aH - p.aK, L.shin);
  const bKnee = along(hip, p.bH, L.thigh);
  const bFoot = along(bKnee, p.bH - p.bK, L.shin);
  return {
    hip,
    neck,
    shoulder,
    head,
    headAng,
    aEl,
    aHand,
    aForeAng: p.aS + p.aE,
    bEl,
    bHand,
    bForeAng: p.bS + p.bE,
    aKnee,
    aFoot,
    aShin: p.aH - p.aK,
    bKnee,
    bFoot,
    bShin: p.bH - p.bK,
  };
};

export const GROUND = 1380;

// Local point -> world point for a character (before body rotation)
const toFlat = (c: CharState, p: P): P => ({
  x: c.x + c.facing * c.scale * c.sx * p.x,
  y: GROUND - c.lift + c.scale * c.sy * p.y,
});

// Body rotation pivots on the hips (lying in bed, sitting up)
export const pivotOf = (c: CharState): P => toFlat(c, solve(c.pose, c.aLen ?? 1).hip);

export const toWorld = (c: CharState, p: P): P => {
  const q = toFlat(c, p);
  const r = c.rot ?? 0;
  if (!r) return q;
  const o = pivotOf(c);
  const a = rad(r);
  const dx = q.x - o.x;
  const dy = q.y - o.y;
  return { x: o.x + dx * Math.cos(a) - dy * Math.sin(a), y: o.y + dx * Math.sin(a) + dy * Math.cos(a) };
};

const Limb: React.FC<{ pts: P[]; color: string }> = ({ pts, color }) => (
  <polyline
    points={pts.map((q) => `${q.x},${q.y}`).join(" ")}
    fill="none"
    stroke={color}
    strokeWidth={STROKE}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

const Foot: React.FC<{ at: P; shin: number; color: string }> = ({ at, shin, color }) => {
  // Foot points forward, perpendicular to the shin, but flattens when planted
  const ang = shin + 90 + (at.y > -4 ? -shin * 0.8 : 0);
  const toe = along(at, ang, 20);
  return (
    <line x1={at.x} y1={at.y} x2={toe.x} y2={toe.y} stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
  );
};

const HandShape: React.FC<{ at: P; fore: number; kind: Hand; color: string }> = ({ at, fore, kind, color }) => {
  if (kind === "none") return null;
  const tip = (len: number, off = 0) => along(at, fore + off, len);
  if (kind === "fist") return <circle cx={at.x} cy={at.y} r={11} fill={color} />;
  if (kind === "point") {
    const f = tip(20);
    return (
      <g>
        <circle cx={at.x} cy={at.y} r={9} fill={color} />
        <line x1={at.x} y1={at.y} x2={f.x} y2={f.y} stroke={color} strokeWidth={7} strokeLinecap="round" />
      </g>
    );
  }
  if (kind === "open") {
    return (
      <g>
        {[-40, -14, 12, 38].map((o) => {
          const f = tip(17, o);
          return <line key={o} x1={at.x} y1={at.y} x2={f.x} y2={f.y} stroke={color} strokeWidth={6} strokeLinecap="round" />;
        })}
      </g>
    );
  }
  // thumbs up: fist with a thumb pointing to screen-up regardless of arm angle
  return (
    <g>
      <circle cx={at.x} cy={at.y} r={11} fill={color} />
      <line x1={at.x} y1={at.y - 4} x2={at.x} y2={at.y - 26} stroke={color} strokeWidth={8} strokeLinecap="round" />
    </g>
  );
};

export const Face: React.FC<{ e: Expr; faceX: number; lookY: number; blink: number; t: number }> = ({
  e,
  faceX,
  lookY,
  blink,
  t,
}) => {
  const fx = faceX * 17;
  const ey = -4;
  const lx = faceX * 0.7;
  const eyesX = [fx - 15, fx + 15];
  const sw = 4;
  const twitchOn = e.twitch && Math.floor(t * 30) % 5 < 2;

  const eye = (ex: number, i: number) => {
    const isTwitch = twitchOn && i === 1;
    const kind = blink > 0.5 && (e.eyes === "dot" || e.eyes === "wide") ? "closed" : e.eyes;
    const key = `e${i}`;
    switch (kind) {
      case "dot":
        return (
          <ellipse key={key} cx={ex + lx * 3} cy={ey + lookY * 4} rx={5.5} ry={isTwitch ? 2 : 8.5} fill={INK} />
        );
      case "wide": {
        const pr = 5.5 * (e.pupil ?? 1);
        return (
          <g key={key}>
            <circle cx={ex} cy={ey} r={13} fill="#fff" stroke={INK} strokeWidth={3.5} />
            <circle cx={ex + lx * 5} cy={ey + lookY * 5} r={isTwitch ? pr * 0.4 : pr} fill={INK} />
          </g>
        );
      }
      case "half":
        return (
          <g key={key}>
            <path d={`M ${ex - 6} ${ey} A 6 7 0 0 0 ${ex + 6} ${ey} Z`} fill={INK} transform={`translate(${lx * 3} 0)`} />
            <line x1={ex - 9} y1={ey} x2={ex + 9} y2={ey + (isTwitch ? 4 : 0)} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
          </g>
        );
      case "happy":
        return <path key={key} d={`M ${ex - 8} ${ey + 3} Q ${ex} ${ey - 10} ${ex + 8} ${ey + 3}`} fill="none" stroke={INK} strokeWidth={sw} strokeLinecap="round" />;
      case "closed":
        return <path key={key} d={`M ${ex - 8} ${ey} Q ${ex} ${ey + 7} ${ex + 8} ${ey}`} fill="none" stroke={INK} strokeWidth={sw} strokeLinecap="round" />;
      case "x":
        return (
          <g key={key} stroke={INK} strokeWidth={sw} strokeLinecap="round">
            <line x1={ex - 7} y1={ey - 7} x2={ex + 7} y2={ey + 7} />
            <line x1={ex + 7} y1={ey - 7} x2={ex - 7} y2={ey + 7} />
          </g>
        );
      case "squeeze": {
        const d = i === 0 ? 1 : -1;
        return (
          <path key={key} d={`M ${ex - 7 * d} ${ey - 7} L ${ex + 7 * d} ${ey} L ${ex - 7 * d} ${ey + 7}`} fill="none" stroke={INK} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        );
      }
      case "spiral": {
        const pts: string[] = [];
        for (let k = 0; k <= 28; k++) {
          const a = k * 0.6 + t * 9 * (i ? 1 : -1);
          const r = k * 0.36;
          pts.push(`${ex + Math.cos(a) * r},${ey + Math.sin(a) * r}`);
        }
        return <polyline key={key} points={pts.join(" ")} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />;
      }
    }
  };

  const brow = (ex: number, i: number) => {
    if (e.eyes === "x" || e.eyes === "spiral") return null;
    const inner = i === 0 ? 1 : -1;
    const raise = e.brow + (i === 1 ? (e.browAsym ?? 0) : 0);
    const by = ey - (e.eyes === "wide" ? 22 : 17) - raise * 6;
    const a = e.browAng * 5;
    return (
      <line
        key={`b${i}`}
        x1={ex + inner * 8}
        y1={by + a}
        x2={ex - inner * 8}
        y2={by - a}
        stroke={INK}
        strokeWidth={4.5}
        strokeLinecap="round"
      />
    );
  };

  const mx = fx + faceX * 3;
  const my = 22;
  const mouth = (() => {
    const s = { fill: "none", stroke: INK, strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    switch (e.mouth) {
      case "smile":
        return <path d={`M ${mx - 12} ${my - 2} Q ${mx} ${my + 11} ${mx + 12} ${my - 2}`} {...s} />;
      case "sadSmile":
        return <path d={`M ${mx - 10} ${my + 1} Q ${mx} ${my + 6} ${mx + 10} ${my + 1}`} {...s} />;
      case "grin":
        return (
          <g>
            <path d={`M ${mx - 16} ${my - 4} Q ${mx} ${my + 18} ${mx + 16} ${my - 4} Z`} fill="#fff" stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
            <line x1={mx - 14} y1={my + 1} x2={mx + 14} y2={my + 1} stroke={INK} strokeWidth={2.5} />
          </g>
        );
      case "laugh":
        return (
          <g>
            <path d={`M ${mx - 15} ${my - 4} Q ${mx} ${my + 20} ${mx + 15} ${my - 4} Z`} fill={INK} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
            <ellipse cx={mx} cy={my + 7} rx={6} ry={3.5} fill="#ff7a8a" />
          </g>
        );
      case "flat":
        return <line x1={mx - 10} y1={my} x2={mx + 10} y2={my} {...s} />;
      case "tiny":
        return <line x1={mx - 4} y1={my} x2={mx + 4} y2={my} {...s} />;
      case "frown":
        return <path d={`M ${mx - 12} ${my + 6} Q ${mx} ${my - 6} ${mx + 12} ${my + 6}`} {...s} />;
      case "o":
        return <ellipse cx={mx} cy={my + 2} rx={5} ry={6} fill={INK} />;
      case "O":
        return (
          <g>
            <ellipse cx={mx} cy={my + 4} rx={11} ry={15} fill={INK} />
            <ellipse cx={mx} cy={my + 13} rx={6} ry={4} fill="#ff7a8a" />
          </g>
        );
      case "smirk":
        return <path d={`M ${mx - 11} ${my + 2} Q ${mx + 3} ${my + 7} ${mx + 13} ${my - 5}`} {...s} />;
      case "wavy":
        return <path d={`M ${mx - 14} ${my + 2} l 5 -4 l 5 4 l 5 -4 l 5 4 l 5 -4`} {...s} strokeWidth={3.5} />;
      case "teeth":
        return (
          <g>
            <rect x={mx - 15} y={my - 6} width={30} height={13} rx={3} fill="#fff" stroke={INK} strokeWidth={3.5} />
            <line x1={mx - 15} y1={my} x2={mx + 15} y2={my} stroke={INK} strokeWidth={2} />
            {[-8, -1, 6].map((o) => (
              <line key={o} x1={mx + o} y1={my - 6} x2={mx + o} y2={my + 7} stroke={INK} strokeWidth={2} />
            ))}
          </g>
        );
      case "whistle":
        return <circle cx={mx + 6} cy={my + 1} r={4.5} fill="none" stroke={INK} strokeWidth={3.5} />;
    }
  })();

  return (
    <g>
      {eyesX.map(eye)}
      {eyesX.map(brow)}
      {mouth}
      {e.sweat ? (
        <path
          d={`M ${fx + 36} -36 Q ${fx + 44} -20 ${fx + 36} -14 Q ${fx + 28} -20 ${fx + 36} -36 Z`}
          fill="#7cc8ff"
          stroke={INK}
          strokeWidth={2.5}
          transform={`translate(0 ${(t * 40) % 10})`}
        />
      ) : null}
      {e.tear ? (
        <path
          d={`M ${fx - 16} 6 Q ${fx - 10} 20 ${fx - 16} 26 Q ${fx - 22} 20 ${fx - 16} 6 Z`}
          fill="#7cc8ff"
          stroke={INK}
          strokeWidth={2.5}
          transform={`translate(0 ${(t * 24) % 14})`}
        />
      ) : null}
      {e.vein ? (
        <g stroke="#e02424" strokeWidth={4} fill="none" strokeLinecap="round" transform={`translate(${fx - 28} -30) scale(${1 + 0.15 * Math.sin(t * 30)})`}>
          <path d="M -9 -3 Q -3 -3 -3 -9" />
          <path d="M 3 -9 Q 3 -3 9 -3" />
          <path d="M 9 3 Q 3 3 3 9" />
          <path d="M -3 9 Q -3 3 -9 3" />
        </g>
      ) : null}
    </g>
  );
};

const Beard: React.FC<{ len: number; faceX: number; t: number }> = ({ len, faceX, t }) => {
  const L2 = 50 + len * 150;
  const cx = faceX * 14;
  const sway = Math.sin(t * 2) * 6 * len;
  return (
    <g>
      <path
        d={`M ${cx - 30} 10 Q ${cx - 24} ${L2 * 0.5} ${cx - 4 + sway} ${L2} Q ${cx + sway} ${L2 + 10} ${cx + 6 + sway} ${L2} Q ${cx + 24} ${L2 * 0.5} ${cx + 30} 10 Q ${cx} 40 ${cx - 30} 10 Z`}
        fill="#e9e9e9"
        stroke={INK}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      {[0.35, 0.6].map((k) => (
        <path key={k} d={`M ${cx - 10} ${L2 * k} q 10 7 20 0`} fill="none" stroke="#b8b8b8" strokeWidth={3} />
      ))}
      <path d={`M ${cx - 20} 14 q 20 -8 40 0`} fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
    </g>
  );
};

/** The scarf's two tails in local space: they trail behind the neck and stream out when moving
 *  fast; soaked wool is heavy, so it hangs straight down and barely sways. (Shared with the 3D rig.) */
export const scarfTailPoints = (j: Joints, t: number, speed: number, wet?: boolean): P[][] => {
  const drag = wet ? 0 : Math.min(1, Math.abs(speed) / 900);
  const wave = wet ? 1.5 : 7;
  const base = { x: j.neck.x - 4, y: j.neck.y + 4 };
  const tail = (len: number, ph: number) => {
    const pts: P[] = [];
    for (let k = 0; k <= 6; k++) {
      const u = k / 6;
      const hang = 1 - drag;
      pts.push({
        x: base.x - u * len * (0.45 + 0.55 * drag),
        y: base.y + u * len * (wet ? 1 : 0.85) * hang + Math.sin(t * (6 + drag * 12) - u * 4 + ph) * wave * u,
      });
    }
    return pts;
  };
  return [tail(78, 0), tail(62, 1.7)];
};

const Scarf: React.FC<{ j: Joints; t: number; speed: number; wet?: boolean }> = ({ j, t, speed, wet }) => {
  return (
    <g>
      {scarfTailPoints(j, t, speed, wet).map((pts) => pts.map((q) => `${q.x},${q.y}`).join(" ")).map((d, i) => (
        <g key={i}>
          <polyline points={d} fill="none" stroke={INK} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={d} fill="none" stroke={wet ? "#c8641a" : "#ff8a1f"} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
    </g>
  );
};

// White face → tomato red as the effort builds
const flushFill = (k: number) => {
  const u = Math.max(0, Math.min(1, k));
  const ch = (a: number, b: number) => Math.round(a + (b - a) * u);
  return `rgb(${ch(255, 255)},${ch(255, 120)},${ch(255, 100)})`;
};

export const Stickman: React.FC<{ c: CharState }> = ({ c }) => {
  const j = solve(c.pose, c.aLen ?? 1);
  const ex = c.extras;
  const piv = pivotOf(c);
  return (
    <g transform={`rotate(${c.rot ?? 0} ${piv.x} ${piv.y})`}>
    <g transform={`translate(${c.x} ${GROUND - c.lift}) scale(${c.facing * c.scale * c.sx} ${c.scale * c.sy})`}>
      {ex.backpack ? (
        <rect x={j.shoulder.x - 58} y={j.shoulder.y - 6} width={44} height={70} rx={12} fill="#5aa9e6" stroke={INK} strokeWidth={6} transform={`rotate(${c.pose.lean} ${j.shoulder.x} ${j.shoulder.y})`} />
      ) : null}
      {/* far side */}
      <Limb pts={[j.hip, j.bKnee, j.bFoot]} color={BACK_INK} />
      <Foot at={j.bFoot} shin={j.bShin} color={BACK_INK} />
      <Limb pts={[j.shoulder, j.bEl, j.bHand]} color={BACK_INK} />
      <HandShape at={j.bHand} fore={j.bForeAng} kind={c.bHand} color={BACK_INK} />
      {ex.scarf && ex.scarfTails !== false ? <Scarf j={j} t={c.t} speed={c.speed} wet={ex.wet} /> : null}
      {ex.needles ? (
        <g stroke={INK} strokeWidth={3} strokeLinecap="round">
          {[-8, 4, 16].map((o, i) => (
            <line key={i} x1={j.hip.x - 6} y1={j.hip.y + o} x2={j.hip.x - 30} y2={j.hip.y + o - 8 + i * 6} />
          ))}
        </g>
      ) : null}
      {/* body */}
      <Limb pts={[j.hip, j.neck, { x: j.neck.x + (j.head.x - j.neck.x) * 0.3, y: j.neck.y + (j.head.y - j.neck.y) * 0.3 }]} color={INK} />
      <Limb pts={[j.hip, j.aKnee, j.aFoot]} color={INK} />
      <Foot at={j.aFoot} shin={j.aShin} color={INK} />
      {ex.scarf ? (
        <ellipse cx={j.neck.x} cy={j.neck.y + 2} rx={20} ry={11} fill="#ff8a1f" stroke={INK} strokeWidth={5} transform={`rotate(${c.pose.lean} ${j.neck.x} ${j.neck.y})`} />
      ) : null}
      {/* head */}
      <g transform={`translate(${j.head.x} ${j.head.y}) rotate(${j.headAng}) scale(${HEAD_SCALE})`}>
        {ex.partyHat ? (
          <g transform="rotate(-12)">
            <path d="M -24 -36 L 2 -104 L 26 -36 Z" fill="#ff4d6d" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
            <path d="M -14 -60 L 16 -66 M -6 -82 L 10 -85" stroke="#ffd23f" strokeWidth={6} strokeLinecap="round" />
            <circle cx={2} cy={-108} r={10} fill="#ffd23f" stroke={INK} strokeWidth={5} />
          </g>
        ) : null}
        <circle r={L.head} fill={ex.flush ? flushFill(ex.flush) : "#fff"} stroke={INK} strokeWidth={STROKE / HEAD_SCALE} />
        {ex.blush ? (
          <g fill="#ff9fb0" opacity={0.85}>
            <ellipse cx={c.faceX * 17 - 26} cy={12} rx={8} ry={5} />
            <ellipse cx={c.faceX * 17 + 26} cy={12} rx={8} ry={5} />
          </g>
        ) : null}
        <Face e={c.expr} faceX={c.faceX} lookY={c.lookY} blink={c.blink} t={c.t} />
        {ex.beard ? (
          // hangs with gravity, not with the head tilt
          <g transform={`rotate(${-j.headAng * 0.85})`}>
            <Beard len={ex.beard} faceX={c.faceX} t={c.t} />
          </g>
        ) : null}
        {ex.bubble ? (
          <circle cx={c.faceX * 20 + 6} cy={26 + 12 * ex.bubble} r={6 + ex.bubble * 30} fill="#ff9fcf" stroke={INK} strokeWidth={3.5} opacity={0.95} />
        ) : null}
        {ex.headphones ? (
          <g>
            <path d="M -50 -4 A 52 52 0 0 1 50 -4" fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
            <rect x={-60} y={-14} width={20} height={34} rx={8} fill="#7c5cff" stroke={INK} strokeWidth={5} />
            <rect x={40} y={-14} width={20} height={34} rx={8} fill="#7c5cff" stroke={INK} strokeWidth={5} />
          </g>
        ) : null}
        {ex.cobweb ? (
          <g stroke="#9a9a9a" strokeWidth={2} fill="none" opacity={0.9}>
            <path d="M -40 -26 L -6 -60 M -40 -26 L -30 -54 M -40 -26 L -14 -40" />
            <path d="M -33 -40 Q -26 -44 -26 -52 M -24 -33 Q -18 -40 -16 -50 M -16 -30 Q -12 -38 -8 -46" />
          </g>
        ) : null}
        {ex.bandage ? (
          <g transform="translate(-24 -30) rotate(-35)">
            <rect x={-20} y={-8} width={40} height={16} rx={4} fill="#fff6e0" stroke={INK} strokeWidth={4} />
            <path d="M -4 -4 L 4 4 M 4 -4 L -4 4" stroke={INK} strokeWidth={2.5} />
          </g>
        ) : null}
        {ex.helmet ? (
          <g transform="translate(0 -30)">
            <path d="M -54 -6 A 54 54 0 0 1 54 -6 Z" fill="#ffc93c" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
            <line x1={-62} y1={-6} x2={62} y2={-6} stroke={INK} strokeWidth={8} strokeLinecap="round" />
            {ex.helmet === 2 ? (
              <path d="M -6 -58 L 6 -40 L -6 -30 L 8 -14 M 6 -40 L 22 -38" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
          </g>
        ) : null}
        {ex.spaceHelmet ? (
          // glass bubble; a taller dome when there's a party hat inside
          <g>
            <ellipse cx={0} cy={ex.partyHat ? -38 : -4} rx={ex.partyHat ? 74 : 70} ry={ex.partyHat ? 114 : 70} fill="#bfe6ff" fillOpacity={0.2} stroke={INK} strokeWidth={5} />
            <path d={ex.partyHat ? "M -46 -96 q 18 -40 52 -46" : "M -44 -30 q 14 -30 46 -34"} fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round" opacity={0.85} />
          </g>
        ) : null}
      </g>
      {ex.spaceHelmet ? (
        <ellipse cx={j.neck.x} cy={j.neck.y - 6} rx={30} ry={11} fill="#c9d3dc" stroke={INK} strokeWidth={5} transform={`rotate(${c.pose.lean} ${j.neck.x} ${j.neck.y})`} />
      ) : null}
      {ex.tie ? (
        <g transform={`rotate(${c.pose.lean} ${j.neck.x} ${j.neck.y})`}>
          <path d={`M ${j.neck.x + 6} ${j.neck.y + 8} l -9 10 l 7 52 l 9 12 l 9 -12 l 0 -52 Z`} fill="#e63946" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        </g>
      ) : null}
      {/* near arm last so gestures read on top */}
      <Limb pts={[j.shoulder, j.aEl, j.aHand]} color={INK} />
      <HandShape at={j.aHand} fore={j.aForeAng} kind={c.aHand} color={INK} />
      {ex.sandwich ? (
        <g transform={`translate(${j.aHand.x} ${j.aHand.y - 6}) rotate(-10)`} stroke={INK} strokeWidth={4} strokeLinejoin="round">
          <path d="M -20 -8 L 20 -8 L 22 4 L -22 4 Z" fill="#f2c27b" />
          <path d="M -21 -2 L 21 -2" stroke="#6fbf4a" strokeWidth={5} />
          <path d="M -18 -14 Q 0 -22 18 -14 L 20 -8 L -20 -8 Z" fill="#f2c27b" />
        </g>
      ) : null}
      {ex.cone ? (
        <g transform={`translate(${j.aHand.x} ${j.aHand.y - 4})`}>
          <path d="M -14 -4 L 14 -4 L 0 34 Z" fill="#e8b46a" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <path d="M -8 4 L 6 14 M 8 4 L -4 18" stroke="#b9853e" strokeWidth={2} />
          {ex.cone >= 1 ? <circle cx={0} cy={-16} r={17} fill="#ffc6dc" stroke={INK} strokeWidth={4} /> : null}
        </g>
      ) : null}
      {ex.phone ? (
        <rect x={j.aHand.x - 2} y={j.aHand.y - 30} width={24} height={40} rx={5} fill="#2b2d42" stroke={INK} strokeWidth={4} transform={`rotate(-20 ${j.aHand.x} ${j.aHand.y})`} />
      ) : null}
    </g>
    </g>
  );
};
