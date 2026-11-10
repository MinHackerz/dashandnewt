// Plain numbers for water optics, safe to import from timelines and node tools (no DOM, no three.js).
export const N_WATER = 1.33;

/** A water volume (metres): x and z extent, surface height y, floor height */
export type WaterBox = { x0: number; x1: number; z0: number; z1: number; y: number; floor: number };
