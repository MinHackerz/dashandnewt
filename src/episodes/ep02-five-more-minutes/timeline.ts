// Story clock for "Five More Minutes" (seconds).

// Each snooze triggers a time warp; the world jumps forward at the midpoint.
export const WARPS = [
  { at: 3.6, label: "1 DAY" },
  { at: 8.8, label: "8 YEARS" },
  { at: 16.0, label: "40 YEARS" },
] as const;
export const WARP_LEN = 0.8;

// 0 = morning, 1 = next day, 2 = eight years on, 3 = forty years on
export const eraAt = (t: number) => WARPS.filter((w) => t >= w.at + WARP_LEN / 2).length;

export const warpProgress = (t: number) => {
  for (const w of WARPS) {
    const u = (t - w.at) / WARP_LEN;
    if (u >= 0 && u <= 1) return u;
  }
  return -1;
};

export const RINGING = [
  [1.2, 2.25],
  [4.4, 5.0],
  [9.6, 10.4],
  [16.8, 18.0],
  [24.1, 27.45],
] as const;
export const isRinging = (t: number) => RINGING.some(([a, b]) => t >= a && t < b);

export const SLAPS = [2.25, 5.0, 7.55, 14.6];

export const SLEEPING = [
  [0, 1.2],
  [2.45, 3.7],
  [7.75, 8.9],
  [14.85, 16.1],
] as const;

export const END_FADE = 30.8;
export const DURATION = 34.5;
