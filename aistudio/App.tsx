import React, { useCallback, useState } from "react";
import { Clapperboard, Github, Sparkles } from "lucide-react";
import UploadZone from "./components/UploadZone";
import HistoryPanel from "./components/HistoryPanel";

type Tab = "create" | "history";

export default function App() {
  const [tab, setTab] = useState<Tab>("create");
  // Bump this counter to force the local history panel to re-read storage.
  const [historyVersion, setHistoryVersion] = useState(0);
  const onHistoryChanged = useCallback(() => setHistoryVersion((v) => v + 1), []);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ===== Header ===== */}
      <header className="border-b border-slate-800/70 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-red-500 shadow-[0_6px_24px_rgba(245,158,11,0.35)]">
              <Clapperboard className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <p className="text-base font-extrabold tracking-tight text-white">
                Recap <span className="text-amber-400">AI</span>
              </p>
              <p className="text-[11px] text-slate-400">
                ស្គ្រីបសម្រាយរឿងជាភាសាខ្មែរ ដោយ Gemini
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 rounded-xl bg-slate-900 p-1 ring-1 ring-slate-800">
            <button
              type="button"
              onClick={() => setTab("create")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                tab === "create"
                  ? "bg-amber-400 text-slate-950"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              បង្កើតស្គ្រីប
            </button>
            <button
              type="button"
              onClick={() => setTab("history")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                tab === "history"
                  ? "bg-amber-400 text-slate-950"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              ប្រវត្តិ
            </button>
          </nav>
        </div>
      </header>

      {/* ===== Main ===== */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {tab === "create" ? (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                បង្កើតស្គ្រីបសម្រាយរឿង{" "}
                <span className="bg-gradient-to-r from-amber-400 to-red-500 bg-clip-text text-transparent">
                  ដោយ AI
                </span>
              </h1>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
                អាប់ឡូតវីដេអូ Anime ឬភាពយន្ត (រហូតដល់ 10 នាទី) — ប្រព័ន្ធនឹងដក Frames
                ក្នុង Browser ផ្ទាល់ រួចឲ្យ Gemini សរសេរស្គ្រីបសម្រាយជាភាសាខ្មែរ។
              </p>
            </div>

            <div className="mb-4 rounded-2xl bg-emerald-400/10 p-4 text-sm text-emerald-200 ring-1 ring-emerald-400/25">
              Gemini API Key ត្រូវបានរក្សាទុកដោយសុវត្ថិភាពជា Cloudflare Worker Secret។ វាមិនត្រូវបានផ្ញើទៅ Browser ទេ។
            </div>
            <UploadZone onSaved={onHistoryChanged} />
          </>
        ) : (
          <HistoryPanel version={historyVersion} onChanged={onHistoryChanged} />
        )}
      </main>

      {/* ===== Footer ===== */}
      <footer className="border-t border-slate-800/70 py-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2 px-4 text-xs text-slate-500 sm:px-6">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          Recap AI — Frames ដកក្នុង Browser • Gemini ដំណើរការតាម Cloudflare Worker
          <a
            href="https://github.com/moeunzinkh-debug/Recap-ai-"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-slate-400 underline underline-offset-2 hover:text-white"
          >
            <Github className="h-3.5 w-3.5" /> GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
