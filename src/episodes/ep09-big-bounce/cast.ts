import { applyGait, blinkAt, breathe, FACES, mixPose, POSES, type FaceName } from "../../rig/library";
import { GROUND, HEAD_R, HEAD_SCALE, solve, toWorld } from "../../rig/Stickman";
import type { CharState, Extras, Hand, Pose } from "../../rig/types";
import { ease, num } from "../../lib/kf";
import { proj, unproj } from "../../rig2d/depth";
import { reach } from "../../rig2d/ik";
import {
  A2,
  AFTER,
  APPLE1,
  APPLE2,
  APPLE_R,
  appleAt,
  BAG_X,
  BENCH_X,
  BOUNCE,
  BRANCH,
  CHOMP,
  D,
  DASH_STAND_X,
  DEATH,
  DIG_FREEZE,
  DIG_PERIOD,
  DIG_PHASE,
  digU,
  E1,
  E2,
  E3,
  FLY_T,
  FROWN,
  FUNMAX,
  G,
  GATE,
  GATE_X,
  GRAB,
  GRAVE_D,
  GRAVE_W,
  GRAVE_X,
  HELMET,
  HIP_STAND,
  hipOf,
  LETGO,
  LOOK,
  LOOKUP,
  MARCH,
  NEWT_SCALE,
  newtFly,
  NOD2,
  OFF1,
  OFF2,
  OFF3,
  OPER,
  phiAt,
  PIV_X,
  plankPoint,
  PULL,
  PUSH,
  px,
  RA,
  RH,
  rider,
  RS,
  SALUTE0,
  SEAT_UP_X,
  SIGH,
  SIT,
  SPLIT,
  TAG,
  THUMB1,
  toPx,
  TREE,
  TRUNK_X,
  WALL_H,
  WALL_X,
  yOf,
} from "./timeline";

type P = { x: number; y: number };
export type Actor = { c: CharState; d: number; ax: number };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const lerpP = (a: P, b: P, u: number): P => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });
const io = (u: number) => ease("io", u);
const within = (s: number, w: { a: number; b: number }) => s >= w.a && s < w.b;

/** a world point drawn in lane `from` (scaled about `axFrom`) → the same screen point in lane `to` */
export const inLane = (p: P, from: number, axFrom: number, to: number, axTo: number) => unproj(proj(p, from, axFrom), to, axTo);

const base = (scale: number, t: number, seed: number, extras: Extras): CharState => ({
  x: 0,
  lift: 0,
  facing: 1,
  scale,
  sx: 1,
  sy: 1,
  pose: POSES.stand,
  faceX: 0.5,
  lookY: 0,
  expr: FACES.deadpan,
  blink: blinkAt(t, seed),
  aHand: "fist",
  bHand: "fist",
  extras,
  t,
  speed: 0,
  rot: 0,
});
const face = (n: FaceName) => FACES[n];
/** stand a character at ground x with feet `h` px above the grass */
const standAt = (c: CharState, x: number, h = 0) => {
  c.x = x;
  c.lift = h;
  return c;
};
const handle = (phi: number, side: -1 | 1) => toPx(plankPoint(phi, side * RH, 0.4));
const seatPx = (phi: number, side: -1 | 1) => toPx(plankPoint(phi, side * RS));
const seatH = (phi: number, side: -1 | 1) => plankPoint(phi, side * RS).y;

// ═══════════════════════ The apples (Newt's "test shots") ═══════════════════════
export type AppleState = { x: number; y: number; d: number; bite: number } | null;
const APPLE_SEAT = (phi: number) => toPx(plankPoint(phi, -RA, 0.04 + APPLE_R));
const BAG_TOP = { x: BAG_X, y: GROUND - 70 }; // in the bag's lane
const BAG_IN0 = inLane(BAG_TOP, D.bag, BAG_X, 0, BAG_X);

export const applesAt = (s: number): AppleState[] => {
  const one = (k: 0 | 1): AppleState => {
    const P = k === 0 ? APPLE1 : APPLE2;
    const E = k === 0 ? E1 : E2;
    if (s < P.reach + 0.45) return null; // still in the bag
    if (s < P.place) {
      const hand = newtHand(s);
      return { x: hand.x, y: hand.y - 6, d: 0, bite: 0 };
    }
    if (s < E.stop) {
      const q = APPLE_SEAT(phiAt(s));
      return { ...q, d: 0, bite: 0 };
    }
    const tau = s - E.stop;
    if (k === 0) {
      if (s < CHOMP.pick) return { ...appleAt(0, tau), d: 0, bite: 0 };
      if (s < CHOMP.bite) {
        const h = dashHandA(s);
        return { x: h.x, y: h.y - 10, d: 0, bite: 0 };
      }
      return null; // one bite. The whole apple.
    }
    return { ...appleAt(1, tau), d: 0, bite: 0 };
  };
  return [one(0), one(1)];
};

// ═══════════════════════ Newt ═══════════════════════
const NEWT_LOW = POSES.sitLow;
const NEWT_HIGH = POSES.sitRide;
/** Newt's near hand while he moves an apple from the bag to his seat (lane 0) */
const newtHand = (s: number): P => {
  const P = s < APPLE2.reach ? APPLE1 : APPLE2;
  const seat = APPLE_SEAT(phiAt(s));
  const u1 = clamp01((s - P.reach) / 0.45);
  const u2 = clamp01((s - P.reach - 0.45) / (P.place - P.reach - 0.45));
  const hd = handle(phiAt(s), -1);
  if (s < P.reach + 0.45) return lerpP(hd, BAG_IN0, io(u1));
  return lerpP(BAG_IN0, { x: seat.x, y: seat.y - 4 }, io(u2));
};
const landLift = (s: number, stop: number, amp: number) => {
  const tau = s - stop;
  return tau > 0 && tau < 0.42 ? Math.sin((Math.PI * tau) / 0.42) * amp : 0;
};

