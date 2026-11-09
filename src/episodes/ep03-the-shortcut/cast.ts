import { num } from "../../lib/kf";
import { GROUND, solve, toWorld } from "../../rig/Stickman";
import type { CharState } from "../../rig/types";
import { build, type Script } from "../../rig/script";
import { ballistic, damped, decelerate, dropTime, G, particle, stopTime } from "./physics";
import type { BullState } from "./props";
import {
  AIR_SPIN,
  BARREL_H,
  BULL_AFTER_V,
  BULL_BRAKE,
  BULL_RETURN,
  CHARGE_T,
  CLIMB,
  CONE_HANDOFF,
  DRIP,
  DROP,
  FENCE_TOP,
  FINAL_ROT,
  FLEE,
  FLOAT_LIFT,
  HOP1,
  HOP2,
  IMPACT_T,
  IMPACT_X,
  JUMP,
  K,
  KID_FINALE_X,
  LAND_T,
  LAND_X,
  LAUNCH,
  LICK,
  OFFER_T,
  ROLL_DECEL,
  ROLL_R,
  ROLL_STOP_T,
  ROLL_STOP_X,
  RUNUP,
  SLIDE_T,
  SNAP,
} from "./timeline";

const ROLL_LIFT = 82; // tucked: hips ride ROLL_R above the ground
const LIE_LIFT = -147; // flat on the ground
const CRAWL_LIFT = 20; // hands and knees: hips one thigh-length up

// ───────────────────────── Fork (intro) ─────────────────────────
const heroIntro: Script = {
  scale: 1,
  seed: 0,
  x: [
    [0, -260],
    [1.2, 300, "out"],
    [3.3, 300],
    [4.0, 820, "in"],
  ],
  lift: [[0, 0]],
  sy: [[0, 1]],
  facing: [[0, 1]],
  gait: [
    [0, "walk"],
    [1.2, "none"],
    [3.3, "run"],
  ],
  pose: [
    [0, "stand"],
    [1.25, "stand"],
    [2.65, "smugPoint", 0.15, "back"],
    [3.0, "rub", 0.15],
    [3.3, "stand", 0.1],
  ],
  faceX: [
    [0, 1],
    [2.6, 1],
    [2.7, 0, "out"],
    [3.25, 0],
    [3.35, 1, "out"],
  ],
  lookY: [
    [0, 0],
    [1.25, -0.6],
    [2.6, 0],
  ],
  face: [
    [0, "happy"],
    [1.3, "curious"],
    [2.2, "mischief"],
    [2.65, "cocky"],
    [3.0, "mischief"],
    [3.3, "determined"],
  ],
  aHand: [
    [0, "none"],
    [2.65, "point"],
    [3.0, "none"],
  ],
  bHand: [[0, "none"]],
  extras: () => ({ scarf: true }),
  tweak: (t, c) => {
    if (t > 3.0 && t < 3.3) c.pose.aE += Math.sin(t * 50) * 12; // rubbing hands
  },
};

const kidIntro: Script = {
  scale: 0.72,
  seed: 1.7,
  x: [
    [0, -120],
    [1.15, 470, "out"],
    [3.15, 470],
    [4.0, 1150, "in"],
  ],
  lift: [[0, 0]],
  sy: [[0, 1]],
  facing: [[0, 1]],
  gait: [
    [0, "walk"],
    [1.15, "none"],
    [3.15, "skip"],
  ],
  pose: [
    [0, "stand"],
    [2.3, "point", 0.15, "back"],
    [2.75, "stand", 0.12],
    [2.85, "shrug", 0.15, "back"],
    [3.15, "stand", 0.1],
  ],
  faceX: [
    [0, 1],
    [2.75, 1],
    [2.85, -0.8, "out"],
    [3.05, -0.8],
    [3.15, 1, "out"],
  ],
  lookY: [
    [0, 0],
    [1.25, -0.6],
    [2.3, -0.3],
    [2.85, 0],
  ],
  face: [
    [0, "kidHappy"],
    [2.85, "kidDeadpan"],
    [3.15, "kidHappy"],
  ],
  aHand: [
    [0, "none"],
    [2.3, "point"],
    [2.75, "open"],
    [3.15, "none"],
  ],
  bHand: [
    [0, "none"],
    [2.85, "open"],
    [3.15, "none"],
  ],
  extras: () => ({ partyHat: true, blush: true }),
};

