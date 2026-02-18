import type { Blueprint } from "@/lib/blueprint/schema";
import type { HookMidiResult, TrackNotes } from "@/lib/producer/hookMidi";
import { encodeWavMono16 } from "@/lib/render/wav";

type RenderStemResult = {
  wavBase64: string;
  durationSec: number;
  sampleRate: number;
  peak: number;
};

export type HookRenderResult = {
  mixdown: RenderStemResult;
  stems: {
    drums: RenderStemResult;
    bass: RenderStemResult;
    chords: RenderStemResult;
    lead: RenderStemResult;
  };
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function midiToHz(m: number) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function softClip(x: number) {
  // gentle saturation, deterministic
  return Math.tanh(x * 1.25);
}

function addEnvelope(out: Float32Array, sr: number, startSec: number, durSec: number, gen: (t: number) => number) {
  const start = Math.max(0, Math.floor(startSec * sr));
  const end = Math.min(out.length, Math.floor((startSec + durSec) * sr));
  const attack = Math.min(0.01, durSec * 0.2);
  const release = Math.min(0.08, durSec * 0.6);
  for (let i = start; i < end; i++) {
    const t = (i - start) / sr;
    const total = durSec;
    const a = attack > 0 ? clamp(t / attack, 0, 1) : 1;
    const r = release > 0 ? clamp((total - t) / release, 0, 1) : 1;
    const env = a * r;
    out[i] += gen(t) * env;
  }
}

function renderDrums(sr: number, durationSec: number, notes: TrackNotes["notes"]): Float32Array {
  const out = new Float32Array(Math.ceil(durationSec * sr));

  // Deterministic LCG noise
  let nz = 0x12345678;
  const noise = () => {
    nz = (Math.imul(nz, 1664525) + 1013904223) | 0;
    return ((nz >>> 0) / 4294967296) * 2 - 1;
  };

  for (const n of notes) {
    const t0 = n.time;
    if (n.midi === 36 || n.midi === 35) {
      // kick: pitch drop sine
      addEnvelope(out, sr, t0, 0.12, (t) => {
        const f = 90 * Math.pow(0.12, t / 0.12) + 40;
        return Math.sin(2 * Math.PI * f * t) * 1.2;
      });
    } else if (n.midi === 39 || n.midi === 38) {
      // clap: bursty noise
      addEnvelope(out, sr, t0, 0.08, (t) => noise() * (t < 0.012 ? 1 : 0.55));
      addEnvelope(out, sr, t0 + 0.015, 0.05, (t) => noise() * 0.35);
    } else if (n.midi === 42 || n.midi === 44 || n.midi === 46) {
      // hat: short bright noise
      addEnvelope(out, sr, t0, 0.03, () => noise() * 0.35);
    }
  }

  return out;
}

function renderMonoSynth(sr: number, durationSec: number, notes: TrackNotes["notes"], wave: "sine" | "saw"): Float32Array {
  const out = new Float32Array(Math.ceil(durationSec * sr));
  for (const n of notes) {
    const f = midiToHz(n.midi);
    addEnvelope(out, sr, n.time, n.duration, (t) => {
      const ph = 2 * Math.PI * f * t;
      const s = wave === "sine" ? Math.sin(ph) : 2 * (t * f - Math.floor(0.5 + t * f)); // naive saw
      return s * (n.velocity ?? 0.8);
    });
  }
  return out;
}

function renderPoly(sr: number, durationSec: number, notes: TrackNotes["notes"]): Float32Array {
  const out = new Float32Array(Math.ceil(durationSec * sr));
  for (const n of notes) {
    const f = midiToHz(n.midi);
    addEnvelope(out, sr, n.time, n.duration, (t) => {
      const x = t * f;
      const saw = 2 * (x - Math.floor(0.5 + x));
      const tri = 2 * Math.abs(2 * (x - Math.floor(x + 0.5))) - 1;
      return (0.6 * saw + 0.4 * tri) * (n.velocity ?? 0.6);
    });
  }
  return out;
}

function applyOnePoleLowpass(samples: Float32Array, sr: number, cutoffHz: number) {
  const c = clamp(cutoffHz, 50, sr / 2 - 100);
  const x = Math.exp((-2 * Math.PI * c) / sr);
  let y = 0;
  for (let i = 0; i < samples.length; i++) {
    y = (1 - x) * samples[i] + x * y;
    samples[i] = y;
  }
}

function applySidechainDucking(
  samples: Float32Array,
  sr: number,
  kickTimesSec: number[],
  depth: number
) {
  const d = clamp(depth, 0, 1);
  const base = 1;
  const dip = Math.max(0.2, base - d * 0.8);
  const atk = 0.01;
  const rel = 0.18;

  // precompute per-sample gain (cheap enough for 15s)
  const g = new Float32Array(samples.length);
  g.fill(1);

  for (const t of kickTimesSec) {
    const s0 = Math.floor(t * sr);
    const sAtk = Math.floor((t + atk) * sr);
    const sRel = Math.floor((t + rel) * sr);
    for (let i = s0; i < g.length && i <= sRel; i++) {
      const tt = i / sr - t;
      let gg = 1;
      if (tt <= atk) {
        gg = base + (dip - base) * (tt / atk);
      } else {
        const u = (tt - atk) / Math.max(1e-6, rel - atk);
        gg = dip + (base - dip) * clamp(u, 0, 1);
      }
      g[i] = Math.min(g[i], gg);
    }
  }

  for (let i = 0; i < samples.length; i++) samples[i] *= g[i];
}

function measurePeak(samples: Float32Array) {
  let p = 0;
  for (let i = 0; i < samples.length; i++) p = Math.max(p, Math.abs(samples[i]));
  return p;
}

function toBase64Wav(samples: Float32Array, sr: number) {
  const wav = encodeWavMono16(samples, { sampleRate: sr });
  return Buffer.from(wav).toString("base64");
}

export function renderHookStems(args: { blueprint: Blueprint; midi: HookMidiResult }): HookRenderResult {
  const sr = 44100;
  const durationSec = Math.max(0.1, args.midi.durationSec + 0.35);
  const brightness = args.blueprint.mixMacros.brightness;
  const sidechain = args.blueprint.mixMacros.sidechain;

  const byName = (name: TrackNotes["name"]) => args.midi.tracks.find((t) => t.name === name)?.notes ?? [];

  const drumsS = renderDrums(sr, durationSec, byName("Drums"));
  const bassS = renderMonoSynth(sr, durationSec, byName("Bass"), "saw");
  const chordsS = renderPoly(sr, durationSec, byName("Chords"));
  const leadS = renderMonoSynth(sr, durationSec, byName("Lead"), "saw");

  // crude "sound engine" macros (MVP)
  applyOnePoleLowpass(chordsS, sr, 600 + brightness * 7000);
  applyOnePoleLowpass(leadS, sr, 900 + brightness * 9000);
  applySidechainDucking(chordsS, sr, args.midi.kickTimesSec, sidechain);

  // normalize per stem a bit, then mix
  const stemGain = (s: Float32Array, targetPeak: number) => {
    const p = Math.max(1e-6, measurePeak(s));
    const g = targetPeak / p;
    for (let i = 0; i < s.length; i++) s[i] = softClip(s[i] * g);
  };
  stemGain(drumsS, 0.95);
  stemGain(bassS, 0.8);
  stemGain(chordsS, 0.65);
  stemGain(leadS, 0.7);

  const mix = new Float32Array(drumsS.length);
  for (let i = 0; i < mix.length; i++) {
    mix[i] = softClip(drumsS[i] * 0.9 + bassS[i] * 0.55 + chordsS[i] * 0.55 + leadS[i] * 0.55);
  }

  const mk = (s: Float32Array): RenderStemResult => ({
    wavBase64: toBase64Wav(s, sr),
    durationSec,
    sampleRate: sr,
    peak: measurePeak(s),
  });

  return {
    mixdown: mk(mix),
    stems: {
      drums: mk(drumsS),
      bass: mk(bassS),
      chords: mk(chordsS),
      lead: mk(leadS),
    },
  };
}

