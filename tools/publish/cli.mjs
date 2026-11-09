#!/usr/bin/env node
// Review-gated publishing for rendered episodes. See docs/PUBLISHING.md.
//   prepare <ep|--all> [--force] [--if-missing]  generate content/publish/<ep>.yaml (status: draft)
//   approve <ep> [--revoke]                       show everything, ask, then pin the approval
//   publish <ep> [--platform p] [--dry-run]       upload to the approved platforms (idempotent)
//   status                                        one line per episode
//   auth youtube|meta|check                       one-time credential setup (runs in your terminal)
import os from "node:os";
import readline from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { listEpisodes, resolveEpisode } from "./lib/episodes.mjs";
import { rel } from "./lib/env.mjs";
import { makeClient } from "./lib/http.mjs";
import {
  generate,
  loadDefaults,
  metadataHash,
  PLATFORMS,
  validate,
} from "./lib/metadata.mjs";
import {
  createPublishFile,
  memoryStore,
  openPublishFile,
} from "./lib/store.mjs";
import { probeVideo, sha256File, uploadCopy, videoPath } from "./lib/video.mjs";
import * as youtube from "./platforms/youtube.mjs";
import * as instagram from "./platforms/instagram.mjs";
import * as facebook from "./platforms/facebook.mjs";

const UPLOADERS = { youtube, instagram, facebook };

/** Posted by the publisher, or uploaded by hand and marked `manual: true` in results. */
const isDone = (p, doc) =>
  Boolean(doc.results?.[p]?.manual) ||
  UPLOADERS[p].isDone(doc.results?.[p], doc);

function parseArgs(argv) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      flags[k] =
        v ??
        (argv[i + 1] && !argv[i + 1].startsWith("--") && k === "platform"
          ? argv[++i]
          : true);
    } else pos.push(a);
  }
  return { flags, pos };
}

// ── prepare ──────────────────────────────────────────────────────────────────

