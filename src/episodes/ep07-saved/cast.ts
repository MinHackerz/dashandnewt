import { POSES, type PoseName } from "../../rig/library";
import { build, type Script } from "../../rig/script";
import { GROUND, HEAD_R, HEAD_SCALE, solve, toWorld } from "../../rig/Stickman";
import type { CharState } from "../../rig/types";
import { ease } from "../../lib/kf";
import { reach } from "../../rig2d/ik";
import { G, PX_PER_M } from "./physics";
import {
  AFTER,
  D,
  DASH_HAT_D,
  DASH_HAT_X,
  DASH_PIG_X,
  DASH_PUD_X,
  DASH_STEP,
  DASH_WAIT,
  DASH_X0,
  DASH_YANK_X,
  DPX,
  FLY_T,
  flight,
  KNIFE_X,
  LAND_H,
  LAND_T,
  LAND_X,
  laneS,
  LOOK1,
  LOOK2,
  LOOKHAND,
  NEWT_AFTER_X,
  NEWT_DX0,
  NEWT_GRAB_X,
  NEWT_PIG_X,
  NEWT_PUD_X,
  NEWT_SCALE,
  PIG,
  PIGEON_X0,
  PIGEON_X1,
  PUD,
  REL,
  RELIEF,
  RESUME,
  SHIELD_X,
  storyOf,
  TIP_H,
  TOSS_DX,
  TOSS_LAND,
  TOSS_VY,
  YANK,
  carX,
  CAR_V,
} from "./timeline";

type P = { x: number; y: number };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

// ─── Depth lanes: a point drawn in lane d around anchor x `ax` → screen-world px ──
export const proj = (p: P, d: number, ax: number): P => ({ x: ax + (p.x - ax) * laneS(d), y: GROUND + (p.y - GROUND) * laneS(d) + d * DPX });
export const unproj = (p: P, d: number, ax: number): P => ({ x: ax + (p.x - ax) / laneS(d), y: GROUND + (p.y - GROUND - d * DPX) / laneS(d) });
export type Placed = { c: CharState; d: number; ax: number };
export const handOf = (c: CharState, side: "a" | "b" = "a") => toWorld(c, solve(c.pose, c.aLen ?? 1)[side === "a" ? "aHand" : "bHand"]);
export const headOf = (c: CharState) => toWorld(c, solve(c.pose).head);
export const headTopOf = (c: CharState) => {
  const j = solve(c.pose);
  const a = ((c.facing * j.headAng) * Math.PI) / 180;
  const h = toWorld(c, j.head);
  const r = HEAD_R * HEAD_SCALE * c.scale;
  return { x: h.x + Math.sin(a) * r, y: h.y - Math.cos(a) * r };
};
/** a point on one placed character, expressed in another character's lane */
const across = (p: P, from: Placed, to: { d: number; ax: number }) => unproj(proj(p, from.d, from.ax), to.d, to.ax);
const hipH = (pose: PoseName, s: number) => -solve(POSES[pose]).hip.y * s;

