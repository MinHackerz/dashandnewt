import { POSES } from "../../rig/library";
import { GROUND, HEAD_R, HEAD_SCALE, solve, toWorld } from "../../rig/Stickman";
import type { CharState, Pose } from "../../rig/types";
import { FACES } from "../../rig/library";
import { readTime } from "../../lib/read";
export { DPX, PERSP, laneS } from "../../rig2d/depth";

// ep09 "Big Bounce". One principle: conservation of energy (and its transfer through a seesaw).
// Everything that moves because of the seesaw is SIMULATED here from one gravity, the masses and the
// seesaw's geometry — the plank's swings, the apple "test shots", Newt's flight and where the grave is.
// World: x px grows to the right, heights in metres above the playground (y up), 240 px per metre.

export const PX = 240;
export const G = 9.81;
export const px = (m: number) => m * PX;
export const yOf = (h: number) => GROUND - h * PX; // a height (m) → world y (px)

// ── The cast's masses (kg) and the seesaw ───────────────────────────────────
export const M_DASH = 75;
export const M_NEWT = 25;
export const M_PLANK = 16;
export const NEWT_SCALE = 0.72;
export const L = 1.8; // half-length of the plank (m)
export const TH = Math.PI / 6; // 30°: how far the plank tips each way
export const PH = L * Math.sin(TH) + 0.04; // pivot height: the low end's underside just touches the grass
export const RS = 0.9 * L; // where the seats are (m from the pivot)
export const RH = 0.72 * L; // where the handles are
export const SEAT_UP = 0.09; // seat top above the plank's centre line (m)
export const PIV_X = 1000; // world px
export const PLANK_I = (mL: number, mR: number) => (mL + mR) * RS * RS + (M_PLANK * L * L) / 3;

// Depth lanes (m toward the camera; nearer = lower on screen and bigger)
export const D = { far: -5, slide: -3.2, bench: -1.4, tree: -0.8, see: 0, bag: 0.45, wall: 0, grave: 0, digger: -0.25, stone: -1.2 } as const;

type V = { x: number; y: number }; // metres, relative to the pivot (y up)
const add = (a: V, b: V, k = 1): V => ({ x: a.x + b.x * k, y: a.y + b.y * k });
/** a point on the plank: signed radius r (+ = Dash's side, right), `up` above the centre line */
export const plankPoint = (phi: number, r: number, up = SEAT_UP): V => ({ x: r * Math.cos(phi) - up * Math.sin(phi), y: PH + r * Math.sin(phi) + up * Math.cos(phi) });
/** metres (pivot frame) → world px */
export const toPx = (p: V) => ({ x: PIV_X + px(p.x), y: yOf(p.y) });
const vel = (w: number, p: V): V => ({ x: -w * (p.y - PH), y: w * p.x }); // rigid rotation about the pivot

// ── The plank swinging under gravity: φ'' = (mL − mR)·g·RS·cos φ / I, until an end hits the grass ──
type Swing = { T: number; wEnd: number; at: (tau: number) => number; w: (tau: number) => number };
const swing = (phi0: number, w0: number, mL: number, mR: number): Swing => {
  const I = PLANK_I(mL, mR);
  const dt = 1 / 4000;
  const ph: number[] = [phi0];
  const ws: number[] = [w0];
  let phi = phi0;
  let w = w0;
  for (let k = 0; k < 40000; k++) {
    w += (((mL - mR) * G * RS * Math.cos(phi)) / I) * dt;
    phi += w * dt;
    ph.push(phi);
    ws.push(w);
    if (phi >= TH || phi <= -TH) break;
  }
  const n = ph.length - 1;
  const lerp = (arr: number[], tau: number) => {
    const u = Math.max(0, Math.min(n, tau / dt));
    const i = Math.min(n - 1, Math.floor(u));
    return arr[i] + (arr[i + 1] - arr[i]) * (u - i);
  };
  return { T: n * dt, wEnd: w, at: (tau) => Math.max(-TH, Math.min(TH, lerp(ph, tau))), w: (tau) => lerp(ws, tau) };
};
/** Dash (hip falling H metres) lands on the raised end: angular momentum about the pivot is conserved */
const impact = (H: number) => {
  const v = Math.sqrt(2 * G * H);
  const I = PLANK_I(M_NEWT, M_DASH);
  const w0 = -(M_DASH * v * RS * Math.cos(TH)) / I; // clockwise: Dash's end goes down
  return { v, w0, s: swing(TH, w0, M_NEWT, M_DASH) };
};
/** Dash lets go of his (low) end: only Newt's weight, the plank tips back (BONK) */
const RELEASE = swing(-TH, 0, M_NEWT, 0);

