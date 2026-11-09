// One gravity for the whole studio. This episode's one idea is air resistance (drag):
// F = ½ · ρ · v² · C · A. The push grows with the AREA you hold up to the wind.
export { ballistic, damped, dropTime, G, particle, PX_PER_M } from "../ep03-the-shortcut/physics";

export const RHO = 1.2; // kg/m³, air
export const G_REAL = 9.81;
/** Drag force (N) on a canopy of area A (m²) and drag coefficient C in a wind of v (m/s) */
export const drag = (v: number, C: number, A: number) => 0.5 * RHO * v * v * C * A;
export const discArea = (d: number) => Math.PI * (d / 2) ** 2;
