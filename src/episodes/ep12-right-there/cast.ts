import { ease, num, type NumKey } from "../../lib/kf";
import { POSES } from "../../rig/library";
import { build, type Script } from "../../rig/script";
import { pivotOf, solve, toWorld } from "../../rig/Stickman";
import type { CharState } from "../../rig/types";
import { reach } from "../../rig2d/ik";
import { ballistic, particle } from "../ep03-the-shortcut/physics";
import {
  COIN,
  COIN_SINK,
  CRAB0,
  DASH_WATCH,
  EDGE,
  FAR,
  FLOOR_Y,
  GIVE,
  GIVE_X,
  GUM,
  HOOK,
  IN_POOL_LIFT,
  LAND_X,
  leapLift,
  LIE,
  LOOK,
  NEWT_GRIP,
  NEWT_KNEEL_X,
  NEWT_LANE,
  NEWT_SCALE,
  NEWT_X0,
  PRONE_X,
  PX_PER_M,
  SEEN1,
  STAND_X,
  STICK_DIR,
  STICK_LEN,
  STICK_REST0,
  STICK_REST1,
  STICK_TIP,
  TRY1,
  TRY2,
  TRY3,
  WADE_X,
  WISH,
  WY,
} from "./timeline";

// Everyone plays it dead serious. Dash is certain the coin is RIGHT there.
type P = { x: number; y: number };
const GROUND = 1380;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const lerpP = (a: P, b: P, u: number): P => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const prog = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const rad = (d: number) => (d * Math.PI) / 180;

/** reach() for a body that may be lying down: undo the whole-body rotation first */
const reachRot = (c: CharState, side: "a" | "b", target: P) => {
  const r = c.rot ?? 0;
  if (!r) return reach(c, side, target);
  const o = pivotOf(c);
  const a = rad(-r);
  const dx = target.x - o.x;
  const dy = target.y - o.y;
  return reach(c, side, { x: o.x + dx * Math.cos(a) - dy * Math.sin(a), y: o.y + dx * Math.sin(a) + dy * Math.cos(a) });
};
export const handOf = (c: CharState, side: "a" | "b" = "a") => toWorld(c, solve(c.pose, c.aLen ?? 1)[side === "a" ? "aHand" : "bHand"]);
const headOf = (c: CharState) => toWorld(c, solve(c.pose).head);

