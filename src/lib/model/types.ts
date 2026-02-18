import type { Blueprint } from "@/lib/blueprint/schema";

export type Id = string;

export type VersionStatus = "DRAFTING" | "PREVIEW_READY" | "RENDERING_FULL" | "READY" | "FAILED";
export type JobState = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";

export type Project = {
  id: Id;
  owner: "local";
  title: string;
  created_at: string;
};

export type Version = {
  id: Id;
  project_id: Id;
  parent_version_id: Id | null;
  status: VersionStatus;
  created_at: string;
};

export type BlueprintRow = {
  version_id: Id;
  schema_version: string;
  json: Blueprint;
};

export type TrackRole = "drums" | "bass" | "chords" | "lead" | "fx";

export type TrackRow = {
  version_id: Id;
  track_id: Id;
  role: TrackRole;
  instrument_id: string;
};

export type MidiClip = {
  id: Id;
  version_id: Id;
  track_id: Id;
  section_id: Id;
  bar_start: number;
  bar_end: number;
  midi_base64: string;
};

export type AudioAssetType = "mixdown" | "stem" | "preview" | "export_zip";

export type AudioAsset = {
  id: Id;
  version_id: Id;
  type: AudioAssetType;
  label: string;
  ext: "wav" | "mid" | "json" | "zip";
  path: string; // local path for MVP
  checksum: string; // sha256
  durationSec?: number;
};

export type RenderJob = {
  id: Id;
  version_id: Id;
  job_type: "HOOK_PREVIEW";
  state: JobState;
  progress: number; // 0..1
  created_at: string;
  updated_at: string;
  idempotency_key: string;
  cost_estimate?: { tokens?: number; seconds?: number };
  error?: string;
};

export type IterationRequest = {
  id: Id;
  version_id: Id;
  user_text: string;
  extracted_intent: string;
  diff_json: unknown;
  created_at: string;
};

export type TutorContent = {
  version_id: Id;
  lessons_json: unknown;
  missions_json: unknown;
};

export type RightsSnapshot = {
  version_id: Id;
  provider_terms_ref: string;
  sound_pack_refs: string[];
  created_at: string;
};

export type Db = {
  projects: Record<Id, Project>;
  versions: Record<Id, Version>;
  blueprints: Record<Id, BlueprintRow>;
  tracks: Record<Id, TrackRow[]>;
  midiClips: Record<Id, MidiClip[]>;
  assets: Record<Id, AudioAsset>;
  jobs: Record<Id, RenderJob>;
  iterationRequests: Record<Id, IterationRequest>;
  tutorContent: Record<Id, unknown>;
};