// ───────────── Hero on the shortcut (world H), through to the finale ─────────────
const heroRace: Script = {
  scale: 1,
  seed: 0,
  x: [
    [4.0, 420],
    [CLIMB.t0, CLIMB.x0, "out"],
    [CLIMB.t1, CLIMB.x1, "io"],
    [DROP.t1, DROP.x1, "lin"],
    [5.35, DROP.x1],
    [5.85, 880, "in"],
    [SNAP.t0, SNAP.x0, "out"],
    [SNAP.t1, SNAP.x1, "lin"],
    [7.5, SNAP.x1],
    [7.9, 670, "io"],
    [8.3, 670],
    [9.1, 1060, "io"],
    [10.3, 1360, "lin"],
    [10.6, HOP1.x, "out"],
    [HOP2.t0, HOP2.x0],
    [HOP2.t1, HOP2.x1, "lin"],
    [13.0, HOP2.x1],
    [13.8, 1960, "io"],
    [14.4, 1960],
    [15.0, RUNUP.x0, "io"],
    [RUNUP.t0, RUNUP.x0],
    [RUNUP.t1, RUNUP.x1, "lin"],
    [JUMP.t1, JUMP.x1, "lin"],
    [16.25, JUMP.x1 + 18, "out"],
    [16.7, 2195, "io"],
    [17.2, 2222, "lin"],
    [17.7, 2185, "out"],
    [19.0, 2318, "io"],
    [19.6, 2365, "io"],
    [20.3, 2365],
    [21.1, 2700, "lin"],
    [22.45, FLEE.x0, "lin"],
    [FLEE.t0, FLEE.x0],
    [FLEE.accelEnd, FLEE.x1, "in"],
    [IMPACT_T, IMPACT_X, "lin"],
    [LAND_T, LAND_X, "lin"],
    [ROLL_STOP_T, ROLL_STOP_X, "out"],
    [31.9, ROLL_STOP_X],
    [32.4, 6600, "io"],
  ],
  lift: [
    [4.0, 0],
    [CLIMB.t0, 0],
    [CLIMB.t1, FENCE_TOP, "io"],
    [DROP.t1, 0, "in"],
    [10.35, 0],
    [10.6, BARREL_H, "in"],
    [HOP2.t1, 0],
    [JUMP.t0, 0],
    [JUMP.t1, -60],
    [16.45, FLOAT_LIFT, "out"],
    [19.0, FLOAT_LIFT],
    [19.6, 0, "io"],
    [IMPACT_T, 0],
    [LAND_T, ROLL_LIFT],
    [ROLL_STOP_T, ROLL_LIFT],
    [ROLL_STOP_T + 0.2, LIE_LIFT, "in"],
    [27.9, LIE_LIFT],
    [28.15, CRAWL_LIFT, "out"],
    [28.75, 0],
  ],
  rot: [
    [0, 0],
    [IMPACT_T, 0],
    [ROLL_STOP_T, FINAL_ROT],
    [28.15, FINAL_ROT],
    [28.45, FINAL_ROT - 90, "io"],
  ],
  sy: [
    [0, 1],
    [DROP.t1 - 0.02, 1],
    [DROP.t1 + 0.03, 0.85, "out"],
    [DROP.t1 + 0.2, 1, "io"],
    [SNAP.t1 - 0.02, 1],
    [SNAP.t1 + 0.03, 0.88, "out"],
    [SNAP.t1 + 0.2, 1, "io"],
    [HOP2.t1 - 0.02, 1],
    [HOP2.t1 + 0.03, 0.84, "out"],
    [HOP2.t1 + 0.2, 1, "io"],
  ],
  facing: [
    [0, 1],
    [7.45, -1],
    [8.25, 1],
    [32.45, -1],
  ],
  gait: [
    [4.0, "run"],
    [CLIMB.t0, "none"],
    [5.35, "run"],
    [SNAP.t0, "none"],
    [7.5, "walk"],
    [7.9, "none"],
    [8.3, "run"],
    [9.1, "tiptoe"],
    [10.3, "none"],
    [13.0, "run"],
    [13.8, "none"],
    [14.4, "walkLegs"],
    [15.0, "none"],
    [RUNUP.t0, "runLegs"],
    [RUNUP.t1, "none"],
    [20.3, "walk"],
    [21.1, "tiptoe"],
    [22.45, "none"],
    [FLEE.t0, "run"],
    [IMPACT_T, "none"],
    [31.9, "run"],
    [32.4, "none"],
  ],
  pose: [
    [4.0, "stand"],
    [CLIMB.t0, "climbRail", 0.2],
    [CLIMB.t1, "flail", 0.1],
    [DROP.t1 - 0.04, "landSquat", 0.06, "snap"],
    [5.35, "stand", 0.15],
    [SNAP.t0, "flail", 0.08],
    [SNAP.t1 - 0.05, "sitGround", 0.08],
    [7.3, "stand", 0.25],
    [7.9, "jab", 0.15],
    [8.2, "stand", 0.15],
    [9.1, "oneFoot", 0.2],
    [10.3, "stand", 0.1],
    [10.35, "recoil", 0.08, "snap"],
    [10.48, "sitGround", 0.1, "in"],
    [HOP1.t0, "flail", 0.06],
    [HOP1.t1 - 0.05, "sitGround", 0.05],
    [HOP2.t0, "tuck", 0.12],
    [HOP2.t1 - 0.05, "landSquat", 0.06],
    [12.55, "pluck", 0.2],
    [13.0, "stand", 0.1],
    [RUNUP.t1, "leap", 0.08],
    [JUMP.t1, "flail", 0.08],
    [16.6, "swim", 0.15],
    [17.25, "flail", 0.06],
    [17.7, "swim", 0.12],
    [19.0, "climb", 0.15],
    [19.6, "shakeOff", 0.1],
    [20.3, "stand", 0.15],
    [21.1, "oneFoot", 0.2],
    [FLEE.t0, "stand", 0.1],
    [IMPACT_T, "flail", 0.05, "snap"],
    [IMPACT_T + 0.2, "tuck", 0.3],
    [ROLL_STOP_T, "lie", 0.2],
    [27.9, "crawl", 0.25, "io"],
    [28.15, "kneel", 0.3, "io"],
    [28.45, "stand", 0.3, "out"],
    [OFFER_T + 0.15, "offer", 0.2],
    [29.95, "stand", 0.3],
    [34.3, "laugh", 0.2, "back"],
  ],
  faceX: [
    [4.0, 1],
    [6.95, 1],
    [7.05, -0.9, "out"],
    [7.4, -0.9],
    [7.5, 1, "out"],
    [9.1, 0.8],
    [10.3, 1],
    [10.6, 0, "out"],
    [12.5, 0],
    [12.6, -0.6, "out"],
    [12.95, -0.6],
    [13.05, 1, "out"],
    [14.15, 1],
    [14.25, 0, "out"],
    [14.35, 0],
    [14.45, 0.6, "out"],
    [15.0, 1],
    [JUMP.t1, 0],
    [16.6, 1],
    [19.6, 0],
    [20.3, 1],
    [23.25, 1],
    [23.35, -0.9, "out"],
    [24.0, -0.9],
    [24.1, 1, "out"],
    [IMPACT_T, 0],
    [28.6, 0],
    [28.7, 1, "out"],
    [30.8, 1],
    [30.9, 0, "out"],
    [31.25, 0],
    [31.35, 1, "out"],
    [34.25, 1],
    [34.4, 0, "out"],
  ],
  lookY: [
    [4.0, 0],
    [9.1, 0.4],
    [10.3, 0],
    [12.55, 0.6],
    [13.0, 0],
    [13.85, 1],
    [14.2, 0],
    [23.3, 0.8],
    [24.05, 0],
    [28.7, 0.5],
    [29.5, 1],
    [30.9, 0],
    [33.0, 0.7],
    [34.2, 0],
  ],
  face: [
    [4.0, "determined"],
    [5.3, "cocky"],
    [SNAP.t0, "shocked"],
    [SNAP.t1, "ow"],
    [7.0, "annoyed"],
    [8.3, "determined"],
    [9.1, "sneaky"],
    [10.3, "surprised"],
    [10.55, "ow"],
    [10.9, "horror"],
    [HOP1.t1, "ow"],
    [HOP2.t0, "determined"],
    [HOP2.t1, "ow"],
    [12.55, "annoyed"],
    [13.0, "determined"],
    [13.85, "curious"],
    [14.2, "cocky"],
    [RUNUP.t0, "determined"],
    [15.7, "uhoh"],
    [JUMP.t1, "squashed"],
    [16.6, "determined"],
    [17.25, "ow"],
    [17.7, "jealous"],
    [19.0, "soggy"],
    [21.1, "sneaky"],
    [22.95, "uhoh"],
    [23.5, "sheepish"],
    [FLEE.t0, "horror"],
    [IMPACT_T, "scream"],
    [ROLL_STOP_T, "squashed"],
    [27.9, "dazed"],
    [28.6, "soggy"],
    [28.9, "longing"],
    [SLIDE_T + 0.05, "shocked"],
    [30.3, "deadpan"],
    [31.0, "unimpressed"],
    [31.85, "horror"],
    [32.6, "sheepish"],
    [33.2, "confused"],
    [34.3, "laughing"],
  ],
  aHand: [
    [4.0, "none"],
    [CLIMB.t0, "open"],
    [5.35, "none"],
    [SNAP.t0, "open"],
    [SNAP.t1, "none"],
    [7.9, "point"],
    [8.2, "none"],
    [12.55, "open"],
    [13.0, "none"],
    [16.6, "open"],
    [20.3, "none"],
    [IMPACT_T, "open"],
    [IMPACT_T + 0.2, "none"],
    [OFFER_T + 0.15, "open"],
    [29.95, "none"],
  ],
  bHand: [
    [4.0, "none"],
    [SNAP.t0, "open"],
    [SNAP.t1, "none"],
    [16.6, "open"],
    [20.3, "none"],
  ],
  extras: (t) => ({
    scarf: true,
    // the scarf tail snags the nail on the way down from the rail; he unhooks it at 8.2
    scarfTails: !(t > DROP.t0 + 0.05 && t < 8.2),
    wet: t >= JUMP.t1,
    needles: t >= 10.55,
  }),
  tweak: (t, c) => {
    const p = c.pose;
    // ── every airborne moment is a true parabola under the same gravity ──
    if (t > DROP.t0 && t < DROP.t1) c.lift = ballistic(t, DROP.t0, DROP.t1, FENCE_TOP, 0);
    if (t > SNAP.t0 && t < SNAP.t1) c.lift = ballistic(t, SNAP.t0, SNAP.t1, 0, 0);
    if (t > HOP1.t0 && t < HOP1.t1) c.lift = ballistic(t, HOP1.t0, HOP1.t1, BARREL_H, BARREL_H);
    if (t > HOP2.t0 && t < HOP2.t1) c.lift = ballistic(t, HOP2.t0, HOP2.t1, BARREL_H, 0);
    if (t > JUMP.t0 && t < JUMP.t1) c.lift = ballistic(t, JUMP.t0, JUMP.t1, 0, -60);
    // buoyancy: bobs and settles at the waterline
    if (t >= 16.45 && t < 19.0) c.lift = FLOAT_LIFT + damped(t - 16.45, 24, 0.9, 1.1) + Math.sin(t * 9) * 3;
    // swimming: arms windmill in opposite phase
    if ((t > 16.6 && t < 17.25) || (t > 17.7 && t < 19.0)) {
      const k = t > 17.7 ? 11 : 8; // swims harder after the fish
      p.aS = 90 + 110 * Math.sin(t * k);
      p.bS = 90 + 110 * Math.sin(t * k + Math.PI);
      p.head += Math.sin(t * k * 2) * 4;
    }
    // the fish smacks his head backward
    if (t > 17.25 && t < 17.6) p.head -= 25 * (1 - (t - 17.25) / 0.35);
    // dog-style shake: water flies off
    if (t > 19.6 && t < 20.3) {
      p.head += Math.sin(t * 45) * 18;
      p.lean += Math.sin(t * 45 + 1) * 8;
    }
    // balancing on one foot so the drip doesn't fall... (it does)
    if (t > 22.45 && t < FLEE.t0) p.lean += Math.sin(t * 6) * 3;
    // launched: parabola + constant spin (angular momentum is conserved)
    if (t > IMPACT_T && t < LAND_T) {
      c.lift = ballistic(t, IMPACT_T, LAND_T, 0, ROLL_LIFT);
      c.rot = (AIR_SPIN * (t - IMPACT_T)) / LAUNCH.T;
    }
    // rolling without slipping, slowed by friction
    if (t >= LAND_T && t < ROLL_STOP_T) {
      c.x = decelerate(t, LAND_T, LAND_X, LAUNCH.vx, ROLL_DECEL);
      c.rot = AIR_SPIN + ((c.x - LAND_X) / ROLL_R) * (180 / Math.PI);
      c.lift = ROLL_LIFT;
    }
    if (t > 28.45 && t < 29.0) p.lean += Math.sin(t * 9) * 5; // wobbly after the tumble
    if (t > 34.3) {
      p.lean += Math.sin(t * 22) * 3; // shoulders shaking with laughter
    }
  },
};

