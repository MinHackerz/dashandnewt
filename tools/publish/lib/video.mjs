// Local checks on the rendered file: probe, fingerprint, and a "faststart" copy for upload
// (Instagram requires the moov atom before the media data; render output has it at the end).
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CACHE_DIR, ROOT } from "./env.mjs";

export function videoPath(doc) {
  return path.resolve(ROOT, doc.video);
}

export function probeVideo(file) {
  if (!fs.existsSync(file)) return null;
  const out = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "stream=codec_type,codec_name,width,height,r_frame_rate:format=duration",
      "-of",
      "json",
      file,
    ],
    { encoding: "utf8" },
  );
  const j = JSON.parse(out);
  const v = j.streams.find((s) => s.codec_type === "video") ?? {};
  const a = j.streams.find((s) => s.codec_type === "audio");
  const [num, den] = (v.r_frame_rate ?? "0/1").split("/").map(Number);
  const stat = fs.statSync(file);
  return {
    file,
    width: v.width,
    height: v.height,
    fps: Math.round((num / den) * 100) / 100,
    vcodec: v.codec_name,
    acodec: a?.codec_name ?? null,
    duration: Math.round(Number(j.format.duration) * 1000) / 1000,
    size: stat.size,
    mtime: stat.mtime.toISOString(),
  };
}

export function sha256File(file) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}

/** Top-level MP4 box order, e.g. ['ftyp', 'free', 'mdat', 'moov']. */
function topLevelBoxes(file) {
  const fd = fs.openSync(file, "r");
  const size = fs.fstatSync(fd).size;
  const head = Buffer.alloc(16);
  const boxes = [];
  try {
    for (let pos = 0; pos + 8 <= size && boxes.length < 64; ) {
      fs.readSync(fd, head, 0, 16, pos);
      let len = head.readUInt32BE(0);
      if (len === 1) len = Number(head.readBigUInt64BE(8));
      else if (len === 0) len = size - pos;
      boxes.push(head.toString("latin1", 4, 8));
      if (len < 8) break;
      pos += len;
    }
  } finally {
    fs.closeSync(fd);
  }
  return boxes;
}

/** Returns the file to upload: the original if it is already faststart, else a cached remux (no re-encode). */
export function uploadCopy(file, sha) {
  const boxes = topLevelBoxes(file);
  if (boxes.indexOf("moov") < boxes.indexOf("mdat"))
    return { file, remuxed: false };
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const out = path.join(
    CACHE_DIR,
    `${path.basename(file, ".mp4")}.${sha.slice(0, 12)}.mp4`,
  );
  if (!fs.existsSync(out)) {
    const tmp = `${out}.tmp.mp4`;
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-y",
      "-i",
      file,
      "-map",
      "0",
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      tmp,
    ]);
    fs.renameSync(tmp, out);
  }
  return { file: out, remuxed: true };
}