// ═══════════════════════ The stick (driftwood, 1.5 m) ═══════════════════════
// tip + direction (grip → tip); everything that holds it is placed on it with IK
export type Stick = { tip: P; dir: P; grip: number; z: number };
const restAt = (x: number): Stick => ({ tip: { x, y: GROUND - 6 }, dir: { x: 1, y: 0 }, grip: 0, z: 0 });
/** how far back along the line of sight the tip is, for a tip `d` metres below the surface */
const backFor = (d: number) => (STICK_TIP.y - (WY + d * PX_PER_M)) / STICK_DIR.y;
const B_OUT = backFor(-0.12); // tip just above the water
const B_DIP = backFor(0.16);
const B_DEEP = backFor(0.24);
// Dash's grip: chosen so his arm is nearly straight at the full jab
const SPEAR_SHOULDER = (() => {
  const j = solve(POSES.spear);
  return { x: STAND_X + j.shoulder.x, y: GROUND + j.shoulder.y };
})();
const DASH_GRIP = (() => {
  const reachPx = 140 * 0.92;
  for (let g = 0; g < STICK_LEN; g += 1) {
    const h = { x: STICK_TIP.x - STICK_DIR.x * g, y: STICK_TIP.y - STICK_DIR.y * g };
    if (Math.hypot(h.x - SPEAR_SHOULDER.x, h.y - SPEAR_SHOULDER.y) < reachPx) return g;
  }
  return STICK_LEN * 0.6;
})();
const spearBack: NumKey[] = [
  [TRY2.aim, B_OUT],
  [TRY2.dip1, B_DIP, "out"],
  [TRY2.out1 - 0.12, B_DIP],
  [TRY2.out1, B_OUT, "out"],
  [TRY2.dip2, B_DIP, "out"],
  [TRY2.out2 - 0.1, B_DIP],
  [TRY2.out2, B_OUT, "out"],
  [TRY2.dip3, B_DEEP, "io"],
  [TRY2.jab - 0.25, B_DEEP],
  [TRY2.jab - 0.05, B_OUT + 50, "out"], // winds back…
  [TRY2.hit, 0, "in"], // …and spears along his line of sight
  [TRY2.drop - 0.25, 0],
  [TRY2.drop, B_OUT, "out"],
];
const spearAt = (t: number): Stick => {
  const b = num(t, spearBack);
  return { tip: { x: STICK_TIP.x - STICK_DIR.x * b, y: STICK_TIP.y - STICK_DIR.y * b }, dir: STICK_DIR, grip: DASH_GRIP, z: 0 };
};
const mixStick = (a: Stick, b: Stick, u: number): Stick => {
  const aa = Math.atan2(a.dir.y, a.dir.x);
  let ab = Math.atan2(b.dir.y, b.dir.x);
  if (ab - aa > Math.PI) ab -= 2 * Math.PI;
  if (aa - ab > Math.PI) ab += 2 * Math.PI;
  const ang = lerp(aa, ab, u);
  return { tip: lerpP(a.tip, b.tip, u), dir: { x: Math.cos(ang), y: Math.sin(ang) }, grip: lerp(a.grip, b.grip, u), z: lerp(a.z, b.z, u) };
};
const gripOf = (s: Stick, g = s.grip): P => ({ x: s.tip.x - s.dir.x * g, y: s.tip.y - s.dir.y * g });
const DOWN = { x: 0, y: 1 };
/** Newt's stick, hanging straight down from his hand */
const hangFrom = (hand: P, z: number): Stick => ({ tip: { x: hand.x, y: hand.y + NEWT_GRIP }, dir: DOWN, grip: NEWT_GRIP, z });
const NEWT_HAND = {
  carry: (x: number) => ({ x: x + 62, y: GROUND - 205 }), // staff held out in front, tip clear of the sand
  over: { x: COIN.x, y: GROUND - 205 },
  touch: { x: COIN.x, y: COIN.y - NEWT_GRIP },
};

