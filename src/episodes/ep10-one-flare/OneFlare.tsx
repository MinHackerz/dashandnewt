import React from "react";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/PermanentMarker";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, num, shake, type Ease } from "../../lib/kf";
import { WRITE } from "../../lib/read";
import { POSES, FACES } from "../../rig/library";
import { GROUND, solve } from "../../rig/Stickman";
import type { CharState } from "../../rig/types";
import { Layer } from "../../rig2d/depth";
import { Toon, TOON_INK } from "../../rig2d/Toon";
import { ChalkPath, ChalkText, ChalkTint } from "../../shared/chalk";
import { Stamp } from "../../shared/lesson";
import { FONT_STACK, HookTitle, Stars } from "../../shared/ui";
import { coconutAt, dashHoldsGun, DOOR_X, FLOOR, fromLane, GUN_ON_ROCK, handOf, headOf, heroAt, isNight, K0, kidAt, newtHauls, newtHoldsGun, ringAt } from "./cast";
import {
  Bolt,
  Bubble,
  Flare,
  FlareGun,
  Gull,
  Headland,
  Heli,
  IslandTop,
  Kit,
  Log,
  mix,
  OpenSea,
  Palm,
  Rock,
  Sand,
  Sea,
  Seaplane,
  Ship,
  SignSide,
  SignTop,
  Sky,
  StormWall,
  TopDash,
  TopNewt,
  type ShipState,
} from "./props";
import {
  AERIAL,
  AX,
  BANG,
  BUBBLE_T,
  BURST,
  CUE,
  DASH_X,
  dbAt,
  DRIFT,
  DURATION,
  END,
  FIN,
  FIRE,
  FL,
  flareAt,
  flareTau,
  FLIGHT,
  GRAB,
  groundY,
  GULL,
  GUN_ROCK,
  HEART,
  hiddenM,
  HOARSE,
  HOOK,
  HORIZON,
  HZ,
  KIT,
  LOOK1,
  LOOK1_LINE,
  LOOK2,
  LOOK2_LINES,
  LOOK3,
  LOOK3_LINES,
  MEGA_DB,
  NEWT_X,
  NIGHT1,
  NIGHT2,
  OUT_D,
  OUT_N,
  OVER1,
  OVER2,
  OVER3,
  PALM0_X,
  PALM1_X,
  PALM2,
  POP,
  proj,
  PX_PER_M,
  REALIZE,
  REEF,
  RING,
  ROCK,
  ROCKW,
  SHIP,
  shipFar,
  SHOUT1,
  SHOUT2,
  SHOUT3,
  SINK,
  SKID_T,
  SLOW,
  sOf,
  STOP,
  STRANDED,
  TALLY1,
  TINK,
  WING_HZ,
  wreckX,
  Z,
  DOOR,
} from "./timeline";

loadFont();

const W = 1080;
const H = 1920;
const INK = TOON_INK;
const px = (m: number) => m * PX_PER_M;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const within = (t: number, a: number, b: number) => t >= a && t < b;
const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

// ─── The flare in world space (with a short blend out of the actual muzzle) ──
const muzzleAt = (t: number) => {
  const c = heroAt(t).c;
  const j = solve(c.pose);
  const f = (j.aForeAng * Math.PI) / 180;
  const dir = { x: c.facing * Math.sin(f), y: Math.cos(f) };
  const h = fromLane(handOf(c, "a"), Z.dash);
  const s = sOf(Z.dash);
  return { x: h.x + dir.x * 80 * s, y: h.y + dir.y * 80 * s, dir };
};
const MUZZLE0 = muzzleAt(BANG);
const flareWorld = (tau: number) => {
  const f = flareAt(tau);
  const p = proj(f.x, f.Z, f.Y);
  const p0 = proj(flareAt(0).x, flareAt(0).Z, flareAt(0).Y);
  const k = 1 - clamp01(tau / 0.6);
  return { x: p.x + (MUZZLE0.x - p0.x) * k, y: p.y + (MUZZLE0.y - p0.y) * k, s: p.s, Z: f.Z };
};
const fp = (t: number) => flareWorld(Math.max(0, flareTau(t)));
const LANDING = flareWorld(FLIGHT.land);

