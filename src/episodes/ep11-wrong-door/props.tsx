import React from "react";
import * as THREE from "three";
import { GROUND } from "../../rig/Stickman";
import { BOX, canvasTex, CYL, SPH, std } from "../../world3d/kit";
import { applyCam, H, W, type Cam } from "../../world3d/Stage3D";
import { DOOR, DOOR_X, PX_PER_M } from "./timeline";

// The ice-cream shop: a wall across the pavement with one stiff, self-closing PUSH door.
// The wall's push face is the plane x = DOOR_X; the hinge is on the far side, the handle edge toward
// the camera, so the distance from the hinge to each hand is plain to see.

const X0 = DOOR_X / PX_PER_M;
const TH = 0.22; // wall thickness
const ZB = -2.6;
const ZF = 1.5;
const HW = 3.3;
const DEPTH = 5; // how far the shop runs behind the wall
const JAMB = 0.6; // half-width of the opening

const WALL = std("#f6e7c9", 0.9);
const TRIM = std("#e2553f", 0.6);
const FRAME = std("#f7f3ea", 0.6);
const DOOR_MAT = std("#1fa394", 0.45);
const DOOR_DARK = std("#16877a", 0.5);
const BRASS = std("#e3b341", 0.3, { metalness: 0.85 });
const GLASS = std("#bfe9ff", 0.08, { metalness: 0.2, transparent: true, opacity: 0.55 });
const STEEL = std("#9aa3ad", 0.35, { metalness: 0.7 });
const MAT = std("#a3423a", 1);
const FLOOR = std("#ffffff", 0.5, {
  map: canvasTex(128, 128, (g) => {
    g.fillStyle = "#fbf6ee";
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = "#f4a7b9";
    g.fillRect(0, 0, 64, 64);
    g.fillRect(64, 64, 64, 64);
  }, 1, [6, 5]),
});
const INNER = std("#ffd9e2", 0.9);

