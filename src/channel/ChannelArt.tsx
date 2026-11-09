import React from "react";
import { loadFont } from "@remotion/google-fonts/PermanentMarker";
import { loadFont as loadHand } from "@remotion/google-fonts/PatrickHand";
import { AbsoluteFill } from "remotion";
import { POSES, type PoseName } from "../rig/library";
import { GROUND, INK, Stickman } from "../rig/Stickman";
import type { CharState, Expr, Extras, Hand } from "../rig/types";
import { FONT_STACK } from "../shared/ui";

loadFont();
loadHand();

// Handwritten chalk font with real lowercase, so physics notation stays correct (m, s, v)
const CHALK_FONT = "'Patrick Hand', cursive";

// Brand: Dash (orange scarf, plays dumb) & Newt (party hat, physics genius)
export const BRAND = {
  name: "DASH & NEWT",
  tagline: "brute force vs. physics",
  dash: "#ff8a1f",
  newt: "#ff4d6d",
  board: "#2f4a3c",
  chalk: "#f4f1e6",
};

type CharOpts = {
  pose: PoseName;
  expr: Expr;
  extras: Extras;
  scale?: number;
  facing?: 1 | -1;
  faceX?: number;
  lookY?: number;
  aHand?: Hand;
  bHand?: Hand;
  lift?: number;
};

const char = (o: CharOpts): CharState => ({
  x: 0,
  lift: o.lift ?? 0,
  facing: o.facing ?? 1,
  scale: o.scale ?? 1,
  sx: 1,
  sy: 1,
  pose: POSES[o.pose],
  faceX: o.faceX ?? 0,
  lookY: o.lookY ?? 0,
  expr: o.expr,
  blink: 0,
  aHand: o.aHand ?? "none",
  bHand: o.bHand ?? "none",
  extras: o.extras,
  t: 0.4,
  speed: 0,
});

const DASH_FACE: Expr = { eyes: "wide", mouth: "grin", brow: 0.9, browAng: -0.2, pupil: 0.75 };
const NEWT_FACE: Expr = { eyes: "dot", mouth: "smile", brow: 0.5, browAng: 0.1, browAsym: 0.7 };

// Places a character so its feet stand at (x, y) on the canvas, scaled by s
const Place: React.FC<{ x: number; y: number; s: number; c: CharState }> = ({ x, y, s, c }) => (
  <g transform={`translate(${x} ${y}) scale(${s}) translate(0 ${-GROUND})`}>
    <Stickman c={c} />
  </g>
);

// A neat stack of physics books for Newt to stand on
const Books: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={6} strokeLinejoin="round">
    <rect x={-80} y={-26} width={160} height={26} rx={4} fill="#5aa9e6" />
    <rect x={-70} y={-52} width={150} height={26} rx={4} fill="#ffd23f" />
    <rect x={-76} y={-78} width={146} height={26} rx={4} fill="#e63946" />
    <text x={0} y={-58} textAnchor="middle" fontFamily={FONT_STACK} fontSize={18} fill={INK} stroke="none">
      PHYSICS
    </text>
  </g>
);

const Chalk: React.FC<{ children: React.ReactNode; opacity?: number }> = ({ children, opacity = 0.5 }) => (
  <g stroke={BRAND.chalk} fill="none" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={opacity}>
    {children}
  </g>
);

const ChalkText: React.FC<{ x: number; y: number; size: number; children: string; rot?: number; opacity?: number }> = ({ x, y, size, children, rot = 0, opacity = 0.5 }) => (
  <text x={x} y={y} fontFamily={CHALK_FONT} fontSize={size} fill={BRAND.chalk} opacity={opacity} transform={`rotate(${rot} ${x} ${y})`}>
    {children}
  </text>
);

// ─── Profile picture: 800×800 (shown as a circle) ─────────────────────────
export const ChannelAvatar: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: BRAND.board }}>
    <svg viewBox="0 0 800 800" width={800} height={800}>
      <defs>
        <radialGradient id="glow" cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor="#3e6350" />
          <stop offset="1" stopColor={BRAND.board} />
        </radialGradient>
      </defs>
      <rect width={800} height={800} fill="url(#glow)" />
      <Chalk>
        <path d="M 470 250 Q 600 90 730 250" strokeDasharray="4 16" />
        <path d="M 722 232 l 10 20 l -22 2" />
      </Chalk>
      <ChalkText x={560} y={175} size={46} rot={-6}>
        F = ma
      </ChalkText>
      <Place
        x={300}
        y={1010}
        s={1.75}
        c={char({ pose: "thumbsUp", expr: DASH_FACE, extras: { scarf: true }, faceX: 0.3, aHand: "thumb" })}
      />
      <Books x={560} y={1010 - 10} s={1.3} />
      <Place
        x={560}
        y={1010 - 10 - 78 * 1.3}
        s={1.75}
        c={char({ pose: "reachUp", expr: NEWT_FACE, extras: { partyHat: true, blush: true }, scale: 0.72, facing: -1, faceX: -0.2, aHand: "point" })}
      />
    </svg>
  </AbsoluteFill>
);

