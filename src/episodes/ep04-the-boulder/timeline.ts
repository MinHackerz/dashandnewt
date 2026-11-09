import { POSES } from "../../rig/library";
import { HEAD_SCALE, solve } from "../../rig/Stickman";
import { dropTime, G, leverTilt, PX_PER_M, rollAccel, speedToHit, stopDistance, stopTime } from "./physics";

// All beat times (s) and world positions (px; x grows to the right, heights are px above
// GROUND). Dependent events are derived from physics below — never hand-tuned.
// The reel teaches one idea — the lever — so the lesson beats are held long enough to read.
// Total stays under 90 s (Facebook Reels' limit); DURATION is derived at the bottom.

// ── Set ───────────────────────────────────────────────────────────────────
export const LEDGE_X = 1500; // vertical rock face at the foot of the hill
export const LEDGE_H = 1.0 * PX_PER_M; // 1 m step
export const SHELF_END = 1650; // short flat shelf on top of the step
export const SLOPE_TOP = { x: 2250, h: 560 };
export const SLOPE = Math.atan2(SLOPE_TOP.h - LEDGE_H, SLOPE_TOP.x - SHELF_END); // ≈ 28°

export const hillH = (x: number) =>
  x < LEDGE_X ? 0 : x < SHELF_END ? LEDGE_H : x < SLOPE_TOP.x ? LEDGE_H + (x - SHELF_END) * Math.tan(SLOPE) : SLOPE_TOP.h;

export const R = 0.35 * PX_PER_M; // boulder radius (Ø 0.7 m granite ≈ 480 kg)
export const BALL_R = 0.11 * PX_PER_M; // football
export const BALL_FLAT = 9; // squashed ball thickness under the boulder (px)
export const M = { dash: 70, newt: 30, boulder: 480, bird: 0.03 }; // kg

// Rolling resistance of lumpy granite on grass (deceleration, px/s²)
export const ROLL_DECEL = 3.0 * PX_PER_M;

// ── Cold open: warm-up, the kick, the boulder comes down ─────────────────
export const DASH_X0 = 430;
export const NEWT_X0 = 170;
export const INTRO = { stretch: 0.2, side: 1.0, lunge: 1.7, lick: 2.4, wind: 2.9, cocky: 3.5, windUp: 4.25 };
export const KICK_T = 4.6;
export const ROCK1 = { x: 1855 }; // prop rock on the downhill side of boulder #1
export const B1_START = 1950; // boulder #1 contact point on the slope
export const BALL_KICK = { t0: KICK_T, t1: KICK_T + 0.7, x0: DASH_X0 + 70, x1: ROCK1.x - 14 };
export const HIT_T = BALL_KICK.t1; // ball knocks the prop rock out

// Boulder #1: rolls down the slope from rest, across the shelf, off the step, then
// decelerates on the grass. Where it stops is where the ball must be lying.
const slopeLen = (B1_START - SHELF_END) / Math.cos(SLOPE);
const aSlope = rollAccel(SLOPE);
export const B1_SLOPE_T = Math.sqrt((2 * slopeLen) / aSlope);
const vFoot = aSlope * B1_SLOPE_T;
const vLip = Math.sqrt(vFoot * vFoot - 2 * ROLL_DECEL * (SHELF_END - LEDGE_X));
export const B1_SHELF_T = (vFoot - vLip) / ROLL_DECEL;
export const B1_FALL_T = dropTime(LEDGE_H);
export const B1_LAND_X = LEDGE_X - vLip * B1_FALL_T;
export const B1_V_LIP = vLip;
export const B1_V_FOOT = vFoot;
export const B1_ROLL_T = stopTime(vLip, ROLL_DECEL);
export const B1 = B1_LAND_X - stopDistance(vLip, ROLL_DECEL); // final x of boulder #1 (on the ball)
export const B1_GO = HIT_T + 0.05;
export const B1_LIP_T = B1_GO + B1_SLOPE_T + B1_SHELF_T;
export const B1_LAND_T = B1_LIP_T + B1_FALL_T;
export const PARK_T = B1_LAND_T + B1_ROLL_T; // squeak

// The ball rebounds off the rock, lands on the grass and rolls to exactly that spot.
export const BALL_BACK = { t0: HIT_T, t1: HIT_T + 1.1, x0: ROCK1.x - 14, x1: 1250 };
const vBallBack = (BALL_BACK.x0 - BALL_BACK.x1) / (BALL_BACK.t1 - BALL_BACK.t0);
export const BALL_DECEL = (vBallBack * vBallBack) / (2 * (BALL_BACK.x1 - B1)); // grass + spin, derived
export const BALL_V_BACK = vBallBack;
export const BALL_REST_T = BALL_BACK.t1 + stopTime(vBallBack, BALL_DECEL);

