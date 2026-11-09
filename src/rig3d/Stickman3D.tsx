import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { along, GROUND, HEAD_R, HEAD_SCALE, scarfTailPoints, solve, toWorld } from "../rig/Stickman";
import type { CharState, Expr } from "../rig/types";
import { NOINK } from "../lib/look3d/ink";

// Dash & Newt as 3D toy figures: the same CharState (pose, face, extras) the 2D Stickman draws,
// built as a soft vinyl figure — rounded tapered torso, jointed limbs, white glove hands, sneakers,
// a big glossy head with sculpted features (eyeballs, lids, brows, mouth) driven by the expression.
// The body stays on the action plane (z = 0): near limbs sit toward the camera, far limbs behind.
// Everything here lives on the NOINK layer, so the world's ink pass never outlines the cast.
// Supported extras: scarf (+ tails, wet), partyHat, blush, flush. Add others here as episodes need them.

export const PX_PER_M = 240;
const rad = (d: number) => (d * Math.PI) / 180;
type P2 = { x: number; y: number };
const v3 = (p: P2, z: number) => new THREE.Vector3(p.x / PX_PER_M, (GROUND - p.y) / PX_PER_M, z);

// ─── Materials (soft vinyl / clay, lit by the scene) ─────────────────────
export const phys = (color: string, roughness: number, clearcoat = 0, extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness, clearcoat, clearcoatRoughness: 0.35, ...extra });
export const M = {
  body: phys("#2d2f37", 0.48, 0.25),
  glove: phys("#f8f4ec", 0.42, 0.3),
  shoe: phys("#f4f1ea", 0.55, 0.1),
  sole: phys("#3a3c44", 0.7),
  ink: phys("#121214", 0.18, 0.6),
  eye: phys("#ffffff", 0.12, 0.8),
  mouth: phys("#3a1216", 0.6),
  tongue: phys("#ff7a8a", 0.5),
  teeth: phys("#ffffff", 0.25, 0.4),
  blush: phys("#ff8fa6", 0.8, 0, { transparent: true, opacity: 0.85 }),
  sweat: phys("#8fd3ff", 0.05, 1, { transparent: true, opacity: 0.85 }),
  vein: phys("#e02424", 0.5),
  pompom: phys("#ffd23f", 0.95),
};
const headMats = new Map<number, THREE.MeshPhysicalMaterial>();
/** White vinyl head, flushing to tomato red with effort (quantised so materials are reused) */
const headMat = (flush = 0) => {
  const k = Math.round(Math.max(0, Math.min(1, flush)) * 12);
  let m = headMats.get(k);
  if (!m) {
    const u = k / 12;
    m = phys("#ffffff", 0.36, 0.45);
    m.color.setRGB(0.97, 0.95 - 0.5 * u, 0.91 - 0.56 * u, THREE.SRGBColorSpace);
    headMats.set(k, m);
  }
  return m;
};

const knitTex = (base: string, line: string) => {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 64);
  g.strokeStyle = line;
  g.lineWidth = 3;
  for (let i = 0; i < 16; i++) {
    g.beginPath();
    g.moveTo(i * 8, 0);
    g.lineTo(i * 8 + 4, 32);
    g.lineTo(i * 8, 64);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  return t;
};
export const SCARF = phys("#ffffff", 0.92, 0, { map: knitTex("#ff8a1f", "#e06d0c") });
export const SCARF_WET = phys("#ffffff", 0.4, 0.5, { map: knitTex("#c8641a", "#9a4a10") });
export const HAT = (() => {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ff4d6d";
  g.fillRect(0, 0, 64, 256);
  g.fillStyle = "#ffd23f";
  g.fillRect(0, 70, 64, 22);
  g.fillRect(0, 146, 64, 18);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return phys("#ffffff", 0.45, 0.3, { map: t });
})();

// ─── Geometry helpers ────────────────────────────────────────────────────
export const SPH = new THREE.SphereGeometry(1, 40, 28);
export const CONE = new THREE.ConeGeometry(1, 1, 40, 1, true);
export const RING = new THREE.TorusGeometry(1, 0.42, 18, 40);
const TORUS = new THREE.TorusGeometry(1, 0.32, 12, 28);
const taperCache = new Map<number, THREE.CylinderGeometry>();
/** Unit-height cylinder whose top radius is `k` × its bottom radius (1) */
const taper = (k: number) => {
  const key = Math.round(k * 100);
  let g = taperCache.get(key);
  if (!g) {
    g = new THREE.CylinderGeometry(key / 100, 1, 1, 28, 1, true);
    taperCache.set(key, g);
  }
  return g;
};
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

