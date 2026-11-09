import { Easing } from "remotion";

// Keyframe helpers. All times are in seconds on the reel's global clock.

export type Ease = "lin" | "in" | "out" | "io" | "back" | "snap" | "bounce";

const EASE: Record<Ease, (t: number) => number> = {
  lin: (t) => t,
  in: Easing.in(Easing.quad),
  out: Easing.out(Easing.cubic),
  io: Easing.inOut(Easing.cubic),
  back: Easing.out(Easing.back(2.2)),
  snap: Easing.out(Easing.exp),
  bounce: Easing.bounce,
};

export const ease = (e: Ease, t: number) => EASE[e](Math.max(0, Math.min(1, t)));

// Numeric track: [time, value, easing used to arrive at this key]
export type NumKey = readonly [number, number, Ease?];

export const num = (t: number, keys: readonly NumKey[]): number => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e = "io"] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) {
      if (t1 === t0) return v1;
      return v0 + (v1 - v0) * ease(e, (t - t0) / (t1 - t0));
    }
  }
  return keys[keys.length - 1][1];
};

// Discrete track: value of the last key at or before t
export const step = <T>(t: number, keys: readonly (readonly [number, T])[]): T => {
  let v = keys[0][1];
  for (const [k, val] of keys) if (t >= k) v = val;
  return v;
};

// Was `t` within [from, from + dur)?  Returns local progress 0..1 or -1.
export const within = (t: number, from: number, dur: number) =>
  t >= from && t < from + dur ? (t - from) / dur : -1;

// Damped shake impulse sum
export const shake = (t: number, hits: readonly (readonly [number, number])[]) => {
  let x = 0;
  let y = 0;
  for (const [at, amp] of hits) {
    const d = t - at;
    if (d < 0 || d > 0.45) continue;
    const k = amp * Math.exp(-d * 9);
    x += Math.sin(d * 95) * k;
    y += Math.cos(d * 77) * k;
  }
  return { x, y };
};
