import { readTime, WRITE } from "../../lib/read";
import { GROUND } from "../../rig/Stickman";
import { dropTime, G, PX_PER_M } from "../ep03-the-shortcut/physics";
export { G, PX_PER_M, dropTime };

// Ep10 "One Flare". Every time here is on the REAL clock (seconds of video). Hard cuts skip story
// time between shots; the flare runs on its own physical clock (`flareTau`), with slow motion on the
// launch and time cuts through its 33 s parachute float. One principle: a signal has to REACH the
// receiver. Sound spreads out and fades (−6 dB per doubling of distance); sight carries.

export const G_REAL = 9.8;
const px = (m: number) => m * PX_PER_M;

// ─── The beach set, in true perspective ─────────────────────────────────────
// Z = metres behind Newt's spot (away from the camera, out to sea); x = world px as if drawn at
// Z = 0 (lane 0). A thing at depth Z is drawn scaled by s(Z) about the camera axis AX, with its
// ground line at groundY(Z). The camera eye is 2.2 m up, so the horizon sits at HZ.
export const ZC = 10; // camera distance to lane 0 (m)
export const AX = 1100; // camera axis (world x)
export const EYE = 2.2; // m
export const HZ = GROUND - px(EYE); // horizon (world y)
export const sOf = (Z: number) => ZC / (ZC + Z);
export const groundY = (Z: number) => HZ + (GROUND - HZ) * sOf(Z);
/** a point at lateral x (lane-0 px), depth Z (m) and height Y (m) → world px */
export const proj = (x: number, Z: number, Y = 0) => {
  const s = sOf(Z);
  return { x: AX + (x - AX) * s, y: groundY(Z) - px(Y) * s, s };
};
export const xOfM = (m: number) => AX + px(m); // lateral metres (from the axis) → lane-0 px

export const NEWT_SCALE = 0.72;
export const Z = { dash: -0.6, newt: 0, kit: -0.3, rock: 1.2, palm1: 1.2, palm2: 2.6, wreck: 3.4, palm0: 3.6, sign: 5.5, shore: 9, reef: 270 } as const;
export const DASH_X = 1260;
export const NEWT_X = 880;
export const ROCK = { x: 1050, h: 0.75, w: 1.6 }; // a flat rock: the flare gun lives on top of it
export const PALM1_X = -150; // the tally palm
export const PALM2 = { x: 2350, h: 4.6 }; // the one Dash climbs
export const PALM0_X = 700; // the wreck stops just short of it

// ─── 1. The flight and the storm ────────────────────────────────────────────
export const HOOK = { from: 0.15, to: 2.6 };
export const FL = { cabin: 0.85, snap: 1.45, out: 2.35, storm: 3.25, strike: 4.3, error: 4.42, errEnd: 5.25, island: 6.25, touch: 7.6 };

// ─── 2. The crash: skids on sand, a friction stop (μ = 0.6) ─────────────────
export const SKID = { v: 8, mu: 0.6 };
export const SKID_T = SKID.v / (SKID.mu * G_REAL); // ≈ 1.36 s
export const SKID_D = (SKID.v * SKID.v) / (2 * SKID.mu * G_REAL); // ≈ 5.4 m
export const STOP = FL.touch + SKID_T;
export const WRECK_X = PALM0_X - 150; // where its nose stops, short of the palm
export const WRECK_X0 = WRECK_X - px(SKID_D); // touchdown point
/** the wreck's x along its slide (constant deceleration) */
export const wreckX = (t: number) => {
  const tau = Math.max(0, Math.min(SKID_T, t - FL.touch));
  return WRECK_X0 + px(SKID.v * tau - 0.5 * SKID.mu * G_REAL * tau * tau);
};
export const FIN = { off: STOP + 0.35, land: STOP + 0.35 + dropTime(px(1.3)) };
export const DOOR = STOP + 0.85;
export const OUT_D = { a: DOOR + 0.3, b: DOOR + 1.0 };
export const OUT_N = { a: DOOR + 0.75, b: DOOR + 1.45 };
export const STRANDED = { a: OUT_N.b - 0.2, b: OUT_N.b + 1.5 };

