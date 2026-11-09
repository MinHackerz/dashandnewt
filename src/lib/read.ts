// Reading time for on-screen text (chalk notes, formulas). It is written on at WRITE s per character
// (the eye follows the chalk), then held so it can be read again at ~3.5 words per second; a formula
// gets extra time to sink in. Symbols alone don't count as words.
export const WRITE = 0.055;
export const readTime = (line: string, write = WRITE) => {
  const words = line.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
  return line.length * write + Math.max(1.1, words / 3.5) + (/[=÷×²√<>]/.test(line) ? 0.8 : 0);
};
