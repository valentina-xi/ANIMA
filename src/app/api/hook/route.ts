import { NextResponse } from "next/server";
import { createHookPreview } from "@/lib/orchestrator/createHookPreview";
import { generateTutorContent } from "@/lib/tutor/generateTutor";

export const runtime = "nodejs";

type HookRequest = {
  prompt: string;
  lyrics?: string;
  genre?: string;
  mood?: string;
  era?: string;
  intensity?: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as HookRequest;
    if (!body?.prompt || typeof body.prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const { blueprint, midi, render } = createHookPreview(body);
    const tutor = generateTutorContent({ blueprint });

    return NextResponse.json({
      blueprint,
      midiBase64: midi.midiBase64,
      durationSec: midi.durationSec,
      kickTimesSec: midi.kickTimesSec,
      tutor,
      assets: {
        preview: {
          wavBase64: render.mixdown.wavBase64,
          sampleRate: render.mixdown.sampleRate,
          durationSec: render.mixdown.durationSec,
        },
        stems: {
          drums: render.stems.drums.wavBase64,
          bass: render.stems.bass.wavBase64,
          chords: render.stems.chords.wavBase64,
          lead: render.stems.lead.wavBase64,
        },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}

