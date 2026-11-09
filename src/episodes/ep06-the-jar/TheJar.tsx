import React from "react";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/PermanentMarker";
import { AbsoluteFill, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, num, shake, type Ease } from "../../lib/kf";
import { GROUND, INK } from "../../rig/Stickman";
import { Stickman3D } from "../../rig3d/Stickman3D";
import { CHALK, ChalkPath, ChalkText, ChalkTint } from "../../shared/chalk";
import { ChalkNote, Stamp } from "../../shared/lesson";
import { FONT_STACK, HookTitle, Stars } from "../../shared/ui";
import { crowbarAt, headCentre, headTop, heroAt, jamAt, jarAt, kidAt, pickleAt, spoonAt, toolboxHas, wrenchAt } from "./cast";
import { G } from "./physics";
import { Kitchen3D, planeMatrix, type Blob, type Cam3D } from "./Kitchen3D";
import { Burst, EarSteam, Pfft, Shiver, SweatFling } from "./props";
import { Crowbar3D, JamJar3D, JamLid3D, Pickle3D, PickleJar3D, PickleLid3D, ScarfWrap3D, Spoon3D, Wrench3D, Z_HAND } from "./Props3D";
import {
  BOARD,
  BONK_T,
  END_FADE,
  HEART,
  HOOK_TO,
  INSERT_1,
  INSERT_2,
  INTRO,
  JAR,
  JAR_TABLE_X,
  KNEEL_T,
  LOOK,
  NEWT_SCALE,
  SCORE,
  SEAL_KG,
  SIT_T,
  T1,
  T2,
  T3,
  TABLE,
  TRICK,
  TRY,
  TWIST,
  WALK1_END,
  WOMP_1,
  WOMP_2,
} from "./timeline";

loadFont();

const W = 1080;
const H = 1920;

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

const Boil: React.FC<{ t: number; id: string }> = ({ t, id }) => (
  <filter id={id} filterUnits="userSpaceOnUse" x={-3000} y={-3000} width={9000} height={7000}>
    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={Math.floor(t * 8) % 6} />
    <feDisplacementMap in="SourceGraphic" scale={4} />
  </filter>
);

