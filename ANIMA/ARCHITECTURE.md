# ANIMA — Master Architecture & System Design

**Document version:** 1.0  
**Last updated:** February 2026  
**Audience:** Junior developers implementing ANIMA. Follow this architecture and all decisions in this document set.

---

## What is ANIMA?

**ANIMA** = **Interactive Producer/Engineer Co-Pilot** (product name; not a generator).

- **Not** a generator. It is a **co-pilot**: you provide creative direction and approval; ANIMA proposes actions and applies them **live** and **non-destructively**.
- Every move is **visible**: what it did, the chain, the parameters, and why. You can undo, A/B, tweak, and learn at each step.
- Think: *"A real producer's hands + brain"* inside an interface where every knob is exposed.

---

## Document Map (Read in Order)

All detailed docs live in the **docs/** folder. This file is a copy of the master so you can open it from the project root.

| # | Document | Purpose |
|---|----------|--------|
| 1 | [docs/01-VISION-AND-SCOPE.md](docs/01-VISION-AND-SCOPE.md) | Product vision, product modes, lanes, MVP scope, non-goals |
| 2 | [docs/02-SYSTEM-ARCHITECTURE.md](docs/02-SYSTEM-ARCHITECTURE.md) | High-level system design, services, data flow, deployment |
| 3 | [docs/03-TECH-STACK.md](docs/03-TECH-STACK.md) | Technologies, versions, rationale, 2025–2026 best practices |
| 4 | [docs/04-AUDIO-ENGINE.md](docs/04-AUDIO-ENGINE.md) | Web Audio, AudioWorklets, patch graph, actions, reversibility |
| 5 | [docs/05-AGENT-SYSTEM.md](docs/05-AGENT-SYSTEM.md) | Agent types, Plan → Propose → Preview → Apply, outputs |
| 6 | [docs/06-DATA-MODELS-AND-API.md](docs/06-DATA-MODELS-AND-API.md) | Schemas, API design, persistence, export formats |
| 7 | [docs/07-FRONTEND-AND-UX.md](docs/07-FRONTEND-AND-UX.md) | UI layout, Action Timeline, Why panel, mixer, diff preview |
| 8 | [docs/08-MVP-IMPLEMENTATION.md](docs/08-MVP-IMPLEMENTATION.md) | MVP build order, acceptance criteria, milestones |
| — | [docs/ADR-TEMPLATE.md](docs/ADR-TEMPLATE.md) | How to record architecture changes (ADRs) |
| ★ | [docs/RUN-IN-BROWSER.md](docs/RUN-IN-BROWSER.md) | Run and build ANIMA 100% in the browser (no installs) |

---

## High-Level Architecture (Summary)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ANIMA (Web App)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐               │
│  │   UI Layer      │  │  Session State  │  │  Action Timeline │               │
│  │   (React)       │◄─┤  (Zustand/     │◄─┤  (Ops + Undo)    │               │
│  │                 │  │   Immutable)    │  │                  │               │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘               │
│           │                    │                    │                         │
│           ▼                    ▼                    ▼                         │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                     Orchestration / Co-Pilot Layer                       │  │
│  │   User intent → Agent selection → Plan → ProposedOps → Preview → Apply  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│           │                    │                    │                         │
│           ▼                    ▼                    ▼                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐               │
│  │  Agent System   │  │  Patch Graph    │  │  Audio Engine   │               │
│  │  (Groove, Mix,  │  │  (Tracks, nodes,│  │  (WebAudio +    │               │
│  │   Harmony, etc.)│  │   routing)      │  │   Worklets)     │               │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **UI Layer:** Renders session, Action Timeline, mixer, effect chains, Why panel, diff preview.
- **Session State:** Single source of truth for session (tracks, patch graph snapshot, mode).
- **Action Timeline:** Log of operations; each op is reversible and tweakable.
- **Orchestration:** Translates user intent into agent calls, then applies patch diffs.
- **Agent System:** Specialized agents emit **operations** (not full songs).
- **Patch Graph:** In-memory representation of tracks, nodes, routing, automation.
- **Audio Engine:** Web Audio + AudioWorklets; applies patch state for real-time playback.

---

## Core Technical Principles

1. **Transparent audio graph** — Every change is a **patch diff** → apply live → log → reversible.
2. **Operations, not blobs** — Agents output structured **ops** (e.g. "add swing 12%", "EQ -3dB @ 280Hz"); no opaque "AI stem."
3. **Explainability** — Every action has: what changed, why, what to listen for, how to do it manually.
4. **Human-in-the-loop** — User approves (or rejects/tweaks) before or after apply; diff preview before applying.
5. **Web-first** — WebAudio + AudioWorklets for low-latency DSP; no desktop-only dependency for MVP.

---

## MVP in One Paragraph

**Goal:** *"Produce a hook from scratch while teaching."*

User starts with nothing or a simple idea; ANIMA builds a hook **step-by-step**. Session has 4 tracks (Drums, Bass, Chords, Lead). Action Timeline + undo/redo. Live effect chain (Filter/EQ, Compressor, Reverb). "Make it bouncier" → swing, ghost notes, hat density, bass pocket. Tutor overlay explains why. Export: MIDI + blueprint + action log (recipe).

---

## Strategic Positioning

- **ANIMA wins on:** control, explainability, repeatability, real learning, trust.
- **Not:** "generate fast" or "better than everything."
- **Safer long-term:** "ANIMA helps you produce" (human-in-the-loop) vs "ANIMA spits out fully-AI songs" — aligns with platform and regulatory expectations.

---

## Next Steps for the Junior Developer

1. Read **docs/01-VISION-AND-SCOPE.md** to internalize product modes and lanes.
2. Read **docs/03-TECH-STACK.md** and set up the repo and tooling.
3. Implement **docs/04-AUDIO-ENGINE.md** (patch graph + Web Audio) so playback and ops work.
4. Implement **docs/05-AGENT-SYSTEM.md** (or stub agents) and **docs/06-DATA-MODELS-AND-API.md** (ops schema, session schema).
5. Build UI per **docs/07-FRONTEND-AND-UX.md** and wire to session + Action Timeline.
6. Execute **docs/08-MVP-IMPLEMENTATION.md** in the prescribed order and validate acceptance criteria.

All architecture and technology decisions are **binding** for this project unless explicitly changed via an ADR (Architecture Decision Record) in this repo.
