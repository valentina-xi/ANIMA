import type { Blueprint } from "@/lib/blueprint/schema";
import { BlueprintSchemaVersion } from "@/lib/blueprint/schema";
import { hashToSeed, mulberry32 } from "@/lib/producer/seed";

type HookBlueprintInput = {
  prompt: string;
  lyrics?: string;
  genre?: string;
  mood?: string;
  era?: string;
  intensity?: number; // 0..1
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function pick<T>(rand: () => number, items: T[]) {
  return items[Math.floor(rand() * items.length)];
}

export function buildHookBlueprint(input: HookBlueprintInput): Blueprint {
  const intensity = clamp01(input.intensity ?? 0.7);
  const seedStr = JSON.stringify({
    prompt: input.prompt ?? "",
    lyrics: input.lyrics ?? "",
    genre: input.genre ?? "",
    mood: input.mood ?? "",
    era: input.era ?? "",
    intensity,
  });
  const arrangementSeed = hashToSeed(seedStr);
  const soundSeed = hashToSeed(seedStr + "|sound");
  const rand = mulberry32(arrangementSeed);

  const genre = (input.genre || "house").toLowerCase();
  const isHouse = genre.includes("house");
  const bpmBase = isHouse ? 124 : 110;
  const bpm = Math.round(bpmBase + intensity * (isHouse ? 8 : 20));

  const scale = pick(rand, ["major", "minor"] as const);
  const key = scale === "major" ? pick(rand, ["C", "D", "E", "F", "G", "A"]) : pick(rand, ["A", "B", "C", "D", "E", "F#", "G"]);

  const sectionId = "chorus";
  const bars = 8;

  const progMajor = pick(rand, [
    ["I", "V", "vi", "IV"],
    ["I", "vi", "IV", "V"],
  ]);
  const progMinor = pick(rand, [
    ["i", "VI", "III", "VII"],
    ["i", "VII", "VI", "VII"],
  ]);

  const chordNames =
    scale === "major"
      ? [`${key}maj`, "Gmaj", "Amin", "Fmaj"] // simple friendly default (not perfectly transposed; acceptable for MVP)
      : [`${key}min`, "Fmaj", "Cmaj", "Gmaj"];

  const chordsBars = Array.from({ length: bars }, (_, i) => ({
    barIndex: i,
    chord: chordNames[Math.floor(i / 2) % chordNames.length],
  }));

  const grooveSwing = Math.max(0, Math.min(0.24, 0.06 + intensity * 0.18));
  const humanize = Math.max(0.02, Math.min(0.2, 0.04 + intensity * 0.12));

  const blueprint: Blueprint = {
    schemaVersion: BlueprintSchemaVersion,
    global: {
      bpm,
      timeSignature: [4, 4],
      key,
      scale,
    },
    variationIntent: "hook_v1",
    structure: [
      {
        id: sectionId,
        name: "Chorus (Hook)",
        bars,
        intensity,
        transitionStyle: "none",
      },
    ],
    chords: [{ sectionId, bars: chordsBars }],
    motifs: {
      hook: {
        description: `Catchy ${genre} hook motif, ${input.mood || "uplifting"} vibe.`,
        contour: scale === "major" ? "upward-then-resolve" : "minor-lift-then-drop",
      },
      bass: { description: "Root-driven bass motif with syncopation." },
      rhythm: { description: "Four-on-the-floor with offbeat hats.", templateId: "house_4otf_v1" },
    },
    groove: {
      swing: grooveSwing,
      humanize,
      templateId: "mvp_house_v1",
    },
    tracks: [
      { id: "drums", role: "drums", instrumentId: "mvp-kit-1", patternStyle: "4otf" },
      { id: "bass", role: "bass", instrumentId: "mvp-bass-1", patternStyle: "root-sync" },
      { id: "chords", role: "chords", instrumentId: "mvp-chords-1", patternStyle: "stabs" },
      { id: "lead", role: "lead", instrumentId: "mvp-lead-1", patternStyle: "hook-melody" },
    ],
    mixMacros: {
      brightness: clamp01(0.55 + intensity * 0.3),
      punch: clamp01(0.5 + intensity * 0.35),
      sidechain: clamp01(0.45 + intensity * 0.35),
      width: clamp01(0.45 + intensity * 0.35),
      reverb: clamp01(0.18 + (1 - intensity) * 0.25),
    },
    locks: {
      tempo: false,
      chords: false,
      hook: false,
      rhythm: false,
      structure: false,
    },
    seeds: {
      arrangementSeed,
      soundSeed,
    },
  };

  // Keep the roman numerals around for tutoring later (MVP receipt)
  void progMajor;
  void progMinor;

  return blueprint;
}

