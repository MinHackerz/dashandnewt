import React, { useMemo } from "react";
import * as THREE from "three";
import { GROUND } from "../../rig/Stickman";
import { Ball, INK_HULL, INK_W, Rod, toonMat } from "../../rig3d/parts";
import { PX_PER_M } from "./physics";
import type { JamState, JarState } from "./props";
import { JAM, JAR } from "./timeline";

// The episode's props in 3D, driven by the same states as before (jarAt, jamAt, wrenchAt, …).
// Everything is on the action plane (z = 0); things held in a near hand sit at the near-hand depth.

const m = (px: number) => px / PX_PER_M;
const rad = (d: number) => (d * Math.PI) / 180;
export const Z_HAND = (s: number) => 0.12 * s; // the 3D figures' shoulder half-width
/** screen point (world px, y down) → metres */
const at = (x: number, y: number, z: number) => new THREE.Vector3(m(x), m(GROUND - y), z);

const paint = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

// A cartoon jar body: glass tint, contents painted around the cylinder, label band on the front
const jarTexture = (kind: "pickles" | "jam") =>
  paint(1024, 512, (g) => {
    g.fillStyle = kind === "pickles" ? "#d6ecc0" : "#f6d3dc";
    g.fillRect(0, 0, 1024, 512);
    if (kind === "pickles") {
      g.fillStyle = "#b7d98d";
      g.fillRect(0, 70, 1024, 442);
      for (let i = 0; i < 12; i++) {
        const x = 30 + i * 84;
        g.save();
        g.translate(x, 300);
        g.rotate(((i % 3) - 1) * 0.18);
        g.fillStyle = "#5f9a32";
        g.strokeStyle = "#2f5a1c";
        g.lineWidth = 8;
        g.beginPath();
        g.roundRect(-30, -190, 60, 380, 30);
        g.fill();
        g.stroke();
        g.fillStyle = "#9cc76a";
        [-120, -40, 60, 140].forEach((y, k) => {
          g.beginPath();
          g.arc(k % 2 ? 10 : -8, y, 7, 0, Math.PI * 2);
          g.fill();
        });
        g.restore();
      }
    } else {
      g.fillStyle = "#c2185b";
      g.fillRect(0, 60, 1024, 452);
      g.fillStyle = "#e0457f";
      for (let i = 0; i < 9; i++) g.fillRect(40 + i * 115, 120, 24, 330);
    }
    // label band, centred on the front (u = 0.5)
    g.fillStyle = "#ffffff";
    g.fillRect(0, 196, 1024, 120);
    g.strokeStyle = "#1b1b1b";
    g.lineWidth = 8;
    g.strokeRect(-10, 196, 1044, 120);
    g.fillStyle = kind === "pickles" ? "#3f7a24" : "#c2185b";
    g.font = "bold 92px 'Arial Black', Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(kind === "pickles" ? "PICKLES" : "JAM", 512, 260);
    // glass highlight just left of the front
    g.fillStyle = "rgba(255,255,255,0.65)";
    g.fillRect(330, 40, 26, 140);
    g.fillRect(330, 340, 26, 150);
  });

const knurl = (color: string, line: string, stripes = 48) =>
  paint(512, 64, (g) => {
    g.fillStyle = color;
    g.fillRect(0, 0, 512, 64);
    g.fillStyle = line;
    for (let i = 0; i < stripes; i++) g.fillRect((i * 512) / stripes, 0, 4, 64);
  });

// Cylinders start at -π so their texture's centre (u = 0.5) faces the camera (+z)
const cyl = (r: number, h: number, open = false) => new THREE.CylinderGeometry(r, r, h, 40, 1, open, -Math.PI, Math.PI * 2);
const SPH = new THREE.SphereGeometry(1, 24, 16);