export const newtAt = (s: number): Actor => {
  const helmet = s >= HELMET.on;
  const c = base(NEWT_SCALE, s, 1, { partyHat: true, blush: true, helmet: helmet ? 1 : 0 });
  c.facing = 1;
  c.faceX = 0.45;
  c.expr = face("kidDeadpan");
  // ── in the grave: he hits the floor, crumples, dead (X eyes, cracked helmet). Never graphic. ──
  if (s >= E3.land) {
    const body = deadBody(s);
    Object.assign(c, body);
    c.extras = { partyHat: true, blush: true, helmet: 2 };
    return { c, d: D.grave, ax: c.x };
  }
  // ── flying: a true parabola from his seat, sitting politely ──
  if (s >= E3.stop) {
    const tau = s - E3.stop;
    const p = toPx(newtFly(tau));
    c.pose = mixPose(NEWT_HIGH, POSES.sitBed, clamp01(tau / FLY_T));
    c.pose = { ...c.pose, aS: 70, aE: 30, bS: 60, bE: 30 };
    c.x = p.x;
    c.lift = GROUND - p.y - hipOf(c.pose, NEWT_SCALE);
    c.rot = lerp(-8, 12, tau / FLY_T);
    c.expr = face("kidDisappointed"); // resigned: he knows exactly where this ends
    c.lookY = 0.6;
    c.aHand = "open";
    c.bHand = "open";
    return { c, d: D.see, ax: c.x };
  }
  // ── on the seat ──
  const phi = phiAt(s);
  const h = seatH(phi, -1);
  const u = clamp01((h - 0.25) / 1.3); // 0 at the bottom (knees up), 1 at the top (legs dangling)
  let pose: Pose = breathe(mixPose(NEWT_LOW, NEWT_HIGH, u), s + 1, 0.6);
  // pushing off the grass with his feet (nothing happens)
  for (const p of PUSH) if (s > p - 0.15 && s < p + 0.4) pose = { ...pose, aK: pose.aK - 30 * Math.sin(Math.PI * clamp01((s - p + 0.15) / 0.55)), bK: pose.bK - 30 * Math.sin(Math.PI * clamp01((s - p + 0.15) / 0.55)) };
  // the sigh
  if (s > SIGH && s < SIGH + 1.2) pose = { ...pose, lean: pose.lean + 10 * Math.sin(Math.PI * clamp01((s - SIGH) / 1.2)), head: pose.head + 14 * Math.sin(Math.PI * clamp01((s - SIGH) / 1.2)) };
  // "…oh.": shoulders drop, head down (disappointed), then he gathers himself to climb off
  if (s >= LOOK.oh && s < LETGO) pose = mixPose(pose, { ...pose, lean: pose.lean + 14, head: pose.head + 24 }, Math.min(io(clamp01((s - LOOK.oh) / 0.5)), 1 - io(clamp01((s - (LETGO - 0.3)) / 0.3))));
  // letting go to climb off (too late)
  if (s >= LETGO) pose = mixPose(pose, { ...pose, lean: 30, head: -24, aS: 70, aE: 20, bS: 60, bE: 20 }, clamp01((s - LETGO) / 0.5));
  c.pose = pose;
  const lift = landLift(s, E1.stop, px(0.12)) + landLift(s, E2.stop, px(0.24));
  const hip = seatPx(phi, -1);
  Object.assign(c, rider({ ...c }, { x: hip.x, y: hip.y - lift }, phi));
  // bonk: a squash and a wince every time his end hits the grass
  for (const b of [OFF1.bonk, OFF2.bonk, OFF3.bonk]) {
    const tau = s - b;
    if (tau > 0 && tau < 0.3) c.sy = 1 - 0.18 * Math.sin((Math.PI * tau) / 0.3);
  }
  // hands: on the handles (both), except when busy
  const hd = handle(phi, -1);
  const busy = (s > APPLE1.reach && s < APPLE1.place + 0.1) || (s > APPLE2.reach && s < APPLE2.place + 0.1);
  if (s < LETGO) {
    reach(c, "b", { x: hd.x - 6, y: hd.y + 4 });
    if (busy) {
      reach(c, "a", newtHand(s));
      c.aHand = "open";
    } else if (s > THUMB1.a && s < THUMB1.b) {
      c.pose = { ...c.pose, aS: 60, aE: 100 };
      c.aHand = "thumb";
    } else reach(c, "a", hd);
  } else c.aHand = c.bHand = "open";
  // the helmet goes on: he looks up at Dash
  if (s >= HELMET.a - 0.2 && s < HELMET.b) {
    c.lookY = -0.6;
    c.faceX = 0.6;
  }
  // ── faces ──
  const F: [number, FaceName][] = [
    [0, "kidDeadpan"],
    [SIGH, "kidSad"],
    [SIGH + 1.3, "kidDeadpan"],
    [PULL.a + 0.3, "kidCurious"],
    [PULL.b, "kidDeadpan"],
    [OFF1.bonk, "annoyed"],
    [OFF1.bonk + 0.45, "kidDeadpan"],
    [APPLE1.reach, "kidFocus"],
    [E1.stop, "kidCurious"],
    [E1.stop + 0.5, "kidDeadpan"],
    [OFF2.bonk, "annoyed"],
    [OFF2.bonk + 0.45, "kidFocus"],
    [E2.stop, "surprised"],
    [E2.stop + 0.6, "kidConcern"],
    [LOOKUP.a, "kidDeadpan"],
    [OFF3.bonk, "annoyed"],
    [OFF3.bonk + 0.45, "kidDeadpan"],
    [LOOK.tint, "kidFocus"],
    [LOOK.arc3 + 0.8, "kidConcern"],
    [LOOK.back, "kidWorried"], // the arc ended in a grave
    [LOOK.oh, "kidDisappointed"], // …oh.
    [LETGO + 0.4, "kidWorried"],
    [E3.imp, "surprised"],
  ];
  let fn: FaceName = "kidDeadpan";
  for (const [k, n] of F) if (s >= k) fn = n;
  c.expr = face(fn);
  // where he looks
  const LK: [number, number, number][] = [
    [0, 0.2, 0.5],
    [SIGH, 0.6, 0.6],
    [GATE, 0, -0.2],
    [MARCH.b, 0, 0.6],
    [PULL.b, 0.7, 0.6],
    [OFF1.bonk, 0.1, 0.5],
    [APPLE1.reach, 0.8, -0.2],
    [E1.step - 0.6, -0.5, 0.6],
    [E1.stop, 0.4, 0.7],
    [APPLE2.reach, 0.8, -0.2],
    [E2.step - 0.8, -0.7, 0.6],
    [E2.stop, 0.3, 0.7],
    [LOOKUP.a, -0.9, 0.6],
    [OFF3.bonk, 0.1, 0.4],
    [HELMET.b, 0, 0.4],
    [LOOK.tint, -1, 0.6],
    [LOOK.arc3, -0.3, 0.8],
    [LOOK.back, 0, 0.3],
    [LETGO, 0.6, 0.6],
    [E3.imp - 0.7, -1, 0.6],
  ];
  for (const [k, ly, fx] of LK)
    if (s >= k) {
      c.lookY = ly;
      c.faceX = fx;
    }
  if (s >= HELMET.a - 0.2 && s < HELMET.b) c.lookY = -0.6;
  return { c, d: D.see, ax: c.x };
};

