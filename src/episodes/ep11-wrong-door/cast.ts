import { num } from "../../lib/kf";
import { POSES } from "../../rig/library";
import { build, type Script } from "../../rig/script";
import { solve } from "../../rig/Stickman";
import type { CharState } from "../../rig/types";
import { ballistic, decelerate } from "../ep03-the-shortcut/physics";
import {
  AGAIN,
  ARRIVE,
  BACK,
  BOUNCE,
  DASH_X0,
  FALL,
  LANE,
  LAND_X,
  LOOK,
  NEWT_PUSH_X,
  NEWT_SCALE,
  NEWT_WATCH_X,
  NEWT_X0,
  OPEN,
  REST_X,
  RUN_X0,
  SLAM,
  SWING,
  THUMB,
  TIMBER_DX,
  TRY1,
  TRY2,
  TRY3,
  UP,
  X1,
  X2,
  X3,
  X_SPLAT,
} from "./timeline";

// Everyone plays it dead serious. Dash is certain the door is the problem.

/** lift that lays a lying body on the ground (the rig pivots on the hips) */
const LIE = -(-solve(POSES.lie).hip.y - 42);

// ═══════════════════════ Dash: brute force, right next to the hinge ═══════════════════════
const dashScript: Script = {
  scale: 1,
  seed: 0,
  x: [
    [0, DASH_X0],
    [ARRIVE, X1, "lin"],
    [TRY2.hand - 0.3, X1],
    [TRY2.hand, X2, "io"],
    [TRY3.back, X2],
    [TRY3.set, RUN_X0, "io"],
    [TRY3.run, RUN_X0],
    [TRY3.hit, X3, "lin"],
    [TRY3.land, LAND_X, "lin"],
    [TRY3.rest, REST_X, "out"],
    [UP.go, REST_X],
    [SLAM, X_SPLAT, "lin"],
    [FALL.at, X_SPLAT],
    [FALL.land, X_SPLAT - TIMBER_DX, "in"],
  ],
  lift: [
    [0, 0],
    [TRY3.hit, 0], // feet on the ground until the door throws him (the flight itself is ballistic, in tweak)
    [TRY3.land, LIE],
    [UP.rise, LIE],
    [UP.stand, 0, "io"],
    [FALL.at, 0],
    [FALL.land, LIE, "in"],
  ],
  sy: [
    [0, 1],
    [TRY3.land, 1],
    [TRY3.land + 0.05, 0.86, "snap"],
    [TRY3.land + 0.3, 1, "back"],
    [FALL.land, 1],
    [FALL.land + 0.05, 0.9, "snap"],
    [FALL.land + 0.3, 1, "back"],
  ],
  facing: [[0, 1]],
  gait: [
    [0, "walk"],
    [ARRIVE, "none"],
    [TRY3.back, "walk"],
    [TRY3.set, "none"],
    [TRY3.run, "runLegs"],
    [TRY3.hit, "none"],
    [UP.go, "runLegs"],
    [SLAM, "none"],
  ],
  pose: [
    [0, "stand"],
    [TRY1.hand, "doorPush", 0.3],
    [TRY1.give, "lookHand", 0.3],
    [TRY2.hand - 0.3, "stand", 0.25],
    [TRY2.hand, "pushHard", 0.35],
    [TRY2.give, "pant", 0.3],
    [TRY3.back, "stand", 0.25],
    [TRY3.set, "lunge", 0.3],
    [TRY3.run, "shoulderCharge", 0.2],
    [TRY3.hit, "flail", 0.1, "snap"],
    [TRY3.land, "lie", 0.12],
    [UP.rise, "crouch", 0.3],
    [UP.stand, "stand", 0.3],
    [UP.proud, "handsHips", 0.3],
    [UP.go, "proud", 0.15],
    [SLAM, "doorSplat", 0.05, "snap"],
    [FALL.at, "lie", 0.3],
    [THUMB, "lieThumb", 0.25, "back"],
  ],
  faceX: [
    [0, 0.5],
    [TRY1.push, 0.5],
    [TRY1.push + 0.4, -0.6],
    [TRY3.back, -0.6],
    [TRY3.back + 0.3, 0.4],
    [TRY3.land, 0],
    [UP.proud, 0],
    [UP.go, 0.3],
    [SLAM, 0.9, "snap"],
    [FALL.at, 0.9],
    [FALL.land, 0],
  ],
  lookY: [[0, 0]],
  face: [
    [0, "confident"],
    [TRY1.push, "cocky"],
    [TRY1.push + 0.9, "confused"],
    [TRY2.hand, "determined"],
    [TRY2.push + 0.4, "strain"],
    [TRY2.give, "annoyed"],
    [TRY3.back, "suspicious"],
    [TRY3.set, "determined"],
    [TRY3.run, "rage"],
    [TRY3.hit, "squashed"],
    [TRY3.land, "dazed"],
    [UP.head, "shocked"],
    [UP.stand, "jealous"],
    [UP.proud, "proud"],
    [SLAM, "squashed"],
    [FALL.land, "dazed"],
    [THUMB, "sheepish"],
  ],
  aHand: [
    [0, "fist"],
    [TRY1.hand, "open"],
    [TRY2.give, "fist"],
    [SLAM, "open"],
    [FALL.at, "fist"],
    [THUMB, "thumb"],
  ],
  bHand: [
    [0, "fist"],
    [TRY2.hand, "open"],
    [TRY2.give, "fist"],
    [SLAM, "open"],
    [FALL.at, "fist"],
  ],
  extras: (t) => ({
    scarf: true,
    flush: t > TRY2.push && t < TRY2.give + 0.8 ? Math.min(1, (t - TRY2.push) / 1.6, (TRY2.give + 0.8 - t) / 0.8) : 0,
  }),
  rot: [
    [0, 0],
    [TRY3.hit, 0],
    [TRY3.land, -90, "lin"],
    [UP.rise, -90],
    [UP.stand, 0, "io"],
    [FALL.at, 0],
    [FALL.land, -90, "in"],
  ],
  tweak: (t, c) => {
    // straining: the whole body shakes with the effort
    if (t > TRY2.push && t < TRY2.give) c.x += Math.sin(t * 46) * 2.2 * Math.min(1, (t - TRY2.push) / 0.5);
    // the bounce off the door: a true parabola back onto the ground, then a short slide
    if (t > TRY3.hit && t <= TRY3.land) {
      c.x = X3 - BOUNCE.vx * (t - TRY3.hit);
      c.lift = ballistic(t, TRY3.hit, TRY3.land, 0, LIE);
    } else if (t > TRY3.land && t <= TRY3.rest) c.x = decelerate(t, TRY3.land, LAND_X, -BOUNCE.vx, BOUNCE.slide);
    // lying dazed: the head lifts when the door swings open
    if (t > UP.head && t < UP.rise) c.pose = { ...c.pose, head: -34 };
  },
};