// ─── Camera: [time, centre x, subject centre height above the floor, zoom, easing] ──
// The subject's centre sits at 55 % of the frame height (a little low, leaving the top for
// stamps and notes), whatever the zoom.
const SHOTS: readonly (readonly [number, number, number, number, Ease?])[] = [
  [0, 760, 220, 1.7],
  [T1.twist - 0.2, 760, 220, 1.7],
  [T1.twist + 0.3, 750, 270, 2.2, "io"],
  [T1.newtLooks - 0.2, 750, 270, 2.2],
  [T1.newtLooks + 0.5, 520, 200, 1.4, "io"],
  [T2.scarfOff - 0.1, 520, 200, 1.4],
  [T2.scarfOff + 0.4, 740, 190, 2.0, "io"],
  [T3.walk - 0.1, 740, 190, 2.0],
  [T3.walk + 0.6, 870, 210, 1.45, "io"],
  [T3.heave - 0.1, 870, 210, 1.45],
  [T3.heave + 0.3, 880, 200, 1.85, "io"],
  [T3.slip + 0.1, 900, 200, 1.85],
  [SIT_T + 0.5, 680, 200, 1.38, "io"],
  [LOOK.walk + 0.2, 680, 200, 1.38],
  [LOOK.pick - 0.2, 760, 170, 1.9, "io"],
  [LOOK.back + 0.2, 760, 170, 1.9],
  [LOOK.place, 560, 190, 1.6, "io"],
  [LOOK.still - 0.1, 370, 200, 2.0, "io"],
  [TRICK.under - 0.3, 370, 200, 2.0],
  [TRICK.under, 350, 210, 2.4, "io"],
  [TRICK.lift + 0.2, 350, 210, 2.4],
  [TRICK.win + 0.1, 690, 200, 1.38, "io"],
  [TWIST.idea - 0.05, 690, 200, 1.38],
  [TWIST.idea + 0.1, 1010, 170, 2.0, "snap"],
  [TWIST.cocky + 0.3, 1010, 200, 2.0],
  [TWIST.turn + 0.3, 990, 240, 1.6, "io"],
  [TWIST.launch - 0.05, 990, 240, 1.6],
  [TWIST.launch + 0.25, 980, 380, 1.2, "out"],
  [BONK_T + 0.15, 980, 380, 1.2],
  [BONK_T + 0.3, 1040, 300, 2.0, "snap"],
  [KNEEL_T + 0.6, 1040, 260, 2.0],
  [HEART.walk + 0.4, 940, 190, 2.0, "io"],
];
// Orbit around the shot's centre: [time, yaw°, pitch°, easing]. Three-quarter views so the figures'
// volume reads; moves glide (io), the idea beat snaps.
const ORBIT: readonly (readonly [number, number, number, Ease?])[] = [
  [0, 18, 9],
  [T1.twist - 0.2, 18, 9],
  [T1.twist + 0.3, -12, 6, "io"],
  [T1.newtLooks - 0.2, -12, 6],
  [T1.newtLooks + 0.5, 6, 10, "io"],
  [T2.scarfOff - 0.1, 6, 10],
  [T2.scarfOff + 0.4, 16, 5, "io"],
  [T3.walk - 0.1, 16, 5],
  [T3.walk + 0.6, -8, 10, "io"],
  [T3.heave - 0.1, -8, 10],
  [T3.heave + 0.3, 14, 6, "io"],
  [T3.slip + 0.1, 14, 6],
  [SIT_T + 0.5, 4, 11, "io"],
  [LOOK.walk + 0.2, 4, 11],
  [LOOK.pick - 0.2, -14, 8, "io"],
  [LOOK.back + 0.2, -14, 8],
  [LOOK.still - 0.1, 20, 8, "io"],
  [TRICK.under - 0.3, 20, 8],
  [TRICK.under, 26, 10, "io"],
  [TRICK.lift + 0.2, 26, 10],
  [TRICK.win + 0.1, 6, 10, "io"],
  [TWIST.idea - 0.05, 6, 10],
  [TWIST.idea + 0.1, -16, 4, "snap"],
  [TWIST.cocky + 0.3, -16, 4],
  [TWIST.turn + 0.3, 12, 8, "io"],
  [TWIST.launch - 0.05, 12, 8],
  [TWIST.launch + 0.25, 4, -3, "out"],
  [BONK_T + 0.15, 4, -3],
  [BONK_T + 0.3, -12, 6, "snap"],
  [KNEEL_T + 0.6, -12, 6],
  [HEART.walk + 0.4, 10, 8, "io"],
];
const cam = (t: number) => {
  const tr = (i: 1 | 2 | 3) => num(t, SHOTS.map((k) => [k[0], k[i], k[4]] as const));
  const orb = (i: 1 | 2) => num(t, ORBIT.map((k) => [k[0], k[i], k[3]] as const));
  const z = tr(3);
  return { x: tr(1), y: GROUND - tr(2) - (0.05 * H) / z, z, yaw: orb(1), pitch: orb(2) };
};

// ─── Newt's physics look: a chalkboard of the jar, the air outside and inside ──
const JB = { x0: 340, x1: 740, y0: 840, y1: 1380 }; // the chalk jar
const LID_Y = 790;
// Air "molecules" as chalk dots: rejection-sampled into a region
const dots = (n: number, box: (i: number) => { x: number; y: number } | null) => {
  const out: { x: number; y: number; k: number }[] = [];
  for (let i = 0; out.length < n && i < n * 8; i++) {
    const p = box(i);
    if (p) out.push({ ...p, k: out.length });
  }
  return out;
};
const OUTSIDE = dots(64, (i) => {
  const x = 70 + random(`ox${i}`) * 940;
  const y = 600 + random(`oy${i}`) * 800;
  const inJar = x > JB.x0 - 40 && x < JB.x1 + 40 && y > LID_Y - 50;
  const inCallout = x > 760 && y < 900;
  return inJar || inCallout ? null : { x, y };
});
const INSIDE = dots(9, (i) => {
  const x = JB.x0 + 50 + random(`ix${i}`) * (JB.x1 - JB.x0 - 100);
  const y = JB.y0 + 40 + random(`iy${i}`) * 230;
  return { x, y };
});

