import crypto from "crypto";
import type { Db, Id, AudioAsset } from "@/lib/model/types";

// Cloud storage adapter using Supabase (free tier, easy setup)
// Falls back to in-memory for local dev if env vars not set

let supabaseClient: any = null;
let supabaseStorage: any = null;

async function getSupabase() {
  if (supabaseClient) return { client: supabaseClient, storage: supabaseStorage };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null; // Will use in-memory fallback
  }

  try {
    // Dynamic import to avoid bundling in client
    const { createClient } = await import("@supabase/supabase-js");
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    supabaseStorage = supabaseClient.storage;
    return { client: supabaseClient, storage: supabaseStorage };
  } catch {
    return null;
  }
}

const MEMORY_DB: Db = {
  projects: {},
  versions: {},
  blueprints: {},
  tracks: {},
  midiClips: {},
  assets: {},
  jobs: {},
  iterationRequests: {},
  tutorContent: {},
};

export function newId(): Id {
  return crypto.randomUUID();
}

export function sha256(buf: Buffer | Uint8Array): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function getNowIso(): string {
  return new Date().toISOString();
}

// Database operations
export async function readDb(): Promise<Db> {
  const supabase = await getSupabase();
  if (!supabase) return MEMORY_DB;

  try {
    const { data, error } = await supabase.client.from("anima_db").select("data").eq("id", "main").single();
    if (error || !data) return MEMORY_DB;
    return data.data as Db;
  } catch {
    return MEMORY_DB;
  }
}

export async function writeDb(db: Db): Promise<void> {
  const supabase = await getSupabase();
  if (!supabase) {
    Object.assign(MEMORY_DB, db);
    return;
  }

  try {
    await supabase.client
      .from("anima_db")
      .upsert({ id: "main", data: db, updated_at: getNowIso() }, { onConflict: "id" });
  } catch (e) {
    console.error("Failed to write to Supabase:", e);
    Object.assign(MEMORY_DB, db);
  }
}

export async function upsertDb(mut: (db: Db) => Db): Promise<Db> {
  const db = await readDb();
  const next = mut(db);
  await writeDb(next);
  return next;
}

// File storage operations
export async function writeAssetFile(args: { assetId: string; ext: string; bytes: Uint8Array }): Promise<string> {
  const supabase = await getSupabase();
  const filename = `${args.assetId}.${args.ext}`;
  const bucket = "anima-assets";

  if (!supabase) {
    // In-memory fallback: return a virtual path
    return `memory://${filename}`;
  }

  try {
    const { error } = await supabase.storage.from(bucket).upload(filename, args.bytes, {
      contentType: args.ext === "wav" ? "audio/wav" : args.ext === "mid" ? "audio/midi" : args.ext === "json" ? "application/json" : "application/zip",
      upsert: true,
    });

    if (error) throw error;

    // Return public URL or path reference
    const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
    return data.publicUrl || `supabase://${bucket}/${filename}`;
  } catch (e) {
    console.error("Failed to upload asset:", e);
    return `memory://${filename}`;
  }
}

export async function writeAssetTextFile(args: { assetId: string; ext: string; text: string }): Promise<string> {
  const bytes = new Uint8Array(Buffer.from(args.text, "utf8"));
  return writeAssetFile({ assetId: args.assetId, ext: args.ext, bytes });
}

export async function readAssetFile(path: string): Promise<Uint8Array | null> {
  if (path.startsWith("memory://")) {
    return null; // In-memory assets not persisted
  }

  const supabase = await getSupabase();
  if (!supabase) return null;

  if (path.startsWith("supabase://")) {
    const [, bucket, filename] = path.split("/");
    try {
      const { data, error } = await supabase.storage.from(bucket).download(filename);
      if (error || !data) return null;
      return new Uint8Array(await data.arrayBuffer());
    } catch {
      return null;
    }
  }

  // Try to extract bucket/filename from URL
  try {
    const url = new URL(path);
    const parts = url.pathname.split("/");
    const bucket = parts[parts.length - 2];
    const filename = parts[parts.length - 1];
    const { data, error } = await supabase.storage.from(bucket).download(filename);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  } catch {
    return null;
  }
}

// Helper to get public URL for an asset
export async function getAssetUrl(asset: AudioAsset): Promise<string | null> {
  if (asset.path.startsWith("memory://")) return null;

  const supabase = await getSupabase();
  if (!supabase) return null;

  if (asset.path.startsWith("supabase://")) {
    const [, bucket, filename] = asset.path.split("/");
    const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
    return data.publicUrl;
  }

  // Assume it's already a URL
  return asset.path;
}
