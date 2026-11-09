import { POSES } from "../../rig/library";
import { build, type Script } from "../../rig/script";
import { GROUND, solve, toWorld } from "../../rig/Stickman";
import type { CharState } from "../../rig/types";
import { WINDOW } from "./props";
import {
  ALONE,
  ALONE_END,
  CATCH_T,
  CRUISE,
  DASH_S3,
  driftAt,
  FINAL,
  FLARE_ACCEL,
  FLARE_POS,
  FLIGHT,
  FLIGHT_DIR,
  GREEN,
  GREEN_BEATS,
  greenDescent,
  LAUNCH,
  M,
  METEOR_DIR,
  METEOR_V,
  NEWT_S3,
  ROCKET_ACCEL,
  STRAND,
  STRAND_END,
  TOUCH_T,
  V_AFTER,
  V_DASH0,
  V_DASH1,
  V_NEWT0,
  V_NEWT1,
  V_SANDWICH,
  V_WRENCH,
} from "./timeline";

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
type P = { x: number; y: number };

// ═══════════════════════ Rocket (S1–S2) ═══════════════════════
export const ROCKET_X = 540;
export const S2_BASE = 1700; // rocket base y in the space shot
/** Base (bottom) of the rocket in world y: on the pad, then accelerating upward. */
export const rocketBase = (t: number) => {
  if (t >= CRUISE.start) return S2_BASE;
  const tau = Math.max(0, t - LAUNCH.lift);
  return GROUND - 0.5 * ROCKET_ACCEL * tau * tau;
};
// where each of them stands inside the window (feet), relative to the rocket base
const SEAT = { dash: { dx: 70, dy: WINDOW.dy + 330 }, newt: { dx: -120, dy: WINDOW.dy + 250 } };

// ═══════════════════════ Space positions (S3, S5) ═══════════════════════
/** Newt in the stranded shot: drift → wrench recoil → (holding the flare) → flare thrust */
export const newtSpace = (t: number): P & { s: number } => {
  if (t < STRAND.throw) return { ...driftAt(NEWT_S3, V_NEWT0, STRAND.start, t), s: 1 };
  const atThrow = driftAt(NEWT_S3, V_NEWT0, STRAND.start, STRAND.throw);
  if (t < CATCH_T) return { ...driftAt(atThrow, V_NEWT1, STRAND.throw, t), s: 1 };
  // catching the (resting) flare: momentum shared, he slows a hair
  const atCatch = driftAt(atThrow, V_NEWT1, STRAND.throw, CATCH_T);
  const k = M.newt / (M.newt + M.flare);
  const v2 = { x: V_NEWT1.x * k, y: V_NEWT1.y * k };
  if (t < FLIGHT.burn) return { ...driftAt(atCatch, v2, CATCH_T, t), s: 1 };
  const atBurn = driftAt(atCatch, v2, CATCH_T, FLIGHT.burn);
  const tau = t - FLIGHT.burn;
  const d = 0.5 * FLARE_ACCEL * tau * tau;
  // he heads off toward the planet in the distance: smaller as he goes
  return { x: atBurn.x + v2.x * tau + FLIGHT_DIR.x * d, y: atBurn.y + v2.y * tau + FLIGHT_DIR.y * d, s: 1 / (1 + 0.5 * tau * tau) };
};

export const dashSpace = (t: number): P => {
  if (t < STRAND.dashThrow) return driftAt(DASH_S3, V_DASH0, STRAND.start, t);
  return driftAt(driftAt(DASH_S3, V_DASH0, STRAND.start, STRAND.dashThrow), V_DASH1, STRAND.dashThrow, t);
};