// ── after the landing: the body, and Newt's ghost ──
const FLOOR = () => GROUND + px(GRAVE_D);
const BODY_X = GRAVE_X - 6;
/** the body at the bottom of the grave: thump (seated), crumples backwards, lies still; later the arms fold */
const deadBody = (s: number): Partial<CharState> => {
  const u = io(clamp01((s - DEATH.crumple.a) / (DEATH.crumple.b - DEATH.crumple.a)));
  const fold = io(clamp01((s - AFTER.merge.a) / (AFTER.merge.b - AFTER.merge.a)));
  let pose = mixPose(POSES.sitBed, POSES.limp, u);
  if (fold > 0) pose = mixPose(pose, POSES.lieFold, fold);
  const tau = s - E3.land;
  const thump = tau < 0.18 ? 1 - 0.3 * Math.sin((Math.PI * tau) / 0.18) : 1;
  // a little bounce as he flops over (the helmet takes the hit)
  const rot = -90 * u + (s > DEATH.crumple.b && s < DEATH.crumple.b + 0.3 ? 6 * Math.sin((Math.PI * (s - DEATH.crumple.b)) / 0.3) : 0);
  return {
    x: BODY_X,
    pose,
    rot,
    sy: thump,
    lift: GROUND - (FLOOR() - lerp(0, 50, u)) - hipOf(pose, NEWT_SCALE),
    expr: face(s < E3.land + 0.08 ? "surprised" : "dead"),
    blink: 0,
    faceX: 0.4,
    lookY: 0,
    aHand: "open",
    bHand: "open",
    facing: 1,
  };
};
/** Newt's ghost: rises out of the body, floats above the grave, declines another go, lies back down */
export const ghostAt = (s: number): (Actor & { alpha: number }) | null => {
  if (s < AFTER.ghost.a || s >= AFTER.merge.b) return null;
  const c = base(NEWT_SCALE, s, 3, { partyHat: true, blush: true, ghost: true });
  const lying = deadBody(AFTER.ghost.a);
  const hover = { x: GRAVE_X - 20, h: px(0.35) + Math.sin(s * 2.2) * 10 };
  const rise = io(clamp01((s - AFTER.ghost.a) / (AFTER.ghost.b - AFTER.ghost.a)));
  const down = io(clamp01((s - AFTER.lie.a) / (AFTER.lie.b - AFTER.lie.a)));
  const k = down > 0 ? 1 - down : rise; // 0 = lying in the body, 1 = floating above the grave
  const lieLift = lying.lift as number;
  c.pose = mixPose(down > 0 ? POSES.lieFold : POSES.limp, POSES.floatIdle, k);
  c.facing = k > 0.5 && s < AFTER.lie.a + 0.1 ? -1 : 1;
  c.x = lerp(BODY_X, hover.x, k);
  c.lift = lerp(lieLift, hover.h - hipOf(c.pose, NEWT_SCALE) + px(0.3), k);
  c.rot = -90 * (1 - k) * (c.facing === 1 ? 1 : -1);
  c.expr = face(s < AFTER.ghost.b ? "kidDeadpan" : s < AFTER.seeDash ? "kidDeadpan" : "unimpressed");
  c.lookY = s >= AFTER.seeSaw && s < AFTER.seeDash ? 0 : 0.2;
  c.faceX = s >= AFTER.seeSaw && s < AFTER.seeDash ? 0.9 : 0.4;
  if (down > 0.3) {
    c.expr = face("wise");
    c.blink = 0;
  }
  if (s >= AFTER.nod && s < AFTER.nod + 0.5) c.pose = { ...c.pose, head: c.pose.head + 16 * Math.sin((Math.PI * (s - AFTER.nod)) / 0.5) };
  c.aHand = c.bHand = "open";
  const alpha = 1 - clamp01((s - AFTER.merge.a) / (AFTER.merge.b - AFTER.merge.a));
  return { c, d: D.grave + 0.002, ax: c.x, alpha };
};

