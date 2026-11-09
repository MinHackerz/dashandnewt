import { build, type Script } from "../../rig/script";
import { GROUND, HEAD_R, HEAD_SCALE, solve, toWorld } from "../../rig/Stickman";
import type { CharState } from "../../rig/types";
import { ease, type NumKey } from "../../lib/kf";
import { reach } from "../../rig2d/ik";
import {
  AX,
  BANG,
  DASH_EYE,
  DASH_X,
  DRIFT,
  FIRE,
  GRAB,
  groundY,
  GUN_ROCK,
  HEART,
  HOARSE,
  HORIZON,
  KIT,
  LOOK1,
  LOOK2,
  LOOK3,
  NEWT_SCALE,
  NEWT_X,
  NIGHT1,
  NIGHT2,
  OUT_D,
  OUT_N,
  OVER1,
  OVER2,
  OVER3,
  PALM1_X,
  PALM2,
  PX_PER_M,
  REALIZE,
  REEF,
  RING,
  ROCK,
  ROCKW,
  SHOUT1,
  SHOUT2,
  SHOUT3,
  sOf,
  TALLY1,
  TILT_DEG,
  TINK,
  WRECK_X,
  Z,
  BURST,
} from "./timeline";

type P = { x: number; y: number };
const px = (m: number) => m * PX_PER_M;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const K0 = KIT.cut;
export const DOOR_X = WRECK_X - 260; // the wreck's door (lane px, in the wreck's lane)
export const FLOOR = px(0.55); // cabin floor above the sand

/** a world point → the lane-Z character's own (lane 0) space, so IK can reach across depth */
export const toLane = (p: P, Zc: number): P => {
  const s = sOf(Zc);
  return { x: AX + (p.x - AX) / s, y: GROUND + (p.y - groundY(Zc)) / s };
};
/** a point in lane Zc's space → world */
export const fromLane = (p: P, Zc: number): P => {
  const s = sOf(Zc);
  return { x: AX + (p.x - AX) * s, y: groundY(Zc) + (p.y - GROUND) * s };
};
export const handOf = (c: CharState, side: "a" | "b" = "a") => toWorld(c, solve(c.pose)[side === "a" ? "aHand" : "bHand"]);
export const headOf = (c: CharState) => toWorld(c, solve(c.pose).head);
export const headTopOf = (c: CharState) => {
  const h = headOf(c);
  return { x: h.x, y: h.y - HEAD_R * HEAD_SCALE * c.scale };
};
/** the flare gun's resting spot: on top of the rock (world) */
export const GUN_ON_ROCK = (() => {
  const s = sOf(Z.rock);
  return { x: AX + (ROCK.x + 20 - AX) * s, y: groundY(Z.rock) - px(ROCK.h) * s - 8 };
})();

// ── Which depth lane each of them is in (hard cuts move them between set-ups) ──
const inR = (t: number, a: number, b: number) => t >= a && t < b;
export const dashZ = (t: number) => {
  if (t < K0) return Z.wreck - 0.05;
  if (inR(t, SHOUT2.a, OVER2.a)) return Z.palm2 - 0.05;
  if (inR(t, SHOUT3.a, OVER3.a)) return Z.rock - 0.05;
  return Z.dash;
};
export const newtZ = (t: number) => {
  if (t < K0) return Z.wreck - 0.1;
  if (inR(t, TALLY1.a, TALLY1.b) || inR(t, HEART.a + 0.3, HEART.walk)) return 1.0;
  if (inR(t, SHOUT1.a, OVER1.a) || inR(t, SHOUT2.a, OVER2.a) || inR(t, SHOUT3.a, OVER3.a)) return 5.0;
  return Z.newt;
};
export const isNight = (t: number) => inR(t, NIGHT1.a, NIGHT1.b) || inR(t, NIGHT2.a, NIGHT2.b);
/** days on the island so far (the stubble grows) */
export const dayOf = (t: number) => (t < NIGHT1.a ? 1 : t < NIGHT2.a ? 2 : t < OVER3.day ? 3 : 5);

/** keyframes with hard cuts: an entry marked "cut" jumps there instead of moving there */
type CK = readonly [number, number, ("cut" | NumKey[2])?];
const cutKeys = (keys: readonly CK[]): NumKey[] => {
  const out: NumKey[] = [];
  keys.forEach(([t, v, e], i) => {
    if (e === "cut" && i > 0) out.push([t - 1e-3, out[out.length - 1][1], "lin"]);
    out.push(e === "cut" ? [t, v, "lin"] : [t, v, e]);
  });
  return out;
};

