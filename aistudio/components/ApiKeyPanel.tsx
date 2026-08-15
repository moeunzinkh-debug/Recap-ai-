import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { clearApiKey, getSavedApiKey, maskSecret, saveApiKey } from "../lib/storage";

interface HealthResponse {
  ok?: boolean;
  geminiConfigured?: boolean;
}

export default function ApiKeyPanel({ onChanged }: { onChanged: () => void }) {
  const [input, setInput] = useState("");
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [workerConfigured, setWorkerConfigured] = useState(false);
  const savedKey = getSavedApiKey();

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/health", { cache: "no-store" })
      .then((response) => response.json() as Promise<HealthResponse>)
      .then((health) => {
        if (!cancelled) setWorkerConfigured(Boolean(health.geminiConfigured));
      })
      .catch(() => {
        if (!cancelled) setWorkerConfigured(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = useCallback(() => {
    const key = input.trim();
    if (!key) {
      setError("សូមបញ្ចូល API Key ជាមុនសិន។");
      return;
    }
    if (key.length < 8) {
      setError("API Key ខ្លីពេក — សូមពិនិត្យម្ដងទៀត។");
      return;
    }
    if (key.length > 512 || /[\r\n]/.test(key)) {
      setError("API Key មិនត្រឹមត្រូវ — សូមពិនិត្យ ហើយបិទភ្ជាប់ម្ដងទៀត។");
      return;
    }
    saveApiKey(key);
    setInput("");
    setError(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
    onChanged();
  }, [input, onChanged]);

  const handleDelete = useCallback(() => {
    if (!window.confirm("តើអ្នកពិតជាចង់លុប Gemini API Key ដែលរក្សាទុកក្នុង Browser មែនទេ?")) {
      return;
    }
    clearApiKey();
    setError(null);
    setSaved(false);
    onChanged();
  }, [onChanged]);

  const hasEffectiveKey = Boolean(savedKey || workerConfigured);

  return (
    <div className="space-y-5">
      <section
        className={`rounded-2xl p-5 ring-1 ${
          hasEffectiveKey
            ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/30"
            : "bg-amber-500/10 text-amber-200 ring-amber-500/30"
        }`}
      >
        <div className="flex items-start gap-3">
          {checking ? (
            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />
          ) : hasEffectiveKey ? (
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <div>
            <h2 className="font-bold">
              {checking
                ? "កំពុងពិនិត្យការកំណត់..."
                : savedKey
                  ? "កំពុងប្រើ Key ដែលរក្សាទុកក្នុង Browser នេះ"
                  : workerConfigured
                    ? "កំពុងប្រើ Cloudflare Worker Secret"
                    : "មិនទាន់មាន Gemini API Key"}
            </h2>
            <p className="mt-1 text-sm opacity-80">
              {savedKey
                ? "Key ផ្ទាល់ខ្លួនរបស់អ្នកមានអាទិភាពជាង Worker Secret ហើយត្រូវបានផ្ញើតែទៅ Worker តាម HTTPS ពេលវិភាគ។"
                : workerConfigured
                  ? "GEMINI_API_KEY ត្រូវបានកំណត់ជាសម្ងាត់នៅ Cloudflare ហើយមិនត្រូវបានផ្ញើទៅ Browser ទេ។"
                  : "សូមបញ្ចូល Key ខាងក្រោម មុននឹងចាប់ផ្ដើមវិភាគវីដេអូ។"}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl bg-slate-900/70 ring-1 ring-slate-800">
        <div className="border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 ring-1 ring-amber-400/30">
              <KeyRound className="h-5 w-5 text-amber-400" />
            </span>
            <div>
              <h2 className="font-bold text-white">Gemini API Key</h2>
              <p className="text-xs text-slate-400">រក្សាទុកសម្រាប់ Browser នេះប៉ុណ្ណោះ</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {savedKey && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950/60 px-4 py-3 ring-1 ring-slate-800">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-400">Key ដែលបានរក្សាទុក</p>
                <p className="mt-1 truncate font-mono text-sm text-slate-200">
                  {maskSecret(savedKey)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 ring-1 ring-red-500/30 transition hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" /> លុប Key
              </button>
            </div>
          )}

          <div>
            <label htmlFor="worker-gemini-key" className="mb-2 block text-sm font-semibold text-slate-200">
              {savedKey ? "ប្ដូរ API Key" : "បញ្ចូល API Key"}
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <div className="relative flex-1">
                <input
                  id="worker-gemini-key"
                  type={show ? "text" : "password"}
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value);
                    setError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSave();
                  }}
                  placeholder="បិទភ្ជាប់ Gemini API Key នៅទីនេះ (AIza...)"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={512}
                  className="w-full rounded-xl bg-slate-950/70 px-4 py-3 pr-12 font-mono text-sm text-white ring-1 ring-slate-700 outline-none transition placeholder:font-sans placeholder:text-slate-600 focus:ring-2 focus:ring-amber-400/60"
                />
                <button
                  type="button"
                  onClick={() => setShow((value) => !value)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  aria-label={show ? "លាក់ API Key" : "បង្ហាញ API Key"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={!input.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-red-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saved ? "បានរក្សាទុក!" : "រក្សាទុក Key"}
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            Key ត្រូវរក្សាទុកក្នុង <code className="text-slate-400">localStorage</code> របស់ Browser
            នេះ មិនត្រូវបានបញ្ចូលក្នុង app bundle ទេ។ សម្រាប់ឧបករណ៍សាធារណៈ សូមលុប Key ក្រោយប្រើរួច។
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 font-semibold text-amber-300 transition hover:text-amber-200 hover:underline"
        >
          បង្កើត API Key នៅ Google AI Studio <ExternalLink className="h-3.5 w-3.5" />
        </a>
        {workerConfigured && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Cloud className="h-3.5 w-3.5" /> Worker Secret នៅតែអាចប្រើជាជម្រើសបម្រុង
          </span>
        )}
      </div>
    </div>
  );
}
