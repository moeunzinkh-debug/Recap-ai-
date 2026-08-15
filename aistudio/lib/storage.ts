/** Browser-side persistence used by the Cloudflare Worker client. */

const KEY_STORAGE = "recap-ai:gemini-key";
const HISTORY_STORAGE = "recap-ai:recaps";
const HISTORY_LIMIT = 50;

export interface RecapRecord {
  id: string;
  title: string;
  fileName: string;
  durationSec: number;
  frameCount: number;
  model: string;
  script: string;
  createdAt: string; // ISO
}

/* ---------- API key ---------- */

export function getSavedApiKey(): string | null {
  try {
    return localStorage.getItem(KEY_STORAGE);
  } catch {
    return null;
  }
}

export function saveApiKey(key: string): void {
  try {
    localStorage.setItem(KEY_STORAGE, key.trim());
  } catch {
    // storage unavailable (private mode etc.)
  }
}

export function clearApiKey(): void {
  try {
    localStorage.removeItem(KEY_STORAGE);
  } catch {
    // ignore
  }
}

export function maskSecret(secret: string): string {
  if (secret.length <= 8) return "••••••••";
  return `${secret.slice(0, 4)}••••••••${secret.slice(-4)}`;
}

/* ---------- Recap history ---------- */

export function listRecaps(): RecapRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecapRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveRecap(record: RecapRecord): void {
  try {
    const all = [record, ...listRecaps()].slice(0, HISTORY_LIMIT);
    localStorage.setItem(HISTORY_STORAGE, JSON.stringify(all));
  } catch {
    // Quota exceeded: drop the oldest entries and retry once.
    try {
      const all = [record, ...listRecaps()].slice(0, 10);
      localStorage.setItem(HISTORY_STORAGE, JSON.stringify(all));
    } catch {
      // give up silently — the recap is still on screen
    }
  }
}

export function deleteRecap(id: string): void {
  try {
    localStorage.setItem(
      HISTORY_STORAGE,
      JSON.stringify(listRecaps().filter((r) => r.id !== id))
    );
  } catch {
    // ignore
  }
}

export function clearRecaps(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE);
  } catch {
    // ignore
  }
}