// ─── 3. The kit: ONE parachute flare. Newt's look #1 ─────────────────────────
const K0 = OUT_N.b + 0.9;
export const KIT = { cut: K0, open: K0 + 0.25, insA: K0 + 0.55, insB: K0 + 2.3 };
export const LOOK1_LINE = "fire it UP ↑ when a ship is near";
export const LOOK1 = (() => {
  const tint = KIT.insB + 0.1;
  const w = tint + 0.3;
  return { tint, w, end: w + readTime(LOOK1_LINE) + 0.2 };
})();
export const GUN_ROCK = { a: LOOK1.end + 0.05, b: LOOK1.end + 0.6 }; // Newt puts it on the rock
export const DASH_EYE = { a: GUN_ROCK.b + 0.1, b: GUN_ROCK.b + 1.1 }; // Dash eyes the gun (the plant)
export const TALLY1 = { a: DASH_EYE.b, b: DASH_EYE.b + 1.5 };

// ─── 4. Five days: three shouts (rule of three) while Newt lays the sign ─────
// A shout: 100 dB at 1 m; L = 100 − 20·log10(r). The bubble shows L as it travels out to sea.
export const SHOUT_DB = 100;
export const SURF_DB = 60;
export const MEGA_DB = 10; // a cone focuses about +10 dB forward
export const dbAt = (r: number, boost = 0) => SHOUT_DB + boost - 20 * Math.log10(Math.max(1, r));
export const BUBBLE_T = 2.2; // s on screen for the bubble to reach 1 km (sound itself takes 2.9 s)
const shout = (a: number, lead: number) => ({ a, out: a + lead, end: a + lead + BUBBLE_T });
export const SHOUT1 = shout(TALLY1.b, 0.55);
export const OVER1 = { a: SHOUT1.end + 0.1, b: SHOUT1.end + 1.1 }; // overhead: the H
export const NIGHT1 = { a: OVER1.b, b: OVER1.b + 0.75 }; // DAY 2
export const SHOUT2 = shout(NIGHT1.b, 0.5);
export const GULL = SHOUT2.out + 0.5 * BUBBLE_T; // the gull snaps the bubble half way out
export const OVER2 = { a: SHOUT2.out + 0.62 * BUBBLE_T + 0.6, b: SHOUT2.out + 0.62 * BUBBLE_T + 1.7 }; // the E
export const NIGHT2 = { a: OVER2.b, b: OVER2.b + 0.75 }; // DAY 3
export const SHOUT3 = shout(NIGHT2.b, 0.9);
export const HOARSE = { a: SHOUT3.end, b: SHOUT3.end + 0.9 };
export const LOOK2_LINES = ["every 2× farther: −6 dB", "1 km out: 40 dB  <  waves: 60 dB", "5 m letters: seen from the sky ✓"] as const;
export const LOOK2 = (() => {
  const tint = HOARSE.b;
  const rings = tint + 0.2;
  const l1 = tint + 1.0;
  const l2 = l1 + readTime(LOOK2_LINES[0]);
  const end = l2 + readTime(LOOK2_LINES[1]) + 0.2;
  return { tint, rings, l1, l2, end };
})();
export const OVER3 = (() => {
  const a = LOOK2.end; // overhead: L and P go down; DAY 5; the sign line
  const w = a + 1.1;
  return { a, lp: a + 0.15, day: a + 0.5, w, b: w + readTime(LOOK2_LINES[2]) + 0.1 };
})();

// ─── 5. The seaplane: zoom out to the whole island, the plane, the wing rock ───
export const AERIAL = { a: OVER3.b, shadow: OVER3.b + 1.2, plane: OVER3.b + 1.6, spot: OVER3.b + 2.3, b: OVER3.b + 3.0 };
export const ROCKW = { a: AERIAL.b, rock: AERIAL.b + 0.35, cheer: AERIAL.b + 0.6, radio: AERIAL.b + 2.3, b: AERIAL.b + 3.0 };
export const WING_HZ = 1.1; // rocks per second

// ─── 6. The ship: the mast first (the Earth's curve), then it stops at the reef ──
export const EARTH_R = 6371000;
export const horizonM = (h: number) => Math.sqrt(2 * EARTH_R * h); // m
export const hiddenM = (d: number, eye: number) => {
  const x = d - horizonM(eye);
  return x > 0 ? (x * x) / (2 * EARTH_R) : 0;
};
export const SHIP = { mast: 30, len: 50, deck: 6, far: 20000, x: xOfM(70), Z: 280 }; // MV HOPE
export const HORIZON = { a: ROCKW.b, see: ROCKW.b + 0.35, b: ROCKW.b + 2.6 }; // telephoto on the horizon
/** the ship's distance during the horizon shot (it steams in at 9 m/s; a time cut follows) */
export const shipFar = (t: number) => SHIP.far - 9 * 60 * Math.max(0, t - HORIZON.a) * 6; // shown sped-up ×6
export const REEF = { a: HORIZON.b, b: HORIZON.b + 2.5, lower: HORIZON.b + 0.9 };

