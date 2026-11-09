import React from "react";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/PermanentMarker";
import { AbsoluteFill, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, num, shake, type Ease } from "../../lib/kf";
import { GROUND, INK, Stickman } from "../../rig/Stickman";
import { ChalkPath, ChalkTint } from "../../shared/chalk";
import { ChalkNote } from "../../shared/lesson";
import { FONT_STACK, HookTitle } from "../../shared/ui";
import { flareAt, handOf, heroAt, kidAt, meteorS5, newtSpace, rocketBase, ROCKET_X, S2_BASE, sandwichAt, wrenchAt } from "./cast";
import {
  Bolt,
  Chunk,
  Crater,
  Flare,
  Flash,
  Ghost,
  GreenPlanet,
  GreenSurface,
  GreyPlanet,
  GreySurface,
  LaunchTower,
  Meteor,
  Rocket,
  Sandwich,
  SpaceBg,
  Sprout,
  VacuumDust,
  WINDOW,
  Wrench,
} from "./props";
import {
  ALONE,
  ALONE_END,
  CATCH_T,
  CRUISE,
  FINAL,
  FLIGHT,
  FLIGHT_DIR,
  G_GREY,
  GREEN_BEATS,
  GREY,
  GREY_BEATS,
  greyFall,
  IMPACT_T,
  LAUNCH,
  SOUND_NOTE,
  STRAND,
  STRAND_END,
  TOUCH_T,
  END_FADE,
} from "./timeline";

loadFont();

const W = 1080;
const H = 1920;
const gy = (z: number) => GROUND - (0.74 * H - H / 2) / z;

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

const Boil: React.FC<{ t: number; id: string }> = ({ t, id }) => (
  <filter id={id} filterUnits="userSpaceOnUse" x={-4000} y={-4000} width={10000} height={10000}>
    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={Math.floor(t * 8) % 6} />
    <feDisplacementMap in="SourceGraphic" scale={4} />
  </filter>
);

type Cam = { x: number; y: number; z: number };
const View: React.FC<{ t: number; cam: Cam; id: string; shk?: { x: number; y: number }; children: React.ReactNode; backdrop?: React.ReactNode }> = ({ t, cam, id, shk = { x: 0, y: 0 }, children, backdrop }) => (
  <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
    <defs>
      <Boil t={t} id={id} />
    </defs>
    {backdrop}
    <g transform={`translate(${W / 2 + shk.x} ${H / 2 + shk.y}) scale(${cam.z}) translate(${-cam.x} ${-cam.y})`}>
      <g filter={`url(#${id})`}>{children}</g>
    </g>
  </svg>
);
const camTrack = (t: number, shots: readonly (readonly [number, number, number, number, Ease?])[]): Cam => {
  const tr = (i: 1 | 2 | 3) => num(t, shots.map((k) => [k[0], k[i], k[4]] as const));
  return { x: tr(1), y: tr(2), z: tr(3) };
};

// ─── S1–S2 · Launch, cruise, the burst ────────────────────────────────────
const CHUNKS: readonly { kind: 0 | 1 | 2 | 3; dx: number; dy: number; vx: number; vy: number; spin: number }[] = [
  { kind: 0, dx: 0, dy: -1080, vx: 60, vy: -720, spin: 140 },
  { kind: 1, dx: -180, dy: -420, vx: -820, vy: -120, spin: -220 },
  { kind: 2, dx: 180, dy: -420, vx: 820, vy: 60, spin: 200 },
  { kind: 3, dx: -320, dy: -120, vx: -620, vy: 520, spin: 300 },
  { kind: 3, dx: 320, dy: -120, vx: 640, vy: 560, spin: -280 },
];

