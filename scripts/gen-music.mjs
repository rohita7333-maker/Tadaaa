// Generates placeholder soundtrack beds as 16-bit mono WAVs in public/music.
// Dev-only: run `node scripts/gen-music.mjs` once. Each file is a gentle
// synth chord loop standing in for a licensed track of the same id.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RATE = 22050;
const SECONDS = 12;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "music");
mkdirSync(ROOT, { recursive: true });

// Each track: chord progression as arrays of frequencies, one chord per bar.
const TRACKS = {
  "warm-keys": { bars: [[261.63, 329.63, 392.0], [220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 246.94, 293.66]], wave: "sine" },
  "paper-lanterns": { bars: [[293.66, 369.99, 440.0], [329.63, 415.3, 493.88], [246.94, 311.13, 369.99], [293.66, 369.99, 440.0]], wave: "pluck" },
  "slow-waltz": { bars: [[246.94, 311.13, 369.99], [207.65, 261.63, 311.13], [185.0, 233.08, 277.18], [207.65, 261.63, 311.13]], wave: "sine" },
  "golden-hour": { bars: [[220.0, 277.18, 329.63, 415.3], [196.0, 246.94, 293.66, 369.99], [174.61, 220.0, 261.63, 329.63], [196.0, 246.94, 293.66, 369.99]], wave: "sine" },
};

function render(bars, wave) {
  const n = RATE * SECONDS;
  const out = new Float64Array(n);
  const barLen = n / bars.length;
  for (let b = 0; b < bars.length; b++) {
    const freqs = bars[b];
    for (let i = 0; i < barLen; i++) {
      const t = i / RATE;
      const idx = b * barLen + i;
      // Per-bar envelope: soft attack, long release; pluck decays faster.
      const pos = i / barLen;
      const env = wave === "pluck" ? Math.exp(-pos * 4) : Math.min(pos * 8, 1) * (1 - pos * 0.55);
      let s = 0;
      for (const f of freqs) s += Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * f * 2 * t);
      out[idx] += (s / (freqs.length * 1.25)) * env * 0.5;
    }
  }
  // Gentle loop fade at both ends.
  const fade = RATE * 0.4;
  for (let i = 0; i < fade; i++) {
    out[i] *= i / fade;
    out[n - 1 - i] *= i / fade;
  }
  return out;
}

function toWav(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buf;
}

for (const [id, spec] of Object.entries(TRACKS)) {
  const wav = toWav(render(spec.bars, spec.wave));
  writeFileSync(join(ROOT, id + ".wav"), wav);
  console.log("wrote", id + ".wav", Math.round(wav.length / 1024) + "KB");
}
