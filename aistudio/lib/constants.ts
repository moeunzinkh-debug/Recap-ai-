export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
export const MAX_DURATION_SEC = 10 * 60; // 10 minutes
export const MIN_DURATION_SEC = 3;
export const MAX_FRAMES = 110;
export const FRAME_WIDTH = 640;
export const JPEG_QUALITY = 0.72;

export const VIDEO_EXTENSIONS = [
  ".mp4",
  ".webm",
  ".mov",
  ".mkv",
  ".avi",
  ".m4v",
  ".mpeg",
  ".mpg",
  ".ogv",
  ".3gp",
] as const;

export const DEFAULT_MODEL = "gemini-3.7-flash";

export interface GeminiModelOption {
  id: string;
  label: string;
  tag: string;
  description: string;
}

/** Text-output models that accept image input and work with this application. */
export const GEMINI_MODELS: GeminiModelOption[] = [
  {
    id: "gemini-3.7-flash",
    label: "Gemini 3.7 Flash",
    tag: "ថ្មីបំផុត • ណែនាំ",
    description: "ម៉ូដែល Flash ថ្មីបំផុត — លឿន ឆ្លាត និងវិភាគពហុមេឌៀបានល្អ",
  },
  {
    id: "gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    tag: "មានស្ថេរភាព",
    description: "តុល្យភាពល្អរវាងល្បឿន គុណភាព និងការវិភាគរូបភាព",
  },
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    tag: "មានស្ថេរភាព",
    description: "ស័ក្តិសមសម្រាប់ការងារទូទៅដែលត្រូវការល្បឿន និងគុណភាពល្អ",
  },
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash-Lite",
    tag: "លឿនបំផុត",
    description: "លឿន និងសន្សំសំចៃ — ស័ក្តិសមសម្រាប់វីដេអូខ្លីៗ",
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash-Lite",
    tag: "សន្សំសំចៃ",
    description: "ម៉ូដែលតូចដែលមានស្ថេរភាព និងចំណាយទាប",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    tag: "ជំនាន់មុន",
    description: "ម៉ូដែលជំនាន់ 2.5 ដែលមានស្ថេរភាព និងប្រើបានទូទៅ",
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite",
    tag: "ជំនាន់មុន • សន្សំសំចៃ",
    description: "ជម្រើសចំណាយទាបសម្រាប់ការវិភាគដែលមិនស្មុគស្មាញ",
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    tag: "គុណភាពខ្ពស់",
    description: "វិភាគរឿងស៊ីជម្រៅ ប៉ុន្តែយឺត និងចំណាយច្រើនជាង Flash",
  },
];

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
