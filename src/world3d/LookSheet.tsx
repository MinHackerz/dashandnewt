import React from "react";
import { AbsoluteFill } from "remotion";
import { FACES, POSES, type FaceName, type PoseName } from "../rig/library";
import type { CharState, Extras, Hand } from "../rig/types";
import { Toon3D, type Who3D } from "../rig3d/Toon3D";
import { Stage3D } from "./Stage3D";

// Model sheet + look stills for the 3D house style. Render these after touching the characters, the
// lights or a set:  npx remotion still CastSheet3D out/cast3d.png --gl=angle

export const st3 = (who: Who3D, x: number, pose: PoseName, face: FaceName, o: Partial<CharState> = {}, hands: [Hand, Hand] = ["fist", "fist"], extra: Extras = {}): CharState => ({
  x,
  lift: 0,
  facing: 1,
  scale: who === "dash" ? 1 : 0.72,
  sx: 1,
  sy: 1,
  pose: POSES[pose],
  faceX: 0.2,
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

/** Dash and Newt side by side: identity, proportions and a spread of expressions */
export const CastSheet3D: React.FC = () => (
  <AbsoluteFill>
    <Stage3D cam={{ x: 540, y: 1110, zoom: 1.3, yaw: 0, pitch: 3, dof: 0, fov: 30 }} set="studio">
      <Toon3D who="dash" c={st3("dash", 300, "handsHips", "confident")} />
      <Toon3D who="newt" c={st3("newt", 560, "point", "kidCurious", { facing: -1 }, ["point", "fist"])} />
      <Toon3D who="dash" c={st3("dash", 800, "alarmed", "alarmed", { facing: -1 }, ["open", "open"])} />
    </Stage3D>
  </AbsoluteFill>
);

/** Beach key art: Dash triumphant, Newt alarmed (the "One Flare" reference) */
export const LookBeach: React.FC = () => (
  <AbsoluteFill>
    <Stage3D cam={{ x: 540, y: 1120, zoom: 2.1, yaw: -8, pitch: -3, fov: 42, dof: 18 }} set="beach">
      <Toon3D who="newt" c={st3("newt", 390, "recoil", "horror", { facing: 1 }, ["open", "open"])} turn={45} />
      <Toon3D who="dash" c={st3("dash", 690, "stand", "confident", { facing: -1, faceX: 0, pose: { ...POSES.stand, lean: -6, head: -8, bS: 168, bE: 6, aS: 30, aE: 40, aH: 16, bH: -16 } }, ["fist", "fist"])} turn={50} />
    </Stage3D>
  </AbsoluteFill>
);

/** Park key art: Dash airborne, Newt cheering (the "Big Bounce" reference) */
export const LookPark: React.FC = () => (
  <AbsoluteFill>
    <Stage3D cam={{ x: 540, y: 960, zoom: 1.55, yaw: 8, pitch: -6, fov: 44, dof: 16 }} set="park">
      <Toon3D who="newt" c={st3("newt", 360, "cheer", "kidJoy", { facing: 1 }, ["fist", "fist"])} turn={45} />
      <Toon3D who="dash" c={st3("dash", 640, "jumpReach", "determined", { facing: 1, lift: 300, faceX: 0 }, ["fist", "fist"])} turn={45} />
    </Stage3D>
  </AbsoluteFill>
);

/** Street key art: Dash straining, Newt alarmed (the "Newton's 2nd law" reference) */
export const LookStreet: React.FC = () => (
  <AbsoluteFill>
    <Stage3D cam={{ x: 540, y: 1100, zoom: 1.45, yaw: 12, pitch: 2, fov: 40, dof: 18 }} set="street">
      <Toon3D who="dash" c={st3("dash", 380, "yankPull", "strain", { facing: 1, faceX: 0.5 }, ["fist", "fist"])} turn={30} />
      <Toon3D who="newt" c={st3("newt", 700, "flail", "horror", { facing: 1, faceX: -0.2 }, ["open", "open"])} turn={40} />
    </Stage3D>
  </AbsoluteFill>
);