const RocketScene: React.FC<{ t: number }> = ({ t }) => {
  const space = t >= CRUISE.start;
  const base = rocketBase(t);
  const hero = heroAt(t);
  const kid = kidAt(t);
  const burst = t >= CRUISE.burst;
  const heat = space ? Math.max(0, Math.min(1, (t - CRUISE.maxed) / (CRUISE.burst - CRUISE.maxed))) : 0;
  const flame = !space ? (t < LAUNCH.ignite ? 0 : Math.min(1, (t - LAUNCH.ignite) / 0.3)) : 0.8 + 1.6 * heat;
  const lever = t < CRUISE.shove ? 0 : Math.min(1, (t - CRUISE.shove) / 0.12);
  const gauge = 0.25 + 0.75 * Math.min(1, heat * 1.2);
  const wobble = space && !burst ? Math.sin(t * 61) * 10 * heat : 0;
  const lights = LAUNCH.lights.filter((l) => t >= l).length;

  const cam = space
    ? camTrack(t, [
        [CRUISE.start, ROCKET_X, S2_BASE + WINDOW.dy, 1.35],
        [CRUISE.maxed + 0.1, ROCKET_X, S2_BASE + WINDOW.dy, 1.35],
        [CRUISE.maxed + 0.7, ROCKET_X, S2_BASE - 300, 0.62, "io"],
        [CRUISE.burst + 1.0, ROCKET_X, S2_BASE - 300, 0.62],
        [CRUISE.end, ROCKET_X - 40, S2_BASE + WINDOW.dy + 120, 0.95, "io"],
      ])
    : { x: ROCKET_X, y: Math.min(900, base - 520), z: 0.82 };
  const shk = shake(t, [
    [LAUNCH.lift, 8],
    [LAUNCH.lift + 0.4, 6],
    [CRUISE.burst, 14],
  ]);
  const skyDark = space ? 1 : Math.min(1, Math.max(0, (900 - (base - 520)) / 2400));
  const crew = (
    <>
      <Stickman c={kid} />
      <Stickman c={hero} />
    </>
  );
  const center = { x: ROCKET_X, y: S2_BASE - 600 };
  return (
    <View
      t={t}
      cam={cam}
      id="boilR"
      shk={shk}
      backdrop={
        space ? (
          <SpaceBg w={W} h={H} t={t} drift={{ x: 0, y: burst ? -(CRUISE.burst - CRUISE.start) * 900 : -(t - CRUISE.start) * 900 }} />
        ) : (
          <g>
            <rect width={W} height={H} fill="#bfe6ff" />
            <rect width={W} height={H} fill="#0b1026" opacity={skyDark} />
          </g>
        )
      }
    >
      {!space ? (
        <g>
          <rect x={-3000} y={GROUND} width={7000} height={3000} fill="#8cc56f" />
          <line x1={-3000} y1={GROUND} x2={4000} y2={GROUND} stroke={INK} strokeWidth={9} />
          <rect x={ROCKET_X - 360} y={GROUND - 30} width={720} height={30} fill="#9aa5b1" stroke={INK} strokeWidth={7} />
          <LaunchTower x={ROCKET_X + 420} lights={lights} />
          {t > LAUNCH.ignite
            ? [...Array(10)].map((_, i) => {
                const d = (t - LAUNCH.ignite + i * 0.13) % 1.3;
                const side = i % 2 ? 1 : -1;
                return <circle key={i} cx={ROCKET_X + side * (120 + d * 420)} cy={GROUND - 40 - d * 120} r={50 + d * 120} fill="#eef2f5" stroke="#b8c2cc" strokeWidth={5} opacity={1 - d / 1.3} />;
              })
            : null}
        </g>
      ) : null}
      {!burst ? (
        <g transform={`translate(${wobble} 0)`}>
          <Rocket x={ROCKET_X} base={base} flame={flame} t={t} heat={heat} gauge={gauge} lever={lever}>
            {crew}
          </Rocket>
          {heat > 0.3
            ? [0, 1, 2].map((i) => {
                const d = (t * 1.3 + i / 3) % 1;
                return <circle key={i} cx={ROCKET_X + (i - 1) * 180} cy={base - 300 - d * 500} r={40 + d * 80} fill="#9aa5b1" opacity={(1 - d) * heat * 0.8} />;
              })
            : null}
        </g>
      ) : (
        <g>
          {CHUNKS.map((c, i) => {
            const tau = t - CRUISE.burst;
            return <Chunk key={i} kind={c.kind} x={center.x + c.dx + c.vx * tau} y={center.y + 600 + c.dy + c.vy * tau} rot={c.spin * tau} />;
          })}
          {[...Array(12)].map((_, i) => {
            const tau = t - CRUISE.burst;
            const a = random(`b${i}`) * Math.PI * 2;
            const v = 300 + 500 * random(`bv${i}`);
            return <Bolt key={i} x={center.x + Math.cos(a) * v * tau} y={center.y + Math.sin(a) * v * tau} rot={tau * 300 * (i % 2 ? 1 : -1)} />;
          })}
          {crew}
          <Flash x={center.x} y={center.y} t={t} at={CRUISE.burst} />
        </g>
      )}
    </View>
  );
};

