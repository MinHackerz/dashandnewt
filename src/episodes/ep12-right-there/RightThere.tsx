import React from "react";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/PermanentMarker";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ease } from "../../lib/kf";
import { solve, toWorld } from "../../rig/Stickman";
import { Toon3D } from "../../rig3d/Toon3D";
import { ChalkPath, ChalkText } from "../../shared/chalk";
import { ChalkNote, Stamp } from "../../shared/lesson";
import { Caption, FONT_STACK, HookTitle, Stars } from "../../shared/ui";
import { H, Stage3D, W, type Cam } from "../../world3d/Stage3D";
import { apparent, Refract, WaterSurface } from "../../world3d/water";
import { camAt, CUTS } from "./camera";
import { coinAt, crabAt, dashAt, newtAt, RIPPLES, stickAt } from "./cast";
import { Coin, CrabMesh, M, Pool, project, StickMesh } from "./props";
import { BOX, COIN, CUE, EDGE, END_FADE, EYE2, FAR, GIVE, GUM, HOOK, LOOK, SEEN2, STICK_LEN, STICK_TIP, SURF2, TRY1, TRY2, TRY3, WISH, WY } from "./timeline";

loadFont();

// Ep 12 — It's RIGHT There (refraction). 3D house look; the water draws everything below its surface at
// its apparent depth (world3d/water.tsx), so the bent arm, the bent stick and the short legs are the
// physics, not drawn-on gags. Where Dash reaches and where his stick lands come from Snell's law.

const useT = () => useCurrentFrame() / useVideoConfig().fps;

/** how hard the coin glints: in the hook, on the stick, and back on the bottom at the end */
const glintAt = (t: number) => {
  const pulse = (at: number, w = 0.5) => Math.max(0, 1 - Math.abs(t - at) / w);
  return Math.max(t < HOOK.down - 0.2 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 5)) : 0, pulse(GUM.show + 0.2, 0.5), pulse(WISH.back + 0.3, 0.5), pulse(WISH.narrow + 0.2, 0.4));
};

const Scene: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const d = dashAt(t);
  const n = newtAt(t);
  const coin = coinAt(t);
  return (
    <Stage3D cam={cam} set="beach" setProps={{ hole: { x0: BOX.x0 - 0.1, x1: BOX.x1 + 0.1, z0: BOX.z0 - 0.1, z1: BOX.z1 + 0.1 } }}>
      <Pool />
      <Refract box={BOX}>
        <group position={[0, 0, d.z]}>
          <Toon3D who="dash" c={d.c} turn={d.turn} />
        </group>
      </Refract>
      <Refract box={BOX}>
        <group position={[0, 0, n.z]}>
          <Toon3D who="newt" c={n.c} turn={n.turn} />
        </group>
      </Refract>
      <Refract box={BOX}>
        <StickMesh s={stickAt(t)} len={STICK_LEN} gum={t > GUM.press + 0.1} />
      </Refract>
      <Refract box={BOX}>
        <Coin p={coin.p} spin={coin.spin} glint={glintAt(t)} />
      </Refract>
      <Refract box={BOX}>
        <CrabMesh c={crabAt(t)} />
      </Refract>
      <WaterSurface box={BOX} t={t} ripples={RIPPLES} />
    </Stage3D>
  );
};

