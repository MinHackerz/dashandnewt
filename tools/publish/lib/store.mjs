// The reviewable publish file (content/publish/epNN-slug.yaml). Edited through the yaml Document
// API so the user's comments and hand edits survive status/result updates.
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const STRINGIFY = { lineWidth: 0, blockQuote: "literal" };

export const HEADER = `Review this file, then approve it: npm run publish:approve -- <episode>
Edit any text below before approving. Nothing is uploaded while status is draft, and any edit
(or a re-render of the video) after approval blocks publishing until you approve again.
Preview the exact API requests: npm run publish -- <episode> --dry-run`;

export function createPublishFile(file, data) {
  const doc = new YAML.Document(data);
  doc.commentBefore = HEADER.split("\n")
    .map((l) => ` ${l}`)
    .join("\n");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, doc.toString(STRINGIFY));
  return openPublishFile(file);
}

export function openPublishFile(file) {
  if (!fs.existsSync(file)) return null;
  const doc = YAML.parseDocument(fs.readFileSync(file, "utf8"));
  if (doc.errors.length) throw new Error(`${file}: ${doc.errors[0].message}`);
  const store = {
    file,
    doc,
    get data() {
      return doc.toJS() ?? {};
    },
    set(pathKeys, value) {
      if (value === undefined) doc.deleteIn(pathKeys);
      else doc.setIn(pathKeys, doc.createNode(value));
      // Maps along the path that started as `{}` would stay inline; keep them block style.
      for (let i = 1; i <= pathKeys.length; i++) {
        const node = doc.getIn(pathKeys.slice(0, i), true);
        if (YAML.isMap(node)) node.flow = false;
      }
      fs.writeFileSync(file, doc.toString(STRINGIFY));
    },
    /** Merge fields into results.<platform> and write immediately (crash-safe progress). */
    patchResults(platform, patch) {
      for (const [k, v] of Object.entries(patch))
        store.set(["results", platform, k], v);
    },
  };
  return store;
}

/** An in-memory stand-in for dry runs: same interface, never writes. */
export function memoryStore(data) {
  const copy = structuredClone(data);
  return {
    file: null,
    get data() {
      return copy;
    },
    set() {},
    patchResults(platform, patch) {
      copy.results ??= {};
      copy.results[platform] = { ...(copy.results[platform] ?? {}), ...patch };
    },
  };
}
