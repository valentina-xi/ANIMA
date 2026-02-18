# 01 — Vision and Scope

This document defines ANIMA’s product vision, product modes, production lanes, MVP scope, and non-goals. All feature and UX decisions should align with this.

---

## 1. Core Promise

| Principle | Description |
|-----------|-------------|
| **You provide** | Creative direction + approval |
| **ANIMA does** | Proposes actions, then applies them **live** (non-destructively) |
| **You always see** | What it did, the chain, the parameters, and **why** |
| **You can** | Undo, A/B, tweak, and learn at each step |

**Positioning:** A real producer’s “hands + brain” inside an interface where every knob is exposed.

---

## 2. Product Modes

### 2.1 Live Session Mode (Primary)

- **DAW-like session** where ANIMA works in **steps** while audio is playing.
- Examples:
  - “Let’s add bounce” → ANIMA adds ghost notes, swing, groove, then **shows exactly what changed**.
  - “Clean my vocal” → Runs an EQ/comp/de-ess chain **live**, and **highlights why** (mud, harshness, sibilance).
- All actions are logged, reversible, and explainable.

### 2.2 Guided Tutor Mode (Always Available)

- Same session; ANIMA **slows down** and turns each action into a **lesson**.
- Examples:
  - “Here’s why I cut 250–350 Hz (mud zone).”
  - “Here’s why the kick + bass are fighting (masking), and how sidechain fixes it.”
- Can include **missions** where the user performs the step and ANIMA checks their settings.

### 2.3 Assisted Autopilot (Optional Convenience)

- For speed, ANIMA can do **more in one click** — but still **logs and explains every step**.
- This is **not** the main brand; it’s a convenience layer on top of the same transparent model.

---

## 3. What ANIMA Replaces (Producer/Engineer “Lanes”)

ANIMA behaves like a **team** with distinct roles. Each lane has clear responsibilities and outputs **operations**, not opaque AI blobs.

### A) Creative Director Lane

- **Role:** Taste + high-level decisions.
- **Does:** Turns your “vibe” into a plan: tempo, groove style, energy curve, reference palette.
- **Constraint:** Keeps an **identity fingerprint** so changes don’t wreck the core idea.

### B) Producer Lane

- **Role:** Composition + arrangement.
- **Does:** Builds drums, bass, chords, leads **incrementally**.
- **Shows:** Patterns visually (grid) and audibly (solo A/B).
- **Interaction:** You **approve** steps (e.g. “Approve drum groove”, “Approve bass pocket”, “Approve hook contour”).

### C) Engineer Lane

- **Role:** Mixing + sound design.
- **Does:** Builds effect chains **node by node** (e.g. EQ → comp → saturation → reverb).
- **Provides:** Real-time analyzers (spectrum, loudness, phase) + plain-English notes.
- **Macro knobs:** Map to real parameters (e.g. brightness = filter + EQ tilt, punch = transient/comp).

### D) Vocal Producer Lane (When User Records Vocals)

- **Role:** Coaching + fixes with consent.
- **Does:** Timing pockets, pitch suggestions (not “auto-fix everything” unless asked), de-ess guidance.
- **Shows:** What changed and how to replicate it.

---

## 4. “Live Hands” UX Requirements

These are **mandatory** for the product to match the vision.

### 4.1 Action Timeline (The Receipt)

- **Every change** is a logged **operation**, e.g.:
  - “Add drum groove (house shuffle 12%)”
  - “Kick pattern: + ghost hits on 1e, 3e”
  - “EQ: -3 dB @ 280 Hz Q=1.2 on pads”
  - “Sidechain: 55% depth, 180 ms release”
- **User can:** Click any action to see parameters, **undo** it, **tweak** it, **replay** it.

### 4.2 Mixer + Effect Chain View (DAW-like)

- Each track shows: **inserts** (EQ, comp, sat, reverb, etc.), **sends**, **levels**, **mute/solo**, **metering**.

### 4.3 “Why” Panel (Tutor Brain)

- For each action:
  - What **problem** it solved
  - What it **changed**
  - What to **listen for**
  - How to **do it manually**

### 4.4 Diff Preview Before Applying

- Before ANIMA changes anything:
  - “I’m about to change: hats groove + swing + ghost kicks”
  - “I will NOT change: hook melody (locked)”

---

## 5. MVP Scope

**MVP goal:** *“Produce a hook from scratch while teaching.”*

### 5.1 In Scope for MVP

| Feature | Description |
|--------|-------------|
| **Session** | 4 tracks: **Drums / Bass / Chords / Lead** |
| **Action Timeline** | Log of operations + **undo/redo** |
| **Live effect chain** | Minimum: **Filter/EQ + Compressor + Reverb** per track (or master) |
| **“Make it bouncier”** | Implemented as: swing, ghost notes, hat offbeat density, bass rhythm pocket tweaks |
| **Tutor overlay** | “Why this worked” + listening prompts |
| **Export** | **MIDI** + **blueprint** (session/patch state) + **action log** (“recipe”) |

### 5.2 Non-Goals for MVP

- Full song generation
- Advanced mastering
- Singing voice synthesis
- “Better than everything” or “generate fast” as primary positioning

---

## 6. Success Criteria for MVP

- A junior developer (or you) can **build a hook from scratch** using ANIMA step-by-step.
- Every ANIMA action is **visible** in the Action Timeline with parameters and **Why**.
- User can **undo** and **tweak** any step.
- Export produces a **repeatable recipe** (MIDI + blueprint + action log) that could be replayed or shared.

---

## 7. References

- Master doc: [ANIMA_ARCHITECTURE.md](./ANIMA_ARCHITECTURE.md)
- Next: [02-SYSTEM-ARCHITECTURE.md](./02-SYSTEM-ARCHITECTURE.md)
