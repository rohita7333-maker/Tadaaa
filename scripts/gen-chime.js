#!/usr/bin/env node
/**
 * gen-chime.js — synthesizes the Scroll Story reveal chime as a WAV, no deps.
 *
 * A soft sine arpeggio (C5 E5 G5 B5 — a Cmaj7 shape) with per-note decay
 * envelopes, low amplitude, and a short cross-fade at the loop boundary so
 * expo-audio's `loop = true` repeats it without a click. Mono, 22050 Hz,
 * 16-bit PCM, ~2.5 s — comfortably under the 300 KB budget (~108 KB).
 *
 * Run:  node scripts/gen-chime.js   → assets/audio/chime.wav
 */
const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 22050;
const DURATION_SEC = 2.5;
const AMPLITUDE = 0.15; // gentle, sits under narration/ambient noise
const NOTES = [523.25, 659.25, 783.99, 987.77]; // C5 E5 G5 B5 (Cmaj7)
const LOOP_FADE_SEC = 0.06; // cross-fade window at head/tail for a clickless loop

const totalSamples = Math.floor(SAMPLE_RATE * DURATION_SEC);
const noteSamples = Math.floor(totalSamples / NOTES.length);
const floats = new Float32Array(totalSamples);

// Per-note: pluck-like attack + exponential decay so notes ring and overlap.
for (let n = 0; n < NOTES.length; n++) {
  const freq = NOTES[n];
  const start = n * noteSamples;
  // Let each note ring past its slot into the next for an overlapping arpeggio.
  const ring = Math.min(totalSamples - start, noteSamples * 2);
  for (let i = 0; i < ring; i++) {
    const t = i / SAMPLE_RATE;
    const attack = Math.min(1, t / 0.008); // ~8 ms fade-in, no click
    const decay = Math.exp(-t * 3.2); // smooth exponential tail
    const sample = Math.sin(2 * Math.PI * freq * t) * attack * decay;
    floats[start + i] += sample;
  }
}

// Normalize the summed voices back to the target amplitude ceiling.
let peak = 0;
for (let i = 0; i < totalSamples; i++) peak = Math.max(peak, Math.abs(floats[i]));
const scale = peak > 0 ? AMPLITUDE / peak : AMPLITUDE;
for (let i = 0; i < totalSamples; i++) floats[i] *= scale;

// Cross-fade the tail into the head so the loop point is seamless.
const fadeSamples = Math.floor(SAMPLE_RATE * LOOP_FADE_SEC);
for (let i = 0; i < fadeSamples; i++) {
  const g = i / fadeSamples; // 0 → 1 across the head
  const head = floats[i];
  const tail = floats[totalSamples - fadeSamples + i];
  floats[i] = head * g + tail * (1 - g);
}

// --- Encode 16-bit PCM mono WAV ---
const bytesPerSample = 2;
const dataSize = totalSamples * bytesPerSample;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16); // fmt chunk size
buffer.writeUInt16LE(1, 20); // PCM
buffer.writeUInt16LE(1, 22); // mono
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28); // byte rate
buffer.writeUInt16LE(bytesPerSample, 32); // block align
buffer.writeUInt16LE(16, 34); // bits per sample
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

for (let i = 0; i < totalSamples; i++) {
  const clamped = Math.max(-1, Math.min(1, floats[i]));
  buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * bytesPerSample);
}

const outDir = path.join(__dirname, "..", "assets", "audio");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "chime.wav");
fs.writeFileSync(outPath, buffer);

console.log(
  `Wrote ${outPath} (${(buffer.length / 1024).toFixed(1)} KB, ${DURATION_SEC}s, ${SAMPLE_RATE}Hz mono 16-bit)`
);
