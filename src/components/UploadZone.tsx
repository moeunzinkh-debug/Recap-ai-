"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BrainCircuit,
  CheckCircle2,
  Clapperboard,
  Clock,
  Copy,
  ExternalLink,
  FileVideo,
  HardDrive,
  KeyRound,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
  UploadCloud,
  AlertTriangle,
} from "lucide-react";
import ScriptRenderer from "@/components/ScriptRenderer";
import {
  MAX_FILE_SIZE,
  MAX_DURATION_SEC,
  MODEL,
  formatBytes,
  formatDuration,
  type GeminiModelOption,
} from "@/lib/constants";

type Phase = "idle" | "validating" | "uploading" | "processing" | "streaming" | "done" | "error";

interface ProgressState {
  phase: Phase;
  uploadPercent: number;
  stageMessage: string;
  script: string;
  recapId: string | null;
  title: string | null;
  error: string | null;
}

interface SSEEvent {
  event: string;
  data: string;
}

function parseSSE(buf: string): { events: SSEEvent[]; rest: string } {
  const events: SSEEvent[] = [];
  let rest = buf;
  let idx: number;
  while ((idx = rest.indexOf("\n\n")) !== -1) {
    const raw = rest.slice(0, idx);
    rest = rest.slice(idx + 2);
    let event = "message";
    let data = "";
    for (const line of raw.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data += line.slice(5).trim();
    }
    if (data) events.push({ event, data });
  }
  return { events, rest };
}