// ── Riders: a seated character's hip sits on the seat; the body tilts a little with the plank ──
export const hipOf = (pose: Pose, scale: number) => -solve(pose).hip.y * scale; // px from the ground line
export const rider = (base: Omit<CharState, "x" | "lift" | "rot">, hip: { x: number; y: number }, phi: number): CharState => {
  const c = { ...base, x: hip.x, lift: 0, rot: (-phi * 180) / Math.PI * 0.6 } as CharState;
  c.lift = GROUND - hip.y - hipOf(c.pose, c.scale * c.sy);
  return c;
};
const bareChar = (scale: number, facing: 1 | -1, pose: Pose): Omit<CharState, "x" | "lift" | "rot"> => ({
  facing,
  scale,
  sx: 1,
  sy: 1,
  pose,
  faceX: 0.5,
  lookY: 0,
  expr: FACES.deadpan,
  blink: 0,
  aHand: "fist",
  bHand: "fist",
  extras: {},
  t: 0,
  speed: 0,
});
const DASH_SIT = POSES.sitLow;
/** Dash's head (centre, metres in the pivot frame) and radius when he sits on the low end */
const dashHead = (() => {
  const hip = toPx(plankPoint(-TH, RS));
  const c = rider(bareChar(1, -1, DASH_SIT), hip, -TH);
  const h = toWorld(c, solve(c.pose).head);
  return { x: (h.x - PIV_X) / PX, y: (GROUND - h.y) / PX, r: (HEAD_R * HEAD_SCALE) / PX };
})();
export const DASH_HEAD = dashHead;

