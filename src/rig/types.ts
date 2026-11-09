// Angles are degrees. 0 = pointing straight down, positive = rotated toward
// the direction the character faces. Elbow/knee values are relative bends.
export type Pose = {
  lean: number; // torso tilt
  head: number; // extra head tilt on top of lean (negative = look up)
  aS: number; // front arm shoulder (absolute)
  aE: number; // front arm elbow (relative)
  bS: number; // back arm shoulder
  bE: number;
  aH: number; // front leg hip (absolute)
  aK: number; // front leg knee bend (positive = shin swings back)
  bH: number;
  bK: number;
};

export type Eyes =
  | "dot"
  | "wide"
  | "half"
  | "happy"
  | "closed"
  | "x"
  | "spiral"
  | "squeeze";

export type Mouth =
  | "smile"
  | "grin"
  | "laugh"
  | "flat"
  | "frown"
  | "o"
  | "O"
  | "smirk"
  | "wavy"
  | "teeth"
  | "whistle"
  | "tiny"
  | "sadSmile";

export type Expr = {
  eyes: Eyes;
  mouth: Mouth;
  brow: number; // raise: -1 low .. 1 high
  browAng: number; // + angry (inner ends down), - worried
  browAsym?: number; // extra raise on the far brow (skeptical)
  pupil?: number; // pupil scale for "wide" eyes
  sweat?: boolean;
  vein?: boolean;
  twitch?: boolean;
  tear?: boolean;
};

export type Hand = "none" | "fist" | "thumb" | "point" | "open";

export type Extras = {
  scarf?: boolean; // hero's signature
  partyHat?: boolean; // kid's signature
  blush?: boolean; // kid's signature
  helmet?: 0 | 1 | 2; // 2 = cracked
  bandage?: boolean;
  beard?: number; // 0..1 length of an old-man beard
  cobweb?: boolean;
  headphones?: boolean;
  phone?: boolean; // held in the front hand
  bubble?: number; // bubble-gum size 0..1
  tie?: boolean;
  backpack?: boolean;
  wet?: boolean; // soaked: scarf hangs straight down, drips
  needles?: boolean; // cactus spines stuck in the backside
  scarfTails?: boolean; // false while the scarf is snagged elsewhere
  cone?: number; // ice-cream cone in the front hand: 1 = with scoop, 0.5 = empty cone
  spaceHelmet?: boolean; // glass bubble (tall enough for a party hat) + neck ring
  sandwich?: boolean; // held in the front hand
  flush?: number; // 0..1 red face from effort (straining at a jar lid)
  ghost?: boolean; // see-through white ghost with a halo (cartoon "death" gag, never graphic)
};

export type CharState = {
  x: number;
  lift: number; // px above ground (negative = below)
  facing: 1 | -1;
  scale: number;
  sx: number; // squash/stretch
  sy: number;
  pose: Pose;
  faceX: number; // -1 look back, 0 camera, 1 profile toward facing
  lookY: number; // -1 up, 1 down
  expr: Expr;
  blink: number; // 0 open, 1 closed
  aHand: Hand;
  bHand: Hand;
  extras: Extras;
  t: number; // global time (for secondary motion)
  speed: number; // horizontal speed px/s (for scarf drag)
  rot?: number; // whole-body rotation around the hips (90 = lying down)
  aLen?: number; // rubber-arm stretch for the front arm
};
