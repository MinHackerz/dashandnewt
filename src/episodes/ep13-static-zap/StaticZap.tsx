import React from "react";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/PermanentMarker";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ease } from "../../lib/kf";
import { FONT_STACK } from "../../shared/ui";
import { BEAT, DURATION, LINES, PHYS } from "./timeline";

loadFont();

// Ep 13 — Why Door Handles ZAP You. The picture is the Blender render (tools/blender/ep13_shots.py →
// public/renders/ep13.mp4); this layer adds the narration, word-by-word captions with the key words
// highlighted, a few physics labels, the sound and the moral card. Everything is timed from timeline.ts.

const useT = () => useCurrentFrame() / useVideoConfig().fps;

// Key words light up yellow in the captions
const HOT = /^(zapped|electrons|rubber|volts|thousand|ten|metal|fingertip|lightning|current|sting|key|mouth|spark)/i;

/** Captions: each line in 2–5 word chunks, timed by length across the line's real duration */
const Captions: React.FC<{ t: number }> = ({ t }) => {
  for (const line of Object.values(LINES)) {
    if (t < line.at || t > line.at + line.seconds + 0.15) continue;
    const words = line.text.split(" ");
    const chunks: string[][] = [];
    let cur: string[] = [];
    for (const w of words) {
      cur.push(w);
      if (cur.length >= 4 || /[,.?!:]$/.test(w)) {
        chunks.push(cur);
        cur = [];
      }
    }
    if (cur.length) chunks.push(cur);
    const total = chunks.reduce((s, c) => s + c.join(" ").length + 2, 0);
    let acc = 0;
    let idx = chunks.length - 1;
    const u = (t - line.at) / line.seconds;
    for (let i = 0; i < chunks.length; i++) {
      acc += chunks[i].join(" ").length + 2;
      if (u <= acc / total) {
        idx = i;
        break;
      }
    }
    const start = line.at + (line.seconds * chunks.slice(0, idx).reduce((s, c) => s + c.join(" ").length + 2, 0)) / total;
    const pop = Math.max(0, ease("back", (t - start) / 0.16));
    return (
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 360 }}>
        <div style={{ fontFamily: FONT_STACK, fontSize: 84, textAlign: "center", padding: "0 70px", lineHeight: 1.1, scale: String(0.85 + 0.15 * pop), WebkitTextStroke: "16px #111", paintOrder: "stroke fill" }}>
          {chunks[idx].map((w, k) => (
            <span key={k} style={{ color: HOT.test(w.replace(/[^a-z]/gi, "")) ? "#ffd23f" : "#ffffff" }}>
              {w.toUpperCase()}{" "}
            </span>
          ))}
        </div>
      </AbsoluteFill>
    );
  }
  return null;
};

/** A physics label: a rounded tag that pops in at (x, y) */
const Label: React.FC<{ t: number; from: number; to: number; x: number; y: number; text: string; color?: string; size?: number }> = ({ t, from, to, x, y, text, color = "#4fc3ff", size = 64 }) => {
  if (t < from || t > to) return null;
  const pop = Math.max(0, ease("back", (t - from) / 0.25));
  const fade = Math.min(1, (to - t) / 0.25);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${pop})`, opacity: fade, fontFamily: FONT_STACK, fontSize: size, color: "#fff", background: "rgba(10,20,40,0.72)", border: `5px solid ${color}`, borderRadius: 26, padding: "8px 30px", whiteSpace: "nowrap", boxShadow: `0 0 34px ${color}` }}>
      {text}
    </div>
  );
};

const EndCard: React.FC<{ t: number }> = ({ t }) => {
  if (t < BEAT.card) return null;
  const dark = Math.min(1, (t - BEAT.card) / 0.3);
  const l1 = ease("back", (t - (BEAT.card + 0.3)) / 0.25);
  const l2 = ease("back", (t - (BEAT.card + 0.9)) / 0.25);
  const line: React.CSSProperties = { fontFamily: FONT_STACK, fontSize: 92, color: "#fff", textAlign: "center", lineHeight: 1.15, padding: "0 70px" };
  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(12,14,22,${dark * 0.92})`, justifyContent: "center", alignItems: "center", gap: 34 }}>
      <div style={{ ...line, scale: String(Math.max(0, l1)), opacity: t > BEAT.card + 0.3 ? 1 : 0 }}>Rubbing charges you up.</div>
      <div style={{ ...line, color: "#ffd23f", scale: String(Math.max(0, l2)), opacity: t > BEAT.card + 0.9 ? 1 : 0 }}>Touch metal with a key, not your finger.</div>
    </AbsoluteFill>
  );
};

