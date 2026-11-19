// Exports ep13's beat times (src/episodes/ep13-static-zap/timeline.ts) to tools/blender/ep13_times.json so the
// Blender shot script and the Remotion edit share one timeline. The ep13 picture is rendered and its times are now
// LOCKED: the edit reads them back from the json, so only re-run this before a full re-render.
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
const out = await build({ entryPoints: ["src/episodes/ep13-static-zap/timeline.ts"], bundle: true, write: false, format: "esm", platform: "node", logLevel: "error", loader: { ".json": "json" } });
const mod = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`);
writeFileSync("tools/blender/ep13_times.json", JSON.stringify({ CUE: mod.CUE, LINES: mod.LINES, PHYS: mod.PHYS }, null, 1) + "\n");
console.log(`ep13_times.json: ${Object.keys(mod.CUE).length} cues, ${mod.DURATION.toFixed(2)} s`);