// S5: Dash floats at the origin; the rock drifts in at constant velocity, hits, and the pair
// carries on together (slower — momentum shared) toward the grey planet in the distance.
const METEOR_R = 160; // its radius at scale 1 (props: Meteor × 1.1)
export const meteorS5 = (t: number) => {
  const tau = ALONE.hit - t;
  const spin = 20; // deg/s, unchanged in vacuum
  if (tau > 0) {
    const d = METEOR_V * tau + METEOR_R;
    return { x: -METEOR_DIR.x * d, y: -METEOR_DIR.y * d, s: 1, rot: -t * spin };
  }
  const after = -tau;
  const s = 1 / (1 + 0.3 * after * after); // shrinking: heading off into the distance
  const d = V_AFTER * after;
  return { x: METEOR_DIR.x * d - METEOR_DIR.x * METEOR_R * s, y: METEOR_DIR.y * d - METEOR_DIR.y * METEOR_R * s, s, rot: -t * spin };
};

// ═══════════════════════ Scripts ═══════════════════════
const S3 = STRAND;
const heroScript: Script = {
  scale: 1,
  seed: 0,
  x: [[0, 0]],
  lift: [[0, 0]],
  sy: [
    [0, 1],
    [LAUNCH.lift, 1],
    [LAUNCH.lift + 0.3, 0.86, "out"], // g-force squash on liftoff
    [CRUISE.start - 0.6, 0.86],
    [CRUISE.start, 1, "back"],
  ],
  facing: [
    [0, 1],
    [STRAND.start, -1],
    [STRAND.swim, 1],
    [STRAND.run, -1],
    [STRAND.spot, -1],
    [ALONE.start, 1],
    [ALONE.seen, -1],
  ],
  gait: [[0, "none"]],
  pose: [
    [0, "stand"],
    [LAUNCH.ignite, "fists", 0.15],
    [LAUNCH.lift, "cheer", 0.2, "back"],
    [CRUISE.start, "stand", 0.2],
    [CRUISE.cocky, "smugPoint", 0.2, "back"],
    [CRUISE.shove - 0.15, "windUp", 0.12],
    [CRUISE.shove, "pushHard", 0.08, "snap"],
    [CRUISE.maxed, "proud", 0.2],
    [9.6, "alarmed", 0.15, "back"],
    [CRUISE.burst, "flail", 0.08, "snap"],
    [CRUISE.burst + 1.6, "floatIdle", 0.5],
    [S3.swim, "swim", 0.2],
    [S3.swimEnd, "floatIdle", 0.25],
    [S3.run, "floatIdle", 0.1],
    [S3.runEnd, "floatIdle", 0.25],
    [S3.copy - 0.2, "bendHand", 0.15],
    [S3.copy + 0.3, "holdOut", 0.2],
    [S3.dashThrow - 0.2, "windUp", 0.15],
    [S3.dashThrow, "throwFwd", 0.08, "snap"],
    [S3.dashThrow + 0.6, "floatIdle", 0.3],
    [ALONE.start, "floatIdle", 0.1],
    [ALONE.seen, "alarmed", 0.15],
    [ALONE.swim, "swim", 0.15],
    [ALONE.cover, "coverEyes", 0.15],
    [ALONE.hit, "splat", 0.05, "snap"],
  ],
  faceX: [
    [0, 0.6],
    [CRUISE.cocky, 0.6],
    [CRUISE.cocky + 0.1, 0, "out"],
    [CRUISE.shove - 0.2, 0.8, "out"],
    [S3.swimEnd, 0.8],
    [S3.swimEnd + 0.1, 0, "out"],
    [S3.run - 0.05, 0.8, "out"],
    [S3.runEnd, 0.8],
    [S3.runEnd + 0.1, 0, "out"],
    [S3.spot, 0.8, "out"],
    [S3.dashThrow + 0.7, 0.8],
    [S3.dashThrow + 0.8, 0, "out"],
    [S3.dashThrow + 1.8, 0.8, "out"],
    [ALONE.start, 0],
    [ALONE.seen, 0.8, "out"],
  ],
  lookY: [
    [0, 0],
    [LAUNCH.lift, -0.5],
    [CRUISE.start, 0],
    [CRUISE.eye, 0.8],
    [CRUISE.cocky, 0],
    [FLIGHT.burn, 0.5],
    [STRAND_END, 0],
  ],
  face: [
    [0, "confident"],
    [LAUNCH.ignite, "determined"],
    [LAUNCH.lift, "squashed"],
    [CRUISE.start, "happy"],
    [CRUISE.eye, "mischief"],
    [CRUISE.cocky, "cocky"],
    [CRUISE.shove, "determined"],
    [CRUISE.maxed, "proud"],
    [9.6, "uhoh"],
    [10.2, "alarmed"],
    [CRUISE.burst, "scream"],
    [CRUISE.burst + 1.6, "shocked"],
    [STRAND.start, "uhoh"],
    [S3.swim, "strain"],
    [S3.swimEnd, "deadpan"],
    [S3.run, "determined"],
    [S3.runEnd, "resigned"],
    [S3.spot, "curious"],
    [S3.copy, "idea"],
    [S3.copy + 0.5, "cocky"],
    [S3.dashThrow + 0.5, "confused"],
    [S3.dashThrow + 1.4, "sad"],
    [FLIGHT.burn, "jealous"],
    [ALONE.start, "resigned"],
    [ALONE.seen, "surprised"],
    [ALONE.swim, "horror"],
    [ALONE.cover, "scream"],
    [ALONE.hit, "squashed"],
  ],
  aHand: [
    [0, "none"],
    [LAUNCH.ignite, "fist"],
    [LAUNCH.lift, "open"],
    [CRUISE.start, "none"],
    [CRUISE.cocky, "point"],
    [CRUISE.shove, "fist"],
    [CRUISE.maxed, "thumb"],
    [9.6, "none"],
    [CRUISE.burst, "open"],
    [CRUISE.burst + 1.6, "none"],
    [S3.swim, "open"],
    [S3.swimEnd, "none"],
    [S3.copy, "fist"],
    [S3.dashThrow + 0.05, "open"],
    [S3.dashThrow + 0.6, "none"],
    [ALONE.swim, "open"],
    [ALONE.cover, "open"],
  ],
  bHand: [
    [0, "none"],
    [LAUNCH.lift, "open"],
    [CRUISE.start, "none"],
    [S3.swim, "open"],
    [S3.swimEnd, "none"],
    [ALONE.swim, "open"],
  ],
  extras: (t) => ({ scarf: true, spaceHelmet: true, backpack: t >= CRUISE.burst, sandwich: t >= S3.copy && t < S3.dashThrow }),
  tweak: (t, c) => {
    if (t < CRUISE.burst) {
      // inside the window, riding the rocket (shaking with it once it overheats)
      const base = rocketBase(t);
      const shake = t > CRUISE.maxed ? Math.sin(t * 61) * 6 * clamp01((t - CRUISE.maxed) / 2) : 0;
      c.x = ROCKET_X + SEAT.dash.dx + shake;
      c.lift = GROUND - (base + SEAT.dash.dy);
      return;
    }
    if (t < STRAND.start) {
      // tumbling out of the burst cabin, drifting at constant velocity (nothing to slow him)
      const tau = t - CRUISE.burst;
      c.x = ROCKET_X + SEAT.dash.dx + V_DASH0.x * tau;
      c.lift = GROUND - (S2_BASE + SEAT.dash.dy + V_DASH0.y * tau);
      c.rot = 25 * tau;
      return;
    }
    if (t < STRAND_END) {
      const p = dashSpace(t);
      c.x = p.x;
      c.lift = GROUND - p.y;
      c.rot = 8 * Math.sin(t * 0.7);
      // swimming in space: arms windmill… and he goes exactly nowhere
      if (t > S3.swim && t < S3.swimEnd) {
        const s = Math.sin(t * 13);
        c.pose.aS = 90 + 90 * s;
        c.pose.bS = -90 + 90 * s;
        c.pose.aH = 20 + 30 * Math.sin(t * 13 + 1.5);
        c.pose.bH = -10 - 30 * Math.sin(t * 13 + 1.5);
      }
      // running in space: legs blur… still nowhere
      if (t > S3.run && t < S3.runEnd) {
        const s = Math.sin(t * 20);
        c.pose = { ...POSES.floatIdle, lean: 20, aH: 50 * s, bH: -50 * s, aK: 40 + 30 * Math.max(0, -s), bK: 40 + 30 * Math.max(0, s), aS: -50 * s, bS: 50 * s, aE: 80, bE: 80 };
      }
      return;
    }
    if (t < ALONE_END) {
      if (t < ALONE.hit) {
        c.x = 0;
        c.lift = GROUND - 0;
        c.rot = 6 * Math.sin(t * 0.8);
        if (t > ALONE.bored && t < ALONE.seen) c.pose.aE += Math.sin(t * 6) * 20; // twiddling
        if (t > ALONE.swim && t < ALONE.cover) {
          const s = Math.sin(t * 15);
          c.pose.aS = 90 + 90 * s;
          c.pose.bS = -90 + 90 * s;
        }
      } else {
        // splatted onto the rock's face, carried along with it
        const m = meteorS5(t);
        c.x = m.x + METEOR_DIR.x * METEOR_R * m.s;
        c.lift = GROUND - (m.y + METEOR_DIR.y * METEOR_R * m.s + 160 * m.s);
        c.scale = m.s;
        c.rot = -30;
      }
    }
  },
};

