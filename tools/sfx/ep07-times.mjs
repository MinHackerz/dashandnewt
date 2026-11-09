// Exports ep07's cue times (src/episodes/ep07-saved/timeline.ts, REAL clock) to tools/sfx/ep07_times.json,
// so the numpy generator (ep07_saved.py) times the score from the one timeline. Re-run after changing it:
//   node tools/sfx/ep07-times.mjs
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
const out = await build({ entryPoints: ["src/episodes/ep07-saved/timeline.ts"], bundle: true, write: false, format: "esm", platform: "node", logLevel: "error" });
const mod = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`);
const pick = Object.fromEntries(Object.entries(mod).filter(([, v]) => typeof v === "number" || (v && typeof v === "object" && Object.values(v).every((x) => typeof x === "number"))));
writeFileSync("tools/sfx/ep07_times.json", JSON.stringify(pick, null, 1) + "\n");
console.log(`ep07_times.json: ${Object.keys(pick).length} entries`);