// ─── Banner: 2560×1440; everything important inside the 1546×423 safe area ──
export const ChannelBanner: React.FC = () => {
  const safe = { x: 507, y: 508, w: 1546, h: 423 };
  const ground = safe.y + safe.h - 6;
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.board }}>
      <svg viewBox="0 0 2560 1440" width={2560} height={1440}>
        {/* chalkboard doodles fill the wide (TV/desktop) area */}
        <ChalkText x={120} y={300} size={90} rot={-8}>F = ma</ChalkText>
        <ChalkText x={2140} y={330} size={80} rot={6}>½mv²</ChalkText>
        <ChalkText x={200} y={1180} size={70} rot={4}>v² = u² + 2as</ChalkText>
        <ChalkText x={2020} y={1150} size={76} rot={-5}>μN</ChalkText>
        <ChalkText x={1180} y={260} size={70} rot={-3} opacity={0.35}>g = 9.8 m/s²</ChalkText>
        <Chalk opacity={0.4}>
          {/* projectile arc */}
          <path d="M 140 820 Q 330 420 520 820" strokeDasharray="4 18" />
          <circle cx={330} cy={622} r={16} />
          {/* pendulum */}
          <path d="M 2300 520 L 2380 820" />
          <circle cx={2380} cy={840} r={26} />
          <path d="M 2240 520 L 2360 520" />
          {/* lever */}
          <path d="M 1900 1300 L 2300 1240" />
          <path d="M 2080 1300 l 30 -60 l 30 60 Z" />
          {/* force arrows */}
          <path d="M 760 1260 L 1000 1260 M 980 1240 l 20 20 l -20 20" />
          <path d="M 1560 230 L 1560 380 M 1540 360 l 20 20 l 20 -20" />
        </Chalk>
        <line x1={0} y1={ground + 3} x2={2560} y2={ground + 3} stroke={BRAND.chalk} strokeWidth={8} opacity={0.6} />

        {/* the duo, inside the safe area */}
        <Place
          x={safe.x + 120}
          y={ground}
          s={0.94}
          c={char({ pose: "smugPoint", expr: DASH_FACE, extras: { scarf: true }, faceX: 0.2, aHand: "point" })}
        />
        <Books x={safe.x + safe.w - 120} y={ground} s={0.9} />
        <Place
          x={safe.x + safe.w - 120}
          y={ground - 78 * 0.9}
          s={1.0}
          c={char({ pose: "reachUp", expr: NEWT_FACE, extras: { partyHat: true, blush: true }, scale: 0.72, facing: -1, faceX: -0.3, aHand: "point" })}
        />

        {/* name + tagline */}
        <text x={1280} y={safe.y + 215} textAnchor="middle" fontFamily={FONT_STACK} fontSize={150} stroke={INK} strokeWidth={20} paintOrder="stroke" fill={BRAND.dash}>
          DASH{" "}
          <tspan fill={BRAND.chalk} fontFamily={CHALK_FONT} fontSize={170}>
            &amp;
          </tspan>{" "}
          <tspan fill={BRAND.newt}>NEWT</tspan>
        </text>
        <text x={1280} y={safe.y + 330} textAnchor="middle" fontFamily={CHALK_FONT} fontSize={76} fill={BRAND.chalk}>
          {BRAND.tagline}
        </text>
        <text x={1280} y={safe.y + 400} textAnchor="middle" fontFamily={CHALK_FONT} fontSize={46} fill={BRAND.chalk} opacity={0.75}>
          new shorts every week
        </text>
      </svg>
    </AbsoluteFill>
  );
};

// Shown only to check the safe area while designing (not uploaded)
export const ChannelBannerSafeArea: React.FC = () => (
  <AbsoluteFill>
    <ChannelBanner />
    <svg viewBox="0 0 2560 1440" width={2560} height={1440} style={{ position: "absolute", inset: 0 }}>
      <rect x={507} y={508} width={1546} height={423} fill="none" stroke="#ff0" strokeWidth={6} strokeDasharray="20 14" />
    </svg>
  </AbsoluteFill>
);
