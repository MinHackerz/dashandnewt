import React from "react";
import * as THREE from "three";
import { BOX, canvasTex, CYL, rng, SPH, std } from "../../world3d/kit";
import { applyCam, H, W, type Cam } from "../../world3d/Stage3D";
import { Under } from "../../world3d/water";
import type { Crab, Stick } from "./cast";
import { BOX as WATER, PX_PER_M } from "./timeline";

// The rock pool sunk into the beach, and the three things in this story: the coin, the crab, the stick.

const GROUND = 1380;
export const M = (x: number, y: number, z = 0): [number, number, number] => [x / PX_PER_M, (GROUND - y) / PX_PER_M, z];

const FLOOR = std("#ffffff", 0.95, {
  map: canvasTex(256, 256, (g, r) => {
    g.fillStyle = "#d3b072";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(150,110,60,0.25)" : "rgba(255,245,220,0.35)";
      g.beginPath();
      g.arc(r() * 256, r() * 256, 1 + r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    // caustic light net
    g.strokeStyle = "rgba(255,255,255,0.35)";
    g.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      g.beginPath();
      const x = r() * 256;
      const y = r() * 256;
      g.ellipse(x, y, 14 + r() * 18, 9 + r() * 12, r() * Math.PI, 0, Math.PI * 2);
      g.stroke();
    }
  }, 21, [2, 2]),
});
const WALL = std("#7d6f60", 0.9);
const ROCK = [std("#8d8478", 0.85), std("#a2978a", 0.85), std("#7b7268", 0.85)];
const WEED = std("#3f9a4a", 0.7, { side: THREE.DoubleSide });
const PEBBLE = [std("#f2e6d0", 0.6), std("#c7a27c", 0.7), std("#8fb3c9", 0.5)];

