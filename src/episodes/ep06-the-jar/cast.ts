import type { PoseKey } from "../../rig/library";
import { build, type Script } from "../../rig/script";
import { HEAD_SCALE, solve, toWorld, GROUND } from "../../rig/Stickman";
import type { CharState } from "../../rig/types";
import { G } from "./physics";
import type { JamState, JarState } from "./props";
import {
  BONK_T,
  COUNTER,
  CROWBAR_X,
  DASH_X0,
  GRIP,
  HEART,
  HEAVE_X,
  INTRO,
  JAM,
  JAM_COUNTER_X,
  JAM_SHELF_X,
  JAR,
  JAR_COUNTER_X,
  JAR_FLOOR_X,
  JAR_TABLE_X,
  KNEE_JAR,
  KNEEL_T,
  LID_JAM,
  LID_V0,
  LID_VX,
  LOOK,
  NEWT_PICK_X,
  NEWT_SCALE,
  NEWT_SHARE_X,
  NEWT_TABLE_X,
  NEWT_X0,
  PLACE_X,
  PRY_X,
  SHELF,
  SIT_T,
  SIT_X,
  SPOON_TABLE_X,
  T1,
  T2,
  T3,
  TABLE,
  TRICK,
  TWIST,
  TWIST_PERIOD,
  WALK1_END,
  WALK_SPEED,
  WOMP_1,
  WRENCH_GRAB_X,
  WRENCH_X,
} from "./timeline";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const smooth = (u: number) => {
  const k = clamp01(u);
  return k * k * (3 - 2 * k);
};
const deg = (r: number) => (r * 180) / Math.PI;

/** Alternate two poses every `period/2` s between t0 and t1 (strain wobble, body twist) */
const wobble = (t0: number, t1: number, a: PoseKey[1], b: PoseKey[1], period: number, blend = 0.12): PoseKey[] => {
  const out: PoseKey[] = [];
  for (let t = t0, k = 0; t < t1 - 0.01; t += period / 2, k++) out.push([t, k % 2 ? b : a, blend, "io"]);
  return out;
};

const WALK2_END = T3.back + (WRENCH_GRAB_X - PLACE_X) / WALK_SPEED;
const STEP_END = T3.step + 0.25;