// ═══════════════════════ Dash ═══════════════════════
const KNEEL1_X = EDGE - 84;
const PRONE2_X = PRONE_X;
const dashScript: Script = {
  scale: 1,
  seed: 0,
  x: [
    [0, EDGE - 430],
    [HOOK.down - 0.15, PRONE_X - 10, "lin"],
    [HOOK.down + 0.35, PRONE_X, "out"],
    [TRY1.yank, PRONE_X],
    [TRY1.yank + 0.4, KNEEL1_X, "out"],
    [TRY2.up + 0.3, KNEEL1_X],
    [TRY2.grab - 0.1, STICK_REST0.x - DASH_GRIP - 70, "io"],
    [TRY2.aim, STAND_X, "io"],
    [TRY2.drop + 0.2, STAND_X],
    [TRY3.step - 0.35, EDGE - 46, "lin"],
    [TRY3.inn, WADE_X, "out"],
    [TRY3.launch, WADE_X],
    [TRY3.land, LAND_X, "lin"],
    [LOOK.end + 0.5, LAND_X],
    [GUM.walk + 1.1, DASH_WATCH.x, "io"],
    [GUM.show, DASH_WATCH.x],
    [GIVE.walk, GIVE_X, "io"],
    [WISH.dive - 0.35, GIVE_X],
    [WISH.dive + 0.15, PRONE2_X, "out"],
  ],
  lift: [
    [0, 0],
    [HOOK.down - 0.05, 0],
    [HOOK.down + 0.3, LIE, "in"],
    [TRY1.yank, LIE],
    [TRY1.yank + 0.35, 0, "out"],
    [TRY3.step, 0],
    [TRY3.inn, IN_POOL_LIFT, "in"],
    [TRY3.launch, IN_POOL_LIFT],
    [TRY3.land, LIE],
    [LOOK.end - 0.1, LIE],
    [LOOK.end + 0.5, 0, "io"],
    [WISH.dive - 0.3, 0],
    [WISH.dive, LIE, "in"],
  ],
  sy: [
    [0, 1],
    [TRY3.land, 1],
    [TRY3.land + 0.05, 0.86, "snap"],
    [TRY3.land + 0.3, 1, "back"],
  ],
  facing: [
    [0, 1],
    [WISH.turn, -1],
    [WISH.back, 1],
  ],
  gait: [
    [0, "walk"],
    [HOOK.down - 0.15, "none"],
    [TRY2.up + 0.3, "walk"],
    [TRY2.grab - 0.1, "none"],
    [TRY2.drop + 0.2, "walk"],
    [TRY3.step - 0.35, "none"],
    [LOOK.end + 0.5, "walk"],
    [GUM.walk + 1.1, "none"],
    [GUM.show, "walk"],
    [GIVE.walk, "none"],
  ],
  pose: [
    [0, "stand"],
    [HOOK.down - 0.15, "lie", 0.4],
    [TRY1.yank, "kneelHorror", 0.25, "snap"],
    [TRY1.look, "kneelLook", 0.3],
    [TRY2.up, "stand", 0.3],
    [TRY2.grab - 0.1, "crouchPick", 0.3],
    [TRY2.grab + 0.25, "stand", 0.3],
    [TRY2.aim - 0.2, "spear", 0.3],
    [TRY2.drop, "stand", 0.3],
    [TRY3.step - 0.35, "stand", 0.2],
    [TRY3.inn, "wade", 0.3],
    [TRY3.pinch, "toeGrab", 0.08, "snap"],
    [TRY3.launch, "flail", 0.12],
    [TRY3.land, "lie", 0.12],
    [LOOK.end - 0.1, "sitGround", 0.4],
    [LOOK.end + 0.5, "stand", 0.3],
    [GUM.walk + 1.1, "crossArms", 0.3],
    [GUM.show, "stand", 0.3],
    [GIVE.hand, "crouchPick", 0.3],
    [GIVE.take + 0.25, "stand", 0.3],
    [WISH.kiss, "wishEyes", 0.3],
    [WISH.flip - 0.25, "stand", 0.15],
    [WISH.flip - 0.12, "flipOver", 0.12, "snap"],
    [WISH.flip + 0.35, "stand", 0.3],
    [WISH.narrow + 0.2, "crouch", 0.4],
    [WISH.dive - 0.35, "lie", 0.4],
  ],
  faceX: [
    [0, 0.6],
    [HOOK.down, 0.6],
    [TRY1.horror, 0],
    [TRY1.look, 0.3],
    [TRY2.dip1, 0.6],
    [TRY3.legs, 0.2],
    [TRY3.land, 0],
    [LOOK.end + 0.5, 0.5],
    [WISH.kiss, 0],
    [WISH.flip, 0],
    [WISH.back, 0.4],
  ],
  lookY: [
    [0, 0.5],
    [TRY1.horror, 0],
    [TRY2.dip1, 0.6],
    [TRY2.end, 0],
    [TRY3.legs, 1],
    [TRY3.pinch, 0],
    [GUM.lower, 0.6],
    [GUM.show, 0],
    [WISH.back, 0.6],
  ],
  face: [
    [0, "tempted"],
    [HOOK.down + 0.3, "determined"],
    [TRY1.inWater, "confident"],
    [TRY1.still, "curious"],
    [TRY1.horror, "horror"],
    [TRY1.look, "suspicious"],
    [TRY1.fist, "confused"],
    [TRY2.grab, "determined"],
    [TRY2.dip1, "shocked"],
    [TRY2.out1, "confused"],
    [TRY2.dip2, "shocked"],
    [TRY2.out2, "suspicious"],
    [TRY2.dip3, "unimpressed"],
    [TRY2.jab - 0.25, "rage"],
    [TRY2.hit + 0.15, "cocky"],
    [TRY2.hit + 0.7, "uhoh"],
    [TRY3.step - 0.35, "determined"],
    [TRY3.legs, "horror"],
    [TRY3.crab, "uhoh"],
    [TRY3.pinch, "scream"],
    [TRY3.land, "dazed"],
    [LOOK.end - 0.1, "battered"],
    [GUM.walk + 1.1, "unimpressed"],
    [GUM.show, "shocked"],
    [GIVE.walk, "happy"],
    [WISH.kiss, "proud"],
    [WISH.flip, "content"],
    [WISH.back, "curious"],
    [WISH.narrow, "mischief"],
    [WISH.dive - 0.3, "determined"],
  ],
  aHand: [
    [0, "fist"],
    [TRY1.reach, "open"],
    [TRY1.still, "fist"],
    [TRY1.fist, "open"],
    [TRY2.up, "fist"],
    [TRY3.inn, "open"],
    [TRY3.pinch, "fist"],
    [GIVE.hand, "open"],
    [GIVE.take, "fist"],
    [WISH.flip + 0.05, "open"],
    [WISH.dive, "open"],
  ],
  bHand: [
    [0, "fist"],
    [TRY3.inn, "open"],
    [TRY3.pinch, "fist"],
  ],
  extras: () => ({ scarf: true }),
  rot: [
    [0, 0],
    [HOOK.down - 0.05, 0],
    [HOOK.down + 0.3, 90, "in"],
    [TRY1.yank, 90],
    [TRY1.yank + 0.3, 0, "out"],
    [TRY3.launch, 0],
    [TRY3.land, -90, "lin"],
    [LOOK.end - 0.1, -90],
    [LOOK.end - 0.1 + 0.5, 0, "io"],
    [WISH.dive - 0.3, 0],
    [WISH.dive, 90, "in"],
  ],
  tweak: (t, c) => {
    // try 1: the hand goes exactly where the coin LOOKS (Snell's law, timeline.ts)
    if (t > TRY1.reach - 0.3 && t < TRY1.yank) {
      const rest = handOf(c);
      const u = ease("io", prog(t, TRY1.reach - 0.3, TRY1.inWater));
      reachRot(c, "a", lerpP(rest, SEEN1, u));
    }
    // try 2: the hand rides the stick
    if (t >= TRY2.grab - 0.1 && t < TRY2.drop) reach(c, "a", gripOf(stickAt(t)));
    // try 3: the leap out backwards is a true parabola onto his back
    if (t > TRY3.launch && t <= TRY3.land) c.lift = leapLift(t);
    // the give: he plucks the coin off the gum on Newt's stick
    if (t > GIVE.hand - 0.2 && t < GIVE.take + 0.25) {
      const u = ease("io", prog(t, GIVE.hand - 0.2, GIVE.take));
      reach(c, "a", lerpP(handOf(c), stickAt(t).tip, u));
    }
    if (t > TRY3.legs && t < TRY3.crab) c.pose = { ...c.pose, head: c.pose.head + 14 };
  },
};

