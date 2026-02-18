import type { Blueprint } from "@/lib/blueprint/schema";
import { assertBlueprint } from "@/lib/blueprint/schema";
import { buildHookBlueprint } from "@/lib/producer/hookBlueprint";
import { buildHookMidi } from "@/lib/producer/hookMidi";
import { renderHookStems } from "@/lib/render/hookRender";

export type CreateHookPreviewInput = {
  prompt: string;
  lyrics?: string;
  genre?: string;
  mood?: string;
  era?: string;
  intensity?: number;
};

export type CreateHookPreviewOutput = {
  blueprint: Blueprint;
  midi: ReturnType<typeof buildHookMidi>;
  render: ReturnType<typeof renderHookStems>;
};

export function createHookPreview(input: CreateHookPreviewInput): CreateHookPreviewOutput {
  const blueprint = assertBlueprint(buildHookBlueprint(input));
  const midi = buildHookMidi(blueprint);
  const render = renderHookStems({ blueprint, midi });
  return { blueprint, midi, render };
}