const Board: React.FC<{ t: number }> = ({ t }) => {
  if (t < LOOK.tint || t > LOOK.end) return null;
  const B = BOARD;
  const mid = (JB.x0 + JB.x1) / 2;
  const dot = (p: { x: number; y: number; k: number }, at: number, key: string) => {
    const u = ease("back", (t - at - p.k * 0.012) / 0.2);
    if (u <= 0) return null;
    return <circle key={key} cx={p.x + Math.sin(t * 5 + p.k) * 3} cy={p.y + Math.cos(t * 4 + p.k * 1.7) * 3} r={9 * u} fill={CHALK} opacity={0.85} />;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <ChalkTint t={t} from={LOOK.tint} to={LOOK.end} w={W} h={H} opacity={0.95} />
      <ChalkText t={t} at={B.title} x={W / 2} y={230} size={70} rot={0}>NEWT'S CHEAT CODE:</ChalkText>
      <ChalkText t={t} at={B.title + 0.2} x={W / 2} y={330} size={104} rot={-2} color="#ffd23f">AIR PRESSURE</ChalkText>
      {/* the jar, with a lid whose button is pulled in */}
      <ChalkPath t={t} at={B.jar} dur={0.5} d={`M ${JB.x0 + 20} ${JB.y0} L ${JB.x0} ${JB.y0 + 40} L ${JB.x0} ${JB.y1 - 30} Q ${JB.x0} ${JB.y1} ${JB.x0 + 30} ${JB.y1} L ${JB.x1 - 30} ${JB.y1} Q ${JB.x1} ${JB.y1} ${JB.x1} ${JB.y1 - 30} L ${JB.x1} ${JB.y0 + 40} L ${JB.x1 - 20} ${JB.y0}`} width={9} />
      <ChalkPath t={t} at={B.jar + 0.3} d={`M ${JB.x0 - 20} ${JB.y0} L ${JB.x0 - 20} ${LID_Y} L ${mid - 50} ${LID_Y} Q ${mid} ${LID_Y + 26} ${mid + 50} ${LID_Y} L ${JB.x1 + 20} ${LID_Y} L ${JB.x1 + 20} ${JB.y0} Z`} width={9} />
      {/* pickles, so it's clearly our jar */}
      {[0, 1, 2].map((k) => (
        <ChalkPath key={k} t={t} at={B.jar + 0.5 + k * 0.08} d={`M ${JB.x0 + 90 + k * 110} ${JB.y1 - 40} q -14 -110 14 -200 q 28 90 14 200 Z`} width={6} color="#a5d66f" />
      ))}
      {/* lots of air outside … */}
      {t > B.outside ? OUTSIDE.map((p) => dot(p, B.outside, `o${p.k}`)) : null}
      <ChalkText t={t} at={B.outside + 0.6} x={170} y={1470} size={52} rot={-4}>lots of air</ChalkText>
      {/* … much less inside */}
      {t > B.inside ? INSIDE.map((p) => dot(p, B.inside, `i${p.k}`)) : null}
      <ChalkText t={t} at={B.inside + 0.3} x={mid} y={JB.y0 + 340} size={54} rot={0}>less air inside</ChalkText>
      {/* so the outside air pushes the lid down */}
      {[0, 1, 2, 3, 4].map((k) => {
        const x = JB.x0 + 10 + k * 95;
        return <ChalkPath key={k} t={t} at={B.push + k * 0.08} d={`M ${x} ${LID_Y - 210} L ${x} ${LID_Y - 30} m -20 -26 l 20 26 l 20 -26`} width={9} color="#ffd23f" />;
      })}
      <ChalkText t={t} at={B.push + 0.2} x={mid - 40} y={470} size={66} rot={0}>AIR pushes the lid down</ChalkText>
      <ChalkText t={t} at={B.push + 0.6} x={mid - 40} y={555} size={78} rot={-2} color="#ffd23f">{`≈ ${SEAL_KG} kg!`}</ChalkText>
      {/* the button */}
      <ChalkPath t={t} at={B.button} d={`M 860 760 Q 700 700 ${mid + 18} ${LID_Y + 6} m 4 -30 l -4 30 l 28 -12`} width={7} />
      <ChalkText t={t} at={B.button + 0.15} x={920} y={660} size={50} rot={0}>button</ChalkText>
      <ChalkText t={t} at={B.button + 0.15} x={920} y={715} size={50} rot={0}>pulled IN</ChalkText>
      <ChalkText t={t} at={B.button + 0.5} x={920} y={775} size={50} rot={0} color="#ffd23f">= sealed</ChalkText>
      {/* the rule */}
      <ChalkText t={t} at={B.formula} x={W / 2} y={1610} size={110} rot={-2} color="#ffd23f">F = P × A</ChalkText>
      <ChalkText t={t} at={B.formula + 0.4} x={W / 2} y={1700} size={52} rot={0}>push = air pressure × lid area</ChalkText>
      <ChalkText t={t} at={B.formula + 0.9} x={W / 2} y={1790} size={52} rot={0}>{`7 cm lid → ≈ ${SEAL_KG} kg pressing down`}</ChalkText>
    </svg>
  );
};