function prepareOne(arg, flags) {
  const { key, sheet, publishFile } = resolveEpisode(arg);
  const existing = openPublishFile(publishFile);
  if (existing) {
    const d = existing.data;
    if (flags["if-missing"]) {
      console.log(
        `• ${key}: ${rel(publishFile)} exists (status: ${d.status}) — left as is`,
      );
      if (d.status === "approved") {
        console.log(
          "  a new render changes the video fingerprint: run `npm run publish:approve -- " +
            key +
            "` again",
        );
      }
      return;
    }
    const posted = Object.entries(d.results ?? {})
      .filter(([, r]) => r && Object.keys(r).length)
      .map(([p]) => p);
    if (posted.length) {
      throw new Error(
        `${key}: already sent to ${posted.join(", ")} — edit ${rel(publishFile)} by hand instead`,
      );
    }
    if (!flags.force) {
      throw new Error(
        `${key}: ${rel(publishFile)} exists (status: ${d.status}) — pass --force to regenerate it as a draft`,
      );
    }
  }
  if (!sheet?.video)
    throw new Error(
      `${key}: the episode sheet has no "**Render:** … → \`out/….mp4\`" line`,
    );
  const meta = generate(sheet, loadDefaults());
  const store = createPublishFile(publishFile, {
    episode: key,
    title: sheet.title,
    status: "draft",
    video: sheet.video,
    platforms: [...PLATFORMS],
    ...meta,
    approval: null,
    results: {},
  });
  const video = probeVideo(videoPath(store.data));
  const { errors, warnings } = validate(store.data, video);
  console.log(`✓ ${key}: wrote ${rel(publishFile)} (status: draft)`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
  for (const e of errors) console.log(`  ✗ ${e}`);
}

// ── review / gate ────────────────────────────────────────────────────────────

function check(store) {
  const d = store.data;
  const file = videoPath(d);
  const video = probeVideo(file);
  const sha = video ? sha256File(file) : null;
  const { errors, warnings } = validate(d, video);
  const blockers = [...errors];
  if (d.status !== "approved" && d.status !== "published") {
    blockers.unshift(
      `status is "${d.status}" — run \`npm run publish:approve -- ${d.episode}\` after reviewing`,
    );
  } else if (d.approval) {
    if (d.approval.video_sha256 !== sha)
      blockers.push(
        "the video changed since approval (re-rendered?) — approve again",
      );
    if (d.approval.metadata_sha256 !== metadataHash(d))
      blockers.push("the metadata was edited since approval — approve again");
  } else {
    warnings.push(
      "approved by editing the file: later edits or re-renders cannot be detected (use publish:approve)",
    );
  }
  return { video, sha, errors, warnings, blockers };
}

function printReview(store, c) {
  const d = store.data;
  const bar = "─".repeat(72);
  console.log(
    `\n${bar}\n${d.episode} — ${d.title}   status: ${d.status}   file: ${rel(store.file)}\n${bar}`,
  );
  if (c.video) {
    const v = c.video;
    console.log(
      `VIDEO  ${d.video}  ${v.width}×${v.height} ${v.fps} fps ${v.vcodec}/${v.acodec}  ${v.duration}s  ` +
        `${(v.size / 1e6).toFixed(1)} MB  rendered ${v.mtime}\n       sha256 ${c.sha}`,
    );
  }
  const block = (label, text) => {
    console.log(`\n${label}`);
    for (const l of String(text ?? "").split("\n")) console.log(`  │ ${l}`);
  };
  if (d.platforms.includes("youtube")) {
    const y = d.youtube;
    console.log("\n▶ YOUTUBE SHORTS");
    block("title", y.title);
    block("description", y.description);
    block("tags", y.tags.join(", "));
    console.log(
      `\ncategory ${y.category} · privacy ${y.privacy} · made for kids ${y.made_for_kids} · ` +
        `synthetic ${y.synthetic_media} · playlists: ${y.playlists.join(" · ")}`,
    );
  }
  if (d.platforms.includes("instagram")) {
    const i = d.instagram;
    console.log("\n▶ INSTAGRAM REELS");
    block("caption", i.caption);
    block("alt text (set in app)", i.alt_text ?? "—");
    console.log(
      `\ncover frame ${i.cover_frame_s}s · share to feed ${i.share_to_feed}`,
    );
  }
  if (d.platforms.includes("facebook")) {
    console.log("\n▶ FACEBOOK PAGE REELS");
    block("title", d.facebook.title);
    block("description", d.facebook.description);
  }
  console.log("");
  for (const w of c.warnings) console.log(`⚠ ${w}`);
  for (const e of c.errors) console.log(`✗ ${e}`);
}

async function approve(arg, flags) {
  const { publishFile } = resolveEpisode(arg);
  const store = openPublishFile(publishFile);
  if (!store)
    throw new Error(
      `no ${rel(publishFile)} — run \`npm run publish:prepare -- ${arg}\` first`,
    );
  if (flags.revoke) {
    store.set(["status"], "draft");
    store.set(["approval"], null);
    console.log(`✓ ${store.data.episode}: approval revoked (status: draft)`);
    return;
  }
  const c = check(store);
  printReview(store, c);
  if (c.errors.length)
    throw new Error(
      "fix the errors above (edit the file or the episode brief), then approve again",
    );
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      "approval is interactive on purpose — run it yourself in a terminal (or set `status: approved` by hand)",
    );
  }
  const d = store.data;
  const word = d.episode.slice(0, 4);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(
    `Approve publishing ${d.episode} to ${d.platforms.join(", ")} exactly as shown? Type "${word}" to approve: `,
  );
  rl.close();
  if (answer.trim().toLowerCase() !== word) {
    console.log("Not approved — nothing changed.");
    return;
  }
  store.set(["status"], "approved");
  store.set(["approval"], {
    by: os.userInfo().username,
    at: new Date().toISOString(),
    platforms: d.platforms,
    video_sha256: c.sha,
    metadata_sha256: metadataHash(store.data),
  });
  console.log(
    `✓ approved. Publish with: npm run publish -- ${d.episode}   (preview: add --dry-run)`,
  );
}

// ── publish ──────────────────────────────────────────────────────────────────

