import {
  Eye,
  Scissors,
  UserRound,
  PenLine,
  UploadCloud,
  Film,
  Sparkles,
  ArrowDown,
  Clapperboard,
  Languages,
} from "lucide-react";
import UploadZone from "@/components/UploadZone";

export const metadata = {
  title: "ស្គ្រីបសម្រាយរឿង — Anime & Movie Recap Script Generator",
  description:
    "បង្កើតស្គ្រីបសម្រាយរឿងជាភាសាខ្មែរពីវីដេអូ ដោយប្រើ Gemini AI — គាំទ្រវីដេអូរហូតដល់ 10 នាទី និង 100MB។",
};

const methodology = [
  {
    icon: Eye,
    title: "១. សម្រាយតាមទិដ្ឋភាពពិត",
    desc: "សរសេរ Script ទៅតាមសកម្មភាពជាក់ស្ដែងលើអេក្រង់ — ភ្នែកមើលឃើញអ្វី មាត់និយាយរៀបរាប់ឈុតនោះ។ ប្រយោគខ្លីៗ ចង្វាក់លឿន បន្ថែម Metaphor និងភាពកំប្លែង។",
  },
  {
    icon: Scissors,
    title: "២. កាត់តតាម Shot-by-Shot",
    desc: "រៀបសាច់រឿងតាមលំដាប់ហេតុការណ៍ច្បាស់លាស់ (Chronological Flow)។ ផ្ដោតលើ Core Plot, Action និង Mechanics សំខាន់ៗ — រំលង Side-Story ដែលមិនជះឥទ្ធិពល។",
  },
  {
    icon: UserRound,
    title: "៣. ណែនាំតួអង្គភ្លាមៗ",
    desc: "ប្រាប់ឈ្មោះតួអង្គសំខាន់ៗនៅពេលគេលេចមុខដំបូង ដើម្បីឱ្យអ្នកមើលងាយស្រួលចំណាំ។ បើមិនស្គាល់ឈ្មោះទេ ពណ៌នារូបរាងឲ្យចំចាំងាយ។",
  },
  {
    icon: Languages,
    title: "៤. ស្គ្រីបខ្មែរទាំងស្រុង",
    desc: "ទិន្នផលជាភាសាខ្មែរ 100% ជាមួយចំណងជើងទាក់ទាញ ចែកឈុតតាមពេលវេលា [MM:SS – MM:SS] និងសង្ខេបសាច់រឿងនៅចុងបញ្ចប់។",
  },
];

const steps = [
  {
    icon: UploadCloud,
    step: "ជំហានទី 1",
    title: "បញ្ជូនវីដេអូ",
    desc: "អូស ឬជ្រើសរើសវីដេអូរបស់អ្នក (រហូតដល់ 10 នាទី / 100MB)។",
  },
  {
    icon: Film,
    step: "ជំហានទី 2",
    title: "AI ដក Frames និងវិភាគ",
    desc: "ប្រព័ន្ធដករូបភាពតំណាងរាល់ពីរបីវិនាទី រួចផ្ញើទៅ Gemini AI។",
  },
  {
    icon: PenLine,
    step: "ជំហានទី 3",
    title: "ទទួលស្គ្រីបសម្រាយរឿង",
    desc: "ស្គ្រីបខ្មែរលេចឡើងតាមពេលវេលាជាក់ស្ដែង (Real-time Streaming)។",
  },
];

export default function HomePage() {
  return (
    <main>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0d14]/60 via-[#0b0d14]/85 to-[#0b0d14]" />
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-amber-500/20 blur-[120px]" />
        <div className="absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-red-600/20 blur-[120px]" />

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-4 py-1.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/30">
            <Sparkles className="h-3.5 w-3.5" />
            ដំណើរការដោយ Gemini AI • គាំទ្រភាសាខ្មែរ
          </div>

          <h1 className="mx-auto max-w-3xl text-balance text-[clamp(2.1rem,5.5vw,3.6rem)] font-extrabold leading-[1.15] text-white">
            បង្កើត{" "}
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-red-400 bg-clip-text text-transparent">
              ស្គ្រីបសម្រាយរឿង
            </span>{" "}
            ជាភាសាខ្មែរ ពីវីដេអូរបស់អ្នក
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-relaxed text-slate-300 sm:text-lg">
            អ្នកជំនាញ Anime &amp; Movie Recap — វិភាគទិដ្ឋភាពជាក់ស្ដែង កាត់តតាម
            Shot-by-Shot ណែនាំតួអង្គ និងសរសេរស្គ្រីបខ្លីៗ ចង្វាក់លឿន ជាមួយ
            Metaphor និងភាពកំប្លែង។
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/70 px-3.5 py-2 ring-1 ring-slate-700">
              <Film className="h-3.5 w-3.5 text-amber-400" /> វីដេអូរហូតដល់ 10 នាទី
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/70 px-3.5 py-2 ring-1 ring-slate-700">
              <Clapperboard className="h-3.5 w-3.5 text-amber-400" /> ទំហំរហូតដល់ 100MB
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/70 px-3.5 py-2 ring-1 ring-slate-700">
              <Languages className="h-3.5 w-3.5 text-amber-400" /> ស្គ្រីបខ្មែរ 100%
            </span>
          </div>

          <a
            href="#uploader"
            className="mt-9 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-red-500 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-[0_12px_40px_rgba(245,158,11,0.4)] transition hover:brightness-110"
          >
            <UploadCloud className="h-4.5 w-4.5" />
            ចាប់ផ្ដើមបង្កើតស្គ្រីបឥឡូវនេះ
            <ArrowDown className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* ===== Uploader ===== */}
      <section id="uploader" className="relative mx-auto max-w-4xl scroll-mt-20 px-4 pb-10 sm:px-6">
        <UploadZone />
      </section>

      {/* ===== How it works ===== */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">របៀបប្រើប្រាស់</p>
          <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">ដំណើរការ 3 ជំហានសាមញ្ញ</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {steps.map(({ icon: Icon, step, title, desc }, i) => (
            <div
              key={step}
              className="relative rounded-2xl bg-slate-900/70 p-6 ring-1 ring-slate-800 transition hover:-translate-y-1 hover:ring-amber-400/40"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 to-red-500/20 ring-1 ring-amber-400/30">
                <Icon className="h-6 w-6 text-amber-400" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-red-400">{step}</p>
              <h3 className="mt-1 text-lg font-bold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{desc}</p>
              {i < 2 && (
                <span className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-2xl text-slate-700 sm:block">
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== Methodology ===== */}
      <section className="border-t border-slate-800/70 bg-slate-950/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Recap Methodology</p>
            <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
              គោលការណ៍សម្រាយរឿង ដែល AI អនុវត្តជានិច្ច
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {methodology.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-4 rounded-2xl bg-slate-900/70 p-6 ring-1 ring-slate-800 transition hover:ring-amber-400/40"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-red-500">
                  <Icon className="h-6 w-6 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
