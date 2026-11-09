import React from "react";
import { loadFont as loadHand } from "@remotion/google-fonts/PatrickHand";
import { ease } from "../lib/kf";

// Newt's "physics look" (docs/CAST.md): a chalk sketch drawn over the scene. Strokes draw
// themselves on (pathLength reveal) and wobble slightly like hand-drawn chalk.
loadHand();

export const CHALK = "#f4f1e6";
export const CHALK_FONT = "'Patrick Hand', 'Comic Sans MS', cursive";

const prog = (t: number, at: number, dur: number) => ease("out", (t - at) / dur);

/** A chalk stroke that draws itself from `at` over `dur` seconds. */
export const ChalkPath: React.FC<{ d: string; t: number; at: number; dur?: number; width?: number; dash?: boolean; color?: string; outline?: boolean }> = ({
  d,
  t,
  at,
  dur = 0.35,
  width = 7,
  dash,
  color = CHALK,
  outline,
}) => {
  const p = prog(t, at, dur);
  if (p <= 0) return null;
  const stroke = (c: string, w: number) => (
    <path
      d={d}
      pathLength={1}
      fill="none"
      stroke={c}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash ? "0.012 0.03" : "1 1"}
      strokeDashoffset={dash ? 0 : 1 - p}
      opacity={dash ? p : 0.95}
    />
  );
  // `outline`: a dark edge so chalk stays readable over the bright sky
  return outline ? (
    <g>
      {stroke("#1b1b1b", width + 8)}
      {stroke(color, width)}
    </g>
  ) : (
    stroke(color, width)
  );
};

/** Chalk handwriting that appears at `at`. With `write` (seconds per character) it is written on
 *  left to right like a hand with chalk, so viewers can follow it; otherwise it fades in quickly. */
export const ChalkText: React.FC<{ x: number; y: number; t: number; at: number; size?: number; rot?: number; anchor?: "start" | "middle" | "end"; color?: string; outline?: boolean; write?: number; children: React.ReactNode }> = ({
  x,
  y,
  t,
  at,
  size = 64,
  rot = -3,
  anchor = "middle",
  color = CHALK,
  outline,
  write,
  children,
}) => {
  const id = React.useId().replace(/:/g, "");
  const text = typeof children === "string" ? children : React.Children.toArray(children).join("");
  const dur = write ? Math.max(0.3, text.length * write) : 0.2;
  const p = write ? ease("lin", (t - at) / dur) : prog(t, at, 0.2);
  if (p <= 0) return null;
  const w = text.length * size * 0.56 + size;
  const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x - size * 0.3;
  return (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      {write ? (
        <clipPath id={id}>
          <rect x={left} y={y - size * 1.3} width={w * p} height={size * 1.8} />
        </clipPath>
      ) : null}
      <text
        x={x}
        y={y}
        fontFamily={CHALK_FONT}
        fontSize={size}
        fill={color}
        textAnchor={anchor}
        opacity={write ? 1 : p}
        clipPath={write ? `url(#${id})` : undefined}
        {...(outline ? { stroke: "#1b1b1b", strokeWidth: size * 0.16, strokeLinejoin: "round" as const, paintOrder: "stroke" } : {})}
      >
        {children}
      </text>
    </g>
  );
};

/** Chalkboard tint over the whole frame while Newt thinks; fades in and out. */
export const ChalkTint: React.FC<{ t: number; from: number; to: number; w: number; h: number; opacity?: number }> = ({ t, from, to, w, h, opacity = 0.55 }) => {
  if (t < from || t > to) return null;
  const a = Math.min(1, (t - from) / 0.2, (to - t) / 0.2) * opacity;
  return <rect x={0} y={0} width={w} height={h} fill="#2f4a3c" opacity={a} />;
};