// ─── S3 · Stranded between the planets ────────────────────────────────────
const Planets: React.FC<{ t: number; green?: number }> = ({ t, green = 1 }) => (
  <g>
    <GreenPlanet x={150} y={1720} r={520 * green} t={t} />
    <GreyPlanet x={950} y={280} r={280} />
  </g>
);

const StrandScene: React.FC<{ t: number }> = ({ t }) => {
  // centred on the pair; once the flare fires, the camera follows Newt out
  const n0 = newtSpace(Math.min(t, FLIGHT.burn));
  const follow = Math.min(1, Math.max(0, (t - FLIGHT.burn) / 0.8));
  const nn = newtSpace(t);
  const cam = { x: -230 + (nn.x - n0.x) * follow, y: -70 + (nn.y - n0.y) * follow, z: 0.85 };
  const hero = heroAt(t);
  const kid = kidAt(t);
  const fl = flareAt(t);
  const wr = wrenchAt(t);
  const sw = sandwichAt(t);
  const n = newtSpace(t);
  const looking = (t > STRAND.look && t < STRAND.lookEnd) || (t > FLIGHT.look && t < FLIGHT.burn);
  return (
    <>
      <View t={t} cam={cam} id="boilS" backdrop={<><SpaceBg w={W} h={H} t={t} /><Planets t={t} /></>}>
        {[...Array(8)].map((_, i) => (
          <Bolt key={i} x={-1100 + random(`dx${i}`) * 2000 + Math.sin(t * 0.2 + i) * 30} y={-1100 + random(`dy${i}`) * 2000 + t * 6 * (i % 3)} rot={t * 20 * (i % 2 ? 1 : -1)} />
        ))}
        {sw ? <Sandwich x={sw.x} y={sw.y} rot={sw.rot} /> : null}
        {wr ? <Wrench x={wr.x} y={wr.y} rot={wr.rot} /> : null}
        <Stickman c={hero} />
        <Stickman c={kid} />
        {fl ? (
          <g transform={`translate(${fl.x} ${fl.y}) scale(${fl.s}) translate(${-fl.x} ${-fl.y})`}>
            <Flare x={fl.x} y={fl.y} dir={fl.dir} lit={fl.lit} t={t} blink={fl.blink} />
          </g>
        ) : null}
        {/* Newt's physics looks: wordless chalk — the push goes one way, he goes the other */}
        {t > STRAND.look && t < STRAND.lookEnd ? <PushArrows t={t} at={STRAND.look + 0.15} from={handOf(kidAt(STRAND.look))} away={{ x: 0.5, y: 0.86 }} to={{ x: -0.32, y: -0.95 }} /> : null}
        {t > FLIGHT.look && t < FLIGHT.burn ? <PushArrows t={t} at={FLIGHT.look + 0.15} from={{ x: n.x, y: n.y - 200 }} away={{ x: -FLIGHT_DIR.x, y: -FLIGHT_DIR.y }} to={FLIGHT_DIR} /> : null}
      </View>
      {looking ? (
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <ChalkTint t={t} from={t < CATCH_T ? STRAND.look : FLIGHT.look} to={t < CATCH_T ? STRAND.lookEnd : FLIGHT.burn} w={W} h={H} opacity={0.25} />
        </svg>
      ) : null}
    </>
  );
};

