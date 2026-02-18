// This file now re-exports from cloudStore for backward compatibility
// Cloud store automatically falls back to in-memory if Supabase not configured
export {
  newId,
  sha256,
  getNowIso,
  readDb,
  writeDb,
  upsertDb,
  writeAssetFile,
  writeAssetTextFile,
  readAssetFile,
  getAssetUrl,
} from "./cloudStore";

