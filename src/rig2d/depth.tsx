import React from "react";
import { GROUND } from "../rig/Stickman";

// Depth lanes for the 2D episodes (from ep07): the scene is seen from the side; d = metres toward the
// camera. Nearer lanes are drawn lower on screen and bigger; far layers also slide slower (parallax).
export const DPX = 72; // screen px a ground point drops per metre of depth
export const PERSP = 0.065; // size change per metre of depth
export const laneS = (d: number) => 1 + PERSP * d;
export const gY = (d: number) => GROUND + d * DPX;

/** Draw children in a depth layer: scaled by s about (ax, GROUND), ground moved to `ground` */
export const Layer: React.FC<{ s: number; ground: number; ax: number; children: React.ReactNode }> = ({ s, ground, ax, children }) => (
  <g transform={`translate(${ax} ${ground}) scale(${s}) translate(${-ax} ${-GROUND})`}>{children}</g>
);
export const Lane: React.FC<{ d: number; ax: number; children: React.ReactNode }> = ({ d, ax, children }) => (
  <Layer s={laneS(d)} ground={gY(d)} ax={ax}>
    {children}
  </Layer>
);
type P = { x: number; y: number };
/** a point drawn in lane d around anchor x `ax` → where it lands on screen (world px) */
export const proj = (p: P, d: number, ax: number): P => ({ x: ax + (p.x - ax) * laneS(d), y: GROUND + (p.y - GROUND) * laneS(d) + d * DPX });
export const unproj = (p: P, d: number, ax: number): P => ({ x: ax + (p.x - ax) / laneS(d), y: GROUND + (p.y - GROUND - d * DPX) / laneS(d) });