// ── Apple "test shots": an apple on Newt's seat flies off when the plank stops ──
export const APPLE_R = 0.065;
type Pt = { t: number; x: number; y: number }; // metres, pivot frame
type Flight = { pts: Pt[]; hit: "plank" | "head" | "ground"; T: number; v0: number; contact: number };
const flyApple = (w: number, ra: number, rollTo: number): Flight => {
  let p = plankPoint(-TH, -ra, 0.04 + APPLE_R);
  let v = vel(w, p);
  const v0 = Math.hypot(v.x, v.y);
  const pts: Pt[] = [{ t: 0, ...p }];
  const dt = 1 / 1000;
  const u = { x: Math.cos(-TH), y: Math.sin(-TH) };
  const n = { x: -Math.sin(-TH), y: Math.cos(-TH) };
  let hit: Flight["hit"] = "ground";
  let t = 0;
  let headDone = false;
  let contact = -1;
  for (let k = 0; k < 6000; k++) {
    v = add(v, { x: 0, y: -G }, dt);
    p = add(p, v, dt);
    t += dt;
    pts.push({ t, ...p });
    const rel = { x: p.x, y: p.y - PH };
    const r = rel.x * u.x + rel.y * u.y;
    const d = rel.x * n.x + rel.y * n.y - 0.04;
    if (!headDone && Math.hypot(p.x - dashHead.x, p.y - dashHead.y) < dashHead.r + APPLE_R) {
      // bonk: bounce off his head (restitution 0.45), then fall to the grass
      hit = "head";
      headDone = true;
      contact = t;
      const nh = { x: (p.x - dashHead.x) / Math.hypot(p.x - dashHead.x, p.y - dashHead.y), y: (p.y - dashHead.y) / Math.hypot(p.x - dashHead.x, p.y - dashHead.y) };
      const vn = v.x * nh.x + v.y * nh.y;
      if (vn < 0) v = add(v, nh, -(1 + 0.45) * vn);
      continue;
    }
    if (!headDone && t > 0.05 && Math.abs(r) < L && d < APPLE_R && v.x * n.x + v.y * n.y < 0) {
      // lands on the plank, then rolls down it (a rolling ball: a = 5/7·g·sin θ) to Dash
      hit = "plank";
      contact = t;
      let s = r;
      let sv = (v.x * u.x + v.y * u.y) * 0.6;
      const a = (5 / 7) * G * Math.sin(TH);
      for (let j = 0; j < 4000 && s < rollTo; j++) {
        sv += a * dt;
        s += sv * dt;
        t += dt;
        const q = plankPoint(-TH, Math.min(s, rollTo), 0.04 + APPLE_R);
        pts.push({ t, ...q });
      }
      break;
    }
    if (p.y < APPLE_R) {
      pts.push({ t, x: p.x, y: APPLE_R });
      if (contact < 0) contact = t;
      break;
    }
  }
  return { pts, hit, T: t, v0, contact };
};
const at = (f: Flight, tau: number): V => {
  const P = f.pts;
  if (tau <= 0) return P[0];
  if (tau >= f.T) return P[P.length - 1];
  let lo = 0;
  let hi = P.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (P[m].t <= tau) lo = m;
    else hi = m;
  }
  const a = P[lo];
  const b = P[hi];
  const k = (tau - a.t) / Math.max(1e-9, b.t - a.t);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
};

// ── The three escalations: how far Dash's body (hips) falls before he lands on his seat ──
export const DROP = [1.0, 2.2, 6.5] as const; // m
export const HIP_STAND = hipOf(POSES.stand, 1) / PX; // m, hips above the feet when he stands
const SEAT_TOP = plankPoint(TH, RS).y; // m, Dash's seat when his end is up
export const BRANCH = DROP.map((d) => SEAT_TOP + d - HIP_STAND); // the branch tops he steps off (m)
export const IMP = DROP.map(impact);
export const LAUNCH_V = IMP.map((i) => Math.abs(i.s.wEnd) * Math.hypot(RS, SEAT_UP)); // Newt's seat at the stop (m/s)

// Newt places each apple where the second one will land on Dash's head (he is collecting data)
const ROLL_TO = RS - 0.16; // the first apple rolls down the plank until it reaches Dash
export const RA = (() => {
  let best = 0.86 * L;
  let bestD = 1e9;
  for (let k = 0.7; k <= 0.92; k += 0.0025) {
    const f = flyApple(IMP[1].s.wEnd, k * L, ROLL_TO);
    const dmin = Math.min(...f.pts.map((p) => Math.hypot(p.x - dashHead.x, p.y - dashHead.y)));
    if (f.hit === "head" && dmin < bestD) {
      bestD = dmin;
      best = k * L;
    }
  }
  return best;
})();
export const APPLE = [flyApple(IMP[0].s.wEnd, RA, ROLL_TO), flyApple(IMP[1].s.wEnd, RA, ROLL_TO)] as const;
export const appleAt = (k: 0 | 1, tau: number) => toPx(at(APPLE[k], tau));
/** the apple's arc (world px) up to its first contact, for the chalk "test" traces */
export const appleArc = (k: 0 | 1) => APPLE[k].pts.filter((p, i) => p.t <= APPLE[k].contact && i % 15 === 0).map(toPx);

