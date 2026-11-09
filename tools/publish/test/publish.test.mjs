// Offline tests: metadata limits, the approval gate, and full publish runs against a fake
// YouTube/Meta API (an injected fetch) — no credentials, no network, never the real publish files.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "publish-test-"));
process.env.PUBLISH_SECRETS_DIR = path.join(tmp, "secrets");
process.env.YOUTUBE_CLIENT_SECRET_FILE = path.join(
  tmp,
  "secrets/youtube-client.json",
);
process.env.META_PAGE_TOKEN = "test-page-token";
process.env.META_PAGE_ID = "111";
process.env.IG_USER_ID = "222";
delete process.env.IG_VIDEO_BASE_URL;
delete process.env.YOUTUBE_CHANNEL_ID;
fs.mkdirSync(process.env.PUBLISH_SECRETS_DIR, { recursive: true });
fs.writeFileSync(
  process.env.YOUTUBE_CLIENT_SECRET_FILE,
  JSON.stringify({ installed: { client_id: "cid", client_secret: "csecret" } }),
);
fs.writeFileSync(
  path.join(tmp, "secrets/youtube-token.json"),
  JSON.stringify({ refresh_token: "test-refresh" }),
);

const { main } = await import("../cli.mjs");
const { listEpisodes, readSheet } = await import("../lib/episodes.mjs");
const { generate, validate, metadataHash, ytTagChars } =
  await import("../lib/metadata.mjs");
const { openPublishFile } = await import("../lib/store.mjs");
const { probeVideo, sha256File, videoPath } = await import("../lib/video.mjs");
const { PUBLISH_DIR } = await import("../lib/env.mjs");

const EP = "ep01-the-button";
const source = path.join(PUBLISH_DIR, `${EP}.yaml`);
const haveVideo =
  fs.existsSync(source) && probeVideo(videoPath(openPublishFile(source).data));
const file = path.join(tmp, `${EP}.yaml`);

/** A fake of the three APIs; `calls` records "METHOD host/path" for every request. */
function fakeApis(opts = {}) {
  const calls = [];
  const json = (body, init = {}) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
      ...init,
    });
  let igPolls = 0;
  const fetch = async (url, init) => {
    const u = new URL(url);
    const key = `${init.method} ${u.host}${u.pathname}`;
    calls.push(key);
    if (opts.fail?.test(key))
      return json({ error: { message: "boom" } }, { status: 500 });
    if (key === "POST oauth2.googleapis.com/token")
      return json({ access_token: "yt-access" });
    if (key === "POST www.googleapis.com/upload/youtube/v3/videos") {
      return new Response("", {
        status: 200,
        headers: {
          location:
            "https://www.googleapis.com/upload/youtube/v3/videos?upload_id=S1",
        },
      });
    }
    if (key === "PUT www.googleapis.com/upload/youtube/v3/videos") {
      assert.equal(init.body.length, Number(init.headers["Content-Length"]));
      return json({
        id: "yt123",
        status: { uploadStatus: "uploaded", privacyStatus: "public" },
      });
    }
    if (key === "GET www.googleapis.com/youtube/v3/playlists") {
      return json({
        items: (
          opts.playlists ?? ["Dash & Newt — All Episodes", "Dash's Worst Ideas"]
        ).map((t, i) => ({ id: `PL${i}`, snippet: { title: t } })),
      });
    }
    if (key === "POST www.googleapis.com/youtube/v3/playlistItems")
      return json({ id: "item" });
    if (key === "GET www.googleapis.com/youtube/v3/channels")
      return json({
        items: [{ contentDetails: { relatedPlaylists: { uploads: "UU1" } } }],
      });
    if (key === "GET www.googleapis.com/youtube/v3/playlistItems") {
      return json({ items: opts.ytUploads ?? [] });
    }
    // Instagram
    if (key === "POST graph.facebook.com/v26.0/222/media") {
      const form = new URLSearchParams(init.body);
      assert.equal(form.get("media_type"), "REELS");
      assert.equal(form.get("upload_type"), "resumable");
      assert.equal(form.get("thumb_offset"), "3300");
      return json({
        id: "C1",
        uri: "https://rupload.facebook.com/ig-api-upload/v26.0/C1",
      });
    }
    if (key === "POST rupload.facebook.com/ig-api-upload/v26.0/C1") {
      assert.equal(init.headers.Authorization, "OAuth test-page-token");
      return json({ success: true });
    }
    if (key === "GET graph.facebook.com/v26.0/C1") {
      igPolls += 1;
      return json({
        status_code:
          opts.containerStatus ?? (igPolls < 2 ? "IN_PROGRESS" : "FINISHED"),
      });
    }
    if (key === "POST graph.facebook.com/v26.0/222/media_publish")
      return json({ id: "IG9" });
    if (key === "GET graph.facebook.com/v26.0/IG9")
      return json({
        id: "IG9",
        permalink: "https://www.instagram.com/reel/abc/",
        timestamp: "2026-11-03T10:00:00+0000",
      });
    if (key === "GET graph.facebook.com/v26.0/222/media")
      return json({ data: opts.igRecent ?? [] });
    // Facebook
    if (key === "POST graph.facebook.com/v26.0/111/video_reels") {
      const phase = new URLSearchParams(init.body).get("upload_phase");
      return json(
        phase === "start"
          ? {
              video_id: "V1",
              upload_url: "https://rupload.facebook.com/video-upload/V1",
            }
          : { success: true },
      );
    }
    if (key === "POST rupload.facebook.com/video-upload/v26.0/V1") {
      calls.push(`  offset=${init.headers.offset}`);
      return json({ success: true });
    }
    if (key === "GET graph.facebook.com/v26.0/V1") {
      if (u.searchParams.get("fields") === "status") {
        return json({
          status: opts.fbStatus ?? {
            video_status: "ready",
            uploading_phase: { status: "complete" },
            publishing_phase: {
              status: "complete",
              publish_status: "published",
            },
          },
        });
      }
      return json({
        permalink_url: "/reel/V1",
        created_time: "2026-11-03T10:00:00+0000",
      });
    }
    throw new Error(`unexpected request ${key}`);
  };
  return { fetch, calls };
}

