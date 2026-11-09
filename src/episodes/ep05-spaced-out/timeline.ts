import { PX_PER_M } from "./physics";

// All beat times (s) and positions. One principle: every push pushes back (Newton's 3rd law /
// conservation of momentum). Dependent motion is derived below — never hand-tuned.
// Space scenes use "world" px with y growing DOWN (screen-like); surfaces use GROUND + lift.

export const M = { dash: 90, newt: 40, wrench: 3, sandwich: 0.3, flare: 0.5, meteor: 400 }; // kg, with suits
const mps = (v: number) => v * PX_PER_M; // m/s → px/s

// ── S1 · Launch from Earth ────────────────────────────────────────────────
export const LAUNCH = { lights: [1.0, 1.5, 2.0], ignite: 2.4, lift: 2.8, end: 6.0 };
export const ROCKET_ACCEL = mps(2 * 9.8); // net upward acceleration after liftoff

// ── S2 · Cruise, Dash maxes the throttle, the rocket bursts (silently) ───
export const CRUISE = { start: LAUNCH.end, eye: 6.5, no: 7.1, cocky: 7.6, shove: 8.3, maxed: 8.55, burst: 10.8, end: 14.4 };
// The burst pushes the two of them apart: equal and opposite momentum, so the lighter one
// (Newt, 40 kg) drifts off faster than Dash (90 kg).
export const V_NEWT0 = { x: -mps(0.12), y: -mps(0.02) };
export const V_DASH0 = { x: (-V_NEWT0.x * M.newt) / M.dash, y: (-V_NEWT0.y * M.newt) / M.dash };
export const SOUND_NOTE = { t0: CRUISE.burst + 0.5, t1: CRUISE.burst + 3.0 }; // "(no air = no sound)"

// ── S3 · Stranded between two planets ─────────────────────────────────────
// Same drift continues (nothing in space slows you down). Positions are around their
// centre of mass; separation 2.2 m when the scene opens.
export const STRAND = { start: CRUISE.end, swim: 15.0, swimEnd: 18.8, run: 19.0, runEnd: 20.9, spot: 21.3, look: 22.2, lookEnd: 23.6, grab: 23.9, throw: 24.6, copy: 25.3, dashThrow: 26.2 };
const SEP0 = 2.2 * PX_PER_M;
export const NEWT_S3 = { x: (-SEP0 * M.dash) / (M.dash + M.newt), y: 0 };
export const DASH_S3 = { x: (SEP0 * M.newt) / (M.dash + M.newt), y: 0 };
export const driftAt = (p0: { x: number; y: number }, v: { x: number; y: number }, t0: number, t: number) => ({
  x: p0.x + v.x * (t - t0),
  y: p0.y + v.y * (t - t0),
});

// The emergency flare floats up and to the left of Newt, out of reach.
export const FLARE_POS = { x: NEWT_S3.x - 0.9 * PX_PER_M, y: -1.35 * PX_PER_M };
// Newt throws the wrench so that his NEW velocity carries him to the flare in REACH_T seconds.
const REACH_T = 3.0;
const newtAtThrow = driftAt(NEWT_S3, V_NEWT0, STRAND.start, STRAND.throw);
export const V_NEWT1 = { x: (FLARE_POS.x - newtAtThrow.x) / REACH_T, y: (FLARE_POS.y - newtAtThrow.y) / REACH_T };
const dV = { x: V_NEWT1.x - V_NEWT0.x, y: V_NEWT1.y - V_NEWT0.y };
// the wrench goes the other way, ~13× faster (it is ~13× lighter)
export const V_WRENCH = { x: (-dV.x * M.newt) / M.wrench, y: (-dV.y * M.newt) / M.wrench };
export const CATCH_T = STRAND.throw + REACH_T;

// Dash copies — but throws his sandwich TOWARD the flare, at 4 m/s. 0.3 kg vs 90 kg:
// he drifts back by a sad 1.3 cm/s.
const dashAtThrow = driftAt(DASH_S3, V_DASH0, STRAND.start, STRAND.dashThrow);
const toFlare = { x: FLARE_POS.x - dashAtThrow.x, y: FLARE_POS.y - dashAtThrow.y };
const toFlareLen = Math.hypot(toFlare.x, toFlare.y);
export const V_SANDWICH = { x: (mps(4) * toFlare.x) / toFlareLen, y: (mps(4) * toFlare.y) / toFlareLen };
export const V_DASH1 = {
  x: V_DASH0.x - (V_SANDWICH.x * M.sandwich) / M.dash,
  y: V_DASH0.y - (V_SANDWICH.y * M.sandwich) / M.dash,
};