async function publish(arg, flags, deps = {}) {
  const dryRun = Boolean(flags["dry-run"]);
  const { publishFile } = resolveEpisode(arg);
  const real = openPublishFile(publishFile);
  if (!real)
    throw new Error(
      `no ${rel(publishFile)} — run \`npm run publish:prepare -- ${arg}\` first`,
    );
  const d = real.data;
  const only = flags.platform ? String(flags.platform).split(",") : null;
  for (const p of only ?? []) {
    if (!d.platforms.includes(p))
      throw new Error(
        `--platform ${p}: not in this episode's platforms (${d.platforms.join(", ")})`,
      );
  }
  const targets = d.platforms.filter((p) => !only || only.includes(p));

  const c = check(real);
  for (const w of c.warnings) console.log(`⚠ ${w}`);
  if (c.blockers.length) {
    console.log(
      `\n${dryRun ? "GATE (a real run would stop here)" : "BLOCKED — nothing was sent"}:`,
    );
    for (const b of c.blockers) console.log(`  ✗ ${b}`);
    if (!dryRun) process.exitCode = 1;
    if (!dryRun || !c.video) return { blocked: true, failed: [] };
  } else
    console.log(
      `\nGATE: open — ${d.episode} approved${d.approval ? ` by ${d.approval.by} at ${d.approval.at}` : ""}`,
    );

  const store = dryRun ? memoryStore(d) : real;
  const upload = uploadCopy(videoPath(d), c.sha);
  const size = probeVideo(upload.file).size;
  console.log(
    `upload file: ${rel(upload.file)} (${size} bytes)${upload.remuxed ? ` — faststart remux of ${d.video}, no re-encode` : ""}`,
  );
  if (dryRun)
    console.log(
      "DRY RUN — these are the exact requests, in order; nothing is sent and the file is not changed.",
    );

  const client = makeClient({ dryRun, fetchImpl: deps.fetch });
  const sleep = dryRun
    ? async () => {}
    : (deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))));
  // In a dry run the uploaders' success lines describe what *would* happen.
  const log = dryRun
    ? (m) => console.log(m.replace(/^ {2}✓ (\w+)/, "  ⇢ would be $1"))
    : console.log;
  const failed = [];
  for (const p of targets) {
    const results = store.data.results?.[p] ?? {};
    console.log(`\n▶ ${p.toUpperCase()}`);
    if (isDone(p, store.data)) {
      console.log(
        `  ✓ already published${results.manual ? " (by hand)" : ""}${results.url ? `: ${results.url}` : ""} — skipped`,
      );
      continue;
    }
    try {
      await UPLOADERS[p].publish({
        client,
        doc: store.data,
        results,
        save: (patch) => store.patchResults(p, patch),
        upload: { file: upload.file, size },
        log,
        sleep,
      });
    } catch (e) {
      failed.push(p);
      store.patchResults(p, {
        last_error: e.message,
        last_error_at: new Date().toISOString(),
      });
      console.log(`  ✗ ${e.message}`);
    }
  }
  if (!dryRun) {
    const after = store.data;
    if (after.platforms.every((p) => isDone(p, after)))
      store.set(["status"], "published");
    for (const p of targets)
      if (!failed.includes(p))
        store.set(["results", p, "last_error"], undefined);
  }
  if (failed.length) {
    process.exitCode = 1;
    console.log(
      `\n✗ failed: ${failed.join(", ")} — fix the cause and re-run; finished platforms are skipped.`,
    );
  } else
    console.log(
      dryRun
        ? "\nDry run complete."
        : `\n✓ done — results recorded in ${rel(publishFile)}`,
    );
  return { blocked: false, failed };
}

// ── status ───────────────────────────────────────────────────────────────────

function status() {
  for (const e of listEpisodes()) {
    const { publishFile } = resolveEpisode(e.key);
    const store = openPublishFile(publishFile);
    if (!store) {
      console.log(
        `${e.key.padEnd(26)} —            (no publish file: npm run publish:prepare -- ${e.key})`,
      );
      continue;
    }
    const d = store.data;
    const c = check(store);
    const plat = d.platforms
      .map((p) => `${p} ${isDone(p, d) ? "✓" : (d.results?.[p]?.state ?? "·")}`)
      .join("  ");
    const gate = c.blockers.length ? `blocked: ${c.blockers[0]}` : "ready";
    console.log(
      `${e.key.padEnd(26)} ${String(d.status).padEnd(12)} ${plat}   ${d.status === "published" ? "" : gate}`,
    );
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

export async function main(argv, deps) {
  const [cmd, ...rest] = argv;
  const { flags, pos } = parseArgs(rest);
  switch (cmd) {
    case "prepare": {
      const targets = flags.all ? listEpisodes().map((e) => e.key) : pos;
      if (!targets.length)
        throw new Error("usage: npm run publish:prepare -- <episode> | --all");
      for (const t of targets) prepareOne(t, flags);
      return;
    }
    case "approve":
      return approve(pos[0], flags);
    case "publish":
      return publish(pos[0], flags, deps);
    case "status":
      return status();
    case "auth":
      return (await import("./auth.mjs")).auth(pos[0], flags);
    default:
      console.log(
        "usage: cli.mjs prepare|approve|publish|status|auth …  (see docs/PUBLISHING.md)",
      );
      process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(`✗ ${e.message}`);
    process.exitCode = 1;
  });
}
