import React from "react";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/PermanentMarker";
import { FONT_STACK, HookTitle, Stars } from "../../shared/ui";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, num, shake, type Ease } from "../../lib/kf";
import { GROUND, INK, solve, Stickman, toWorld } from "../../rig/Stickman";
import { HERO_SPOT, heroAt, kidAt, kidVisible } from "./cast";
import {
  Anvil,
  Backdrop,
  CAKE_ROPE_X,
  CakeRope,
  cakeLowerY,
  CakeShape,
  Crane,
  Confetti,
  Flaps,
  GroundLine,
  HeroClip,
  Hole,
  Hook,
  IMPACTS,
  Pedestal,
  Sign,
  SliceShape,
  Sparks,
} from "./props";

loadFont();

const W = 1080;
const H = 1920;

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

// ─── Camera: punch-ins, slow push on the rage stare, impact shake ─────────
const BASE = { x: 575, y: 1080, z: 1.4 };
const SIGN_SHOT = { x: 610, y: 735, z: 1.9 };

const camera = (t: number) => {
  // [time, x, y, z, easing]: each shot listed once so the three tracks stay in sync
  const shots: readonly (readonly [number, number, number, number, Ease?])[] = [
    [0, BASE.x, BASE.y, BASE.z],
    [2.95, BASE.x, BASE.y, BASE.z],
    [3.08, SIGN_SHOT.x, SIGN_SHOT.y, SIGN_SHOT.z, "snap"],
    [3.9, SIGN_SHOT.x, SIGN_SHOT.y, SIGN_SHOT.z],
    [4.25, BASE.x, BASE.y, BASE.z, "io"],
    [19.98, BASE.x, BASE.y, BASE.z],
    [20.1, 640, 1060, 1.75, "snap"],
    [20.7, 640, 1060, 1.75],
    [21.0, BASE.x, BASE.y, BASE.z, "io"],
    [34.95, BASE.x, BASE.y, BASE.z],
    [35.35, 330, 1000, 3.2, "out"],
    [36.4, 330, 1000, 3.2],
    [36.55, BASE.x, BASE.y, BASE.z, "snap"],
    [39.3, BASE.x, BASE.y, BASE.z],
    [39.42, SIGN_SHOT.x, SIGN_SHOT.y, SIGN_SHOT.z, "snap"],
    [40.5, SIGN_SHOT.x, SIGN_SHOT.y, SIGN_SHOT.z],
    [40.9, 400, 1190, 1.75, "io"],
  ];
  const track = (i: 1 | 2 | 3) => num(t, shots.map((k) => [k[0], k[i], k[4]] as const));
  const s = shake(t, IMPACTS);
  return `translate(${W / 2 + s.x} ${H / 2 + s.y}) scale(${track(3)}) translate(${-track(1)} ${-track(2)})`;
};

