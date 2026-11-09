import { POSES } from "../../rig/library";
import { build, type Script } from "../../rig/script";
import { GROUND, HEAD_SCALE, solve, toWorld } from "../../rig/Stickman";
import type { CharState } from "../../rig/types";
import { ballistic, damped, decelerate, G } from "./physics";
import type { BirdState } from "./props";
import {
  B1,
  B1_FALL_T,
  B1_FINAL,
  B1_GO,
  B1_LAND_T,
  B1_LAND_X,
  B1_LIP_T,
  B1_SHELF_T,
  B1_SLOPE_T,
  B1_START,
  B1_V_FOOT,
  B1_V_LIP,
  BAL_LONG,
  BAL_SHORT,
  BALL_BACK,
  BALL_DECEL,
  BALL_FLAT,
  BALL_KICK,
  BALL_R,
  BALL_V_BACK,
  BONK_T,
  CATAPULT_NOTE,
  CHARGE,
  CHARGE_FROM,
  CHARGE_HIT_X,
  D_LONG,
  DASH_X0,
  hillH,
  HIT_T,
  INTRO,
  KICK_T,
  LAUNCH,
  LAUNCH_T,
  LAUNCH_V,
  LEDGE_H,
  LEDGE_X,
  LESSON,
  LEVER,
  LIFT_MAX,
  LONG_END_X,
  NEWT_X0,
  orbitAngle,
  PARK_T,
  PEBBLE_H,
  PIVOT_X,
  PLANK_L,
  PUSH,
  R,
  REBOUND_AIR,
  REBOUND_LAND_X,
  REBOUND_STOP_T,
  REBOUND_STOP_X,
  REBOUND_V,
  ROCK1,
  ROLL_DECEL,
  ROLL_OFF,
  ROPE,
  ROPE_L0,
  ROPE_TAUT_T,
  SEESAW,
  SEESAW_PIVOT,
  SHELF_END,
  SIT_X,
  SLAM_T,
  SLOPE,
  STRAP_T,
  TILT_DOWN,
  TILT_UP,
  TRY,
  TWIST,
  UP_T,
} from "./timeline";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const smooth = (u: number) => {
  const k = clamp01(u);
  return k * k * (3 - 2 * k);
};
const deg = (r: number) => (r * 180) / Math.PI;

// ═══════════════════════ Boulder #1 ═══════════════════════
export type BoulderState = { x: number; h: number; rot: number; bands: number };

const sinS = Math.sin(SLOPE);
const cosS = Math.cos(SLOPE);
const centerOnSlope = (contactX: number) => ({ x: contactX - R * sinS, h: hillH(contactX) + R * cosS });
const SLOPE_END_CENTER = centerOnSlope(SHELF_END);
const SHELF_LEN = SHELF_END - LEDGE_X;

// distance rolled (for the spin) and centre position, from physics
const boulderPath = (t: number) => {
  const tau = t - B1_GO;
  const aS = B1_V_FOOT / B1_SLOPE_T;
  if (tau <= 0) return { ...centerOnSlope(B1_START), dist: 0 };
  if (tau < B1_SLOPE_T) {
    const s = 0.5 * aS * tau * tau;
    return { ...centerOnSlope(B1_START - s * cosS), dist: s };
  }
  const slopeLen = 0.5 * aS * B1_SLOPE_T * B1_SLOPE_T;
  const t2 = tau - B1_SLOPE_T;
  if (t2 < B1_SHELF_T) {
    // concave foot: the centre leaves the slope's offset line onto the shelf's
    const d = B1_V_FOOT * t2 - 0.5 * (B1_V_FOOT - B1_V_LIP) / B1_SHELF_T * t2 * t2;
    const x = SLOPE_END_CENTER.x - (d / SHELF_LEN) * (SLOPE_END_CENTER.x - LEDGE_X);
    const h = Math.max(LEDGE_H + R, centerOnSlope(x + R * sinS).h);
    return { x, h, dist: slopeLen + d };
  }
  const t3 = t2 - B1_SHELF_T;
  if (t3 < B1_FALL_T) {
    return { x: LEDGE_X - B1_V_LIP * t3, h: LEDGE_H + R - 0.5 * G * t3 * t3, dist: slopeLen + SHELF_LEN + B1_V_LIP * t3 };
  }
  const t4 = t3 - B1_FALL_T;
  const x = decelerate(t4, 0, B1_LAND_X, -B1_V_LIP, ROLL_DECEL);
  return { x, h: R, dist: slopeLen + SHELF_LEN + B1_V_LIP * B1_FALL_T + (B1_LAND_X - x) };
};

export const boulderAt = (t: number): BoulderState => {
  const p = boulderPath(Math.min(t, PARK_T + 0.01));
  let { x, h } = p;
  let rot = -deg(p.dist / R); // rolling left = counter-clockwise
  // rides up onto the ball in its last stretch
  h += BALL_FLAT * smooth(1 - Math.abs(x - B1) / R);
  // the charge: wedged on the ball, it only rocks
  rot += damped(t - CHARGE.bonk, 1.6, 3, 5);
  // the lever: trembling at the balance point, then the edge comes up and it rolls off
  if (t > LEVER.hang && t < LEVER.tip) {
    rot += Math.sin(t * 57) * 0.5;
    x += Math.sin(t * 43) * 1.2;
  }
  const lifted = clamp01((plankShortTipH(t) - 0) / LIFT_MAX) * (t > LEVER.tip ? 1 : 0);
  if (t >= LEVER.tip && t < ROLL_OFF.t0) {
    h += LIFT_MAX * 0.5 * lifted;
    x += LIFT_MAX * 0.25 * lifted;
    rot += deg(Math.atan((LIFT_MAX * lifted) / (2 * R)));
  }
  if (t >= ROLL_OFF.t0) {
    const d = Math.min(ROLL_OFF.dist, ROLL_OFF.v * (t - ROLL_OFF.t0) - 0.5 * ROLL_DECEL * (t - ROLL_OFF.t0) ** 2);
    const u = d / ROLL_OFF.dist;
    x = B1 + LIFT_MAX * 0.25 + d * (1 - (LIFT_MAX * 0.25) / ROLL_OFF.dist);
    h = lerp(R + BALL_FLAT + LIFT_MAX * 0.5, R, smooth(u * 1.6));
    rot += deg(Math.atan(LIFT_MAX / (2 * R))) * (1 - smooth(u * 1.6)) + deg(d / R);
    if (t >= ROLL_OFF.t0 + ROLL_OFF.T) x = B1_FINAL;
  }
  // rope turns wound on during the tetherball, unwound as it rolls off the plank
  const bands = t < ROPE_TAUT_T ? 0 : t < ROLL_OFF.t0 ? Math.min(3, (3 * orbitAngle(t - ROPE_TAUT_T)) / (2 * Math.PI)) : Math.max(0, 3 - (t - ROLL_OFF.t0) * 9);
  return { x, h, rot, bands };
};