// ─── Beach camera, REAL clock: [time, centre x, centre y, zoom, roll°, easing] ──
const wreckNose = (t: number) => proj(wreckX(t), Z.wreck);
const SH = (() => {
  const a0 = fp(BANG + 0.9);
  const pop = fp(POP);
  const da = fp(DRIFT.a);
  const db = fp(DRIFT.b);
  const dc = fp(DRIFT.c);
  const ship = proj(SHIP.x, SHIP.Z, 4);
  const mouth3 = { x: proj(ROCK.x, Z.rock).x, y: groundY(Z.rock) - px(ROCK.h + 1.6) * sOf(Z.rock) };
  const tally = proj(PALM1_X, Z.palm1, 1.05);
  const palmTop = proj(PALM2.x - 70, Z.palm2, PALM2.h - 1.5 + 1.6);
  const rows: (readonly [number, number, number, number, number, Ease?])[] = [
    // the crash: low and tilted, following the slide
    [FL.touch, wreckNose(FL.touch).x - 60, 1110, 1.7, -7],
    [STOP, wreckNose(STOP).x - 150, 1130, 1.75, -3, "out"],
    [DOOR + 0.2, wreckNose(STOP).x - 230, 1130, 1.9, 0, "io"],
    [STRANDED.a, wreckNose(STOP).x - 200, 1080, 1.35, 0, "io"],
    [K0 - 0.01, wreckNose(STOP).x - 180, 1070, 1.3, 0, "lin"],
    // the kit
    [K0, 1020, 1180, 1.45, 0],
    [KIT.insB, 1030, 1150, 1.3, 0, "lin"],
    [LOOK1.tint + 0.3, 1060, 960, 0.95, 0, "io"],
    [LOOK1.end, 1060, 960, 0.97, 0, "lin"],
    [GUN_ROCK.b, 1020, 1160, 1.5, 0, "io"],
    // Dash eyes the gun: punch-in, slight roll
    [GUN_ROCK.b + 0.12, 1160, 1060, 2.0, 3, "snap"],
    [TALLY1.a - 0.01, 1165, 1060, 2.1, 3, "lin"],
    // DAY 1: close on the palm
    [TALLY1.a, tally.x + 60, tally.y + 20, 2.3, 0],
    [TALLY1.b - 0.01, tally.x + 60, tally.y + 20, 2.4, 0, "lin"],
    // shout 1: tight on Dash, then out with the bubble to the horizon
    [SHOUT1.a, 1250, 1010, 1.7, 0],
    [SHOUT1.out, 1260, 1000, 1.8, 0, "lin"],
    [SHOUT1.out + 0.5, 1640, 960, 0.78, 0, "snap"],
    [SHOUT1.end, 1720, 950, 0.74, 0, "lin"],
    // nights: wide
    [NIGHT1.a, 1150, 1020, 0.72, 0],
    [NIGHT1.b - 0.01, 1150, 1020, 0.74, 0, "lin"],
    // shout 2: low angle up the palm, then out
    [SHOUT2.a, palmTop.x - 40, palmTop.y + 140, 1.35, -7],
    [SHOUT2.out, palmTop.x - 40, palmTop.y + 130, 1.4, -7, "lin"],
    [SHOUT2.out + 0.5, palmTop.x + 300, 700, 0.62, -2, "snap"],
    [OVER2.a - 0.01, palmTop.x + 340, 720, 0.6, 0, "lin"],
    [NIGHT2.a, 1150, 1020, 0.72, 0],
    [NIGHT2.b - 0.01, 1150, 1020, 0.74, 0, "lin"],
    // shout 3: MAXIMUM VOLUME, tight and tilted, then out
    [SHOUT3.a, mouth3.x + 40, mouth3.y + 80, 1.9, 5],
    [SHOUT3.out, mouth3.x + 40, mouth3.y + 70, 2.05, 5, "lin"],
    [SHOUT3.out + 0.5, 1620, 930, 0.74, 0, "snap"],
    [HOARSE.a, 1680, 930, 0.72, 0, "lin"],
    [HOARSE.a + 0.25, mouth3.x + 20, mouth3.y + 90, 1.8, 0, "snap"],
    [HOARSE.b, mouth3.x + 20, mouth3.y + 90, 1.85, 0, "lin"],
    // Newt's look: wide on the sea
    [LOOK2.tint + 0.3, 1500, 880, 0.64, 0, "io"],
    [OVER3.a - 0.01, 1520, 880, 0.66, 0, "lin"],
    // the wing rock: wide with the sky
    [ROCKW.a, 1150, 640, 0.72, 0],
    [ROCKW.b - 0.01, 1180, 680, 0.74, 0, "lin"],
    // the ship at the reef: punch in
    [REEF.a, ship.x - 10, ship.y + 10, 2.0, 0],
    [REEF.a + 0.3, ship.x - 10, ship.y + 8, 2.7, 0, "snap"],
    [REEF.b - 0.01, ship.x - 30, ship.y + 6, 2.8, 0, "lin"],
    // Dash grabs the gun
    [GRAB.a, 1150, 1080, 1.35, 0],
    [GRAB.up, 1180, 1000, 1.25, 0, "io"],
    [GRAB.raise, 1250, 860, 1.15, -5, "io"],
    [BANG - 0.05, 1290, 760, 1.35, -7, "io"],
    // BANG: slow motion on the barrel, then the follow camera up the climb
    [SLOW.b, a0.x, a0.y + 150, 1.0, -4, "io"],
    [POP, pop.x, pop.y + 120, 1.25, 0, "io"],
    // Newt's look #3: the whole drop in one frame (flare at the top, the ship at the bottom)
    [LOOK3.tint, (pop.x + ship.x) / 2, (pop.y + ship.y) / 2 + 150, 0.29, 0, "io"],
    [DRIFT.a - 0.01, (pop.x + ship.x) / 2, (pop.y + ship.y) / 2 + 150, 0.3, 0, "lin"],
    // the float down, three time cuts
    [DRIFT.a, (da.x + ship.x) / 2, (da.y + ship.y) / 2, 0.62, 0],
    [DRIFT.b - 0.01, (da.x + ship.x) / 2, (da.y + ship.y) / 2 + 60, 0.64, 0, "lin"],
    [DRIFT.b, (db.x + ship.x) / 2, (db.y + ship.y) / 2 + 40, 1.0, 0],
    [DRIFT.c - 0.01, (db.x + ship.x) / 2, (db.y + ship.y) / 2 + 80, 1.04, 0, "lin"],
    [DRIFT.c, (dc.x + ship.x) / 2, (dc.y + ship.y) / 2 + 40, 1.6, 0],
    [TINK, LANDING.x, LANDING.y, 3.4, 0, "in"],
    // fire, the burst (pull out), the sinking
    [FIRE.a, LANDING.x + 10, LANDING.y + 8, 2.9, 0, "io"],
    [BURST - 0.02, ship.x - 10, ship.y + 10, 2.4, 0, "io"],
    [BURST + 0.25, ship.x - 10, ship.y - 20, 1.5, 3, "snap"],
    [SINK.a, ship.x - 10, ship.y + 10, 2.0, 0, "io"],
    [SINK.b + 0.2, ship.x - 10, ship.y + 20, 2.1, 0, "lin"],
    // the life ring: whip back to Dash's feet, then his face
    [RING.a + 0.3, DASH_X + 40, 1290, 1.7, 0, "snap"],
    [RING.bump, DASH_X + 40, 1300, 1.8, 0, "lin"],
    [REALIZE.a + 0.2, DASH_X, 1010, 2.2, 0, "io"],
    [REALIZE.horror, DASH_X, 1000, 2.6, -4, "snap"],
    [REALIZE.b, DASH_X - 120, 1060, 1.7, 0, "io"],
    // heart: the palm, then sitting together, then the wide dusk shot
    [HEART.a + 0.3, tally.x + 70, tally.y + 30, 2.2, 0],
    [HEART.walk, tally.x + 70, tally.y + 30, 2.25, 0, "lin"],
    [HEART.walk + 0.01, DASH_X - 140, 1180, 1.6, 0],
    [HEART.sit + 0.2, DASH_X - 140, 1180, 1.65, 0, "io"],
    [HEART.wide, DASH_X - 140, 1180, 1.65, 0, "lin"],
    [HEART.fade, 1250, 960, 0.62, 0, "io"],
  ];
  return rows;
})();
const FOLLOW = { a: BANG + 0.75, b: LOOK3.tint };
const cam = (t: number) => {
  const tr = (i: 1 | 2 | 3 | 4) => num(t, SH.map((k) => [k[0], k[i], k[5]] as const));
  const c = { x: tr(1), y: tr(2), z: tr(3), roll: tr(4) };
  // the follow camera rides the flare up its climb (blended in and out of the table)
  if (t > FOLLOW.a - 0.4 && t < FOLLOW.b + 0.9) {
    const k = Math.min(ease("io", (t - (FOLLOW.a - 0.4)) / 0.4), 1 - ease("io", (t - FOLLOW.b) / 0.9));
    const f = fp(Math.min(t, FOLLOW.b));
    c.x += (f.x - c.x) * k;
    c.y += (f.y + 160 - c.y) * k;
  }
  return c;
};

// ─── Light: day, night, dusk ──────────────────────────────────────────────
const lightAt = (t: number) => {
  for (const n of [NIGHT1, NIGHT2]) if (within(t, n.a, n.b)) return 1 - Math.sin(Math.PI * clamp01((t - n.a) / (n.b - n.a))) * 0.95;
  if (t > HEART.walk) return 1 - 0.3 * clamp01((t - HEART.walk) / 2.5);
  return 1;
};
const duskAt = (t: number) => (t > HEART.walk ? clamp01((t - HEART.walk) / 2.5) : 0);
const signCount = (t: number) => (t < OVER1.a + 0.3 ? 0 : t < OVER2.a + 0.3 ? 1 : t < OVER3.lp + 0.3 ? 2 : 4);
const SIGN_X0 = 2250;

// ─── The ship's state ─────────────────────────────────────────────────────
const shipState = (t: number): ShipState => {
  const crew: ShipState["crew"] = t < DRIFT.b ? "wave" : t < FIRE.crew ? "point" : t < FIRE.boat ? "boat" : "row";
  const boat = t < REEF.lower ? 0 : t < FIRE.crew ? 0.25 * clamp01((t - REEF.lower) / 1.2) : 0.25 + 0.75 * clamp01((t - FIRE.crew) / (FIRE.boat - FIRE.crew));
  const fire = t < TINK + 0.2 ? 0 : clamp01((t - TINK - 0.2) / (BURST - TINK - 0.2)) * 0.6 + (t > BURST ? 0.4 : 0);
  const sink = t < BURST ? 0 : t < SINK.a ? 0.1 * clamp01((t - BURST) / (SINK.a - BURST)) : 0.1 + 0.9 * ease("in", (t - SINK.a) / (SINK.b - SINK.a));
  return { t, crew, boat, row: clamp01((t - FIRE.boat) / 6), fire, burst: t < BURST ? -1 : t - BURST, sink, flareOn: t >= TINK && t < TINK + 0.6 };
};

// ─── The shout bubbles: loudness L(r) shown as they travel out to the horizon ──
const shoutPath = (from: { x: number; y: number }, u: number) => {
  const r = Math.pow(10, 3 * u); // 1 m … 1 km
  const p = proj(DASH_X + px(r * 0.45), Z.dash + r * 0.9, 1.7);
  return { x: from.x + (p.x - proj(DASH_X, Z.dash, 1.7).x) * 1 + 0, y: from.y + (p.y - proj(DASH_X, Z.dash, 1.7).y), s: p.s, r };
};
const ShoutFX: React.FC<{ t: number; sh: { a: number; out: number; end: number }; boost: number; mouth: { x: number; y: number }; gull?: boolean }> = ({ t, sh, boost, mouth, gull }) => {
  if (t < sh.out || t > sh.end + 0.6) return null;
  const u = clamp01((t - sh.out) / BUBBLE_T);
  const eaten = gull && t > GULL;
  const p = shoutPath(mouth, u);
  const L = dbAt(p.r, boost);
  const k = Math.max(0.05, Math.max(p.s, 0.12) * (L / 100) * 1.25);
  const tags = [0, 1 / 3, 2 / 3, 1].filter((v) => !gull || v < 0.5);
  return (
    <g>
      {!eaten && u < 1 ? <Bubble x={p.x} y={p.y - 60 * k} s={k} text={boost ? "HELP!!!" : "HELP!"} alpha={clamp01(1.2 - u * 0.9)} /> : null}
      {tags.map((v) => {
        if (u < v) return null;
        const q = shoutPath(mouth, v);
        const Lv = Math.round(dbAt(q.r, boost));
        return (
          <g key={v} opacity={clamp01((t - (sh.out + v * BUBBLE_T)) / 0.15)}>
            <text x={q.x + (v === 1 ? 60 : 0)} y={q.y - 120 - v * 120} textAnchor="middle" fontFamily={FONT_STACK} fontSize={v === 1 ? 100 : 88} fill={Lv < 60 ? "#ffd23f" : "#ffffff"} stroke={INK} strokeWidth={18} paintOrder="stroke">
              {`${Lv} dB`}
            </text>
          </g>
        );
      })}
      {gull ? <GullFX t={t} sh={sh} mouth={mouth} /> : null}
    </g>
  );
};
const GullFX: React.FC<{ t: number; sh: { out: number }; mouth: { x: number; y: number } }> = ({ t, sh, mouth }) => {
  const at = shoutPath(mouth, (GULL - sh.out) / BUBBLE_T);
  const dt = t - GULL;
  const x = dt < 0 ? at.x - 900 * -dt : at.x + 700 * dt;
  const y = dt < 0 ? at.y - 120 + 200 * dt : at.y - 120 - 260 * dt;
  return <Gull x={x} y={y} s={1.7} t={t} beak={dt > 0} />;
};

