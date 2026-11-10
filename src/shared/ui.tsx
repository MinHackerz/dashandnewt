import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease } from "../lib/kf";
import { INK } from "../rig/Stickman";

// House font for signs, captions and end cards (loaded per episode via @remotion/google-fonts).
export const FONT_STACK = "'Permanent Marker', 'Comic Sans MS', cursive";

// Dizzy stars circling a head
export const Stars: React.FC<{ t: number; x: number; y: number }> = ({ t, x, y }) => (
  <g>
    {[0, 1, 2, 3].map((i) => {
      const a = t * 6 + (i * Math.PI) / 2;
      const sx = x + Math.cos(a) * 70;
      const sy = y + Math.sin(a) * 18;
      return (
        <path
          key={i}
          d="M 0 -16 L 5 -5 L 16 -4 L 7 4 L 10 16 L 0 9 L -10 16 L -7 4 L -16 -4 L -5 -5 Z"
          transform={`translate(${sx} ${sy}) scale(${0.9 + Math.sin(a) * 0.25})`}
          fill="#ffd23f"
          stroke={INK}
          strokeWidth={3}
        />
      );
    })}
  </g>
);

// Retention hook: a one-line title in the first seconds, before the story's own reveal.
// `top` defaults to the sky area; use ~1500 when the top of the shot carries story props.
export const HookTitle: React.FC<{ text: string; from?: number; to?: number; top?: number }> = ({ text, from = 0.2, to = 2.6, top = 150 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < from || t > to) return null;
  const pop = Math.max(0, ease("back", (t - from) / 0.25));
  const fade = Math.min(1, (to - t) / 0.25);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: top }}>
      <div
        style={{
          fontFamily: FONT_STACK,
          fontSize: 84,
          color: INK,
          WebkitTextStroke: "16px #fff",
          paintOrder: "stroke fill",
          textAlign: "center",
          padding: "0 80px",
          lineHeight: 1.1,
          scale: String(pop),
          opacity: fade,
          rotate: `${-3 + Math.sin(t * 7) * 1.5}deg`,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

// Plain-language caption over the action (lower third by default): one short line that says what the
// viewer is looking at, so the joke and the physics land even for someone who's never heard of either.
export const Caption: React.FC<{ text: string; from: number; to: number; top?: number; color?: string; size?: number }> = ({ text, from, to, top = 1470, color = "#ffffff", size = 70 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < from || t > to) return null;
  const pop = Math.max(0, ease("back", (t - from) / 0.22));
  const fade = Math.min(1, (to - t) / 0.2);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: top, pointerEvents: "none" }}>
      <div
        style={{
          fontFamily: FONT_STACK,
          fontSize: size,
          color,
          WebkitTextStroke: "14px #1b1b1b",
          paintOrder: "stroke fill",
          textAlign: "center",
          padding: "0 70px",
          lineHeight: 1.12,
          scale: String(pop),
          opacity: fade,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
