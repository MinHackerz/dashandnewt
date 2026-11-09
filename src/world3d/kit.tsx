import React, { useMemo } from "react";
import * as THREE from "three";

// Building blocks for the 3D worlds: seeded canvas textures, clouds, palms, round trees, bushes, rocks,
// buildings. Everything is procedural (no downloaded assets) and deterministic (seeded), so every render
// of a frame is identical. Units are metres; y is up; the action plane (where the cast stands) is z = 0.

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Y = V(0, 1, 0);

/** Seeded PRNG (mulberry32): same seed, same world */
export const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const std = (color: string, roughness = 0.85, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const SPH = new THREE.SphereGeometry(1, 32, 20);
const SPH_LO = new THREE.SphereGeometry(1, 20, 12);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 20, 1, false);
const BOX = new THREE.BoxGeometry(1, 1, 1);

/** A canvas texture painted by `draw` (w×h px), repeating */
export const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 1, repeat: [number, number] = [1, 1]) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, rng(seed));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
};
/** Speckled ground: a base colour with soft light/dark flecks (sand, grass, concrete) */
export const speckle = (base: string, dark: string, light: string, n: number, size: number, seed: number, repeat: number) =>
  canvasTex(512, 512, (g, r) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < n; i++) {
      g.fillStyle = r() < 0.5 ? dark : light;
      g.globalAlpha = 0.25 + r() * 0.35;
      const s = size * (0.4 + r());
      g.beginPath();
      g.ellipse(r() * 512, r() * 512, s, s * (0.5 + r() * 0.6), r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }, seed, [repeat, repeat]);

// ─── Ground plane ─────────────────────────────────────────────────────────
/** A flat ground strip from z0 back to z1; `tile` = metres covered by one copy of the material's texture */
export const Ground: React.FC<{ x0: number; z0: number; z1: number; w?: number; mat: THREE.Material; y?: number; tile?: number }> = ({ x0, z0, z1, w = 160, mat, y = 0, tile = 4 }) => {
  const d = Math.abs(z0 - z1);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, d);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * d) / tile);
    return g;
  }, [w, d, tile]);
  return <mesh geometry={geo} material={mat} position={[x0, y, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow />;
};

// ─── Clouds: puffy cumulus from overlapping balls, soft-lit from the sun ──
const CLOUD = std("#ffffff", 1, { emissive: new THREE.Color("#dfeeff"), emissiveIntensity: 0.38, fog: false });
export const Cloud: React.FC<{ at: [number, number, number]; size: number; seed: number }> = ({ at, size, seed }) => {
  const balls = useMemo(() => {
    const r = rng(seed);
    const out: { p: THREE.Vector3; s: number }[] = [];
    const n = 7 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5;
      const s = (0.34 + 0.3 * Math.cos(u * Math.PI) + r() * 0.12) * size;
      out.push({ p: V(u * size * 2.1, s * 0.45 + r() * size * 0.15, (r() - 0.5) * size * 0.4), s });
    }
    out.push({ p: V(0, size * 0.1, 0), s: size * 0.5 });
    return out;
  }, [seed, size]);
  return (
    <group position={at}>
      {balls.map((b, i) => (
        <mesh key={i} geometry={SPH_LO} material={CLOUD} position={b.p} scale={[b.s, b.s * 0.82, b.s * 0.8]} />
      ))}
    </group>
  );
};

