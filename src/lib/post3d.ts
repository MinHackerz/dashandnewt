import { useEffect, useState } from "react";
import { continueRender, delayRender, useCurrentFrame } from "remotion";
import { useThree } from "@react-three/fiber";
import type { EffectComposer } from "postprocessing";

// @react-three/postprocessing builds its composer in a passive effect, one commit after <ThreeCanvas>
// has already advanced the frame. That advance skips R3F's own render (the composer owns rendering)
// while the composer is still null, so rendered stills/videos come out blank.
// Use inside <ThreeCanvas>: <EffectComposer ref={useComposerReady()}>. Holds the frame until the
// composer exists, then advances again.
export const useComposerReady = () => {
  const frame = useCurrentFrame();
  const { advance } = useThree();
  const [composer, setComposer] = useState<EffectComposer | null>(null);
  const [hold] = useState(() => delayRender("post composer"));
  useEffect(() => {
    if (!composer) return;
    advance(performance.now());
    continueRender(hold);
  }, [composer, frame, advance, hold]);
  return setComposer;
};