// Chalk on the real jar during the trick: air rushing in under the lifted edge
const TrickChalk: React.FC<{ t: number }> = ({ t }) => {
  if (t < TRICK.pfft || t > TRICK.twist + 0.2) return null;
  const ex = JAR_TABLE_X + JAR.lidW / 2;
  const ey = GROUND - (TABLE.top + JAR.h + 8);
  return (
    <g>
      {/* from the upper left, so they never cross Newt (he works from the right) */}
      {[0, 1, 2].map((k) => (
        <ChalkPath key={k} t={t} at={TRICK.pfft + 0.05 + k * 0.07} dur={0.25} d={`M ${ex - 130 - k * 26} ${ey - 70 - k * 34} Q ${ex - 40} ${ey - 70 - k * 18} ${ex - 4} ${ey - 4} m -20 -8 l 20 8 l -2 -22`} width={6} outline />
      ))}
      <ChalkText t={t} at={TRICK.note} x={JAR_TABLE_X - 60} y={ey - 200} size={44} rot={-3} outline>air gets in…</ChalkText>
      <ChalkText t={t} at={TRICK.note + 0.5} x={JAR_TABLE_X - 60} y={ey - 150} size={44} rot={-3} color="#ffd23f" outline>…the push is gone!</ChalkText>
    </g>
  );
};

// Close-up bubble: the lid seen from above, its button pulled in (sealed) or popped up
const Insert: React.FC<{ t: number; from: number; to: number; popAt?: number; label: string; popLabel?: string }> = ({ t, from, to, popAt, label, popLabel }) => {
  if (t < from || t > to) return null;
  const s = Math.max(0, Math.min(ease("back", (t - from) / 0.25), (to - t) / 0.15));
  const popped = popAt !== undefined && t >= popAt;
  const pu = popped ? ease("back", (t - (popAt ?? 0)) / 0.12) : 0;
  const cx = W / 2;
  const cy = 500;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <g transform={`translate(${cx} ${cy}) scale(${s * 0.9})`}>
        <circle r={190} fill="#fdf1dc" stroke={INK} strokeWidth={12} />
        <circle r={170} fill="#e8b54a" stroke={INK} strokeWidth={8} />
        {[...Array(40)].map((_, i) => {
          const a = (i / 40) * Math.PI * 2;
          return <line key={i} x1={Math.cos(a) * 158} y1={Math.sin(a) * 158} x2={Math.cos(a) * 170} y2={Math.sin(a) * 170} stroke="#7a5a1c" strokeWidth={4} />;
        })}
        <circle r={120} fill="none" stroke="#c99a35" strokeWidth={6} />
        {/* the button: shading flips from dished-in to domed-up */}
        <circle r={62 + 6 * pu} fill={popped ? "#f6cf72" : "#c4952f"} stroke={INK} strokeWidth={6} />
        {popped ? (
          <path d="M -40 -20 A 46 46 0 0 1 20 -42" fill="none" stroke="#fff6d8" strokeWidth={10} strokeLinecap="round" />
        ) : (
          <path d="M -44 -12 A 48 48 0 0 1 44 -12" fill="none" stroke="#8a6620" strokeWidth={10} strokeLinecap="round" />
        )}
        {popped && t - (popAt ?? 0) < 0.35 ? (
          <g stroke={INK} strokeWidth={6} strokeLinecap="round">
            {[-50, -90, -130].map((a) => {
              const r = (a * Math.PI) / 180;
              return <line key={a} x1={Math.cos(r) * 84} y1={Math.sin(r) * 84} x2={Math.cos(r) * 112} y2={Math.sin(r) * 112} />;
            })}
          </g>
        ) : null}
      </g>
      <text
        x={cx}
        y={cy - 205}
        textAnchor="middle"
        fontFamily={FONT_STACK}
        fontSize={52}
        fill="#fff"
        stroke={INK}
        strokeWidth={12}
        paintOrder="stroke"
        opacity={s}
      >
        {popped && popLabel ? popLabel : label}
      </text>
    </svg>
  );
};

