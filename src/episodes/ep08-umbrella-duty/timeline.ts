import { discArea, drag, G_REAL, PX_PER_M } from "./physics";
import { POSES } from "../../rig/library";
import { solve } from "../../rig/Stickman";
import { readTime } from "../../lib/read";
export { DPX, PERSP, laneS } from "../../rig2d/depth";

// All beat times (s) and world positions (px; x grows to the right, heights are px above the
// promenade). One principle: air resistance, F = ½ρv²·C·A. Newt's flight is SIMULATED below from
// the drag on the parasol and his weight — not keyframed.
//
// The set: a seaside promenade, bus stop. The wind blows from the sea on the RIGHT toward the beach
// shop on the LEFT (−x). Wind hitting the shop's wall is forced UP and over its roof (the updraft).
// Depth lanes as in ep07: d = metres toward the camera (nearer = lower on screen, bigger).

const m = (px: number) => px / PX_PER_M;
const px = (mm: number) => mm * PX_PER_M;

export const NEWT_SCALE = 0.72;
export const D = { sea: -12, rail: -3.2, shop: -1.6, rack: -0.7, newt: 0, dash: 0.5, bench: -1.9 } as const;
export const SHOP = { x0: 120, x1: 950, h: px(4.2) }; // its windward wall is x1
export const RACK_X = 1230;
export const DASH_X = 1400;
export const NEWT_X = 1580;
export const BUS_X = 2160; // the bus-stop sign they're waiting at
export const BOLLARD_X = 1800; // a mooring bollard: Dash puts his foot up on it to tie his lace


// ── The umbrellas: canopy diameter (m), pole length above the grip (px), drag coefficient ──
export const BROLLY = {
  small: { d: 1.0, pole: px(0.85), C: 1.2 },
  golf: { d: 1.5, pole: px(0.95), C: 1.2 },
  parasol: { d: 2.4, pole: px(2.05), C: 1.3 },
} as const;
export const AREA = { small: discArea(BROLLY.small.d), golf: discArea(BROLLY.golf.d), parasol: discArea(BROLLY.parasol.d) };

// ── Beats ─────────────────────────────────────────────────────────────────
export const HOOK = { to: 2.6 };
export const DROP1 = 3.0; // one raindrop lands on Newt's hat
export const RAIN = { on: 3.3, full: 6.0, off: 0 }; // off is set after the gust
export const U1 = { turn: 3.55, grab: 3.8, back: 4.1, open: 4.4, drip: 5.35 };
export const U2 = { toss: 6.0, turn: 6.15, grab: 6.4, back: 6.7, open: 7.0, side: 8.05 };
// ── The wind and the drag (the real numbers on screen) ──────────────────────
export const W_BASE = 6; // m/s, a breezy drizzle
export const W_GUST = 16; // m/s, ≈ 58 km/h gust
export const UP_LOW = 40; // ° the flow climbs near the shop wall (below its roof)
export const U_CLOUD = 11; // m/s: the shower cloud's updraft above the rooftops (real showers: 5–15 m/s)
export const M_FLY = 25 + 3; // Newt + parasol, kg
export const K_PARASOL = 0.5 * 1.2 * BROLLY.parasol.C * AREA.parasol; // F = K·v²
export const F_GUST = drag(W_GUST, BROLLY.parasol.C, AREA.parasol); // ≈ 900 N
export const F_GUST_UP = F_GUST * Math.sin((UP_LOW * Math.PI) / 180); // ≈ 580 N up (the gust climbing the wall)
export const W_NEWT = M_FLY * G_REAL; // ≈ 275 N down
export const F_BASE_UP = drag(W_BASE, BROLLY.parasol.C, AREA.parasol) * Math.sin((UP_LOW * Math.PI) / 180); // < weight: he holds on fine
export const F_GOLF_GUST = drag(W_GUST, BROLLY.golf.C, AREA.golf); // the same gust on the golf umbrella

