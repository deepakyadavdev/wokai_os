# Deployment Guide

## 1. Install And Build Locally

```sh
npm install --cache .npm-cache
npm run build
```

## 2. Configure Firebase

1. Create a Firebase project.
2. Enable Authentication with Google provider.
3. Enable Firestore.
4. Add the Firebase web config to Vercel as `NEXT_PUBLIC_FIREBASE_*`.
5. Deploy Firestore rules:

```sh
firebase deploy --only firestore:rules
```

For server-side token verification, add either:

- `FIREBASE_SERVICE_ACCOUNT_BASE64`

or:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## 3. Configure Gemini

Add:

```txt
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-1.5-flash
```

Without this, `/api/agent/chat` uses deterministic demo planning.

## 4. Configure Google OAuth

In Google Cloud, enable Gmail, Calendar, Drive, Docs, Sheets, Slides, and People APIs.

Add redirect URIs:

```txt
http://localhost:3000/api/google/callback
https://YOUR_DOMAIN/api/google/callback
```

Set:

```txt
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://YOUR_DOMAIN/api/google/callback
```

## 5. Optional Twilio

Set:

```txt
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

If these are missing, call workflows return a safe `tel:` link and script.

## 6. Optional Browser Worker

For live Playwright automation, run a separate local or hosted worker and set:

```txt
BROWSER_AGENT_MODE=local
LOCAL_BROWSER_AGENT_URL=https://your-worker.example.com
```

Keep the approval policy: pause before submit, payment, upload, send, or destructive actions.

## 7. Vercel

```sh
vercel
vercel env add GEMINI_API_KEY production
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
vercel deploy --prod
```

`vercel.json` already sets install, dev, and build commands.
