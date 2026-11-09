// Paths, settings loading and the git-ignored secrets folder. Credentials are only ever read from
// `.secrets/` (git-ignored) — never passed on the command line or printed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
export const EPISODES_DIR = path.join(ROOT, "content/episodes");
export const PUBLISH_DIR = path.join(ROOT, "content/publish");
export const CHANNEL_DEFAULTS = path.join(
  ROOT,
  "content/channel/publish-defaults.yaml",
);
export const CACHE_DIR = path.join(ROOT, "out/publish");

export const GRAPH_VERSION_DEFAULT = "v26.0";

let loaded = false;
/**
 * Settings live in `.secrets/publish.env`, not `.env`/`.env.local`: Remotion auto-loads those into
 * the Studio and render bundle, which would hand the Meta app secret to the browser page.
 * Variables already set in the shell win.
 */
export function loadEnv() {
  if (loaded) return;
  loaded = true;
  const file = secretPath("publish.env");
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

export function env(name, fallback = undefined) {
  loadEnv();
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

export const rel = (p) => path.relative(ROOT, p) || ".";

/** `.secrets/` by default; PUBLISH_SECRETS_DIR points elsewhere (the tests use a temp dir). */
export function secretsDir() {
  return path.resolve(ROOT, env("PUBLISH_SECRETS_DIR", ".secrets"));
}

export function secretPath(name) {
  return path.join(secretsDir(), name);
}

export function readSecret(name) {
  const p = secretPath(name);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

export function writeSecret(name, data) {
  fs.mkdirSync(secretsDir(), { recursive: true, mode: 0o700 });
  const p = secretPath(name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
  fs.chmodSync(p, 0o600);
  return p;
}

export function graphVersion() {
  return env("META_GRAPH_VERSION", GRAPH_VERSION_DEFAULT);
}
