import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clapperboard,
  Clock,
  Copy,
  FileVideo,
  HardDrive,
  KeyRound,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import ScriptRenderer from "./ScriptRenderer";
import {
  DEFAULT_MODEL,
  GEMINI_MODELS,
  MAX_DURATION_SEC,
  MAX_FILE_SIZE,
  MIN_DURATION_SEC,
  VIDEO_EXTENSIONS,
  formatBytes,
  formatDuration,
} from "../lib/constants";
import { getSavedApiKey } from "../lib/storage";
import {
  getAnalysisState,
  isBusyPhase,
  resetAnalysis as resetSharedAnalysis,
  startAnalysis as startSharedAnalysis,
  subscribeAnalysis,
} from "../lib/analysisStore";

interface HealthResponse {
  geminiConfigured?: boolean;
}

export default function UploadZone({
  keyVersion,
  onOpenSettings,
}: {
  keyVersion: number;
  onOpenSettings: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [workerConfigured, setWorkerConfigured] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scriptRef = useRef<HTMLDivElement>(null);

  const progress = useSyncExternalStore(
    subscribeAnalysis,
    getAnalysisState,
    getAnalysisState
  );
  const phase = progress.phase;
  const busy = isBusyPhase(phase);
  const activeModel = progress.model ?? selectedModel;
  const selectedModelInfo = GEMINI_MODELS.find((model) => model.id === activeModel) ?? null;
  const geminiConfigured = Boolean(getSavedApiKey()) || workerConfigured === true;

  useEffect(() => {
    let cancelled = false;
    setWorkerConfigured(null);
    void fetch("/api/health", { cache: "no-store" })
      .then((response) => response.json() as Promise<HealthResponse>)
      .then((health) => {
        if (!cancelled) setWorkerConfigured(Boolean(health.geminiConfigured));
      })
      .catch(() => {
        if (!cancelled) setWorkerConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, [keyVersion]);

  useEffect(() => {
    if (phase === "streaming" && scriptRef.current) {
      scriptRef.current.scrollTop = scriptRef.current.scrollHeight;
    }
  }, [progress.script, phase]);

  const validateFile = useCallback(
    (nextFile: File) => {
      if (busy) return;
      setMetaError(null);

      const lowerName = nextFile.name.toLowerCase();
      const hasVideoExtension = VIDEO_EXTENSIONS.some((extension) =>
        lowerName.endsWith(extension)
      );
      if (!nextFile.type.toLowerCase().startsWith("video/") && !hasVideoExtension) {
        setMetaError("សូមជ្រើសរើសតែឯកសារវីដេអូ (MP4, WebM, MOV, MKV...)។");
        setFile(null);
        return;
      }
      if (nextFile.size > MAX_FILE_SIZE) {
        setMetaError(
          `ឯកសារធំជាង 100MB (${formatBytes(nextFile.size)}) — សូមជ្រើសរើសវីដេអូតូចជាងនេះ។`
        );
        setFile(null);
        return;
      }
      if (nextFile.size <= 0) {
        setMetaError("ឯកសារវីដេអូទទេ។");
        setFile(null);
        return;
      }

      resetSharedAnalysis();
      setFile(nextFile);
      setDuration(null);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl(URL.createObjectURL(nextFile));
    },
    [busy, videoUrl]
  );

  const handleMetadata = useCallback(() => {
    const video = document.getElementById("preview-video") as HTMLVideoElement | null;
    if (!video || !Number.isFinite(video.duration)) return;
    const nextDuration = video.duration;
    setDuration(nextDuration);
    if (nextDuration > MAX_DURATION_SEC + 1) {
      setMetaError(
        `វីដេអូវែងជាង 10 នាទី (${formatDuration(nextDuration)}) — សូមកាត់វីដេអូឲ្យខ្លីជាង 10 នាទីសិន។`
      );
      setFile(null);
      return;
    }
    if (nextDuration < MIN_DURATION_SEC) {
      setMetaError(
        `វីដេអូខ្លីពេក (ត្រូវការយ៉ាងតិច ${MIN_DURATION_SEC} វិនាទី)។`
      );
      setFile(null);
      return;
    }
    setMetaError(null);
  }, []);

  const beginAnalysis = useCallback(() => {
    if (!file || !duration || busy || !geminiConfigured) return;
    setCopied(false);
    startSharedAnalysis(file, duration, selectedModel);
  }, [file, duration, busy, geminiConfigured, selectedModel]);

  const reset = useCallback(() => {
    resetSharedAnalysis();
    setFile(null);
    setDuration(null);
    setMetaError(null);
    setCopied(false);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [videoUrl]);

  const copyScript = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(progress.script);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be unavailable in private browsing contexts.
    }
  }, [progress.script]);

  return (
    <div className="w-full">
      {/* ===== Gemini model selector ===== */}
      <div className="mb-4 rounded-2xl bg-slate-900/60 p-4 ring-1 ring-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
            <BrainCircuit className="h-4 w-4 text-amber-400" />
            ម៉ូដែល Gemini
          </span>

          <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={busy}
              className="w-full cursor-pointer appearance-none rounded-xl bg-slate-800 px-4 py-2.5 pr-10 text-sm font-medium text-white ring-1 ring-slate-700 transition outline-none hover:ring-amber-400/40 focus:ring-2 focus:ring-amber-400/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {GEMINI_MODELS.map((m) => (
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
          if (!busy) setDragOver(true);
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
        {!geminiConfigured && workerConfigured !== null && (
          <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 text-left text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <p className="font-bold">មិនទាន់មាន Gemini API Key នៅឡើយទេ</p>
              <p className="mt-1 text-amber-200/80">
                សូមចូលផ្ទាំង{" "}
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="font-semibold text-amber-300 underline underline-offset-2"
                >
                  API Keys
                </button>{" "}
                ដើម្បីបញ្ចូល និងរក្សាទុក Key ក្នុង Browser នេះ។
              </p>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          disabled={busy}
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
            disabled={busy}
            className="group flex w-full cursor-pointer flex-col items-center gap-4 outline-none disabled:cursor-not-allowed disabled:opacity-60"
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
                {busy ? "វីដេអូកំពុងត្រូវបានវិភាគ" : "ចុច ឬអូសវីដេអូមកទម្លាក់ទីនេះ"}
              </p>
              <p className="mt-1.5 text-sm text-slate-400">
                {busy
                  ? "អ្នកអាចចូលមើលប្រវត្តិ ឬ API Keys បាន — ដំណើរការនេះនឹងមិនឈប់ទេ។"
                  : "ទ្រង់ទ្រាយ៖ MP4, WebM, MOV • រហូតដល់ 10 នាទី • 100MB"}
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
                    onClick={beginAnalysis}
                    disabled={!duration || !!metaError || !geminiConfigured}
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
      {(phase === "processing" || phase === "streaming") && (
        <div className="mt-5 rounded-2xl bg-slate-900/80 p-5 ring-1 ring-slate-800">
          <div className="mb-3 flex items-center gap-2.5 text-sm font-medium text-slate-200">
            {phase === "processing" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                {progress.stageMessage}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 animate-pulse text-amber-400" />
                <span>
                  {selectedModelInfo?.label ?? "Gemini"} កំពុងសរសេរស្គ្រីបជាភាសាខ្មែរ...
                  (អាចចំណាយពេល 30–90 វិនាទី)
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
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-900/70 px-3 py-2 text-xs font-semibold text-amber-300 ring-1 ring-slate-700"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  ទៅកាន់ផ្ទាំង API Keys
                </button>
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
                {copied ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "បានចម្លង!" : "ចម្លង"}
              </button>
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
