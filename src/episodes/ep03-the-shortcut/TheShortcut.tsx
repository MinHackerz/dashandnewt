import React from "react";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/PermanentMarker";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, num, shake, type Ease } from "../../lib/kf";
import { GROUND, INK, solve, Stickman, toWorld } from "../../rig/Stickman";
import type { CharState } from "../../rig/types";
import { FONT_STACK, HookTitle, Stars } from "../../shared/ui";
import {
  BULL_LANE,
  BULL_STOP_T,
  bullAt,
  coneTip,
  DRIP_FROM,
  DRIP_HIT_T,
  heroAt,
  heroIntroAt,
  kidFinaleAt,
  kidIntroAt,
  kidRaceAt,
  scarfTailEnd,
  scoopAt,
  SPLAT_T,
  SPLAT_X,
} from "./cast";
import { dropTime, particle } from "./physics";
import {
  Barrel,
  Bridge,
  Bull,
  Dust,
  Fence,
  Fish,
  Ground,
  MapSign,
  Planks,
  RiverBack,
  RiverFront,
  Saguaro,
  SideFence,
  Sky,
  Snort,
  Splash,
  Tree,
  Truck,
  Tufts,
} from "./props";
import {
  BARREL_H,
  BARREL_X,
  BULL_AFTER_V,
  BULL_BRAKE,
  CONE_HANDOFF,
  DRIP,
  DROP,
  END_FADE,
  FENCE1_X,
  FENCE2_X,
  FISH,
  HOP2,
  IMPACT_T,
  IMPACT_X,
  JUMP,
  K,
  LAND_T,
  LAND_X,
  NAIL,
  RIVER,
  ROLL_STOP_X,
  SAGUARO_H,
  SAGUARO_X,
  SLIDE_T,
  SNAP,
  SPLIT_END,
  SPLIT_START,
  TRUCK_ACCEL,
  TRUCK_GO,
  TRUCK_X,
} from "./timeline";

loadFont();

const W = 1080;
const H = 1920;

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

const headOf = (c: CharState) => toWorld(c, solve(c.pose, c.aLen ?? 1).head);
const neckOf = (c: CharState) => toWorld(c, solve(c.pose, c.aLen ?? 1).neck);

// Bull hits the far pasture fence while braking (solve x = v t − ½ a t²)
const d2 = FENCE2_X - 10 - IMPACT_X;
const FENCE_CRASH_T = IMPACT_T + (BULL_AFTER_V - Math.sqrt(BULL_AFTER_V ** 2 - 2 * BULL_BRAKE * d2)) / BULL_BRAKE;

const truckX = (t: number) => (t < TRUCK_GO ? TRUCK_X : TRUCK_X + 0.5 * TRUCK_ACCEL * (t - TRUCK_GO) ** 2);

const Boil: React.FC<{ t: number; id: string }> = ({ t, id }) => (
  <filter id={id} filterUnits="userSpaceOnUse" x={-2000} y={-3000} width={12000} height={6000}>
    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={Math.floor(t * 8) % 6} />
    <feDisplacementMap in="SourceGraphic" scale={4} />
  </filter>
);