// ═══════════════════════ Newt ═══════════════════════
const N_TIP0 = STICK_REST1.x; // the stick's tip end on the sand after Dash drops it
const N_PRESS_X = N_TIP0 - 74;
const N_GRAB_X = N_TIP0 - NEWT_GRIP - 40;
const newtScript: Script = {
  scale: NEWT_SCALE,
  seed: 3,
  x: [
    [0, NEWT_X0],
    [LOOK.end - 0.6, NEWT_X0],
    [GUM.mouth - 0.4, N_PRESS_X, "lin"],
    [GUM.back, N_PRESS_X],
    [GUM.grab - 0.1, N_GRAB_X, "io"],
    [GUM.walk2, N_GRAB_X],
    [GUM.kneel - 0.1, NEWT_KNEEL_X, "lin"],
    [GIVE.take + 0.9, NEWT_KNEEL_X],
    // round the back of the pool to the far side, to watch from across the water
    [GIVE.take + 2.3, FAR + 86, "lin"],
  ],
  lift: [[0, 0]],
  sy: [[0, 1]],
  facing: [
    [0, 1],
    [GUM.show + 0.1, -1],
    [GIVE.take + 0.6, 1],
    [GIVE.take + 2.35, -1],
  ],
  gait: [
    [0, "none"],
    [LOOK.end - 0.6, "walk"],
    [GUM.mouth - 0.4, "none"],
    [GUM.back + 0.1, "walk"],
    [GUM.grab - 0.1, "none"],
    [GUM.walk2, "walk"],
    [GUM.kneel - 0.1, "none"],
    [GIVE.take + 0.9, "walk"],
    [GIVE.take + 2.3, "none"],
  ],
  pose: [
    [0, "stand"],
    [TRY1.horror, "alarmed", 0.15],
    [TRY1.look, "stand", 0.4],
    [TRY2.dip2 + 0.3, "tap", 0.3],
    [TRY2.hit, "stand", 0.3],
    [TRY3.legs, "coverEyes", 0.25],
    [TRY3.pinch, "stand", 0.2],
    [TRY3.land + 0.25, "facepalm", 0.2],
    [LOOK.at - 0.3, "thumbMeasure", 0.3],
    [LOOK.end - 0.6, "stand", 0.3],
    [GUM.mouth - 0.1, "crouchPick", 0.3],
    [GUM.back, "stand", 0.3],
    [GUM.grab - 0.1, "crouchPick", 0.3],
    [GUM.raise, "stand", 0.4],
    [GUM.kneel - 0.1, "kneel", 0.35],
    [GUM.show, "stand", 0.4],
    [GIVE.take + 0.4, "stand", 0.3],
    [WISH.plop - 0.6, "lookUp", 0.3],
    [WISH.settle, "stand", 0.3],
    [WISH.dive - 0.15, "facepalm", 0.2],
  ],
  faceX: [
    [0, 0.5],
    [GIVE.take + 1.3, 0.4],
  ],
  lookY: [
    [0, 0.4],
    [TRY1.horror, 0],
    [TRY3.legs, 0.6],
    [TRY3.pinch, 0],
    [GUM.lower, 1],
    [GUM.show, 0],
    [WISH.settle, 0.5],
  ],
  face: [
    [0, "kidHappy"],
    [TRY1.horror, "kidWorried"],
    [TRY1.look, "kidCurious"],
    [TRY2.dip1, "kidDeadpan"],
    [TRY2.hit, "kidConcern"],
    [TRY2.end, "kidDeadpan"],
    [TRY3.legs, "kidWow"],
    [TRY3.pinch, "kidWorried"],
    [TRY3.land + 0.25, "kidDeadpan"],
    [LOOK.at - 0.3, "kidFocus"],
    [GUM.walk, "kidSmile"],
    [GUM.lower, "kidFocus"],
    [GUM.show, "kidJoy"],
    [GIVE.walk, "kidSmile"],
    [WISH.plop - 0.6, "kidWow"],
    [WISH.settle, "kidDeadpan"],
    [WISH.dive - 0.15, "kidDisappointed"],
  ],
  aHand: [
    [0, "fist"],
    [TRY1.horror, "open"],
    [TRY1.look, "fist"],
    [LOOK.at - 0.3, "thumb"],
    [GUM.walk, "fist"],
    [GUM.mouth, "point"],
    [GUM.grab, "fist"],
    [GIVE.take + 0.4, "fist"],
  ],
  bHand: [[0, "fist"]],
  extras: (t) => ({
    partyHat: true,
    blush: true,
    // bubble gum: the plant (hook, and a deadpan bubble while Dash fights the stick), then it's the tool
    bubble:
      t < GUM.mouth
        ? Math.max(
            num(t, [[HOOK.bubble - 0.4, 0], [HOOK.bubble + 0.5, 1, "out"], [HOOK.bubble + 0.55, 0, "snap"]]),
            num(t, [[TRY2.out2 - 0.6, 0], [TRY2.dip3 + 0.3, 1.15, "out"], [TRY2.hit, 1.15], [TRY2.hit + 0.04, 0, "snap"]]),
          )
        : 0,
  }),
  tweak: (t, c) => {
    // gum out of his mouth, pressed on the tip, then the stick
    if (t > GUM.mouth - 0.2 && t < GUM.press) {
      const h = headOf(c);
      reach(c, "a", { x: h.x + 26, y: h.y + 26 });
    }
    if (t >= GUM.press && t < GUM.back) reach(c, "a", { x: N_TIP0, y: GROUND - 10 });
    if (t >= GUM.grab - 0.1) reach(c, "a", gripOf(stickAt(t)));
  },
};

