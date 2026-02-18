import { NextResponse } from "next/server";
import { readDb, writeDb, newId, getNowIso, writeAssetFile, sha256, readAssetFile } from "@/lib/store/fsStore";
import { createZipStore } from "@/lib/export/zip";

export const runtime = "nodejs";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: versionId } = await ctx.params;
  try {
    const db = await readDb();
    const version = db.versions[versionId];
    if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const blueprint = db.blueprints[versionId]?.json;
    if (!blueprint) return NextResponse.json({ error: "Blueprint missing" }, { status: 500 });

    const assets = Object.values(db.assets).filter((a) => a.version_id === versionId);
    const byLabel = (label: string) => assets.find((a) => a.label === label) ?? null;

    const blueprintA = byLabel("blueprint");
    const midiA = byLabel("midi");
    const previewA = byLabel("preview-mix");
    const stems = {
      drums: byLabel("drums"),
      bass: byLabel("bass"),
      chords: byLabel("chords"),
      lead: byLabel("lead"),
    };

    if (!blueprintA || !midiA || !previewA || !stems.drums || !stems.bass || !stems.chords || !stems.lead) {
      return NextResponse.json({ error: "Missing required assets for export" }, { status: 500 });
    }

    const read = async (p: string) => {
      const bytes = await readAssetFile(p);
      return bytes || new Uint8Array(0);
    };

    const manifest = {
      schemaVersion: "0.1",
      versionId,
      exportedAt: getNowIso(),
      global: blueprint.global,
      structure: blueprint.structure,
      tracks: blueprint.tracks,
      files: [
        { path: "blueprint.json", type: "blueprint", checksum: blueprintA.checksum },
        { path: "midi/hook.mid", type: "midi", checksum: midiA.checksum },
        { path: "preview/preview-mix.wav", type: "preview", checksum: previewA.checksum, durationSec: previewA.durationSec ?? null },
        { path: "stems/drums.wav", type: "stem", role: "drums", checksum: stems.drums.checksum, durationSec: stems.drums.durationSec ?? null },
        { path: "stems/bass.wav", type: "stem", role: "bass", checksum: stems.bass.checksum, durationSec: stems.bass.durationSec ?? null },
        { path: "stems/chords.wav", type: "stem", role: "chords", checksum: stems.chords.checksum, durationSec: stems.chords.durationSec ?? null },
        { path: "stems/lead.wav", type: "stem", role: "lead", checksum: stems.lead.checksum, durationSec: stems.lead.durationSec ?? null },
      ],
    };

    const zip = createZipStore([
      { name: "manifest.json", bytes: new Uint8Array(Buffer.from(JSON.stringify(manifest, null, 2), "utf8")) },
      { name: "blueprint.json", bytes: await read(blueprintA.path) },
      { name: "midi/hook.mid", bytes: await read(midiA.path) },
      { name: "preview/preview-mix.wav", bytes: await read(previewA.path) },
      { name: "stems/drums.wav", bytes: await read(stems.drums.path) },
      { name: "stems/bass.wav", bytes: await read(stems.bass.path) },
      { name: "stems/chords.wav", bytes: await read(stems.chords.path) },
      { name: "stems/lead.wav", bytes: await read(stems.lead.path) },
    ]);

    const exportAssetId = newId();
    const zipPath = await writeAssetFile({ assetId: exportAssetId, ext: "zip", bytes: zip.bytes });

    db.assets[exportAssetId] = {
      id: exportAssetId,
      version_id: versionId,
      type: "export_zip",
      label: "export-pack",
      ext: "zip",
      path: zipPath,
      checksum: zip.checksum,
    };
    await writeDb(db);

    // Also return base64 for convenience (small enough for MVP)
    const zipBase64 = Buffer.from(zip.bytes).toString("base64");
    const checksum = sha256(Buffer.from(zip.bytes));

    return NextResponse.json({
      versionId,
      export: {
        assetId: exportAssetId,
        checksum,
        downloadUrl: `/api/assets/${exportAssetId}`,
        zipBase64,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}

