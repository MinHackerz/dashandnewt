import React, { useMemo } from "react";
import * as THREE from "three";
import { BOX, Building, Bush, canvasTex, Cloud, Ground, LampPost, Palm, Rock, RoundTree, speckle, SPH, std } from "./kit";

// Ready-made outdoor sets in the house 3D look. The action plane (z = 0) runs left–right through the
// middle of each set; the cast stands on y = 0. `x0` is the set's centre in metres (default: the
// middle of a 1080 px frame at zoom 1 = 2.25 m). Episodes add their own props as children of the Stage.

export type SetName = "beach" | "park" | "street" | "studio";
export type SkyLook = { top: string; horizon: string; fog: string };
export const SKIES: Record<SetName, SkyLook> = {
  beach: { top: "#0f63d6", horizon: "#9fdcff", fog: "#bfe6ff" },
  park: { top: "#1569da", horizon: "#a8dcff", fog: "#c4e6ff" },
  street: { top: "#1a6fd8", horizon: "#b4e0ff", fog: "#cfe8ff" },
  studio: { top: "#8cc8ff", horizon: "#e6f4ff", fog: "#eef7ff" },
};

const X0 = 2.25;

/** A rectangular hole in the ground (metres), e.g. for a rock pool sunk into the sand */
export type Hole = { x0: number; x1: number; z0: number; z1: number };
export type SetProps = { x0?: number; hole?: Hole };

/** Ground from z0 back to z1, leaving `hole` open */
const HoledGround: React.FC<{ x0: number; z0: number; z1: number; w?: number; mat: THREE.Material; tile: number; hole?: Hole }> = ({ x0, z0, z1, w = 160, mat, tile, hole }) => {
  if (!hole) return <Ground x0={x0} z0={z0} z1={z1} w={w} mat={mat} tile={tile} />;
  const L = x0 - w / 2;
  const R = x0 + w / 2;
  return (
    <group>
      <Ground x0={x0} z0={z0} z1={hole.z1} w={w} mat={mat} tile={tile} />
      <Ground x0={x0} z0={hole.z0} z1={z1} w={w} mat={mat} tile={tile} />
      <Ground x0={(L + hole.x0) / 2} z0={hole.z1} z1={hole.z0} w={hole.x0 - L} mat={mat} tile={tile} />
      <Ground x0={(hole.x1 + R) / 2} z0={hole.z1} z1={hole.z0} w={R - hole.x1} mat={mat} tile={tile} />
    </group>
  );
};

const SkyClouds: React.FC<{ x0: number; seed: number }> = ({ x0, seed }) => (
  <group>
    <Cloud at={[x0 - 16, 13, -70]} size={6} seed={seed} />
    <Cloud at={[x0 + 14, 17, -80]} size={7.5} seed={seed + 1} />
    <Cloud at={[x0 + 2, 23, -95]} size={8} seed={seed + 2} />
    <Cloud at={[x0 - 30, 9, -90]} size={7} seed={seed + 3} />
    <Cloud at={[x0 + 34, 10, -85]} size={6.5} seed={seed + 4} />
  </group>
);

