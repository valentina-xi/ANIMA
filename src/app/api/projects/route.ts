import { NextResponse } from "next/server";
import crypto from "crypto";
import { getNowIso, newId, readDb, writeDb } from "@/lib/store/fsStore";
import type { Project } from "@/lib/model/types";

export const runtime = "nodejs";

export async function GET() {
  const db = await readDb();
  const projects = Object.values(db.projects).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { title?: string };
    const title = (body?.title || "Untitled Project").trim() || "Untitled Project";

    const db = await readDb();
    const id = newId();
    const project: Project = {
      id,
      owner: "local",
      title,
      created_at: getNowIso(),
    };
    db.projects[id] = project;
    await writeDb(db);

    const etag = crypto.createHash("sha1").update(id).digest("hex");
    return new NextResponse(JSON.stringify({ project }), {
      status: 201,
      headers: { "Content-Type": "application/json", ETag: etag },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}