// ── Newt's flight (the third escalation): from his seat at the stop, a true parabola into the grave ──
export const GRAVE_D = 1.8; // m deep: a real grave (six feet)
export const GRAVE_W = 2.3; // m long
const NEWT_SIT = POSES.sitRide;
const NEWT0 = plankPoint(-TH, -RS); // his hip when the plank stops (his end up)
const NV = vel(IMP[2].s.wEnd, NEWT0);
export const NEWT_V = Math.hypot(NV.x, NV.y);
export const FLY_T = (NV.y + Math.sqrt(NV.y * NV.y + 2 * G * (NEWT0.y + GRAVE_D))) / G; // until he sits on the grave's floor
export const newtFly = (tau: number): V => ({ x: NEWT0.x + NV.x * tau, y: NEWT0.y + NV.y * tau - 0.5 * G * tau * tau });
export const NEWT_APEX = NEWT0.y + (NV.y * NV.y) / (2 * G);
export const LAND = newtFly(FLY_T);
export const GRAVE_X = PIV_X + px(LAND.x); // the grave is where the physics puts him (centre)
export const LAND_DIST = LAND.x - NEWT0.x; // m, sideways from his seat
export const WALL_X = PIV_X + px(3.6);
export const TRUNK_X = 1700;
export const SEAT_UP_X = toPx(plankPoint(TH, RS)).x; // Dash's seat when his end is up
export const BAG_X = 470;
export const BENCH_X = 430;
export const WALL_H = 1.0;
const tWall = (3.6 - NEWT0.x) / NV.x;
const FEET_BELOW = (solve(NEWT_SIT).hip.y - Math.max(solve(NEWT_SIT).aFoot.y, solve(NEWT_SIT).bFoot.y)) * -NEWT_SCALE / PX;
export const WALL_CLEAR = newtFly(tWall).y - FEET_BELOW - WALL_H; // m his shoes clear the wall by (logged in the sheet)

