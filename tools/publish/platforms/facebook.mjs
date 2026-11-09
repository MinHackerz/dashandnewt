// Facebook Page Reels (Graph API video_reels): start → upload the local file to
// rupload.facebook.com → finish with video_state=PUBLISHED → poll until published.
// Idempotent: the video id is recorded at "start", so a re-run resumes that reel.
import { graphVersion } from "../lib/env.mjs";
import { metaCreds } from "../lib/creds.mjs";

export const isDone = (r) => r?.state === "published" && Boolean(r.video_id);

const POLL_MS = 15_000;
const POLL_MAX = 40;
const doneish = (s) => s === "complete" || s === "completed";

export async function publish({
  client,
  doc,
  results,
  save,
  upload,
  log,
  sleep,
}) {
  const f = doc.facebook;
  const creds = metaCreds(client.dryRun, ["page_access_token", "page_id"]);
  if (creds.missing.length)
    log(`  ⚠ credentials not set up yet: ${creds.missing.join(", ")}`);
  const graph = `https://graph.facebook.com/${graphVersion()}`;
  const token = creds.page_access_token;
  const page = creds.page_id;
  const status = (step, dry) =>
    client
      .request({
        step,
        method: "GET",
        url: `${graph}/${videoId}`,
        query: { fields: "status", access_token: token },
        dry: { json: { status: dry } },
      })
      .then((r) => r.json.status ?? {});

  let videoId = results.video_id;
  let offset = 0;
  let needUpload = true;
  let needFinish = true;
  if (videoId) {
    const s = await status("Check the existing reel", {});
    const publish = s.publishing_phase?.publish_status;
    log(
      `  ↺ existing reel ${videoId}: ${s.video_status ?? "?"}, publish ${publish ?? s.publishing_phase?.status ?? "?"}`,
    );
    if (["error", "expired", "upload_failed"].includes(s.video_status))
      videoId = null;
    else {
      needUpload = !doneish(s.uploading_phase?.status);
      offset = needUpload
        ? Number(s.uploading_phase?.bytes_transfered ?? 0)
        : 0;
      // Re-sending "finish" for the same video id can't create a second post; skip it once Meta has it.
      const phase = s.publishing_phase?.status;
      needFinish = !(
        publish === "published" ||
        publish === "scheduled" ||
        phase === "in_progress" ||
        doneish(phase)
      );
    }
  }

  if (!videoId) {
    const start = await client.request({
      step: "Start a Reels upload session",
      method: "POST",
      url: `${graph}/${page}/video_reels`,
      form: { upload_phase: "start", access_token: token },
      dry: {
        json: {
          video_id: "<VIDEO_ID>",
          upload_url: `https://rupload.facebook.com/video-upload/${graphVersion()}/<VIDEO_ID>`,
        },
      },
    });
    videoId = start.json.video_id;
    save({
      video_id: videoId,
      state: "uploading",
      started_at: new Date().toISOString(),
    });
  }

  if (needUpload) {
    await client.request({
      step: offset
        ? `Resume the upload at byte ${offset}`
        : "Upload the video bytes",
      method: "POST",
      url: `https://rupload.facebook.com/video-upload/${graphVersion()}/${videoId}`,
      headers: {
        Authorization: `OAuth ${token}`,
        offset,
        file_size: upload.size,
        "Content-Type": "application/octet-stream",
      },
      file: { path: upload.file, size: upload.size },
      dry: { json: { success: true } },
    });
  }

  if (needFinish) {
    save({ state: "finishing" });
    await client.request({
      step: "Finish and publish the reel",
      method: "POST",
      url: `${graph}/${page}/video_reels`,
      form: {
        upload_phase: "finish",
        video_id: videoId,
        video_state: "PUBLISHED",
        title: f.title,
        description: f.description,
        access_token: token,
      },
      dry: { json: { success: true } },
    });
  }

  for (let n = 0; ; n++) {
    if (n >= POLL_MAX)
      throw new Error(
        `reel ${videoId} still processing after ~10 min — re-run publish later`,
      );
    if (n > 0) await sleep(POLL_MS);
    const s = await status("Wait until the reel is published", {
      video_status: "ready",
      publishing_phase: { status: "complete", publish_status: "published" },
    });
    const err =
      s.processing_phase?.error ??
      s.publishing_phase?.error ??
      s.uploading_phase?.errors;
    if (
      s.video_status === "error" ||
      s.publishing_phase?.status === "error" ||
      s.publishing_phase?.publish_status === "error"
    ) {
      save({ state: "failed" });
      throw new Error(
        `reel ${videoId} failed: ${JSON.stringify(err ?? s).slice(0, 300)}`,
      );
    }
    if (
      s.publishing_phase?.publish_status === "published" ||
      doneish(s.publishing_phase?.status)
    )
      break;
  }

  const info = await client.request({
    step: "Read the permalink",
    method: "GET",
    url: `${graph}/${videoId}`,
    query: { fields: "permalink_url,created_time", access_token: token },
    dry: { json: { permalink_url: "/reel/<VIDEO_ID>" } },
  });
  const link = info.json.permalink_url ?? `/reel/${videoId}`;
  const url = link.startsWith("http")
    ? link
    : `https://www.facebook.com${link}`;
  save({
    url,
    published_at: info.json.created_time ?? new Date().toISOString(),
    state: "published",
  });
  log(`  ✓ published: ${url}`);
}
