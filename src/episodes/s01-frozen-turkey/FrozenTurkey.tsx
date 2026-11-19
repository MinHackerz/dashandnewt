import React from "react";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/PermanentMarker";
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ease } from "../../lib/kf";
import { FONT_STACK } from "../../shared/ui";
import times from "../../../tools/blender/s01_times.json";
import words from "../../../public/voices/s01/words.json";

loadFont();

// Short s01 — Why You Should NEVER Fry a Frozen Turkey. Picture: Blender (tools/blender/s01_*.py →
// public/renders/s01.mp4). This layer: Liam's narration (ElevenLabs), captions word-by-word from the real word
// timings (ElevenLabs Scribe), the action sounds and one slow, somber underscore. On-screen text is kept to the
// hook title, the captions and the slow-motion tag: labels that only repeated the narration were removed.

const C = times.CUE;
const VO = times.VO_OFFSET;
export const S01_DURATION = times.DUR;
const useT = () => useCurrentFrame() / useVideoConfig().fps;

type W = { text: string; start: number; end: number };
const SPOKEN: W[] = (words.words as W[]).filter((w) => !w.text.startsWith("["));
const HOT = /^(frozen|turkey|hot|oil|350|ice|sinks|heavier|bottom|boils|steam|1,700|over|flame|worst|fires|thaw|dry|off)/i;

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
    if (cur.length >= 3 || /[,.?!]$/.test(w.text)) flush();
  }
  flush();
  for (let i = 0; i < out.length - 1; i++) out[i].until = Math.min(out[i].until, out[i + 1].at);
  return out;
})();

