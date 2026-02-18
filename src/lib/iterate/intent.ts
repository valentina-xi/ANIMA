import crypto from "crypto";
import type { Blueprint } from "@/lib/blueprint/schema";

export type DiffOp =
  | { op: "set"; path: string; value: unknown }
  | { op: "inc"; path: string; delta: number };

export type IterationIntent = {
  extractedIntent: string;
  ops: DiffOp[];
  impacted: {
    midi: boolean;
    render: boolean;
    tracks: Array<"drums" | "bass" | "chords" | "lead">;
  };
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function extractNumber(text: string): number | null {
  const m = text.match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) ? v : null;
}

export function parseIterationIntent(args: { blueprint: Blueprint; userText: string }): IterationIntent {
  const t = args.userText.toLowerCase();
  const ops: DiffOp[] = [];
  const tracks = new Set<"drums" | "bass" | "chords" | "lead">();
  let midi = false;
  let render = true;

  if (t.includes("drum") && (t.includes("groove") || t.includes("pattern") || t.includes("kit"))) {
    ops.push({ op: "set", path: "/groove/templateId", value: `mvp_${crypto.randomUUID().slice(0, 8)}` });
    ops.push({ op: "set", path: "/variationIntent", value: "drums_variation" });
    tracks.add("drums");
    midi = true;
  }

  if (t.includes("more sidechain") || t.includes("more duck") || t.includes("pump")) {
    ops.push({ op: "inc", path: "/mixMacros/sidechain", delta: 0.12 });
    tracks.add("chords");
    render = true;
  } else if (t.includes("less sidechain")) {
    ops.push({ op: "inc", path: "/mixMacros/sidechain", delta: -0.12 });
    render = true;
  }

  if (t.includes("brighter") || t.includes("more bright") || t.includes("less dark")) {
    ops.push({ op: "inc", path: "/mixMacros/brightness", delta: 0.12 });
    tracks.add("chords");
    tracks.add("lead");
    render = true;
  } else if (t.includes("darker") || t.includes("less bright")) {
    ops.push({ op: "inc", path: "/mixMacros/brightness", delta: -0.12 });
    tracks.add("chords");
    tracks.add("lead");
    render = true;
  }

  if (t.includes("swing")) {
    const num = extractNumber(t);
    if (num != null && num >= 0 && num <= 0.95) {
      ops.push({ op: "set", path: "/groove/swing", value: num });
    } else {
      ops.push({ op: "inc", path: "/groove/swing", delta: 0.05 });
    }
    midi = true;
    render = true;
  }

  if (t.includes("tempo") || t.includes("bpm")) {
    const num = extractNumber(t);
    if (num != null && num >= 40 && num <= 220) {
      ops.push({ op: "set", path: "/global/bpm", value: Math.round(num) });
      midi = true;
      render = true;
    }
  }

  // Normalize some macros if we applied inc operations (clamping happens in apply stage too)
  // (No-op here, but keep helper for tutor receipts)
  void clamp01;

  const extractedIntent =
    ops.length === 0
      ? "No-op (could not map request to supported blueprint knobs)"
      : `Mapped request to ${ops.length} blueprint ops`;

  if (tracks.size === 0) {
    // default assumption: any render macro touches chords/lead
    tracks.add("chords");
    tracks.add("lead");
  }

  return {
    extractedIntent,
    ops,
    impacted: {
      midi,
      render,
      tracks: Array.from(tracks),
    },
  };
}

