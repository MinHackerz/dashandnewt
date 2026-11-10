import { ease, type Ease } from "../../lib/kf";
import { solve, toWorld } from "../../rig/Stickman";
import type { Cam } from "../../world3d/Stage3D";
import { dashAt, newtAt, type Placed } from "./cast";
import { AGAIN, DOOR, DOOR_X, END_FADE, FALL, LOOK, OPEN, PX_PER_M, SLAM, THUMB, TRY1, TRY2, TRY3, UP } from "./timeline";

// The camera never rests: a new shot every second or two (wide → close-up → insert), snap zooms on every
// hit, tracking moves that follow the action, and a slow push-in or orbit through every hold, so there is
// always something moving on screen. Every shot is a function of its own progress u (0 → 1), and the cut
// list is derived from the timeline, so retiming a beat retimes its shots.

type V = { x: number; y: number; z: number; zoom: number; yaw: number; pitch: number; roll?: number };
const GROUND_Y = 1380;
const mix = (a: number, b: number, u: number, e: Ease = "io") => a + (b - a) * ease(e, u);
/** a → b across the shot */
const glide = (a: V, b: V, e: Ease = "io") => (u: number): V => ({
  x: mix(a.x, b.x, u, e),
  y: mix(a.y, b.y, u, e),
  z: mix(a.z, b.z, u, e),
  zoom: mix(a.zoom, b.zoom, u, e),
  yaw: mix(a.yaw, b.yaw, u, e),
  pitch: mix(a.pitch, b.pitch, u, e),
  roll: mix(a.roll ?? 0, b.roll ?? 0, u, e),
});

const headOf = (p: Placed) => {
  const h = toWorld(p.c, solve(p.c.pose).head);
  return { x: h.x, y: h.y - 30 * p.c.scale, z: p.z };
};
const hipOf = (p: Placed) => {
  const h = toWorld(p.c, solve(p.c.pose).hip);
  return { x: h.x, y: h.y, z: p.z };
};
/** a point on the shut door, r m from the hinge and h m up */
const door = (r: number, h: number) => ({ x: DOOR_X, y: GROUND_Y - h * PX_PER_M, z: DOOR.hingeZ + r });

type Shot = { at: number; cam: (u: number, t: number) => V };
const two = { x: 700, y: 1120, z: 0, zoom: 2.0, yaw: -36, pitch: 5 }; // the house two-shot at the door