// ───────────────── Kid on the path (world K) ─────────────────
const kidRace: Script = {
  scale: 0.72,
  seed: 1.7,
  x: [
    [4.0, K.start],
    [17.0, 3500, "lin"],
    [20.0, 4000, "lin"],
    [25.0, K.stop, "lin"],
  ],
  lift: [[0, 0]],
  sy: [
    [0, 1],
    [CONE_HANDOFF + 0.05, 1],
    [CONE_HANDOFF + 0.12, 0.85, "out"],
    [CONE_HANDOFF + 0.25, 1.1, "out"],
    [CONE_HANDOFF + 0.4, 1, "io"],
  ],
  facing: [[0, 1]],
  gait: [
    [4.0, "walk"],
    [11.85, "walkLegs"],
    [12.7, "walk"],
    [17.0, "tiptoe"],
    [20.0, "skip"],
    [25.0, "none"],
  ],
  pose: [
    [4.0, "stand"],
    [11.9, "point", 0.15, "back"],
    [12.6, "stand", 0.15],
    [17.0, "shh", 0.2],
    [20.0, "stand", 0.15],
    [25.0, "stand", 0.15],
    [25.12, "reachUp", 0.2],
    [CONE_HANDOFF, "cheer", 0.15, "back"],
    [25.95, "lickCone", 0.2],
  ],
  faceX: [
    [4.0, 1],
    [11.85, 1],
    [11.95, 0.6, "out"],
    [12.6, 1],
    [17.0, 0.3],
    [20.0, 1],
    [CONE_HANDOFF, 0],
    [25.95, 0.5],
  ],
  lookY: [
    [4.0, 0],
    [11.9, 0.8],
    [12.6, 0],
    [25.1, -0.7],
    [CONE_HANDOFF, 0],
  ],
  face: [
    [4.0, "kidHappy"],
    [11.9, "kidJoy"],
    [12.6, "kidHappy"],
    [20.0, "kidJoy"],
    [25.0, "kidWow"],
    [CONE_HANDOFF, "kidJoy"],
    [25.95, "kidHappy"],
  ],
  aHand: [
    [4.0, "none"],
    [11.9, "point"],
    [12.6, "none"],
    [17.0, "point"],
    [20.0, "none"],
    [25.12, "open"],
    [CONE_HANDOFF, "none"],
  ],
  bHand: [[0, "none"]],
  extras: (t) => ({ partyHat: true, blush: true, cone: t >= CONE_HANDOFF ? 1 : 0 }),
};