// ─── Newt's physics look: the light ray, where it LOOKS, where it IS ──────
const Look: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  if (t < LOOK.at || t > LOOK.end) return null;
  const a = Math.min(1, (t - LOOK.at) / 0.25, (LOOK.end - t) / 0.25);
  const P = (x: number, y: number) => project(cam, M(x, y, 0));
  const L = (p: { x: number; y: number }, q: { x: number; y: number }) => `M ${p.x} ${p.y} L ${q.x} ${q.y}`;
  const w0 = P(EDGE - 20, WY);
  const w1 = P(FAR + 20, WY);
  const coin = P(COIN.x, COIN.y);
  // drawn for the stick try: from where he stood, the bend is plain to see
  const s = P(SURF2.x, SURF2.y);
  const eye = P(EYE2.x, EYE2.y);
  const seen = P(SEEN2.x, SEEN2.y);
  const jab = P(STICK_TIP.x, STICK_TIP.y);
  const head = (p: { x: number; y: number }, from: { x: number; y: number }) => {
    const ang = Math.atan2(p.y - from.y, p.x - from.x);
    const w = (da: number) => `${p.x - Math.cos(ang + da) * 28} ${p.y - Math.sin(ang + da) * 28}`;
    return `M ${w(0.5)} L ${p.x} ${p.y} L ${w(-0.5)}`;
  };
  const top = P(COIN.x, WY - 330);
  const pop = (at: number) => Math.max(0, ease("back", (t - at) / 0.25));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, opacity: a }}>
      <rect width={W} height={H} fill="#2f4a3c" opacity={0.28} />
      {/* the surface */}
      <ChalkPath d={L(w0, w1)} t={t} at={LOOK.at + 0.1} dur={0.35} width={7} outline />
      {/* Dash's eye */}
      <g opacity={pop(LOOK.at + 0.2) > 0 ? 1 : 0} transform={`translate(${eye.x} ${eye.y}) scale(${pop(LOOK.at + 0.2)})`}>
        <ellipse rx={30} ry={18} fill="#f4f1e6" stroke="#1b1b1b" strokeWidth={6} />
        <circle r={9} fill="#1b1b1b" />
      </g>
      {/* the light: coin → surface (bends) → eye */}
      <ChalkPath d={L(coin, s)} t={t} at={LOOK.ray} dur={0.4} width={11} color="#ffd23f" outline />
      <ChalkPath d={L(s, eye)} t={t} at={LOOK.bend} dur={0.45} width={11} color="#ffd23f" outline />
      <ChalkPath d={head(eye, s)} t={t} at={LOOK.bend + 0.4} dur={0.15} width={11} color="#ffd23f" outline />
      <ChalkText x={(s.x + eye.x) / 2 + 50} y={(s.y + eye.y) / 2 + 10} t={t} at={LOOK.bend + 0.3} size={70} color="#ffd23f" outline write={0.05} anchor="start">bends here!</ChalkText>
      {/* what his brain does: a straight line back from the eye */}
      <ChalkPath d={L(eye, jab)} t={t} at={LOOK.seen} dur={0.45} width={8} dash color="#ff6b5e" outline />
      <g opacity={pop(LOOK.seen + 0.35) > 0 ? 1 : 0} transform={`translate(${seen.x} ${seen.y}) scale(${pop(LOOK.seen + 0.35)})`}>
        <circle r={34} fill="none" stroke="#1b1b1b" strokeWidth={14} />
        <circle r={34} fill="none" stroke="#ff6b5e" strokeWidth={7} />
      </g>
      <ChalkText x={seen.x - 46} y={seen.y - 46} t={t} at={LOOK.seen + 0.4} size={70} color="#ff6b5e" outline write={0.05} anchor="end">where it LOOKS</ChalkText>
      {/* where it really is */}
      <g opacity={pop(LOOK.real) > 0 ? 1 : 0} transform={`translate(${coin.x} ${coin.y}) scale(${pop(LOOK.real)})`}>
        <circle r={34} fill="none" stroke="#1b1b1b" strokeWidth={14} />
        <circle r={34} fill="none" stroke="#ffd23f" strokeWidth={7} />
      </g>
      <ChalkText x={coin.x - 46} y={coin.y + 92} t={t} at={LOOK.real + 0.1} size={70} color="#ffd23f" outline write={0.05} anchor="end">where it REALLY is</ChalkText>
      {/* Newt's way: straight down — no sideways shift */}
      <ChalkPath d={L(top, coin)} t={t} at={LOOK.top} dur={0.5} width={8} dash outline />
      <ChalkText x={jab.x - 60} y={jab.y + 190} t={t} at={LOOK.seen + 0.5} size={54} color="#ff6b5e" outline write={0.04} anchor="middle">his stick went here: crab!</ChalkText>
      <ChalkPath d={head(coin, top)} t={t} at={LOOK.top + 0.45} dur={0.15} width={8} outline />
      <ChalkText x={top.x - 26} y={top.y + 10} t={t} at={LOOK.top + 0.3} size={62} outline write={0.05} anchor="end">look straight down</ChalkText>
    </svg>
  );
};

