# Recap AI

A Khmer-language anime and movie recap script generator. The application extracts timestamped JPEG frames from an uploaded video with FFmpeg, streams them to Gemini, and stores the generated script in PostgreSQL.

> **Cloudflare Workers deployment:** a Worker-ready application now lives in [`worker/`](./worker/). It serves the Vite client in [`aistudio/`](./aistudio/) and keeps the Gemini key in a Worker Secret. Video frames are extracted in the browser with canvas, because Workers cannot run FFmpeg or write temporary files.

## Features

- Upload validation: video files up to 100 MB and 10 minutes
- Server-side FFprobe duration verification
- Up to 110 timestamped frames per video
- Streaming Khmer recap generation with supported Gemini text models
- Recap history and detail pages
- AES-256-GCM encryption for API keys stored through the Settings page

## Requirements

- Node.js 20.9 or newer
- PostgreSQL
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

`ffmpeg-static` and `ffprobe-static` download platform-specific binaries during `npm install`, so the installation environment needs outbound network access.

## Local setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recap_ai
APP_SECRET=replace-with-a-long-random-secret
GEMINI_API_KEY=
```

Generate `APP_SECRET` with a cryptographically secure value, for example:

```bash
openssl rand -base64 32
```

Keep `APP_SECRET` stable. Changing it prevents previously stored API keys from being decrypted.

Create or update the database tables, then start the app:

```bash
npm run db:migrate
npm run dev
```

For local prototyping, `npm run db:push` can apply the schema directly without migrations.

Open <http://localhost:3000>. If `GEMINI_API_KEY` is not set in the environment, save one on the **API Keys** page. A database-stored key takes priority over the environment key.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm start` | Run the production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `npm run db:generate` | Generate a migration from the Drizzle schema |
| `npm run db:migrate` | Apply generated migrations |
| `npm run db:push` | Push the schema directly to PostgreSQL |
| `npm run db:studio` | Open Drizzle Studio |

## Cloudflare Workers deployment

The original Next.js application above remains available for Node.js + PostgreSQL deployments. For Cloudflare Workers, use the Worker application instead. It does **not** upload the source video to Cloudflare: the browser decodes the video, extracts compressed JPEG frames, and sends only those frames to the Worker. The Worker proxies the streaming Gemini response, so `GEMINI_API_KEY` never reaches the browser.

```bash
cd aistudio
npm install
npm run build
cd ../worker
npm install
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npm run deploy
```

For local development, build the client once, then run the Worker:

```bash
cd aistudio && npm run build
cd ../worker && npm run dev
```

Open the Worker URL printed by Wrangler. The Worker serves `aistudio/dist` as static assets and provides:

- `POST /api/analyze` — validates extracted frames and streams Gemini SSE
- `GET /api/health` — deployment/key configuration health check

The browser keeps recap history in `localStorage`. This deliberately removes Node-only FFmpeg, filesystem, PostgreSQL, and server-side encryption dependencies from the Cloudflare path. Do not use the Worker publicly without access control: any visitor can consume your Gemini quota.

### Important limits

- Browser canvas extraction only supports codecs the visitor's browser can decode (MP4/H.264 and WebM are safest).
- The current UI accepts videos up to 100 MB / 10 minutes, but the actual request consists of extracted JPEG frames. If requests exceed your Cloudflare plan limits, reduce `MAX_FRAMES`, `FRAME_WIDTH`, or JPEG quality in `aistudio/lib/constants.ts`.
- Set the secret with Wrangler; never set `GEMINI_API_KEY` through Vite environment variables, which would expose it in the client bundle.

## Node.js deployment notes

- Use the Node.js runtime; FFmpeg processing is not compatible with an Edge runtime.
- The host must allow temporary-file writes and include enough memory for a 100 MB upload plus extracted frames.
- Ensure the platform request-size and execution-time limits support the configured 100 MB / 10-minute workload.
- Run `npm run db:migrate` as part of deployment before serving traffic.
- Set `DATABASE_URL` and a stable, secret `APP_SECRET` in the deployment environment.

## Security scope

This project currently has no user authentication and is intended for a trusted, single-user/private deployment. Anyone who can access a public deployment can create and view recaps, clear history, and change the stored Gemini API key. Add authentication and authorization before exposing it publicly.
