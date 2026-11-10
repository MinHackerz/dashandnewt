import { POSES, type PoseName } from "../../rig/library";
import { solve } from "../../rig/Stickman";
import { G, PX_PER_M } from "../ep03-the-shortcut/physics";

// Ep 11 — Wrong Door. One principle: torque. Turning force = push × distance from the hinge.
// All times are seconds on the real clock; everything that depends on physics is derived here.
export { G, PX_PER_M };

export const NEWT_SCALE = 0.72;
const RAD = Math.PI / 180;

// ─── The door (metres, kg, N·m) ───────────────────────────────────────────
export const DOOR_X = 800; // world px of the door's push face
export const DOOR = {
  w: 1.1,
  h: 2.15,
  hingeZ: -0.55, // hinge on the far side; the free edge (handle) is toward the camera
  mass: 60,
  stick: 45, // torque needed to break it free (stiff hinges + the closer's preload)
  closer: 8, // the self-closing spring's torque once it moves
  stop: 100, // door stopper (deg)
};
/** A slab turning about one edge: I = ⅓ m w² */
export const DOOR_I = (DOOR.mass * DOOR.w ** 2) / 3;

// Who pushes how hard (N), how far from the hinge (m)
export const PUSH = {
  dash1: { F: 400, r: 0.08 }, // one big hand, right beside the hinge
  dash2: { F: 520, r: 0.08 }, // both hands, everything he has
  newt: { F: 50, r: 1.0 }, // one finger, at the handle edge
};
export const torque = (p: { F: number; r: number }) => p.F * p.r; // 32, 41.6, 50 N·m
export const opens = (p: { F: number; r: number }) => torque(p) > DOOR.stick; // false, false, true

// A finger push at the edge: constant angular acceleration while the finger stays on it, then the door
// coasts against the closer to the stopper, then the closer swings it shut again.
const A_PUSH = (torque(PUSH.newt) - DOOR.closer) / DOOR_I; // rad/s²
const A_CLOSE = DOOR.closer / DOOR_I;
const PHI_PUSH = 0.5; // rad the finger follows the door
const TH_STOP = DOOR.stop * RAD;
const T_PUSH = Math.sqrt((2 * PHI_PUSH) / A_PUSH);
const W0 = A_PUSH * T_PUSH;
const T_COAST = (W0 - Math.sqrt(W0 * W0 - 2 * A_CLOSE * (TH_STOP - PHI_PUSH))) / A_CLOSE;
export const SWING = {
  push: T_PUSH, // finger leaves the door
  open: T_PUSH + T_COAST, // reaches the stopper
  close: Math.sqrt((2 * TH_STOP) / A_CLOSE), // stopper → shut, under the closer alone
};
/** Door angle (deg) `tau` seconds after a finger push at the edge */
export const swingAt = (tau: number) => {
  if (tau <= 0) return 0;
  if (tau < T_PUSH) return (0.5 * A_PUSH * tau * tau) / RAD;
  if (tau < SWING.open) {
    const u = tau - T_PUSH;
    return (PHI_PUSH + W0 * u - 0.5 * A_CLOSE * u * u) / RAD;
  }
  const u = tau - SWING.open;
  const bounce = -4 * Math.exp(-5 * u) * Math.abs(Math.sin(16 * u)); // a little kick off the stopper
  return Math.max(0, (TH_STOP - 0.5 * A_CLOSE * u * u) / RAD + bounce);
};

// ─── Where they stand (world px; lanes are metres toward the camera) ──────
const PALM = 24; // wrist → the flat of the hand
const reach = (pose: PoseName, s = 1) => solve(POSES[pose]).aHand.x * s;
export const X1 = DOOR_X - reach("doorPush") - PALM; // Dash, one hand on the door
export const X2 = DOOR_X - reach("pushHard") - PALM; // Dash, both hands
export const X3 = DOOR_X - solve(POSES.shoulderCharge).shoulder.x - 54; // Dash's shoulder on the door
export const X_SPLAT = DOOR_X - 64; // Dash flat against it
export const RUN_UP = 440;
export const RUN_X0 = X3 - RUN_UP;
export const RUN_V = 640; // px/s ≈ 2.7 m/s
export const DASH_X0 = 330;
export const NEWT_X0 = -150; // he hurries in from off-screen, so the opening close-up of the sign is clear
export const NEWT_WATCH_X = 760; // right foreground, beside the wall: he never blocks the door or Dash
export const NEWT_PUSH_X = DOOR_X - reach("point", NEWT_SCALE) - 30;
export const LANE = { dashHinge: -0.68, dashMid: -0.25, newtWatch: 1.3, newtEdge: 0.3 };
/** his heels stay put when he topples backwards off the door, so his hips end one leg-length back */
export const TIMBER_DX = -solve(POSES.lie).hip.y;