// ─── Hero's world: fence → cactus field → river → bull pasture → truck ────
const HWorld: React.FC<{ t: number; camX: number }> = ({ t, camX }) => {
  const hero = heroAt(t);
  const bull = bullAt(t);
  const kid = t >= 25.0 ? kidFinaleAt(t) : null;
  const neck = neckOf(hero);

  // Drips from the soaked scarf: frequent at first, slowing as it drains,
  // ending with one last fat drop that falls on the bull's nose.
  const drips: { x: number; y: number }[] = [];
  for (let s = 19.6; s < 21.1; s += 0.22 + (s - 19.6) * 0.25) {
    const d = t - s;
    if (d < 0) break;
    const from = scarfTailEnd(heroAt(s));
    const fall = dropTime(GROUND - from.y);
    if (d < fall) drips.push(particle(d, from.x, from.y, 0, 0));
  }
  const lastDropGrow = t > 22.1 && t < DRIP.t ? (t - 22.1) / (DRIP.t - 22.1) : 0;
  const lastDrop = t >= DRIP.t && t < DRIP_HIT_T ? particle(t - DRIP.t, DRIP_FROM.x, DRIP_FROM.y, 0, 0) : null;

  // Melted ice cream dripping off the cone in the sun
  const melt: { x: number; y: number }[] = [];
  const puddle: number[] = [];
  for (let s = 27.4; s < SLIDE_T; s += 0.45) {
    const from = coneTip(kidFinaleAt(s));
    const fall = dropTime(GROUND - from.y);
    if (t - s >= 0 && t - s < fall) melt.push(particle(t - s, from.x, from.y, 0, 0));
    if (t - s >= fall) puddle.push(from.x);
  }

  const swimSplashes = [16.8, 17.15, 17.85, 18.15, 18.45, 18.75];
  const tx = truckX(t);

  return (
    <g>
      <Sky camX={camX} />
      <Ground x0={-1000} x1={1000} color="#8cc56f" />
      <Ground x0={1000} x1={RIVER.near} color="#f0d9a0" />
      <RiverBack x0={RIVER.near} x1={RIVER.far} surface={RIVER.surface} t={t} />
      <Ground x0={RIVER.far} x1={9000} color="#8cc56f" />
      <rect x={5200} y={GROUND} width={3800} height={1200} fill="#b9b2a5" />
      <line x1={5200} y1={GROUND} x2={9000} y2={GROUND} stroke={INK} strokeWidth={9} />
      <Tufts xs={[150, 380, 860, 2450, 2620, 3300, 3560, 4400, 4800, 5100]} />
      <Tree x={240} s={0.9} />
      <Tree x={4600} />
      <Tree x={5050} s={0.8} />
      {/* background cacti sit beside the path (smaller = farther away) */}
      <Saguaro x={1120} h={180} s={0.7} fade />
      <Saguaro x={1760} h={200} s={0.75} fade />
      <SideFence x0={2420} x1={3700} y={GROUND - 70} />
      <Fence x={FENCE1_X} />
      <Fence x={FENCE2_X} broken={t >= FENCE_CRASH_T ? 1 : 0} />
      <Barrel x={BARREL_X} h={BARREL_H} />
      <Saguaro x={SAGUARO_X} h={SAGUARO_H} />

      <Truck x={tx} t={t} wheelTurn={((tx - TRUCK_X) / 44) * (180 / Math.PI)} />
      {t > TRUCK_GO
        ? [0, 1, 2].map((i) => {
            const d = ((t - TRUCK_GO + i * 0.25) % 0.75);
            return <circle key={i} cx={tx - 20 - d * 120} cy={GROUND - 50 - d * 60} r={14 + d * 40} fill="#d9d9d9" stroke="#9aa5b1" strokeWidth={4} opacity={1 - d / 0.75} />;
          })
        : null}

      {(() => {
        // back lane while asleep, front lane once it stands
        const lane = 1 - bull.stand;
        const sc = 1 - (1 - BULL_LANE.scale) * lane;
        return (
          <g transform={`translate(0 ${-BULL_LANE.lift * lane}) translate(${bull.nose} ${GROUND}) scale(${sc}) translate(${-bull.nose} ${-GROUND})`}>
            <Bull b={bull} t={t} />
          </g>
        );
      })()}
      {t < 23.1
        ? [0, 1, 2].map((i) => {
            const u = ((t * 0.6 + i / 3) % 1 + 1) % 1;
            return (
              <text key={i} x={bull.nose - 70 + u * 50} y={GROUND - 140 - u * 120} fontFamily={FONT_STACK} fontSize={30 + u * 30} fill={INK} opacity={u < 0.15 ? u / 0.15 : 1 - u}>
                z
              </text>
            );
          })
        : null}
      <Snort t={t} at={23.65} x={bull.nose} y={GROUND - 120} dir={1} />
      <Snort t={t} at={24.3} x={bull.nose} y={GROUND - 120} dir={1} />
      <Snort t={t} at={BULL_STOP_T + 0.05} x={bull.nose} y={GROUND - 130} dir={1} />
      {t > BULL_STOP_T && t < 27.0 ? <Stars t={t} x={bull.nose - 60} y={GROUND - 260} /> : null}
      <Planks t={t} at={FENCE_CRASH_T} x={FENCE2_X} v={BULL_AFTER_V * 0.8} />

      {/* scarf snagged on the nail: stretches thinner as it lengthens */}
      {t > DROP.t0 + 0.05 && t < 8.2
        ? (() => {
            const L = Math.hypot(neck.x - NAIL.x, neck.y - NAIL.y);
            const w = Math.max(5, 13 * Math.sqrt(90 / Math.max(90, L)));
            const slack = t > SNAP.t1 ? 40 : 0;
            const d = `M ${NAIL.x} ${NAIL.y} Q ${(NAIL.x + neck.x) / 2} ${(NAIL.y + neck.y) / 2 + slack} ${neck.x} ${neck.y + 6}`;
            return (
              <g fill="none" strokeLinecap="round">
                <path d={d} stroke={INK} strokeWidth={w + 8} />
                <path d={d} stroke="#ff8a1f" strokeWidth={w} />
              </g>
            );
          })()
        : null}

      {kid ? <Stickman c={kid} /> : null}
      <Stickman c={hero} />
      <RiverFront x0={RIVER.near} x1={RIVER.far} surface={RIVER.surface} t={t} />
      <Fish t={t} t0={FISH.t0} t1={FISH.t1} x0={FISH.x0} x1={FISH.x1} surface={RIVER.surface} />
      <Splash t={t} at={JUMP.t1} x={JUMP.x1} y={RIVER.surface} seed="big" />
      {swimSplashes.map((s, i) => (
        <Splash key={i} t={t} at={s} x={hero.x + 40} y={RIVER.surface} n={6} power={0.45} seed={`sw${i}`} />
      ))}
      <Splash t={t} at={FISH.t0} x={FISH.x0} y={RIVER.surface} n={8} power={0.5} seed="f0" />
      <Splash t={t} at={FISH.t1} x={FISH.x1} y={RIVER.surface} n={8} power={0.5} seed="f1" />

      {/* shaking off: droplets fly off tangentially, then fall */}
      {t > 19.6 && t < 20.9
        ? [...Array(18)].map((_, i) => {
            const s = 19.6 + (i % 9) * 0.07;
            const d = t - s;
            if (d < 0 || d > 0.6) return null;
            const from = headOf(heroAt(s));
            const vx = (i % 2 ? 1 : -1) * (300 + (i % 5) * 60);
            const p = particle(d, from.x, from.y + (i % 3) * 30, vx, -250);
            return <circle key={i} cx={p.x} cy={p.y} r={6} fill="#bfe6ff" stroke="#3d8fd1" strokeWidth={2.5} />;
          })
        : null}
      {drips.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={5} fill="#bfe6ff" stroke="#3d8fd1" strokeWidth={2.5} />
      ))}
      {lastDropGrow > 0 ? (
        (() => {
          const from = scarfTailEnd(hero);
          return <ellipse cx={from.x} cy={from.y + 4 * lastDropGrow} rx={3 + 5 * lastDropGrow} ry={4 + 7 * lastDropGrow} fill="#bfe6ff" stroke="#3d8fd1" strokeWidth={2.5} />;
        })()
      ) : null}
      {lastDrop ? <ellipse cx={lastDrop.x} cy={lastDrop.y} rx={8} ry={11} fill="#bfe6ff" stroke="#3d8fd1" strokeWidth={2.5} /> : null}
      {t >= DRIP_HIT_T && t < DRIP_HIT_T + 0.3 ? <Splash t={t} at={DRIP_HIT_T} x={DRIP_FROM.x} y={GROUND - BULL_LANE.lift - 62 * BULL_LANE.scale} n={5} power={0.25} seed="nose" /> : null}

      {/* ice cream: drips, puddle, the falling scoop and the splat */}
      {puddle.length ? <ellipse cx={puddle[0]} cy={GROUND - 2} rx={6 + puddle.length * 4} ry={4} fill="#ffc6dc" stroke={INK} strokeWidth={3} /> : null}
      {melt.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#ffc6dc" stroke={INK} strokeWidth={2} />
      ))}
      {t >= SLIDE_T && t < SPLAT_T
        ? (() => {
            const p = scoopAt(t);
            return <circle cx={p.x} cy={p.y - 6} r={12} fill="#ffc6dc" stroke={INK} strokeWidth={3} />;
          })()
        : null}
      {t >= SPLAT_T ? (
        <g>
          <ellipse cx={SPLAT_X} cy={GROUND - 6} rx={t < 33.0 ? 34 : Math.max(0, 34 - (t - 33.0) * 40)} ry={t < 33.0 ? 9 : Math.max(0, 9 - (t - 33.0) * 11)} fill="#ffc6dc" stroke={INK} strokeWidth={4} />
          <Splash t={t} at={SPLAT_T} x={SPLAT_X} y={GROUND - 8} n={8} power={0.35} seed="splat" fill="#ffc6dc" stroke={INK} />
        </g>
      ) : null}

      <Dust t={t} at={DROP.t1} x={DROP.x1} seed="d1" />
      <Dust t={t} at={SNAP.t1} x={SNAP.x1} seed="d2" />
      <Dust t={t} at={HOP2.t1} x={HOP2.x1} seed="d3" />
      <Dust t={t} at={24.0} x={bull.nose - 20} dir={-1} seed="paw1" color="#d8c9a3" />
      <Dust t={t} at={24.2} x={bull.nose - 20} dir={-1} seed="paw2" color="#d8c9a3" />
      {[0, 0.12, 0.24, 0.36, 0.48, 0.6].map((k) => (
        <Dust key={k} t={t} at={IMPACT_T + k} x={bullAt(IMPACT_T + k).nose - 200} dir={-1} seed={`brake${k}`} color="#d8c9a3" />
      ))}
      <Dust t={t} at={LAND_T} x={LAND_X} seed="land" />
      {[0.15, 0.32, 0.5].map((k) => (
        <Dust key={k} t={t} at={LAND_T + k} x={heroAt(LAND_T + k).x} seed={`roll${k}`} />
      ))}
    </g>
  );
};

