// One-time credential setup, run by the user in their own terminal. Tokens go straight from the
// provider to .secrets/ (git-ignored, mode 600); they are never printed.
//   auth youtube   OAuth 2.0 installed-app flow (loopback + PKCE) → refresh token
//   auth meta      short-lived user token (hidden prompt) → long-lived → Page token + IG user id
//   auth check     read-only: shows which channel / page / IG account the saved tokens reach
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import http from "node:http";
import readline from "node:readline/promises";
import {
  env,
  graphVersion,
  readSecret,
  secretPath,
  writeSecret,
  rel,
} from "./lib/env.mjs";
import {
  META_TOKEN,
  readYoutubeClient,
  YT_CLIENT_FILE,
  YT_TOKEN,
  youtubeCreds,
  metaCreds,
} from "./lib/creds.mjs";
import { makeClient } from "./lib/http.mjs";
import { accessToken, YT_SCOPES } from "./platforms/youtube.mjs";

const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
];
const quiet = makeClient({ log: () => {} });

export async function auth(which) {
  if (which === "youtube") return authYoutube();
  if (which === "meta") return authMeta();
  if (which === "check") return authCheck();
  throw new Error("usage: npm run publish:auth -- youtube | meta | check");
}

const b64url = (buf) => buf.toString("base64url");

async function authYoutube() {
  const { clientId, clientSecret } = readYoutubeClient();
  if (!clientId || !clientSecret) {
    throw new Error(
      `no OAuth client — download it from Google Cloud to ${rel(YT_CLIENT_FILE())} (docs/PUBLISHING.md → YouTube)`,
    );
  }
  const verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(
    crypto.createHash("sha256").update(verifier).digest(),
  );
  const state = b64url(crypto.randomBytes(16));

  const { code, redirectUri } = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, "http://127.0.0.1");
      if (u.pathname !== "/") return void res.writeHead(404).end();
      const ok =
        u.searchParams.get("state") === state && u.searchParams.get("code");
      res.writeHead(ok ? 200 : 400, {
        "Content-Type": "text/html; charset=utf-8",
      });
      res.end(
        ok
          ? "<h2>Dash &amp; Newt publisher authorized ✓</h2>You can close this tab."
          : "<h2>Authorization failed</h2>",
      );
      server.close();
      if (ok) resolve({ code: u.searchParams.get("code"), redirectUri });
      else
        reject(
          new Error(
            `authorization failed: ${u.searchParams.get("error") ?? "state mismatch"}`,
          ),
        );
    });
    let redirectUri;
    server.listen(0, "127.0.0.1", () => {
      redirectUri = `http://127.0.0.1:${server.address().port}`;
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: YT_SCOPES.join(" "),
        access_type: "offline",
        prompt: "consent select_account",
        code_challenge: challenge,
        code_challenge_method: "S256",
        state,
      }).toString();
      console.log(
        "Opening Google sign-in in your browser. Pick the account, then the **Dash & Newt** channel.",
      );
      console.log(`If nothing opens, visit:\n${url}\n`);
      if (process.platform === "darwin")
        execFile("open", [url.toString()], () => {});
    });
    setTimeout(
      () => (server.close(), reject(new Error("timed out after 5 minutes"))),
      300_000,
    ).unref();
  });

  const tok = await quiet.request({
    step: "exchange the authorization code",
    method: "POST",
    url: "https://oauth2.googleapis.com/token",
    form: {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    },
  });
  if (!tok.json.refresh_token) {
    throw new Error(
      "Google returned no refresh token — remove the app at myaccount.google.com/permissions and retry",
    );
  }
  const channel = await whichChannel(tok.json.access_token);
  writeSecret(YT_TOKEN, {
    refresh_token: tok.json.refresh_token,
    scope: tok.json.scope,
    channel,
    obtained_at: new Date().toISOString(),
  });
  console.log(
    `✓ YouTube authorized for channel "${channel?.title}" (${channel?.id}) → ${rel(secretPath(YT_TOKEN))}`,
  );
  console.log(
    "  Tip: put YOUTUBE_CHANNEL_ID=" +
      (channel?.id ?? "…") +
      " in .secrets/publish.env so uploads refuse any other channel.",
  );
}

async function whichChannel(token) {
  const r = await quiet.request({
    step: "read the authorized channel",
    method: "GET",
    url: "https://www.googleapis.com/youtube/v3/channels",
    query: { part: "snippet", mine: "true" },
    headers: { Authorization: `Bearer ${token}` },
  });
  const c = r.json.items?.[0];
  return c ? { id: c.id, title: c.snippet.title } : null;
}

async function askHidden(question) {
  if (!process.stdin.isTTY)
    throw new Error(
      "run this in your own terminal (it asks for the token with hidden input)",
    );
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  let muted = false;
  rl._writeToOutput = (s) => muted || process.stdout.write(s);
  const answer = rl.question(question);
  muted = true;
  const value = await answer;
  rl.close();
  process.stdout.write("\n");
  return value.trim();
}