// ─── Newt's physics looks ─────────────────────────────────────────────────
const Look1Arrow: React.FC<{ t: number }> = ({ t }) => {
  if (t < LOOK1.tint || t > LOOK1.end) return null;
  const k = proj(980, Z.kit);
  return <ChalkPath t={t} at={LOOK1.tint + 0.1} dur={0.6} d={`M ${k.x} ${k.y - 120} L ${k.x + 30} ${k.y - 1100} m -50 60 l 50 -60 l 40 68`} width={16} color="#ffd23f" outline />;
};
const Look2Rings: React.FC<{ t: number; mouth: { x: number; y: number } }> = ({ t, mouth }) => {
  if (t < LOOK2.tint || t > LOOK2.end) return null;
  return (
    <g>
      {[0, 1, 2, 3].map((k) => {
        const r = 160 + k * 230;
        return <ChalkPath key={k} t={t} at={LOOK2.rings + k * 0.18} dur={0.5} d={`M ${mouth.x} ${mouth.y - r} A ${r} ${r * 0.8} 0 0 1 ${mouth.x} ${mouth.y + r}`} width={Math.max(3, 16 - k * 4)} outline />;
      })}
      <ChalkPath t={t} at={LOOK2.l2} dur={0.6} d={`M ${mouth.x + 960} ${mouth.y - 60} q 60 -40 120 0 q 60 40 120 0 q 60 -40 120 0`} width={12} color="#ffd23f" outline />
    </g>
  );
};
const Look3: React.FC<{ t: number; z: number }> = ({ t, z }) => {
  if (t < LOOK3.tint || t > LOOK3.end) return null;
  const tau0 = flareTau(LOOK3.tint);
  const pts = [...Array(26)].map((_, k) => flareWorld(tau0 + ((FLIGHT.land - tau0) * k) / 25));
  const d = pts.map((p, k) => `${k ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
  const mid = pts[8];
  return (
    <g>
      {[0, 1, 2].map((k) => (
        <ChalkPath key={k} t={t} at={LOOK3.tint + 0.1 + k * 0.15} dur={0.5} d={`M ${mid.x - 1500} ${mid.y - 1300 + k * 1300} l 1000 260 m -200 -150 l 200 150 l -240 70`} width={9 / z} outline />
      ))}
      <ChalkPath t={t} at={LOOK3.tint + 0.7} dur={1.2} d={d} width={8 / z} color="#ffd23f" dash outline />
      <ChalkPath t={t} at={LOOK3.oh - 0.3} dur={0.4} d={`M ${LANDING.x - 260} ${LANDING.y - 260} l 520 520 M ${LANDING.x + 260} ${LANDING.y - 260} l -520 520`} width={9 / z} color="#ff5a4a" outline />
    </g>
  );
};

// ─── The beach world (inside the camera transform) ──────────────────────────
type Item = { Z: number; key: string; node: React.ReactNode };
const BeachWorld: React.FC<{ t: number; camX: number; z: number }> = ({ t, camX, z }) => {
  const light = lightAt(t);
  const dusk = duskAt(t);
  const hero = heroAt(t);
  const kid = kidAt(t);
  const showShip = t >= REEF.a;
  const ss = shipState(t);
  const ship = proj(SHIP.x, SHIP.Z, 0);
  const tau = flareTau(t);
  const flying = tau >= 0 && t < TINK;
  const f = flying ? fp(t) : null;
  const items: Item[] = [];
  const lane = (Zv: number, ax: number, node: React.ReactNode) => (
    <Layer s={sOf(Zv)} ground={groundY(Zv)} ax={AX}>
      {node}
      {void ax}
    </Layer>
  );
  // set pieces
  const wx = t < STOP ? wreckX(t) : wreckX(STOP);
  const crash = t < K0;
  const slideTilt = t < STOP ? -4 * (1 - (t - FL.touch) / SKID_T) : 0;
  items.push({
    Z: Z.wreck,
    key: "wreck",
    node: lane(
      Z.wreck,
      wx,
      <g>
        <Heli x={wx - 200} y={GROUND} rotor={0.4} blur={0} tilt={slideTilt} dead fin={t < FIN.off} door={crash ? clamp01((t - DOOR) / 0.25) : 1} smoke={crash ? clamp01((t - STOP) / 0.6) : 0.6} t={t} />
        {t >= FIN.off && t < FIN.land + 3 && crash ? (
          <path
            d={`M ${wx - 760} ${GROUND - 270 + Math.min(270, 0.5 * 9.8 * PX_PER_M * Math.pow(Math.max(0, t - FIN.off), 2))} l -40 -100 l 60 0 l 20 100 Z`}
            fill="#e63946"
            stroke={INK}
            strokeWidth={7}
          />
        ) : null}
        {t >= FL.touch && t < STOP + 0.5
          ? [...Array(10)].map((_, k) => {
              const a = (t - FL.touch) * 3 + k * 0.37;
              const u = a % 1;
              return <circle key={k} cx={wx - 100 - k * 40 + u * 120} cy={GROUND - 30 - Math.sin(u * Math.PI) * 120} r={18 * (1 - u)} fill="#f2d59b" stroke={INK} strokeWidth={3} opacity={t < STOP ? 1 : 1 - (t - STOP) / 0.5} />;
            })
          : null}
      </g>,
    ),
  });
  items.push({ Z: Z.palm0, key: "palm0", node: lane(Z.palm0, PALM0_X, <Palm x={PALM0_X} h={5.2} t={t} light={light} bend={1.2} />) });
  items.push({ Z: Z.palm2, key: "palm2", node: lane(Z.palm2, PALM2.x, <Palm x={PALM2.x} h={PALM2.h} t={t + 1} light={light} bend={0.7} />) });
  const marks = t < TALLY1.a + 0.6 ? 0 : t < NIGHT1.b ? 1 : t < NIGHT2.b ? 3 : 5;
  items.push({
    Z: Z.palm1 + 0.01,
    key: "palm1",
    node: lane(Z.palm1, PALM1_X, <Palm x={PALM1_X} h={4.2} t={t + 2} light={light} marks={t >= HEART.carve ? 5 : marks} scratched={t >= HEART.scratch + 0.5} day1={t >= HEART.carve + 0.5} />),
  });
  items.push({ Z: Z.rock, key: "rock", node: lane(Z.rock, ROCK.x, <Rock x={ROCK.x} h={ROCK.h} w={ROCK.w} light={light} gun={t >= GUN_ROCK.b - 0.1 && t < GRAB.take} />) });
  if (t >= K0 && t < HEART.walk) items.push({ Z: Z.kit, key: "kit", node: lane(Z.kit, 980, <Kit x={980} open={clamp01((t - KIT.open) / 0.25)} />) });
  // the characters (hidden inside the wreck until they climb out)
  const gunNode = (c: CharState) => {
    const j = solve(c.pose);
    const fa = (j.aForeAng * Math.PI) / 180;
    const dir = { x: c.facing * Math.sin(fa), y: Math.cos(fa) };
    const h = handOf(c, "a");
    const rot = (Math.atan2(dir.y, dir.x) * 180) / Math.PI;
    return (
      <g transform={`translate(${h.x} ${h.y}) rotate(${rot}) scale(1 ${dir.x < 0 ? -1 : 1})`}>
        <FlareGun x={-4} y={4} rot={0} s={c.scale} />
      </g>
    );
  };
  if (!(crash && t < OUT_D.a))
    items.push({
      Z: hero.Z,
      key: "dash",
      node: lane(
        hero.Z,
        hero.c.x,
        <g>
          <Toon who="dash" c={hero.c} />
          {dashHoldsGun(t) ? gunNode(hero.c) : null}
          {within(t, SHOUT3.a + 0.2, HOARSE.b + 3) ? <Megaphone c={hero.c} /> : null}
          {crash || t < K0 + 1.4 ? <Stars t={t} x={headOf(hero.c).x} y={headOf(hero.c).y - 70} /> : null}
        </g>,
      ),
    });
  if (!(crash && t < OUT_N.a))
    items.push({
      Z: kid.Z + 0.02,
      key: "newt",
      node: lane(
        kid.Z,
        kid.c.x,
        <g>
          {newtHauls(t) ? <Log x0={kid.c.x + 70} y0={GROUND - 70} x1={kid.c.x + 330} y1={GROUND - 6} w={30} /> : null}
          <Toon who="newt" c={kid.c} />
          {newtHoldsGun(t) ? gunNode(kid.c) : null}
          {crash || t < K0 + 1.0 ? <Stars t={t + 0.5} x={headOf(kid.c).x} y={headOf(kid.c).y - 80} /> : null}
        </g>,
      ),
    });
  // the coconut half and the life ring
  const coco = coconutAt(t);
  const ring = ringAt(t);
  if (ring) {
    const p = proj(ring.x, ring.Z);
    items.push({
      Z: ring.Z,
      key: "ring",
      node: (
        <g transform={`translate(${p.x} ${p.y - 20 * p.s + ring.bob}) scale(${p.s})`}>
          <ellipse rx={90} ry={34} fill="none" stroke={INK} strokeWidth={36} />
          <ellipse rx={90} ry={34} fill="none" stroke="#ff7a1a" strokeWidth={24} strokeDasharray="60 40" />
          <ellipse rx={90} ry={34} fill="none" stroke="#ffffff" strokeWidth={24} strokeDasharray="40 60" strokeDashoffset={-60} />
          <text y={-50} textAnchor="middle" fontFamily={FONT_STACK} fontSize={34} fill="#fff" stroke={INK} strokeWidth={8} paintOrder="stroke">
            MV HOPE
          </text>
        </g>
      ),
    });
  }
  items.sort((a, b) => b.Z - a.Z);
  const near = (fz: number) => fz < 3;
  return (
    <g>
      {/* clouds high above the sea (parallax for the flare's climb) */}
      {[...Array(8)].map((_, k) => {
        const p = proj(AX + (k - 4) * 6000, 120 + k * 30, 60 + (k % 4) * 30);
        return (
          <g key={k} fill={mix(mix("#2c3550", "#ffffff", light), "#ffc8a8", dusk * 0.5)} stroke={INK} strokeWidth={4} opacity={0.9}>
            <ellipse cx={p.x} cy={p.y} rx={260} ry={70} />
            <ellipse cx={p.x - 120} cy={p.y + 20} rx={160} ry={56} />
          </g>
        );
      })}
      <Sea camX={camX} t={t} light={light} dusk={dusk} />
      <Headland light={light} />
      {showShip ? <Ship x={ship.x} y={ship.y} ppm={px(1) * ship.s} st={ss} light={light} dusk={dusk} /> : null}
      {within(t, ROCKW.a, ROCKW.b) ? <PlaneFX t={t} /> : null}
      {f && !near(f.Z) ? <FlareFX t={t} z={z} /> : null}
      <Sand camX={camX} light={light} dusk={dusk} />
      <SignSide n={signCount(t)} x0={SIGN_X0} Z0={Z.sign} />
      {items.map((it) => (
        <g key={it.key}>{it.node}</g>
      ))}
      {coco ? <Coconut x={coco.x} y={coco.y} s={coco.s} /> : null}
      {t >= REALIZE.horror + 0.1 ? (
        <g transform={`translate(${proj(DASH_X + 90, Z.dash - 0.3).x} ${proj(DASH_X + 90, Z.dash - 0.3).y - 18})`}>
          <FlareGun x={0} y={0} rot={8} s={sOf(Z.dash)} />
        </g>
      ) : null}
      {f && near(f.Z) ? <FlareFX t={t} z={z} /> : null}
      {t >= BANG && t < BANG + 0.6 ? <MuzzleFX t={t} /> : null}
      <ShoutFX t={t} sh={SHOUT1} boost={0} mouth={mouthOf(t)} />
      <ShoutFX t={t} sh={SHOUT2} boost={0} mouth={mouthOf(t)} gull />
      <ShoutFX t={t} sh={SHOUT3} boost={MEGA_DB} mouth={mouthOf(t)} />
      <Look1Arrow t={t} />
      <Look2Rings t={t} mouth={mouthOf(t)} />
      <Look3 t={t} z={z} />
    </g>
  );
};

const mouthOf = (t: number) => {
  const h = heroAt(t);
  const head = fromLane(headOf(h.c), h.Z);
  const s = sOf(h.Z);
  return { x: head.x + 70 * s * h.c.facing, y: head.y + 20 * s };
};

/** the palm-leaf megaphone, held to his mouth */
const Megaphone: React.FC<{ c: CharState }> = ({ c }) => {
  const head = headOf(c);
  const x = head.x + c.facing * 40;
  const y = head.y + 18;
  return (
    <g transform={`translate(${x} ${y}) scale(${c.facing} 1)`} stroke={INK} strokeWidth={6} strokeLinejoin="round">
      <path d="M 0 -12 L 150 -62 L 150 62 L 0 12 Z" fill="#4ea04a" />
      <path d="M 20 -8 L 140 -40 M 20 8 L 140 40" stroke="#2f7d37" strokeWidth={5} />
    </g>
  );
};

const Coconut: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <g transform={`translate(${x} ${y - 10 * s}) scale(${s})`} stroke={INK} strokeWidth={5}>
    <path d="M -34 0 A 34 30 0 0 0 34 0 Z" fill="#6b4a2b" />
    <ellipse rx={34} ry={9} fill="#fffaf0" />
  </g>
);

const MuzzleFX: React.FC<{ t: number }> = ({ t }) => {
  const u = clamp01((t - BANG) / 0.6);
  const m = MUZZLE0;
  return (
    <g opacity={1 - u}>
      <circle cx={m.x + m.dir.x * 30} cy={m.y + m.dir.y * 30} r={40 + 120 * u} fill="none" stroke="#e8e8e8" strokeWidth={30 * (1 - u) + 4} />
      <circle cx={m.x} cy={m.y} r={50 * (1 - u) + 10} fill="#ffd23f" />
    </g>
  );
};

const FlareFX: React.FC<{ t: number; z: number }> = ({ t, z }) => {
  const tau = flareTau(t);
  const p = fp(t);
  const trail = [...Array(14)].map((_, k) => flareWorld(Math.max(0, tau - k * 0.12))).filter((_, k) => tau - k * 0.12 > 0 && tau - k * 0.12 < FLIGHT.ta + 0.2);
  const chute = clamp01((tau - FLIGHT.ta) / 0.35);
  return <Flare x={p.x} y={p.y} s={Math.max(0.55 / z, p.s * 1.6)} chute={chute} t={t} trail={trail} />;
};

const PlaneFX: React.FC<{ t: number }> = ({ t }) => {
  const u = (t - ROCKW.a) / (ROCKW.b - ROCKW.a);
  const x = 400 + u * 1600;
  const y = 330 - Math.sin(u * Math.PI) * 140;
  const roll = t > ROCKW.rock && t < ROCKW.radio ? 22 * Math.sin((t - ROCKW.rock) * WING_HZ * 2 * Math.PI) : 0;
  return (
    <g>
      <Seaplane x={x} y={y} s={1.0} roll={roll} t={t} />
      {t > ROCKW.radio
        ? [0, 1, 2].map((k) => {
            const r = 60 + ((t - ROCKW.radio) * 500 + k * 110) % 330;
            return <path key={k} d={`M ${x + r} ${y - r * 0.7} A ${r} ${r} 0 0 1 ${x + r} ${y + r * 0.7}`} fill="none" stroke="#ffd23f" strokeWidth={9} opacity={1 - r / 400} />;
          })
        : null}
    </g>
  );
};

// ─── The flight (0 → touchdown), its own staging ───────────────────────────
const cabinChar = (who: "dash" | "newt", t: number): CharState => ({
  x: 0,
  lift: 0,
  facing: 1,
  scale: who === "dash" ? 1 : 0.72,
  sx: 1,
  sy: 1,
  pose: { ...(who === "dash" ? POSES.holdOut : POSES.sitHold), head: who === "dash" ? -6 : 14 },
  faceX: who === "dash" ? 0.9 : 0.4,
  lookY: who === "dash" ? 0 : 0.8,
  expr: who === "dash" ? (t > FL.snap && t < FL.snap + 0.3 ? FACES.wise : FACES.cautious) : FACES.kidDeadpan,
  blink: 0,
  aHand: "fist",
  bHand: "fist",
  extras: who === "dash" ? { scarf: true } : { partyHat: true, blush: true },
  t,
  speed: 0,
});

const FlightScene: React.FC<{ t: number }> = ({ t }) => {
  const storm = clamp01((t - FL.storm) / 0.25);
  const flash = t > FL.strike && t < FL.strike + 0.14 ? 1 : 0;
  const dead = t > FL.strike + 0.1;
  const rotorSpeed = dead ? Math.max(4, 40 - (t - FL.strike) * 18) : 40;
  const rotorAng = t * rotorSpeed;
  const blur = rotorSpeed > 20 ? 1 : 0;
  if (within(t, FL.cabin, FL.out)) return <Cabin t={t} />;
  if (within(t, FL.island, FL.touch)) {
    // whip pan down: the "?" island from above, the helicopter spiralling down onto its beach
    const u = clamp01((t - FL.island) / (FL.touch - FL.island));
    const k = 0.9 + 1.8 * ease("in", u);
    const hx = 540 + Math.cos(t * 5) * 220 * (1 - u);
    const hy = 1100 + Math.sin(t * 5) * 140 * (1 - u);
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <rect width={W} height={H} fill="#1f5f8f" />
        <g transform={`translate(540 1000) scale(${k}) translate(-470 -900)`}>
          <IslandTop t={t} showSign={0} />
        </g>
        <rect width={W} height={H} fill="#1b2230" opacity={0.35 * (1 - u)} />
        <g transform={`translate(${hx} ${hy}) rotate(${t * 300}) scale(${1.4 - u * 0.6})`} stroke={INK} strokeWidth={5}>
          <ellipse rx={30} ry={20} fill="#ffd23f" />
          <rect x={-90} y={-6} width={70} height={12} fill="#ffd23f" />
          <line x1={-120 * Math.cos(t * 9)} y1={-120 * Math.sin(t * 9)} x2={120 * Math.cos(t * 9)} y2={120 * Math.sin(t * 9)} strokeWidth={10} />
        </g>
        <rect width={W} height={H} fill="#ffffff" opacity={clamp01((t - FL.touch + 0.12) / 0.12)} />
      </svg>
    );
  }
  // exterior: cruise → reveal → storm → strike → autorotation
  const reveal = ease("io", clamp01((t - FL.out) / 0.8));
  const sc = (within(t, 0, FL.cabin) ? 1.25 + t * 0.12 : 1.0 - 0.35 * reveal) * (storm ? 1.2 : 1);
  const wallX = 1500 - 900 * reveal;
  const fall = Math.max(0, t - FL.errEnd);
  const hx = 520 - (storm ? 40 : 0);
  const hy = 860 + (storm ? Math.sin(t * 13) * 18 : Math.sin(t * 2.6) * 10) + fall * fall * 140;
  const tilt = (storm ? Math.sin(t * 9) * 6 - 8 : -4) + (fall > 0 ? Math.sin(t * 6) * 18 : 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <Sky w={W} h={H} light={1} storm={storm} />
      <OpenSea w={W} y={1500} t={t} dark={storm} />
      {!storm
        ? [0, 1, 2, 3].map((k) => (
            <g key={k} fill="#ffffff" stroke={INK} strokeWidth={5}>
              <ellipse cx={((k * 420 - t * 520) % 1700) + 1200} cy={420 + k * 230} rx={170} ry={50} />
            </g>
          ))
        : null}
      {!storm ? <StormWall x={wallX} t={t} flash={0} /> : null}
      <g transform={`translate(${W / 2} ${H / 2}) rotate(${storm ? -10 : 0}) translate(${-W / 2} ${-H / 2})`}>
        <Heli x={hx} y={hy} rotor={rotorAng} blur={blur} tilt={tilt} s={sc} dead={dead} />
        {flash ? <Bolt x0={hx + 60} y0={-50} x1={hx - 8 * sc} y1={hy - 292 * sc} seed={7} /> : null}
      </g>
      {storm
        ? [...Array(70)].map((_, k) => {
            const x = (k * 157 + t * 900) % (W + 300) - 150;
            const y = (k * 311 + t * 2600) % (H + 200) - 100;
            return <line key={k} x1={x} y1={y} x2={x - 40} y2={y + 110} stroke="#b9c4d6" strokeWidth={4} opacity={0.7} />;
          })
        : null}
      <rect width={W} height={H} fill="#ffffff" opacity={flash * 0.85} />
      {within(t, FL.error, FL.errEnd) ? <ErrorScreen t={t} /> : null}
    </svg>
  );
};

const ScreenFace: React.FC<{ x: number; y: number; s: number; err: boolean; t: number }> = ({ x, y, s, err, t }) => {
  const glitch = err && Math.floor(t * 20) % 3 === 0 ? 14 : 0;
  return (
    <g transform={`translate(${x + glitch} ${y}) scale(${s})`} stroke={INK} strokeWidth={6}>
      <rect x={-200} y={-120} width={400} height={240} rx={24} fill={err ? "#3a0d14" : "#0f2b3c"} />
      <text x={0} y={-48} textAnchor="middle" fontFamily={FONT_STACK} fontSize={40} fill={err ? "#ff5a4a" : "#7ef0a0"} stroke="none">
        AUTOPILOT
      </text>
      <circle cx={0} cy={36} r={54} fill="none" stroke={err ? "#ff5a4a" : "#7ef0a0"} strokeWidth={8} />
      <circle cx={-18} cy={24} r={7} fill={err ? "#ff5a4a" : "#7ef0a0"} stroke="none" />
      <circle cx={18} cy={24} r={7} fill={err ? "#ff5a4a" : "#7ef0a0"} stroke="none" />
      <path d={err ? "M -24 66 Q 0 44 24 66" : "M -24 48 Q 0 70 24 48"} fill="none" stroke={err ? "#ff5a4a" : "#7ef0a0"} strokeWidth={7} />
      {err ? (
        <text x={0} y={150} textAnchor="middle" fontFamily={FONT_STACK} fontSize={48} fill="#ff5a4a" stroke={INK} strokeWidth={10} paintOrder="stroke">
          ERROR
        </text>
      ) : null}
    </g>
  );
};

const ErrorScreen: React.FC<{ t: number }> = ({ t }) => {
  const sc = Math.min(ease("back", (t - FL.error) / 0.18), (FL.errEnd - t) / 0.1);
  return (
    <g>
      <rect width={W} height={H} fill="#000" opacity={0.45 * clamp01(sc)} />
      <ScreenFace x={W / 2} y={720} s={2.1 * Math.max(0, sc)} err t={t} />
    </g>
  );
};

/** inside the tour helicopter: Dash's camera, Newt's brochure, the happy autopilot */
const Cabin: React.FC<{ t: number }> = ({ t }) => {
  const dash = cabinChar("dash", t);
  const newt = cabinChar("newt", t);
  const snap = t > FL.snap && t < FL.snap + 0.12;
  const dh = handOf(dash, "a");
  const nh = handOf(newt, "a");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <Sky w={W} h={H} light={1} />
      <OpenSea w={W} y={1250} t={t} dark={0} />
      {[0, 1].map((k) => (
        <g key={k} fill="#fff" stroke={INK} strokeWidth={5}>
          <ellipse cx={((k * 600 - t * 700) % 1500) + 1300} cy={500 + k * 300} rx={200} ry={60} />
        </g>
      ))}
      {/* the bubble canopy frame */}
      <path d={`M -40 1960 L -40 300 Q 540 40 1120 300 L 1120 1960 L 980 1960 L 980 380 Q 540 170 100 380 L 100 1960 Z`} fill="#ffd23f" stroke={INK} strokeWidth={10} />
      <g transform="translate(330 1650) scale(1.5)">
        <g transform={`translate(0 ${-GROUND})`}>
          <Toon who="dash" c={dash} />
        </g>
        <g transform={`translate(${dh.x - 10} ${dh.y - GROUND - 30})`} stroke={INK} strokeWidth={5}>
          <rect x={-10} y={-34} width={80} height={56} rx={8} fill="#333" />
          <circle cx={70} cy={-6} r={18} fill="#9ad3ff" />
        </g>
      </g>
      <g transform="translate(720 1640) scale(1.85)">
        <g transform={`translate(0 ${-GROUND})`}>
          <Toon who="newt" c={newt} />
        </g>
        <g transform={`translate(${nh.x} ${nh.y - GROUND - 20}) rotate(-12)`} stroke={INK} strokeWidth={4}>
          <rect x={-10} y={-90} width={120} height={150} rx={6} fill="#fffaf0" />
          <text x={50} y={-60} textAnchor="middle" fontFamily={FONT_STACK} fontSize={18} fill="#1d3557" stroke="none">
            MYSTERY
          </text>
          <text x={50} y={-38} textAnchor="middle" fontFamily={FONT_STACK} fontSize={18} fill="#1d3557" stroke="none">
            ISLAND TOUR
          </text>
          <text x={50} y={40} textAnchor="middle" fontFamily={FONT_STACK} fontSize={78} fill="#3f9a45" stroke={INK} strokeWidth={3}>
            ?
          </text>
        </g>
      </g>
      {/* dashboard with the autopilot screen */}
      <path d="M -40 1500 Q 540 1380 1120 1500 L 1120 1960 L -40 1960 Z" fill="#2b2d3a" stroke={INK} strokeWidth={10} />
      <ScreenFace x={540} y={1610} s={0.9} err={false} t={t} />
      <rect width={W} height={H} fill="#ffffff" opacity={snap ? 0.85 : 0} />
    </svg>
  );
};

// ─── Overhead inserts: the sign from above, the island and the plane ────────
const Overhead: React.FC<{ t: number }> = ({ t }) => {
  const n = within(t, OVER1.a, OVER1.b) ? 1 : within(t, OVER2.a, OVER2.b) ? 2 : 4;
  const a = within(t, OVER1.a, OVER1.b) ? OVER1.a : within(t, OVER2.a, OVER2.b) ? OVER2.a : OVER3.lp;
  const place = clamp01((t - a) / 0.7);
  const nx = within(t, OVER1.a, OVER1.b) ? 330 : within(t, OVER2.a, OVER2.b) ? 560 : 900;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <g transform={`translate(${W / 2} ${H / 2}) scale(${1.05 + 0.05 * clamp01((t - a) / 1.2)}) translate(${-W / 2} ${-H / 2})`}>
        <SignTop w={W} h={H} n={n} place={place} t={t} who={{ x: nx + (1 - place) * 120, y: H * 0.32 + 660 }} dash={{ x: 880, y: 1560 }} />
      </g>
      <text x={W / 2} y={H - 110} textAnchor="middle" fontFamily={FONT_STACK} fontSize={66} fill="#fff" stroke={INK} strokeWidth={14} paintOrder="stroke">
        letters 5 m tall
      </text>
    </svg>
  );
};

const AerialScene: React.FC<{ t: number }> = ({ t }) => {
  const u = ease("io", clamp01((t - AERIAL.a) / 1.4));
  const k = 3.6 - 2.7 * u; // zoom out from the sign to the whole "?"
  const cx = 470 + (520 - 470) * (1 - u);
  const cy = 640 + (940 - 640) * (1 - u);
  const pu = clamp01((t - AERIAL.shadow) / (AERIAL.b - AERIAL.shadow + 0.6));
  const plane = { x: -200 + pu * 1400, y: 1300 - pu * 900 };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <rect width={W} height={H} fill="#2f8fc9" />
      {[...Array(40)].map((_, i) => (
        <path key={i} d={`M ${(i * 233) % W} ${(i * 397) % H} q 20 -10 40 0`} stroke="#e8f6ff" strokeWidth={4} fill="none" opacity={0.5} />
      ))}
      <g transform={`translate(${W / 2} ${H / 2}) scale(${k}) translate(${-cx} ${-cy})`}>
        <IslandTop t={t} showSign={1} />
        <g transform="translate(475 925) scale(0.5)">
          <TopNewt x={0} y={0} t={t} s={0.4} />
          <TopDash x={40} y={10} t={t} s={0.4} />
        </g>
      </g>
      {/* the plane's shadow, then the plane (top view) */}
      {t > AERIAL.shadow ? (
        <g transform={`translate(${plane.x + 120} ${plane.y + 160}) rotate(-35)`} opacity={0.35}>
          <rect x={-160} y={-14} width={320} height={28} rx={12} fill="#000" />
          <rect x={-22} y={-90} width={44} height={200} rx={20} fill="#000" />
        </g>
      ) : null}
      {t > AERIAL.plane ? (
        <g transform={`translate(${plane.x} ${plane.y}) rotate(-35) scale(${1 + 0.1 * Math.sin(t * 8)} 1)`} stroke={INK} strokeWidth={5}>
          <rect x={-180} y={-16} width={360} height={32} rx={12} fill="#e63946" />
          <rect x={-24} y={-100} width={48} height={220} rx={22} fill="#f4f4f4" />
          <rect x={-70} y={90} width={140} height={20} rx={8} fill="#e63946" />
          <circle cx={0} cy={-60} r={14} fill="#9ad3ff" />
        </g>
      ) : null}
      {t > AERIAL.spot ? (
        <g opacity={clamp01((t - AERIAL.spot) / 0.2)}>
          <circle cx={W / 2 + 10} cy={H / 2 + (940 - 640) * 0.9 * k * 0 + 270} r={150} fill="none" stroke="#ffd23f" strokeWidth={12} />
        </g>
      ) : null}
    </svg>
  );
};

// ─── The horizon: the mast first, then the hull (the Earth's curve) ─────────
const HorizonScene: React.FC<{ t: number }> = ({ t }) => {
  const d = Math.max(3000, shipFar(t));
  const hid = hiddenM(d, 1.6);
  const ppm = 9 * (6000 / d) * 5;
  const hy = 1040;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <clipPath id="hz10">
          <rect x={0} y={0} width={W} height={hy} />
        </clipPath>
        <mask id="tele10">
          <rect width={W} height={H} fill="#fff" />
          <circle cx={W / 2} cy={hy - 60} r={500} fill="#000" />
        </mask>
      </defs>
      <rect width={W} height={hy} fill="#bfe9ff" />
      <rect y={hy} width={W} height={H - hy} fill="#1f78b8" />
      <g clipPath="url(#hz10)">
        <Ship x={W / 2} y={hy + hid * ppm} ppm={ppm} st={{ t, crew: "deck", boat: 0, row: 0, fire: 0, burst: -1, sink: 0, flareOn: false }} light={1} />
      </g>
      {[...Array(18)].map((_, k) => (
        <path key={k} d={`M ${(k * 131 + t * 30) % W} ${hy + 30 + (k % 6) * 90} q 30 -12 60 0`} stroke="#e8f6ff" strokeWidth={5} fill="none" opacity={0.6} />
      ))}
      <line x1={0} y1={hy} x2={W} y2={hy} stroke="#e8f6ff" strokeWidth={4} />
      <rect width={W} height={H} fill="#0d1018" mask="url(#tele10)" />
      <circle cx={W / 2} cy={hy - 60} r={500} fill="none" stroke={INK} strokeWidth={16} />
      <text x={W / 2} y={H - 250} textAnchor="middle" fontFamily={FONT_STACK} fontSize={56} fill="#fff" stroke={INK} strokeWidth={12} paintOrder="stroke">
        {hid > 2 ? `the mast first… (hull hidden: ${Math.round(hid)} m)` : "…then the hull"}
      </text>
      <text x={W / 2} y={H - 170} textAnchor="middle" fontFamily={FONT_STACK} fontSize={44} fill="#ffd23f" stroke={INK} strokeWidth={10} paintOrder="stroke">
        {`${(d / 1000).toFixed(0)} km away`}
      </text>
    </svg>
  );
};

/** close-up: the open kit, a flare gun and exactly ONE parachute flare */
const KitInsert: React.FC<{ t: number }> = ({ t }) => {
  if (t < KIT.insA || t > KIT.insB) return null;
  const sc = Math.max(0, Math.min(ease("back", (t - KIT.insA) / 0.22), (KIT.insB - t) / 0.12));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <g transform={`translate(${W / 2} 640) scale(${sc})`} stroke={INK} strokeWidth={8} strokeLinejoin="round">
        <circle r={330} fill="#ff9a3c" />
        <rect x={-260} y={-120} width={520} height={290} rx={20} fill="#ffe1bf" />
        <g transform="translate(-200 40) scale(3.2)">
          <FlareGun x={0} y={0} rot={0} s={1} />
        </g>
        <g transform="translate(150 20)">
          <rect x={-36} y={-90} width={72} height={160} rx={14} fill="#e63946" />
          <rect x={-36} y={40} width={72} height={30} fill="#c9a227" />
          <path d="M -24 -40 Q 0 -78 24 -40 M -24 -40 L 0 -6 L 24 -40" fill="#fff" strokeWidth={4} />
        </g>
      </g>
      <text x={W / 2} y={300 + (1 - sc) * 40} textAnchor="middle" fontFamily={FONT_STACK} fontSize={80} fill="#fff" stroke={INK} strokeWidth={16} paintOrder="stroke" opacity={sc}>
        1 PARACHUTE FLARE
      </text>
    </svg>
  );
};

const Caption: React.FC<{ t: number; from: number; to: number; text: string; top?: number; color?: string; size?: number }> = ({ t, from, to, text, top = 1560, color = "#fff", size = 66 }) => {
  if (t < from || t > to) return null;
  const a = Math.min(1, (t - from) / 0.15, (to - t) / 0.15);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: top }}>
      <div style={{ fontFamily: FONT_STACK, fontSize: size, color, WebkitTextStroke: `14px ${INK}`, paintOrder: "stroke fill", textAlign: "center", padding: "0 60px", opacity: a, lineHeight: 1.1 }}>{text}</div>
    </AbsoluteFill>
  );
};

const LooksText: React.FC<{ t: number }> = ({ t }) => (
  <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
    {within(t, LOOK1.tint, LOOK1.end) ? (
      <ChalkText t={t} at={LOOK1.w} x={W / 2} y={1640} size={74} rot={-2} color="#ffd23f" outline write={WRITE}>
        {LOOK1_LINE}
      </ChalkText>
    ) : null}
    {within(t, LOOK2.tint, LOOK2.end) ? (
      <g>
        <ChalkTint t={t} from={LOOK2.tint} to={LOOK2.end} w={W} h={H} opacity={0.35} />
        <ChalkText t={t} at={LOOK2.l1} x={W / 2} y={1540} size={80} rot={-2} outline write={WRITE}>
          {LOOK2_LINES[0]}
        </ChalkText>
        <ChalkText t={t} at={LOOK2.l2} x={W / 2} y={1670} size={72} rot={-1} color="#ffd23f" outline write={WRITE}>
          {LOOK2_LINES[1]}
        </ChalkText>
      </g>
    ) : null}
    {within(t, OVER3.w - 0.1, OVER3.b) ? (
      <ChalkText t={t} at={OVER3.w} x={W / 2} y={260} size={70} rot={-2} color="#ffd23f" outline write={WRITE}>
        {LOOK2_LINES[2]}
      </ChalkText>
    ) : null}
    {within(t, LOOK3.tint, LOOK3.end) ? (
      <g>
        <ChalkTint t={t} from={LOOK3.tint} to={LOOK3.end} w={W} h={H} opacity={0.3} />
        <ChalkText t={t} at={LOOK3.w1} x={W / 2} y={1600} size={74} rot={-2} outline write={WRITE}>
          {LOOK3_LINES[0]}
        </ChalkText>
        <ChalkText t={t} at={LOOK3.oh} x={W / 2 + 160} y={1740} size={104} rot={-6} color="#ffd23f" outline write={0.09}>
          {LOOK3_LINES[1]}
        </ChalkText>
      </g>
    ) : null}
  </svg>
);

/** a small inset of Newt's face while the chalk works out the drop (so the worry reads) */
const NewtInset: React.FC<{ t: number }> = ({ t }) => {
  if (t < LOOK3.tint + 1.1 || t > LOOK3.end) return null;
  const k = kidAt(t).c;
  const sc = Math.min(ease("back", (t - LOOK3.tint - 1.1) / 0.2), (LOOK3.end - t) / 0.12);
  const head = headOf(k);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <clipPath id="ni10">
          <circle cx={820} cy={560} r={210} />
        </clipPath>
      </defs>
      <g opacity={Math.max(0, sc)}>
        <circle cx={820} cy={560} r={218} fill="#bfe9ff" stroke={INK} strokeWidth={10} />
        <g clipPath="url(#ni10)">
          <g transform={`translate(820 600) scale(2.6) translate(${-head.x} ${-head.y})`}>
            <Toon who="newt" c={k} />
          </g>
        </g>
      </g>
    </svg>
  );
};

const EndCard: React.FC<{ t: number }> = ({ t }) => {
  if (t < END) return null;
  const dark = Math.min(1, (t - END) / 0.3);
  const l1 = ease("back", (t - (END + 0.4)) / 0.25);
  const l2 = ease("back", (t - (END + 1.2)) / 0.25);
  const line: React.CSSProperties = { fontFamily: FONT_STACK, fontSize: 92, color: "#fff", textAlign: "center", lineHeight: 1.15, padding: "0 60px" };
  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(17,17,17,${dark})`, justifyContent: "center", alignItems: "center", gap: 40 }}>
      <div style={{ ...line, scale: String(Math.max(0, l1)), opacity: t > END + 0.4 ? 1 : 0 }}>Shouts fade. Signs carry.</div>
      <div style={{ ...line, color: "#ffd23f", scale: String(Math.max(0, l2)), opacity: t > END + 1.2 ? 1 : 0 }}>What goes UP comes DOWN — check the wind.</div>
    </AbsoluteFill>
  );
};