// ─── Kid's world: the long, sensible path ─────────────────────────────────
const KWorld: React.FC<{ t: number; camX: number }> = ({ t, camX }) => {
  const kid = kidRaceAt(t);
  const kj = solve(kid.pose, 1);
  const kidHand = toWorld(kid, kj.aHand);
  const vendor =
    t > 25.0 && t < CONE_HANDOFF
      ? {
          x: num(t, [
            [25.0, K.truck + 120],
            [CONE_HANDOFF, kidHand.x, "out"],
          ]),
          y: num(t, [
            [25.0, GROUND - 190],
            [CONE_HANDOFF, kidHand.y, "out"],
          ]),
        }
      : null;
  return (
    <g>
      <Sky camX={camX} />
      <Ground x0={-1000} x1={K.bridge0} color="#8cc56f" />
      <RiverBack x0={K.bridge0 + 40} x1={K.bridge1 - 40} surface={RIVER.surface} t={t} />
      <Ground x0={K.bridge1} x1={9000} color="#8cc56f" />
      <rect x={-1000} y={GROUND - 4} width={10000} height={20} fill="#d8c09a" />
      <Tufts xs={[200, 700, 1300, 1800, 2700, 3100, 4500, 5000, 5400]} />
      {[500, 1500, 2900, 4700, 5500].map((x) => (
        <Tree key={x} x={x} s={0.85} />
      ))}
      {/* the same bull, still asleep behind its fence when the kid tiptoes by */}
      <g transform={`translate(${3800 * 0.25} ${GROUND * 0.25}) scale(0.75)`}>
        <Bull b={{ nose: 3800, facing: 1, stand: 0, run: 0, eyes: "closed", headDown: 0, tongue: 0, paw: 0 }} t={t} />
      </g>
      <SideFence x0={K.pasture0} x1={K.pasture1} y={GROUND - 30} />
      <Truck x={K.truck} t={t} wheelTurn={0} />
      {vendor ? (
        <g>
          <line x1={K.truck + 110} y1={GROUND - 180} x2={vendor.x} y2={vendor.y} stroke={INK} strokeWidth={10} strokeLinecap="round" />
          <g transform={`translate(${vendor.x} ${vendor.y - 4})`} stroke={INK} strokeWidth={4}>
            <path d="M -10 -3 L 10 -3 L 0 25 Z" fill="#e8b46a" />
            <circle cx={0} cy={-12} r={12} fill="#ffc6dc" />
          </g>
        </g>
      ) : null}
      <Stickman c={kid} />
      <RiverFront x0={K.bridge0 + 40} x1={K.bridge1 - 40} surface={RIVER.surface} t={t} />
      <Bridge x0={K.bridge0} x1={K.bridge1} />
      <Fish t={t} t0={11.7} t1={12.3} x0={2380} x1={2200} surface={RIVER.surface} />
    </g>
  );
};