// ═══════════════════════ Dash ═══════════════════════
const heroScript: Script = {
  scale: 1,
  seed: 0,
  x: [
    [0, DASH_X0],
    [T3.walk, DASH_X0],
    [WALK1_END, WRENCH_GRAB_X, "lin"],
    [T3.back, WRENCH_GRAB_X],
    [WALK2_END, PLACE_X, "lin"],
    [T3.step, PLACE_X],
    [STEP_END, HEAVE_X, "out"],
    [T3.slip, HEAVE_X],
    [SIT_T, SIT_X, "lin"],
    [TWIST.reach - 0.15, SIT_X],
    [TWIST.reach, PRY_X, "io"],
  ],
  lift: [[0, 0]],
  sy: [
    [0, 1],
    [SIT_T, 1],
    [SIT_T + 0.05, 0.84, "snap"],
    [SIT_T + 0.32, 1, "back"],
    [BONK_T, 1],
    [BONK_T + 0.04, 0.88, "snap"],
    [BONK_T + 0.3, 1, "back"],
  ],
  facing: [
    [0, 1],
    [T3.back, -1],
    [TWIST.turn, 1],
    [TWIST.back, -1],
  ],
  gait: [
    [0, "none"],
    [T3.walk, "walkLegs"],
    [WALK1_END, "none"],
    [T3.back, "walkLegs"],
    [WALK2_END, "none"],
    [T3.step, "walkLegs"],
    [STEP_END, "none"],
  ],
  pose: [
    [0, "stand"],
    [INTRO.rub, "rub", 0.2],
    [INTRO.cocky, "smugPoint", 0.2, "back"],
    [INTRO.grab, "grabJar", 0.22],
    [INTRO.lift, "twistJar", 0.25],
    // TRY #1 — bare hands: strain, wobble, the hand slips off
    [T1.twist, "twistJar", 0.1],
    [T1.strain, "strainJar", 0.3],
    ...wobble(T1.strain + 0.35, T1.slip, "twistJar", "strainJar", 0.5),
    [T1.slip, "slipOff", 0.08, "snap"],
    [T1.shake, "shakeHand", 0.2],
    [T1.end, "twistJar", 0.25],
    // TRY #2 — scarf on the lid, jar clamped between the knees, whole-body twist
    [T2.clamp, "kneeClampB", 0.3],
    ...wobble(T2.twist, T2.unwrap, "kneeClampA", "kneeClampB", TWIST_PERIOD),
    [T2.unwrap, "twistJar", 0.3],
    // TRY #3 — the pipe wrench
    [WALK1_END, "grabLowHold", 0.2],
    [T3.place, "crouchPlace", 0.3],
    [T3.set + 0.08, "stand", 0.2],
    [T3.heave, "heave", 0.25],
    ...wobble(T3.heave + 0.3, T3.slip, "heave2", "heave", 0.44),
    [T3.slip, "flail", 0.06, "snap"],
    [SIT_T - 0.05, "sitGround", 0.1],
    [SIT_T + 0.4, "sitSlump", 0.3],
    [LOOK.still, "sitGround", 0.3],
    // the wrong lesson: crowbar + jam jar
    [TWIST.up, "crouch", 0.2],
    [TWIST.up + 0.25, "stand", 0.15],
    [TWIST.cocky, "smugPoint", 0.2, "back"],
    [TWIST.turn, "stand", 0.1],
    [TWIST.grab, "grabLow", 0.2],
    [TWIST.got + 0.05, "stand", 0.12],
    [TWIST.reach, "reachUp", 0.2],
    [TWIST.place, "placeCounter", 0.25],
    [TWIST.pry, "pry", 0.2],
    [TWIST.down, "pryDown", 0.08, "snap"],
    [TWIST.proud, "handsHips", 0.2, "back"],
    [KNEEL_T, "kneel", 0.3],
    // heart
    [HEART.reach, "kneelReach", 0.2],
    [HEART.chew, "kneelChew", 0.2],
    [HEART.takeSpoon, "kneelTake", 0.2],
    [HEART.proud, "kneelSpoon", 0.25, "back"],
  ],
  faceX: [
    [0, 0.6],
    [INTRO.cocky - 0.1, 0.6],
    [INTRO.cocky, 0, "out"],
    [INTRO.grab - 0.1, 0],
    [INTRO.grab, 0.6],
    [TWIST.cocky - 0.1, 0.6],
    [TWIST.cocky, 0, "out"],
    [TWIST.turn - 0.05, 0],
    [TWIST.turn, 0.6],
    [BONK_T + 0.25, 0.6],
    [BONK_T + 0.4, 0, "out"],
    [KNEEL_T + 0.3, 0],
    [KNEEL_T + 0.5, 0.6],
  ],
  lookY: [
    [0, 0],
    [INTRO.grab, 0.5],
    [T1.shake, 0],
    [T2.clamp, 1],
    [T2.unwrap, 0],
    [TWIST.reach, -1],
    [TWIST.place, 0.5],
    [TWIST.launch, -1],
    [BONK_T, 0],
  ],
  face: [
    [0, "expectant"],
    [INTRO.rub, "mischief"],
    [INTRO.cocky, "cocky"],
    [INTRO.grab, "confident"],
    [T1.twist, "determined"],
    [T1.strain, "strain"],
    [T1.strain + 1.0, "puffed"],
    [T1.slip, "ow"],
    [T1.shake + 0.7, "unimpressed"],
    [T2.scarfOff, "determined"],
    [T2.twist, "strain"],
    [T2.twist + 1.4, "rage"],
    [T2.unwrap, "battered"],
    [T3.walk, "determined"],
    [T3.heave, "braced"],
    [T3.heave + 0.4, "strain"],
    [T3.slip, "alarmed"],
    [SIT_T, "dazed"],
    [WOMP_1 - 0.1, "deadpan"],
    [LOOK.walk, "resigned"],
    [TRICK.tok, "shocked"],
    [TRICK.lift, "caught"],
    [TWIST.idea, "idea"],
    [TWIST.cocky, "cocky"],
    [TWIST.grab, "mischief"],
    [TWIST.pry, "determined"],
    [TWIST.down, "braced"],
    [TWIST.proud, "smug"],
    [BONK_T, "squashed"],
    [BONK_T + 0.3, "deadpan"],
    [HEART.offer, "sheepish"],
    [HEART.chew, "content"],
    [HEART.proud, "confident"],
  ],
  aHand: [
    [0, "open"],
    [INTRO.grab, "fist"],
    [T1.slip, "open"],
    [T1.end, "fist"],
    [T3.set, "open"],
    [T3.heave, "fist"],
    [SIT_T + 0.05, "open"],
    [TWIST.grab, "fist"],
    [TWIST.proud, "open"],
    [KNEEL_T, "open"],
    [HEART.reach, "fist"],
    [HEART.chew + 0.6, "open"],
    [HEART.takeSpoon, "fist"],
  ],
  bHand: [
    [0, "open"],
    [INTRO.grab, "fist"],
    [T3.set, "open"],
    [T3.heave, "fist"],
    [T3.slip, "open"],
    [TWIST.got, "fist"],
    [TWIST.proud, "open"],
  ],
  extras: (t) => ({
    scarf: true,
    scarfTails: !(t > T2.scarfOff + 0.2 && t < T2.unwrap + 0.25),
    flush: heroFlush(t),
  }),
  tweak: (t, c) => {
    // straining: the whole body trembles
    const trembling = (t > T1.strain && t < T1.slip) || (t > T2.twist && t < T2.unwrap) || (t > T3.heave + 0.2 && t < T3.slip) || (t > TWIST.pry && t < TWIST.down);
    if (trembling) c.x += Math.sin(t * 71) * 1.6;
    // shaking the stung hand out
    if (t > T1.shake + 0.1 && t < T1.end) {
      c.pose = { ...c.pose, aS: c.pose.aS + Math.sin(t * 38) * 26, aE: c.pose.aE + Math.sin(t * 38 + 1) * 18 };
    }
    // panting after the scarf twist
    if (t > T2.pant && t < T2.end + 0.4) c.pose = { ...c.pose, lean: c.pose.lean + 6 + Math.sin(t * 14) * 3 };
  },
};