/** A flat sign: text painted on a board (canvas texture), facing −x */
const plate = (lines: string[], w: number, h: number, bg: string, fg: string, size: number) =>
  std("#ffffff", 0.5, {
    map: canvasTex(Math.round(w * 400), Math.round(h * 400), (g) => {
      const cw = w * 400;
      const ch = h * 400;
      g.fillStyle = bg;
      g.fillRect(0, 0, cw, ch);
      g.strokeStyle = fg;
      g.lineWidth = 10;
      g.strokeRect(8, 8, cw - 16, ch - 16);
      g.fillStyle = fg;
      g.font = `900 ${size}px Arial, Helvetica, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      lines.forEach((l, i) => g.fillText(l, cw / 2, ch / 2 + (i - (lines.length - 1) / 2) * size * 1.05));
    }),
  });
const PUSH_PLATE = plate(["PUSH"], 0.46, 0.2, "#ffd23f", "#1b1b1b", 62);
const CLOSER_PLATE = plate(["THIS DOOR", "CLOSES ITSELF"], 0.46, 0.2, "#ffffff", "#c0392b", 30);
const SHOP_SIGN = plate(["ICE CREAM"], 2.2, 0.5, "#e2553f", "#fff6e0", 150);

const Board: React.FC<{ mat: THREE.Material; at: [number, number, number]; w: number; h: number }> = ({ mat, at, w, h }) => (
  <mesh material={mat} position={at} rotation={[0, -Math.PI / 2, 0]}>
    <planeGeometry args={[w, h]} />
  </mesh>
);
const Box: React.FC<{ mat: THREE.Material; at: [number, number, number]; s: [number, number, number]; cast?: boolean }> = ({ mat, at, s, cast = true }) => (
  <mesh geometry={BOX} material={mat} position={at} scale={s} castShadow={cast} receiveShadow />
);

/** The door slab, hinged at local z = 0, swinging toward +x by `deg` */
const Door: React.FC<{ deg: number }> = ({ deg }) => (
  <group position={[X0 + 0.06, 0, DOOR.hingeZ]} rotation={[0, (deg * Math.PI) / 180, 0]}>
    <Box mat={DOOR_MAT} at={[0, DOOR.h / 2, DOOR.w / 2]} s={[0.07, DOOR.h, DOOR.w]} />
    {/* recessed panels + a round window */}
    <Box mat={DOOR_DARK} at={[-0.036, 0.62, DOOR.w / 2]} s={[0.01, 0.8, DOOR.w - 0.3]} cast={false} />
    <mesh geometry={CYL} material={FRAME} position={[-0.04, 1.72, DOOR.w / 2]} rotation={[0, 0, Math.PI / 2]} scale={[0.25, 0.02, 0.25]} />
    <mesh geometry={CYL} material={GLASS} position={[-0.045, 1.72, DOOR.w / 2]} rotation={[0, 0, Math.PI / 2]} scale={[0.2, 0.02, 0.2]} />
    {/* brass kick plate, pull bar at the free edge, three big hinges at the far edge */}
    <Box mat={BRASS} at={[-0.04, 0.14, DOOR.w / 2]} s={[0.012, 0.22, DOOR.w - 0.12]} cast={false} />
    <mesh geometry={CYL} material={BRASS} position={[-0.1, 1.12, DOOR.w - 0.1]} scale={[0.022, 0.5, 0.022]} castShadow />
    {[0.89, 1.35].map((y) => (
      <mesh key={y} geometry={CYL} material={BRASS} position={[-0.07, y, DOOR.w - 0.1]} rotation={[0, 0, Math.PI / 2]} scale={[0.016, 0.07, 0.016]} />
    ))}
    {[0.3, 1.08, 1.86].map((y) => (
      <mesh key={y} geometry={CYL} material={BRASS} position={[-0.05, y, 0.02]} scale={[0.04, 0.2, 0.04]} castShadow />
    ))}
    <Board mat={PUSH_PLATE} at={[-0.043, 1.3, DOOR.w - 0.36]} w={0.46} h={0.2} />
    <Board mat={CLOSER_PLATE} at={[-0.043, 1.05, DOOR.w - 0.36]} w={0.46} h={0.2} />
    {/* the closer's arm rides on top of the door */}
    <Box mat={STEEL} at={[-0.07, DOOR.h - 0.05, 0.42]} s={[0.03, 0.03, 0.62]} cast={false} />
  </group>
);

export const Shop: React.FC<{ deg: number }> = ({ deg }) => (
  <group>
    {/* the wall with its opening */}
    <Box mat={WALL} at={[X0 + TH / 2, HW / 2, (ZB - JAMB) / 2]} s={[TH, HW, -JAMB - ZB]} />
    <Box mat={WALL} at={[X0 + TH / 2, HW / 2, (ZF + JAMB) / 2]} s={[TH, HW, ZF - JAMB]} />
    <Box mat={WALL} at={[X0 + TH / 2, (HW + DOOR.h + 0.05) / 2, 0]} s={[TH, HW - DOOR.h - 0.05, JAMB * 2]} />
    <Box mat={TRIM} at={[X0 - 0.01, 0.22, (ZB - JAMB) / 2]} s={[0.03, 0.44, -JAMB - ZB]} cast={false} />
    <Box mat={TRIM} at={[X0 - 0.01, 0.22, (ZF + JAMB) / 2]} s={[0.03, 0.44, ZF - JAMB]} cast={false} />
    {/* door frame */}
    <Box mat={FRAME} at={[X0 - 0.02, DOOR.h / 2, -JAMB + 0.02]} s={[0.08, DOOR.h, 0.07]} />
    <Box mat={FRAME} at={[X0 - 0.02, DOOR.h / 2, JAMB - 0.02]} s={[0.08, DOOR.h, 0.07]} />
    <Box mat={FRAME} at={[X0 - 0.02, DOOR.h + 0.06, 0]} s={[0.08, 0.1, JAMB * 2 + 0.06]} />
    {/* the closer: the reason it shuts by itself */}
    <Box mat={STEEL} at={[X0 - 0.08, DOOR.h + 0.02, -0.2]} s={[0.1, 0.11, 0.4]} />
    <Board mat={SHOP_SIGN} at={[X0 - 0.045, 2.72, 0]} w={2.2} h={0.5} />
    <Box mat={TRIM} at={[X0 - 0.02, 2.72, 0]} s={[0.03, 0.58, 2.3]} cast={false} />
    {/* side wall toward the camera, roof, floor and back wall */}
    <Box mat={WALL} at={[X0 + DEPTH / 2, HW / 2, ZF - TH / 2]} s={[DEPTH, HW, TH]} />
    <Box mat={TRIM} at={[X0 + DEPTH / 2 - 0.1, HW + 0.12, (ZB + ZF) / 2]} s={[DEPTH + 0.5, 0.24, ZF - ZB + 0.4]} />
    <Box mat={INNER} at={[X0 + DEPTH, HW / 2, (ZB + ZF) / 2]} s={[0.1, HW, ZF - ZB]} cast={false} />
    <mesh material={FLOOR} position={[X0 + DEPTH / 2, 0.012, (ZB + ZF) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[DEPTH, ZF - ZB]} />
    </mesh>
    {/* a giant cone on the roof and a doormat */}
    <group position={[X0 + 0.9, HW + 0.24, 0.5]}>
      <mesh material={std("#e0a85a", 0.8)} position={[0, 0.55, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[0.36, 1.1, 24]} />
      </mesh>
      <mesh geometry={SPH} material={std("#ff8fb1", 0.5)} position={[0, 1.25, 0]} scale={0.42} castShadow />
      <mesh geometry={SPH} material={std("#fff3d6", 0.5)} position={[0.05, 1.72, 0]} scale={0.34} castShadow />
      <mesh geometry={SPH} material={std("#d62839", 0.3)} position={[0.08, 2.08, 0]} scale={0.11} />
    </group>
    <Box mat={MAT} at={[X0 - 0.55, 0.012, 0]} s={[0.8, 0.024, 1.0]} cast={false} />
    <Door deg={deg} />
  </group>
);

// ─── Screen-space helpers for the 2D overlays (chalk, stars) ──────────────
const PC = new THREE.PerspectiveCamera();
/** A 3D point (m) → screen px through `cam` */
export const project = (cam: Cam, p: [number, number, number]) => {
  applyCam(cam, PC, W, H);
  const v = new THREE.Vector3(...p).project(PC);
  return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
};
/** A point on the door's push face, `r` m from the hinge and `y` m up (door shut) */
export const onDoor = (r: number, y: number): [number, number, number] => [X0 - 0.02, y, DOOR.hingeZ + r];
/** World px (x right, y down) in lane z → metres */
export const toM = (x: number, y: number, z: number): [number, number, number] => [x / PX_PER_M, (GROUND - y) / PX_PER_M, z];
