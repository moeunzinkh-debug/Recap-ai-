# Recap AI — Google AI Studio version (browser-only)

កំណែនេះត្រូវបានកែទម្រង់ឲ្យដំណើរការ **ទាំងស្រុងក្នុង Browser** ដោយគ្មាន Server, គ្មាន FFmpeg, គ្មាន PostgreSQL — ដូច្នេះវាដំណើរការបាននៅលើ **Google AI Studio (Build)**។

This is a browser-only rewrite of Recap AI that runs on **Google AI Studio (Build)** — no server, no FFmpeg, no PostgreSQL.

## អ្វីដែលបានផ្លាស់ប្ដូរ (What changed)

| មុន (Next.js full-stack) | ឥឡូវ (AI Studio / browser-only) |
| --- | --- |
| FFmpeg ដក frames នៅ server | `<video>` + `<canvas>` ដក frames ក្នុង browser (`lib/frames.ts`) |
| `/api/analyze` streaming SSE | ហៅ `@google/genai` ផ្ទាល់ពី browser ជាមួយ streaming (`lib/gemini.ts`) |
| PostgreSQL រក្សា recaps + API keys | `localStorage` (`lib/storage.ts`) |
| `/api/config`, `/api/settings` | គ្មានត្រូវការ — state ទាំងអស់នៅក្នុង browser |
| API key encrypt ក្នុង database | Key រក្សាក្នុង browser ប៉ុណ្ណោះ ឬប្រើ `process.env.API_KEY` ដែល AI Studio ផ្ដល់ឲ្យស្វ័យប្រវត្តិ |

Prompt ភាសាខ្មែរ, បញ្ជីម៉ូដែល Gemini, ScriptRenderer, និង UI design ត្រូវរក្សាដូចដើមទាំងអស់។

## របៀបដាក់ចូល Google AI Studio (How to import)

AI Studio Build ត្រូវការឯកសារ app នៅ **root** របស់ project។ ដូច្នេះ៖

1. ចូល <https://aistudio.google.com/apps> → **New app** (ឬ import from GitHub)
2. ចម្លងឯកសារ **ក្នុង folder `aistudio/` នេះ** (មិនមែន folder ខាងក្រៅទេ) ចូលទៅ app root៖
   - `index.html`, `index.tsx`, `App.tsx`, `metadata.json`
   - `package.json`, `vite.config.ts`, `tsconfig.json`
   - `components/` និង `lib/`
3. AI Studio នឹងផ្ដល់ `process.env.API_KEY` ដោយស្វ័យប្រវត្តិ — app នឹងប្រើវាភ្លាម (ឃើញ badge "ប្រើ Key ពី AI Studio ដោយស្វ័យប្រវត្តិ")។ បើចង់ប្ដូរ Key ក៏អាចបញ្ចូលក្នុង UI បានដែរ។

> **គន្លឹះ៖** បើ import ពី GitHub, AI Studio មើលតែ root repo ប៉ុណ្ណោះ។ បើចង់ភ្ជាប់ GitHub ផ្ទាល់ សូមបង្កើត repo ថ្មីមួយដែលមានតែឯកសារក្នុង `aistudio/` នៅ root។

## ដំណើរការនៅ local (Run locally)

```bash
cd aistudio
npm install
npm run dev
```

បើចង់កំណត់ API key ជាមុន (ជាជម្រើស)៖ បង្កើត `.env.local` ដាក់ `GEMINI_API_KEY=...`

## ដែនកំណត់ (Limitations vs the full-stack version)

- ការដក frames ប្រើ browser video decoder — ទ្រង់ទ្រាយខ្លះ (MKV/AVI codecs ចាស់ៗ) អាចបើកមិនបាននៅ browser ខ្លះ។ MP4 (H.264) និង WebM ដំណើរការល្អបំផុត។
- ប្រវត្តិស្គ្រីបរក្សាក្នុង `localStorage` — លុប browser data នឹងបាត់ប្រវត្តិ។
- API key នៅក្នុង browser (client-side) — ស័ក្តិសមសម្រាប់ប្រើផ្ទាល់ខ្លួន; កុំ deploy ជា public website ដោយដាក់ key រួមគ្នា។