// ─── Fork: full-screen intro ──────────────────────────────────────────────
const Intro: React.FC<{ t: number }> = ({ t }) => {
  const hero = heroIntroAt(t);
  const kid = kidIntroAt(t);
  const shots: readonly (readonly [number, number, number, number, Ease?])[] = [
    [0, 560, 1080, 1.45],
    [1.35, 560, 1080, 1.45],
    [1.5, 640, 940, 2.6, "snap"],
    [2.25, 640, 940, 2.6],
    [2.45, 560, 1080, 1.45, "io"],
  ];
  const tr = (i: 1 | 2 | 3) => num(t, shots.map((k) => [k[0], k[i], k[4]] as const));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <Boil t={t} id="boilI" />
      </defs>
      <g transform={`translate(${W / 2} ${H / 2}) scale(${tr(3)}) translate(${-tr(1)} ${-tr(2)})`}>
        <g filter="url(#boilI)">
          <Sky camX={0} />
          <Ground x0={-1000} x1={2000} color="#8cc56f" />
          {/* the path bends away up the hill; the field is straight ahead */}
          <path d={`M 700 ${GROUND} C 860 ${GROUND - 40}, 900 ${GROUND - 200}, 1100 ${GROUND - 260}`} fill="none" stroke="#d8c09a" strokeWidth={50} strokeLinecap="round" />
          <Tufts xs={[100, 260, 720, 900]} />
          <Tree x={60} s={0.9} />
          <MapSign x={640} />
          <Fence x={920} />
          <Stickman c={kid} />
          <Stickman c={hero} />
        </g>
      </g>
    </svg>
  );
};

