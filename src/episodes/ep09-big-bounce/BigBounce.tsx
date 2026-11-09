import React from "react";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/PermanentMarker";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, num, type Ease } from "../../lib/kf";
import { GROUND, solve, toWorld } from "../../rig/Stickman";
import { Lane } from "../../rig2d/depth";
import { Toon, TOON_INK } from "../../rig2d/Toon";
import { ChalkPath, ChalkText, ChalkTint } from "../../shared/chalk";
import { WRITE } from "../../lib/read";
import { Stamp } from "../../shared/lesson";
import { FONT_STACK, HookTitle } from "../../shared/ui";
import { applesAt, dashAt, diggerAt, dirtAt, ghostAt, helmetAt, newtAt, type Actor } from "./cast";
import { Apple, AppleBag, Bench, Bouquet, Dirt, DirtPile, Far, GraveBack, Grass, Headstones, Helmet, OakBack, OakBranches, Seesaw, ShovelProp, Sign, Sky, Slide, Swings, Wall, Wreath } from "./props";
import {
  AFTER,
  DEATH,
  appleArc,
  APPLE1,
  APPLE2,
  BENCH_X,
  BRANCH,
  CUE,
  D,
  DASH_STAND_X,
  DURATION,
  E1,
  E2,
  E3,
  END_R,
  FLY_T,
  FUNMAX,
  GATE,
  GATE_X,
  GRAVE_D,
  GRAVE_X,
  HELMET,
  LOOK,
  LOOK_LINES,
  LOOKUP,
  NEWT_APEX,
  newtFly,
  OFF1,
  OFF2,
  OFF3,
  OPER,
  phiAt,
  PIV_X,
  plankPoint,
  PULL,
  px,
  realOf,
  RS,
  SAFETY,
  SEAT_UP_X,
  SIT,
  SPLIT,
  storyOf,
  TAG,
  TH,
  toPx,
  TREE,
  TRUNK_X,
  WALL_X,
  yOf,
  A2,
  CHOMP,
  MARCH,
  SALUTE0,
  LETGO,
} from "./timeline";

loadFont();