// ─── The world: Dash, Newt and every prop are 3D, on the action plane ─────
const Cast3D: React.FC<{ t: number }> = ({ t }) => {
  const hero = heroAt(t);
  const kid = kidAt(t);
  const jar = jarAt(t);
  const jam = jamAt(t);
  const wrench = wrenchAt(t);
  const bar = crowbarAt(t);
  const spoon = spoonAt(t);
  const pickle = pickleAt(t);
  const wrapped = t > T2.wrapped - 0.1 && t < T2.unwrap + 0.1;
  const zDash = Z_HAND(1);
  const zNewt = Z_HAND(NEWT_SCALE);
  const lidOffJar = t > TRICK.lift;
  return (
    <group>
      <Stickman3D c={hero} />
      <Stickman3D c={kid} />
      <PickleJar3D j={jar} />
      {lidOffJar ? <PickleLid3D j={jar} z={t <= TRICK.lidDown + 0.2 ? zNewt : -0.12} /> : null}
      {wrapped ? <ScarfWrap3D x={jar.x} h={jar.h + JAR.h + JAR.lidH / 2} twist={t * 1.6} /> : null}
      <JamJar3D j={jam} />
      <JamLid3D l={jam.lid} />
      {wrench.show ? <Wrench3D t={wrench} z={t < SIT_T + 0.05 ? zDash : 0.02} /> : null}
      {bar.show ? <Crowbar3D t={bar} z={t < TWIST.proud ? zDash : -0.05} /> : null}
      <Spoon3D t={spoon} z={t < TRICK.got ? -0.04 : t < TRICK.pass + 0.1 ? zNewt : t < HEART.spoon ? -zNewt : zDash} />
      {pickle ? <Pickle3D x={pickle.x} y={pickle.y} bite={pickle.bite} z={zDash} /> : null}
    </group>
  );
};

// Cartoon effects stay drawn on the action plane (the camera always faces it, so they line up)
const Fx: React.FC<{ t: number }> = ({ t }) => {
  const hero = heroAt(t);
  const jar = jarAt(t);
  const jam = jamAt(t);
  const top = headTop(hero);
  const head = headCentre(hero);
  const steamOn = t > T1.steam && t < T1.slip ? Math.min(1, (t - T1.steam) / 0.3) : t > T2.twist + 1.2 && t < T2.unwrap ? 1 : 0;
  const lidY = GROUND - (jar.h + JAR.h);
  // speed lines trailing the flying jam lid
  const trail =
    t > TWIST.launch + 0.03 && t < BONK_T - 0.05
      ? (() => {
          const a = jamAt(t - 0.08).lid;
          const b = jam.lid;
          return (
            <g stroke="#1b1b1b" strokeWidth={4} strokeLinecap="round" opacity={0.55}>
              {[-22, 0, 22].map((o) => (
                <line key={o} x1={a.x + o} y1={GROUND - a.h + 14} x2={b.x + o} y2={GROUND - b.h + 14} />
              ))}
            </g>
          );
        })()
      : null;
  return (
    <g>
      <EarSteam t={t} x={head.x} y={head.y} on={steamOn} />
      <SweatFling t={t} from={T2.sweat} to={T2.unwrap - 0.3} x={top.x} y={top.y + 30} g={G} />
      {(t > T1.strain && t < T1.slip) || (t > T3.heave + 0.3 && t < T3.slip) ? <Shiver x={jar.x} y={lidY + 20} r={JAR.w / 2} t={t} /> : null}
      <Pfft t={t} at={TRICK.pfft} x={JAR_TABLE_X + JAR.lidW / 2} y={GROUND - (TABLE.top + JAR.h)} dir={-1} />
      <Pfft t={t} at={TWIST.launch} x={jam.lid.x} y={GROUND - (jam.h + 80)} dir={1} dur={0.35} />
      {trail}
      <Burst t={t} at={T1.slip} x={jar.x + 20} y={lidY - 30} size={0.5} color="#fff" />
      <Burst t={t} at={T3.slip} x={jar.x} y={lidY - 10} size={0.6} color="#fff" />
      <Burst t={t} at={TWIST.launch} x={jam.x} y={GROUND - (jam.h + 90)} size={0.7} />
      <Burst t={t} at={BONK_T} x={top.x} y={top.y - 10} size={0.6} />
      {t > SIT_T + 0.1 && t < WOMP_1 + 0.6 ? <Stars t={t} x={top.x} y={top.y - 10} /> : null}
      <TrickChalk t={t} />
    </g>
  );
};

// Lens blur at infinity follows the zoom (skill: close-ups 12–14 px, mids ~10, wides nearly sharp)
const cInfFor = (z: number) => Math.max(3, Math.min(14, 4 + (z - 1) * 8));

