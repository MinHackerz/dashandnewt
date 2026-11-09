import { POSES, type PoseName as _PN } from "../../rig/library";
export type { _PN };
import { build, type Script } from "../../rig/script";
import { GROUND, HEAD_R, HEAD_SCALE, solve, toWorld } from "../../rig/Stickman";
import type { CharState } from "../../rig/types";
import { ease, num, type NumKey } from "../../lib/kf";
import { reach } from "../../rig2d/ik";
import { dropTime, G, PX_PER_M } from "./physics";
import {
  BROLLY,
  D,
  DASH_X,
  DROP1,
  flyAt,
  GRIP_H0,
  GUST,
  JUMP_H,
  JUMP_T,
  LACE,
  LAND_T,
  LIFT_T,
  MISS_T,
  RUN,
  RUN_X,
  SEE,
  STAND,
  TIE_WALK,
  FOOT_UP,
  TIE2,
  GRIEF,
  LOOK1,
  LOOK2,
  NEWT_SCALE,
  NEWT_X,
  RACK_X,
  U1,
  U2,
  U3,
} from "./timeline";
import type { BrollyKind } from "./props";

type P = { x: number; y: number };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const lerpP = (a: P, b: P, u: number): P => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });
const H = (m: number) => GROUND - m * PX_PER_M; // a height in metres → world y
export const handOf = (c: CharState, side: "a" | "b" = "a") => toWorld(c, solve(c.pose)[side === "a" ? "aHand" : "bHand"]);
export const headOf = (c: CharState) => toWorld(c, solve(c.pose).head);
export const headTopOf = (c: CharState) => {
  const h = headOf(c);
  return { x: h.x, y: h.y - HEAD_R * HEAD_SCALE * c.scale };
};

// ─── Where each umbrella's grip is held (world px), so the hands are put ON it (IK) ──
export const RADIUS: Record<BrollyKind, number> = {
  small: (BROLLY.small.d / 2) * PX_PER_M,
  golf: (BROLLY.golf.d / 2) * PX_PER_M,
  parasol: (BROLLY.parasol.d / 2) * PX_PER_M,
};
const SLOT: Record<BrollyKind, P> = {
  small: { x: RACK_X - 46, y: GROUND - 95 },
  golf: { x: RACK_X, y: GROUND - 115 },
  parasol: { x: RACK_X + 50, y: GROUND - 180 },
};
// held over Newt: the small one only half covers him (its rim drips on his head)
export const HELD: Record<BrollyKind, P> = {
  small: { x: NEWT_X - 95, y: H(1.5) },
  golf: { x: NEWT_X - 85, y: H(1.5) },
  parasol: { x: NEWT_X - 90, y: H(1.05) },
};
export const NEWT_GRIP: P = { x: NEWT_X - 20, y: GROUND - GRIP_H0 };
const CHEST: P = { x: DASH_X - 60, y: H(1.2) }; // carried past his chest as he turns
export const SMALL_DOWN: P = { x: DASH_X - 200, y: GROUND - 18 }; // where the small one lands
const GOLF_DOWN: P = { x: RACK_X + 120, y: GROUND - 18 };

type Held = { kind: BrollyKind; x: number; y: number; tilt: number; open: number; by: "rack" | "dash" | "newt" | "ground" | "fly" };
const pathKeys = (t: number, keys: readonly (readonly [number, P, number?])[]) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, p1] = keys[i];
    const [t0, p0] = keys[i - 1];
    if (t <= t1) return lerpP(p0, p1, ease("io", (t - t0) / (t1 - t0)));
  }
  return keys[keys.length - 1][1];
};
/** dropped: free fall to the ground under the one G, tipping over as it lands */
const dropped = (t: number, from: P, to: P, at: number) => {
  const T = dropTime(to.y - from.y);
  const u = clamp01((t - at) / T);
  return { x: lerp(from.x, to.x, u), y: from.y + 0.5 * G * Math.min(t - at, T) ** 2, tilt: -96 * ease("in", u) };
};
const openAt = (t: number, at: number, dur = 0.25) => ease("back", (t - at) / dur);