const W = 1080;
const H = 1920;
const INK = TOON_INK;
const R = realOf;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// ─── Camera on the REAL clock: [time, centre x, centre y (world), zoom, roll°, easing] ──
const newtSeat = toPx(plankPoint(TH, -RS));
const FLOOR = GROUND + px(GRAVE_D);
const NX = newtSeat.x;
const fly = (s: number) => toPx(newtFly(Math.max(0, s - E3.stop)));
const SHOTS: readonly (readonly [number, number, number, number, number, Ease?])[] = [
  // the opening: the cemetery next door (sign, gravedigger), pan left to the playground
  [0, GRAVE_X + 330, GROUND - 330, 0.95, 0],
  [0.6, GRAVE_X + 300, GROUND - 330, 0.95, 0, "lin"],
  [2.9, 1150, GROUND - 640, 0.52, 0, "io"],
  // Newt alone
  [R(3.3), NX + 40, GROUND - 260, 1.55, 0, "io"],
  [R(GATE - 0.1), NX + 40, GROUND - 270, 1.6, 0, "lin"],
  // Dash at the gate: low angle
  [R(GATE), GATE_X + 60, GROUND - 330, 1.45, 3, "snap"],
  [R(MARCH.a), GATE_X + 120, GROUND - 360, 1.35, 2, "lin"],
  // the march: follow, then the whole seesaw
  [R(MARCH.b - 0.6), DASH_STAND_X - 260, GROUND - 450, 1.0, 0, "io"],
  [R(PULL.a), PIV_X + 60, GROUND - 520, 0.82, 0, "io"],
  [R(SIT.b), PIV_X + 40, GROUND - 560, 0.8, 0, "lin"],
  // Newt stuck at the top
  [R(TAG.a + 0.4), NX + 60, GROUND - 560, 1.35, -3, "io"],
  [R(OFF1.stand - 0.2), NX + 80, GROUND - 540, 1.3, -3, "lin"],
  [R(OFF1.rel), PIV_X - 40, GROUND - 450, 0.95, 0, "io"],
  // BONK (close on Newt)
  [R(OFF1.bonk) - 0.05, NX + 20, GROUND - 260, 1.75, 4, "snap"],
  [R(OFF1.bonk) + 0.6, NX + 20, GROUND - 260, 1.8, 4, "lin"],
  // escalation 1: the whole oak branch and the seesaw
  [R(E1.climb.a + 0.4), PIV_X + 280, GROUND - 640, 0.72, 0, "io"],
  [R(E1.step), PIV_X + 200, GROUND - 600, 0.75, 0, "lin"],
  [R(E1.stop), PIV_X + 120, GROUND - 520, 0.8, 0, "io"],
  [R(CHOMP.pick - 0.1), PIV_X + 120, GROUND - 500, 0.82, 0, "lin"],
  // the chomp, close
  [R(CHOMP.pick + 0.25), SEAT_UP_X - 20, GROUND - 330, 1.65, -3, "snap"],
  [R(CHOMP.chew + 0.2), SEAT_UP_X - 40, GROUND - 360, 1.55, -3, "lin"],
  [R(OFF2.rel), PIV_X - 20, GROUND - 450, 0.95, 0, "io"],
  [R(OFF2.bonk) - 0.05, NX + 20, GROUND - 260, 1.75, -4, "snap"],
  [R(OFF2.bonk) + 0.5, NX + 20, GROUND - 260, 1.8, -4, "lin"],
  // escalation 2: taller
  [R(E2.climb.a + 0.4), PIV_X + 300, GROUND - 760, 0.62, 0, "io"],
  [R(E2.step), PIV_X + 250, GROUND - 700, 0.65, 0, "lin"],
  // slow motion: low angle on the impact and the apple's flight
  [R(E2.imp) - 0.1, PIV_X + 160, GROUND - 480, 0.88, -5, "io"],
  [R(A2.hit) - 0.3, PIV_X + 240, GROUND - 470, 0.95, -5, "lin"],
  // the apple bonks Dash's head
  [R(A2.hit) - 0.05, SEAT_UP_X - 20, GROUND - 360, 1.75, 4, "snap"],
  [R(LOOKUP.a), SEAT_UP_X - 20, GROUND - 380, 1.6, 2, "lin"],
  // he looks up… tilt up the oak to the top branch
  [R(LOOKUP.a + 0.3), SEAT_UP_X + 60, GROUND - 600, 1.0, 0, "io"],
  [R(LOOKUP.b - 0.2), SEAT_UP_X + 80, yOf(BRANCH[2]) + 120, 0.95, 0, "io"],
  [R(OFF3.stand), SEAT_UP_X + 80, yOf(BRANCH[2]) + 120, 0.95, 0, "lin"],
  // whip back down: bonk 3
  [R(OFF3.rel), PIV_X - 40, GROUND - 450, 0.95, 0, "snap"],
  [R(OFF3.bonk) - 0.05, NX + 20, GROUND - 260, 1.75, 4, "snap"],
  [R(HELMET.cutFrom), NX + 20, GROUND - 260, 1.8, 4, "lin"],
  // cut: the helmet
  [CUE.helmetCut, NX + 90, GROUND - 330, 1.65, 0],
  [R(HELMET.b + 0.6), NX + 90, GROUND - 330, 1.7, 0, "lin"],
  // cut: up the trunk
  [CUE.trunk, TRUNK_X - 60, yOf(3.0), 1.3, -4],
  [R(TREE.trunkEnd), TRUNK_X - 60, yOf(3.4), 1.3, -4, "lin"],
  // cut: the top branch; he walks out over his seat, measures with his thumb, salutes
  [CUE.top, (TRUNK_X + SEAT_UP_X) / 2, yOf(BRANCH[2]) - 120, 0.95, 0],
  [R(TREE.measure.a), SEAT_UP_X + 60, yOf(BRANCH[2]) - 180, 1.25, 0, "io"],
  [R(TREE.salute.a), SEAT_UP_X + 60, yOf(BRANCH[2]) - 180, 1.25, 0, "lin"],
  // Newt's look: the whole height (Dash at the top, Newt at the bottom)
  [R(LOOK.l1), PIV_X + 140, yOf(4.2), 0.47, 0, "io"],
  [R(LOOK.t1 - 0.5), PIV_X + 140, yOf(4.0), 0.48, 0, "lin"],
  // test 1 and test 2: the apples' arcs over the seesaw
  [R(LOOK.t1 - 0.05), PIV_X + 160, GROUND - 520, 0.95, 0, "io"],
  [R(LOOK.arc3 - 0.6), PIV_X + 170, GROUND - 520, 0.97, 0, "lin"],
  // test 3: me (pull out to see the whole parabola, over the wall)
  [R(LOOK.arc3 + 0.2), PIV_X + 700, yOf(2.2), 0.55, 0, "io"],
  [R(LOOK.pan.a + 0.6), PIV_X + 760, yOf(2.1), 0.56, 0, "lin"],
  // …following the chalk line over the wall, to the open grave
  [R(LOOK.pan.b), GRAVE_X - 40, GROUND - 200, 1.0, 0, "io"],
  [R(LOOK.back - 0.25), GRAVE_X - 40, GROUND - 170, 1.1, 0, "lin"],
  // back to Newt: worried… …oh.
  [R(LOOK.back), NX + 30, GROUND - 260, 1.75, 0, "snap"],
  [R(LOOK.end), NX + 30, GROUND - 260, 1.8, 0, "lin"],
  // (split screen while SPLIT; then) the fall: follow Dash down from the top branch
  [R(SPLIT.b), SEAT_UP_X - 150, yOf(5.6), 0.62, -4, "lin"],
  [R(E3.step + 0.55), SEAT_UP_X - 160, yOf(4.6), 0.6, -4, "io"],
  [R(E3.imp) - 0.25, PIV_X + 180, yOf(2.0), 0.66, -5, "io"],
  [R(E3.imp) + 0.15, PIV_X + 150, GROUND - 480, 0.85, -7, "snap"],
  // the flight: follow Newt along his chalk parabola, over Dash, over the wall
  [R(E3.stop + 0.35), fly(E3.stop + 0.35).x + 120, fly(E3.stop + 0.35).y + 60, 0.62, -3, "io"],
  [R(E3.stop + 0.9), fly(E3.stop + 0.9).x + 160, fly(E3.stop + 0.9).y + 100, 0.62, 0, "lin"],
  // down into the grave (six feet)…
  [R(E3.land - 0.3), GRAVE_X - 60, GROUND + 60, 0.78, 2, "io"],
  [R(E3.land) + 0.05, GRAVE_X - 50, GROUND + 140, 0.85, 0, "io"],
  // …ZOOM: he's at the bottom, dead (X eyes, cracked helmet)
  [R(DEATH.zoom), GRAVE_X - 120, FLOOR - 50, 2.8, -3, "snap"],
  [R(AFTER.proud) - 0.05, GRAVE_X - 125, FLOOR - 50, 3.1, -3, "lin"],
  // Dash: FUN MAXIMUM ✓ … turns to the empty seat
  [R(AFTER.proud), SEAT_UP_X - 60, GROUND - 330, 1.5, 0, "snap"],
  [R(AFTER.turn), PIV_X + 60, GROUND - 520, 0.85, 0, "io"],
  [R(AFTER.walk.a), PIV_X + 160, GROUND - 480, 0.85, 0, "lin"],
  // he walks to the wall and looks over: the grave in cutaway, his friend at the bottom
  [R(AFTER.peek), (WALL_X + GRAVE_X) / 2 + 40, GROUND - 120, 0.84, 0, "io"],
  [R(AFTER.see) + 0.15, (WALL_X + GRAVE_X) / 2 + 40, GROUND - 120, 0.86, 0, "lin"],
  // close on Dash: horror → grief (hands on his head, tears)
  [R(AFTER.see) + 0.3, WALL_X - 100, GROUND - 330, 1.9, 2, "snap"],
  [R(AFTER.ghost.a) - 0.3, WALL_X - 100, GROUND - 340, 2.05, 2, "lin"],
  // wide: the ghost rises; AGAIN?; the ghost lies back down
  [R(AFTER.ghost.a) + 0.2, (WALL_X + GRAVE_X) / 2 + 40, GROUND - 120, 0.86, 0, "io"],
  [R(AFTER.shrug.b), (WALL_X + GRAVE_X) / 2 + 40, GROUND - 110, 0.88, 0, "lin"],
  // the bouquet: tossed in, lands on his chest (close)
  [R(AFTER.lily.bend), GRAVE_X + 40, GROUND + 40, 1.15, 0, "io"],
  [R(AFTER.lily.place) + 0.1, GRAVE_X - 60, FLOOR - 90, 2.4, 0, "io"],
  [R(AFTER.lily.place) + 1.4, GRAVE_X - 60, FLOOR - 90, 2.5, 0, "lin"],
  // pull back: Dash at the wall, hand on his heart, head bowed
  [R(AFTER.lily.place) + 2.2, (WALL_X + GRAVE_X) / 2 - 110, GROUND - 90, 1.08, 0, "io"],
  [R(AFTER.fade.b), (WALL_X + GRAVE_X) / 2 - 110, GROUND - 90, 1.14, 0, "lin"],
];
const cam = (r: number) => {
  const tr = (i: 1 | 2 | 3 | 4) => num(r, SHOTS.map((k) => [k[0], k[i], k[5]] as const));
  return { x: tr(1), y: tr(2), z: tr(3), roll: tr(4) };
};
type Cam = ReturnType<typeof cam>;

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

