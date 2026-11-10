import React, { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { along, GROUND, HEAD_R, HEAD_SCALE, scarfTailPoints, solve, toWorld } from "../rig/Stickman";
import type { CharState, Expr, Hand } from "../rig/types";
import { NOINK } from "../lib/look3d/ink";
import { Blob, HAT, Line3, PX_PER_M, RING, SCARF, SCARF_WET, Seg, SPH, phys } from "./Stickman3D";

// Dash & Newt as fully 3D cartoon characters (the house look from ep11): chunky, big-headed, soft-lit
// figures like a modern animated feature — skin, real eyeballs, thick brows, spiky hair, clothes and
// chunky sneakers. Driven by the same CharState as every other rig, so POSES, FACES, gaits and Scripts
// from src/rig are shared. No ink outlines: the look comes from light, shadow and depth of field.
//
// `turn` swings the body toward the camera (deg) around the hips: ~35 reads as a 3/4 hero view and is
// the default; 0 is a pure side view (fast walks, pushes, anything where the stride must stay in-plane).
// Supported extras: scarf (+ tails, wet), partyHat, blush, flush, ghost, bubble (gum). Add others here when an episode needs them.

export type Who3D = "dash" | "newt";

type Look = {
  skin: string;
  shirt: string;
  pants: string;
  shorts: boolean;
  sock: string;
  shoe: string;
  sole: string;
  trim: string;
  hair: string;
  iris: string;
  head: number; // head size on top of the rig's HEAD_SCALE (chibi kid = bigger)
  eye: number; // eyeball radius / head radius
  chest: [number, number]; // chest half-depth, half-width (px at scale 1)
  belly: [number, number];
  limb: number; // arm radius (px)
  leg: number; // thigh radius (px)
  shoeLen: number; // px
};

export const LOOKS3D: Record<Who3D, Look> = {
  // Dash: royal-blue tee, dark navy jeans, chunky white sneakers with orange trim, spiky brown hair, orange scarf
  dash: { skin: "#f2b88a", shirt: "#2e6ee6", pants: "#161d36", shorts: false, sock: "#ffffff", shoe: "#f6f5f0", sole: "#3b3f4c", trim: "#ff8a1f", hair: "#4a2b18", iris: "#4d2f1c", head: 1.22, eye: 0.25, chest: [39, 58], belly: [37, 51], limb: 16, leg: 24, shoeLen: 80 },
  // Newt: grass-green tee with a red apple (Newton's), olive shorts, white socks, red sneakers, party hat, blush
  newt: { skin: "#f6c69c", shirt: "#3fb04a", pants: "#5e6838", shorts: true, sock: "#ffffff", shoe: "#e3343a", sole: "#fbfbf6", trim: "#ffffff", hair: "#5b3417", iris: "#5a3a1e", head: 1.62, eye: 0.29, chest: [41, 55], belly: [45, 55], limb: 15, leg: 23, shoeLen: 80 },
};

const rad = (d: number) => (d * Math.PI) / 180;
type P2 = { x: number; y: number };
const lerp2 = (a: P2, b: P2, u: number): P2 => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
const up2 = (o: P2, ang: number, len: number): P2 => ({ x: o.x + Math.sin(rad(ang)) * len, y: o.y - Math.cos(rad(ang)) * len });
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Yax = V(0, 1, 0);
const Zax = V(0, 0, 1);

// ─── Materials (one set per character + flush level, built once) ─────────
const cloth = (c: string) => phys(c, 0.82, 0, { sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(c).lerp(new THREE.Color("#ffffff"), 0.35) });
const skinOf = (c: string) => phys(c, 0.5, 0.08, { sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color("#ffb39a") });
const GHOST = phys("#eef4ff", 0.3, 0.6, { transparent: true, opacity: 0.55, depthWrite: false });
const SHARED = {
  white: phys("#ffffff", 0.12, 1),
  pupil: phys("#0d0a09", 0.1, 1),
  shine: phys("#ffffff", 0.05, 1, { emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.8 }),
  brow: phys("#3a2213", 0.7),
  line: phys("#4a1f15", 0.5),
  mouth: phys("#5a1820", 0.6),
  tongue: phys("#ff6f7d", 0.45, 0.3),
  teeth: phys("#fffdf7", 0.25, 0.5),
  blush: phys("#ff8a9a", 0.8, 0, { transparent: true, opacity: 0.55, depthWrite: false }),
  sweat: phys("#8fd3ff", 0.05, 1, { transparent: true, opacity: 0.85 }),
  vein: phys("#e02424", 0.5),
  apple: phys("#e32b2b", 0.45, 0.4),
  leaf: phys("#2f8a2f", 0.6),
  pompom: phys("#ffd23f", 0.95, 0, { sheen: 1, sheenColor: new THREE.Color("#fff3b0") }),
  gum: phys("#ff8fc8", 0.25, 0.6, { transparent: true, opacity: 0.88 }),
};
type Mats = Record<"skin" | "shirt" | "pants" | "sock" | "shoe" | "sole" | "trim" | "hair" | "iris", THREE.Material>;
const matCache = new Map<string, Mats>();
const matsFor = (who: Who3D, flush: number, ghost: boolean): Mats => {
  const k = Math.round(Math.max(0, Math.min(1, flush)) * 12);
  const key = `${who}|${k}|${ghost}`;
  let m = matCache.get(key);
  if (!m) {
    const L = LOOKS3D[who];
    if (ghost) m = { skin: GHOST, shirt: GHOST, pants: GHOST, sock: GHOST, shoe: GHOST, sole: GHOST, trim: GHOST, hair: GHOST, iris: GHOST };
    else {
      const skin = new THREE.Color(L.skin).lerp(new THREE.Color("#e8473a"), (k / 12) * 0.7);
      m = {
        skin: skinOf(`#${skin.getHexString()}`),
        shirt: cloth(L.shirt),
        pants: cloth(L.pants),
        sock: cloth(L.sock),
        shoe: phys(L.shoe, 0.5, 0.2),
        sole: phys(L.sole, 0.6, 0.1),
        trim: phys(L.trim, 0.5, 0.2),
        hair: phys(L.hair, 0.55, 0.25, { sheen: 0.5, sheenColor: new THREE.Color("#a0704a") }),
        iris: phys(L.iris, 0.2, 1),
      };
    }
    matCache.set(key, m);
  }
  return m;
};

const HAIR_CONE = new THREE.ConeGeometry(1, 1, 24);
const HAT_CONE = new THREE.ConeGeometry(1, 1, 40, 1, false);
const capGeo = new Map<number, THREE.SphereGeometry>();
/** Top cap of a unit sphere down to `u` × 180° (an eyelid when u ≈ 0.5) */
const cap = (u: number) => {
  const k = Math.round(u * 40);
  let g = capGeo.get(k);
  if (!g) {
    g = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, (Math.PI * k) / 40);
    capGeo.set(k, g);
  }
  return g;
};