// ─── Split screen: path on top, shortcut below ────────────────────────────
const PANEL_H = 900;
const BAR_H = 120;

const Split: React.FC<{ t: number }> = ({ t }) => {
  const kid = kidRaceAt(t);
  const hero = heroAt(t);
  const kCam = kid.x - 380;
  const hCam = hero.x - 430;
  const head = headOf(hero);
  const hCamY = Math.min(610, head.y - 230);
  const s = shake(t, [
    [DROP.t1, 5],
    [SNAP.t1, 6],
    [JUMP.t1, 7],
    [IMPACT_T, 16],
    [FENCE_CRASH_T, 10],
    [LAND_T, 10],
  ]);
  return (
    <>
      <svg viewBox={`${kCam} 610 ${W} ${PANEL_H}`} width={W} height={PANEL_H} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <Boil t={t} id="boilK" />
        </defs>
        <g filter="url(#boilK)">
          <KWorld t={t} camX={kCam} />
        </g>
      </svg>
      <svg viewBox={`${hCam + s.x} ${hCamY + s.y} ${W} ${PANEL_H}`} width={W} height={PANEL_H} style={{ position: "absolute", left: 0, top: PANEL_H + BAR_H }}>
        <defs>
          <Boil t={t} id="boilH" />
        </defs>
        <g filter="url(#boilH)">
          <HWorld t={t} camX={hCam} />
        </g>
      </svg>
      <RaceBar t={t} kidX={kid.x} heroX={hero.x} />
      <Tag top={30} color="#2a9d55" text="THE PATH" />
      <Tag top={PANEL_H + BAR_H + 30} color="#e63946" text="THE SHORTCUT" />
    </>
  );
};

const Tag: React.FC<{ top: number; color: string; text: string }> = ({ top, color, text }) => (
  <div
    style={{
      position: "absolute",
      left: 36,
      top,
      fontFamily: FONT_STACK,
      fontSize: 52,
      color: "#fff",
      background: color,
      border: `6px solid ${INK}`,
      borderRadius: 16,
      padding: "4px 22px",
      rotate: "-2deg",
    }}
  >
    {text}
  </div>
);

