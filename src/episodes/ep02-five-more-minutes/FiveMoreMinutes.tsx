import React from "react";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/PermanentMarker";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, num, shake, type Ease } from "../../lib/kf";
import { INK, solve, Stickman, toWorld } from "../../rig/Stickman";
import type { CharState } from "../../rig/types";
import { FONT_STACK, HookTitle } from "../../shared/ui";
import { adultAt, childAt, heroAt, teenAt, tinyAt } from "./cast";
import { Backdrop, BeardPile, BedBack, Blanket, Clock, clockAt, FlyingPages, Nightstand, Zzz } from "./Room";
import { END_FADE, SLEEPING, warpProgress, WARPS, WARP_LEN } from "./timeline";

loadFont();

const W = 1080;
const H = 1920;

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

const BASE = { x: 575, y: 1110, z: 1.55 };
const HITS = [
  [2.25, 6],
  [13.5, 8],
  [14.1, 8],
  [18.1, 6],
  [25.15, 14],
  [27.55, 10],
] as const;

const camera = (t: number) => {
  const shots: readonly (readonly [number, number, number, number, Ease?])[] = [
    [0, BASE.x, BASE.y, BASE.z],
    [1.2, BASE.x, BASE.y, BASE.z],
    [1.33, 730, 1120, 2.0, "snap"],
    [1.75, 730, 1120, 2.0],
    [2.05, BASE.x, BASE.y, BASE.z, "io"],
    [18.55, BASE.x, BASE.y, BASE.z],
    [18.65, 400, 1020, 2.1, "snap"],
    [19.45, 400, 1020, 2.1],
    [19.75, BASE.x, BASE.y, BASE.z, "io"],
    [28.5, BASE.x, BASE.y, BASE.z],
    [29.0, 640, 1140, 1.55, "io"],
    [30.8, 780, 1140, 1.55, "lin"],
  ];
  const tr = (i: 1 | 2 | 3) => num(t, shots.map((k) => [k[0], k[i], k[4]] as const));
  const u = warpProgress(t);
  const warpZ = u >= 0 ? 1 + 0.18 * Math.sin(Math.PI * u) : 1;
  const warpR = u >= 0 ? 6 * Math.sin(2 * Math.PI * u) : 0;
  const s = shake(t, HITS);
  return `translate(${W / 2 + s.x} ${H / 2 + s.y}) rotate(${warpR}) scale(${tr(3) * warpZ}) translate(${-tr(1)} ${-tr(2)})`;
};

const handOf = (c: CharState, which: "a" | "b") => {
  const j = solve(c.pose, c.aLen ?? 1);
  return toWorld(c, which === "a" ? j.aHand : j.bHand);
};

const World: React.FC = () => {
  const t = useT();
  const hero = heroAt(t);
  const inBed = t < 24.85;
  const sitting = inBed ? 1 - (hero.rot ?? 0) / 90 : 0;
  const head = toWorld(hero, solve(hero.pose, hero.aLen ?? 1).head);
  const asleep = SLEEPING.some(([a, b]) => t >= a && t < b);

  const child = t >= 3.9 && t < 8.6 ? childAt(t) : null;
  const teen = t >= 9.2 && t < 15.9 ? teenAt(t) : null;
  const adult = t >= 19.55 ? adultAt(t) : null;
  const tiny = t >= 19.55 ? tinyAt(t) : null;

  // The clock ends up in the tiny kid's hands
  let clock = clockAt(t);
  if (tiny && t >= 27.4) {
    const a = handOf(tiny, "a");
    const b = handOf(tiny, "b");
    const hold = t < 28.3 ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : b;
    clock = { ...clock, x: hold.x, y: hold.y + 12, run: 0, legs: 0.6, ring: false };
  }

  const seed = Math.floor(t * 8) % 6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id="boil" filterUnits="userSpaceOnUse" x={-1300} y={-1400} width={3700} height={4700}>
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={seed} />
          <feDisplacementMap in="SourceGraphic" scale={4} />
        </filter>
      </defs>
      <g transform={camera(t)}>
        <g filter="url(#boil)">
          <Backdrop t={t} />
          <BedBack />
          <Nightstand />
          {inBed ? <Stickman c={hero} /> : null}
          <Blanket t={t} heroInBed={inBed} sitting={sitting} />
          <BeardPile on={inBed && t > 17.6} t={t} />
          {child ? <Stickman c={child} /> : null}
          {teen ? <Stickman c={teen} /> : null}
          {adult ? <Stickman c={adult} /> : null}
          <Clock c={clock} t={t} facing={-1} />
          {tiny ? <Stickman c={tiny} /> : null}
          {!inBed ? <Stickman c={hero} /> : null}
          <Zzz t={t} x={head.x} y={head.y} on={asleep} />
          <FlyingPages t={t} />
        </g>
      </g>
    </svg>
  );
};