export default function UploadZone() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const scriptRef = useRef<HTMLDivElement>(null);

  const [progress, setProgress] = useState<ProgressState>({
    phase: "idle",
    uploadPercent: 0,
    stageMessage: "",
    script: "",
    recapId: null,
    title: null,
    error: null,
  });
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);
  const [models, setModels] = useState<GeminiModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(MODEL);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data: { geminiConfigured: boolean; models: GeminiModelOption[] }) => {
        setGeminiConfigured(data.geminiConfigured);
        if (Array.isArray(data.models) && data.models.length > 0) {
          setModels(data.models);
          setSelectedModel((prev) =>
            data.models.some((m) => m.id === prev) ? prev : data.models[0].id
          );
        }
      })
      .catch(() => setGeminiConfigured(null));
  }, []);

  const selectedModelInfo =
    models.find((m) => m.id === selectedModel) ?? null;

  const phase = progress.phase;
  const busy = phase === "uploading" || phase === "processing" || phase === "streaming";

  useEffect(() => {
    return () => xhrRef.current?.abort();
  }, []);

  useEffect(() => {
    if (phase === "streaming" && scriptRef.current) {
      scriptRef.current.scrollTop = scriptRef.current.scrollHeight;
    }
  }, [progress.script, phase]);

  const validateFile = useCallback((f: File) => {
    setMetaError(null);

    if (!f.type.startsWith("video/")) {
      setMetaError("សូមជ្រើសរើសតែឯកសារវីដេអូ (MP4, WebM, MOV, MKV...)។");
      setFile(null);
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setMetaError(
        `ឯកសារធំជាង 100MB (${formatBytes(f.size)}) — សូមជ្រើសរើសវីដេអូតូចជាងនេះ។`
      );
      setFile(null);
      return;
    }
    if (f.size <= 0) {
      setMetaError("ឯកសារវីដេអូទទេ។");
      setFile(null);
      return;
    }

    setFile(f);
    setDuration(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(f));
    setProgress((p) => ({ ...p, phase: "validating", script: "", recapId: null, title: null, error: null }));
  }, [videoUrl]);

  const handleMetadata = useCallback(() => {
    const vid = document.getElementById("preview-video") as HTMLVideoElement | null;
    if (!vid || !Number.isFinite(vid.duration)) return;
    const d = vid.duration;
    setDuration(d);
    if (d > MAX_DURATION_SEC + 1) {
      setMetaError(
        `វីដេអូវែងជាង 10 នាទី (${formatDuration(d)}) — សូមកាត់វីដេអូឲ្យខ្លីជាង 10 នាទីសិន។`
      );
      setFile(null);
      return;
    }
    if (d < 3) {
      setMetaError("វីដេអូខ្លីពេក (ត្រូវការយ៉ាងតិច 3 វិនាទី)។");
      setFile(null);
      return;
    }
    setMetaError(null);
    setProgress((p) => ({ ...p, phase: "idle" }));
  }, []);

  const startAnalysis = useCallback(() => {
    if (!file || !duration || busy) return;

    const form = new FormData();
    form.append("video", file);
    form.append("duration", String(Math.round(duration)));
    form.append("model", selectedModel);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    let buffer = "";
    let processedLen = 0;

    setProgress({
      phase: "uploading",
      uploadPercent: 0,
      stageMessage: "កំពុងបញ្ជូនឯកសារទៅម៉ាស៊ីនបម្រើ...",
      script: "",
      recapId: null,
      title: null,
      error: null,
    });

    xhr.open("POST", "/api/analyze");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setProgress((p) => ({ ...p, uploadPercent: pct }));
      }
    };

    xhr.onreadystatechange = () => {
      const text = xhr.responseText || "";
      if (text.length > processedLen) {
        buffer += text.slice(processedLen);
        const { events, rest } = parseSSE(buffer);
        buffer = rest;
        processedLen = text.length - rest.length;
        handleEvents(events);
      }
    };

    xhr.onerror = () => {
      setProgress((p) => ({
        ...p,
        phase: "error",
        error: "បរាជ័យក្នុងការផ្ញើឯកសារ។ សូមពិនិត្យបណ្ដាញ ហើយព្យាយាមម្ដងទៀត។",
      }));
    };

    xhr.send(form);
  }, [file, duration, busy, selectedModel]);

  const handleEvents = useCallback((events: SSEEvent[]) => {
    for (const ev of events) {
      if (ev.event === "progress") {
        const data = JSON.parse(ev.data) as { stage: string; message: string };
        setProgress((p) => ({
          ...p,
          phase: data.stage === "gemini" ? "streaming" : "processing",
          stageMessage: data.message,
        }));
      } else if (ev.event === "chunk") {
        const data = JSON.parse(ev.data) as { text: string };
        setProgress((p) => ({
          ...p,
          phase: "streaming",
          script: p.script + data.text,
        }));
      } else if (ev.event === "done") {
        const data = JSON.parse(ev.data) as { id: string; title: string };
        setProgress((p) => ({
          ...p,
          phase: "done",
          recapId: data.id,
          title: data.title,
          stageMessage: "ស្គ្រីបបានបង្កើតរួចរាល់! 🎉",
        }));
      } else if (ev.event === "error") {
        const data = JSON.parse(ev.data) as { message: string };
        setProgress((p) => ({ ...p, phase: "error", error: data.message }));
      }
    }
  }, []);

  const reset = useCallback(() => {
    xhrRef.current?.abort();
    setFile(null);
    setDuration(null);
    setMetaError(null);
    setCopied(false);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setProgress({
      phase: "idle",
      uploadPercent: 0,
      stageMessage: "",
      script: "",
      recapId: null,
      title: null,
      error: null,
    });
    if (inputRef.current) inputRef.current.value = "";
  }, [videoUrl]);

  const copyScript = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(progress.script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [progress.script]);

  const pct =
    phase === "uploading"
      ? progress.uploadPercent
      : phase === "processing"
        ? 100
        : 0;

  return (
    <div className="w-full">
      {/* ===== Gemini model selector ===== */}
      <div className="mb-4 rounded-2xl bg-slate-900/60 p-4 ring-1 ring-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
            <BrainCircuit className="h-4.5 w-4.5 text-amber-400" />
            ម៉ូដែល Gemini
          </span>

          <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={busy || models.length === 0}
              className="w-full cursor-pointer appearance-none rounded-xl bg-slate-800 px-4 py-2.5 pr-10 text-sm font-medium text-white ring-1 ring-slate-700 transition outline-none hover:ring-amber-400/40 focus:ring-2 focus:ring-amber-400/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {models.length === 0 && (
                <option value={MODEL}>{MODEL}</option>
              )}
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.tag}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {selectedModelInfo && (
            <span className="inline-flex rounded-full bg-amber-400/10 px-3 py-1.5 text-[11px] font-bold text-amber-300 ring-1 ring-amber-400/30">
              {selectedModelInfo.tag}
            </span>
          )}
        </div>

        {selectedModelInfo && (
          <p className="mt-2.5 text-xs leading-relaxed text-slate-400">
            {selectedModelInfo.description} — នឹងប្រើសម្រាប់វីដេអូនេះ។
          </p>
        )}
        {busy && (
          <p className="mt-2.5 text-xs text-slate-500">
            មិនអាចប្ដូរម៉ូដែលបានទេ ពេលកំពុងដំណើរការ។
          </p>
        )}
      </div>

      {/* ===== File selection / drop zone ===== */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) validateFile(f);
        }}
        className={`relative overflow-hidden rounded-3xl border-2 border-dashed p-8 text-center transition-all sm:p-10 ${
          dragOver
            ? "border-amber-400 bg-amber-400/10 scale-[1.01]"
            : "border-slate-700 bg-slate-900/60 hover:border-slate-500"
        }`}
      >
        {geminiConfigured === false && (
          <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 text-left text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <p className="font-bold">មិនទាន់មាន Gemini API Key នៅឡើយទេ</p>
              <p className="mt-1 text-amber-200/80">
                សូមបញ្ចូល Key តាមរយៈ{" "}
                <Link
                  href="/settings"
                  className="font-semibold text-amber-300 underline underline-offset-2"
                >
                  ទំព័រ API Keys
                </Link>{" "}
                ឬបន្ថែម{" "}
                <code className="rounded bg-slate-900/70 px-1.5 py-0.5 font-mono text-xs">GEMINI_API_KEY</code>{" "}
                ក្នុងឯកសារ <code className="rounded bg-slate-900/70 px-1.5 py-0.5 font-mono text-xs">.env</code>{" "}
                (យក Key ពី{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-amber-300 underline underline-offset-2"
                >
                  aistudio.google.com/apikey
                </a>
                )។
              </p>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) validateFile(f);
          }}
        />

        {!videoUrl ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group flex w-full cursor-pointer flex-col items-center gap-4 outline-none"
          >
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-red-500 shadow-[0_10px_40px_rgba(245,158,11,0.35)] transition-transform group-hover:scale-105">
                <UploadCloud className="h-9 w-9 text-slate-950" />
              </div>
              <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-xs ring-2 ring-amber-400">
                🎬
              </span>
            </div>
            <div>
              <p className="text-lg font-bold text-white">
                ចុច ឬអូសវីដេអូមកទម្លាក់ទីនេះ
              </p>
              <p className="mt-1.5 text-sm text-slate-400">
                ទ្រង់ទ្រាយ៖ MP4, WebM, MOV, MKV • រហូតដល់ 10 នាទី • 100MB
              </p>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 px-3 py-1.5 ring-1 ring-slate-700">
                <HardDrive className="h-3.5 w-3.5 text-amber-400" /> អតិបរមា 100MB
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 px-3 py-1.5 ring-1 ring-slate-700">
                <Clock className="h-3.5 w-3.5 text-amber-400" /> អតិបរមា 10 នាទី
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 px-3 py-1.5 ring-1 ring-slate-700">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Gemini AI
              </span>
            </div>
          </button>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-black ring-1 ring-slate-700">
              <video
                id="preview-video"
                src={videoUrl}
                controls
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={handleMetadata}
                className="max-h-72 w-full"
              />
            </div>

            <div className="flex w-full max-w-xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <div className="flex min-w-0 items-center gap-3 text-left">
                <FileVideo className="h-9 w-9 shrink-0 text-amber-400" />
                <div className="min-w-0">
                  <p className="max-w-[260px] truncate text-sm font-semibold text-white sm:max-w-xs">
                    {file?.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {file ? formatBytes(file.size) : ""}
                    {duration ? ` • រយៈពេល ${formatDuration(duration)}` : " • កំពុងពិនិត្យ..."}
                  </p>
                </div>
              </div>

              {!busy && phase !== "done" && (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-300 ring-1 ring-slate-700 transition hover:bg-slate-700"
                  >
                    <Trash2 className="h-4 w-4" /> លុប
                  </button>
                  <button
                    type="button"
                    onClick={startAnalysis}
                    disabled={!duration || !!metaError}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-red-500 px-5 py-2 text-sm font-bold text-slate-950 shadow-[0_8px_30px_rgba(245,158,11,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Play className="h-4 w-4 fill-current" /> បង្កើតស្គ្រីបសម្រាយ
                  </button>
                </div>
              )}
            </div>

            {metaError && (
              <div className="flex w-full max-w-xl items-start gap-2.5 rounded-xl bg-red-500/10 px-4 py-3 text-left text-sm text-red-300 ring-1 ring-red-500/30">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{metaError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== Progress ===== */}
      {phase === "uploading" && (
        <div className="mt-5 rounded-2xl bg-slate-900/80 p-5 ring-1 ring-slate-800">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-slate-200">
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              {progress.stageMessage}
            </span>
            <span className="font-mono text-amber-400">{pct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-500 transition-all duration-300"
              style={{ width: `${Math.max(4, pct)}%` }}
            />
          </div>
        </div>
      )}

      {(phase === "processing" || phase === "streaming") && (
        <div className="mt-5 rounded-2xl bg-slate-900/80 p-5 ring-1 ring-slate-800">
          <div className="mb-3 flex items-center gap-2.5 text-sm font-medium text-slate-200">
            {phase === "processing" ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400" />
                </span>
                {progress.stageMessage}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 animate-pulse text-amber-400" />
                <span>
                  {selectedModelInfo?.label ?? "Gemini"} កំពុងសរសេរស្គ្រីបជាភាសាខ្មែរ... (អាចចំណាយពេល 30–90 វិនាទី)
                </span>
              </>
            )}
          </div>

          {phase === "streaming" && progress.script && (
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
              <div
                ref={scriptRef}
                className="max-h-[520px] overflow-y-auto rounded-xl bg-slate-950/70 p-5 ring-1 ring-slate-800"
              >
                <ScriptRenderer script={progress.script} streaming />
              </div>
              <div className="hidden rounded-xl bg-slate-950/70 p-5 ring-1 ring-slate-800 lg:block">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                  <Clapperboard className="h-4 w-4 text-amber-400" /> តួអង្គ និងឈុត
                </p>
                <p className="text-xs leading-relaxed text-slate-400">
                  ស្គ្រីបកំពុងត្រូវបានសរសេរតាមពេលវេលាជាក់ស្ដែង (Real-time) ពី Frames
                  ដែលបានដកចេញពីវីដេអូរបស់អ្នក។
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== Error ===== */}
      {phase === "error" && (
        <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-950/40 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div className="flex-1">
              <p className="font-bold text-red-300">មានបញ្ហាក្នុងការវិភាគ</p>
              <p className="mt-1 text-sm leading-relaxed text-red-200/90">{progress.error}</p>
              {progress.error?.includes("API Key") && (
                <Link
                  href="/settings"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-900/70 px-3 py-2 text-xs font-semibold text-amber-300 ring-1 ring-slate-700 transition hover:ring-amber-400/40"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  ទៅកាន់ទំព័រ API Keys
                </Link>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 ring-1 ring-slate-700 transition hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" /> ព្យាយាមម្ដងទៀត
          </button>
        </div>
      )}

      {/* ===== Done ===== */}
      {phase === "done" && progress.script && (
        <div className="mt-5 overflow-hidden rounded-2xl bg-slate-900/80 ring-1 ring-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-gradient-to-r from-amber-400/10 via-red-500/10 to-transparent px-5 py-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <p className="text-sm font-bold text-white">
                ស្គ្រីបបានបង្កើតរួចរាល់!
                {progress.title ? ` ${progress.title}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyScript}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-slate-700 transition hover:bg-slate-700"
              >
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "បានចម្លង!" : "ចម្លង"}
              </button>
              {progress.recapId && (
                <Link
                  href={`/recaps/${progress.recapId}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:brightness-110"
                >
                  ទំព័រពេញ <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-slate-700 transition hover:bg-slate-700"
              >
                <RefreshCw className="h-3.5 w-3.5" /> វីដេអូថ្មី
              </button>
            </div>
          </div>
          <div className="max-h-[560px] overflow-y-auto p-5 sm:p-7">
            <ScriptRenderer script={progress.script} />
          </div>
        </div>
      )}
    </div>
  );
}