const RaceBar: React.FC<{ t: number; kidX: number; heroX: number }> = ({ t, kidX, heroX }) => {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const pk = clamp((kidX - K.start) / (K.stop - K.start));
  const ph = clamp((heroX - 420) / (ROLL_STOP_X - 420));
  const x0 = 150;
  const x1 = 900;
  const y = PANEL_H + BAR_H / 2;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
      <rect x={0} y={PANEL_H} width={W} height={BAR_H} fill="#fff6dc" stroke={INK} strokeWidth={8} />
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={INK} strokeWidth={8} strokeLinecap="round" strokeDasharray="2 18" />
      <g transform={`translate(${x1 + 60} ${y + 4})`} stroke={INK} strokeWidth={5}>
        <path d="M -16 -2 L 16 -2 L 0 38 Z" fill="#e8b46a" />
        <circle cx={0} cy={-16} r={18} fill="#ffc6dc" />
      </g>
      {/* kid marker: party hat */}
      <g transform={`translate(${x0 + (x1 - x0) * pk} ${y - 22})`} stroke={INK} strokeWidth={5}>
        <path d="M -12 -14 L 0 -46 L 12 -14 Z" fill="#ff4d6d" />
        <circle r={20} fill="#fff" />
      </g>
      {/* hero marker: orange scarf */}
      <g transform={`translate(${x0 + (x1 - x0) * ph} ${y + 26})`} stroke={INK} strokeWidth={5}>
        <circle r={22} fill="#fff" />
        <ellipse cx={0} cy={24} rx={20} ry={9} fill="#ff8a1f" />
      </g>
      {t > 25.0 && t < SPLIT_END ? (
        <text x={W / 2} y={y + 12} textAnchor="middle" fontFamily={FONT_STACK} fontSize={40} fill="#2a9d55" opacity={Math.min(1, (t - 25.0) / 0.3)}>
          kid wins!
        </text>
      ) : null}
    </svg>
  );
};

// ─── Finale at the truck (hero's world, full screen) ──────────────────────
const Finale: React.FC<{ t: number }> = ({ t }) => {
  const shots: readonly (readonly [number, number, number, number, Ease?])[] = [
    [SPLIT_END, 6370, 1110, 1.4],
    [SLIDE_T - 0.1, 6370, 1110, 1.4],
    [SLIDE_T + 0.1, 6300, 1250, 2.0, "out"],
    [SPLAT_T + 0.7, 6300, 1250, 2.0],
    [SPLAT_T + 1.0, 6370, 1110, 1.4, "io"],
  ];
  const tr = (i: 1 | 2 | 3) => num(t, shots.map((k) => [k[0], k[i], k[4]] as const));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <Boil t={t} id="boilF" />
      </defs>
      <g transform={`translate(${W / 2} ${H / 2}) scale(${tr(3)}) translate(${-tr(1)} ${-tr(2)})`}>
        <g filter="url(#boilF)">
          <HWorld t={t} camX={tr(1) - 540} />
        </g>
      </g>
    </svg>
  );
};