// ─── Time-warp swirl + flash (screen space) ───────────────────────────────
const WarpOverlay: React.FC = () => {
  const t = useT();
  const u = warpProgress(t);
  if (u < 0) return null;
  const a = Math.sin(Math.PI * u);
  const flash = Math.max(0, 1 - Math.abs(u - 0.5) * 7);
  return (
    <AbsoluteFill>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        <g transform={`translate(${W / 2} ${H / 2}) rotate(${u * 540})`} opacity={a * 0.75}>
          {[...Array(14)].map((_, i) => {
            const r = ((i / 14 + u * 2) % 1) * 1300;
            return <circle key={i} r={r} fill="none" stroke={i % 2 ? "#7c5cff" : "#ffd23f"} strokeWidth={26} opacity={1 - r / 1300} strokeDasharray="60 40" />;
          })}
        </g>
        <rect width={W} height={H} fill="#fff" opacity={flash} />
      </svg>
    </AbsoluteFill>
  );
};

// ─── "5 MINUTES LATER" (crossed out and corrected) ────────────────────────
const Stamp: React.FC = () => {
  const t = useT();
  const w = WARPS.find((k) => t >= k.at + WARP_LEN && t < k.at + WARP_LEN + 1.7);
  if (!w) return null;
  const d = t - (w.at + WARP_LEN);
  const pop = ease("back", d / 0.2);
  const strike = Math.max(0, Math.min(1, (d - 0.35) / 0.15));
  const fix = ease("back", (d - 0.55) / 0.2);
  const out = Math.min(1, (1.7 - d) / 0.2);
  const txt: React.CSSProperties = {
    fontFamily: FONT_STACK,
    fontSize: 84,
    color: INK,
    WebkitTextStroke: "14px #fff",
    paintOrder: "stroke fill",
  };
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 170, opacity: out }}>
      <div style={{ ...txt, scale: String(pop), rotate: "-3deg", position: "relative" }}>
        <span style={{ position: "relative" }}>
          5 MINUTES
          <span style={{ position: "absolute", left: -8, top: "48%", height: 12, width: `${strike * 104}%`, background: "#e63946", borderRadius: 6, rotate: "-4deg" }} />
          {d > 0.55 ? (
            <span
              style={{
                ...txt,
                position: "absolute",
                left: "50%",
                top: -86,
                translate: "-50% 0",
                color: "#e63946",
                fontSize: 92,
                whiteSpace: "nowrap",
                scale: String(Math.max(0, fix)),
                rotate: "-8deg",
              }}
            >
              {w.label}
            </span>
          ) : null}
        </span>{" "}
        LATER
      </div>
    </AbsoluteFill>
  );
};

const CAPTIONS: readonly (readonly [number, number, string])[] = [
  [2.4, 3.6, "just 5 more minutes..."],
  [7.6, 8.8, "just 5 more minutes..."],
  [14.8, 16.0, "just 5 more minutes..."],
];

