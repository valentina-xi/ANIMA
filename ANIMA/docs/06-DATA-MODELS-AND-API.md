# 06 — Data Models and API

This document defines the **schemas** for session, patch graph, operations, action timeline, and export formats. Use these types and shapes consistently across the app.

---

## 1. Patch Graph (Detailed)

See 04-AUDIO-ENGINE for high-level structure. Below is an extended schema suitable for MVP + export.

```ts
// ---------- Patch Graph ----------
interface PatchGraph {
  version: 1;
  bpm: number;
  timeSignature: [number, number];
  tracks: Track[];
  master: MasterBus;
}

interface Track {
  id: string;
  name: string;
  type: 'midi' | 'audio';
  gain: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  inserts: InsertNode[];
  source?: MidiClipRef | AudioClipRef;
}

interface InsertNode {
  id: string;
  type: 'eq' | 'compressor' | 'filter' | 'saturation' | 'reverb' | 'delay';
  params: Record<string, number>;
  order: number;
}

interface MasterBus {
  gain: number;
  inserts: InsertNode[];
}

// ---------- Clip refs (MVP: MIDI focus) ----------
interface MidiClipRef {
  type: 'midi';
  clipId: string;
  pattern: MidiPattern;
}

interface MidiPattern {
  events: MidiEvent[];
  lengthBeats: number;
  swing?: number;   // 0..1
  groove?: string;  // e.g. "house_shuffle_12"
}

interface MidiEvent {
  time: number;     // beats
  note: number;
  velocity: number;
  duration: number;
}
```

---

## 2. Patch Diff (Ops)

```ts
type PatchDiff =
  | { op: 'setTrackParam'; trackId: string; param: 'gain' | 'pan' | 'mute' | 'solo'; value: number | boolean }
  | { op: 'setInsertParam'; trackId: string; insertId: string; param: string; value: number }
  | { op: 'addInsert'; trackId: string; insert: InsertNode }
  | { op: 'removeInsert'; trackId: string; insertId: string }
  | { op: 'setMidiPattern'; trackId: string; pattern: MidiPattern }
  | { op: 'setBpm'; bpm: number }
  | { op: 'setMasterParam'; param: string; value: number };
```

- Each diff type must have a defined **inverse** for undo (or store previous snapshot).

---

## 3. Action Timeline Entry

```ts
interface TimelineEntry {
  id: string;
  timestamp: number;           // Date.now() or session time
  label: string;               // Short label for timeline (e.g. "Add drum groove (house shuffle 12%)")
  ops: PatchDiff[];
  inverseOps: PatchDiff[];     // For undo
  agentId?: string;            // e.g. "groove", "mix"
  explanation?: ActionExplanation;
}

interface ActionExplanation {
  problem: string;
  whatChanged: string;
  listenFor: string;
  howToDoManually: string;
}
```

- **Undo:** Apply `inverseOps` to current patch and remove (or mark undone) this entry.
- **Tweak:** Allow user to edit params of this entry and re-apply (replace ops and inverse).

---

## 4. Session (Full State)

```ts
interface Session {
  id: string;
  version: number;
  patch: PatchGraph;
  timeline: TimelineEntry[];
  mode: 'live' | 'tutor' | 'autopilot';
  locked?: LockedRegions;   // Identity fingerprint: what not to change
}

interface LockedRegions {
  trackIds?: string[];
  insertIds?: string[];
  patternLock?: Record<string, boolean>;  // trackId -> lock pattern
}
```

---

## 5. Export Formats

### 5.1 Blueprint (Session Snapshot)

- **Purpose:** Recreate session (patch + timeline) for load or share.
- **Format:** JSON with `Session` (or a serializable subset: patch + timeline, no volatile refs).

```ts
interface BlueprintExport {
  version: 1;
  session: Session;
  exportedAt: string;  // ISO date
}
```

### 5.2 Recipe (Action Log Only)

- **Purpose:** Human- and machine-readable “what ANIMA did.”
- **Format:** List of timeline entries (ops + explanation) so someone can replicate steps.

```ts
interface RecipeExport {
  version: 1;
  bpm: number;
  entries: Array<{
    label: string;
    ops: PatchDiff[];
    explanation?: ActionExplanation;
  }>;
  exportedAt: string;
}
```

### 5.3 MIDI Export

- **Purpose:** Standard MIDI file (e.g. type 1) with tracks for Drums, Bass, Chords, Lead.
- **Source:** `MidiPattern` per track → MIDI events; use a small library (e.g. `midi-writer-js` or similar) to write .mid file.
- **MVP:** One track per ANIMA track; no automation in MIDI if not in scope.

---

## 6. API (Optional Backend)

MVP can be **fully client-side**. If you add a backend later:

- **POST /session** — Create or save session (body: `Session` or `BlueprintExport`).
- **GET /session/:id** — Load session.
- **POST /agent/:agentId** — Call agent with context (body: `AgentRequest`); response: `AgentResponse` (see 05-AGENT-SYSTEM).

Keep **agent output contract** (AgentResponse) identical whether agents run locally or on server.

---

## 7. Persistence (MVP)

- **In-memory:** Primary; session lives in Zustand store.
- **localStorage:** Optional; save/load blueprint JSON keyed by session id.
- **File:** Export blueprint + recipe + MIDI as downloads; import blueprint from file picker.

---

## 8. References

- Previous: [05-AGENT-SYSTEM.md](./05-AGENT-SYSTEM.md)
- Next: [07-FRONTEND-AND-UX.md](./07-FRONTEND-AND-UX.md)
- Audio: [04-AUDIO-ENGINE.md](./04-AUDIO-ENGINE.md)