// ═══════════════════════ Plank (lever, then seesaw) ═══════════════════════
export type PlankState = { x: number; h: number; angle: number; lane: number };

const leverEnd = (angle: number) => ({ x: PIVOT_X - D_LONG * Math.cos(angle), h: PEBBLE_H + D_LONG * Math.sin(angle) });
const PLANK_REST = { x: LONG_END_X - 70, h: 0 };
// hands overhead in the "carry" pose
const CARRY_NEWT_H = 0.72 * -solve(POSES.carry).aHand.y - 10;
const CARRY_DASH_H = -solve(POSES.carry).aHand.y - 10;
const ROCK_ANGLE = 0.14;
const SEE_TIP = Math.asin((2 * R) / BAL_SHORT); // Dash's end on the grass

export const seesawAngle = (t: number) => {
  const balanced = SEESAW.sitDash + 0.25;
  if (t < SEESAW.sitDash) return -Math.asin((2 * R) / BAL_LONG);
  if (t < balanced) return lerp(-Math.asin((2 * R) / BAL_LONG), 0, smooth((t - SEESAW.sitDash) / 0.25));
  if (t < SEESAW.rock) return 0;
  const rock = (tt: number) => ROCK_ANGLE * Math.sin(2 * Math.PI * 0.62 * (tt - SEESAW.rock));
  if (t < SEESAW.tipped) return rock(t);
  return lerp(rock(SEESAW.tipped), SEE_TIP, Math.min(1, ((t - SEESAW.tipped) / 0.45) ** 2));
};

export const plankAt = (t: number): PlankState => {
  if (t < LEVER.drag) return { ...PLANK_REST, angle: 0, lane: 1 };
  if (t < LEVER.placed) {
    const u = smooth((t - LEVER.drag - 0.3) / (LEVER.placed - LEVER.drag - 0.3));
    const tilt = smooth((t - (LEVER.placed - 0.3)) / 0.3);
    const end = leverEnd(TILT_UP * tilt);
    return { x: lerp(PLANK_REST.x, end.x, u), h: lerp(0, end.h, tilt), angle: TILT_UP * tilt, lane: 1 - u };
  }
  let a = TILT_UP;
  if (t >= LEVER.hang && t < LEVER.tip) a += Math.sin(t * 50) * 0.004;
  if (t >= LEVER.tip && t < LEVER.down) a = lerp(TILT_UP, TILT_DOWN, ((t - LEVER.tip) / (LEVER.down - LEVER.tip)) ** 2);
  if (t >= LEVER.down) a = TILT_DOWN;
  if (t >= SLAM_T) a = lerp(TILT_DOWN, TILT_UP, Math.min(1, ((t - SLAM_T) / (LAUNCH_T - SLAM_T)) ** 2));
  if (t < SEESAW.lift) return { ...leverEnd(a), angle: a, lane: 0 };
  // carried over to the boulder: lifted over it, then set down balanced
  const from = leverEnd(TILT_UP);
  const sa = seesawAngle(t);
  const to = { x: SEESAW_PIVOT.x - BAL_LONG * Math.cos(sa), h: SEESAW_PIVOT.h + BAL_LONG * Math.sin(sa) };
  if (t < SEESAW.set) {
    // lifted to hand height (Newt's end lower than Dash's), walked over, lowered onto the rock
    const u = (t - SEESAW.lift) / (SEESAW.set - SEESAW.lift);
    const up = smooth(u / 0.2);
    const down = smooth((u - 0.8) / 0.2);
    const carry = { h: CARRY_NEWT_H, angle: -Math.asin((CARRY_DASH_H - CARRY_NEWT_H) / PLANK_L) };
    return {
      x: lerp(from.x, to.x, smooth((u - 0.2) / 0.6)),
      h: lerp(lerp(from.h, carry.h, up), to.h, down),
      angle: lerp(lerp(TILT_UP, carry.angle, up), sa, down),
      lane: 0,
    };
  }
  return { ...to, angle: sa, lane: 0 };
};

/** Top surface of the plank, `d` px from its left end */
export const plankPoint = (p: PlankState, d: number) => ({
  x: p.x + d * Math.cos(p.angle) + 16 * Math.sin(p.angle),
  h: p.h - d * Math.sin(p.angle) + 16 * Math.cos(p.angle),
});

// height of the short end's tip during the lever beat (what lifts the boulder's edge)
function plankShortTipH(t: number) {
  const p = plankAt(t);
  return Math.max(0, p.h - PLANK_L * Math.sin(p.angle));
}

// ═══════════════════════ Prop rock ═══════════════════════
export const propRockAt = (t: number) => {
  const base = { x: ROCK1.x, h: hillH(ROCK1.x) + 8, rot: 0 };
  if (t < HIT_T) return base;
  // knocked up the slope, lands a little higher and stays
  const land = ROCK1.x + 130;
  const T = 0.5;
  const u = Math.min(1, (t - HIT_T) / T);
  return { x: lerp(ROCK1.x, land, u), h: ballistic(Math.min(t, HIT_T + T), HIT_T, HIT_T + T, base.h, hillH(land) + 8), rot: u * 260 };
};