/** A limb segment from a (radius ra) to b (radius rb), with a ball at each end so joints are smooth */
export const Seg: React.FC<{ a: THREE.Vector3; b: THREE.Vector3; ra: number; rb: number; mat: THREE.Material }> = ({ a, b, ra, rb, mat }) => {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = Math.max(1e-4, d.length());
  const q = new THREE.Quaternion().setFromUnitVectors(Y, d.normalize());
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  return (
    <group>
      <mesh geometry={taper(rb / ra)} material={mat} position={mid} quaternion={q} scale={[ra, len, ra]} castShadow receiveShadow />
      <mesh geometry={SPH} material={mat} position={a} scale={ra} castShadow receiveShadow />
      <mesh geometry={SPH} material={mat} position={b} scale={rb} castShadow receiveShadow />
    </group>
  );
};

/** An ellipsoid at p, its local z axis turned to `dir` */
export const Blob: React.FC<{ p: THREE.Vector3; s: [number, number, number]; mat: THREE.Material; dir?: THREE.Vector3 }> = ({ p, s, mat, dir }) => {
  const q = dir ? new THREE.Quaternion().setFromUnitVectors(Z, dir.clone().normalize()) : new THREE.Quaternion();
  return <mesh geometry={SPH} material={mat} position={p} quaternion={q} scale={s} castShadow />;
};

