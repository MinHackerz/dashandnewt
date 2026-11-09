import { dropTime, stopDistance, stopTime } from "./physics";

// ── Global act boundaries (seconds) ───────────────────────────────────────
export const SPLIT_START = 4.0; // fork → split screen race
export const SPLIT_END = 27.4; // race → finale at the truck
export const END_FADE = 35.0;
export const DURATION = 38.0;

// ── Hero's shortcut world ("H"): x grows toward the ice-cream truck ──────
export const FENCE1_X = 640;
export const FENCE_TOP = 150; // rail height (px above ground)
export const CLIMB = { t0: 4.3, t1: 4.9, x0: 590, x1: 640 };
// Free fall from the top rail: duration comes from gravity.
export const DROP = { t0: 4.9, t1: 4.9 + dropTime(FENCE_TOP), x0: 640, x1: 690 };
export const NAIL = { x: 652, y: 1380 - 132 };
export const SNAP = { t0: 6.15, t1: 6.6, x0: 960, x1: 740 }; // elastic scarf yanks him back

export const BARREL_X = 1300; // low barrel cactus he stepped over
export const BARREL_H = 60;
export const SAGUARO_X = 1432; // tall cactus blocking the way
export const SAGUARO_H = 230;
export const HOP1 = { t0: 10.65, t1: 11.35, x: 1305 }; // straight up → straight back down
export const HOP2 = { t0: 11.45, t1: 12.35, x0: 1305, x1: 1560 }; // forward, over the saguaro

export const RIVER = { near: 2000, far: 2330, surface: 1440 };
export const RUNUP = { t0: 15.05, t1: 15.47, x0: 1830, x1: 1995 };
// Same horizontal speed in the air as on the run-up (no air drag).
const runSpeed = (RUNUP.x1 - RUNUP.x0) / (RUNUP.t1 - RUNUP.t0);
export const JUMP = { t0: RUNUP.t1, t1: RUNUP.t1 + 0.6, x0: RUNUP.x1, x1: RUNUP.x1 + runSpeed * 0.6 };
export const FLOAT_LIFT = -345; // shoulders at the waterline
export const FISH = { t0: 17.0, t1: 17.6, x0: 2330, x1: 2150 };
export const CLIMB_OUT = { t0: 19.0, t1: 19.6 };

export const DRIP = { t: 22.5 }; // drop leaves the soaked scarf while he balances
export const FLEE = { t0: 24.05, accelEnd: 24.25, x0: 3160, x1: 3220, speed: 490 };
export const IMPACT_T = 25.2;
export const IMPACT_X = FLEE.x1 + FLEE.speed * (IMPACT_T - FLEE.accelEnd);
export const CHARGE_T = 24.45;

// Launch after the headbutt: heavy bull, light hero, partly elastic.
export const LAUNCH = { vx: 1500, T: 1.3 };
export const LAND_T = IMPACT_T + LAUNCH.T;
export const LAND_X = IMPACT_X + LAUNCH.vx * LAUNCH.T;
export const ROLL_DECEL = 2200; // rolling friction
export const ROLL_R = 110; // radius of the tucked body (rolling without slipping)
export const ROLL_STOP_T = LAND_T + stopTime(LAUNCH.vx, ROLL_DECEL);
export const ROLL_STOP_X = LAND_X + stopDistance(LAUNCH.vx, ROLL_DECEL);
// Choose the in-air spin so he ends face-down with his head toward the kid (90°).
const rollDeg = (stopDistance(LAUNCH.vx, ROLL_DECEL) / ROLL_R) * (180 / Math.PI);
export const FINAL_ROT = 90 + 3 * 360;
export const AIR_SPIN = FINAL_ROT - rollDeg; // degrees turned during the flight

export const FENCE2_X = 3820;
export const BULL_AFTER_V = 1300; // bull keeps most of its speed (it's ~8× heavier)
export const BULL_BRAKE = 1800;

export const TRUCK_X = 6650;
export const KID_FINALE_X = 6420;

// ── Kid's path world ("K") ────────────────────────────────────────────────
export const K = { start: 300, bridge0: 2000, bridge1: 2500, pasture0: 3300, pasture1: 4300, stop: 6000, truck: 5960 };
export const KID_ARRIVE = 25.0;
export const CONE_HANDOFF = 25.4;
export const SOLD_OUT_T = 25.8;

// Finale beats
export const OFFER_T = 29.1;
export const SLIDE_T = 29.35; // the offering arm stops dead; the soft scoop keeps going (inertia)
export const TRUCK_GO = 31.3;
export const TRUCK_ACCEL = 600;
export const BULL_RETURN = 31.9;
export const LICK = { t0: 33.0, t1: 33.8 };