// ───────────────── Kid waiting at the truck (world H, finale) ─────────────────
const kidFinale: Script = {
  scale: 0.72,
  seed: 1.7,
  x: [[0, KID_FINALE_X]],
  lift: [[0, 0]],
  sy: [[0, 1]],
  facing: [[0, -1]],
  gait: [[0, "none"]],
  pose: [
    [0, "lickCone"],
    [26.6, "stand", 0.15],
    [27.0, "recoil", 0.12, "snap"],
    [27.5, "stand", 0.2],
    // the arm swings out and stops dead at SLIDE_T
    [OFFER_T, "offer", SLIDE_T - OFFER_T, "lin"],
    [30.2, "stand", 0.3],
    [34.3, "laugh", 0.2, "back"],
  ],
  faceX: [
    [0, 0.4],
    [26.55, 0.4],
    [26.65, 1, "out"],
    [31.25, 1],
    [31.35, -0.8, "out"],
    [31.9, -0.8],
    [32.0, 1, "out"],
    [34.15, 1],
    [34.25, -1, "out"],
    [34.4, 0, "out"],
  ],
  lookY: [
    [0, 0],
    [27.5, 0.8],
    [28.9, 0],
    [29.5, 1],
    [30.9, 0],
    [33.0, 0.7],
    [34.2, 0],
  ],
  face: [
    [0, "kidHappy"],
    [26.6, "kidCurious"],
    [27.0, "kidWow"],
    [27.5, "kidConcern"],
    [28.9, "kidSmile"],
    [SLIDE_T + 0.05, "kidWow"],
    [30.2, "kidSad"],
    [31.3, "kidDeadpan"],
    [33.0, "kidCurious"],
    [34.3, "kidJoy"],
  ],
  aHand: [[0, "none"]],
  bHand: [[0, "none"]],
  extras: (t) => ({ partyHat: true, blush: true, cone: t < SLIDE_T ? 1 : 0.5 }),
  tweak: (t, c) => {
    if (t > 34.3) c.pose.lean += Math.sin(t * 24) * 3;
  },
};