// ── Escalation 1: PUSH ────────────────────────────────────────────────────
export const WEIGHT_NOTE = { t0: PARK_T + 0.9, t1: PARK_T + 3.6 }; // "480 kg ≈ 7 grown-ups"
export const TRY = [10.9, 17.4, 23.4]; // "TRY #1/#2/#3" stamps
export const PUSH = { walk: 11.2, t0: 11.8, slip: 14.1, look: 14.2, turn: 14.8, back: 15.1, yawn: 16.4, t1: 17.4 };

// ── Escalation 2: CHARGE (70 kg at 6 m/s into 480 kg, restitution 0.6) ──
export const CHARGE_V = 6 * PX_PER_M;
export const CHARGE_FROM = -150; // backed up out of frame
export const CHARGE_HIT_X = B1 - R - 0.38 * PX_PER_M; // his hips when the shoulder meets the rock
const BONK_T0 = 20.8;
export const CHARGE = { backUp: 17.6, gone: 19.0, go: BONK_T0 - (CHARGE_HIT_X - CHARGE_FROM) / CHARGE_V, bonk: BONK_T0, up: 22.4, t1: 23.0 };
const E_RESTITUTION = 0.6;
export const REBOUND_V = ((M.dash - E_RESTITUTION * M.boulder) / (M.dash + M.boulder)) * CHARGE_V; // < 0: back the way he came
export const BOULDER_KICK_V = ((1 + E_RESTITUTION) * M.dash * CHARGE_V) / (M.dash + M.boulder); // wedged: it only rocks
export const BODY_DECEL = 6 * PX_PER_M; // tumbling body on grass
export const REBOUND_AIR = 0.32; // short hop back off the rock
export const REBOUND_LAND_X = CHARGE_HIT_X + REBOUND_V * REBOUND_AIR;
export const REBOUND_STOP_X = REBOUND_LAND_X - stopDistance(REBOUND_V, BODY_DECEL);
export const REBOUND_STOP_T = BONK_T0 + REBOUND_AIR + stopTime(REBOUND_V, BODY_DECEL);

// ── Escalation 3: ROPE (tetherball) ───────────────────────────────────────
// Rope winds onto the boulder's equator (radius R). Speed stays ~constant, so the
// angular speed ω = v / L climbs as the free length L shrinks: faster and faster.
export const ROPE = { grab: 23.6, loop: 24.2, tie: 24.7, run: 25.2, v: 6 * PX_PER_M };
export const ROPE_END_L = 0.45 * PX_PER_M; // body thickness: he stops when pressed on
export const ROPE_L0 = ROPE_END_L + R * 2 * Math.PI; // exactly one lap of rope
export const ROPE_TAUT_T = ROPE.run + 0.35;
const ORBIT_ANGLE = 2 * Math.PI;
export const ORBIT_T = (ROPE_L0 * ORBIT_ANGLE - (R * ORBIT_ANGLE * ORBIT_ANGLE) / 2) / ROPE.v;
export const STRAP_T = ROPE_TAUT_T + ORBIT_T;
// angle swept after t seconds of orbit: solve L0·φ − R·φ²/2 = v·t
export const orbitAngle = (tau: number) => {
  const d = ROPE.v * Math.max(0, Math.min(tau, ORBIT_T));
  return (ROPE_L0 - Math.sqrt(ROPE_L0 * ROPE_L0 - 2 * R * d)) / R;
};

// ── Newt's lever ──────────────────────────────────────────────────────────
// Tipping the boulder off the ball needs about half its weight at the plank tip.
export const PLANK_L = 4.2 * PX_PER_M;
export const PEBBLE_H = 0.12 * PX_PER_M;
export const RATIO = (M.boulder / 2) / M.newt; // Newt alone balances it exactly …
export const D_SHORT = PLANK_L / (1 + RATIO);
export const D_LONG = PLANK_L - D_SHORT;
export const TIP_X = B1 - 0.6 * R; // short end slid under the boulder's near side (clear of the flat ball)
export const PIVOT_X = TIP_X - D_SHORT;
export const LONG_END_X = PIVOT_X - D_LONG;
export const TILT_UP = leverTilt(PEBBLE_H, D_SHORT); // short end on the ground, long end up
export const TILT_DOWN = -leverTilt(PEBBLE_H, D_LONG); // long end on the ground
export const LIFT_MAX = PEBBLE_H - D_SHORT * Math.sin(TILT_DOWN); // how far the boulder's edge rises
// Newt's lesson (chalkboard overlay): the parts, the rule, the result — each held to be read
export const LESSON = { look: 30.2, tint: 30.8, parts: 31.2, rule: 36.0, result: 39.6, end: 44.0 };
export const LEVER = { drag: 44.2, placed: 45.8, labels: 46.0, labelsOff: 49.2, jump: 49.4, hang: 49.7, whistle: 52.2, birdGo: 52.5, birdOn: 53.1, tip: 53.4, down: 54.2 };
export const TRADE_NOTE = { t0: LEVER.down + 0.1, t1: LEVER.down + 4.2 }; // "1 m down → 13 cm up"
// … so it hovers until the bird (≈30 g, no longer sitting on the boulder) joins Newt.
// Once its edge is up, the boulder rolls off the plank and away from the lever.
const vRollOff = Math.sqrt(2 * (5 / 7) * G * LIFT_MAX);
export const ROLL_OFF = { t0: LEVER.down - 0.15, v: vRollOff, dist: stopDistance(vRollOff, ROLL_DECEL), T: stopTime(vRollOff, ROLL_DECEL) };
export const B1_FINAL = B1 + ROLL_OFF.dist;