/** Red face: builds while he strains, fades when he stops */
const heroFlush = (t: number) => {
  const ramp = (a: number, b: number, peak: number) => (t < a || t > b + 0.6 ? 0 : t < b ? peak * smooth((t - a) / (b - a)) : peak * (1 - (t - b) / 0.6));
  return Math.max(ramp(T1.strain, T1.slip, 0.85), ramp(T2.twist, T2.unwrap, 1), ramp(T3.heave + 0.2, T3.slip, 0.9), ramp(TWIST.pry, TWIST.down, 0.4));
};

// ═══════════════════════ Newt ═══════════════════════
const NEWT_WALK1_END = LOOK.pick - 0.1;
const kidScript: Script = {
  scale: NEWT_SCALE,
  seed: 1.7,
  x: [
    [0, NEWT_X0],
    [LOOK.walk, NEWT_X0],
    [NEWT_WALK1_END, NEWT_PICK_X, "lin"],
    [LOOK.back, NEWT_PICK_X],
    [LOOK.place - 0.05, NEWT_TABLE_X, "lin"],
    [HEART.walk, NEWT_TABLE_X],
    [HEART.offer - 0.05, NEWT_SHARE_X, "lin"],
  ],
  lift: [[0, 0]],
  sy: [[0, 1]],
  facing: [
    [0, -1],
    [T1.newtLooks, 1],
    [LOOK.back, -1],
    [TWIST.look, 1],
    [HEART.take - 0.3, -1],
    [HEART.walk, 1],
  ],
  gait: [
    [0, "none"],
    [LOOK.walk, "walk"],
    [NEWT_WALK1_END, "none"],
    [LOOK.back, "walkLegs"],
    [LOOK.place - 0.05, "none"],
    [HEART.walk, "walkLegs"],
    [HEART.offer - 0.05, "none"],
  ],
  pose: [
    [0, "colour"],
    [T1.newtLooks, "stand", 0.25],
    [WOMP_1, "facepalm", 0.25],
    [WOMP_1 + 1.2, "stand", 0.25],
    [NEWT_WALK1_END, "crouchPick", 0.25],
    [LOOK.up, "holdJar", 0.25],
    [LOOK.place, "placeTable", 0.25],
    [LOOK.still, "stand", 0.3],
    [TRICK.grab, "spoonGrab", 0.2],
    [TRICK.under, "spoonPry", 0.25],
    [TRICK.pass, "spoonPass", 0.2],
    [TRICK.twist, "twistOff", 0.25],
    [TRICK.lift, "liftLid", 0.2, "back"],
    [TRICK.lidDown, "lidDown", 0.25],
    [TRICK.lidDown + 0.35, "stand", 0.2],
    [BONK_T + 0.3, "facepalm", 0.2],
    [BONK_T + 1.0, "stand", 0.2],
    [HEART.take, "takeJarA", 0.2],
    [HEART.walk - 0.05, "offerJar", 0.2],
    [HEART.give, "giveSpoon", 0.2],
    [HEART.takeSpoon + 0.25, "offerJar", 0.25],
  ],
  faceX: [[0, 0.6]],
  lookY: [
    [0, 1],
    [T1.newtLooks, 0],
    [LOOK.pick - 0.1, 1],
    [LOOK.up, 0],
    [TRICK.grab, 0.6],
    [TRICK.lift, -0.5],
    [TRICK.lidDown, 0.6],
    [TWIST.look, 0],
    [TWIST.launch, -1],
    [BONK_T, 0],
  ],
  face: [
    [0, "kidHappy"],
    [T1.newtLooks, "kidCurious"],
    [T1.slip, "kidConcern"],
    [T2.twist, "kidDeadpan"],
    [T3.slip, "kidConcern"],
    [WOMP_1, "kidDeadpan"],
    [LOOK.walk, "kidSmile"],
    [LOOK.still, "kidFocus"],
    [TRICK.grab, "kidSmile"],
    [TRICK.tok, "kidWow"],
    [TRICK.win, "kidJoy"],
    [TWIST.look, "kidCurious"],
    [TWIST.launch, "kidConcern"],
    [BONK_T, "kidDeadpan"],
    [HEART.take, "kidSmile"],
    [HEART.laugh, "laughing"],
  ],
  aHand: [
    [0, "point"],
    [T1.newtLooks, "open"],
    [NEWT_WALK1_END, "fist"],
    [LOOK.still, "open"],
    [TRICK.grab, "fist"],
    [TRICK.lidDown + 0.3, "open"],
    [HEART.take, "fist"],
  ],
  bHand: [
    [0, "open"],
    [NEWT_WALK1_END, "fist"],
    [LOOK.still, "open"],
    [TRICK.under, "fist"],
    [HEART.spoon, "open"],
  ],
  extras: () => ({ partyHat: true, blush: true }),
};