export const brollyAt = (t: number, kind: BrollyKind): Held => {
  if (kind === "small") {
    if (t < U1.grab) return { kind, ...SLOT.small, tilt: 0, open: 0, by: "rack" };
    if (t < U2.toss) {
      const p = pathKeys(t, [[U1.grab, SLOT.small], [U1.back, CHEST], [U1.open, HELD.small]]);
      return { kind, ...p, tilt: 0, open: openAt(t, U1.open), by: "dash" };
    }
    const d = dropped(t, HELD.small, SMALL_DOWN, U2.toss);
    return { kind, x: d.x, y: d.y, tilt: d.tilt, open: 1, by: "ground" };
  }
  if (kind === "golf") {
    if (t < U2.grab) return { kind, ...SLOT.golf, tilt: 0, open: 0, by: "rack" };
    if (t < U3.toss) {
      const p = pathKeys(t, [[U2.grab, SLOT.golf], [U2.back, CHEST], [U2.open, HELD.golf]]);
      return { kind, ...p, tilt: 0, open: openAt(t, U2.open), by: "dash" };
    }
    const d = dropped(t, HELD.golf, GOLF_DOWN, U3.toss);
    return { kind, x: d.x, y: d.y, tilt: d.tilt, open: 1, by: "ground" };
  }
  // the beach parasol
  if (t < U3.grab) return { kind, ...SLOT.parasol, tilt: 0, open: 0, by: "rack" };
  if (t < LACE.took) {
    const p = pathKeys(t, [[U3.grab, SLOT.parasol], [U3.drag, { x: SLOT.parasol.x + 40, y: SLOT.parasol.y + 30 }], [U3.back, CHEST], [U3.open, HELD.parasol], [LACE.hand, HELD.parasol], [LACE.took, NEWT_GRIP]]);
    return { kind, ...p, tilt: t < U3.back ? -14 * Math.sin(Math.PI * clamp01((t - U3.grab) / (U3.back - U3.grab))) : 0, open: openAt(t, U3.open, 0.35), by: t < LACE.hand ? "dash" : "newt" };
  }
  if (t < GUST) return { kind, ...NEWT_GRIP, tilt: Math.sin(t * 3) * 2, open: 1, by: "newt" };
  // the gust: the canopy is pushed downwind and up; Newt hangs from the grip
  const f = flyAt(t);
  const tilt = -32 * ease("out", clamp01((t - GUST) / 0.4)) + Math.sin(t * 7) * 3;
  return { kind, x: f.x, y: GROUND - f.h, tilt, open: 1, by: t < LIFT_T ? "newt" : "fly" };
};

/** Canopy top-centre and rim y (for rain cover and drips) */
export const canopyOf = (b: Held) => {
  const pole = BROLLY[b.kind].pole;
  const a = (b.tilt * Math.PI) / 180;
  const top = { x: b.x + Math.sin(a) * pole, y: b.y - Math.cos(a) * pole };
  return { top, r: RADIUS[b.kind] * (0.12 + 0.88 * b.open) };
};

// ═══════════════════════ Dash: umbrella duty, taken very seriously ═══════════════════════
// The foot he ties goes up on the bollard: its height and his stance come from the pose itself.
export { FOOT_H, DASH_TIE_X } from "./timeline";
import { DASH_TIE_X } from "./timeline";
const heroScript: Script = {
  scale: 1,
  seed: 0,
  x: [
    [0, DASH_X],
    [TIE_WALK.a, DASH_X],
    [TIE_WALK.b, DASH_TIE_X, "lin"],
    [RUN.a, DASH_TIE_X],
    [RUN.b, RUN_X, "lin"],
    [LAND_T, RUN_X - 50, "out"],
  ],
  lift: [[0, 0]],
  sy: [
    [0, 1],
    [U3.drag, 1],
    [U3.drag + 0.2, 0.94],
    [U3.back, 1],
    [LAND_T, 1],
    [LAND_T + 0.05, 0.86, "snap"],
    [LAND_T + 0.3, 1, "back"],
  ],
  facing: [
    [0, 1],
    [U1.turn, -1],
    [U1.back, 1],
    [U2.turn, -1],
    [U2.back, 1],
    [U3.turn, -1],
    [U3.back, 1],
    [STAND.empty, -1],
  ],
  gait: [
    [0, "none"],
    [TIE_WALK.a, "walk"],
    [TIE_WALK.b, "none"],
    [RUN.a, "run"],
    [RUN.b, "none"],
  ],
  pose: [
    [0, "stand"],
    [0.8, "checkWatch", 0.3],
    [2.0, "stand", 0.3],
    [U1.turn, "reach", 0.2],
    [U1.back, "stand", 0.2],
    [U2.turn, "reach", 0.2],
    [U2.back, "stand", 0.2],
    [U3.turn, "reach", 0.2],
    [U3.grab, "dragHeavy", 0.25],
    [U3.back, "stand", 0.3],
    [LACE.took, "stand", 0.2],
    [FOOT_UP, "footUp", 0.4],
    [STAND.up, "stand", 0.35],
    [SEE, "alarmed", 0.15, "snap"],
    [JUMP_T - 0.06, "landSquat", 0.06],
    [JUMP_T, "jumpReach", 0.12, "out"],
    [LAND_T - 0.05, "landSquat", 0.08],
    [LAND_T + 0.25, "stand", 0.25],
    [GRIEF, "handsOnHead", 0.35],
  ],
  faceX: [
    [0, 0.5],
    [DROP1 - 0.05, 0.5],
    [DROP1 + 0.08, 0.9, "snap"],
    [LACE.notice, 0.4],
    [FOOT_UP, 0.6],
    [STAND.empty, 0.8],
    [SEE, 0.3],
  ],
  lookY: [
    [0, 0],
    [0.8, 1],
    [2.0, -0.4],
    [DROP1, 0],
    [U1.drip, 0.3],
    [LACE.notice, 1],
    [FOOT_UP, 1],
    [STAND.up, 0],
    [STAND.empty, 0.3],
    [SEE, -1],
  ],
  face: [
    [0, "cautious"],
    [DROP1 + 0.05, "alarmed"],
    [U1.back, "determined"],
    [U1.drip + 0.15, "suspicious"],
    [U2.open, "cautious"],
    [U2.side + 0.15, "rage"],
    [U2.side + 1.0, "cautious"],
    [U3.grab, "strain"],
    [U3.open + 0.2, "proud"],
    [LACE.notice, "suspicious"],
    [FOOT_UP, "kidFocus"],
    [TIE2.b - 0.5, "proud"],
    [STAND.empty, "curious"],
    [SEE, "horror"],
    [RUN.a, "determined"],
    [JUMP_T, "strain"],
    [LAND_T, "shocked"],
    [GRIEF, "sad"],
  ],
  aHand: [
    [0, "fist"],
    [LACE.took, "open"],
    [FOOT_UP, "fist"],
    [SEE, "open"],
    [RUN.a, "fist"],
    [JUMP_T, "open"],
    [GRIEF, "open"],
  ],
  bHand: [
    [0, "fist"],
    [SEE, "open"],
    [RUN.a, "fist"],
    [GRIEF, "open"],
  ],
  extras: () => ({ scarf: true }),
};