// ─── Beats ────────────────────────────────────────────────────────────────
// Re-paced (user, 2026-11-10: "too fast to follow"): longer holds after every gag; motions keep real speed.
export const ARRIVE = 2.8;
export const TRY1 = { hand: 3.0, push: 3.5, give: 5.8 };
export const TRY2 = { hand: 6.3, push: 6.8, give: 9.6 };
const T3_RUN = 12.5;
const T3_HIT = T3_RUN + RUN_UP / RUN_V;
// the bounce: he leaves the door backwards on a true parabola and lands flat on his back
export const BOUNCE = { T: 0.5, vx: 330, slide: 1500 };
export const TRY3 = {
  back: 10.2,
  set: 11.7,
  run: T3_RUN,
  hit: T3_HIT,
  land: T3_HIT + BOUNCE.T,
  rest: T3_HIT + BOUNCE.T + BOUNCE.vx / BOUNCE.slide,
};
export const LAND_X = X3 - BOUNCE.vx * BOUNCE.T;
export const REST_X = LAND_X - (BOUNCE.vx * BOUNCE.vx) / (2 * BOUNCE.slide);

const LOOK_AT = TRY3.rest + 1.2;
export const LOOK = { at: LOOK_AT, hinge: LOOK_AT + 0.6, tiny: LOOK_AT + 1.6, big: LOOK_AT + 3.0, note: LOOK_AT + 1.0, end: LOOK_AT + 7.4 };

const OPEN_PUSH = LOOK.end + 1.5;
export const OPEN = { walk: LOOK.end - 0.1, finger: LOOK.end + 1.0, push: OPEN_PUSH, opened: OPEN_PUSH + SWING.open, shut: OPEN_PUSH + SWING.open + SWING.close };
// Dash gets up, is far too proud to hurry, and charges with his eyes shut: he arrives as it latches
export const SLAM = OPEN.shut + 0.04;
export const UP = { head: OPEN.push + 0.6, rise: OPEN.push + 1.6, stand: OPEN.push + 2.2, proud: OPEN.push + 2.6, go: SLAM - (X_SPLAT - REST_X) / RUN_V };
// Newt steps back to his spot after the push, and comes in again for the second one
export const BACK = { walk: OPEN.push + SWING.push + 0.9, at: OPEN.push + SWING.push + 1.8 };
// stuck flat on the door for a beat, then he peels off and timbers onto his back
export const FALL = { at: SLAM + 1.3, land: SLAM + 1.85 };
export const AGAIN = { palm: SLAM + 0.6, walk: FALL.land + 0.6, finger: FALL.land + 1.5, push: FALL.land + 1.9 };
export const THUMB = AGAIN.push + 1.4;
export const END_FADE = THUMB + 1.8;
export const DURATION = END_FADE + 2.9;

/** Door angle (deg) at time t: flexes when Dash fails, swings when Newt pushes */
export const doorAt = (t: number) => {
  if (t >= AGAIN.push) return swingAt(t - AGAIN.push);
  if (t >= OPEN.push && t < OPEN.shut) return swingAt(t - OPEN.push);
  const ring = (at: number, amp: number, f: number, k: number) => (t < at ? 0 : amp * Math.exp(-k * (t - at)) * Math.abs(Math.sin(f * (t - at))));
  let a = ring(TRY1.push, 0.5, 20, 4) + ring(TRY3.hit, 2.6, 26, 5) + ring(SLAM, 1.2, 30, 7);
  if (t > TRY2.push && t < TRY2.give) a += (torque(PUSH.dash2) / DOOR.stick) * 0.7 * (0.6 + 0.4 * Math.sin(t * 34)) * Math.min(1, (t - TRY2.push) / 0.4);
  return a;
};

// Cue times for the sound generator (tools/sfx/ep11-times.mjs → ep11_times.json)
export const CUE = {
  dur: DURATION,
  arrive: ARRIVE,
  try1: TRY1.push,
  give1: TRY1.give,
  try2: TRY2.push,
  give2: TRY2.give,
  back: TRY3.back,
  set: TRY3.set,
  run: TRY3.run,
  hit: TRY3.hit,
  land: TRY3.land,
  look: LOOK.at,
  lookEnd: LOOK.end,
  finger: OPEN.finger,
  push: OPEN.push,
  opened: OPEN.opened,
  proud: UP.proud,
  go: UP.go,
  slam: SLAM,
  peel: FALL.at,
  push2: AGAIN.push,
  fall: FALL.land,
  thumb: THUMB,
  end: END_FADE,
};