const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

export const StaticZap: React.FC = () => {
  const t = useT();
  const { fps } = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <OffthreadVideo src={staticFile("renders/ep13.mp4")} muted />
      <Label t={t} from={BEAT.hop - 0.4} to={BEAT.climb - 0.1} x={540} y={560} text="ELECTRONS" />
      <Label t={t} from={BEAT.door + 0.2} to={BEAT.reach} x={540} y={300} text={`≈ ${PHYS.volts.toLocaleString("en-US")} VOLTS`} color="#ffd23f" size={72} />
      <Label t={t} from={BEAT.spark - 1.3} to={BEAT.slowEnd} x={540} y={560} text={`${PHYS.gapMM} mm gap`} />
      <Label t={t} from={BEAT.keySpark - 0.1} to={BEAT.keySpark + 1.4} x={540} y={560} text="SPARK HITS THE KEY" color="#7dffa1" size={58} />
      <Captions t={t} />
      <EndCard t={t} />

      {/* narration: one node per line */}
      {Object.entries(LINES).map(([id, l]) => (
        <Audio key={id} name={`Voice: ${id}`} src={staticFile(l.file)} from={f(l.at)} volume={1.0} />
      ))}
      {/* no music bed: the user wants only the voice and the sound effects */}

      {/* no carpet footstep scuffs: the user found the repeated "thas thas" distracting */}
      <Audio name="Electrons hop on (tiny crackle)" src={sfx("static-crackle")} from={f(BEAT.hop - 0.3)} volume={0.35} />
      <Audio name="Charge spreads (crackle)" src={sfx("static-crackle")} from={f(BEAT.climb + 0.4)} volume={0.4} playbackRate={0.9} />
      <Audio name="Hair stands up (crackle)" src={sfx("static-crackle")} from={f(BEAT.hair)} volume={0.45} playbackRate={1.1} />
      <Audio name="Charge crowds the fingertip" src={sfx("static-crackle")} from={f(BEAT.spark - 1.5)} volume={0.5} playbackRate={1.3} />
      <Audio name="THE SPARK (slow motion)" src={sfx("spark-zap")} from={f(BEAT.spark)} volume={1.0} playbackRate={0.75} />
      <Audio name="Hero: ow" src={sfx("hero-blip")} from={f(BEAT.recoil + 0.05)} volume={0.3} playbackRate={0.8} />
      <Audio name="Hero: womp" src={sfx("womp")} from={f(BEAT.recoil + 0.9)} volume={0.3} />
      <Audio name="Kid: facepalm" src={sfx("slap")} from={f(BEAT.facepalm + 0.2)} volume={0.3} playbackRate={1.2} />
      <Audio name="Key spark" src={sfx("spark-small")} from={f(BEAT.keySpark)} volume={0.8} />
      <Audio name="Kid: win" src={sfx("kid-win")} from={f(BEAT.keySpark + 0.35)} volume={0.25} />
      <Audio name="Teeth ZAP" src={sfx("spark-zap")} from={f(BEAT.gagZap)} volume={0.95} playbackRate={1.2} />
      {/* short yelp: fades out before "Not in your mouth, Dash." so the line stays clear */}
      <Audio
        name="Hero: scream"
        src={sfx("hero-scream")}
        from={f(BEAT.gagZap + 0.1)}
        volume={(fr) => 0.45 * Math.max(0, Math.min(1, (LINES.mouth.at - BEAT.gagZap - 0.1 - fr / fps) / 0.15))}
        playbackRate={1.15}
      />
      <Audio name="Kid: facepalm again" src={sfx("slap")} from={f(BEAT.gagZap + 0.75)} volume={0.3} playbackRate={1.2} />
      <Audio name="Moral 1" src={sfx("chime")} from={f(BEAT.card + 0.3)} volume={0.25} />
      <Audio name="Moral 2" src={sfx("chime")} from={f(BEAT.card + 0.9)} volume={0.25} playbackRate={1.25} />
    </AbsoluteFill>
  );
};

export { DURATION };
