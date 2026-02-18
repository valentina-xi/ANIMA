# 05 — Agent System

This document defines how ANIMA’s “brain” works: specialized **agents** that output **operations** (not full songs), and the **Plan → Propose → Preview → Apply** flow. Implement this so every ANIMA action is explainable and reversible.

---

## 1. Principle: Agents Emit Operations, Not Blobs

- Agents do **not** output audio stems or opaque “AI magic.”
- They output **structured operations** (patch diffs + explanations) that the **Orchestration** layer interprets and the **Audio Engine** + **Patch Graph** apply.
- This gives: **visibility**, **undo**, **tweak**, and **learning** (Why panel).

---

## 2. Agent Types (Lanes)

| Agent | Lane | Responsibility | Example outputs |
|-------|------|----------------|-----------------|
| **Groove Agent** | Producer | Bounce, swing, ghost notes, hat density, bass pocket | `setMidiPattern`, swing %, ghost hit positions |
| **Harmony Agent** | Producer | Voicings, tension/resolution, chord choices | `setMidiPattern` for chords/lead, scale/key |
| **Sound Agent** | Engineer | Synth patch, filters, timbre | `addInsert`, `setInsertParam` (filter, sat) |
| **Mix Agent** | Engineer | Masking, levels, dynamics, sidechain | `setInsertParam` (EQ, comp), gain, sidechain ops |
| **Vocal Agent** | Vocal Producer | Timing, pitch suggestions, de-ess | Timing ops, `setInsertParam` (de-ess), suggestions |

**MVP:** Implement at least **Groove Agent** and **Mix Agent** (enough for “make it bouncier” + basic EQ/comp/reverb). Stub others with “Coming soon” or simple rule-based behavior.

---

## 3. Flow: Plan → ProposedOps → Preview → Apply

Every agent-driven change follows this path:

```
User intent (text / button)
        │
        ▼
┌───────────────────┐
│  Orchestration    │  Select agent(s), pass context (current patch, track, selection)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Agent            │  Returns: Plan + ProposedOps + Explanation
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Diff Preview     │  "I will change: X. I will NOT change: Y (locked)."
│  (UI)             │  User approves or tweaks
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  ApplyOps         │  Append to Action Timeline (with inverse), update Patch Graph,
│                   │  push diff to Audio Engine
└───────────────────┘
```

### 3.1 Plan (Optional but Recommended)

- **Plan** = short, human-readable summary of what the agent will do (e.g. “Add house shuffle swing and ghost kicks on 1e and 3e”).
- Shown in UI before apply; can be used for diff preview text.

### 3.2 ProposedOps

- **ProposedOps** = list of **PatchDiff** (or higher-level ops that compile to patch diffs). Schema must match 06-DATA-MODELS-AND-API.
- Orchestration does **not** execute these until user approves (or Autopilot mode applies with same logging).

### 3.3 Preview (Diff Preview)

- Before apply, UI shows:
  - **What will change:** e.g. “Hats groove + swing + ghost kicks.”
  - **What will NOT change:** e.g. “Hook melody (locked).”
- Implement by comparing **current patch** vs **patch after applying ProposedOps** (or by agent-provided summary).

### 3.4 Apply

- Append ops to **Action Timeline** with **inverse ops** (or snapshot).
- Update **Patch Graph** in Session Store.
- Send **patch diff** to **Audio Engine**.
- Populate **Why panel** from agent’s **Explanation** (see below).

---

## 4. Agent Output Contract (Schema)

Every agent response must conform to a **structured schema** so the app can apply and explain without parsing free text.

```ts
interface AgentResponse {
  plan: string;                    // Short summary for diff preview
  proposedOps: PatchDiff[];        // Or high-level ops that compile to PatchDiff[]
  explanation: ActionExplanation;
}

interface ActionExplanation {
  problem: string;                 // What problem this solves
  whatChanged: string;             // Plain English: what it changed
  listenFor: string;               // What to listen for
  howToDoManually: string;         // How to do it manually (tutor)
}
```

- **MVP:** Agents can be **stub** or **rule-based** (e.g. “make it bouncier” → fixed set of Groove + Mix ops + canned explanation). The **interface** must support swapping to LLM/API later (same `AgentResponse` shape).

---

## 5. Context Passed to Agents

To propose sensible ops, agents need **context**:

- **Current Patch Graph** (or relevant slice: selected track, inserts, pattern).
- **User intent** (raw text or intent label, e.g. “make it bouncier”, “clean vocal”).
- **Locked regions / identity fingerprint** (what not to change).
- **Product mode** (Live vs Tutor vs Autopilot) can influence explanation depth, not the op set.

---

## 6. Orchestration Responsibilities

- **Intent parsing:** Map user input to agent(s). MVP can be keyword/button → single agent.
- **Call agent(s):** With context; receive `AgentResponse`.
- **Validate ops:** Ensure `proposedOps` are valid for current patch (e.g. trackId exists).
- **Diff preview:** Compute or use `plan` + diff summary → show in UI.
- **Apply on approval:** Push to Action Timeline + Patch Graph + Audio Engine; fill Why panel from `explanation`.

---

## 7. References

- Previous: [04-AUDIO-ENGINE.md](./04-AUDIO-ENGINE.md)
- Next: [06-DATA-MODELS-AND-API.md](./06-DATA-MODELS-AND-API.md)
- Data shapes: [06-DATA-MODELS-AND-API.md](./06-DATA-MODELS-AND-API.md)
