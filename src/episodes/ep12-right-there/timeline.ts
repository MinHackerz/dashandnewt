import { POSES } from "../../rig/library";
import { GROUND, solve } from "../../rig/Stickman";
import { ballistic, G, PX_PER_M } from "../ep03-the-shortcut/physics";
import { N_WATER, type WaterBox } from "../../world3d/optics";

// Ep 12 — It's RIGHT There. One principle: refraction. Light bends where it leaves the water
// (Snell: n_water sin θw = n_air sin θa), so anything under water looks shallower — and, seen at an
// angle, closer — than it really is. Where Dash reaches and where his stick lands are DERIVED from
// his eye position with Snell's law below; nothing is hand-placed. World px, y down (GROUND = 1380).
export { G, PX_PER_M };
export const NEWT_SCALE = 0.72;
type P = { x: number; y: number };
const m = (px: number) => px / PX_PER_M;
const px = (metres: number) => metres * PX_PER_M;

// ─── The rock pool (sunk into the sand) ───────────────────────────────────
export const EDGE = 560; // the near rim, where they stand
export const FAR = EDGE + px(1.1);
export const WY = GROUND + px(0.06); // water surface, a little below the sand
export const DEPTH = 0.45; // m
export const FLOOR_Y = WY + px(DEPTH);
export const COIN = { x: EDGE + px(0.3), y: FLOOR_Y - 1.5, z: 0 };
export const BOX: WaterBox = { x0: m(EDGE), x1: m(FAR), z0: -0.75, z1: 0.55, y: (GROUND - WY) / PX_PER_M, floor: (GROUND - FLOOR_Y) / PX_PER_M };
/** looking straight down there is no sideways shift: it just looks 1/n as deep (3/4) */
export const SEEN_TOP = { x: COIN.x, y: WY + (COIN.y - WY) / N_WATER };

// ─── Snell's law, in the vertical plane of the action ─────────────────────
/** The point on the surface where light from `o` (under water) bends into the eye `e` */
export const surfacePoint = (e: P, o: P): P => {
  const f = (x: number) => {
    const sa = (x - e.x) / Math.hypot(x - e.x, WY - e.y); // sin of the angle in air (from vertical)
    const sw = (o.x - x) / Math.hypot(o.x - x, o.y - WY); // … and in water
    return N_WATER * sw - sa;
  };
  let lo = Math.min(e.x, o.x);
  let hi = Math.max(e.x, o.x);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) * f(lo) > 0) lo = mid;
    else hi = mid;
  }
  return { x: (lo + hi) / 2, y: WY };
};
/** Where `o` APPEARS to the eye `e`: two neighbouring rays (eye nudged across the line of sight),
 *  traced straight back from the eye through where each left the water, meet at the virtual image. */
export const imageOf = (e: P, o: P): P => {
  const s1 = surfacePoint(e, o);
  const d1 = { x: s1.x - e.x, y: s1.y - e.y };
  const len = Math.hypot(d1.x, d1.y);
  const e2 = { x: e.x - (d1.y / len) * 6, y: e.y + (d1.x / len) * 6 };
  const s2 = surfacePoint(e2, o);
  const d2 = { x: s2.x - e2.x, y: s2.y - e2.y };
  const den = d1.x * d2.y - d1.y * d2.x;
  const t = ((e2.x - e.x) * d2.y - (e2.y - e.y) * d2.x) / den;
  return { x: e.x + d1.x * t, y: e.y + d1.y * t };
};

// ─── Try 1: lying on the rim, he reaches for where it LOOKS ───────────────
const LIE_H = -solve(POSES.lie).hip.y;
export const LIE = 42 - LIE_H; // lift that lays Dash flat
export const LIE_N = 30 - LIE_H * NEWT_SCALE; // … and Newt
/** hips on the sand, head and shoulders out over the water */
export const PRONE_X = EDGE - px(0.72);
export const EYE1 = { x: EDGE + px(0.12), y: GROUND - px(0.2) };
export const SEEN1 = imageOf(EYE1, COIN);
export const SURF1 = surfacePoint(EYE1, COIN);
/** his hand stops where the coin LOOKS: short of it, and well above it (m) */
export const SHORT1 = { dx: m(COIN.x - SEEN1.x), dy: m(COIN.y - SEEN1.y) };

// ─── Try 2: standing, he spears along his line of sight ───────────────────
const SPEAR_HEAD = solve(POSES.spear).head;
export const EYE2 = { x: EDGE - px(0.8), y: GROUND + SPEAR_HEAD.y + 4 };
export const STAND_X = EYE2.x - (SPEAR_HEAD.x + 12);
export const SEEN2 = imageOf(EYE2, COIN);
export const SURF2 = surfacePoint(EYE2, COIN);
export const STICK_DIR = (() => {
  const d = { x: SEEN2.x - EYE2.x, y: SEEN2.y - EYE2.y };
  const l = Math.hypot(d.x, d.y);
  return { x: d.x / l, y: d.y / l };
})();
export const STICK_LEN = px(1.5);
/** The straight stick follows his line of sight through the image… and on until it hits the bottom */
export const STICK_TIP = (() => {
  const s = (FLOOR_Y - EYE2.y) / STICK_DIR.y;
  return { x: EYE2.x + STICK_DIR.x * s, y: FLOOR_Y };
})();
/** how far past the coin the jab lands (m) */
export const MISS2 = m(STICK_TIP.x - COIN.x);
/** the crab guards the coin, right behind it: exactly where the stick comes down */
export const CRAB0 = { x: STICK_TIP.x + px(0.04), z: 0 }; // its shell is under the stick tip; the coin stays in view
/** where the stick lies on the sand (tip end): before he picks it up, and after he drops it */
export const STICK_REST0 = { x: EDGE - px(0.9) };
export const STICK_REST1 = { x: EDGE - px(0.06) };

