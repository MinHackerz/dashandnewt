import React from "react";
import { along, Face, GROUND, HEAD_R, HEAD_SCALE, pivotOf, scarfTailPoints, solve, type Joints } from "../rig/Stickman";
import type { CharState, Hand } from "../rig/types";
import { anatomical } from "./ik";

// Dash & Newt as full 2D cartoon characters: the same CharState (pose, face, extras) the stickman
// rig and the 3D rig read, so every pose, face, gait and Script in src/rig is shared. Clothes, skin,
// hair and shoes are fixed per character: the identity never changes between episodes.
// Far-side limbs are drawn a shade darker, so overlapping limbs stay readable.

export type Who = "dash" | "newt" | "digger";
type P = { x: number; y: number };

export const TOON_INK = "#22181c";
const OUT = 7; // outline thickness (local px, each side)

type Look = {
  skin: string;
  shirt: string;
  pants: string; // trousers (Dash) or shorts (Newt)
  shorts: boolean; // bare shins below the knee
  sock: string;
  shoe: string;
  shoeTrim: string;
  hair: string;
  torsoW: number;
  legW: number;
  armW: number;
};

export const LOOKS: Record<Who, Look> = {
  // Dash: tall, blue tee, dark jeans, white sneakers with orange trim, spiky brown hair, orange scarf
  dash: { skin: "#f1c08f", shirt: "#3b7dd8", pants: "#2f3e5c", shorts: false, sock: "#ffffff", shoe: "#fbfbf7", shoeTrim: "#ff8a1f", hair: "#4a2f1d", torsoW: 98, legW: 34, armW: 22 },
  // Newt: small, green tee with an apple (Isaac Newton's), khaki shorts, red sneakers, party hat, blush
  newt: { skin: "#f7d2ad", shirt: "#5cb860", pants: "#d1ab6c", shorts: true, sock: "#ffffff", shoe: "#e63946", shoeTrim: "#ffffff", hair: "#7a4321", torsoW: 106, legW: 34, armW: 22 },
  // supporting cast (ep09): the gravedigger — tall, grey work shirt, green overalls, black boots, flat cap, grey moustache
  digger: { skin: "#e6b48c", shirt: "#8d8f94", pants: "#4d6b4f", shorts: false, sock: "#333333", shoe: "#2b2b2b", shoeTrim: "#444444", hair: "#9a9a9a", torsoW: 90, legW: 32, armW: 20 },
};