// ═══════════════════════ Dash: the bodyguard (dead serious) ═══════════════════════
const DASH_RESUME_X = DASH_PUD_X + DASH_STEP;
const heroScript: Script = {
  scale: 1,
  seed: 0,
  x: [
    [0, DASH_X0],
    [PIG.stop, DASH_PIG_X, "lin"],
    [PIG.jump, DASH_PIG_X],
    [PIG.guard, SHIELD_X, "out"],
    [PIG.resume + DASH_WAIT, SHIELD_X],
    [PUD.stop, DASH_PUD_X, "lin"],
    [PUD.toss + 0.15, DASH_PUD_X],
    [TOSS_LAND + 0.3, DASH_RESUME_X, "io"],
    [RESUME, DASH_RESUME_X],
    [YANK.reach, DASH_YANK_X, "lin"],
    [AFTER.walk, DASH_YANK_X],
    [AFTER.reach - 0.15, DASH_HAT_X, "io"],
  ],
  lift: [
    [0, 0],
    [PIG.jump, 0],
    [PIG.jump + 0.12, 26, "out"],
    [PIG.guard, 0, "in"],
  ],
  sy: [
    [0, 1],
    [PIG.guard, 1],
    [PIG.guard + 0.05, 0.9, "snap"],
    [PIG.guard + 0.3, 1, "back"],
  ],
  facing: [[0, 1]],
  gait: [
    [0, "walk"],
    [PIG.stop, "none"],
    [PIG.resume + DASH_WAIT, "walk"],
    [PUD.stop, "none"],
    [PUD.toss + 0.15, "walkLegs"],
    [TOSS_LAND + 0.3, "none"],
    [RESUME, "walk"],
    [YANK.reach, "none"],
    [AFTER.walk, "walk"],
    [AFTER.reach - 0.15, "none"],
  ],
  pose: [
    [0, "stand"],
    [PIG.jump, "shield", 0.16, "back"],
    [PIG.resume - 0.3, "stand", 0.3],
    [PUD.reach, "reachFwd", 0.2],
    [PUD.toss, "tossUp", 0.16, "out"],
    [PUD.toss + 0.45, "stand", 0.3],
    [LOOKHAND.at, "lookHand", 0.3],
    [LOOKHAND.end, "stand", 0.3],
    [YANK.alarm, "shield", 0.08, "snap"],
    [YANK.reach, "yankReach", 0.14],
    [YANK.pull, "yankPull", YANK.release - YANK.pull, "in"],
    [RELIEF.watch, "stand", 0.06],
    [RELIEF.heart, "handHeart", 0.1],
    [AFTER.open + 0.2, "stand", 0.35],
    [AFTER.reach, "reach", 0.3],
    [AFTER.hat, "hatChest", 0.35],
  ],
  faceX: [
    [0, 0.55],
    [PIG.jump, 0.2],
    [PIG.resume, 0.55],
    [PUD.reach, 0.7],
    [PUD.toss + 0.4, 0.5],
    [LOOKHAND.at, 0.3],
    [RESUME, 0.55],
    [YANK.glance - 0.05, 0.55],
    [YANK.glance + 0.08, -1, "snap"],
    [YANK.reach - 0.05, -1],
    [YANK.reach + 0.05, 0.55, "snap"],
    [RELIEF.watch, 0.9],
    [AFTER.open, 0.9],
    [AFTER.open + 0.3, 0.5],
  ],
  lookY: [
    [0, 0],
    [LOOKHAND.at, 1],
    [LOOKHAND.end, 0],
    [AFTER.open + 0.3, 0.7],
    [AFTER.ghost, -0.6],
    [AFTER.pat, -1],
    [AFTER.tug, 0.4],
    [AFTER.wave, -1],
  ],
  face: [
    [0, "cautious"],
    [PIG.flap, "alarmed"],
    [PIG.guard + 0.2, "cautious"],
    [PIG.nod, "deadpan"],
    [PIG.resume, "cautious"],
    [LOOKHAND.at, "suspicious"],
    [RESUME, "cautious"],
    [YANK.alarm, "alarmed"],
    [YANK.pull, "braced"],
    [RELIEF.watch, "wise"],
    [AFTER.open, "curious"],
    [AFTER.reveal, "shocked"],
    [AFTER.womp, "deadpan"],
    [AFTER.hat, "sad"],
    [AFTER.pat, "tender"],
    [AFTER.wave, "sad"],
  ],
  aHand: [
    [0, "fist"],
    [PIG.jump, "open"],
    [PIG.resume, "fist"],
    [PUD.toss + 0.1, "open"],
    [PUD.toss + 0.5, "fist"],
    [LOOKHAND.at, "open"],
    [LOOKHAND.end, "fist"],
    [YANK.alarm, "open"],
    [YANK.grab, "fist"],
    [RELIEF.heart, "open"],
    [AFTER.reach, "open"],
    [AFTER.hat, "fist"],
  ],
  bHand: [
    [0, "fist"],
    [PIG.jump, "open"],
    [PIG.resume, "fist"],
  ],
  extras: () => ({ scarf: true }),
};