/** Two chalk arrows of equal "push": a short one for what's thrown, a long yellow one for Newt. */
const PushArrows: React.FC<{ t: number; at: number; from: { x: number; y: number }; away: { x: number; y: number }; to: { x: number; y: number } }> = ({ t, at, from, away, to }) => {
  const arrow = (d: { x: number; y: number }, len: number) => {
    const ex = from.x + d.x * len;
    const ey = from.y + d.y * len;
    const a = Math.atan2(d.y, d.x);
    const h = 40;
    return `M ${from.x + d.x * 60} ${from.y + d.y * 60} L ${ex} ${ey} M ${ex - h * Math.cos(a - 0.5)} ${ey - h * Math.sin(a - 0.5)} L ${ex} ${ey} L ${ex - h * Math.cos(a + 0.5)} ${ey - h * Math.sin(a + 0.5)}`;
  };
  return (
    <g>
      <ChalkPath t={t} at={at} d={arrow(away, 380)} width={12} />
      <ChalkPath t={t} at={at + 0.5} d={arrow(to, 380)} width={12} color="#ffd23f" />
    </g>
  );
};

// ─── S4 / S7 · The green planet ───────────────────────────────────────────
const GreenScene: React.FC<{ t: number; final: boolean }> = ({ t, final }) => {
  const cam = { x: 560, y: gy(1.0), z: 1.0 };
  const kid = kidAt(t);
  const fl = flareAt(t);
  const wave = !final && t > GREEN_BEATS.sprout ? 1 : 0;
  const facepalm = final && t > FINAL.facepalm ? Math.min(1, (t - FINAL.facepalm - 0.2) / 0.3) : 0;
  return (
    <View t={t} cam={cam} id="boilG">
      <GreenSurface camX={cam.x - W / 2} />
      <Sprout x={860} t={t} wave={wave} facepalm={facepalm} />
      {final && t > FINAL.ghost ? <Ghost x={1150 - (t - FINAL.ghost) * 260} y={520 - (t - FINAL.ghost) * 40} t={t} wave={1} s={0.4} opacity={0.8} /> : null}
      <Stickman c={kid} />
      {fl ? <Flare x={fl.x} y={fl.y} dir={fl.dir} lit={fl.lit} t={t} /> : null}
      {!final && t > TOUCH_T && t < TOUCH_T + 0.6
        ? [...Array(6)].map((_, i) => {
            const d = t - TOUCH_T;
            return <circle key={i} cx={540 + (i - 2.5) * 60 * (1 + d * 3)} cy={GROUND - 10 - d * 60} r={14 + d * 40} fill="#d8f0c0" opacity={1 - d / 0.6} />;
          })
        : null}
    </View>
  );
};

// ─── S5 · Dash alone; the meteor ──────────────────────────────────────────
const AloneScene: React.FC<{ t: number }> = ({ t }) => {
  const cam = { x: 0, y: -60, z: 0.78 };
  const hero = heroAt(t);
  const m = meteorS5(t);
  const shk = shake(t, [[ALONE.hit, 12]]);
  return (
    <View t={t} cam={cam} id="boilA" shk={shk} backdrop={<><SpaceBg w={W} h={H} t={t} /><Planets t={t} /></>}>
      <Meteor x={m.x} y={m.y} s={m.s * 1.1} rot={m.rot} />
      <Stickman c={hero} />
    </View>
  );
};