// Re-paced (user, 2026-11-10): ~20 shots, not 32. A wide shot first, each gag held in one shot (the hand by the
// hinge AND the door that doesn't move), slow push-ins and orbits inside a shot instead of extra cuts.
const SHOTS: Shot[] = [
  // hook: the PUSH sign and the "closes itself" sign, pulling out to the whole shop as they walk up
  { at: 0, cam: glide({ ...door(0.75, 1.2), zoom: 3.6, yaw: -56, pitch: 2 }, { x: 640, y: 1130, z: 0, zoom: 1.6, yaw: -32, pitch: 5 }, "io") },
  // try 1: the two-shot holds: his hand right by the hinge, the door not moving, his face
  { at: TRY1.hand - 0.2, cam: glide(two, { ...two, zoom: 2.3, yaw: -40 }, "lin") },
  { at: TRY1.push + 1.0, cam: (u, t) => ({ ...headOf(dashAt(t)), zoom: mix(3.0, 3.3, u, "lin"), yaw: -18, pitch: 2 }) },
  // try 2: low and wide, slowly pushing in while he strains; then Newt, unimpressed, tapping his foot
  { at: TRY2.hand - 0.3, cam: glide({ x: 670, y: 1150, z: 0, zoom: 1.8, yaw: -32, pitch: -2 }, { x: 690, y: 1140, z: 0, zoom: 2.2, yaw: -38, pitch: -2 }, "lin") },
  { at: TRY2.push + 1.9, cam: (u, t) => ({ ...headOf(newtAt(t)), y: headOf(newtAt(t)).y + 60, zoom: mix(2.6, 2.8, u, "lin"), yaw: -30, pitch: 4 }) },
  // try 3: one tracking shot: he backs up, sets, runs, bounces off
  { at: TRY3.back, cam: (u, t) => ({ x: Math.max(dashAt(t).c.x + 120, 520), y: 1130, z: -0.3, zoom: mix(1.7, 1.5, u), yaw: mix(-32, -26, u), pitch: 4 }) },
  { at: TRY3.hit - 0.1, cam: (u, t) => ({ x: dashAt(t).c.x + 90, y: 1150, z: -0.4, zoom: mix(1.9, 1.7, u, "out"), yaw: -32, pitch: 6 }) },
  { at: TRY3.rest + 0.2, cam: (u, t) => ({ ...hipOf(dashAt(t)), y: 1290, zoom: mix(1.9, 2.1, u, "lin"), yaw: mix(-24, -30, u, "lin"), pitch: 28 }) },
  // the physics look: a slow orbit round the door while the chalk draws
  { at: LOOK.at, cam: glide({ ...door(0.45, 1.3), x: DOOR_X - 30, zoom: 1.85, yaw: -54, pitch: 4 }, { ...door(0.45, 1.3), x: DOOR_X - 30, zoom: 2.05, yaw: -44, pitch: 6 }, "lin") },
  // one finger: walk with him to the handle edge, the push, the door swinging all the way open
  { at: OPEN.walk, cam: (u, t) => ({ x: newtAt(t).c.x - 20, y: 1150, z: newtAt(t).z * 0.6, zoom: mix(2.0, 2.4, u), yaw: mix(-32, -38, u), pitch: 4 }) },
  { at: OPEN.push - 0.3, cam: glide({ ...door(0.95, 1.0), x: DOOR_X - 50, zoom: 2.8, yaw: -42, pitch: 4 }, { x: 740, y: 1110, z: 0, zoom: 1.7, yaw: -28, pitch: 6 }, "io") },
  { at: UP.head + 0.2, cam: (u, t) => ({ ...headOf(dashAt(t)), y: headOf(dashAt(t)).y - 20, zoom: mix(2.4, 2.7, u, "lin"), yaw: -22, pitch: 16 }) },
  // pride: a low hero angle on Dash, while the door quietly closes behind his shut eyes (both in frame)
  { at: UP.stand - 0.2, cam: glide({ x: 650, y: 1100, z: -0.2, zoom: 1.55, yaw: -36, pitch: -5 }, { x: 670, y: 1090, z: -0.2, zoom: 1.75, yaw: -32, pitch: -6 }, "lin") },
  { at: UP.go - 0.2, cam: (u, t) => ({ x: dashAt(t).c.x + mix(140, 60, u, "lin"), y: 1120, z: -0.25, zoom: mix(1.8, 2.3, u, "in"), yaw: mix(-30, -36, u, "lin"), pitch: -3 }) },
  { at: SLAM, cam: glide({ x: 760, y: 1090, z: -0.25, zoom: 2.6, yaw: -36, pitch: 2, roll: 4 }, { x: 740, y: 1110, z: -0.25, zoom: 2.2, yaw: -32, pitch: 3, roll: 0 }, "out") },
  { at: AGAIN.palm + 0.3, cam: (u, t) => ({ ...headOf(newtAt(t)), y: headOf(newtAt(t)).y + 50, zoom: mix(2.6, 2.8, u, "lin"), yaw: -30, pitch: 3 }) },
  { at: FALL.at - 0.2, cam: (u, t) => ({ ...hipOf(dashAt(t)), x: hipOf(dashAt(t)).x - 20, y: mix(1100, 1250, u), zoom: mix(2.0, 1.8, u), yaw: mix(-34, -26, u), pitch: mix(4, 22, u) }) },
  // heart: Newt opens it again; the two thumbs
  { at: AGAIN.walk, cam: glide({ x: 700, y: 1170, z: 0.2, zoom: 1.7, yaw: -28, pitch: 10 }, { x: 690, y: 1170, z: 0.2, zoom: 1.9, yaw: -34, pitch: 10 }, "lin") },
  { at: THUMB - 0.2, cam: glide({ x: 660, y: 1190, z: 0.1, zoom: 1.9, yaw: -26, pitch: 16 }, { x: 650, y: 1180, z: 0.1, zoom: 1.7, yaw: -30, pitch: 12 }, "lin") },
];
/** Times of every hard cut (for whoosh cues and review stills) */
export const CUTS = SHOTS.map((s) => s.at).slice(1);

// impact kicks: a shake plus a quick roll that rings out
const KICKS: readonly (readonly [number, number])[] = [[TRY3.hit, 20], [TRY3.land, 9], [SLAM, 26], [FALL.land, 12], [OPEN.opened, 4]];

export const camAt = (t: number): Cam => {
  let i = 0;
  for (let k = 0; k < SHOTS.length; k++) if (t >= SHOTS[k].at) i = k;
  const s = SHOTS[i];
  const end = i + 1 < SHOTS.length ? SHOTS[i + 1].at : END_FADE + 0.4;
  const v = s.cam(Math.max(0, Math.min(1, (t - s.at) / (end - s.at))), t);
  // strain: the camera trembles with him
  const strain = t > TRY2.push && t < TRY2.give ? Math.min(1, (t - TRY2.push) / 1.2) : 0;
  let sx = Math.sin(t * 61) * 3 * strain;
  let sy = Math.cos(t * 53) * 2.5 * strain;
  let roll = v.roll ?? 0;
  for (const [at, amp] of KICKS) {
    const d = t - at;
    if (d < 0 || d > 0.6) continue;
    const k = amp * Math.exp(-d * 8);
    sx += Math.sin(d * 90) * k;
    sy += Math.cos(d * 74) * k;
    roll += Math.sin(d * 42) * k * 0.22;
  }
  // a breath of handheld drift so even a hold is alive
  sx += Math.sin(t * 1.1) * 1.2;
  sy += Math.cos(t * 0.9) * 0.9;
  return { x: v.x + sx / v.zoom, y: v.y + sy / v.zoom, tz: v.z, zoom: v.zoom, yaw: v.yaw, pitch: v.pitch, roll, fov: 38, dof: 14 + (v.zoom - 1.6) * 5 };
};