export const DASH_D = (t: number) => (t < AFTER.walk ? D.dash : lerp(D.dash, DASH_HAT_D, ease("io", (t - AFTER.walk) / (AFTER.reach - 0.15 - AFTER.walk))));

export const heroAt = (t: number): Placed => {
  const c = build(heroScript, t);
  // a grave little nod: threat neutralised
  const nod = Math.max(0, Math.sin(Math.PI * clamp01((t - PIG.nod) / 0.5)));
  c.pose = { ...c.pose, head: c.pose.head + 16 * nod };
  // the slipstream of the passing car flattens his scarf
  const dx = Math.abs(carX(t) - c.x - 300);
  if (t > YANK.release && dx < 700) c.speed = 900 * (1 - dx / 700);
  const d = DASH_D(t);
  const out: Placed = { c, d, ax: c.x };
  // he lifts Newt's hat off the knife tip: his hand goes exactly to it
  if (t > AFTER.reach - 0.3 && t < AFTER.hat) {
    const u = ease("io", clamp01((t - (AFTER.reach - 0.3)) / 0.3));
    const tip = across({ x: KNIFE_X, y: GROUND - TIP_H + 6 }, { c, d: D.knife, ax: KNIFE_X }, out);
    const rest = handOf(c, "a");
    reach(c, "a", { x: lerp(rest.x, tip.x, u), y: lerp(rest.y, tip.y, u) });
  }
  // the ghost's gentle tug: his free hand goes where the ghost's hand takes it
  if (t > AFTER.tug && t < AFTER.wave) {
    const g = ghostAt(t);
    if (g) reach(c, "b", across(handOf(g.c, "a"), g, out));
  }
  return out;
};

// ═══════════════════════ Newt: calm, polite, very light ═══════════════════════
const newtScript: Script = {
  scale: NEWT_SCALE,
  seed: 1,
  x: [
    [0, DASH_X0 + NEWT_DX0],
    [PIG.stop, NEWT_PIG_X, "lin"],
    [PIG.resume, NEWT_PIG_X],
    [PUD.stop, NEWT_PUD_X, "lin"],
    [TOSS_LAND, NEWT_AFTER_X],
    [RESUME, NEWT_AFTER_X],
    [YANK.grab, NEWT_GRAB_X, "lin"],
  ],
  lift: [[0, 0]],
  sy: [
    [0, 1],
    [TOSS_LAND, 1],
    [TOSS_LAND + 0.05, 0.86, "snap"],
    [TOSS_LAND + 0.3, 1, "back"],
  ],
  facing: [[0, 1]],
  gait: [
    [0, "walk"],
    [PIG.stop, "none"],
    [PIG.resume, "walk"],
    [PUD.stop, "none"],
    [RESUME, "walk"],
    [YANK.grab, "none"],
  ],
  pose: [
    [0, "stand"],
    [PUD.grab, "stand"],
    [PUD.toss, "hangKid", 0.15],
    [TOSS_LAND - 0.12, "landSquat", 0.12],
    [TOSS_LAND + 0.25, "stand", 0.3],
    [YANK.grab, "stand"],
    [YANK.pull, "flail", 0.15],
    [YANK.release + 0.1, "tuck", 0.25],
    [storyOf(LOOK2.palm), "facepalm", 0.02],
    [LAND_T - 0.08, "flail", 0.06],
    [LAND_T, "stand", 0.02],
  ],
  faceX: [
    [0, 0.5],
    [PIG.flap, 0.3],
    [PIG.resume, 0.5],
    [PUD.grab, -0.5],
    [TOSS_LAND, 0.4],
    [LOOK1.back, 0.5],
    [LOOK1.back + 0.1, -1, "snap"],
    [LOOK1.end, -1],
    [LOOK1.end + 0.12, 0.5, "snap"],
    [YANK.grab, -0.6],
    [YANK.release, 0.2],
  ],
  lookY: [
    [0, 0],
    [YANK.release, 0.4],
  ],
  face: [
    [0, "kidHappy"],
    [PIG.flap, "kidDeadpan"],
    [PIG.resume, "kidHappy"],
    [PUD.grab, "kidDeadpan"],
    [TOSS_LAND + 0.4, "kidHappy"],
    [LOOK1.back, "kidFocus"],
    [LOOK1.end, "kidHappy"],
    [YANK.grab, "surprised"],
    [YANK.release + 0.03, "kidFocus"],
    [storyOf(LOOK2.palm), "kidDeadpan"],
  ],
  aHand: [
    [0, "fist"],
    [PUD.grab, "fist"],
    [YANK.release, "open"],
    [storyOf(LOOK2.palm), "open"],
  ],
  bHand: [
    [0, "fist"],
    [YANK.release, "open"],
  ],
  extras: (t) => ({ partyHat: t < LAND_T, blush: true }),
};