// ═══════════════════════ The stick over time ═══════════════════════
const AIM0 = spearAt(TRY2.aim);
export const stickAt = (t: number): Stick => {
  const r0 = restAt(STICK_REST0.x);
  const r1 = restAt(STICK_REST1.x);
  if (t < TRY2.grab) return { ...r0, grip: DASH_GRIP };
  if (t < TRY2.aim) return mixStick({ ...r0, grip: DASH_GRIP }, AIM0, ease("io", prog(t, TRY2.grab + 0.15, TRY2.aim)));
  if (t < TRY2.drop) return spearAt(t);
  if (t < GUM.grab) {
    // dropped: it falls flat on the sand at the rim and lies there
    const end = spearAt(TRY2.drop);
    return mixStick(end, { ...r1, grip: NEWT_GRIP }, ease("in", prog(t, TRY2.drop, TRY2.drop + 0.35)));
  }
  // Newt: picks it up by the grip and swings it upright, tip down (gum on the tip)
  if (t < GUM.raise) return { ...r1, grip: NEWT_GRIP };
  const up = hangFrom(handTarget(t), newtLane(t) + 0.144);
  if (t < GUM.raise + 0.45) return mixStick({ ...r1, grip: NEWT_GRIP }, up, ease("io", prog(t, GUM.raise, GUM.raise + 0.45)));
  return up;
};
/** where Newt's hand holds the stick (world px) */
const newtX = (t: number) => num(t, newtScript.x);
const handTarget = (t: number): P => {
  const nx = newtX(t);
  if (t < GUM.kneel) return NEWT_HAND.carry(nx);
  if (t < GUM.lower) return lerpP(NEWT_HAND.carry(nx), NEWT_HAND.over, ease("io", prog(t, GUM.kneel - 0.1, GUM.kneel + 0.25)));
  if (t < GUM.lift) return lerpP(NEWT_HAND.over, NEWT_HAND.touch, ease("io", prog(t, GUM.lower, GUM.touch)));
  if (t < GUM.show) return lerpP(NEWT_HAND.touch, NEWT_HAND.over, ease("io", prog(t, GUM.lift, GUM.lift + 0.5)));
  // standing, turning to Dash, and holding the coin out to him at his reach
  const show = { x: nx - 64, y: GROUND - 305 };
  if (t < GIVE.take + 0.3) return lerpP(NEWT_HAND.over, show, ease("io", prog(t, GUM.show, GUM.show + 0.5)));
  // carried like a staff, always in front of him (eases round when he turns)
  const side = num(t, [[GIVE.take + 0.45, -1], [GIVE.take + 0.75, 1], [GIVE.take + 2.2, 1], [GIVE.take + 2.5, -1]]);
  return lerpP(show, { x: nx + side * 50, y: GROUND - 250 }, ease("io", prog(t, GIVE.take + 0.3, GIVE.take + 0.8)));
};