async function authMeta() {
  const appId = env("META_APP_ID");
  const appSecret = env("META_APP_SECRET");
  if (!appId || !appSecret)
    throw new Error(
      "set META_APP_ID and META_APP_SECRET in .secrets/publish.env first (docs/PUBLISHING.md → Meta)",
    );
  const graph = `https://graph.facebook.com/${graphVersion()}`;
  const short = await askHidden(
    "Paste the short-lived User token from Graph API Explorer (input hidden): ",
  );
  if (!short) throw new Error("no token entered");

  const ll = await quiet.request({
    step: "exchange for a long-lived user token",
    method: "GET",
    url: `${graph}/oauth/access_token`,
    query: {
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: short,
    },
  });
  const userToken = ll.json.access_token;
  const scopes = await grantedScopes(graph, userToken, `${appId}|${appSecret}`);
  const missing = META_SCOPES.filter((s) => !scopes.includes(s));
  if (missing.length)
    console.log(
      `⚠ token is missing permissions: ${missing.join(", ")} — re-generate it with those ticked`,
    );

  const pages = await quiet.request({
    step: "list your Pages",
    method: "GET",
    url: `${graph}/me/accounts`,
    query: {
      fields: "id,name,access_token,instagram_business_account{id,username}",
      access_token: userToken,
    },
  });
  const list = pages.json.data ?? [];
  const want = env("META_PAGE_ID");
  const page = want
    ? list.find((p) => p.id === want)
    : list.length === 1
      ? list[0]
      : null;
  if (!page) {
    console.log("Pages this token can manage:");
    for (const p of list)
      console.log(
        `  ${p.id}  ${p.name}  IG: ${p.instagram_business_account?.username ?? "— not linked"}`,
      );
    throw new Error(
      want
        ? `META_PAGE_ID ${want} is not among them`
        : "set META_PAGE_ID in .secrets/publish.env to one of these and run again",
    );
  }
  const ig = page.instagram_business_account;
  if (!ig)
    console.log(
      `⚠ Page "${page.name}" has no linked Instagram professional account — link it, then run again`,
    );
  writeSecret(META_TOKEN, {
    page_id: page.id,
    page_name: page.name,
    page_token: page.access_token,
    ig_user_id: ig?.id ?? null,
    ig_username: ig?.username ?? null,
    scopes,
    obtained_at: new Date().toISOString(),
  });
  console.log(
    `✓ Meta authorized: Page "${page.name}" (${page.id}), Instagram @${ig?.username ?? "—"} → ${rel(secretPath(META_TOKEN))}`,
  );
  console.log(
    "  Page tokens made from a long-lived user token do not expire unless revoked (password change, app removed).",
  );
}

async function grantedScopes(graph, token, appToken) {
  const dbg = await quiet.request({
    step: "inspect the token",
    method: "GET",
    url: `${graph}/debug_token`,
    query: { input_token: token, access_token: appToken },
  });
  return dbg.json.data?.scopes ?? [];
}

async function authCheck() {
  console.log("YouTube");
  try {
    const creds = youtubeCreds(false);
    const ch = await whichChannel(await accessToken(quiet, creds));
    console.log(`  ✓ channel "${ch?.title}" (${ch?.id})`);
  } catch (e) {
    console.log(`  ✗ ${e.message}`);
  }
  console.log("Meta");
  try {
    const c = metaCreds(false, ["page_access_token", "page_id", "ig_user_id"]);
    const graph = `https://graph.facebook.com/${graphVersion()}`;
    const get = (id, fields) =>
      quiet.request({
        step: `read ${id}`,
        method: "GET",
        url: `${graph}/${id}`,
        query: { fields, access_token: c.page_access_token },
      });
    console.log(
      `  ✓ Page "${(await get(c.page_id, "name")).json.name}" (${c.page_id})`,
    );
    console.log(
      `  ✓ Instagram @${(await get(c.ig_user_id, "username")).json.username} (${c.ig_user_id})`,
    );
    const limit = await get(
      `${c.ig_user_id}/content_publishing_limit`,
      "quota_usage,config",
    );
    const l = limit.json.data?.[0];
    if (l)
      console.log(
        `  ✓ Instagram API posts in the last 24 h: ${l.quota_usage}/${l.config?.quota_total ?? "?"}`,
      );
    const saved = readSecret(META_TOKEN);
    if (saved?.scopes) {
      const missing = META_SCOPES.filter((s) => !saved.scopes.includes(s));
      console.log(
        missing.length
          ? `  ⚠ missing permissions: ${missing.join(", ")}`
          : "  ✓ all required permissions granted",
      );
    }
  } catch (e) {
    console.log(`  ✗ ${e.message}`);
  }
}
