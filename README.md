# WokAI

**The AI That Helps You Finish Work Before It's Too Late.**

WokAI is a Next.js productivity operating system inspired by OMP's agent architecture. It is not a plain chatbot: it plans work, remembers preferences, creates tasks, detects deadline risk, drafts safe actions, queues device/browser jobs, and pauses sensitive operations for approval.

## What Is Built

- Futuristic command-center UI with Dashboard, Chat, Tasks, Memory, Inbox, Calendar, Drive, Workspace, Devices, Life Saver, Browser Agent, Settings, and Login routes.
- OMP-inspired agent runtime: conductor, subagents, typed tool registry, approval gates, memory writes, task generation, and audit-ready action logs.
- Gemini route handler with deterministic demo fallback when `GEMINI_API_KEY` is missing.
- Firebase Auth and Firestore-ready user-scoped storage under `users/{uid}/...`.
- Google API OAuth scaffolding for Gmail, Calendar, Drive, Docs, Sheets, Slides, and People.
- Browser-agent architecture with demo mode and optional local Playwright worker handoff.
- Phone workflow with `tel:` demo fallback and optional Twilio outbound call adapter.
- Firestore rules, `.env.example`, Vercel config, OMP docs, and deployment notes.

## OMP For This Project

OMP is used as the recommended coding-agent workflow for the repo and as inspiration for WokAI's app architecture.

Install OMP on Windows:

```powershell
irm https://omp.sh/install.ps1 | iex
```

Other official install options:

```sh
bun install -g @oh-my-pi/pi-coding-agent
curl -fsSL https://omp.sh/install | sh
brew install can1357/tap/omp
mise use -g github:can1357/oh-my-pi
```

After installing project dependencies, you can also run the local OMP package:

```sh
npm run omp
npm run omp:plan
npm run omp:resume
```

Recommended OMP workflow:

1. Use `npm run omp:plan` for non-trivial changes.
2. Split work into subagents: UI, Firebase, Google APIs, agent runtime, tests.
3. Keep sensitive actions approval-gated.
4. Run `npm run verify` before deploying.
5. Store durable repo lessons in `docs/omp-memory.md`.

## Local Setup

```sh
npm install --cache .npm-cache
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app runs in demo mode without secrets. Add env vars to unlock live Gemini, Firebase, Google OAuth, and Twilio behavior.

## Environment Variables

Copy `.env.example` to `.env.local` and fill:

- `GEMINI_API_KEY`
- `NEXT_PUBLIC_FIREBASE_*`
- optional Firebase Admin vars for server-side verification
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- optional `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- optional `LOCAL_BROWSER_AGENT_URL` and `BROWSER_AGENT_MODE=local`

## Firebase

1. Create a Firebase project.
2. Enable Google sign-in in Firebase Authentication.
3. Create a web app and copy the `NEXT_PUBLIC_FIREBASE_*` values.
4. Enable Firestore.
5. Deploy rules:

```sh
firebase deploy --only firestore:rules
```

Data is user-scoped:

```txt
users/{uid}
users/{uid}/tasks/{taskId}
users/{uid}/memories/{memoryId}
users/{uid}/actions/{actionId}
users/{uid}/devices/{deviceId}
users/{uid}/audit_logs/{logId}
```

## Google APIs

Enable these APIs in Google Cloud:

- Gmail API
- Google Calendar API
- Google Drive API
- Google Docs API
- Google Sheets API
- Google Slides API
- People API

Add OAuth redirect URI:

```txt
http://localhost:3000/api/google/callback
https://YOUR_VERCEL_DOMAIN/api/google/callback
```

The current app includes the auth URL route and integration scaffolding. Production token persistence should store encrypted OAuth tokens under `users/{uid}/integrations/google`.

## Browser Agent

Vercel serverless is not a good place for long-running Playwright sessions. WokAI ships a safe architecture:

- default `BROWSER_AGENT_MODE=demo`
- optional `BROWSER_AGENT_MODE=local`
- local worker URL from `LOCAL_BROWSER_AGENT_URL`
- job model pauses before submit, payment, upload, send, or destructive actions

## Phone Calls

WokAI supports realistic call workflow:

- demo mode returns a `tel:` link and call script
- Twilio mode places an outbound call if Twilio env vars are present
- call summaries and action items are designed to be stored in Firestore

## Verify

```sh
npm run typecheck
npm run lint
npm run build
```

Or run all:

```sh
npm run verify
```

## Deploy To Vercel

See `docs/deployment.md`.

## Sources

- OMP docs: [https://omp.sh](https://omp.sh)
- OMP package: [@oh-my-pi/pi-coding-agent](https://www.npmjs.com/package/@oh-my-pi/pi-coding-agent)
