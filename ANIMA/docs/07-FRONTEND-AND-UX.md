# 07 — Frontend and UX

This document defines the **UI layout**, **key views** (Action Timeline, Mixer, Effect Chain, Why panel, Diff Preview), and how they connect to session state and orchestration. Implement these so the app feels like “live hands” with every knob exposed.

---

## 1. Layout Overview

- **DAW-like** layout: primary focus on session and timeline; secondary panels for mixer, why, and diff.
- **Responsive:** MVP can target desktop-first (1280×720 min); optional collapse/expand for panels.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Header: ANIMA | Mode [Live ▼] [Tutor] [Autopilot] | Transport | Export ▼       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─ Session / Arrangement ─────────────────────────────────────────────────┐   │
│  │  Track list (Drums, Bass, Chords, Lead) + mini faders + mute/solo        │   │
│  │  Clip/pattern strips or placeholders                                     │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─ Action Timeline (the receipt) ────────────────────────────────────────┐   │
│  │  [Op1] Add drum groove (house shuffle 12%)     [Undo] [Tweak] [Why]     │   │
│  │  [Op2] EQ -3dB @ 280Hz Q=1.2 on pads           [Undo] [Tweak] [Why]     │   │
│  │  ...                                                                     │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
├──────────────────┬──────────────────────────────────────────────────────────────┤
│  Mixer +         │  Why Panel (tutor brain)                                      │
│  Effect Chain    │  • What problem it solved                                     │
│  • Per-track     │  • What it changed                                            │
│  • Inserts       │  • What to listen for                                         │
│  • Sends         │  • How to do it manually                                      │
│  • Levels/Meters │  (Updates when user selects an action or after apply)        │
└──────────────────┴──────────────────────────────────────────────────────────────┘
│  Input: [________________________] [Make it bouncier] [Clean vocal] ...         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Components

### 2.1 Header

- **Product name:** ANIMA.
- **Mode switcher:** Live (default), Tutor, Autopilot. Persist in session state.
- **Transport:** Play, Stop, (optional) tempo display. Wire to Audio Engine.
- **Export:** Dropdown or button → Export MIDI, Blueprint, Recipe (see 06).

### 2.2 Session / Arrangement Area

- **Track list:** One row per track (Drums, Bass, Chords, Lead). Show: name, mute, solo, level fader (optional mini), clip/pattern summary.
- **Clips/patterns:** Per track, show a strip or block representing the current pattern (e.g. “16 bars hook”). MVP can be placeholder or simple grid; full piano roll is post-MVP if needed for “approve groove” UX.
- **Selection:** Click track → set “selected track” in store; used for agent context and “Apply to selected track.”

### 2.3 Action Timeline

- **List of entries:** Each entry = one `TimelineEntry` (label, ops, inverse, explanation).
- **Per entry:** 
  - **Label** (e.g. “Add drum groove (house shuffle 12%)”).
  - **Actions:** [Undo] [Tweak] [Why].
    - **Undo:** Apply inverse ops, update patch and timeline.
    - **Tweak:** Open a small editor for that entry’s params (re-apply with new values).
    - **Why:** Focus the Why panel on this entry’s explanation.
- **Order:** Newest at bottom (or top—decide and stick). Scrollable.
- **Visual:** Clear separation between entries; optional “agent” badge (e.g. Groove, Mix).

### 2.4 Mixer + Effect Chain View

- **Per track column:** Fader (gain), pan, mute, solo, meter (input or post-fader).
- **Inserts:** Ordered list of insert names (e.g. “EQ”, “Comp”, “Reverb”). Click to expand params (or open in a drawer). MVP: at least Filter/EQ, Compressor, Reverb; show key params.
- **Sends:** Optional for MVP; if present, show send level per track to a bus.
- **Master:** One column for master fader + master inserts.

### 2.5 Why Panel

- **Content:** Rendered from `ActionExplanation`: problem, whatChanged, listenFor, howToDoManually.
- **Trigger:** After an action is applied, auto-show that action’s explanation; or when user clicks [Why] on a timeline entry.
- **Tutor mode:** Can emphasize “how to do it manually” and “what to listen for”; optional “Mission” (e.g. “You try: cut 250–350 Hz on the pad track”) with validation.

### 2.6 Diff Preview (Before Apply)

- **When:** After agent returns ProposedOps, before user approves.
- **Content:** 
  - “I’m about to change:” list (e.g. hats groove, swing, ghost kicks).
  - “I will NOT change:” list (e.g. hook melody — locked).
- **Actions:** [Apply] [Reject] [Tweak]. Tweak opens a simple form or param list to adjust proposed ops, then re-show preview.

### 2.7 Input / Intent

- **Text input:** Free-form (e.g. “Make it bouncier”, “Clean my vocal”). Sent to Orchestration → agent selection → Plan → ProposedOps.
- **Quick actions (buttons):** e.g. “Make it bouncier”, “Add groove”, “Clean vocal”. Same flow with predefined intent.
- **Selection context:** If a track is selected, pass it to agents as context.

---

## 3. State Binding (React + Zustand)

- **Session store:** `patch`, `timeline`, `mode`, `selectedTrackId`, `locked`.
- **UI store (optional):** `whyPanelEntryId`, `diffPreviewOpen`, `diffPreviewPayload`.
- **Actions:** 
  - Apply op → update patch + append timeline + push diff to audio engine.
  - Undo → apply inverse, update patch + timeline, push diff.
  - Tweak → replace entry’s ops + inverse, re-apply patch diff.
- **Why panel:** Read `explanation` from timeline entry by id (`whyPanelEntryId`).

---

## 4. Accessibility and UX Notes

- **Keyboard:** Shortcuts for Play/Stop, Undo (Ctrl+Z), focus on input.
- **Focus management:** After apply, focus diff preview or timeline entry so flow is clear.
- **Radix UI:** Use for accessible dialogs (diff preview), tabs (mixer vs why), and controls where applicable.
- **Loading:** Show “ANIMA is thinking…” or spinner when agent is computing; disable apply until response is back.

---

## 5. References

- Previous: [06-DATA-MODELS-AND-API.md](./06-DATA-MODELS-AND-API.md)
- Next: [08-MVP-IMPLEMENTATION.md](./08-MVP-IMPLEMENTATION.md)
- System: [02-SYSTEM-ARCHITECTURE.md](./02-SYSTEM-ARCHITECTURE.md)