const EndCard: React.FC<{ t: number }> = ({ t }) => {
  if (t < END_FADE) return null;
  const dark = Math.min(1, (t - END_FADE) / 0.3);
  const l1 = ease("back", (t - (END_FADE + 0.4)) / 0.25);
  const l2 = ease("back", (t - (END_FADE + 1.1)) / 0.25);
  const line: React.CSSProperties = { fontFamily: FONT_STACK, fontSize: 96, color: "#fff", textAlign: "center", lineHeight: 1.15, padding: "0 70px" };
  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(17,17,17,${dark})`, justifyContent: "center", alignItems: "center", gap: 30 }}>
      <div style={{ ...line, scale: String(Math.max(0, l1)), opacity: t > END_FADE + 0.4 ? 1 : 0 }}>The shortcut</div>
      <div style={{ ...line, color: "#ffc6dc", scale: String(Math.max(0, l2)), opacity: t > END_FADE + 1.1 ? 1 : 0 }}>is usually the long way.</div>
    </AbsoluteFill>
  );
};

const Scene: React.FC = () => {
  const t = useT();
  return (
    <>
      {t < SPLIT_START ? <Intro t={t} /> : t < SPLIT_END ? <Split t={t} /> : <Finale t={t} />}
      <EndCard t={t} />
    </>
  );
};

const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

export const TheShortcut: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#bfe6ff" }}>
      <Scene />
      <HookTitle text={'POV: "I know a shortcut"'} />

      {/* The truck's jingle gets louder as they get closer, then drops in pitch as it drives away (Doppler) */}
      <Audio
        name="Ice-cream jingle (approaching)"
        src={sfx("jingle")}
        from={1.0 * fps}
        durationInFrames={(31.3 - 1.0) * fps}
        loop
        volume={(f) => 0.1 + 0.35 * Math.min(1, f / (24 * fps))}
      />
      <Audio name="Ice-cream jingle (leaving, Doppler)" src={sfx("jingle")} from={31.3 * fps} durationInFrames={3.2 * fps} playbackRate={0.88} volume={(f) => 0.45 * Math.max(0, 1 - f / (3.2 * fps))} />

      {/* Fork */}
      <Audio name="Map zoom" src={sfx("pop")} from={1.45 * fps} />
      <Audio name="Hero smug point" src={sfx("snap")} from={2.65 * fps} />
      <Audio name="Kid shrug" src={sfx("kid-blip")} from={2.9 * fps} volume={0.5} playbackRate={0.85} />
      <Audio name="Hero dash" src={sfx("swish")} from={3.3 * fps} />
      <Audio name="Split screen" src={sfx("swish")} from={3.95 * fps} playbackRate={0.7} />

      {/* Fence */}
      <Audio name="Climb creak" src={sfx("creak")} from={4.35 * fps} volume={0.5} />
      <Audio name="Drop landing" src={sfx("thud")} from={DROP.t1 * fps} volume={0.8} />
      <Audio name="Scarf stretches" src={sfx("stretch")} from={5.6 * fps} playbackRate={0.6} volume={0.7} />
      <Audio name="Scarf snaps back" src={sfx("boing")} from={SNAP.t0 * fps} />
      <Audio name="Lands on butt" src={sfx("thud")} from={SNAP.t1 * fps} />
      <Audio name="Unhook" src={sfx("pop")} from={8.2 * fps} />

      {/* Cacti */}
      <Audio name="Startled" src={sfx("snap")} from={10.35 * fps} />
      <Audio name="Poke 1" src={sfx("needle")} from={10.58 * fps} />
      <Audio name="Hop straight up" src={sfx("slide-up")} from={10.65 * fps} durationInFrames={0.35 * fps} playbackRate={2.6} volume={0.6} />
      <Audio name="Poke 2 (same cactus)" src={sfx("needle")} from={11.33 * fps} />
      <Audio name="Hop over" src={sfx("slide-up")} from={11.45 * fps} durationInFrames={0.45 * fps} playbackRate={2.0} volume={0.6} />
      <Audio name="Land past cactus" src={sfx("thud")} from={HOP2.t1 * fps} volume={0.7} />
      <Audio name="Pluck needle" src={sfx("pop")} from={12.75 * fps} volume={0.8} />

      {/* River */}
      <Audio name="Skid at bank" src={sfx("scurry")} from={13.75 * fps} volume={0.5} />
      <Audio name="Run-up" src={sfx("scurry")} from={15.05 * fps} volume={0.7} />
      <Audio name="Jump" src={sfx("swish")} from={15.47 * fps} />
      <Audio name="Splash" src={sfx("splash")} from={JUMP.t1 * fps} />
      <Audio name="Swimming" src={sfx("swim")} from={16.6 * fps} durationInFrames={2.4 * fps} loop volume={0.6} />
      <Audio name="Fish slap" src={sfx("slap")} from={17.25 * fps} />
      <Audio name="Climb out" src={sfx("squelch")} from={19.3 * fps} />
      <Audio name="Shake off" src={sfx("spray")} from={19.6 * fps} />
      <Audio name="Squelchy steps" src={sfx("squelch")} from={20.35 * fps} durationInFrames={0.8 * fps} loop volume={0.6} playbackRate={1.4} />

      {/* Bull */}
      <Audio name="Bull snoring" src={sfx("snore")} from={20.6 * fps} durationInFrames={(DRIP_HIT_T - 20.6) * fps} playbackRate={0.6} volume={0.6} />
      <Audio name="Last drop" src={sfx("plink")} from={DRIP_HIT_T * fps} />
      <Audio name="Bull snort 1" src={sfx("snort")} from={23.65 * fps} />
      <Audio name="Bull snort 2" src={sfx("snort")} from={24.3 * fps} />
      <Audio name="Hoof scrape" src={sfx("thud")} from={24.05 * fps} volume={0.4} playbackRate={1.4} />
      <Audio name="Charge" src={sfx("gallop")} from={24.45 * fps} />
      <Audio name="Hero: yell" src={sfx("hero-scream")} from={(IMPACT_T + 0.05) * fps} />
      <Audio name="Headbutt" src={sfx("thud")} from={IMPACT_T * fps} />
      <Audio name="Fence smash" src={sfx("crack")} from={FENCE_CRASH_T * fps} />
      <Audio name="Flight" src={sfx("long-fall")} from={(IMPACT_T + 0.2) * fps} durationInFrames={1.1 * fps} volume={0.5} />
      <Audio name="Landing" src={sfx("thud")} from={LAND_T * fps} />
      <Audio name="Tumble" src={sfx("scurry")} from={(LAND_T + 0.05) * fps} volume={0.7} playbackRate={0.7} />

      {/* Kid at the truck (top panel) */}
      <Audio name="Cone handoff" src={sfx("chime")} from={CONE_HANDOFF * fps} volume={0.5} />
      <Audio name="Kid: win chime" src={sfx("kid-win")} from={(CONE_HANDOFF + 0.05) * fps} />
      <Audio name="Sold out flip" src={sfx("flip")} from={25.75 * fps} volume={0.6} />

      {/* Finale */}
      <Audio name="Dazed" src={sfx("twinkle")} from={27.9 * fps} volume={0.45} />
      <Audio name="Scoop slides" src={sfx("fall-whistle")} from={SLIDE_T * fps} durationInFrames={(SPLAT_T - SLIDE_T) * fps} volume={0.5} />
      <Audio name="Splat" src={sfx("splat")} from={SPLAT_T * fps} />
      <Audio name="Hero: womp" src={sfx("womp")} from={31.0 * fps} />
      <Audio name="Truck engine" src={sfx("engine")} from={TRUCK_GO * fps} volume={0.6} />
      <Audio name="Bull clip-clop" src={sfx("clop")} from={31.9 * fps} durationInFrames={1.1 * fps} loop volume={0.6} />
      <Audio name="Slurp" src={sfx("slurp")} from={33.0 * fps} />
      <Audio name="Happy snort" src={sfx("snort")} from={33.85 * fps} volume={0.5} playbackRate={1.3} />
      <Audio name="Kid: happy chime" src={sfx("kid-win")} from={34.3 * fps} volume={0.7} playbackRate={1.2} />
      <Audio name="Moral 1" src={sfx("chime")} from={(END_FADE + 0.4) * fps} volume={0.5} />
      <Audio name="Moral 2" src={sfx("chime")} from={(END_FADE + 1.1) * fps} volume={0.5} playbackRate={1.25} />

      {/* Character sound signatures (same in every episode; no voice) */}
      <Audio name="Kid: path!" src={sfx("kid-blip")} from={2.32 * fps} volume={0.6} />
      <Audio name="Hero: heh" src={sfx("hero-blip")} from={2.68 * fps} volume={0.7} playbackRate={1.15} />
      <Audio name="Hero: hmm" src={sfx("hero-blip")} from={13.88 * fps} volume={0.6} playbackRate={0.9} />
      <Audio name="Hero: uh-oh" src={sfx("hero-blip")} from={23.52 * fps} volume={0.7} playbackRate={0.8} />
      <Audio name="Kid: whoa" src={sfx("kid-blip")} from={27.02 * fps} volume={0.6} playbackRate={1.1} />
      <Audio name="Kid: here" src={sfx("kid-blip")} from={29.12 * fps} volume={0.5} />
      <Audio name="Hero: hm?" src={sfx("hero-blip")} from={33.25 * fps} volume={0.6} playbackRate={1.1} />
    </AbsoluteFill>
  );
};

