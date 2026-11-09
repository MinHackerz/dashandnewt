// Exports ep09's cue times (src/episodes/ep09-big-bounce/timeline.ts, REAL clock) to tools/sfx/ep09_times.json
// for the numpy generator (ep09_bounce.py). Re-run after changing the timeline: node tools/sfx/ep09-times.mjs
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
const out = await build({ entryPoints: ["src/episodes/ep09-big-bounce/timeline.ts"], bundle: true, write: false, format: "esm", platform: "node", logLevel: "error" });
const mod = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`);
const plain = (v) => typeof v === "number" || (v && typeof v === "object" && !Array.isArray(v) && Object.values(v).every((x) => typeof x === "number"));
const pick = Object.fromEntries(Object.entries(mod).filter(([, v]) => plain(v)));
pick.DIG_EVENTS = mod.DIG_EVENTS;
writeFileSync("tools/sfx/ep09_times.json", JSON.stringify(pick, null, 1) + "\n");
console.log(`ep09_times.json: ${Object.keys(pick).length} entries`);
