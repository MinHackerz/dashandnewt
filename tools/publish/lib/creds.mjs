// Loads platform credentials from .secrets/ (publish.env + token files). In a dry run, missing values become visible
// placeholders instead of errors, so the full request plan can be shown without any setup.
import fs from "node:fs";
import path from "node:path";
import { env, readSecret, ROOT } from "./env.mjs";

export const YT_CLIENT_FILE = () =>
  path.resolve(
    ROOT,
    env("YOUTUBE_CLIENT_SECRET_FILE", ".secrets/youtube-client.json"),
  );
export const YT_TOKEN = "youtube-token.json";
export const META_TOKEN = "meta.json";

export class SetupError extends Error {}

function resolve(values, dryRun, hint) {
  const missing = Object.entries(values)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length && !dryRun)
    throw new SetupError(`missing ${missing.join(", ")} — ${hint}`);
  const out = { missing };
  for (const [k, v] of Object.entries(values)) out[k] = v || `<${k}>`;
  return out;
}

export function readYoutubeClient() {
  const file = YT_CLIENT_FILE();
  if (fs.existsSync(file)) {
    const j = JSON.parse(fs.readFileSync(file, "utf8"));
    const c = j.installed ?? j.web ?? j;
    return { clientId: c.client_id, clientSecret: c.client_secret };
  }
  return {
    clientId: env("YOUTUBE_CLIENT_ID"),
    clientSecret: env("YOUTUBE_CLIENT_SECRET"),
  };
}

export function youtubeCreds(dryRun) {
  const { clientId, clientSecret } = readYoutubeClient();
  const token = readSecret(YT_TOKEN) ?? {};
  const c = resolve(
    {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token.refresh_token,
    },
    dryRun,
    "see docs/PUBLISHING.md → YouTube, then run `npm run publish:auth -- youtube`",
  );
  c.channel = token.channel ?? null;
  c.expectedChannelId = env("YOUTUBE_CHANNEL_ID");
  return c;
}

export function metaCreds(dryRun, need) {
  const saved = readSecret(META_TOKEN) ?? {};
  const all = {
    page_access_token: env("META_PAGE_TOKEN", saved.page_token),
    page_id: env("META_PAGE_ID", saved.page_id),
    ig_user_id: env("IG_USER_ID", saved.ig_user_id),
  };
  const values = Object.fromEntries(need.map((k) => [k, all[k]]));
  return resolve(
    values,
    dryRun,
    "see docs/PUBLISHING.md → Meta, then run `npm run publish:auth -- meta`",
  );
}