// ── Beats (story seconds) ───────────────────────────────────────────────────
export const MARCH_V = px(2.0);
export const GATE_X = 260;
export const DASH_STAND_X = PIV_X + px(RS * Math.cos(TH)) + 95; // beside his raised end
export const HOOK = { to: 3.2 };
export const PUSH = [3.5, 4.2] as const;
export const SIGH = 4.9;
export const GATE = 5.4;
export const SALUTE0 = { a: 5.6, b: 6.2 };
export const MARCH = { a: 6.25, b: 6.25 + (DASH_STAND_X - GATE_X) / MARCH_V };
export const GRAB = MARCH.b + 0.35;
export const PULL = { a: GRAB + 0.1, b: GRAB + 1.4 };
export const SIT = { a: PULL.b, b: PULL.b + 0.5 };
export const OPER = SIT.b + 0.15;
export const BOUNCE = { a: SIT.b + 0.9, b: SIT.b + 2.1 };
export const TAG = { a: SIT.b + 0.4, b: SIT.b + 2.9 };
// each "get off": stand up holding the seat, step back, let go → the plank tips back → BONK
const offAt = (stand: number) => ({ stand, rel: stand + 0.75, bonk: stand + 0.75 + RELEASE.T });
export const OFF1 = offAt(SIT.b + 2.6);
// each climb: walk to the trunk, climb, walk out along the branch until right above the seat, salute
const climbAt = (from: number, k: 0 | 1 | 2, dur: number) => {
  const climb = { a: from + 0.35, b: from + 0.35 + dur };
  const out = { a: climb.b, b: climb.b + 0.5 };
  const salute = { a: out.b + 0.15, b: out.b + 0.8 };
  const step = salute.b + 0.15;
  const imp = step + Math.sqrt((2 * (BRANCH[k] + HIP_STAND - SEAT_TOP)) / G);
  const stop = imp + IMP[k].s.T;
  return { climb, out, salute, step, imp, stop };
};
export const E1 = climbAt(OFF1.rel, 0, 1.3);
export const APPLE1 = { reach: OFF1.bonk + 0.9, place: OFF1.bonk + 1.7 };
export const A1 = { hit: E1.stop + APPLE[0].contact, rest: E1.stop + APPLE[0].T };
export const THUMB1 = { a: E1.stop + 0.9, b: E1.stop + 1.9 };
export const CHOMP = { pick: A1.rest + 0.3, bite: A1.rest + 0.8, chew: A1.rest + 1.9 };
export const FROWN = CHOMP.bite + 0.8;
export const OFF2 = offAt(CHOMP.chew + 0.3);
export const E2 = climbAt(OFF2.rel, 1, 1.7);
export const APPLE2 = { reach: OFF2.bonk + 0.9, place: OFF2.bonk + 1.7 };
export const A2 = { hit: E2.stop + APPLE[1].contact, rest: E2.stop + APPLE[1].T };
export const NOD2 = A2.hit + 0.6;
export const LOOKUP = { a: NOD2 + 0.7, b: NOD2 + 2.8 };
export const FUNMAX = LOOKUP.b - 0.7;
export const OFF3 = offAt(LOOKUP.b + 0.7);
// cut → Dash arrives at Newt with a bike helmet from the bench
export const HELMET = (() => {
  const a = OFF3.bonk + 4.0;
  return { cutFrom: OFF3.bonk + 1.0, a, on: a + 1.1, click: a + 1.35, knock: [a + 1.8, a + 2.05] as const, b: a + 2.6 };
})();
export const SAFETY = { a: HELMET.click, b: HELMET.click + 1.6 };
// cut → on the trunk; cut → on the top branch
export const TREE = (() => {
  const trunk = HELMET.b + 8.0;
  const top = trunk + 9.0;
  const out = { a: top + 0.4, b: top + 1.9 };
  const measure = { a: out.b + 0.15, b: out.b + 1.05 };
  const salute = { a: measure.b + 0.1, b: measure.b + 0.7 };
  return { trunk, trunkEnd: trunk + 1.2, top, out, measure, salute };
})();
// Newt's physics look, line by line (written slowly, held until readable)
export const LOOK_LINES = [
  `${M_DASH} kg falls ${DROP[2].toFixed(1)} m`,
  "test 1",
  "test 2",
  "test 3: me",
  `${LAND_DIST.toFixed(1)} m… there.`,
  "…oh.",
] as const;
export const LOOK = (() => {
  const tint = TREE.salute.a;
  const l1 = tint + 0.3;
  const t1 = l1 + readTime(LOOK_LINES[0]);
  const t2 = t1 + 0.9;
  const arc3 = t2 + 1.0; // the long dotted arc over the wall
  const pan = { a: arc3 + 0.2, b: arc3 + 2.2 }; // the camera follows the chalk line to the grave
  const there = pan.b - 0.2;
  const back = there + readTime(LOOK_LINES[4]) + 0.2;
  const oh = back + 0.3;
  return { tint, l1, t1, t2, arc3, pan, there, back, oh, end: oh + 1.2 };
})();
// the same instant, in split screen: Newt lets go of the handles to climb off, Dash steps off the branch
export const LETGO = LOOK.end + 0.7;
export const SPLIT = { a: LOOK.end, b: LETGO + 0.45 };
export const E3 = (() => {
  const step = LETGO;
  const imp = step + Math.sqrt((2 * (BRANCH[2] + HIP_STAND - SEAT_TOP)) / G);
  const stop = imp + IMP[2].s.T;
  return { step, imp, stop, land: stop + FLY_T };
})();
// the landing at the bottom of the grave: he crumples, the zoom shows it (X eyes), his ghost rises out
export const DEATH = (() => {
  const L3 = E3.land;
  return { crumple: { a: L3 + 0.06, b: L3 + 0.55 }, zoom: L3 + 0.3, still: L3 + 0.8 };
})();
export const IMPACT_V = Math.hypot(NV.x, NV.y - G * FLY_T); // m/s when he hits the grave's floor
// after: Dash is proud… walks to the wall… sees his friend dead (horror → grief, tears). Then the ghost
// rises; Dash's grief turns to hope (AGAIN?); the ghost declines and lies back down; Dash's face falls.
export const AFTER = (() => {
  const L3 = DEATH.zoom + 2.0; // the death zoom holds 2 s
  const proud = L3 + 0.1;
  const turn = L3 + 1.0;
  const blink = L3 + 1.7;
  const stand = L3 + 2.4;
  const walk = { a: stand + 0.3, b: stand + 0.3 + (WALL_X - 120 - (DASH_STAND_X - 95)) / px(1.6) };
  const peek = walk.b + 0.1;
  const see = peek + 0.45; // he sees the body: horror
  const grief = { a: peek + 1.3, b: peek + 5.4 }; // hands on his head, tears
  const ghost = { a: peek + 4.6, b: peek + 5.9 }; // the ghost rises out of the grave
  const notice = ghost.b + 0.1; // Dash sees the ghost: grief → hope
  const point = { a: notice + 0.7, b: notice + 1.4 };
  const thumbs = { a: point.b, b: point.b + 1.2 };
  const again = { a: point.a, b: thumbs.b + 0.2 };
  const seeSaw = again.b + 0.1;
  const seeDash = seeSaw + 0.6;
  const lie = { a: seeDash + 0.6, b: seeDash + 1.7 }; // the ghost lies back down into his body
  const nod = lie.b + 0.15; // the ghost's tiny "no thanks" nod, eyes closed
  const sad2 = lie.a + 0.4; // Dash's face falls again
  const merge = { a: lie.b + 0.6, b: lie.b + 1.2 };
  const digLook = merge.b + 0.2;
  const dashLook = digLook + 0.3;
  const shrug = { a: dashLook + 0.4, b: dashLook + 1.1 };
  const lily = { pick: shrug.b + 0.1, bend: shrug.b + 0.6, place: shrug.b + 1.5, up: shrug.b + 1.7 }; // bend = the toss
  const mourn = lily.bend; // Dash: hand on his heart, head bowed
  const fade = { a: lily.place + 3.0, b: lily.place + 4.1 };
  return { proud, turn, blink, stand, walk, peek, see, grief, ghost, notice, point, thumbs, again, seeSaw, seeDash, lie, nod, sad2, merge, digLook, dashLook, shrug, lily, mourn, fade };
})();

