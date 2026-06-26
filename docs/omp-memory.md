# WokAI Hindsight Memory

- WokAI must always distinguish demo-mode actions from live integrations.
- Sensitive actions require approval before execution.
- User-owned data lives under `users/{uid}` in Firestore.
- Agent planning should load memories, tasks, deadlines, device state, and recent actions before responding.
- Browser automation pauses before submit, payment, upload, send, or destructive operations.
- Google Cloud Console unified API integration: Rather than requiring separate credentials for each Google API (Gemini, Maps, Search, Gmail, Calendar, Drive, Docs, Sheets, Slides, Contacts), WokAI will automatically use the Google Cloud Console credentials (GCP API Key, Client ID/Secret, and the resulting OAuth access token) as the single source of authentication.
- Maps API Fallback: Google Maps Platform geocoding, directions, and travel estimation tools fallback to `NEXT_PUBLIC_FIREBASE_API_KEY` (which is the GCP API Key) if no dedicated Maps key is provided.
- Custom Search API: Google Search tool utilizes Custom Search JSON API with `GOOGLE_SEARCH_API_KEY`/`NEXT_PUBLIC_FIREBASE_API_KEY` and CX, falling back to scraped DuckDuckGo results if parameters are unconfigured.
- Gemini Fallback: Server plan generation fallback checks for `GEMINI_API_KEY`, GCP API Key (`NEXT_PUBLIC_FIREBASE_API_KEY`), or client-provided `googleToken` (OAuth access token) to authenticate calls via standard REST endpoints, avoiding separate API key requirements.
- Unified GoogleTokenManager: Settings page features direct Google OAuth connection trigger and token manager. Redirect captures token parameters in settings `/settings` and workspace `/workspace`.
- Agent 4 (Content Generator): Integrates a content generation phase right after Agent 3 structures the plan. Agent 4 uses Gemini/OpenRouter to construct detailed text content (e.g. Google Docs text, Sheet rows, email bodies, Twilio speech scripts, terminal commands, or browser automation goals) before execution. The generated content is displayed on each card as a preview and is dynamically written to Google APIs (via Docs batchUpdate, Sheets values update) and local processes during approval execution.