// ═══════════════════════ Dash: serious tourist, serious castaway ═══════════════════════
const D_HOME = DASH_X;
const D_PALM = PALM2.x - 70;
const heroScript: Script = {
  scale: 1,
  seed: 0,
  x: cutKeys([
    [0, DOOR_X],
    [OUT_D.a, DOOR_X],
    [OUT_D.b, DOOR_X + 150, "out"],
    [K0, D_HOME, "cut"],
    [SHOUT2.a, D_PALM, "cut"],
    [OVER2.a, D_HOME, "cut"],
    [SHOUT3.a, ROCK.x - 10, "cut"],
    [OVER3.a, D_HOME, "cut"],
    [GRAB.a, D_HOME],
    [GRAB.take - 0.15, D_HOME - 60, "io"],
    [GRAB.up, D_HOME, "io"],
    [HEART.walk, D_HOME],
    [HEART.sit, D_HOME - 30],
  ]),
  lift: cutKeys([
    [0, FLOOR],
    [OUT_D.a, FLOOR],
    [OUT_D.b, 0, "in"],
    [K0, 0],
    [SHOUT2.a, px(PALM2.h - 1.5), "cut"],
    [OVER2.a, 0, "cut"],
    [SHOUT3.a, px(ROCK.h), "cut"],
    [OVER3.a, 0, "cut"],
  ]),
  sy: [
    [0, 1],
    [OUT_D.b - 0.02, 1],
    [OUT_D.b + 0.05, 0.88, "snap"],
    [OUT_D.b + 0.3, 1, "back"],
    [HOARSE.a, 1],
    [HOARSE.a + 0.4, 0.94],
  ],
  facing: [
    [0, 1],
    [K0, -1],
    [DASH_EYE.a, -1],
    [SHOUT1.a, 1],
    [NIGHT1.a, -1],
    [SHOUT2.a, 1],
    [NIGHT2.a, -1],
    [SHOUT3.a, 1],
    [OVER3.a, 1],
    [ROCKW.a, 1],
    [GRAB.a, -1],
    [GRAB.up, 1],
    [RING.bump + 0.5, -1],
    [HEART.a, -1],
  ],
  gait: [[0, "none"]],
  pose: [
    [0, "stand"],
    [OUT_D.a, "landSquat", 0.1],
    [OUT_D.b + 0.25, "dazed", 0.3],
    [K0, "dazed"],
    [K0 + 1.4, "stand", 0.4],
    [DASH_EYE.a, "lean", 0.3],
    [SHOUT1.a, "stand"],
    [SHOUT1.a + 0.15, "shoutCup", 0.3],
    [SHOUT1.end - 0.3, "stand", 0.3],
    [NIGHT1.a, "sitHug"],
    [SHOUT2.a, "palmShout"],
    [NIGHT2.a, "sitHug"],
    [SHOUT3.a, "stand"],
    [SHOUT3.a + 0.25, "megaphone", 0.35],
    [HOARSE.a, "tired", 0.35],
    [LOOK2.l1, "lookHand", 0.4],
    [LOOK2.end - 0.6, "tired", 0.4],
    [ROCKW.a, "lookUp"],
    [ROCKW.cheer, "cheer", 0.2],
    [HORIZON.a, "stand"],
    [REEF.a, "cheer"],
    [GRAB.a, "reach", 0.25],
    [GRAB.up, "holdGun", 0.25],
    [GRAB.raise, "aimUp", 0.3, "back"],
    [BANG + 0.05, "recoil", 0.08, "snap"],
    [BANG + 0.5, "aimUp", 0.35],
    [BANG + 2.0, "proud", 0.5],
    [TINK + 0.4, "stand", 0.4],
    [REALIZE.horror, "handsOnHead", 0.3],
    [REALIZE.sheep, "rub", 0.35],
    [HEART.sit, "sitHug", 0.4],
  ],
  faceX: [
    [0, 0.6],
    [K0, 0.4],
    [SHOUT1.a, 0.9],
    [NIGHT1.a, 0.3],
    [SHOUT2.a, 0.9],
    [NIGHT2.a, 0.3],
    [SHOUT3.a, 0.9],
    [HOARSE.a, 0.3],
    [ROCKW.a, 0.4],
    [GRAB.a, 0.7],
    [GRAB.raise, 0.5],
    [REALIZE.a, 0.2],
    [REALIZE.sheep, 0.6],
    [HEART.give, 0.5],
  ],
  lookY: [
    [0, 0],
    [DASH_EYE.a, 0.6],
    [DASH_EYE.b, 0],
    [ROCKW.a, -1],
    [GRAB.raise, -1],
    [BANG + 2.0, -1],
    [TINK, -0.2],
    [RING.bump - 0.2, 1],
    [REALIZE.a, -0.2],
    [REALIZE.sheep, 0.2],
  ],
  face: [
    [0, "dazed"],
    [K0 + 1.4, "resigned"],
    [DASH_EYE.a, "curious"],
    [SHOUT1.a, "determined"],
    [SHOUT1.out, "scream"],
    [SHOUT1.end - 0.3, "cautious"],
    [NIGHT1.a, "resigned"],
    [SHOUT2.a, "determined"],
    [SHOUT2.out, "scream"],
    [SHOUT2.end - 0.3, "suspicious"],
    [NIGHT2.a, "battered"],
    [SHOUT3.a, "strain"],
    [HOARSE.a, "soggy"],
    [ROCKW.a, "expectant"],
    [ROCKW.cheer, "confident"],
    [REEF.a, "expectant"],
    [GRAB.a, "determined"],
    [GRAB.raise, "proud"],
    [BANG, "determined"],
    [BANG + 1.0, "proud"],
    [TINK + 0.5, "confident"],
    [FIRE.a + 1.2, "proud"],
    [RING.bump, "curious"],
    [REALIZE.confused, "confused"],
    [REALIZE.horror, "horror"],
    [REALIZE.sheep, "sheepish"],
    [HEART.give, "tender"],
  ],
  aHand: [
    [0, "fist"],
    [OUT_D.b, "open"],
    [K0 + 1.4, "fist"],
    [SHOUT1.a, "open"],
    [NIGHT1.a, "fist"],
    [SHOUT2.a, "open"],
    [NIGHT2.a, "fist"],
    [SHOUT3.a, "fist"],
    [ROCKW.cheer, "open"],
    [GRAB.a, "open"],
    [GRAB.take, "fist"],
    [REALIZE.horror, "open"],
    [HEART.give, "open"],
  ],
  bHand: [
    [0, "fist"],
    [SHOUT1.a, "open"],
    [NIGHT1.a, "fist"],
    [SHOUT2.a, "open"],
    [NIGHT2.a, "fist"],
    [ROCKW.cheer, "open"],
    [GRAB.a, "fist"],
    [REALIZE.horror, "open"],
    [REALIZE.sheep, "fist"],
  ],
  extras: (t) => ({ scarf: true, beard: t < K0 ? 0 : Math.min(1, (dayOf(t) - 1) / 4 + 0.05) }),
};