// The flare is a little rocket: hot gas out one end pushes Newt the other way.
export const FLARE_THRUST = 300; // N
export const FLARE_ACCEL = mps(FLARE_THRUST / (M.newt + M.flare)); // ≈ 7.4 m/s²
export const FLIGHT = { light: CATCH_T + 0.5, look: CATCH_T + 1.1, burn: CATCH_T + 2.5 };
export const FLIGHT_DIR = { x: -0.62, y: 0.78 }; // toward the green planet (bottom-left)
export const FLIGHT_BURN_T = 2.4; // seen in this shot before the cut
export const STRAND_END = FLIGHT.burn + FLIGHT_BURN_T;

// ── S4 · Landing on the green planet: flame pointed AT the planet to brake ──
export const G_GREEN = mps(3.7); // surface gravity
const V_ARRIVE = mps(6);
const BRAKE = FLARE_ACCEL - G_GREEN; // net deceleration while the flame points down
export const GREEN = { start: STRAND_END, arrive: STRAND_END + 0.2 };
export const LAND_H0 = (V_ARRIVE * V_ARRIVE) / (2 * BRAKE);
export const TOUCH_T = GREEN.arrive + V_ARRIVE / BRAKE;
export const greenDescent = (t: number) => {
  const tau = Math.max(0, Math.min(t - GREEN.arrive, TOUCH_T - GREEN.arrive));
  return LAND_H0 - (V_ARRIVE * tau - 0.5 * BRAKE * tau * tau);
};
export const GREEN_BEATS = { flameOut: TOUCH_T + 0.4, cheer: TOUCH_T + 0.8, sprout: TOUCH_T + 1.6, end: TOUCH_T + 3.4 };

// ── S5 · Dash alone; a slow space rock (400 kg, 2 m/s) drifts in ─────────
export const ALONE = { start: GREEN_BEATS.end, bored: GREEN_BEATS.end + 0.3, seen: GREEN_BEATS.end + 2.6, swim: GREEN_BEATS.end + 3.6, cover: GREEN_BEATS.end + 4.6, hit: GREEN_BEATS.end + 5.2 };
export const METEOR_V = mps(2);
export const METEOR_DIR = { x: 0.6, y: -0.8 }; // from the bottom-left, heading for the grey planet (top-right)
// Perfectly inelastic: he sticks to it, and the pair carries on more slowly.
export const V_AFTER = (M.meteor * METEOR_V) / (M.meteor + M.dash);
export const ALONE_END = ALONE.hit + 2.6;

// ── S6 · The grey planet: no air, low gravity ─────────────────────────────
// They fell a long way (H_FALL) before this shot: gravity only adds DOWNWARD speed, so they
// arrive almost straight down and fast, with the sideways drift they had in space unchanged.
export const G_GREY = mps(1.6);
export const GREY = { start: ALONE_END, lead: 1.4 }; // a quiet beat on the surface (their shadow growing) before they arrive
const H_FALL = 150 * PX_PER_M;
const H_ENTER = 8 * PX_PER_M; // the part we see
const VY0 = Math.sqrt((V_AFTER * 0.8) ** 2 + 2 * G_GREY * H_FALL); // downward speed as they enter the shot
export const VX_GREY = V_AFTER * 0.6;
export const GREY_FALL_T = (-VY0 + Math.sqrt(VY0 * VY0 + 2 * G_GREY * H_ENTER)) / G_GREY;
export const IMPACT_T = GREY.start + GREY.lead + GREY_FALL_T;
export const greyFall = (t: number) => {
  const tau = Math.max(0, Math.min(t - GREY.start - GREY.lead, GREY_FALL_T));
  return { dx: VX_GREY * tau, h: H_ENTER - VY0 * tau - 0.5 * G_GREY * tau * tau };
};
export const IMPACT_V = VY0 + G_GREY * GREY_FALL_T;
export const GREY_BEATS = { silence: IMPACT_T + 1.3, womp: IMPACT_T + 1.4, ghost: IMPACT_T + 3.0, wave: IMPACT_T + 4.4, gone: IMPACT_T + 6.4 };

// ── S7 · Back on the green planet ─────────────────────────────────────────
export const FINAL = { start: GREY_BEATS.gone, look: GREY_BEATS.gone + 0.3, ghost: GREY_BEATS.gone + 0.6, facepalm: GREY_BEATS.gone + 1.6, end: GREY_BEATS.gone + 3.4 };
export const END_FADE = FINAL.end;
export const DURATION = END_FADE + 3.4;