// ─── S6 · The grey planet: silent impact, the ghost ───────────────────────
const GreyScene: React.FC<{ t: number }> = ({ t }) => {
  const fall = greyFall(IMPACT_T);
  const craterX = 560;
  const x0 = craterX - fall.dx;
  const cam = { x: craterX - 40, y: gy(0.85), z: 0.85 };
  const f = greyFall(t);
  // the sun is overhead: their shadow grows as they come down from far above
  const shadowK = Math.min(1, Math.max(0, (t - GREY.start) / (IMPACT_T - GREY.start)) ** 3);
  const mx = x0 + f.dx;
  const my = GROUND - f.h - 140;
  const hit = t >= IMPACT_T;
  const k = hit ? Math.min(1, (t - IMPACT_T) / 0.18) : 0;
  const shk = shake(t, [[IMPACT_T, 18]]);
  const dash = { ...heroAt(ALONE_END - 0.01), x: mx - 40, lift: GROUND - (my + 120), scale: 1, rot: -20 };
  const ghostRise = Math.min(1, Math.max(0, (t - GREY_BEATS.ghost) / 1.2));
  const ghostAway = Math.max(0, t - GREY_BEATS.wave - 0.6);
  return (
    <View t={t} cam={cam} id="boilY" shk={shk}>
      <GreySurface camX={cam.x - W / 2} t={t} />
      {!hit ? <ellipse cx={craterX} cy={GROUND + 6} rx={40 + 240 * shadowK} ry={8 + 30 * shadowK} fill="#000" opacity={0.15 + 0.35 * shadowK} /> : null}
      {hit ? <Crater x={x0 + greyFall(IMPACT_T).dx} k={k * 1.35} scarf={t < GREY_BEATS.ghost} /> : null}
      {!hit ? (
        <g>
          <Meteor x={mx} y={my} s={0.95} rot={-t * 18} />
          <Stickman c={dash} />
        </g>
      ) : null}
      <VacuumDust x={x0 + greyFall(IMPACT_T).dx} t={t} at={IMPACT_T} g={G_GREY} seed="moon" />
      <Flash x={x0 + greyFall(IMPACT_T).dx} y={GROUND - 40} t={t} at={IMPACT_T} />
      {t > GREY_BEATS.ghost ? (
        <Ghost
          x={x0 + greyFall(IMPACT_T).dx + ghostAway * 120}
          y={GROUND - 120 - 520 * ease("out", ghostRise) - ghostAway * ghostAway * 220}
          t={t}
          wave={t > GREY_BEATS.wave && t < GREY_BEATS.wave + 1.6 ? 1 : 0}
          opacity={0.92 * Math.min(1, ghostRise * 2)}
        />
      ) : null}
    </View>
  );
};

