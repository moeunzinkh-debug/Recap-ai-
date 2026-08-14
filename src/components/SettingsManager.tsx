"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
  Server,
  ShieldCheck,
  Trash2,
  Wifi,
} from "lucide-react";
import { GEMINI_KEY_NAME } from "@/lib/constants";

interface StoredKey {
  id: string;
  name: string;
  masked: string;
  createdAt: string;
  updatedAt: string;
}

interface SettingsResponse {
  keys?: StoredKey[];
  keySource?: "db" | "env" | "none";
  geminiConfigured?: boolean;
  message?: string;
}

type Notice = { kind: "success" | "error"; message: string } | null;

async function fetchSettings(): Promise<SettingsResponse> {
  const response = await fetch("/api/settings", { cache: "no-store" });
  const data = (await response.json()) as SettingsResponse;
  if (!response.ok) {
    throw new Error(data.message || "មិនអាចផ្ទុកការកំណត់បានទេ។");
  }
  return data;
}

export default function SettingsManager() {
  const [keys, setKeys] = useState<StoredKey[]>([]);
  const [keySource, setKeySource] = useState<"db" | "env" | "none">("none");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const loadSettings = useCallback(async () => {
    try {
      const data = await fetchSettings();
      setKeys(data.keys ?? []);
      setKeySource(data.keySource ?? "none");
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "មិនអាចផ្ទុកការកំណត់បានទេ។",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchSettings()
      .then((data) => {
        if (cancelled) return;
        setKeys(data.keys ?? []);
        setKeySource(data.keySource ?? "none");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setNotice({
          kind: "error",
          message: error instanceof Error ? error.message : "មិនអាចផ្ទុកការកំណត់បានទេ។",
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const saveKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = apiKey.trim();
    if (!value) {
      setNotice({ kind: "error", message: "សូមបញ្ចូល API Key ជាមុនសិន។" });
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: GEMINI_KEY_NAME, apiKey: value }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.message || "មិនអាចរក្សាទុក API Key បានទេ។");
      }
      setApiKey("");
      setNotice({ kind: "success", message: data.message || "បានរក្សាទុក API Key។" });
      await loadSettings();
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "មិនអាចរក្សាទុក API Key បានទេ។",
      });
    } finally {
      setSaving(false);
    }
  };

  const testKey = async () => {
    setTesting(true);
    setNotice(null);
    try {
      const response = await fetch("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.message || "ការសាកល្បងការតភ្ជាប់បរាជ័យ។");
      }
      setNotice({ kind: "success", message: data.message || "ការតភ្ជាប់ជោគជ័យ។" });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "ការសាកល្បងការតភ្ជាប់បរាជ័យ។",
      });
    } finally {
      setTesting(false);
    }
  };

  const deleteKey = async (name: string) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុប API Key “${name}” មែនទេ?`)) return;

    setDeleting(name);
    setNotice(null);
    try {
      const response = await fetch(`/api/settings?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.message || "មិនអាចលុប API Key បានទេ។");
      }
      setNotice({ kind: "success", message: data.message || "បានលុប API Key។" });
      await loadSettings();
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "មិនអាចលុប API Key បានទេ។",
      });
    } finally {
      setDeleting(null);
    }
  };

  const sourceDetails = {
    db: {
      label: "ប្រើ Key ពីមូលដ្ឋានទិន្នន័យ",
      description: "Key ដែលបានរក្សាទុកនៅទីនេះមានអាទិភាពជាង environment variable។",
      className: "bg-emerald-500/10 text-emerald-200 ring-emerald-500/30",
    },
    env: {
      label: "ប្រើ Key ពី environment",
      description: "ម៉ាស៊ីនបម្រើកំពុងប្រើ GEMINI_API_KEY។ អ្នកអាចរក្សាទុក Key ថ្មីដើម្បីជំនួសវា។",
      className: "bg-sky-500/10 text-sky-200 ring-sky-500/30",
    },
    none: {
      label: "មិនទាន់មាន API Key",
      description: "សូមបញ្ចូល Key ខាងក្រោម មុននឹងចាប់ផ្ដើមវិភាគវីដេអូ។",
      className: "bg-amber-500/10 text-amber-200 ring-amber-500/30",
    },
  }[keySource];

  return (
    <div className="space-y-5">
      <section className={`rounded-2xl p-5 ring-1 ${sourceDetails.className}`}>
        <div className="flex items-start gap-3">
          <Server className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h2 className="font-bold">{sourceDetails.label}</h2>
            <p className="mt-1 text-sm opacity-80">{sourceDetails.description}</p>
          </div>
          {loading && <Loader2 className="ml-auto h-5 w-5 animate-spin" />}
        </div>
      </section>

      {notice && (
        <div
          role="status"
          className={`flex items-start gap-2.5 rounded-2xl px-4 py-3.5 text-sm ring-1 ${
            notice.kind === "success"
              ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/30"
              : "bg-red-500/10 text-red-200 ring-red-500/30"
          }`}
        >
          {notice.kind === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      <form
        onSubmit={saveKey}
        className="overflow-hidden rounded-3xl bg-slate-900/70 ring-1 ring-slate-800"
      >
        <div className="border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 ring-1 ring-amber-400/30">
              <KeyRound className="h-5 w-5 text-amber-400" />
            </span>
            <div>
              <h2 className="font-bold text-white">Gemini API Key</h2>
              <p className="text-xs text-slate-400">{GEMINI_KEY_NAME}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label htmlFor="gemini-api-key" className="mb-2 block text-sm font-semibold text-slate-200">
              API Key ថ្មី
            </label>
            <div className="relative">
              <input
                id="gemini-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="បញ្ចូល Gemini API Key..."
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl bg-slate-950/70 px-4 py-3 pr-12 font-mono text-sm text-white ring-1 ring-slate-700 outline-none transition placeholder:font-sans placeholder:text-slate-600 focus:ring-2 focus:ring-amber-400/60"
              />
              <button
                type="button"
                onClick={() => setShowKey((value) => !value)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label={showKey ? "លាក់ API Key" : "បង្ហាញ API Key"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Key នឹងត្រូវបានអ៊ិនគ្រីបដោយ AES-256-GCM។ ត្រូវកំណត់ APP_SECRET ខ្លាំង និងថេរនៅលើម៉ាស៊ីនបម្រើ។
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="submit"
              disabled={saving || !apiKey.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-red-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "កំពុងរក្សាទុក..." : "រក្សាទុក Key"}
            </button>
            <button
              type="button"
              onClick={testKey}
              disabled={testing || (!apiKey.trim() && keySource === "none")}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 ring-1 ring-slate-700 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
              {testing ? "កំពុងសាកល្បង..." : "សាកល្បងការតភ្ជាប់"}
            </button>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void loadSettings();
              }}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> ផ្ទុកឡើងវិញ
            </button>
          </div>
        </div>
      </form>

      <section className="rounded-3xl bg-slate-900/70 p-6 ring-1 ring-slate-800">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-white">Keys ដែលបានរក្សាទុក</h2>
            <p className="mt-1 text-xs text-slate-500">ប្រព័ន្ធមិនបង្ហាញ Key ពេញក្រោយពេលរក្សាទុកទេ។</p>
          </div>
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-5 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> កំពុងផ្ទុក...
          </div>
        ) : keys.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-500">
            មិនមាន Key រក្សាទុកក្នុងមូលដ្ឋានទិន្នន័យទេ។
          </p>
        ) : (
          <div className="space-y-2.5">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950/60 px-4 py-3 ring-1 ring-slate-800"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-200">{key.name}</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-slate-500">{key.masked}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteKey(key.name)}
                  disabled={deleting === key.name}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 ring-1 ring-red-500/30 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  {deleting === key.name ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  លុប
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <a
        href="https://aistudio.google.com/apikey"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300 transition hover:text-amber-200 hover:underline"
      >
        បង្កើត API Key នៅ Google AI Studio <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