/** body + ink hull; `map` material for the sides, plain toon for the caps */
const Can: React.FC<{ r: number; h: number; y: number; side: THREE.Material; cap: string }> = ({ r, h, y, side, cap }) => {
  const geo = useMemo(() => cyl(r, h), [r, h]);
  const hull = useMemo(() => cyl(r + INK_W, h + INK_W * 2), [r, h]);
  const capMat = toonMat(cap);
  return (
    <group position={[0, y, 0]}>
      <mesh geometry={geo} material={[side, capMat, capMat]} castShadow receiveShadow />
      <mesh geometry={hull} material={INK_HULL} />
    </group>
  );
};

// ─── Pickle jar ──────────────────────────────────────────────────────────
const PickleLidMesh: React.FC<{ button: number; turn: number }> = ({ button, turn }) => {
  const tex = useMemo(() => knurl("#e8b54a", "#9a7428"), []);
  tex.wrapS = THREE.RepeatWrapping;
  tex.offset.x = turn; // the ridges slide round as it twists
  const side = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3, metalness: 0.55 }), [tex]);
  const r = m(JAR.lidW / 2);
  const h = m(JAR.lidH);
  return (
    <group>
      <Can r={r} h={h} y={h / 2} side={side} cap="#e8b54a" />
      {/* the safety button: a dark dimple while sealed, a bright dome once air is in */}
      <mesh geometry={SPH} material={toonMat(button > 0.5 ? "#f6cf72" : "#a87d24")} position={[0, h + 0.002, 0]} scale={[r * 0.36, 0.004 + r * 0.22 * button, r * 0.36]} />
    </group>
  );
};

export const PickleJar3D: React.FC<{ j: JarState; z?: number }> = ({ j, z = 0 }) => {
  const tex = useMemo(() => jarTexture("pickles"), []);
  const side = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.22 }), [tex]);
  const r = m(JAR.w / 2);
  const h = m(JAR.h);
  return (
    <group position={[m(j.x), m(j.h), z]} rotation={[0, 0, -rad(j.rot)]}>
      <Can r={r} h={h} y={h / 2} side={side} cap="#b7d98d" />
      {/* rim */}
      <Can r={r * 0.9} h={m(8)} y={h + m(4)} side={toonMat("#e5f3d8")} cap="#b7d98d" />
      {j.lid.on ? (
        <group position={[0, h, 0]}>
          <PickleLidMesh button={j.button} turn={j.turn} />
        </group>
      ) : (
        // open: pickle tops poking out of the brine
        [...Array(j.pickles)].map((_, i) => {
          const a = (i / 5) * Math.PI * 2 + 0.4;
          return <Rod key={i} a={new THREE.Vector3(Math.cos(a) * r * 0.45, h - m(10), Math.sin(a) * r * 0.45)} b={new THREE.Vector3(Math.cos(a) * r * 0.38, h + m(12), Math.sin(a) * r * 0.38)} r={m(9)} color="#5f9a32" />;
        })
      )}
    </group>
  );
};

/** The pickle lid once it's off the jar (in Newt's hand, then on the table) */
export const PickleLid3D: React.FC<{ j: JarState; z?: number }> = ({ j, z = 0 }) =>
  j.lid.on ? null : (
    <group position={[m(j.lid.x), m(j.lid.h), z]} rotation={[0, 0, -rad(j.lid.rot)]}>
      <PickleLidMesh button={j.button} turn={j.turn} />
    </group>
  );

// ─── Jam jar and its flying lid ──────────────────────────────────────────
const JamLidMesh: React.FC = () => {
  const tex = useMemo(() => knurl("#e63946", "#ffffff", 16), []);
  const side = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.22 }), [tex]);
  const h = m(JAM.lidH);
  return <Can r={m(JAM.lidW / 2)} h={h} y={0} side={side} cap="#e63946" />;
};