// ═══════════════════════ Dash ═══════════════════════
const DASH_SEAT_POSE = POSES.sitLow;
const STAND_D = -0.35; // his lane beside the seesaw (behind it)
const BRANCH_D = D.tree;
const dashHandA = (s: number): P => {
  const a = dashAt(s);
  return toWorld(a.c, solve(a.c.pose).aHand);
};
/** Dash stepping off the branch: hips fall freely (one G), lane slides forward to the seesaw's */
const fall = (s: number, step: number, k: 0 | 1 | 2) => {
  const tau = Math.max(0, s - step);
  const hip0 = px(BRANCH[k] + HIP_STAND);
  return { hipH: hip0 - 0.5 * G * px(1) * tau * tau, u: clamp01(tau / Math.sqrt((2 * (BRANCH[k] + HIP_STAND - seatH(Math.PI / 6, 1))) / G)) };
};

export const dashAt = (s: number): Actor => {
  const c = base(1, s, 0, { scarf: true });
  c.facing = -1;
  c.faceX = 0.4;
  c.expr = face("cautious");
  let d = STAND_D;
  const sitOn = (phi: number, pose: Pose = DASH_SEAT_POSE, lift = 0) => {
    c.pose = breathe(pose, s, 0.6);
    const hip = seatPx(phi, 1);
    Object.assign(c, rider({ ...c }, { x: hip.x, y: hip.y - lift }, phi));
    d = D.see;
    const hd = handle(phi, 1);
    reach(c, "a", hd);
    reach(c, "b", { x: hd.x + 6, y: hd.y + 4 });
  };
  const holdSeat = (phi: number) => {
    const q = inLane(seatPx(phi, 1), 0, PIV_X, d, c.x);
    reach(c, "a", { x: q.x + 6, y: q.y - 6 });
    c.aHand = "open";
  };
  // the climbs: walk to the trunk, climb, walk out along the branch, salute, step off, fall, land, ride
  const climb = (E: typeof E1, k: 0 | 1 | 2, from: number): boolean => {
    if (s < from || s >= E.imp) return false;
    const br = px(BRANCH[k]);
    const trunkSide = TRUNK_X - 70;
    if (s < E.climb.a) return false;
    if (s < E.climb.b) {
      const u = (s - E.climb.a) / (E.climb.b - E.climb.a);
      const walkU = clamp01(u / 0.3);
      d = lerp(STAND_D, BRANCH_D, walkU);
      c.facing = 1;
      if (u < 0.3) {
        const x = lerp(DASH_STAND_X, trunkSide, io(walkU));
        const g = applyGait(POSES.stand, "walk", x);
        c.pose = g.pose;
        standAt(c, x, g.hop);
      } else {
        const v = (u - 0.3) / 0.7;
        c.pose = Math.floor(v * 6) % 2 ? POSES.climb : POSES.climbRail;
        standAt(c, trunkSide, br * io(v));
      }
      c.expr = face("determined");
      c.lookY = -0.8;
      return true;
    }
    if (s < E.salute.a) {
      const v = io((s - E.out.a) / (E.out.b - E.out.a));
      const x = lerp(trunkSide, SEAT_UP_X, v);
      const g = applyGait(POSES.stand, "tiptoe", x);
      c.pose = g.pose;
      standAt(c, x, br);
      d = BRANCH_D;
      c.facing = -1;
      c.expr = face("cautious");
      c.lookY = 0.8;
      return true;
    }
    if (s < E.step) {
      c.pose = breathe(POSES.salute, s);
      standAt(c, SEAT_UP_X, br);
      d = BRANCH_D;
      c.facing = -1;
      c.expr = face("determined");
      c.lookY = 0.2;
      c.faceX = 0;
      c.aHand = "open";
      return true;
    }
    // falling
    const f = fall(s, E.step, k);
    const pencil = k === 2 ? POSES.pencil : POSES.stand;
    c.pose = mixPose(pencil, POSES.sitRide, clamp01((f.u - 0.75) / 0.25));
    c.x = SEAT_UP_X;
    c.lift = f.hipH - hipOf(c.pose, 1);
    d = lerp(BRANCH_D, D.see, io(f.u));
    c.expr = face(k === 2 ? "proud" : "determined");
    c.speed = 900; // the scarf streams up
    c.faceX = 0;
    return true;
  };
  const phi = phiAt(s);

  if (s < GATE) {
    standAt(c, -600);
    return { c, d: D.bench, ax: c.x };
  }
  if (s < MARCH.a) {
    // at the gate: salute
    standAt(c, GATE_X);
    c.facing = 1;
    c.pose = s >= SALUTE0.a ? breathe(POSES.salute, s) : POSES.stand;
    c.aHand = "open";
    c.expr = face("determined");
    c.faceX = 0.3;
    return { c, d: -1.4, ax: c.x };
  }
  if (s < GRAB) {
    // the march (precise, in step)
    const u = clamp01((s - MARCH.a) / (MARCH.b - MARCH.a));
    const x = lerp(GATE_X, DASH_STAND_X, u);
    const g = applyGait(POSES.stand, "walk", x);
    c.pose = { ...g.pose, lean: -4, head: -4 };
    standAt(c, x, g.hop);
    c.facing = s < MARCH.b ? 1 : -1;
    c.expr = face("determined");
    c.speed = 300;
    return { c, d: lerp(-1.4, STAND_D, u), ax: c.x };
  }
  if (s < SIT.a) {
    // pulls his (raised) end down, slowly, with both hands
    standAt(c, DASH_STAND_X);
    const u = clamp01((s - PULL.a) / (PULL.b - PULL.a));
    c.pose = mixPose(POSES.reach, POSES.crouch, io(u) * 0.55);
    c.pose = { ...c.pose, lean: 10 + 12 * u };
    holdSeat(phi);
    const q = inLane(seatPx(phi, 1), 0, PIV_X, d, c.x);
    reach(c, "b", { x: q.x + 16, y: q.y - 4 });
    c.bHand = "open";
    c.expr = face("strain");
    c.lookY = 0.3;
    return { c, d, ax: c.x };
  }
  if (s < SIT.b) {
    // swings onto the seat
    const u = io((s - SIT.a) / (SIT.b - SIT.a));
    sitOn(phi);
    const sat = { x: c.x, lift: c.lift, rot: c.rot ?? 0, pose: c.pose };
    standAt(c, lerp(DASH_STAND_X, sat.x, u), lerp(0, sat.lift, u));
    c.rot = sat.rot * u;
    c.pose = mixPose(POSES.crouch, sat.pose, u);
    return { c, d: lerp(STAND_D, D.see, u), ax: c.x };
  }

  // ── sitting / getting off / climbing, three times ──
  const offs = [OFF1, OFF2, OFF3] as const;
  const Es = [E1, E2] as const;
  const seated = (from: number, to: number) => s >= from && s < to;
  // sitting after the pull-down, then after each landing
  const seatWins: [number, number][] = [
    [SIT.b, OFF1.stand],
    [E1.imp, OFF2.stand],
    [E2.imp, OFF3.stand],
    [E3.imp, AFTER.stand],
  ];
  for (let k = 0; k < seatWins.length; k++) {
    const [a, b] = seatWins[k];
    if (!seated(a, b)) continue;
    // the landing squash
    const tau = s - a;
    const squash = k > 0 && tau < 0.3 ? 1 - 0.22 * Math.sin((Math.PI * tau) / 0.3) : 1;
    // knee bounces after the first sit (nothing happens)
    const bnc = within(s, BOUNCE) ? Math.abs(Math.sin(((s - BOUNCE.a) / (BOUNCE.b - BOUNCE.a)) * Math.PI * 3)) * 14 : 0;
    sitOn(phi, DASH_SEAT_POSE, bnc);
    c.sy *= squash;
    c.facing = -1;
    c.expr = face("proud");
    c.lookY = -0.5;
    c.faceX = 0.5;
    if (k === 0) {
      c.expr = face(s < OPER + 1.5 ? "proud" : within(s, BOUNCE) ? "determined" : "cautious");
      c.lookY = -0.7;
    }
    if (k === 1) {
      // apple 1 rolls into his lap: he picks it up and eats it in one bite
      if (s >= CHOMP.pick && s < CHOMP.bite) {
        const ap = appleAt(0, CHOMP.pick - E1.stop);
        reach(c, "a", lerpP(ap, toWorld(c, solve(c.pose).head), io(clamp01((s - CHOMP.pick) / (CHOMP.bite - CHOMP.pick)))));
        c.aHand = "fist";
        c.expr = face("curious");
        c.lookY = 0.6;
      } else if (s >= CHOMP.bite && s < CHOMP.chew) {
        c.expr = { ...FACES.puffed, eyes: "half" };
        c.lookY = 0;
      } else if (s >= FROWN) {
        c.expr = face("suspicious");
        c.lookY = -0.7;
      } else if (s < CHOMP.pick) {
        c.expr = face("proud");
        c.lookY = 0.3;
      }
      if (s >= CHOMP.bite && s < CHOMP.chew) {
        c.pose = { ...c.pose, head: c.pose.head + Math.sin(s * 22) * 3 };
      }
    }
    if (k === 2) {
      // apple 2 lands on his head. He doesn't notice. He nods: progress.
      if (s >= A2.hit && s < A2.hit + 0.35) c.expr = face("dazed");
      else if (s >= NOD2 && s < NOD2 + 0.6) {
        c.expr = face("proud");
        c.pose = { ...c.pose, head: c.pose.head + 16 * Math.sin((Math.PI * (s - NOD2)) / 0.6) };
      } else if (s >= LOOKUP.a) {
        c.expr = face(s >= FUNMAX ? "determined" : "idea");
        c.lookY = -1;
        c.faceX = 0.2;
        c.pose = { ...c.pose, head: c.pose.head - 22 * clamp01((s - LOOKUP.a) / 0.5) };
      } else c.expr = face("proud");
    }
    if (k === 3) {
      // he looks up as Newt sails over him… then: maximum fun
      if (s < E3.land) {
        c.expr = face("curious");
        c.lookY = -1;
        c.faceX = 0.1;
      } else if (s < AFTER.turn) {
        c.expr = face("proud");
        c.lookY = 0;
      } else {
        c.expr = face("curious");
        c.lookY = -0.8;
        c.faceX = 0.8;
        if (s >= AFTER.blink && s < AFTER.blink + 0.5) c.blink = 1;
      }
    }
    return { c, d, ax: c.x };
  }
  // getting off: stand beside the seesaw, holding the seat down, then let go
  for (const off of offs) {
    if (s >= off.stand && s < off.rel + 0.35) {
      const u = io(clamp01((s - off.stand) / 0.5));
      sitOn(phi);
      const sat = { x: c.x, lift: c.lift, rot: c.rot ?? 0, pose: c.pose };
      c.pose = mixPose(sat.pose, POSES.bendHand, u);
      standAt(c, lerp(sat.x, DASH_STAND_X, u), lerp(sat.lift, 0, u));
      c.rot = sat.rot * (1 - u);
      d = lerp(D.see, STAND_D, u);
      if (s < off.rel) holdSeat(phi);
      else c.aHand = "open";
      c.expr = face("cautious");
      c.lookY = s > off.rel ? -0.3 : 0.4;
      return { c, d, ax: c.x };
    }
  }
  // climb 1 and 2
  for (let k = 0; k < 2; k++) if (climb(Es[k], k as 0 | 1, offs[k].rel)) return { c, d, ax: c.x };
  // standing beside the seesaw between beats
  if (s < HELMET.a - 0.2) {
    standAt(c, DASH_STAND_X);
    c.pose = breathe(POSES.stand, s);
    c.lookY = s > LOOKUP.a ? -1 : 0;
    return { c, d: STAND_D, ax: c.x };
  }
  // the helmet (he fetched it from the bench): on Newt's head, click, knock knock
  if (s < HELMET.b + 0.6) {
    const nx = toPx(plankPoint(phiAt(s), -RS)).x;
    standAt(c, nx + 205);
    c.facing = -1;
    c.pose = breathe(POSES.holdHelmet, s);
    const nh = newtHeadTop(s);
    const hq = inLane(nh, D.see, nh.x, 0.5, c.x);
    const u = io(clamp01((s - HELMET.a) / (HELMET.on - HELMET.a)));
    const hold = lerpP({ x: hq.x + 10, y: hq.y - 120 }, { x: hq.x, y: hq.y }, u);
    reach(c, "a", { x: hold.x - 34, y: hold.y + 10 });
    reach(c, "b", { x: hold.x + 34, y: hold.y + 10 });
    c.aHand = c.bHand = "open";
    if (s >= HELMET.on && s < HELMET.click + 0.1) {
      reach(c, "a", { x: hq.x - 4, y: hq.y + 70 });
      reach(c, "b", { x: hq.x + 6, y: hq.y + 72 });
    }
    for (const kt of HELMET.knock)
      if (s >= kt - 0.1 && s < kt + 0.12) {
        reach(c, "a", { x: hq.x, y: hq.y - 30 + 20 * Math.sin((Math.PI * (s - kt + 0.1)) / 0.22) });
        c.aHand = "fist";
      }
    if (s >= HELMET.b - 0.4) c.pose = breathe(POSES.salute, s);
    c.expr = face(s >= HELMET.click ? "proud" : "cautious");
    c.lookY = 0.7;
    c.faceX = 0.6;
    return { c, d: 0.5, ax: c.x };
  }
  // the oak, all the way up
  if (s < TREE.top) {
    c.facing = 1;
    const v = clamp01((s - TREE.trunk) / (TREE.trunkEnd - TREE.trunk));
    c.pose = Math.floor(s * 5) % 2 ? POSES.climb : POSES.climbRail;
    standAt(c, TRUNK_X - 70, px(2.4 + 0.5 * v));
    c.expr = face("strain");
    c.lookY = -1;
    return { c, d: BRANCH_D, ax: c.x };
  }
  if (s < E3.imp) {
    const E = { climb: { a: TREE.top, b: TREE.top }, out: TREE.out, salute: TREE.salute, step: E3.step, imp: E3.imp, stop: E3.stop };
    if (s < TREE.out.a) {
      standAt(c, TRUNK_X - 70, px(BRANCH[2]));
      c.pose = breathe(POSES.stand, s);
      c.facing = -1;
      c.expr = face("determined");
      return { c, d: BRANCH_D, ax: c.x };
    }
    if (s >= TREE.measure.a && s < TREE.measure.b) {
      standAt(c, SEAT_UP_X, px(BRANCH[2]));
      c.pose = breathe(POSES.thumbMeasure, s);
      c.aHand = "thumb";
      c.facing = -1;
      c.expr = face("suspicious");
      c.lookY = 1;
      return { c, d: BRANCH_D, ax: c.x };
    }
    if (s >= TREE.salute.b && s < E3.step) {
      // waits at attention while Newt thinks (and while Newt lets go: split screen)
      standAt(c, SEAT_UP_X, px(BRANCH[2]));
      c.pose = breathe(s < SPLIT.a ? POSES.proud : POSES.stand, s);
      c.facing = -1;
      c.expr = face(s < SPLIT.a ? "proud" : "determined");
      c.lookY = s < SPLIT.a ? 0 : 1;
      return { c, d: BRANCH_D, ax: c.x };
    }
    climb(E, 2, TREE.top);
    return { c, d, ax: c.x };
  }
  // ── after: he walks to the cemetery wall and looks over it ──
  const AF = AFTER;
  const wallStand = WALL_X - 120;
  if (s < AF.walk.b) {
    const sat = (() => {
      sitOn(phiAt(s));
      return { x: c.x, lift: c.lift, rot: c.rot ?? 0, pose: c.pose };
    })();
    const u = io(clamp01((s - AF.stand) / 0.4));
    c.facing = 1;
    if (s < AF.walk.a) {
      standAt(c, lerp(sat.x, sat.x + 40, u), lerp(sat.lift, 0, u));
      c.pose = mixPose(sat.pose, POSES.stand, u);
      c.rot = sat.rot * (1 - u);
    } else {
      const x = lerp(sat.x + 40, wallStand, clamp01((s - AF.walk.a) / (AF.walk.b - AF.walk.a)));
      const g = applyGait(POSES.stand, "walk", x);
      c.pose = g.pose;
      standAt(c, x, g.hop);
      c.rot = 0;
    }
    d = D.see;
    c.expr = face("curious");
    c.aHand = c.bHand = "fist";
    return { c, d, ax: c.x };
  }
  standAt(c, wallStand);
  c.facing = 1;
  c.pose = breathe(POSES.peekWall, s);
  const top = { x: WALL_X - 12, y: yOf(WALL_H) };
  const onWall = () => {
    reach(c, "a", { x: top.x, y: top.y - 4 });
    reach(c, "b", { x: top.x - 26, y: top.y - 2 });
    c.aHand = c.bHand = "open";
  };
  onWall();
  c.expr = face("curious");
  c.lookY = 0.7;
  c.faceX = 0.6;
  const headTop = () => headTopOf(c);
  if (s >= AF.see && s < AF.grief.a) {
    // he sees his friend at the bottom of the grave: horror, a flinch back
    const u = io(clamp01((s - AF.see) / 0.25));
    c.pose = { ...c.pose, lean: c.pose.lean - 14 * u, head: c.pose.head - 6 * u };
    onWall();
    c.expr = face("horror");
    c.lookY = 0.8;
  } else if (s >= AF.grief.a && s < AF.notice) {
    // grief: both hands on his head, tears, swaying; he can't look away
    c.pose = breathe(POSES.handsOnHead, s);
    const sway = Math.sin(s * 2.4) * 5;
    const h = headTop();
    reach(c, "a", { x: h.x + 30 + sway, y: h.y + 16 });
    reach(c, "b", { x: h.x - 30 + sway, y: h.y + 16 });
    c.aHand = c.bHand = "open";
    c.expr = face("sad");
    c.lookY = s >= AF.ghost.a ? lerp(0.8, -0.4, clamp01((s - AF.ghost.a) / (AF.ghost.b - AF.ghost.a))) : 0.8;
    c.pose = { ...c.pose, head: c.pose.head + 18 * Math.sin(Math.PI * clamp01((s - AF.grief.a) / 0.6)) * 0.6 };
  } else if (s >= AF.notice && s < AF.point.a) {
    // …his friend's ghost: grief turns to hope
    c.expr = face(s < AF.notice + 0.35 ? "surprised" : "expectant");
    c.lookY = -0.4;
  } else if (s >= AF.point.a && s < AF.point.b) {
    // points back at the seesaw…
    c.facing = -1;
    c.pose = breathe(POSES.point, s);
    c.aHand = "point";
    c.bHand = "fist";
    c.expr = face("expectant");
    c.faceX = 0.2;
    c.lookY = 0;
  } else if (s >= AF.thumbs.a && s < AF.thumbs.b) {
    // …thumbs up: AGAIN?
    c.pose = breathe(POSES.thumbsUp, s);
    c.aHand = "thumb";
    reach(c, "b", { x: top.x - 26, y: top.y - 2 });
    c.expr = face("expectant");
    c.lookY = -0.4;
  } else if (s >= AF.thumbs.b && s < AF.sad2) {
    c.expr = face("expectant");
    c.lookY = -0.3;
  } else if (s >= AF.sad2 && s < AF.mourn) {
    // the ghost lies back down: his face falls
    c.expr = face("sad");
    c.lookY = 0.8;
    if (s >= AF.dashLook && s < AF.shrug.b + 0.2) {
      c.faceX = 0.9;
      c.lookY = 0.1;
    }
  } else if (s >= AF.mourn) {
    // hand on his heart, head bowed
    const u = io(clamp01((s - AF.mourn) / 0.6));
    c.pose = breathe(mixPose(POSES.peekWall, { ...POSES.hatChest, lean: 6, head: 26 }, u), s);
    reach(c, "b", { x: top.x - 26, y: top.y - 2 });
    c.aHand = "open";
    c.expr = face("sad");
    c.lookY = 0.9;
  }
  return { c, d: D.see, ax: c.x };
};
const headTopOf = (c: CharState): P => {
  const h = toWorld(c, solve(c.pose).head);
  return { x: h.x, y: h.y - HEAD_R * HEAD_SCALE * c.scale };
};
const newtHeadTop = (s: number): P => {
  const n = newtAt(s).c;
  const j = solve(n.pose);
  const h = toWorld(n, j.head);
  return { x: h.x, y: h.y - 30 };
};
/** the helmet while Dash carries it (null once it's on Newt's head, or still on the bench) */
export const helmetAt = (s: number): { x: number; y: number; d: number; ax: number } | null => {
  if (s < HELMET.a - 0.2) return { x: BENCH_X + 40, y: GROUND - px(0.45) - 18, d: D.bench, ax: BENCH_X };
  if (s >= HELMET.on) return null;
  const a = dashAt(s);
  const hand = toWorld(a.c, solve(a.c.pose).aHand);
  return { x: hand.x + 34, y: hand.y - 26, d: a.d, ax: a.ax };
};