// ─── Try 3: he wades in ───────────────────────────────────────────────────
export const IN_POOL_LIFT = -(FLOOR_Y - GROUND); // feet on the bottom
export const WADE_X = EDGE + px(0.06); // he steps in right at the rim
export const LAND_X = EDGE - px(0.85);

// ─── Newt: straight down, with gum on the stick ───────────────────────────
export const NEWT_X0 = EDGE - px(1.75);
export const NEWT_LANE = -1.05; // watching from behind Dash, never between him and the camera
export const NEWT_KNEEL_X = COIN.x - px(0.45); // kneeling on the rim, arm out over the coin
/** Newt holds the stick 0.8 m from its tip, straight up and down */
export const NEWT_GRIP = px(0.8);

// ─── Beats (seconds) ──────────────────────────────────────────────────────
// Pacing (user, 2026-11-10: "too fast to follow"): every gag gets a beat to land. Motions stay at real
// speed (the physics doesn't slow down); the HOLDS between them are what got longer.
export const HOOK = { glint: 0.4, bubble: 1.1, down: 1.8 };
const T1 = 2.4;
export const TRY1 = { stamp: T1, reach: T1 + 0.6, inWater: T1 + 1.3, still: T1 + 1.8, horror: T1 + 2.5, yank: T1 + 2.8, look: T1 + 3.6, fist: T1 + 4.6, end: T1 + 5.4 };
const T2 = TRY1.end + 0.2;
export const TRY2 = { stamp: T2, up: T2 + 0.05, grab: T2 + 0.7, aim: T2 + 1.3, dip1: T2 + 1.7, out1: T2 + 2.6, dip2: T2 + 3.3, out2: T2 + 4.0, dip3: T2 + 4.5, jab: T2 + 5.2, hit: T2 + 5.42, drop: T2 + 6.3, end: T2 + 6.6 };
const W0 = TRY2.end + 0.2;
export const TRY3 = { stamp: W0, step: W0 + 0.3, inn: W0 + 0.8, at: W0 + 1.6, legs: W0 + 1.7, crab: W0 + 3.0, pinch: W0 + 3.9, launch: W0 + 4.15, land: 0, crabOff: 0, end: 0 };
const FLY = 0.75;
TRY3.land = TRY3.launch + FLY;
TRY3.crabOff = TRY3.land + 1.1;
TRY3.end = TRY3.land + 1.7;
/** the leap out backwards: a true parabola from the pool bottom to flat on his back on the sand */
export const leapLift = (t: number) => ballistic(t, TRY3.launch, TRY3.land, IN_POOL_LIFT, LIE);
const L0 = TRY3.end + 0.2;
export const LOOK = { at: L0, ray: L0 + 0.6, bend: L0 + 1.3, seen: L0 + 2.1, real: L0 + 2.8, note: L0 + 0.7, top: L0 + 3.9, end: L0 + 7.0 };
const G0 = LOOK.end + 0.1;
export const GUM = { walk: G0, mouth: G0 + 0.95, press: G0 + 1.5, back: G0 + 1.95, grab: G0 + 2.55, raise: G0 + 2.85, walk2: G0 + 3.35, kneel: G0 + 3.9, lower: G0 + 4.3, touch: G0 + 5.0, lift: G0 + 5.4, show: G0 + 6.0 };
const H0 = GUM.show + 1.0;
export const GIVE = { walk: H0, hand: H0 + 0.5, take: H0 + 1.0 };
export const WISH = { kiss: GIVE.take + 0.5, turn: GIVE.take + 1.2, flip: GIVE.take + 1.9, plop: 0, settle: 0, back: 0, narrow: 0, dive: 0 };
const FLIP_T = 0.55;
WISH.plop = WISH.flip + FLIP_T;
WISH.settle = WISH.plop + DEPTH / 0.7; // a coin sinks at ~0.7 m/s
WISH.back = WISH.settle + 0.3;
WISH.narrow = WISH.back + 0.7;
WISH.dive = WISH.narrow + 0.8;
export const END_FADE = WISH.dive + 0.7;
export const DURATION = END_FADE + 2.7;
export const COIN_SINK = { x: EDGE + px(0.5), z: -0.25 };
export const GIVE_X = EDGE - px(0.75); // where Dash stands to take the coin
export const DASH_WATCH = { x: EDGE - px(1.9), lane: -0.21 }; // steps well back to give Newt room

// Cue times for the score (tools/sfx/ep12-times.mjs → ep12_times.json)
export const CUE = {
  dur: DURATION,
  glint: HOOK.glint,
  bubble: HOOK.bubble,
  reach: TRY1.reach,
  inWater: TRY1.inWater,
  horror: TRY1.horror,
  yank: TRY1.yank,
  fist: TRY1.fist,
  grab: TRY2.grab,
  dip1: TRY2.dip1,
  out1: TRY2.out1,
  dip2: TRY2.dip2,
  out2: TRY2.out2,
  dip3: TRY2.dip3,
  jab: TRY2.jab,
  hit: TRY2.hit,
  step: TRY3.step,
  legs: TRY3.legs,
  pinch: TRY3.pinch,
  launch: TRY3.launch,
  land: TRY3.land,
  look: LOOK.at,
  lookEnd: LOOK.end,
  gum: GUM.press,
  touch: GUM.touch,
  show: GUM.show,
  take: GIVE.take,
  flip: WISH.flip,
  plop: WISH.plop,
  settle: WISH.settle,
  narrow: WISH.narrow,
  end: END_FADE,
};