// ── Newt's physics looks: every line is written on and held long enough to read ──
export const LOOK1_LINES = ["wind hits the wall…", "…and is pushed UP ↑"] as const;
const L1_0 = 8.5;
export const LOOK1 = (() => {
  const wall = L1_0 + 0.8; // while the wind arrows draw
  const up = wall + readTime(LOOK1_LINES[0]);
  return { tint: L1_0, wind: L1_0 + 0.2, wall, up, end: up + readTime(LOOK1_LINES[1]) + 0.3 };
})();
const S1 = LOOK1.end - 10.7; // everything after Newt's first look moves by this much
export const U3 = { toss: 10.8 + S1, turn: 10.95 + S1, grab: 11.2 + S1, drag: 11.45 + S1, back: 11.9 + S1, open: 12.2 + S1, nod: 12.9 + S1 };
export const LACE = { notice: 13.45 + S1, hand: 13.95 + S1, took: 14.3 + S1, kneel: 14.55 + S1 };
export const LOOK2_LINES = [
  "F = ½ρv² · C · A",
  `push UP ≈ ${Math.round(F_GUST_UP / 10) * 10} N  >  me: ${Math.round(W_NEWT / 5) * 5} N`,
  "…oh.",
] as const;

// ── The shoelace: he walks to the bollard, puts his foot up, ties it (close-up), Newt thinks meanwhile ──
const WALK_V = px(1.15);
const FU = solve(POSES.footUp);
export const FOOT_H = -FU.aFoot.y; // px: the bollard's top = where his raised foot rests
export const DASH_TIE_X = BOLLARD_X - FU.aFoot.x; // he stands so his raised foot is on the bollard
export const TIE_WALK = { a: LACE.took + 0.05, b: LACE.took + 0.05 + (DASH_TIE_X - DASH_X) / WALK_V };
export const FOOT_UP = TIE_WALK.b + 0.15;
export const TIE1 = { a: FOOT_UP + 0.4, b: FOOT_UP + 0.4 + 3.0 }; // close-up: cross, tuck, loops, bow
export const LOOK2 = (() => {
  const tint = TIE1.b + 0.15;
  const f = tint + 0.45; // after the ring around the canopy
  const num = f + readTime(LOOK2_LINES[0]);
  const oh = num + readTime(LOOK2_LINES[1]);
  return { tint, ring: tint + 0.1, f, num, oh, end: oh + 1.0 };
})();
export const GUST = LOOK2.end + 0.25;
export const CAP = { rain: 3.2, golf: 6.0, max: U3.toss };

const smooth = (u: number) => {
  const k = Math.max(0, Math.min(1, u));
  return k * k * (3 - 2 * k);
};
/** wind speed far from the shop (m/s, blowing toward −x): a breeze, then a sustained squall */
export const windAt = (t: number) => W_BASE + (W_GUST - W_BASE) * smooth((t - GUST) / 0.35);

// ── The flow near the shop: the wind slows as it reaches the wall and turns UP along it (stagnation
//    flow); above the roof the shower cloud's updraft takes over. KU = how much of the wind turns up.
export const KU = 0.58;
const XW = m(SHOP.x1);
const ROOF = m(SHOP.h);
const flow = (x: number, hc: number, w: number) => {
  const f = smooth((x - XW - 0.4) / 2.0); // 1 in the open, 0 at the wall
  const b = smooth((hc - (ROOF + 0.3)) / 1.5); // 0 below the roof line, 1 above it
  return { wx: (1 - b) * (-w * f) + b * -1.5, wy: (1 - b) * (KU * w * (1 - f)) + b * U_CLOUD };
};

