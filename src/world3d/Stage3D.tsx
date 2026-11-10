import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useComposerReady } from "../lib/post3d";
import { GRADES, GradeEffect } from "../lib/look3d/grade";
import { LensBlur } from "../lib/look3d/lensblur";
import { NOINK } from "../lib/look3d/ink";
import { GROUND } from "../rig/Stickman";
import { PX_PER_M } from "../rig3d/Stickman3D";
import { SETS, SKIES, type SetName } from "./sets";

// The 3D stage every episode from ep11 renders on: one <ThreeCanvas> with the camera, a bright
// saturated sky, sun + sky-fill + rim lighting with soft shadows, a ready-made set, and the post chain
// (depth of field → bloom → neutral tone map → grade). No ink outlines: the look is rendered 3D.
//
//   <Stage3D cam={{ x: 540, y: 1000, zoom: 1, yaw: 8, pitch: 4 }} set="beach">
//     <Toon3D who="dash" c={dash} />
//     <Toon3D who="newt" c={newt} />
//   </Stage3D>
//
// The camera orbits a point on the action plane given in the same world px as CharState (x right,
// y down, ground at GROUND), so timelines, physics and Scripts stay in the units the 2D episodes use.

export const W = 1080;
export const H = 1920;

export type Cam = {
  x: number; // look-at point on the action plane (world px)
  y: number;
  tz?: number; // look-at depth, m toward the camera (default 0: the action plane)
  zoom: number; // screen px per world px at that point
  yaw?: number; // orbit, deg (+ = camera moves right)
  pitch?: number; // deg (+ = camera above, − = low hero angle)
  roll?: number;
  fov?: number; // vertical, deg (default 38; lower = flatter, higher = more dramatic)
  dof?: number; // background blur at infinity, px at 1080×1920 (default 16, 0 = everything sharp)
};

const rd = (d: number) => (d * Math.PI) / 180;
/** Position a perspective camera from a Cam; returns its distance to the action plane point */
export const applyCam = (cam: Cam, pc: THREE.PerspectiveCamera, w = W, h = H) => {
  const fov = cam.fov ?? 38;
  const fpx = H / 2 / Math.tan(rd(fov / 2));
  const D = fpx / (PX_PER_M * cam.zoom);
  const target = new THREE.Vector3(cam.x / PX_PER_M, (GROUND - cam.y) / PX_PER_M, cam.tz ?? 0);
  const yaw = rd(cam.yaw ?? 0);
  const pitch = rd(cam.pitch ?? 0);
  pc.fov = fov;
  pc.aspect = w / h;
  pc.near = 0.1;
  pc.far = 500;
  pc.position.set(target.x + D * Math.sin(yaw) * Math.cos(pitch), Math.max(0.12, target.y + D * Math.sin(pitch)), target.z + D * Math.cos(yaw) * Math.cos(pitch));
  pc.up.set(0, 1, 0);
  pc.lookAt(target);
  pc.rotateZ(-rd(cam.roll ?? 0));
  pc.updateProjectionMatrix();
  pc.updateMatrixWorld(true);
  return { D, target };
};

const skyMat = (top: string, horizon: string) =>
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, horizon: { value: new THREE.Color(horizon) } },
    vertexShader: /* glsl */ `varying vec3 vD; void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top, horizon; varying vec3 vD;
      void main() {
        float t = pow(clamp(vD.y * 1.15 + 0.02, 0.0, 1.0), 0.55);
        gl_FragColor = vec4(mix(horizon, top, t), 1.0);
        #include <colorspace_fragment>
      }`,
  });

export type StageProps = {
  cam: Cam;
  set: SetName;
  /** set centre in world px (default 540: the middle of the frame) */
  setX?: number;
  light?: "day" | "golden";
  children?: React.ReactNode;
};