const shadowsAt = (t: number): Blob[] => {
  const hero = heroAt(t);
  const kid = kidAt(t);
  const jar = jarAt(t);
  const jam = jamAt(t);
  const out: Blob[] = [
    { x: hero.x, h: 0, r: t > SIT_T - 0.05 && t < TWIST.up + 0.2 ? 150 : 85 },
    { x: kid.x, h: 0, r: 60 },
  ];
  const resting = !(t > INTRO.grab + 0.18 && t < T3.set) && !((t > LOOK.picked && t < LOOK.placed) || t > HEART.take + 0.15);
  if (resting) out.push({ x: jar.x, h: jar.h, r: 48, k: 0.35 });
  if (t < TWIST.jam || t > TWIST.set) out.push({ x: jam.x, h: jam.h, r: 40, k: 0.35 });
  return out;
};

const Scene: React.FC = () => {
  const t = useT();
  const c = cam(t);
  const s = shake(t, [
    [T1.slip, 4],
    [SIT_T, 9],
    [TWIST.launch, 6],
    [BONK_T, 5],
  ]);
  // one camera for both layers: shaking moves the camera, so the set and the cast shake together
  const view: Cam3D = { x: c.x - s.x / c.z, y: c.y - s.y / c.z, z: c.z, yaw: c.yaw, pitch: c.pitch, roll: 0, cInf: cInfFor(c.z) };
  return (
    <>
      <Kitchen3D cam={view} blobs={shadowsAt(t)} tools={toolboxHas(t)}>
        <Cast3D t={t} />
      </Kitchen3D>
      {/* cartoon effects on the action plane, warped by the same orbiting camera */}
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", transformOrigin: "0 0", transform: planeMatrix(view, view.z) }}>
        <defs>
          <Boil t={t} id="boil" />
        </defs>
        <g transform={`translate(${W / 2} ${H / 2}) scale(${view.z}) translate(${-view.x} ${-view.y})`}>
          <g filter="url(#boil)">
            <Fx t={t} />
          </g>
        </g>
      </svg>
      <Insert t={t} from={INSERT_1.t0} to={INSERT_1.t1} label="the lid's little button" />
      <Insert t={t} from={INSERT_2.t0} to={INSERT_2.t1} popAt={TRICK.tok} label="sealed…" popLabel="POP! Air got in." />
      <Notes t={t} />
      <Board t={t} />
      <EndCard t={t} />
    </>
  );
};

const Notes: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Stamp t={t} from={TRY[0]} to={TRY[0] + 1.9} text="TRY #1: BARE HANDS" />
    <Stamp t={t} from={TRY[1]} to={TRY[1] + 1.9} text="TRY #2: SCARF GRIP" />
    <Stamp t={t} from={TRY[2]} to={TRY[2] + 1.9} text="TRY #3: PIPE WRENCH" />
    <ChalkNote t={t} from={SCORE.t0} to={SCORE.t1} lines={["Dash: 0", "Jar: 3"]} highlight={[1]} gap={0.5} />
  </>
);