// ═══════════════════════ Characters ═══════════════════════
const LIE_LIFT = -147;
const CRAWL_LIFT = 20;
const handReach = (pose: keyof typeof POSES) => solve(POSES[pose]).aHand.x;
const PUSH_X = B1 - R - handReach("pushHard") + 6;
const BACK_X = B1 - R + solve(POSES.pushBack).shoulder.x - 14; // facing left: his back meets the rock
export const COIL_X = 640;
const DRAPE_X = B1 - R - 64;
const ORBIT_START_X = B1 - ROPE_L0;
const GRAB_BALL_X = B1 - 70;
const PLACE_X = LONG_END_X + 120;
const CLIMB_X = B1_FINAL - R - 44;
export const BALL_CATCH_T = BONK_T + 1.05;
export const BALL_DROP_T = CATAPULT_NOTE.t1 - 0.4;

const heroScript: Script = {
  scale: 1,
  seed: 0,
  x: [
    [0, DASH_X0],
    [PUSH.walk, DASH_X0],
    [PUSH.t0, PUSH_X, "out"],
    [PUSH.slip, PUSH_X - 46, "lin"],
    [PUSH.turn, PUSH_X - 46],
    [PUSH.back, BACK_X, "out"],
    [CHARGE.backUp, BACK_X],
    [CHARGE.gone, CHARGE_FROM, "lin"],
    [CHARGE.go, CHARGE_FROM],
    [CHARGE.bonk, CHARGE_HIT_X, "lin"],
    [CHARGE.bonk + REBOUND_AIR, REBOUND_LAND_X, "lin"],
    [REBOUND_STOP_T, REBOUND_STOP_X, "out"],
    [CHARGE.up, REBOUND_STOP_X],
    [ROPE.grab, COIL_X - 60, "io"],
    [ROPE.run, COIL_X - 60],
    [ROPE_TAUT_T, ORBIT_START_X, "lin"],
    // orbit and strapped positions come from tweak()
    [TWIST.peel, DRAPE_X - 40],
    [TWIST.idea, DRAPE_X - 40],
    [TWIST.grab, GRAB_BALL_X - 40, "io"],
    [TWIST.grab + 0.15, GRAB_BALL_X - 40],
    [TWIST.place, PLACE_X, "io"],
    [TWIST.toRock, PLACE_X],
    [TWIST.climb, CLIMB_X, "io"],
    [TWIST.onTop, B1_FINAL - 6, "out"],
    [TWIST.jump, B1_FINAL - 6],
    [SLAM_T, SIT_X, "lin"],
    [UP_T, SIT_X],
    [SEESAW.lift - 0.1, SIT_X + 70, "io"],
  ],
  lift: [[0, 0]],
  sy: [
    [0, 1],
    [CHARGE.bonk, 1],
    [CHARGE.bonk + 0.05, 0.86, "snap"],
    [CHARGE.bonk + 0.3, 1, "back"],
    [SLAM_T, 1],
    [SLAM_T + 0.05, 0.8, "snap"],
    [SLAM_T + 0.35, 1, "back"],
    [BONK_T, 1],
    [BONK_T + 0.04, 0.84, "snap"],
    [BONK_T + 0.3, 1, "back"],
  ],
  facing: [
    [0, 1],
    [PUSH.turn, -1],
    [CHARGE.backUp, 1],
    [ROPE.run, -1],
    [ROPE_TAUT_T, 1],
    [TWIST.grab + 0.15, -1],
    [TWIST.toRock, 1],
    [TWIST.jump, -1],
    [UP_T, 1],
  ],
  gait: [
    [0, "none"],
    [PUSH.walk, "walk"],
    [PUSH.t0, "none"],
    [CHARGE.backUp, "walk"],
    [CHARGE.gone, "none"],
    [CHARGE.go, "run"],
    [CHARGE.bonk, "none"],
    [CHARGE.up, "walk"],
    [ROPE.grab, "none"],
    [ROPE.run, "run"],
    [ROPE_TAUT_T, "none"],
    [TWIST.idea, "walk"],
    [TWIST.grab, "none"],
    [TWIST.grab + 0.15, "run"],
    [TWIST.place - 0.05, "none"],
    [TWIST.toRock, "run"],
    [TWIST.climb, "none"],
    [UP_T, "walk"],
    [SEESAW.lift - 0.1, "none"],
  ],
  pose: [
    [0, "stand"],
    [INTRO.stretch, "stretchUp", 0.3, "back"],
    [INTRO.side, "sideStretch", 0.3],
    [INTRO.lunge, "lunge", 0.3],
    [INTRO.lick, "lickFinger", 0.2],
    [INTRO.wind, "testWind", 0.2, "back"],
    [INTRO.cocky, "smugPoint", 0.2, "back"],
    [INTRO.windUp, "kickWind", 0.25],
    [KICK_T, "kick", 0.07, "snap"],
    [KICK_T + 0.5, "stand", 0.3],
    [KICK_T + 0.8, "proud", 0.25],
    [B1_LAND_T - 0.3, "alarmed", 0.15, "back"],
    [PARK_T + 0.2, "shrug", 0.2, "back"],
    [PARK_T + 1.6, "stand", 0.25],
    [PUSH.walk, "stand", 0.1],
    [PUSH.t0 - 0.1, "pushHard", 0.15, "back"],
    [PUSH.slip, "stand", 0.15],
    [PUSH.back - 0.1, "pushBack", 0.2],
    [CHARGE.backUp, "fists", 0.15],
    [CHARGE.gone - 0.45, "smugPoint", 0.2, "back"],
    [CHARGE.go, "shoulderCharge", 0.1],
    [CHARGE.bonk, "flail", 0.06, "snap"],
    [CHARGE.bonk + REBOUND_AIR - 0.05, "sitGround", 0.1],
    [REBOUND_STOP_T + 0.3, "sitSlump", 0.25],
    [CHARGE.up - 0.35, "crouch", 0.2],
    [CHARGE.up, "stand", 0.15],
    [ROPE.grab, "bendHand", 0.15],
    [ROPE.loop - 0.2, "windUp", 0.15],
    [ROPE.loop, "smash", 0.1, "snap"],
    [ROPE.tie, "rub", 0.15],
    [ROPE.run, "stand", 0.1],
    [STRAP_T, "draped", 0.06, "snap"],
    [ROLL_OFF.t0, "fall", 0.12],
    [ROLL_OFF.t0 + 0.25, "lie", 0.1],
    [TWIST.peel, "crawl", 0.25],
    [TWIST.kneel, "kneel", 0.25],
    [TWIST.stand, "stand", 0.2],
    [TWIST.idea, "proud", 0.15, "back"],
    [TWIST.idea + 0.35, "stand", 0.12],
    [TWIST.grab - 0.25, "bendHand", 0.15],
    [TWIST.grab + 0.15, "carryFront", 0.12],
    [TWIST.place - 0.25, "bendHand", 0.15],
    [TWIST.back, "stand", 0.15],
    [TWIST.climb, "climb", 0.15],
    [TWIST.onTop, "stand", 0.15],
    [TWIST.cocky, "smugPoint", 0.2, "back"],
    [TWIST.jump - 0.2, "crouch", 0.15],
    [TWIST.jump, "leap", 0.08],
    [TWIST.jump + 0.15, "tuck", 0.12],
    [SLAM_T - 0.05, "sitGround", 0.06],
    [SLAM_T + 0.5, "sitShade", 0.25],
    [BONK_T, "sitSlump", 0.06, "snap"],
    [UP_T - 0.6, "sitGround", 0.25],
    [UP_T - 0.3, "crouch", 0.15],
    [UP_T, "stand", 0.15],
    [SEESAW.lift - 0.1, "bendHand", 0.12],
    [SEESAW.lift + 0.1, "carry", 0.2],
    [SEESAW.set, "stand", 0.12],
    [SEESAW.sitDash - 0.12, "leap", 0.08],
    [SEESAW.sitDash, "sitHold", 0.1],
    [SEESAW.tipped + 0.4, "sitCheer", 0.2],
  ],
  faceX: [
    [0, 1],
    [INTRO.cocky, 1],
    [INTRO.cocky + 0.1, 0, "out"],
    [INTRO.windUp - 0.1, 1, "out"],
    [PARK_T + 0.2, 1],
    [PARK_T + 0.3, 0, "out"],
    [PARK_T + 1.5, 1, "out"],
    [PUSH.look, 1],
    [PUSH.look + 0.1, 0, "out"],
    [PUSH.turn, 1, "out"],
    [CHARGE.gone - 0.5, 1],
    [CHARGE.gone - 0.4, 0, "out"],
    [CHARGE.gone, 1, "out"],
    [STRAP_T, 1],
    [LESSON.end - 0.6, 1],
    [LESSON.end - 0.5, 0, "out"],
    [LESSON.end + 0.3, 1, "out"],
    [TWIST.cocky, 1],
    [TWIST.cocky + 0.1, 0, "out"],
    [TWIST.jump - 0.2, 1, "out"],
    [SLAM_T + 0.4, 0.4],
    [SEESAW.tipped + 0.4, 0, "out"],
  ],
  lookY: [
    [0, 0],
    [INTRO.wind, -0.8],
    [INTRO.cocky, 0],
    [KICK_T + 0.5, -0.5],
    [B1_LAND_T - 0.3, 0],
    [PUSH.t0, 0.3],
    [STRAP_T, 0],
    [TWIST.grab - 0.25, 0.8],
    [TWIST.grab + 0.15, 0],
    [SLAM_T + 0.3, -1],
    [BONK_T, 0],
    [SEESAW.tipped + 0.05, -1],
    [SEESAW.tipped + 0.6, 0],
  ],
  face: [
    [0, "confident"],
    [INTRO.lick, "determined"],
    [INTRO.cocky, "cocky"],
    [INTRO.windUp, "determined"],
    [KICK_T, "confident"],
    [KICK_T + 0.8, "proud"],
    [B1_LAND_T - 0.3, "uhoh"],
    [PARK_T + 0.2, "sheepish"],
    [PUSH.walk, "determined"],
    [PUSH.t0, "strain"],
    [PUSH.slip, "deadpan"],
    [PUSH.back, "strain"],
    [CHARGE.backUp, "determined"],
    [CHARGE.gone - 0.45, "cocky"],
    [CHARGE.go, "rage"],
    [CHARGE.bonk, "squashed"],
    [CHARGE.bonk + 0.4, "dazed"],
    [CHARGE.up - 0.35, "battered"],
    [ROPE.grab, "mischief"],
    [ROPE.tie, "cocky"],
    [ROPE.run, "determined"],
    [ROPE_TAUT_T + 0.5, "alarmed"],
    [STRAP_T, "squashed"],
    [STRAP_T + 0.6, "deadpan"],
    [LESSON.parts + 1.0, "confused"],
    [LESSON.result + 1.0, "curious"],
    [LESSON.end - 0.6, "sheepish"],
    [LEVER.hang, "uhoh"],
    [LEVER.birdOn, "curious"],
    [ROLL_OFF.t0, "surprised"],
    [ROLL_OFF.t0 + 0.3, "squashed"],
    [TWIST.peel, "battered"],
    [TWIST.idea, "idea"],
    [TWIST.idea + 0.35, "mischief"],
    [TWIST.cocky, "cocky"],
    [TWIST.jump, "confident"],
    [SLAM_T, "braced"],
    [SLAM_T + 0.3, "proud"],
    [SLAM_T + 0.9, "curious"],
    [BONK_T - 0.45, "horror"],
    [BONK_T, "dazed"],
    [UP_T - 0.6, "battered"],
    [UP_T, "sheepish"],
    [SEESAW.set, "happy"],
    [SEESAW.rock, "laughing"],
    [SEESAW.tipped, "surprised"],
    [SEESAW.tipped + 0.5, "laughing"],
  ],
  aHand: [
    [0, "none"],
    [INTRO.lick, "point"],
    [INTRO.cocky - 0.05, "none"],
    [INTRO.cocky, "point"],
    [INTRO.windUp, "none"],
    [PUSH.t0, "open"],
    [PUSH.slip, "none"],
    [CHARGE.gone - 0.45, "thumb"],
    [CHARGE.go, "fist"],
    [CHARGE.bonk, "open"],
    [CHARGE.bonk + REBOUND_AIR, "none"],
    [ROPE.grab, "fist"],
    [ROPE.run, "none"],
    [STRAP_T, "open"],
    [ROLL_OFF.t0, "none"],
    [TWIST.grab, "open"],
    [TWIST.toRock, "none"],
    [TWIST.cocky, "thumb"],
    [TWIST.jump, "none"],
    [SLAM_T + 0.5, "open"],
    [BONK_T, "none"],
    [SEESAW.lift, "fist"],
    [SEESAW.set, "none"],
    [SEESAW.sitDash, "fist"],
    [SEESAW.tipped + 0.4, "open"],
  ],
  bHand: [
    [0, "none"],
    [PUSH.t0, "open"],
    [PUSH.slip, "none"],
    [SEESAW.lift, "fist"],
    [SEESAW.set, "none"],
    [SEESAW.tipped + 0.4, "open"],
  ],
  extras: () => ({ scarf: true }),
  tweak: (t, c) => {
    // PUSH: feet churn in place while he slides backwards
    if (t > PUSH.t0 && t < PUSH.slip) {
      const s = Math.sin(t * 16);
      c.pose.aH = 22 + 18 * s;
      c.pose.bH = -40 - 18 * s;
      c.pose.aK = 30 + 20 * Math.max(0, -s);
      c.pose.bK = 8 + 20 * Math.max(0, s);
      c.pose.lean += Math.sin(t * 23) * 2;
    }
    // back-push: moonwalk in place
    if (t > PUSH.back && t < CHARGE.backUp) {
      const s = Math.sin(t * 11);
      c.pose.aH = 40 + 22 * s;
      c.pose.bH = 30 - 22 * s;
      c.pose.aK = 60 + 14 * s;
      c.pose.bK = 50 - 14 * s;
    }
    // CHARGE rebound: a short hop back off the rock, then a butt-slide
    if (t >= CHARGE.bonk && t < CHARGE.bonk + REBOUND_AIR) {
      c.lift = ballistic(t, CHARGE.bonk, CHARGE.bonk + REBOUND_AIR, 0, 0);
    }
    if (t >= CHARGE.bonk + REBOUND_AIR && t < REBOUND_STOP_T) {
      c.x = decelerate(t, CHARGE.bonk + REBOUND_AIR, REBOUND_LAND_X, REBOUND_V, Math.abs(REBOUND_V) / (REBOUND_STOP_T - CHARGE.bonk - REBOUND_AIR));
    }
    // ROPE: tetherball orbit — rope winds on, radius shrinks, he whips round faster
    if (t >= ROPE_TAUT_T && t < STRAP_T) {
      const o = orbitAt(t);
      c.x = o.x;
      c.facing = o.vx >= 0 ? 1 : -1;
      c.scale = o.scale;
      c.lift = o.lift;
      c.speed = o.vx;
      const run = Math.sin(((t - ROPE_TAUT_T) * ROPE.v) / 60);
      c.pose = { ...POSES.flail, lean: 24, aH: 40 * run, bH: -40 * run, aK: 40, bK: 40 };
      c.faceX = 0.6;
    }
    // strapped face-first over the boulder (an occasional wriggle); slides off when it rolls away
    if (t >= STRAP_T && t < ROLL_OFF.t0 + 0.3) {
      const b = boulderAt(t);
      c.x = b.x - R - 64;
      c.facing = 1;
      c.rot = 0;
      const wriggle = Math.max(0, Math.sin(t * 1.3)) ** 8;
      c.pose.aS += Math.sin(t * 14) * 14 * wriggle;
      c.pose.aH += Math.sin(t * 12) * 10 * wriggle;
    }
    if (t >= ROLL_OFF.t0 && t < TWIST.peel) {
      const u = smooth((t - ROLL_OFF.t0) / 0.3);
      c.rot = 90 * u;
      c.lift = lerp(0, LIE_LIFT, u);
      c.x = DRAPE_X - 40 * u;
      c.sy = t < ROLL_OFF.t0 + 0.45 ? 1 - 0.25 * smooth((t - ROLL_OFF.t0 - 0.25) / 0.1) : 0.75 + 0.25 * smooth((t - ROLL_OFF.t0 - 0.45) / 0.15);
    }
    if (t >= TWIST.peel && t < TWIST.kneel) {
      c.rot = 90;
      c.lift = lerp(LIE_LIFT, CRAWL_LIFT, smooth((t - TWIST.peel) / 0.3));
    }
    if (t >= TWIST.kneel && t < TWIST.stand) c.rot = 90 * (1 - smooth((t - TWIST.kneel) / 0.25));
    // climbing onto the boulder, standing on top, the cannonball onto the short arm
    if (t >= TWIST.climb && t < TWIST.jump) c.lift = 2 * R * smooth((t - TWIST.climb) / (TWIST.onTop - TWIST.climb));
    if (t >= TWIST.jump && t < SLAM_T) c.lift = ballistic(t, TWIST.jump, SLAM_T, 2 * R, plankPoint(plankAt(SLAM_T), D_LONG + (SIT_X - PIVOT_X)).h);
    if (t >= SLAM_T && t < UP_T - 0.3) c.lift = plankPoint(plankAt(t), D_LONG + (SIT_X - PIVOT_X)).h;
    // heart: riding the seesaw on the right end
    if (t >= SEESAW.set) {
      const p = plankAt(t);
      const seat = plankPoint(p, PLANK_L - 50);
      if (t < SEESAW.sitDash - 0.12) {
        c.x = seat.x + 50;
      } else if (t < SEESAW.sitDash) {
        const u = (t - (SEESAW.sitDash - 0.12)) / 0.12;
        c.x = lerp(seat.x + 50, seat.x, u);
        c.lift = ballistic(t, SEESAW.sitDash - 0.12, SEESAW.sitDash, 0, seat.h);
      } else {
        c.x = seat.x;
        c.lift = seat.h;
      }
      c.facing = -1;
    }
    if (t >= SEESAW.lift && t < SEESAW.set) {
      const p = plankAt(t);
      c.x = plankPoint(p, PLANK_L).x - 6;
      c.facing = -1;
      c.scale = 1.05; // walks in the front lane, plank held over the rock
      c.lift = -24;
    }
  },
};