// ── Twist: Dash launches the ball ─────────────────────────────────────────
export const TWIST = { peel: 57.0, kneel: 57.4, stand: 57.75, idea: 58.1, grab: 58.7, place: 59.6, back: 60.0, toRock: 60.4, climb: 61.1, onTop: 61.65, cocky: 61.8, jump: 62.6 };
export const SIT_X = TIP_X - 0.32 * PX_PER_M; // where his hips land on the short arm
export const SLAM_T = TWIST.jump + 0.42;
export const PLANK_SWING = 0.07; // short end slammed down, long end whipped up
// The ball sits on the long end and leaves tangentially when the plank stops: mostly up,
// drifting toward the pivot. Speed is whatever lands it on Dash's head — and the energy
// that takes (vs. his 1.1 m drop × the arm ratio) is what the plank's flex lets through.
export const LAUNCH_T = SLAM_T + PLANK_SWING;
export const LAUNCH = {
  x0: PIVOT_X - (D_LONG - BALL_R) * Math.cos(TILT_UP),
  h0: PEBBLE_H + (D_LONG - BALL_R) * Math.sin(TILT_UP) + BALL_R,
  ang: TILT_UP, // from vertical, toward the pivot
};
// Top of his head while he sits on the short arm shading his eyes (from the rig), facing the long end
const SEAT_H = PEBBLE_H - (SIT_X - (TIP_X - D_SHORT)) * Math.sin(TILT_UP) + 16 * Math.cos(TILT_UP);
const sitJ = solve(POSES.sitShade);
const headA = ((POSES.sitShade.lean + POSES.sitShade.head) * Math.PI) / 180;
const topLocal = { x: sitJ.head.x + 52 * HEAD_SCALE * Math.sin(headA), y: sitJ.head.y - 52 * HEAD_SCALE * Math.cos(headA) };
export const HEAD_HIT = { x: SIT_X - topLocal.x, h: SEAT_H - topLocal.y + BALL_R };
export const LAUNCH_V = speedToHit(LAUNCH.x0, LAUNCH.h0, HEAD_HIT.x, HEAD_HIT.h, LAUNCH.ang);
export const FLIGHT_T = (HEAD_HIT.x - LAUNCH.x0) / (LAUNCH_V * Math.sin(LAUNCH.ang));
export const BONK_T = LAUNCH_T + FLIGHT_T;
export const APEX_H = LAUNCH.h0 + (LAUNCH_V * Math.cos(LAUNCH.ang)) ** 2 / (2 * G);
const vDrop = Math.sqrt(2 * G * 1.1 * PX_PER_M);
export const PLANK_EFFICIENCY = LAUNCH_V / (vDrop * (D_LONG / D_SHORT));

// ── Heart: seesaw over the boulder, balanced like the lever law says ─────
// After the BONK: Newt's chalk recap of the catapult while Dash sees stars
export const CATAPULT_NOTE = { t0: BONK_T + 0.9, t1: BONK_T + 6.4 };
export const UP_T = CATAPULT_NOTE.t1 - 0.5; // Dash back on his feet
const H0 = CATAPULT_NOTE.t1;
export const SEESAW = { lift: H0 + 0.4, set: H0 + 1.6, sitNewt: H0 + 1.9, sitDash: H0 + 2.2, rock: H0 + 2.65, bird: H0 + 5.75, tipped: H0 + 6.15 };
export const BALANCE_NOTE = { t0: SEESAW.set + 0.2, t1: SEESAW.bird - 0.2 };
// Recap chalkboard, then the moral card
export const RECAP = { t0: SEESAW.tipped + 1.8, t1: SEESAW.tipped + 7.6 };
export const END_FADE = RECAP.t1;
export const DURATION = END_FADE + 3.4;
export const BAL_SHORT = (PLANK_L * M.newt) / (M.newt + M.dash); // Dash's arm: 70 · b = 30 · a
export const BAL_LONG = PLANK_L - BAL_SHORT;
export const SEESAW_PIVOT = { x: B1_FINAL, h: 2 * R };
export const SEESAW_MAX = Math.asin((2 * R) / BAL_LONG); // Newt's end touches the grass
