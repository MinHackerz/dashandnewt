import React from "react";
import { AbsoluteFill } from "remotion";
import { ease } from "../lib/kf";
import { INK } from "../rig/Stickman";
import { CHALK, CHALK_FONT } from "./chalk";
import { FONT_STACK } from "./ui";

// Teaching overlays for screen space (1080×1920). Text is the reel's only "voice", so every
// line is big, high-contrast and held long enough to read (~3 words per second).

const fade = (t: number, from: number, to: number, edge = 0.25) => Math.max(0, Math.min(1, (t - from) / edge, (to - t) / edge));

/**
 * A chalkboard note: lines appear one after another (`gap` s apart) and stay until `to`.
 * `highlight` lines are drawn in yellow.
 */
export const ChalkNote: React.FC<{
  t: number;
  from: number;
  to: number;
  lines: readonly string[];
  top?: number;
  gap?: number;
  size?: number;
  highlight?: readonly number[];
}> = ({ t, from, to, lines, top = 170, gap = 1.1, size = 62, highlight = [] }) => {
  if (t < from || t > to) return null;
  const a = fade(t, from, to);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: top, pointerEvents: "none" }}>
      <div
        style={{
          background: "#2f4a3c",
          border: `8px solid ${INK}`,
          borderRadius: 34,
          padding: "26px 40px 30px",
          maxWidth: 960,
          opacity: a,
          scale: String(0.9 + 0.1 * ease("back", (t - from) / 0.3)),
          boxShadow: "0 10px 0 rgba(0,0,0,0.18)",
        }}
      >
        {lines.map((l, i) => {
          const at = from + 0.15 + i * gap;
          const p = ease("out", (t - at) / 0.3);
          return (
            <div
              key={i}
              style={{
                fontFamily: CHALK_FONT,
                fontSize: size,
                lineHeight: 1.18,
                color: highlight.includes(i) ? "#ffd23f" : CHALK,
                textAlign: "center",
                opacity: Math.max(0, p),
                translate: `0 ${(1 - Math.max(0, p)) * 14}px`,
              }}
            >
              {l}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Big tilted label for the beat structure ("TRY #1: PUSH"). */
export const Stamp: React.FC<{ t: number; from: number; to: number; text: string; color?: string; top?: number; size?: number }> = ({
  t,
  from,
  to,
  text,
  color = "#e63946",
  top = 200,
  size = 84,
}) => {
  if (t < from || t > to) return null;
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: top, pointerEvents: "none" }}>
      <div
        style={{
          fontFamily: FONT_STACK,
          fontSize: size,
          color: "#fff",
          background: color,
          border: `8px solid ${INK}`,
          borderRadius: 22,
          padding: "6px 34px",
          rotate: "-3deg",
          opacity: fade(t, from, to, 0.2),
          scale: String(Math.max(0, ease("back", (t - from) / 0.3))),
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