// ─── Newt's physics look (world-space chalk) ──────────────────────────────────
const pts = (p: { x: number; y: number }[]) => p.map((q, i) => `${i ? "L" : "M"} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" ");
const ARC1 = appleArc(0);
const ARC2 = appleArc(1);
const ARC3 = (() => {
  const out: { x: number; y: number }[] = [];
  for (let k = 0; k <= 40; k++) out.push(toPx(newtFly((FLY_T * k) / 40)));
  return out;
})();
// the seat swinging up: an arc around the pivot from Newt's (low) seat to the launch point
const SWING = (() => {
  const out: { x: number; y: number }[] = [];
  for (let k = 0; k <= 16; k++) out.push(toPx(plankPoint(TH - (2 * TH * k) / 16, -RS)));
  return out;
})();
const apexOf = (a: { x: number; y: number }[]) => a.reduce((m, p) => (p.y < m.y ? p : m), a[0]);
const LookWorld: React.FC<{ s: number }> = ({ s }) => {
  if (s < LOOK.tint || s > LOOK.back - 0.05) return null; // cleared before the close-up on his face
  const a1 = apexOf(ARC1);
  const a2 = apexOf(ARC2);
  const a3 = toPx({ x: newtFly(0).x + 2.9, y: NEWT_APEX });
  const grave = { x: GRAVE_X, y: GROUND + px(GRAVE_D) - 40 };
  return (
    <g>
      <ChalkPath t={s} at={LOOK.t1} dur={0.5} d={pts(ARC1)} width={14} outline />
      <ChalkText t={s} at={LOOK.t1 + 0.2} x={a1.x} y={a1.y - 50} size={130} rot={-4} outline>
        {LOOK_LINES[1]}
      </ChalkText>
      <ChalkPath t={s} at={LOOK.t2} dur={0.5} d={pts(ARC2)} width={14} outline />
      <ChalkText t={s} at={LOOK.t2 + 0.2} x={a2.x + 40} y={a2.y - 50} size={130} rot={-3} outline>
        {LOOK_LINES[2]}
      </ChalkText>
      <ChalkPath t={s} at={LOOK.arc3 - 0.5} dur={0.45} d={pts(SWING)} width={14} color="#ffd23f" outline />
      <ChalkPath t={s} at={LOOK.arc3} dur={1.6} d={pts(ARC3)} width={26} color="#ffd23f" outline />
      <ChalkText t={s} at={LOOK.arc3 + 0.3} x={a3.x} y={a3.y - 70} size={170} rot={-4} color="#ffd23f" outline>
        {LOOK_LINES[3]}
      </ChalkText>
      {/* X marks the spot */}
      <ChalkPath t={s} at={LOOK.there - 0.3} dur={0.25} d={`M ${grave.x - 60} ${grave.y - 60} L ${grave.x + 60} ${grave.y + 60} M ${grave.x + 60} ${grave.y - 60} L ${grave.x - 60} ${grave.y + 60}`} width={16} color="#ffd23f" outline />
      <ChalkText t={s} at={LOOK.there} x={grave.x} y={GROUND - 300} size={92} rot={-3} outline write={WRITE}>
        {LOOK_LINES[4]}
      </ChalkText>
    </g>
  );
};
const LookScreen: React.FC<{ s: number }> = ({ s }) => {
  if (s < LOOK.tint || s > LOOK.end) return null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <ChalkText t={s} at={LOOK.l1} x={W / 2} y={380} size={84} rot={-2} outline write={WRITE}>
        {LOOK_LINES[0]}
      </ChalkText>
      <ChalkText t={s} at={LOOK.oh} x={W / 2 + 160} y={1620} size={120} rot={-6} color="#ffd23f" outline write={0.1}>
        {LOOK_LINES[5]}
      </ChalkText>
    </svg>
  );
};

/** the "75 kg vs 25 kg" tag while Dash keeps Newt stuck at the top */
const MassTag: React.FC<{ s: number }> = ({ s }) => {
  if (s < TAG.a || s > TAG.b) return null;
  const n = newtAt(s).c;
  const head = toWorld(n, solve(n.pose).head);
  return (
    <g>
      <ChalkText t={s} at={TAG.a} x={head.x + 10} y={head.y - 170} size={58} rot={-4} outline write={WRITE}>
        75 kg vs 25 kg
      </ChalkText>
    </g>
  );
};

// ─── The world, depth-sorted ─────────────────────────────────────────────────
type Item = { d: number; key: string; node: React.ReactNode };
const ActorNode: React.FC<{ a: Actor; who: "dash" | "newt" | "digger" }> = ({ a, who }) => (
  <Lane d={a.d} ax={a.ax}>
    <Toon who={who} c={a.c} />
  </Lane>
);

const World: React.FC<{ s: number; camX: number }> = ({ s, camX }) => {
  const phi = phiAt(s);
  const dash = dashAt(s);
  const newt = newtAt(s);
  const ghost = ghostAt(s);
  const dig = diggerAt(s);
  const helmet = helmetAt(s);
  const apples = applesAt(s);
  const bagLeft = 3 - (s > APPLE1.reach + 0.45 ? 1 : 0) - (s > APPLE2.reach + 0.45 ? 1 : 0);
  const items: Item[] = [
    { d: -3.2, key: "slide", node: <Lane d={-3.2} ax={-700}><Slide x={-700} /></Lane> },
    { d: -3.0, key: "swings", node: <Lane d={-3.0} ax={-1350}><Swings x={-1350} t={s} /></Lane> },
    { d: -1.6, key: "stones", node: <Headstones /> },
    { d: -1.2, key: "wreath", node: <Wreath lilies={s >= AFTER.lily.pick + 0.4 ? 2 : 3} /> },
    { d: D.bench, key: "bench", node: <Lane d={D.bench} ax={BENCH_X}><Bench /></Lane> },
    { d: D.tree - 0.02, key: "oak", node: <Lane d={D.tree} ax={TRUNK_X}><OakBack t={s} /></Lane> },
    { d: D.tree - 0.01, key: "branches", node: <Lane d={D.tree} ax={TRUNK_X}><OakBranches /></Lane> },
    { d: -0.55, key: "pile", node: <DirtPile grow={Math.min(1, s / 40)} /> },
    { d: -0.3, key: "wallBack", node: <Wall part="back" /> },
    { d: -0.03, key: "grave", node: <GraveBack /> },
    { d: -0.001, key: "seesaw", node: <Seesaw phi={phi} /> },
    { d: D.bag, key: "bag", node: <Lane d={D.bag} ax={470}><AppleBag left={bagLeft} /></Lane> },
    { d: 0.31, key: "wallFront", node: <Wall part="front" /> },
    { d: 0.9, key: "sign", node: <Sign /> },
    { d: newt.d + 0.001, key: "newt", node: <ActorNode a={newt} who="newt" /> },
    ...(ghost ? [{ d: ghost.d, key: "ghost", node: <g opacity={ghost.alpha}><ActorNode a={ghost} who="newt" /></g> }] : []),
    { d: dash.d + 0.002, key: "dash", node: <ActorNode a={dash} who="dash" /> },
    { d: dig.a.d, key: "digger", node: <ActorNode a={dig.a} who="digger" /> },
  ];
  if (dig.shovel) items.push({ d: dig.a.d + 0.001, key: "shovel", node: <Lane d={dig.a.d} ax={dig.a.ax}><ShovelProp {...dig.shovel} /></Lane> });
  if (dig.planted) items.push({ d: -0.56, key: "shovelPlanted", node: <Lane d={-0.55} ax={dig.a.ax + 200}><ShovelProp grip={{ x: dig.a.ax + 170, y: GROUND - 360 }} blade={{ x: dig.a.ax + 190, y: GROUND - 120 }} full={0} /></Lane> });
  if (helmet) items.push({ d: helmet.d + 0.003, key: "helmet", node: <Lane d={helmet.d} ax={helmet.ax}><Helmet x={helmet.x} y={helmet.y} /></Lane> });
  apples.forEach((a, i) => {
    if (a) items.push({ d: 0.01, key: `apple${i}`, node: <Apple x={a.x} y={a.y} rot={s * 300 * (i ? 1 : 0.6)} /> });
  });
  // the funeral bouquet: in the gravedigger's hand, tossed, then on Newt's chest
  if (dig.lily) items.push({ d: 0.01, key: "bouquet", node: <Bouquet x={dig.lily.x} y={dig.lily.y} rot={-30 + 200 * clamp01((s - AFTER.lily.bend) / (AFTER.lily.place - AFTER.lily.bend))} s={1.3} /> });
  else if (s >= AFTER.lily.place) {
    const hand = toWorld(newt.c, solve(newt.c.pose).aHand);
    items.push({ d: 0.01, key: "bouquet", node: <Bouquet x={hand.x + 95} y={hand.y - 10} rot={-100} s={1.35} /> });
  }
  items.push({ d: -0.2, key: "dirt", node: <Lane d={-0.25} ax={dig.a.ax}>{dirtAt(s).map((p, i) => <Dirt key={i} {...p} />)}</Lane> });
  items.sort((a, b) => a.d - b.d);
  return (
    <g>
      <Far camX={camX} t={s} />
      <Grass camX={camX} />
      {items.map((it) => (
        <g key={it.key}>{it.node}</g>
      ))}
      {/* dust puff when Newt lands in the grave */}
      {s > E3.land && s < E3.land + 0.8
        ? [0, 1, 2, 3, 4].map((i) => {
            const u = (s - E3.land) / 0.8;
            return <circle key={i} cx={GRAVE_X - 120 + i * 60 + (i - 2) * 60 * u} cy={GROUND - 20 - 80 * u - (i % 2) * 20} r={30 + 40 * u} fill="#c9a77f" opacity={0.8 * (1 - u)} />;
          })
        : null}
      {/* dust ring on the big impact */}
      {s > E3.imp && s < E3.imp + 0.7
        ? [0, 1, 2, 3, 4, 5].map((i) => {
            const u = (s - E3.imp) / 0.7;
            return <circle key={i} cx={SEAT_UP_X - 150 + i * 60 + (i - 2.5) * 80 * u} cy={GROUND - 10 - 40 * u} r={24 + 36 * u} fill="#d9c49a" opacity={0.85 * (1 - u)} />;
          })
        : null}
      <MassTag s={s} />
      <LookWorld s={s} />
    </g>
  );
};

const View: React.FC<{ c: Cam; s: number; clip?: string }> = ({ c, s, clip }) => (
  <g clipPath={clip}>
    <Sky w={W} h={H} />
    <g transform={`translate(${W / 2} ${H / 2}) rotate(${c.roll}) scale(${c.z * (1 + Math.abs(c.roll) * 0.006)}) translate(${-c.x} ${-c.y})`}>
      <World s={s} camX={c.x} />
    </g>
  </g>
);

// ─── Screen overlays ─────────────────────────────────────────────────────────
/** Dash's FUN METER: a red dial that climbs 0 → 1 → 2 → MAX */
const FunMeter: React.FC<{ s: number; t: number }> = ({ s, t }) => {
  if (s < SALUTE0.b || s > AFTER.walk.a || (s > LOOK.tint && s < LOOK.end)) return null;
  const v = num(s, [
    [E1.out.a, 0],
    [E1.out.a + 0.4, 1, "back"],
    [E2.out.a, 1],
    [E2.out.a + 0.4, 2, "back"],
    [FUNMAX, 2],
    [FUNMAX + 0.5, 3, "back"],
  ]);
  const shake = v > 2.9 ? Math.sin(t * 60) * 3 : 0;
  const ang = -90 + (v / 3) * 180 + shake;
  const cx = 170;
  const cy = 250;
  const op = Math.min(1, (s - SALUTE0.b) / 0.3);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, opacity: op }}>
      <g stroke={INK} strokeWidth={8} strokeLinejoin="round">
        <path d={`M ${cx - 130} ${cy} A 130 130 0 0 1 ${cx + 130} ${cy} Z`} fill="#fff6e0" />
        <path d={`M ${cx + 92} ${cy - 92} A 130 130 0 0 1 ${cx + 130} ${cy} L ${cx} ${cy} Z`} fill="#e63946" />
        {[0, 1, 2, 3].map((k) => {
          const a = ((-90 + k * 60) * Math.PI) / 180;
          return <path key={k} d={`M ${cx + Math.sin(a) * 100} ${cy - Math.cos(a) * 100} L ${cx + Math.sin(a) * 124} ${cy - Math.cos(a) * 124}`} strokeWidth={6} />;
        })}
        <path d={`M ${cx} ${cy} L ${cx + Math.sin((ang * Math.PI) / 180) * 108} ${cy - Math.cos((ang * Math.PI) / 180) * 108}`} strokeWidth={10} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={14} fill="#22181c" />
      </g>
      <text x={cx} y={cy + 66} textAnchor="middle" fontFamily={FONT_STACK} fontSize={48} fill="#e63946" stroke={INK} strokeWidth={10} paintOrder="stroke">
        FUN
      </text>
      <text x={cx + 128} y={cy - 104} textAnchor="middle" fontFamily={FONT_STACK} fontSize={30} fill="#fff" stroke={INK} strokeWidth={8} paintOrder="stroke">
        MAX
      </text>
    </svg>
  );
};

/** one line from Dash (he never speaks; it's on screen) */
const SaysBubble: React.FC<{ t: number; from: number; to: number; text: string; top?: number }> = ({ t, from, to, text, top = 360 }) => {
  if (t < from || t > to) return null;
  const sc = Math.max(0, Math.min(ease("back", (t - from) / 0.2), (to - t) / 0.12));
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: top }}>
      <div style={{ fontFamily: FONT_STACK, fontSize: 96, color: INK, background: "#fff", border: `8px solid ${INK}`, borderRadius: 40, padding: "6px 50px", scale: String(sc) }}>{text}</div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{ t: number }> = ({ t }) => {
  if (t < END_R) return null;
  const dark = Math.min(1, (t - END_R) / 0.3);
  const l1 = ease("back", (t - (END_R + 0.4)) / 0.25);
  const l2 = ease("back", (t - (END_R + 1.2)) / 0.25);
  const line: React.CSSProperties = { fontFamily: FONT_STACK, fontSize: 104, color: "#fff", textAlign: "center", lineHeight: 1.15, padding: "0 70px" };
  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(17,17,17,${dark})`, justifyContent: "center", alignItems: "center", gap: 30 }}>
      <div style={{ ...line, scale: String(Math.max(0, l1)), opacity: t > END_R + 0.4 ? 1 : 0 }}>Energy is conserved.</div>
      <div style={{ ...line, color: "#ffd23f", scale: String(Math.max(0, l2)), opacity: t > END_R + 1.2 ? 1 : 0 }}>Kids are not.</div>
    </AbsoluteFill>
  );
};

