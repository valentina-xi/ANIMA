import { NextResponse } from "next/server";
import crypto from "crypto";
import { createHookPreview } from "@/lib/orchestrator/createHookPreview";
import type { Db, RenderJob, Version } from "@/lib/model/types";
import { BlueprintSchemaVersion } from "@/lib/blueprint/schema";
import { getNowIso, newId, readDb, sha256, writeAssetFile, writeAssetTextFile, writeDb, readAssetFile } from "@/lib/store/fsStore";
import { buildHookMidi } from "@/lib/producer/hookMidi";
import { generateTutorContent } from "@/lib/tutor/generateTutor";

export const runtime = "nodejs";

type CreateVersionRequest = {
  prompt: string;
  lyrics?: string;
  genre?: string;
  mood?: string;
  era?: string;
  intensity?: number;
  idempotencyKey?: string;
};

function stableStringify(obj: unknown) {
  return JSON.stringify(obj, Object.keys(obj as any).sort());
}

function computeIdempotencyKey(body: CreateVersionRequest) {
  if (body.idempotencyKey && typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()) {
    return body.idempotencyKey.trim();
  }
  const s = stableStringify({
    prompt: body.prompt ?? "",
    lyrics: body.lyrics ?? "",
    genre: body.genre ?? "",
    mood: body.mood ?? "",
    era: body.era ?? "",
    intensity: body.intensity ?? null,
  });
  return crypto.createHash("sha256").update(s).digest("hex");
}

