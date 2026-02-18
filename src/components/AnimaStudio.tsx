"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Blueprint } from "@/lib/blueprint/schema";
import { StemPlayer, type StemKey, type StemMacros, type StemMute } from "@/lib/audio/StemPlayer";

type TutorPayload = {
  lessons: Array<{ title: string; why: string; receipts: Array<{ path: string; value: unknown }> }>;
  missions: Array<{
    id: string;
    title: string;
    instruction: string;
    passWhen: Array<{ path: string; predicate: "gte" | "lte"; value: number }>;
  }>;
  dawSteps: Array<{ title: string; steps: string[] }>;
};

type HookResponse = {
  versionId?: string;
  blueprint: Blueprint;
  midiBase64: string;
  durationSec: number;
  kickTimesSec: number[];
  assets: {
    preview: { wavBase64: string; sampleRate: number; durationSec: number };
    stems: Record<StemKey, string>;
  };
  tutor?: TutorPayload;
  error?: string;
};

type DiffPreviewResponse = {
  preview: true;
  baseVersionId: string;
  diff: unknown;
  nextBlueprint: Blueprint;
  error?: string;
};

export default function AnimaStudio() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("Happy nostalgic house track, catchy hook");
  const [lyrics, setLyrics] = useState("Optional lyrics…");
  const [genre, setGenre] = useState("house");
  const [mood, setMood] = useState("happy nostalgic");
  const [era, setEra] = useState("2010s");
  const [intensity, setIntensity] = useState(0.7);

  const [loading, setLoading] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [midiBase64, setMidiBase64] = useState<string | null>(null);
  const [previewWavBase64, setPreviewWavBase64] = useState<string | null>(null);
  const [prevPreviewWavBase64, setPrevPreviewWavBase64] = useState<string | null>(null);
  const [stems, setStems] = useState<Record<StemKey, string> | null>(null);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [kickTimesSec, setKickTimesSec] = useState<number[]>([]);
  const [tutor, setTutor] = useState<TutorPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [abMode, setAbMode] = useState<"A" | "B">("B");

  const [mute, setMute] = useState<StemMute>({
    drums: false,
    bass: false,
    chords: false,
    lead: false,
  });

  const [macros, setMacros] = useState<StemMacros>({
    brightness: 0.65,
    sidechain: 0.55,
    reverb: 0.3,
  });

  const [iterateText, setIterateText] = useState("Keep chorus, change drum groove; more sidechain; brighter.");
  const [diffPreview, setDiffPreview] = useState<unknown | null>(null);
  const [diffNextBlueprint, setDiffNextBlueprint] = useState<Blueprint | null>(null);

  const playerRef = useRef<StemPlayer | null>(null);
  const lastLoadedKeyRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canDownload = useMemo(() => !!(blueprint && midiBase64), [blueprint, midiBase64]);

  const ensurePlayer = useCallback(async () => {
    if (playerRef.current) return playerRef.current;
    const p = new StemPlayer();
    await p.ensureRunning();
    playerRef.current = p;
    setAudioReady(true);
    return p;
  }, []);

  // MVP project/session bootstrap
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = localStorage.getItem("anima_project_id");
        if (existing) {
          if (!cancelled) setProjectId(existing);
          return;
        }
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "My ANIMA Project" }),
        });
        const data = (await res.json()) as any;
        const id = data?.project?.id;
        if (typeof id === "string" && id) {
          localStorage.setItem("anima_project_id", id);
          if (!cancelled) setProjectId(id);
        }
      } catch {
        // ignore: UI can still use /api/hook fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live updates: knobs update player nodes (no re-render required)
  useEffect(() => {
    if (!playerRef.current) return;
    playerRef.current.setMacros(macros);
  }, [macros]);

  useEffect(() => {
    if (!playerRef.current) return;
    playerRef.current.setMute(mute);
  }, [mute]);

  const generateHook = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDiffPreview(null);
    setDiffNextBlueprint(null);

    // Abort any in-flight request (prevents race conditions)
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const url = projectId ? `/api/projects/${projectId}/versions` : "/api/hook";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ prompt, lyrics, genre, mood, era, intensity }),
      });

      const data = (await res.json()) as HookResponse;
      if (!res.ok || (data as any).error) {
        throw new Error((data as any).error || "Request failed");
      }

      if (data.versionId) setVersionId(data.versionId);
      setBlueprint(data.blueprint);
      setMidiBase64(data.midiBase64);
      setPrevPreviewWavBase64(null);
      setPreviewWavBase64(data.assets.preview.wavBase64);
      setStems(data.assets.stems);
      setDurationSec(data.durationSec);
      setKickTimesSec(data.kickTimesSec || []);
      setTutor(data.tutor ?? null);
      setAbMode("B");

      // Sync macros from blueprint defaults
      setMacros({
        brightness: data.blueprint.mixMacros.brightness,
        sidechain: data.blueprint.mixMacros.sidechain,
        reverb: data.blueprint.mixMacros.reverb,
      });

      // If audio already enabled, decode stems now (no autoplay)
      if (playerRef.current) {
        await playerRef.current.load({
          stemsWavBase64: data.assets.stems,
          durationSec: data.durationSec,
          kickTimesSec: data.kickTimesSec || [],
        });
        lastLoadedKeyRef.current = data.midiBase64;
        playerRef.current.setMute(mute);
        playerRef.current.setMacros({
          brightness: data.blueprint.mixMacros.brightness,
          sidechain: data.blueprint.mixMacros.sidechain,
          reverb: data.blueprint.mixMacros.reverb,
        });
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [era, genre, intensity, lyrics, mood, mute, prompt, projectId]);

  const previewDiff = useCallback(async () => {
    if (!versionId) {
      setError("No version id yet — generate a hook first.");
      return;
    }
    setError(null);
    setDiffPreview(null);
    setDiffNextBlueprint(null);
    try {
      const res = await fetch(`/api/versions/${versionId}/iterate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText: iterateText, confirm: false }),
      });
      const data = (await res.json()) as DiffPreviewResponse;
      if (!res.ok || (data as any).error) throw new Error((data as any).error || "Preview failed");
      setDiffPreview(data.diff);
      setDiffNextBlueprint(data.nextBlueprint);
    } catch (e: any) {
      setError(e?.message || "Preview failed");
    }
  }, [iterateText, versionId]);

  const applyIteration = useCallback(async () => {
    if (!versionId) {
      setError("No version id yet — generate a hook first.");
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/versions/${versionId}/iterate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText: iterateText, confirm: true }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || data?.error) throw new Error(data?.error || "Iteration failed");

      // A/B: keep previous preview as A, new as B
      setPrevPreviewWavBase64(previewWavBase64);
      setAbMode("B");

      setVersionId(data.versionId);
      setBlueprint(data.blueprint);
      setMidiBase64(data.midiBase64);
      setPreviewWavBase64(data.assets?.preview?.wavBase64 || null);
      setStems(data.assets?.stems || null);
      setDurationSec(data.durationSec ?? null);
      setKickTimesSec(data.kickTimesSec || []);
      setTutor(data.tutor ?? null);
      setDiffPreview(data.diff ?? null);
      setDiffNextBlueprint(null);

      // If audio enabled, decode stems now (no autoplay)
      if (playerRef.current && data.assets?.stems && data.durationSec) {
        await playerRef.current.load({
          stemsWavBase64: data.assets.stems,
          durationSec: data.durationSec,
          kickTimesSec: data.kickTimesSec || [],
        });
        lastLoadedKeyRef.current = data.midiBase64;
        playerRef.current.setMute(mute);
        playerRef.current.setMacros(macros);
      }
    } catch (e: any) {
      setError(e?.message || "Iteration failed");
    }
  }, [iterateText, macros, mute, previewWavBase64, versionId]);

  const play = useCallback(async () => {
    if (!blueprint || !midiBase64 || !stems || !durationSec) return;

    const player = await ensurePlayer();
    if (!player) return;

    // ensure stems are decoded (avoid re-decode on repeated play)
    if (lastLoadedKeyRef.current !== midiBase64) {
      await player.load({ stemsWavBase64: stems, durationSec, kickTimesSec });
      lastLoadedKeyRef.current = midiBase64;
    }
    player.setMute(mute);
    player.setMacros(macros);
    player.play();
    setIsPlaying(true);
  }, [blueprint, durationSec, ensurePlayer, kickTimesSec, macros, midiBase64, mute, stems]);

  const stop = useCallback(() => {
    if (!playerRef.current) return;
    playerRef.current.stop();
    setIsPlaying(false);
  }, []);

  const enableAudio = useCallback(async () => {
    await ensurePlayer();
  }, [ensurePlayer]);

  const downloadMidi = useCallback(() => {
    if (!midiBase64) return;
    const binaryString = atob(midiBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

    const blob = new Blob([bytes], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "anima-hook.mid";
    a.click();
    URL.revokeObjectURL(url);
  }, [midiBase64]);

  const downloadBlueprint = useCallback(() => {
    if (!blueprint) return;
    const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "anima-blueprint.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [blueprint]);

  const exportPack = useCallback(async () => {
    if (!versionId) {
      setError("No version id yet — generate a hook first.");
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/versions/${versionId}/export`, { method: "POST" });
      const data = (await res.json()) as any;
      if (!res.ok || data?.error) throw new Error(data?.error || "Export failed");
      const zipBase64 = data?.export?.zipBase64;
      if (!zipBase64) throw new Error("Export payload missing zip");

      const binaryString = atob(zipBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

      const blob = new Blob([bytes], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `anima-export-${versionId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || "Export failed");
    }
  }, [versionId]);

  const previewUrl = useMemo(() => {
    if (!previewWavBase64) return null;
    const bytes = new Uint8Array(atob(previewWavBase64).split("").map((c) => c.charCodeAt(0)));
    const blob = new Blob([bytes], { type: "audio/wav" });
    return URL.createObjectURL(blob);
  }, [previewWavBase64]);

  const prevPreviewUrl = useMemo(() => {
    if (!prevPreviewWavBase64) return null;
    const bytes = new Uint8Array(atob(prevPreviewWavBase64).split("").map((c) => c.charCodeAt(0)));
    const blob = new Blob([bytes], { type: "audio/wav" });
    return URL.createObjectURL(blob);
  }, [prevPreviewWavBase64]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (prevPreviewUrl) URL.revokeObjectURL(prevPreviewUrl);
    };
  }, [prevPreviewUrl]);

  const activePreviewUrl = abMode === "A" ? prevPreviewUrl : previewUrl;

  const missionStatus = useMemo(() => {
    if (!tutor || !blueprint) return null;
    const getNum = (p: string) => {
      const parts = p.replace(/^\//, "").split("/");
      let cur: any = blueprint;
      for (const k of parts) cur = cur?.[k];
      return typeof cur === "number" ? cur : null;
    };
    return tutor.missions.map((m) => {
      const pass = m.passWhen.every((c) => {
        const v = getNum(c.path);
        if (v == null) return false;
        return c.predicate === "gte" ? v >= c.value : v <= c.value;
      });
      return { id: m.id, pass };
    });
  }, [blueprint, tutor]);

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">ANIMA — Hook Preview (MIDI-first)</h1>
        <p className="text-sm opacity-75">
          Prompt → Blueprint → MIDI → Server-rendered stems → Client stem mixer (MVP vertical slice).
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <label className="text-sm font-medium">Prompt</label>
          <textarea className="w-full rounded border p-3 min-h-[110px]" value={prompt} onChange={(e) => setPrompt(e.target.value)} />

          <label className="text-sm font-medium">Lyrics (optional)</label>
          <textarea className="w-full rounded border p-3 min-h-[90px]" value={lyrics} onChange={(e) => setLyrics(e.target.value)} />

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Genre</label>
              <input className="w-full rounded border p-2" value={genre} onChange={(e) => setGenre(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Mood</label>
              <input className="w-full rounded border p-2" value={mood} onChange={(e) => setMood(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Era</label>
              <input className="w-full rounded border p-2" value={era} onChange={(e) => setEra(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Intensity: {intensity.toFixed(2)}</label>
            <input type="range" className="w-full" min={0} max={1} step={0.01} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} />
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="rounded bg-black text-white px-4 py-2 disabled:opacity-50" onClick={generateHook} disabled={loading}>
              {loading ? "Generating…" : "Generate Hook"}
            </button>

            <button className="rounded border px-4 py-2 disabled:opacity-50" onClick={enableAudio} disabled={audioReady}>
              {audioReady ? "Audio Enabled" : "Enable Audio"}
            </button>

            <button className="rounded border px-4 py-2 disabled:opacity-50" onClick={play} disabled={!blueprint || !midiBase64 || !stems}>
              Play
            </button>

            <button className="rounded border px-4 py-2 disabled:opacity-50" onClick={stop} disabled={!audioReady || !isPlaying}>
              Stop
            </button>

            <button className="rounded border px-4 py-2 disabled:opacity-50" onClick={downloadMidi} disabled={!canDownload}>
              Download MIDI
            </button>

            <button className="rounded border px-4 py-2 disabled:opacity-50" onClick={downloadBlueprint} disabled={!blueprint}>
              Download Blueprint
            </button>

            <button className="rounded border px-4 py-2 disabled:opacity-50" onClick={exportPack} disabled={!versionId}>
              Export Pack (ZIP)
            </button>
          </div>

          {error && <div className="rounded border border-red-400 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </div>

        <div className="space-y-4">
          <div className="rounded border p-4 space-y-2">
            <h2 className="font-semibold">Hook Preview (rendered)</h2>
            {previewUrl ? (
              <div className="space-y-2">
                {prevPreviewUrl && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="opacity-70">A/B</span>
                    <button className={`rounded border px-2 py-1 ${abMode === "A" ? "bg-white/10" : ""}`} onClick={() => setAbMode("A")}>
                      A (previous)
                    </button>
                    <button className={`rounded border px-2 py-1 ${abMode === "B" ? "bg-white/10" : ""}`} onClick={() => setAbMode("B")}>
                      B (current)
                    </button>
                  </div>
                )}
                {activePreviewUrl ? <audio controls src={activePreviewUrl} className="w-full" /> : null}
              </div>
            ) : (
              <p className="text-sm opacity-70">Generate a hook to get an audio preview.</p>
            )}
            {durationSec != null && (
              <p className="text-xs opacity-70">Duration: {durationSec.toFixed(1)}s</p>
            )}
          </div>

          <div className="rounded border p-4 space-y-2">
            <h2 className="font-semibold">Iterate (Diff Preview → Apply)</h2>
            <textarea
              className="w-full rounded border p-3 min-h-[80px]"
              value={iterateText}
              onChange={(e) => setIterateText(e.target.value)}
            />
            <div className="flex gap-2 flex-wrap">
              <button className="rounded border px-4 py-2 disabled:opacity-50" onClick={previewDiff} disabled={!versionId}>
                Preview Diff
              </button>
              <button className="rounded bg-white text-black px-4 py-2 disabled:opacity-50" onClick={applyIteration} disabled={!versionId}>
                Apply as New Version
              </button>
            </div>
            {diffPreview && (
              <pre className="text-xs overflow-auto max-h-[220px] bg-gray-50/5 p-3 rounded">
                {JSON.stringify(diffPreview, null, 2)}
              </pre>
            )}
            {diffNextBlueprint && (
              <pre className="text-xs overflow-auto max-h-[180px] bg-gray-50/5 p-3 rounded">
                {JSON.stringify({ bpm: diffNextBlueprint.global.bpm, groove: diffNextBlueprint.groove, mixMacros: diffNextBlueprint.mixMacros }, null, 2)}
              </pre>
            )}
          </div>

          <div className="rounded border p-4 space-y-2">
            <h2 className="font-semibold">Mix Macros (live)</h2>

            <div>
              <label className="text-sm">Brightness: {macros.brightness.toFixed(2)}</label>
              <input type="range" className="w-full" min={0} max={1} step={0.01} value={macros.brightness}
                onChange={(e) => setMacros((m) => ({ ...m, brightness: Number(e.target.value) }))} />
            </div>

            <div>
              <label className="text-sm">Sidechain: {macros.sidechain.toFixed(2)}</label>
              <input type="range" className="w-full" min={0} max={1} step={0.01} value={macros.sidechain}
                onChange={(e) => setMacros((m) => ({ ...m, sidechain: Number(e.target.value) }))} />
            </div>

            <div>
              <label className="text-sm">Reverb: {macros.reverb.toFixed(2)}</label>
              <input type="range" className="w-full" min={0} max={1} step={0.01} value={macros.reverb}
                onChange={(e) => setMacros((m) => ({ ...m, reverb: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="rounded border p-4 space-y-2">
            <h2 className="font-semibold">Track Mute</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(["drums", "bass", "chords", "lead"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" checked={mute[k]} onChange={(e) => setMute((m) => ({ ...m, [k]: e.target.checked }))} />
                  Mute {k}
                </label>
              ))}
            </div>
            <p className="text-xs opacity-70">
              (Mute + macros apply instantly while playing — stem mixer updates live.)
            </p>
          </div>

          <div className="rounded border p-4">
            <h2 className="font-semibold mb-2">Blueprint</h2>
            {blueprint ? (
              <pre className="text-xs overflow-auto max-h-[320px] bg-gray-50 p-3 rounded">
                {JSON.stringify(
                  {
                    bpm: blueprint.global.bpm,
                    key: blueprint.global.key,
                    scale: blueprint.global.scale,
                    structure: blueprint.structure,
                    chords: blueprint.chords,
                    groove: blueprint.groove,
                    mixMacros: blueprint.mixMacros,
                  },
                  null,
                  2
                )}
              </pre>
            ) : (
              <p className="text-sm opacity-70">Generate a hook to see the blueprint.</p>
            )}
          </div>

          <div className="rounded border p-4 space-y-3">
            <h2 className="font-semibold">Tutor Mode (receipts)</h2>
            {tutor ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  {tutor.lessons.slice(0, 3).map((l) => (
                    <div key={l.title} className="rounded border border-white/10 p-3">
                      <div className="font-medium text-sm">{l.title}</div>
                      <div className="text-xs opacity-75">{l.why}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Missions</div>
                  {tutor.missions.map((m) => {
                    const pass = missionStatus?.find((x) => x.id === m.id)?.pass ?? false;
                    return (
                      <div key={m.id} className="flex items-center justify-between rounded border border-white/10 p-3 text-sm">
                        <div>
                          <div className="font-medium">{m.title}</div>
                          <div className="text-xs opacity-75">{m.instruction}</div>
                        </div>
                        <div className={`text-xs ${pass ? "text-green-300" : "text-yellow-200"}`}>{pass ? "PASS" : "IN PROGRESS"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm opacity-70">Generate a hook to see tutor lessons and missions.</p>
            )}
          </div>
        </div>
      </div>

      <footer className="text-xs opacity-70">
        Next: versions + diff preview + partial regen with locks (bar-level replace, identity-safe).
      </footer>
    </div>
  );
}