// ── Newt's flight: integrate F = K|w − v|(w − v) − m·g, with ground contact, shoe friction (μ = 0.6)
//    and the shop wall. State = the grip (his hands on the pole), metres.
export const GRIP_H0 = px(0.78);
const DT = 1 / 240;
const SIM_T = 16;
type S = { t: number; x: number; y: number; vx: number; vy: number };
const sim: S[] = (() => {
  const out: S[] = [];
  let x = m(NEWT_X - 20);
  let y = m(GRIP_H0);
  let vx = 0;
  let vy = 0;
  for (let k = 0; k <= SIM_T / DT; k++) {
    const t = GUST + k * DT;
    out.push({ t, x, y, vx, vy });
    const { wx, wy } = flow(x, y + 1.8, windAt(t));
    const rx = wx - vx;
    const ry = wy - vy;
    const rv = Math.hypot(rx, ry);
    let fx = K_PARASOL * rv * rx;
    const fy = K_PARASOL * rv * ry - M_FLY * G_REAL;
    const onGround = y <= m(GRIP_H0) + 1e-6 && fy <= 0;
    if (onGround) {
      const grip = 0.6 * -fy;
      fx = Math.abs(fx) <= grip && Math.abs(vx) < 1e-3 ? 0 : fx - Math.sign(vx || fx) * grip;
      vx += (fx / M_FLY) * DT;
      vy = 0;
    } else {
      vx += (fx / M_FLY) * DT;
      vy += (fy / M_FLY) * DT;
    }
    x += vx * DT;
    y = Math.max(m(GRIP_H0), y + vy * DT);
    if (x < XW + 0.3) {
      x = XW + 0.3; // the canopy rides up against the wall
      vx = Math.max(0, vx);
    }
  }
  return out;
})();
export const LIFT_T = sim.find((s) => s.y > m(GRIP_H0) + 0.005)?.t ?? GUST;
export const flyAt = (t: number) => {
  const u = Math.max(0, Math.min(sim.length - 1.001, (t - GUST) / DT));
  const i = Math.floor(u);
  const f = u - i;
  const a = sim[i];
  const b = sim[i + 1];
  const lerp = (p: number, q: number) => p + (q - p) * f;
  return { x: px(lerp(a.x, b.x)), h: px(lerp(a.y, b.y)), vx: lerp(a.vx, b.vx), vy: lerp(a.vy, b.vy) };
};
export const CLIMB = sim[sim.length - 1].vy; // m/s, steady climb in the cloud's updraft
export const RISE_WALL = (() => {
  const a = sim.find((s) => s.t > LIFT_T + 1.5)!;
  const b = sim.find((s) => s.t > LIFT_T + 4.5)!;
  return (b.y - a.y) / (b.t - a.t);
})(); // m/s, the slow climb up the wall
export const BALLOON_ALT = 1000;
export const MIN_TO_BALLOON = BALLOON_ALT / CLIMB / 60;

// ── Dash comes back: the earliest he could touch Newt's shoe, and how he misses ──
const hangJ = solve(POSES.hangKid);
export const HANG = (Math.max(hangJ.aFoot.y, hangJ.bFoot.y) - hangJ.aHand.y) * 0.72; // grip → shoes (px)
const reachJ = solve(POSES.reachUp);
export const DASH_REACH = -reachJ.aHand.y + 26; // fingertips, standing on tiptoe-flat (px)
export const JUMP_H = px(0.45);
export const JUMP_UP_T = Math.sqrt((2 * JUMP_H) / (9.8 * PX_PER_M));
export const MISS_GAP = px(0.12); // his fingertips stop 12 cm under Newt's sole
// the moment Newt's soles are exactly out of reach of his best jump
export const MISS_T = sim.find((s) => s.t > LIFT_T + 3 && px(s.y) - HANG >= DASH_REACH + JUMP_H + MISS_GAP)?.t ?? LIFT_T + 6;
export const RUN_X = (() => {
  const f = flyAt(MISS_T);
  return f.x + 70;
})();
const RUN_V = px(4.2);
export const JUMP_T = MISS_T - JUMP_UP_T;
export const RUN = { a: JUMP_T - (DASH_TIE_X - RUN_X) / RUN_V, b: JUMP_T };
export const SEE = RUN.a - 0.55;
export const STAND = { up: SEE - 1.15, empty: SEE - 0.75 };
export const TIE2 = { a: STAND.up - 2.1, b: STAND.up - 0.05 }; // close-up: the double knot
export const LAND_T = JUMP_T + 2 * JUMP_UP_T;
export const GRIEF = LAND_T + 0.35;
export const TILT = { a: GRIEF + 0.5, b: GRIEF + 4.3 };