export const heroIntroAt = (t: number) => build(heroIntro, t);
export const kidIntroAt = (t: number) => build(kidIntro, t);
export const heroAt = (t: number) => build(heroRace, t);
export const kidRaceAt = (t: number) => build(kidRace, t);
export const kidFinaleAt = (t: number) => build(kidFinale, t);

// ───────────────── Derived physical events ─────────────────
const handTip = (c: CharState, dy: number) => {
  const j = solve(c.pose, c.aLen ?? 1);
  return toWorld(c, { x: j.aHand.x, y: j.aHand.y + dy });
};
export const coneTop = (c: CharState) => handTip(c, -20);
export const coneTip = (c: CharState) => handTip(c, 30);

// Where the drop leaves the soaked scarf (tail end hangs straight down when wet)
export const scarfTailEnd = (c: CharState) => {
  const j = solve(c.pose, c.aLen ?? 1);
  return toWorld(c, { x: j.neck.x - 4 - 78 * 0.45, y: j.neck.y + 4 + 78 });
};
export const DRIP_FROM = scarfTailEnd(heroAt(DRIP.t));
// The sleeping bull lies one lane back (raised, slightly smaller); it steps
// into the hero's lane as it stands up to charge.
export const BULL_LANE = { lift: 30, scale: 0.92 };
const NOSE_TOP_Y = GROUND - BULL_LANE.lift - 62 * BULL_LANE.scale; // sleeping bull's snout
export const DRIP_HIT_T = DRIP.t + dropTime(NOSE_TOP_Y - DRIP_FROM.y);
// The bull lies exactly where the drip lands.
export const BULL_NOSE_X = DRIP_FROM.x;