export const heroAt = (t: number) => build(heroScript, t);
export const kidAt = (t: number) => build(kidScript, t);

// ═══════════════════════ Rig points ═══════════════════════
type Pt = { x: number; y: number };
const joints = (c: CharState) => solve(c.pose, c.aLen ?? 1);
export const handOf = (c: CharState): Pt => toWorld(c, joints(c).aHand);
export const backHandOf = (c: CharState): Pt => toWorld(c, joints(c).bHand);
/** A point given in head-local coordinates (before HEAD_SCALE), in world space */
export const headPoint = (c: CharState, local: Pt) => {
  const j = joints(c);
  const a = (j.headAng * Math.PI) / 180;
  const lx = local.x * HEAD_SCALE;
  const ly = local.y * HEAD_SCALE;
  return toWorld(c, { x: j.head.x + lx * Math.cos(a) - ly * Math.sin(a), y: j.head.y + lx * Math.sin(a) + ly * Math.cos(a) });
};
export const headTop = (c: CharState) => headPoint(c, { x: 0, y: -52 });
export const headCentre = (c: CharState) => headPoint(c, { x: 0, y: 0 });
/** Screen angle of a character's head tilt (deg, + = clockwise on screen) */
export const headTilt = (c: CharState) => c.facing * joints(c).headAng + (c.rot ?? 0);
/** Screen angle (deg from +x) a forearm points along */
const foreAngle = (c: CharState, which: "a" | "b") => {
  const f = ((which === "a" ? joints(c).aForeAng : joints(c).bForeAng) * Math.PI) / 180;
  return deg(Math.atan2(Math.cos(f) * c.scale * c.sy, c.facing * Math.sin(f) * c.scale * c.sx)) + (c.rot ?? 0);
};
const h = (p: Pt) => GROUND - p.y; // screen y → height above ground