/** does Dash hold the flare gun right now? */
export const dashHoldsGun = (t: number) => t >= GRAB.take && t < REALIZE.horror + 0.1;

export const heroAt = (t: number) => {
  const c = build(heroScript, t);
  // the offshore wind streams his scarf out toward the sea (+x)
  c.speed = c.facing === 1 ? -260 : 260;
  if (t >= ROCKW.cheer && t < HORIZON.a) c.lift = Math.abs(Math.sin((t - ROCKW.cheer) * 6)) * px(0.28); // jumps for joy
  if (t >= REEF.a && t < GRAB.a) c.lift = Math.abs(Math.sin((t - REEF.a) * 6)) * px(0.2);
  // he reaches back to the gun on the rock
  if (t >= GRAB.a && t < GRAB.up) reach(c, "a", toLane(GUN_ON_ROCK, Z.dash));
  // aiming: straight up, then leaned toward the ship by exactly the solved tilt
  if (t >= GRAB.raise && t < BANG + 2.0) {
    const k = t < GRAB.tilt ? 0 : ease("io", (t - GRAB.tilt) / 0.4);
    const up = 179 - TILT_DEG * k;
    c.pose = { ...c.pose, aS: up, aE: 0, bS: up - 12, bE: 26 };
  }
  // hands on his head (horror)
  if (t >= REALIZE.horror + 0.15 && t < REALIZE.sheep) {
    const top = headTopOf(c);
    reach(c, "a", { x: top.x + 30, y: top.y + 14 });
    reach(c, "b", { x: top.x - 30, y: top.y + 14 });
  }
  if (t >= HEART.give + 0.2) reach(c, "a", { x: c.x - 120, y: GROUND - 120 }); // takes the coconut half
  return { c, Z: dashZ(t) };
};

