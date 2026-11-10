import { ease, type Ease } from "../../lib/kf";
import { solve, toWorld } from "../../rig/Stickman";
import type { Cam } from "../../world3d/Stage3D";
import { apparent } from "../../world3d/water";
import { coinAt, crabAt, dashAt, KICKS, newtAt, stickAt, type Placed } from "./cast";
import { BOX, COIN, EDGE, END_FADE, GUM, LOOK, PX_PER_M, SURF1, TRY1, TRY2, TRY3, WISH, WY } from "./timeline";

// Never still (the house rule from ep11): a new shot every 1–2 s, snap zooms on every beat, inserts of
// the water so the refraction gags read, top-down shots into the pool, impact kicks. Cut times come
// from the timeline, so retiming a beat retimes its shots.

type V = { x: number; y: number; z: number; zoom: number; yaw: number; pitch: number; roll?: number };
const GROUND = 1380;
const mix = (a: number, b: number, u: number, e: Ease = "io") => a + (b - a) * ease(e, u);
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
  return { x: h.x, y: h.y - 24 * p.c.scale, z: p.z };
};
/** a 3D point in metres → camera target (world px, apparent if under water) */
const at = (p: [number, number, number]) => {
  const a = apparent(BOX, p);
  return { x: a[0] * PX_PER_M, y: GROUND - a[1] * PX_PER_M, z: a[2] };
};
const coinT = (t: number) => at(coinAt(t).p);
const crabT = (t: number) => at(crabAt(t).p);
const POOL = { x: EDGE + 120, y: WY + 10, z: 0 };

