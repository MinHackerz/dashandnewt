// Instagram Graph API (Instagram API with Facebook Login for Business): Reels container →
// resumable upload of the local file to rupload.facebook.com → poll → media_publish.
// No public hosting needed. Optional: IG_VIDEO_BASE_URL makes Meta fetch the file from YOUR host.
// Idempotent: the container id is recorded first, so a re-run resumes it instead of posting twice.
import path from "node:path";
import { env, graphVersion } from "../lib/env.mjs";
import { metaCreds } from "../lib/creds.mjs";

export const isDone = (r) => Boolean(r?.media_id);

const POLL_MS = 15_000;
const POLL_MAX = 40; // ≈10 minutes

export async function publish({
  client,
  doc,
  results,
  save,
  upload,
  log,
  sleep,
}) {
  const i = doc.instagram;
  const creds = metaCreds(client.dryRun, ["page_access_token", "ig_user_id"]);
  if (creds.missing.length)
    log(`  ⚠ credentials not set up yet: ${creds.missing.join(", ")}`);
  const graph = `https://graph.facebook.com/${graphVersion()}`;
  const token = creds.page_access_token;
  const ig = creds.ig_user_id;
  const get = (step, id, fields, dry) =>
    client.request({
      step,
      method: "GET",
      url: `${graph}/${id}`,
      query: { fields, access_token: token },
      dry: { json: dry },
    });

  let container = results.container_id;
  let status = null;
  if (container) {
    status = (
      await get(
        "Check the existing container",
        container,
        "status_code,status",
        {},
      )
    ).json.status_code;
    log(`  ↺ existing container ${container}: ${status}`);
    if (status === "PUBLISHED")
      return recordPublished(
        await findMedia(),
        "found the already-published reel",
      );
    if (status === "ERROR" || status === "EXPIRED") container = null;
  }

  if (!container) {
    const hosted = env("IG_VIDEO_BASE_URL");
    const res = await client.request({
      step: hosted
        ? "Create the Reels container (Meta fetches video_url from your host)"
        : "Create a resumable Reels container",
      method: "POST",
      url: `${graph}/${ig}/media`,
      form: {
        media_type: "REELS",
        ...(hosted
          ? {
              video_url: `${hosted.replace(/\/$/, "")}/${path.basename(upload.file)}`,
              share_to_feed: i.share_to_feed,
            }
          : { upload_type: "resumable" }),
        caption: i.caption,
        thumb_offset: Math.round(i.cover_frame_s * 1000),
        access_token: token,
      },
      dry: {
        json: {
          id: "<CONTAINER_ID>",
          uri: `https://rupload.facebook.com/ig-api-upload/${graphVersion()}/<CONTAINER_ID>`,
        },
      },
    });
    container = res.json.id;
    save({
      container_id: container,
      state: "uploading",
      started_at: new Date().toISOString(),
    });
    if (!hosted) {
      await client.request({
        step: "Upload the video bytes (resumable)",
        method: "POST",
        url:
          res.json.uri ??
          `https://rupload.facebook.com/ig-api-upload/${graphVersion()}/${container}`,
        headers: {
          Authorization: `OAuth ${token}`,
          offset: 0,
          file_size: upload.size,
        },
        file: { path: upload.file, size: upload.size },
        dry: { json: { success: true } },
      });
    }
    status = "IN_PROGRESS";
  }

  for (let n = 0; status !== "FINISHED"; n++) {
    if (status === "ERROR" || status === "EXPIRED") {
      save({ state: "failed" });
      throw new Error(
        `container ${container} is ${status} — re-run publish to start a fresh container`,
      );
    }
    if (n >= POLL_MAX)
      throw new Error(
        `container ${container} still ${status} after ~10 min — re-run publish later`,
      );
    if (n > 0) await sleep(POLL_MS);
    const s = await get(
      "Wait for Instagram to process the video",
      container,
      "status_code,status",
      {
        status_code: "FINISHED",
      },
    );
    status = s.json.status_code;
    if (status === "ERROR") log(`  ✗ ${s.json.status ?? ""}`);
  }

  save({ state: "publishing" });
  const pub = await client.request({
    step: "Publish the reel (media_publish)",
    method: "POST",
    url: `${graph}/${ig}/media_publish`,
    form: { creation_id: container, access_token: token },
    dry: { json: { id: "<IG_MEDIA_ID>" } },
  });
  save({ media_id: pub.json.id });
  const media = await get(
    "Read the permalink",
    pub.json.id,
    "id,permalink,timestamp",
    {
      id: "<IG_MEDIA_ID>",
      permalink: "https://www.instagram.com/reel/<SHORTCODE>/",
    },
  );
  return recordPublished(media.json, "published");

  async function findMedia() {
    const recent = await client.request({
      step: "Find the published reel among recent posts",
      method: "GET",
      url: `${graph}/${ig}/media`,
      query: {
        fields: "id,caption,permalink,timestamp",
        limit: 25,
        access_token: token,
      },
    });
    const hit = (recent.json.data ?? []).find(
      (m) => (m.caption ?? "").trim() === i.caption.trim(),
    );
    if (!hit) {
      throw new Error(
        `container ${container} says PUBLISHED but no recent post has this caption — check the profile and record ` +
          "results.instagram.media_id by hand",
      );
    }
    return hit;
  }

  function recordPublished(media, verb) {
    save({
      media_id: media.id,
      url: media.permalink ?? null,
      published_at: media.timestamp ?? new Date().toISOString(),
      state: "published",
    });
    log(`  ✓ ${verb}: ${media.permalink ?? media.id}`);
    if (i.alt_text)
      log(
        "  ℹ the API can't set alt text on Reels — add instagram.alt_text in the app if it offers the field",
      );
  }
}
