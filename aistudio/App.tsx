import { useCallback, useEffect, useRef, useState } from "react";
import {
  Clapperboard,
  Github,
  History,
  Home,
  KeyRound,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import ApiKeyPanel from "./components/ApiKeyPanel";
import HistoryPanel from "./components/HistoryPanel";
import ProcessingBanner from "./components/ProcessingBanner";
import UploadZone from "./components/UploadZone";
import { getAnalysisState, subscribeAnalysis } from "./lib/analysisStore";

type Tab = "create" | "history" | "settings";

const tabs = [
  { id: "create" as const, label: "បង្កើតស្គ្រីប", shortLabel: "បង្កើត", icon: Home },
  { id: "history" as const, label: "ប្រវត្តិស្គ្រីប", shortLabel: "ប្រវត្តិ", icon: History },
  { id: "settings" as const, label: "API Keys", shortLabel: "API Keys", icon: KeyRound },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("create");
  const [historyVersion, setHistoryVersion] = useState(0);
  const [keyVersion, setKeyVersion] = useState(0);
  const lastSavedId = useRef<string | null>(getAnalysisState().recapId);

  const onHistoryChanged = useCallback(() => setHistoryVersion((version) => version + 1), []);
  const onKeyChanged = useCallback(() => setKeyVersion((version) => version + 1), []);

  // Refresh History immediately when a background analysis finishes, even if
  // the user is currently looking at another tab.
  useEffect(
    () =>
      subscribeAnalysis(() => {
        const analysis = getAnalysisState();
        if (
          analysis.phase === "done" &&
          analysis.recapId &&
          analysis.recapId !== lastSavedId.current
        ) {
          lastSavedId.current = analysis.recapId;
          setHistoryVersion((version) => version + 1);
        }
      }),
    []
  );

  return (
    <div className="min-h-screen bg-[#0b0d14]">
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#0b0d14]/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button type="button" onClick={() => setTab("create")} className="flex items-center gap-2.5 text-left">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-red-500 shadow-[0_4px_20px_rgba(245,158,11,0.4)]">
              <Clapperboard className="h-5 w-5 text-slate-950" />
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-[15px] font-bold text-white">ស្គ្រីបសម្រាយរឿង</span>
              <span className="block text-[11px] font-medium tracking-wide text-amber-400/90">
                Recap Script Studio
              </span>
            </span>
          </button>

          <nav className="flex items-center gap-1 rounded-xl bg-slate-900/80 p-1 ring-1 ring-slate-800">
            {tabs.map(({ id, label, shortLabel, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={tab === id ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold transition sm:px-3.5 ${
                  tab === id
                    ? "bg-amber-400 text-slate-950"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{shortLabel}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <ProcessingBanner onOpen={() => setTab("create")} />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        {tab === "create" && (
          <>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-4 py-1.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/30">
                <Sparkles className="h-3.5 w-3.5" />
                ដំណើរការដោយ Gemini AI • គាំទ្រភាសាខ្មែរ
              </div>
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

            <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-emerald-400/10 p-4 text-sm text-emerald-200 ring-1 ring-emerald-400/25">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                អ្នកអាចប្រើ Cloudflare Worker Secret ឬ Key ផ្ទាល់ខ្លួនដែលរក្សាទុកក្នុង Browser។
                Key មិនត្រូវបានបញ្ចូលក្នុង public app bundle ទេ។
              </span>
            </div>
            <UploadZone
              keyVersion={keyVersion}
              onOpenSettings={() => setTab("settings")}
            />
          </>
        )}

        {tab === "history" && (
          <>
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Library</p>
              <h1 className="mt-1.5 text-2xl font-extrabold text-white sm:text-3xl">
                ប្រវត្តិស្គ្រីបសម្រាយរឿង
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                ស្គ្រីបដែលបានបង្កើត រក្សាទុកក្នុង Browser នេះ។
              </p>
            </div>
            <HistoryPanel version={historyVersion} onChanged={onHistoryChanged} />
          </>
        )}

        {tab === "settings" && (
          <>
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Settings</p>
              <h1 className="mt-1.5 text-2xl font-extrabold text-white sm:text-3xl">
                ការកំណត់ API Keys
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                បញ្ចូល ប្ដូរ ឬលុប Gemini API Key សម្រាប់ Browser នេះ។
              </p>
            </div>
            <ApiKeyPanel onChanged={onKeyChanged} />
          </>
        )}
      </main>

      <footer className="border-t border-slate-800/70 py-7">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center text-xs text-slate-500 sm:flex-row sm:px-6 sm:text-left">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Recap AI — Frames ដកក្នុង Browser • Gemini ដំណើរការតាម Cloudflare Worker
          </span>
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