const Captions: React.FC = () => {
  const t = useT();
  const c = CAPTIONS.find(([a, b]) => t >= a && t < b);
  if (!c) return null;
  const [a, b, text] = c;
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 1520 }}>
      <div
        style={{
          fontFamily: FONT_STACK,
          fontSize: 76,
          color: INK,
          WebkitTextStroke: "14px #fff",
          paintOrder: "stroke fill",
          scale: String(ease("back", (t - a) / 0.18)),
          opacity: Math.min(1, (b - t) / 0.15),
          rotate: "-3deg",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const t = useT();
  if (t < END_FADE) return null;
  const dark = Math.min(1, (t - END_FADE) / 0.3);
  const l1 = ease("back", (t - (END_FADE + 0.4)) / 0.25);
  const l2 = ease("back", (t - (END_FADE + 1.1)) / 0.25);
  const line: React.CSSProperties = { fontFamily: FONT_STACK, fontSize: 96, color: "#fff", textAlign: "center", lineHeight: 1.15, padding: "0 70px" };
  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(17,17,17,${dark})`, justifyContent: "center", alignItems: "center", gap: 30 }}>
      <div style={{ ...line, scale: String(Math.max(0, l1)), opacity: t > END_FADE + 0.4 ? 1 : 0 }}>Don't hit snooze</div>
      <div style={{ ...line, color: "#ffd23f", scale: String(Math.max(0, l2)), opacity: t > END_FADE + 1.1 ? 1 : 0 }}>on the people you love.</div>
    </AbsoluteFill>
  );
};

const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

export const FiveMoreMinutes: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#fdf1dc" }}>
      <World />
      <WarpOverlay />
      <Stamp />
      <Captions />
      <HookTitle text="POV: you hit snooze" top={1500} to={2.35} />
      <EndCard />

      {/* Intro: the first snooze */}
      <Audio name="Snore" src={sfx("snore")} durationInFrames={1.2 * fps} volume={0.7} />
      <Audio name="Alarm 1" src={sfx("alarm")} from={1.2 * fps} durationInFrames={1.05 * fps} volume={0.7} />
      <Audio name="Rubber arm stretch" src={sfx("stretch")} from={1.65 * fps} volume={0.6} />
      <Audio name="Snooze slap 1" src={sfx("click")} from={2.25 * fps} />
      <Audio name="Snore again" src={sfx("snore")} from={2.55 * fps} durationInFrames={1.1 * fps} volume={0.7} />
      <Audio name="Warp 1" src={sfx("warp")} from={3.6 * fps} volume={0.8} />

      {/* +1 day: the kid */}
      <Audio name="Stamp 1" src={sfx("boom")} from={4.4 * fps} volume={0.45} />
      <Audio name="Alarm 2" src={sfx("alarm")} from={4.4 * fps} durationInFrames={0.6 * fps} volume={0.8} />
      <Audio name="Sit up 1" src={sfx("swish")} from={4.7 * fps} />
      <Audio name="Rubber arm stretch 2" src={sfx("stretch")} from={4.85 * fps} volume={0.6} />
      <Audio name="Snooze slap 2" src={sfx("click")} from={5.0 * fps} />
      <Audio name="Flop 1" src={sfx("pomf")} from={6.65 * fps} />
      <Audio name="Child facepalm" src={sfx("slap")} from={6.95 * fps} volume={0.7} />
      <Audio name="Snooze slap 3" src={sfx("click")} from={7.55 * fps} />
      <Audio name="Snore 3" src={sfx("snore")} from={7.75 * fps} durationInFrames={1.05 * fps} volume={0.7} />
      <Audio name="Door slam 1" src={sfx("thud")} from={8.6 * fps} volume={0.7} />
      <Audio name="Warp 2" src={sfx("warp")} from={8.8 * fps} volume={0.8} />

      {/* +8 years: the teen */}
      <Audio name="Stamp 2" src={sfx("boom")} from={9.6 * fps} volume={0.45} />
      <Audio name="Alarm 3" src={sfx("alarm")} from={9.6 * fps} durationInFrames={0.8 * fps} volume={0.8} playbackRate={1.15} />
      <Audio name="Sit up 2" src={sfx("swish")} from={9.9 * fps} />
      <Audio name="Gum stretch" src={sfx("slide-up")} from={11.2 * fps} durationInFrames={0.8 * fps} volume={0.3} playbackRate={2} />
      <Audio name="Gum pop" src={sfx("pop")} from={12.0 * fps} />
      <Audio name="Flop 2" src={sfx("pomf")} from={12.85 * fps} />
      <Audio name="Clock dodges" src={sfx("boing")} from={13.4 * fps} volume={0.5} playbackRate={1.6} />
      <Audio name="Miss 1" src={sfx("thud")} from={13.5 * fps} volume={0.7} />
      <Audio name="Clock dodges 2" src={sfx("boing")} from={13.95 * fps} volume={0.5} playbackRate={1.8} />
      <Audio name="Miss 2" src={sfx("thud")} from={14.1 * fps} volume={0.7} />
      <Audio name="Snooze slap 4" src={sfx("click")} from={14.6 * fps} />
      <Audio name="Teen facepalm" src={sfx("slap")} from={14.75 * fps} volume={0.7} />
      <Audio name="Snore 4" src={sfx("snore")} from={14.9 * fps} durationInFrames={1.1 * fps} volume={0.7} />
      <Audio name="Door slam 2" src={sfx("thud")} from={15.9 * fps} volume={0.7} />
      <Audio name="Warp 3" src={sfx("warp")} from={16.0 * fps} volume={0.8} />

      {/* +40 years: the beard */}
      <Audio name="Stamp 3" src={sfx("boom")} from={16.8 * fps} volume={0.45} />
      <Audio name="Tired alarm" src={sfx("alarm")} from={16.8 * fps} durationInFrames={1.2 * fps} volume={0.5} playbackRate={0.6} />
      <Audio name="Old bones" src={sfx("joint-crack")} from={18.0 * fps} />
      <Audio name="Beard reveal" src={sfx("boom")} from={18.6 * fps} volume={0.85} />
      <Audio name="Bird in the tree" src={sfx("tweet")} from={19.0 * fps} volume={0.5} />
      <Audio name="Door creak" src={sfx("creak")} from={19.55 * fps} volume={0.6} />
      <Audio name="Tiny kid: happy chime" src={sfx("kid-win")} from={21.05 * fps} volume={0.8} playbackRate={1.3} />
      <Audio name="Adult facepalm" src={sfx("slap")} from={21.55 * fps} volume={0.8} />
      <Audio name="Regret" src={sfx("music-box")} from={22.0 * fps} volume={0.55} />
      <Audio name="Sneaky reach" src={sfx("slide-up")} from={23.3 * fps} volume={0.45} />
      <Audio name="Clock legs" src={sfx("pop")} from={24.05 * fps} />
      <Audio name="Living alarm" src={sfx("alarm")} from={24.1 * fps} durationInFrames={3.35 * fps} volume={0.55} loop />
      <Audio name="Missed again" src={sfx("thud")} from={24.25 * fps} volume={0.7} />
      <Audio name="Clock feet" src={sfx("scurry")} from={24.6 * fps} volume={0.7} />
      <Audio name="Leap out of bed" src={sfx("swish")} from={24.85 * fps} />
      <Audio name="Chase music" src={sfx("sneaky-loop")} from={25.0 * fps} durationInFrames={2.5 * fps} playbackRate={1.7} volume={0.5} />
      <Audio name="Land" src={sfx("joint-crack")} from={25.15 * fps} volume={0.6} />
      <Audio name="Clock feet back" src={sfx("scurry")} from={26.75 * fps} volume={0.7} />
      <Audio name="Caught" src={sfx("click")} from={27.45 * fps} />
      <Audio name="Skid" src={sfx("scratch")} from={27.5 * fps} volume={0.8} />

      {/* Together */}
      <Audio name="Hand in hand" src={sfx("twinkle")} from={28.45 * fps} volume={0.55} />
      <Audio name="Door to the sun" src={sfx("fanfare")} from={29.1 * fps} volume={0.45} />
      <Audio name="Moral 1" src={sfx("chime")} from={(END_FADE + 0.4) * fps} volume={0.5} />
      <Audio name="Moral 2" src={sfx("chime")} from={(END_FADE + 1.1) * fps} volume={0.5} playbackRate={1.25} />

      {/* Character sound signatures (same in every episode; no voice) */}
      <Audio name="Hero: grumble" src={sfx("hero-blip")} from={4.8 * fps} volume={0.6} playbackRate={0.85} />
      <Audio name="Kid: points" src={sfx("kid-blip")} from={5.32 * fps} volume={0.6} />
      <Audio name="Hero: heh" src={sfx("hero-blip")} from={6.05 * fps} volume={0.6} playbackRate={1.15} />
      <Audio name="Teen: looks up" src={sfx("kid-blip")} from={12.32 * fps} volume={0.5} playbackRate={0.85} />
      <Audio name="Hero: huh?!" src={sfx("hero-blip")} from={18.65 * fps} volume={0.7} playbackRate={1.1} />
      <Audio name="Adult kid: what" src={sfx("kid-blip")} from={23.42 * fps} volume={0.5} playbackRate={0.72} />
      <Audio name="Hero: aww" src={sfx("hero-blip")} from={28.45 * fps} volume={0.5} playbackRate={0.9} />
    </AbsoluteFill>
  );
};