// ─── 7. Dash and the flare ────────────────────────────────────────────────
export const GRAB = { a: REEF.b, take: REEF.b + 0.45, up: REEF.b + 1.0, raise: REEF.b + 1.5, tilt: REEF.b + 2.0, bang: REEF.b + 2.5 };
export const BANG = GRAB.bang;

// The flare: a parachute round, v0 = 55 m/s. Fired UP but tilted toward the ship; at the top of its
// climb a little parachute opens and it sinks at VD while the offshore wind W carries it out to sea.
// The tilt is SOLVED so the descent ends on the ship's fuel drums (deck height SHIP.deck).
export const V0 = 55;
export const VD = 5; // m/s under the parachute
export const WIND = 8; // m/s, island → sea, toward the ship
export const BURN = 40; // s
export const CHUTE_T = 0.35; // s for the chute to open (it hangs at the apex)
const LAUNCH = { xm: (DASH_X + 60 - AX) / PX_PER_M, Z: Z.dash, Y: 2.25 };
const TARGET = { xm: (SHIP.x - AX) / PX_PER_M - 6, Z: SHIP.Z - 1.5 }; // the drums, just aft of mid-ship
const DIST = Math.hypot(TARGET.xm - LAUNCH.xm, TARGET.Z - LAUNCH.Z);
const DIR = { x: (TARGET.xm - LAUNCH.xm) / DIST, z: (TARGET.Z - LAUNCH.Z) / DIST };
const flight = (tilt: number) => {
  const vh = V0 * Math.sin(tilt);
  const vv = V0 * Math.cos(tilt);
  const ta = vv / G_REAL;
  const apex = LAUNCH.Y + (vv * vv) / (2 * G_REAL);
  const td = (apex - SHIP.deck) / VD;
  return { vh, vv, ta, apex, td, reach: vh * ta + WIND * td, land: ta + CHUTE_T + td };
};
export const TILT = (() => {
  let lo = 0.01;
  let hi = 0.6;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (flight(m).reach < DIST) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
})();
export const TILT_DEG = (TILT * 180) / Math.PI;
export const FLIGHT = flight(TILT);
export const FLARE_DIST = DIST;
/** the flare at physical time τ after the shot: lateral px (lane 0), Z m, Y m */
export const flareAt = (tau: number) => {
  const f = FLIGHT;
  let h: number;
  let Y: number;
  if (tau <= f.ta) {
    h = f.vh * tau;
    Y = LAUNCH.Y + f.vv * tau - 0.5 * G_REAL * tau * tau;
  } else {
    const d = Math.max(0, tau - f.ta - CHUTE_T);
    h = f.vh * f.ta + WIND * d;
    Y = Math.max(SHIP.deck, f.apex - VD * d);
  }
  return { x: xOfM(LAUNCH.xm + DIR.x * h), Z: LAUNCH.Z + DIR.z * h, Y };
};

// The flare's clock: slow motion on the shot, a speed ramp up the climb, real time while it hangs
// (Newt's look #3), then time cuts down its float, and real time for the last seconds onto the drums.
export const LOOK3_LINES = [`wind: ${WIND} m/s → out to sea`, "…oh."] as const;
const POP_R = BANG + 0.9 + 1.3;
export const LOOK3 = (() => {
  const tint = POP_R + 0.9;
  const w1 = tint + 0.35;
  const oh = w1 + readTime(LOOK3_LINES[0]);
  return { tint, w1, oh, end: oh + 1.5 };
})();
const LAND_TAU = FLIGHT.land;
const DRIFT_A = LOOK3.end; // cut 1: out over the reef
const DRIFT_B = DRIFT_A + 1.25; // cut 2: lower; the crew start pointing
const DRIFT_C = DRIFT_B + 1.25; // cut 3: the last seconds, onto the drums
const FINAL = 2.3;
export const TINK = DRIFT_C + FINAL;
const MAP: readonly (readonly [number, number])[] = [
  [BANG, 0],
  [BANG + 0.9, 0.3], // slow motion: smoke ring, recoil
  [POP_R, FLIGHT.ta], // speed ramp up the climb
  [DRIFT_A, FLIGHT.ta + (DRIFT_A - POP_R)], // real time: the chute opens, it hangs (look #3)
  [DRIFT_A + 1e-4, 0.42 * LAND_TAU],
  [DRIFT_B, 0.42 * LAND_TAU + 1.25],
  [DRIFT_B + 1e-4, 0.74 * LAND_TAU],
  [DRIFT_C, 0.74 * LAND_TAU + 1.25],
  [DRIFT_C + 1e-4, LAND_TAU - FINAL],
  [TINK, LAND_TAU],
];
export const flareTau = (t: number) => {
  if (t <= MAP[0][0]) return -1;
  for (let i = 1; i < MAP.length; i++) {
    const [r1, s1] = MAP[i];
    const [r0, s0] = MAP[i - 1];
    if (t <= r1) return s0 + ((t - r0) / (r1 - r0)) * (s1 - s0);
  }
  return LAND_TAU;
};
export const DRIFT = { a: DRIFT_A, b: DRIFT_B, c: DRIFT_C };
export const POP = POP_R;
export const SLOW = { a: BANG - 0.05, b: BANG + 0.9 };