const EndCard: React.FC<{ t: number }> = ({ t }) => {
  if (t < END_FADE) return null;
  const dark = Math.min(1, (t - END_FADE) / 0.3);
  const l1 = ease("back", (t - (END_FADE + 0.4)) / 0.25);
  const l2 = ease("back", (t - (END_FADE + 1.1)) / 0.25);
  const line: React.CSSProperties = { fontFamily: FONT_STACK, fontSize: 104, color: "#fff", textAlign: "center", lineHeight: 1.15, padding: "0 70px" };
  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(11,16,38,${dark})`, justifyContent: "center", alignItems: "center", gap: 30 }}>
      <div style={{ ...line, scale: String(Math.max(0, l1)), opacity: t > END_FADE + 0.4 ? 1 : 0 }}>Every push</div>
      <div style={{ ...line, color: "#ffd23f", scale: String(Math.max(0, l2)), opacity: t > END_FADE + 1.1 ? 1 : 0 }}>pushes back.</div>
    </AbsoluteFill>
  );
};

const Scene: React.FC = () => {
  const t = useT();
  let scene: React.ReactNode;
  if (t < STRAND.start) scene = <RocketScene t={t} />;
  else if (t < STRAND_END) scene = <StrandScene t={t} />;
  else if (t < ALONE.start) scene = <GreenScene t={t} final={false} />;
  else if (t < ALONE_END) scene = <AloneScene t={t} />;
  else if (t < FINAL.start) scene = <GreyScene t={t} />;
  else scene = <GreenScene t={t} final />;
  return (
    <>
      {scene}
      <ChalkNote t={t} from={SOUND_NOTE.t0} to={SOUND_NOTE.t1} lines={["(no air = no sound)"]} top={1560} size={56} />
      <EndCard t={t} />
    </>
  );
};

const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

// Sound: a soft space music bed; real silence where physics demands it (the burst and the
// impact happen in vacuum). Voices are radio blips inside the helmets — no words.
export const SpacedOut: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  const silent = (fr: number) => {
    const t = fr / fps;
    const quiet = (a: number, b: number) => t > a && t < b;
    return quiet(CRUISE.burst, CRUISE.burst + 1.8) || quiet(IMPACT_T, GREY_BEATS.silence + 0.4) ? 0 : 1;
  };
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b1026" }}>
      <Scene />
      <HookTitle text="Space has no air. Dash has no plan." to={LAUNCH.ignite} />

      <Audio name="Music bed" src={sfx("bed-space")} loop durationInFrames={durationInFrames} volume={(fr) => 0.24 * silent(fr) * Math.min(1, fr / f(1.0), (durationInFrames - fr) / f(1.5))} />

      {/* Launch */}
      {LAUNCH.lights.map((l, i) => (
        <Audio key={i} name={`Countdown beep ${i + 1}`} src={sfx("beep")} from={f(l)} volume={0.35} playbackRate={1 + i * 0.12} />
      ))}
      <Audio name="Rocket roar" src={sfx("rocket-roar")} from={f(LAUNCH.ignite)} durationInFrames={f(CRUISE.start - LAUNCH.ignite)} volume={(fr) => 0.55 * Math.max(0.2, 1 - fr / f(3.6))} />
      <Audio name="Hero: woo" src={sfx("hero-blip")} from={f(LAUNCH.lift + 0.3)} volume={0.4} playbackRate={1.15} />
      <Audio name="Kid: whee" src={sfx("kid-win")} from={f(LAUNCH.lift + 0.4)} volume={0.35} />

      {/* Cruise → burst (cabin air carries sound until it bursts) */}
      <Audio name="Kid: no-no-no" src={sfx("kid-blip")} from={f(CRUISE.no)} volume={0.35} playbackRate={0.85} />
      <Audio name="Hero: heh" src={sfx("hero-blip")} from={f(CRUISE.cocky + 0.05)} volume={0.45} playbackRate={1.15} />
      <Audio name="Throttle clunk" src={sfx("clunk")} from={f(CRUISE.shove)} volume={0.6} />
      <Audio name="Engine strain" src={sfx("rocket-roar")} from={f(CRUISE.maxed)} durationInFrames={f(CRUISE.burst - CRUISE.maxed)} volume={(fr) => 0.2 + 0.35 * Math.min(1, fr / f(2))} playbackRate={1.2} />
      <Audio name="Warning beeps" src={sfx("warn")} from={f(9.4)} durationInFrames={f(CRUISE.burst - 9.4)} loop volume={0.2} />
      <Audio name="Kid: facepalm" src={sfx("slap")} from={f(CRUISE.maxed + 0.3)} volume={0.25} playbackRate={1.3} />
      <Audio name="Hero: uh-oh" src={sfx("hero-blip")} from={f(9.7)} volume={0.45} playbackRate={0.8} />
      {/* the burst itself: silence (vacuum), only a soft thump felt through the suits */}
      <Audio name="Burst felt through the suit" src={sfx("thump")} from={f(CRUISE.burst)} volume={0.5} />

      {/* Stranded */}
      <Audio name="Hero: swim effort" src={sfx("hero-blip")} from={f(STRAND.swim + 0.3)} volume={0.35} playbackRate={0.95} />
      <Audio name="Hero: huh (no progress)" src={sfx("hero-blip")} from={f(STRAND.swimEnd + 0.05)} volume={0.4} playbackRate={0.8} />
      <Audio name="Flare blink" src={sfx("beep")} from={f(STRAND.spot)} volume={0.15} playbackRate={1.6} />
      <Audio name="Kid: chalk (throw)" src={sfx("chalk")} from={f(STRAND.look + 0.1)} volume={0.35} />
      <Audio name="Kid: hup" src={sfx("kid-blip")} from={f(STRAND.throw)} volume={0.35} playbackRate={1.1} />
      <Audio name="Hero: idea" src={sfx("hero-blip")} from={f(STRAND.copy + 0.1)} volume={0.4} playbackRate={1.15} />
      <Audio name="Hero: sad sandwich" src={sfx("womp")} from={f(STRAND.dashThrow + 1.2)} volume={0.35} playbackRate={1.3} />
      <Audio name="Kid: got it" src={sfx("chime")} from={f(CATCH_T)} volume={0.3} />
      <Audio name="Flare strike" src={sfx("flare")} from={f(FLIGHT.light)} durationInFrames={f(FLIGHT.burn - FLIGHT.light)} volume={0.15} />
      <Audio name="Kid: chalk (flare)" src={sfx("chalk")} from={f(FLIGHT.look + 0.1)} volume={0.35} />
      <Audio name="Flare thrust (felt through the glove)" src={sfx("flare")} from={f(FLIGHT.burn)} durationInFrames={f(STRAND_END - FLIGHT.burn)} volume={0.35} />
      <Audio name="Kid: wheee" src={sfx("kid-win")} from={f(FLIGHT.burn + 0.3)} volume={0.35} />

      {/* Green planet landing (it has air: now we hear the flare) */}
      <Audio name="Braking flare" src={sfx("flare")} from={f(STRAND_END)} durationInFrames={f(GREEN_BEATS.flameOut - STRAND_END)} volume={0.45} />
      <Audio name="Soft touchdown" src={sfx("pomf")} from={f(TOUCH_T)} volume={0.45} />
      <Audio name="Kid: win" src={sfx("kid-win")} from={f(GREEN_BEATS.cheer)} volume={0.45} />
      <Audio name="Sprout: hello" src={sfx("chirp3")} from={f(GREEN_BEATS.sprout)} volume={0.3} playbackRate={0.8} />

      {/* Dash and the meteor */}
      <Audio name="Hero: bored hum" src={sfx("hero-blip")} from={f(ALONE.bored + 0.4)} volume={0.3} playbackRate={0.9} />
      <Audio name="Hero: uh-oh" src={sfx("hero-blip")} from={f(ALONE.seen + 0.1)} volume={0.45} playbackRate={0.8} />
      <Audio name="Hero: scream" src={sfx("hero-scream")} from={f(ALONE.cover)} durationInFrames={f(ALONE_END - ALONE.cover)} volume={0.4} />
      <Audio name="Meteor hit (felt)" src={sfx("thump")} from={f(ALONE.hit)} volume={0.6} />

      {/* Grey planet: no air → a silent impact, then the deadpan */}
      <Audio name="Impact felt through the ground" src={sfx("thump")} from={f(IMPACT_T)} volume={0.35} playbackRate={0.7} />
      <Audio name="Hero: womp" src={sfx("womp")} from={f(GREY_BEATS.womp)} volume={0.6} />
      <Audio name="Ghost: wooo" src={sfx("ghost")} from={f(GREY_BEATS.ghost + 0.2)} volume={0.4} />

      {/* Final */}
      <Audio name="Kid: facepalm" src={sfx("slap")} from={f(FINAL.facepalm + 0.2)} volume={0.3} playbackRate={1.2} />
      <Audio name="Moral 1" src={sfx("chime")} from={f(END_FADE + 0.4)} volume={0.35} />
      <Audio name="Moral 2" src={sfx("chime")} from={f(END_FADE + 1.1)} volume={0.35} playbackRate={1.25} />
    </AbsoluteFill>
  );
};
