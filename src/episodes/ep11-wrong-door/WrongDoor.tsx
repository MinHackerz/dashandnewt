import React from "react";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/PermanentMarker";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ease } from "../../lib/kf";
import { solve, toWorld } from "../../rig/Stickman";
import { Toon3D } from "../../rig3d/Toon3D";
import { ChalkPath, ChalkText } from "../../shared/chalk";
import { ChalkNote, Stamp } from "../../shared/lesson";
import { FONT_STACK, HookTitle, Stars } from "../../shared/ui";
import { H, Stage3D, W, type Cam } from "../../world3d/Stage3D";
import { camAt, CUTS } from "./camera";
import { dashAt, newtAt } from "./cast";
import { onDoor, project, Shop, toM } from "./props";
import { AGAIN, ARRIVE, BACK, CUE, doorAt, END_FADE, FALL, LOOK, OPEN, PUSH, SLAM, THUMB, TRY1, TRY2, TRY3, UP } from "./timeline";

loadFont();

// Ep 11 — Wrong Door (torque). The first episode in the 3D house look: Toon3D cast on a Stage3D street,
// with the chalk "physics look", stamps and cards as 2D overlays projected through the same camera.

const useT = () => useCurrentFrame() / useVideoConfig().fps;

const Scene: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const d = dashAt(t);
  const n = newtAt(t);
  return (
    <Stage3D cam={cam} set="street">
      <Shop deg={doorAt(t)} />
      <group position={[0, 0, d.z]}>
        <Toon3D who="dash" c={d.c} turn={d.turn} />
      </group>
      <group position={[0, 0, n.z]}>
        <Toon3D who="newt" c={n.c} turn={n.turn} />
      </group>
    </Stage3D>
  );
};

// ─── Newt's physics look: the hinge, the two distances, the rule ──────────
const Look: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  if (t < LOOK.at || t > LOOK.end) return null;
  const a = Math.min(1, (t - LOOK.at) / 0.25, (LOOK.end - t) / 0.25);
  const P = (r: number, y: number) => project(cam, onDoor(r, y));
  const top = P(0, 2.1);
  const bot = P(0, 0.05);
  const h = P(0, 1.55);
  const tiny = P(PUSH.dash1.r, 1.55);
  const big = P(PUSH.newt.r, 1.55);
  const L = (p: { x: number; y: number }, q: { x: number; y: number }) => `M ${p.x} ${p.y} L ${q.x} ${q.y}`;
  const head = (p: { x: number; y: number }, from: { x: number; y: number }) => {
    const ang = Math.atan2(p.y - from.y, p.x - from.x);
    const w = (da: number) => `${p.x - Math.cos(ang + da) * 26} ${p.y - Math.sin(ang + da) * 26}`;
    return `M ${w(0.5)} L ${p.x} ${p.y} L ${w(-0.5)}`;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, opacity: a }}>
      <rect width={W} height={H} fill="#2f4a3c" opacity={0.3} />
      {/* the hinge line */}
      <ChalkPath d={L(top, bot)} t={t} at={LOOK.hinge} dur={0.4} width={9} dash outline />
      <circle cx={h.x} cy={h.y} r={16 * Math.max(0, ease("back", (t - LOOK.hinge) / 0.25))} fill="#f4f1e6" stroke="#1b1b1b" strokeWidth={5} />
      <ChalkText x={h.x + 14} y={top.y - 26} t={t} at={LOOK.hinge + 0.15} size={78} outline write={0.05}>hinge</ChalkText>
      {/* Dash's distance: tiny */}
      <ChalkPath d={L(h, tiny)} t={t} at={LOOK.tiny} dur={0.25} width={12} color="#ff6b5e" outline />
      <ChalkText x={tiny.x - 34} y={tiny.y + 26} t={t} at={LOOK.tiny + 0.2} size={80} color="#ff6b5e" outline write={0.05} anchor="end">tiny</ChalkText>
      {/* Newt's distance: big */}
      <ChalkPath d={L({ x: h.x, y: h.y + 150 }, { x: big.x, y: big.y + 150 })} t={t} at={LOOK.big} dur={0.5} width={12} color="#ffd23f" outline />
      <ChalkPath d={head({ x: big.x, y: big.y + 150 }, { x: h.x, y: h.y + 150 })} t={t} at={LOOK.big + 0.4} dur={0.2} width={12} color="#ffd23f" outline />
      <ChalkText x={(h.x + big.x) / 2 - 40} y={big.y + 250} t={t} at={LOOK.big + 0.5} size={88} color="#ffd23f" outline write={0.05}>BIG distance</ChalkText>
    </svg>
  );
};