const BeachScene: React.FC<{ t: number }> = ({ t }) => {
  const c = cam(t);
  const sh = shake(t, [
    [STOP - SKID_T + 0.02, 30],
    [FIN.land, 8],
    [BANG, 14],
    [BURST, 36],
    [SINK.b - 0.6, 10],
  ]);
  const light = lightAt(t);
  const dusk = duskAt(t);
  const nightMoon = isNight(t);
  const slow = within(t, SLOW.a, SLOW.b) ? Math.min(1, (t - SLOW.a) / 0.15, (SLOW.b - t) / 0.15) : 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="vig10" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="#0b1830" stopOpacity={0} />
          <stop offset="1" stopColor="#0b1830" stopOpacity={0.55} />
        </radialGradient>
      </defs>
      <Sky w={W} h={H} light={light} dusk={dusk} sunX={nightMoon ? 0.25 : 0.78} sunY={dusk ? 0.1 + 0.25 * dusk : 0.12} />
      <g transform={`translate(${W / 2 + sh.x} ${H / 2 + sh.y}) rotate(${c.roll}) scale(${c.z * (1 + Math.abs(c.roll) * 0.006)}) translate(${-c.x} ${-c.y})`}>
        <BeachWorld t={t} camX={c.x} z={c.z} />
      </g>
      {slow > 0 ? <rect width={W} height={H} fill="url(#vig10)" opacity={slow} /> : null}
      {/* the burst lights everything up for a moment */}
      <rect width={W} height={H} fill="#ffcf6b" opacity={t > BURST && t < BURST + 0.5 ? 0.5 * (1 - (t - BURST) / 0.5) : 0} />
      <rect width={W} height={H} fill="#111111" opacity={t > HEART.fade ? clamp01((t - HEART.fade) / (END - HEART.fade)) : 0} />
    </svg>
  );
};