type Shot = { at: number; cam: (u: number, t: number) => V };
// Pacing (user, 2026-11-10): ~20 shots, not ~40. Establish the space wide before cutting in, keep each
// gag in ONE shot long enough to read (the stick going in AND out in the same frame), and move inside a
// shot with slow push-ins instead of cutting.
const SHOTS: Shot[] = [
  // hook: the coin and the crab, then the whole place: pool, Dash, Newt, the stick on the sand
  { at: 0, cam: (u, t) => ({ ...coinT(t), zoom: mix(5.2, 4.4, u, "out"), yaw: 18, pitch: 52 }) },
  { at: 1.1, cam: glide({ x: EDGE - 90, y: 1240, z: -0.2, zoom: 1.45, yaw: -16, pitch: 18 }, { x: EDGE - 50, y: 1260, z: -0.2, zoom: 1.65, yaw: -10, pitch: 20 }, "lin") },
  // try 1: from across the pool — his face and the arm going in, in one shot; then his face
  { at: TRY1.reach - 0.3, cam: glide({ x: EDGE + 40, y: 1350, z: 0, zoom: 2.3, yaw: 30, pitch: 30 }, { x: EDGE + 50, y: 1360, z: 0, zoom: 2.7, yaw: 24, pitch: 32 }, "lin") },
  { at: TRY1.horror - 0.05, cam: (u, t) => ({ ...headOf(dashAt(t)), zoom: mix(3.3, 3.6, u, "lin"), yaw: -10, pitch: 4 }) },
  { at: TRY1.yank + 0.6, cam: glide({ x: EDGE - 150, y: 1210, z: -0.3, zoom: 2.0, yaw: -18, pitch: 8 }, { x: EDGE - 140, y: 1220, z: -0.3, zoom: 2.3, yaw: -14, pitch: 8 }, "lin") },
  // try 2: he gets the stick (wide), then ONE shot of the stick going in and out: bent, straight, bent, straight
  { at: TRY2.up, cam: (u, t) => ({ x: dashAt(t).c.x + 80, y: 1220, z: -0.2, zoom: mix(1.55, 1.7, u), yaw: -18, pitch: 12 }) },
  { at: TRY2.dip1 - 0.25, cam: glide({ x: SURF1.x + 10, y: WY + 10, z: 0, zoom: 2.7, yaw: 26, pitch: 30 }, { x: SURF1.x + 20, y: WY + 15, z: 0, zoom: 3.0, yaw: 22, pitch: 31 }, "lin") },
  { at: TRY2.out2 + 0.2, cam: glide({ x: EDGE - 40, y: 1250, z: -0.3, zoom: 1.85, yaw: -16, pitch: 16 }, { x: EDGE, y: 1290, z: -0.2, zoom: 2.1, yaw: -12, pitch: 22 }, "lin") },
  { at: TRY2.hit + 0.02, cam: (u, t) => ({ ...crabT(t), zoom: mix(3.8, 4.1, u, "lin"), yaw: -8, pitch: 58 }) },
  // try 3: he walks in (wide); from across the pool his legs look short AND we see his face; the crab; the pinch; the leap
  { at: TRY3.stamp, cam: (u, t) => ({ x: dashAt(t).c.x + 90, y: 1250, z: -0.2, zoom: mix(1.6, 1.8, u), yaw: -16, pitch: 12 }) },
  { at: TRY3.legs - 0.1, cam: glide({ x: EDGE + 20, y: 1300, z: -0.2, zoom: 2.0, yaw: 28, pitch: 28 }, { x: EDGE + 20, y: 1310, z: -0.2, zoom: 2.3, yaw: 24, pitch: 30 }, "lin") },
  { at: TRY3.crab, cam: (u, t) => ({ ...crabT(t), zoom: mix(3.4, 3.8, u, "lin"), yaw: -10, pitch: 54 }) },
  { at: TRY3.pinch, cam: (u, t) => ({ ...headOf(dashAt(t)), zoom: mix(3.4, 3.2, u, "out"), yaw: 8, pitch: 0, roll: 3 }) },
  { at: TRY3.launch, cam: (u, t) => ({ x: dashAt(t).c.x + 40, y: mix(1220, 1260, u), z: -0.2, zoom: mix(1.7, 1.5, u, "out"), yaw: -14, pitch: 10 }) },
  { at: TRY3.land + 0.9, cam: (u, t) => ({ x: dashAt(t).c.x + 30, y: 1330, z: -0.5, zoom: mix(1.9, 2.1, u, "lin"), yaw: 18, pitch: 32 }) },
  // the physics look: a slow push on the chalk diagram
  { at: LOOK.at, cam: glide({ x: EDGE - 30, y: GROUND - 165, z: 0, zoom: 1.85, yaw: -3, pitch: 4 }, { x: EDGE - 30, y: GROUND - 165, z: 0, zoom: 1.97, yaw: 2, pitch: 5 }, "lin") },
  // the gum trick
  { at: LOOK.end, cam: (u, t) => ({ x: newtAt(t).c.x + 50, y: 1260, z: -0.2, zoom: mix(1.9, 2.1, u), yaw: -16, pitch: 12 }) },
  { at: GUM.press - 0.1, cam: (u, t) => ({ x: stickAt(t).tip.x - 30, y: GROUND - 30, z: -0.1, zoom: mix(3.2, 3.5, u, "lin"), yaw: -14, pitch: 20 }) },
  { at: GUM.grab, cam: (u, t) => ({ x: newtAt(t).c.x + 70, y: 1240, z: 0, zoom: mix(1.8, 2.0, u), yaw: -16, pitch: 12 }) },
  { at: GUM.lower - 0.1, cam: glide({ ...POOL, x: COIN.x, zoom: 2.4, yaw: 20, pitch: 46 }, { ...POOL, x: COIN.x, zoom: 2.9, yaw: 14, pitch: 50 }, "lin") },
  { at: GUM.lift + 0.3, cam: glide({ x: EDGE - 60, y: 1230, z: -0.2, zoom: 1.75, yaw: -14, pitch: 10 }, { x: EDGE - 70, y: 1230, z: -0.2, zoom: 2.0, yaw: -12, pitch: 10 }, "lin") },
  // the gift and the wish
  { at: WISH.kiss - 0.1, cam: (u, t) => ({ ...headOf(dashAt(t)), y: headOf(dashAt(t)).y + 40, zoom: mix(2.8, 3.1, u, "lin"), yaw: -12, pitch: 4 }) },
  { at: WISH.flip - 0.2, cam: glide({ x: EDGE - 20, y: 1190, z: -0.2, zoom: 1.45, yaw: -10, pitch: 12 }, { x: EDGE + 40, y: 1240, z: -0.2, zoom: 1.6, yaw: -8, pitch: 16 }) },
  { at: WISH.plop + 0.05, cam: (u, t) => ({ ...coinT(t), zoom: mix(3.4, 3.8, u, "out"), yaw: -6, pitch: 56 }) },
  { at: WISH.back, cam: (u, t) => ({ ...headOf(dashAt(t)), zoom: mix(3.0, 3.5, u, "in"), yaw: -12, pitch: 2 }) },
  { at: WISH.dive - 0.4, cam: glide({ x: EDGE + 110, y: 1300, z: -0.2, zoom: 1.6, yaw: -12, pitch: 20 }, { x: EDGE + 120, y: 1310, z: -0.2, zoom: 1.8, yaw: -6, pitch: 24 }) },
];
export const CUTS = SHOTS.map((s) => s.at).slice(1);

export const camAt = (t: number): Cam => {
  let i = 0;
  for (let k = 0; k < SHOTS.length; k++) if (t >= SHOTS[k].at) i = k;
  const s = SHOTS[i];
  const end = i + 1 < SHOTS.length ? SHOTS[i + 1].at : END_FADE + 0.4;
  const v = s.cam(Math.max(0, Math.min(1, (t - s.at) / (end - s.at))), t);
  let sx = 0;
  let sy = 0;
  let roll = v.roll ?? 0;
  for (const [at0, amp] of KICKS) {
    const d = t - at0;
    if (d < 0 || d > 0.6) continue;
    const k = amp * Math.exp(-d * 8);
    sx += Math.sin(d * 90) * k;
    sy += Math.cos(d * 74) * k;
    roll += Math.sin(d * 42) * k * 0.22;
  }
  sx += Math.sin(t * 1.1) * 1.2;
  sy += Math.cos(t * 0.9) * 0.9;
  return { x: v.x + sx / v.zoom, y: v.y + sy / v.zoom, tz: v.z, zoom: v.zoom, yaw: v.yaw, pitch: v.pitch, roll, fov: 38, dof: 12 + (v.zoom - 1.6) * 5 };
};
