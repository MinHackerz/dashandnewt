import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { canvasTex, std } from "./kit";

// Still water you can see into, with refraction you can SEE: light bends at the surface (Snell's law,
// n = 1.33), so everything under the water looks shallower than it is. For a viewer looking down into
// it the apparent depth is (real depth) / n, so <Refract> draws whatever is below the surface squashed
// toward it by 1/n, and the part above the surface as it is. A straight stick or an arm dipped in the
// water therefore looks bent at the waterline, and legs standing in it look short: real physics, and
// the same thing a phone camera would show.
//
// It works by drawing the children twice with local clipping planes (Stage3D enables them):
//   1. as they are, minus the part inside the water box;
//   2. only the part inside the water box, in a group scaled by 1/n about the surface.
// Things that are always fully under water (the floor, a coin, a crab) can sit in <Under> instead.

import { N_WATER, type WaterBox } from "./optics";
export { N_WATER, type WaterBox };

const planes = (b: WaterBox, inward: boolean) => {
  const s = inward ? 1 : -1;
  // Plane(normal, constant): points with normal·p + constant < 0 are clipped
  return [
    new THREE.Plane(new THREE.Vector3(0, -s, 0), s * b.y), // below the surface
    new THREE.Plane(new THREE.Vector3(s, 0, 0), -s * b.x0),
    new THREE.Plane(new THREE.Vector3(-s, 0, 0), s * b.x1),
    new THREE.Plane(new THREE.Vector3(0, 0, s), -s * b.z0),
    new THREE.Plane(new THREE.Vector3(0, 0, -s), s * b.z1),
  ];
};

const clipCache = new WeakMap<THREE.Material, Map<string, THREE.Material>>();
const clipped = (m: THREE.Material, key: string, ps: THREE.Plane[], intersect: boolean) => {
  let byKey = clipCache.get(m);
  if (!byKey) clipCache.set(m, (byKey = new Map()));
  let c = byKey.get(key);
  if (!c) {
    c = m.clone();
    c.clippingPlanes = ps;
    c.clipIntersection = intersect;
    c.clipShadows = true;
    c.userData.clipOf = m;
    byKey.set(key, c);
  }
  return c;
};

/** Gives every mesh below it a clipped copy of its material (after every render, so new meshes too) */
const Clip: React.FC<{ id: string; ps: THREE.Plane[]; intersect: boolean; children: React.ReactNode }> = ({ id, ps, intersect, children }) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const swap = (m: THREE.Material) => (m.userData.clipOf ? m : clipped(m, id, ps, intersect));
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    });
  });
  return <group ref={ref}>{children}</group>;
};

const keyOf = (b: WaterBox) => [b.x0, b.x1, b.z0, b.z1, b.y].map((v) => v.toFixed(3)).join(",");

/** Children drawn as seen through the surface of `box`: real above it, squashed by 1/n below it */
export const Refract: React.FC<{ box: WaterBox; children: React.ReactNode }> = ({ box, children }) => {
  const k = keyOf(box);
  const out = useMemo(() => planes(box, false), [k]); // eslint-disable-line react-hooks/exhaustive-deps
  const inn = useMemo(() => planes(box, true), [k]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <Clip id={`out:${k}`} ps={out} intersect>
        {children}
      </Clip>
      <Under box={box}>
        <Clip id={`in:${k}`} ps={inn} intersect={false}>
          {children}
        </Clip>
      </Under>
    </>
  );
};

/** Children that are entirely under the water, drawn at their apparent depth */
export const Under: React.FC<{ box: WaterBox; children: React.ReactNode }> = ({ box, children }) => (
  <group position={[0, box.y * (1 - 1 / N_WATER), 0]} scale={[1, 1 / N_WATER, 1]}>
    {children}
  </group>
);

/** A point under the water (metres) → where it appears (for overlays and cameras) */
export const apparent = (box: WaterBox, p: [number, number, number]): [number, number, number] => [p[0], p[1] < box.y ? box.y - (box.y - p[1]) / N_WATER : p[1], p[2]];

// ─── The surface: clear, slightly tinted, with soft caustic glints ────────
const surfaceTex = canvasTex(256, 256, (g, r) => {
  g.fillStyle = "#38c9d8";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(225,255,255,${0.12 + r() * 0.22})`;
    g.beginPath();
    g.ellipse(r() * 256, r() * 256, 6 + r() * 16, 2 + r() * 4, r() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
}, 7, [3, 3]);
const SURFACE = std("#ffffff", 0.08, { transparent: true, opacity: 0.38, depthWrite: false, metalness: 0.05, map: surfaceTex, envMapIntensity: 1.2 });

export const WaterSurface: React.FC<{ box: WaterBox; t: number; ripples?: readonly (readonly [number, number, number])[] }> = ({ box, t, ripples = [] }) => (
  <group>
    <mesh material={SURFACE} position={[(box.x0 + box.x1) / 2, box.y, (box.z0 + box.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
      <planeGeometry args={[box.x1 - box.x0, box.z1 - box.z0]} />
    </mesh>
    {/* rings spreading from wherever something broke the surface: [time, x, z] */}
    {ripples.map(([at, x, z], i) => {
      const d = t - at;
      if (d < 0 || d > 1.6) return null;
      const r = 0.06 + d * 0.32;
      return (
        <mesh key={i} position={[x, box.y + 0.004, z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={6}>
          <ringGeometry args={[r, r + 0.025, 40]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7 * (1 - d / 1.6)} depthWrite={false} />
        </mesh>
      );
    })}
  </group>
);
