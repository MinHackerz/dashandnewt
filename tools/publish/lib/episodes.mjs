// Finds an episode from a loose id (ep01, 1, the-button, TheButton, a .yaml path) and parses its
// sheet: composition, rendered file, length, moral and the "Publish brief" yaml block.
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { EPISODES_DIR, PUBLISH_DIR, ROOT } from "./env.mjs";

export function listEpisodes() {
  return fs
    .readdirSync(EPISODES_DIR)
    .filter((f) => /^(ep|s)\d+-[a-z0-9-]+\.md$/.test(f)) // epNN = Dash & Newt, sNN = science shorts
    .sort()
    .map((f) => readSheet(path.join(EPISODES_DIR, f)));
}

/** Returns { key, sheet, publishFile } or throws with the list of known episodes. */
export function resolveEpisode(arg) {
  if (!arg)
    throw new Error("Which episode? e.g. ep01, 1, the-button or TheButton");
  if (arg.endsWith(".yaml") || arg.endsWith(".yml")) {
    const publishFile = path.resolve(arg);
    const key = path.basename(publishFile).replace(/\.ya?ml$/, "");
    const sheetFile = path.join(EPISODES_DIR, `${key}.md`);
    return {
      key,
      sheet: fs.existsSync(sheetFile) ? readSheet(sheetFile) : null,
      publishFile,
    };
  }
  const want = arg.toLowerCase().replace(/^ep/, "");
  const short = /^s\d+$/.test(arg.toLowerCase()) ? arg.toLowerCase() : null;
  const all = listEpisodes();
  const hit = all.find(
    (e) =>
      e.key === arg.toLowerCase() ||
      (short && e.key.startsWith(`${short}-`)) ||
      e.slug === arg.toLowerCase() ||
      e.composition?.toLowerCase() === arg.toLowerCase() ||
      (/^\d+$/.test(want) && Number(want) === e.number),
  );
  if (!hit) {
    throw new Error(
      `No episode "${arg}". Known: ${all.map((e) => `${e.key} (${e.composition})`).join(", ")}`,
    );
  }
  return {
    key: hit.key,
    sheet: hit,
    publishFile: path.join(PUBLISH_DIR, `${hit.key}.yaml`),
  };
}

export function readSheet(file) {
  const md = fs.readFileSync(file, "utf8");
  const key = path.basename(file, ".md");
  const m = /^(?:ep|s)(\d+)-(.+)$/.exec(key);
  const isShort = key.startsWith("s");
  const field = (label) =>
    new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`).exec(md)?.[1].trim();
  const title =
    /^#\s*(?:Ep|Short)\s*s?\d*\s*[—-]\s*(.+)$/m.exec(md)?.[1].trim() ?? key;
  const compLine = field("Composition") ?? "";
  const composition = /`([A-Za-z0-9]+)`/.exec(compLine)?.[1];
  const length = Number(/·\s*([\d.]+)\s*s/.exec(compLine)?.[1]) || undefined;
  const video = /→\s*`([^`]+\.mp4)`/.exec(field("Render") ?? "")?.[1];
  const moral = (field("Moral") ?? "")
    .replace(/^\*|\*$/g, "")
    .split(/\s*\/\s*/)
    .join(" ")
    .trim();
  const briefBlock = /##\s*Publish brief[\s\S]*?```ya?ml\n([\s\S]*?)```/.exec(
    md,
  )?.[1];
  let brief = null;
  if (briefBlock) {
    try {
      brief = YAML.parse(briefBlock);
    } catch (e) {
      throw new Error(
        `${path.relative(ROOT, file)}: the Publish brief is not valid YAML — ${e.message}`,
      );
    }
  }
  return {
    key,
    number: m && !isShort ? Number(m[1]) : NaN, // bare numbers ("3") mean Dash & Newt episodes
    slug: m ? m[2] : key,
    title,
    composition,
    length,
    video,
    moral,
    brief,
    file,
  };
}