// ═══════════════════════ Placement ═══════════════════════
export type Placed = { c: CharState; z: number; turn: number };
const newtState = (t: number) => build(newtScript, t);
export const dashAt = (t: number): Placed => ({
  c: build(dashScript, t),
  z: num(t, [[0, -0.21]]),
  turn: num(t, [[0, 0], [GUM.walk + 0.9, 0], [GUM.walk + 1.3, 30], [GUM.show, 30], [GUM.show + 0.3, 0]]),
});
const newtLane = (t: number) => num(t, [[0, NEWT_LANE], [GUM.mouth - 0.4, NEWT_LANE], [GUM.mouth - 0.1, -0.144, "io"], [GIVE.take + 0.4, -0.144], [GIVE.take + 0.9, -1.25, "io"], [GIVE.take + 2.3, -1.25], [GIVE.take + 2.9, -0.3, "io"]]);
export const newtAt = (t: number): Placed => ({
  c: newtState(t),
  z: newtLane(t),
  turn: num(t, [[0, 30], [LOOK.end - 0.8, 30], [LOOK.end - 0.6, 0], [GIVE.take + 0.4, 0], [GIVE.take + 1.2, 25]]),
});

// ═══════════════════════ The coin ═══════════════════════
// 3D position in metres + whether it's glinting. On the bottom → on the gum on the tip → in Dash's hand →
// over his shoulder into the pool (a true parabola) → sinking at terminal speed → on the bottom again.
const M = (p: P, z: number): [number, number, number] => [p.x / PX_PER_M, (GROUND - p.y) / PX_PER_M, z];
const palm = (c: CharState) => {
  const j = solve(c.pose);
  const fore = j.aForeAng;
  return toWorld(c, { x: j.aHand.x + Math.sin(rad(fore)) * 14, y: j.aHand.y + Math.cos(rad(fore)) * 14 });
};
const FLIP_FROM = () => {
  const d = dashAt(WISH.flip);
  return palm(d.c);
};
export const coinAt = (t: number): { p: [number, number, number]; spin: number } => {
  if (t < GUM.touch) return { p: M({ x: COIN.x, y: COIN.y }, COIN.z), spin: 0 };
  if (t < GIVE.take) {
    const s = stickAt(t);
    return { p: M({ x: s.tip.x, y: s.tip.y + 4 }, s.z), spin: 0 };
  }
  if (t < WISH.flip) {
    const d = dashAt(t);
    return { p: M(palm(d.c), d.z + 0.21), spin: 0 };
  }
  if (t < WISH.plop) {
    const a = FLIP_FROM();
    const u = prog(t, WISH.flip, WISH.plop);
    const y = GROUND - ballistic(t, WISH.flip, WISH.plop, GROUND - a.y, GROUND - WY);
    return { p: [lerp(a.x, COIN_SINK.x, u) / PX_PER_M, (GROUND - y) / PX_PER_M, lerp(0, COIN_SINK.z, u)], spin: (t - WISH.flip) * 22 };
  }
  // sinking at ~0.7 m/s, fluttering side to side
  const u = prog(t, WISH.plop, WISH.settle);
  const y = lerp(WY, FLOOR_Y - 1.5, u);
  const flutter = Math.sin((t - WISH.plop) * 14) * 9 * (1 - u);
  return { p: M({ x: COIN_SINK.x + flutter, y }, COIN_SINK.z), spin: u < 1 ? Math.sin((t - WISH.plop) * 14) * 0.8 : 0 };
};

