import React from "react";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ease } from "../../lib/kf";
import times from "../../../tools/blender/s02_times.json";
import anchors from "../../../tools/blender/s02_anchors.json";
import words from "../../../public/voices/s02/words.json";

// Presentation (user, 2026-11-15): the clean explainer-short look: heavy white sans-serif captions with a black outline
// and a soft shadow, 1–3 words at a time near the centre; the same type for the title, labels and the moral card.
const { fontFamily: FONT } = loadFont("normal", { weights: ["800", "900"], subsets: ["latin"] });

// Short s02 — Why You Shiver: Your Muscles Fight Each Other. Picture: Blender (tools/blender/s02_*.py →
// public/renders/s02.mp4). This layer: Liam's narration (ElevenLabs), word-by-word captions from the real word
// timings (ElevenLabs Scribe), labels that point at the real 3D spots (tools/blender/s02_anchors.json, projected
// through the shot camera every frame), the sounds and a light winter underscore, the moral card and the credits.

const C = times.CUE;
const VO = times.VO_OFFSET;
export const S02_DURATION = times.DUR;
const useT = () => useCurrentFrame() / useVideoConfig().fps;

type W = { text: string; start: number; end: number };
const SPOKEN: W[] = (words.words as W[]).filter((w) => !w.text.startsWith("["));
const HOT = /^(shiver|cold|warm|insides|hands|nose|core|heat|muscles|tug|front|back|pulls|nobody|wins|barely|teeth|chatter|jaw|goosebumps|tiny|hairs|fur|coat)/i;

/** captions: chunks of up to 3 words, each shown from its first word's start to the next chunk's start */
const CHUNKS = (() => {
  const out: { at: number; until: number; words: string[] }[] = [];
  let cur: W[] = [];
  const flush = () => {
    if (cur.length) out.push({ at: VO + cur[0].start, until: VO + cur[cur.length - 1].end + 0.25, words: cur.map((w) => w.text) });
    cur = [];
  };
  for (const w of SPOKEN) {
    cur.push(w);
    if (cur.length >= 3 || /[,.?!:]$/.test(w.text)) flush();
  }
  flush();
  for (let i = 0; i < out.length - 1; i++) out[i].until = Math.min(out[i].until, out[i + 1].at);
  return out;
})();

const stroke = (px: number) => ({ WebkitTextStroke: `${px}px #000`, paintOrder: "stroke fill", textShadow: "0 6px 18px rgba(0,0,0,0.55)" }) as const;