// ─── Palm tree: banded curved trunk, drooping pinnate fronds, coconuts ────
const frondGeo = (() => {
  const N = 22;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const dark = new THREE.Color("#1f7a2c");
  const light = new THREE.Color("#7ccf3e");
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const y = 0.22 * t - 0.62 * t * t;
    const jag = 0.7 + 0.3 * Math.abs(Math.sin(t * 46));
    const w = (0.035 + 0.2 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 0.7)) * jag;
    [-1, 0, 1].forEach((k) => {
      pos.push(t, y - (k === 0 ? 0 : 0.3 * w), k * w);
      const c = dark.clone().lerp(light, 0.25 + 0.6 * t + (k === 0 ? -0.15 : 0.1));
      col.push(c.r, c.g, c.b);
    });
  }
  for (let i = 0; i < N; i++) {
    const a = i * 3;
    const b = a + 3;
    idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
})();
const FROND = std("#ffffff", 0.7, { vertexColors: true, side: THREE.DoubleSide });
const BARK_A = std("#a06c3c", 0.95);
const BARK_B = std("#7d5130", 0.95);
const COCO = std("#6b4423", 0.6);
export const Palm: React.FC<{ at: [number, number, number]; h: number; lean: number; seed: number; yaw?: number }> = ({ at, h, lean, seed, yaw = 0 }) => {
  const r = rng(seed);
  const N = 14;
  const pt = (t: number) => V(lean * h * t * t, h * t, 0.15 * h * Math.sin(t * 2) * (r() * 0 + 0.3));
  const segs = [...Array(N)].map((_, i) => {
    const a = pt(i / N);
    const b = pt((i + 1) / N);
    const d = b.clone().sub(a);
    const len = d.length();
    const rad = 0.2 * (1 - 0.45 * (i / N)) * (h / 6);
    return (
      <mesh key={i} geometry={CYL} material={i % 2 ? BARK_A : BARK_B} position={a.clone().add(b).multiplyScalar(0.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(Y, d.normalize())} scale={[rad * (i % 2 ? 1.06 : 1), len * 1.02, rad * (i % 2 ? 1.06 : 1)]} castShadow receiveShadow />
    );
  });
  const top = pt(1);
  const fronds = [...Array(9)].map((_, i) => {
    const az = (i / 9) * Math.PI * 2 + r() * 0.4;
    const tilt = -0.15 + r() * 0.5;
    const L = (0.42 + r() * 0.12) * h;
    return <mesh key={i} geometry={frondGeo} material={FROND} position={top} rotation={[0, az, tilt]} scale={[L, L * 0.9, L * 0.8]} castShadow />;
  });
  return (
    <group position={at} rotation={[0, yaw, 0]}>
      {segs}
      {fronds}
      {[0, 2.1, 4.2].map((a, i) => (
        <mesh key={i} geometry={SPH} material={COCO} position={top.clone().add(V(Math.cos(a) * 0.16 * (h / 6), -0.14 * (h / 6), Math.sin(a) * 0.16 * (h / 6)))} scale={0.13 * (h / 6)} castShadow />
      ))}
    </group>
  );
};

// ─── Round cartoon tree, bush, rock ───────────────────────────────────────
const LEAF = [std("#3fa535", 0.8), std("#4cb83b", 0.8), std("#37962f", 0.8), std("#58c447", 0.8)];
const TRUNK = std("#7a5230", 0.9);
export const RoundTree: React.FC<{ at: [number, number, number]; h: number; seed: number }> = ({ at, h, seed }) => {
  const balls = useMemo(() => {
    const r = rng(seed);
    const c = V(0, h * 0.68, 0);
    const R = h * 0.3;
    const out = [{ p: c, s: R, m: 0 }];
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2;
      const e = (r() - 0.3) * 1.2;
      out.push({ p: c.clone().add(V(Math.cos(a) * Math.cos(e), Math.sin(e) * 0.8, Math.sin(a) * Math.cos(e)).multiplyScalar(R * 0.75)), s: R * (0.45 + r() * 0.25), m: 1 + Math.floor(r() * 3) });
    }
    return out;
  }, [h, seed]);
  return (
    <group position={at}>
      <mesh geometry={CYL} material={TRUNK} position={[0, h * 0.25, 0]} scale={[h * 0.05, h * 0.5, h * 0.05]} castShadow />
      {balls.map((b, i) => (
        <mesh key={i} geometry={SPH} material={LEAF[b.m]} position={b.p} scale={b.s} castShadow receiveShadow />
      ))}
    </group>
  );
};
export const Bush: React.FC<{ at: [number, number, number]; s: number; seed: number }> = ({ at, s, seed }) => {
  const r = rng(seed);
  return (
    <group position={at}>
      {[...Array(5)].map((_, i) => (
        <mesh key={i} geometry={SPH} material={LEAF[i % 4]} position={[(i - 2) * s * 0.42, s * (0.35 + r() * 0.2), (r() - 0.5) * s * 0.5]} scale={s * (0.45 + r() * 0.2)} castShadow receiveShadow />
      ))}
    </group>
  );
};
const ROCK = std("#9a948c", 0.9);
export const Rock: React.FC<{ at: [number, number, number]; s: number; rot?: number }> = ({ at, s, rot = 0 }) => (
  <mesh geometry={SPH} material={ROCK} position={at} rotation={[0.2, rot, 0.1]} scale={[s * 1.3, s * 0.7, s]} castShadow receiveShadow />
);

