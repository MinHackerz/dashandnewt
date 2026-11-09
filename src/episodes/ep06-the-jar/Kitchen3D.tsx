import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { useComposerReady } from "../../lib/post3d";
import { GRADES, GradeEffect } from "../../lib/look3d/grade";
import { InkPass, NOINK } from "../../lib/look3d/ink";
import { LensBlur } from "../../lib/look3d/lensblur";
import { GROUND } from "../../rig/Stickman";
import { PX_PER_M } from "./physics";
import { COUNTER, SHELF, TABLE, TOOLBOX } from "./timeline";

// The 3D kitchen around the cast. Dash, Newt and the props are 3D too (src/rig3d, Props3D), all on the
// "action plane" z = 0, so everything they touch (counter edge, shelf, table, floor) has its front
// edge on that plane. The camera orbits a point on the plane (yaw / pitch / roll); `cameraFor` is the
// one source of truth for it, shared with the cartoon-effects overlay so steam and chalk stay attached.
// Post chain as in the cartoon-3d-short skill: ink → lens blur (pre, main) → bloom → neutral tone map → grade.

export const W = 1080;
export const H = 1920;
export const FOV = 40; // vertical, degrees
export const F_PX = H / 2 / Math.tan(((FOV / 2) * Math.PI) / 180); // focal length in screen px
const m = (px: number) => px / PX_PER_M;
const WALL_Z = -0.62;
const DEPTH = 0.6; // counter / table / shelf depth: front edge at z = 0

/** The shared camera: the point it orbits on the action plane (world px, y down like the old 2D camera),
 *  zoom there (screen px per world px), orbit yaw / pitch and roll (deg), and lens blur at infinity (px) */
export type Cam3D = { x: number; y: number; z: number; yaw: number; pitch: number; roll: number; cInf: number };
/** Camera distance that gives `zoom` screen px per world px at the orbit point */
export const distFor = (zoom: number) => F_PX / (PX_PER_M * zoom);
const rd = (d: number) => (d * Math.PI) / 180;
/** Position and aim a perspective camera from a Cam3D (used by the 3D canvas and the overlay alike) */
export const cameraFor = (cam: Cam3D, pc = new THREE.PerspectiveCamera()) => {
  const D = distFor(cam.z);
  const target = new THREE.Vector3(m(cam.x), m(GROUND - cam.y), 0);
  const yaw = rd(cam.yaw);
  const pitch = rd(cam.pitch);
  pc.fov = FOV;
  pc.aspect = W / H;
  pc.near = 0.1;
  pc.far = 40;
  pc.position.set(target.x + D * Math.sin(yaw) * Math.cos(pitch), target.y + D * Math.sin(pitch), D * Math.cos(yaw) * Math.cos(pitch));
  pc.up.set(0, 1, 0);
  pc.lookAt(target);
  pc.rotateZ(-rd(cam.roll));
  pc.clearViewOffset();
  pc.updateProjectionMatrix();
  pc.updateMatrixWorld(true);
  return { pc, D, target };
};
/** CSS matrix3d that maps action-plane world px (x, y down) onto the screen through `cam`, for an SVG
 *  layer drawn at `k` screen px per world px (so the browser rasterises it sharp, then only warps it) */
export const planeMatrix = (cam: Cam3D, k: number) => {
  const { pc } = cameraFor(cam);
  const A = new THREE.Matrix4().set(1 / (PX_PER_M * k), 0, 0, 0, 0, -1 / (PX_PER_M * k), 0, m(GROUND), 0, 0, 1, 0, 0, 0, 0, 1);
  const S = new THREE.Matrix4().set(W / 2, 0, 0, W / 2, 0, -H / 2, 0, H / 2, 0, 0, 0, 0, 0, 0, 0, 1);
  const T = new THREE.Matrix4().multiplyMatrices(S, pc.projectionMatrix).multiply(pc.matrixWorldInverse).multiply(A);
  // flatten z (the layer is one plane) but keep the perspective row
  const e = T.elements;
  e[2] = e[6] = e[10] = e[14] = 0;
  e[10] = 1;
  return `matrix3d(${Array.from(e).map((v) => v.toFixed(8)).join(",")})`;
};

// ─── Materials ───────────────────────────────────────────────────────────
const toon = (color: string, map?: THREE.Texture) => new THREE.MeshStandardMaterial(map ? { color, map, roughness: 0.72 } : { color, roughness: 0.72 });

const canvasTex = (w: number, h: number, paint: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  paint(c.getContext("2d")!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...repeat);
  }
  return tex;
};