// ─── Beach: sand, turquoise sea with foam and sparkles, palms, far islands ──
const SAND = std("#ffffff", 1, { map: speckle("#efcf94", "#d9b377", "#ffefc9", 900, 7, 11, 1) });
const WET_SAND = std("#ffffff", 0.55, { map: speckle("#d8b47a", "#c49c63", "#e8c995", 700, 6, 12, 1) });
const seaMat = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      shallow: { value: new THREE.Color("#3ee0d2") },
      mid: { value: new THREE.Color("#12a5d8") },
      deep: { value: new THREE.Color("#0f5fbf") },
      haze: { value: new THREE.Color(SKIES.beach.horizon) },
      shore: { value: -7.2 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 shallow, mid, deep, haze; uniform float shore;
      varying vec3 vW;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float d = shore - vW.z;                       // metres out to sea
        vec3 c = mix(shallow, mid, smoothstep(0.0, 9.0, d));
        c = mix(c, deep, smoothstep(8.0, 40.0, d));
        // foam: a wavy band at the shoreline and a second fainter one
        float wav = sin(vW.x * 1.3) * 0.35 + sin(vW.x * 3.1 + 1.7) * 0.15;
        float f1 = smoothstep(0.55, 0.0, abs(d - 0.4 - wav));
        float f2 = smoothstep(0.35, 0.0, abs(d - 3.0 - wav * 1.6)) * 0.55;
        c = mix(c, vec3(1.0), clamp(f1 + f2, 0.0, 1.0) * 0.9);
        // wave streaks and sun sparkles
        float streak = smoothstep(0.92, 1.0, sin(vW.z * 2.2 + sin(vW.x * 0.6) * 1.5));
        c += streak * 0.06 * smoothstep(2.0, 12.0, d);
        vec2 cell = floor(vW.xz * vec2(3.0, 1.2));
        float sp = step(0.985, h(cell)) * smoothstep(3.0, 20.0, d);
        c += sp * 0.9;
        // atmospheric haze toward the horizon
        c = mix(c, haze, smoothstep(30.0, 140.0, d) * 0.85);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
    fog: false,
  });

export const BeachSet: React.FC<SetProps> = ({ x0 = X0, hole }) => {
  const sea = useMemo(seaMat, []);
  return (
    <group>
      <HoledGround x0={x0} z0={30} z1={-6.6} mat={SAND} tile={3} hole={hole} />
      <Ground x0={x0} z0={-6.4} z1={-7.6} mat={WET_SAND} y={0.002} tile={3} />
      <mesh material={sea} position={[x0, 0.01, -7.2 - 150]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[400, 300]} />
      </mesh>
      {/* far islands */}
      {[[-30, -110, 22, 5.5], [8, -140, 30, 4], [45, -120, 20, 6]].map(([x, z, w, h], i) => (
        <mesh key={i} geometry={SPH} material={std(i === 1 ? "#4f9f6a" : "#3d9150", 0.95)} position={[x0 + x, -0.5, z]} scale={[w, h, w * 0.4]} />
      ))}
      <Palm at={[x0 - 2.5, 0, -4.6]} h={6.4} lean={0.3} seed={3} yaw={0.3} />
      <Palm at={[x0 + 4.6, 0, -5.2]} h={8.2} lean={-0.3} seed={7} yaw={2.4} />
      <Palm at={[x0 - 9, 0, -9]} h={8.8} lean={0.2} seed={9} />
      <Palm at={[x0 + 11, 0, -10]} h={7.5} lean={-0.25} seed={13} />
      <Rock at={[x0 + 3.3, 0.15, -2.4]} s={0.45} />
      <Rock at={[x0 + 3.9, 0.1, -2.1]} s={0.28} rot={1} />
      <Bush at={[x0 - 4.6, 0, -4.6]} s={0.9} seed={5} />
      <SkyClouds x0={x0} seed={21} />
    </group>
  );
};

// ─── Park: lawn, round trees, bushes, a far tree line ─────────────────────
const GRASS = std("#ffffff", 1, { map: speckle("#55b23a", "#3f9a2e", "#7fd053", 1600, 5, 31, 1) });
export const ParkSet: React.FC<{ x0?: number }> = ({ x0 = X0 }) => (
  <group>
    <Ground x0={x0} z0={30} z1={-200} w={300} mat={GRASS} tile={3} />
    {[...Array(16)].map((_, i) => (
      <RoundTree key={i} at={[x0 - 40 + i * 5.3 + (i % 3), 0, -34 - (i % 4) * 3]} h={7 + (i % 3) * 1.6} seed={100 + i} />
    ))}
    <RoundTree at={[x0 - 5.2, 0, -6]} h={6.4} seed={41} />
    <RoundTree at={[x0 + 6.4, 0, -9]} h={7.4} seed={42} />
    <RoundTree at={[x0 - 11, 0, -14]} h={7.8} seed={43} />
    <RoundTree at={[x0 + 13, 0, -16]} h={8.4} seed={44} />
    <Bush at={[x0 - 3.2, 0, -3.6]} s={0.8} seed={45} />
    <Bush at={[x0 + 3.8, 0, -4.2]} s={0.95} seed={46} />
    <Bush at={[x0 + 9, 0, -7]} s={1.1} seed={47} />
    <Rock at={[x0 - 1.8, 0.08, -2.5]} s={0.25} />
    <Rock at={[x0 + 2.4, 0.08, -3]} s={0.3} rot={2} />
    <SkyClouds x0={x0} seed={51} />
  </group>
);