// Bull's charge: uniform acceleration chosen so it reaches him at IMPACT_T.
const CHARGE_A = (2 * (IMPACT_X - BULL_NOSE_X)) / (IMPACT_T - CHARGE_T) ** 2;
export const BULL_STOP_T = IMPACT_T + stopTime(BULL_AFTER_V, BULL_BRAKE);
const bullStopX = decelerate(BULL_STOP_T, IMPACT_T, IMPACT_X, BULL_AFTER_V, BULL_BRAKE);

// The scoop leaves the cone with the hand's velocity at the moment the arm stops.
const scoop0 = coneTop(kidFinaleAt(SLIDE_T));
const scoopPrev = coneTop(kidFinaleAt(SLIDE_T - 0.02));
const scoopV = { x: (scoop0.x - scoopPrev.x) / 0.02, y: (scoop0.y - scoopPrev.y) / 0.02 };
const scoopFloor = GROUND - 10;
const scoopFallT = (-scoopV.y + Math.sqrt(scoopV.y ** 2 + 2 * G * (scoopFloor - scoop0.y))) / G;
export const SPLAT_T = SLIDE_T + scoopFallT;
export const SPLAT_X = scoop0.x + scoopV.x * scoopFallT;
export const scoopAt = (t: number) => particle(Math.min(t - SLIDE_T, scoopFallT), scoop0.x, scoop0.y, scoopV.x, scoopV.y);

