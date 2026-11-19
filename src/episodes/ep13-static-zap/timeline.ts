import manifest from "../../../public/voices/ep13-final/manifest.json";
import rendered from "../../../tools/blender/ep13_times.json";

// Ep 13 — Why Door Handles ZAP You. One principle: static electricity (charge builds up by rubbing, then
// jumps to a conductor as a spark). Narrated short in the realistic Blender look: the picture is rendered in
// Blender (tools/blender/ep13_shots.py) from the beat times in tools/blender/ep13_times.json, and composited here
// with captions, the voice, sound effects and music. All times in seconds.
//
// The picture's timing is LOCKED to that json (it is what Blender rendered). The narration (ElevenLabs, in
// public/voices/ep13-eleven/) is fitted to it by tools/audio/ep13_fit_voice.py, which trims pauses, speeds lines up
// ≤ 10 % (pitch kept) and pins "all at once" to the spark and "The spark hits the key" to the key spark.

type Line = keyof typeof manifest;

export const LINES = Object.fromEntries(
  (Object.keys(manifest) as Line[]).map((id) => [id, { at: manifest[id].at, seconds: manifest[id].seconds, text: manifest[id].text, file: manifest[id].file }]),
);

const C = rendered.CUE;
export const BEAT = {
  wide: C.wide,
  macro: C.macro,
  hop: C.hop,
  climb: C.climb,
  hair: C.hair,
  door: C.door,
  reach: C.reach,
  spark: C.spark,
  slowEnd: C.slowEnd,
  recoil: C.recoil,
  facepalm: C.facepalm,
  newtShuffle: C.newtShuffle,
  keySpark: C.keySpark,
  gagShuffle: C.gagShuffle,
  gagZap: C.gagZap,
  card: C.card,
};
export const END = C.end;
export const DURATION = C.dur;
export const FPS = C.fps;

// The physics the frames must show (checked values, see the episode sheet)
export const PHYS = {
  volts: 10000, // walking on carpet in dry air: ~2–35 kV; 10 kV is a typical value
  gapMM: 3, // air breaks down at ~3 kV per mm, so 10 kV jumps ~3 mm
};

// Same values as tools/blender/ep13_times.json (what Blender rendered)
export const CUE = { ...BEAT, end: END, dur: DURATION, fps: FPS };