// ═══════════════════════ The crab ═══════════════════════
// Guards the coin. Bonked by the stick (it gets cross), pinches Dash's toe, rides the leap, lets go.
export type Crab = { p: [number, number, number]; yaw: number; angry: number; claw: number; walk: number };
const toeOf = (c: CharState) => {
  const j = solve(c.pose);
  return toWorld(c, { x: j.aFoot.x + 46, y: j.aFoot.y - 8 });
};
export const crabAt = (t: number): Crab => {
  const home = { x: CRAB0.x, y: FLOOR_Y - 10 };
  const angry = t < TRY2.hit ? 0 : t < TRY3.crabOff ? 1 : Math.max(0, 1 - (t - TRY3.crabOff) / 2);
  const claw = Math.abs(Math.sin(t * 6)) * 0.25 + (t > TRY3.pinch - 0.2 && t < TRY3.crabOff ? 0.6 : 0);
  if (t < TRY3.crab) {
    // the bonk: it's knocked flat for a moment
    const squash = t > TRY2.hit && t < TRY2.hit + 0.3 ? 1 - (t - TRY2.hit) / 0.3 : 0;
    return { p: M({ x: home.x, y: home.y + squash * 6 }, CRAB0.z), yaw: 0, angry, claw, walk: 0 };
  }
  const d = dashAt(Math.min(t, TRY3.crabOff));
  const toe = toeOf(d.c);
  const toeZ = d.z + 0.11;
  if (t < TRY3.pinch) {
    // scuttles sideways to his toe
    const u = ease("io", prog(t, TRY3.crab, TRY3.pinch - 0.15));
    return { p: M(lerpP(home, { x: toe.x + 14, y: FLOOR_Y - 10 }, u), lerp(CRAB0.z, toeZ, u)), yaw: 0, angry, claw, walk: u > 0 && u < 1 ? t : 0 };
  }
  if (t < TRY3.crabOff) return { p: M({ x: toe.x + 8, y: toe.y + 4 }, toeZ), yaw: (d.c.rot ?? 0) * -0.5, angry, claw, walk: 0 };
  // lets go: drops to the sand, scuttles back to the rim, hops in, and goes home
  const off = { x: toe.x + 8, y: toe.y + 4 };
  const t1 = TRY3.crabOff + 0.35;
  if (t < t1) {
    const p = particle(t - TRY3.crabOff, off.x, off.y, 40, -150);
    return { p: M({ x: p.x, y: Math.min(GROUND - 10, p.y) }, toeZ), yaw: 0, angry, claw: 0.2, walk: 0 };
  }
  const land = { x: off.x + 40 * 0.35, y: GROUND - 10 };
  const rim = { x: EDGE - 10, y: GROUND - 10 };
  const t2 = t1 + 1.2;
  if (t < t2) {
    const u = ease("io", prog(t, t1, t2));
    return { p: M(lerpP(land, rim, u), lerp(toeZ, CRAB0.z, u)), yaw: 0, angry, claw: 0.2, walk: t };
  }
  const t3 = t2 + 0.5;
  if (t < t3) {
    const y = GROUND - ballistic(t, t2, t3, GROUND - rim.y, GROUND - home.y);
    return { p: M({ x: lerp(rim.x, home.x - 30, prog(t, t2, t3)), y }, CRAB0.z), yaw: 0, angry, claw: 0.2, walk: 0 };
  }
  const t4 = t3 + 0.6;
  const u = ease("io", prog(t, t3, t4));
  return { p: M({ x: lerp(home.x - 30, home.x, u), y: home.y }, CRAB0.z), yaw: 0, angry, claw, walk: u > 0 && u < 1 ? t : 0 };
};