const EndCard: React.FC<{ t: number }> = ({ t }) => {
  if (t < END_FADE) return null;
  const dark = Math.min(1, (t - END_FADE) / 0.3);
  const l1 = ease("back", (t - (END_FADE + 0.4)) / 0.25);
  const l2 = ease("back", (t - (END_FADE + 1.1)) / 0.25);
  const line: React.CSSProperties = { fontFamily: FONT_STACK, fontSize: 96, color: "#fff", textAlign: "center", lineHeight: 1.15, padding: "0 70px" };
  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(17,17,17,${dark})`, justifyContent: "center", alignItems: "center", gap: 30 }}>
      <div style={{ ...line, scale: String(Math.max(0, l1)), opacity: t > END_FADE + 0.4 ? 1 : 0 }}>Turning force = push × distance.</div>
      <div style={{ ...line, color: "#ffd23f", scale: String(Math.max(0, l2)), opacity: t > END_FADE + 1.1 ? 1 : 0 }}>Push far from the hinge.</div>
    </AbsoluteFill>
  );
};

const Picture: React.FC = () => {
  const t = useT();
  const cam = camAt(t);
  // dizzy stars over Dash's head while he lies there
  const d = dashAt(t);
  const dazed = (t > TRY3.land + 0.1 && t < UP.head) || (t > FALL.land + 0.1 && t < THUMB);
  const hd = toWorld(d.c, solve(d.c.pose).head);
  const star = project(cam, toM(hd.x, hd.y, d.z));
  return (
    <>
      <Scene t={t} cam={cam} />
      <Look t={t} cam={cam} />
      {dazed ? (
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <Stars t={t} x={star.x} y={star.y - 95 * cam.zoom} />
        </svg>
      ) : null}
      <ChalkNote t={t} from={LOOK.note} to={LOOK.end} top={150} gap={1.5} size={58} highlight={[2]} lines={["turning force = push × distance", "BIG push × tiny distance ✗", "tiny push × BIG distance ✓"]} />
      <Stamp t={t} from={TRY1.push} to={TRY1.give} text="TRY #1: PUSH" top={230} />
      <Stamp t={t} from={TRY2.push} to={TRY2.give} text="TRY #2: PUSH HARDER" top={230} size={72} />
      <Stamp t={t} from={TRY3.back + 0.3} to={TRY3.hit} text="TRY #3: RUN-UP" top={230} />
      <Stamp t={t} from={OPEN.push + 0.3} to={OPEN.push + 2.0} text="ONE FINGER" color="#2a9d8f" top={230} />
      <Stamp t={t} from={UP.proud + 0.2} to={SLAM} text="TRY #4: WITH PRIDE" top={230} size={72} />
      <EndCard t={t} />
    </>
  );
};

const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

export const WrongDoor: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  const steps = (from: number, to: number, every: number) => [...Array(Math.max(0, Math.floor((to - from) / every)))].map((_, i) => from + i * every);
  return (
    <AbsoluteFill style={{ backgroundColor: "#a9dbfb" }}>
      <Picture />
      <HookTitle text="It says PUSH. How hard can it be?" from={0.15} to={ARRIVE + 0.1} top={170} />

      <Audio name="Score" src={sfx("score-door")} durationInFrames={durationInFrames} volume={1.0} />
      <Audio name="Street ambience" src={sfx("street-amb")} durationInFrames={durationInFrames} volume={0.7} />

      {/* a soft whoosh on the big camera moves keeps the cuts feeling fast */}
      {CUTS.filter((_, i) => i % 3 === 1).map((c, i) => (
        <Audio key={`cut${i}`} name={`Camera whoosh ${i + 1}`} src={sfx("swish")} from={f(c - 0.04)} volume={0.12} playbackRate={1.3} />
      ))}

      {/* walking up */}
      {steps(0.25, ARRIVE, 0.42).map((s, i) => (
        <Audio key={`w${i}`} name={`Walk-in step ${i + 1}`} src={sfx(`step-${(i % 4) + 1}`)} from={f(s)} volume={0.5} />
      ))}
      {/* try 1: one hand by the hinge */}
      <Audio name="Hand on the door" src={sfx("pat")} from={f(TRY1.hand + 0.25)} volume={0.6} />
      <Audio name="Stamp: try 1" src={sfx("pop")} from={f(TRY1.push)} volume={0.15} />
      <Audio name="Door: tiny creak" src={sfx("creak")} from={f(TRY1.push + 0.1)} volume={0.35} playbackRate={1.4} />
      <Audio name="Hero: hmm" src={sfx("hero-blip")} from={f(TRY1.push + 0.95)} volume={0.2} playbackRate={1.05} />
      <Audio name="Kid: curious" src={sfx("kid-blip")} from={f(TRY1.push + 1.3)} volume={0.15} playbackRate={1.1} />
      {/* try 2: both hands */}
      <Audio name="Both hands on the door" src={sfx("pat")} from={f(TRY2.hand + 0.3)} volume={0.7} playbackRate={0.9} />
      <Audio name="Stamp: try 2" src={sfx("pop")} from={f(TRY2.push)} volume={0.15} playbackRate={0.9} />
      <Audio name="Straining" src={sfx("stretch")} from={f(TRY2.push + 0.2)} volume={0.5} />
      <Audio name="Door groans" src={sfx("creak")} from={f(TRY2.push + 0.5)} volume={0.5} playbackRate={0.8} />
      <Audio name="Shoes squeak" src={sfx("squeak")} from={f(TRY2.push + 1.3)} volume={0.35} />
      {[0, 1, 2, 3].map((i) => (
        <Audio key={`tap${i}`} name={`Newt foot tap ${i + 1}`} src={sfx("click")} from={f(TRY2.push + 1.2 + i * 0.571)} volume={0.25} />
      ))}
      <Audio name="Hero: gives up, panting" src={sfx("hero-blip")} from={f(TRY2.give + 0.1)} volume={0.2} playbackRate={0.8} />
      {/* try 3: the run-up */}
      <Audio name="Stamp: try 3" src={sfx("pop")} from={f(TRY3.back + 0.3)} volume={0.15} playbackRate={0.8} />
      {steps(TRY3.back + 0.1, TRY3.set, 0.33).map((s, i) => (
        <Audio key={`b${i}`} name={`Backing up ${i + 1}`} src={sfx(`step-${((i + 1) % 4) + 1}`)} from={f(s)} volume={0.4} />
      ))}
      {steps(TRY3.run, TRY3.hit, 0.17).map((s, i) => (
        <Audio key={`r${i}`} name={`Run-up step ${i + 1}`} src={sfx(`step-${(i % 4) + 1}`)} from={f(s)} volume={0.7} playbackRate={1.2} />
      ))}
      <Audio name="Charge whoosh" src={sfx("whoosh-small")} from={f(TRY3.hit - 0.25)} volume={0.6} />
      <Audio name="Shoulder hits the door" src={sfx("bonk")} from={f(TRY3.hit)} volume={0.9} />
      <Audio name="Door thud" src={sfx("thud")} from={f(TRY3.hit + 0.02)} volume={0.8} />
      <Audio name="Lands on his back" src={sfx("body-fall")} from={f(TRY3.land)} volume={0.8} />
      <Audio name="Kid: facepalm" src={sfx("slap")} from={f(TRY3.hit + 0.3)} volume={0.25} playbackRate={1.2} />
      <Audio name="Dizzy stars" src={sfx("twinkle")} from={f(TRY3.land + 0.2)} volume={0.3} />
      <Audio name="Hero: womp" src={sfx("womp")} from={f(TRY3.rest + 0.15)} volume={0.3} />
      {/* the physics look */}
      <Audio name="Kid: chalk (hinge)" src={sfx("chalk")} from={f(LOOK.hinge)} volume={0.25} />
      <Audio name="Kid: chalk (tiny)" src={sfx("chalk")} from={f(LOOK.tiny)} volume={0.22} playbackRate={1.2} />
      <Audio name="Kid: chalk (big)" src={sfx("chalk")} from={f(LOOK.big)} volume={0.25} playbackRate={0.9} />
      <Audio name="Kid: chime (the rule)" src={sfx("chime")} from={f(LOOK.note + 3.2)} volume={0.18} />
      {/* one finger */}
      {steps(OPEN.walk + 0.1, OPEN.finger - 0.1, 0.3).map((s, i) => (
        <Audio key={`n${i}`} name={`Newt step ${i + 1}`} src={sfx(`step-${((i + 2) % 4) + 1}`)} from={f(s)} volume={0.3} playbackRate={1.25} />
      ))}
      <Audio name="Finger on the door" src={sfx("click")} from={f(OPEN.push)} volume={0.4} />
      <Audio name="Door swings open" src={sfx("creak")} from={f(OPEN.push + 0.1)} volume={0.6} playbackRate={0.7} />
      <Audio name="Stamp: one finger" src={sfx("pop")} from={f(OPEN.push + 0.3)} volume={0.15} playbackRate={1.2} />
      <Audio name="Kid: win" src={sfx("kid-win")} from={f(OPEN.push + 0.5)} volume={0.25} />
      <Audio name="Door meets the stopper" src={sfx("clunk")} from={f(OPEN.opened)} volume={0.45} />
      <Audio name="Hero: what" src={sfx("hero-blip")} from={f(UP.head)} volume={0.2} playbackRate={1.15} />
      {/* pride, then the door */}
      <Audio name="Closer pulls the door shut" src={sfx("creak")} from={f(OPEN.opened + 0.6)} volume={0.3} playbackRate={0.55} />
      <Audio name="Stamp: try 4" src={sfx("pop")} from={f(UP.proud + 0.2)} volume={0.15} playbackRate={0.85} />
      <Audio name="Hero: heh" src={sfx("hero-blip")} from={f(UP.proud + 0.3)} volume={0.2} playbackRate={0.95} />
      {steps(UP.go, SLAM, 0.15).map((s, i) => (
        <Audio key={`p${i}`} name={`Proud charge step ${i + 1}`} src={sfx(`step-${(i % 4) + 1}`)} from={f(s)} volume={0.7} playbackRate={1.2} />
      ))}
      <Audio name="Kid: uh-oh" src={sfx("kid-blip")} from={f(UP.go + 0.05)} volume={0.2} playbackRate={0.85} />
      <Audio name="Door latches" src={sfx("latch")} from={f(OPEN.shut)} volume={0.7} />
      <Audio name="Face meets door" src={sfx("slap")} from={f(SLAM)} volume={0.8} playbackRate={0.8} />
      <Audio name="Body meets door" src={sfx("thud")} from={f(SLAM + 0.02)} volume={0.9} />
      <Audio name="Kid: facepalm again" src={sfx("slap")} from={f(AGAIN.palm + 0.18)} volume={0.25} playbackRate={1.2} />
      <Audio name="Peeling off the door" src={sfx("squeak")} from={f(FALL.at - 0.1)} volume={0.45} playbackRate={0.7} />
      <Audio name="Timbers onto his back" src={sfx("body-fall")} from={f(FALL.land)} volume={0.85} />
      <Audio name="Dizzy stars again" src={sfx("twinkle")} from={f(FALL.land + 0.2)} volume={0.3} />
      <Audio name="Hero: womp again" src={sfx("womp")} from={f(FALL.land + 0.35)} volume={0.32} />
      {/* heart: one finger again */}
      {steps(BACK.walk + 0.1, BACK.at, 0.3).map((s, i) => (
        <Audio key={`nb${i}`} name={`Newt steps back ${i + 1}`} src={sfx(`step-${((i + 1) % 4) + 1}`)} from={f(s)} volume={0.3} playbackRate={1.25} />
      ))}
      {steps(AGAIN.walk + 0.1, AGAIN.finger - 0.1, 0.3).map((s, i) => (
        <Audio key={`na${i}`} name={`Newt steps in again ${i + 1}`} src={sfx(`step-${((i + 3) % 4) + 1}`)} from={f(s)} volume={0.3} playbackRate={1.25} />
      ))}
      <Audio name="Finger on the door again" src={sfx("click")} from={f(AGAIN.push)} volume={0.4} />
      <Audio name="Door swings open again" src={sfx("creak")} from={f(AGAIN.push + 0.1)} volume={0.55} playbackRate={0.7} />
      <Audio name="Hero: thumbs up" src={sfx("hero-blip")} from={f(THUMB)} volume={0.2} playbackRate={1.1} />
      <Audio name="Kid: blip (thumbs up)" src={sfx("kid-blip")} from={f(THUMB + 0.55)} volume={0.18} playbackRate={1.15} />
      <Audio name="Moral 1" src={sfx("chime")} from={f(CUE.end + 0.4)} volume={0.25} />
      <Audio name="Moral 2" src={sfx("chime")} from={f(CUE.end + 1.1)} volume={0.25} playbackRate={1.25} />
    </AbsoluteFill>
  );
};