export const NEWT_D = (t: number) => {
  if (t < YANK.grab) return D.newt;
  if (t < YANK.release) return lerp(D.newt, REL.d, ease("in", (t - YANK.grab) / (YANK.release - YANK.grab)));
  if (t < LAND_T) return flight(t).d;
  return D.knife;
};

export const kidAt = (t: number): Placed => {
  const c = build(newtScript, t);
  const d = NEWT_D(t);
  const s = NEWT_SCALE;
  const hero = heroAt(t);
  // the puddle: Dash holds his hand, then flicks him over it (ballistic, the one G)
  if (t >= PUD.grab && t < PUD.toss + 0.06) {
    reach(c, "b", across(handOf(hero.c, "a"), hero, { d, ax: c.x }));
  }
  if (t >= PUD.toss && t < TOSS_LAND) {
    const tau = t - PUD.toss;
    c.x = NEWT_PUD_X + (TOSS_DX * tau) / (TOSS_LAND - PUD.toss);
    c.lift = TOSS_VY * tau - 0.5 * G * tau * tau;
  }
  // the yank: his arm is pulled straight, and his body follows his arm, off his feet
  if (t >= YANK.grab && t < YANK.release) {
    const u = ease("in", (t - YANK.grab) / (YANK.release - YANK.grab));
    const hip = { x: lerp(NEWT_GRAB_X, REL.x, u), h: lerp(hipH("stand", s), REL.h, u) };
    c.x = hip.x;
    c.lift = hip.h - hipH(t < YANK.pull + 0.1 ? "stand" : "flail", s);
    c.rot = -40 * u;
    reach(c, "a", across(handOf(hero.c, "a"), hero, { d, ax: c.x }));
  }
  // the flight: hips on a true parabola, tumbling backwards
  if (t >= YANK.release && t < LAND_T) {
    const f = flight(t);
    c.x = f.x;
    c.rot = -40 - 140 * ease("io", f.u);
    c.lift = f.h - -solve(c.pose).hip.y * s;
  }
  // landed head-down behind the crates: hips at LAND_H, legs up, and completely still
  if (t >= LAND_T) {
    c.pose = POSES.stand;
    c.x = LAND_X;
    c.rot = -180;
    c.lift = LAND_H - hipH("stand", s);
    c.blink = 0;
  }
  return { c, d, ax: c.x };
};