/** The pool basin: sandy floor, rock walls, a rim of boulders on three sides (the near rim is flat sand) */
export const Pool: React.FC = () => {
  const { x0, x1, z0, z1, floor } = WATER;
  const w = x1 - x0;
  const d = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const hWall = 0 - floor;
  const r = rng(12);
  const rim: React.ReactNode[] = [];
  // boulders: back edge, front edge, far edge
  for (let i = 0; i < 9; i++) rim.push(<mesh key={`b${i}`} geometry={SPH} material={ROCK[i % 3]} position={[x0 + 0.1 + i * (w / 8), 0.02, z0 - 0.16]} rotation={[0.2, r() * 3, 0.1]} scale={[0.22 + r() * 0.1, 0.16 + r() * 0.08, 0.18]} castShadow receiveShadow />);
  for (let i = 0; i < 5; i++) rim.push(<mesh key={`r${i}`} geometry={SPH} material={ROCK[(i + 2) % 3]} position={[x1 + 0.16, 0.03, z0 + 0.1 + i * (d / 4.4)]} rotation={[0.2, r() * 3, 0.1]} scale={[0.2, 0.18 + r() * 0.1, 0.22 + r() * 0.08]} castShadow receiveShadow />);
  const weeds = [...Array(7)].map((_, i) => {
    const px = x0 + 0.15 + r() * (w - 0.3);
    const pz = z0 + 0.1 + r() * 0.25;
    const h = 0.14 + r() * 0.16;
    return <mesh key={`w${i}`} geometry={BOX} material={WEED} position={[px, floor + h / 2, pz]} rotation={[0, r() * 3, (r() - 0.5) * 0.4]} scale={[0.035, h, 0.004]} />;
  });
  const pebbles = [...Array(14)].map((_, i) => (
    <mesh key={`p${i}`} geometry={SPH} material={PEBBLE[i % 3]} position={[x0 + 0.08 + r() * (w - 0.16), floor + 0.01, z0 + 0.08 + r() * (d - 0.16)]} scale={[0.025 + r() * 0.02, 0.012, 0.02 + r() * 0.02]} />
  ));
  return (
    <group>
      <Under box={WATER}>
        <mesh material={FLOOR} position={[cx, floor, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[w, d]} />
        </mesh>
        <mesh geometry={BOX} material={WALL} position={[x0 - 0.05, floor + hWall / 2, cz]} scale={[0.1, hWall, d + 0.2]} receiveShadow />
        <mesh geometry={BOX} material={WALL} position={[x1 + 0.05, floor + hWall / 2, cz]} scale={[0.1, hWall, d + 0.2]} receiveShadow />
        <mesh geometry={BOX} material={WALL} position={[cx, floor + hWall / 2, z0 - 0.05]} scale={[w + 0.2, hWall, 0.1]} receiveShadow />
        <mesh geometry={BOX} material={WALL} position={[cx, floor + hWall / 2, z1 + 0.05]} scale={[w + 0.2, hWall, 0.1]} receiveShadow />
        {weeds}
        {pebbles}
      </Under>
      {/* the near rim: a strip of wet sand */}
      <mesh material={std("#cfae78", 0.6)} position={[x0 - 0.06, 0.003, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.12, d]} />
      </mesh>
      {rim}
    </group>
  );
};

// ─── The coin ─────────────────────────────────────────────────────────────
const GOLD = std("#f4c542", 0.22, { metalness: 1, emissive: new THREE.Color("#ffb800"), emissiveIntensity: 0.25 });
const COIN_GEO = new THREE.CylinderGeometry(0.06, 0.06, 0.01, 40); // a big cartoon coin, so it reads on a phone
export const Coin: React.FC<{ p: [number, number, number]; spin: number; glint: number }> = ({ p, spin, glint }) => {
  GOLD.emissiveIntensity = 0.7 + glint * 1.4; // stays gold even through the water tint
  return (
    <group position={p} rotation={[spin, 0, spin * 0.5]}>
      <mesh geometry={COIN_GEO} material={GOLD} castShadow />
      <mesh geometry={CYL} material={GOLD} position={[0, 0.0055, 0]} scale={[0.04, 0.0012, 0.04]} />
    </group>
  );
};

// ─── The crab: guards the coin; angry brows once the stick bonks it ───────
const SHELL = std("#ec4b2e", 0.45);
const SHELL_DARK = std("#c43a22", 0.5);
const EYE = std("#ffffff", 0.2);
const PUPIL = std("#111111", 0.2);
export const CrabMesh: React.FC<{ c: Crab }> = ({ c }) => {
  const s = 1.45; // cartoon-sized, so it reads on a phone
  const legs = [...Array(6)].map((_, i) => {
    const side = i < 3 ? 1 : -1;
    const k = i % 3;
    const sw = c.walk ? Math.sin(c.walk * 26 + k * 2 + (side > 0 ? 0 : 1.5)) * 0.35 : 0;
    return (
      <mesh key={i} geometry={CYL} material={SHELL_DARK} position={[(k - 1) * 0.022, -0.012, side * 0.04]} rotation={[side * (1.0 + sw), 0, 0]} scale={[0.004, 0.045, 0.004]} />
    );
  });
  const claw = (side: number) => (
    <group position={[0.055, 0.0, side * 0.035]} rotation={[0, side * 0.5, 0]}>
      <mesh geometry={SPH} material={SHELL} scale={[0.018, 0.014, 0.016]} />
      <group position={[0.022, 0, 0]}>
        <mesh geometry={SPH} material={SHELL} position={[0.01, 0.006 + c.claw * 0.008, 0]} rotation={[0, 0, 0.3 + c.claw * 0.5]} scale={[0.02, 0.008, 0.012]} />
        <mesh geometry={SPH} material={SHELL} position={[0.01, -0.006 - c.claw * 0.008, 0]} rotation={[0, 0, -0.3 - c.claw * 0.5]} scale={[0.02, 0.008, 0.012]} />
      </group>
    </group>
  );
  const eye = (side: number) => (
    <group position={[0.022, 0.02, side * 0.014]}>
      <mesh geometry={CYL} material={SHELL_DARK} position={[0, 0.008, 0]} scale={[0.003, 0.018, 0.003]} />
      <mesh geometry={SPH} material={EYE} position={[0, 0.02, 0]} scale={0.009} />
      <mesh geometry={SPH} material={PUPIL} position={[0.007, 0.02, 0]} scale={0.0045} />
      {/* brows: flat when calm, slanted when cross */}
      <mesh geometry={BOX} material={PUPIL} position={[0.004, 0.032, 0]} rotation={[side * c.angry * 0.6, 0, 0]} scale={[0.004, 0.003, 0.016]} />
    </group>
  );
  return (
    <group position={c.p} rotation={[0, c.yaw, 0]} scale={s}>
      <mesh geometry={SPH} material={SHELL} position={[0, 0.006, 0]} scale={[0.04, 0.02, 0.048]} castShadow />
      {legs}
      {claw(1)}
      {claw(-1)}
      {eye(1)}
      {eye(-1)}
    </group>
  );
};

// ─── The stick (driftwood), with Newt's gum on the tip once he's put it there ──
const WOOD = std("#b8945f", 0.85);
const GUM = std("#ff8fc8", 0.3, { transparent: true, opacity: 0.92 });
const Y = new THREE.Vector3(0, 1, 0);
export const StickMesh: React.FC<{ s: Stick; len: number; gum: boolean }> = ({ s, len, gum }) => {
  const tip = new THREE.Vector3(...M(s.tip.x, s.tip.y, s.z));
  const dir = new THREE.Vector3(s.dir.x, -s.dir.y, 0).normalize();
  const L = len / PX_PER_M;
  const mid = tip.clone().sub(dir.clone().multiplyScalar(L / 2));
  const q = new THREE.Quaternion().setFromUnitVectors(Y, dir);
  return (
    <group>
      <mesh geometry={CYL} material={WOOD} position={mid} quaternion={q} scale={[0.022, L, 0.022]} castShadow />
      {[0.25, 0.55, 0.8].map((k) => (
        <mesh key={k} geometry={SPH} material={WOOD} position={tip.clone().sub(dir.clone().multiplyScalar(L * k))} scale={0.028} />
      ))}
      {gum ? <mesh geometry={SPH} material={GUM} position={tip} scale={[0.03, 0.024, 0.03]} /> : null}
    </group>
  );
};

// ─── Screen-space helper for overlays ─────────────────────────────────────
const PC = new THREE.PerspectiveCamera();
export const project = (cam: Cam, p: [number, number, number]) => {
  applyCam(cam, PC, W, H);
  const v = new THREE.Vector3(...p).project(PC);
  return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
};
