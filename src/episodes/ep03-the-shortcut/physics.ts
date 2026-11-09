// One set of physical constants for the whole episode, so every jump, drop,
// splash and tumble obeys the same gravity.
//
// Scale: the hero is ~420 px tall ≈ 1.75 m  →  240 px per metre.
export const PX_PER_M = 240;
export const G = 9.8 * PX_PER_M; // ≈ 2350 px/s²

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// Height of a ballistic body launched at t0 from h0 that lands at t1 on h1.
// The launch speed is derived from G, so the arc is a true parabola.
export const ballistic = (t: number, t0: number, t1: number, h0: number, h1: number) => {
  const T = t1 - t0;
  const tau = clamp(t - t0, 0, T);
  const v0 = (h1 - h0) / T + (G * T) / 2;
  return h0 + v0 * tau - 0.5 * G * tau * tau;
};

// Time to free-fall a height h from rest.
export const dropTime = (h: number) => Math.sqrt((2 * h) / G);

// Constant deceleration (friction / braking) from speed v0: position after t0.
export const decelerate = (t: number, t0: number, x0: number, v0: number, a: number) => {
  const tau = clamp(t - t0, 0, Math.abs(v0) / a);
  return x0 + v0 * tau - 0.5 * Math.sign(v0) * a * tau * tau;
};
export const stopTime = (v0: number, a: number) => Math.abs(v0) / a;
export const stopDistance = (v0: number, a: number) => (v0 * v0) / (2 * a);

// Constant acceleration from rest (or v0) after t0.
export const accelerate = (t: number, t0: number, x0: number, a: number, v0 = 0) => {
  const tau = Math.max(0, t - t0);
  return x0 + v0 * tau + 0.5 * a * tau * tau;
};

// A free particle (y grows downward on screen).
export const particle = (tau: number, x0: number, y0: number, vx: number, vy: number) => ({
  x: x0 + vx * tau,
  y: y0 + vy * tau + 0.5 * G * tau * tau,
});

// Damped oscillation around 0 (buoyancy bob, spring settle).
export const damped = (tau: number, amp: number, hz: number, decay: number) =>
  tau < 0 ? 0 : amp * Math.exp(-decay * tau) * Math.cos(2 * Math.PI * hz * tau);
