#!/usr/bin/env node
// Checks every copy block in content/channel/channel-setup.md against the limit stated in the
// heading (or bold label) just above it, e.g. "Bio (≤ 150 characters)".
//   node tools/publish/check-channel-copy.mjs
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/env.mjs";
import { ytTagChars } from "./lib/metadata.mjs";

const file = path.join(ROOT, "content/channel/channel-setup.md");
const lines = fs.readFileSync(file, "utf8").split("\n");
let label = null;
let failed = 0;
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (/≤\s*[\d,]+/.test(l) && !l.startsWith("```")) label = l;
  const open = /^```(text|keywords)$/.exec(l);
  if (!open) continue;
  const end = lines.indexOf("```", i + 1);
  const body = lines.slice(i + 1, end).join("\n");
  i = end;
  const limit = Number(/≤\s*([\d,]+)/.exec(label ?? "")?.[1].replace(",", ""));
  const name = (label ?? "?").replace(/^#+\s*|\*\*/g, "").slice(0, 60);
  const n =
    open[1] === "keywords"
      ? ytTagChars(body.split(",").map((s) => s.trim()))
      : Math.max([...body].length, body.length); // some apps count emoji as 2
  const ok = !limit || n <= limit;
  if (!ok) failed++;
  console.log(
    `${ok ? "✓" : "✗"} ${String(n).padStart(5)} / ${limit || "—"}  ${name}`,
  );
  label = null;
}
if (failed) process.exitCode = 1;