/** A twinkle on the coin where it APPEARS (under water: at its apparent depth) */
const Sparkle: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const g = glintAt(t);
  if (g <= 0.02) return null;
  const c = project(cam, apparent(BOX, coinAt(t).p));
  const r = 30 + 40 * g;
  const star = (s: number, rot: number) => (
    <path d={`M 0 ${-s} L ${s * 0.18} ${-s * 0.18} L ${s} 0 L ${s * 0.18} ${s * 0.18} L 0 ${s} L ${-s * 0.18} ${s * 0.18} L ${-s} 0 L ${-s * 0.18} ${-s * 0.18} Z`} transform={`rotate(${rot})`} fill="#fffbe0" />
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, opacity: g }}>
      <g transform={`translate(${c.x - 18} ${c.y - 22})`}>
        {star(r * cam.zoom * 0.35, t * 90)}
        {star(r * cam.zoom * 0.18, 45 - t * 60)}
      </g>
    </svg>
  );
};

const EndCard: React.FC<{ t: number }> = ({ t }) => {
  if (t < END_FADE) return null;
  const dark = Math.min(1, (t - END_FADE) / 0.3);
  const l1 = ease("back", (t - (END_FADE + 0.4)) / 0.25);
  const l2 = ease("back", (t - (END_FADE + 1.1)) / 0.25);
  const line: React.CSSProperties = { fontFamily: FONT_STACK, fontSize: 98, color: "#fff", textAlign: "center", lineHeight: 1.15, padding: "0 70px" };
  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(17,17,17,${dark})`, justifyContent: "center", alignItems: "center", gap: 30 }}>
      <div style={{ ...line, scale: String(Math.max(0, l1)), opacity: t > END_FADE + 0.4 ? 1 : 0 }}>Water bends light.</div>
      <div style={{ ...line, color: "#ffd23f", scale: String(Math.max(0, l2)), opacity: t > END_FADE + 1.1 ? 1 : 0 }}>Things are deeper than they look.</div>
    </AbsoluteFill>
  );
};

const Picture: React.FC = () => {
  const t = useT();
  const cam = camAt(t);
  const d = dashAt(t);
  const dazed = t > TRY3.land + 0.1 && t < LOOK.end - 0.1;
  const hd = toWorld(d.c, solve(d.c.pose).head);
  const star = project(cam, M(hd.x, hd.y, d.z));
  return (
    <>
      <Scene t={t} cam={cam} />
      <Sparkle t={t} cam={cam} />
      <Look t={t} cam={cam} />
      {dazed ? (
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <Stars t={t} x={star.x} y={star.y - 80 * cam.zoom} />
        </svg>
      ) : null}
      <ChalkNote t={t} from={LOOK.note} to={LOOK.end} top={110} gap={1.3} size={50} highlight={[3]} lines={["Water BENDS light.", "So things LOOK higher than they are.", "That's the bent arm, stick AND legs!", "Trick: look straight down, go deeper."]} />
      <Stamp t={t} from={TRY1.stamp} to={TRY1.horror - 0.1} text="PLAN #1: GRAB IT" top={230} size={74} />
      <Stamp t={t} from={TRY2.stamp} to={TRY2.dip1} text="PLAN #2: POKE IT OUT" top={230} size={70} />
      <Stamp t={t} from={TRY3.stamp} to={TRY3.legs} text="PLAN #3: WALK IN" top={230} size={74} />
      <Stamp t={t} from={GUM.walk} to={GUM.lower} text="NEWT'S PLAN: GUM + STICK" color="#2a9d8f" top={230} size={64} />
      <Stamp t={t} from={GUM.touch + 0.3} to={GUM.show + 0.9} text="GOT IT! FIRST TRY" color="#2a9d8f" top={230} size={74} />
      {/* plain-language captions: what you're seeing, in one short line */}
      <Caption text="A coin! At the bottom of the pool." from={0.5} to={TRY1.stamp - 0.05} />
      <Caption text="Arm: totally fine." from={TRY1.look} to={TRY1.fist - 0.05} />
      <Caption text="Coin: still down there." from={TRY1.fist + 0.1} to={TRY1.end} />
      <Caption text="In the water: BENT. Out: straight?!" from={TRY2.dip1 + 0.15} to={TRY2.out2 + 0.35} />
      <Caption text="Missed the coin. Hit the crab." from={TRY2.hit + 0.3} to={TRY2.end + 0.2} />
      <Caption text="Legs: fine. Water: lying AGAIN." from={TRY3.legs + 0.25} to={TRY3.crab - 0.05} />
      <Caption text="Sticky gum on the tip will grab the coin." from={GUM.mouth + 0.2} to={GUM.raise + 0.3} />
      <Caption text="Straight down, a bit DEEPER than it looks…" from={GUM.lower} to={GUM.lift} />
      <Caption text="Dash makes a wish…" from={WISH.kiss} to={WISH.flip} />
      <Caption text="…and throws the coin back in." from={WISH.plop + 0.05} to={WISH.back - 0.05} />
      <Caption text="It's RIGHT there…" from={WISH.narrow} to={END_FADE} />
      <EndCard t={t} />
    </>
  );
};

const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

export const RightThere: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  const steps = (from: number, to: number, every: number) => [...Array(Math.max(0, Math.floor((to - from) / every)))].map((_, i) => from + i * every);
  return (
    <AbsoluteFill style={{ backgroundColor: "#a9dbfb" }}>
      <Picture />
      <HookTitle text="It's RIGHT there." from={0.15} to={HOOK.down + 0.4} top={170} />

      <Audio name="Score" src={sfx("score-rightthere")} durationInFrames={durationInFrames} volume={1.0} />
      <Audio name="Beach ambience" src={sfx("sea-amb")} durationInFrames={durationInFrames} volume={0.55} />
      <Audio name="Gull 1" src={sfx("gull")} from={f(4.6)} volume={0.25} />
      <Audio name="Gull 2" src={sfx("gull")} from={f(LOOK.at + 4.5)} volume={0.2} playbackRate={1.1} />
      {CUTS.filter((_, i) => i % 3 === 1).map((c, i) => (
        <Audio key={`cut${i}`} name={`Camera whoosh ${i + 1}`} src={sfx("swish")} from={f(c - 0.04)} volume={0.1} playbackRate={1.3} />
      ))}

      {/* hook */}
      <Audio name="Coin glint" src={sfx("chime")} from={f(HOOK.glint)} volume={0.25} playbackRate={1.5} />
      {steps(0.15, HOOK.down - 0.15, 0.4).map((s, i) => (
        <Audio key={`w${i}`} name={`Sand step ${i + 1}`} src={sfx("sand-step")} from={f(s)} volume={0.45} playbackRate={0.95 + (i % 3) * 0.05} />
      ))}
      <Audio name="Newt blows a bubble" src={sfx("stretch")} from={f(HOOK.bubble - 0.3)} volume={0.2} playbackRate={1.8} />
      <Audio name="Bubble pops" src={sfx("pop")} from={f(HOOK.bubble + 0.52)} volume={0.35} />
      <Audio name="Belly flop onto the sand" src={sfx("body-fall")} from={f(HOOK.down + 0.3)} volume={0.45} playbackRate={1.2} />
      {/* try 1 */}
      <Audio name="Stamp: try 1" src={sfx("pop")} from={f(TRY1.stamp)} volume={0.15} />
      <Audio name="Arm into the water" src={sfx("splash-small")} from={f(TRY1.inWater)} volume={0.55} />
      <Audio name="Hero: heh (got it)" src={sfx("hero-blip")} from={f(TRY1.inWater + 0.15)} volume={0.18} playbackRate={1.05} />
      <Audio name="Hero: scream at his arm" src={sfx("hero-scream")} from={f(TRY1.horror)} volume={0.45} />
      <Audio name="Arm yanked out" src={sfx("splash")} from={f(TRY1.yank)} volume={0.5} playbackRate={1.3} />
      <Audio name="Drips" src={sfx("drop-plip")} from={f(TRY1.look + 0.2)} volume={0.35} />
      <Audio name="Empty hand" src={sfx("womp")} from={f(TRY1.fist + 0.15)} volume={0.22} playbackRate={1.2} />
      {/* try 2 */}
      <Audio name="Stamp: try 2" src={sfx("pop")} from={f(TRY2.stamp)} volume={0.15} playbackRate={0.9} />
      <Audio name="Picks up the stick" src={sfx("clack")} from={f(TRY2.grab + 0.1)} volume={0.35} />
      <Audio name="Stick in (bent!)" src={sfx("drop-plip")} from={f(TRY2.dip1)} volume={0.45} />
      <Audio name="Hero: huh" src={sfx("hero-blip")} from={f(TRY2.dip1 + 0.15)} volume={0.2} playbackRate={1.2} />
      <Audio name="Stick out (straight)" src={sfx("drop-tink")} from={f(TRY2.out1)} volume={0.35} />
      <Audio name="Stick in again" src={sfx("drop-plip")} from={f(TRY2.dip2)} volume={0.45} playbackRate={1.1} />
      <Audio name="Hero: HUH" src={sfx("hero-blip")} from={f(TRY2.dip2 + 0.12)} volume={0.22} playbackRate={1.3} />
      <Audio name="Stick out again" src={sfx("drop-tink")} from={f(TRY2.out2)} volume={0.35} playbackRate={1.1} />
      <Audio name="Newt's bubble grows" src={sfx("stretch")} from={f(TRY2.out2 - 0.5)} volume={0.2} playbackRate={1.6} />
      <Audio name="Jab whoosh" src={sfx("whoosh-small")} from={f(TRY2.jab - 0.05)} volume={0.6} />
      <Audio name="Stick bonks the crab" src={sfx("bonk")} from={f(TRY2.hit)} volume={0.7} playbackRate={1.2} />
      <Audio name="Newt's bubble pops" src={sfx("pop")} from={f(TRY2.hit + 0.02)} volume={0.35} playbackRate={0.9} />
      <Audio name="Crab: furious clacks" src={sfx("clack")} from={f(TRY2.hit + 0.35)} volume={0.4} playbackRate={1.4} />
      <Audio name="Hero: uh-oh" src={sfx("hero-blip")} from={f(TRY2.hit + 0.75)} volume={0.2} playbackRate={0.8} />
      <Audio name="Drops the stick" src={sfx("rock-thunk")} from={f(TRY2.drop + 0.33)} volume={0.35} playbackRate={1.3} />
      {/* try 3 */}
      <Audio name="Stamp: try 3" src={sfx("pop")} from={f(TRY3.stamp)} volume={0.15} playbackRate={0.8} />
      <Audio name="Steps into the pool" src={sfx("splash")} from={f(TRY3.inn - 0.08)} volume={0.6} />
      <Audio name="Hero: his legs!" src={sfx("hero-blip")} from={f(TRY3.legs + 0.1)} volume={0.22} playbackRate={0.75} />
      <Audio name="Crab scuttles" src={sfx("scurry")} from={f(TRY3.crab)} volume={0.45} playbackRate={1.3} />
      <Audio name="PINCH" src={sfx("snap")} from={f(TRY3.pinch)} volume={0.8} />
      <Audio name="Hero: scream (toe)" src={sfx("hero-scream")} from={f(TRY3.pinch + 0.05)} volume={0.5} playbackRate={1.1} />
      <Audio name="Leaps out" src={sfx("splash")} from={f(TRY3.launch)} volume={0.6} playbackRate={0.9} />
      <Audio name="Lands on his back" src={sfx("body-fall")} from={f(TRY3.land)} volume={0.8} />
      <Audio name="Dizzy stars" src={sfx("twinkle")} from={f(TRY3.land + 0.2)} volume={0.3} />
      <Audio name="Kid: facepalm" src={sfx("slap")} from={f(TRY3.land + 0.3)} volume={0.25} playbackRate={1.2} />
      <Audio name="Hero: womp" src={sfx("womp")} from={f(TRY3.land + 0.6)} volume={0.3} />
      <Audio name="Crab lets go and leaves" src={sfx("scurry")} from={f(TRY3.crabOff + 0.4)} volume={0.35} playbackRate={1.2} />
      <Audio name="Crab plops home" src={sfx("drop-plip")} from={f(TRY3.crabOff + 1.9)} volume={0.35} playbackRate={1.3} />
      {/* the physics look */}
      <Audio name="Kid: chalk (surface)" src={sfx("chalk")} from={f(LOOK.at + 0.1)} volume={0.22} />
      <Audio name="Kid: chalk (light ray)" src={sfx("chalk")} from={f(LOOK.ray)} volume={0.25} playbackRate={1.1} />
      <Audio name="Kid: chalk (looks here)" src={sfx("chalk")} from={f(LOOK.seen)} volume={0.22} playbackRate={0.9} />
      <Audio name="Kid: chime (really here)" src={sfx("chime")} from={f(LOOK.real)} volume={0.2} />
      <Audio name="Kid: chalk (straight down)" src={sfx("chalk")} from={f(LOOK.top)} volume={0.22} playbackRate={1.2} />
      {/* the gum trick */}
      {steps(GUM.walk + 0.1, GUM.mouth - 0.1, 0.3).map((s, i) => (
        <Audio key={`n${i}`} name={`Newt step ${i + 1}`} src={sfx("sand-step")} from={f(s)} volume={0.3} playbackRate={1.3} />
      ))}
      <Audio name="Gum out of his mouth" src={sfx("slurp")} from={f(GUM.mouth + 0.1)} volume={0.35} playbackRate={1.3} />
      <Audio name="Gum pressed on the tip" src={sfx("squelch")} from={f(GUM.press + 0.1)} volume={0.4} playbackRate={1.4} />
      <Audio name="Stick swung upright" src={sfx("swish")} from={f(GUM.raise)} volume={0.3} />
      <Audio name="Stick straight down into the water" src={sfx("drop-plip")} from={f(GUM.lower + 0.15)} volume={0.4} playbackRate={0.9} />
      <Audio name="Gum meets coin" src={sfx("click")} from={f(GUM.touch)} volume={0.4} />
      <Audio name="Coin out of the water" src={sfx("drop-tink")} from={f(GUM.lift + 0.2)} volume={0.4} />
      <Audio name="Kid: win" src={sfx("kid-win")} from={f(GUM.show)} volume={0.25} />
      <Audio name="Coin sparkles" src={sfx("chime")} from={f(GUM.show + 0.15)} volume={0.2} playbackRate={1.5} />
      <Audio name="Hero: what?!" src={sfx("hero-blip")} from={f(GUM.show + 0.1)} volume={0.2} playbackRate={1.25} />
      {/* the gift and the wish */}
      <Audio name="Takes the coin" src={sfx("clink")} from={f(GIVE.take)} volume={0.4} />
      <Audio name="Hero: happy" src={sfx("hero-blip")} from={f(GIVE.take + 0.2)} volume={0.18} playbackRate={1.1} />
      <Audio name="Kisses the coin" src={sfx("pat")} from={f(WISH.kiss + 0.3)} volume={0.3} playbackRate={1.5} />
      <Audio name="Coin flip" src={sfx("tink")} from={f(WISH.flip)} volume={0.4} />
      <Audio name="Coin plops in" src={sfx("drop-plip")} from={f(WISH.plop)} volume={0.55} />
      <Audio name="Coin settles" src={sfx("drop-tink")} from={f(WISH.settle)} volume={0.25} playbackRate={0.8} />
      <Audio name="Glint again" src={sfx("chime")} from={f(WISH.back + 0.25)} volume={0.25} playbackRate={1.5} />
      <Audio name="Hero: hmm" src={sfx("hero-blip")} from={f(WISH.narrow)} volume={0.2} playbackRate={0.9} />
      <Audio name="Kid: facepalm (again)" src={sfx("slap")} from={f(WISH.dive - 0.1)} volume={0.25} playbackRate={1.2} />
      <Audio name="Belly flop again" src={sfx("body-fall")} from={f(WISH.dive)} volume={0.45} playbackRate={1.2} />
      <Audio name="Moral 1" src={sfx("chime")} from={f(CUE.end + 0.4)} volume={0.25} />
      <Audio name="Moral 2" src={sfx("chime")} from={f(CUE.end + 1.1)} volume={0.25} playbackRate={1.25} />
    </AbsoluteFill>
  );
};