const Captions: React.FC<{ t: number }> = ({ t }) => {
  const c = CHUNKS.find((k) => t >= k.at && t < k.until);
  if (!c) return null;
  const pop = Math.max(0, ease("back", (t - c.at) / 0.14));
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 1180 }}>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 96, letterSpacing: -1, textAlign: "center", padding: "0 70px", lineHeight: 1.05, scale: String(0.86 + 0.14 * pop), ...stroke(16) }}>
        {c.words.map((w, k) => (
          <span key={k} style={{ color: HOT.test(w.replace(/[^a-z0-9-]/gi, "")) ? "#ffd23f" : "#ffffff" }}>
            {w.replace(/[.:]$/, "").toUpperCase()}{" "}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

type Pt = [number, number, number];
const A = anchors as unknown as Record<string, Pt[]>;
/** the anchor's screen position at frame f (null when it is off screen) */
const at = (name: string, f: number): [number, number] | null => {
  const row = A[name]?.find((r) => r[0] === f);
  return row ? [row[1], row[2]] : null;
};

/** a label pill at (x, y) with a leader line to the anchor; pops in, fades out */
const Pointer: React.FC<{ t: number; f: number; from: number; to: number; anchor: string; x: number; y: number; text: string; color?: string; size?: number }> = ({ t, f, from, to, anchor, x, y, text, color = "#4fc3ff", size = 58 }) => {
  if (t < from || t > to) return null;
  const p = at(anchor, f);
  const pop = Math.max(0, ease("back", (t - from) / 0.25));
  const fade = Math.min(1, (to - t) / 0.25);
  const draw = Math.min(1, (t - from) / 0.3);
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      {p ? (
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
          <line x1={x} y1={y} x2={x + (p[0] - x) * draw} y2={y + (p[1] - y) * draw} stroke="#111" strokeWidth={13} strokeLinecap="round" />
          <line x1={x} y1={y} x2={x + (p[0] - x) * draw} y2={y + (p[1] - y) * draw} stroke={color} strokeWidth={6} strokeLinecap="round" />
          {draw >= 1 ? <circle cx={p[0]} cy={p[1]} r={16} fill={color} stroke="#111" strokeWidth={5} /> : null}
        </svg>
      ) : null}
      <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${pop})`, fontFamily: FONT, fontWeight: 900, fontSize: size * 0.82, letterSpacing: 0.5, color: "#fff", background: "rgba(0,0,0,0.62)", borderLeft: `10px solid ${color}`, borderRadius: 14, padding: "10px 26px 10px 22px", whiteSpace: "nowrap", boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** a corner stamp naming what we're looking at */
const Stamp: React.FC<{ t: number; from: number; to: number; text: string; color: string }> = ({ t, from, to, text, color }) => {
  if (t < from || t > to) return null;
  const pop = Math.max(0, ease("back", (t - from) / 0.25));
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 150 }}>
      <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 40, color, scale: String(pop), letterSpacing: 4, ...stroke(9) }}>{text}</div>
    </AbsoluteFill>
  );
};

const Title: React.FC<{ t: number }> = ({ t }) => {
  if (t > C.body - 0.1) return null;
  const pop = Math.max(0, ease("back", (t - 0.15) / 0.3));
  const fade = Math.min(1, (C.body - 0.1 - t) / 0.3);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 170 }}>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 118, letterSpacing: -2, lineHeight: 0.98, textAlign: "center", color: "#fff", scale: String(pop), opacity: fade, ...stroke(18) }}>
        WHY YOU<br />
        <span style={{ color: "#7fd6ff" }}>SHIVER</span>
      </div>
    </AbsoluteFill>
  );
};

/** the moral card over the last seconds, with the CC-BY credits in small print */
const Moral: React.FC<{ t: number }> = ({ t }) => {
  const t0 = C.coat_land + 1.3; // the gag lands first
  if (t < t0) return null;
  const pop = Math.max(0, ease("back", (t - t0) / 0.35));
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <AbsoluteFill style={{ background: `rgba(8,16,32,${0.55 * Math.min(1, (t - t0) / 0.3)})` }} />
      <div style={{ scale: String(pop), textAlign: "center", fontFamily: FONT, fontWeight: 900, letterSpacing: -1, lineHeight: 1.12, padding: "0 60px" }}>
        <div style={{ fontSize: 78, color: "#fff", ...stroke(16) }}>SHIVERING = MUSCLES</div>
        <div style={{ fontSize: 78, color: "#fff", ...stroke(16) }}>FIGHTING FOR <span style={{ color: "#ff8a3c" }}>HEAT</span>.</div>
        <div style={{ fontSize: 96, color: "#ffd23f", marginTop: 34, ...stroke(18) }}>A COAT WINS.</div>
      </div>
      <div style={{ position: "absolute", bottom: 70, left: 0, right: 0, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 21, color: "rgba(255,255,255,0.85)", lineHeight: 1.35 }}>
        3D models (CC BY 4.0): "Nathan Animated 003" by Renderpeople · "Arm-01- Ecorche" by westerly · "Human teeth" by Alexander Antipov ·
        <br />
        "Free Human skull" by Filip · "Puffer Jacket" by sivayuce (Sketchfab). Textures &amp; light: Poly Haven (CC0).
      </div>
    </AbsoluteFill>
  );
};

const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

export const Shiver: React.FC = () => {
  const t = useT();
  const f = useCurrentFrame() + 1; // Blender frames start at 1
  const { fps } = useVideoConfig();
  const F = (s: number) => Math.round(s * fps);
  const BIC = C.front + 0.35;
  const TRI = C.back + 0.3;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <OffthreadVideo src={staticFile("renders/s02.mp4")} muted />
      <Title t={t} />
      <Stamp t={t} from={C.body + 0.1} to={C.core - 0.05} text="THERMAL CAMERA" color="#ffb13c" />
      <Pointer t={t} f={f} from={C.insides - 0.1} to={C.hands - 0.1} anchor="chest" x={800} y={1000} text="WARM" color="#ff9a3c" />
      <Pointer t={t} f={f} from={C.hands + 0.4} to={C.core - 0.05} anchor="nose" x={300} y={420} text="COLD" color="#7f6bff" />
      <Pointer t={t} f={f} from={C.hands + 0.7} to={C.core - 0.05} anchor="hand" x={830} y={1040} text="COLD" color="#7f6bff" />
      <Stamp t={t} from={C.muscles} to={C.teeth - 0.05} text="X-RAY VIEW" color="#9fe3ff" />
      <Pointer t={t} f={f} from={BIC + 0.2} to={C.back - 0.05} anchor="biceps" x={540} y={330} text="FRONT MUSCLE: PULL!" color="#ff6a3c" />
      <Pointer t={t} f={f} from={TRI + 0.2} to={C.nobody - 0.05} anchor="triceps" x={540} y={330} text="BACK MUSCLE: PULL!" color="#ff6a3c" />
      <Pointer t={t} f={f} from={C.nobody + 0.1} to={C.effort - 0.05} anchor="" x={540} y={330} text="NOBODY WINS" color="#ffd23f" size={64} />
      <Pointer t={t} f={f} from={C.heat - 0.3} to={C.teeth - 0.05} anchor="" x={540} y={330} text="= HEAT" color="#ff8a3c" size={70} />
      <Pointer t={t} f={f} from={C.jaw + 0.1} to={C.goose - 0.05} anchor="jaw" x={330} y={560} text="JAW MUSCLE" color="#ff6a3c" />
      <Stamp t={t} from={C.goose + 0.05} to={C.so - 0.05} text="ZOOM: FOREARM SKIN" color="#9fe3ff" />
      <Captions t={t} />
      <Moral t={t} />

      <Audio name="Narration (Liam)" src={staticFile("voices/s02/liam_take1.mp3")} from={F(VO)} volume={1.0} />
      <Audio name="Score" src={sfx("s02-score")} volume={0.8} />
      <Audio name="Wind (bus stop)" src={sfx("s02-wind")} durationInFrames={F(C.core)} volume={0.55} loop />
      <Audio name="Wind (back at the bus stop)" src={sfx("s02-wind")} from={F(C.so)} volume={0.55} loop />
      <Audio name="Shiver 1" src={sfx("s02-shiver")} from={F(0.3)} volume={0.7} />
      <Audio name="Shiver 2 (harder)" src={sfx("s02-shiver")} from={F(C.so + 0.1)} volume={0.9} />
      <Audio name="Thermal camera on" src={sfx("s02-thermal-on")} from={F(C.body - 0.02)} volume={0.9} />
      <Audio name="Skin to glass" src={sfx("s02-xray")} from={F(C.core + 0.5)} volume={0.85} />
      <Audio name="Biceps pulls" src={sfx("s02-pull")} from={F(BIC)} volume={0.9} />
      <Audio name="Triceps pulls" src={sfx("s02-pull")} from={F(TRI)} volume={0.9} playbackRate={0.88} />
      <Audio name="Tug-of-war tremble" src={sfx("s02-tremble")} from={F(C.nobody)} volume={0.8} />
      <Audio name="Heat" src={sfx("s02-heat")} from={F(C.effort + 0.2)} volume={0.85} />
      <Audio name="Teeth chatter" src={sfx("s02-chatter")} from={F(C.teeth + 0.35)} volume={0.85} />
      <Audio name="Jaw chatter" src={sfx("s02-jaw-chatter")} from={F(C.jaw - 0.25)} volume={0.85} />
      <Audio name="Goosebumps rise" src={sfx("s02-goose")} from={F(C.stand - 0.1)} volume={0.9} />
      <Audio name="Newt tosses the coat (kid blip)" src={sfx("kid-blip")} from={F(C.coat_land - 0.85)} volume={0.6} />
      <Audio name="Coat flight" src={sfx("s02-toss")} from={F(C.coat_land - 0.8)} volume={0.85} />
      <Audio name="Coat lands" src={sfx("s02-land")} from={F(C.coat_land - 0.02)} volume={0.95} />
      <Audio name="Dash, muffled (hero blip)" src={sfx("hero-blip")} from={F(C.coat_land + 0.45)} volume={0.5} playbackRate={0.85} />
    </AbsoluteFill>
  );
};