// tetherball kinematics (world)
export const orbitAt = (t: number) => {
  const tau = t - ROPE_TAUT_T;
  const phi = orbitAngle(tau);
  const L = ROPE_L0 - R * phi;
  const psi = Math.PI - phi; // starts on the left, swings toward the camera
  const z = L * Math.sin(psi);
  const phi2 = orbitAngle(tau + 0.01);
  const L2 = ROPE_L0 - R * phi2;
  const x = B1 + L * Math.cos(psi);
  const x2 = B1 + L2 * Math.cos(Math.PI - phi2);
  return { x, z, L, vx: (x2 - x) / 0.01, scale: 1 + (0.22 * z) / ROPE_L0, lift: -0.14 * z };
};

const NEWT_WATCH_X = 330;
const NEWT_SAFE_X = 230; // clear of the tetherball
const NEWT_TEACH_X = 380;
const NEWT_TWIST_X = leverEnd(TILT_DOWN).x - 50;
const NEWT_BACK_X = NEWT_TWIST_X - 80;

const kidScript: Script = {
  scale: 0.72,
  seed: 1.7,
  x: [
    [0, NEWT_X0],
    [TRY[0] - 0.6, NEWT_X0],
    [TRY[0], NEWT_WATCH_X, "io"],
    [ROPE.grab - 0.4, NEWT_WATCH_X],
    [ROPE.grab + 0.2, NEWT_SAFE_X, "io"],
    [STRAP_T + 2.0, NEWT_SAFE_X],
    [LESSON.look - 0.3, NEWT_TEACH_X, "io"],
    [LEVER.drag, NEWT_TEACH_X],
    [LEVER.drag + 0.6, PLANK_REST.x - 40, "io"],
    [LEVER.placed, leverEnd(TILT_UP).x - 30, "io"],
    [LEVER.jump, leverEnd(TILT_UP).x - 30],
    // sitting on the long end: from tweak
    [LEVER.down + 0.1, NEWT_TWIST_X],
    [TWIST.back, NEWT_TWIST_X],
    [TWIST.back + 0.35, NEWT_BACK_X, "out"],
    [UP_T, NEWT_BACK_X],
    [SEESAW.lift - 0.3, leverEnd(TILT_UP).x - 40, "io"],
  ],
  lift: [[0, 0]],
  sy: [[0, 1]],
  facing: [
    [0, 1],
    [LEVER.drag, -1],
    [LEVER.drag + 0.6, 1],
  ],
  gait: [
    [0, "none"],
    [TRY[0] - 0.6, "walk"],
    [TRY[0], "none"],
    [ROPE.grab - 0.4, "walk"],
    [ROPE.grab + 0.2, "none"],
    [STRAP_T + 2.0, "walk"],
    [LESSON.look - 0.3, "none"],
    [LEVER.drag, "run"],
    [LEVER.drag + 0.6, "none"],
    [TWIST.back, "walk"],
    [TWIST.back + 0.35, "none"],
    [UP_T, "walk"],
    [SEESAW.lift - 0.3, "none"],
  ],
  pose: [
    [0, "stand"],
    [KICK_T + 0.1, "lookUp", 0.25],
    [B1_LAND_T, "stand", 0.25],
    [TRY[0], "crossArms", 0.25],
    [CHARGE.bonk, "recoil", 0.08],
    [CHARGE.bonk + 0.5, "crossArms", 0.25],
    [ROPE.grab + 0.2, "handsHips", 0.2],
    [ROPE_TAUT_T + 0.3, "alarmed", 0.15],
    [STRAP_T + 0.4, "facepalm", 0.25],
    [STRAP_T + 1.8, "stand", 0.25],
    [LESSON.look, "stand", 0.1],
    [LESSON.parts, "countdown", 0.25, "back"],
    [LESSON.end - 0.4, "stand", 0.2],
    [LEVER.drag + 0.6, "crouch", 0.15],
    [LEVER.placed, "stand", 0.15],
    [LEVER.labels + 0.2, "point", 0.2, "back"],
    [LEVER.labelsOff - 0.3, "stand", 0.15],
    [LEVER.jump - 0.15, "crouch", 0.1],
    [LEVER.jump, "leap", 0.1],
    [LEVER.hang - 0.06, "sitHold", 0.1],
    [LEVER.down + 0.05, "stand", 0.15],
    [LEVER.down + 0.15, "cheer", 0.2, "back"],
    [LEVER.down + 1.4, "point", 0.25],
    [TWIST.peel, "stand", 0.25],
    [TWIST.back + 0.4, "crossArms", 0.25],
    [LAUNCH_T, "lookUp", 0.15],
    [BONK_T, "recoil", 0.08],
    [BONK_T + 0.5, "stand", 0.15],
    [BALL_CATCH_T, "holdUp", 0.15],
    [CATAPULT_NOTE.t0 + 0.6, "point", 0.25],
    [BALL_DROP_T, "stand", 0.2],
    [SEESAW.lift - 0.2, "carry", 0.2],
    [SEESAW.set, "stand", 0.15],
    [SEESAW.sitNewt, "sitHold", 0.1],
    [SEESAW.tipped + 0.3, "sitCheer", 0.2],
  ],
  faceX: [
    [0, 1],
    [PARK_T + 0.1, 1],
    [PARK_T + 0.2, 0, "out"],
    [PARK_T + 1.0, 1, "out"],
    [LESSON.look, 1],
    [LESSON.look + 0.1, 0, "out"],
    [LESSON.end - 0.4, 1, "out"],
    [LEVER.whistle, 1],
    [LEVER.whistle + 0.1, 0.4, "out"],
    [LEVER.down, 1, "out"],
    [CATAPULT_NOTE.t0, 1],
    [CATAPULT_NOTE.t0 + 0.1, 0, "out"],
    [CATAPULT_NOTE.t1 - 0.4, 1, "out"],
  ],
  lookY: [
    [0, 0],
    [KICK_T + 0.1, -0.7],
    [B1_LAND_T, 0],
    [LEVER.birdGo, -0.8],
    [LEVER.birdOn, -1],
    [LEVER.tip, 0],
    [LAUNCH_T, -1],
    [BONK_T, 0],
    [SEESAW.bird, -0.6],
    [SEESAW.tipped, 0],
  ],
  face: [
    [0, "kidHappy"],
    [KICK_T, "kidCurious"],
    [PARK_T, "kidDeadpan"],
    [CHARGE.go, "kidConcern"],
    [CHARGE.bonk, "ow"],
    [CHARGE.bonk + 0.5, "kidDeadpan"],
    [ROPE_TAUT_T + 0.3, "kidWow"],
    [STRAP_T + 0.4, "kidDeadpan"],
    [LESSON.look, "wise"],
    [LESSON.parts, "kidSmile"],
    [LEVER.drag, "kidHappy"],
    [LEVER.hang, "kidHappy"],
    [LEVER.hang + 0.8, "kidCurious"],
    [LEVER.whistle, "whistle"],
    [LEVER.birdOn, "kidSmile"],
    [LEVER.down + 0.1, "kidJoy"],
    [TWIST.place, "suspicious"],
    [LAUNCH_T, "kidWow"],
    [LAUNCH_T + 0.5, "kidDeadpan"],
    [BONK_T, "ow"],
    [BONK_T + 0.5, "kidConcern"],
    [BALL_CATCH_T, "kidHappy"],
    [CATAPULT_NOTE.t0 + 0.6, "kidSmile"],
    [SEESAW.set, "kidHappy"],
    [SEESAW.rock, "kidJoy"],
    [SEESAW.tipped, "kidWow"],
    [SEESAW.tipped + 0.4, "kidJoy"],
  ],
  aHand: [
    [0, "none"],
    [LESSON.parts, "point"],
    [LESSON.end - 0.4, "none"],
    [LEVER.drag + 0.6, "open"],
    [LEVER.placed, "none"],
    [LEVER.labels + 0.2, "point"],
    [LEVER.labelsOff - 0.3, "none"],
    [LEVER.jump, "fist"],
    [LEVER.down + 0.05, "none"],
    [LEVER.down + 1.4, "point"],
    [TWIST.peel, "none"],
    [BALL_CATCH_T, "open"],
    [CATAPULT_NOTE.t0 + 0.6, "point"],
    [BALL_DROP_T, "none"],
    [SEESAW.lift - 0.2, "fist"],
    [SEESAW.set, "none"],
    [SEESAW.sitNewt, "fist"],
    [SEESAW.tipped + 0.3, "open"],
  ],
  bHand: [
    [0, "none"],
    [LEVER.jump, "fist"],
    [LEVER.down + 0.05, "none"],
    [SEESAW.lift - 0.2, "fist"],
    [SEESAW.set, "none"],
  ],
  extras: () => ({ partyHat: true, blush: true }),
  tweak: (t, c) => {
    // slow, deadpan blink at Dash when the boulder parks
    if (t > PARK_T + 0.3 && t < PARK_T + 0.8) c.blink = 1;
    // hops up onto the raised long end (1.07 m: feet off the grass, all his weight on it)
    // and rides it down once the bird joins him
    if (t >= LEVER.jump && t < LEVER.down + 0.05) {
      const seat = plankPoint(plankAt(t), 40);
      if (t < LEVER.hang) {
        const from = c.x;
        c.x = lerp(from, seat.x, smooth((t - LEVER.jump) / (LEVER.hang - LEVER.jump)));
        c.lift = ballistic(t, LEVER.jump, LEVER.hang, 0, seat.h);
      } else {
        c.x = seat.x;
        // legs swinging while he waits
        if (t < LEVER.tip) {
          c.pose.aK += 20 + Math.sin(t * 5) * 18;
          c.pose.bK += 20 + Math.sin(t * 5 + 1.4) * 18;
        }
        // the rig stands on its lowest foot: put the hips (not the feet) on the plank
        c.lift = seat.h - c.scale * -solve(c.pose).hip.y;
      }
    }
    if (t >= SEESAW.lift && t < SEESAW.set) {
      const p = plankAt(t);
      c.x = p.x + 6;
      c.facing = 1;
    }
    if (t >= SEESAW.set) {
      const p = plankAt(t);
      const seat = plankPoint(p, 46);
      c.x = t < SEESAW.sitNewt ? seat.x - 30 : seat.x;
      c.lift = t < SEESAW.sitNewt ? 0 : seat.h;
      c.facing = 1;
    }
  },
};

