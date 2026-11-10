// Exports ep12's cue times (src/episodes/ep12-right-there/timeline.ts, REAL clock) to tools/sfx/ep12_times.json,
// so the numpy generator (ep12_pool.py) times the score from the one timeline. Re-run after changing it:
//   node tools/sfx/ep12-times.mjs
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
const out = await build({ entryPoints: ["src/episodes/ep12-right-there/timeline.ts"], bundle: true, write: false, format: "esm", platform: "node", logLevel: "error" });
const mod = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`);
const pick = Object.fromEntries(Object.entries(mod).filter(([, v]) => typeof v === "number" || (v && typeof v === "object" && Object.values(v).every((x) => typeof x === "number"))));
writeFileSync("tools/sfx/ep12_times.json", JSON.stringify(pick, null, 1) + "\n");
console.log(`ep12_times.json: ${Object.keys(pick).length} entries`);