// ─── Building: brick (or render) facade with windows, cornice and a shop awning ──
const facadeTex = (brick: string, mortar: string, seed: number) =>
  canvasTex(512, 512, (g, r) => {
    g.fillStyle = mortar;
    g.fillRect(0, 0, 512, 512);
    const bh = 16;
    for (let y = 0; y < 512; y += bh) {
      const off = (y / bh) % 2 ? 0 : 24;
      for (let x = -48; x < 512; x += 48) {
        const c = new THREE.Color(brick).offsetHSL(0, (r() - 0.5) * 0.08, (r() - 0.5) * 0.08);
        g.fillStyle = `#${c.getHexString()}`;
        g.fillRect(x + off + 2, y + 2, 44, bh - 3);
      }
    }
  }, seed);
const windowTex = canvasTex(128, 192, (g) => {
  g.fillStyle = "#f6f1e6";
  g.fillRect(0, 0, 128, 192);
  const grad = g.createLinearGradient(0, 0, 128, 192);
  grad.addColorStop(0, "#bfe6ff");
  grad.addColorStop(0.5, "#6fb4e8");
  grad.addColorStop(1, "#3d7fbf");
  g.fillStyle = grad;
  g.fillRect(14, 14, 100, 164);
  g.fillStyle = "#f6f1e6";
  g.fillRect(60, 14, 8, 164);
  g.fillRect(14, 92, 100, 8);
  g.fillStyle = "rgba(255,255,255,0.45)";
  g.beginPath();
  g.moveTo(20, 80);
  g.lineTo(50, 20);
  g.lineTo(60, 20);
  g.lineTo(28, 88);
  g.fill();
});
const WINDOW = std("#ffffff", 0.25, { map: windowTex, metalness: 0.1 });
const SILL = std("#efe6d4", 0.7);
export const Building: React.FC<{ x: number; z: number; w: number; h: number; brick: string; awning?: string; seed: number }> = ({ x, z, w, h, brick, awning, seed }) => {
  const mat = useMemo(() => {
    const t = facadeTex(brick, "#d8cbb8", seed);
    t.repeat.set(w / 3, h / 3);
    return std("#ffffff", 0.9, { map: t });
  }, [brick, seed, w, h]);
  const cols = Math.max(2, Math.floor(w / 1.8));
  const rows = Math.max(2, Math.floor((h - 3.2) / 2.6));
  const wins: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const wx = x - w / 2 + (c + 0.5) * (w / cols);
      const wy = 3.6 + r * 2.6 + 1;
      wins.push(
        <group key={`${r}-${c}`}>
          <mesh geometry={BOX} material={WINDOW} position={[wx, wy, z + 0.06]} scale={[0.95, 1.5, 0.1]} />
          <mesh geometry={BOX} material={SILL} position={[wx, wy - 0.82, z + 0.12]} scale={[1.15, 0.12, 0.22]} castShadow />
        </group>,
      );
    }
  return (
    <group>
      <mesh geometry={BOX} material={mat} position={[x, h / 2, z - 2]} scale={[w, h, 4]} castShadow receiveShadow />
      <mesh geometry={BOX} material={SILL} position={[x, h + 0.2, z]} scale={[w + 0.3, 0.4, 0.5]} castShadow />
      {wins}
      {awning ? (
        <group>
          <mesh geometry={BOX} material={std("#2b2f3a", 0.3)} position={[x, 1.5, z + 0.05]} scale={[w * 0.8, 2.4, 0.1]} />
          <mesh geometry={BOX} material={std(awning, 0.8)} position={[x, 2.95, z + 0.6]} rotation={[0.35, 0, 0]} scale={[w * 0.86, 0.12, 1.3]} castShadow />
        </group>
      ) : null}
    </group>
  );
};

// ─── Lamp post ────────────────────────────────────────────────────────────
const LAMP = std("#2f4a3a", 0.5, { metalness: 0.4 });
export const LampPost: React.FC<{ at: [number, number, number] }> = ({ at }) => (
  <group position={at}>
    <mesh geometry={CYL} material={LAMP} position={[0, 2.2, 0]} scale={[0.07, 4.4, 0.07]} castShadow />
    <mesh geometry={SPH} material={std("#fff6d8", 0.3, { emissive: new THREE.Color("#fff1c4"), emissiveIntensity: 0.4 })} position={[0, 4.55, 0]} scale={[0.22, 0.3, 0.22]} />
    <mesh geometry={CYL} material={LAMP} position={[0, 4.35, 0]} scale={[0.25, 0.08, 0.25]} />
  </group>
);

export { SPH, CYL, BOX, std };