const useTextures = () =>
  useMemo(() => {
    const floor = canvasTex(512, 512, (g) => {
      g.fillStyle = "#e2c497";
      g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? "#dcbb8b" : "#e6c99f";
        g.fillRect(0, i * 64, 512, 62);
        g.fillStyle = "#b8955f";
        g.fillRect(0, i * 64 + 62, 512, 2);
        g.fillRect(((i * 197) % 512), i * 64, 3, 62);
      }
    }, [6, 6]);
    const tiles = canvasTex(256, 256, (g) => {
      g.fillStyle = "#d9eef0";
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = "#a9cdd2";
      g.lineWidth = 4;
      for (let i = 0; i <= 4; i++) {
        g.beginPath();
        g.moveTo(i * 64, 0);
        g.lineTo(i * 64, 256);
        g.moveTo(0, i * 64);
        g.lineTo(256, i * 64);
        g.stroke();
      }
    }, [5, 6]);
    const wall = canvasTex(256, 256, (g) => {
      g.fillStyle = "#fff6e6";
      g.fillRect(0, 0, 256, 256);
      g.fillStyle = "#fbecd3";
      for (let i = 0; i < 8; i++) g.fillRect(i * 32, 0, 14, 256); // soft wallpaper stripes
    }, [8, 4]);
    const garden = canvasTex(1024, 512, (g) => {
      const sky = g.createLinearGradient(0, 0, 0, 512);
      sky.addColorStop(0, "#5e93d9");
      sky.addColorStop(0.7, "#bfe4ff");
      g.fillStyle = sky;
      g.fillRect(0, 0, 1024, 512);
      g.fillStyle = "#ffd23f";
      g.beginPath();
      g.arc(780, 120, 46, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#ffffff";
      [[200, 110], [520, 70]].forEach(([x, y]) => {
        g.beginPath();
        g.ellipse(x, y, 90, 30, 0, 0, Math.PI * 2);
        g.ellipse(x - 60, y + 10, 60, 24, 0, 0, Math.PI * 2);
        g.fill();
      });
      g.fillStyle = "#9fd08a";
      g.beginPath();
      g.ellipse(250, 470, 420, 150, 0, 0, Math.PI * 2);
      g.ellipse(820, 490, 380, 140, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#7fb76a";
      g.fillRect(0, 440, 1024, 72);
    });
    const paper = canvasTex(256, 160, (g) => {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, 256, 160);
      g.strokeStyle = "#ff8a1f";
      g.lineWidth = 8;
      g.beginPath();
      g.arc(128, 80, 34, 0, Math.PI * 2);
      g.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.beginPath();
        g.moveTo(128 + Math.cos(a) * 46, 80 + Math.sin(a) * 46);
        g.lineTo(128 + Math.cos(a) * 66, 80 + Math.sin(a) * 66);
        g.stroke();
      }
    });
    const clock = canvasTex(128, 128, (g) => {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, 128, 128);
      g.strokeStyle = "#1b1b1b";
      g.lineWidth = 7;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(64, 64);
      g.lineTo(64, 26);
      g.moveTo(64, 64);
      g.lineTo(92, 76);
      g.stroke();
    });
    return { floor, tiles, wall, garden, paper, clock };
  }, []);

// ─── Building blocks: toon box + ink edges ───────────────────────────────
const INK_MAT = new LineMaterial({ color: 0x0b0a0c, linewidth: 4.2, worldUnits: false });
INK_MAT.resolution.set(W, H);

type V3 = [number, number, number];
/** A toon-shaded box from its min corner to its max corner (metres), with ink on its edges */
const Box: React.FC<{ min: V3; max: V3; color: string; map?: THREE.Texture; ink?: boolean; cast?: boolean }> = ({ min, max, color, map, ink = false, cast = true }) => {
  const size: V3 = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const pos: V3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const geo = useMemo(() => new THREE.BoxGeometry(...size), [size[0], size[1], size[2]]); // eslint-disable-line react-hooks/exhaustive-deps
  const mat = useMemo(() => toon(color, map), [color, map]);
  const edges = useMemo(() => {
    if (!ink) return null;
    const g = new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(geo, 30));
    return new LineSegments2(g, INK_MAT);
  }, [geo, ink]);
  return (
    <group position={pos}>
      <mesh geometry={geo} material={mat} castShadow={cast} receiveShadow />
      {edges ? <primitive object={edges} /> : null}
    </group>
  );
};