/** A smooth tube along points (face lines, scarf tails), rebuilt only when the points change */
export const Line3: React.FC<{ pts: THREE.Vector3[]; r: number; mat: THREE.Material; cast?: boolean }> = ({ pts, r, mat, cast = false }) => {
  const key = pts.map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`).join(";") + r.toFixed(5);
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, pts.length * 6), r, 10, false), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group>
      <mesh geometry={geo} material={mat} castShadow={cast} />
      <mesh geometry={SPH} material={mat} position={pts[0]} scale={r} />
      <mesh geometry={SPH} material={mat} position={pts[pts.length - 1]} scale={r} />
    </group>
  );
};

// ─── The face: the 2D expression (rig/library FACES) sculpted onto the head ──
// Face units are the 2D head's (radius 46, y down). `on(x, y, lift)` puts a point on the head's
// surface (lift = fraction of the radius above it; negative sinks it in).
const Face3D: React.FC<{ e: Expr; R: number; lookY: number; blink: number; t: number; blush?: boolean; skin: THREE.Material }> = ({ e, R, lookY, blink, t, blush, skin }) => {
  const u = R / 46;
  const on = (x: number, y: number, lift = 0.015) => {
    const nx = x / 46;
    const ny = -y / 46;
    const nz = Math.sqrt(Math.max(0.04, 1 - nx * nx - ny * ny));
    return new THREE.Vector3(nx, ny, nz).normalize().multiplyScalar(R * (1 + lift));
  };
  const normal = (x: number, y: number) => on(x, y, 0).normalize();
  const curve = (p0: number[], c: number[], p1: number[], n = 9) =>
    [...Array(n)].map((_, i) => {
      const s = i / (n - 1);
      const x = (1 - s) * (1 - s) * p0[0] + 2 * (1 - s) * s * c[0] + s * s * p1[0];
      const y = (1 - s) * (1 - s) * p0[1] + 2 * (1 - s) * s * c[1] + s * s * p1[1];
      return on(x, y);
    });
  const poly = (pts: number[][]) => pts.map(([x, y]) => on(x, y));
  const LW = 2.3 * u; // line radius
  const ey = -4;
  const out: React.ReactNode[] = [];

  const eyeKind = blink > 0.5 && (e.eyes === "dot" || e.eyes === "wide") ? "closed" : e.eyes;
  [-15, 15].forEach((ex, i) => {
    const k = `e${i}`;
    switch (eyeKind) {
      case "dot":
      case "half": {
        const half = eyeKind === "half";
        out.push(<Blob key={k} p={on(ex, ey + lookY * 3 + (half ? 2 : 0), -0.02)} s={[5.6 * u, (half ? 4.6 : 8.6) * u, 4 * u]} mat={M.ink} dir={normal(ex, ey)} />);
        out.push(<Blob key={`${k}c`} p={on(ex - 1.8, ey - 3 + lookY * 3, 0.06)} s={[1.5 * u, 1.5 * u, 1 * u]} mat={M.eye} dir={normal(ex, ey)} />);
        if (half) out.push(<Line3 key={`${k}l`} pts={poly([[ex - 9, ey - 1], [ex, ey - 2.5], [ex + 9, ey - 1]])} r={LW} mat={M.ink} />);
        break;
      }
      case "wide": {
        // a real eyeball half out of the head, its pupil turned by lookY
        const re = 12.5 * u;
        const nrm = normal(ex, ey);
        const centre = nrm.clone().multiplyScalar(R + re * 0.05);
        const q = new THREE.Quaternion().setFromUnitVectors(Z, nrm);
        const dirP = new THREE.Vector3(0, -lookY * 0.35, 1).normalize().applyQuaternion(q);
        const pr = 5.6 * (e.pupil ?? 1) * u;
        out.push(<mesh key={k} geometry={SPH} material={M.eye} position={centre} scale={re} castShadow />);
        out.push(<mesh key={`${k}p`} geometry={SPH} material={M.ink} position={centre.clone().add(dirP.clone().multiplyScalar(re - pr * 0.45))} scale={[pr, pr, pr * 0.5]} quaternion={new THREE.Quaternion().setFromUnitVectors(Z, dirP)} />);
        out.push(<mesh key={`${k}c`} geometry={SPH} material={M.eye} position={centre.clone().add(dirP.clone().multiplyScalar(re + 0.2 * u)).add(new THREE.Vector3(-1.6 * u, 1.8 * u, 0))} scale={1.4 * u} />);
        break;
      }
      case "happy":
        out.push(<Line3 key={k} pts={curve([ex - 8, ey + 3], [ex, ey - 10], [ex + 8, ey + 3])} r={LW} mat={M.ink} />);
        break;
      case "closed":
        out.push(<Line3 key={k} pts={curve([ex - 8, ey], [ex, ey + 7], [ex + 8, ey])} r={LW} mat={M.ink} />);
        break;
      case "x":
        out.push(<Line3 key={k} pts={poly([[ex - 7, ey - 7], [ex + 7, ey + 7]])} r={LW} mat={M.ink} />);
        out.push(<Line3 key={`${k}b`} pts={poly([[ex + 7, ey - 7], [ex - 7, ey + 7]])} r={LW} mat={M.ink} />);
        break;
      case "squeeze": {
        const d = i === 0 ? 1 : -1;
        out.push(<Line3 key={k} pts={poly([[ex - 7 * d, ey - 7], [ex + 7 * d, ey], [ex - 7 * d, ey + 7]])} r={LW} mat={M.ink} />);
        break;
      }
      case "spiral": {
        const pts: number[][] = [];
        for (let s = 0; s <= 22; s++) {
          const a = s * 0.6 + t * 9 * (i ? 1 : -1);
          pts.push([ex + Math.cos(a) * s * 0.36, ey + Math.sin(a) * s * 0.36]);
        }
        out.push(<Line3 key={k} pts={poly(pts)} r={LW * 0.8} mat={M.ink} />);
        break;
      }
    }
    // brow
    if (e.eyes !== "x" && e.eyes !== "spiral") {
      const inner = i === 0 ? 1 : -1;
      const raise = e.brow + (i === 1 ? (e.browAsym ?? 0) : 0);
      const by = ey - (e.eyes === "wide" ? 22 : 17) - raise * 6;
      const a = e.browAng * 5;
      out.push(<Line3 key={`b${i}`} pts={poly([[ex + inner * 8, by + a], [ex, by - 1], [ex - inner * 8, by - a]])} r={LW * 1.15} mat={M.ink} />);
    }
  });

  // nose: a small rounded bump gives the face a 3D profile
  out.push(<mesh key="nose" geometry={SPH} material={skin} position={on(0, 9, -0.06)} scale={6.5 * u} castShadow />);

  const my = 22;
  const cavity = (cx: number, cy: number, sx: number, sy: number, key: string) => <Blob key={key} p={on(cx, cy, -0.04)} s={[sx * u, sy * u, 4 * u]} mat={M.mouth} dir={normal(cx, cy)} />;
  switch (e.mouth) {
    case "smile":
      out.push(<Line3 key="m" pts={curve([-12, my - 2], [0, my + 11], [12, my - 2])} r={LW} mat={M.ink} />);
      break;
    case "sadSmile":
      out.push(<Line3 key="m" pts={curve([-10, my + 1], [0, my + 6], [10, my + 1])} r={LW} mat={M.ink} />);
      break;
    case "frown":
      out.push(<Line3 key="m" pts={curve([-12, my + 6], [0, my - 6], [12, my + 6])} r={LW} mat={M.ink} />);
      break;
    case "flat":
      out.push(<Line3 key="m" pts={poly([[-10, my], [0, my], [10, my]])} r={LW} mat={M.ink} />);
      break;
    case "tiny":
      out.push(<Line3 key="m" pts={poly([[-4, my], [4, my]])} r={LW} mat={M.ink} />);
      break;
    case "smirk":
      out.push(<Line3 key="m" pts={curve([-11, my + 2], [3, my + 7], [13, my - 5])} r={LW} mat={M.ink} />);
      break;
    case "wavy":
      out.push(<Line3 key="m" pts={poly([[-14, my + 2], [-9, my - 2], [-4, my + 2], [1, my - 2], [6, my + 2], [11, my - 2]])} r={LW * 0.85} mat={M.ink} />);
      break;
    case "grin":
      out.push(cavity(0, my + 4, 15, 8, "m"));
      out.push(<Blob key="mt" p={on(0, my, -0.01)} s={[14 * u, 3.6 * u, 4.2 * u]} mat={M.teeth} dir={normal(0, my)} />);
      out.push(<Line3 key="mo" pts={curve([-16, my - 4], [0, my + 18], [16, my - 4])} r={LW * 0.9} mat={M.ink} />);
      break;
    case "laugh":
      out.push(cavity(0, my + 5, 15, 10, "m"));
      out.push(<Blob key="mg" p={on(0, my + 9, -0.005)} s={[7 * u, 3.6 * u, 3 * u]} mat={M.tongue} dir={normal(0, my + 9)} />);
      break;
    case "o":
      out.push(cavity(0, my + 2, 5, 6, "m"));
      break;
    case "O":
      out.push(cavity(0, my + 4, 11, 15, "m"));
      out.push(<Blob key="mg" p={on(0, my + 13, -0.005)} s={[6 * u, 3.6 * u, 3 * u]} mat={M.tongue} dir={normal(0, my + 13)} />);
      break;
    case "teeth":
      out.push(<Blob key="m" p={on(0, my, -0.015)} s={[15.5 * u, 7 * u, 4.5 * u]} mat={M.teeth} dir={normal(0, my)} />);
      out.push(<Line3 key="m1" pts={poly([[-14, my], [14, my]])} r={LW * 0.5} mat={M.ink} />);
      [-8, -1, 6].forEach((o) => out.push(<Line3 key={`t${o}`} pts={poly([[o, my - 6], [o, my + 6]])} r={LW * 0.45} mat={M.ink} />));
      break;
    case "whistle":
      out.push(<mesh key="m" geometry={TORUS} material={M.ink} position={on(6, my + 1, 0.01)} quaternion={new THREE.Quaternion().setFromUnitVectors(Z, normal(6, my + 1))} scale={4.5 * u} />);
      break;
  }
  if (blush) [-26, 26].forEach((x) => out.push(<Blob key={`bl${x}`} p={on(x, 12, 0.0)} s={[8.5 * u, 5.2 * u, 1.2 * u]} mat={M.blush} dir={normal(x, 12)} />));
  if (e.sweat) out.push(<Blob key="sw" p={on(36, -24 + ((t * 40) % 10), 0.08)} s={[4.5 * u, 6.5 * u, 4 * u]} mat={M.sweat} />);
  if (e.tear) out.push(<Blob key="tr" p={on(-16, 18 + ((t * 24) % 14), 0.05)} s={[3.6 * u, 5.2 * u, 3 * u]} mat={M.sweat} />);
  if (e.vein) {
    const s = 1 + 0.15 * Math.sin(t * 30);
    const c = [-28, -30];
    [
      [[-9, -3], [-3, -3], [-3, -9]],
      [[3, -9], [3, -3], [9, -3]],
      [[9, 3], [3, 3], [3, 9]],
      [[-3, 9], [-3, 3], [-9, 3]],
    ].forEach((seg, k) => out.push(<Line3 key={`v${k}`} pts={poly(seg.map(([x, y]) => [c[0] + x * s, c[1] + y * s]))} r={LW * 0.8} mat={M.vein} />));
  }
  return <group>{out}</group>;
};

// ─── The figure ──────────────────────────────────────────────────────────
export const Stickman3D: React.FC<{ c: CharState }> = ({ c }) => {
  const root = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    root.current?.traverse((o) => o.layers.set(NOINK));
  });
  const j = solve(c.pose, c.aLen ?? 1);
  const s = c.scale;
  const W = (p: P2, z: number) => v3(toWorld(c, p), z);
  const px = (n: number) => (n * s) / PX_PER_M;
  const zS = 0.12 * s; // shoulder half-width
  const zH = 0.075 * s; // hip half-width
  const ex = c.extras;
  const skin = headMat(ex.flush);

  // feet: perpendicular to the shin, flat when planted (as in the 2D rig)
  const toeOf = (at: P2, shin: number) => along(at, shin + 90 + (at.y > -4 ? -shin * 0.8 : 0), 22);
  const shoe = (at: P2, shin: number, z: number) => {
    const heel = W(at, z);
    const toe = W(toeOf(at, shin), z);
    const dir = new THREE.Vector3().subVectors(toe, heel);
    const mid = heel.clone().add(dir.clone().multiplyScalar(0.55));
    mid.y += px(4);
    return (
      <group>
        <Blob p={mid} s={[px(16), px(13), px(26)]} mat={M.shoe} dir={dir} />
        <Blob p={mid.clone().add(new THREE.Vector3(0, -px(7), 0))} s={[px(17), px(5), px(27)]} mat={M.sole} dir={dir} />
      </group>
    );
  };
  const hand = (at: P2, fore: number, kind: CharState["aHand"], z: number) => {
    if (kind === "none") return null;
    const p = W(at, z);
    const dir = new THREE.Vector3().subVectors(W(along(at, fore, 14), z), p);
    const thumb = p.clone().add(new THREE.Vector3(0, px(7), z > 0 ? px(7) : -px(7)));
    if (kind === "open")
      return (
        <group>
          <Blob p={p.clone().add(dir.clone().multiplyScalar(0.5))} s={[px(15), px(7), px(18)]} mat={M.glove} dir={dir} />
          <Blob p={thumb} s={[px(5.5), px(5.5), px(8)]} mat={M.glove} dir={dir} />
        </group>
      );
    return (
      <group>
        <Blob p={p} s={[px(14), px(13), px(12)]} mat={M.glove} dir={dir} />
        <Blob p={thumb} s={[px(5.5), px(5.5), px(7)]} mat={M.glove} />
        {kind === "point" ? <Seg a={p} b={W(along(at, fore, 26), z)} ra={px(4.5)} rb={px(4.2)} mat={M.glove} /> : null}
        {kind === "thumb" ? <Seg a={W({ x: at.x, y: at.y - 6 }, z)} b={W({ x: at.x, y: at.y - 24 }, z)} ra={px(5)} rb={px(4.5)} mat={M.glove} /> : null}
      </group>
    );
  };
  // a point in head-local units (before HEAD_SCALE), optionally pre-rotated (the party hat's tilt)
  const headLocal = (lx: number, ly: number, pre = 0) => {
    const pr = rad(pre);
    const x0 = lx * Math.cos(pr) - ly * Math.sin(pr);
    const y0 = lx * Math.sin(pr) + ly * Math.cos(pr);
    const a = rad(j.headAng);
    const x = x0 * HEAD_SCALE;
    const y = y0 * HEAD_SCALE;
    return { x: j.head.x + x * Math.cos(a) - y * Math.sin(a), y: j.head.y + x * Math.sin(a) + y * Math.cos(a) };
  };
  const tilt = c.facing * j.headAng + (c.rot ?? 0);
  const R = px(HEAD_R * HEAD_SCALE);
  // the face turns toward where they're facing (a little even when "looking at camera")
  const yaw = c.facing * (0.12 + 0.5 * c.faceX); // ≤ ~35°: a three-quarter face, never a flat profile

  // torso: hips → chest → neck, rounder than a stick
  const chest = { x: j.hip.x + (j.neck.x - j.hip.x) * 0.72, y: j.hip.y + (j.neck.y - j.hip.y) * 0.72 };
  const neckTop = { x: j.neck.x + (j.head.x - j.neck.x) * 0.3, y: j.neck.y + (j.head.y - j.neck.y) * 0.3 };

  const hat = ex.partyHat
    ? (() => {
        const base = W(headLocal(1, -38, -12), 0);
        const apex = W(headLocal(2, -104, -12), 0);
        const d = new THREE.Vector3().subVectors(apex, base);
        const len = d.length();
        const q = new THREE.Quaternion().setFromUnitVectors(Y, d.normalize());
        const mid = new THREE.Vector3().addVectors(base, apex).multiplyScalar(0.5);
        const rb = px(25 * HEAD_SCALE);
        return (
          <group>
            <mesh geometry={CONE} material={HAT} position={mid} quaternion={q} scale={[rb, len, rb]} castShadow />
            <mesh geometry={SPH} material={M.pompom} position={W(headLocal(2, -108, -12), 0)} scale={px(11 * HEAD_SCALE)} castShadow />
          </group>
        );
      })()
    : null;

  const scarf = ex.scarf
    ? (() => {
        const ring = W({ x: j.neck.x, y: j.neck.y + 4 }, 0);
        const lean = c.facing * c.pose.lean + (c.rot ?? 0);
        const tails = ex.scarfTails !== false ? scarfTailPoints(j, c.t, c.speed, ex.wet) : [];
        const mat = ex.wet ? SCARF_WET : SCARF;
        return (
          <group>
            <group position={ring} rotation={[0, 0, -rad(lean)]}>
              <mesh geometry={RING} material={mat} rotation={[Math.PI / 2, 0, 0]} scale={[px(24), px(24), px(13)]} castShadow />
            </group>
            {tails.map((pts, i) => (
              <Line3 key={i} pts={pts.map((p, k) => W(p, -0.05 - 0.012 * k - 0.025 * i))} r={px(8)} mat={mat} cast />
            ))}
          </group>
        );
      })()
    : null;

  return (
    <group ref={root}>
      {/* legs: thighs and shins taper, knees and hips are balls */}
      <Seg a={W(j.hip, -zH)} b={W(j.bKnee, -zH)} ra={px(14)} rb={px(12.5)} mat={M.body} />
      <Seg a={W(j.bKnee, -zH)} b={W(j.bFoot, -zH)} ra={px(12.5)} rb={px(10.5)} mat={M.body} />
      {shoe(j.bFoot, j.bShin, -zH)}
      <Seg a={W(j.hip, zH)} b={W(j.aKnee, zH)} ra={px(14)} rb={px(12.5)} mat={M.body} />
      <Seg a={W(j.aKnee, zH)} b={W(j.aFoot, zH)} ra={px(12.5)} rb={px(10.5)} mat={M.body} />
      {shoe(j.aFoot, j.aShin, zH)}
      {/* torso and neck */}
      <Seg a={W(j.hip, 0)} b={W(chest, 0)} ra={px(23)} rb={px(27)} mat={M.body} />
      <Seg a={W(chest, 0)} b={W(j.neck, 0)} ra={px(27)} rb={px(15)} mat={M.body} />
      <Seg a={W(j.neck, 0)} b={W(neckTop, 0)} ra={px(10)} rb={px(9)} mat={M.body} />
      {/* arms */}
      <Seg a={W(j.shoulder, -zS)} b={W(j.bEl, -zS)} ra={px(12)} rb={px(10.5)} mat={M.body} />
      <Seg a={W(j.bEl, -zS)} b={W(j.bHand, -zS)} ra={px(10.5)} rb={px(9.5)} mat={M.body} />
      {hand(j.bHand, j.bForeAng, c.bHand, -zS)}
      <Seg a={W(j.shoulder, zS)} b={W(j.aEl, zS)} ra={px(12)} rb={px(10.5)} mat={M.body} />
      <Seg a={W(j.aEl, zS)} b={W(j.aHand, zS)} ra={px(10.5)} rb={px(9.5)} mat={M.body} />
      {hand(j.aHand, j.aForeAng, c.aHand, zS)}
      {scarf}
      {/* head + face */}
      <group position={W(j.head, 0)} rotation={[0, 0, -rad(tilt)]}>
        <mesh geometry={SPH} material={skin} scale={[R, R * 0.97, R]} castShadow receiveShadow />
        <group rotation={[0, yaw, 0]} scale={[c.facing, 1, 1]}>
          <Face3D e={c.expr} R={R} lookY={c.lookY} blink={c.blink} t={c.t} blush={ex.blush} skin={skin} />
        </group>
      </group>
      {hat}
    </group>
  );
};