const Scene: React.FC = () => {
  const t = useT();
  const s = storyOf(t);
  const c = cam(t);
  const split = s >= SPLIT.a && s < SPLIT.b;
  const fadeOut = clamp01((s - AFTER.fade.a) / (AFTER.fade.b - AFTER.fade.a));
  const slow = [
    [CUE.slow2a, CUE.slow2b],
    [CUE.slow3a, CUE.slow3b],
  ].some(([a, b]) => t > a && t < b);
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <clipPath id="bot9">
            <rect x={0} y={H / 2 + 6} width={W} height={H / 2} />
          </clipPath>
          <radialGradient id="vig9" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.55" stopColor="#0b1830" stopOpacity={0} />
            <stop offset="1" stopColor="#0b1830" stopOpacity={0.5} />
          </radialGradient>
        </defs>
        {split ? (
          <>
            {/* the same instant: Dash's boot leaves the branch (top) / Newt lets go of the handles (bottom) */}
            <g transform={`translate(0 ${-H / 4})`}>
              <View c={{ x: SEAT_UP_X - 10, y: yOf(BRANCH[2]) - 120, z: 1.55, roll: 0 }} s={s} />
            </g>
            <rect x={0} y={H / 2 - 6} width={W} height={H / 2 + 6} fill="#000" />
            <g clipPath="url(#bot9)">
              <g transform={`translate(0 ${H / 4})`}>
                <View c={{ x: NX + 110, y: GROUND - 260, z: 1.9, roll: 0 }} s={s} />
              </g>
            </g>
            <rect x={0} y={H / 2 - 8} width={W} height={16} fill="#fff" stroke={INK} strokeWidth={6} />
          </>
        ) : (
          <View c={c} s={s} />
        )}
        {slow ? <rect width={W} height={H} fill="url(#vig9)" /> : null}
        <ChalkTint t={s} from={LOOK.tint} to={LOOK.end} w={W} h={H} opacity={0.4} />
        <rect width={W} height={H} fill="#111" opacity={fadeOut} />
      </svg>
      <LookScreen s={s} />
      <FunMeter s={s} t={t} />
      <Stamp t={s} from={GATE} to={GATE + 1.1} text="FRIEND REQUIRED" top={320} />
      <Stamp t={s} from={SALUTE0.b - 0.1} to={MARCH.a + 1.3} text="FRIEND DEPLOYING" color="#3a86c8" top={320} />
      <Stamp t={s} from={OPER} to={OPER + 1.5} text="SEESAW: OPERATIONAL ✓" color="#2a9d8f" top={320} size={64} />
      <Stamp t={s} from={E1.out.a} to={E1.out.a + 1.4} text="FUN LEVEL 1" top={320} />
      <Stamp t={s} from={E2.out.a} to={E2.out.a + 1.4} text="FUN LEVEL 2" top={320} />
      <Stamp t={s} from={FUNMAX} to={FUNMAX + 1.6} text="FUN LEVEL: MAXIMUM" top={320} size={72} />
      <Stamp t={s} from={SAFETY.a} to={SAFETY.b} text="SAFETY FIRST ✓" color="#2a9d8f" top={320} />
      <Stamp t={s} from={AFTER.proud} to={AFTER.proud + 1.4} text="FUN: MAXIMUM ✓" color="#2a9d8f" top={320} />
      <SaysBubble t={s} from={AFTER.again.a} to={AFTER.again.b} text="AGAIN?" />
    </>
  );
};

