# 08 — MVP Implementation Guide

This document gives the **junior developer** a clear **build order**, **acceptance criteria**, and **milestones** for the MVP. Follow this sequence; each phase builds on the previous.

---

## 1. MVP Goal (Reminder)

**“Produce a hook from scratch while teaching.”**

- 4 tracks: Drums, Bass, Chords, Lead.
- Action Timeline + undo/redo.
- Live effect chain: Filter/EQ + Compressor + Reverb.
- “Make it bouncier” → swing, ghost notes, hat density, bass pocket.
- Tutor overlay: “Why this worked” + listening prompts.
- Export: MIDI + blueprint + action log (recipe).

---

## 2. Build Order (Phases)

### Phase 1: Foundation (Week 1–2)

| Step | Task | Deliverable |
|------|------|-------------|
| 1.1 | Initialize repo: Vite + React + TypeScript + Zustand + Tailwind + Radix (per 03-TECH-STACK). | `npm run dev` runs; lint/format pass. |
| 1.2 | Define TypeScript types for Patch Graph, Track, InsertNode, PatchDiff, TimelineEntry, Session (06-DATA-MODELS-AND-API). | `src/models/` with shared types. |
| 1.3 | Implement **patch diff apply**: function `applyDiff(patch: PatchGraph, diff: PatchDiff): PatchGraph` and **inverse** for each diff type. | Unit tests for apply + undo. |
| 1.4 | Create Zustand **session store**: patch (initial 4 tracks, empty inserts), timeline (empty), mode. | Store updates when patch/timeline change. |

**Exit criteria:** Types and store exist; applying a manual diff updates the store; inverse diff restores previous patch (tested).

---

### Phase 2: Audio Engine (Week 2–3)

| Step | Task | Deliverable |
|------|------|-------------|
| 2.1 | Create AudioContext, resume on user gesture. Create one gain node per track and route to destination. | Playback of silence or test tone per track. |
| 2.2 | Implement **AudioWorklet** processors: EQ (biquad or param), Compressor (use native DynamicsCompressor or worklet), Reverb (convolution or algo). | Processors load; params controllable from main thread. |
| 2.3 | **Sync Patch Graph to Web Audio:** When patch store changes, create/update nodes (insert chain: source → EQ → Comp → Reverb → gain → destination). | Changing store patch updates audio graph; no full teardown on small changes. |
| 2.4 | Add simple **MIDI/source** path: e.g. Tone.js or custom scheduler to trigger notes for one track (Drums or Bass). | One track plays a loop; level/inserts affect sound. |

**Exit criteria:** 4 tracks exist in graph; at least one track has a playing pattern; changing EQ/comp/reverb params in store changes sound; no crashes on param update.

---

### Phase 3: Action Timeline + Undo (Week 3–4)

| Step | Task | Deliverable |
|------|------|-------------|
| 3.1 | Implement **append to timeline**: given ops + inverse ops + label + explanation, add TimelineEntry to store and apply ops to patch. | One “fake” action (e.g. “Set drums gain to -6 dB”) applies and appears in timeline. |
| 3.2 | Implement **Undo**: pop or get inverse of last entry; apply inverse to patch; update store and re-sync audio engine. | Undo reverts last action (sound + patch state). |
| 3.3 | Build **Action Timeline UI** (list of entries, label, [Undo] [Tweak] [Why]). Wire Undo button to store action. | User can undo from UI. |
| 3.4 | **Tweak:** For a selected entry, allow editing one param (e.g. gain value); re-apply ops with new value, replace entry’s ops/inverse. | Tweak updates patch and timeline entry. |

**Exit criteria:** User can apply a manual action, see it in timeline, undo it, and (optionally) tweak it.

---

### Phase 4: Agents + Orchestration (Week 4–5)

| Step | Task | Deliverable |
|------|------|-------------|
| 4.1 | Define **AgentResponse** and **ActionExplanation** in code; implement **stub Groove Agent**: input “make it bouncier” → fixed ProposedOps (e.g. set swing, add ghost notes pattern) + canned explanation. | Stub returns valid AgentResponse. |
| 4.2 | Implement **Orchestration**: on intent “make it bouncier”, call Groove Agent; receive ProposedOps; show **Diff Preview** (“I will change: …”) and [Apply] [Reject]. | Diff preview appears; Apply runs apply flow. |
| 4.3 | On Apply: append ops to timeline, update patch, sync audio engine, show **Why panel** with explanation. | One click “Make it bouncier” → timeline + sound + why. |
| 4.4 | Add **stub Mix Agent**: e.g. “Add warmth” → EQ + comp ops + explanation. Wire to intent. | Second agent path works. |

**Exit criteria:** User can trigger “Make it bouncier” and “Add warmth” (or similar); diff preview shows; after apply, timeline + why panel + audio reflect the change; undo works.

---

### Phase 5: Full UI + Tutor + Export (Week 5–6)

| Step | Task | Deliverable |
|------|------|-------------|
| 5.1 | **Mixer UI:** Per-track faders, mute/solo, insert list; bind to patch store. Changing fader updates patch and audio. | Mixer controls work. |
| 5.2 | **Why panel:** Bind to selected timeline entry or last applied; render problem, whatChanged, listenFor, howToDoManually. | Why panel shows correct explanation. |
| 5.3 | **Mode toggle:** Live / Tutor / Autopilot. Tutor can show more text or “mission” placeholder. | Mode persists and affects UI copy/behavior. |
| 5.4 | **Export Blueprint:** Serialize session (patch + timeline) to JSON; download. **Export Recipe:** Timeline entries only (label + ops + explanation); download. | Two export buttons work. |
| 5.5 | **Export MIDI:** Map each track’s MidiPattern to MIDI events; use library to write .mid; download. | MIDI file plays in external DAW with correct notes. |

**Exit criteria:** Mixer and Why panel are usable; Blueprint and Recipe export; MIDI export produces valid file.

---

## 3. Acceptance Criteria (MVP Done)

- [ ] User can open app, see 4 tracks (Drums, Bass, Chords, Lead).
- [ ] User can trigger “Make it bouncier” (or button); diff preview appears; on Apply, timeline shows the action and sound changes (swing/ghost notes, etc.).
- [ ] User can undo the action; sound and patch revert.
- [ ] User can open Why panel and see: what problem it solved, what changed, what to listen for, how to do it manually.
- [ ] Mixer shows per-track inserts (EQ, Comp, Reverb) and levels; changing params updates sound.
- [ ] Export produces: (1) Blueprint JSON, (2) Recipe (action log), (3) MIDI file.

---

## 4. Non-Goals for MVP (Do Not Scope Creep)

- Full song generation.
- Advanced mastering.
- Singing voice synthesis.
- Real LLM integration (stub agents are fine).
- Multi-user or backend persistence (optional localStorage only).

---

## 5. References

- Vision: [01-VISION-AND-SCOPE.md](./01-VISION-AND-SCOPE.md)
- Stack: [03-TECH-STACK.md](./03-TECH-STACK.md)
- Audio: [04-AUDIO-ENGINE.md](./04-AUDIO-ENGINE.md)
- Agents: [05-AGENT-SYSTEM.md](./05-AGENT-SYSTEM.md)
- Data: [06-DATA-MODELS-AND-API.md](./06-DATA-MODELS-AND-API.md)
- UI: [07-FRONTEND-AND-UX.md](./07-FRONTEND-AND-UX.md)
- Master: [ANIMA_ARCHITECTURE.md](./ANIMA_ARCHITECTURE.md)
