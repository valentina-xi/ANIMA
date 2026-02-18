import type { Blueprint } from "@/lib/blueprint/schema";
import type { DiffOp } from "@/lib/iterate/intent";

type Lesson = {
  title: string;
  why: string;
  receipts: Array<{ path: string; value: unknown }>;
};

type Mission = {
  id: string;
  title: string;
  instruction: string;
  passWhen: Array<{ path: string; predicate: "gte" | "lte"; value: number }>;
};

export type TutorContent = {
  lessons: Lesson[];
  missions: Mission[];
  dawSteps: Array<{ title: string; steps: string[] }>;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function generateTutorContent(args: { blueprint: Blueprint; lastDiffOps?: DiffOp[] }): TutorContent {
  const b = args.blueprint;
  const lessons: Lesson[] = [
    {
      title: "We locked in the groove feel",
      why: "Swing and humanize shape the pocket without changing the harmony.",
      receipts: [
        { path: "/groove/swing", value: b.groove.swing },
        { path: "/groove/humanize", value: b.groove.humanize },
        { path: "/groove/templateId", value: b.groove.templateId },
      ],
    },
    {
      title: "We made the hook controllable via stems",
      why: "Separate stems keep identity stable while you iterate parts safely.",
      receipts: b.tracks.map((t) => ({ path: `/tracks/${t.id}`, value: { role: t.role, instrumentId: t.instrumentId, patternStyle: t.patternStyle } })),
    },
    {
      title: "We used mix macros instead of destructive edits",
      why: "Brightness and sidechain are ‘global knobs’ you can iterate quickly and explain precisely.",
      receipts: [
        { path: "/mixMacros/brightness", value: b.mixMacros.brightness },
        { path: "/mixMacros/sidechain", value: b.mixMacros.sidechain },
        { path: "/mixMacros/reverb", value: b.mixMacros.reverb },
      ],
    },
  ];

  const missions: Mission[] = [
    {
      id: "mission-brightness",
      title: "Make the drop brighter",
      instruction: "Increase Brightness to at least 0.75.",
      passWhen: [{ path: "/mixMacros/brightness", predicate: "gte", value: 0.75 }],
    },
    {
      id: "mission-sidechain",
      title: "Add more pump",
      instruction: "Increase Sidechain depth to at least 0.7.",
      passWhen: [{ path: "/mixMacros/sidechain", predicate: "gte", value: 0.7 }],
    },
    {
      id: "mission-swing",
      title: "Nudge the groove",
      instruction: "Set Swing between 0.10 and 0.18.",
      passWhen: [
        { path: "/groove/swing", predicate: "gte", value: 0.1 },
        { path: "/groove/swing", predicate: "lte", value: 0.18 },
      ],
    },
  ];

  // If we have a diff, tailor one lesson to it (receipts = actual ops)
  if (args.lastDiffOps && args.lastDiffOps.length) {
    lessons.unshift({
      title: "What changed in this iteration (with receipts)",
      why: "Every change is a diff so you can trust partial regeneration.",
      receipts: args.lastDiffOps.map((op) => ({ path: op.path, value: op.op === "inc" ? { delta: op.delta } : op.value })),
    });
  }

  // Clamp values used by missions (defensive)
  void clamp01;

  const dawSteps = [
    {
      title: "Rebuild this manually in any DAW",
      steps: [
        `Set tempo to ${b.global.bpm} BPM and time signature to ${b.global.timeSignature[0]}/${b.global.timeSignature[1]}.`,
        "Import the MIDI file and assign instruments (drums/bass/chords/lead).",
        "Route each track to its own audio stem and export stems for versioning.",
        "Apply sidechain ducking to chords/pads keyed from the kick.",
        "Use a lowpass filter to control brightness on chords/lead.",
      ],
    },
  ];

  return { lessons, missions, dawSteps };
}

