import React, { useCallback, useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Save, Trash2 } from "lucide-react";
import {
  clearApiKey,
  getEffectiveApiKey,
  getSavedApiKey,
  maskSecret,
  saveApiKey,
} from "../lib/storage";

export default function ApiKeyPanel({
  onChanged,
}: {
  onChanged: () => void;
}) {
  const [input, setInput] = useState("");
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedKey = getSavedApiKey();
  const { source } = getEffectiveApiKey();

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
    saveApiKey(key);
    setInput("");
    setError(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onChanged();
  }, [input, onChanged]);

  const handleDelete = useCallback(() => {
    clearApiKey();
    setError(null);
    onChanged();
  }, [onChanged]);

  return (
    <div className="mb-4 rounded-2xl bg-slate-900/60 p-4 ring-1 ring-slate-800">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
          <KeyRound className="h-4 w-4 text-amber-400" />
          Gemini API Key
        </span>

        {source === "env" && !savedKey && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-400/30">
            <CheckCircle2 className="h-3.5 w-3.5" /> ប្រើ Key ពី AI Studio ដោយស្វ័យប្រវត្តិ
          </span>
        )}
        {savedKey && (
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1.5 font-mono text-[11px] text-slate-300 ring-1 ring-slate-700">
            {maskSecret(savedKey)}
            <button
              type="button"
              onClick={handleDelete}
              title="លុប Key ដែលបានរក្សាទុក"
              className="text-red-400 transition hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <input
            type={show ? "text" : "password"}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder={
              source === "none"
                ? "បិទភ្ជាប់ Gemini API Key នៅទីនេះ (AIza...)"
                : "ប្ដូរ Key ថ្មី (ជាជម្រើស)..."
            }
            className="w-full rounded-xl bg-slate-800 px-4 py-2.5 pr-10 font-mono text-sm text-white ring-1 ring-slate-700 outline-none transition placeholder:font-sans placeholder:text-slate-500 hover:ring-amber-400/40 focus:ring-2 focus:ring-amber-400/60"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:brightness-110"
        >
          {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "បានរក្សាទុក!" : "រក្សាទុក"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        Key ត្រូវរក្សាទុកតែក្នុង Browser របស់អ្នកប៉ុណ្ណោះ (localStorage) — យក Key ឥតគិតថ្លៃពី{" "}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-amber-300 underline underline-offset-2"
        >
          aistudio.google.com/apikey
        </a>
        ។
      </p>
    </div>
  );
}
