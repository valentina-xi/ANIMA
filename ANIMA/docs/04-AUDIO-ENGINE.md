# 04 — Audio Engine

This document defines how ANIMA’s audio engine works: Web Audio API, AudioWorklet, the Patch Graph representation, and how **actions** become **patch diffs** that are applied live, logged, and reversible.

---

## 1. Design Principles

1. **Web-first:** Web Audio API + **AudioWorklet** only (no deprecated ScriptProcessorNode).
2. **Transparent graph:** Every change is a **patch diff** → apply to graph → log → reversible.
3. **Non-destructive:** Applying an op does not destroy previous state; undo applies inverse diff or restores snapshot.
4. **Low latency:** DSP runs in AudioWorklet thread; main thread only sends control messages (e.g. via MessagePort or `AudioParam` automation).

---

## 2. Patch Graph (Data Model)

The **Patch Graph** is the single source of truth for “what is connected and what are the parameters.” It is **independent** of the Web Audio node graph; the **Audio Engine** turns the Patch Graph into a live Web Audio graph.

### 2.1 Top-Level Structure

```ts
interface PatchGraph {
  bpm: number;
  timeSignature: [number, number];
  tracks: Track[];
  master: MasterBus;
  routing?: RoutingTable;   // sends, groups (optional for MVP)
}

interface Track {
  id: string;
  name: string;           // e.g. "Drums", "Bass", "Chords", "Lead"
  type: 'midi' | 'audio';
  gain: number;           // linear or dB
  pan: number;            // -1 .. 1
  mute: boolean;
  solo: boolean;
  inserts: InsertNode[];  // ordered chain: EQ → Comp → Reverb, etc.
  source?: MidiClipRef | AudioClipRef;
}

interface InsertNode {
  id: string;
  type: 'eq' | 'compressor' | 'filter' | 'saturation' | 'reverb' | 'delay';
  params: Record<string, number>;  // e.g. { frequency: 280, gain: -3, Q: 1.2 }
  order: number;
}

interface MasterBus {
  gain: number;
  inserts: InsertNode[];
}
```

- **MVP:** At least **Filter/EQ**, **Compressor**, **Reverb** per track or on master. Exact param set per node type is defined in 06-DATA-MODELS-AND-API.

### 2.2 Patch Diff

A **patch diff** is a description of **changes** to the Patch Graph (not the full graph). It is what agents output and what the engine applies.

```ts
type PatchDiff =
  | { op: 'setTrackParam'; trackId: string; param: string; value: number }
  | { op: 'setInsertParam'; trackId: string; insertId: string; param: string; value: number }
  | { op: 'addInsert'; trackId: string; insert: InsertNode }
  | { op: 'removeInsert'; trackId: string; insertId: string }
  | { op: 'setMidiPattern'; trackId: string; pattern: MidiPattern }
  | { op: 'setBpm'; bpm: number }
  // ... extend as needed
  ;
```

- **Apply:** Given current `PatchGraph` and a `PatchDiff[]`, produce new `PatchGraph` (immutable).
- **Inverse:** For undo, each diff type must have a defined **inverse** (or store previous snapshot).

---

## 3. Web Audio + AudioWorklet Architecture

### 3.1 Context and Threading

- **AudioContext:** Single context per app/session; resume on user gesture (e.g. first play).
- **AudioWorklet:** Load custom processors with `audioContext.audioWorklet.addModule('path/to/processor.js')`. All custom DSP (EQ, comp, reverb) runs in the **audio thread** via `AudioWorkletNode`.

### 3.2 Graph Mapping (Patch Graph → Web Audio)

- **One chain per track:**  
  `Source (BufferSource / Oscillator / etc.) → Insert1 → Insert2 → … → Gain → Panner → Destination (or submix)`.
- **Insert nodes:** Each `InsertNode` in the patch becomes an `AudioWorkletNode` (or a native node like `BiquadFilterNode`, `DynamicsCompressorNode`) with params driven from `InsertNode.params`.
- **When patch diff applies:** Recompute only the **changed** part of the graph (e.g. update `AudioParam` values, or disconnect/reconnect nodes if order or type changed). Avoid tearing down the entire graph if possible for glitch-free playback.

### 3.3 AudioWorklet Processors (MVP)

Implement at least:

| Processor | Role | Key params (example) |
|-----------|------|----------------------|
| **EQ** | Biquad or parametric | frequency, gain, Q |
| **Compressor** | Dynamics | threshold, ratio, attack, release, knee |
| **Reverb** | Convolution or algorithmic | decay, preDelay, mix (wet/dry) |

- Each processor runs in the worklet; receive params via `port.postMessage` or `AudioParam` automation from main thread.
- **Metering:** Use `AnalyserNode` or a custom worklet that posts RMS/peak back to main thread for UI.

---

## 4. Actions and Reversibility

- **Action** = user- or agent-triggered change. It is stored in the **Action Timeline** with:
  - **Op(s):** One or more `PatchDiff` (or higher-level op that compiles to patch diffs).
  - **Inverse op(s):** For undo (or a snapshot of patch state before apply).
  - **Meta:** Agent id, “why” text, timestamp.

- **Apply flow:**
  1. Compute new `PatchGraph` from current graph + diff(s).
  2. Update **Session Store** (new patch graph).
  3. **Audio Engine** receives new graph (or diff) and updates Web Audio graph / params.
  4. Append to **Action Timeline** with inverse for undo.

- **Undo flow:**
  1. Pop from timeline (or get inverse op).
  2. Apply inverse diff to current `PatchGraph`.
  3. Update Session Store and Audio Engine as above.

---

## 5. Latency and Performance

- **Buffer size:** Prefer low latency (e.g. 128 or 256 samples) where supported; document required user setting (e.g. “Use low latency audio” in browser).
- **Message passing:** Minimize `postMessage` between main and worklet; batch param updates or use `AudioParam.setValueAtTime` / automation where possible.
- **Realtime safety:** Do not allocate large objects or do heavy work inside the worklet process callback; only DSP and param reads.

---

## 6. References

- Previous: [03-TECH-STACK.md](./03-TECH-STACK.md)
- Next: [05-AGENT-SYSTEM.md](./05-AGENT-SYSTEM.md)
- Data shapes: [06-DATA-MODELS-AND-API.md](./06-DATA-MODELS-AND-API.md)
