# Recap AI — Cloudflare Worker client

នេះគឺជា Vite client សម្រាប់ Cloudflare Worker ក្នុង [`../worker`](../worker/)។ វាដក JPEG frames ពីវីដេអូដោយ `<video>` + `<canvas>` ក្នុង browser ហើយផ្ញើតែ frames ទៅ `/api/analyze`។ Worker អាចហៅ Gemini ដោយប្រើ `GEMINI_API_KEY` Secret ឬ Key ផ្ទាល់ខ្លួនដែលអ្នកប្រើរក្សាទុកក្នុង Browser។ Key ទាំងពីរប្រភេទ **មិនចូលទៅក្នុង public app bundle** ទេ។

## ដំណើរការ និង Deploy

```bash
cd aistudio
npm install
npm run build
cd ../worker
npm install
# ជាជម្រើស៖ កំណត់ shared fallback key
npx wrangler secret put GEMINI_API_KEY
npm run deploy
```

`worker/wrangler.jsonc` បម្រើ `aistudio/dist` ជា static assets រួមជាមួយ Worker API។ សម្រាប់ local development៖

```bash
cd aistudio && npm run build
cd ../worker && npm run dev
```

## Architecture

| ផ្នែក | Cloudflare version |
| --- | --- |
| ដក frame | Browser `<video>` + `<canvas>` |
| Gemini request | Worker `POST /api/analyze`, Gemini SSE streamed back to UI |
| Gemini key | Worker Secret ឬ Key ផ្ទាល់ខ្លួនក្នុង Browser `localStorage` |
| ប្រវត្តិ script | Browser `localStorage` |
| Background process | បន្តដំណើរការ ពេលប្ដូររវាង Create / History / API Keys |
| Database / FFmpeg | មិនត្រូវការ |

## Limits និងសុវត្ថិភាព

- Browser ត្រូវអាច decode វីដេអូបាន។ MP4 (H.264) និង WebM ជាជម្រើសល្អបំផុត។
- UI កំណត់ 100 MB / 10 នាទី។ Request ទៅ Worker គឺ JPEG frames ដែលបានដករួច; ប្រសិនបើធំពេកសម្រាប់ Cloudflare plan របស់អ្នក សូមបន្ថយ `MAX_FRAMES`, `FRAME_WIDTH`, ឬ `JPEG_QUALITY` ក្នុង `lib/constants.ts`។
- ប្រវត្តិ និង Key ផ្ទាល់ខ្លួនមានតែនៅក្នុង browser របស់អ្នក។ សូមលុប Key ក្រោយប្រើលើឧបករណ៍សាធារណៈ។
- មុន deploy ជាសាធារណៈដោយប្រើ shared Worker Secret សូមបន្ថែម Cloudflare Access ឬ authentication។ បើគ្មានវា អ្នកចូលមើលគេអាចប្រើ Gemini quota របស់អ្នកបាន។
