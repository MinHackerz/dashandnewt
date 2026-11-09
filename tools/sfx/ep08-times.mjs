// Exports ep08's cue times (src/episodes/ep08-umbrella-duty/timeline.ts, REAL clock) to tools/sfx/ep08_times.json
// for the numpy generator (ep08_umbrella.py). Re-run after changing the timeline: node tools/sfx/ep08-times.mjs
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
const out = await build({ entryPoints: ["src/episodes/ep08-umbrella-duty/timeline.ts"], bundle: true, write: false, format: "esm", platform: "node", logLevel: "error" });
const mod = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`);
const pick = Object.fromEntries(Object.entries(mod).filter(([, v]) => typeof v === "number" || (v && typeof v === "object" && !Array.isArray(v) && Object.values(v).every((x) => typeof x === "number"))));
writeFileSync("tools/sfx/ep08_times.json", JSON.stringify(pick, null, 1) + "\n");
console.log(`ep08_times.json: ${Object.keys(pick).length} entries`);
