## ANIMA (MVP scaffold)

This workspace is a **PRD-aligned MVP scaffold** for ANIMA's "Hook Preview" vertical slice:

- **Blueprint is source of truth** (`lib/blueprint/schema.ts`)
- **MIDI-first generation** (`lib/producer/*`)
- **Deterministic server render** (stems + preview WAV) (`lib/render/*`)
- **Cloud storage ready** - Uses Supabase for database + file storage (falls back to in-memory for local dev)
- **API surface matching the PRD**
  - `POST /api/projects`
  - `POST /api/projects/:id/versions`
  - `GET /api/versions/:id/status`
  - `GET /api/versions/:id/assets`
  - `POST /api/versions/:id/iterate` (diff preview + apply)
  - `POST /api/versions/:id/export` (zip pack)
  - `GET /api/assets/:assetId`

## 🚀 Quick Start

### Option 1: Deploy to Web (Recommended - No Installation!)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for step-by-step instructions to put ANIMA online using Vercel + Supabase (both free!).

### Option 2: Run Locally

1. Install **Node.js LTS** from [nodejs.org](https://nodejs.org)
2. Set up Supabase (see DEPLOYMENT.md) and add keys to `.env`
3. In this folder, run:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.

**Note:** Without Supabase keys, ANIMA will use in-memory storage (data resets on restart).
