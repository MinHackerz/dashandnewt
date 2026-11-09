import { POSES } from "../../rig/library";
import { solve } from "../../rig/Stickman";
import { G, PX_PER_M } from "./physics";

// All beat times (s, STORY clock) and positions (world px; x grows to the right, heights are px
// above the road). One principle: Newton's 2nd law, a = F/m: the same pull throws a light body
// much further than a heavy one. Dependent events are derived below, never hand-tuned.
//
// Depth: the street is seen from the verge side. d = metres toward the camera from Dash's lane
// (d > 0 nearer: lower on screen and bigger; d < 0 further: higher and smaller).

export const DPX = 72; // screen px a ground point drops per metre of depth
export const PERSP = 0.065; // size change per metre of depth
export const laneS = (d: number) => 1 + PERSP * d;
export const D = { houses: -9.5, farKerb: -7.4, centre: -4.1, car: -2.7, newt: -1.1, dash: 0, kerb: 0.6, cart: 1.0, knife: 1.35, crate: 1.85 } as const;

export const M = { dash: 70, newt: 25 }; // kg
export const NEWT_SCALE = 0.72;
const mps = (v: number) => v * PX_PER_M;
export const WALK_V = mps(1.15);

const hipH = (pose: keyof typeof POSES) => -solve(POSES[pose]).hip.y;
export const NEWT_HIP = NEWT_SCALE * hipH("stand"); // px

// ── Cold open: the cart and its upturned knife are planted first ──────────
export const HOOK = { glint: 0.9, title: 2.6, pan: 1.7 };
export const DASH_X0 = 1000;
export const NEWT_DX0 = 150; // Newt walks half a step ahead, one lane further out; Dash guards from behind

// ── OVER-PROTECT #1: the pigeon ───────────────────────────────────────────
export const PIG = { stop: 4.2, flap: 4.4, jump: 4.55, guard: 4.8, land: 5.25, nod: 6.3, resume: 7.0 };
export const DASH_PIG_X = DASH_X0 + WALK_V * PIG.stop;
export const NEWT_PIG_X = DASH_PIG_X + NEWT_DX0;
export const SHIELD_X = NEWT_PIG_X + 150; // he throws himself in front of Newt
// then he lets Newt walk ahead again (half a step in front) before he follows
export const DASH_WAIT = (2 * 150) / WALK_V;
export const PIGEON_X0 = SHIELD_X + 380; // pecking on the road ahead
export const PIGEON_X1 = SHIELD_X + 2 * PX_PER_M; // lands two metres away

// ── OVER-PROTECT #2: the puddle (the plant: Newt is LIGHT) ─────────────────
const WALK2_T = 1.0;
const PUD_STOP = PIG.resume + DASH_WAIT + WALK2_T;
export const PUD = { stop: PUD_STOP, reach: PUD_STOP + 0.08, grab: PUD_STOP + 0.3, toss: PUD_STOP + 0.42 };
export const DASH_PUD_X = SHIELD_X + WALK2_T * WALK_V;
export const NEWT_PUD_X = DASH_PUD_X + NEWT_DX0;
export const PUDDLE = { x: NEWT_PUD_X + 130, r: 78 };
// A casual flick sends him 0.6 m up when 0.1 m would clear the puddle.
export const TOSS_APEX = 0.6 * PX_PER_M;
export const TOSS_VY = Math.sqrt(2 * G * TOSS_APEX);
export const TOSS_T = (2 * TOSS_VY) / G;
export const TOSS_DX = 300;
export const TOSS_LAND = PUD.toss + TOSS_T;
export const NEWT_AFTER_X = NEWT_PUD_X + TOSS_DX;
export const DASH_STEP = 300; // Dash follows, keeping half a step behind
export const LOOKHAND = { at: TOSS_LAND + 0.3, end: TOSS_LAND + 1.15 };
export const RESUME = TOSS_LAND + 1.35;

// ── The car, and the yank ─────────────────────────────────────────────────
export const LOOK1 = { back: RESUME + 0.9, tint: RESUME + 1.05, end: RESUME + 2.45 };
export const YANK = { glance: RESUME + 2.6, alarm: RESUME + 2.75, reach: RESUME + 2.95, grab: RESUME + 3.15, pull: RESUME + 3.22, release: RESUME + 3.4 };
export const DASH_YANK_X = DASH_PUD_X + DASH_STEP + (YANK.reach - RESUME) * WALK_V;
export const NEWT_GRAB_X = NEWT_AFTER_X + (YANK.grab - RESUME) * WALK_V;
export const CAR_V = mps(11); // ≈ 40 km/h, in its own lane
export const CAR_PASS = YANK.release + 0.12; // its nose passes where Newt was walking
export const CAR_HUM = RESUME + 0.3;
export const GAP_M = D.newt - D.car - 0.2; // ≈ 1.4 m between Newt's shoulder and the car's side
export const carX = (t: number) => NEWT_GRAB_X + CAR_V * (t - CAR_PASS); // the car's nose