export const heroAt = (t: number) => build(heroScript, t);
export const kidAt = (t: number) => build(kidScript, t);

// ═══════════════════════ Rig points ═══════════════════════
/** A point given in head-local coordinates (before HEAD_SCALE), in world space */
export const headPoint = (c: CharState, local: { x: number; y: number }) => {
  const j = solve(c.pose, c.aLen ?? 1);
  const a = (j.headAng * Math.PI) / 180;
  const lx = local.x * HEAD_SCALE;
  const ly = local.y * HEAD_SCALE;
  return toWorld(c, { x: j.head.x + lx * Math.cos(a) - ly * Math.sin(a), y: j.head.y + lx * Math.sin(a) + ly * Math.cos(a) });
};
export const hatTip = (c: CharState) => headPoint(c, { x: -20, y: -112 });
export const headTop = (c: CharState) => headPoint(c, { x: 0, y: -52 });
export const hipOf = (c: CharState) => toWorld(c, solve(c.pose, c.aLen ?? 1).hip);
export const handOf = (c: CharState) => toWorld(c, solve(c.pose, c.aLen ?? 1).aHand);

// ═══════════════════════ Ball ═══════════════════════
export type BallState = { x: number; h: number; rot: number; squash: number };
const BOUNCE_LAND_X = leverEnd(TILT_DOWN).x - 160;
const BOUNCE_T = 0.85;

