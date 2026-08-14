# Recap AI

A Khmer-language anime and movie recap script generator. The application extracts timestamped JPEG frames from an uploaded video with FFmpeg, streams them to Gemini, and stores the generated script in PostgreSQL.

> **Google AI Studio users:** this Next.js app needs a Node.js server, FFmpeg, and PostgreSQL, so it cannot run inside AI Studio Build. A browser-only version that works on AI Studio (canvas frame extraction + direct Gemini calls + localStorage) lives in [`aistudio/`](./aistudio/README.md).

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

## Deployment notes

- Use the Node.js runtime; FFmpeg processing is not compatible with an Edge runtime.
- The host must allow temporary-file writes and include enough memory for a 100 MB upload plus extracted frames.
- Ensure the platform request-size and execution-time limits support the configured 100 MB / 10-minute workload.
- Run `npm run db:migrate` as part of deployment before serving traffic.
- Set `DATABASE_URL` and a stable, secret `APP_SECRET` in the deployment environment.

## Security scope

This project currently has no user authentication and is intended for a trusted, single-user/private deployment. Anyone who can access a public deployment can create and view recaps, clear history, and change the stored Gemini API key. Add authentication and authorization before exposing it publicly.
