import { NextResponse } from "next/server";
import fs from "fs";
import crypto from "crypto";
import { readDb, writeDb, newId, getNowIso, writeAssetFile, writeAssetTextFile, sha256, readAssetFile } from "@/lib/store/fsStore";
import { parseIterationIntent } from "@/lib/iterate/intent";
import { applyBlueprintOps } from "@/lib/iterate/applyDiff";
import { buildHookMidi } from "@/lib/producer/hookMidi";
import { renderHookStems } from "@/lib/render/hookRender";
import { generateTutorContent } from "@/lib/tutor/generateTutor";

export const runtime = "nodejs";

type IterateRequest = {
  userText: string;
  confirm?: boolean;
};

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: baseVersionId } = await ctx.params;
  try {
    const body = (await req.json()) as IterateRequest;
    const userText = (body?.userText || "").trim();
    if (!userText) return NextResponse.json({ error: "Missing userText" }, { status: 400 });

    const db = await readDb();
    const baseVersion = db.versions[baseVersionId];
    if (!baseVersion) return NextResponse.json({ error: "Base version not found" }, { status: 404 });

    const baseBlueprint = db.blueprints[baseVersionId]?.json;
    if (!baseBlueprint) return NextResponse.json({ error: "Base blueprint not found" }, { status: 500 });

    const intent = parseIterationIntent({ blueprint: baseBlueprint, userText });
    const { blueprint: nextBlueprint, appliedOps } = applyBlueprintOps({ blueprint: baseBlueprint, userText, ops: intent.ops });

    const diffPreview = {
      extractedIntent: intent.extractedIntent,
      ops: appliedOps,
      impacted: intent.impacted,
      locks: baseBlueprint.locks,
    };

    if (!body.confirm) {
      return NextResponse.json({
        preview: true,
        baseVersionId,
        diff: diffPreview,
        nextBlueprint,
      });
    }

    // Create new version (immutable)
    const versionId = newId();
    const created_at = getNowIso();
    db.versions[versionId] = {
      id: versionId,
      project_id: baseVersion.project_id,
      parent_version_id: baseVersionId,
      status: "DRAFTING",
      created_at,
    };
    db.blueprints[versionId] = { version_id: versionId, schema_version: db.blueprints[baseVersionId]!.schema_version, json: nextBlueprint };

    const iterId = newId();
    db.iterationRequests[iterId] = {
      id: iterId,
      version_id: baseVersionId,
      user_text: userText,
      extracted_intent: intent.extractedIntent,
      diff_json: diffPreview,
      created_at,
    };

    // Render new assets (MVP: re-render full hook; partial regen is represented by "impacted" in diff)
    const midi = buildHookMidi(nextBlueprint);
    const render = renderHookStems({ blueprint: nextBlueprint, midi });

    const blueprintAssetId = newId();
    const midiAssetId = newId();
    const previewAssetId = newId();
    const drumsAssetId = newId();
    const bassAssetId = newId();
    const chordsAssetId = newId();
    const leadAssetId = newId();

    const blueprintText = JSON.stringify(nextBlueprint, null, 2);
    const blueprintPath = await writeAssetTextFile({ assetId: blueprintAssetId, ext: "json", text: blueprintText });
    const blueprintChecksum = sha256(Buffer.from(blueprintText, "utf8"));

    const midiBytes = Buffer.from(midi.midiBase64, "base64");
    const midiPath = await writeAssetFile({ assetId: midiAssetId, ext: "mid", bytes: midiBytes });
    const midiChecksum = sha256(midiBytes);

    const previewBytes = Buffer.from(render.mixdown.wavBase64, "base64");
    const previewPath = await writeAssetFile({ assetId: previewAssetId, ext: "wav", bytes: previewBytes });
    const previewChecksum = sha256(previewBytes);

    const stemBytes = {
      drums: Buffer.from(render.stems.drums.wavBase64, "base64"),
      bass: Buffer.from(render.stems.bass.wavBase64, "base64"),
      chords: Buffer.from(render.stems.chords.wavBase64, "base64"),
      lead: Buffer.from(render.stems.lead.wavBase64, "base64"),
    };

    const drumsPath = await writeAssetFile({ assetId: drumsAssetId, ext: "wav", bytes: stemBytes.drums });
    const bassPath = await writeAssetFile({ assetId: bassAssetId, ext: "wav", bytes: stemBytes.bass });
    const chordsPath = await writeAssetFile({ assetId: chordsAssetId, ext: "wav", bytes: stemBytes.chords });
    const leadPath = await writeAssetFile({ assetId: leadAssetId, ext: "wav", bytes: stemBytes.lead });

    db.assets[blueprintAssetId] = {
      id: blueprintAssetId,
      version_id: versionId,
      type: "preview",
      label: "blueprint",
      ext: "json",
      path: blueprintPath,
      checksum: blueprintChecksum,
    };
    db.assets[midiAssetId] = {
      id: midiAssetId,
      version_id: versionId,
      type: "preview",
      label: "midi",
      ext: "mid",
      path: midiPath,
      checksum: midiChecksum,
      durationSec: midi.durationSec,
    };
    db.assets[previewAssetId] = {
      id: previewAssetId,
      version_id: versionId,
      type: "preview",
      label: "preview-mix",
      ext: "wav",
      path: previewPath,
      checksum: previewChecksum,
      durationSec: render.mixdown.durationSec,
    };
    db.assets[drumsAssetId] = {
      id: drumsAssetId,
      version_id: versionId,
      type: "stem",
      label: "drums",
      ext: "wav",
      path: drumsPath,
      checksum: sha256(stemBytes.drums),
      durationSec: render.stems.drums.durationSec,
    };
    db.assets[bassAssetId] = {
      id: bassAssetId,
      version_id: versionId,
      type: "stem",
      label: "bass",
      ext: "wav",
      path: bassPath,
      checksum: sha256(stemBytes.bass),
      durationSec: render.stems.bass.durationSec,
    };
    db.assets[chordsAssetId] = {
      id: chordsAssetId,
      version_id: versionId,
      type: "stem",
      label: "chords",
      ext: "wav",
      path: chordsPath,
      checksum: sha256(stemBytes.chords),
      durationSec: render.stems.chords.durationSec,
    };
    db.assets[leadAssetId] = {
      id: leadAssetId,
      version_id: versionId,
      type: "stem",
      label: "lead",
      ext: "wav",
      path: leadPath,
      checksum: sha256(stemBytes.lead),
      durationSec: render.stems.lead.durationSec,
    };

    // Save tutor content for this version (MVP, deterministic)
    const tutor = generateTutorContent({ blueprint: nextBlueprint, lastDiffOps: intent.ops });
    db.tutorContent[versionId] = tutor;

    db.versions[versionId] = { ...db.versions[versionId], status: "READY" };
    await writeDb(db);

    const b64 = async (p: string) => {
      const bytes = await readAssetFile(p);
      return bytes ? Buffer.from(bytes).toString("base64") : "";
    };
    const tutorEtag = crypto.createHash("sha1").update(versionId).digest("hex");

    return new NextResponse(
      JSON.stringify({
        preview: false,
        baseVersionId,
        versionId,
        diff: diffPreview,
        blueprint: nextBlueprint,
        midiBase64: midi.midiBase64,
        durationSec: midi.durationSec,
        kickTimesSec: midi.kickTimesSec,
        assets: {
          preview: { wavBase64: await b64(previewPath), assetId: previewAssetId },
          stems: {
            drums: await b64(drumsPath),
            bass: await b64(bassPath),
            chords: await b64(chordsPath),
            lead: await b64(leadPath),
          },
          ids: {
            blueprint: blueprintAssetId,
            midi: midiAssetId,
            preview: previewAssetId,
            stems: { drums: drumsAssetId, bass: bassAssetId, chords: chordsAssetId, lead: leadAssetId },
          },
        },
        tutor,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ETag: tutorEtag } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}