const Scene: React.FC = () => {
  const t = useT();
  let body: React.ReactNode;
  if (t < FL.touch) body = <FlightScene t={t} />;
  else if (within(t, OVER1.a, OVER1.b) || within(t, OVER2.a, OVER2.b) || within(t, OVER3.a, OVER3.b)) body = <Overhead t={t} />;
  else if (within(t, AERIAL.a, AERIAL.b)) body = <AerialScene t={t} />;
  else if (within(t, HORIZON.a, HORIZON.b)) body = <HorizonScene t={t} />;
  else body = <BeachScene t={t} />;
  const dayStamp = (from: number, text: string) => <Stamp t={t} from={from} to={from + 0.9} text={text} color="#2b2d3a" top={180} />;
  return (
    <>
      {body}
      <KitInsert t={t} />
      <LooksText t={t} />
      <NewtInset t={t} />
      <Stamp t={t} from={STRANDED.a} to={STRANDED.b} text="STRANDED" />
      {dayStamp(TALLY1.a + 0.5, "DAY 1")}
      {dayStamp(NIGHT1.a + 0.3, "DAY 2")}
      {dayStamp(NIGHT2.a + 0.3, "DAY 3")}
      {dayStamp(OVER3.day, "DAY 5")}
      <Stamp t={t} from={SHOUT3.a + 0.1} to={SHOUT3.a + 1.1} text="MAXIMUM VOLUME" />
      <Caption t={t} from={ROCKW.rock + 0.1} to={ROCKW.b} text="wing rock = message received ✓" color="#ffd23f" top={1580} />
      <Caption t={t} from={REEF.a} to={REEF.a + 1.0} text="20 minutes later…" top={200} />
      <Stamp t={t} from={REEF.a + 1.0} to={REEF.b} text="RESCUE INBOUND ✓" color="#2a9d8f" top={200} />
      <Stamp t={t} from={GRAB.tilt} to={BANG + 0.2} text="SIGNAL: MAXIMUM" top={200} />
      <Caption t={t} from={SINK.a} to={SINK.a + 1.1} text="4 minutes later…" top={200} />
      <EndCard t={t} />
    </>
  );
};

