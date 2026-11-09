// One gravity for the whole studio: re-export the shared constants and helpers, and add the
// two things this episode needs on top — rolling down a slope and a lever's geometry.
export { accelerate, ballistic, damped, decelerate, dropTime, G, particle, PX_PER_M, stopDistance, stopTime } from "../ep03-the-shortcut/physics";
import { G } from "../ep03-the-shortcut/physics";

// A solid sphere rolling without slipping down an incline accelerates at 5/7 · g · sinθ.
export const rollAccel = (slopeRad: number) => (5 / 7) * G * Math.sin(slopeRad);

// Lever resting on a fulcrum of height h, arms dShort / dLong: the steepest it can tilt
// either way is when that end touches the ground.
export const leverTilt = (h: number, arm: number) => Math.asin(h / arm);

// Launch speed that sends a projectile from (x0, h0) at `ang` (radians from vertical,
// tilted toward +x) through the point (x1, h1) on the way down.
export const speedToHit = (x0: number, h0: number, x1: number, h1: number, ang: number) => {
  const s = Math.sin(ang);
  const c = Math.cos(ang);
  const D = x1 - x0;
  const v2 = (G * D * D) / (2 * s * s * (h0 - h1 + (c * D) / s));
  return Math.sqrt(v2);
};