// ── The gravedigger's shovel: a 2.2 s cycle, phased so his shovel is up (full) when Newt lands ──
export const DIG_PERIOD = 2.2;
export const DIG_PHASE = ((E3.land / DIG_PERIOD - 0.5) % 1 + 1) % 1; // cycle position 0.5 = lifted, full
export const digU = (s: number) => ((s / DIG_PERIOD - DIG_PHASE) % 1 + 1) % 1;
export const DIG_FREEZE = E3.land;

// ── The plank's angle φ (Dash's end up = +) over story time ─────────────────
export const phiAt = (s: number): number => {
  const ease = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  const bonk = (t0: number) => TH - Math.abs(Math.sin(Math.max(0, s - t0) * 30)) * 0.03 * Math.exp(-Math.max(0, s - t0) * 9);
  const land = (t0: number) => -TH + Math.abs(Math.sin(Math.max(0, s - t0) * 30)) * 0.03 * Math.exp(-Math.max(0, s - t0) * 9);
  if (s < PULL.a) {
    // Newt pushes off the grass: his end lifts a little and drops back
    const h = PUSH.reduce((acc, p) => acc + Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (s - p) / 0.36)))) * 0.06, 0);
    return TH - h;
  }
  if (s < PULL.b) return TH - 2 * TH * ease((s - PULL.a) / (PULL.b - PULL.a));
  if (s < OFF1.rel) {
    // Dash bounces his knees: his end lifts a hair (Newt bobs at the top)
    const b = s > BOUNCE.a && s < BOUNCE.b ? Math.abs(Math.sin(((s - BOUNCE.a) / (BOUNCE.b - BOUNCE.a)) * Math.PI * 3)) * 0.04 : 0;
    return -TH + b;
  }
  const stages: [number, number, number, number][] = [
    [OFF1.rel, OFF1.bonk, E1.imp, E1.stop],
    [OFF2.rel, OFF2.bonk, E2.imp, E2.stop],
    [OFF3.rel, OFF3.bonk, E3.imp, E3.stop],
  ];
  for (let k = 0; k < 3; k++) {
    const [rel, bk, imp, stop] = stages[k];
    const nextRel = k < 2 ? stages[k + 1][0] : Infinity;
    if (s < bk) return RELEASE.at(s - rel);
    if (s < imp) return bonk(bk);
    if (s < stop) return IMP[k].s.at(s - imp);
    if (s < nextRel) return land(stop);
  }
  return -TH;
};
/** the plank's angular velocity (rad/s), for launches */
export const omegaAt = (s: number) => (phiAt(s + 1e-3) - phiAt(s - 1e-3)) / 2e-3;

