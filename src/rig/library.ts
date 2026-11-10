import { ease, type Ease } from "../lib/kf";
import type { Expr, Pose } from "./types";

const P = (o: Partial<Pose>): Pose => ({
  lean: 0,
  head: 0,
  aS: 10,
  aE: 8,
  bS: -10,
  bE: -8,
  aH: 7,
  aK: 3,
  bH: -7,
  bK: 3,
  ...o,
});

export const POSES = {
  stand: P({}),
  slouch: P({ lean: 8, head: 10, aS: 4, aE: 2, bS: -2, bE: 2, aK: 8, bK: 8 }),
  lookUp: P({ lean: -6, head: -28 }),
  flinchUp: P({ lean: -10, head: -30, aS: 150, aE: 40, bS: -150, bE: -40, aK: 14, bK: 14 }),
  lean: P({ lean: 12, head: 6, aS: 6, bS: -14 }),
  reach: P({ lean: 16, head: 6, aS: 74, aE: 14, bS: -38, bE: -30, aH: 20, aK: 12, bH: -20, bK: 6 }),
  recoil: P({ lean: -14, head: -6, aS: 18, aE: 125, bS: -30, bE: -20, aH: -4, aK: 6, bH: -16, bK: 10 }),
  handsBack: P({ lean: -4, head: -8, aS: -34, aE: -70, bS: -46, bE: -66 }),
  windUp: P({ lean: -10, head: -6, aS: 185, aE: 10, bS: -60, bE: -20, aH: 24, aK: 10, bH: -26, bK: 18 }),
  smash: P({ lean: 24, head: 14, aS: 76, aE: 30, bS: -60, bE: -30, aH: 26, aK: 26, bH: -24, bK: 18 }),
  shrug: P({ lean: 0, head: 12, aS: 42, aE: 105, bS: -42, bE: -105 }),
  jab: P({ lean: 22, head: 10, aS: 58, aE: 14, bS: -30, bE: -20, aH: 26, aK: 22, bH: -14, bK: 16 }),
  handsHips: P({ lean: -5, head: -8, aS: 38, aE: -100, bS: -38, bE: 100 }),
  dazed: P({ lean: 6, head: 14, aS: 18, aE: 10, bS: -24, bE: -10, aK: 14, bK: 10 }),
  alarmed: P({ lean: -12, head: -4, aS: 120, aE: 30, bS: -120, bE: -30, aH: -2, aK: 4, bH: -18, bK: 6 }),
  helmetOn: P({ lean: 0, head: 6, aS: 150, aE: 80, bS: -150, bE: -80 }),
  thumbsUp: P({ lean: -4, head: -6, aS: 50, aE: 105, bS: -10, bE: -8 }),
  pressBig: P({ lean: 26, head: 12, aS: 112, aE: 12, bS: -60, bE: -30, aH: 30, aK: 30, bH: -22, bK: 14 }),
  hang: P({ lean: 0, head: 6, aS: 100, aE: 40, bS: -100, bE: -40, aH: 30, aK: 50, bH: -12, bK: 40 }),
  wave: P({ lean: 0, head: 8, aS: 150, aE: 30, bS: -100, bE: -40, aH: 30, aK: 50, bH: -12, bK: 40 }),
  fall: P({ lean: 0, head: -10, aS: 168, aE: 10, bS: -168, bE: -10, aH: 20, aK: 40, bH: -20, bK: 40 }),
  climb: P({ lean: 6, head: -4, aS: 160, aE: 20, bS: 150, bE: 30, aH: 30, aK: 60, bH: 0, bK: 30 }),
  tired: P({ lean: 14, head: 14, aS: 6, aE: 6, bS: 2, bE: 6, aH: 10, aK: 14, bH: -6, bK: 12 }),
  crossArms: P({ lean: -4, head: -6, aS: 24, aE: 118, bS: -24, bE: -118 }),
  proud: P({ lean: -8, head: -18, aS: 24, aE: 118, bS: -24, bE: -118 }),
  fists: P({ lean: 6, head: 8, aS: 16, aE: 30, bS: -16, bE: -30, aK: 10, bK: 10 }),
  // kid
  pressUp: P({ lean: 10, head: -14, aS: 150, aE: 12, bS: -30, bE: -20, aH: 4, aK: 0, bH: -14, bK: 30 }),
  cheer: P({ lean: -6, head: -10, aS: 160, aE: 20, bS: -160, bE: -20, aH: 14, aK: 30, bH: -10, bK: 10 }),
  carry: P({ lean: -4, head: -6, aS: 170, aE: 8, bS: 170, bE: 8 }),
  carryFront: P({ lean: 0, head: 4, aS: 70, aE: 30, bS: 62, bE: 34 }),
  crouch: P({ lean: 38, head: 4, aS: 72, aE: 10, bS: 40, bE: 10, aH: 70, aK: 110, bH: 10, bK: 90 }),
  // bed & snooze story (sitting = legs straight forward; lying = stand + rot 90)
  lie: P({ aS: 4, aE: 4, bS: -4, bE: -4, aH: 4, aK: 2, bH: -4, bK: 2 }),
  lieReach: P({ aS: 173, aE: 0, bS: -4, bE: -4, aH: 4, aK: 2, bH: -4, bK: 2 }),
  sitBed: P({ lean: 0, head: 4, aS: 22, aE: 18, bS: 16, bE: 16, aH: 90, aK: 0, bH: 86, bK: 0 }),
  sitSlump: P({ lean: 16, head: 16, aS: 26, aE: 20, bS: 20, bE: 20, aH: 90, aK: 0, bH: 86, bK: 0 }),
  sitSmack: P({ lean: -8, head: -4, aS: -74, aE: 0, bS: 16, bE: 16, aH: 90, aK: 0, bH: 86, bK: 0 }),
  sitWave: P({ lean: -6, head: -8, aS: 62, aE: 85, bS: 16, bE: 16, aH: 90, aK: 0, bH: 86, bK: 0 }),
  sitReach: P({ lean: -14, head: -6, aS: -66, aE: 14, bS: 20, bE: 20, aH: 90, aK: 0, bH: 86, bK: 0 }),
  sitLookUp: P({ lean: -6, head: -24, aS: 24, aE: 18, bS: 16, bE: 16, aH: 90, aK: 0, bH: 86, bK: 0 }),
  facepalm: P({ lean: 6, head: 14, aS: 110, aE: 115, bS: -12, bE: -8 }),
  point: P({ lean: 4, head: 0, aS: 95, aE: 0, bS: -12, bE: -8 }),
  leanWall: P({ lean: -8, head: 14, aS: 48, aE: 78, bS: -16, bE: -10, aH: -8, aK: 2, bH: 14, bK: 4 }),
  leap: P({ lean: 10, head: -10, aS: 150, aE: 20, bS: -120, bE: -30, aH: 40, aK: 70, bH: -30, bK: 60 }),
  skid: P({ lean: -24, head: -10, aS: 110, aE: 30, bS: -120, bE: -30, aH: 40, aK: 10, bH: -10, bK: 30 }),
  pant: P({ lean: 26, head: 10, aS: 30, aE: 10, bS: 26, bE: 10, aH: 12, aK: 16, bH: -8, bK: 16 }),
  bendHand: P({ lean: 32, head: 6, aS: 46, aE: 6, bS: -10, bE: -10, aK: 12, bK: 12 }),
  reachUp: P({ lean: -4, head: -14, aS: 150, aE: 8, bS: -14, bE: -10 }),
  holdUp: P({ lean: -6, head: -10, aS: 120, aE: 40, bS: 110, bE: 50 }),
  // the shortcut
  climbRail: P({ lean: 10, head: -6, aS: 150, aE: 20, bS: 140, bE: 30, aH: 80, aK: 100, bH: -10, bK: 20 }),
  landSquat: P({ lean: 22, head: 10, aS: 40, aE: 20, bS: -40, bE: -20, aH: 46, aK: 90, bH: -30, bK: 80 }),
  sitGround: P({ lean: -8, head: 4, aS: -34, aE: 10, bS: -44, bE: 10, aH: 90, aK: 0, bH: 86, bK: 0 }),
  oneFoot: P({ lean: 6, head: 6, aS: 64, aE: 50, bS: -54, bE: -40, aH: 46, aK: 92, bH: -3, bK: 2 }),
  tuck: P({ lean: 40, head: 30, aS: 70, aE: 90, bS: 60, bE: 90, aH: 130, aK: 150, bH: 124, bK: 150 }),
  flail: P({ lean: -10, head: -20, aS: 160, aE: 30, bS: -150, bE: -30, aH: 40, aK: 60, bH: -30, bK: 40 }),
  swim: P({ lean: 10, head: -10, aS: 160, aE: 10, bS: 20, bE: 10, aH: 12, aK: 34, bH: -12, bK: 30 }),
  shakeOff: P({ lean: 4, head: 0, aS: 70, aE: 10, bS: -70, bE: -10, aH: 12, aK: 8, bH: -12, bK: 8 }),
  pluck: P({ lean: 20, head: 14, aS: -40, aE: -60, bS: 14, bE: 10, aH: 10, aK: 10, bH: -8, bK: 8 }),
  offer: P({ lean: 6, head: 6, aS: 80, aE: 8, bS: -12, bE: -8 }),
  lickCone: P({ lean: -2, head: -4, aS: 38, aE: 118, bS: -12, bE: -8 }),
  laugh: P({ lean: -12, head: -20, aS: 32, aE: 72, bS: -32, bE: -72, aK: 8, bK: 8 }),
  shh: P({ lean: 8, head: 6, aS: 112, aE: 124, bS: -30, bE: -30 }),
  smugPoint: P({ lean: -6, head: -10, aS: 92, aE: 0, bS: -30, bE: 110 }),
  rub: P({ lean: 6, head: 4, aS: 50, aE: 80, bS: 40, bE: 90 }),
  // hands and knees (used with the body rotated 90°): arms and thighs point at the ground
  crawl: P({ lean: 0, head: -20, aS: 90, aE: 0, bS: 86, bE: 0, aH: 90, aK: 90, bH: 88, bK: 90 }),
  kneel: P({ lean: 4, head: 6, aS: 14, aE: 10, bS: -10, bE: -8, aH: 2, aK: 90, bH: 0, bK: 90 }),
  // the boulder
  stretchUp: P({ lean: -4, head: -12, aS: 176, aE: 2, bS: -176, bE: -2 }),
  sideStretch: P({ lean: -22, head: -14, aS: 168, aE: 14, bS: -36, bE: -50 }),
  lunge: P({ lean: 14, head: -4, aS: 30, aE: 10, bS: -30, bE: 10, aH: 60, aK: 70, bH: -40, bK: 4 }),
  lickFinger: P({ lean: -2, head: -4, aS: 120, aE: 107, bS: -12, bE: -8 }),
  testWind: P({ lean: -4, head: -16, aS: 172, aE: 4, bS: -12, bE: -8 }),
  kickWind: P({ lean: -10, head: 4, aS: -50, aE: 20, bS: 60, bE: 20, aH: -45, aK: 70, bH: 4, bK: 6 }),
  kick: P({ lean: -18, head: -6, aS: 50, aE: 10, bS: -80, bE: 10, aH: 95, aK: 4, bH: -6, bK: 8 }),
  tap: P({ lean: -4, head: 10, aS: 20, aE: 10, bS: -20, bE: 10, aH: 30, aK: 6, bH: -4, bK: 6 }),
  pushHard: P({ lean: 34, head: -4, aS: 88, aE: 6, bS: 82, bE: 8, aH: 22, aK: 30, bH: -40, bK: 8 }),
  pushBack: P({ lean: -26, head: 8, aS: -40, aE: -30, bS: -50, bE: -24, aH: 40, aK: 60, bH: 30, bK: 50 }),
  shoulderCharge: P({ lean: 30, head: 4, aS: 20, aE: 110, bS: -40, bE: 60, aH: 30, aK: 40, bH: -30, bK: 30 }),
  splat: P({ lean: 0, head: 0, aS: 135, aE: 10, bS: -135, bE: -10, aH: 30, aK: 5, bH: -30, bK: 5 }),
  shadeEyes: P({ lean: -6, head: -24, aS: 140, aE: 100, bS: -12, bE: -8 }),
  sitHold: P({ lean: 4, head: 0, aS: 30, aE: 10, bS: 24, bE: 10, aH: 90, aK: 0, bH: 86, bK: 0 }),
  sitCheer: P({ lean: -8, head: -14, aS: 160, aE: 20, bS: -160, bE: -20, aH: 90, aK: 0, bH: 86, bK: 0 }),
  countdown: P({ lean: -2, head: -6, aS: 150, aE: 20, bS: -12, bE: -8 }),
  draped: P({ lean: 74, head: -46, aS: 12, aE: 6, bS: -6, bE: 6, aH: 6, aK: 4, bH: -6, bK: 4 }),
  hangKid: P({ lean: 0, head: -8, aS: 172, aE: 4, bS: 168, bE: 6, aH: 40, aK: 80, bH: 30, bK: 70 }),
  // space
  floatIdle: P({ lean: 4, head: -4, aS: 60, aE: 30, bS: -50, bE: -30, aH: 22, aK: 34, bH: -14, bK: 22 }),
  holdOut: P({ lean: -4, head: 0, aS: 92, aE: 4, bS: -40, bE: -24, aH: 18, aK: 30, bH: -16, bK: 24 }),
  throwFwd: P({ lean: 10, head: 4, aS: 110, aE: 0, bS: -60, bE: -20, aH: 24, aK: 30, bH: -20, bK: 20 }),
  coverEyes: P({ lean: 8, head: 10, aS: 116, aE: 118, bS: 104, bE: 122, aH: 30, aK: 50, bH: 10, bK: 40 }),
  waveBye: P({ lean: 0, head: 6, aS: 150, aE: 30, bS: -12, bE: -8 }),
  sitShade: P({ lean: -10, head: -30, aS: 140, aE: 100, bS: 24, bE: 10, aH: 90, aK: 0, bH: 86, bK: 0 }),
  // the jar (arms solved so the fists land on the lid / jar body / tool handles)
  grabJar: P({ lean: 12, head: 14, aS: 77, aE: 84, bS: 29, bE: 86 }),
  twistJar: P({ lean: 4, head: 10, aS: 68, aE: 91, bS: 25, bE: 84 }),
  strainJar: P({ lean: -8, head: -6, aS: 79, aE: 65, bS: 42, bE: 61, aK: 8, bK: 8 }),
  slipOff: P({ lean: -12, head: -8, aS: 147, aE: -1, bS: 56, bE: 36 }),
  shakeHand: P({ lean: 0, head: 14, aS: 14, aE: 24, bS: 29, bE: 78 }),
  kneeClampA: P({ lean: 22, head: 8, aS: -33, aE: 98, bS: -38, bE: 98, aH: 64, aK: 96, bH: 44, bK: 96 }),
  kneeClampB: P({ lean: 6, head: 14, aS: -4, aE: 72, bS: -9, bE: 75, aH: 64, aK: 96, bH: 44, bK: 96 }),
  grabLowHold: P({ lean: 34, head: 10, aS: 3, aE: 1, bS: -22, bE: 134, aK: 12, bK: 12 }),
  crouchPlace: P({ lean: 38, head: 4, aS: 69, aE: -110, bS: 10, bE: 1, aH: 70, aK: 110, bH: 10, bK: 90 }),
  heave: P({ lean: -22, head: -4, aS: 22, aE: 58, bS: 50, bE: 1, aH: 42, aK: 10, bH: -14, bK: 6 }),
  heave2: P({ lean: -28, head: -10, aS: 33, aE: 46, bS: 55, bE: 1, aH: 42, aK: 10, bH: -14, bK: 6 }),
  grabLow: P({ lean: 34, head: 10, aS: 2, aE: 1, bS: -35, bE: 1, aK: 12, bK: 12 }),
  placeCounter: P({ lean: 14, head: 12, aS: 20, aE: 95, bS: -27, bE: 11 }),
  pry: P({ lean: 18, head: 16, aS: 150, aE: 97, bS: 135, bE: 114 }),
  pryDown: P({ lean: 24, head: 18, aS: 140, aE: 132, bS: 123, bE: 146 }),
  kneelReach: P({ lean: 14, head: 6, aS: 72, aE: 87, bS: -10, bE: -8, aH: 2, aK: 90, bH: 0, bK: 90 }),
  kneelTake: P({ lean: 14, head: 4, aS: 45, aE: 81, bS: -10, bE: -8, aH: 2, aK: 90, bH: 0, bK: 90 }),
  kneelChew: P({ lean: 4, head: 8, aS: 90, aE: 106, bS: -10, bE: -8, aH: 2, aK: 90, bH: 0, bK: 90 }),
  kneelSpoon: P({ lean: -4, head: -10, aS: 160, aE: 10, bS: -20, bE: -10, aH: 2, aK: 90, bH: 0, bK: 90 }),
  // kid at the kitchen table (scale 0.72; table top 175 px)
  colour: P({ lean: 10, head: 20, aS: 8, aE: 102, bS: -6, bE: 114 }),
  crouchPick: P({ lean: 38, head: 4, aS: -40, aE: 114, bS: 6, bE: 1, aH: 70, aK: 110, bH: 10, bK: 90 }),
  holdJar: P({ lean: 0, head: 8, aS: 51, aE: 106, bS: 16, bE: 53 }),
  placeTable: P({ lean: 20, head: 10, aS: 108, aE: 80, bS: 56, bE: 87 }),
  spoonGrab: P({ lean: 14, head: 16, aS: -29, aE: 141, bS: -31, bE: 28 }),
  spoonPass: P({ lean: 4, head: 10, aS: 5, aE: 122, bS: -3, bE: 120 }),
  takeJarA: P({ lean: 20, head: 10, aS: 56, aE: 87, bS: -36, bE: 24 }),
  lidDown: P({ lean: 20, head: 14, aS: 9, aE: 99, bS: -36, bE: 24 }),
  spoonPry: P({ lean: 6, head: 10, aS: 113, aE: 66, bS: 39, bE: 118 }),
  twistOff: P({ lean: 14, head: 10, aS: 134, aE: 33, bS: 37, bE: 134 }),
  liftLid: P({ lean: 4, head: -12, aS: 154, aE: 1, bS: 40, bE: 113 }),
  offerJar: P({ lean: 6, head: 6, aS: 48, aE: 39, bS: -10, bE: 1 }),
  giveSpoon: P({ lean: 8, head: 4, aS: 42, aE: 48, bS: 41, bE: 88 }),
  // saved (ep07): the bodyguard
  shield: P({ lean: -2, head: -2, aS: 92, aE: 0, bS: -92, bE: 0, aH: 24, aK: 8, bH: -24, bK: 8 }),
  reachFwd: P({ lean: 8, head: 6, aS: 58, aE: 18, bS: -14, bE: 6 }),
  tossUp: P({ lean: -6, head: -16, aS: 150, aE: 8, bS: -20, bE: 6 }),
  lookHand: P({ lean: 10, head: 18, aS: 40, aE: 110, bS: -10, bE: -8 }),
  yankReach: P({ lean: 10, head: 4, aS: 72, aE: 4, bS: -30, bE: -20, aH: 26, aK: 10, bH: -20, bK: 6 }),
  yankPull: P({ lean: -24, head: -6, aS: 18, aE: 122, bS: -44, bE: 24, aH: 32, aK: 12, bH: -16, bK: 6 }),
  handHeart: P({ lean: -4, head: -12, aS: 30, aE: 125, bS: -10, bE: -8 }),
  wipeBrow: P({ lean: -2, head: -10, aS: 122, aE: 112, bS: -10, bE: -8 }),
  holdHat: P({ lean: 6, head: 16, aS: 56, aE: 64, bS: -10, bE: -8 }),
  hatChest: P({ lean: 4, head: 10, aS: 34, aE: 116, bS: -10, bE: -8 }),
  // umbrella duty (ep08)
  tieShoe: P({ lean: 40, head: 22, aS: 52, aE: 24, bS: 44, bE: 30, aH: 78, aK: 96, bH: -6, bK: 96 }),
  tugLaces: P({ lean: 30, head: 14, aS: 96, aE: 10, bS: -40, bE: 20, aH: 78, aK: 96, bH: -6, bK: 96 }),
  dragHeavy: P({ lean: -20, head: -4, aS: 30, aE: 20, bS: 24, bE: 24, aH: 24, aK: 14, bH: -18, bK: 8 }),
  checkWatch: P({ lean: 4, head: 16, aS: 34, aE: 118, bS: 30, bE: 100 }),
  footUp: P({ lean: 34, head: 26, aS: 60, aE: 30, bS: 50, bE: 30, aH: 95, aK: 70, bH: -4, bK: 4 }),
  jumpReach: P({ lean: -8, head: -30, aS: 170, aE: 2, bS: -40, bE: 20, aH: 10, aK: 34, bH: -18, bK: 44 }),
  handsOnHead: P({ lean: -4, head: -22, aS: 150, aE: 120, bS: 150, bE: 120, aK: 4, bK: 4 }),
  // big bounce (ep09): the seesaw
  sitLow: P({ lean: 10, head: 2, aS: 40, aE: 30, bS: 34, bE: 30, aH: 115, aK: 115, bH: 108, bK: 108 }), // low seat, knees up, feet on the ground
  sitRide: P({ lean: 6, head: 0, aS: 50, aE: 30, bS: 44, bE: 30, aH: 92, aK: 92, bH: 86, bK: 86 }), // high seat, legs dangling
  salute: P({ lean: -4, head: -6, aS: 128, aE: 116, bS: -8, bE: -6 }),
  thumbMeasure: P({ lean: -2, head: 4, aS: 100, aE: 0, bS: -8, bE: -6 }),
  pencil: P({ lean: 0, head: -4, aS: 24, aE: 118, bS: -24, bE: -118, aH: 2, aK: 0, bH: -2, bK: 0 }),
  peekWall: P({ lean: 12, head: 10, aS: 70, aE: 40, bS: 60, bE: 44 }),
  lieFold: P({ lean: 0, head: 0, aS: 24, aE: 118, bS: -24, bE: -118, aH: 4, aK: 2, bH: -4, bK: 2 }),
  digScoop: P({ lean: 40, head: 10, aS: 60, aE: 20, bS: 30, bE: 30, aH: 30, aK: 30, bH: -16, bK: 10 }),
  digLift: P({ lean: 6, head: 0, aS: 70, aE: 50, bS: 40, bE: 60, aH: 10, aK: 10, bH: -10, bK: 6 }),
  digToss: P({ lean: -16, head: -10, aS: 150, aE: 30, bS: 120, bE: 40, aH: -6, aK: 6, bH: 10, bK: 6 }),
  holdHelmet: P({ lean: 8, head: 10, aS: 80, aE: 40, bS: 70, bE: 44 }),
  limp: P({ lean: 0, head: 12, aS: 48, aE: 24, bS: -58, bE: 14, aH: 14, aK: 10, bH: -10, bK: 16 }),
  slump: P({ lean: 16, head: 22, aS: 30, aE: 20, bS: 24, bE: 20, aH: 92, aK: 92, bH: 86, bK: 86 }),
  // wrong door (ep11): a stiff shop door
  doorPush: P({ lean: 8, head: 4, aS: 84, aE: 8, bS: -14, bE: -8, aH: 14, aK: 8, bH: -14, bK: 4 }), // one flat hand on the door
  doorSplat: P({ lean: 3, head: -14, aS: 158, aE: 6, bS: 150, bE: 8, aH: 4, aK: 2, bH: -4, bK: 2 }), // flat against it, arms up
  lieThumb: P({ aS: 92, aE: 0, bS: -4, bE: -4, aH: 4, aK: 2, bH: -4, bK: 2 }), // flat on his back, one arm straight up
  // it's right there (ep12): a rock pool
  kneelPeer: P({ lean: 42, head: 34, aS: 30, aE: 30, bS: 10, bE: 40, aH: 2, aK: 90, bH: 0, bK: 90 }), // kneeling at the edge, peering in
  kneelLook: P({ lean: 4, head: 16, aS: 52, aE: 112, bS: -10, bE: -8, aH: 2, aK: 90, bH: 0, bK: 90 }), // inspecting his own arm
  kneelHorror: P({ lean: -16, head: -6, aS: 40, aE: 100, bS: -60, bE: -30, aH: 2, aK: 90, bH: 0, bK: 90 }), // arm yanked out, recoiling
  spear: P({ lean: 30, head: 26, aS: 60, aE: 20, bS: -50, bE: 40, aH: 46, aK: 66, bH: -16, bK: 46 }), // crouched spear-fisher, front arm on the stick (IK)
  wade: P({ lean: 10, head: 30, aS: 74, aE: 56, bS: 64, bE: 62, aH: 6, aK: 10, bH: -6, bK: 10 }), // arms up out of the water, looking down
  toeGrab: P({ lean: 26, head: 26, aS: 40, aE: 30, bS: 30, bE: 40, aH: 50, aK: 120, bH: -6, bK: 4 }), // hopping, clutching a foot
  flipOver: P({ lean: -6, head: -10, aS: 168, aE: 70, bS: -14, bE: -10 }), // tossing a coin back over his shoulder
  wishEyes: P({ lean: -2, head: -8, aS: 58, aE: 128, bS: -12, bE: -8 }), // coin held to his lips
  // one flare (ep10): castaways
  shoutCup: P({ lean: -10, head: -8, aS: 104, aE: 122, bS: 92, bE: 128, aH: 12, aK: 4, bH: -14, bK: 6 }),
  megaphone: P({ lean: -8, head: -6, aS: 92, aE: 96, bS: 70, bE: 84, aH: 14, aK: 6, bH: -14, bK: 6 }),
  palmShout: P({ lean: 4, head: -6, aS: 104, aE: 122, bS: 70, bE: 70, aH: 60, aK: 80, bH: 46, bK: 90 }),
  aimUp: P({ lean: -10, head: -26, aS: 170, aE: 2, bS: 150, bE: 24, aH: 10, aK: 4, bH: -16, bK: 8 }),
  holdGun: P({ lean: -2, head: -4, aS: 60, aE: 70, bS: -12, bE: -8 }),
  sitHug: P({ lean: 14, head: 10, aS: 60, aE: 70, bS: 52, bE: 74, aH: 70, aK: 110, bH: 64, bK: 116 }),
  sitOffer: P({ lean: -4, head: 4, aS: 78, aE: 12, bS: -44, bE: 10, aH: 90, aK: 0, bH: 86, bK: 0 }),
} satisfies Record<string, Pose>;