export const ballAt = (t: number): BallState => {
  let x = BALL_KICK.x0;
  let h = BALL_R;
  if (t >= KICK_T && t < HIT_T) {
    const u = (t - KICK_T) / (HIT_T - KICK_T);
    x = lerp(BALL_KICK.x0, BALL_KICK.x1, u);
    h = ballistic(t, KICK_T, HIT_T, BALL_R, hillH(BALL_KICK.x1) + BALL_R + 4);
  } else if (t >= HIT_T && t < BALL_BACK.t1) {
    const u = (t - HIT_T) / (BALL_BACK.t1 - HIT_T);
    x = lerp(BALL_BACK.x0, BALL_BACK.x1, u);
    h = ballistic(t, HIT_T, BALL_BACK.t1, hillH(BALL_KICK.x1) + BALL_R + 4, BALL_R);
  } else if (t >= BALL_BACK.t1 && t < TWIST.grab) {
    x = decelerate(t, BALL_BACK.t1, BALL_BACK.x1, -BALL_V_BACK, BALL_DECEL);
  } else if (t >= TWIST.grab && t < TWIST.place) {
    const hp = handOf(heroAt(t));
    x = hp.x;
    h = GROUND - hp.y + 6;
  } else if (t >= TWIST.place && t < LAUNCH_T) {
    const p = plankAt(t);
    const s = plankPoint(p, BALL_R + 4);
    x = s.x;
    h = s.h + BALL_R;
  } else if (t >= LAUNCH_T && t < BONK_T) {
    const tau = t - LAUNCH_T;
    x = LAUNCH.x0 + LAUNCH_V * Math.sin(LAUNCH.ang) * tau;
    h = LAUNCH.h0 + LAUNCH_V * Math.cos(LAUNCH.ang) * tau - 0.5 * G * tau * tau;
  } else if (t >= BONK_T && t < BONK_T + BOUNCE_T) {
    const u = (t - BONK_T) / BOUNCE_T;
    const from = ballAt(BONK_T - 1e-4);
    x = lerp(from.x, BOUNCE_LAND_X, u);
    h = ballistic(t, BONK_T, BONK_T + BOUNCE_T, from.h, BALL_R);
  } else if (t >= BONK_T + BOUNCE_T && t < BALL_CATCH_T) {
    x = decelerate(t, BONK_T + BOUNCE_T, BOUNCE_LAND_X, -260, 500);
  } else if (t >= BALL_CATCH_T && t < BALL_DROP_T) {
    const hp = handOf(kidAt(t));
    x = hp.x;
    h = GROUND - hp.y + 4;
  } else if (t >= BALL_DROP_T) {
    x = handOf(kidAt(BALL_DROP_T)).x;
  }
  // squashed while the boulder sits on it
  let squash = 1;
  if (t > PARK_T - 0.4 && t < ROLL_OFF.t0 + 0.4) {
    const b = boulderAt(t);
    const dx = x - b.x;
    if (Math.abs(dx) < R) {
      const gap = b.h - Math.sqrt(R * R - dx * dx);
      squash = Math.max(BALL_FLAT, Math.min(2 * BALL_R, gap)) / (2 * BALL_R);
    }
  }
  const rolled = x - BALL_KICK.x0;
  return { x, h, rot: deg(rolled / BALL_R) + (t > LAUNCH_T && t < BONK_T + BOUNCE_T ? (t - LAUNCH_T) * 900 : 0), squash };
};

