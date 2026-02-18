"use client";

export type StemKey = "drums" | "bass" | "chords" | "lead";

export type StemMute = Record<StemKey, boolean>;

export type StemMacros = {
  brightness: number; // 0..1
  sidechain: number; // 0..1
  reverb: number; // 0..1 (MVP: subtle)
};

type LoadedStems = Record<StemKey, AudioBuffer>;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
}

export class StemPlayer {
  private ctx: AudioContext;
  private stems: LoadedStems | null = null;

  private gains: Record<StemKey, GainNode>;
  private chordsFilter: BiquadFilterNode;
  private leadFilter: BiquadFilterNode;

  private out: GainNode;
  private reverbSend: GainNode;
  private reverbReturn: GainNode;
  private reverbDelay: DelayNode;
  private reverbFb: GainNode;

  private sources: Record<StemKey, AudioBufferSourceNode> | null = null;
  private startedAt: number | null = null;
  private durationSec = 0;

  private kickTimesSec: number[] = [];
  private sidechainDepth = 0.5;

  constructor(ctx?: AudioContext) {
    this.ctx = ctx ?? new AudioContext();

    this.out = this.ctx.createGain();
    this.out.gain.value = 0.9;
    this.out.connect(this.ctx.destination);

    // small "reverb-ish" feedback delay
    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.value = 0.12;
    this.reverbReturn = this.ctx.createGain();
    this.reverbReturn.gain.value = 0.35;
    this.reverbDelay = this.ctx.createDelay(1.0);
    this.reverbDelay.delayTime.value = 0.18;
    this.reverbFb = this.ctx.createGain();
    this.reverbFb.gain.value = 0.22;

    this.reverbSend.connect(this.reverbDelay);
    this.reverbDelay.connect(this.reverbFb);
    this.reverbFb.connect(this.reverbDelay);
    this.reverbDelay.connect(this.reverbReturn);
    this.reverbReturn.connect(this.out);

    this.chordsFilter = this.ctx.createBiquadFilter();
    this.chordsFilter.type = "lowpass";
    this.chordsFilter.frequency.value = 3500;
    this.chordsFilter.Q.value = 0.4;

    this.leadFilter = this.ctx.createBiquadFilter();
    this.leadFilter.type = "lowpass";
    this.leadFilter.frequency.value = 5200;
    this.leadFilter.Q.value = 0.35;

    const mkGain = () => {
      const g = this.ctx.createGain();
      g.gain.value = 1;
      return g;
    };
    this.gains = {
      drums: mkGain(),
      bass: mkGain(),
      chords: mkGain(),
      lead: mkGain(),
    };

    // routing: chords/lead go through filters + reverb send
    this.gains.drums.connect(this.out);
    this.gains.bass.connect(this.out);

    this.gains.chords.connect(this.chordsFilter);
    this.chordsFilter.connect(this.out);
    this.chordsFilter.connect(this.reverbSend);

    this.gains.lead.connect(this.leadFilter);
    this.leadFilter.connect(this.out);
    this.leadFilter.connect(this.reverbSend);
  }

  get audioContext() {
    return this.ctx;
  }

  async ensureRunning() {
    if (this.ctx.state !== "running") await this.ctx.resume();
  }

  async load(args: {
    stemsWavBase64: Record<StemKey, string>;
    durationSec: number;
    kickTimesSec: number[];
  }) {
    await this.ensureRunning();
    this.stop();

    const decode = async (b64: string) => {
      const buf = base64ToArrayBuffer(b64);
      return await this.ctx.decodeAudioData(buf.slice(0));
    };

    const [drums, bass, chords, lead] = await Promise.all([
      decode(args.stemsWavBase64.drums),
      decode(args.stemsWavBase64.bass),
      decode(args.stemsWavBase64.chords),
      decode(args.stemsWavBase64.lead),
    ]);

    this.stems = { drums, bass, chords, lead };
    this.durationSec = args.durationSec;
    this.kickTimesSec = args.kickTimesSec ?? [];
  }

  setMute(mute: StemMute) {
    (Object.keys(mute) as StemKey[]).forEach((k) => {
      this.gains[k].gain.value = mute[k] ? 0 : 1;
    });
  }

  setMacros(macros: StemMacros) {
    const brightness = clamp(macros.brightness, 0, 1);
    const hzC = 600 + brightness * 7000;
    const hzL = 900 + brightness * 9000;
    this.chordsFilter.frequency.value = hzC;
    this.leadFilter.frequency.value = hzL;

    this.sidechainDepth = clamp(macros.sidechain, 0, 1);

    const reverb = clamp(macros.reverb, 0, 1);
    this.reverbSend.gain.value = 0.06 + reverb * 0.22;
    this.reverbFb.gain.value = 0.12 + reverb * 0.25;
    this.reverbReturn.gain.value = 0.18 + reverb * 0.45;
  }

  private applySidechain(startTime: number) {
    // duck chords around each kick, relative to startTime
    const g = this.gains.chords.gain;
    const base = 1;
    const dip = Math.max(0.2, base - this.sidechainDepth * 0.8);
    const atk = 0.01;
    const rel = 0.18;

    g.cancelScheduledValues(startTime);
    g.setValueAtTime(base, startTime);

    for (const kt of this.kickTimesSec) {
      const t = startTime + kt;
      g.setValueAtTime(base, t);
      g.linearRampToValueAtTime(dip, t + atk);
      g.linearRampToValueAtTime(base, t + rel);
    }
  }

  play() {
    if (!this.stems) throw new Error("Stems not loaded");
    this.stop();

    const mkSrc = (buf: AudioBuffer) => {
      const s = this.ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      s.loopEnd = Math.max(0.01, this.durationSec);
      return s;
    };

    const srcs: Record<StemKey, AudioBufferSourceNode> = {
      drums: mkSrc(this.stems.drums),
      bass: mkSrc(this.stems.bass),
      chords: mkSrc(this.stems.chords),
      lead: mkSrc(this.stems.lead),
    };

    srcs.drums.connect(this.gains.drums);
    srcs.bass.connect(this.gains.bass);
    srcs.chords.connect(this.gains.chords);
    srcs.lead.connect(this.gains.lead);

    const startTime = this.ctx.currentTime + 0.05;
    this.applySidechain(startTime);

    (Object.keys(srcs) as StemKey[]).forEach((k) => srcs[k].start(startTime));
    this.sources = srcs;
    this.startedAt = startTime;
  }

  stop() {
    if (this.sources) {
      for (const s of Object.values(this.sources)) {
        try {
          s.stop();
        } catch {
          // ignore
        }
        try {
          s.disconnect();
        } catch {
          // ignore
        }
      }
    }
    this.sources = null;
    this.startedAt = null;
  }

  isPlaying() {
    if (!this.sources || this.startedAt == null) return false;
    return this.ctx.currentTime >= this.startedAt;
  }

  dispose() {
    this.stop();
    try {
      this.out.disconnect();
    } catch {}
    try {
      this.ctx.close();
    } catch {}
  }
}

