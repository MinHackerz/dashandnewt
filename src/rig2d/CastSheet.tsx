import React from "react";
import { loadFont } from "@remotion/google-fonts/PermanentMarker";
import { AbsoluteFill } from "remotion";
import { FACES, POSES, type FaceName, type PoseName } from "../rig/library";
import { GROUND } from "../rig/Stickman";
import type { CharState, Extras, Hand } from "../rig/types";
import { FONT_STACK } from "../shared/ui";
import { Toon, type Who } from "./Toon";

loadFont();

// Model sheet for the 2D cartoon cast: check identity, proportions and expressions at a glance.
const st = (who: Who, x: number, pose: PoseName, face: FaceName, o: Partial<CharState> = {}, hands: [Hand, Hand] = ["fist", "fist"], extra: Extras = {}): CharState => ({
  x,
  lift: 0,
  facing: 1,
  scale: who === "dash" ? 1 : 0.72,
  sx: 1,
  sy: 1,
  pose: POSES[pose],
  faceX: 0.3,
  lookY: 0,
  expr: FACES[face],
  blink: 0,
  aHand: hands[0],
  bHand: hands[1],
  extras: who === "dash" ? { scarf: true, ...extra } : { partyHat: true, blush: true, ...extra },
  t: 0.4,
  speed: 0,
  ...o,
});

const Row: React.FC<{ y: number; children: React.ReactNode; label: string }> = ({ y, children, label }) => (
  <g transform={`translate(0 ${y - GROUND})`}>
    <rect x={0} y={GROUND} width={1080} height={22} fill="#c9b48a" />
    {children}
    <text x={40} y={GROUND + 80} fontFamily={FONT_STACK} fontSize={38} fill="#22181c">
      {label}
    </text>
  </g>
);

export const CastSheet: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#bfe4ff, #fdf1dc)" }}>
    <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
      <Row y={560} label="Dash: neutral · bodyguard · relief">
        <Toon who="dash" c={st("dash", 200, "stand", "deadpan")} />
        <Toon who="dash" c={st("dash", 540, "alarmed", "alarmed", {}, ["open", "open"])} />
        <Toon who="dash" c={st("dash", 870, "proud", "proud", { faceX: 0 })} />
      </Row>
      <Row y={1050} label="Newt: neutral · physics look · facepalm">
        <Toon who="newt" c={st("newt", 170, "stand", "kidHappy")} />
        <Toon who="newt" c={st("newt", 420, "point", "kidFocus", {}, ["point", "fist"])} />
        <Toon who="newt" c={st("newt", 660, "facepalm", "kidDeadpan", { faceX: 0 }, ["open", "fist"])} />
        <Toon who="newt" c={st("newt", 900, "waveBye", "kidHappy", { faceX: 0, lift: 60 }, ["open", "fist"], { ghost: true })} />
      </Row>
      <Row y={1600} label="together, walking (Newt one lane back)">
        <g transform="translate(0 -70) translate(620 1600) scale(0.95) translate(-620 -1600)">
          <Toon who="newt" c={st("newt", 640, "stand", "kidHappy", { faceX: 0.5 })} />
        </g>
        <Toon who="dash" c={st("dash", 470, "stand", "cautious", { faceX: 0.6 })} />
      </Row>
    </svg>
  </AbsoluteFill>
);
