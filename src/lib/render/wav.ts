export type WavRenderOptions = {
  sampleRate: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function floatToInt16(f: number) {
  const c = clamp(f, -1, 1);
  return c < 0 ? Math.round(c * 32768) : Math.round(c * 32767);
}

function writeAscii(view: DataView, offset: number, s: string) {
  for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
}

export function encodeWavMono16(samples: Float32Array, opts: WavRenderOptions): Uint8Array {
  const sampleRate = opts.sampleRate;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");

  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let o = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(o, floatToInt16(samples[i]), true);
    o += 2;
  }

  return new Uint8Array(buffer);
}

