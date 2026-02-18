import crypto from "crypto";
import type { Blueprint } from "@/lib/blueprint/schema";
import { assertBlueprint } from "@/lib/blueprint/schema";
import type { DiffOp } from "@/lib/iterate/intent";
import { hashToSeed } from "@/lib/producer/seed";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function setAtPath(obj: any, pathStr: string, value: unknown) {
  const parts = pathStr.replace(/^\//, "").split("/");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (cur[k] == null || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

function getAtPath(obj: any, pathStr: string) {
  const parts = pathStr.replace(/^\//, "").split("/");
  let cur = obj;
  for (const k of parts) {
    if (cur == null) return undefined;
    cur = cur[k];
  }
  return cur;
}

export function applyBlueprintOps(args: { blueprint: Blueprint; userText: string; ops: DiffOp[] }) {
  const base = args.blueprint;
  const next: any = structuredClone(base);

  // Locks enforcement (MVP): block ops that touch locked fields
  const isLockedPath = (p: string) => {
    if (base.locks.tempo && p.startsWith("/global/bpm")) return true;
    if (base.locks.chords && p.startsWith("/chords")) return true;
    if (base.locks.structure && p.startsWith("/structure")) return true;
    if (base.locks.rhythm && p.startsWith("/groove")) return true;
    if (base.locks.hook && p.startsWith("/motifs/hook")) return true;
    return false;
  };

  const applied: Array<DiffOp & { blocked?: boolean; reason?: string; before?: unknown; after?: unknown }> = [];

  for (const op of args.ops) {
    if (isLockedPath(op.path)) {
      applied.push({ ...op, blocked: true, reason: "Locked by Identity Lock" });
      continue;
    }
    const before = getAtPath(next, op.path);
    if (op.op === "set") {
      setAtPath(next, op.path, op.value);
      applied.push({ ...op, before, after: op.value });
    } else if (op.op === "inc") {
      const cur = Number(before ?? 0);
      const after = cur + op.delta;
      setAtPath(next, op.path, after);
      applied.push({ ...op, before, after });
    }
  }

  // Clamp macros
  next.mixMacros.brightness = clamp01(next.mixMacros.brightness);
  next.mixMacros.punch = clamp01(next.mixMacros.punch);
  next.mixMacros.sidechain = clamp01(next.mixMacros.sidechain);
  next.mixMacros.width = clamp01(next.mixMacros.width);
  next.mixMacros.reverb = clamp01(next.mixMacros.reverb);
  next.groove.swing = clamp01(next.groove.swing);

  // Advance arrangement seed when intent suggests variation (MVP rule)
  const variation = args.ops.some((o) => o.path.startsWith("/groove") || o.path.startsWith("/motifs") || o.path.startsWith("/global/bpm"));
  if (variation) {
    next.seeds.arrangementSeed = hashToSeed(`${base.seeds.arrangementSeed}|${args.userText}|${crypto.randomUUID()}`);
  }

  const validated = assertBlueprint(next);
  return { blueprint: validated, appliedOps: applied };
}