const kidScript: Script = {
  scale: 0.72,
  seed: 1.7,
  x: [[0, 0]],
  lift: [[0, 0]],
  sy: [
    [0, 1],
    [LAUNCH.lift, 1],
    [LAUNCH.lift + 0.3, 0.86, "out"],
    [CRUISE.start - 0.6, 0.86],
    [CRUISE.start, 1, "back"],
  ],
  facing: [
    [0, 1],
    [STRAND.start, 1],
    [S3.spot, -1],
    [S3.throw - 0.3, 1],
    [S3.throw + 0.4, -1],
    [FLIGHT.burn, -1],
    [GREEN.start, 1],
    [FINAL.start, 1],
  ],
  gait: [[0, "none"]],
  pose: [
    [0, "stand"],
    [LAUNCH.lift, "cheer", 0.2, "back"],
    [CRUISE.start, "stand", 0.2],
    [CRUISE.no, "crossArms", 0.2],
    [CRUISE.maxed + 0.2, "facepalm", 0.2],
    [9.8, "alarmed", 0.15, "back"],
    [CRUISE.burst, "flail", 0.08, "snap"],
    [CRUISE.burst + 1.6, "floatIdle", 0.5],
    [S3.spot, "floatIdle", 0.2],
    [S3.grab - 0.1, "holdOut", 0.15],
    [S3.throw - 0.25, "windUp", 0.15],
    [S3.throw, "throwFwd", 0.08, "snap"],
    [S3.throw + 0.5, "floatIdle", 0.3],
    [CATCH_T - 0.2, "holdOut", 0.15],
    [FLIGHT.burn, "holdOut", 0.1],
    [GREEN.start, "stand", 0.1], // flare held straight under him: thrust through his middle, no spin
    [GREEN_BEATS.flameOut, "stand", 0.25],
    [GREEN_BEATS.cheer, "cheer", 0.2, "back"],
    [GREEN_BEATS.sprout, "waveBye", 0.2],
    [GREEN_BEATS.end - 0.3, "stand", 0.2],
    [FINAL.start, "stand", 0.1],
    [FINAL.look, "lookUp", 0.2],
    [FINAL.facepalm, "facepalm", 0.2],
  ],
  faceX: [
    [0, -0.6],
    [CRUISE.no, -0.6],
    [CRUISE.no + 0.1, 0, "out"],
    [CRUISE.cocky, -0.6, "out"],
    [S3.swimEnd, 0.6],
    [S3.look, 0.6],
    [S3.look + 0.1, 0, "out"],
    [S3.lookEnd, 0.8, "out"],
    [FLIGHT.look, 0.8],
    [FLIGHT.look + 0.1, 0, "out"],
    [FLIGHT.burn, 0.8, "out"],
    [GREEN_BEATS.cheer, 0, "out"],
    [FINAL.facepalm, 0],
  ],
  lookY: [
    [0, 0],
    [LAUNCH.lift, -0.5],
    [CRUISE.start, 0],
    [CRUISE.maxed, 0.6],
    [CRUISE.maxed + 0.2, 0],
    [S3.spot, -0.8],
    [S3.look, 0],
    [GREEN.start, 0.6],
    [TOUCH_T, 0],
    [FINAL.look, -1],
    [FINAL.facepalm, 0],
  ],
  face: [
    [0, "kidHappy"],
    [LAUNCH.lift, "kidWow"],
    [CRUISE.start, "kidHappy"],
    [CRUISE.eye, "kidCurious"],
    [CRUISE.no, "kidConcern"],
    [CRUISE.maxed, "kidWow"],
    [CRUISE.maxed + 0.2, "kidDeadpan"],
    [9.8, "alarmed"],
    [CRUISE.burst, "ow"],
    [CRUISE.burst + 1.6, "kidConcern"],
    [S3.swim, "kidDeadpan"],
    [S3.spot, "kidCurious"],
    [S3.look, "wise"],
    [S3.lookEnd, "kidSmile"],
    [S3.throw, "determined"],
    [S3.throw + 0.5, "kidHappy"],
    [S3.dashThrow + 0.3, "kidDeadpan"],
    [CATCH_T, "kidJoy"],
    [FLIGHT.light, "kidWow"],
    [FLIGHT.look, "wise"],
    [FLIGHT.burn, "kidJoy"],
    [GREEN.start, "kidWow"],
    [TOUCH_T, "kidHappy"],
    [GREEN_BEATS.cheer, "kidJoy"],
    [GREEN_BEATS.end - 0.3, "kidHappy"],
    [FINAL.look, "kidCurious"],
    [FINAL.ghost + 0.4, "kidDeadpan"],
  ],
  aHand: [
    [0, "none"],
    [LAUNCH.lift, "open"],
    [CRUISE.start, "none"],
    [CRUISE.burst, "open"],
    [CRUISE.burst + 1.6, "none"],
    [S3.grab, "fist"],
    [S3.throw + 0.05, "open"],
    [S3.throw + 0.5, "none"],
    [CATCH_T, "fist"],
    [GREEN_BEATS.flameOut, "fist"],
    [GREEN_BEATS.cheer, "open"],
    [GREEN_BEATS.sprout, "open"],
    [GREEN_BEATS.end - 0.3, "fist"],
    [FINAL.facepalm, "open"],
  ],
  bHand: [
    [0, "none"],
    [LAUNCH.lift, "open"],
    [CRUISE.start, "none"],
    [GREEN_BEATS.cheer, "open"],
    [GREEN_BEATS.sprout, "none"],
  ],
  extras: (t) => ({ partyHat: true, blush: true, spaceHelmet: true, backpack: t >= CRUISE.burst }),
  tweak: (t, c) => {
    if (t < CRUISE.burst) {
      const base = rocketBase(t);
      const shake = t > CRUISE.maxed ? Math.sin(t * 57) * 6 * clamp01((t - CRUISE.maxed) / 2) : 0;
      c.x = ROCKET_X + SEAT.newt.dx + shake;
      c.lift = GROUND - (base + SEAT.newt.dy);
      if (t > CRUISE.no && t < CRUISE.no + 0.6) c.pose.head += Math.sin((t - CRUISE.no) * 30) * 12; // "no, no, no"
      return;
    }
    if (t < STRAND.start) {
      const tau = t - CRUISE.burst;
      c.x = ROCKET_X + SEAT.newt.dx + V_NEWT0.x * tau;
      c.lift = GROUND - (S2_BASE + SEAT.newt.dy + V_NEWT0.y * tau);
      c.rot = -30 * tau;
      return;
    }
    if (t < STRAND_END) {
      const p = newtSpace(t);
      c.x = p.x;
      c.lift = GROUND - p.y;
      c.scale = 0.72 * p.s;
      c.rot = t < FLIGHT.burn ? 6 * Math.sin(t * 0.9 + 1) : -38; // leaning into the flight
      return;
    }
    if (t < ALONE.start) {
      // landing: flame pointed AT the planet to brake against its gravity
      c.x = 540;
      c.lift = greenDescent(t);
      return;
    }
    if (t >= FINAL.start) {
      c.x = 520;
      c.lift = 0;
    }
  },
};