// ─── Street: sidewalk, curb, road with lane marks, brick buildings, trees ──
const SIDEWALK = std("#ffffff", 0.95, {
  map: canvasTex(256, 256, (g, r) => {
    g.fillStyle = "#b4aea3";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)";
      g.fillRect(r() * 256, r() * 256, 2, 2);
    }
    g.strokeStyle = "#8f8a81";
    g.lineWidth = 3;
    g.strokeRect(0, 0, 256, 256);
  }, 61),
});
const ROAD = std("#ffffff", 0.9, {
  map: canvasTex(256, 256, (g, r) => {
    g.fillStyle = "#4b4c52";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.07)";
      g.fillRect(r() * 256, r() * 256, 2, 2);
    }
  }, 62),
});
const CURB = std("#bdb8ae", 0.85);
const LINE = std("#f4d03f", 0.6);
export const StreetSet: React.FC<{ x0?: number }> = ({ x0 = X0 }) => (
  <group>
    <Ground x0={x0} z0={30} z1={-3} w={200} mat={SIDEWALK} tile={1.4} />
    <mesh geometry={BOX} material={CURB} position={[x0, -0.07, -3.05]} scale={[200, 0.3, 0.3]} receiveShadow castShadow />
    <Ground x0={x0} z0={-3.2} z1={-12} w={200} mat={ROAD} y={-0.15} tile={3} />
    {[...Array(30)].map((_, i) => (
      <mesh key={i} geometry={BOX} material={LINE} position={[x0 - 60 + i * 4, -0.145, -7.6]} scale={[2, 0.01, 0.16]} />
    ))}
    <mesh geometry={BOX} material={CURB} position={[x0, -0.07, -12.1]} scale={[200, 0.3, 0.3]} receiveShadow />
    <Ground x0={x0} z0={-12.2} z1={-16} w={200} mat={SIDEWALK} tile={1.4} />
    {[
      [-17, 7, 13, "#b5553c", "#2e8b57"],
      [-9.5, 8, 10, "#d39a62", "#d94b3b"],
      [-1.5, 8, 14, "#a84a3a", ""],
      [6.5, 8, 11, "#c96f4a", "#2f6fd6"],
      [14.5, 8, 15, "#e3c79c", "#e0a12b"],
      [22.5, 8, 12, "#b45a45", ""],
    ].map(([x, w, h, brick, awning], i) => (
      <Building key={i} x={x0 + (x as number)} z={-16} w={w as number} h={h as number} brick={brick as string} awning={(awning as string) || undefined} seed={70 + i} />
    ))}
    <RoundTree at={[x0 - 6, 0, -13.4]} h={5.6} seed={81} />
    <RoundTree at={[x0 + 9, 0, -13.4]} h={6} seed={82} />
    <LampPost at={[x0 + 2.5, 0, -13]} />
    <LampPost at={[x0 - 4.2, 0, -2.6]} />
    <SkyClouds x0={x0} seed={91} />
  </group>
);

// ─── Studio: a soft seamless backdrop for model sheets ────────────────────
export const StudioSet: React.FC<{ x0?: number }> = ({ x0 = X0 }) => (
  <group>
    <Ground x0={x0} z0={30} z1={-60} mat={std("#c9dff2", 1)} />
  </group>
);

export const SETS: Record<SetName, React.FC<SetProps>> = { beach: BeachSet, park: ParkSet, street: StreetSet, studio: StudioSet };