/** An ellipsoid with its local y axis along `dir` (torso parts follow the spine) */
const Ell: React.FC<{ p: THREE.Vector3; s: [number, number, number]; mat: THREE.Material; dir?: THREE.Vector3 }> = ({ p, s, mat, dir }) => {
  const q = dir ? new THREE.Quaternion().setFromUnitVectors(Yax, dir.clone().normalize()) : new THREE.Quaternion();
  return <mesh geometry={SPH} material={mat} position={p} quaternion={q} scale={s} castShadow receiveShadow />;
};

// ─── Head surface: head ellipsoid ∪ a fuller jaw/cheek ellipsoid (face coords in head radii, y up) ──
type Ellipsoid = { c: THREE.Vector3; r: THREE.Vector3 };
const HEAD_E: Ellipsoid = { c: V(0, 0, 0), r: V(1.02, 0.97, 0.98) };
const JAW_E: Ellipsoid = { c: V(0, -0.3, 0.12), r: V(0.88, 0.66, 0.86) };
const hitFar = (d: THREE.Vector3, e: Ellipsoid) => {
  const o = e.c.clone().multiplyScalar(-1).divide(e.r);
  const dd = d.clone().divide(e.r);
  const A = dd.dot(dd);
  const B = 2 * o.dot(dd);
  const C = o.dot(o) - 1;
  const disc = B * B - 4 * A * C;
  return disc < 0 ? 0 : (-B + Math.sqrt(disc)) / (2 * A);
};
/** Point on the head surface at face coords (x, y) and its outward normal, in head radii */
const surf = (x: number, y: number) => {
  const d = V(x, y, Math.sqrt(Math.max(0.03, 1 - x * x - y * y))).normalize();
  const th = hitFar(d, HEAD_E);
  const tj = hitFar(d, JAW_E);
  const e = tj > th ? JAW_E : HEAD_E;
  const p = d.multiplyScalar(Math.max(th, tj));
  const n = p.clone().sub(e.c).divide(e.r).divide(e.r).normalize();
  return { p, n };
};