// ═══════════════════════ Newt: calm, methodical, kind ═══════════════════════
const N_SIGN = 2050; // where he hauls driftwood (sign lane)
const newtScript: Script = {
  scale: NEWT_SCALE,
  seed: 1,
  x: cutKeys([
    [0, DOOR_X],
    [OUT_N.a, DOOR_X],
    [OUT_N.b, DOOR_X - 170, "out"],
    [K0, NEWT_X - 10, "cut"],
    [GUN_ROCK.a - 0.1, NEWT_X - 10],
    [GUN_ROCK.a + 0.2, NEWT_X + 70],
    [TALLY1.a, PALM1_X + 170, "cut"],
    [SHOUT1.a, N_SIGN, "cut"],
    [OVER1.a, N_SIGN - 380, "lin"],
    [NIGHT1.a, NEWT_X, "cut"],
    [SHOUT2.a, N_SIGN + 300, "cut"],
    [OVER2.a, N_SIGN - 80, "lin"],
    [NIGHT2.a, NEWT_X, "cut"],
    [SHOUT3.a, N_SIGN + 100, "cut"],
    [HOARSE.a, N_SIGN - 250, "lin"],
    [OVER3.a, N_SIGN - 500, "lin"],
    [ROCKW.a, NEWT_X, "cut"],
    [HEART.a, NEWT_X],
    [HEART.a + 0.3, PALM1_X + 170, "cut"],
    [HEART.walk, PALM1_X + 170],
    [HEART.walk, DASH_X - 250, "cut"],
  ]),
  lift: [
    [0, FLOOR],
    [OUT_N.a, FLOOR],
    [OUT_N.b, 0, "in"],
  ],
  sy: [
    [0, 1],
    [OUT_N.b - 0.02, 1],
    [OUT_N.b + 0.05, 0.86, "snap"],
    [OUT_N.b + 0.3, 1, "back"],
  ],
  facing: [
    [0, -1],
    [K0, 1],
    [TALLY1.a, -1],
    [SHOUT1.a, -1],
    [NIGHT1.a, 1],
    [SHOUT2.a, -1],
    [NIGHT2.a, 1],
    [SHOUT3.a, -1],
    [ROCKW.a, 1],
    [HEART.a, -1],
    [HEART.sit - 0.1, 1],
  ],
  gait: [
    [0, "none"],
    [SHOUT1.a, "walkLegs"],
    [OVER1.a, "none"],
    [SHOUT2.a, "walkLegs"],
    [OVER2.a, "none"],
    [SHOUT3.a, "walkLegs"],
    [OVER3.a, "none"],

  ],
  pose: [
    [0, "stand"],
    [OUT_N.a, "landSquat", 0.1],
    [OUT_N.b + 0.25, "dazed", 0.3],
    [K0, "kneel"],
    [KIT.open, "kneelReach", 0.2],
    [LOOK1.tint, "kneel", 0.3],
    [GUN_ROCK.a, "stand", 0.2],
    [GUN_ROCK.a + 0.2, "reach", 0.25],
    [GUN_ROCK.b, "stand", 0.3],
    [TALLY1.a, "reachFwd"],
    [SHOUT1.a, "stand"],
    [NIGHT1.a, "sitGround"],
    [SHOUT2.a, "stand"],
    [NIGHT2.a, "sitGround"],
    [SHOUT3.a, "stand"],
    [ROCKW.a, "lookUp"],
    [ROCKW.rock, "thumbsUp", 0.3],
    [HORIZON.a, "stand"],
    [REEF.a, "shadeEyes"],
    [GRAB.up, "reachUp", 0.25],
    [GRAB.tilt + 0.2, "stand", 0.3],
    [LOOK3.tint, "lookUp", 0.3],
    [LOOK3.oh, "slouch", 0.5],
    [TINK + 0.4, "stand", 0.3],
    [HEART.a, "stand"],
    [HEART.scratch, "reachFwd", 0.25],
    [HEART.walk, "stand", 0.2],
    [HEART.sit, "sitGround", 0.4],
    [HEART.give, "sitOffer", 0.35],
  ],
  faceX: [
    [0, 0.5],
    [K0, 0.7],
    [LOOK1.tint, 0.3],
    [TALLY1.a, 0.8],
    [ROCKW.a, 0.4],
    [GRAB.a, 0.5],
    [LOOK3.tint, 0.3],
    [HEART.a, 0.8],
    [HEART.give, 0.6],
  ],
  lookY: [
    [0, 0],
    [K0, 0.8],
    [LOOK1.tint, 0],
    [ROCKW.a, -1],
    [HORIZON.a, 0],
    [GRAB.up, -0.6],
    [LOOK3.tint, -1],
    [LOOK3.oh, 0.4],
    [TINK, 0],
    [HEART.a, 0],
  ],
  face: [
    [0, "dazed"],
    [K0, "kidFocus"],
    [LOOK1.tint, "kidFocus"],
    [LOOK1.end, "kidHappy"],
    [TALLY1.a, "kidDeadpan"],
    [SHOUT1.a, "kidFocus"],
    [NIGHT1.a, "kidDeadpan"],
    [SHOUT2.a, "kidFocus"],
    [NIGHT2.a, "kidDeadpan"],
    [SHOUT3.a, "kidFocus"],
    [LOOK2.tint, "kidFocus"],
    [ROCKW.a, "kidCurious"],
    [ROCKW.rock, "kidSmile"],
    [REEF.a, "kidHappy"],
    [GRAB.up, "kidConcern"],
    [BANG + 0.3, "kidCurious"],
    [LOOK3.tint, "kidFocus"],
    [LOOK3.tint + 1.2, "kidWorried"],
    [LOOK3.oh, "kidDisappointed"],
    [TINK + 0.3, "kidDeadpan"],
    [BURST, "kidDisappointed"],
    [HEART.a, "kidDeadpan"],
    [HEART.give, "tender"],
  ],
  aHand: [
    [0, "fist"],
    [OUT_N.b, "open"],
    [K0, "fist"],
    [GUN_ROCK.a, "fist"],
    [GUN_ROCK.b, "fist"],
    [ROCKW.rock, "thumb"],
    [HORIZON.a, "fist"],
    [GRAB.up, "point"],
    [GRAB.tilt + 0.2, "fist"],
    [HEART.give, "fist"],
  ],
  bHand: [[0, "fist"]],
  extras: () => ({ partyHat: true, blush: true }),
};