const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

// Sound: original generated beds, foley and score (tools/sfx/ep10_flare.py); one named node per cue.
export const OneFlare: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const f = (x: number) => Math.round(x * fps);
  return (
    <AbsoluteFill style={{ backgroundColor: "#bfe9ff" }}>
      <Scene />
      <HookTitle text="They had ONE flare." from={HOOK.from} to={HOOK.to} top={230} />

      <Audio name="Score" src={sfx("score-flare")} durationInFrames={durationInFrames} volume={1.0} />
      <Audio name="Flight + storm bed" src={sfx("flight-bed")} durationInFrames={f(CUE.touch + 0.4)} volume={0.9} />
      <Audio name="Island ambience" src={sfx("island-amb")} from={f(CUE.touch)} durationInFrames={durationInFrames - f(CUE.touch)} volume={0.85} />

      <Audio name="Camera shutter" src={sfx("shutter")} from={f(CUE.snap)} volume={0.6} />
      <Audio name="Lightning strike" src={sfx("thunder-crack")} from={f(CUE.strike)} volume={1.0} />
      <Audio name="Autopilot glitch" src={sfx("glitch")} from={f(CUE.error)} volume={0.5} />
      <Audio name="Hero: scream (falling)" src={sfx("hero-scream")} from={f(CUE.error + 0.9)} volume={0.35} />
      <Audio name="Skid on sand" src={sfx("skid-sand")} from={f(CUE.touch)} volume={0.9} />
      <Audio name="Hull thump" src={sfx("hull-thump")} from={f(CUE.touch)} volume={0.9} />
      <Audio name="Tail fin clonk" src={sfx("clonk")} from={f(CUE.fin)} volume={0.7} />
      <Audio name="Door falls" src={sfx("door-fall")} from={f(CUE.door)} volume={0.7} />
      <Audio name="Dash hops out" src={sfx("sand-step")} from={f(OUT_D.b)} volume={0.6} />
      <Audio name="Newt hops out" src={sfx("sand-step")} from={f(OUT_N.b)} volume={0.5} playbackRate={1.2} />
      <Audio name="Stamp: stranded" src={sfx("womp")} from={f(CUE.stranded)} volume={0.3} />

      <Audio name="Kit latch" src={sfx("latch")} from={f(CUE.kit)} volume={0.7} />
      <Audio name="Kid: chalk (up)" src={sfx("chalk")} from={f(CUE.look1)} volume={0.25} />
      <Audio name="Kid: chime (up)" src={sfx("chime")} from={f(LOOK1.w)} volume={0.18} />
      <Audio name="Gun on the rock" src={sfx("gun-down")} from={f(CUE.gun)} volume={0.6} />
      <Audio name="Hero: hmm (the gun)" src={sfx("hero-blip")} from={f(GUN_ROCK.b + 0.15)} volume={0.2} playbackRate={0.85} />
      <Audio name="Carving DAY 1" src={sfx("carve")} from={f(CUE.tally1)} volume={0.7} />

      <Audio name="Hero: shout 1" src={sfx("hero-scream")} from={f(CUE.shout1)} volume={0.32} playbackRate={1.05} />
      <Audio name="Log drag 1" src={sfx("log-drag")} from={f(SHOUT1.a)} volume={0.35} />
      <Audio name="Log down: H" src={sfx("log-down")} from={f(CUE.over1 + 0.5)} volume={0.7} />
      <Audio name="Night 1" src={sfx("isle-crickets")} from={f(CUE.night1)} volume={0.6} />
      <Audio name="Hero: shout 2" src={sfx("hero-scream")} from={f(CUE.shout2)} volume={0.3} playbackRate={1.1} />
      <Audio name="Gull snaps it" src={sfx("gull")} from={f(CUE.gull - 0.25)} volume={0.7} />
      <Audio name="Log down: E" src={sfx("log-down")} from={f(CUE.over2 + 0.5)} volume={0.7} playbackRate={0.9} />
      <Audio name="Night 2" src={sfx("isle-crickets")} from={f(CUE.night2)} volume={0.6} />
      <Audio name="Leaf megaphone" src={sfx("leaf-rustle")} from={f(CUE.mega)} volume={0.6} />
      <Audio name="Hero: shout 3 (max)" src={sfx("hero-scream")} from={f(CUE.shout3)} volume={0.42} playbackRate={0.95} />
      <Audio name="Hero: hoarse" src={sfx("hero-blip")} from={f(CUE.hoarse + 0.2)} volume={0.18} playbackRate={0.7} />
      <Audio name="Kid: chalk (sound)" src={sfx("chalk")} from={f(CUE.look2)} volume={0.25} />
      <Audio name="Kid: chime (40 dB)" src={sfx("chime")} from={f(LOOK2.l2)} volume={0.18} />
      <Audio name="Logs down: L P" src={sfx("log-down")} from={f(OVER3.lp + 0.5)} volume={0.7} playbackRate={1.1} />
      <Audio name="Kid: chime (sign)" src={sfx("chime")} from={f(OVER3.w)} volume={0.2} playbackRate={1.2} />

      <Audio name="Seaplane fly-by" src={sfx("plane-by")} from={f(CUE.aerial + 0.6)} volume={0.9} />
      <Audio name="Kid: win (wing rock)" src={sfx("kid-win")} from={f(CUE.rock + 0.4)} volume={0.3} />
      <Audio name="Hero: yes!" src={sfx("hero-blip")} from={f(CUE.cheer)} volume={0.24} playbackRate={1.2} />
      <Audio name="Radio crackle" src={sfx("radio")} from={f(CUE.radio)} volume={0.45} />
      <Audio name="Ship horn" src={sfx("ship-horn")} from={f(CUE.horizon + 0.5)} volume={0.6} />
      <Audio name="Davits creak" src={sfx("davit")} from={f(CUE.lower)} volume={0.4} />
      <Audio name="Grabs the gun" src={sfx("gun-down")} from={f(CUE.grab)} volume={0.5} playbackRate={1.2} />
      <Audio name="Kid: up! (concern)" src={sfx("kid-blip")} from={f(GRAB.up)} volume={0.2} playbackRate={1.15} />

      <Audio name="Flare gun BANG" src={sfx("flare-shot")} from={f(CUE.bang)} volume={1.0} />
      <Audio name="Slow motion (launch)" src={sfx("slowmo-flare")} from={f(CUE.slowA)} durationInFrames={f(CUE.slowB - CUE.slowA + 0.3)} volume={0.7} />
      <Audio name="Flare climbs" src={sfx("flare-whoosh")} from={f(CUE.slowB)} volume={0.6} />
      <Audio name="Parachute pops" src={sfx("chute-pop")} from={f(CUE.pop)} volume={0.7} />
      <Audio name="Flare hiss (float)" src={sfx("flare-hiss")} from={f(CUE.pop + 0.2)} durationInFrames={f(CUE.tink - CUE.pop)} volume={0.5} />
      <Audio name="Kid: chalk (wind)" src={sfx("chalk")} from={f(CUE.look3)} volume={0.25} />
      <Audio name="Kid: oh" src={sfx("kid-blip")} from={f(CUE.oh)} volume={0.2} playbackRate={0.8} />
      <Audio name="Hero: heh (proud)" src={sfx("hero-blip")} from={f(CUE.driftB + 0.2)} volume={0.2} playbackRate={1.1} />
      <Audio name="Tink on the drums" src={sfx("tink")} from={f(CUE.tink)} volume={0.6} />

      <Audio name="Fire catches" src={sfx("fire-roar")} from={f(CUE.fire)} durationInFrames={f(CUE.sinkB - CUE.fire + 0.5)} volume={0.8} />
      <Audio name="Crew to the lifeboat" src={sfx("splash-small")} from={f(CUE.boat - 0.2)} volume={0.5} />
      <Audio name="Drum bursts" src={sfx("burst-boom")} from={f(CUE.burst)} volume={1.0} />
      <Audio name="Hull groans, floods" src={sfx("sink")} from={f(CUE.sinkA)} volume={0.9} />
      <Audio name="Oars" src={sfx("oars")} from={f(CUE.boat)} volume={0.35} />
      <Audio name="Life ring bump" src={sfx("ring-bump")} from={f(CUE.ring)} volume={0.6} />
      <Audio name="Hero: uh-oh" src={sfx("hero-blip")} from={f(REALIZE.confused)} volume={0.22} playbackRate={0.9} />
      <Audio name="Hero: womp" src={sfx("womp")} from={f(CUE.horror)} volume={0.32} />
      <Audio name="Scratching out the tally" src={sfx("carve")} from={f(CUE.scratch)} volume={0.6} playbackRate={0.9} />
      <Audio name="Carving DAY 1 again" src={sfx("carve")} from={f(CUE.carve)} volume={0.6} />
      <Audio name="Kid: share (coconut)" src={sfx("kid-blip")} from={f(CUE.give)} volume={0.18} playbackRate={1.1} />

      <Audio name="Moral 1" src={sfx("chime")} from={f(CUE.end + 0.4)} volume={0.25} />
      <Audio name="Moral 2" src={sfx("chime")} from={f(CUE.end + 1.2)} volume={0.25} playbackRate={1.25} />
    </AbsoluteFill>
  );
};

export { DURATION, DOOR_X, FLOOR, GUN_ON_ROCK, NEWT_X, HZ };