const World: React.FC = () => {
  const t = useT();
  const hero = heroAt(t);
  const kid = kidAt(t);
  const kidOn = kidVisible(t);
  const hj = solve(hero.pose);
  const heroHead = toWorld(hero, hj.head);

  // Cake: lowered gently from the crane, then rides overhead in the kid's hands
  let cake: { x: number; y: number } | null = null;
  if (t >= 32.45 && t < 35.2) {
    if (t < 33.45) {
      cake = { x: CAKE_ROPE_X, y: cakeLowerY(t) };
    } else {
      const kj = solve(kid.pose);
      const a = toWorld(kid, kj.aHand);
      const b = toWorld(kid, kj.bHand);
      const lift = Math.min(1, (t - 33.45) / 0.2);
      cake = { x: (a.x + b.x) / 2, y: GROUND + ((a.y + b.y) / 2 + 6 - GROUND) * ease("out", lift) };
    }
  }

  // Slice: carried in, set down by the anvil, then snatched by a hand from underneath
  let slice: { x: number; y: number } | null = null;
  const placed = (() => {
    const k = kidAt(41.05);
    return toWorld(k, solve(k.pose).aHand);
  })();
  const restX = placed.x + 10;
  if (t >= 39.8 && t < 41.5) {
    if (t < 41.05) {
      const kj = solve(kid.pose);
      const a = toWorld(kid, kj.aHand);
      slice = { x: a.x + 10, y: a.y + 4 };
    } else if (t < 41.35) {
      slice = { x: restX, y: GROUND - 10 };
    } else {
      slice = { x: restX + (t - 41.35) * 500, y: GROUND - 10 };
    }
  }

  // Hero's arm poking out from under the anvil
  let hand: React.ReactNode = null;
  const base = { x: HERO_SPOT - 80, y: GROUND - 14 };
  const reach = num(t, [
    [41.22, 0],
    [41.35, 1, "out"],
    [41.5, 0, "in"],
    [41.75, 0],
    [41.92, 0.75, "back"],
  ]);
  if (t > 41.22) {
    const tipX = base.x - (base.x - restX + 10) * reach;
    const tipY = base.y - (t > 41.75 ? 30 * reach : 0);
    const thumb = t > 41.75;
    const wob = thumb ? Math.sin(t * 9) * 4 : 0;
    hand = (
      <g>
        <line x1={base.x} y1={base.y} x2={tipX + wob} y2={tipY} stroke={INK} strokeWidth={10} strokeLinecap="round" />
        <circle cx={tipX + wob} cy={tipY} r={10} fill={INK} />
        {thumb ? <line x1={tipX + wob} y1={tipY - 4} x2={tipX + wob} y2={tipY - 26} stroke={INK} strokeWidth={7} strokeLinecap="round" /> : null}
      </g>
    );
  }

  const seed = Math.floor(t * 8) % 6; // hand-drawn line boil

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id="boil" filterUnits="userSpaceOnUse" x={-1300} y={-1400} width={3700} height={4700}>
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={seed} />
          <feDisplacementMap in="SourceGraphic" scale={4} />
        </filter>
        <HeroClip />
      </defs>
      <g transform={camera(t)}>
        <g filter="url(#boil)">
          <Backdrop t={t} />
          <Crane />
          <Sign t={t} />
          <Hook t={t} />
          <CakeRope t={t} />
          <Hole t={t} />
          <GroundLine />
          <Pedestal t={t} />
          {cake && t < 33.45 ? (
            <g transform={`translate(${cake.x} ${cake.y})`}>
              <CakeShape />
            </g>
          ) : null}
          <g clipPath="url(#heroClip)">
            <Stickman c={hero} />
          </g>
          <Flaps t={t} />
          {t > 18.5 && t < 20.0 ? <Stars t={t} x={heroHead.x} y={heroHead.y - 60} /> : null}
          {slice ? (
            <g transform={`translate(${slice.x} ${slice.y})`}>
              <SliceShape />
            </g>
          ) : null}
          {hand}
          {kidOn ? <Stickman c={kid} /> : null}
          {cake && t >= 33.45 ? (
            <g transform={`translate(${cake.x} ${cake.y})`}>
              <CakeShape s={0.9} />
            </g>
          ) : null}
          <Anvil t={t} />
          <Sparks t={t} />
          <Confetti t={t} at={32.85} x={CAKE_ROPE_X} y={GROUND - 60} />
        </g>
      </g>
    </svg>
  );
};

// ─── Meme-style captions ──────────────────────────────────────────────────
const CAPTIONS: readonly (readonly [number, number, string])[] = [
  [4.15, 5.55, "*crickets*"],
  [11.3, 12.9, "*crickets intensify*"],
  [24.4, 26.4, "AAAAAAAAAAAA"],
  [29.05, 30.9, "character development."],
  [39.4, 40.85, "he did not read the sign."],
];

