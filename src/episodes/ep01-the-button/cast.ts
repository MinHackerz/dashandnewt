import { build, type Script } from "../../rig/script";

// ───────────────────────── HERO (orange scarf, full size) ─────────────────────────
// Story: ignores every warning, learns the wrong lesson, misses the cake,
// rage-presses without reading, and is saved by the kid's kindness.
export const HERO_SPOT = 470;
export const HERO_SIDE = 330;

const hero: Script = {
  scale: 1,
  seed: 0,
  x: [
    [0, -160],
    [2.7, HERO_SPOT, "out"],
    [8.75, HERO_SPOT],
    [10.25, -190, "in"],
    [10.5, -190],
    [10.86, HERO_SPOT, "out"],
    [27.6, HERO_SPOT],
    [28.2, HERO_SIDE, "io"],
    [36.6, HERO_SIDE],
    [36.98, HERO_SPOT, "in"],
  ],
  lift: [
    [0, 0],
    [2.9, 0],
    [3.0, 26, "out"], // startled hop at the sign
    [3.2, 0, "in"],
    [24.3, 0],
    [24.95, -1400, "in"],
    [26.99, -1400],
    [27.0, -310],
    [27.5, -40, "out"],
    [27.62, 0, "out"],
  ],
  sy: [
    [0, 1],
    [10.86, 1],
    [10.92, 0.86, "out"],
    [11.15, 1, "io"],
    [17.08, 1],
    [17.1, 0.17, "lin"],
    [18.4, 0.17],
    [18.52, 1.32, "out"],
    [18.66, 0.88, "io"],
    [18.82, 1, "io"],
    [24.3, 1],
    [24.45, 1.35, "out"],
    [26.9, 1.35],
    [26.95, 1, "lin"],
    [38.28, 1],
    [38.3, 0.17, "lin"],
  ],
  facing: [
    [0, 1],
    [8.65, -1],
    [10.45, 1],
    [27.6, -1],
    [28.25, 1],
    [30.35, -1],
    [33.5, 1],
  ],
  gait: [
    [0, "walk"],
    [2.7, "none"],
    [8.75, "walkLegs"],
    [10.25, "none"],
    [10.5, "runLegs"],
    [10.86, "none"],
    [27.6, "walkLegs"],
    [28.2, "none"],
    [36.6, "runLegs"],
    [36.98, "none"],
  ],
  pose: [
    [0, "stand"],
    [2.7, "stand", 0.2],
    [2.92, "recoil", 0.1, "snap"],
    [3.6, "stand", 0.35],
    [5.6, "lean", 0.25],
    [6.2, "stand", 0.2],
    [6.6, "reach", 1.75, "io"],
    [8.4, "recoil", 0.08, "snap"],
    [8.62, "handsBack", 0.2],
    [10.45, "windUp", 0.1],
    [10.86, "smash", 0.05, "lin"],
    [13.45, "shrug", 0.18, "back"],
    [14.4, "stand", 0.25],
    [15.05, "lookUp", 0.15],
    [15.3, "stand", 0.15],
    [15.6, "jab", 0.07, "snap"],
    [15.95, "handsHips", 0.18],
    [16.6, "flinchUp", 0.15, "back"],
    [17.1, "stand", 0],
    [18.45, "dazed", 0.2],
    [20.0, "alarmed", 0.1, "back"],
    [20.7, "stand", 0.25],
    [21.05, "helmetOn", 0.15],
    [21.45, "stand", 0.2],
    [21.8, "lookUp", 0.2],
    [22.55, "thumbsUp", 0.15, "back"],
    [23.05, "windUp", 0.12],
    [23.4, "pressBig", 0.06, "lin"],
    [23.6, "hang", 0.1],
    [23.95, "wave", 0.12],
    [24.3, "fall", 0.08],
    [27.0, "climb", 0],
    [27.6, "tired", 0.2],
    [29.0, "stand", 0.2],
    [29.9, "crossArms", 0.2],
    [30.35, "proud", 0.15],
    [32.85, "crossArms", 0.1],
    [33.55, "fists", 0.2],
    [36.5, "windUp", 0.1],
    [36.98, "smash", 0.05, "lin"],
    [37.15, "stand", 0.2],
    [37.35, "lookUp", 0.35],
    [38.3, "stand", 0],
  ],
  faceX: [
    [0, 1],
    [4.0, 1],
    [4.15, 0, "out"],
    [5.55, 0],
    [5.65, 1, "out"],
    [6.15, 1],
    [6.25, 0, "out"],
    [6.55, 0],
    [6.65, 1, "out"],
    [8.55, 1],
    [8.65, 0.4, "out"],
    [10.4, 0.4],
    [10.45, 1, "out"],
    [11.75, 1],
    [11.85, 0, "out"],
    [12.95, 0],
    [13.05, 0.6, "out"],
    [13.45, 0.6],
    [13.55, 0, "out"],
    [15.0, 0],
    [15.1, 0.7, "out"],
    [15.9, 1],
    [16.0, 0, "out"],
    [16.55, 0],
    [16.65, 0.3, "out"],
    [18.4, 0.3],
    [18.5, 0, "out"],
    [19.95, 0],
    [20.05, 0.8, "out"],
    [20.95, 0.8],
    [21.05, 0, "out"],
    [21.75, 0],
    [21.85, 0.2, "out"],
    [22.5, 0.2],
    [22.6, 0, "out"],
    [23.0, 0],
    [23.1, 1, "out"],
    [23.55, 1],
    [23.65, 0.5, "out"],
    [23.8, 0.5],
    [23.9, 0, "out"],
    [27.55, 0],
    [27.65, 1, "out"],
    [28.95, 1],
    [29.05, 0, "out"],
    [30.3, 0],
    [30.4, 0.5, "out"],
    [32.8, 0.5],
    [32.9, -0.85, "snap"],
    [33.4, -0.85],
    [33.5, 1, "out"],
    [34.95, 1],
    [35.05, 0, "out"],
    [36.5, 0],
    [36.6, 1, "out"],
    [37.1, 1],
    [37.45, 0.3, "io"],
  ],
  lookY: [
    [0, 0],
    [2.9, -0.6],
    [4.1, 0],
    [5.6, 0.4],
    [6.2, 0],
    [6.6, 0.4],
    [8.6, 0],
    [10.4, 0.3],
    [11.8, 0],
    [13.0, -0.7],
    [13.55, 0],
    [15.05, -0.7],
    [15.3, 0.8],
    [16.0, 0],
    [16.6, -1],
    [17.1, 0],
    [20.0, -0.5],
    [21.0, 0],
    [21.8, -1],
    [22.6, 0],
    [23.1, 0.2],
    [23.6, 1],
    [23.85, 0],
    [27.0, -0.3],
    [28.25, -0.7],
    [29.0, 0],
    [37.05, 0.5],
    [37.2, -0.3],
    [37.35, -1],
  ],
  face: [
    [0, "happy"],
    [2.9, "surprised"],
    [4.1, "deadpan"],
    [5.6, "curious"],
    [6.2, "guilty"],
    [6.6, "tempted"],
    [8.4, "caught"],
    [8.62, "whistle"],
    [10.4, "determined"],
    [11.0, "expectant"],
    [11.8, "confused"],
    [13.0, "surprised"],
    [13.5, "unimpressed"],
    [15.05, "curious"],
    [15.3, "mischief"],
    [15.95, "smug"],
    [16.6, "horror"],
    [17.1, "squashed"],
    [18.45, "dazed"],
    [20.0, "alarmed"],
    [21.0, "cocky"],
    [21.8, "cautious"],
    [22.6, "confident"],
    [23.1, "determined"],
    [23.6, "uhoh"],
    [23.95, "sheepish"],
    [24.3, "scream"],
    [27.0, "battered"],
    [28.4, "suspicious"],
    [29.0, "wise"],
    [30.35, "proud"],
    [32.85, "shocked"],
    [33.55, "jealous"],
    [35.0, "rage"],
    [36.55, "determined"],
    [37.2, "resigned"],
    [38.3, "squashed"],
  ],
  aHand: [
    [0, "none"],
    [6.6, "point"],
    [8.4, "open"],
    [8.62, "none"],
    [10.45, "fist"],
    [13.45, "open"],
    [14.4, "none"],
    [15.6, "point"],
    [15.95, "none"],
    [16.6, "open"],
    [17.1, "none"],
    [20.0, "open"],
    [20.7, "none"],
    [22.55, "thumb"],
    [23.05, "fist"],
    [23.6, "open"],
    [27.6, "none"],
    [33.05, "fist"],
    [37.15, "none"],
  ],
  bHand: [
    [0, "none"],
    [13.45, "open"],
    [14.4, "none"],
    [16.6, "open"],
    [17.1, "none"],
    [20.0, "open"],
    [20.7, "none"],
    [23.6, "open"],
    [27.6, "none"],
    [33.05, "fist"],
    [36.5, "none"],
  ],
  extras: (t) => ({
    scarf: true,
    helmet: t < 21.3 ? 0 : t < 26.4 ? 1 : 2,
    bandage: t >= 27.0,
  }),
  tweak: (t, c) => {
    const p = c.pose;
    // 5.6–6.2 & 6.6–8.4: anticipation tremble while tempted
    if (t > 6.6 && t < 8.4) {
      p.aE += Math.sin(t * 60) * 2.5 * ((t - 6.6) / 1.8);
    }
    // whistling walk: head bob to the tune
    if (t > 8.62 && t < 10.25) p.head += Math.sin(t * 13) * 6;
    // smash follow-through: knee wobble
    if (t > 10.86 && t < 11.3) p.lean += Math.sin((t - 10.86) * 40) * 4 * (1 - (t - 10.86) / 0.44);
    // tapping the floor while waiting for something to happen
    if (t > 11.2 && t < 12.9) p.bK += Math.max(0, Math.sin(t * 16)) * 18;
    // dazed wobble
    if (t > 18.45 && t < 20.0) {
      p.lean += Math.sin(t * 5) * 9;
      p.head += Math.sin(t * 5 + 1) * 12;
    }
    // helmet knock-knock: proud tap
    if (t > 21.3 && t < 21.45) p.aE += Math.sin((t - 21.3) * 60) * 15;
    // bye-bye wave mid-air (feet still paddling)
    if (t > 23.95 && t < 24.3) {
      p.aE += Math.sin(t * 28) * 30;
      p.aK += Math.sin(t * 22) * 20;
      p.bK -= Math.sin(t * 22) * 20;
    }
    // falling: limbs flail
    if (t > 24.3 && t < 25.0) {
      p.aS += Math.sin(t * 40) * 15;
      p.bS -= Math.sin(t * 40) * 15;
    }
    // climbing: hand-over-hand scramble
    if (t > 27.0 && t < 27.55) {
      p.aS += Math.sin(t * 30) * 20;
      p.bS -= Math.sin(t * 30) * 20;
    }
    // tired limp + heavy breathing
    if (t > 27.6 && t < 29.0) p.lean += Math.sin(t * 7) * 3;
    // the "no no no" head shake (camera-facing)
    if (t > 29.25 && t < 29.95) c.faceX = Math.sin((t - 29.25) * Math.PI * 2 * 3) * 0.6;
    if (t > 29.25 && t < 29.95) p.head += Math.sin((t - 29.25) * Math.PI * 2 * 3) * 6;
    // chin-up strut while arms crossed: little toe tap
    if (t > 30.5 && t < 32.4) p.aK += Math.max(0, Math.sin(t * 12)) * 14;
    // jealousy tremble, then full rage shaking
    if (t > 33.55 && t < 36.5) {
      const k = t > 35.0 ? 4.5 : 1.8;
      c.x += Math.sin(t * 70) * k;
      p.head += Math.sin(t * 55) * k * 0.6;
    }
  },
};

