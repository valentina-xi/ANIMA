# Architecture Decision Record (ADR) Template

When you need to **change** an architecture or technology decision from what is documented in this set, add an ADR so the junior developer (and future you) know why.

---

## Format

Create a new file: `docs/adr/NNNN-short-title.md` (e.g. `0001-use-tonejs-for-scheduling.md`).

```markdown
# ADR-NNNN: Short Title

**Status:** Proposed | Accepted | Deprecated
**Date:** YYYY-MM-DD

## Context
What is the issue or decision we are facing?

## Decision
What did we decide?

## Consequences
- Positive: ...
- Negative: ...
- Follow-ups: ...
```

---

## When to Write an ADR

- Introducing a technology or library not in 03-TECH-STACK.
- Changing the Patch Graph or Op schema in a breaking way.
- Adding or removing an agent type.
- Changing the flow (e.g. removing diff preview, or auto-applying without approval).
- Switching from stub agents to a specific LLM/API and locking that in.

---

Reference: [ANIMA_ARCHITECTURE.md](./ANIMA_ARCHITECTURE.md)
