// YouTube Data API v3: refresh the OAuth token, resumable videos.insert, then playlistItems.insert.
// Idempotent: a finished upload is never repeated; an upload interrupted after YouTube accepted it
// is found again in the channel's uploads by title instead of being uploaded twice.
import { YT_CATEGORIES } from "../lib/metadata.mjs";
import { youtubeCreds } from "../lib/creds.mjs";

const API = "https://www.googleapis.com/youtube/v3";
const UPLOAD = "https://www.googleapis.com/upload/youtube/v3/videos";
export const YT_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube",
];

export const isDone = (r, doc) =>
  Boolean(r?.id) &&
  doc.youtube.playlists.every((p) => (r.playlists ?? []).includes(p));

export async function accessToken(client, creds) {
  const res = await client
    .request({
      step: "Refresh the OAuth access token",
      method: "POST",
      url: "https://oauth2.googleapis.com/token",
      form: {
        grant_type: "refresh_token",
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        refresh_token: creds.refresh_token,
      },
      dry: { json: { access_token: "<YOUTUBE_ACCESS_TOKEN>" } },
    })
    .catch((e) => {
      if (/invalid_grant/.test(e.message)) {
        e.message +=
          " — the refresh token expired or was revoked; run `npm run publish:auth -- youtube` again";
      }
      throw e;
    });
  return res.json.access_token;
}

export async function publish({ client, doc, results, save, upload, log }) {
  const y = doc.youtube;
  const creds = youtubeCreds(client.dryRun);
  if (creds.missing.length)
    log(`  ⚠ credentials not set up yet: ${creds.missing.join(", ")}`);
  if (
    creds.expectedChannelId &&
    creds.channel?.id &&
    creds.channel.id !== creds.expectedChannelId
  ) {
    throw new Error(
      `authorized channel ${creds.channel.title} (${creds.channel.id}) is not YOUTUBE_CHANNEL_ID ${creds.expectedChannelId}`,
    );
  }
  const token = await accessToken(client, creds);
  const auth = { Authorization: `Bearer ${token}` };
  let videoId = results.id;

  if (!videoId && results.state === "uploading") {
    videoId = await findUpload(client, auth, y.title, results.started_at);
    if (videoId) {
      log(`  ↺ found the interrupted upload on the channel: ${videoId}`);
      save({
        id: videoId,
        url: `https://youtube.com/shorts/${videoId}`,
        uploaded_at: new Date().toISOString(),
      });
    }
  }

  if (!videoId) {
    save({ state: "uploading", started_at: new Date().toISOString() });
    const init = await client.request({
      step: "Start a resumable upload (videos.insert) with the metadata",
      method: "POST",
      url: UPLOAD,
      query: { uploadType: "resumable", part: "snippet,status" },
      headers: {
        ...auth,
        "X-Upload-Content-Length": upload.size,
        "X-Upload-Content-Type": "video/mp4",
      },
      json: {
        snippet: {
          title: y.title,
          description: y.description,
          tags: y.tags,
          categoryId: YT_CATEGORIES[y.category],
          defaultLanguage: y.language,
        },
        status: {
          privacyStatus: y.privacy,
          selfDeclaredMadeForKids: y.made_for_kids,
          containsSyntheticMedia: y.synthetic_media,
          embeddable: true,
          license: "youtube",
        },
      },
      dry: {
        headers: {
          location: `${UPLOAD}?uploadType=resumable&upload_id=<SESSION>`,
        },
      },
    });
    const session = init.headers.get("location");
    if (!session)
      throw new Error("videos.insert: no upload session URL in the response");
    const put = await client.request({
      step: "Upload the video bytes",
      method: "PUT",
      url: session,
      headers: {
        ...auth,
        "Content-Type": "video/mp4",
        "Content-Length": upload.size,
      },
      file: { path: upload.file, size: upload.size },
      dry: {
        json: {
          id: "<VIDEO_ID>",
          status: { uploadStatus: "uploaded", privacyStatus: y.privacy },
        },
      },
    });
    videoId = put.json.id;
    if (!videoId)
      throw new Error(
        `upload finished without a video id: ${JSON.stringify(put.json).slice(0, 300)}`,
      );
    const privacy = put.json.status?.privacyStatus;
    save({
      id: videoId,
      url: `https://youtube.com/shorts/${videoId}`,
      uploaded_at: new Date().toISOString(),
      privacy,
      state: "uploaded",
    });
    if (privacy && privacy !== y.privacy) {
      log(
        `  ⚠ YouTube set the video to "${privacy}", not "${y.privacy}". Uploads from an API project that hasn't passed` +
          ' the YouTube API audit are locked private — see docs/PUBLISHING.md → "Private-only uploads".',
      );
    }
  }

  const done = new Set(results.playlists ?? []);
  const todo = y.playlists.filter((p) => !done.has(p));
  if (todo.length) {
    const list = await client.request({
      step: "Look up the channel playlists",
      method: "GET",
      url: `${API}/playlists`,
      query: { part: "snippet", mine: "true", maxResults: 50 },
      headers: auth,
      dry: {
        json: {
          items: todo.map((t, i) => ({
            id: `<PLAYLIST_ID_${i + 1}>`,
            snippet: { title: t },
          })),
        },
      },
    });
    const byTitle = new Map(
      (list.json.items ?? []).map((p) => [p.snippet.title, p.id]),
    );
    for (const title of todo) {
      const playlistId = byTitle.get(title);
      if (!playlistId) {
        log(
          `  ⚠ playlist "${title}" not found on the channel — create it in YouTube Studio and run publish again`,
        );
        continue;
      }
      await client.request({
        step: `Add to playlist "${title}"`,
        method: "POST",
        url: `${API}/playlistItems`,
        query: { part: "snippet" },
        headers: auth,
        json: {
          snippet: {
            playlistId,
            resourceId: { kind: "youtube#video", videoId },
          },
        },
      });
      done.add(title);
      save({ playlists: [...done] });
    }
  }
  const complete = y.playlists.every((p) => done.has(p));
  save({
    state: complete ? "published" : "uploaded",
    ...(complete ? { published_at: new Date().toISOString() } : {}),
  });
  log(
    `  ✓ ${complete ? "published" : "uploaded (playlists pending)"}: https://youtube.com/shorts/${videoId}`,
  );
  log(`  ℹ ${y.cover_note}`);
}

async function findUpload(client, auth, title, startedAt) {
  const ch = await client.request({
    step: "Find the uploads playlist (checking for an interrupted upload)",
    method: "GET",
    url: `${API}/channels`,
    query: { part: "contentDetails", mine: "true" },
    headers: auth,
    dry: {
      json: {
        items: [
          { contentDetails: { relatedPlaylists: { uploads: "<UPLOADS>" } } },
        ],
      },
    },
  });
  const uploads = ch.json.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return null;
  const items = await client.request({
    step: "List the latest uploads",
    method: "GET",
    url: `${API}/playlistItems`,
    query: { part: "snippet", playlistId: uploads, maxResults: 20 },
    headers: auth,
    dry: { json: { items: [] } },
  });
  const since = Date.parse(startedAt ?? 0) - 60_000;
  const hit = (items.json.items ?? []).find(
    (i) =>
      i.snippet.title === title && Date.parse(i.snippet.publishedAt) >= since,
  );
  return hit?.snippet.resourceId.videoId ?? null;
}