// ── Time: slow motion and hard cuts. Story time runs at `k` × real time in each piece ──
type Piece = { s0: number; s1: number; k: number };
const P0: Piece[] = [];
const piece = (s0: number, s1: number, k = 1) => P0.push({ s0, s1, k });
const SLOW2 = { a: E2.imp - 0.15, b: A2.hit + 0.35 };
const SLOW3 = { a: E3.step + 0.12, b: E3.imp + 0.08, c: E3.land - 0.3 };
piece(0, SLOW2.a);
piece(SLOW2.a, SLOW2.b, 0.5);
piece(SLOW2.b, HELMET.cutFrom);
piece(HELMET.a - 0.2, HELMET.b + 0.6); // cut (he fetched the helmet)
piece(TREE.trunk, TREE.trunkEnd); // cut (he walked to the oak)
piece(TREE.top, SPLIT.a); // cut (he climbed all the way up)
piece(SPLIT.a, SLOW3.a);
piece(SLOW3.a, SLOW3.b, 0.4);
piece(SLOW3.b, SLOW3.c, 0.6);
piece(SLOW3.c, 1e6);
const PIECES = (() => {
  let r = 0;
  return P0.map((p) => {
    const o = { ...p, r0: r };
    r += (p.s1 - p.s0) / p.k;
    return o;
  });
})();
export const storyOf = (r: number) => {
  for (const p of PIECES) {
    const r1 = p.r0 + (p.s1 - p.s0) / p.k;
    if (r < r1) return p.s0 + (r - p.r0) * p.k;
  }
  return r;
};
export const realOf = (s: number) => {
  for (const p of PIECES) {
    if (s < p.s0) return p.r0; // a cut skipped this moment: it happens "at the cut"
    if (s <= p.s1) return p.r0 + (s - p.s0) / p.k;
  }
  return s;
};
export const CUTS_R = PIECES.slice(1).filter((p, i) => p.s0 > PIECES[i].s1 + 1e-6).map((p) => p.r0);
export const SLOW_R = [
  { a: realOf(SLOW2.a), b: realOf(SLOW2.b) },
  { a: realOf(SLOW3.a), b: realOf(SLOW3.c) },
];
export const END_R = realOf(AFTER.fade.b);
export const DURATION = END_R + 3.4;

