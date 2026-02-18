import { NextResponse } from "next/server";
import { readDb } from "@/lib/store/fsStore";

export const runtime = "nodejs";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = await readDb();
  const version = db.versions[id];
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assets = Object.values(db.assets).filter((a) => a.version_id === id);
  return NextResponse.json({
    version,
    assets: assets.map((a) => ({
      id: a.id,
      type: a.type,
      label: a.label,
      ext: a.ext,
      checksum: a.checksum,
      durationSec: a.durationSec ?? null,
      downloadUrl: `/api/assets/${a.id}`,
    })),
  });
}