const EndCard: React.FC<{ t: number }> = ({ t }) => {
  if (t < END_FADE) return null;
  const dark = Math.min(1, (t - END_FADE) / 0.3);
  const l1 = ease("back", (t - (END_FADE + 0.4)) / 0.25);
  const l2 = ease("back", (t - (END_FADE + 1.1)) / 0.25);
  const line: React.CSSProperties = { fontFamily: FONT_STACK, fontSize: 96, color: "#fff", textAlign: "center", lineHeight: 1.15, padding: "0 70px" };
  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(17,17,17,${dark})`, justifyContent: "center", alignItems: "center", gap: 30 }}>
      <div style={{ ...line, scale: String(Math.max(0, l1)), opacity: t > END_FADE + 0.4 ? 1 : 0 }}>Air pressure.</div>
      <div style={{ ...line, color: "#ffd23f", scale: String(Math.max(0, l2)), opacity: t > END_FADE + 1.1 ? 1 : 0 }}>Don't fight the air — let it in.</div>
    </AbsoluteFill>
  );
};

const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

// Footsteps land where the feet plant: one every half stride of distance actually walked
// (the rig's walk cycle is 250 px of stride, scaled with the character).
const stepTimes = (xAt: (t: number) => number, segs: readonly (readonly [number, number])[], half: number) => {
  const out: number[] = [];
  for (const [t0, t1] of segs) {
    let last = xAt(t0);
    let acc = half * 0.6; // the first step lands soon after setting off
    for (let t = t0; t <= t1; t += 1 / 120) {
      const x = xAt(t);
      acc += Math.abs(x - last);
      last = x;
      if (acc >= half) {
        out.push(t);
        acc -= half;
      }
    }
  }
  return out;
};
const DASH_STEPS = stepTimes((t) => heroAt(t).x, [[T3.walk, WALK1_END], [T3.back, T3.place], [T3.step, T3.heave]], 125);
const NEWT_STEPS = stepTimes((t) => kidAt(t).x, [[LOOK.walk, LOOK.pick], [LOOK.back, LOOK.place]], 125 * NEWT_SCALE);
const HEART_STEPS = stepTimes((t) => kidAt(t).x, [[HEART.walk, HEART.offer]], 125 * NEWT_SCALE);

// Sound: a light original bed, and only the cues that tell the story. Character signatures sparingly.
export const TheJar: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  return (
    <AbsoluteFill style={{ backgroundColor: "#fdf1dc" }}>
      <Scene />
      <HookTitle text="Opening a jar: hard mode vs. physics mode" to={HOOK_TO} />

      <Audio name="Score" src={sfx("score-jar")} durationInFrames={durationInFrames} volume={1.1} />

      {/* Cold open */}
      <Audio name="Hero: heh (cocky look)" src={sfx("hero-blip")} from={f(INTRO.cocky + 0.05)} volume={0.2} />
      <Audio name="Jar off the counter" src={sfx("jar-lift")} from={f(INTRO.grab + 0.15)} volume={0.9} />

      {/* TRY #1 — bare hands */}
      <Audio name="Stamp 1" src={sfx("pop")} from={f(TRY[0])} volume={0.2} />
      <Audio name="Gripping the lid" src={sfx("jar-grip")} from={f(T1.strain)} durationInFrames={f(T1.slip - T1.strain)} volume={0.9} />
      <Audio name="Palm skids off" src={sfx("jar-squeak")} from={f(T1.slip)} volume={0.9} />
      <Audio name="Hero: ow" src={sfx("hero-blip")} from={f(T1.slip + 0.15)} volume={0.18} playbackRate={1.15} />
      <Audio name="Kid: hmm (looks up)" src={sfx("kid-blip")} from={f(T1.newtLooks + 0.1)} volume={0.22} playbackRate={0.9} />

      {/* TRY #2 — scarf grip */}
      <Audio name="Stamp 2" src={sfx("pop")} from={f(TRY[1])} volume={0.2} />
      <Audio name="Scarf wrung tight" src={sfx("scarf-twist")} from={f(T2.twist)} durationInFrames={f(T2.unwrap - T2.twist)} volume={0.9} />

      {/* TRY #3 — pipe wrench */}
      <Audio name="Stamp 3" src={sfx("pop")} from={f(TRY[2])} volume={0.2} />
      {DASH_STEPS.map((s, i) => (
        <Audio key={`ds${i}`} name={`Dash step ${i + 1}`} src={sfx(`step-${(i % 4) + 1}`)} from={f(s)} volume={0.85} />
      ))}
      <Audio name="Wrench out of the toolbox" src={sfx("toolbox-rattle")} from={f(T3.grab + 0.15)} volume={0.85} />
      <Audio name="Jar set on the floor" src={sfx("jar-down")} from={f(T3.set)} volume={0.9} />
      <Audio name="Wrench bites the lid" src={sfx("wrench-bite")} from={f(T3.bite)} volume={0.9} />
      <Audio name="Wrench grinding" src={sfx("wrench-strain")} from={f(T3.heave + 0.3)} durationInFrames={f(T3.slip - T3.heave - 0.3)} volume={0.9} />
      <Audio name="Wrench slips off" src={sfx("wrench-slip")} from={f(T3.slip)} volume={0.9} />
      <Audio name="Lands on his butt" src={sfx("body-fall")} from={f(SIT_T)} volume={0.9} />
      <Audio name="Wrench clatters" src={sfx("wrench-drop")} from={f(SIT_T + 0.05)} volume={0.8} />
      <Audio name="Hero: womp 1" src={sfx("womp")} from={f(WOMP_1)} volume={0.38} />

      {/* Newt's physics look */}
      {NEWT_STEPS.map((s, i) => (
        <Audio key={`ns${i}`} name={`Newt step ${i + 1}`} src={sfx(`step-${((i + 2) % 4) + 1}`)} from={f(s)} volume={0.55} playbackRate={1.15} />
      ))}
      <Audio name="Newt picks up the jar" src={sfx("jar-lift")} from={f(LOOK.picked)} volume={0.8} />
      <Audio name="Jar on the table" src={sfx("jar-down")} from={f(LOOK.placed)} volume={0.85} playbackRate={1.05} />
      <Audio name="Kid: chalk (look)" src={sfx("chalk")} from={f(LOOK.tint + 0.05)} volume={0.25} />
      <Audio name="Kid: chime (formula)" src={sfx("chime")} from={f(BOARD.formula + 0.1)} volume={0.22} />

      {/* The trick */}
      <Audio name="Spoon off the table" src={sfx("spoon-clink")} from={f(TRICK.got)} volume={0.85} />
      <Audio name="PFFT (the vacuum lets go)" src={sfx("vacuum-pfft")} from={f(TRICK.pfft)} volume={1.0} />
      <Audio name="Button pops up" src={sfx("button-pop")} from={f(TRICK.tok)} volume={0.95} />
      <Audio name="Hero: huh?!" src={sfx("hero-blip")} from={f(TRICK.tok + 0.35)} volume={0.17} playbackRate={1.2} />
      <Audio name="Lid unscrews easily" src={sfx("lid-unscrew")} from={f(TRICK.twist + 0.05)} volume={0.9} />
      <Audio name="Lid set down" src={sfx("lid-down")} from={f(TRICK.lidDown + 0.2)} volume={0.8} />
      <Audio name="Kid: win" src={sfx("kid-win")} from={f(TRICK.win)} volume={0.3} />

      {/* Dash's wrong lesson */}
      <Audio name="Idea ding" src={sfx("chime")} from={f(TWIST.idea)} volume={0.22} />
      <Audio name="Hero: heh (bigger spoon)" src={sfx("hero-blip")} from={f(TWIST.cocky + 0.05)} volume={0.2} />
      <Audio name="Crowbar out of the toolbox" src={sfx("toolbox-rattle")} from={f(TWIST.got - 0.1)} volume={0.8} playbackRate={1.1} />
      <Audio name="Jam off the shelf" src={sfx("jar-lift")} from={f(TWIST.jam)} volume={0.8} playbackRate={1.1} />
      <Audio name="Jam on the counter" src={sfx("jar-down")} from={f(TWIST.set)} volume={0.85} playbackRate={1.1} />
      <Audio name="Crowbar prises the lid off" src={sfx("crowbar-pry")} from={f(TWIST.launch - 0.2)} volume={1.0} />
      <Audio name="Lid spinning through the air" src={sfx("lid-whoosh")} from={f(TWIST.launch + 0.05)} durationInFrames={f(BONK_T - TWIST.launch - 0.05)} volume={0.8} />
      <Audio name="Crowbar dropped on the counter" src={sfx("crowbar-drop")} from={f(TWIST.proud + 0.1)} volume={0.6} />
      <Audio name="Lid lands on his head" src={sfx("lid-bonk")} from={f(BONK_T)} volume={1.0} />
      <Audio name="Hero: womp 2" src={sfx("womp")} from={f(WOMP_2)} volume={0.38} />
      <Audio name="Drops to his knees" src={sfx("knees-down")} from={f(KNEEL_T + 0.25)} volume={0.85} />

      {/* Heart */}
      <Audio name="Newt takes the jar" src={sfx("jar-lift")} from={f(HEART.take + 0.15)} volume={0.7} />
      {HEART_STEPS.map((s, i) => (
        <Audio key={`hs${i}`} name={`Newt step (heart) ${i + 1}`} src={sfx(`step-${((i + 1) % 4) + 1}`)} from={f(s)} volume={0.55} playbackRate={1.15} />
      ))}
      <Audio name="Kid: here (offer)" src={sfx("kid-blip")} from={f(HEART.offer)} volume={0.22} playbackRate={1.1} />
      <Audio name="Crunch 1" src={sfx("pickle-crunch")} from={f(HEART.crunch1)} volume={0.9} />
      <Audio name="Crunch 2" src={sfx("pickle-crunch")} from={f(HEART.crunch2)} volume={0.75} playbackRate={1.08} />
      <Audio name="Hero: happy" src={sfx("hero-blip")} from={f(HEART.proud)} volume={0.18} playbackRate={1.1} />
      <Audio name="Kid: giggle" src={sfx("kid-win")} from={f(HEART.laugh + 0.1)} volume={0.3} />
    </AbsoluteFill>
  );
};
