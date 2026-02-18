import { Midi } from "@tonejs/midi";
import type { Blueprint } from "@/lib/blueprint/schema";
import { mulberry32 } from "@/lib/producer/seed";

export type TrackNotes = {
  name: "Drums" | "Bass" | "Chords" | "Lead";
  notes: Array<{
    midi: number;
    time: number; // seconds
    duration: number; // seconds
    velocity: number; // 0..1
    name?: string;
  }>;
};

export type HookMidiResult = {
  midiBase64: string;
  durationSec: number;
  kickTimesSec: number[];
  tracks: TrackNotes[];
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function bpmToBeatSec(bpm: number) {
  return 60 / bpm;
}

function noteName(midi: number) {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const n = midi % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${names[n]}${oct}`;
}

export function buildHookMidi(blueprint: Blueprint): HookMidiResult {
  const bpm = blueprint.global.bpm;
  const beat = bpmToBeatSec(bpm);
  const barBeats = blueprint.global.timeSignature[0];
  const sectionBars = blueprint.structure[0]?.bars ?? 8;
  const totalBeats = sectionBars * barBeats;
  const durationSec = totalBeats * beat;

  const rand = mulberry32(blueprint.seeds.arrangementSeed);
  const swing = blueprint.groove.swing; // 0..0.95, interpreted as 8th swing

  const midi = new Midi();
  midi.header.setTempo(bpm);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: blueprint.global.timeSignature });

  const drums = midi.addTrack();
  drums.name = "Drums";
  const bass = midi.addTrack();
  bass.name = "Bass";
  const chords = midi.addTrack();
  chords.name = "Chords";
  const lead = midi.addTrack();
  lead.name = "Lead";

  const drumsNotes: TrackNotes["notes"] = [];
  const bassNotes: TrackNotes["notes"] = [];
  const chordsNotes: TrackNotes["notes"] = [];
  const leadNotes: TrackNotes["notes"] = [];
  const kickTimesSec: number[] = [];

  const humanizeMax = blueprint.groove.humanize * 0.015; // up to ~15ms
  const humanize = () => (rand() * 2 - 1) * humanizeMax;

  const applySwing8th = (tSec: number) => {
    // delay off-beat 8ths by swing*half-8th (house-ish feel)
    const eighth = beat / 2;
    const pos = tSec / eighth;
    const frac = pos - Math.floor(pos);
    const isOff = frac > 0.49 && frac < 0.51; // very close to offbeat
    if (!isOff) return tSec;
    return tSec + swing * (eighth * 0.5);
  };

  // --- Drums (GM-ish): kick 36, clap 39, hat 42 ---
  for (let b = 0; b < totalBeats; b++) {
    const t = b * beat;
    // kick on every beat
    drumsNotes.push({ midi: 36, time: t + humanize(), duration: 0.06, velocity: 0.9 });
    kickTimesSec.push(t);

    // clap on 2 & 4
    const beatInBar = b % barBeats;
    if (beatInBar === 1 || beatInBar === 3) {
      drumsNotes.push({ midi: 39, time: t + humanize(), duration: 0.08, velocity: 0.7 });
    }

    // offbeat hats (8th notes)
    const off = t + beat / 2;
    const swung = applySwing8th(off) + humanize();
    drumsNotes.push({ midi: 42, time: swung, duration: 0.03, velocity: 0.45 });
  }

  // --- Harmony (simple chord stabs every 2 beats) ---
  const chordRoots = blueprint.chords[0]?.bars.map((b) => b.chord) ?? [];
  const chordMidi = (barIndex: number) => {
    // MVP: ignore actual chord parsing; pick a pleasant diatonic-ish set around A minor / C major neighborhood
    const choices = [
      [57, 60, 64], // A minor
      [53, 57, 60], // F major
      [48, 52, 55], // C major
      [55, 59, 62], // G major
    ];
    const idx = Math.floor(barIndex / 2) % choices.length;
    void chordRoots;
    return choices[idx];
  };

  for (let bar = 0; bar < sectionBars; bar++) {
    const base = bar * barBeats * beat;
    const notes = chordMidi(bar);
    // stab on beat 1 and 3 (2-beat stabs)
    for (const offBeats of [0, 2]) {
      const t = base + offBeats * beat + humanize();
      for (const m of notes) {
        chordsNotes.push({ midi: m, time: t, duration: 0.45, velocity: 0.55, name: noteName(m) });
      }
    }
  }

  // --- Bass (root-ish pattern with syncopation) ---
  for (let bar = 0; bar < sectionBars; bar++) {
    const base = bar * barBeats * beat;
    const chord = chordMidi(bar);
    const root = chord[0] - 12; // drop an octave
    const steps = [
      { beatOffset: 0, dur: 0.45, vel: 0.85 },
      { beatOffset: 1.5, dur: 0.25, vel: 0.65 },
      { beatOffset: 2, dur: 0.35, vel: 0.8 },
      { beatOffset: 3.25, dur: 0.2, vel: 0.6 },
    ];
    for (const s of steps) {
      const t = applySwing8th(base + s.beatOffset * beat) + humanize();
      bassNotes.push({ midi: root, time: t, duration: s.dur, velocity: clamp01(s.vel), name: noteName(root) });
    }
  }

  // --- Lead (simple hooky motif) ---
  const motif = [0, 2, 4, 7, 4, 2]; // scale degrees-ish (MVP)
  const baseNote = 69; // A4-ish
  for (let i = 0; i < sectionBars * 2; i++) {
    const bar = Math.floor(i / 2);
    const posInBar = i % 2; // two phrases per bar
    const t0 = bar * barBeats * beat + (posInBar ? 2 : 0) * beat;
    for (let j = 0; j < motif.length; j++) {
      const t = applySwing8th(t0 + j * (beat / 2)) + humanize();
      const m = baseNote + motif[j] + (rand() < 0.15 ? 12 : 0);
      leadNotes.push({ midi: m, time: t, duration: 0.16, velocity: 0.55, name: noteName(m) });
    }
  }

  for (const n of drumsNotes) drums.addNote({ midi: n.midi, time: n.time, duration: n.duration, velocity: n.velocity });
  for (const n of bassNotes) bass.addNote({ midi: n.midi, time: n.time, duration: n.duration, velocity: n.velocity });
  for (const n of chordsNotes) chords.addNote({ midi: n.midi, time: n.time, duration: n.duration, velocity: n.velocity });
  for (const n of leadNotes) lead.addNote({ midi: n.midi, time: n.time, duration: n.duration, velocity: n.velocity });

  const midiBytes = midi.toArray();
  const midiBase64 = Buffer.from(midiBytes).toString("base64");

  return {
    midiBase64,
    durationSec,
    kickTimesSec,
    tracks: [
      { name: "Drums", notes: drumsNotes },
      { name: "Bass", notes: bassNotes },
      { name: "Chords", notes: chordsNotes },
      { name: "Lead", notes: leadNotes },
    ],
  };
}