export const heroAt = (t: number) => build(heroScript, t);
export const kidAt = (t: number) => build(kidScript, t);

export const handOf = (c: CharState) => toWorld(c, solve(c.pose, c.aLen ?? 1).aHand);

// ═══════════════════════ Props in space (S3) ═══════════════════════
/** The wrench drifts into Newt's reach, is held, then thrown (and keeps going forever). */
export const wrenchAt = (t: number): (P & { rot: number }) | null => {
  if (t < STRAND.start || t > STRAND_END) return null;
  const hold = (tt: number) => {
    const h = handOf(kidAt(tt));
    return { x: h.x, y: h.y };
  };
  if (t < STRAND.grab) {
    const h = hold(STRAND.grab);
    const u = (STRAND.grab - t) / (STRAND.grab - STRAND.start);
    return { x: h.x + 260 * u, y: h.y - 180 * u, rot: t * 20 };
  }
  if (t < STRAND.throw) return { ...hold(t), rot: 0 };
  const h = hold(STRAND.throw);
  const tau = t - STRAND.throw;
  return { x: h.x + V_WRENCH.x * tau, y: h.y + V_WRENCH.y * tau, rot: tau * 400 };
};

export const sandwichAt = (t: number): (P & { rot: number }) | null => {
  if (t < STRAND.dashThrow || t > STRAND_END) return null;
  const h = handOf(heroAt(STRAND.dashThrow));
  const tau = t - STRAND.dashThrow;
  return { x: h.x + V_SANDWICH.x * tau, y: h.y + V_SANDWICH.y * tau, rot: tau * 120 };
};