// ═══════════════════════ Newt: one finger, far from the hinge ═══════════════════════
const newtScript: Script = {
  scale: NEWT_SCALE,
  seed: 3,
  x: [
    [0, NEWT_X0],
    [ARRIVE + 0.4, NEWT_WATCH_X, "lin"],
    [OPEN.walk, NEWT_WATCH_X],
    [OPEN.finger - 0.1, NEWT_PUSH_X, "lin"],
    [BACK.walk, NEWT_PUSH_X],
    [BACK.at, NEWT_WATCH_X, "lin"],
    [AGAIN.walk, NEWT_WATCH_X],
    [AGAIN.finger - 0.1, NEWT_PUSH_X, "lin"],
  ],
  lift: [[0, 0]],
  sy: [[0, 1]],
  facing: [
    [0, 1],
    [ARRIVE + 0.6, -1], // turns to watch Dash
    [OPEN.finger - 0.1, 1],
    [BACK.at + 0.1, -1],
    [AGAIN.finger - 0.1, 1],
    [THUMB + 0.3, -1],
  ],
  gait: [
    [0, "walk"],
    [ARRIVE + 0.4, "none"],
    [OPEN.walk, "walk"],
    [OPEN.finger - 0.1, "none"],
    [BACK.walk, "walk"],
    [BACK.at, "none"],
    [AGAIN.walk, "walk"],
    [AGAIN.finger - 0.1, "none"],
  ],
  pose: [
    [0, "stand"],
    [TRY2.push + 0.7, "tap", 0.3],
    [TRY3.back, "stand", 0.3],
    [TRY3.hit + 0.12, "facepalm", 0.18],
    [LOOK.at - 0.35, "stand", 0.3],
    [LOOK.at, "thumbMeasure", 0.3],
    [LOOK.end - 0.4, "stand", 0.3],
    [OPEN.finger, "point", 0.3],
    [OPEN.push + SWING.push, "stand", 0.4],
    [BACK.at + 0.2, "offer", 0.35],
    [UP.go, "stand", 0.2],
    [AGAIN.palm, "facepalm", 0.2],
    [AGAIN.walk, "stand", 0.3],
    [AGAIN.finger, "point", 0.3],
    [AGAIN.push + SWING.push, "stand", 0.4],
    [THUMB + 0.5, "thumbsUp", 0.25, "back"],
  ],
  faceX: [
    [0, 0.3],
    [ARRIVE + 0.6, 0.5],
    [THUMB, 0.5],
  ],
  lookY: [[0, 0]],
  face: [
    [0, "kidHappy"],
    [TRY1.push + 0.9, "kidCurious"],
    [TRY2.push + 0.6, "kidDeadpan"],
    [TRY3.set, "kidConcern"],
    [TRY3.hit, "kidWorried"],
    [TRY3.hit + 0.12, "kidDeadpan"],
    [LOOK.at - 0.35, "kidFocus"],
    [LOOK.end - 0.4, "kidSmile"],
    [OPEN.push + SWING.push, "kidHappy"],
    [UP.go, "kidWorried"],
    [SLAM, "kidWow"],
    [AGAIN.palm, "kidDeadpan"],
    [AGAIN.finger, "kidSmile"],
    [FALL.land, "kidConcern"],
    [THUMB + 0.5, "kidJoy"],
  ],
  aHand: [
    [0, "fist"],
    [LOOK.at, "thumb"],
    [LOOK.end - 0.4, "fist"],
    [OPEN.finger, "point"],
    [OPEN.push + SWING.push, "fist"],
    [BACK.at + 0.2, "open"],
    [AGAIN.finger, "point"],
    [AGAIN.push + SWING.push, "fist"],
    [THUMB + 0.5, "thumb"],
  ],
  bHand: [[0, "fist"]],
  extras: () => ({ partyHat: true, blush: true }),
  tweak: (t, c) => {
    // the impatient foot tap while Dash strains
    if (t > TRY2.push + 1.0 && t < TRY3.back) c.pose = { ...c.pose, aH: 30 - 9 * Math.max(0, Math.sin(t * 11)) };
  },
};