// ═══════════════════════ The pickle jar ═══════════════════════
const dashGrip = (t: number) => {
  const p = backHandOf(heroAt(t));
  return { x: p.x, h: h(p) - GRIP };
};
const newtGrip = (t: number, which: "a" | "b") => {
  const k = kidAt(t);
  const p = which === "a" ? handOf(k) : backHandOf(k);
  return { x: p.x, h: h(p) - GRIP };
};
const kneeSpot = (t: number) => {
  const c = heroAt(t);
  return { x: c.x + c.facing * KNEE_JAR.dx, h: KNEE_JAR.bottom };
};
const mixPt = (a: { x: number; h: number }, b: { x: number; h: number }, u: number) => ({ x: lerp(a.x, b.x, u), h: lerp(a.h, b.h, u) });
const ON_COUNTER = { x: JAR_COUNTER_X, h: COUNTER.top };
const ON_FLOOR = { x: JAR_FLOOR_X, h: 0 };
const ON_TABLE = { x: JAR_TABLE_X, h: TABLE.top };
const LID_ON_TABLE = { x: JAR_TABLE_X + 52, h: TABLE.top }; // set down just behind the jar

const jarPlace = (t: number) => {
  const held = INTRO.grab + 0.18;
  if (t < held) return ON_COUNTER;
  if (t < T2.wrapped) return dashGrip(t);
  if (t < T2.clamp + 0.3) return mixPt(dashGrip(t), kneeSpot(t), smooth((t - T2.wrapped) / (T2.clamp + 0.3 - T2.wrapped)));
  if (t < T2.unwrap) return kneeSpot(t);
  if (t < T2.unwrap + 0.3) return mixPt(kneeSpot(t), dashGrip(t), smooth((t - T2.unwrap) / 0.3));
  if (t < T3.set) return dashGrip(t);
  if (t < LOOK.pick + 0.15) return ON_FLOOR;
  if (t < LOOK.picked + 0.05) return mixPt(ON_FLOOR, newtGrip(t, "b"), smooth((t - LOOK.pick - 0.15) / (LOOK.picked - LOOK.pick - 0.1)));
  if (t < LOOK.placed) return newtGrip(t, "b");
  if (t < HEART.take + 0.15) return ON_TABLE;
  if (t < HEART.take + 0.3) return mixPt(ON_TABLE, newtGrip(t, "a"), smooth((t - HEART.take - 0.15) / 0.15));
  return newtGrip(t, "a");
};

