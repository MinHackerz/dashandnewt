// One gravity for the whole studio: re-export the shared constants and helpers, and add the
// one idea this episode is about — air pressure on a sealed lid (F = P × A).
export { ballistic, damped, dropTime, G, particle, PX_PER_M } from "../ep03-the-shortcut/physics";

export const P_ATM = 101_325; // Pa, air pressure at sea level
export const G_REAL = 9.81; // m/s², for converting newtons to "kg of push"

/** Net push of the outside air on a lid of diameter `d` (m) when the jar holds only
 *  `(1 - vacuum)` of normal air pressure inside. Returns newtons. */
export const sealForce = (d: number, vacuum: number) => vacuum * P_ATM * Math.PI * (d / 2) ** 2;

/** Twist needed to turn a lid pressed down with force `f` (N): rim friction μ at radius r (m). */
export const sealTorque = (f: number, mu: number, r: number) => mu * f * r;
