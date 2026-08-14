/**
 * Browser-side persistence (localStorage) replacing the PostgreSQL layer so
 * the app can run on Google AI Studio without any server or database.
 */

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

/** AI Studio injects the key as process.env.API_KEY; a user-saved key wins. */
export function getEnvApiKey(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (typeof process !== "undefined" ? (process as any).env : undefined) ?? {};
    const key = (env.API_KEY || env.GEMINI_API_KEY || "").trim();
    return key || null;
  } catch {
    return null;
  }
}

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

/** Effective key: user-saved key first, then the AI Studio environment key. */
export function getEffectiveApiKey(): { key: string | null; source: "saved" | "env" | "none" } {
  const saved = getSavedApiKey();
  if (saved) return { key: saved, source: "saved" };
  const env = getEnvApiKey();
  if (env) return { key: env, source: "env" };
  return { key: null, source: "none" };
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
