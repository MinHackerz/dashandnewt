import { num, step, type NumKey } from "../lib/kf";
import { applyGait, blinkAt, breathe, FACES, poseAt, type FaceName, type Gait, type PoseKey } from "./library";
import type { CharState, Extras, Hand } from "./types";

// A character's performance as keyframe tracks; build() samples it at time t.
type Steps<T> = readonly (readonly [number, T])[];

export type Script = {
  scale: number;
  seed: number;
  x: readonly NumKey[];
  lift: readonly NumKey[];
  sy: readonly NumKey[];
  facing: Steps<1 | -1>;
  gait: Steps<Gait>;
  pose: readonly PoseKey[];
  faceX: readonly NumKey[];
  lookY: Steps<number>;
  face: Steps<FaceName>;
  aHand: Steps<Hand>;
  bHand: Steps<Hand>;
  extras: (t: number) => Extras;
  tweak?: (t: number, c: CharState) => void;
  rot?: readonly NumKey[];
  aLen?: readonly NumKey[];
};

export const build = (s: Script, t: number): CharState => {
  const x = num(t, s.x);
  const gait = step(t, s.gait);
  const { pose, hop } = applyGait(poseAt(t, s.pose), gait, x);
  const sy = num(t, s.sy);
  const c: CharState = {
    x,
    lift: num(t, s.lift) + hop,
    facing: step(t, s.facing),
    scale: s.scale,
    sx: 1 + (1 - sy) * 0.9,
    sy,
    pose: gait === "none" ? breathe(pose, t + s.seed) : pose,
    faceX: num(t, s.faceX),
    lookY: step(t, s.lookY),
    expr: FACES[step(t, s.face)],
    blink: blinkAt(t, s.seed),
    aHand: step(t, s.aHand),
    bHand: step(t, s.bHand),
    extras: s.extras(t),
    t,
    speed: (num(t + 1 / 30, s.x) - x) * 30,
    rot: s.rot ? num(t, s.rot) : 0,
    aLen: s.aLen ? num(t, s.aLen) : 1,
  };
  s.tweak?.(t, c);
  return c;
};
