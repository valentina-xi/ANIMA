import { NextResponse } from "next/server";
import { readDb } from "@/lib/store/fsStore";

export const runtime = "nodejs";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = await readDb();
  const project = db.projects[id];
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const versions = Object.values(db.versions)
    .filter((v) => v.project_id === id)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return NextResponse.json({ project, versions });
}