const Captions: React.FC = () => {
  const t = useT();
  const c = CAPTIONS.find(([a, b]) => t >= a && t < b);
  if (!c) return null;
  const [a, b, text] = c;
  const pop = ease("back", (t - a) / 0.18);
  const shrink = text.startsWith("AAA") ? 1 - ((t - a) / (b - a)) * 0.75 : 1;
  const fade = Math.min(1, (b - t) / 0.15);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 1520 }}>
      <div
        style={{
          fontFamily: FONT_STACK,
          fontSize: 78,
          color: INK,
          WebkitTextStroke: "14px #fff",
          paintOrder: "stroke fill",
          textAlign: "center",
          padding: "0 90px",
          lineHeight: 1.1,
          scale: String(pop * shrink),
          opacity: fade,
          rotate: text.startsWith("AAA") ? `${Math.sin(t * 50) * 3}deg` : "-3deg",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

// ─── The moral ────────────────────────────────────────────────────────────
const EndCard: React.FC = () => {
  const t = useT();
  if (t < 42.5) return null;
  const dark = Math.min(1, (t - 42.5) / 0.3);
  const l1 = ease("back", (t - 42.9) / 0.25);
  const l2 = ease("back", (t - 43.6) / 0.25);
  const line: React.CSSProperties = { fontFamily: FONT_STACK, fontSize: 104, color: "#fff", textAlign: "center", lineHeight: 1.2 };
  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(17,17,17,${dark})`, justifyContent: "center", alignItems: "center", gap: 30 }}>
      <div style={{ ...line, scale: String(Math.max(0, l1)), opacity: t > 42.9 ? 1 : 0 }}>Read the sign.</div>
      <div style={{ ...line, color: "#ffb3c6", scale: String(Math.max(0, l2)), opacity: t > 43.6 ? 1 : 0 }}>Share the cake.</div>
    </AbsoluteFill>
  );
};

const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

export const TheButton: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#fbf6ec" }}>
      <World />
      <Captions />
      <HookTitle text="he had ONE rule..." top={1500} />
      <EndCard />

      {/* Music */}
      <Audio name="Walk-in music" src={sfx("sneaky-loop")} volume={0.45} durationInFrames={2.95 * fps} />
      <Audio name="Kid skip music" src={sfx("sneaky-loop")} from={31.0 * fps} durationInFrames={1.2 * fps} playbackRate={1.25} volume={0.4} />

      {/* Act 1: DO NOT PRESS */}
      <Audio name="Sign reveal" src={sfx("boom")} from={2.95 * fps} volume={0.85} />
      <Audio name="Crickets" src={sfx("crickets")} from={4.15 * fps} volume={0.7} />
      <Audio name="Temptation rise" src={sfx("slide-up")} from={6.6 * fps} volume={0.55} />
      <Audio name="Hand snaps back" src={sfx("snap")} from={8.4 * fps} />
      <Audio name="Innocent whistle" src={sfx("whistle")} from={8.62 * fps} volume={0.8} />
      <Audio name="Sprint feet" src={sfx("scurry")} from={10.45 * fps} volume={0.8} />
      <Audio name="Sprint whoosh" src={sfx("swish")} from={10.55 * fps} />
      <Audio name="Smash thud" src={sfx("thud")} from={10.86 * fps} />
      <Audio name="Smash click" src={sfx("click")} from={10.86 * fps} />
      <Audio name="Spark up the cable" src={sfx("zap")} from={10.95 * fps} volume={0.7} />
      <Audio name="Anvil wobbles" src={sfx("clink")} from={11.55 * fps} />
      <Audio name="Crickets again" src={sfx("crickets")} from={11.3 * fps} volume={0.8} />
      <Audio name="Crickets intensify" src={sfx("crickets")} from={11.9 * fps} volume={1} playbackRate={1.3} />
      <Audio name="Thank you" src={sfx("chime")} from={13.0 * fps} volume={0.6} />
      <Audio name="Hero: womp" src={sfx("womp")} from={13.75 * fps} />

      {/* Act 2: the small one */}
      <Audio name="Sign flip 2" src={sfx("flip")} from={14.95 * fps} />
      <Audio name="Small button pops" src={sfx("pop")} from={15.18 * fps} />
      <Audio name="Small button jab" src={sfx("click")} from={15.62 * fps} />
      <Audio name="Spark up the cable 2" src={sfx("zap")} from={15.7 * fps} volume={0.7} />
      <Audio name="Hook releases" src={sfx("clank")} from={16.3 * fps} />
      <Audio name="Anvil whistle" src={sfx("fall-whistle")} from={16.35 * fps} durationInFrames={0.75 * fps} volume={0.7} />
      <Audio name="Anvil bonk" src={sfx("bonk")} from={17.1 * fps} />
      <Audio name="Spring back" src={sfx("boing")} from={18.4 * fps} />
      <Audio name="Anvil re-hooked" src={sfx("clank")} from={18.85 * fps} volume={0.8} />
      <Audio name="Dizzy stars" src={sfx("twinkle")} from={18.55 * fps} volume={0.6} />

      {/* Act 3: LAST WARNING */}
      <Audio name="Giant button" src={sfx("dun-dun")} from={20.0 * fps} />
      <Audio name="Helmet on" src={sfx("pop")} from={21.3 * fps} />
      <Audio name="Big smash thud" src={sfx("thud")} from={23.42 * fps} />
      <Audio name="Big smash click" src={sfx("click")} from={23.42 * fps} />
      <Audio name="Spark to trapdoor" src={sfx("zap")} from={23.44 * fps} durationInFrames={0.2 * fps} playbackRate={2} volume={0.7} />
      <Audio name="Trapdoor opens" src={sfx("trapdoor")} from={23.58 * fps} />
      <Audio name="Hero: yell" src={sfx("hero-scream")} from={24.3 * fps} />
      <Audio name="Long fall" src={sfx("long-fall")} from={24.5 * fps} volume={0.6} />
      <Audio name="Far-away landing" src={sfx("distant-thud")} from={26.4 * fps} />
      <Audio name="Climb out" src={sfx("scurry")} from={27.05 * fps} volume={0.6} />
      <Audio name="Trapdoor closes" src={sfx("trapdoor")} from={27.78 * fps} volume={0.7} />

      {/* Act 4: free cake */}
      <Audio name="Sign flip cake" src={sfx("flip")} from={28.15 * fps} />
      <Audio name="Kid press" src={sfx("click")} from={32.0 * fps} />
      <Audio name="Spark to cake rope" src={sfx("zap")} from={32.05 * fps} durationInFrames={0.4 * fps} volume={0.6} />
      <Audio name="Cake lowering" src={sfx("slide-up")} from={32.45 * fps} durationInFrames={0.4 * fps} playbackRate={2} volume={0.35} />
      <Audio name="Party horn" src={sfx("party-horn")} from={32.85 * fps} volume={0.8} />
      <Audio name="Cake fanfare" src={sfx("fanfare")} from={32.9 * fps} volume={0.7} />
      <Audio name="Kid: win chime" src={sfx("kid-win")} from={32.95 * fps} />
      <Audio name="Sign flip sold out" src={sfx("flip")} from={34.75 * fps} volume={0.7} />

      {/* Act 5: rage press */}
      <Audio name="Record scratch" src={sfx("scratch")} from={35.0 * fps} />
      <Audio name="Rage sprint" src={sfx("swish")} from={36.6 * fps} />
      <Audio name="Rage feet" src={sfx("scurry")} from={36.6 * fps} volume={0.8} />
      <Audio name="Rage smash thud" src={sfx("thud")} from={36.98 * fps} />
      <Audio name="Rage smash click" src={sfx("click")} from={36.98 * fps} />
      <Audio name="Spark up the cable 3" src={sfx("zap")} from={37.05 * fps} volume={0.7} />
      <Audio name="Hook releases 2" src={sfx("clank")} from={37.55 * fps} />
      <Audio name="Anvil whistle 2" src={sfx("fall-whistle")} from={37.6 * fps} durationInFrames={0.7 * fps} volume={0.7} />
      <Audio name="Anvil bonk 2" src={sfx("bonk")} from={38.3 * fps} />
      <Audio name="Sad trombone" src={sfx("sad-trombone")} from={38.6 * fps} volume={0.75} />
      <Audio name="Read the sign boom" src={sfx("boom")} from={39.4 * fps} volume={0.7} />

      {/* Act 6: kindness */}
      <Audio name="Slice snatched" src={sfx("pop")} from={41.35 * fps} />
      <Audio name="Thumbs up" src={sfx("twinkle")} from={41.8 * fps} volume={0.5} />
      <Audio name="Moral ding" src={sfx("chime")} from={42.9 * fps} volume={0.5} />
      <Audio name="Moral ding 2" src={sfx("chime")} from={43.6 * fps} volume={0.5} playbackRate={1.25} />

      {/* Character sound signatures (same in every episode; no voice) */}
      <Audio name="Hero: huh?" src={sfx("hero-blip")} from={3.05 * fps} volume={0.7} />
      <Audio name="Hero: hmm" src={sfx("hero-blip")} from={5.65 * fps} volume={0.6} playbackRate={0.9} />
      <Audio name="Hero: heh" src={sfx("hero-blip")} from={15.98 * fps} volume={0.7} playbackRate={1.15} />
      <Audio name="Hero: uh-oh" src={sfx("hero-blip")} from={23.65 * fps} volume={0.7} playbackRate={0.8} />
      <Audio name="Kid: oh!" src={sfx("kid-blip")} from={32.3 * fps} volume={0.6} />
      <Audio name="Kid: hm" src={sfx("kid-blip")} from={39.85 * fps} volume={0.5} playbackRate={0.85} />
      <Audio name="Kid: thumbs up" src={sfx("kid-blip")} from={41.9 * fps} volume={0.5} playbackRate={1.2} />
    </AbsoluteFill>
  );
};