// ═══════════════════════ Bird ═══════════════════════
const birdOnRock = (t: number) => {
  const b = boulderAt(t);
  return { x: b.x + 4, y: GROUND - (b.h + R) - 20 };
};
const flight = (a: { x: number; y: number }, b: { x: number; y: number }, u: number, arc = 70) => ({
  x: lerp(a.x, b.x, smooth(u)),
  y: lerp(a.y, b.y, smooth(u)) - Math.sin(Math.PI * u) * arc,
});

export const birdAt = (t: number): BirdState => {
  const base: BirdState = { x: 0, y: 0, facing: -1, flap: 0, run: 0, yawn: 0, look: 0 };
  // riding boulder #1 down the hill: runs on top like a log-roller, flutters off the step
  if (t < LEVER.birdGo) {
    const p = birdOnRock(t);
    const rolling = t > B1_GO && t < PARK_T;
    const flying = t > B1_LIP_T - 0.05 && t < B1_LAND_T + 0.25;
    const yawn = t > PUSH.yawn && t < PUSH.yawn + 0.9 ? Math.sin(((t - PUSH.yawn) / 0.9) * Math.PI) : 0;
    const bob = damped(t - CHARGE.bonk, 6, 4, 6);
    const sideStep = t > STRAP_T ? 22 : 0; // makes room for Dash's face: nose to beak
    return {
      ...base,
      x: p.x + sideStep,
      y: p.y - (flying ? 34 : 0) + bob,
      flap: flying ? 1 : 0,
      run: rolling && !flying ? 1 : 0,
      yawn,
      look: t > ROPE_TAUT_T && t < STRAP_T ? Math.sin((t - ROPE_TAUT_T) * 5) : 0,
    };
  }
  if (t < LEVER.birdOn) {
    const u = (t - LEVER.birdGo) / (LEVER.birdOn - LEVER.birdGo);
    const p = flight(birdOnRock(LEVER.birdGo), { x: hatTip(kidAt(LEVER.birdOn)).x, y: hatTip(kidAt(LEVER.birdOn)).y - 18 }, u, 90);
    return { ...base, ...p, flap: 1 };
  }
  if (t < SEESAW.bird) {
    const tip = hatTip(kidAt(t));
    return { ...base, x: tip.x, y: tip.y - 18, facing: 1 };
  }
  const land = (tt: number) => {
    const top = headTop(heroAt(tt));
    return { x: top.x, y: top.y - 18 };
  };
  if (t < SEESAW.tipped) {
    const u = (t - SEESAW.bird) / (SEESAW.tipped - SEESAW.bird);
    const tip = hatTip(kidAt(SEESAW.bird));
    return { ...base, ...flight({ x: tip.x, y: tip.y - 18 }, land(t), u, 80), flap: 1, facing: 1 };
  }
  return { ...base, ...land(t), facing: -1 };
};