/** does Newt carry the flare gun (from the kit to the rock)? */
export const newtHoldsGun = (t: number) => t >= LOOK1.end - 0.4 && t < GUN_ROCK.b - 0.1;
/** is Newt hauling a log right now (background of the shouts)? */
export const newtHauls = (t: number) => newtZ(t) === 5.0 && t < HOARSE.a + 0.1;

export const kidAt = (t: number) => {
  const c = build(newtScript, t);
  const Zn = newtZ(t);
  c.speed = c.facing === 1 ? -200 : 200;
  // in the kit, then the gun onto the rock
  if (t >= GUN_ROCK.a + 0.2 && t < GUN_ROCK.b) reach(c, "a", toLane(GUN_ON_ROCK, Zn));
  // carving the tally into the palm (and again, at the end)
  const carving = inR(t, TALLY1.a, TALLY1.b) || inR(t, HEART.scratch, HEART.walk);
  if (carving) {
    const trunk = fromLane({ x: PALM1_X + 30, y: GROUND - px(1.0) }, Z.palm1);
    const tgt = toLane(trunk, Zn);
    const k = Math.sin(t * 22) * 8;
    reach(c, "a", { x: tgt.x + k, y: tgt.y + Math.cos(t * 22) * 4 });
  }
  // hauling: both hands behind him on the log
  if (newtHauls(t)) {
    const hip = toWorld(c, solve(c.pose).hip);
    reach(c, "a", { x: hip.x + 90, y: hip.y - 10 });
    reach(c, "b", { x: hip.x + 80, y: hip.y - 4 });
    c.pose = { ...c.pose, lean: 18 };
  }
  // laying L and P during the look: crouched over the sign
  if (t >= HOARSE.a + 0.1 && t < OVER3.a && Zn === 5.0) c.pose = { ...c.pose, lean: 30, head: 10 };
  // offer the coconut half
  if (t >= HEART.give) {
    const d = heroAt(t).c;
    void d;
  }
  return { c, Z: Zn };
};

/** the coconut half Newt hands over (world, in Newt's lane) */
export const coconutAt = (t: number) => {
  if (t < HEART.give - 0.4) return null;
  const k = kidAt(t).c;
  const h = handOf(k, "a");
  return { ...fromLane(h, Z.newt), s: sOf(Z.newt) };
};

/** the life ring washing up to Dash's foot (lane x, Z, bob) */
export const ringAt = (t: number) => {
  if (t < RING.a) return null;
  const u = clamp01((t - RING.a) / (RING.bump - RING.a));
  const Zr = 9 - (9 - (Z.dash + 0.4)) * ease("out", u);
  return { x: DASH_X + 120 - 60 * u, Z: Zr, bob: Math.sin(t * 5) * (1 - u) * 10 };
};

export { DRIFT, FIRE };