const Captions: React.FC<{ t: number }> = ({ t }) => {
  const c = CHUNKS.find((k) => t >= k.at && t < k.until);
  if (!c) return null;
  const pop = Math.max(0, ease("back", (t - c.at) / 0.14));
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 380 }}>
      <div style={{ fontFamily: FONT_STACK, fontSize: 92, textAlign: "center", padding: "0 70px", lineHeight: 1.1, scale: String(0.82 + 0.18 * pop), WebkitTextStroke: "18px #111", paintOrder: "stroke fill" }}>
        {c.words.map((w, k) => (
          <span key={k} style={{ color: HOT.test(w.replace(/[^a-z0-9,]/gi, "")) ? "#ffd23f" : "#ffffff" }}>
            {w.replace(/\.\.\.$/, "").toUpperCase()}{" "}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Label: React.FC<{ t: number; from: number; to: number; x: number; y: number; text: string; color?: string; size?: number }> = ({ t, from, to, x, y, text, color = "#4fc3ff", size = 64 }) => {
  if (t < from || t > to) return null;
  const pop = Math.max(0, ease("back", (t - from) / 0.25));
  const fade = Math.min(1, (to - t) / 0.25);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${pop})`, opacity: fade, fontFamily: FONT_STACK, fontSize: size, color: "#fff", background: "rgba(10,20,40,0.72)", border: `5px solid ${color}`, borderRadius: 26, padding: "8px 30px", whiteSpace: "nowrap", boxShadow: `0 0 34px ${color}`, textAlign: "center" }}>
      {text}
    </div>
  );
};

/** the hook title for the first seconds */
const Title: React.FC<{ t: number }> = ({ t }) => {
  if (t > C.oil - 0.1) return null;
  const pop = Math.max(0, ease("back", (t - 0.15) / 0.3));
  const fade = Math.min(1, (C.oil - 0.1 - t) / 0.3);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 170 }}>
      <div style={{ fontFamily: FONT_STACK, fontSize: 104, lineHeight: 1.0, textAlign: "center", color: "#fff", WebkitTextStroke: "20px #111", paintOrder: "stroke fill", scale: String(pop), opacity: fade }}>
        NEVER FRY A<br />
        <span style={{ color: "#ff5a3c" }}>FROZEN TURKEY</span>
      </div>
    </AbsoluteFill>
  );
};

const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

export const FrozenTurkey: React.FC = () => {
  const t = useT();
  const { fps } = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  const slowmo = t >= C.touch - 0.4 && t < C.shoves - 0.2;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <OffthreadVideo src={staticFile("renders/s01.mp4")} muted />
      <Title t={t} />
      {slowmo ? <Label t={t} from={C.touch - 0.4} to={C.shoves - 0.2} x={540} y={180} text="SLOW MOTION ×4" color="#ffffff" size={46} /> : null}
      <Captions t={t} />

      <Audio name="Narration (Liam)" src={staticFile("voices/s01/liam_full.mp3")} from={f(VO)} volume={1.0} />
      <Audio name="Score" src={sfx("s01-score")} volume={0.85} />
      <Audio name="Ice shimmer" src={sfx("s01-ice")} from={f(C.ice + 0.9)} volume={0.7} />
      <Audio name="Ice meets oil" src={sfx("s01-sizzle-burst")} from={f(C.touch - 0.1)} durationInFrames={f(1.6)} volume={0.35} playbackRate={0.7} />
      {[0, 1, 2, 3].map((k) => (
        <Audio key={k} name={`Drop bloop ${k + 1}`} src={sfx("s01-drop")} from={f(C.sinks + 0.3 + k * 0.6)} volume={0.6} playbackRate={0.9 + k * 0.06} />
      ))}
      <Audio name="Flash to steam" src={sfx("s01-flash")} from={f(C.boils - 0.05)} volume={0.9} />
      <Audio name="Boil-over" src={sfx("s01-boilover")} from={f(C.shoves - 0.2)} volume={0.45} />
      <Audio name="Fireball" src={sfx("s01-fireball")} from={f(C.flame - 0.9)} volume={0.55} />
      <Audio name="Time-lapse ticks" src={sfx("s01-tick")} from={f(C.thaw - 0.2)} volume={0.7} />
      <Audio name="Pat dry" src={sfx("s01-pat")} from={f(C.dry)} volume={0.8} />
      <Audio name="Gas valve off" src={sfx("s01-valve")} from={f(C.off - 0.05)} volume={0.9} />
      <Audio name="Calm fry (thawed bird)" src={sfx("s01-sizzle-bed")} from={f(C.goes_in + 0.9)} durationInFrames={f(1.2)} volume={0.12} />
    </AbsoluteFill>
  );
};

/** Thumbnail still: two clean frames from the short (before → after) with the hook title.
 *  Sources: public/renders/s01-thumb-a.png (frame 134) and s01-thumb-b.png (frame 852), copied from out/blender/s01. */
export const FrozenTurkeyThumb: React.FC = () => {
  const stroke = { WebkitTextStroke: "22px #111", paintOrder: "stroke fill" } as const;
  return (
    <AbsoluteFill style={{ backgroundColor: "#111" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1010, overflow: "hidden" }}>
        <Img src={staticFile("renders/s01-thumb-a.png")} style={{ position: "absolute", left: -216, top: -700, width: 1512, height: 2688, filter: "contrast(1.08) saturate(1.15)" }} />
      </div>
      <div style={{ position: "absolute", left: 0, top: 1010, width: 1080, height: 910, overflow: "hidden" }}>
        <Img src={staticFile("renders/s01-thumb-b.png")} style={{ position: "absolute", left: 0, top: -400, width: 1080, height: 1920, filter: "contrast(1.3) saturate(1.7) brightness(0.86)" }} />
      </div>
      <div style={{ position: "absolute", left: 0, top: 998, width: 1080, height: 24, background: "#111" }} />
      <div style={{ position: "absolute", left: 0, top: 70, width: 1080, textAlign: "center", fontFamily: FONT_STACK, fontSize: 112, lineHeight: 1.0, color: "#fff", ...stroke }}>
        NEVER FRY A<br />
        <span style={{ color: "#9ee7ff" }}>FROZEN</span> <span style={{ color: "#ffd23f" }}>TURKEY</span>
      </div>
      <div style={{ position: "absolute", left: 0, top: 1700, width: 1080, textAlign: "center", fontFamily: FONT_STACK, fontSize: 118, color: "#ff5a3c", ...stroke }}>
        HERE'S WHY
      </div>
    </AbsoluteFill>
  );
};
