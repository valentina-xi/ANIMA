import { NextResponse } from "next/server";
import { readDb, readAssetFile, getAssetUrl } from "@/lib/store/fsStore";

export const runtime = "nodejs";

function contentType(ext: string) {
  if (ext === "wav") return "audio/wav";
  if (ext === "mid") return "audio/midi";
  if (ext === "json") return "application/json";
  if (ext === "zip") return "application/zip";
  return "application/octet-stream";
}

export async function GET(_: Request, ctx: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await ctx.params;
  const db = await readDb();
  const asset = db.assets[assetId];
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Try to get public URL first (for cloud storage)
  const publicUrl = await getAssetUrl(asset);
  if (publicUrl) {
    return NextResponse.redirect(publicUrl);
  }

  // Fallback: read file bytes
  const bytes = await readAssetFile(asset.path);
  if (!bytes) return NextResponse.json({ error: "Asset file not found" }, { status: 410 });

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType(asset.ext),
      "Content-Disposition": `attachment; filename="${asset.label}.${asset.ext}"`,
      "X-Checksum-Sha256": asset.checksum,
    },
  });
}

