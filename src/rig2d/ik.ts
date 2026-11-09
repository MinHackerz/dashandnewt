import { POSES } from "../rig/library";
import { GROUND, solve } from "../rig/Stickman";
import type { CharState } from "../rig/types";

// Anatomy helpers for the 2D cast. Joints only bend the way real ones do (elbows and knees
// flex, never hyper-extend), and hands that hold something are placed on it with 2-bone IK
// instead of being eyeballed.

type P = { x: number; y: number };
const deg = (r: number) => (r * 180) / Math.PI;
const d2 = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
const J0 = solve(POSES.stand);
export const UPPER = d2(J0.shoulder, J0.aEl);
export const FORE = d2(J0.aEl, J0.aHand);

/** World point → the character's local rig space (ignores whole-body rotation) */
export const toLocal = (c: CharState, p: P): P => ({
  x: (p.x - c.x) / (c.facing * c.scale * c.sx),
  y: (p.y - (GROUND - c.lift)) / (c.scale * c.sy),
});

/** Bend an arm so its hand lands on `target` (world px). The elbow flexes (bend ≥ 0), like a
 *  real elbow; out-of-reach targets get a straight arm pointing at them. Mutates c.pose. */
export const reach = (c: CharState, side: "a" | "b", target: P) => {
  const j = solve(c.pose);
  const t = toLocal(c, target);
  const dx = t.x - j.shoulder.x;
  const dy = t.y - j.shoulder.y;
  const dist = Math.max(Math.abs(UPPER - FORE) + 1, Math.min(UPPER + FORE - 0.5, Math.hypot(dx, dy)));
  const phi = deg(Math.atan2(dx, dy)); // 0 = straight down, + = toward where they face
  const alpha = deg(Math.acos((UPPER * UPPER + dist * dist - FORE * FORE) / (2 * UPPER * dist)));
  const beta = deg(Math.acos((UPPER * UPPER + FORE * FORE - dist * dist) / (2 * UPPER * FORE)));
  const s = phi - alpha;
  const e = 180 - beta; // flexion only
  c.pose = side === "a" ? { ...c.pose, aS: s, aE: e } : { ...c.pose, bS: s, bE: e };
  return c;
};

/** Real joints: elbows and knees never bend backwards. Small leftovers from stylised poses are
 *  straightened; deliberate side-on cheats (hands on hips, crossed arms) are left alone. */
export const anatomical = (c: CharState) => {
  const p = { ...c.pose };
  if (p.aE < 0 && p.aE > -30) p.aE = 0;
  if (p.bE < 0 && p.bE > -30) p.bE = 0;
  p.aK = Math.max(0, p.aK);
  p.bK = Math.max(0, p.bK);
  c.pose = p;
  return c;
};