const Face: React.FC<{ e: Expr; R: number; look: Look; m: Mats; lookY: number; blink: number; t: number; blush?: boolean; ghost: boolean }> = ({ e, R, look, m, lookY, blink, t, blush, ghost }) => {
  const at = (x: number, y: number, lift = 0) => {
    const s = surf(x, y);
    return s.p.clone().add(s.n.clone().multiplyScalar(lift)).multiplyScalar(R);
  };
  const nrm = (x: number, y: number) => surf(x, y).n;
  const pts = (xy: number[][], lift = 0.012) => xy.map(([x, y]) => at(x, y, lift));
  const bez = (p0: number[], c: number[], p1: number[], n = 9) =>
    pts([...Array(n)].map((_, i) => {
      const s = i / (n - 1);
      return [0, 1].map((k) => (1 - s) * (1 - s) * p0[k] + 2 * (1 - s) * s * c[k] + s * s * p1[k]);
    }));
  const W = ghost ? GHOST : SHARED.white;
  const LW = 0.045 * R;
  const out: React.ReactNode[] = [];

  // eyes
  const EX = 0.36;
  const EY = 0.1;
  const re0 = look.eye * R;
  const kind = blink > 0.5 && (e.eyes === "dot" || e.eyes === "wide" || e.eyes === "half") ? "closed" : e.eyes;
  [-1, 1].forEach((side, i) => {
    const ex = side * EX;
    const k = `e${i}`;
    if (kind === "dot" || kind === "wide" || kind === "half") {
      const re = re0 * (kind === "wide" ? 1.12 : 1);
      const n = nrm(ex, EY);
      const c = at(ex, EY).sub(n.clone().multiplyScalar(re * 0.42));
      const q = new THREE.Quaternion().setFromUnitVectors(Zax, n);
      // gaze: out of the face, a touch inward, up/down with lookY
      const g = V(-side * 0.08, -lookY * 0.4 + 0.03, 1).normalize();
      const gq = new THREE.Quaternion().setFromUnitVectors(Zax, g);
      const iris = re * (kind === "wide" ? 0.5 : 0.6);
      const pupil = iris * 0.56 * (e.pupil ?? 1);
      out.push(<mesh key={k} geometry={SPH} material={W} position={c} quaternion={q} scale={[re * 0.92, re * 1.08, re]} castShadow />);
      if (!ghost) {
        out.push(<mesh key={`${k}i`} geometry={SPH} material={m.iris} position={c.clone().add(g.clone().multiplyScalar(re * 0.86))} quaternion={gq} scale={[iris, iris * 1.06, iris * 0.32]} />);
        out.push(<mesh key={`${k}p`} geometry={SPH} material={SHARED.pupil} position={c.clone().add(g.clone().multiplyScalar(re * 0.92))} quaternion={gq} scale={[pupil, pupil * 1.06, pupil * 0.3]} />);
        out.push(<mesh key={`${k}s`} geometry={SPH} material={SHARED.shine} position={c.clone().add(g.clone().multiplyScalar(re * 0.98)).add(V(-iris * 0.38, iris * 0.42, 0))} scale={iris * 0.24} />);
        out.push(<mesh key={`${k}s2`} geometry={SPH} material={SHARED.shine} position={c.clone().add(g.clone().multiplyScalar(re * 0.97)).add(V(iris * 0.3, -iris * 0.32, 0))} scale={iris * 0.1} />);
      }
      const lid = kind === "half" ? 0.52 : 0.16 + (kind === "dot" ? Math.min(0.3, blink * 0.6) : 0);
      if (kind !== "wide") out.push(<mesh key={`${k}l`} geometry={cap(lid)} material={m.skin} position={c} scale={[re * 0.97, re * 1.12, re * 1.05]} />);
    } else {
      const y = EY;
      switch (kind) {
        case "happy":
          out.push(<Line3 key={k} pts={bez([ex - 0.17, y - 0.04], [ex, y + 0.2], [ex + 0.17, y - 0.04])} r={LW} mat={SHARED.brow} />);
          break;
        case "closed":
          out.push(<Line3 key={k} pts={bez([ex - 0.17, y], [ex, y - 0.13], [ex + 0.17, y])} r={LW} mat={SHARED.brow} />);
          break;
        case "x":
          out.push(<Line3 key={k} pts={pts([[ex - 0.14, y + 0.14], [ex + 0.14, y - 0.14]])} r={LW} mat={SHARED.brow} />);
          out.push(<Line3 key={`${k}b`} pts={pts([[ex + 0.14, y + 0.14], [ex - 0.14, y - 0.14]])} r={LW} mat={SHARED.brow} />);
          break;
        case "squeeze":
          out.push(<Line3 key={k} pts={pts([[ex - 0.15 * side, y + 0.14], [ex + 0.13 * side, y], [ex - 0.15 * side, y - 0.14]])} r={LW} mat={SHARED.brow} />);
          break;
        case "spiral": {
          const sp: number[][] = [];
          for (let s = 0; s <= 22; s++) {
            const a = s * 0.6 + t * 9 * (i ? 1 : -1);
            sp.push([ex + Math.cos(a) * s * 0.0075, y + Math.sin(a) * s * 0.0075]);
          }
          out.push(<Line3 key={k} pts={pts(sp)} r={LW * 0.8} mat={SHARED.brow} />);
          break;
        }
      }
    }
    // brows: thick and expressive
    if (e.eyes !== "spiral") {
      const inner = -side; // toward the nose
      const raise = e.brow + (i === 1 ? (e.browAsym ?? 0) : 0);
      const by = EY + look.eye * (kind === "wide" ? 1.2 : 1.08) + 0.08 + raise * 0.06;
      const a = (e.browAng ?? 0) * 0.07;
      out.push(<Line3 key={`b${i}`} pts={bez([ex + inner * 0.17, by - a], [ex, by + 0.04], [ex - inner * 0.17, by + a * 0.4])} r={LW * 1.45} mat={ghost ? GHOST : SHARED.brow} cast />);
    }
  });

  // nose: a soft button
  const nz = surf(0, -0.14);
  out.push(<Blob key="nose" p={nz.p.clone().add(nz.n.clone().multiplyScalar(0.03)).multiplyScalar(R)} s={[0.13 * R, 0.11 * R, 0.12 * R]} mat={m.skin} dir={nz.n} />);

  // mouth (on the jaw)
  const MY = -0.45;
  const cav = (cx: number, cy: number, sx: number, sy: number, key: string, mat: THREE.Material = SHARED.mouth, lift = -0.02, sz = 0.07) => {
    const s = surf(cx, cy);
    return <Blob key={key} p={s.p.clone().add(s.n.clone().multiplyScalar(lift)).multiplyScalar(R)} s={[sx * R, sy * R, sz * R]} mat={ghost ? GHOST : mat} dir={s.n} />;
  };
  const LM = ghost ? GHOST : SHARED.line;
  switch (e.mouth) {
    case "smile":
      out.push(<Line3 key="m" pts={bez([-0.22, MY + 0.06], [0, MY - 0.16], [0.22, MY + 0.06])} r={LW} mat={LM} />);
      break;
    case "sadSmile":
      out.push(<Line3 key="m" pts={bez([-0.18, MY], [0, MY - 0.07], [0.18, MY])} r={LW} mat={LM} />);
      break;
    case "frown":
      out.push(<Line3 key="m" pts={bez([-0.2, MY - 0.09], [0, MY + 0.09], [0.2, MY - 0.09])} r={LW} mat={LM} />);
      break;
    case "flat":
      out.push(<Line3 key="m" pts={pts([[-0.17, MY], [0, MY - 0.005], [0.17, MY]])} r={LW} mat={LM} />);
      break;
    case "tiny":
      out.push(<Line3 key="m" pts={pts([[-0.07, MY], [0.07, MY]])} r={LW} mat={LM} />);
      break;
    case "smirk":
      out.push(<Line3 key="m" pts={bez([-0.18, MY - 0.02], [0.05, MY - 0.1], [0.22, MY + 0.08])} r={LW} mat={LM} />);
      break;
    case "wavy":
      out.push(<Line3 key="m" pts={pts([[-0.24, MY], [-0.15, MY + 0.05], [-0.06, MY], [0.03, MY + 0.05], [0.12, MY], [0.21, MY + 0.05]])} r={LW * 0.85} mat={LM} />);
      break;
    case "grin": // the big open D smile: upper teeth, tongue
      out.push(cav(0, MY - 0.03, 0.34, 0.2, "m"));
      out.push(cav(0, MY + 0.08, 0.27, 0.06, "mt", SHARED.teeth, 0.0, 0.05));
      out.push(cav(0, MY - 0.13, 0.17, 0.08, "mg", SHARED.tongue, 0.0, 0.05));
      break;
    case "laugh":
      out.push(cav(0, MY - 0.05, 0.34, 0.26, "m"));
      out.push(cav(0, MY + 0.11, 0.26, 0.06, "mt", SHARED.teeth, 0.0, 0.05));
      out.push(cav(0, MY - 0.18, 0.19, 0.1, "mg", SHARED.tongue, 0.0, 0.05));
      break;
    case "o":
      out.push(cav(0, MY, 0.09, 0.11, "m"));
      break;
    case "O":
      out.push(cav(0, MY - 0.05, 0.17, 0.25, "m"));
      out.push(cav(0, MY - 0.2, 0.11, 0.07, "mg", SHARED.tongue, 0.0, 0.05));
      out.push(cav(0, MY + 0.13, 0.12, 0.04, "mt", SHARED.teeth, 0.0, 0.04));
      break;
    case "teeth": // clenched: a white bar with tooth lines
      out.push(cav(0, MY, 0.33, 0.15, "mo"));
      out.push(cav(0, MY, 0.3, 0.12, "m", SHARED.teeth, 0.0, 0.06));
      out.push(<Line3 key="m1" pts={pts([[-0.28, MY], [0, MY - 0.01], [0.28, MY]], 0.04)} r={LW * 0.45} mat={LM} />);
      [-0.15, 0, 0.15].forEach((o) => out.push(<Line3 key={`t${o}`} pts={pts([[o, MY + 0.1], [o, MY - 0.1]], 0.04)} r={LW * 0.4} mat={LM} />));
      break;
    case "whistle":
      out.push(cav(0.08, MY, 0.07, 0.07, "m"));
      break;
  }
  if (blush) [-1, 1].forEach((s) => out.push(cav(s * 0.55, -0.3, 0.17, 0.1, `bl${s}`, SHARED.blush, 0.004, 0.02)));
  if (e.sweat) out.push(<Blob key="sw" p={at(0.78, 0.5 - ((t * 0.9) % 0.25), 0.06)} s={[0.08 * R, 0.12 * R, 0.07 * R]} mat={SHARED.sweat} />);
  if (e.tear) out.push(<Blob key="tr" p={at(-0.38, -0.1 - ((t * 0.5) % 0.3), 0.04)} s={[0.07 * R, 0.1 * R, 0.06 * R]} mat={SHARED.sweat} />);
  if (e.vein) {
    const s = 1 + 0.15 * Math.sin(t * 30);
    const c = [-0.58, 0.62];
    [[[-0.18, 0.06], [-0.06, 0.06], [-0.06, 0.18]], [[0.06, 0.18], [0.06, 0.06], [0.18, 0.06]], [[0.18, -0.06], [0.06, -0.06], [0.06, -0.18]], [[-0.06, -0.18], [-0.06, -0.06], [-0.18, -0.06]]].forEach((seg, k) =>
      out.push(<Line3 key={`v${k}`} pts={pts(seg.map(([x, y]) => [c[0] + x * s * 0.6, c[1] + y * s * 0.6]), 0.03)} r={LW * 0.8} mat={SHARED.vein} />),
    );
  }
  return <group>{out}</group>;
};

