import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, OffthreadVideo, staticFile, useVideoConfig } from "remotion";
import times from "../../../tools/blender/s03_times.json";

// Short s03 — Why Your Laptop Gets So HOT When Rendering. Picture: Blender (tools/blender/s03_*.py, rendered on the
// Mac and on Modal with identical settings) → tools/render/s03_picture.py → public/renders/s03.mp4. No text on screen
// (user rule: the narration carries the words). This layer: Liam's narration (ElevenLabs, take 2, which the word
// timings in public/voices/s03/words.json and the shot times were cut to) and the generated sounds, each laid at 0 s on
// the video clock (tools/sfx/s03_laptop.py places every cue inside its file). Levels (measured): voice ≈ −25 LUFS,
// score ≈ −41 (soft, far under the voice), fan bed ≈ −39, action sounds ≈ −33 to −38 while they play; the master is
// then loudness-normalised to −14 LUFS, true peak −2 dB.

export const S03_DURATION = times.DUR;
const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

export const HotLaptop: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <OffthreadVideo src={staticFile("renders/s03.mp4")} muted />
      <Audio name="Narration (Liam)" src={staticFile("voices/s03/liam_take2.mp3")} from={Math.round(times.VO_OFFSET * fps)} volume={1.0} />
      <Audio name="Score" src={sfx("s03-score")} volume={0.28} />
      <Audio name="Typing" src={sfx("s03-typing")} volume={0.7} />
      <Audio name="Fan" src={sfx("s03-fan")} volume={0.45} />
      <Audio name="Dive whooshes" src={sfx("s03-dive")} volume={0.62} />
      <Audio name="Switching crackle" src={sfx("s03-micro")} volume={0.9} />
      <Audio name="Thermal camera" src={sfx("s03-thermal")} volume={0.7} />
      <Audio name="Heat-pipe vapour" src={sfx("s03-vapour")} volume={0.7} />
      <Audio name="Touch the hot deck" src={sfx("s03-touch")} volume={0.72} />
    </AbsoluteFill>
  );
};