/** The flare: floating and blinking, then in Newt's hand; lit; then thrusting. */
export const flareAt = (t: number): { x: number; y: number; dir: number; lit: number; s: number; blink: boolean } | null => {
  const exhaust = Math.atan2(-FLIGHT_DIR.y, -FLIGHT_DIR.x); // gas goes opposite to where he flies
  if (t >= STRAND.start && t < STRAND_END) {
    if (t < CATCH_T) return { x: FLARE_POS.x, y: FLARE_POS.y, dir: 0.4 + 0.2 * Math.sin(t), lit: 0, s: 1, blink: true };
    const h = handOf(kidAt(t));
    const lit = clamp01((t - FLIGHT.light) / 0.3);
    return { x: h.x, y: h.y, dir: t < FLIGHT.burn ? lerp(-0.3, exhaust, clamp01((t - FLIGHT.look) / 0.6)) : exhaust, lit: t < FLIGHT.light ? 0 : t < FLIGHT.burn ? 0.35 * lit : 1, s: newtSpace(t).s, blink: false };
  }
  if (t >= GREEN.start && t < ALONE.start) {
    const h = handOf(kidAt(t));
    const lit = t < GREEN_BEATS.flameOut ? 1 : Math.max(0, 1 - (t - GREEN_BEATS.flameOut) / 0.3);
    return { x: h.x, y: h.y + 10, dir: Math.PI / 2, lit, s: 1, blink: false };
  }
  return null;
};
