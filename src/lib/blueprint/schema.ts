import { z } from "zod";

export const BlueprintSchemaVersion = "0.1" as const;

const Clamp01 = z.number().min(0).max(1);

export const BlueprintSchema = z.object({
  schemaVersion: z.literal(BlueprintSchemaVersion),
  global: z.object({
    bpm: z.number().min(40).max(220),
    timeSignature: z.tuple([z.number().int().min(1).max(16), z.number().int().min(1).max(32)]),
    key: z.string().min(1),
    scale: z.enum(["major", "minor"]),
  }),
  variationIntent: z.string().optional(),
  structure: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        bars: z.number().int().min(1),
        intensity: Clamp01,
        transitionStyle: z.string().optional(),
      })
    )
    .min(1),
  chords: z.array(
    z.object({
      sectionId: z.string().min(1),
      bars: z
        .array(
          z.object({
            barIndex: z.number().int().min(0),
            chord: z.string().min(1),
          })
        )
        .min(1),
    })
  ),
  motifs: z
    .object({
      hook: z
        .object({
          description: z.string().min(1),
          contour: z.string().optional(),
        })
        .optional(),
      bass: z
        .object({
          description: z.string().min(1),
        })
        .optional(),
      rhythm: z
        .object({
          description: z.string().min(1),
          templateId: z.string().optional(),
        })
        .optional(),
    })
    .default({}),
  tracks: z
    .array(
      z.object({
        id: z.string().min(1),
        role: z.enum(["drums", "bass", "chords", "lead", "fx"]),
        instrumentId: z.string().min(1),
        patternStyle: z.string().min(1),
        range: z.string().optional(),
        constraints: z.record(z.string(), z.any()).optional(),
      })
    )
    .min(1),
  groove: z.object({
    swing: z.number().min(0).max(0.95),
    humanize: Clamp01,
    templateId: z.string().min(1),
  }),
  mixMacros: z.object({
    brightness: Clamp01,
    punch: Clamp01,
    sidechain: Clamp01,
    width: Clamp01,
    reverb: Clamp01,
  }),
  locks: z.object({
    tempo: z.boolean(),
    chords: z.boolean(),
    hook: z.boolean(),
    rhythm: z.boolean(),
    structure: z.boolean(),
  }),
  seeds: z.object({
    arrangementSeed: z.number().int(),
    soundSeed: z.number().int(),
  }),
});

export type Blueprint = z.infer<typeof BlueprintSchema>;

export function assertBlueprint(input: unknown): Blueprint {
  return BlueprintSchema.parse(input);
}

