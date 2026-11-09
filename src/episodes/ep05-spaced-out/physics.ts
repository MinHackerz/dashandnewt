// One gravity constant set for the studio: re-export the shared helpers (planet surfaces
// use their own g, but the same kinematics).
export { ballistic, damped, decelerate, dropTime, G, particle, PX_PER_M } from "../ep03-the-shortcut/physics";
