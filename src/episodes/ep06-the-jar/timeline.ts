import { POSES, type PoseName } from "../../rig/library";
import { HEAD_SCALE, solve } from "../../rig/Stickman";
import { dropTime, G, G_REAL, PX_PER_M, sealForce, sealTorque } from "./physics";

// All beat times (s) and world positions (px; x grows to the right, heights are px above
// GROUND). Dependent events are derived below from the rig and from physics — never
// hand-tuned. One principle: air pressure holds a sealed lid down.

// ── The real numbers on screen (a 7 cm jar lid, sealed at half vacuum) ────
export const LID_D = 0.07; // m
export const VACUUM = 0.5; // the jar holds about half the outside air pressure
export const SEAL_N = sealForce(LID_D, VACUUM); // ≈ 195 N
export const SEAL_KG = Math.round(SEAL_N / G_REAL); // ≈ 20 kg of push
export const SEAL_NM = sealTorque(SEAL_N, 0.4, LID_D / 2); // ≈ 2.7 N·m of twist to break it

// ── Set (props are drawn ~2× real size so they read on a phone) ───────────
export const COUNTER = { x0: 560, x1: 1240, top: 216 }; // 0.9 m
export const SHELF = { x0: 890, x1: 1000, top: 378 };
export const TABLE = { x0: 40, x1: 395, top: 175 }; // the kitchen table Newt colours at
export const TOOLBOX = { x0: 1060, x1: 1180, h: 78 };
export const JAR = { w: 76, h: 100, lidW: 84, lidH: 20 }; // the pickle jar
export const JAM = { w: 62, h: 80, lidW: 70, lidH: 16 }; // the jam jar on the shelf
export const GRIP = 40; // a hand holds a jar this far above its bottom
export const NEWT_SCALE = 0.72;

/** World-space hand point (px above ground) for a pose, at x, facing ±1, scale s */
const hand = (pose: PoseName, x: number, facing: 1 | -1, s = 1, which: "a" | "b" = "a") => {
  const j = solve(POSES[pose]);
  const p = which === "a" ? j.aHand : j.bHand;
  return { x: x + facing * s * p.x, h: -s * p.y };
};

// ── Cold open ─────────────────────────────────────────────────────────────
export const DASH_X0 = 700;
export const NEWT_X0 = 300; // colouring at the table, facing left
export const INTRO = { rub: 0.5, cocky: 1.4, grab: 2.2, lift: 2.6 };
export const JAR_COUNTER_X = hand("grabJar", DASH_X0, 1, 1, "b").x; // where his grip lands
export const INSERT_1 = { t0: 2.7, t1: 4.1 }; // close-up: the lid's button, pulled in
export const HOOK_TO = 2.5;

// ── TRY #1: bare hands ────────────────────────────────────────────────────
export const TRY = [4.2, 8.8, 14.8]; // stamps
export const T1 = { twist: 4.4, strain: 5.0, steam: 5.6, slip: 7.0, shake: 7.3, newtLooks: 7.4, end: 8.6 };

// ── TRY #2: scarf grip, jar clamped between the knees ─────────────────────
export const T2 = { scarfOff: 9.0, wrapped: 9.6, clamp: 9.9, twist: 10.2, sweat: 11.0, unwrap: 13.4, pant: 13.6, end: 14.6 };
export const TWIST_PERIOD = 0.36; // whole-body twist, back and forth
// jar between the knees (from the clamp pose's knees)
const kneeJ = solve(POSES.kneeClampA);
export const KNEE_JAR = { dx: (kneeJ.aKnee.x + kneeJ.bKnee.x) / 2 + 6, bottom: 22 };

// ── TRY #3: pipe wrench, jar on the floor ─────────────────────────────────
// He walks to the toolbox, then back; crouches to set the jar down; steps back into a heave.
export const WRENCH_X = TOOLBOX.x0 + 14; // handle sticking out of the toolbox
export const WRENCH_GRAB_X = WRENCH_X - hand("grabLowHold", 0, 1).x;
export const PLACE_X = 900; // where he crouches to set the jar down (facing left)
export const JAR_FLOOR_X = hand("crouchPlace", PLACE_X, -1, 1, "b").x;
export const HEAVE_X = JAR_FLOOR_X + 150; // wrench jaw on the lid, handle back to his hands
export const T3 = { walk: 15.0, grab: 16.0, back: 16.45, place: 16.9, set: 17.22, step: 17.35, heave: 17.7, bite: 17.75, slip: 19.2 };
export const WALK_SPEED = 300; // px/s (≈ 1.25 m/s)
export const WALK1_END = T3.walk + (WRENCH_GRAB_X - DASH_X0) / WALK_SPEED;
// The wrench lets go: nothing resists his backward heave, so he keeps going (inertia) and
// falls from his hip height onto his butt — free fall under the one G.
const HEAVE_HIP = -solve(POSES.heave).hip.y;
export const FALL_T = dropTime(HEAVE_HIP);
export const FALL_V = 1.2 * PX_PER_M; // backward speed carried from the heave (lands clear of the jar)
export const SIT_X = HEAVE_X + FALL_V * FALL_T;
export const SIT_T = T3.slip + FALL_T; // thud
export const WOMP_1 = SIT_T + 0.55;
export const SCORE = { t0: SIT_T + 0.75, t1: SIT_T + 2.5 };
// he gets up where he sat and grabs the crowbar from the toolbox right behind him
export const CROWBAR_X = SIT_X + hand("grabLow", 0, 1).x;