export const JamJar3D: React.FC<{ j: JamState }> = ({ j }) => {
  const tex = useMemo(() => jarTexture("jam"), []);
  const side = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.22 }), [tex]);
  const r = m(JAM.w / 2);
  const h = m(JAM.h);
  return (
    <group position={[m(j.x), m(j.h), 0]} rotation={[0, 0, -rad(j.rot)]}>
      <Can r={r} h={h} y={h / 2} side={side} cap="#c2185b" />
    </group>
  );
};

/** The jam lid wherever it is: on the jar, tumbling through the air (spin), or on Dash's head */
export const JamLid3D: React.FC<{ l: JamState["lid"] }> = ({ l }) => (
  <group position={[m(l.x), m(l.h), 0]} rotation={[l.spin, 0, -rad(l.rot)]}>
    <JamLidMesh />
  </group>
);

// ─── Tools ───────────────────────────────────────────────────────────────
type Tool = { x: number; y: number; ang: number };
const ToolFrame: React.FC<{ t: Tool; z: number; children: React.ReactNode }> = ({ t, z, children }) => (
  <group position={at(t.x, t.y, z)} rotation={[0, 0, -rad(t.ang)]}>
    {children}
  </group>
);
const X = (px: number) => new THREE.Vector3(m(px), 0, 0);

export const Wrench3D: React.FC<{ t: Tool; z: number; len?: number }> = ({ t, z, len = 130 }) => (
  <ToolFrame t={t} z={z}>
    <Rod a={X(10)} b={X(len)} r={m(9)} color="#c0392b" />
    <mesh geometry={BOX} material={toonMat("#9aa5ae")} scale={[m(34), m(40), m(30)]} castShadow />
    <mesh geometry={BOX} material={INK_HULL} scale={[m(34) + INK_W * 2, m(40) + INK_W * 2, m(30) + INK_W * 2]} />
    <mesh geometry={BOX} material={toonMat("#5b6670")} position={[-m(22), 0, 0]} scale={[m(14), m(30), m(26)]} />
  </ToolFrame>
);
const BOX = new THREE.BoxGeometry(1, 1, 1);

export const Crowbar3D: React.FC<{ t: Tool; z: number; len?: number }> = ({ t, z, len = 130 }) => (
  <ToolFrame t={t} z={z}>
    <Rod a={X(16)} b={X(len)} r={m(6)} color="#5b6670" />
    <Rod a={new THREE.Vector3(0, 0, 0)} b={new THREE.Vector3(m(16), m(8), 0)} r={m(5)} color="#5b6670" />
  </ToolFrame>
);

export const Spoon3D: React.FC<{ t: Tool; z: number }> = ({ t, z }) => (
  <ToolFrame t={t} z={z}>
    <Rod a={X(8)} b={X(48)} r={m(3.2)} color="#cfd8dc" />
    <Ball at={new THREE.Vector3(0, 0, 0)} r={m(10)} color="#cfd8dc" scale={[1, 0.6, 0.85]} />
  </ToolFrame>
);

/** The pickle in Dash's hand; bites take it away from the top */
export const Pickle3D: React.FC<{ x: number; y: number; bite: number; z: number }> = ({ x, y, bite, z }) =>
  bite >= 1 ? null : <Rod a={at(x, y + 24, z)} b={at(x, y + 24 - 48 * (1 - bite) + 4, z)} r={m(9)} color="#5f9a32" />;

/** Dash's scarf wrapped round the lid for grip (TRY #2): a band whose twist lines slide round */
export const ScarfWrap3D: React.FC<{ x: number; h: number; twist: number }> = ({ x, h, twist }) => {
  const tex = useMemo(() => {
    const t = knurl("#ff8a1f", "#c8641a", 10);
    t.wrapS = THREE.RepeatWrapping;
    return t;
  }, []);
  tex.offset.x = twist;
  const side = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.22 }), [tex]);
  return (
    <group position={[m(x), m(h), 0]}>
      <Can r={m(JAR.lidW / 2 + 6)} h={m(30)} y={0} side={side} cap="#ff8a1f" />
    </group>
  );
};
