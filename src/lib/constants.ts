export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
export const MAX_DURATION_SEC = 10 * 60; // 10 minutes
export const MIN_DURATION_SEC = 3;
export const MAX_FRAMES = 110;
export const FRAME_WIDTH = 640;
export const MODEL = "gemini-2.0-flash";

export interface GeminiModelOption {
  id: string;
  label: string;
  tag: string;
  description: string;
}

export const GEMINI_MODELS: GeminiModelOption[] = [
  {
    id: "gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    tag: "ថ្មីបំផុត • ណែនាំ",
    description: "ជំនាន់ទី 3 ថ្មីបំផុត — ឆ្លាតបំផុតសម្រាប់ Flash លឿន + វិភាគស៊ីជម្រៅ",
  },
  {
    id: "gemini-3.1-flash",
    label: "Gemini 3.1 Flash",
    tag: "ថ្មី",
    description: "ជំនាន់ទី 3 — លឿន + ឆ្លាត ជំនាន់ថ្មី សម្រាប់ការសម្រាយរឿងគុណភាពខ្ពស់",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    tag: "ណែនាំ",
    description: "លឿន + ឆ្លាត — តុល្យភាពល្អបំផុតរវាងល្បឿន និងគុណភាព",
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite",
    tag: "លឿនបំផុត",
    description: "លឿន និងសន្សំសំចៃតម្លៃ — ស័ក្តិសមសម្រាប់វីដេអូខ្លីៗ",
  },
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    tag: "លំនាំដើម",
    description: "ម៉ូដែលលំនាំដើម — មានស្ថេរភាព ប្រើបានទូទៅ",
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    tag: "គុណភាពខ្ពស់",
    description: "វិភាគរឿងស៊ីជម្រៅបំផុត ប៉ុន្តែយឺតជាង Flash",
  },
  {
    id: "gemini-1.5-flash",
    label: "Gemini 1.5 Flash",
    tag: "Legacy",
    description: "ម៉ូដែលជំនាន់មុន — សម្រាប់ភាពត្រូវគ្នាចាស់ៗ",
  },
];

export function isKnownGeminiModel(id: string): boolean {
  return GEMINI_MODELS.some((m) => m.id === id);
}

export interface AnalyzeProgress {
  stage: "upload" | "probe" | "frames" | "gemini" | "saving";
  message: string;
  percent?: number;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}