// ── Slow motion on the near-miss (the story clock runs SLOW.real/SLOW.story slower) ──
export const SLOW = { a: MISS_T - 0.16, story: 0.32, real: 2.1 };
export const realOf = (s: number) => (s <= SLOW.a ? s : s <= SLOW.a + SLOW.story ? SLOW.a + ((s - SLOW.a) * SLOW.real) / SLOW.story : s + SLOW.real - SLOW.story);
export const storyOf = (r: number) => (r <= SLOW.a ? r : r <= SLOW.a + SLOW.real ? SLOW.a + ((r - SLOW.a) * SLOW.story) / SLOW.real : r - SLOW.real + SLOW.story);
export const SLOW_R = { a: SLOW.a, b: SLOW.a + SLOW.real };

export const RAIN_OFF = GUST + 0.8; // the squall blows the shower cloud away
export const SUN = GUST + 1.6;

// ── 8 minutes later, 1 km up: the hot-air balloon drifts with the same wind, so sideways they
//    keep pace; only Newt's steady climb moves him past the basket ──
const B0 = TILT.b + 0.1;
export const BALLOON = { start: B0, card: B0, rise: B0 + 0.7, see: B0 + 1.5, lower: B0 + 2.0, nod: B0 + 2.5, raise: B0 + 3.2, fade: B0 + 3.9, end: B0 + 5.2 };
export const END_FADE_R = realOf(BALLOON.end);
export const DURATION = END_FADE_R + 3.4; // real seconds
export const LACE_INSERT = { t0: LACE.notice - 0.05, t1: LACE.hand - 0.05 };

// ── Cue times on the REAL clock, shared with tools/sfx/ep08_umbrella.py ──
export const CUE = {
  drop1: DROP1,
  rainOn: RAIN.on,
  capRain: CAP.rain,
  u1grab: U1.grab,
  u1open: U1.open,
  drip: U1.drip,
  u2toss: U2.toss,
  u2grab: U2.grab,
  u2open: U2.open,
  side: U2.side,
  look1: LOOK1.tint,
  u3toss: U3.toss,
  u3grab: U3.grab,
  u3drag: U3.drag,
  u3open: U3.open,
  protected: U3.nod,
  lace: LACE.notice,
  hand: LACE.hand,
  kneel: LACE.kneel,
  look2: LOOK2.tint,
  oh: LOOK2.oh,
  gust: GUST,
  walk: TIE_WALK.a,
  footUp: FOOT_UP,
  tie1: TIE1.a,
  lift: realOf(LIFT_T),
  rainOff: realOf(RAIN_OFF),
  sun: realOf(SUN),
  tie2: TIE2.a,
  knot: TIE2.b - 0.5,
  stand: STAND.up,
  empty: STAND.empty,
  see: SEE,
  run: RUN.a,
  jump: JUMP_T,
  slowA: SLOW_R.a,
  slowB: SLOW_R.b,
  land: realOf(LAND_T),
  grief: realOf(GRIEF),
  tilt: realOf(TILT.a),
  balloon: realOf(BALLOON.start),
  rise: realOf(BALLOON.rise),
  bsee: realOf(BALLOON.see),
  lower: realOf(BALLOON.lower),
  nod: realOf(BALLOON.nod),
  raise: realOf(BALLOON.raise),
  fade: realOf(BALLOON.fade),
  end: END_FADE_R,
  dur: DURATION,
};