// ═══════════════════════ Ghost Newt ═══════════════════════
const GHOST_PAT_X = DASH_HAT_X + 210;
export const ghostAt = (t: number): Placed | null => {
  if (t < AFTER.ghost) return null;
  const rise = ease("out", clamp01((t - AFTER.ghost) / 1.2));
  const go = ease("io", clamp01((t - AFTER.float) / 0.5));
  const up = ease("in", clamp01((t - AFTER.up) / 1.4));
  const bob = Math.sin(t * 2.6) * 8;
  const x = lerp(LAND_X, GHOST_PAT_X, go);
  const d = lerp(D.knife, DASH_HAT_D + 0.25, go);
  const hipHt = lerp(0.6, 1.25, rise) * PX_PER_M + up * 4 * PX_PER_M + bob;
  const pose: PoseName = t > AFTER.wave ? "waveBye" : "hang";
  const c: CharState = {
    x,
    lift: hipHt - hipH(pose, NEWT_SCALE),
    facing: -1,
    scale: NEWT_SCALE,
    sx: 1,
    sy: 1,
    pose: { ...POSES[pose], aH: 18, aK: 30, bH: 4, bK: 40 },
    faceX: t > AFTER.float ? 0.4 : 0,
    lookY: 0,
    expr: { eyes: "happy", mouth: "smile", brow: 0.5, browAng: 0 },
    blink: 0,
    aHand: "open",
    bHand: "fist",
    extras: { ghost: true, partyHat: true, blush: true },
    t,
    speed: 0,
  };
  const out: Placed = { c, d, ax: x };
  const hero = heroAt0(t);
  if (t > AFTER.pat - 0.25 && t < AFTER.patEnd) {
    // pat, pat: his hand rests on Dash's head and lifts twice
    const top = headTopOf(hero.c);
    const pat = Math.abs(Math.sin(((t - AFTER.pat) * Math.PI) / 0.35)) * 16;
    reach(c, "a", across({ x: top.x, y: top.y - 8 - pat }, hero, out));
  } else if (t >= AFTER.tug && t < AFTER.wave) {
    // a tiny, gentle tug of Dash's hand: "this much"
    const j = handOf(hero.c, "b");
    const tug = Math.sin(clamp01((t - AFTER.tug) / 0.5) * Math.PI) * 18;
    reach(c, "a", across({ x: j.x - 10 - tug, y: j.y }, hero, out));
  } else if (t <= AFTER.wave) {
    c.pose = { ...c.pose, aS: 20, aE: 20, bS: -20, bE: 20 };
  }
  return out;
};
// Dash without the ghost's influence (breaks the hero ↔ ghost loop)
const heroAt0 = (t: number): Placed => {
  const c = build(heroScript, t);
  return { c, d: DASH_D(t), ax: c.x };
};

// ═══════════════════════ Props in motion ═══════════════════════
/** The pigeon: pecks, flaps up at Dash's lunge, and lands two metres away */
export const _p = 0;
export const pigeonAt = (t: number) => {
  const u = clamp01((t - PIG.flap) / (PIG.land - PIG.flap));
  const x = lerp(PIGEON_X0, PIGEON_X1, u);
  const h = Math.sin(Math.PI * u) * 1.1 * PX_PER_M;
  const flying = t > PIG.flap && t < PIG.land;
  const peck = !flying && Math.sin(t * 9) > 0.6;
  return { x, h, d: -0.35, flying, peck, facing: (t < PIG.flap ? -1 : t < PIG.land ? 1 : -1) as 1 | -1 };
};

/** The car: constant speed in its own lane (nose position); body leans back as it passes */
export const carAt = (t: number) => ({ x: carX(t), d: D.car, v: CAR_V });

/** Newt's party hat: on his head, then speared on the knife tip (spinning down), then in Dash's hand */
export const hatAt = (t: number): { x: number; y: number; d: number; spin: number; on: "head" | "knife" | "hand" } => {
  if (t < LAND_T) return { x: 0, y: 0, d: 0, spin: 0, on: "head" };
  if (t < AFTER.hat) {
    const tau = t - LAND_T;
    return { x: KNIFE_X, y: GROUND - TIP_H + 10, d: D.knife, spin: tau * 14 * Math.exp(-tau * 0.9), on: "knife" };
  }
  const h = heroAt(t);
  const p = handOf(h.c, "a");
  return { x: p.x, y: p.y - 18, d: h.d, spin: 0, on: "hand" };
};

/** The knife's handle wobbles after the hit (damped) */
export const knifeWobble = (t: number) => (t < LAND_T ? 0 : 7 * Math.exp(-(t - LAND_T) * 3) * Math.sin((t - LAND_T) * 42));

export { FLY_T, LOOKHAND };