// ─── colour helpers ───────────────────────────────────────────────────────
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, u: number) => {
  const A = hex(a);
  const B = hex(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * u).toString(16).padStart(2, "0")).join("")}`;
};
const shade = (c: string, k = 0.22) => mix(c, "#1a1030", k);
const GHOST = "#eef4ff";

/** An outlined stroke through points: ink underneath, colour on top (round joints) */
const Stroke: React.FC<{ pts: P[]; w: number; color: string; ink: string }> = ({ pts, w, color, ink }) => {
  const d = pts.map((q) => `${q.x},${q.y}`).join(" ");
  return (
    <g>
      <polyline points={d} fill="none" stroke={ink} strokeWidth={w + 2 * OUT} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};

const lerpP = (a: P, b: P, u: number): P => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

const Shoe: React.FC<{ at: P; shin: number; look: Look; ink: string; dark: boolean; ghost: boolean }> = ({ at, shin, look, ink, dark, ghost }) => {
  const ang = shin + 90 + (at.y > -4 ? -shin * 0.8 : 0);
  const toe = along(at, ang, 20);
  const rot = (Math.atan2(toe.y - at.y, toe.x - at.x) * 180) / Math.PI;
  const body = ghost ? GHOST : dark ? shade(look.shoe) : look.shoe;
  const trim = ghost ? GHOST : dark ? shade(look.shoeTrim) : look.shoeTrim;
  return (
    <g transform={`translate(${at.x} ${at.y}) rotate(${rot})`} stroke={ink} strokeWidth={5} strokeLinejoin="round">
      <path d="M -16 4 L 38 4 Q 50 4 47 -7 Q 42 -20 22 -21 L 8 -27 Q -16 -30 -16 -10 Z" fill={body} />
      <path d="M -16 4 L 38 4 Q 50 4 48 -3 L -16 -3 Z" fill={trim} />
      <path d="M 10 -20 l 6 6 M 18 -18 l 5 6" fill="none" strokeWidth={3} />
    </g>
  );
};

const HandShape: React.FC<{ at: P; fore: number; kind: Hand; skin: string; ink: string }> = ({ at, fore, kind, skin, ink }) => {
  if (kind === "none") return null;
  const tip = (len: number, off = 0) => along(at, fore + off, len);
  const finger = (to: P, w: number) => <Stroke pts={[at, to]} w={w} color={skin} ink={ink} />;
  const palm = <circle cx={at.x} cy={at.y} r={14} fill={skin} stroke={ink} strokeWidth={5} />;
  if (kind === "fist") return palm;
  if (kind === "point")
    return (
      <g>
        {finger(tip(26), 8)}
        {palm}
      </g>
    );
  if (kind === "open")
    return (
      <g>
        {[-42, -14, 14, 42].map((o) => (
          <g key={o}>{finger(tip(22, o), 7)}</g>
        ))}
        {palm}
      </g>
    );
  // thumbs up: the thumb points to screen-up whatever the arm does
  return (
    <g>
      {palm}
      <Stroke pts={[{ x: at.x, y: at.y - 6 }, { x: at.x, y: at.y - 28 }]} w={9} color={skin} ink={ink} />
    </g>
  );
};

const Arm: React.FC<{ j: Joints; side: "a" | "b"; kind: Hand; look: Look; ink: string; dark: boolean; ghost: boolean }> = ({ j, side, kind, look, ink, dark, ghost }) => {
  const el = side === "a" ? j.aEl : j.bEl;
  const hand = side === "a" ? j.aHand : j.bHand;
  const fore = side === "a" ? j.aForeAng : j.bForeAng;
  const c = (col: string) => (ghost ? GHOST : dark ? shade(col) : col);
  const cuff = lerpP(j.shoulder, el, 0.62);
  return (
    <g>
      <Stroke pts={[j.shoulder, el, hand]} w={look.armW - 4} color={c(look.skin)} ink={ink} />
      <Stroke pts={[j.shoulder, cuff]} w={look.armW + 8} color={c(look.shirt)} ink={ink} />
      <HandShape at={hand} fore={fore} kind={kind} skin={c(look.skin)} ink={ink} />
    </g>
  );
};

const Leg: React.FC<{ j: Joints; side: "a" | "b"; look: Look; ink: string; dark: boolean; ghost: boolean }> = ({ j, side, look, ink, dark, ghost }) => {
  const knee = side === "a" ? j.aKnee : j.bKnee;
  const foot = side === "a" ? j.aFoot : j.bFoot;
  const shin = side === "a" ? j.aShin : j.bShin;
  const c = (col: string) => (ghost ? GHOST : dark ? shade(col) : col);
  const ankle = lerpP(knee, foot, 0.86);
  return (
    <g>
      {look.shorts ? (
        <>
          <Stroke pts={[knee, ankle]} w={look.legW - 12} color={c(look.skin)} ink={ink} />
          <Stroke pts={[lerpP(knee, foot, 0.7), ankle]} w={look.legW - 8} color={c(look.sock)} ink={ink} />
          <Stroke pts={[j.hip, lerpP(j.hip, knee, 1.08)]} w={look.legW + 8} color={c(look.pants)} ink={ink} />
        </>
      ) : (
        <Stroke pts={[j.hip, knee, ankle]} w={look.legW} color={c(look.pants)} ink={ink} />
      )}
      <Shoe at={foot} shin={shin} look={look} ink={ink} dark={dark} ghost={ghost} />
    </g>
  );
};

/** Hair, drawn in head units (radius 46) over the skull; shifts back as the face turns to profile */
const Hair: React.FC<{ who: Who; faceX: number; color: string; ink: string }> = ({ who, faceX, color, ink }) => {
  const sx = -faceX * 9;
  if (who === "dash")
    return (
      <path
        transform={`translate(${sx} 0)`}
        d="M -47 -2 Q -52 -38 -26 -50 L -24 -66 L -8 -54 L 2 -70 L 12 -54 L 26 -66 L 28 -48 Q 46 -38 48 -14 Q 34 -30 14 -33 Q -6 -22 -22 -32 Q -38 -24 -40 4 Z"
        fill={color}
        stroke={ink}
        strokeWidth={5}
        strokeLinejoin="round"
      />
    );
  if (who === "digger")
    return (
      <g transform={`translate(${sx} 0)`} stroke={ink} strokeWidth={5} strokeLinejoin="round">
        {/* grey sideburns, a flat cap and a drooping moustache */}
        <path d="M -46 -4 Q -48 -22 -40 -30 L -36 4 Z M 46 -4 Q 48 -22 40 -30 L 36 4 Z" fill={color} />
        <path d="M -50 -26 Q -46 -62 0 -64 Q 44 -62 50 -30 Q 66 -28 74 -20 Q 60 -14 46 -18 Q 0 -30 -50 -20 Z" fill="#5b4a3a" />
        <path d={`M ${-20 + faceX * 20} 22 Q ${faceX * 20} 14 ${20 + faceX * 20} 22 Q ${10 + faceX * 20} 32 ${faceX * 20} 26 Q ${-10 + faceX * 20} 32 ${-20 + faceX * 20} 22 Z`} fill={color} strokeWidth={3.5} />
      </g>
    );
  // Newt: a soft fringe peeking out under the party hat
  return (
    <path
      transform={`translate(${sx} 0)`}
      d="M -44 -6 Q -46 -40 -10 -46 Q 30 -48 44 -18 Q 30 -30 16 -26 Q 10 -36 -2 -28 Q -12 -36 -24 -26 Q -34 -22 -38 2 Z"
      fill={color}
      stroke={ink}
      strokeWidth={5}
      strokeLinejoin="round"
    />
  );
};

const flushSkin = (skin: string, k = 0) => (k > 0 ? mix(skin, "#ff5a4a", Math.min(1, k) * 0.7) : skin);

export const Toon: React.FC<{ c: CharState; who: Who }> = ({ c: raw, who }) => {
  const c = anatomical({ ...raw });
  const look = LOOKS[who];
  const j = solve(c.pose, c.aLen ?? 1);
  const ex = c.extras;
  const ghost = !!ex.ghost;
  const ink = ghost ? "#7d93b5" : TOON_INK;
  const col = (v: string) => (ghost ? GHOST : v);
  const piv = pivotOf(c);
  const skin = col(flushSkin(look.skin, ex.flush));
  const neckTop = lerpP(j.neck, j.head, 0.42);
  const torsoTop = lerpP(j.hip, j.neck, 0.86);
  const torsoBot = lerpP(j.hip, j.neck, 0.08);
  // forward normal of the torso (local x = the way they face)
  const lean = (c.pose.lean * Math.PI) / 180;
  const fwd = { x: Math.cos(lean), y: Math.sin(lean) };
  const chest = lerpP(j.hip, j.neck, 0.55);
  const ear = (dx: number) => <circle cx={dx} cy={2} r={11} fill={skin} stroke={ink} strokeWidth={5} />;
  const scarfCol = ex.wet ? "#c8641a" : "#ff8a1f";
  return (
    <g opacity={ghost ? 0.82 : 1}>
      <g transform={`rotate(${c.rot ?? 0} ${piv.x} ${piv.y})`}>
        <g transform={`translate(${c.x} ${GROUND - c.lift}) scale(${c.facing * c.scale * c.sx} ${c.scale * c.sy})`}>
          {/* far side */}
          <Arm j={j} side="b" kind={c.bHand} look={look} ink={ink} dark ghost={ghost} />
          <Leg j={j} side="b" look={look} ink={ink} dark ghost={ghost} />
          {ex.scarf && ex.scarfTails !== false
            ? scarfTailPoints(j, c.t, c.speed, ex.wet).map((pts, i) => <Stroke key={i} pts={pts} w={16} color={col(i ? shade(scarfCol, 0.12) : scarfCol)} ink={ink} />)
            : null}
          <Leg j={j} side="a" look={look} ink={ink} dark={false} ghost={ghost} />
          {/* torso: a soft bean in the shirt colour */}
          <Stroke pts={[torsoBot, torsoTop]} w={look.torsoW} color={col(look.shirt)} ink={ink} />
          {/* shirt hem and waistband */}
          <Stroke pts={[along(torsoBot, c.pose.lean + 90, look.torsoW * 0.36), along(torsoBot, c.pose.lean - 90, look.torsoW * 0.36)]} w={10} color={col(shade(look.shirt, 0.14))} ink={col(shade(look.shirt, 0.14))} />
          {who === "newt" ? (
            // the apple on Newt's tee
            <g transform={`translate(${chest.x + fwd.x * 14} ${chest.y + fwd.y * 14})`} stroke={ink} strokeWidth={3.5}>
              <circle r={11} fill={col("#e63946")} />
              <path d="M 0 -10 q 2 -8 8 -9" fill="none" />
              <ellipse cx={7} cy={-15} rx={5} ry={3} fill={col("#3f8f3f")} />
            </g>
          ) : null}
          {/* neck */}
          <Stroke pts={[j.neck, neckTop]} w={18} color={skin} ink={ink} />
          {ex.scarf ? (
            <g>
              {/* the knot's short end hangs down the chest */}
              <Stroke
                pts={[0, 1, 2, 3].map((k) => {
                  const u = k / 3;
                  const a = lerpP(j.neck, j.hip, 0.04 + 0.34 * u);
                  return { x: a.x + fwd.x * (30 - 6 * u) + Math.sin(c.t * 5 + u * 3) * 3 * u - Math.min(1, Math.abs(c.speed) / 900) * 22 * u, y: a.y + fwd.y * 30 };
                })}
                w={18}
                color={col(scarfCol)}
                ink={ink}
              />
              <ellipse cx={j.neck.x} cy={j.neck.y + 2} rx={36} ry={16} fill={col(scarfCol)} stroke={ink} strokeWidth={6} transform={`rotate(${c.pose.lean} ${j.neck.x} ${j.neck.y})`} />
              <path d={`M ${j.neck.x - 22} ${j.neck.y} l 6 10 M ${j.neck.x - 6} ${j.neck.y + 3} l 6 10 M ${j.neck.x + 10} ${j.neck.y + 2} l 6 10`} stroke={col(shade(scarfCol, 0.2))} strokeWidth={4} strokeLinecap="round" transform={`rotate(${c.pose.lean} ${j.neck.x} ${j.neck.y})`} />
            </g>
          ) : (
            <path d={`M ${j.neck.x - 16} ${j.neck.y + 4} Q ${j.neck.x} ${j.neck.y + 16} ${j.neck.x + 16} ${j.neck.y + 4}`} fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round" />
          )}
          {/* head */}
          <g transform={`translate(${j.head.x} ${j.head.y}) rotate(${j.headAng}) scale(${HEAD_SCALE})`}>
            {ear(-44 + c.faceX * 26)}
            {Math.abs(c.faceX) < 0.6 ? ear(44 + c.faceX * 26) : null}
            <ellipse rx={HEAD_R} ry={HEAD_R * 0.97} fill={skin} stroke={ink} strokeWidth={5.5} />
            <Hair who={who} faceX={c.faceX} color={col(look.hair)} ink={ink} />
            {ex.blush ? (
              <g fill="#ff8fa6" opacity={ghost ? 0.4 : 0.8}>
                <ellipse cx={c.faceX * 17 - 26} cy={12} rx={9} ry={5.5} />
                <ellipse cx={c.faceX * 17 + 26} cy={12} rx={9} ry={5.5} />
              </g>
            ) : null}
            {ex.beard && !ghost ? (
              // castaway stubble (ep10): a shadow on the jaw that darkens with the days
              <g>
                <path d={`M ${-36 + c.faceX * 14} 14 Q ${c.faceX * 17} 56 ${36 + c.faceX * 14} 14 Q ${c.faceX * 17} 30 ${-36 + c.faceX * 14} 14 Z`} fill={look.hair} opacity={0.18 + 0.4 * (ex.beard ?? 0)} />
                {[...Array(Math.round(6 + 14 * (ex.beard ?? 0)))].map((_, k) => {
                  const u = (k + 0.5) / Math.round(6 + 14 * (ex.beard ?? 0));
                  const a = Math.PI * (0.12 + 0.76 * u);
                  return <circle key={k} cx={c.faceX * 17 + Math.cos(a) * 34} cy={14 + Math.sin(a) * 30 - ((k * 7) % 3) * 5} r={2.2} fill={look.hair} opacity={0.5 + 0.4 * (ex.beard ?? 0)} />;
                })}
              </g>
            ) : null}
            <Face e={c.expr} faceX={c.faceX} lookY={c.lookY} blink={c.blink} t={c.t} />
            {ex.helmet ? (
              // a bike helmet; the party hat pokes out through its top vent
              <g stroke={ink} strokeWidth={5.5} strokeLinejoin="round">
                <path d="M -40 18 L -16 44 M 40 18 L 16 44" fill="none" strokeWidth={4} />
                <path d="M -54 2 Q -60 -62 0 -66 Q 60 -62 54 2 Q 30 -10 0 -10 Q -30 -10 -54 2 Z" fill={col("#2a9d8f")} />
                <path d="M -30 -44 L -18 -14 M 0 -56 L 0 -14 M 30 -44 L 18 -14" stroke={col("#1d6f66")} strokeWidth={6} strokeLinecap="round" fill="none" />
                {ex.helmet === 2 ? <path d="M -44 -30 L -24 -40 L -30 -22 L -8 -34 L -14 -14" fill="none" stroke={ink} strokeWidth={4.5} /> : null}
              </g>
            ) : null}
            {ex.partyHat ? (
              <g transform={ex.helmet ? "translate(0 -26) rotate(-12)" : "rotate(-12)"}>
                <path d="M -26 -34 L 2 -106 L 28 -34 Z" fill={col("#ff4d6d")} stroke={ink} strokeWidth={5.5} strokeLinejoin="round" />
                <path d="M -15 -60 L 17 -66 M -6 -83 L 10 -86" stroke={col("#ffd23f")} strokeWidth={6} strokeLinecap="round" />
                <circle cx={2} cy={-110} r={10} fill={col("#ffd23f")} stroke={ink} strokeWidth={5} />
                <path d="M -26 -34 Q 2 -26 28 -34" fill="none" stroke={ink} strokeWidth={5} />
              </g>
            ) : null}
            {ghost ? <ellipse cx={0} cy={ex.partyHat ? -138 : -76} rx={36} ry={9} fill="none" stroke="#ffd23f" strokeWidth={7} /> : null}
          </g>
          {/* near arm last so gestures read on top */}
          <Arm j={j} side="a" kind={c.aHand} look={look} ink={ink} dark={false} ghost={ghost} />
        </g>
      </g>
    </g>
  );
};