const Cyl: React.FC<{ at: V3; r: number; h: number; color: string; rot?: V3; ink?: boolean }> = ({ at, r, h, color, rot = [0, 0, 0], ink = false }) => {
  const geo = useMemo(() => new THREE.CylinderGeometry(r, r, h, 28), [r, h]);
  const mat = useMemo(() => toon(color), [color]);
  const edges = useMemo(() => (ink ? new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(geo, 40)), INK_MAT) : null), [geo, ink]);
  return (
    <group position={at} rotation={rot}>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      {edges ? <primitive object={edges} /> : null}
    </group>
  );
};

// ─── The set ─────────────────────────────────────────────────────────────
const Room: React.FC<{ tools: { wrench: boolean; crowbar: boolean; crowbarX: number } }> = ({ tools }) => {
  const tex = useTextures();
  const c = { x0: m(COUNTER.x0), x1: m(COUNTER.x1), top: m(COUNTER.top) };
  const tb = { x0: m(TABLE.x0), x1: m(TABLE.x1), top: m(TABLE.top) };
  const sh = { x0: m(SHELF.x0), x1: m(SHELF.x1), top: m(SHELF.top) };
  const bx = { x0: m(TOOLBOX.x0), x1: m(TOOLBOX.x1), h: m(TOOLBOX.h) };
  const win = { x0: 0.46, x1: 1.42, y0: 1.75, y1: 2.67 };
  return (
    <group>
      {/* floor, running forward under the camera */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.5, 0, 2]} receiveShadow>
        <planeGeometry args={[16, 6]} />
        <meshStandardMaterial map={tex.floor} roughness={0.55} />
      </mesh>
      {/* back wall, with a hole for the window */}
      <Box min={[-4, 0, WALL_Z - 0.1]} max={[win.x0, 9, WALL_Z]} color="#ffffff" map={tex.wall} ink={false} cast={false} />
      <Box min={[win.x1, 0, WALL_Z - 0.1]} max={[9, 9, WALL_Z]} color="#ffffff" map={tex.wall} ink={false} cast={false} />
      <Box min={[win.x0, 0, WALL_Z - 0.1]} max={[win.x1, win.y0, WALL_Z]} color="#ffffff" map={tex.wall} ink={false} cast={false} />
      <Box min={[win.x0, win.y1, WALL_Z - 0.1]} max={[win.x1, 9, WALL_Z]} color="#ffffff" map={tex.wall} ink={false} cast={false} />
      {/* skirting board */}
      <Box min={[-4, 0, WALL_Z]} max={[9, 0.09, WALL_Z + 0.03]} color="#f6e3c0" />
      {/* window frame, sill, curtains — and the garden far outside */}
      <Box min={[win.x0 - 0.05, win.y0 - 0.06, WALL_Z - 0.02]} max={[win.x1 + 0.05, win.y0, WALL_Z + 0.08]} color="#ffffff" />
      <Box min={[win.x0 - 0.05, win.y1, WALL_Z - 0.02]} max={[win.x1 + 0.05, win.y1 + 0.05, WALL_Z + 0.03]} color="#ffffff" />
      <Box min={[(win.x0 + win.x1) / 2 - 0.025, win.y0, WALL_Z - 0.06]} max={[(win.x0 + win.x1) / 2 + 0.025, win.y1, WALL_Z - 0.03]} color="#ffffff" />
      <Box min={[win.x0, (win.y0 + win.y1) / 2 - 0.025, WALL_Z - 0.06]} max={[win.x1, (win.y0 + win.y1) / 2 + 0.025, WALL_Z - 0.03]} color="#ffffff" />
      <Box min={[win.x0 - 0.22, win.y0 - 0.25, WALL_Z]} max={[win.x0 - 0.02, win.y1 + 0.12, WALL_Z + 0.06]} color="#ff9f6b" />
      <Box min={[win.x1 + 0.02, win.y0 - 0.25, WALL_Z]} max={[win.x1 + 0.22, win.y1 + 0.12, WALL_Z + 0.06]} color="#ff9f6b" />
      <mesh position={[(win.x0 + win.x1) / 2 + 0.4, 2.1, -7]}>
        <planeGeometry args={[9, 4.5]} />
        <meshBasicMaterial map={tex.garden} toneMapped={false} />
      </mesh>
      {/* clock */}
      <Cyl at={[1.96, 2.5, WALL_Z + 0.03]} r={0.17} h={0.05} color="#ffffff" rot={[Math.PI / 2, 0, 0]} />
      <mesh position={[1.96, 2.5, WALL_Z + 0.056]}>
        <circleGeometry args={[0.15, 32]} />
        <meshBasicMaterial map={tex.clock} />
      </mesh>
      {/* tiled splashback behind the counter */}
      <Box min={[c.x0, c.top, WALL_Z]} max={[c.x1, c.top + 1.4, WALL_Z + 0.01]} color="#ffffff" map={tex.tiles} ink={false} cast={false} />
      {/* counter: cabinets, doors, knobs, worktop (front edge on the action plane) */}
      <Box min={[c.x0, 0.06, -DEPTH]} max={[c.x1, c.top - 0.06, -0.05]} color="#a8d5c2" />
      <Box min={[c.x0 + 0.03, 0, -DEPTH]} max={[c.x1 - 0.03, 0.06, -0.08]} color="#6f9f8c" ink={false} />
      {[...Array(Math.floor((c.x1 - c.x0) / 0.7))].map((_, i) => {
        const x = c.x0 + 0.06 + i * 0.7;
        return (
          <group key={i}>
            <Box min={[x, 0.12, -0.05]} max={[x + 0.62, c.top - 0.14, -0.03]} color="#b9e0cf" />
            <Cyl at={[x + 0.54, c.top - 0.3, -0.015]} r={0.025} h={0.03} color="#ffd23f" rot={[Math.PI / 2, 0, 0]} />
          </group>
        );
      })}
      <Box min={[c.x0 - 0.05, c.top - 0.06, -DEPTH - 0.02]} max={[c.x1 + 0.05, c.top, 0]} color="#f4d9a6" />
      {/* plate with bread, further back on the worktop */}
      <Cyl at={[m(1130), c.top + 0.012, -0.3]} r={0.24} h={0.024} color="#ffffff" />
      <Box min={[m(1130) - 0.15, c.top + 0.024, -0.42]} max={[m(1130) + 0.15, c.top + 0.08, -0.18]} color="#f2c27b" />
      {/* shelf (deep, so the jam jar sits on its front edge) */}
      <Box min={[sh.x0, sh.top - 0.06, -DEPTH]} max={[sh.x1, sh.top, 0]} color="#d9a66b" />
      {[sh.x0 + 0.08, sh.x1 - 0.08].map((x) => (
        <Box key={x} min={[x - 0.02, sh.top - 0.3, WALL_Z]} max={[x + 0.02, sh.top - 0.06, WALL_Z + 0.3]} color="#c08a52" />
      ))}
      {/* fridge at the far right */}
      <Box min={[c.x1 + 0.05, 0, -DEPTH]} max={[c.x1 + 0.85, 1.95, -0.02]} color="#f1f4f6" />
      <Box min={[c.x1 + 0.12, 1.1, -0.02]} max={[c.x1 + 0.16, 1.6, 0]} color="#9aa5ae" />
      {/* kitchen table (front edge on the action plane) and Newt's colouring */}
      <Box min={[tb.x0, tb.top - 0.05, -DEPTH]} max={[tb.x1, tb.top, 0]} color="#d9a66b" />
      {[tb.x0 + 0.08, tb.x1 - 0.08].map((x) =>
        [-0.08, -DEPTH + 0.08].map((z) => <Box key={`${x}${z}`} min={[x - 0.035, 0, z - 0.035]} max={[x + 0.035, tb.top - 0.05, z + 0.035]} color="#c08a52" />),
      )}
      <mesh position={[m(235), tb.top + 0.002, -0.2]} rotation={[-Math.PI / 2, 0, 0.12]} receiveShadow>
        <planeGeometry args={[0.42, 0.28]} />
        <meshStandardMaterial map={tex.paper} roughness={0.9} />
      </mesh>
      <Cyl at={[m(150), tb.top + 0.012, -0.32]} r={0.012} h={0.14} color="#e63946" rot={[0, 0.4, Math.PI / 2]} ink={false} />
      <Cyl at={[m(160), tb.top + 0.012, -0.4]} r={0.012} h={0.14} color="#5aa9e6" rot={[0, -0.3, Math.PI / 2]} ink={false} />
      {/* toolbox on the floor, open, tool handles sticking out until they're taken */}
      <Box min={[bx.x0, 0, -0.34]} max={[bx.x1, bx.h, -0.04]} color="#e63946" />
      <Box min={[bx.x0, bx.h, -0.44]} max={[bx.x1, bx.h + 0.02, -0.32]} color="#ff6b4a" />
      {tools.wrench ? <Cyl at={[m(TOOLBOX.x0 + 14), bx.h + 0.1, -0.06]} r={0.028} h={0.32} color="#c0392b" rot={[0.18, 0, 0.1]} /> : null}
      {tools.crowbar ? <Cyl at={[m(tools.crowbarX), bx.h + 0.12, -0.07]} r={0.02} h={0.36} color="#5b6670" rot={[0.2, 0, -0.08]} /> : null}
    </group>
  );
};