export type PoseName = keyof typeof POSES;

const E = (o: Partial<Expr> & Pick<Expr, "eyes" | "mouth">): Expr => ({ brow: 0, browAng: 0, ...o });

export const FACES = {
  happy: E({ eyes: "dot", mouth: "smile", brow: 0.3 }),
  content: E({ eyes: "happy", mouth: "smile", brow: 0.4 }),
  surprised: E({ eyes: "wide", mouth: "o", brow: 1, pupil: 0.8 }),
  deadpan: E({ eyes: "half", mouth: "flat", brow: -0.3 }),
  curious: E({ eyes: "dot", mouth: "tiny", brow: 0.2, browAsym: 0.9 }),
  guilty: E({ eyes: "half", mouth: "smirk", brow: 0.2, browAng: -0.4, browAsym: 0.6 }),
  tempted: E({ eyes: "wide", mouth: "teeth", brow: 0.6, browAng: -0.6, pupil: 1.3, sweat: true }),
  caught: E({ eyes: "wide", mouth: "O", brow: 1, pupil: 0.5 }),
  whistle: E({ eyes: "closed", mouth: "whistle", brow: 0.8 }),
  determined: E({ eyes: "dot", mouth: "grin", brow: -0.6, browAng: 1 }),
  expectant: E({ eyes: "wide", mouth: "smile", brow: 0.9, pupil: 1.2 }),
  confused: E({ eyes: "dot", mouth: "wavy", brow: 0.2, browAsym: 1, browAng: -0.3 }),
  unimpressed: E({ eyes: "half", mouth: "flat", brow: -0.5, browAng: 0.2 }),
  mischief: E({ eyes: "dot", mouth: "grin", brow: -0.2, browAng: 0.6, browAsym: 0.5 }),
  smug: E({ eyes: "half", mouth: "smirk", brow: 0.4, browAsym: 0.4 }),
  horror: E({ eyes: "wide", mouth: "O", brow: 1.2, browAng: -0.8, pupil: 0.45, sweat: true }),
  squashed: E({ eyes: "squeeze", mouth: "wavy", brow: 0 }),
  dazed: E({ eyes: "spiral", mouth: "wavy" }),
  alarmed: E({ eyes: "wide", mouth: "teeth", brow: 1.2, browAng: -0.6, pupil: 0.5 }),
  cocky: E({ eyes: "half", mouth: "grin", brow: 0.3, browAsym: 0.5 }),
  cautious: E({ eyes: "dot", mouth: "flat", brow: -0.4, browAng: 0.6 }),
  confident: E({ eyes: "happy", mouth: "grin", brow: 0.6 }),
  uhoh: E({ eyes: "wide", mouth: "tiny", brow: 0.8, browAng: -1, pupil: 0.7, sweat: true }),
  sheepish: E({ eyes: "dot", mouth: "sadSmile", brow: 0.5, browAng: -1, sweat: true }),
  scream: E({ eyes: "squeeze", mouth: "O", brow: 1 }),
  battered: E({ eyes: "half", mouth: "frown", brow: -0.4, browAng: -0.4 }),
  suspicious: E({ eyes: "half", mouth: "flat", brow: -0.6, browAng: 0.5, browAsym: 0.8 }),
  wise: E({ eyes: "closed", mouth: "flat", brow: 0.2 }),
  proud: E({ eyes: "closed", mouth: "smirk", brow: 0.6 }),
  shocked: E({ eyes: "wide", mouth: "O", brow: 1.2, pupil: 0.6 }),
  jealous: E({ eyes: "dot", mouth: "frown", brow: -0.7, browAng: 1, sweat: true }),
  rage: E({ eyes: "wide", mouth: "teeth", brow: -0.8, browAng: 1.3, pupil: 0.5, vein: true, twitch: true }),
  resigned: E({ eyes: "half", mouth: "flat", brow: -0.2, browAng: -0.5 }),
  // kid
  kidHappy: E({ eyes: "happy", mouth: "smile", brow: 0.5 }),
  kidCurious: E({ eyes: "wide", mouth: "o", brow: 0.8, pupil: 1.2 }),
  kidWow: E({ eyes: "wide", mouth: "laugh", brow: 1, pupil: 1.4 }),
  kidJoy: E({ eyes: "happy", mouth: "laugh", brow: 0.7 }),
  kidConcern: E({ eyes: "dot", mouth: "frown", brow: 0.6, browAng: -1 }),
  kidSmile: E({ eyes: "happy", mouth: "grin", brow: 0.6 }),
  sleep: E({ eyes: "closed", mouth: "o", brow: 0.2 }),
  annoyed: E({ eyes: "squeeze", mouth: "frown", brow: -0.4, browAng: 0.8 }),
  groggy: E({ eyes: "half", mouth: "wavy", brow: -0.6, browAsym: 0.5 }),
  ow: E({ eyes: "squeeze", mouth: "teeth", brow: 0.6, browAng: -0.5 }),
  sad: E({ eyes: "dot", mouth: "frown", brow: 0.7, browAng: -1, tear: true }),
  tender: E({ eyes: "happy", mouth: "smile", brow: 0.6, browAng: -0.4, tear: true }),
  kidImpatient: E({ eyes: "dot", mouth: "flat", brow: -0.5, browAng: 0.9 }),
  kidDeadpan: E({ eyes: "half", mouth: "flat", brow: -0.3 }),
  kidWorried: E({ eyes: "wide", mouth: "wavy", brow: 0.9, browAng: -1, pupil: 0.7, sweat: true }),
  kidDisappointed: E({ eyes: "half", mouth: "frown", brow: 0.4, browAng: -1 }),
  dead: E({ eyes: "x", mouth: "wavy", brow: 0 }), // cartoon death (never graphic)
  teenBored: E({ eyes: "half", mouth: "flat", brow: -0.5 }),
  adultTired: E({ eyes: "half", mouth: "sadSmile", brow: 0.2, browAng: -0.6 }),
  longing: E({ eyes: "wide", mouth: "smile", brow: 0.8, browAng: -0.6, pupil: 1.5 }),
  soggy: E({ eyes: "half", mouth: "frown", brow: -0.2, browAng: -0.6 }),
  sneaky: E({ eyes: "dot", mouth: "tiny", brow: 0.4, browAng: -0.4, sweat: true }),
  laughing: E({ eyes: "happy", mouth: "laugh", brow: 0.6 }),
  kidSad: E({ eyes: "dot", mouth: "frown", brow: 0.6, browAng: -1 }),
  // the boulder
  strain: E({ eyes: "squeeze", mouth: "teeth", brow: -0.6, browAng: 1, vein: true, sweat: true }),
  idea: E({ eyes: "wide", mouth: "grin", brow: 1.1, pupil: 1.4 }),
  braced: E({ eyes: "squeeze", mouth: "teeth", brow: 1, browAng: -0.6 }),
  // the jar
  kidFocus: E({ eyes: "half", mouth: "tiny", brow: -0.2, browAng: 0.5 }),
  puffed: E({ eyes: "squeeze", mouth: "flat", brow: -0.5, browAng: 1, vein: true }),
} satisfies Record<string, Expr>;