export const jarAt = (t: number): JarState => {
  const p = jarPlace(t);
  const straining = (t > T1.strain && t < T1.slip) || (t > T2.twist && t < T2.unwrap) || (t > T3.heave + 0.2 && t < T3.slip);
  let rot = straining ? Math.sin(t * 63) * 2.2 : 0;
  if (t > T2.twist && t < T2.unwrap) rot += Math.sin(((t - T2.twist) / TWIST_PERIOD) * Math.PI * 2) * 5;
  // the lid stays put through every brute-force try, then twists off for Newt
  const turn = t < TRICK.twist ? 0 : 0.7 * smooth((t - TRICK.twist) / (TRICK.lift - TRICK.twist));
  const lidOff = t >= TRICK.lift;
  let lid = { on: !lidOff, x: p.x, h: p.h + JAR.h, rot: 0 };
  if (lidOff && t < TRICK.lidDown + 0.2) {
    const hp = handOf(kidAt(t));
    lid = { on: false, x: hp.x, h: h(hp) - 6, rot: 0 };
    if (t > TRICK.lidDown) lid = { on: false, ...mixPt({ x: hp.x, h: h(hp) - 6 }, LID_ON_TABLE, smooth((t - TRICK.lidDown) / 0.2)), rot: 0 };
  } else if (lidOff) lid = { on: false, ...LID_ON_TABLE, rot: 0 };
  return {
    x: p.x,
    h: p.h,
    rot,
    lid,
    button: t < TRICK.tok ? 0 : smooth((t - TRICK.tok) / 0.06),
    turn,
    pickles: t < HEART.pickle ? 5 : 4,
  };
};

// ═══════════════════════ The jam jar and its flying lid ═══════════════════════
const ON_SHELF = { x: JAM_SHELF_X, h: SHELF.top };
const JAM_ON_COUNTER = { x: JAM_COUNTER_X, h: COUNTER.top };
const dashFrontGrip = (t: number) => {
  const p = handOf(heroAt(t));
  return { x: p.x, h: h(p) - GRIP };
};

export const jamAt = (t: number): JamState => {
  let p = ON_SHELF;
  if (t >= TWIST.jam && t < TWIST.set) p = t < TWIST.jam + 0.12 ? mixPt(ON_SHELF, dashFrontGrip(t), smooth((t - TWIST.jam) / 0.12)) : dashFrontGrip(t);
  if (t >= TWIST.set) p = JAM_ON_COUNTER;
  const seat = { x: p.x, h: p.h + JAM.h + JAM.lidH / 2, rot: 0, spin: 0, on: true };
  if (t < TWIST.launch) return { ...p, rot: 0, lid: seat };
  const tau = t - TWIST.launch;
  if (t < BONK_T) {
    return {
      ...p,
      rot: 0,
      lid: { x: LID_JAM.x0 + LID_VX * tau, h: LID_JAM.h0 + LID_V0 * tau - 0.5 * G * tau * tau, rot: tau * 140, spin: tau * 23, on: false },
    };
  }
  // landed flat on his head: it rides along with it (a little wobble after the bonk)
  const c = heroAt(t);
  const top = headTop(c);
  const tilt = headTilt(c);
  const a = (tilt * Math.PI) / 180;
  const wob = Math.exp(-6 * (t - BONK_T)) * Math.sin((t - BONK_T) * 30) * 10;
  return {
    ...p,
    rot: 0,
    lid: { x: top.x + Math.sin(a) * (JAM.lidH / 2), h: h(top) + Math.cos(a) * (JAM.lidH / 2), rot: tilt + wob, spin: 0, on: false },
  };
};

// ═══════════════════════ Tools ═══════════════════════
export type ToolState = { show: boolean; x: number; y: number; ang: number };