// ─── 8. Fire, the burst, the ship drowns ────────────────────────────────────
export const FIRE = { a: TINK + 0.6, spread: 1.6, crew: TINK + 0.9, boat: TINK + 1.9 }; // flames run drum to drum
export const BURST = TINK + 2.9; // one drum bursts: a hole at the waterline
// It floods through the hole at Q = C·A·√(2gh) and goes down; a real freighter takes minutes,
// so the sinking is a time cut, and we watch the last 3.4 s.
export const HOLE = { A: 2, C: 0.6, h: 1 };
export const FLOOD_Q = HOLE.C * HOLE.A * Math.sqrt(2 * G_REAL * HOLE.h); // m³/s
export const SINK = { a: BURST + 1.6, b: BURST + 1.6 + 3.4 };
export const RING = { a: SINK.b + 0.2, bump: SINK.b + 1.6 }; // a life ring washes up at Dash's foot
export const REALIZE = { a: RING.bump + 0.2, confused: RING.bump + 0.7, horror: RING.bump + 1.3, sheep: RING.bump + 2.3, b: RING.bump + 3.0 };

// ─── 9. Heart: DAY 1 again, half a coconut; then the moral card ─────────────
export const HEART = { a: REALIZE.b, scratch: REALIZE.b + 0.3, carve: REALIZE.b + 1.3, walk: REALIZE.b + 2.4, sit: REALIZE.b + 3.1, give: REALIZE.b + 3.6, wide: REALIZE.b + 4.6, fade: REALIZE.b + 5.6 };
export const END = HEART.fade + 1.0;
export const DURATION = END + 3.6;

export const WRITE_S = WRITE;

// ── Cue times (REAL clock), shared with tools/sfx/ep10_flare.py via ep10-times.mjs ──
export const CUE = {
  cabin: FL.cabin,
  snap: FL.snap,
  storm: FL.storm,
  strike: FL.strike,
  error: FL.error,
  island: FL.island,
  touch: FL.touch,
  stop: STOP,
  fin: FIN.land,
  door: DOOR,
  outD: OUT_D.a,
  outN: OUT_N.a,
  stranded: STRANDED.a,
  kit: KIT.open,
  look1: LOOK1.tint,
  gun: GUN_ROCK.b,
  tally1: TALLY1.a,
  shout1: SHOUT1.out,
  over1: OVER1.a,
  night1: NIGHT1.a,
  shout2: SHOUT2.out,
  gull: GULL,
  over2: OVER2.a,
  night2: NIGHT2.a,
  mega: SHOUT3.a,
  shout3: SHOUT3.out,
  hoarse: HOARSE.a,
  look2: LOOK2.tint,
  over3: OVER3.a,
  aerial: AERIAL.a,
  plane: AERIAL.plane,
  rock: ROCKW.rock,
  cheer: ROCKW.cheer,
  radio: ROCKW.radio,
  horizon: HORIZON.a,
  reef: REEF.a,
  lower: REEF.lower,
  grab: GRAB.take,
  bang: BANG,
  slowA: SLOW.a,
  slowB: SLOW.b,
  pop: POP,
  look3: LOOK3.tint,
  oh: LOOK3.oh,
  driftA: DRIFT.a,
  driftB: DRIFT.b,
  driftC: DRIFT.c,
  tink: TINK,
  fire: FIRE.a,
  boat: FIRE.boat,
  burst: BURST,
  sinkA: SINK.a,
  sinkB: SINK.b,
  ring: RING.bump,
  horror: REALIZE.horror,
  sheep: REALIZE.sheep,
  scratch: HEART.scratch,
  carve: HEART.carve,
  give: HEART.give,
  fade: HEART.fade,
  end: END,
  dur: DURATION,
};
