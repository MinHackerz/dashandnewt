import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { continueRender, delayRender } from "remotion";

// Building blocks for the 3D rig and 3D props: two-tone toon shading, ink outlines as
// inverted hulls (a slightly bigger black copy, back faces only), unit rods and balls.

export const TOON_STEPS = (() => {
  const data = new Uint8Array([150, 150, 150, 255, 210, 210, 210, 255, 255, 255, 255, 255]); // soft shade side: faces stay readable
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

const mats = new Map<string, THREE.MeshStandardMaterial>();
/** Shared lit material per colour (+ optional opacity for glass); named for history, now physically lit */
export const toonMat = (color: string, opacity = 1) => {
  const key = `${color}|${opacity}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.5, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
    mats.set(key, m);
  }
  return m;
};

// props get their outlines from the world ink pass now; the hulls stay off
export const INK_HULL = new THREE.MeshBasicMaterial({ color: "#0b0a0c", side: THREE.BackSide, visible: false });
export const INK_W = 0.0065; // m of outline around every part

const CYL = new THREE.CylinderGeometry(1, 1, 1, 18, 1, true);
const SPH = new THREE.SphereGeometry(1, 28, 18);
const Y = new THREE.Vector3(0, 1, 0);

export type V = THREE.Vector3;

/** A round rod (limb, handle) from a to b, radius r, capped with balls so joints read as capsules */
export const Rod: React.FC<{ a: V; b: V; r: number; color: string; ink?: boolean; caps?: boolean; shadow?: boolean }> = ({ a, b, r, color, ink = true, caps = true, shadow = true }) => {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = Math.max(1e-4, d.length());
  const q = new THREE.Quaternion().setFromUnitVectors(Y, d.normalize());
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  return (
    <group>
      <mesh geometry={CYL} material={toonMat(color)} position={mid} quaternion={q} scale={[r, len, r]} castShadow={shadow} />
      {ink ? <mesh geometry={CYL} material={INK_HULL} position={mid} quaternion={q} scale={[r + INK_W, len, r + INK_W]} /> : null}
      {caps ? <Ball at={a} r={r} color={color} ink={ink} shadow={shadow} /> : null}
      {caps ? <Ball at={b} r={r} color={color} ink={ink} shadow={shadow} /> : null}
    </group>
  );
};

export const Ball: React.FC<{ at: V; r: number; color: string; ink?: boolean; scale?: [number, number, number]; shadow?: boolean }> = ({ at, r, color, ink = true, scale = [1, 1, 1], shadow = true }) => (
  <group position={at}>
    <mesh geometry={SPH} material={toonMat(color)} scale={[r * scale[0], r * scale[1], r * scale[2]]} castShadow={shadow} />
    {ink ? <mesh geometry={SPH} material={INK_HULL} scale={[r * scale[0] + INK_W, r * scale[1] + INK_W, r * scale[2] + INK_W]} /> : null}
  </group>
);

/** A tube through points (scarf tails): rebuilt when the points change, disposed after */
export const Tube: React.FC<{ pts: V[]; r: number; color: string }> = ({ pts, r, color }) => {
  const key = pts.map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`).join(";");
  const geos = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(pts);
    return [new THREE.TubeGeometry(curve, 24, r, 10, false), new THREE.TubeGeometry(curve, 24, r + INK_W, 10, false)];
  }, [key, r]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
  return (
    <group>
      <mesh geometry={geos[0]} material={toonMat(color)} castShadow />
      <mesh geometry={geos[1]} material={INK_HULL} />
      <Ball at={pts[pts.length - 1]} r={r} color={color} />
    </group>
  );
};

// ─── SVG → texture (faces, labels): decoded off-thread, so a frame waits for it ──
const imgCache = new Map<string, HTMLImageElement>();

/** A canvas texture showing `svg` (a complete <svg> string). The first time a given string is
 *  seen, the frame is held (delayRender) until it has decoded, then R3F is advanced again. */
export const useSvgTexture = (svg: string, size = 512) => {
  const { advance } = useThree();
  const state = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return { canvas, tex, g: canvas.getContext("2d")! };
  }, [size]);
  const shown = useRef("");
  const draw = (img: HTMLImageElement) => {
    state.g.clearRect(0, 0, size, size);
    state.g.drawImage(img, 0, 0, size, size);
    state.tex.needsUpdate = true;
  };
  const cached = imgCache.get(svg);
  if (cached && shown.current !== svg) {
    draw(cached);
    shown.current = svg;
  }
  useEffect(() => {
    if (shown.current === svg) return;
    const handle = delayRender("svg texture");
    const img = new Image();
    img.onload = () => {
      imgCache.set(svg, img);
      draw(img);
      shown.current = svg;
      advance(performance.now());
      continueRender(handle);
    };
    img.onerror = () => continueRender(handle);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [svg]); // eslint-disable-line react-hooks/exhaustive-deps
  return state.tex;
};
