// Exports ep06's beat times (src/episodes/ep06-the-jar/timeline.ts) to tools/sfx/ep06_times.json, so the
// numpy generator (ep06_jar.py) times the score from the one timeline. Re-run after changing timeline.ts:
//   node tools/sfx/ep06-times.mjs
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
const out = await build({ entryPoints: ["src/episodes/ep06-the-jar/timeline.ts"], bundle: true, write: false, format: "esm", platform: "node", logLevel: "error" });
const mod = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`);
const pick = Object.fromEntries(Object.entries(mod).filter(([, v]) => typeof v === "number" || (v && typeof v === "object" && Object.values(v).every((x) => typeof x === "number"))));
writeFileSync("tools/sfx/ep06_times.json", JSON.stringify(pick, null, 1) + "\n");
console.log(`ep06_times.json: ${Object.keys(pick).length} entries`);