const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

// Sound: original park ambience + score; one named node per cue; slow motion stretches the world.
export const BigBounce: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const f = (x: number) => Math.round(x * fps);
  const C = CUE;
  const t = useT();
  return (
    <AbsoluteFill style={{ backgroundColor: "#c9efff" }}>
      <Scene />
      <HookTitle text="Never let your BIG friend help on the seesaw" from={0.15} to={3.0} top={1480} />
      <EndCard t={t} />

      <Audio name="Score" src={sfx("score-bounce")} durationInFrames={durationInFrames} volume={1.0} />
      <Audio name="Park ambience" src={sfx("park-amb")} durationInFrames={durationInFrames} volume={0.9} />
      <Audio name="Gravedigger's shovel" src={sfx("dig-bed")} durationInFrames={durationInFrames} volume={0.8} />

      <Audio name="Newt pushes 1" src={sfx("seesaw-creak")} from={f(C.push1)} volume={0.35} playbackRate={1.3} />
      <Audio name="Newt pushes 2" src={sfx("seesaw-creak")} from={f(C.push2)} volume={0.35} playbackRate={1.4} />
      <Audio name="Kid: sigh" src={sfx("kid-blip")} from={f(C.sigh)} volume={0.16} playbackRate={0.75} />
      <Audio name="Gate" src={sfx("clank")} from={f(C.gate)} volume={0.35} />
      <Audio name="Hero: salute" src={sfx("hero-blip")} from={f(C.salute0)} volume={0.2} playbackRate={1.05} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Audio key={`m${i}`} name={`March step ${i + 1}`} src={sfx(`step-${(i % 4) + 1}`)} from={f(C.march + 0.1 + (i * (C.marchEnd - C.march)) / 6)} volume={0.55} />
      ))}
      <Audio name="Seesaw pulled down (creak)" src={sfx("seesaw-creak")} from={f(C.pullA)} volume={0.6} playbackRate={0.75} />
      <Audio name="Kid: up we go" src={sfx("kid-blip")} from={f(C.pullA + 0.5)} volume={0.15} playbackRate={1.2} />
      <Audio name="Dash sits" src={sfx("pomf")} from={f(C.sit - 0.1)} volume={0.5} />
      <Audio name="Stamp: operational" src={sfx("chime")} from={f(C.oper)} volume={0.18} />
      <Audio name="Knee bounces" src={sfx("seesaw-creak")} from={f(C.bounceA)} volume={0.35} playbackRate={1.6} />
      <Audio name="Chalk: masses" src={sfx("chalk")} from={f(C.tag)} volume={0.22} />

      {[1, 2, 3].map((k) => (
        <React.Fragment key={`off${k}`}>
          <Audio name={`Release ${k} (creak)`} src={sfx("seesaw-creak")} from={f(C[`rel${k}` as "rel1"])} volume={0.5} playbackRate={1.15} />
          <Audio name={`BONK ${k}`} src={sfx("bonk")} from={f(C[`bonk${k}` as "bonk1"])} volume={0.75} />
          <Audio name={`Kid: ow ${k}`} src={sfx("kid-blip")} from={f(C[`bonk${k}` as "bonk1"] + 0.12)} volume={0.14} playbackRate={0.8} />
        </React.Fragment>
      ))}
      <Audio name="Apple 1 out of the bag" src={sfx("hat-pluck")} from={f(R(APPLE1.reach + 0.4))} volume={0.35} />
      <Audio name="Apple 2 out of the bag" src={sfx("hat-pluck")} from={f(R(APPLE2.reach + 0.4))} volume={0.35} />
      <Audio name="Climb 1 (bark scrapes)" src={sfx("scurry")} from={f(C.climb1 + 0.4)} volume={0.4} />
      <Audio name="Stamp: fun 1" src={sfx("pop")} from={f(C.fun1)} volume={0.15} />
      <Audio name="Hero: salute 1" src={sfx("hero-blip")} from={f(R(E1.salute.a))} volume={0.18} />
      <Audio name="Drop 1" src={sfx("whoosh-small")} from={f(C.step1)} volume={0.5} />
      <Audio name="Impact 1" src={sfx("plank-thwang")} from={f(C.imp1)} volume={0.55} />
      <Audio name="Seesaw stops 1" src={sfx("thud")} from={f(C.stop1)} volume={0.45} />
      <Audio name="Apple 1 lands in his lap" src={sfx("pat")} from={f(R(E1.stop + 1.0))} volume={0.4} />
      <Audio name="Kid: polite thumbs up" src={sfx("kid-blip")} from={f(C.thumb1)} volume={0.15} playbackRate={1.1} />
      <Audio name="CHOMP (whole apple)" src={sfx("pickle-crunch")} from={f(C.bite)} volume={0.7} playbackRate={0.85} />
      <Audio name="Hero: hm (not enough)" src={sfx("hero-blip")} from={f(R(CHOMP.bite + 0.8))} volume={0.2} playbackRate={0.85} />

      <Audio name="Climb 2 (bark scrapes)" src={sfx("scurry")} from={f(C.climb2 + 0.4)} volume={0.4} playbackRate={0.9} />
      <Audio name="Stamp: fun 2" src={sfx("pop")} from={f(C.fun2)} volume={0.15} playbackRate={1.1} />
      <Audio name="Hero: salute 2" src={sfx("hero-blip")} from={f(R(E2.salute.a))} volume={0.18} />
      <Audio name="Drop 2" src={sfx("whoosh-small")} from={f(C.step2)} volume={0.6} playbackRate={0.85} />
      <Audio name="Slow motion 2" src={sfx("slowmo-bounce")} from={f(C.slow2a)} durationInFrames={f(C.slow2b - C.slow2a + 0.3)} volume={0.6} />
      <Audio name="Impact 2" src={sfx("plank-thwang")} from={f(C.imp2)} volume={0.7} playbackRate={0.85} />
      <Audio name="Seesaw stops 2" src={sfx("thud")} from={f(C.stop2)} volume={0.55} playbackRate={0.9} />
      <Audio name="Apple bonks Dash's head" src={sfx("apple-tok")} from={f(C.a2hit)} volume={0.8} />
      <Audio name="Apple 2 lands on the grass" src={sfx("pat")} from={f(C.a2rest)} volume={0.3} />
      <Audio name="Hero: proud nod" src={sfx("hero-blip")} from={f(C.nod2)} volume={0.18} playbackRate={1.1} />
      <Audio name="Hero: idea" src={sfx("hero-blip")} from={f(C.lookupA + 0.4)} volume={0.2} playbackRate={1.15} />
      <Audio name="Stamp: fun max" src={sfx("pop")} from={f(C.funmax)} volume={0.18} playbackRate={0.8} />

      <Audio name="Helmet: buckle click" src={sfx("click")} from={f(C.click)} volume={0.6} />
      <Audio name="Helmet: knock 1" src={sfx("helmet-knock")} from={f(C.knock1)} volume={0.6} />
      <Audio name="Helmet: knock 2" src={sfx("helmet-knock")} from={f(C.knock2)} volume={0.6} playbackRate={1.05} />
      <Audio name="Stamp: safety" src={sfx("chime")} from={f(C.click + 0.05)} volume={0.18} />
      <Audio name="Climb 3 (bark scrapes)" src={sfx("scurry")} from={f(C.trunk)} volume={0.45} playbackRate={0.8} />
      <Audio name="Wind at the top" src={sfx("gust")} from={f(C.top)} volume={0.25} />
      <Audio name="Hero: measuring" src={sfx("hero-blip")} from={f(C.measure)} volume={0.18} playbackRate={0.9} />

      <Audio name="Kid: chalk (look)" src={sfx("chalk")} from={f(C.look)} volume={0.25} />
      <Audio name="Kid: chalk test 1" src={sfx("chalk")} from={f(C.t1)} volume={0.18} playbackRate={1.2} />
      <Audio name="Kid: chalk test 2" src={sfx("chalk")} from={f(C.t2)} volume={0.18} playbackRate={1.1} />
      <Audio name="Kid: chime (test 3: me)" src={sfx("chime")} from={f(C.arc3 + 0.3)} volume={0.2} />
      <Audio name="Church bell (there)" src={sfx("church-bell")} from={f(C.there)} volume={0.5} />
      <Audio name="Kid: gulp (the grave)" src={sfx("kid-blip")} from={f(R(LOOK.back + 0.1))} volume={0.18} playbackRate={0.7} />
      <Audio name="Kid: oh (disappointed)" src={sfx("womp")} from={f(C.oh + 0.1)} volume={0.22} playbackRate={1.35} />

      <Audio name="Split: handles released" src={sfx("click")} from={f(C.letgo)} volume={0.4} playbackRate={0.8} />
      <Audio name="Split: step off" src={sfx("step-2")} from={f(C.step3)} volume={0.6} />
      <Audio name="The long drop" src={sfx("fall-whistle")} from={f(C.step3 + 0.2)} volume={0.45} playbackRate={0.6} />
      <Audio name="Slow motion 3" src={sfx("slowmo-drop")} from={f(C.slow3a)} durationInFrames={f(C.slow3b - C.slow3a + 0.4)} volume={0.8} />
      <Audio name="IMPACT 3" src={sfx("plank-thwang")} from={f(C.imp3)} volume={1.0} playbackRate={0.7} />
      <Audio name="Seesaw stops 3" src={sfx("thud")} from={f(C.stop3)} volume={0.7} playbackRate={0.8} />
      <Audio name="Newt launched" src={sfx("whoosh-small")} from={f(C.stop3 + 0.05)} volume={0.6} playbackRate={0.7} />
      <Audio name="Kid: deadpan up" src={sfx("kid-blip")} from={f(C.stop3 + 0.3)} volume={0.14} playbackRate={0.7} />
      <Audio name="Lands in the grave" src={sfx("dirt-thump")} from={f(C.land3)} volume={1.0} />
      <Audio name="Helmet cracks" src={sfx("crack")} from={f(C.land3 + 0.02)} volume={0.45} />
      <Audio name="Body flops over" src={sfx("body-fall")} from={f(R(DEATH.crumple.b - 0.1))} volume={0.5} />
      <Audio name="Death: one bell toll" src={sfx("church-bell")} from={f(C.zoom + 0.5)} volume={0.55} playbackRate={0.85} />

      <Audio name="Stamp: fun maximum (done)" src={sfx("chime")} from={f(C.proud)} volume={0.2} />
      <Audio name="Hero: huh? (empty seat)" src={sfx("hero-blip")} from={f(C.turn + 0.4)} volume={0.2} playbackRate={1.2} />
      {[0, 1, 2, 3].map((i) => (
        <Audio key={`w${i}`} name={`Walk to the wall ${i + 1}`} src={sfx(`step-${((i + 2) % 4) + 1}`)} from={f(C.walkA + 0.1 + (i * (C.walkB - C.walkA)) / 4)} volume={0.5} />
      ))}
      <Audio name="Hero: gasp (sees him)" src={sfx("hero-blip")} from={f(C.see)} volume={0.26} playbackRate={0.75} />
      <Audio name="Hero: womp (grief)" src={sfx("womp")} from={f(C.griefA + 0.1)} volume={0.32} />
      {[0, 1, 2].map((i) => (
        <Audio key={`sob${i}`} name={`Hero: sob ${i + 1}`} src={sfx("hero-blip")} from={f(C.griefA + 1.0 + i * 0.9)} volume={0.15} playbackRate={0.7 + (i % 2) * 0.06} />
      ))}
      <Audio name="Ghost rises" src={sfx("ghost")} from={f(C.ghostA)} volume={0.5} />
      <Audio name="Hero: !? (the ghost)" src={sfx("hero-blip")} from={f(C.notice)} volume={0.22} playbackRate={1.2} />
      <Audio name="Hero: AGAIN?" src={sfx("hero-blip")} from={f(C.again)} volume={0.24} playbackRate={1.15} />
      <Audio name="Hero: womp (face falls)" src={sfx("womp")} from={f(C.sad2)} volume={0.26} playbackRate={1.1} />
      <Audio name="Kid ghost: no thanks" src={sfx("kid-blip")} from={f(R(AFTER.nod))} volume={0.14} playbackRate={0.75} />
      <Audio name="Ghost lies back down" src={sfx("ghost")} from={f(C.merge - 0.3)} volume={0.3} playbackRate={0.8} />
      <Audio name="Gravedigger: shrug" src={sfx("swish")} from={f(C.shrug)} volume={0.3} />
      <Audio name="Bouquet tossed" src={sfx("swish")} from={f(R(AFTER.lily.bend))} volume={0.3} playbackRate={1.3} />
      <Audio name="Bouquet lands" src={sfx("pat")} from={f(C.place)} volume={0.3} playbackRate={1.3} />
      <Audio name="Church bell (farewell)" src={sfx("church-bell")} from={f(C.place + 0.3)} volume={0.4} playbackRate={0.9} />
      <Audio name="Hero: sniff (mourning)" src={sfx("hero-blip")} from={f(C.mourn + 0.9)} volume={0.16} playbackRate={0.72} />
      <Audio name="Moral 1" src={sfx("chime")} from={f(C.end + 0.4)} volume={0.25} />
      <Audio name="Moral 2" src={sfx("chime")} from={f(C.end + 1.2)} volume={0.25} playbackRate={1.25} />
    </AbsoluteFill>
  );
};

export { DURATION };
void [OFF1, TREE, LETGO, LOOKUP, PULL, SIT, E2, GATE_X, DASH_STAND_X];
