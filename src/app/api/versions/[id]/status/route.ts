import { NextResponse } from "next/server";
import { readDb } from "@/lib/store/fsStore";

export const runtime = "nodejs";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = await readDb();
  const version = db.versions[id];
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const job = Object.values(db.jobs).find((j) => j.version_id === id) ?? null;
  return NextResponse.json({ version, job });
}