// Bull trots over to the puddle and licks it
const LICK_NOSE_X = SPLAT_X - 6;

export const bullAt = (t: number): BullState => {
  let nose = BULL_NOSE_X;
  let run = 0;
  if (t >= CHARGE_T && t < IMPACT_T) {
    const tau = t - CHARGE_T;
    nose = BULL_NOSE_X + 0.5 * CHARGE_A * tau * tau;
    run = (nose - BULL_NOSE_X) / 55;
  } else if (t >= IMPACT_T) {
    nose = decelerate(t, IMPACT_T, IMPACT_X, BULL_AFTER_V, BULL_BRAKE);
    run = t < BULL_STOP_T ? (nose - BULL_NOSE_X) / 55 : 0;
    if (t > 29.0) {
      nose = num(t, [
        [29.0, bullStopX],
        [LICK.t0, LICK_NOSE_X, "lin"],
      ]);
      run = t < LICK.t0 ? nose / 70 : 0;
    }
  }
  const stand = num(t, [
    [23.8, 0],
    [24.2, 1, "out"],
  ]);
  const eyes: BullState["eyes"] =
    t < 23.1 ? "closed" : t < 23.6 ? "open" : t < BULL_STOP_T ? "angry" : t < 27.0 ? "dazed" : t < LICK.t0 ? "open" : "happy";
  const headDown = Math.max(
    num(t, [
      [CHARGE_T - 0.1, 0],
      [CHARGE_T + 0.1, 1],
      [IMPACT_T + 0.1, 1],
      [IMPACT_T + 0.4, 0],
    ]),
    num(t, [
      [LICK.t0 - 0.2, 0],
      [LICK.t0, 1],
      [LICK.t1, 1],
      [LICK.t1 + 0.3, 0.3],
    ]),
  );
  const tongue = t > LICK.t0 && t < LICK.t1 ? Math.max(0, Math.sin((t - LICK.t0) * 22)) : 0;
  const paw = t > 24.0 && t < CHARGE_T ? (t - 24.0) * 22 : 0;
  return { nose, facing: 1, stand, run, eyes, headDown, tongue, paw };
};

export { BULL_RETURN };