const quietly = async (fn) => {
  const log = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = log;
    process.exitCode = 0;
  }
};
const run = (argv, deps) =>
  quietly(() => main(argv, { sleep: async () => {}, ...deps }));
const data = () => openPublishFile(file).data;

function approveFile() {
  const s = openPublishFile(file);
  s.set(["status"], "approved");
  s.set(["approval"], {
    by: "test",
    at: new Date().toISOString(),
    video_sha256: sha256File(videoPath(s.data)),
    metadata_sha256: metadataHash(s.data),
  });
}

describe("metadata", () => {
  for (const ep of listEpisodes()) {
    test(`${ep.key}: generated copy fits every platform`, () => {
      const meta = generate(readSheet(ep.file));
      const doc = {
        video: ep.video,
        platforms: ["youtube", "instagram", "facebook"],
        ...meta,
      };
      const { errors } = validate(doc, {
        width: 1080,
        height: 1920,
        fps: 30,
        duration: ep.length ?? 40,
        size: 1e7,
      });
      assert.deepEqual(errors, []);
      assert.match(meta.youtube.title, /\| Dash & Newt #Shorts$/);
      assert.ok([...meta.youtube.title].length <= 100);
      assert.ok(ytTagChars(meta.youtube.tags) <= 500);
      assert.equal(meta.instagram.caption.match(/#\w+/g).length, 5);
      assert.ok(meta.instagram.caption.includes("📌 Moral:"));
      assert.ok(meta.facebook.description.match(/#\w+/g).length <= 3);
    });
  }
  test("limits are enforced", () => {
    const doc = {
      video: "x.mp4",
      platforms: ["youtube", "instagram"],
      youtube: {
        title: "x".repeat(101),
        description: "a <b>",
        tags: Array(60).fill("stick figure"),
        category: "Comedy",
        privacy: "public",
        made_for_kids: false,
      },
      instagram: { caption: "y".repeat(2201), cover_frame_s: 99 },
    };
    const { errors } = validate(doc, {
      width: 1080,
      height: 1920,
      fps: 30,
      duration: 40,
      size: 1e7,
    });
    assert.equal(errors.length, 5, errors.join("\n"));
  });
});

describe(
  "publishing",
  {
    skip:
      !haveVideo && "render out/the-button.mp4 and run publish:prepare first",
  },
  () => {
    before(() => fs.mkdirSync(tmp, { recursive: true }));
    beforeEach(() => fs.copyFileSync(source, file));
    after(() => fs.rmSync(tmp, { recursive: true, force: true }));

    test("a draft is never uploaded", async () => {
      const api = fakeApis();
      const r = await run(["publish", file], api);
      assert.equal(r.blocked, true);
      assert.deepEqual(api.calls, []);
      assert.equal(data().status, "draft");
    });

    test("a dry run sends nothing and changes nothing", async () => {
      approveFile();
      const before = fs.readFileSync(file, "utf8");
      const api = fakeApis();
      await run(["publish", file, "--dry-run"], api);
      assert.deepEqual(api.calls, []);
      assert.equal(fs.readFileSync(file, "utf8"), before);
    });

    test("editing after approval blocks publishing", async () => {
      approveFile();
      openPublishFile(file).set(
        ["youtube", "title"],
        "Changed after approval | Dash & Newt #Shorts",
      );
      const api = fakeApis();
      const r = await run(["publish", file], api);
      assert.equal(r.blocked, true);
      assert.deepEqual(api.calls, []);
    });

    test("approved → publishes everywhere, records results, re-run posts nothing", async () => {
      approveFile();
      const api = fakeApis();
      const r = await run(["publish", file], api);
      assert.deepEqual(r.failed, []);
      const d = data();
      assert.equal(d.status, "published");
      assert.equal(d.results.youtube.id, "yt123");
      assert.deepEqual(d.results.youtube.playlists, [
        "Dash & Newt — All Episodes",
        "Dash's Worst Ideas",
      ]);
      assert.equal(d.results.instagram.media_id, "IG9");
      assert.equal(
        d.results.instagram.url,
        "https://www.instagram.com/reel/abc/",
      );
      assert.equal(d.results.facebook.url, "https://www.facebook.com/reel/V1");
      assert.equal(
        api.calls.filter((c) => c.startsWith("PUT www.googleapis.com/upload"))
          .length,
        1,
      );
      assert.equal(
        api.calls.filter((c) => c.endsWith("/media_publish")).length,
        1,
      );

      const again = fakeApis();
      await run(["publish", file], again);
      assert.deepEqual(again.calls, []);
    });

    test("one platform failing does not block or repeat the others", async () => {
      approveFile();
      const first = fakeApis({ fail: /media_publish/ });
      const r = await run(["publish", file], first);
      assert.deepEqual(r.failed, ["instagram"]);
      assert.equal(data().status, "approved");
      assert.match(data().results.instagram.last_error, /boom/);

      const second = fakeApis({ containerStatus: "FINISHED" });
      await run(["publish", file], second);
      assert.deepEqual(second.calls, [
        "GET graph.facebook.com/v26.0/C1",
        "POST graph.facebook.com/v26.0/222/media_publish",
        "GET graph.facebook.com/v26.0/IG9",
      ]);
      assert.equal(data().status, "published");
      assert.equal(data().results.instagram.last_error, undefined);
    });

    test("a crash after Instagram published is recovered without posting twice", async () => {
      approveFile();
      const s = openPublishFile(file);
      s.patchResults("instagram", { container_id: "C1", state: "publishing" });
      const api = fakeApis({
        containerStatus: "PUBLISHED",
        igRecent: [
          {
            id: "IG7",
            caption: s.data.instagram.caption,
            permalink: "https://www.instagram.com/reel/x/",
          },
        ],
      });
      await run(["publish", file, "--platform", "instagram"], api);
      assert.equal(data().results.instagram.media_id, "IG7");
      assert.ok(
        !api.calls.some((c) => c.endsWith("/media") && c.startsWith("POST")),
      );
      assert.ok(!api.calls.some((c) => c.endsWith("/media_publish")));
    });

    test("a crash after the YouTube upload finished is recovered from the channel", async () => {
      approveFile();
      const s = openPublishFile(file);
      const startedAt = new Date().toISOString();
      s.patchResults("youtube", { state: "uploading", started_at: startedAt });
      const api = fakeApis({
        ytUploads: [
          {
            snippet: {
              title: s.data.youtube.title,
              publishedAt: startedAt,
              resourceId: { videoId: "ytOLD" },
            },
          },
        ],
      });
      await run(["publish", file, "--platform", "youtube"], api);
      assert.equal(data().results.youtube.id, "ytOLD");
      assert.ok(!api.calls.some((c) => c.startsWith("PUT")));
    });

    test("an interrupted Facebook upload resumes at the transferred offset", async () => {
      approveFile();
      openPublishFile(file).patchResults("facebook", {
        video_id: "V1",
        state: "uploading",
      });
      const api = fakeApis({
        fbStatus: {
          video_status: "uploading",
          uploading_phase: { status: "in_progress", bytes_transfered: 4096 },
          publishing_phase: { status: "not_started" },
        },
      });
      // The fake keeps answering "uploading", so the run ends in the poll timeout — but it must
      // have resumed at 4096 and never started a second reel.
      await run(["publish", file, "--platform", "facebook"], api);
      assert.ok(api.calls.includes("  offset=4096"));
      assert.ok(
        api.calls.filter(
          (c) => c === "POST graph.facebook.com/v26.0/111/video_reels",
        ).length === 1,
      ); // finish only
    });

    test("a missing playlist leaves YouTube pending, then completes on re-run", async () => {
      approveFile();
      await run(
        ["publish", file, "--platform", "youtube"],
        fakeApis({ playlists: ["Dash & Newt — All Episodes"] }),
      );
      assert.equal(data().results.youtube.state, "uploaded");
      const api = fakeApis();
      await run(["publish", file, "--platform", "youtube"], api);
      assert.equal(data().results.youtube.state, "published");
      assert.ok(!api.calls.some((c) => c.startsWith("PUT")));
      assert.equal(
        api.calls.filter(
          (c) => c === "POST www.googleapis.com/youtube/v3/playlistItems",
        ).length,
        1,
      );
    });

    test("platforms uploaded by hand (manual: true) are never posted again", async () => {
      const s = openPublishFile(file);
      for (const p of ["youtube", "facebook"]) {
        s.patchResults(p, { state: "published", manual: true, url: null });
      }
      approveFile();
      const api = fakeApis();
      await run(["publish", file], api);
      assert.ok(
        api.calls.every(
          (c) =>
            c.includes("facebook.com/v26.0/222") ||
            c.includes("C1") ||
            c.includes("IG9"),
        ),
      );
      assert.equal(data().results.instagram.media_id, "IG9");
      assert.equal(data().status, "published");
    });

    test("approve refuses to run without a terminal", async () => {
      await assert.rejects(
        quietly(() => main(["approve", file])),
        /interactive/,
      );
      assert.equal(data().status, "draft");
    });
  },
);