// ───────────────────── KID (red party hat, rosy cheeks, small) ─────────────────────
export const kidVisible = (t: number) => (t >= 31.0 && t < 35.2) || t >= 39.8;

const kid: Script = {
  scale: 0.72,
  seed: 1.7,
  x: [
    [31.0, 1220],
    [31.95, 790, "out"],
    [33.5, 790],
    [35.15, 1280, "in"],
    [39.8, -140],
    [40.75, 225, "out"],
  ],
  lift: [[0, 0]],
  sy: [
    [0, 1],
    [32.85, 1],
    [32.93, 0.85, "out"],
    [33.05, 1.12, "out"],
    [33.2, 1, "io"],
  ],
  facing: [
    [31, -1],
    [33.45, 1],
  ],
  gait: [
    [31, "skip"],
    [31.95, "none"],
    [33.5, "skipLegs"],
    [35.15, "none"],
    [39.8, "walkLegs"],
    [40.75, "none"],
  ],
  pose: [
    [31, "stand"],
    [31.95, "stand", 0.15],
    [32.0, "pressUp", 0.1, "back"],
    [32.3, "stand", 0.2],
    [32.85, "cheer", 0.15, "back"],
    [33.15, "crouch", 0.2],
    [33.45, "carry", 0.2, "back"],
    [39.8, "carryFront", 0],
    [40.75, "crouch", 0.3],
    [41.2, "stand", 0.25],
    [41.85, "thumbsUp", 0.2, "back"],
  ],
  faceX: [
    [31, 1],
    [32.25, 1],
    [32.35, 0.4, "out"],
    [32.8, 0.4],
    [32.9, 0, "out"],
    [33.4, 0],
    [33.5, 1, "out"],
    [41.2, 1],
    [41.3, 0.6, "out"],
    [41.8, 0.6],
    [41.9, 0, "out"],
  ],
  lookY: [
    [31, 0],
    [32.0, -0.8],
    [32.3, -1],
    [32.85, 0],
    [33.15, 0.8],
    [33.45, 0],
    [40.75, 0.8],
    [41.3, 0.6],
    [41.85, 0],
  ],
  face: [
    [31, "kidHappy"],
    [32.3, "kidCurious"],
    [32.85, "kidWow"],
    [33.45, "kidJoy"],
    [39.8, "kidConcern"],
    [41.85, "kidSmile"],
  ],
  aHand: [
    [31, "none"],
    [32.0, "point"],
    [32.3, "none"],
    [32.85, "open"],
    [39.8, "open"],
    [41.85, "thumb"],
  ],
  bHand: [
    [31, "none"],
    [32.85, "open"],
    [39.8, "open"],
    [41.2, "none"],
  ],
  extras: () => ({ partyHat: true, blush: true }),
  tweak: (t, c) => {
    // happy little head-bop while skipping
    if (c.speed !== 0) c.pose.head += Math.sin(t * 14) * 7;
  },
};

export const heroAt = (t: number) => build(hero, t);
export const kidAt = (t: number) => build(kid, t);