export type FaceName = keyof typeof FACES;

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

export const mixPose = (a: Pose, b: Pose, u: number): Pose => {
  const o = { ...a };
  for (const k of Object.keys(a) as (keyof Pose)[]) o[k] = lerp(a[k], b[k], u);
  return o;
};

// [start time, pose, transition seconds, easing]: blends from the previous pose
export type PoseKey = readonly [number, PoseName, number?, Ease?];

export const poseAt = (t: number, keys: readonly PoseKey[]): Pose => {
  let i = 0;
  for (let k = 0; k < keys.length; k++) if (t >= keys[k][0]) i = k;
  const [start, name, dur = 0.15, e = "out"] = keys[i];
  const target = POSES[name];
  if (i === 0 || t >= start + dur) return target;
  const prev = poseAt(start - 1e-6, keys.slice(0, i));
  return mixPose(prev, target, ease(e, (t - start) / dur));
};

export type Gait = "none" | "walk" | "walkLegs" | "run" | "runLegs" | "skip" | "skipLegs" | "tiptoe";

// Overrides legs (and arms) with a locomotion cycle driven by distance travelled
export const applyGait = (p: Pose, gait: Gait, x: number): { pose: Pose; hop: number } => {
  if (gait === "none") return { pose: p, hop: 0 };
  const run = gait === "run" || gait === "runLegs";
  const skip = gait === "skip" || gait === "skipLegs";
  const stride = run ? 380 : skip ? 300 : gait === "tiptoe" ? 170 : 250;
  const ph = (x / stride) * Math.PI * 2;
  const s = Math.sin(ph);
  const amp = run ? 48 : gait === "tiptoe" ? 18 : 26;
  const knee = (o: number) => (run ? 25 + 70 * Math.max(0, -Math.cos(ph + o)) : 6 + 32 * Math.max(0, -Math.cos(ph + o)));
  const o: Pose = { ...p, aH: amp * s, bH: -amp * s, aK: knee(0), bK: knee(Math.PI) };
  if (run) o.lean = Math.max(p.lean, 24);
  if (gait === "tiptoe") {
    o.lean = 4;
    o.aK = 30 + 20 * Math.max(0, -Math.cos(ph));
    o.bK = 30 + 20 * Math.max(0, -Math.cos(ph + Math.PI));
  }
  if (gait === "walk" || gait === "run" || gait === "skip") {
    const arm = run ? 55 : 24;
    o.aS = -arm * s;
    o.bS = arm * s;
    o.aE = run ? 80 : 14;
    o.bE = run ? 80 : 14;
  }
  if (gait === "skip") {
    o.aS = 120 + 30 * s;
    o.bS = -120 + 30 * s;
    o.aE = 30;
    o.bE = -30;
  }
  const hop = skip ? Math.abs(Math.sin(ph)) * 34 : run ? Math.abs(Math.sin(ph)) * 10 : 0;
  return { pose: o, hop };
};

// Subtle idle life so no one ever freezes like a statue
export const breathe = (p: Pose, t: number, amt = 1): Pose => ({
  ...p,
  lean: p.lean + Math.sin(t * 2.4) * 1.2 * amt,
  head: p.head + Math.sin(t * 2.4 - 0.6) * 1.6 * amt,
  aS: p.aS + Math.sin(t * 2.4 + 0.4) * 2 * amt,
  bS: p.bS - Math.sin(t * 2.4 + 0.4) * 2 * amt,
});

// Deterministic blink every few seconds (frames 0..2 of each cycle)
export const blinkAt = (t: number, seed: number) => {
  const period = 2.9 + seed * 0.7;
  const local = (t + seed * 1.3) % period;
  return local < 0.1 ? 1 : 0;
};
