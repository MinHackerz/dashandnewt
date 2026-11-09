// Platform metadata: generated from an episode sheet's Publish brief + channel defaults,
// validated against each platform's limits, and fingerprinted for the approval gate.
import crypto from "node:crypto";
import fs from "node:fs";
import YAML from "yaml";
import { CHANNEL_DEFAULTS } from "./env.mjs";

export const PLATFORMS = ["youtube", "instagram", "facebook"];
export const YT_CATEGORIES = {
  "Film & Animation": "1",
  Comedy: "23",
  Entertainment: "24",
  Education: "27",
};

export function loadDefaults() {
  return YAML.parse(fs.readFileSync(CHANNEL_DEFAULTS, "utf8"));
}

const chars = (s) => [...(s ?? "")].length;
const hashtag = (h) =>
  "#" + String(h).replace(/^#/, "").replace(/\s+/g, "").toLowerCase();
const uniq = (xs) => [
  ...new Map(xs.map((x) => [String(x).toLowerCase(), x])).values(),
];
const paragraphs = (xs) =>
  (Array.isArray(xs) ? xs : [xs])
    .filter(Boolean)
    .map((s) => String(s).trim())
    .join("\n\n");

/** YouTube counts the tag list like the Studio field: quoted if it has a space, comma-separated. */
export function ytTagChars(tags) {
  return (
    tags.reduce((n, t) => n + chars(t) + (/\s/.test(t) ? 2 : 0), 0) +
    Math.max(0, tags.length - 1)
  );
}

function fitTags(tags, budget = 500) {
  const out = [];
  for (const t of uniq(tags.map((t) => String(t).trim()).filter(Boolean))) {
    if (ytTagChars([...out, t]) <= budget) out.push(t);
  }
  return out;
}

export function generate(sheet, defaults = loadDefaults()) {
  const b = sheet.brief;
  if (!b) {
    throw new Error(
      `${sheet.key}: no "## Publish brief" yaml block in the episode sheet — add one (see docs/PUBLISHING.md).`,
    );
  }
  for (const k of ["hook", "story", "question"]) {
    if (!b[k]) throw new Error(`${sheet.key}: Publish brief is missing "${k}"`);
  }
  const ig = b.instagram ?? {};
  const moral = b.moral ?? sheet.moral;
  const moralLine = moral ? `📌 Moral: ${moral}` : null;
  const yt = defaults.youtube;
  const topic = (b.hashtags ?? []).map(hashtag);

  const ytHashtags = uniq([...yt.hashtags.map(hashtag), ...topic]).slice(0, 5);
  const youtube = {
    title: `${b.hook}${yt.title_suffix}`,
    description: [
      paragraphs(b.story),
      b.question,
      moralLine,
      yt.footer,
      ytHashtags.join(" "),
    ]
      .filter(Boolean)
      .join("\n\n"),
    tags: fitTags([...yt.tags, ...(b.keywords ?? [])]),
    category: yt.category,
    playlists: uniq(["all", ...(b.playlists ?? [])]).map(
      (k) => yt.playlists[k] ?? k,
    ),
    privacy: yt.privacy,
    made_for_kids: yt.made_for_kids,
    synthetic_media: yt.synthetic_media,
    language: yt.language,
    cover_note: `Shorts covers can't be set through the API — pick the frame at ~${b.cover_s ?? 0}s in the YouTube app.`,
  };

  const igTags = (ig.hashtags ?? []).map(hashtag);
  const instagram = {
    caption: [
      ig.hook ?? b.hook,
      paragraphs(ig.story ?? b.story),
      ig.question ?? b.question,
      [ig.tag_friend, defaults.instagram.follow].filter(Boolean).join("\n"),
      moralLine,
      igTags.join(" "),
    ]
      .filter(Boolean)
      .join("\n\n"),
    cover_frame_s: b.cover_s ?? 0,
    alt_text: ig.alt_text ?? null,
    share_to_feed: defaults.instagram.share_to_feed,
  };

  const fb = defaults.facebook;
  const fbTags = uniq([
    ...topic.slice(0, 1),
    ...fb.hashtags.map(hashtag),
  ]).slice(0, 3);
  const facebook = {
    title: b.hook,
    description: [
      paragraphs(b.story),
      b.question,
      moralLine,
      fb.footer,
      fbTags.join(" "),
    ]
      .filter(Boolean)
      .join("\n\n"),
  };

  return { youtube, instagram, facebook };
}

/** Errors block approval/publishing; warnings are shown at review. `video` is probeVideo() output or null. */
export function validate(doc, video) {
  const errors = [];
  const warnings = [];
  const platforms = doc.platforms ?? [];
  for (const p of platforms)
    if (!PLATFORMS.includes(p)) errors.push(`platforms: unknown "${p}"`);

  if (!video) errors.push(`video: ${doc.video} not found — render it first`);
  else {
    if (video.width * 16 !== video.height * 9)
      errors.push(`video: ${video.width}×${video.height} is not 9:16`);
    if (video.duration < 3)
      errors.push(`video: ${video.duration}s is shorter than 3 s`);
    if (platforms.includes("facebook") && video.duration > 90)
      errors.push("video: Facebook Reels max 90 s");
    if (platforms.includes("youtube") && video.duration > 180)
      errors.push("video: Shorts max 3 min");
    if (video.fps < 23 || video.fps > 60)
      errors.push(`video: ${video.fps} fps (Reels need 23–60)`);
    if (video.size > 300 * 1024 * 1024)
      errors.push("video: over 300 MB (Instagram limit)");
  }

  if (platforms.includes("youtube")) {
    const y = doc.youtube ?? {};
    if (!y.title) errors.push("youtube.title: empty");
    if (chars(y.title) > 100)
      errors.push(`youtube.title: ${chars(y.title)} chars (max 100)`);
    else if (chars(y.title) > 70)
      warnings.push(
        `youtube.title: ${chars(y.title)} chars — may be cut off in feeds`,
      );
    if (y.title && !/#shorts/i.test(y.title + y.description))
      warnings.push("youtube: no #Shorts in title/description");
    for (const k of ["title", "description"]) {
      if (/[<>]/.test(y[k] ?? ""))
        errors.push(`youtube.${k}: YouTube rejects "<" and ">"`);
    }
    if (Buffer.byteLength(y.description ?? "") > 5000)
      errors.push("youtube.description: over 5000 bytes");
    const tagChars = ytTagChars(y.tags ?? []);
    if (tagChars > 500)
      errors.push(`youtube.tags: ${tagChars} chars (max 500)`);
    if (!YT_CATEGORIES[y.category]) {
      errors.push(
        `youtube.category: "${y.category}" — use one of ${Object.keys(YT_CATEGORIES).join(", ")}`,
      );
    }
    if (!["public", "unlisted", "private"].includes(y.privacy))
      errors.push("youtube.privacy: public|unlisted|private");
    if (typeof y.made_for_kids !== "boolean")
      errors.push("youtube.made_for_kids: must be true or false");
    const hashtags = (y.description ?? "").match(/#[\p{L}\p{N}_]+/gu) ?? [];
    if (hashtags.length > 15)
      errors.push(
        "youtube.description: more than 15 hashtags (YouTube ignores all of them)",
      );
  }

  if (platforms.includes("instagram")) {
    const i = doc.instagram ?? {};
    if (!i.caption) errors.push("instagram.caption: empty");
    if (chars(i.caption) > 2200)
      errors.push(`instagram.caption: ${chars(i.caption)} chars (max 2200)`);
    const tags = (i.caption ?? "").match(/#[\p{L}\p{N}_]+/gu) ?? [];
    if (tags.length > 30)
      errors.push(`instagram.caption: ${tags.length} hashtags (max 30)`);
    else if (tags.length !== 5)
      warnings.push(
        `instagram.caption: ${tags.length} hashtags — house style is 5 specific ones`,
      );
    if (((i.caption ?? "").match(/@\w+/g) ?? []).length > 20)
      errors.push("instagram.caption: more than 20 @mentions");
    if (video && !(i.cover_frame_s >= 0 && i.cover_frame_s < video.duration)) {
      errors.push(
        `instagram.cover_frame_s: ${i.cover_frame_s}s is outside the ${video.duration}s video`,
      );
    }
    if (!i.alt_text)
      warnings.push(
        "instagram.alt_text: missing (add it in the app after posting)",
      );
  }

  if (platforms.includes("facebook")) {
    const f = doc.facebook ?? {};
    if (!f.description) errors.push("facebook.description: empty");
    if (chars(f.title) > 255) errors.push("facebook.title: over 255 chars");
  }
  return { errors, warnings };
}

/** Hash of everything that would be sent, so edits after approval invalidate it. */
export function metadataHash(doc) {
  const pick = { video: doc.video, platforms: doc.platforms };
  for (const p of PLATFORMS) pick[p] = doc[p];
  return crypto.createHash("sha256").update(stableJson(pick)).digest("hex");
}

function stableJson(v) {
  if (Array.isArray(v)) return `[${v.map(stableJson).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson(v[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}