export type Placed = { c: CharState; z: number; turn: number };
/** Dash at time t: state, lane (m toward the camera) and how far his body is turned to the camera */
export const dashAt = (t: number): Placed => ({
  c: build(dashScript, t),
  z: num(t, [[0, LANE.dashHinge], [UP.rise, LANE.dashHinge], [UP.stand, LANE.dashMid, "io"]]),
  turn: num(t, [[0, 28], [ARRIVE - 0.4, 28], [ARRIVE, 0], [TRY1.give, 0], [TRY1.give + 0.3, 30], [TRY2.hand - 0.3, 30], [TRY2.hand, 0], [UP.stand, 0], [UP.proud, 42], [UP.go, 42], [UP.go + 0.15, 0]]),
});
export const newtAt = (t: number): Placed => ({
  c: build(newtScript, t),
  z: num(t, [[0, LANE.newtWatch], [OPEN.walk, LANE.newtWatch], [OPEN.finger - 0.1, LANE.newtEdge, "lin"], [BACK.walk, LANE.newtEdge], [BACK.at, LANE.newtWatch, "lin"], [AGAIN.walk, LANE.newtWatch], [AGAIN.finger - 0.1, LANE.newtEdge, "lin"]]),
  turn: num(t, [[0, 38], [OPEN.finger - 0.3, 38], [OPEN.finger, 4], [BACK.walk, 4], [BACK.walk + 0.3, 38], [AGAIN.finger - 0.3, 38], [AGAIN.finger, 4], [THUMB, 4], [THUMB + 0.3, 40]]),
});