// ── Cue times on the REAL clock, shared with tools/sfx/ep09_bounce.py ──
const R = realOf;
export const CUE = {
  push1: R(PUSH[0]),
  push2: R(PUSH[1]),
  sigh: R(SIGH),
  gate: R(GATE),
  salute0: R(SALUTE0.a),
  march: R(MARCH.a),
  marchEnd: R(MARCH.b),
  grab: R(GRAB),
  pullA: R(PULL.a),
  pullB: R(PULL.b),
  sit: R(SIT.b),
  oper: R(OPER),
  bounceA: R(BOUNCE.a),
  bounceB: R(BOUNCE.b),
  tag: R(TAG.a),
  stand1: R(OFF1.stand),
  rel1: R(OFF1.rel),
  bonk1: R(OFF1.bonk),
  climb1: R(E1.climb.a),
  fun1: R(E1.out.a),
  step1: R(E1.step),
  imp1: R(E1.imp),
  stop1: R(E1.stop),
  apple1: R(APPLE1.place),
  a1rest: R(A1.rest),
  thumb1: R(THUMB1.a),
  pick: R(CHOMP.pick),
  bite: R(CHOMP.bite),
  chew: R(CHOMP.chew),
  stand2: R(OFF2.stand),
  rel2: R(OFF2.rel),
  bonk2: R(OFF2.bonk),
  climb2: R(E2.climb.a),
  fun2: R(E2.out.a),
  step2: R(E2.step),
  imp2: R(E2.imp),
  stop2: R(E2.stop),
  apple2: R(APPLE2.place),
  a2hit: R(A2.hit),
  a2rest: R(A2.rest),
  nod2: R(NOD2),
  lookupA: R(LOOKUP.a),
  funmax: R(FUNMAX),
  stand3: R(OFF3.stand),
  rel3: R(OFF3.rel),
  bonk3: R(OFF3.bonk),
  helmetCut: R(HELMET.a - 0.2),
  helmetOn: R(HELMET.on),
  click: R(HELMET.click),
  knock1: R(HELMET.knock[0]),
  knock2: R(HELMET.knock[1]),
  trunk: R(TREE.trunk),
  top: R(TREE.top),
  out: R(TREE.out.a),
  measure: R(TREE.measure.a),
  salute3: R(TREE.salute.a),
  look: R(LOOK.tint),
  l1: R(LOOK.l1),
  t1: R(LOOK.t1),
  t2: R(LOOK.t2),
  arc3: R(LOOK.arc3),
  panA: R(LOOK.pan.a),
  there: R(LOOK.there),
  oh: R(LOOK.oh),
  lookEnd: R(LOOK.end),
  split: R(SPLIT.a),
  letgo: R(LETGO),
  step3: R(E3.step),
  imp3: R(E3.imp),
  stop3: R(E3.stop),
  land3: R(E3.land),
  zoom: R(DEATH.zoom),
  ghostA: R(AFTER.ghost.a),
  see: R(AFTER.see),
  griefA: R(AFTER.grief.a),
  griefB: R(AFTER.grief.b),
  notice: R(AFTER.notice),
  sad2: R(AFTER.sad2),
  mourn: R(AFTER.mourn),
  merge: R(AFTER.merge.a),
  slow3a: SLOW_R[1].a,
  slow3b: SLOW_R[1].b,
  slow2a: SLOW_R[0].a,
  slow2b: SLOW_R[0].b,
  proud: R(AFTER.proud),
  turn: R(AFTER.turn),
  stand4: R(AFTER.stand),
  walkA: R(AFTER.walk.a),
  walkB: R(AFTER.walk.b),
  peek: R(AFTER.peek),
  again: R(AFTER.again.a),
  seeSaw: R(AFTER.seeSaw),
  lieA: R(AFTER.lie.a),
  digLook: R(AFTER.digLook),
  shrug: R(AFTER.shrug.a),
  pickLily: R(AFTER.lily.pick),
  place: R(AFTER.lily.place),
  nod: R(AFTER.nod),
  fadeA: R(AFTER.fade.a),
  end: END_R,
  dur: DURATION,
};

// the gravedigger's shovel sounds (REAL clock): scoop at u = 0.2, toss at u = 0.72, until he freezes
export const DIG_EVENTS = (() => {
  const out: { t: number; kind: number }[] = [];
  for (let n = -1; n < 60; n++)
    for (const [u, kind] of [[0.2, 0], [0.72, 1]] as const) {
      const s = DIG_PERIOD * (n + DIG_PHASE + u);
      if (s > 0 && s < DIG_FREEZE) out.push({ t: realOf(s), kind });
    }
  return out;
})();