/** Pipe wrench: in the toolbox → in his hand → jaw on the lid → flies off with his hand → on the floor */
export const wrenchAt = (t: number): ToolState => {
  if (t < T3.grab + 0.2) return { show: false, x: WRENCH_X, y: 0, ang: 0 };
  const c = heroAt(t);
  const hp = handOf(c);
  if (t < T3.heave) return { show: true, x: hp.x, y: hp.y, ang: foreAngle(c, "a") };
  const jaw = { x: JAR_FLOOR_X, y: GROUND - (JAR.h + JAR.lidH / 2) };
  if (t < T3.slip) {
    const u = smooth((t - T3.heave) / 0.05);
    const from = { x: hp.x, y: hp.y };
    const x = lerp(from.x, jaw.x, u);
    const y = lerp(from.y, jaw.y, u);
    return { show: true, x, y, ang: deg(Math.atan2(hp.y - y, hp.x - x)) };
  }
  if (t < SIT_T + 0.05) return { show: true, x: hp.x, y: hp.y, ang: foreAngle(c, "a") };
  const rest = handOf(heroAt(SIT_T + 0.05));
  return { show: true, x: rest.x, y: GROUND - 12, ang: 180 };
};

/** Crowbar: in the toolbox → hanging from his back hand → pried under the jam lid → dropped on the counter */
export const crowbarAt = (t: number): ToolState => {
  if (t < TWIST.got) return { show: false, x: CROWBAR_X, y: 0, ang: 0 };
  const c = heroAt(t);
  if (t < TWIST.pry) {
    const bp = t < TWIST.back ? handOf(c) : backHandOf(c);
    return { show: true, x: bp.x, y: bp.y, ang: foreAngle(c, t < TWIST.back ? "a" : "b") };
  }
  const tip = { x: JAM_COUNTER_X + JAM.lidW / 2 - 6, y: GROUND - (COUNTER.top + JAM.h + 2) };
  if (t < TWIST.proud) {
    const hp = handOf(c);
    const tipLift = t > TWIST.down ? -10 * smooth((t - TWIST.down) / 0.08) : 0;
    const ty = tip.y + tipLift;
    return { show: true, x: tip.x, y: ty, ang: deg(Math.atan2(hp.y - ty, hp.x - tip.x)) };
  }
  return { show: true, x: JAM_COUNTER_X + 70, y: GROUND - COUNTER.top - 6, ang: 0 };
};

/** Teaspoon: lying on the table → Newt's front hand (under the lid edge) → his back hand → Dash */
export const spoonAt = (t: number): ToolState => {
  if (t < TRICK.got) return { show: true, x: SPOON_TABLE_X, y: GROUND - TABLE.top - 4, ang: 0 };
  if (t < TRICK.pass + 0.1) {
    const k = kidAt(t);
    const hp = handOf(k);
    let ang = foreAngle(k, "a");
    if (t > TRICK.pry && t < TRICK.pass) ang -= 14 * smooth((t - TRICK.pry) / 0.12); // the tiny lever
    const a = (ang * Math.PI) / 180;
    return { show: true, x: hp.x + Math.cos(a) * 16, y: hp.y + Math.sin(a) * 16, ang: ang + 180 };
  }
  if (t < HEART.spoon) {
    const k = kidAt(t);
    const bp = backHandOf(k);
    return { show: true, x: bp.x, y: bp.y - 22, ang: -80 };
  }
  const c = heroAt(t);
  const hp = handOf(c);
  return { show: true, x: hp.x, y: hp.y - 24, ang: -90 };
};

/** The pickle Dash takes from the jar, and how much of it he has eaten */
export const pickleAt = (t: number) => {
  if (t < HEART.pickle) return null;
  const hp = handOf(heroAt(t));
  const bite = clamp01((t - HEART.crunch1) / (HEART.crunch2 + 0.35 - HEART.crunch1));
  return { x: hp.x, y: hp.y - 18, bite };
};

// Toolbox contents
export const toolboxHas = (t: number) => ({ wrench: t < T3.grab + 0.2, crowbar: t < TWIST.got, crowbarX: CROWBAR_X });