const Rig: React.FC<StageProps> = ({ cam, set, setX = 540, light = "day", children }) => {
  const { camera, scene, gl, size } = useThree();
  const pc = camera as THREE.PerspectiveCamera;
  pc.layers.enable(NOINK); // the cast lives on the NOINK layer (shared with the inked ep06 look)
  const { D, target } = applyCam(cam, pc, size.width, size.height);
  const sky = SKIES[set];
  const golden = light === "golden";

  const env = useMemo(() => new THREE.PMREMGenerator(gl).fromScene(new RoomEnvironment(), 0.04).texture, [gl]);
  scene.environment = env;
  scene.environmentIntensity = 0.35;
  const fog = useMemo(() => new THREE.Fog(sky.fog, 40, 260), [sky.fog]);
  scene.fog = fog;
  const dome = useMemo(() => skyMat(golden ? "#3f6fd0" : sky.top, golden ? "#ffd9a0" : sky.horizon), [sky, golden]);

  const ready = useComposerReady();
  const fx = useMemo(
    () => ({
      lens: new LensBlur({ maxCoC: 26, nearScale: 1.1 }),
      bloom: new BloomEffect({ luminanceThreshold: 1.05, intensity: 0.3, mipmapBlur: true }),
      tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
      grade: new GradeEffect(golden ? GRADES.golden : GRADES.day, 0.42),
    }),
    [golden],
  );
  fx.lens.focus = D;
  fx.lens.cInf = cam.dof ?? 16;
  const post = useMemo(
    () => (
      <EffectComposer ref={ready} multisampling={4}>
        <primitive object={fx.lens.pre} dispose={null} />
        <primitive object={fx.lens.main} dispose={null} />
        <primitive object={fx.bloom} dispose={null} />
        <primitive object={fx.tone} dispose={null} />
        <primitive object={fx.grade} dispose={null} />
      </EffectComposer>
    ),
    [fx, ready],
  );

  // the sun follows the camera's target so the cast always sits inside the shadow map
  const sun = useMemo(() => {
    const l = new THREE.DirectionalLight("#fff3df", 3.1);
    l.castShadow = true;
    l.shadow.mapSize.set(4096, 4096);
    Object.assign(l.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 60 });
    l.shadow.camera.layers.enable(NOINK);
    l.shadow.bias = -0.0003;
    l.shadow.normalBias = 0.03;
    l.shadow.radius = 5;
    return l;
  }, []);
  sun.color.set(golden ? "#ffcf8f" : "#fff3df");
  sun.intensity = golden ? 3 : 3.5;
  sun.position.set(target.x - 7, golden ? 7 : 14, 9);
  sun.target.position.set(target.x, 0, 0);
  sun.target.updateMatrixWorld();

  const Set = SETS[set];
  return (
    <>
      <mesh material={dome} position={[target.x, 0, 0]} scale={400} renderOrder={-10}>
        <sphereGeometry args={[1, 32, 20]} />
      </mesh>
      <hemisphereLight args={[golden ? "#ffe2c0" : "#cfe8ff", golden ? "#d8a070" : "#e9cf9a", 0.85]} />
      <primitive object={sun} />
      <primitive object={sun.target} />
      {/* rim light from behind: lifts hair, shoulders and hats off the background */}
      <directionalLight position={[target.x + 5, 6, -8]} intensity={1.5} color={golden ? "#ffd0a0" : "#eaf4ff"} />
      {/* soft fill from the camera side so faces never go muddy */}
      <directionalLight position={[target.x + 3, 2.5, 8]} intensity={0.4} color="#fff6ea" />
      <Set x0={setX / PX_PER_M} />
      {children}
      {post}
    </>
  );
};

export const Stage3D: React.FC<StageProps & { width?: number; height?: number }> = ({ width = W, height = H, ...p }) => (
  <ThreeCanvas width={width} height={height} shadows gl={{ antialias: false, stencil: false }} style={{ position: "absolute", inset: 0 }}>
    <Rig {...p} />
  </ThreeCanvas>
);