// ── Newt's physics look ───────────────────────────────────────────────────
export const NEWT_PICK_X = JAR_FLOOR_X - NEWT_SCALE * solve(POSES.crouchPick).bHand.x;
export const NEWT_TABLE_X = 405; // works at the table's right end, facing left
export const JAR_TABLE_X = hand("placeTable", NEWT_TABLE_X, -1, NEWT_SCALE, "b").x;
export const LOOK = { walk: 21.0, pick: 22.3, picked: 22.6, up: 22.8, back: 22.9, place: 23.9, placed: 24.2, still: 24.4, tint: 24.7, end: 30.4 };
// the chalkboard builds in steps, each held long enough to read
export const BOARD = { title: 24.8, jar: 25.1, outside: 25.6, inside: 26.2, push: 26.9, button: 27.9, formula: 28.9 };

// ── The trick: a teaspoon under the lid's edge ────────────────────────────
export const SPOON_TABLE_X = 362; // lying on the table, planted from the first frame
export const TRICK = { grab: 30.5, got: 30.75, under: 31.0, pry: 31.3, pfft: 31.35, tok: 31.6, note: 31.8, pass: 32.6, twist: 33.0, lift: 33.6, win: 33.7, lidDown: 34.2 };
export const INSERT_2 = { t0: TRICK.pfft - 0.15, t1: TRICK.tok + 0.25 }; // the button pops up (gone before the chalk note)
export const LID_TABLE_X = 352; // where Newt sets the pickle lid down

// ── Dash's wrong lesson: a bigger spoon ───────────────────────────────────
export const PRY_X = 1030; // stands here (facing left) for the shelf and the counter
export const JAM_SHELF_X = hand("reachUp", PRY_X, -1).x;
export const JAM_COUNTER_X = hand("placeCounter", PRY_X, -1).x;
export const TWIST = { idea: 33.9, look: 34.3, up: 34.6, cocky: 35.0, turn: 35.3, grab: 35.45, got: 35.7, back: 35.8, reach: 35.95, jam: 36.2, place: 36.4, set: 36.7, pry: 36.9, down: 37.2, launch: 37.3, proud: 37.38 };
// The crowbar flicks the 15 g lid straight up: apex 1.5 m above the jar, then it falls back
// onto his head (he has straightened up by then). Launch speed comes from the apex height,
// the fall time from the drop to his head, the sideways drift from where his head is.
const JAM_LID_H = COUNTER.top + JAM.h + JAM.lidH / 2;
export const LID_APEX_H = JAM_LID_H + 1.5 * PX_PER_M;
const proudJ = solve(POSES.handsHips);
const headA = ((POSES.handsHips.lean + POSES.handsHips.head) * Math.PI) / 180;
const topLocal = { x: proudJ.head.x + 52 * HEAD_SCALE * Math.sin(headA), y: proudJ.head.y - 52 * HEAD_SCALE * Math.cos(headA) };
export const HEAD_TOP = { x: PRY_X - topLocal.x, h: -topLocal.y + JAM.lidH / 2 };
export const LID_UP_T = Math.sqrt((2 * (LID_APEX_H - JAM_LID_H)) / G);
export const LID_DOWN_T = Math.sqrt((2 * (LID_APEX_H - HEAD_TOP.h)) / G);
export const LID_V0 = G * LID_UP_T;
export const LID_FLIGHT = LID_UP_T + LID_DOWN_T;
export const LID_VX = (HEAD_TOP.x - JAM_COUNTER_X) / LID_FLIGHT;
export const BONK_T = TWIST.launch + LID_FLIGHT;
export const WOMP_2 = BONK_T + 0.5;
export const KNEEL_T = BONK_T + 0.75;
export const LID_JAM = { x0: JAM_COUNTER_X, h0: JAM_LID_H };

// ── Heart: Newt shares the pickles (and the spoon) ────────────────────────
export const NEWT_SHARE_X = PRY_X - 240; // arm's length apart: his reach + Newt's meet at the jar
export const HEART = { take: 38.9, walk: 39.15, offer: 40.25, reach: 40.45, pickle: 40.65, chew: 40.85, crunch1: 41.0, crunch2: 41.35, give: 41.5, takeSpoon: 41.75, spoon: 41.95, proud: 42.1, laugh: 42.2 };
export const END_FADE = 43.4;
export const DURATION = END_FADE + 3.2;
