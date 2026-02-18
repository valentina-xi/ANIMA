# 03 — Technology Stack

This document defines the technologies, versions, and rationale for ANIMA. Use these choices consistently; do not introduce alternatives without an Architecture Decision Record (ADR).

---

## 0. Industry Best Practices (2025–2026)

- **TypeScript strict:** Standard for maintainability and refactor safety; preferred in modern greenfield web apps.
- **ESM + Vite:** Native ES modules and fast tooling (Vite 5/6) are the norm; avoid legacy CJS-only setups.
- **AudioWorklet-only:** ScriptProcessorNode is deprecated; all custom DSP must run in AudioWorklet for low latency and stability.
- **Structured AI outputs:** Agents should return JSON/schema-backed data (ops, explanations), not free-form text that the app must parse—aligns with “structured output” and tool-use patterns in 2025–2026.
- **Human-in-the-loop:** Explicit user approval and explainability reduce regulatory and platform risk for AI-assisted creative tools.
- **Web-first audio:** Browser-based DAWs and music tools are viable; no desktop-only requirement for MVP.
- **Accessibility:** Use of Radix (or similar) and semantic HTML is expected; WCAG 2.x alignment for public-facing UIs.
- **Flat config:** ESLint 9+ flat config is the current standard; prefer over legacy .eslintrc.

---

## 1. Stack Summary (2025–2026 Best Practices)

| Layer | Technology | Version (target) | Rationale |
|-------|------------|------------------|------------|
| **Language** | TypeScript | 5.x (strict) | Type safety, refactorability, better DX for junior devs |
| **Build** | Vite | 5.x | Fast HMR, ESM-native, simple config |
| **UI Framework** | React | 18.x / 19.x | Ecosystem, hooks, concurrent features |
| **State** | Zustand | 4.x | Lightweight, no boilerplate; good for patch graph + timeline |
| **Styling** | Tailwind CSS | 3.x / 4.x | Utility-first, design tokens, fast iteration |
| **UI Primitives** | Radix UI | Latest | Accessible, unstyled, composable |
| **Audio** | Web Audio API + AudioWorklet | Browser native | Low-latency DSP, no plugin; see 04-AUDIO-ENGINE.md |
| **Audio abstraction (optional)** | Tone.js | 14.x / 15.x | Optional for scheduling/timing; core graph can be custom |
| **Agents** | Structured IO (JSON schema) | — | Plan → Ops; can be local (WASM/transformers.js) or API |
| **Persistence (MVP)** | In-memory + localStorage or file export | — | No required backend for MVP |
| **Testing** | Vitest + React Testing Library | Latest | Vite-native, fast |
| **Linting / Format** | ESLint (flat config) + Prettier | ESLint 9.x | 2025 standard |

---

## 2. Rationale and Best Practices

### 2.1 TypeScript (Strict)

- **Strict mode** enabled: fewer runtime surprises, safer refactors.
- Use **explicit types** for Patch Graph, Op schemas, and agent payloads (see 06-DATA-MODELS-AND-API.md).

### 2.2 Vite + React

- **Vite:** ESM-native, fast cold start and HMR; aligns with modern bundling (2025–2026).
- **React 18+:** Concurrent rendering and Suspense ready for future; keep components small and state in stores.

### 2.3 State: Zustand

- **Single session store** (or a few stores: session, UI, timeline) to avoid prop drilling.
- **Immutable updates** for Patch Graph and Action Timeline (e.g. Immer inside Zustand or plain immutability).
- **No Redux** for MVP: Zustand is sufficient and easier to follow for a junior dev.

### 2.4 Styling: Tailwind + Radix

- **Tailwind:** Design tokens (colors, spacing) in `tailwind.config`; dark/light if needed.
- **Radix:** Accessible mixer controls, dialogs, tabs (Why panel, diff preview). Style with Tailwind.

### 2.5 Audio: Web Audio API + AudioWorklet

- **Mandatory** for low-latency processing (AudioWorklet runs off main thread).
- **Custom AudioWorklet nodes** for EQ, comp, reverb, etc., or wrap Tone.js nodes if they use Worklet.
- **No deprecated ScriptProcessorNode**; use only **AudioWorklet** for custom DSP.

### 2.6 Agents

- **Output contract:** JSON matching a **strict schema** (ops list + explanation fields). See 05, 06.
- **MVP:** Stub or rule-based agents are acceptable; interface must support swapping to LLM/API later.

### 2.7 Testing

- **Vitest:** Unit tests for patch diff logic, op application, undo/redo.
- **React Testing Library:** UI behavior for timeline, mixer, Why panel.
- **E2E (optional for MVP):** Playwright if time permits.

---

## 3. Project Structure (Recommended)

```
anima/
├── src/
│   ├── app/                 # App shell, routing (if any)
│   ├── components/          # React components
│   │   ├── ui/              # Primitives (Radix + Tailwind)
│   │   ├── mixer/           # Mixer, faders, meters
│   │   ├── timeline/        # Action Timeline
│   │   ├── why-panel/       # Why panel, tutor content
│   │   └── diff-preview/    # Diff preview modal/strip
│   ├── stores/              # Zustand stores (session, timeline, ui)
│   ├── audio/               # Audio engine, worklets, patch graph driver
│   │   ├── graph/           # Patch graph model + diff
│   │   ├── worklets/        # AudioWorklet processors (EQ, comp, etc.)
│   │   └── engine.ts        # Web Audio context, connect graph to audio
│   ├── agents/              # Agent orchestration + per-agent logic
│   │   ├── orchestration.ts
│   │   ├── groove/
│   │   ├── mix/
│   │   └── ...
│   ├── models/              # Types, schemas (ops, patch, session)
│   ├── lib/                 # Utils, constants
│   └── main.tsx
├── public/
├── docs/                    # This documentation
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── eslint.config.js
```

---

## 4. Key Dependencies (package.json Guidance)

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^4.5.0",
    "@radix-ui/react-*": "latest",
    "tone": "^14.8.0",
    "immer": "^10.0.0"
  },
  "devDependencies": {
    "typescript": "~5.6.0",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "latest",
    "tailwindcss": "^3.4.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0"
  }
}
```

- **Tone.js** is optional; use only if it simplifies scheduling and you can align it with the patch graph (see 04-AUDIO-ENGINE.md).
- **Immer** is optional; use if you prefer mutable drafts inside Zustand for patch/timeline updates.

---

## 5. Browser Support

- **Target:** Evergreen browsers (Chrome, Firefox, Safari, Edge) with **AudioWorklet** and **ESM** support.
- **Minimum:** Align with Web Audio API and AudioWorklet support (e.g. last 2 major versions).
- Document any required flags (e.g. Safari) in README.

---

## 6. References

- Previous: [02-SYSTEM-ARCHITECTURE.md](./02-SYSTEM-ARCHITECTURE.md)
- Next: [04-AUDIO-ENGINE.md](./04-AUDIO-ENGINE.md)