export const heroAt = (t: number) => {
  const c = build(heroScript, t);
  // the wind drags his scarf out downwind (−x)
  const wind = t < GUST ? 6 : 16;
  c.speed = c.facing === 1 ? wind * 50 : Math.max(Math.abs(c.speed), 200);
  // his hands are ON the umbrella he's holding
  const held = (["small", "golf", "parasol"] as const).map((k) => brollyAt(t, k)).find((b) => b.by === "dash");
  if (held && t > (held.kind === "small" ? U1.turn + 0.1 : held.kind === "golf" ? U2.turn + 0.1 : U3.turn + 0.1)) {
    reach(c, "a", { x: held.x, y: held.y });
    if (held.kind === "parasol") reach(c, "b", { x: held.x + Math.sin((held.tilt * Math.PI) / 180) * 70, y: held.y - 70 });
  }
  // tying: both hands on the raised shoe, working the laces; the final tug pulls them apart
  if (t > FOOT_UP + 0.3 && t < STAND.up) {
    const foot = toWorld(c, solve(c.pose).aFoot);
    const tug = t > TIE2.b - 0.5 ? ease("back", (t - (TIE2.b - 0.5)) / 0.2) : 0;
    const k = Math.sin(t * 11) * 5 * (1 - tug);
    reach(c, "a", { x: foot.x + 10 + k + 40 * tug, y: foot.y - 30 - 10 * tug });
    reach(c, "b", { x: foot.x - 14 - k - 40 * tug, y: foot.y - 26 - 10 * tug });
  }
  // the jump: a true parabola, as high as he can (JUMP_H), peaking exactly at the near-miss
  if (t >= JUMP_T && t < LAND_T) {
    const tau = t - JUMP_T;
    const v0 = G * (MISS_T - JUMP_T);
    c.lift = Math.max(0, v0 * tau - 0.5 * G * tau * tau);
    void JUMP_H;
  }
  // grief: both hands on his head, watching Newt go
  if (t >= GRIEF + 0.2) {
    const top = headTopOf(c);
    const sway = Math.sin(t * 2.2) * 4;
    reach(c, "a", { x: top.x + 30 + sway, y: top.y + 14 });
    reach(c, "b", { x: top.x - 30 + sway, y: top.y + 14 });
  }
  return { c, d: D.dash, ax: c.x };
};

