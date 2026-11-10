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
/** a snap zoom: arrives in the first `k` of the shot, then keeps creeping in */
const punch = (a: V, b: V, k = 0.18) => (u: number): V => (u < k ? glide(a, b, "snap")(u / k) : glide(b, { ...b, zoom: b.zoom * 1.06, yaw: b.yaw + 2 }, "lin")((u - k) / (1 - k)));

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

const SHOTS: Shot[] = [
  // hook: tight on the PUSH plate, pulling out and swinging round as they walk up
  { at: 0, cam: glide({ ...door(0.75, 1.2), zoom: 4.2, yaw: -58, pitch: 2 }, { ...door(0.7, 1.15), zoom: 3.0, yaw: -48, pitch: 3 }, "out") },
  { at: 1.15, cam: glide({ x: 560, y: 1130, z: 0, zoom: 1.6, yaw: -26, pitch: 4 }, two) },
  // try 1: snap to the hand by the hinge, then his face, then Newt's
  { at: TRY1.hand + 0.15, cam: punch(two, { ...door(0.12, 1.25), x: DOOR_X - 60, zoom: 3.3, yaw: -44, pitch: 6 }) },
  { at: TRY1.push + 0.85, cam: (u, t) => ({ ...headOf(dashAt(t)), zoom: mix(3.1, 3.5, u, "lin"), yaw: -16, pitch: 2, roll: -3 }) },
  { at: TRY1.push + 1.45, cam: (u, t) => ({ ...headOf(newtAt(t)), zoom: mix(3.3, 3.6, u, "lin"), yaw: -30, pitch: 3, roll: 3 }) },
  // try 2: low and wide, pushing in as he strains; inserts of the face and the tapping foot
  { at: TRY2.hand - 0.3, cam: glide({ x: 660, y: 1150, z: 0, zoom: 1.8, yaw: -30, pitch: -4 }, { x: 690, y: 1130, z: 0, zoom: 2.3, yaw: -38, pitch: -2 }, "lin") },
  { at: TRY2.push + 0.9, cam: (u, t) => ({ ...headOf(dashAt(t)), zoom: mix(3.3, 4.0, u, "lin"), yaw: -14, pitch: 0, roll: mix(-2, 5, u, "lin") }) },
  { at: TRY2.push + 1.65, cam: (u, t) => ({ x: newtAt(t).c.x - 10, y: 1345, z: 1.3, zoom: mix(4.6, 5.0, u, "lin"), yaw: -34, pitch: 12 }) },
  { at: TRY2.push + 2.15, cam: glide({ x: 700, y: 1120, z: 0, zoom: 2.2, yaw: -40, pitch: 4 }, { x: 690, y: 1130, z: 0, zoom: 2.0, yaw: -34, pitch: 5 }) },
  // try 3: track him back, snap to the face, run with him, hit
  { at: TRY3.back, cam: (u, t) => ({ x: dashAt(t).c.x + 90, y: 1120, z: -0.3, zoom: mix(2.0, 1.55, u), yaw: mix(-34, -24, u), pitch: 4 }) },
  { at: TRY3.set + 0.05, cam: (u, t) => punch({ x: 330, y: 1100, z: -0.4, zoom: 1.6, yaw: -24, pitch: 4 }, { ...headOf(dashAt(t)), zoom: 3.4, yaw: -12, pitch: -3 })(u) },
  { at: TRY3.run - 0.05, cam: (u, t) => ({ x: dashAt(t).c.x + mix(170, 60, u, "lin"), y: 1150, z: -0.4, zoom: mix(1.7, 2.2, u, "in"), yaw: mix(-22, -36, u, "lin"), pitch: -5 }) },
  { at: TRY3.hit, cam: (u, t) => ({ x: dashAt(t).c.x + 80, y: 1130, z: -0.4, zoom: mix(2.5, 1.7, u, "out"), yaw: -36, pitch: 2 }) },
  // flat on his back: a high look down, drifting
  { at: TRY3.rest + 0.1, cam: (u, t) => ({ ...hipOf(dashAt(t)), y: 1300, zoom: mix(2.0, 2.3, u, "lin"), yaw: mix(-22, -30, u, "lin"), pitch: 30 }) },
  // the physics look: Newt's eyes, then a slow orbit round the door while the chalk draws
  { at: LOOK.at - 0.15, cam: (u, t) => ({ ...headOf(newtAt(t)), zoom: mix(3.2, 3.8, u, "out"), yaw: -34, pitch: 2 }) },
  { at: LOOK.at + 0.4, cam: glide({ ...door(0.45, 1.3), x: DOOR_X - 30, zoom: 1.85, yaw: -54, pitch: 4 }, { ...door(0.45, 1.3), x: DOOR_X - 30, zoom: 2.1, yaw: -43, pitch: 6 }, "lin") },
  // one finger: walk with him, snap to the fingertip, then fly back as the door swings away
  { at: OPEN.walk, cam: (u, t) => ({ x: newtAt(t).c.x - 30, y: 1150, z: newtAt(t).z * 0.6, zoom: mix(2.2, 2.5, u), yaw: mix(-30, -38, u), pitch: 4 }) },
  { at: OPEN.finger + 0.1, cam: punch({ x: 720, y: 1150, z: 0.3, zoom: 2.5, yaw: -38, pitch: 4 }, { ...door(1.0, 0.95), x: DOOR_X - 50, zoom: 4.2, yaw: -42, pitch: 4 }, 0.3) },
  { at: OPEN.push + 0.12, cam: glide({ ...door(0.9, 1.0), zoom: 3.6, yaw: -42, pitch: 4 }, { x: 740, y: 1110, z: 0, zoom: 1.75, yaw: -27, pitch: 6 }, "out") },
  { at: UP.head, cam: (u, t) => ({ ...headOf(dashAt(t)), y: headOf(dashAt(t)).y - 20, zoom: mix(2.6, 3.1, u, "out"), yaw: -20, pitch: 16, roll: -4 }) },
  { at: UP.head + 0.95, cam: glide({ x: 700, y: 1120, z: 0, zoom: 1.7, yaw: -30, pitch: 5 }, { x: 680, y: 1120, z: 0, zoom: 1.6, yaw: -34, pitch: 4 }, "lin") },
  // pride: a low hero angle on Dash, creeping in, with the door quietly closing behind his shut eyes
  { at: UP.proud - 0.1, cam: glide({ x: 610, y: 1090, z: -0.2, zoom: 1.75, yaw: -40, pitch: -7 }, { x: 640, y: 1080, z: -0.2, zoom: 2.05, yaw: -33, pitch: -9 }, "lin") },
  { at: UP.proud + 1.25, cam: glide({ ...door(0.9, 1.2), x: DOOR_X - 40, zoom: 2.6, yaw: -50, pitch: 3 }, { ...door(0.75, 1.2), x: DOOR_X - 40, zoom: 3.0, yaw: -46, pitch: 3 }, "lin") },
  { at: UP.go - 0.25, cam: (u, t) => ({ x: dashAt(t).c.x + mix(120, 40, u, "lin"), y: 1120, z: -0.25, zoom: mix(1.8, 2.6, u, "in"), yaw: mix(-30, -38, u, "lin"), pitch: -4 }) },
  { at: SLAM, cam: glide({ x: 760, y: 1090, z: -0.25, zoom: 3.0, yaw: -38, pitch: 2, roll: 5 }, { x: 760, y: 1100, z: -0.25, zoom: 2.4, yaw: -34, pitch: 3, roll: 0 }, "out") },
  { at: AGAIN.palm, cam: (u, t) => ({ ...headOf(newtAt(t)), zoom: mix(3.2, 3.6, u, "out"), yaw: -32, pitch: 3, roll: 3 }) },
  // he peels off and timbers: follow him down, end looking down at him
  { at: FALL.at - 0.15, cam: (u, t) => ({ ...hipOf(dashAt(t)), x: hipOf(dashAt(t)).x - 20, y: mix(1100, 1260, u), zoom: mix(2.2, 1.9, u), yaw: mix(-36, -26, u), pitch: mix(4, 24, u) }) },
  // heart: Newt comes in, the fingertip again, the door swings, the two thumbs
  { at: AGAIN.walk, cam: (u, t) => ({ x: mix(700, 690, u), y: 1160, z: newtAt(t).z * 0.4, zoom: mix(1.75, 2.1, u), yaw: mix(-28, -36, u), pitch: 8 }) },
  { at: AGAIN.finger + 0.15, cam: punch({ x: 720, y: 1150, z: 0.3, zoom: 2.4, yaw: -38, pitch: 4 }, { ...door(1.0, 0.95), x: DOOR_X - 50, zoom: 4.0, yaw: -42, pitch: 4 }, 0.3) },
  { at: AGAIN.push + 0.12, cam: glide({ ...door(0.9, 1.0), zoom: 3.4, yaw: -42, pitch: 4 }, { x: 680, y: 1180, z: 0, zoom: 1.7, yaw: -28, pitch: 12 }, "out") },
  { at: THUMB - 0.1, cam: (u, t) => punch({ x: 680, y: 1180, z: 0, zoom: 1.7, yaw: -28, pitch: 12 }, { ...headOf(dashAt(t)), y: 1230, zoom: 2.6, yaw: -22, pitch: 22 }, 0.25)(u) },
  { at: THUMB + 0.75, cam: glide({ x: 650, y: 1170, z: 0.1, zoom: 1.75, yaw: -34, pitch: 9 }, { x: 650, y: 1160, z: 0.1, zoom: 1.6, yaw: -28, pitch: 8 }, "lin") },
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
  sx += Math.sin(t * 1.7) * 2.2;
  sy += Math.cos(t * 1.3) * 1.6;
  return { x: v.x + sx / v.zoom, y: v.y + sy / v.zoom, tz: v.z, zoom: v.zoom, yaw: v.yaw, pitch: v.pitch, roll, fov: 38, dof: 14 + (v.zoom - 1.6) * 5 };
};