function findExistingByIdempotency(db: Db, projectId: string, idem: string) {
  const job = Object.values(db.jobs).find((j) => j.idempotency_key === idem);
  if (!job) return null;
  const v = db.versions[job.version_id];
  if (!v || v.project_id !== projectId) return null;
  if (job.state !== "SUCCEEDED") return null;
  return { version: v, job };
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await ctx.params;

  try {
    const body = (await req.json()) as CreateVersionRequest;
    if (!body?.prompt || typeof body.prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const db = await readDb();
    if (!db.projects[projectId]) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const idem = computeIdempotencyKey(body);
    const existing = findExistingByIdempotency(db, projectId, idem);
    if (existing) {
      const versionId = existing.version.id;
      const blueprint = db.blueprints[versionId]?.json;
      if (!blueprint) return NextResponse.json({ error: "Reused version missing blueprint" }, { status: 500 });

      const midi = buildHookMidi(blueprint);

      const assets = Object.values(db.assets).filter((a) => a.version_id === versionId);
      const byLabel = (label: string) => assets.find((a) => a.label === label) ?? null;
      const previewA = byLabel("preview-mix");
      const stemA = {
        drums: byLabel("drums"),
        bass: byLabel("bass"),
        chords: byLabel("chords"),
        lead: byLabel("lead"),
      };

      if (!previewA || !stemA.drums || !stemA.bass || !stemA.chords || !stemA.lead) {
        return NextResponse.json({ error: "Reused version missing assets" }, { status: 500 });
      }

      const b64 = async (path: string) => {
        const bytes = await readAssetFile(path);
        return bytes ? Buffer.from(bytes).toString("base64") : "";
      };

      return NextResponse.json({
        reused: true,
        projectId,
        versionId,
        blueprint,
        midiBase64: midi.midiBase64,
        durationSec: midi.durationSec,
        kickTimesSec: midi.kickTimesSec,
        tutor: db.tutorContent[versionId] ?? generateTutorContent({ blueprint }),
        assets: {
          preview: { wavBase64: b64(previewA.path), assetId: previewA.id },
          stems: {
            drums: b64(stemA.drums.path),
            bass: b64(stemA.bass.path),
            chords: b64(stemA.chords.path),
            lead: b64(stemA.lead.path),
          },
          ids: {
            blueprint: assets.find((a) => a.label === "blueprint")?.id ?? null,
            midi: assets.find((a) => a.label === "midi")?.id ?? null,
            preview: previewA.id,
            stems: { drums: stemA.drums.id, bass: stemA.bass.id, chords: stemA.chords.id, lead: stemA.lead.id },
          },
        },
      });
    }

    const versionId = newId();
    const jobId = newId();
    const created_at = getNowIso();

    const version: Version = {
      id: versionId,
      project_id: projectId,
      parent_version_id: null,
      status: "DRAFTING",
      created_at,
    };

    const job: RenderJob = {
      id: jobId,
      version_id: versionId,
      job_type: "HOOK_PREVIEW",
      state: "RUNNING",
      progress: 0,
      created_at,
      updated_at: created_at,
      idempotency_key: idem,
    };

    db.versions[versionId] = version;
    db.jobs[jobId] = job;
    await writeDb(db);

    const { blueprint, midi, render } = createHookPreview(body);
    const tutor = generateTutorContent({ blueprint });

    // --- Write immutable assets ---
    const blueprintAssetId = newId();
    const midiAssetId = newId();
    const previewAssetId = newId();
    const drumsAssetId = newId();
    const bassAssetId = newId();
    const chordsAssetId = newId();
    const leadAssetId = newId();

    const blueprintText = JSON.stringify(blueprint, null, 2);
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

    const next = await readDb();
    next.blueprints[versionId] = { version_id: versionId, schema_version: BlueprintSchemaVersion, json: blueprint };
    next.tracks[versionId] = blueprint.tracks.map((t) => ({
      version_id: versionId,
      track_id: t.id,
      role: t.role,
      instrument_id: t.instrumentId,
    }));
    next.midiClips[versionId] = blueprint.tracks.map((t) => ({
      id: newId(),
      version_id: versionId,
      track_id: t.id,
      section_id: blueprint.structure[0]?.id ?? "chorus",
      bar_start: 0,
      bar_end: blueprint.structure[0]?.bars ?? 8,
      midi_base64: midi.midiBase64, // MVP: same file for all tracks; later store per-track
    }));

    next.assets[blueprintAssetId] = {
      id: blueprintAssetId,
      version_id: versionId,
      type: "preview",
      label: "blueprint",
      ext: "json",
      path: blueprintPath,
      checksum: blueprintChecksum,
    };
    next.assets[midiAssetId] = {
      id: midiAssetId,
      version_id: versionId,
      type: "preview",
      label: "midi",
      ext: "mid",
      path: midiPath,
      checksum: midiChecksum,
      durationSec: midi.durationSec,
    };
    next.assets[previewAssetId] = {
      id: previewAssetId,
      version_id: versionId,
      type: "preview",
      label: "preview-mix",
      ext: "wav",
      path: previewPath,
      checksum: previewChecksum,
      durationSec: render.mixdown.durationSec,
    };
    next.assets[drumsAssetId] = {
      id: drumsAssetId,
      version_id: versionId,
      type: "stem",
      label: "drums",
      ext: "wav",
      path: drumsPath,
      checksum: sha256(stemBytes.drums),
      durationSec: render.stems.drums.durationSec,
    };
    next.assets[bassAssetId] = {
      id: bassAssetId,
      version_id: versionId,
      type: "stem",
      label: "bass",
      ext: "wav",
      path: bassPath,
      checksum: sha256(stemBytes.bass),
      durationSec: render.stems.bass.durationSec,
    };
    next.assets[chordsAssetId] = {
      id: chordsAssetId,
      version_id: versionId,
      type: "stem",
      label: "chords",
      ext: "wav",
      path: chordsPath,
      checksum: sha256(stemBytes.chords),
      durationSec: render.stems.chords.durationSec,
    };
    next.assets[leadAssetId] = {
      id: leadAssetId,
      version_id: versionId,
      type: "stem",
      label: "lead",
      ext: "wav",
      path: leadPath,
      checksum: sha256(stemBytes.lead),
      durationSec: render.stems.lead.durationSec,
    };

    next.versions[versionId] = { ...version, status: "READY" };
    next.jobs[jobId] = { ...job, state: "SUCCEEDED", progress: 1, updated_at: getNowIso() };
    next.tutorContent[versionId] = tutor;
    await writeDb(next);

    return NextResponse.json({
      reused: false,
      projectId,
      versionId,
      blueprint,
      midiBase64: midi.midiBase64,
      durationSec: midi.durationSec,
      kickTimesSec: midi.kickTimesSec,
      tutor,
      assets: {
        preview: { wavBase64: render.mixdown.wavBase64, assetId: previewAssetId },
        stems: {
          drums: render.stems.drums.wavBase64,
          bass: render.stems.bass.wavBase64,
          chords: render.stems.chords.wavBase64,
          lead: render.stems.lead.wavBase64,
        },
        ids: {
          blueprint: blueprintAssetId,
          midi: midiAssetId,
          preview: previewAssetId,
          stems: { drums: drumsAssetId, bass: bassAssetId, chords: chordsAssetId, lead: leadAssetId },
        },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}