// ═══════════════════════ Newt: calm, polite, light ═══════════════════════
const newtScript: Script = {
  scale: NEWT_SCALE,
  seed: 1,
  x: [[0, NEWT_X]],
  lift: [[0, 0]],
  sy: [[0, 1]],
  facing: [
    [0, -1],
    [LIFT_T + 1.2, 1],
  ],
  gait: [[0, "none"]],
  pose: [
    [0, "stand"],
    [LACE.hand, "stand"],
    [GUST, "skid", 0.15],
    [LIFT_T, "hangKid", 0.2],
  ],
  faceX: [
    [0, 0.5],
    [LOOK1.tint, 0.8],
    [LOOK1.end, 0.4],
  ],
  lookY: [
    [0, 0],
    [DROP1 - 0.4, -0.8],
    [DROP1 + 0.6, 0],
    [U2.side, 1],
    [U2.side + 0.8, 0],
    [U3.open, -1],
    [U3.nod, 0],
    [LOOK2.tint, -0.6],
    [LOOK2.oh, 0.2],
    [GUST, -0.3],
    [SEE, 0.9],
  ],
  face: [
    [0, "kidHappy"],
    [DROP1, "kidDeadpan"],
    [U1.drip, "annoyed"],
    [U1.drip + 0.5, "kidDeadpan"],
    [U2.side, "kidDeadpan"],
    [LOOK1.tint, "kidFocus"],
    [LOOK1.end, "kidHappy"],
    [U3.open, "kidCurious"],
    [U3.nod, "kidHappy"],
    [LOOK2.tint, "kidFocus"],
    [LOOK2.oh, "kidDeadpan"],
    [GUST + 0.1, "surprised"],
    [LIFT_T + 0.25, "kidDeadpan"],
    [MISS_T + 0.2, "kidConcern"],
    [GRIEF + 0.6, "kidSmile"],
  ],
  aHand: [[0, "fist"]],
  bHand: [[0, "fist"]],
  extras: () => ({ partyHat: true, blush: true }),
};

export const kidAt = (t: number) => {
  const c = build(newtScript, t);
  const s = NEWT_SCALE;
  const p = brollyAt(t, "parasol");
  const holding = t >= LACE.hand + 0.15;
  if (t >= GUST && t < LIFT_T) c.x = p.x + 20; // sliding along, shoes skidding
  if (t >= LIFT_T) {
    // hanging from the grip: put his hands on it, the body follows below
    const hl = solve(POSES.hangKid).aHand;
    c.x = p.x - c.facing * s * hl.x;
    c.lift = GROUND - p.y + s * hl.y;
    c.rot = Math.sin(t * 5) * 4;
  }
  if (holding) {
    const a = (p.tilt * Math.PI) / 180;
    reach(c, "a", { x: p.x, y: p.y });
    // a small, polite wave goodbye to Dash with his free hand
    const waving = t > GRIEF + 0.9 && t < GRIEF + 2.6;
    if (waving) c.pose = { ...c.pose, bS: 150 + 20 * Math.sin(t * 9), bE: 30 };
    else reach(c, "b", { x: p.x + Math.sin(a) * 40, y: p.y - Math.cos(a) * 40 });
    if (waving) c.bHand = "open";
  }
  return { c, d: D.newt, ax: c.x };
};

// ─── Scripted raindrops (each one a visible cause) ───────────────────────────
/** 1: onto Newt's hat · 2: off the small umbrella's rim onto his head · 3: wind-blown under the golf umbrella onto his shoe */
export const dropsAt = (t: number) => {
  const out: { x: number; y: number; splash: number }[] = [];
  const kid = kidAt(t).c;
  const hat = headTopOf(kid);
  const fall = (x0: number, y0: number, x1: number, y1: number, at: number) => {
    const T = dropTime(y1 - y0);
    const t0 = at - T;
    if (t < t0 || t > at + 0.35) return;
    if (t >= at) out.push({ x: x1, y: y1, splash: (t - at) / 0.35 });
    else {
      const tau = t - t0;
      const u = tau / T;
      out.push({ x: lerp(x0, x1, u), y: y0 + 0.5 * G * tau * tau, splash: 0 });
    }
  };
  fall(hat.x + 6, hat.y - 900, hat.x + 6, hat.y - 40, DROP1);
  const rim = canopyOf(brollyAt(U1.drip, "small"));
  const k1 = headTopOf(kidAt(U1.drip).c);
  fall(rim.top.x + rim.r - 6, rim.top.y + 18, rim.top.x + rim.r - 6, k1.y + 16, U1.drip);
  // blown in sideways by the wind: a straight slanted streak at rain speed
  if (t > U2.side - 0.4 && t < U2.side + 0.35) {
    const u = clamp01((t - (U2.side - 0.4)) / 0.4);
    const toe = { x: NEWT_X - 26, y: GROUND - 8 };
    if (t < U2.side) out.push({ x: lerp(NEWT_X + 330, toe.x, u), y: lerp(H(1.6), toe.y, u), splash: 0 });
    else out.push({ ...toe, splash: (t - U2.side) / 0.35 });
  }
  return out;
};

export { num, type NumKey };
