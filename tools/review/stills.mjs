// Renders stills of one composition at many times with a single bundle, then tiles them.
//   node tools/review/stills.mjs <CompositionId> <outDir> <scale> <t1,t2,...>
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
const [id, outDir, scale, times] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const comp = await selectComposition({ serveUrl, id });
const ts = times.split(",").map(Number);
for (const [i, t] of ts.entries()) {
  const frame = Math.min(comp.durationInFrames - 1, Math.round(t * comp.fps));
  await renderStill({ serveUrl, composition: comp, frame, output: `${outDir}/s${String(i).padStart(3, "0")}.png`, scale: Number(scale) });
}
execFileSync("ffmpeg", ["-v", "error", "-y", "-pattern_type", "glob", "-i", `${outDir}/s*.png`, "-vf", `tile=8x${Math.ceil(ts.length / 8)}:padding=6:color=white`, "-frames:v", "1", `${outDir}/sheet.png`]);
console.log(`${outDir}/sheet.png (${ts.length} stills)`);