// ═══════════════════════ The gravedigger ═══════════════════════
export const DIG_X = GRAVE_X + px(GRAVE_W / 2) + 80;
export const PILE_X = DIG_X + 230;
type Shovel = { grip: P; blade: P; full: number };
const SHOVEL_KEYS: [number, P, P][] = [
  // cycle u, grip (rel. to his feet), blade
  [0.0, { x: -60, y: -190 }, { x: -230, y: 60 }],
  [0.35, { x: -60, y: -170 }, { x: -240, y: 80 }],
  [0.55, { x: -40, y: -250 }, { x: -230, y: -190 }],
  [0.72, { x: -10, y: -360 }, { x: 110, y: -470 }],
  [0.85, { x: -40, y: -250 }, { x: -200, y: -120 }],
  [1.0, { x: -60, y: -190 }, { x: -230, y: 60 }],
];
const shovelRel = (u: number) => {
  for (let i = 1; i < SHOVEL_KEYS.length; i++) {
    const [u1, g1, b1] = SHOVEL_KEYS[i];
    const [u0, g0, b0] = SHOVEL_KEYS[i - 1];
    if (u <= u1) {
      const k = io((u - u0) / (u1 - u0));
      return { grip: lerpP(g0, g1, k), blade: lerpP(b0, b1, k) };
    }
  }
  return { grip: SHOVEL_KEYS[0][1], blade: SHOVEL_KEYS[0][2] };
};
const digPose = (u: number): Pose => {
  if (u < 0.35) return mixPose(POSES.digLift, POSES.digScoop, io(u / 0.35));
  if (u < 0.55) return mixPose(POSES.digScoop, POSES.digLift, io((u - 0.35) / 0.2));
  if (u < 0.72) return mixPose(POSES.digLift, POSES.digToss, io((u - 0.55) / 0.17));
  return mixPose(POSES.digToss, POSES.digLift, io((u - 0.72) / 0.28));
};
export const diggerAt = (s: number): { a: Actor; shovel: Shovel | null; planted: boolean; lily: P | null } => {
  const c = base(1.04, s, 2, {});
  c.facing = -1;
  c.faceX = 0.5;
  c.lookY = 0.7;
  c.expr = face("unimpressed");
  standAt(c, DIG_X);
  const frozen = s >= DIG_FREEZE;
  const u = frozen ? 0.5 : digU(s);
  let shovel: Shovel | null = null;
  let planted = false;
  let lily: P | null = null;
  const AF = AFTER;
  if (!frozen || s < DIG_FREEZE + 1.3) {
    c.pose = digPose(u);
    const r = shovelRel(u);
    const full = frozen ? clamp01(1 - (s - DIG_FREEZE - 0.35) / 0.25) : u > 0.35 && u < 0.72 ? 1 : 0;
    shovel = { grip: { x: DIG_X + r.grip.x, y: GROUND + r.grip.y }, blade: { x: DIG_X + r.blade.x, y: GROUND + r.blade.y }, full };
    if (frozen) {
      c.expr = face(s < DIG_FREEZE + 0.6 ? "shocked" : "unimpressed");
      c.lookY = 0.9;
    }
  } else {
    planted = true;
    c.pose = breathe(POSES.stand, s);
    c.lookY = 0.9;
    if (s >= AF.digLook) {
      c.lookY = 0;
      c.faceX = 0.9;
    }
    if (s >= AF.shrug.a && s < AF.shrug.b) {
      c.pose = POSES.shrug;
      c.aHand = c.bHand = "open";
    }
    if (s >= AF.lily.pick) {
      // a lily from the wreath behind him, tossed into the grave (it lands on the boy's chest)
      const wreath = inLane({ x: DIG_X + 120, y: GROUND - 150 }, D.stone, DIG_X + 120, D.digger, DIG_X);
      const chest = { x: GRAVE_X - 40, y: GROUND + px(GRAVE_D) - 70 };
      c.facing = s < AF.lily.bend - 0.2 ? 1 : -1;
      if (s < AF.lily.bend) {
        const hand = lerpP(toWorld(c, solve(c.pose).aHand), wreath, io(clamp01((s - AF.lily.pick) / 0.4)));
        reach(c, "a", hand);
        c.aHand = "fist";
        if (s >= AF.lily.pick + 0.4) lily = inLane(hand, D.digger, DIG_X, D.grave, GRAVE_X);
      } else {
        c.pose = s < AF.lily.bend + 0.35 ? POSES.throwFwd : breathe(POSES.stand, s);
        const from = inLane({ x: DIG_X - 90, y: GROUND - 300 }, D.digger, DIG_X, D.grave, GRAVE_X);
        const T = AF.lily.place - AF.lily.bend;
        const tau = Math.min(T, s - AF.lily.bend);
        const g = G * px(1) * 0.35; // a light flower drifts down (air drag)
        const v0 = (chest.y - from.y) / T - 0.5 * g * T;
        if (s < AF.lily.place) lily = { x: lerp(from.x, chest.x, tau / T), y: from.y + v0 * tau + 0.5 * g * tau * tau };
      }
      c.lookY = 0.8;
    }
  }
  if (shovel) {
    reach(c, "a", shovel.grip);
    reach(c, "b", lerpP(shovel.grip, shovel.blade, 0.38));
  }
  return { a: { c, d: D.digger, ax: c.x }, shovel, planted, lily };
};
/** dirt thrown over his shoulder each cycle (ballistic clumps onto the pile) */
export const dirtAt = (s: number) => {
  const out: { x: number; y: number; r: number }[] = [];
  const toss = (t0: number) => {
    const tau = s - t0;
    if (tau < 0 || tau > 0.9) return;
    const from = { x: DIG_X + 110, y: GROUND - 470 };
    for (let i = 0; i < 6; i++) {
      const vx = 380 + i * 40;
      const vy = -420 - i * 50;
      const y = from.y + vy * tau + 0.5 * G * px(1) * tau * tau;
      if (y > GROUND - 70 - i * 6) continue;
      out.push({ x: from.x + vx * tau + i * 6, y, r: 10 + (i % 3) * 4 });
    }
  };
  // every cycle's toss moment (u = 0.72), until he freezes
  const n0 = Math.floor(s / DIG_PERIOD - DIG_PHASE - 0.72);
  for (let n = n0 - 1; n <= n0 + 1; n++) {
    const t0 = DIG_PERIOD * (n + DIG_PHASE + 0.72);
    if (t0 < DIG_FREEZE) toss(t0);
  }
  // the frozen shovelful slides off into the grave
  const tau = s - DIG_FREEZE - 0.35;
  if (tau > 0 && tau < 0.6) {
    const r = shovelRel(0.5);
    for (let i = 0; i < 5; i++) out.push({ x: DIG_X + r.blade.x + 10 * i - 20, y: GROUND + r.blade.y + 0.5 * G * px(1) * tau * tau + i * 5, r: 9 + (i % 2) * 4 });
  }
  return out;
};

export const LILY_ON_CHEST = { x: GRAVE_X - 30, y: GROUND + px(GRAVE_D) - 40 };
export { DIG_FREEZE, FUNMAX, OPER, TAG, GRAB, E2, NEWT_SCALE };
export type { Hand };
void num;
