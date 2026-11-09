// Exports ep10's cue times (src/episodes/ep10-one-flare/timeline.ts, REAL clock) to tools/sfx/ep10_times.json
// for the numpy generator (ep10_flare.py). Re-run after changing the timeline: node tools/sfx/ep10-times.mjs
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
const out = await build({ entryPoints: ["src/episodes/ep10-one-flare/timeline.ts"], bundle: true, write: false, format: "esm", platform: "node", logLevel: "error" });
const mod = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`);
const pick = Object.fromEntries(Object.entries(mod).filter(([, v]) => typeof v === "number" || (v && typeof v === "object" && !Array.isArray(v) && Object.values(v).every((x) => typeof x === "number"))));
writeFileSync("tools/sfx/ep10_times.json", JSON.stringify(pick, null, 1) + "\n");
console.log(`ep10_times.json: ${Object.keys(pick).length} entries`);