// Soft round contact shadows on whatever surface a cast member stands on (they cast no 3D shadow)
export type Blob = { x: number; h: number; r: number; k?: number };
const Blobs: React.FC<{ blobs: Blob[] }> = ({ blobs }) => {
  const tex = useMemo(
    () =>
      canvasTex(128, 128, (g) => {
        const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
        gr.addColorStop(0, "rgba(40,24,10,0.55)");
        gr.addColorStop(1, "rgba(40,24,10,0)");
        g.fillStyle = gr;
        g.fillRect(0, 0, 128, 128);
      }),
    [],
  );
  return (
    <group>
      {blobs.map((b, i) => (
        <mesh key={i} position={[m(b.x), m(b.h) + 0.004, -0.06]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, b.k ?? 0.45, 1]}>
          <planeGeometry args={[m(b.r) * 2, m(b.r) * 2]} />
          <meshBasicMaterial map={tex} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};

// ─── Camera + post ───────────────────────────────────────────────────────
type Props = { cam: Cam3D; blobs: Blob[]; tools: { wrench: boolean; crowbar: boolean; crowbarX: number }; children?: React.ReactNode };
const Rig: React.FC<Props> = ({ cam, blobs, tools, children }) => {
  const { camera, scene, gl } = useThree();
  const pc = camera as THREE.PerspectiveCamera;
  const { D } = cameraFor(cam, pc);
  scene.background = new THREE.Color("#fdf1dc");
  // soft room reflections, so vinyl, glass and metal read as solid 3D
  const env = useMemo(() => new THREE.PMREMGenerator(gl).fromScene(new RoomEnvironment(), 0.04).texture, [gl]);
  scene.environment = env;
  scene.environmentIntensity = 0.55;

  const ready = useComposerReady();
  const fx = useMemo(
    () => ({
      // the skill tuned its ink for a bridge seen from 6–90 m; a kitchen is 3–8 m away with 5 cm edges
      ink: new InkPass(scene, pc, { widthNear: 4.4, widthFar: 3.2, distNear: 3, distFar: 12, depthLo: 0.003, depthHi: 0.012 }),
      lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
      bloom: new BloomEffect({ luminanceThreshold: 1.0, intensity: 0.35, mipmapBlur: true }),
      tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
      grade: new GradeEffect(GRADES.day, 0.35),
    }),
    [scene, pc],
  );
  useEffect(() => () => fx.ink.dispose(), [fx]);
  fx.lens.focus = D; // the cast's plane is in focus
  fx.lens.cInf = cam.cInf;
  const post = useMemo(
    () => (
      <EffectComposer ref={ready} multisampling={4}>
        <primitive object={fx.ink} dispose={null} />
        <primitive object={fx.lens.pre} dispose={null} />
        <primitive object={fx.lens.main} dispose={null} />
        <primitive object={fx.bloom} dispose={null} />
        <primitive object={fx.tone} dispose={null} />
        <primitive object={fx.grade} dispose={null} />
      </EffectComposer>
    ),
    [fx, ready],
  );
  const key = useMemo(() => {
    const l = new THREE.DirectionalLight("#fff1dc", 2.1);
    l.position.set(-1.5, 6, 5);
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    Object.assign(l.shadow.camera, { left: -7, right: 7, top: 6, bottom: -6 });
    l.shadow.camera.layers.enable(NOINK); // the cast (NOINK layer) casts shadows too
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.02;
    l.shadow.radius = 4;
    return l;
  }, []);
  return (
    <>
      <hemisphereLight args={["#fff6e6", "#c9a070", 0.55]} />
      <primitive object={key} />
      {/* rim light from behind and above: separates the 3D figures from the wall */}
      <directionalLight position={[2, 4, -4]} intensity={1.1} color="#dfeaff" />
      <Room tools={tools} />
      <Blobs blobs={blobs} />
      {children}
      {post}
    </>
  );
};

export const Kitchen3D: React.FC<Props> = (p) => (
  <ThreeCanvas width={W} height={H} shadows gl={{ antialias: false, stencil: false }} style={{ position: "absolute", inset: 0 }}>
    <Rig {...p} />
  </ThreeCanvas>
);