// The flight: Dash yanks Newt sideways toward the kerb (toward the camera). His hips leave at REL,
// keep his forward walking speed (inertia), and fly ballistic under the one G onto the sharpener's
// knife on the verge just ahead. The launch velocity is derived from where he comes down.
export const REL = { x: DASH_YANK_X + 200, d: 0.1, h: 1.05 * PX_PER_M };
export const FLY_VY = mps(2.5);
export const LAND_H = 0.85 * PX_PER_M; // his hips come down behind the crates
export const FLY_T = (FLY_VY + Math.sqrt(FLY_VY ** 2 + 2 * G * (REL.h - LAND_H))) / G;
export const LAND_X = REL.x + WALK_V * FLY_T; // still moving forward at walking pace
export const KNIFE_X = LAND_X + 45; // the blade, just beside his hips
export const LAND_T = YANK.release + FLY_T;
const vx = (LAND_X - REL.x) / PX_PER_M / FLY_T; // m/s
const vz = (D.knife - REL.d) / FLY_T;
export const FLY_SPEED = Math.hypot(vx, vz, FLY_VY / PX_PER_M); // m/s
export const IMPULSE = M.newt * FLY_SPEED; // N·s
export const PULL_F = IMPULSE / (YANK.release - YANK.pull); // N
export const ADULT_V = IMPULSE / M.dash; // the same pull on a grown-up: a step
export const flight = (t: number) => {
  const tau = Math.max(0, Math.min(t - YANK.release, FLY_T));
  const u = tau / FLY_T;
  return { x: REL.x + (LAND_X - REL.x) * u, d: REL.d + (D.knife - REL.d) * u, h: REL.h + FLY_VY * tau - 0.5 * G * tau * tau, u };
};

// ── The cart (planted from the first frame) ───────────────────────────────
export const STEP_H = 0.75 * PX_PER_M; // the cart's front step
export const BLOCK_H = 0.2 * PX_PER_M; // knife block
export const BLADE = 0.45 * PX_PER_M;
export const TIP_H = STEP_H + BLOCK_H + BLADE;
export const CRATE = { w: 150, h: 0.48 * PX_PER_M, n: 2 }; // two stacked tomato crates in front

// ── Slow motion: the story clock runs at SLOW.real / SLOW.story ─────────────
export const SLOW = { a: YANK.release + 0.06, story: 0.34, real: 5.4 };
/** story time → real (screen) time */
export const realOf = (s: number) => (s <= SLOW.a ? s : s <= SLOW.a + SLOW.story ? SLOW.a + ((s - SLOW.a) * SLOW.real) / SLOW.story : s + SLOW.real - SLOW.story);
/** real (screen) time → story time */
export const storyOf = (r: number) => (r <= SLOW.a ? r : r <= SLOW.a + SLOW.real ? SLOW.a + ((r - SLOW.a) * SLOW.story) / SLOW.real : r - SLOW.real + SLOW.story);
export const SLOW_R = { a: SLOW.a, b: SLOW.a + SLOW.real }; // in real time
// in real time, inside the slow-mo: Newt's physics look, then Dash's relief
export const LOOK2 = { tint: SLOW_R.a + 0.25, arc: SLOW_R.a + 0.45, f: SLOW_R.a + 1.3, m: SLOW_R.a + 1.9, oh: SLOW_R.a + 2.6, palm: SLOW_R.a + 2.3, end: SLOW_R.a + 3.2 };
// story times for Dash's relief (they land inside the slow-mo, after the chalk)
const st = (r: number) => storyOf(r);
export const RELIEF = { watch: st(SLOW_R.a + 3.2), heart: st(SLOW_R.a + 3.6), close: st(SLOW_R.a + 4.2) };

// ── After the THUNK (story clock = real clock + offset again) ─────────────
const L = LAND_T;
export const AFTER = { thunk: L, twang: L + 0.04, open: L + 1.0, turn: L + 1.55, reveal: L + 1.85, womp: L + 3.3, walk: L + 3.9, reach: L + 4.75, hat: L + 5.0, ghost: L + 5.6, float: L + 6.9, pat: L + 7.4, patEnd: L + 8.1, tug: L + 8.3, nod: L + 8.8, wave: L + 9.4, up: L + 9.9, end: L + 11.0 };
export const HAT_X = KNIFE_X; // the party hat stays on the knife tip until Dash takes it
export const DASH_HAT_X = KNIFE_X - 200; // where he stands to take it (facing right)
export const DASH_HAT_D = 0.45; // at the road's edge, by the kerb
export const END_FADE_R = realOf(AFTER.end);
export const DURATION = END_FADE_R + 3.4; // real seconds

// ── Sound/score cue times on the REAL (screen) clock, shared with tools/sfx/ep07_saved.py ──
export const CUE = {
  glint: HOOK.glint,
  cut: 2.4,
  pigFlap: PIG.flap,
  pigJump: PIG.jump,
  pigLand: PIG.land,
  pigNod: PIG.nod,
  pudToss: PUD.toss,
  tossLand: TOSS_LAND,
  resume: RESUME,
  carHum: CAR_HUM,
  look1: LOOK1.tint,
  alarm: YANK.alarm,
  pull: YANK.pull,
  slowA: SLOW_R.a,
  slowB: SLOW_R.b,
  look2: LOOK2.tint,
  palm: LOOK2.palm,
  oh: LOOK2.oh,
  heart: realOf(RELIEF.heart),
  land: realOf(LAND_T),
  open: realOf(AFTER.open),
  turn: realOf(AFTER.turn),
  reveal: realOf(AFTER.reveal),
  womp: realOf(AFTER.womp),
  walk: realOf(AFTER.walk),
  hat: realOf(AFTER.hat),
  ghost: realOf(AFTER.ghost),
  pat: realOf(AFTER.pat),
  tug: realOf(AFTER.tug),
  wave: realOf(AFTER.wave),
  up: realOf(AFTER.up),
  end: END_FADE_R,
  dur: DURATION,
};