// ripples on the surface: [time, x, z] (m)
export const RIPPLES: (readonly [number, number, number])[] = [
  [TRY1.inWater, SEEN1.x / PX_PER_M - 0.05, 0],
  [TRY1.yank + 0.05, (EDGE + 40) / PX_PER_M, 0],
  [TRY2.dip1, (STICK_TIP.x - STICK_DIR.x * B_DIP) / PX_PER_M - 0.1, 0],
  [TRY2.dip2, (STICK_TIP.x - STICK_DIR.x * B_DIP) / PX_PER_M - 0.1, 0],
  [TRY2.dip3, (STICK_TIP.x - STICK_DIR.x * B_DEEP) / PX_PER_M - 0.1, 0],
  [TRY2.hit - 0.08, (STICK_TIP.x - 80) / PX_PER_M, 0],
  [TRY3.inn, WADE_X / PX_PER_M, -0.21],
  [TRY3.launch, WADE_X / PX_PER_M, -0.21],
  [GUM.lower + 0.15, COIN.x / PX_PER_M, 0],
  [GUM.lift + 0.2, COIN.x / PX_PER_M, 0],
  [WISH.plop, COIN_SINK.x / PX_PER_M, COIN_SINK.z],
];
export const KICKS: readonly (readonly [number, number])[] = [
  [TRY2.hit, 10],
  [TRY3.pinch, 8],
  [TRY3.land, 16],
];