// ─── Hair: a cap plus spikes, all in head radii ───────────────────────────
// [azimuth from the face (deg, + = toward the character's left), elevation (deg), length, base radius]
const DASH_SPIKES: number[][] = [
  [-30, 30, 0.42, 0.2], [5, 34, 0.48, 0.22], [38, 28, 0.4, 0.19], // fringe, up and forward
  [-60, 62, 0.58, 0.24], [-8, 72, 0.66, 0.26], [50, 64, 0.6, 0.24], // crown
  [-120, 52, 0.58, 0.25], [180, 55, 0.62, 0.26], [120, 50, 0.56, 0.24], // back of the crown
  [-95, 22, 0.42, 0.2], [95, 22, 0.42, 0.2], [-150, 18, 0.44, 0.22], [150, 18, 0.44, 0.22], [180, 8, 0.4, 0.22], // sides, nape
];
const NEWT_SPIKES: number[][] = [
  [-36, 10, 0.3, 0.2], [0, 14, 0.34, 0.22], [36, 10, 0.3, 0.2], [-66, 12, 0.3, 0.2], [66, 12, 0.3, 0.2], // fringe under the hat
  [-90, 18, 0.32, 0.18], [90, 18, 0.32, 0.18], [-140, 20, 0.34, 0.2], [140, 20, 0.34, 0.2], [180, 12, 0.3, 0.2],
];
const Hair: React.FC<{ R: number; who: Who3D; mat: THREE.Material }> = ({ R, who, mat }) => {
  const dash = who === "dash";
  const cc = V(0, dash ? 0.22 : 0.2, dash ? -0.06 : -0.02).multiplyScalar(R);
  const cr = (dash ? V(1.05, 0.9, 1.03) : V(1.05, 0.9, 1.04)).multiplyScalar(R);
  const spikes = (dash ? DASH_SPIKES : NEWT_SPIKES).map(([az, el, len, r], k) => {
    const a = rad(az);
    const e = rad(el);
    const d = V(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
    // a point on the cap's surface along d, sunk a little so the spike grows out of it
    const base = cc.clone().add(d.clone().multiply(cr).multiplyScalar(0.84));
    const axis = d.clone().add(V(0, 0.35, 0)).normalize();
    const L = len * R;
    const mid = base.clone().add(axis.clone().multiplyScalar(L * 0.5));
    return <mesh key={k} geometry={HAIR_CONE} material={mat} position={mid} quaternion={new THREE.Quaternion().setFromUnitVectors(Yax, axis)} scale={[r * R, L, r * R * 0.8]} castShadow />;
  });
  return (
    <group>
      <mesh geometry={SPH} material={mat} position={cc} scale={cr} castShadow />
      {spikes}
    </group>
  );
};

// ─── Hands: cartoon four-finger hands ─────────────────────────────────────
const HandMesh: React.FC<{ at: THREE.Vector3; dir: THREE.Vector3; kind: Hand; u: (n: number) => number; skin: THREE.Material; side: number }> = ({ at, dir, kind, u, skin, side }) => {
  if (kind === "none") return null;
  const d = dir.clone().normalize();
  const z = Zax.clone().multiplyScalar(side); // toward the camera for the near hand
  const n = d.clone().cross(Zax).normalize(); // palm normal (in the side plane)
  const palm = at.clone().add(d.clone().multiplyScalar(u(9)));
  const thumbBase = palm.clone().add(z.clone().multiplyScalar(u(9))).add(n.clone().multiplyScalar(-u(3)));
  if (kind === "open") {
    const fingers = [-1.5, -0.5, 0.5, 1.5].map((k, i) => {
      const base = palm.clone().add(d.clone().multiplyScalar(u(9))).add(Zax.clone().multiplyScalar(k * u(5.2)));
      const fd = d.clone().applyAxisAngle(n, k * 0.16).normalize();
      return <Seg key={i} a={base} b={base.clone().add(fd.multiplyScalar(u(i === 0 || i === 3 ? 12 : 14)))} ra={u(4.4)} rb={u(4)} mat={skin} />;
    });
    return (
      <group>
        <Blob p={palm} s={[u(16), u(7), u(13)]} mat={skin} dir={d} />
        {fingers}
        <Seg a={thumbBase} b={thumbBase.clone().add(d.clone().multiplyScalar(u(7))).add(z.clone().multiplyScalar(u(8)))} ra={u(5)} rb={u(4.4)} mat={skin} />
      </group>
    );
  }
  return (
    <group>
      <Blob p={palm} s={[u(15), u(14), u(15)]} mat={skin} dir={d} />
      {/* knuckles */}
      {[-1, 0, 1].map((k) => (
        <Blob key={k} p={palm.clone().add(d.clone().multiplyScalar(u(10))).add(Zax.clone().multiplyScalar(k * u(6)))} s={[u(5), u(5.5), u(5)]} mat={skin} />
      ))}
      {kind === "point" ? <Seg a={palm.clone().add(d.clone().multiplyScalar(u(8)))} b={palm.clone().add(d.clone().multiplyScalar(u(26)))} ra={u(4.6)} rb={u(4.2)} mat={skin} /> : null}
      {kind === "thumb" ? (
        <Seg a={palm.clone().add(V(0, u(6), 0))} b={palm.clone().add(V(0, u(22), 0))} ra={u(5.4)} rb={u(4.8)} mat={skin} />
      ) : (
        <Seg a={thumbBase} b={thumbBase.clone().add(d.clone().multiplyScalar(u(8)))} ra={u(5.2)} rb={u(4.6)} mat={skin} />
      )}
    </group>
  );
};

// ─── The character ────────────────────────────────────────────────────────
export const Toon3D: React.FC<{ who: Who3D; c: CharState; turn?: number }> = ({ who, c, turn = 35 }) => {
  const root = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    root.current?.traverse((o) => o.layers.set(NOINK));
  });
  const L = LOOKS3D[who];
  const ex = c.extras;
  const ghost = !!ex.ghost;
  const m = matsFor(who, ex.flush ?? 0, ghost);
  const j = solve(c.pose, c.aLen ?? 1);
  const s = c.scale;
  const u = (n: number) => (n * s) / PX_PER_M;
  const f = c.facing;
  const Wd = (p: P2, z: number) => {
    const q = toWorld(c, p);
    return V(q.x / PX_PER_M, (GROUND - q.y) / PX_PER_M, z);
  };
  const pivot = Wd(j.hip, 0).setY(0);
  // body-frame point: world minus the pivot (the group below adds it back and turns the body)
  const Q = (p: P2, z: number) => Wd(p, z).sub(pivot);
  const zS = u(L.chest[1] - 7); // shoulder half-width
  const zH = u(27); // hip half-width
  const R = u(HEAD_R * HEAD_SCALE * L.head);
  const hu = (n: number) => u(n * 1.4); // big cartoon hands

  // torso: belly + chest ellipsoids along the spine, pants pelvis below
  const spine = Q(j.neck, 0).sub(Q(j.hip, 0));
  const spLen = spine.length();
  const chest = Q(lerp2(j.hip, j.neck, 0.64), 0);
  const belly = Q(lerp2(j.hip, j.neck, 0.3), 0);
  const pelvis = Q(lerp2(j.hip, j.neck, 0.06), 0);
  const fwd = V(f, 0, 0);

  // head: on the neck, bigger than the rig's so the face carries the shot
  const headAng = j.headAng;
  const neckTop = up2(j.neck, headAng, 8);
  const headC2 = up2(neckTop, headAng, (R / s) * PX_PER_M * 0.86);
  const tilt = f * headAng + (c.rot ?? 0);
  const faceYaw = f * (0.12 + 0.5 * c.faceX + rad(turn));

  const limb = (a: THREE.Vector3, b: THREE.Vector3, ra: number, rb: number, mat: THREE.Material) => <Seg a={a} b={b} ra={u(ra)} rb={u(rb)} mat={mat} />;

  const arm = (sh: P2, el: P2, hand: P2, fore: number, kind: Hand, z: number) => {
    const S = Q(sh, z);
    const E = Q(el, z);
    const H = Q(hand, z);
    const sleeve = S.clone().lerp(E, 0.55);
    return (
      <group>
        <Ell p={S} s={[u(L.limb + 5), u(L.limb + 5), u(L.limb + 5)]} mat={m.shirt} />
        {limb(S, sleeve, L.limb + 4, L.limb + 3.5, m.shirt)}
        {limb(S.clone().lerp(E, 0.4), E, L.limb - 1, L.limb - 1.5, m.skin)}
        {limb(E, H, L.limb - 1.5, L.limb - 3, m.skin)}
        <HandMesh at={H} dir={Q(along(hand, fore, 10), z).sub(H)} kind={kind} u={hu} skin={m.skin} side={Math.sign(z) || 1} />
      </group>
    );
  };

  const leg = (knee: P2, foot: P2, shin: number, z: number) => {
    const Hp = Q(j.hip, z);
    const K = Q(knee, z);
    const F = Q(foot, z);
    const toeDir2 = shin + 90 + (foot.y > -4 ? -shin * 0.8 : 0);
    const T = Q(along(foot, toeDir2, 22), z);
    const dir = T.clone().sub(F).normalize();
    const upV = V(-dir.y, dir.x, 0).multiplyScalar(Math.sign(dir.x) || 1); // perpendicular to the sole, upward
    const len = u(L.shoeLen);
    const k = L.shoeLen / 64;
    const w = (n: number) => u(n * k);
    const at = (k: number, h: number) => F.clone().add(dir.clone().multiplyScalar(len * k - u(18))).add(upV.clone().multiplyScalar(u(h)));
    const shoe = (
      <group>
        <Blob p={at(0.42, 14 * k)} s={[w(19), w(15), len * 0.5]} mat={m.shoe} dir={dir} />
        <Blob p={at(0.42, 4 * k)} s={[w(21), w(7), len * 0.56]} mat={m.sole} dir={dir} />
        <Blob p={at(0.8, 8 * k)} s={[w(17.5), w(10.5), w(15)]} mat={m.sole} dir={dir} />
        <Blob p={at(0.38, 10 * k)} s={[w(19.7), w(3.6), len * 0.36]} mat={m.trim} dir={dir} />
        <Blob p={at(0.14, 23 * k)} s={[w(16), w(10), w(14)]} mat={m.shoe} dir={dir} />
      </group>
    );
    if (L.shorts) {
      const hem = Hp.clone().lerp(K, 0.82);
      const sock = K.clone().lerp(F, 0.68);
      return (
        <group>
          {limb(Hp, hem, L.leg + 2, L.leg + 1, m.pants)}
          {limb(hem, K, L.leg - 8, L.leg - 8.5, m.skin)}
          {limb(K, sock, L.leg - 8.5, L.leg - 9.5, m.skin)}
          {limb(sock, F, L.leg - 8.5, L.leg - 9, m.sock)}
          {shoe}
        </group>
      );
    }
    return (
      <group>
        {limb(Hp, K, L.leg, L.leg - 2, m.pants)}
        {limb(K, F, L.leg - 2, L.leg - 3, m.pants)}
        <Blob p={F.clone().add(V(0, u(7), 0))} s={[u(L.leg - 1), u(6), u(L.leg - 1)]} mat={m.pants} />
        {shoe}
      </group>
    );
  };

  const scarf = ex.scarf
    ? (() => {
        const ring = Q({ x: j.neck.x, y: j.neck.y + 6 }, 0);
        const lean = f * c.pose.lean + (c.rot ?? 0);
        const tails = ex.scarfTails !== false ? scarfTailPoints(j, c.t, c.speed, ex.wet) : [];
        const mat = ghost ? GHOST : ex.wet ? SCARF_WET : SCARF;
        return (
          <group>
            <group position={ring} rotation={[0, 0, -rad(lean)]}>
              <mesh geometry={RING} material={mat} rotation={[Math.PI / 2, 0, 0]} scale={[u(36), u(36), u(19)]} castShadow />
            </group>
            {/* the knot and a short end on the chest, camera side: the scarf reads from the front too */}
            <Blob p={ring.clone().add(V(f * u(26), -u(6), u(20)))} s={[u(15), u(13), u(13)]} mat={mat} />
            <Seg a={ring.clone().add(V(f * u(26), -u(12), u(24)))} b={ring.clone().add(V(f * u(22), -u(46), u(40)))} ra={u(12)} rb={u(15)} mat={mat} />
            {tails.map((pts, i) => (
              <Line3 key={i} pts={pts.map((p, k) => Q(p, -0.04 - 0.012 * k - 0.025 * i))} r={u(11)} mat={mat} cast />
            ))}
          </group>
        );
      })()
    : null;

  const apple =
    who === "newt" && !ghost ? (
      <group>
        <Blob p={chest.clone().add(fwd.clone().multiplyScalar(u(L.chest[0] * 0.86))).add(V(0, -u(4), u(16)))} s={[u(10), u(9.5), u(5)]} mat={SHARED.apple} dir={V(f, 0, 0.55)} />
        <Blob p={chest.clone().add(fwd.clone().multiplyScalar(u(L.chest[0] * 0.84))).add(V(f * u(3), u(8), u(17)))} s={[u(5), u(2.5), u(2)]} mat={SHARED.leaf} dir={V(f, 0, 0.55)} />
      </group>
    ) : null;

  return (
    <group ref={root} position={pivot}>
      <group rotation={[0, -f * rad(turn), 0]}>
        {/* far side first (draw order is irrelevant in 3D; kept for reading) */}
        {leg(j.bKnee, j.bFoot, j.bShin, -zH)}
        {leg(j.aKnee, j.aFoot, j.aShin, zH)}
        <Ell p={pelvis} s={[u(L.belly[0] + 1), u(30), u(L.belly[1] + 1)]} mat={m.pants} dir={spine} />
        <Ell p={belly} s={[u(L.belly[0]), spLen * 0.34, u(L.belly[1])]} mat={m.shirt} dir={spine} />
        <Ell p={chest} s={[u(L.chest[0]), spLen * 0.4, u(L.chest[1])]} mat={m.shirt} dir={spine} />
        {limb(Q(lerp2(j.hip, j.neck, 0.92), 0), Q(neckTop, 0), 16, 15, m.skin)}
        {arm(j.shoulder, j.bEl, j.bHand, j.bForeAng, c.bHand, -zS)}
        {arm(j.shoulder, j.aEl, j.aHand, j.aForeAng, c.aHand, zS)}
        {apple}
        {scarf}
        <group position={Q(headC2, 0)} rotation={[0, 0, -rad(tilt)]}>
          <group rotation={[0, faceYaw, 0]} scale={[f, 1, 1]}>
            <mesh geometry={SPH} material={m.skin} scale={HEAD_E.r.clone().multiplyScalar(R)} castShadow receiveShadow />
            <mesh geometry={SPH} material={m.skin} position={JAW_E.c.clone().multiplyScalar(R)} scale={JAW_E.r.clone().multiplyScalar(R)} castShadow receiveShadow />
            {[-1, 1].map((sd) => (
              <group key={sd}>
                <Blob p={V(sd * 0.98 * R, -0.08 * R, -0.06 * R)} s={[0.13 * R, 0.24 * R, 0.17 * R]} mat={m.skin} dir={V(sd, 0, 0.3)} />
                <Blob p={V(sd * 1.02 * R, -0.08 * R, -0.03 * R)} s={[0.07 * R, 0.14 * R, 0.09 * R]} mat={ghost ? GHOST : SHARED.blush} dir={V(sd, 0, 0.3)} />
              </group>
            ))}
            <Face e={c.expr} R={R} look={L} m={m} lookY={c.lookY} blink={c.blink} t={c.t} blush={ex.blush} ghost={ghost} />
            {ex.bubble && ex.bubble > 0.02 && !ghost ? (
              <mesh geometry={SPH} material={SHARED.gum} position={surf(0.02, -0.44).p.multiplyScalar(R).add(V(0, 0, (0.08 + 0.42 * ex.bubble) * R))} scale={(0.07 + 0.42 * ex.bubble) * R} />
            ) : null}
            <Hair R={R} who={who} mat={m.hair} />
            {ex.partyHat ? (
              <group position={V(-0.05 * R, 0.86 * R, -0.12 * R)} rotation={[-0.12, 0, 0.16]}>
                <mesh geometry={HAT_CONE} material={ghost ? GHOST : HAT} position={V(0, 0.62 * R, 0)} scale={[0.44 * R, 1.24 * R, 0.44 * R]} castShadow />
                <mesh geometry={SPH} material={ghost ? GHOST : SHARED.pompom} position={V(0, 1.28 * R, 0)} scale={0.15 * R} castShadow />
              </group>
            ) : null}
            {ghost ? (
              <mesh position={V(0, 1.45 * R, 0)} rotation={[Math.PI / 2, 0, 0]} scale={[0.5 * R, 0.5 * R, 0.5 * R]}>
                <torusGeometry args={[1, 0.12, 12, 40]} />
                <meshStandardMaterial color="#ffd23f" emissive="#ffc400" emissiveIntensity={1.2} />
              </mesh>
            ) : null}
          </group>
        </group>
      </group>
    </group>
  );
};
