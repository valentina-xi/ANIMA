# 02 — System Architecture

This document describes the high-level system design, components, data flow, and deployment approach for ANIMA. Follow this architecture when implementing the app.

---

## 1. High-Level Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           ANIMA Web Application (SPA / PWA)                        │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│   │   React     │     │   Session   │     │   Action     │     │   Why        │   │
│   │   UI        │◄───►│   Store     │◄───►│   Timeline   │◄───►│   Panel      │   │
│   │   (Views)   │     │   (State)   │     │   (Ops Log)  │     │   (Tutor)    │   │
│   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └─────────────┘   │
│          │                   │                   │                              │
│          │                   │                   │                              │
│          ▼                   ▼                   ▼                              │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │                    Orchestration Layer (Co-Pilot Core)                     │   │
│   │  • Interpret user intent (text / buttons)                                  │   │
│   │  • Select agent(s) → Plan → ProposedOps → Diff Preview → Apply/Reject     │   │
│   │  • Emit ops to Action Timeline + update Session Store                      │   │
│   └──────────────────────────────────────────────────────────────────────────┘   │
│          │                              │                                        │
│          ▼                              ▼                                        │
│   ┌─────────────────┐          ┌─────────────────┐                             │
│   │  Agent System   │          │  Patch Graph     │                             │
│   │  (Groove, Mix,  │─────────►│  (Immutable     │                             │
│   │   Harmony, etc.)│  ops     │   representation)│                             │
│   └─────────────────┘          └────────┬────────┘                             │
│                                          │                                       │
│                                          ▼                                       │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │                         Audio Engine                                       │   │
│   │  • Web Audio API + AudioWorklet                                            │   │
│   │  • Renders Patch Graph → real-time playback + metering                     │   │
│   │  • Receives patch diffs, applies non-destructively                         │   │
│   └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
                                          │
                          (Optional)      ▼
                    ┌─────────────────────────────────────┐
                    │  Backend (MVP: optional)            │
                    │  • Persist sessions / blueprints    │
                    │  • Agent inference (if not local)   │
                    │  • Auth / billing (future)           │
                    └─────────────────────────────────────┘
```

---

## 2. Data Flow (Critical Paths)

### 2.1 User Says “Make It Bouncier”

1. **UI** captures intent (text or button) → **Orchestration**.
2. **Orchestration** selects **Groove Agent** (and possibly others).
3. **Agent** returns **Plan** + **ProposedOps** (e.g. swing %, ghost notes, hat density).
4. **Orchestration** builds **diff preview** (what will change / what stays locked) → **UI** shows “About to change: …”.
5. User **approves** (or tweaks) → **Orchestration** applies ops:
   - Appends ops to **Action Timeline** (with inverse for undo).
   - Updates **Patch Graph** (immutable update).
6. **Audio Engine** receives patch diff → updates Web Audio graph → playback reflects changes.
7. **Why Panel** is populated from agent’s explanation (what / why / listen for / manual steps).

### 2.2 User Undoes an Action

1. **Action Timeline** provides **inverse op** (or previous patch snapshot).
2. **Orchestration** applies inverse (or restores snapshot) to **Patch Graph**.
3. **Audio Engine** applies patch diff → playback reverts.
4. **Session Store** and **Action Timeline** state updated (op removed or marked undone).

### 2.3 Session Load / Export

- **Load:** Patch Graph + Action Timeline (ops log) + optional audio/MIDI assets → restore **Session Store** and **Audio Engine** state.
- **Export:** Serialize Patch Graph + ops log + MIDI → **blueprint** + **recipe** (action log).

---

## 3. Component Responsibilities

| Component | Responsibility | See Doc |
|-----------|-----------------|--------|
| **React UI** | Views, mixer, timeline, Why panel, diff preview, mode toggle | 07-FRONTEND-AND-UX.md |
| **Session Store** | Single source of truth: patch graph, timeline, mode, selection | 06-DATA-MODELS-AND-API.md |
| **Action Timeline** | Ordered list of ops + undo/redo stack; inverse ops or snapshots | 06, 07 |
| **Orchestration** | Intent → agents → Plan → ProposedOps → preview → apply | 05-AGENT-SYSTEM.md |
| **Agent System** | Groove, Harmony, Sound, Mix, Vocal agents; output ops only | 05-AGENT-SYSTEM.md |
| **Patch Graph** | Tracks, nodes, routing, automation (immutable) | 04-AUDIO-ENGINE.md, 06 |
| **Audio Engine** | Web Audio + Worklets; apply patch, play, meter | 04-AUDIO-ENGINE.md |

---

## 4. Deployment and Runtime (MVP)

- **MVP:** Single **web app** (SPA or PWA). No required backend; session can live in memory + optional `localStorage` or file export/import.
- **Hosting:** Static + optional serverless (e.g. Vercel, Netlify) for future API routes (persistence, agent API).
- **Audio:** All DSP in browser (Web Audio + AudioWorklet). No server-side audio for MVP.
- **Agents:** MVP can use **stub agents** (rule-based or small local models) or optional cloud API; architecture must support swapping in more capable models later.

---

## 5. Security and Constraints

- **No hardcoded secrets** in frontend; use env vars for any API keys (e.g. agent service).
- **User audio** stays in browser unless user explicitly exports or (future) syncs to backend.
- **Human-in-the-loop:** No automatic apply of destructive or irreversible actions without user confirmation where specified in UX.

---

## 6. References

- Previous: [01-VISION-AND-SCOPE.md](./01-VISION-AND-SCOPE.md)
- Next: [03-TECH-STACK.md](./03-TECH-STACK.md)
